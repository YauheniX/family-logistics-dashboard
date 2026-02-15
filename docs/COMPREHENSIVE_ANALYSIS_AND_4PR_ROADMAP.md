# 🎯 Comprehensive Analysis & 4-PR Roadmap

# Family Logistics Dashboard - SaaS Evolution Plan

**Date**: February 15, 2026  
**Version**: 1.0  
**Status**: Analysis Complete

---

## Executive Summary

This document provides a complete analysis of the Family Logistics Dashboard's current state and defines a clear 4-PR roadmap to evolve it into a production-grade multi-tenant SaaS platform with shopping lists, advanced wishlists, viewer role restrictions, and gamified child features.

### Key Findings

✅ **Strong Foundation**: Multi-tenant architecture (households, members, invitations) is production-ready  
✅ **Shopping Ready**: Database schema complete, needs frontend integration  
⚠️ **Wishlist Partial**: Backend complete, needs frontend visibility controls  
⚠️ **Viewer Role**: Schema ready, needs RLS policy updates and UI restrictions  
❌ **Gamification**: Completely missing - requires full implementation (DB + frontend)

---

# PHASE 1: CURRENT STATE ANALYSIS

## 1.1 Database Schema Overview

### ✅ Existing Tables (Production-Ready)

| Table              | Purpose                      | Key Columns                                                                                      | Status      |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| **households**     | Multi-tenant groups          | id, name, slug, created_by, settings                                                             | ✅ Complete |
| **members**        | Household members with roles | id, household_id, user_id (nullable), role, display_name, date_of_birth                          | ✅ Complete |
| **invitations**    | Email-based member invites   | id, household_id, email, role, token, expires_at                                                 | ✅ Complete |
| **activity_logs**  | Audit trail                  | id, household_id, member_id, action, entity_type, metadata                                       | ✅ Complete |
| **shopping_lists** | Household shopping lists     | id, household_id, title, status, created_by_member_id                                            | ✅ Complete |
| **shopping_items** | Shopping list items          | id, list_id, title, quantity, category, is_purchased, added_by_member_id, purchased_by_member_id | ✅ Complete |
| **wishlists**      | Member wishlists             | id, member_id, household_id, title, visibility, share_slug                                       | ✅ Complete |
| **wishlist_items** | Wishlist items               | id, wishlist_id, title, link, price, priority, is_reserved, reserved_by_email, reserved_by_name  | ✅ Complete |
| **user_profiles**  | Extended user profiles       | id (FK auth.users), display_name, avatar_url                                                     | ✅ Complete |

### ❌ Missing Tables (Gamification)

| Table Needed            | Purpose                     | Priority |
| ----------------------- | --------------------------- | -------- |
| **achievements**        | Achievement definitions     | HIGH     |
| **member_achievements** | Member achievement tracking | HIGH     |
| **points_transactions** | Points earned/spent history | MEDIUM   |
| **rewards**             | Redeemable rewards catalog  | MEDIUM   |
| **challenges**          | Age-appropriate tasks       | LOW      |

---

## 1.2 Current Role System

### Implemented Roles (5 Tiers)

| Role       | Access Level                        | Auth Required | Use Case                            |
| ---------- | ----------------------------------- | ------------- | ----------------------------------- |
| **owner**  | Full control, cannot be removed     | Yes           | Household creator                   |
| **admin**  | Manage members, full content access | Yes           | Co-parent, trusted adult            |
| **member** | Create/edit content                 | Yes           | Adult family members                |
| **child**  | Limited access, no invitations      | Optional      | Children (with or without accounts) |
| **viewer** | Read-only (partially implemented)   | Optional      | Grandparents, caregivers            |

**Note**: `public_guest` role exists in design docs but not implemented in database.

---

## 1.3 Current RLS Policies

### Households

- ✅ Select: Creator or member
- ✅ Insert: Any authenticated user
- ✅ Update: Owner or admin
- ✅ Delete: Owner only

### Members

- ✅ Select: Self or household member
- ✅ Insert: Owner or admin (via RPC)
- ✅ Update: Self (own profile) or owner/admin (others)
- ✅ Delete: Owner/admin (or self-removal)

### Shopping Lists

- ✅ Select: Household member
- ✅ Insert: Owner, admin, or member only (children excluded by current RLS)
- ✅ Update: List creator or owner/admin
- ✅ Delete: List creator or owner

**Note**: Current RLS in `012_update_shopping_schema.sql` excludes children from creating lists. To allow children to create lists, the `shopping_lists_insert_v2` policy needs to be updated to include `role = 'child'`.

### Shopping Items

- ✅ Select: Household member
- ✅ Insert: Any household member (including children)
- ✅ Update: Item creator or owner/admin
- ✅ Delete: Item creator or owner

### Wishlists

- ✅ Select: Owner, household members (if visibility='household'), or public (if visibility='public')
- ✅ Insert: Any household member
- ✅ Update: Wishlist owner
- ✅ Delete: Wishlist owner

### Wishlist Items

- ✅ Select: Based on parent wishlist visibility
- ✅ Insert: Wishlist owner
- ✅ Update: Wishlist owner (full) OR anonymous (reservation only via RPC)
- ✅ Delete: Wishlist owner

---

## 1.4 Current Pinia Stores

### Root Stores (`/src/stores`)

1. **auth.store.ts** (legacy) - Deprecated, delegates to new auth service
2. **household.store.ts** - Household context management, role permissions
3. **toast.store.ts** - Toast notifications

### Feature Stores (`/src/features/*/presentation`)

4. **auth.store.ts** (new) - User authentication with Supabase
5. **shopping.store.ts** - Shopping list & item management
6. **wishlist.store.ts** - Wishlist & item management with public sharing
7. **family.store.ts** - Family & member management (legacy naming)

### Store Health Assessment

