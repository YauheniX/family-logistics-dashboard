# SQL Migration Snippets - 4-PR Implementation

This document contains production-ready SQL migration scripts for implementing the 4-PR roadmap.

---

## PR #2: Wishlist Integration - Child Approval System

### Migration File: `015_wishlist_approvals.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 015: Wishlist Approval System for Children
-- ════════════════════════════════════════════════════════════
-- Purpose: Add approval workflow for child wishlists
-- Dependencies: Migration 013 (wishlists schema)
-- ════════════════════════════════════════════════════════════

-- ─── 1. Create Wishlist Approvals Table ──────────────────────

CREATE TABLE IF NOT EXISTS wishlist_approvals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id      UUID NOT NULL REFERENCES wishlists ON DELETE CASCADE,
  requested_by     UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  approved_by      UUID REFERENCES members ON DELETE SET NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at      TIMESTAMPTZ,
  notes            TEXT,
  
  CONSTRAINT wishlist_approvals_unique_request 
    UNIQUE (wishlist_id) 
    WHERE status = 'pending'
);

COMMENT ON TABLE wishlist_approvals IS 'Approval workflow for child wishlists';
COMMENT ON COLUMN wishlist_approvals.status IS 'Approval status: pending, approved, denied';
COMMENT ON COLUMN wishlist_approvals.notes IS 'Optional parent notes when approving/denying';

-- ─── 2. Create Indexes ────────────────────────────────────────

CREATE INDEX idx_wishlist_approvals_wishlist_id 
  ON wishlist_approvals(wishlist_id);

CREATE INDEX idx_wishlist_approvals_status 
  ON wishlist_approvals(status) 
  WHERE status = 'pending';

CREATE INDEX idx_wishlist_approvals_requested_by 
  ON wishlist_approvals(requested_by);

-- ─── 3. Enable RLS ────────────────────────────────────────────

ALTER TABLE wishlist_approvals ENABLE ROW LEVEL SECURITY;

-- ─── 4. RLS Policies ──────────────────────────────────────────

-- Children can view own approval requests
CREATE POLICY "Members can view own approval requests"
ON wishlist_approvals FOR SELECT
USING (
  requested_by IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

-- Parents can view household approvals
CREATE POLICY "Parents can view household approvals"
ON wishlist_approvals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    JOIN wishlists w ON w.id = wishlist_approvals.wishlist_id
    WHERE m.id = wishlist_approvals.requested_by
    AND user_is_household_member(auth.uid(), m.household_id)
    AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin')
  )
);

-- Children can create approval requests
CREATE POLICY "Children can request approval"
ON wishlist_approvals FOR INSERT
WITH CHECK (
  requested_by IN (
    SELECT id FROM members 
    WHERE user_id = auth.uid() 
    AND role = 'child'
  )
);

-- Parents can approve/deny
CREATE POLICY "Parents can approve or deny"
ON wishlist_approvals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM members m
    JOIN wishlists w ON w.id = wishlist_approvals.wishlist_id
    WHERE m.id = wishlist_approvals.requested_by
    AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin')
  )
);

-- ─── 5. Helper Functions ──────────────────────────────────────

