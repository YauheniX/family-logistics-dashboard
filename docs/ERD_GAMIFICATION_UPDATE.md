# Entity Relationship Diagram - Gamification Update

## Updated ERD with Gamification System

```
┌──────────────────────┐
│    auth.users        │ (Supabase Auth)
│  ─────────────────   │
│  id (PK)             │
│  email               │
│  created_at          │
└──────────┬───────────┘
           │ 1:1
           ▼
┌──────────────────────┐
│  user_profiles       │
│  ─────────────────   │
│  id (PK, FK)         │
│  display_name        │
│  avatar_url          │
│  created_at          │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐         ┌─────────────────────────┐
│     members          │◄────────│      households         │
│  ─────────────────   │   N:1   │  ────────────────────   │
│  id (PK)             │         │  id (PK)                │
│  household_id (FK) ─────────►  │  name                   │
│  user_id (FK, null)  │         │  slug (unique)          │
│  role                │         │  created_by (FK)        │
│  display_name        │         │  settings (JSONB)       │
│  date_of_birth       │         │  is_active              │
│  avatar_url          │         └─────────┬───────────────┘
│  is_active           │                   │
│  metadata (JSONB)    │                   │ 1:N
└──────────┬───────────┘                   │
           │                               │
           │                               ▼
           │                     ┌─────────────────────────┐
           │                     │    invitations          │
           │                     │  ────────────────────   │
           │                     │  id (PK)                │
           │                     │  household_id (FK)      │
           │                     │  email                  │
           │                     │  role                   │
           │                     │  invited_by (FK)        │
           │                     │  token (unique)         │
           │                     │  expires_at             │
           │                     │  status                 │
           │                     └─────────────────────────┘
           │
           │ 1:N (creator)
           ├─────────────────────────────────┐
           │                                 │
           ▼                                 ▼
┌──────────────────────┐         ┌─────────────────────────┐
│  shopping_lists      │         │      wishlists          │
│  ─────────────────   │         │  ────────────────────   │
│  id (PK)             │         │  id (PK)                │
│  household_id (FK)   │         │  member_id (FK)         │
│  title               │         │  household_id (FK)      │
│  created_by_mem (FK) │         │  title                  │
│  status              │         │  visibility             │
└──────────┬───────────┘         │  share_slug (unique)    │
           │ 1:N                 └──────────┬──────────────┘
           ▼                                │ 1:N
┌──────────────────────┐                    ▼
│  shopping_items      │         ┌─────────────────────────┐
│  ─────────────────   │         │   wishlist_items        │
│  id (PK)             │         │  ────────────────────   │
│  list_id (FK)        │         │  id (PK)                │
│  title               │         │  wishlist_id (FK)       │
│  quantity            │         │  title                  │
│  category            │         │  link, price, priority  │
│  is_purchased        │         │  is_reserved            │
│  added_by_mem (FK)   │         │  reserved_by_email      │
│  purchased_by_mem    │         │  reserved_by_name       │
└──────────────────────┘         └─────────────────────────┘


══════════════════════════════════════════════════════════
    GAMIFICATION SYSTEM (NEW)
══════════════════════════════════════════════════════════

┌──────────────────────┐
│   achievements       │  (Global Achievement Definitions)
│  ─────────────────   │
│  id (PK)             │
│  name                │
│  description         │
│  icon                │
│  category            │  ─┐ (shopping, wishlist, family, general)
│  tier                │  └─ (bronze, silver, gold, platinum)
│  min_age, max_age    │  ─── Age restrictions
│  points_reward       │
│  criteria (JSONB)    │  ─── Achievement unlock conditions
│  is_active           │
└──────────┬───────────┘
           │ 1:N
           ▼
┌─────────────────────────────┐
│   member_achievements       │  (User Achievement Tracking)
│  ────────────────────────   │
│  id (PK)                    │
│  member_id (FK) ────────────┼────► members.id
│  achievement_id (FK) ───────┼────► achievements.id
│  earned_at                  │
│  progress (JSONB)           │  ─── Partial progress tracking
│  UNIQUE(member_id, achiev.) │
└─────────────────────────────┘


┌──────────────────────┐
│      members         │
└──────────┬───────────┘
           │ 1:N
           ▼
┌─────────────────────────────┐
│   points_transactions       │  (Points Ledger)
│  ────────────────────────   │
│  id (PK)                    │
│  member_id (FK) ────────────┼────► members.id
│  household_id (FK) ─────────┼────► households.id
│  points                     │  ─── (+earned, -spent)
│  reason                     │
│  entity_type, entity_id     │  ─── Link to achievement/reward
│  created_by (FK)            │  ─── Who awarded (parent/system)
│  created_at                 │
└─────────────────────────────┘
           │
           │ Points Balance = SUM(points) per member
           │


┌──────────────────────┐
│    households        │
└──────────┬───────────┘
           │ 1:N
           ▼
┌─────────────────────────────┐
│        rewards              │  (Household Reward Catalog)
│  ────────────────────────   │
│  id (PK)                    │
│  household_id (FK) ─────────┼────► households.id
│  name                       │
│  description                │
│  icon                       │
│  points_cost                │
│  max_redemptions            │  ─── null = unlimited
│  is_active                  │
│  created_by (FK) ───────────┼────► members.id
└──────────┬──────────────────┘
           │ 1:N
           ▼
┌─────────────────────────────┐
│   reward_redemptions        │  (Redemption Requests)
│  ────────────────────────   │
│  id (PK)                    │
│  member_id (FK) ────────────┼────► members.id
│  reward_id (FK) ────────────┼────► rewards.id
│  points_spent               │
│  status ─────────────────── │ ─┐ (pending, approved, fulfilled, denied)
│  redeemed_at                │  │
│  approved_by (FK) ──────────┼──┼─► members.id (parent)
│  approved_at                │  │
│  fulfilled_at               │  │
│  notes                      │  └─ Parent notes
└─────────────────────────────┘


══════════════════════════════════════════════════════════
    WISHLIST APPROVALS (PR #2)
══════════════════════════════════════════════════════════

┌──────────────────────┐
│     wishlists        │
└──────────┬───────────┘
           │ 1:N
           ▼
┌─────────────────────────────┐
│   wishlist_approvals        │  (Child Wishlist Approvals)
│  ────────────────────────   │
│  id (PK)                    │
│  wishlist_id (FK) ──────────┼────► wishlists.id
│  requested_by (FK) ─────────┼────► members.id (child)
│  approved_by (FK) ──────────┼────► members.id (parent)
│  status ─────────────────── │ ─── (pending, approved, denied)
│  requested_at               │
│  reviewed_at                │
│  notes                      │
└─────────────────────────────┘


══════════════════════════════════════════════════════════
    ACTIVITY LOGS (Existing)
══════════════════════════════════════════════════════════

┌──────────────────────┐         ┌──────────────────────┐
│    households        │         │      members         │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │ 1:N                            │ 1:N
           └────────────┬───────────────────┘
                        ▼
              ┌─────────────────────────────┐
              │     activity_logs           │
              │  ────────────────────────   │
              │  id (PK)                    │
              │  household_id (FK)          │
              │  member_id (FK)             │
              │  action                     │
              │  entity_type, entity_id     │
              │  metadata (JSONB)           │
              │  created_at                 │
              └─────────────────────────────┘
```

