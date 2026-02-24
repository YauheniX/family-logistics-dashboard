# Profile Resolution System

## Overview

This document describes the profile resolution system that ensures consistent display of user names and avatars across the application, regardless of authentication method (email/password or Google OAuth).

## Problem Statement

Prior to this implementation, the application had inconsistent profile display logic:

1. **Multiple sources of truth**: Profile data came from:
   - `user_profiles` table (local, user-editable)
   - `auth.users.user_metadata` (OAuth data from Google)
   - Email addresses (fallback)

2. **Inconsistent fallback logic**: Different components used different patterns:

   ```typescript
   // App.vue
   userDisplayName.value || authStore.user?.email || 'User';

   // MemberCard.vue
   props.member.display_name || props.member.email || 'Unknown Member';

   // HouseholdDetailView.vue
   member.display_name || member.email || member.user_id || 'User';
   ```

3. **OAuth data prioritization**: Some components read directly from OAuth metadata, causing Google data to override local profile updates in the UI.

## Solution

### Profile Resolution Utilities

Created `src/utils/profileResolver.ts` with consistent fallback logic:

#### `resolveUserProfile()`

Resolves user profile data for authenticated users with the following priority:

**Name Priority:**

1. Local profile `display_name` (from `user_profiles` table)
2. Google OAuth `full_name` or `name` (from `user_metadata`)
3. Email prefix (part before @)
4. Fallback: "User"

**Avatar Priority:**

1. Local profile `avatar_url` (uploaded by user)
2. Google OAuth `avatar_url`
3. `null` (triggers default/initials display)

```typescript
import { resolveUserProfile } from '@/utils/profileResolver';

const resolved = resolveUserProfile(
  { display_name: 'John Doe', avatar_url: '/uploads/avatar.jpg' },
  authUser,
  'john@example.com',
);
// resolved.name = 'John Doe'
// resolved.avatar = '/uploads/avatar.jpg'
```

#### `resolveMemberProfile()`

Resolves member profile data for household members:

**Name Priority:**

1. Member `display_name`
2. Member `email`
3. Fallback: "Unknown Member"

**Avatar:**

- Uses `member.avatar_url` or `null`

```typescript
import { resolveMemberProfile } from '@/utils/profileResolver';

const resolved = resolveMemberProfile(member);
```

### Helper Functions

- **`getInitials(name)`**: Extracts 1-2 character initials for avatar display
- **`isValidAvatarUrl(url)`**: Validates avatar URL is not empty/null

## Implementation Details

### Components Updated

1. **App.vue** (🔄 Main layout header)
   - Replaced computed properties with `resolveUserProfile()`
   - Now uses consistent fallback for name and avatar display

2. **MemberCard.vue** (🔄 Member display component)
   - Uses `resolveMemberProfile()` for consistent member display
3. **HouseholdDetailView.vue** (🔄 Household member list)
   - Added `getMemberName()` helper using `resolveMemberProfile()`

### Database Changes

#### Migration 024: Profile Data Consistency

Created `supabase/migrations/024_profile_data_consistency.sql`:

1. **Backfill missing profiles**: Ensures all `auth.users` have corresponding `user_profiles`
2. **Enhanced trigger**: Updated `handle_new_user()` to use `ON CONFLICT DO NOTHING`
   - Prevents accidentally overwriting existing profiles
   - Handles race conditions gracefully
3. **Diagnostic function**: Added `check_profile_consistency()` to identify data issues
4. **Documentation**: Added comments explaining profile resolution priority

#### Schema Update

Updated `supabase/schema.sql` to match migration 024 trigger definition.

## Usage Guidelines

### For UI Components

**DO:**

```typescript
import { resolveUserProfile, resolveMemberProfile } from '@/utils/profileResolver';

// For current user
const resolved = resolveUserProfile(profile, authUser, email);
const name = resolved.name;
const avatar = resolved.avatar;

// For household members
const resolved = resolveMemberProfile(member);
```

**DON'T:**

```typescript
// ❌ Don't use inconsistent fallback logic
const name = user.display_name || user.email || 'User';

// ❌ Don't read OAuth metadata directly
const avatar = authUser?.user_metadata?.avatar_url || profileAvatar;
```

### For Database Operations

**User Profile Updates:**

- Always update `user_profiles` table, never `auth.users.user_metadata`
- OAuth metadata remains read-only
- Local profile data takes priority in UI

**Member Creation:**

- Members inherit display name and avatar from `user_profiles` when added
- Can be customized per-household via `members` table

## Testing

Comprehensive test suite in `src/utils/__tests__/profileResolver.test.ts`:

- ✅ 30 test cases covering all scenarios
- ✅ Tests for both user and member profile resolution
- ✅ Tests for edge cases (null, empty, missing data)
- ✅ Tests for helper functions (getInitials, isValidAvatarUrl)

Run tests:

```bash
npm test -- profileResolver.test.ts
```

## Benefits

1. **Consistency**: Single source of truth for profile display logic
2. **User Control**: Local profile updates always take priority over OAuth data
3. **Maintainability**: Changes to fallback logic happen in one place
4. **Type Safety**: Fully typed utilities with clear interfaces
5. **Testability**: Isolated, pure functions with comprehensive tests

## Migration Path

### For Existing Users

1. Run migration 024 to backfill missing profiles
2. Check data consistency:

   ```sql
   SELECT * FROM check_profile_consistency();
   ```

3. Fix any identified issues

### For New Development

1. Import profile resolvers instead of writing custom fallback logic
2. Use resolved profile for all display purposes
3. Update `user_profiles` for user-editable profile data
4. Never read/write OAuth metadata directly

## Related Documentation

- [RBAC Permissions](/docs/architecture/rbac-permissions.md)
- [Database Schema](/docs/backend/database-schema.md)
- [Security Audit](/docs/backend/security-audit-report.md)

## Maintenance

### Adding New Profile Fields

1. Add field to `user_profiles` table (migration)
2. Update `UserProfile` interface in `profileResolver.ts`
3. Add resolution logic if fallback needed
4. Add tests for new field
5. Update this documentation

### Changing Priority Rules

1. Update resolver function logic
2. Update tests to match new priority
3. Update this documentation
4. Communicate changes to team