-- Request child wishlist approval
CREATE OR REPLACE FUNCTION request_child_wishlist_approval(
  p_wishlist_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_member_id UUID;
  v_approval_id UUID;
BEGIN
  -- Get member ID for current user
  SELECT id INTO v_member_id
  FROM members
  WHERE user_id = auth.uid()
  AND role = 'child';

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Only children can request wishlist approval';
  END IF;

  -- Create approval request
  INSERT INTO wishlist_approvals (
    wishlist_id,
    requested_by,
    status
  ) VALUES (
    p_wishlist_id,
    v_member_id,
    'pending'
  )
  RETURNING id INTO v_approval_id;

  -- Log activity
  INSERT INTO activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  SELECT 
    w.household_id,
    v_member_id,
    'wishlist_approval_requested',
    'wishlist',
    p_wishlist_id,
    jsonb_build_object(
      'approval_id', v_approval_id,
      'wishlist_title', w.title
    )
  FROM wishlists w
  WHERE w.id = p_wishlist_id;

  RETURN v_approval_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve child wishlist
CREATE OR REPLACE FUNCTION approve_child_wishlist(
  p_approval_id UUID,
  p_visibility TEXT DEFAULT 'household'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_member_id UUID;
  v_wishlist_id UUID;
  v_household_id UUID;
BEGIN
  -- Get member ID for current user
  SELECT id INTO v_member_id
  FROM members m
  WHERE m.user_id = auth.uid();

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member';
  END IF;

  -- Get wishlist details and verify permissions
  SELECT 
    wa.wishlist_id,
    m.household_id
  INTO v_wishlist_id, v_household_id
  FROM wishlist_approvals wa
  JOIN members m ON m.id = wa.requested_by
  WHERE wa.id = p_approval_id
  AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin');

  IF v_wishlist_id IS NULL THEN
    RAISE EXCEPTION 'Approval not found or permission denied';
  END IF;

  -- Update approval status
  UPDATE wishlist_approvals
  SET 
    status = 'approved',
    approved_by = v_member_id,
    reviewed_at = NOW()
  WHERE id = p_approval_id;

  -- Update wishlist visibility
  UPDATE wishlists
  SET visibility = p_visibility
  WHERE id = v_wishlist_id;

  -- Log activity
  INSERT INTO activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_household_id,
    v_member_id,
    'wishlist_approved',
    'wishlist',
    v_wishlist_id,
    jsonb_build_object(
      'approval_id', p_approval_id,
      'visibility', p_visibility
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deny child wishlist
CREATE OR REPLACE FUNCTION deny_child_wishlist(
  p_approval_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_member_id UUID;
  v_wishlist_id UUID;
  v_household_id UUID;
BEGIN
  -- Get member ID for current user
  SELECT id INTO v_member_id
  FROM members m
  WHERE m.user_id = auth.uid();

  -- Get wishlist details and verify permissions
  SELECT 
    wa.wishlist_id,
    m.household_id
  INTO v_wishlist_id, v_household_id
  FROM wishlist_approvals wa
  JOIN members m ON m.id = wa.requested_by
  WHERE wa.id = p_approval_id
  AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin');

  IF v_wishlist_id IS NULL THEN
    RAISE EXCEPTION 'Approval not found or permission denied';
  END IF;

  -- Update approval status
  UPDATE wishlist_approvals
  SET 
    status = 'denied',
    approved_by = v_member_id,
    reviewed_at = NOW(),
    notes = p_notes
  WHERE id = p_approval_id;

  -- Log activity
  INSERT INTO activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_household_id,
    v_member_id,
    'wishlist_denied',
    'wishlist',
    v_wishlist_id,
    jsonb_build_object(
      'approval_id', p_approval_id,
      'notes', p_notes
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
```

---

## PR #3: Viewer Role Restrictions

### Migration File: `016_viewer_role_policies.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 016: Viewer Role Policy Updates
-- ════════════════════════════════════════════════════════════
-- Purpose: Enforce read-only access for viewer role
-- Dependencies: Migration 014 (member management)
-- ════════════════════════════════════════════════════════════

-- ─── 1. Helper Function ───────────────────────────────────────

CREATE OR REPLACE FUNCTION user_is_viewer(
  p_user_id UUID,
  p_household_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id
    AND household_id = p_household_id
    AND role = 'viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_is_viewer IS 'Check if user has viewer role in household';

-- ─── 2. Shopping Lists - Viewer Read-Only ────────────────────

-- Drop existing update policy
DROP POLICY IF EXISTS "Members can update household shopping lists" ON shopping_lists;

-- Recreate with viewer restriction
CREATE POLICY "Non-viewer members can update shopping lists"
ON shopping_lists FOR UPDATE
USING (
  user_is_household_member(auth.uid(), household_id)
  AND NOT user_is_viewer(auth.uid(), household_id)
);

-- Drop existing delete policy
DROP POLICY IF EXISTS "Members can delete household shopping lists" ON shopping_lists;

-- Recreate with viewer restriction
CREATE POLICY "Non-viewer members can delete shopping lists"
ON shopping_lists FOR DELETE
USING (
  user_is_household_member(auth.uid(), household_id)
  AND NOT user_is_viewer(auth.uid(), household_id)
  AND (
    created_by_member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
    OR user_is_household_owner(auth.uid(), household_id)
  )
);

-- Viewer can still view (existing SELECT policy remains)

-- ─── 3. Shopping Items - Viewer Read-Only ────────────────────

-- Drop existing insert policy
DROP POLICY IF EXISTS "Members can add items to household lists" ON shopping_items;

-- Recreate with viewer restriction
CREATE POLICY "Non-viewer members can add items"
ON shopping_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shopping_lists sl
    WHERE sl.id = shopping_items.list_id
    AND user_is_household_member(auth.uid(), sl.household_id)
    AND NOT user_is_viewer(auth.uid(), sl.household_id)
  )
);

-- Drop existing update policy
DROP POLICY IF EXISTS "Members can update items in household lists" ON shopping_items;

-- Recreate with viewer restriction
CREATE POLICY "Non-viewer members can update items"
ON shopping_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM shopping_lists sl
    WHERE sl.id = shopping_items.list_id
    AND user_is_household_member(auth.uid(), sl.household_id)
    AND NOT user_is_viewer(auth.uid(), sl.household_id)
  )
);

-- Drop existing delete policy
DROP POLICY IF EXISTS "Members can delete items from household lists" ON shopping_items;

-- Recreate with viewer restriction
CREATE POLICY "Non-viewer members can delete items"
ON shopping_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM shopping_lists sl
    WHERE sl.id = shopping_items.list_id
    AND user_is_household_member(auth.uid(), sl.household_id)
    AND NOT user_is_viewer(auth.uid(), sl.household_id)
  )
);