---

## Table Relationships Summary

### Core Tables (Existing)
- `auth.users` 1:1 `user_profiles`
- `user_profiles` 1:N `members`
- `households` 1:N `members` (via household_id)
- `households` 1:N `shopping_lists`, `wishlists`, `invitations`, `activity_logs`, `rewards`
- `members` 1:N `shopping_lists`, `wishlists`, `shopping_items` (creator)
- `shopping_lists` 1:N `shopping_items`
- `wishlists` 1:N `wishlist_items`

### Gamification Tables (New)
- `achievements` 1:N `member_achievements`
- `members` 1:N `member_achievements`
- `members` 1:N `points_transactions`
- `households` 1:N `points_transactions`
- `households` 1:N `rewards`
- `rewards` 1:N `reward_redemptions`
- `members` 1:N `reward_redemptions` (redeemer)
- `members` 1:N `reward_redemptions` (approver, via approved_by)

### Wishlist Approvals (New)
- `wishlists` 1:N `wishlist_approvals`
- `members` 1:N `wishlist_approvals` (requester)
- `members` 1:N `wishlist_approvals` (approver)

---

## Cascade Delete Behavior

| Parent Table | Child Table | On Delete Action |
|--------------|-------------|------------------|
| auth.users | user_profiles | CASCADE |
| households | members | CASCADE |
| households | shopping_lists | CASCADE |
| households | wishlists | CASCADE |
| households | invitations | CASCADE |
| households | activity_logs | CASCADE |
| households | points_transactions | CASCADE |
| households | rewards | CASCADE |
| members | member_achievements | CASCADE |
| members | points_transactions | CASCADE |
| members | reward_redemptions | CASCADE |
| achievements | member_achievements | CASCADE |
| rewards | reward_redemptions | CASCADE |
| wishlists | wishlist_items | CASCADE |
| wishlists | wishlist_approvals | CASCADE |

**Key Design Decision**: 
- If a household is deleted → All members, shopping lists, wishlists, points, rewards CASCADE delete
- If an auth.user is deleted → user_id in members becomes NULL (soft member remains)
- If a member is deleted → All their achievements, points, redemptions CASCADE delete

---

## Indexes for Performance

### Existing Indexes
- `members(household_id)` - Household member lookups
- `members(user_id)` - User membership lookups
- `shopping_lists(household_id)` - List queries
- `shopping_items(list_id)` - Item queries
- `wishlists(member_id)` - Member wishlist queries
- `wishlists(share_slug)` - Public wishlist lookups