| Store           | Status      | Issues                                                      |
| --------------- | ----------- | ----------------------------------------------------------- |
| auth.store      | ✅ Working  | Dual stores (legacy + new) cause confusion                  |
| household.store | ✅ Working  | Well-structured, role-based getters                         |
| shopping.store  | ⚠️ Partial  | Basic CRUD works, missing multi-household awareness         |
| wishlist.store  | ⚠️ Partial  | Missing visibility controls in UI                           |
| family.store    | ⚠️ Outdated | Uses old `families` schema, needs migration to `households` |

---

## 1.5 Current Vue Components

### Member Management

- ✅ `MemberCard.vue` - Member display with role badges
- ✅ `AddChildModal.vue` - Child profile creation with emoji avatars
- ✅ `InviteMemberModal.vue` - Email-based member invitations
- ✅ `MemberManagementView.vue` - Member grid with role-based actions

### Shopping Lists

- ✅ `ShoppingListView.vue` - List display with item management
- ⚠️ Missing: Category filters, bulk operations, household switcher integration

### Wishlists

- ✅ `WishlistListView.vue` - Wishlist grid
- ✅ `WishlistEditView.vue` - Wishlist item management
- ✅ `PublicWishlistView.vue` - Public share page
- ⚠️ Missing: Visibility toggle UI, household-shared wishlist view

### Layout

- ✅ `HouseholdSwitcher.vue` - Household context switcher
- ✅ `SidebarNav.vue` - Mobile navigation
- ✅ `BottomNav.vue` - Mobile quick access
- ✅ `Breadcrumbs.vue` - Navigation breadcrumbs

### Child Features

- ✅ `AddChildModal.vue` - Child creation with age calculation
- ⚠️ Missing: Child dashboard, achievement display, progress tracking

---

## 1.6 Authentication System

### Current Setup (Supabase Auth)

- ✅ Email/password authentication
- ✅ Google OAuth
- ✅ Auto-profile creation trigger (`handle_new_user()`)
- ✅ Session management
- ⚠️ No child-specific age verification
- ⚠️ No parental consent flow

---

## 1.7 Helper Functions (RPC)

### Member Management

1. `create_child_member()` - Create child without auth account
2. `invite_member()` - Send email invitation
3. `accept_invitation()` - Accept pending invitation
4. `activate_child_account()` - Upgrade child to auth user
5. `promote_member_role()` - Change member role
6. `remove_member()` - Remove member from household

### Role Checks

7. `user_is_household_member(p_household_id, p_user_id)` - Check if user is member of household
8. `get_member_role(p_household_id, p_user_id)` - Get user's role in household
9. `has_min_role(p_household_id, p_user_id, p_required_role)` - Check if user has minimum required role
10. `get_member_id(p_household_id, p_user_id)` - Get member ID for user in household

### Utilities

11. `get_user_id_by_email()` - Email lookup
12. `get_email_by_user_id()` - Reverse lookup
13. `log_activity()` - Activity logging
14. `reserve_wishlist_item()` - Public reservation (security-definer)
15. `generate_invitation_token()` - Create secure token

---

## 1.8 Storage Configuration

### Existing Buckets

- ✅ `wishlist-images` - Public bucket for wishlist item images
- ⚠️ Missing: `member-avatars` bucket for custom avatars
- ⚠️ Missing: `achievement-badges` bucket for gamification

---

# PHASE 2: GAP ANALYSIS

## 2.1 Shopping List Integration Gaps

### Backend ✅ Complete

- ✅ Database schema (households, shopping_lists, shopping_items)
- ✅ RLS policies (household isolation, role-based access)
- ✅ Activity logging
- ✅ Member tracking (added_by, purchased_by)

### Frontend ⚠️ Partial

- ✅ Basic CRUD (ShoppingListView)
- ⚠️ No household context switching in shopping view
- ❌ No category-based filtering
- ❌ No bulk item operations
- ❌ No shopping history/analytics
- ❌ No item assignment to specific members

### Missing Features

1. Category management (predefined + custom)
2. Bulk add items (paste list, import from template)
3. Shopping history analytics
4. Item suggestions based on history
5. Recurring shopping lists (weekly groceries)
6. Shopping mode (optimized for in-store use)

---

## 2.2 Wishlist Integration Gaps

### Backend ✅ Complete

- ✅ Wishlist visibility levels (private/household/public)
- ✅ Public reservation system
- ✅ Share slug generation
- ✅ Member-based wishlists (not user-based)

### Frontend ⚠️ Partial

- ✅ Public wishlist view with reservations
- ✅ Basic CRUD
- ❌ No visibility toggle in UI
- ❌ No household-shared wishlist view
- ❌ No child wishlist management
- ❌ No wishlist approval workflow for children

### Missing Features

1. Visibility control UI (toggle between private/household/public)
2. Household wishlist aggregation view
3. Child wishlist moderation (parent approval)
4. Birthday countdown integration
5. Price tracking and budget alerts
6. Gift suggestion AI (future)

---

## 2.3 Viewer Role Restrictions Gaps

### Backend ⚠️ Partial

- ✅ Viewer role exists in schema
- ✅ Basic RLS policies
- ⚠️ No viewer-specific restrictions in shopping/wishlist policies
- ❌ No viewer-restricted dashboard queries

### Frontend ❌ Missing

- ❌ Viewer-specific dashboard layout
- ❌ Read-only shopping list view for viewers
- ❌ Read-only wishlist view for viewers
- ❌ No edit button hiding for viewer role
- ❌ No "You have view-only access" messaging

### Missing Features

1. Viewer-specific RLS policy updates
2. Viewer dashboard (curated, read-only)
3. UI role checks to hide edit/delete buttons
4. Permission error handling
5. Viewer onboarding flow

---

## 2.4 Gamified Child System Gaps

### Backend ❌ Completely Missing

- ❌ No achievements table
- ❌ No member_achievements table
- ❌ No points_transactions table
- ❌ No rewards table
- ❌ No challenge system

### Frontend ⚠️ UI Placeholders Only