-- ─── 4. Wishlists - Viewer Read-Only ─────────────────────────

-- Viewers can view household wishlists (existing policy covers this)
-- Ensure viewers cannot create wishlists

-- Drop existing insert policy
DROP POLICY IF EXISTS "Members can create wishlists" ON wishlists;

-- Recreate with viewer restriction
CREATE POLICY "Non-viewer members can create wishlists"
ON wishlists FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM members 
    WHERE user_id = auth.uid() 
    AND role != 'viewer'
  )
);

-- ─── 5. Invitations - Viewer Cannot Invite ───────────────────

-- Update invitation policy to exclude viewers
DROP POLICY IF EXISTS "Admins can send invitations" ON invitations;

CREATE POLICY "Admins can send invitations"
ON invitations FOR INSERT
WITH CHECK (
  invited_by IN (
    SELECT id FROM members
    WHERE user_id = auth.uid()
    AND household_id = invitations.household_id
    AND role IN ('owner', 'admin')
  )
);

-- ─── 6. Viewer Dashboard Query ────────────────────────────────

CREATE OR REPLACE FUNCTION get_viewer_dashboard(
  p_household_id UUID
)
RETURNS TABLE (
  household_name TEXT,
  active_shopping_lists INTEGER,
  total_household_members INTEGER,
  household_wishlists INTEGER
) AS $$
BEGIN
  -- Verify viewer permission
  IF NOT user_is_household_member(auth.uid(), p_household_id) THEN
    RAISE EXCEPTION 'Not a household member';
  END IF;

  RETURN QUERY
  SELECT 
    h.name AS household_name,
    (
      SELECT COUNT(*)::INTEGER
      FROM shopping_lists sl
      WHERE sl.household_id = p_household_id
      AND sl.status = 'active'
    ) AS active_shopping_lists,
    (
      SELECT COUNT(*)::INTEGER
      FROM members m
      WHERE m.household_id = p_household_id
      AND m.is_active = TRUE
    ) AS total_household_members,
    (
      SELECT COUNT(*)::INTEGER
      FROM wishlists w
      WHERE w.household_id = p_household_id
      AND w.visibility IN ('household', 'public')
    ) AS household_wishlists
  FROM households h
  WHERE h.id = p_household_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_viewer_dashboard IS 'Get viewer-safe dashboard data';