### New Indexes (PR #4 - Gamification)
- `member_achievements(member_id)` - Member achievement queries
- `member_achievements(achievement_id)` - Achievement popularity tracking
- `points_transactions(member_id)` - Points balance calculation
- `points_transactions(household_id)` - Household leaderboard
- `points_transactions(created_at)` - Recent activity queries
- `rewards(household_id)` - Reward catalog queries
- `reward_redemptions(member_id)` - Redemption history
- `reward_redemptions(status)` - Pending approvals

### New Indexes (PR #2 - Wishlist Approvals)
- `wishlist_approvals(wishlist_id)` - Approval status lookups
- `wishlist_approvals(status)` - Pending approvals query
- `wishlist_approvals(requested_by)` - Child's approval requests

---

## JSONB Schema Examples

### achievements.criteria (JSONB)
```json
{
  "type": "count",
  "entity": "shopping_items_purchased",
  "count": 10,
  "timeframe": null
}
```

```json
{
  "type": "streak",
  "entity": "daily_login",
  "days": 7
}
```

### member_achievements.progress (JSONB)
```json
{
  "current": 5,
  "target": 10,
  "last_updated": "2026-02-15T18:00:00Z"
}
```

### members.metadata (JSONB)
```json
{
  "onboarding_completed": true,
  "preferences": {
    "notifications": true,
    "theme": "light"
  },
  "gamification": {
    "favorite_category": "wishlist",
    "last_achievement_at": "2026-02-14T12:00:00Z"
  }
}
```

### households.settings (JSONB)
```json
{
  "timezone": "America/New_York",
  "currency": "USD",
  "gamification": {
    "enabled": true,
    "min_age_for_points": 5,
    "parent_approval_required": true
  }
}
```

### activity_logs.metadata (JSONB)
```json
{
  "achievement_id": "uuid",
  "points_awarded": 50,
  "tier": "gold",
  "triggered_by": "shopping_item_purchased"
}
```

---

## Foreign Key Constraints Summary

| Table | Column | References | Constraint Name |
|-------|--------|------------|-----------------|
| members | household_id | households(id) | members_household_id_fkey |
| members | user_id | auth.users(id) | members_user_id_fkey |
| member_achievements | member_id | members(id) | member_achievements_member_id_fkey |
| member_achievements | achievement_id | achievements(id) | member_achievements_achievement_id_fkey |
| points_transactions | member_id | members(id) | points_transactions_member_id_fkey |
| points_transactions | household_id | households(id) | points_transactions_household_id_fkey |
| rewards | household_id | households(id) | rewards_household_id_fkey |
| rewards | created_by | members(id) | rewards_created_by_fkey |
| reward_redemptions | member_id | members(id) | reward_redemptions_member_id_fkey |
| reward_redemptions | reward_id | rewards(id) | reward_redemptions_reward_id_fkey |
| reward_redemptions | approved_by | members(id) | reward_redemptions_approved_by_fkey |
| wishlist_approvals | wishlist_id | wishlists(id) | wishlist_approvals_wishlist_id_fkey |
| wishlist_approvals | requested_by | members(id) | wishlist_approvals_requested_by_fkey |
| wishlist_approvals | approved_by | members(id) | wishlist_approvals_approved_by_fkey |

---

## Unique Constraints

| Table | Columns | Purpose |
|-------|---------|---------|
| households | slug | URL-friendly unique identifier |
| members | (household_id, user_id) | User can only join household once |
| member_achievements | (member_id, achievement_id) | Achievement earned once per member |
| invitations | (household_id, email, status) | One pending invitation per email |
| wishlists | share_slug | Unique public sharing URL |
| achievements | name | Prevent duplicate achievement names |

---

## Check Constraints

| Table | Column | Constraint |
|-------|--------|------------|
| members | role | IN ('owner', 'admin', 'member', 'child', 'viewer') |
| members | date_of_birth | role != 'child' OR date_of_birth IS NOT NULL |
| achievements | category | IN ('shopping', 'wishlist', 'family', 'general') |
| achievements | tier | IN ('bronze', 'silver', 'gold', 'platinum') |
| rewards | points_cost | points_cost > 0 |
| reward_redemptions | status | IN ('pending', 'approved', 'fulfilled', 'denied') |
| wishlist_approvals | status | IN ('pending', 'approved', 'denied') |
| invitations | status | IN ('pending', 'accepted', 'declined', 'expired') |

---

## Data Flow Example: Child Earns Achievement

```
1. Child marks shopping item as purchased
   ↓
2. Trigger: update_shopping_item_trigger()
   ↓
3. Call: auto_check_achievements(member_id)
   ↓
4. Query: Check if member meets criteria for any achievements
   ↓
5. If met: INSERT INTO member_achievements
   ↓
6. INSERT INTO points_transactions (+points)
   ↓
7. INSERT INTO activity_logs (achievement_earned)
   ↓
8. Frontend: Toast notification + badge animation
```

---