- ✅ Child role visual differentiation
- ✅ Age calculation in AddChildModal
- ⚠️ Placeholder mentions of achievements (no actual integration)
- ❌ No child dashboard
- ❌ No achievement display
- ❌ No progress tracking
- ❌ No reward redemption UI

### Missing Features

1. Achievement system (database + logic)
2. Point earning rules
3. Badge display
4. Child dashboard with stats
5. Progress visualization
6. Reward catalog
7. Parental controls for gamification
8. Age-appropriate achievement tiers

---

## 2.5 Current vs. Desired Feature Matrix

| Feature                     | Current Status       | Desired Status       | Gap                              |
| --------------------------- | -------------------- | -------------------- | -------------------------------- |
| **Multi-tenant households** | ✅ Production-ready  | ✅ Complete          | None                             |
| **Member roles (5 tiers)**  | ✅ Database complete | ✅ Complete          | Frontend role enforcement        |
| **Shopping lists**          | ⚠️ Basic CRUD        | ✅ Advanced features | Categories, bulk ops, history    |
| **Wishlist visibility**     | ⚠️ Backend only      | ✅ Full UI controls  | Frontend toggles, household view |
| **Viewer restrictions**     | ❌ Not enforced      | ✅ Full restrictions | RLS policies, UI read-only mode  |
| **Child profiles**          | ✅ Basic creation    | ✅ Full management   | Dashboard, wishlists, activation |
| **Gamification**            | ❌ Not implemented   | ✅ Full system       | Database, logic, UI              |
| **Invitations**             | ✅ Complete          | ✅ Complete          | None                             |
| **Activity logs**           | ✅ Complete          | ✅ Complete          | None                             |

---

# PHASE 3: ENTITY RELATIONSHIP DIAGRAM (ERD) UPDATES

## 3.1 Current ERD (Simplified)

```
auth.users (Supabase)
    ↓ 1:1
user_profiles
    ↓ 1:N
members ←─┐
    ↓     │
households│
    ↓ 1:N │
shopping_lists, wishlists, invitations, activity_logs
    ↓ 1:N
shopping_items, wishlist_items
```

## 3.2 Updated ERD with Gamification

```
auth.users (Supabase)
    ↓ 1:1
user_profiles
    ↓ 1:N
members ←─┬───────────────────────┐
    ↓     │                       │
    │   households               │
    │     ↓ 1:N                  │
    │   shopping_lists,          │
    │   wishlists,               │
    │   invitations,             │
    │   activity_logs            │
    │     ↓ 1:N                  │
    │   shopping_items,          │
    │   wishlist_items           │
    │                            │
    └────→ member_achievements ──┘
              ↓ N:1
         achievements
              ↓ 1:N
         achievement_rewards
              ↓ N:1
         rewards

members ──→ points_transactions
              ↓
         (points balance calculated)
```

## 3.3 New Tables Schema

### achievements

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji or icon identifier
  category TEXT NOT NULL CHECK (category IN ('shopping', 'wishlist', 'family', 'general')),
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  min_age INTEGER, -- null = all ages
  max_age INTEGER, -- null = no max
  points_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### member_achievements

```sql
CREATE TABLE member_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(member_id, achievement_id)
);
```

### points_transactions

```sql
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
  points INTEGER NOT NULL, -- positive = earned, negative = spent
  reason TEXT NOT NULL,
  entity_type TEXT, -- 'achievement', 'reward', 'manual', etc.
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### rewards

```sql
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_redemptions INTEGER, -- null = unlimited
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### reward_redemptions

```sql
CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'fulfilled', 'denied')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES members ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ
);
```

---

# PHASE 4: RLS POLICY UPDATES

## 4.1 Viewer Role RLS Policies

### shopping_lists (Update)

```sql
-- Viewer: Read-only access
CREATE POLICY "Viewers can view household shopping lists"
ON shopping_lists FOR SELECT
USING (
  user_is_household_member(auth.uid(), household_id)
  AND get_member_role(auth.uid(), household_id) IN ('owner', 'admin', 'member', 'child', 'viewer')
);

-- Viewer: Cannot create
-- No policy needed (default deny)

-- Viewer: Cannot update
ALTER POLICY "Members can update household shopping lists"
ON shopping_lists
USING (
  user_is_household_member(auth.uid(), household_id)
  AND get_member_role(auth.uid(), household_id) IN ('owner', 'admin', 'member', 'child')
);
```

### wishlists (Update)

```sql
-- Viewer: Can view household-visible wishlists
CREATE POLICY "Viewers can view household wishlists"
ON wishlists FOR SELECT
USING (
  (visibility = 'public') OR
  (visibility = 'household' AND user_is_household_member(auth.uid(), household_id)) OR
  (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()))
);

-- Viewer: Cannot create/update/delete
-- Existing policies already restrict to owner
```

## 4.2 Gamification RLS Policies

### achievements (Public Read)

```sql
CREATE POLICY "Anyone can view active achievements"
ON achievements FOR SELECT
USING (is_active = TRUE);

-- Only system admin can manage achievements
-- (requires superuser or service role)
```

### member_achievements (Member Access)

```sql
-- Members can view their own achievements
CREATE POLICY "Members can view own achievements"
ON member_achievements FOR SELECT
USING (
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
);

-- Members can view household member achievements
CREATE POLICY "Members can view household achievements"
ON member_achievements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = member_achievements.member_id
    AND user_is_household_member(auth.uid(), m.household_id)
  )
);

-- Only system can insert achievements (via RPC)
```

### points_transactions (Member Access)

```sql
-- Members can view their own transactions
CREATE POLICY "Members can view own points"
ON points_transactions FOR SELECT
USING (
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
);

-- Parents can view child transactions
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
```

### rewards (Household Context)

```sql
-- Household members can view rewards
CREATE POLICY "Members can view household rewards"
ON rewards FOR SELECT
USING (
  user_is_household_member(auth.uid(), household_id)
  AND is_active = TRUE
);

-- Owner/admin can manage rewards
CREATE POLICY "Admins can manage rewards"
ON rewards FOR ALL
USING (
  user_is_household_owner(auth.uid(), household_id)
  OR user_is_household_admin(auth.uid(), household_id)
);
```