-- ═══════════════════════════════════════════════════════════
```

---

## PR #4: Gamification System (Complete)

### Migration File: `017_gamification_schema.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 017: Gamification System
-- ════════════════════════════════════════════════════════════
-- Purpose: Add achievements, points, and rewards system
-- Dependencies: Migration 014 (members table)
-- ════════════════════════════════════════════════════════════

-- ─── 1. Achievements Table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL UNIQUE,
  description      TEXT NOT NULL,
  icon             TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('shopping', 'wishlist', 'family', 'general')),
  tier             TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  min_age          INTEGER,
  max_age          INTEGER,
  points_reward    INTEGER NOT NULL DEFAULT 0,
  criteria         JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT achievements_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT achievements_points_positive CHECK (points_reward >= 0)
);

COMMENT ON TABLE achievements IS 'Global achievement definitions';
COMMENT ON COLUMN achievements.criteria IS 'Achievement unlock conditions (JSONB)';
COMMENT ON COLUMN achievements.tier IS 'Achievement difficulty: bronze < silver < gold < platinum';
COMMENT ON COLUMN achievements.min_age IS 'Minimum age to earn achievement (null = no minimum)';
COMMENT ON COLUMN achievements.max_age IS 'Maximum age to earn achievement (null = no maximum)';

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_tier ON achievements(tier);
CREATE INDEX idx_achievements_active ON achievements(is_active) WHERE is_active = TRUE;

-- ─── 2. Member Achievements Table ─────────────────────────────

CREATE TABLE IF NOT EXISTS member_achievements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id        UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  achievement_id   UUID NOT NULL REFERENCES achievements ON DELETE CASCADE,
  earned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress         JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  UNIQUE(member_id, achievement_id)
);

COMMENT ON TABLE member_achievements IS 'Member achievement tracking';
COMMENT ON COLUMN member_achievements.progress IS 'Partial progress for multi-step achievements';

CREATE INDEX idx_member_achievements_member ON member_achievements(member_id);
CREATE INDEX idx_member_achievements_achievement ON member_achievements(achievement_id);
CREATE INDEX idx_member_achievements_earned_at ON member_achievements(earned_at DESC);

-- ─── 3. Points Transactions Table ─────────────────────────────

CREATE TABLE IF NOT EXISTS points_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id        UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  household_id     UUID NOT NULL REFERENCES households ON DELETE CASCADE,
  points           INTEGER NOT NULL,
  reason           TEXT NOT NULL,
  entity_type      TEXT,
  entity_id        UUID,
  created_by       UUID REFERENCES members ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT points_transactions_reason_length CHECK (char_length(reason) BETWEEN 1 AND 500)
);

COMMENT ON TABLE points_transactions IS 'Points ledger (positive = earned, negative = spent)';
COMMENT ON COLUMN points_transactions.created_by IS 'Who awarded points (parent/system)';

CREATE INDEX idx_points_transactions_member ON points_transactions(member_id);
CREATE INDEX idx_points_transactions_household ON points_transactions(household_id);
CREATE INDEX idx_points_transactions_created_at ON points_transactions(created_at DESC);

-- ─── 4. Rewards Table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rewards (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id     UUID NOT NULL REFERENCES households ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  icon             TEXT NOT NULL,
  points_cost      INTEGER NOT NULL CHECK (points_cost > 0),
  max_redemptions  INTEGER,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT rewards_name_length CHECK (char_length(name) BETWEEN 1 AND 100)
);

COMMENT ON TABLE rewards IS 'Household reward catalog';
COMMENT ON COLUMN rewards.max_redemptions IS 'Maximum redemptions per member (null = unlimited)';

CREATE INDEX idx_rewards_household ON rewards(household_id);
CREATE INDEX idx_rewards_active ON rewards(is_active) WHERE is_active = TRUE;