### reward_redemptions (Member Access)

```sql
-- Members can view own redemptions
CREATE POLICY "Members can view own redemptions"
ON reward_redemptions FOR SELECT
USING (
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
);

-- Parents can view/approve child redemptions
CREATE POLICY "Parents can approve redemptions"
ON reward_redemptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = reward_redemptions.member_id
    AND (
      get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin')
      OR m.user_id = auth.uid()
    )
  )
);
```

---

# PHASE 5: PERMISSION MATRIX PER FEATURE

## 5.1 Shopping Lists

| Action         | Owner | Admin | Member     | Child      | Viewer       | Public |
| -------------- | ----- | ----- | ---------- | ---------- | ------------ | ------ |
| View lists     | ✅    | ✅    | ✅         | ✅         | ✅ Read-only | ❌     |
| Create list    | ✅    | ✅    | ✅         | ✅         | ❌           | ❌     |
| Edit list      | ✅    | ✅    | ✅ Creator | ✅ Creator | ❌           | ❌     |
| Delete list    | ✅    | ✅    | ✅ Creator | ✅ Creator | ❌           | ❌     |
| Archive list   | ✅    | ✅    | ✅ Creator | ❌         | ❌           | ❌     |
| Add item       | ✅    | ✅    | ✅         | ✅         | ❌           | ❌     |
| Edit item      | ✅    | ✅    | ✅ Creator | ✅ Creator | ❌           | ❌     |
| Delete item    | ✅    | ✅    | ✅ Creator | ✅ Creator | ❌           | ❌     |
| Mark purchased | ✅    | ✅    | ✅         | ✅         | ❌           | ❌     |
| View analytics | ✅    | ✅    | ✅         | ❌         | ✅           | ❌     |

## 5.2 Wishlists

| Action                   | Owner    | Admin    | Member   | Child                    | Viewer | Public      |
| ------------------------ | -------- | -------- | -------- | ------------------------ | ------ | ----------- |
| View own wishlist        | ✅       | ✅       | ✅       | ✅                       | ✅     | ❌          |
| View household wishlists | ✅       | ✅       | ✅       | ✅ Approved              | ✅     | ❌          |
| View public wishlists    | ✅       | ✅       | ✅       | ✅                       | ✅     | ✅ Via link |
| Create wishlist          | ✅       | ✅       | ✅       | ✅ Needs approval        | ❌     | ❌          |
| Edit wishlist            | ✅ Owner | ✅ Owner | ✅ Owner | ✅ Owner                 | ❌     | ❌          |
| Delete wishlist          | ✅       | ✅ Owner | ✅ Owner | ✅ Owner (with approval) | ❌     | ❌          |
| Set visibility           | ✅       | ✅       | ✅       | ❌ Parent-controlled     | ❌     | ❌          |
| Add item                 | ✅       | ✅       | ✅       | ✅                       | ❌     | ❌          |
| Reserve item             | ✅       | ✅       | ✅       | ✅                       | ✅     | ✅ Via link |
| View reservations        | ✅ Owner | ✅ Owner | ✅ Owner | ✅ Owner                 | ❌     | ❌          |

## 5.3 Gamification

| Action                | Owner  | Admin  | Member | Child             | Viewer       | Public |
| --------------------- | ------ | ------ | ------ | ----------------- | ------------ | ------ |
| View achievements     | ✅     | ✅     | ✅     | ✅ Own            | ✅ Household | ❌     |
| Earn achievements     | ✅     | ✅     | ✅     | ✅                | ❌           | ❌     |
| View points           | ✅ All | ✅ All | ✅ Own | ✅ Own            | ✅ View only | ❌     |
| Award points (manual) | ✅     | ✅     | ❌     | ❌                | ❌           | ❌     |
| Create rewards        | ✅     | ✅     | ❌     | ❌                | ❌           | ❌     |
| Redeem rewards        | ✅     | ✅     | ✅     | ✅ Needs approval | ❌           | ❌     |
| Approve redemptions   | ✅     | ✅     | ❌     | ❌                | ❌           | ❌     |
| View leaderboard      | ✅     | ✅     | ✅     | ✅                | ✅           | ❌     |

---

# PHASE 6: 4-PR IMPLEMENTATION ROADMAP

## PR #1: Shopping List Integration 🛒

### Goal

Complete shopping list functionality with household context, advanced features, and role-based permissions.

### Scope

#### Backend (Already Complete ✅)

- ✅ Database schema (shopping_lists, shopping_items)
- ✅ RLS policies (household isolation)
- ✅ Activity logging
- ✅ Helper functions

#### Frontend (To Implement)

1. **Shopping Store Refactor**
   - Update to use household context
   - Add category filtering
   - Implement bulk operations
   - Add history tracking

2. **Component Updates**
   - `ShoppingListView.vue` - Add household switcher integration
   - `CategoryFilter.vue` (new) - Filter by category
   - `BulkAddItemsModal.vue` (new) - Paste list, import template
   - `ShoppingHistory.vue` (new) - View past purchases

3. **Role-Based UI**
   - Hide edit/delete buttons for viewer role
   - Disable create list for viewers
   - Show read-only mode indicator

4. **UX Enhancements**
   - Shopping mode (large buttons for in-store)
   - Item suggestions based on history
   - Recurring list templates
   - Share list to other households (optional)

#### Testing

- [ ] Unit tests for shopping store
- [ ] Component tests for new modals
- [ ] E2E tests for shopping flow
- [ ] Role-based permission tests
- [ ] Household context switching tests

#### Acceptance Criteria

- [ ] Shopping lists scoped to household
- [ ] Category filtering works
- [ ] Bulk add items functional
- [ ] Viewers can view but not edit
- [ ] Children can add items
- [ ] Shopping history displays correctly

#### Estimated Effort: 2-3 days

---

## PR #2: Wishlist Integration 🎁

### Goal

Complete wishlist functionality with visibility controls, household sharing, and child wishlist management.

### Scope

#### Backend (Mostly Complete ✅)

- ✅ Wishlist visibility levels (private/household/public)
- ✅ Share slug system
- ✅ Public reservation
- ⚠️ Add child wishlist approval flow (RPC)

#### Backend Additions

1. **Child Wishlist Approval**

   ```sql
   CREATE TABLE wishlist_approvals (
     id UUID PRIMARY KEY,
     wishlist_id UUID REFERENCES wishlists,
     requested_by UUID REFERENCES members,
     approved_by UUID REFERENCES members,
     status TEXT CHECK (status IN ('pending', 'approved', 'denied')),
     requested_at TIMESTAMPTZ,
     reviewed_at TIMESTAMPTZ
   );
   ```

2. **RPC Functions**
   - `request_child_wishlist_approval()`
   - `approve_child_wishlist()`
   - `deny_child_wishlist()`

#### Frontend (To Implement)

1. **Wishlist Store Enhancement**
   - Add visibility control methods
   - Implement household wishlist aggregation
   - Add child approval workflow

2. **Component Updates**
   - `WishlistVisibilityToggle.vue` (new) - Set private/household/public
   - `HouseholdWishlistView.vue` (new) - Aggregated household wishlist view
   - `ChildWishlistApprovalModal.vue` (new) - Parent approval flow
   - `WishlistEditView.vue` (update) - Add visibility controls

3. **UX Enhancements**
   - Birthday countdown integration
   - Price tracking (alert if price drops)
   - Gift suggestion based on age/interests
   - Duplicate detection across household

#### Testing

- [ ] Unit tests for wishlist store
- [ ] Visibility toggle tests
- [ ] Child approval workflow tests
- [ ] Public reservation tests
- [ ] Household aggregation tests

#### Acceptance Criteria

- [ ] Visibility toggle works (private/household/public)
- [ ] Household members can view household wishlists
- [ ] Child wishlists require approval
- [ ] Public wishlists shareable via link
- [ ] Reservations work without login

#### Estimated Effort: 3-4 days

---

## PR #3: Viewer Role Restrictions 👀

### Goal

Implement complete viewer role restrictions with read-only access across shopping, wishlists, and household features.

### Scope

#### Backend (To Implement)

1. **RLS Policy Updates**
   - Update shopping_lists policies (viewer read-only)
   - Update shopping_items policies (viewer read-only)
   - Update wishlists policies (viewer household-visible)
   - Add viewer-specific helper functions

2. **New Helper Functions**

   ```sql
   CREATE FUNCTION user_is_viewer(user_id UUID, household_id UUID)
   RETURNS BOOLEAN AS $$
     SELECT EXISTS (
       SELECT 1 FROM members
       WHERE user_id = $1 AND household_id = $2 AND role = 'viewer'
     );
   $$ LANGUAGE sql SECURITY DEFINER;
   ```

3. **Dashboard Queries**
   - Create viewer-safe dashboard query
   - Exclude sensitive data (purchase history, prices)
   - Focus on read-only stats

#### Frontend (To Implement)

1. **Role-Aware Components**
   - `ViewerDashboard.vue` (new) - Curated read-only view
   - Update `ShoppingListView.vue` - Hide edit buttons for viewers
   - Update `WishlistEditView.vue` - Show read-only mode
   - Update `MemberCard.vue` - Disable edit for viewers

2. **Permission Checks**
   - Add `canEdit` computed property to all CRUD components
   - Add `isViewer` getter to household store
   - Show "You have view-only access" messages

3. **Viewer Onboarding**
   - `ViewerWelcomeModal.vue` (new) - Explain viewer role
   - Highlight what viewers can/cannot do

#### Testing

- [ ] RLS policy tests for viewer role
- [ ] UI permission check tests
- [ ] Viewer dashboard tests
- [ ] Error handling tests (viewer tries to edit)
- [ ] Edge case tests (viewer switches to member role)

#### Acceptance Criteria

- [ ] Viewers can view household content
- [ ] Viewers cannot create/edit/delete anything
- [ ] UI clearly indicates read-only mode
- [ ] Graceful error handling if viewer tries to edit
- [ ] Viewer onboarding explains restrictions

#### Estimated Effort: 2-3 days

---

## PR #4: Gamified Child System 🎮

### Goal

Implement complete gamification system with achievements, points, rewards, and child progress dashboard.

### Scope

#### Backend (To Implement - Complete System)

1. **Database Schema**
   - `achievements` table (see ERD section)
   - `member_achievements` table
   - `points_transactions` table
   - `rewards` table
   - `reward_redemptions` table

2. **RLS Policies**
   - Achievements (public read)
   - Member achievements (member + household access)
   - Points transactions (member + parent access)
   - Rewards (household-scoped)
   - Reward redemptions (member + parent approval)

3. **RPC Functions**
   - `award_achievement(member_id, achievement_id)` - Award achievement + points
   - `get_member_points(member_id)` - Calculate point balance
   - `create_reward(household_id, name, points_cost)` - Create household reward
   - `redeem_reward(member_id, reward_id)` - Request reward redemption
   - `approve_redemption(redemption_id, approved_by)` - Parent approves
   - `auto_check_achievements(member_id)` - Check for newly earned achievements

4. **Triggers**
   - Shopping item purchased → Check achievements
   - Wishlist item reserved → Check achievements
   - Daily login → Check achievements
   - Member joins → Award "Welcome" achievement

5. **Seed Data**
   - 20+ predefined achievements (shopping, wishlist, family, general)
   - Tiered achievements (bronze/silver/gold/platinum)
   - Age-appropriate achievements

#### Frontend (To Implement - Complete System)