-- ─── 5. Reward Redemptions Table ──────────────────────────────

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id        UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  reward_id        UUID NOT NULL REFERENCES rewards ON DELETE CASCADE,
  points_spent     INTEGER NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'fulfilled', 'denied')),
  redeemed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by      UUID REFERENCES members ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  fulfilled_at     TIMESTAMPTZ,
  notes            TEXT,
  
  CONSTRAINT reward_redemptions_points_positive CHECK (points_spent > 0)
);

COMMENT ON TABLE reward_redemptions IS 'Reward redemption requests and approvals';
COMMENT ON COLUMN reward_redemptions.status IS 'pending → approved → fulfilled (or denied)';

CREATE INDEX idx_reward_redemptions_member ON reward_redemptions(member_id);
CREATE INDEX idx_reward_redemptions_reward ON reward_redemptions(reward_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);

-- ═══════════════════════════════════════════════════════════
```

### Migration File: `018_gamification_rls.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 018: Gamification RLS Policies
-- ════════════════════════════════════════════════════════════

-- ─── 1. Achievements RLS ──────────────────────────────────────

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active achievements"
ON achievements FOR SELECT
USING (is_active = TRUE);

-- ─── 2. Member Achievements RLS ───────────────────────────────

ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own achievements"
ON member_achievements FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Members can view household achievements"
ON member_achievements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = member_achievements.member_id
    AND user_is_household_member(auth.uid(), m.household_id)
  )
);

-- ─── 3. Points Transactions RLS ───────────────────────────────

ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own points"
ON points_transactions FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view child points"
ON points_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = points_transactions.member_id
    AND user_is_household_member(auth.uid(), m.household_id)
    AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin')
  )
);

-- ─── 4. Rewards RLS ───────────────────────────────────────────

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household rewards"
ON rewards FOR SELECT
USING (
  user_is_household_member(auth.uid(), household_id)
  AND is_active = TRUE
);

CREATE POLICY "Admins can manage rewards"
ON rewards FOR ALL
USING (
  user_is_household_owner(auth.uid(), household_id)
  OR user_is_household_admin(auth.uid(), household_id)
);

-- ─── 5. Reward Redemptions RLS ────────────────────────────────

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own redemptions"
ON reward_redemptions FOR SELECT
USING (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Parents can view household redemptions"
ON reward_redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = reward_redemptions.member_id
    AND user_is_household_member(auth.uid(), m.household_id)
    AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin')
  )
);

CREATE POLICY "Members can create redemptions"
ON reward_redemptions FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Parents can approve redemptions"
ON reward_redemptions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = reward_redemptions.member_id
    AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin')
  )
);

-- ═══════════════════════════════════════════════════════════
```

### Migration File: `019_gamification_functions.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 019: Gamification Helper Functions
-- ════════════════════════════════════════════════════════════

-- ─── 1. Get Member Points Balance ─────────────────────────────