1. **Pinia Stores**
   - `gamification.store.ts` (new) - Achievements, points, rewards state
   - Methods: `loadAchievements()`, `loadMemberPoints()`, `redeemReward()`

2. **Child Dashboard**
   - `ChildDashboard.vue` (new) - Personalized child view
     - Points balance with animation
     - Recent achievements
     - Progress bars for in-progress achievements
     - Available rewards
     - Leaderboard (household)

3. **Achievement Components**
   - `AchievementBadge.vue` (new) - Badge display with tier styling
   - `AchievementList.vue` (new) - Grid of achievements (earned + locked)
   - `AchievementToast.vue` (new) - Celebratory toast when earned
   - `ProgressRing.vue` (new) - Circular progress for partial achievements

4. **Reward Components**
   - `RewardCatalog.vue` (new) - Browse available rewards
   - `RewardCard.vue` (new) - Reward display with points cost
   - `RedeemRewardModal.vue` (new) - Confirm redemption
   - `RedemptionHistory.vue` (new) - Past redemptions

5. **Parent Controls**
   - `CreateRewardModal.vue` (new) - Custom household rewards
   - `ManageRewards.vue` (new) - Edit/deactivate rewards
   - `ApproveRedemptionModal.vue` (new) - Approve child requests
   - `ManualPointsModal.vue` (new) - Award/deduct points manually

6. **Visualizations**
   - Leaderboard with household ranking
   - Points history chart
   - Achievement completion percentage
   - Reward redemption timeline

#### Testing

- [ ] Achievement RLS policy tests
- [ ] Points calculation tests
- [ ] Reward redemption flow tests
- [ ] Auto-achievement detection tests
- [ ] Age-appropriate achievement filtering tests
- [ ] UI component tests (badges, dashboard)
- [ ] E2E gamification flow tests

#### Acceptance Criteria

- [ ] Achievements auto-awarded based on actions
- [ ] Points balance calculated correctly
- [ ] Child dashboard displays personalized data
- [ ] Rewards redeemable with approval
- [ ] Parents can create custom rewards
- [ ] Age-appropriate achievements shown
- [ ] Celebratory animations on achievement unlock
- [ ] Leaderboard updates in real-time

#### Estimated Effort: 5-7 days

---

# PHASE 7: UX NOTES & FLOWS

## 7.1 Child User Flows

### Child Profile Creation (Already Implemented ✅)

```
Parent → Add Child → Select Avatar → Enter Name → Enter Birthday → Save
  ↓
Child profile created (user_id = null, role = 'child')
```

### Child Wishlist Creation (PR #2)

```
Child → Create Wishlist → Add Items → Request Approval
  ↓
Parent → Review → Approve/Deny → Set Visibility
  ↓
Wishlist becomes visible based on visibility setting
```

### Child Earns Achievement (PR #4)

```
Child → Complete Action (e.g., mark shopping item purchased)
  ↓
System → Check achievements → Award if criteria met
  ↓
Child sees celebratory toast + achievement badge
  ↓
Points added to balance
```

### Child Redeems Reward (PR #4)

```
Child → Browse Rewards → Select → Request Redemption
  ↓
Parent → Review → Approve/Deny
  ↓
If approved: Points deducted, reward marked "fulfilled"
```

### Child Account Activation (Already Implemented ✅)

```
Child reaches age 13 (or parent-set age)
  ↓
Parent → Activate Account → Child creates email/password
  ↓
user_id populated, child can login independently
```

## 7.2 Viewer User Flows

### Viewer Joins Household (Already Implemented ✅)

```
Owner/Admin → Invite Member → Set role = 'viewer' → Send invitation
  ↓
Viewer → Receives email → Accepts invitation
  ↓
Viewer joins household with read-only access
```

### Viewer Views Shopping List (PR #3)

```
Viewer → Login → Select Household → Navigate to Shopping
  ↓
Shopping lists displayed (read-only)
  ↓
"You have view-only access" message shown
  ↓
Edit/delete buttons hidden
```

### Viewer Views Wishlists (PR #3)

```
Viewer → Navigate to Wishlists
  ↓
Household-visible wishlists displayed
  ↓
Can view items, cannot edit/add/delete
```

## 7.3 Parent Control Flows

### Parent Creates Custom Reward (PR #4)

```
Parent → Gamification Settings → Create Reward
  ↓
Enter name, description, points cost, icon
  ↓
Save → Reward added to household catalog
```

### Parent Reviews Child Wishlist (PR #2)

```
Parent → Notifications → Child wishlist approval pending
  ↓
Review wishlist → Approve/Deny → Optionally set visibility
  ↓
Child notified of decision
```

### Parent Monitors Child Progress (PR #4)

```
Parent → Child Dashboard → Select child
  ↓
View achievements, points, redemptions
  ↓
Award manual points if desired
```

---

# PHASE 8: MIGRATION STRATEGY

## 8.1 PR Sequencing & Dependencies

```
PR #1 (Shopping Lists)
  ├── No dependencies
  └── Estimated: 2-3 days

PR #2 (Wishlists)
  ├── No dependencies
  └── Estimated: 3-4 days

PR #3 (Viewer Restrictions)
  ├── Depends on: PR #1, PR #2 (to test restrictions)
  └── Estimated: 2-3 days

PR #4 (Gamification)
  ├── Depends on: PR #1 (shopping triggers achievements)
  └── Estimated: 5-7 days

Total Estimated Time: 12-17 days
```

## 8.2 Migration Scripts

### PR #1: No migration needed (schema complete)

### PR #2: Child Wishlist Approval

```sql
-- File: 015_wishlist_approvals.sql

CREATE TABLE IF NOT EXISTS wishlist_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID NOT NULL REFERENCES wishlists ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  approved_by UUID REFERENCES members ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_wishlist_approvals_status ON wishlist_approvals(status);
CREATE INDEX idx_wishlist_approvals_wishlist_id ON wishlist_approvals(wishlist_id);

-- RLS
ALTER TABLE wishlist_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own approval requests"
ON wishlist_approvals FOR SELECT
USING (
  requested_by IN (SELECT id FROM members WHERE user_id = auth.uid())
);

CREATE POLICY "Parents can view household approvals"
ON wishlist_approvals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.id = wishlist_approvals.requested_by
    AND get_member_role(auth.uid(), m.household_id) IN ('owner', 'admin')
  )
);
```

### PR #3: Viewer Role RLS Updates

```sql
-- File: 016_viewer_role_policies.sql

-- Shopping Lists: Restrict updates for viewers
DROP POLICY IF EXISTS "Members can update household shopping lists" ON shopping_lists;
CREATE POLICY "Non-viewer members can update shopping lists"
ON shopping_lists FOR UPDATE
USING (
  user_is_household_member(auth.uid(), household_id)
  AND get_member_role(auth.uid(), household_id) IN ('owner', 'admin', 'member', 'child')
);

-- Shopping Items: Restrict inserts for viewers
DROP POLICY IF EXISTS "Members can add items to household lists" ON shopping_items;
CREATE POLICY "Non-viewer members can add items"
ON shopping_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shopping_lists sl
    WHERE sl.id = shopping_items.list_id
    AND user_is_household_member(auth.uid(), sl.household_id)
    AND get_member_role(auth.uid(), sl.household_id) IN ('owner', 'admin', 'member', 'child')
  )
);

-- Helper function
CREATE OR REPLACE FUNCTION user_is_viewer(p_user_id UUID, p_household_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE user_id = p_user_id
    AND household_id = p_household_id
    AND role = 'viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### PR #4: Gamification Schema

```sql
-- File: 017_gamification_schema.sql

-- Achievements
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('shopping', 'wishlist', 'family', 'general')),
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  min_age INTEGER,
  max_age INTEGER,
  points_reward INTEGER NOT NULL DEFAULT 0,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Member Achievements
CREATE TABLE member_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(member_id, achievement_id)
);

-- Points Transactions
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  created_by UUID REFERENCES members ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rewards
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_redemptions INTEGER,
  created_by UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reward Redemptions
CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'fulfilled', 'denied')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES members ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  notes TEXT
);

-- Indexes
CREATE INDEX idx_member_achievements_member ON member_achievements(member_id);
CREATE INDEX idx_points_transactions_member ON points_transactions(member_id);
CREATE INDEX idx_points_transactions_household ON points_transactions(household_id);
CREATE INDEX idx_rewards_household ON rewards(household_id);
CREATE INDEX idx_reward_redemptions_member ON reward_redemptions(member_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);

-- RLS (see Phase 4 for detailed policies)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Seed data (20+ achievements)
INSERT INTO achievements (name, description, icon, category, tier, points_reward, criteria) VALUES
  ('First Steps', 'Add your first shopping item', '👣', 'shopping', 'bronze', 10, '{"shopping_items_added": 1}'),
  ('Shopping Pro', 'Mark 10 items as purchased', '🛒', 'shopping', 'silver', 50, '{"items_purchased": 10}'),
  ('Wishlist Dreamer', 'Create your first wishlist', '💭', 'wishlist', 'bronze', 10, '{"wishlists_created": 1}'),
  ('Birthday Planner', 'Add 5 items to your birthday wishlist', '🎂', 'wishlist', 'silver', 50, '{"wishlist_items_added": 5}'),
  ('Family Helper', 'Help with 5 shopping tasks', '👨‍👩‍👧', 'family', 'bronze', 25, '{"shopping_items_purchased": 5}'),
  ('Grateful Heart', 'Thank someone for reserving a wishlist item', '💝', 'wishlist', 'gold', 100, '{"reservations_thanked": 1}'),
  ('Early Bird', 'Log in before 8 AM', '🌅', 'general', 'bronze', 5, '{"early_logins": 1}'),
  ('Consistency', 'Log in for 7 days straight', '📅', 'general', 'silver', 75, '{"login_streak": 7}'),
  ('Organization Master', 'Create a shopping list with 20 items', '📋', 'shopping', 'gold', 100, '{"shopping_list_items": 20}'),
  ('Dream Big', 'Add 10 items to wishlists', '🌟', 'wishlist', 'silver', 50, '{"total_wishlist_items": 10}');