CREATE OR REPLACE FUNCTION get_member_points(p_member_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM points_transactions
  WHERE member_id = p_member_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_member_points IS 'Calculate total points balance for member';

-- ─── 2. Award Achievement ─────────────────────────────────────

CREATE OR REPLACE FUNCTION award_achievement(
  p_member_id UUID,
  p_achievement_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_points INTEGER;
  v_household_id UUID;
  v_achievement_name TEXT;
BEGIN
  -- Check if achievement already earned
  IF EXISTS (
    SELECT 1 FROM member_achievements
    WHERE member_id = p_member_id
    AND achievement_id = p_achievement_id
  ) THEN
    RETURN FALSE; -- Already earned
  END IF;

  -- Get achievement points and household
  SELECT 
    a.points_reward,
    m.household_id,
    a.name
  INTO v_points, v_household_id, v_achievement_name
  FROM achievements a
  CROSS JOIN members m
  WHERE a.id = p_achievement_id
  AND m.id = p_member_id;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Member or achievement not found';
  END IF;

  -- Award achievement
  INSERT INTO member_achievements (member_id, achievement_id)
  VALUES (p_member_id, p_achievement_id);

  -- Award points
  INSERT INTO points_transactions (
    member_id,
    household_id,
    points,
    reason,
    entity_type,
    entity_id
  ) VALUES (
    p_member_id,
    v_household_id,
    v_points,
    'Achievement earned: ' || v_achievement_name,
    'achievement',
    p_achievement_id
  );

  -- Log activity
  INSERT INTO activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_household_id,
    p_member_id,
    'achievement_earned',
    'achievement',
    p_achievement_id,
    jsonb_build_object(
      'achievement_name', v_achievement_name,
      'points_awarded', v_points
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Redeem Reward ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION redeem_reward(
  p_reward_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_member_id UUID;
  v_points_cost INTEGER;
  v_points_balance INTEGER;
  v_household_id UUID;
  v_redemption_id UUID;
BEGIN
  -- Get member ID
  SELECT id, household_id INTO v_member_id, v_household_id
  FROM members
  WHERE user_id = auth.uid();

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member';
  END IF;

  -- Get reward cost
  SELECT points_cost INTO v_points_cost
  FROM rewards
  WHERE id = p_reward_id
  AND household_id = v_household_id
  AND is_active = TRUE;

  IF v_points_cost IS NULL THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;

  -- Check points balance
  v_points_balance := get_member_points(v_member_id);
  
  IF v_points_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points (have: %, need: %)', v_points_balance, v_points_cost;
  END IF;

  -- Create redemption request
  INSERT INTO reward_redemptions (
    member_id,
    reward_id,
    points_spent,
    status
  ) VALUES (
    v_member_id,
    p_reward_id,
    v_points_cost,
    'pending'
  )
  RETURNING id INTO v_redemption_id;

  -- Log activity
  INSERT INTO activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_household_id,
    v_member_id,
    'reward_redemption_requested',
    'reward',
    p_reward_id,
    jsonb_build_object(
      'redemption_id', v_redemption_id,
      'points_cost', v_points_cost
    )
  );

  RETURN v_redemption_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. Approve Redemption ────────────────────────────────────

CREATE OR REPLACE FUNCTION approve_redemption(
  p_redemption_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_member_id UUID;
  v_points_cost INTEGER;
  v_household_id UUID;
  v_redeemer_id UUID;
BEGIN
  -- Get current member ID
  SELECT id INTO v_member_id
  FROM members
  WHERE user_id = auth.uid();

  -- Get redemption details and verify permissions
  SELECT 
    rr.points_spent,
    m.household_id,
    rr.member_id
  INTO v_points_cost, v_household_id, v_redeemer_id
  FROM reward_redemptions rr
  JOIN members m ON m.id = rr.member_id
  WHERE rr.id = p_redemption_id
  AND rr.status = 'pending'
  AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin');

  IF v_points_cost IS NULL THEN
    RAISE EXCEPTION 'Redemption not found or permission denied';
  END IF;

  -- Update redemption status
  UPDATE reward_redemptions
  SET 
    status = 'approved',
    approved_by = v_member_id,
    approved_at = NOW()
  WHERE id = p_redemption_id;

  -- Deduct points
  INSERT INTO points_transactions (
    member_id,
    household_id,
    points,
    reason,
    entity_type,
    entity_id,
    created_by
  ) VALUES (
    v_redeemer_id,
    v_household_id,
    -v_points_cost,
    'Reward redeemed',
    'reward_redemption',
    p_redemption_id,
    v_member_id
  );

  -- Log activity
  INSERT INTO activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_household_id,
    v_member_id,
    'redemption_approved',
    'reward_redemption',
    p_redemption_id,
    jsonb_build_object(
      'points_deducted', v_points_cost,
      'redeemer_id', v_redeemer_id
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Get Household Leaderboard ─────────────────────────────

CREATE OR REPLACE FUNCTION get_household_leaderboard(
  p_household_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  member_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  achievements_count INTEGER,
  rank INTEGER
) AS $$
BEGIN
  -- Verify membership
  IF NOT user_is_household_member(auth.uid(), p_household_id) THEN
    RAISE EXCEPTION 'Not a household member';
  END IF;

  RETURN QUERY
  WITH member_stats AS (
    SELECT 
      m.id AS member_id,
      m.display_name,
      m.avatar_url,
      COALESCE(SUM(pt.points), 0)::INTEGER AS total_points,
      (
        SELECT COUNT(*)::INTEGER
        FROM member_achievements ma
        WHERE ma.member_id = m.id
      ) AS achievements_count
    FROM members m
    LEFT JOIN points_transactions pt ON pt.member_id = m.id
    WHERE m.household_id = p_household_id
    AND m.is_active = TRUE
    AND m.role IN ('owner', 'admin', 'member', 'child')
    GROUP BY m.id, m.display_name, m.avatar_url
  )
  SELECT 
    ms.*,
    RANK() OVER (ORDER BY ms.total_points DESC, ms.achievements_count DESC)::INTEGER AS rank
  FROM member_stats ms
  ORDER BY rank
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════
```

### Migration File: `020_gamification_seed_data.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 020: Gamification Seed Data
-- ════════════════════════════════════════════════════════════

-- ─── Seed Achievements ────────────────────────────────────────

INSERT INTO achievements (name, description, icon, category, tier, min_age, max_age, points_reward, criteria) VALUES
  -- Shopping Achievements (Bronze)
  ('First Steps', 'Add your first shopping item', '👣', 'shopping', 'bronze', NULL, NULL, 10, '{"type": "count", "entity": "shopping_items_added", "count": 1}'::jsonb),
  ('Shopping Helper', 'Mark 5 items as purchased', '🛒', 'shopping', 'bronze', NULL, NULL, 25, '{"type": "count", "entity": "items_purchased", "count": 5}'::jsonb),
  
  -- Shopping Achievements (Silver)
  ('Shopping Pro', 'Mark 25 items as purchased', '🏆', 'shopping', 'silver', NULL, NULL, 50, '{"type": "count", "entity": "items_purchased", "count": 25}'::jsonb),
  ('List Creator', 'Create 5 shopping lists', '📋', 'shopping', 'silver', NULL, NULL, 50, '{"type": "count", "entity": "shopping_lists_created", "count": 5}'::jsonb),
  
  -- Shopping Achievements (Gold)
  ('Shopping Master', 'Mark 100 items as purchased', '🌟', 'shopping', 'gold', NULL, NULL, 100, '{"type": "count", "entity": "items_purchased", "count": 100}'::jsonb),
  ('Organization Expert', 'Create a shopping list with 30+ items', '📊', 'shopping', 'gold', NULL, NULL, 100, '{"type": "single", "entity": "large_shopping_list", "threshold": 30}'::jsonb),
  
  -- Wishlist Achievements (Bronze)
  ('Wishlist Dreamer', 'Create your first wishlist', '💭', 'wishlist', 'bronze', NULL, NULL, 10, '{"type": "count", "entity": "wishlists_created", "count": 1}'::jsonb),
  ('Dream Big', 'Add 5 items to wishlists', '⭐', 'wishlist', 'bronze', NULL, NULL, 25, '{"type": "count", "entity": "wishlist_items_added", "count": 5}'::jsonb),
  
  -- Wishlist Achievements (Silver)
  ('Birthday Planner', 'Add 10 items to your birthday wishlist', '🎂', 'wishlist', 'silver', 5, 17, 50, '{"type": "count", "entity": "birthday_wishlist_items", "count": 10}'::jsonb),
  ('Wish Maker', 'Add 25 items to wishlists', '🌠', 'wishlist', 'silver', NULL, NULL, 50, '{"type": "count", "entity": "wishlist_items_added", "count": 25}'::jsonb),
  
  -- Wishlist Achievements (Gold)
  ('Grateful Heart', 'Thank someone for reserving a wishlist item', '💝', 'wishlist', 'gold', NULL, NULL, 100, '{"type": "count", "entity": "reservations_thanked", "count": 1}'::jsonb),
  ('Wishlist Expert', 'Have 3 wishlists with 10+ items each', '🎁', 'wishlist', 'gold', NULL, NULL, 100, '{"type": "complex", "entity": "multiple_large_wishlists", "count": 3, "items_per": 10}'::jsonb),
  
  -- Family Achievements (Bronze)
  ('Family Helper', 'Help with 5 household tasks', '👨‍👩‍👧', 'family', 'bronze', NULL, NULL, 25, '{"type": "count", "entity": "household_tasks_completed", "count": 5}'::jsonb),
  ('Team Player', 'Add items to 3 different shopping lists', '🤝', 'family', 'bronze', NULL, NULL, 25, '{"type": "count", "entity": "lists_contributed_to", "count": 3}'::jsonb),
  
  -- Family Achievements (Silver)
  ('Responsible Member', 'Complete 25 household tasks', '⭐', 'family', 'silver', NULL, NULL, 50, '{"type": "count", "entity": "household_tasks_completed", "count": 25}'::jsonb),
  
  -- General Achievements (Bronze)
  ('Early Bird', 'Log in before 8 AM', '🌅', 'general', 'bronze', NULL, NULL, 5, '{"type": "time_based", "entity": "early_login", "time": "08:00"}'::jsonb),
  ('Night Owl', 'Log in after 10 PM', '🦉', 'general', 'bronze', NULL, NULL, 5, '{"type": "time_based", "entity": "late_login", "time": "22:00"}'::jsonb),
  
  -- General Achievements (Silver)
  ('Consistency', 'Log in for 7 days straight', '📅', 'general', 'silver', NULL, NULL, 75, '{"type": "streak", "entity": "daily_login", "days": 7}'::jsonb),
  ('Dedication', 'Log in for 30 days straight', '🔥', 'general', 'silver', NULL, NULL, 150, '{"type": "streak", "entity": "daily_login", "days": 30}'::jsonb),
  
  -- General Achievements (Gold)
  ('Century Club', 'Earn 100 total points', '💯', 'general', 'gold', NULL, NULL, 50, '{"type": "milestone", "entity": "total_points", "threshold": 100}'::jsonb),
  
  -- Platinum Achievements
  ('Legend', 'Earn all achievements in all categories', '👑', 'general', 'platinum', NULL, NULL, 500, '{"type": "meta", "entity": "all_achievements"}'::jsonb),
  ('Point Master', 'Earn 1000 total points', '💎', 'general', 'platinum', NULL, NULL, 200, '{"type": "milestone", "entity": "total_points", "threshold": 1000}'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
```

---

## Testing Queries

### Verify Migrations

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'achievements',
  'member_achievements',
  'points_transactions',
  'rewards',
  'reward_redemptions',
  'wishlist_approvals'
)
ORDER BY table_name;

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'achievements',
  'member_achievements',
  'points_transactions',
  'rewards',
  'reward_redemptions',
  'wishlist_approvals'
);

-- Count achievements
SELECT COUNT(*) AS total_achievements FROM achievements;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_member_points',
  'award_achievement',
  'redeem_reward',
  'approve_redemption',
  'get_household_leaderboard',
  'request_child_wishlist_approval',
  'approve_child_wishlist',
  'deny_child_wishlist',
  'user_is_viewer',
  'get_viewer_dashboard'
);
```

---

## Rollback Scripts

### Rollback PR #4 (Gamification)
```sql
-- Drop in reverse order
DROP TABLE IF EXISTS reward_redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS points_transactions CASCADE;
DROP TABLE IF EXISTS member_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;

DROP FUNCTION IF EXISTS get_household_leaderboard;
DROP FUNCTION IF EXISTS approve_redemption;
DROP FUNCTION IF EXISTS redeem_reward;
DROP FUNCTION IF EXISTS award_achievement;
DROP FUNCTION IF EXISTS get_member_points;
```

### Rollback PR #3 (Viewer Role)
```sql
-- Restore original policies (would need original policy definitions)
DROP FUNCTION IF EXISTS get_viewer_dashboard;
DROP FUNCTION IF EXISTS user_is_viewer;
```

### Rollback PR #2 (Wishlist Approvals)
```sql
DROP TABLE IF EXISTS wishlist_approvals CASCADE;
DROP FUNCTION IF EXISTS deny_child_wishlist;
DROP FUNCTION IF EXISTS approve_child_wishlist;
DROP FUNCTION IF EXISTS request_child_wishlist_approval;
```

---