-- ... (add 10 more achievements)
```

## 8.3 Testing Strategy

### Unit Tests (Each PR)

- Store actions and getters
- Helper function logic
- Permission calculations

### Integration Tests (Each PR)

- RLS policy enforcement
- Database triggers
- Cross-table queries

### E2E Tests (Each PR)

- Complete user flows
- Role-based access scenarios
- Edge cases (e.g., viewer tries to edit)

### Regression Tests (After Each PR)

- Ensure existing features still work
- No broken navigation
- No permission escalation bugs

---

# PHASE 9: PRODUCTION CHECKLIST

## Pre-PR Checklist (All PRs)

- [ ] Code linting passes (`npm run lint`)
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Code review requested
- [ ] Security scan clean (CodeQL)
- [ ] No console errors/warnings
- [ ] Migration scripts tested on staging
- [ ] RLS policies audited
- [ ] Performance tested (large datasets)
- [ ] Accessibility checked (WCAG 2.1 AA)
- [ ] Mobile responsive verified
- [ ] Documentation updated

## Post-Merge Checklist (All PRs)

- [ ] Feature flag enabled (if applicable)
- [ ] Database migration applied
- [ ] Monitoring alerts configured
- [ ] User feedback channel ready
- [ ] Rollback plan documented
- [ ] Analytics tracking added
- [ ] Error tracking configured (Sentry/etc.)

---

# PHASE 10: FUTURE ENHANCEMENTS (Post-4-PR)

## Phase 5: Analytics & Insights

- Shopping spending analytics
- Wishlist trends (popular items, price tracking)
- Achievement completion rates
- Household engagement metrics

## Phase 6: Mobile App

- React Native app with same backend
- Push notifications for achievements
- Barcode scanning for shopping
- Offline mode

## Phase 7: AI Features

- Gift suggestions based on age/interests
- Auto-categorize shopping items
- Price comparison across stores
- Budget recommendations

## Phase 8: Enterprise Features

- Billing system (Stripe integration)
- Custom branding per household
- Advanced permissions (custom roles)
- White-label option

## Phase 9: Social Features

- Share achievements with friends
- Cross-household wishlists (birthdays)
- Community reward ideas
- Achievement challenges

---

# APPENDICES

## Appendix A: File Structure After 4 PRs

```
src/
├── features/
│   ├── auth/
│   ├── shopping/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   │       ├── shopping.store.ts (updated PR #1)
│   │       ├── components/
│   │       │   ├── CategoryFilter.vue (new PR #1)
│   │       │   ├── BulkAddItemsModal.vue (new PR #1)
│   │       │   └── ShoppingHistory.vue (new PR #1)
│   ├── wishlist/
│   │   ├── domain/
│   │   ├── infrastructure/
│   │   └── presentation/
│   │       ├── wishlist.store.ts (updated PR #2)
│   │       ├── components/
│   │       │   ├── WishlistVisibilityToggle.vue (new PR #2)
│   │       │   ├── HouseholdWishlistView.vue (new PR #2)
│   │       │   └── ChildWishlistApprovalModal.vue (new PR #2)
│   ├── gamification/ (new PR #4)
│   │   ├── domain/
│   │   │   ├── achievement.entity.ts
│   │   │   ├── reward.entity.ts
│   │   ├── infrastructure/
│   │   │   ├── gamification.repository.ts
│   │   │   ├── mock-gamification.repository.ts
│   │   └── presentation/
│   │       ├── gamification.store.ts
│   │       ├── components/
│   │       │   ├── AchievementBadge.vue
│   │       │   ├── AchievementList.vue
│   │       │   ├── RewardCatalog.vue
│   │       │   ├── ChildDashboard.vue
│   │       │   └── ... (10+ components)
│   └── viewer/ (new PR #3)
│       ├── presentation/
│       │   ├── components/
│       │   │   ├── ViewerDashboard.vue
│       │   │   └── ViewerWelcomeModal.vue
├── views/
│   ├── ShoppingListView.vue (updated PR #1)
│   ├── WishlistEditView.vue (updated PR #2)
│   ├── ViewerDashboardView.vue (new PR #3)
│   └── GamificationView.vue (new PR #4)
└── ... (existing structure)
```

## Appendix B: API Endpoint Summary (RPC Functions)

### Existing

1. `create_child_member(household_id, display_name, date_of_birth, avatar_url)`
2. `invite_member(household_id, email, role)`
3. `accept_invitation(token)`
4. `activate_child_account(member_id, email, password)`
5. `promote_member_role(member_id, new_role)`
6. `remove_member(member_id)`
7. `user_is_household_member(p_household_id, p_user_id)` - Check membership
8. `get_member_id(p_household_id, p_user_id)` - Get member ID
9. `get_member_role(p_household_id, p_user_id)` - Get role
10. `has_min_role(p_household_id, p_user_id, p_required_role)` - Check minimum role
11. `log_activity(household_id, member_id, action, entity_type, entity_id, metadata)`
12. `reserve_wishlist_item(item_id, reserved_by_email, reserved_by_name)`

### New (PR #2)

13. `request_child_wishlist_approval(wishlist_id)`
14. `approve_child_wishlist(approval_id, visibility)`
15. `deny_child_wishlist(approval_id, notes)`

### New (PR #3)

16. `user_is_viewer(p_household_id, p_user_id)`
17. `get_viewer_dashboard(household_id)`

### New (PR #4)

18. `award_achievement(member_id, achievement_id)`
19. `get_member_points(member_id)`
20. `create_reward(household_id, name, description, points_cost)`
21. `redeem_reward(reward_id)`
22. `approve_redemption(redemption_id)`
23. `auto_check_achievements(member_id)` (trigger-based)
24. `get_household_leaderboard(household_id)`

## Appendix C: Component Count After 4 PRs

| Feature      | Components Before | Components After | New Components |
| ------------ | ----------------- | ---------------- | -------------- |
| Shopping     | 1                 | 5                | +4 (PR #1)     |
| Wishlist     | 3                 | 6                | +3 (PR #2)     |
| Viewer       | 0                 | 2                | +2 (PR #3)     |
| Gamification | 0                 | 15               | +15 (PR #4)    |
| **Total**    | **~50**           | **~74**          | **+24**        |

## Appendix D: Database Size Estimates

### Before Gamification

- Tables: 9
- RLS Policies: ~30
- Indexes: ~20
- RPC Functions: 11

### After Gamification (PR #4)

- Tables: 14 (+5)
- RLS Policies: ~45 (+15)
- Indexes: ~35 (+15)
- RPC Functions: 23 (+12)

---

# SUMMARY

## What We Have Today ✅

- Multi-tenant architecture (production-ready)
- Shopping lists (database complete, frontend basic)
- Wishlists (database complete, frontend partial)
- 5-tier role system (owner/admin/member/child/viewer)
- Child profiles (basic UI, no gamification)
- Invitations system (complete)
- Activity logging (complete)

## What We Need (4 PRs) 🚧

1. **PR #1** - Advanced shopping list features (2-3 days)
2. **PR #2** - Wishlist visibility & child approval (3-4 days)
3. **PR #3** - Viewer role enforcement (2-3 days)
4. **PR #4** - Complete gamification system (5-7 days)

## Total Timeline: 12-17 days

## Success Metrics

- [ ] 100% RLS policy coverage
- [ ] All roles properly restricted
- [ ] Gamification system fully functional
- [ ] Zero breaking changes
- [ ] All tests passing
- [ ] Production-ready deployment

---

**Document Owner**: Development Team  
**Last Updated**: February 15, 2026  
**Next Review**: After PR #1 completion

---
