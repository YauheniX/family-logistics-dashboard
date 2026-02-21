# 📨 Invitation Acceptance (No Email Required)

**Feature Status**: ✅ Implemented (Migration 022)  
**Last Updated**: February 21, 2026

---

## Overview

The invitation system allows household admins to invite new members **without requiring an email server**. Invitations are stored in the database and displayed directly to users when they log in with the invited email address.

### Key Features

- ✅ **No Email Configuration** - Works without SMTP/email server
- ✅ **In-App Acceptance** - Users see invitations on dashboard after login
- ✅ **Security Validated** - Email matching, expiry checks, duplicate prevention
- ✅ **Audit Trail** - All actions logged to activity_logs table
- ✅ **Role-Based** - Invite as admin, member, or viewer (not owner/child)

---

## User Flow

### 1. Admin Sends Invitation

```
Admin (Owner/Admin role)
  → Opens Member Management
  → Clicks "Invite Member"
  → Enters email + selects role
  → Submits invitation
  ✅ Invitation created in database
```

**Database**: New row in `invitations` table with status `'pending'` and 7-day expiry.

### 2. User Logs In

```
User (with invited email)
  → Logs in / Signs up
  → Redirects to Dashboard
  → Sees "Pending Invitations" card
  → Views household name, inviter, role
```

**Backend**: `get_my_pending_invitations()` RPC matches user's email to pending invitations.

### 3. User Accepts or Declines

**Accept Flow**:

```
User clicks "Accept"
  → Calls accept_invitation(invitation_id)
  → Validates email matches
  → Creates member record in household
  → Updates invitation status to 'accepted'
  → Logs activity
  → Dashboard refreshes → household appears
```

**Decline Flow**:

```
User clicks "Decline"
  → Calls decline_invitation(invitation_id)
  → Validates email matches
  → Updates invitation status to 'declined'
  → Logs activity
  → Invitation disappears from dashboard
```

---

## Technical Implementation

### Database (Migration 022)

**4 new RPC functions**:

| Function                       | Purpose                            | Security                        |
| ------------------------------ | ---------------------------------- | ------------------------------- |
| `get_my_pending_invitations()` | Fetch invitations for user's email | Matches auth.users.email        |
| `accept_invitation(uuid)`      | Accept and create member record    | Email validation, expiry check  |
| `decline_invitation(uuid)`     | Mark invitation as declined        | Email validation                |
| `expire_old_invitations()`     | Batch cleanup (cron/admin)         | Updates expired pending invites |

**Function Details**:

```sql
-- Returns invitation details with household name, inviter name
get_my_pending_invitations()
  → WHERE email = current_user_email
  → AND status = 'pending'
  → AND expires_at > now()

-- Creates member record and updates invitation
accept_invitation(p_invitation_id uuid)
  → Validates email matches
  → Checks not expired
  → Checks not already member
  → INSERT into members (household_id, user_id, role, ...)
  → UPDATE invitations SET status = 'accepted'
  → Log activity

-- Updates status only
decline_invitation(p_invitation_id uuid)
  → Validates email matches
  → UPDATE invitations SET status = 'declined'
  → Log activity
```

### Frontend Components

**File**: [`src/composables/useInvitations.ts`](../../src/composables/useInvitations.ts)

```typescript
export function useInvitations() {
  // State
  const invitations = ref<PendingInvitation[]>([]);
  const loading = ref(false);
  const error = ref<ApiError | null>(null);

  // Methods
  async function fetchPendingInvitations() { ... }
  async function acceptInvitation(id: string): Promise<boolean> { ... }
  async function declineInvitation(id: string): Promise<boolean> { ... }

  return { invitations, loading, error, ... };
}
```

**File**: [`src/components/invitations/PendingInvitationsCard.vue`](../../src/components/invitations/PendingInvitationsCard.vue)

- Displays invitation cards with household name, inviter, role
- Shows expiry countdown ("in 3 days", "in 12 hours")
- Accept/Decline buttons with loading states
- Emits `invitationAccepted` event to trigger parent refresh

**File**: [`src/views/DashboardView.vue`](../../src/views/DashboardView.vue)

- Shows `PendingInvitationsCard` at top of dashboard
- Listens for `invitationAccepted` event
- Reloads household list when invitation accepted

---

## Security Features

### 1. Email Validation

```typescript
// Backend validates invitation.email matches auth.users.email
if lower(trim(v_invitation.email)) != lower(trim(v_user_email)) then
  raise exception 'This invitation is not for your email address';
end if;
```

**Result**: Only the invited email can accept/decline the invitation.

### 2. Expiry Check

```typescript
// Invitations expire after 7 days (default)
if v_invitation.expires_at <= now() then
  update invitations set status = 'expired' where id = p_invitation_id;
  raise exception 'This invitation has expired';
end if;
```

### 3. Duplicate Prevention

```typescript
// Check if user already member of household
if exists (
  select 1 from members
  where household_id = v_invitation.household_id
    and user_id = auth.uid()
    and is_active = true
) then
  raise exception 'You are already a member of this household';
end if;
```

### 4. RLS + SECURITY DEFINER

All RPC functions use `security definer set search_path = public` to prevent search path injection (CWE-427).

---

## Permissions

| Action                   | Owner | Admin | Member | Child | Viewer |
| ------------------------ | ----- | ----- | ------ | ----- | ------ |
| Send invitation          | ✅    | ✅    | ❌     | ❌    | ❌     |
| View pending invitations | ✅    | ✅    | ❌     | ❌    | ❌     |
| Accept invitation (own)  | ✅    | ✅    | ✅     | ✅    | ✅     |
| Decline invitation (own) | ✅    | ✅    | ✅     | ✅    | ✅     |

**Notes**:

- Anyone with an email can accept/decline their own invitation
- Only owner/admin can send invitations
- Owner/admin can manage (revoke) pending invitations (future feature)

---

## Configuration

### No Email Server Required

Unlike traditional invitation systems, this implementation **does not send emails**. This means:

- ✅ No SMTP configuration needed
- ✅ Works immediately in development
- ✅ No email delivery failures
- ❌ Admin must manually share household link with invitee
- ❌ Invitee must know to log in and check dashboard

### Invitation Expiry

**Default**: 7 days

Change in migration or when creating invitation:

```sql
-- In invite_member() RPC
expires_at := now() + interval '7 days'; -- Change to '14 days', '30 days', etc.
```

### Cleanup

Run periodically (cron/scheduled task):

```sql
SELECT expire_old_invitations(); -- Returns count of expired invitations
```

---

## Admin Responsibilities

Since invitations don't send emails, admins must:

1. **Copy invitation details** manually
2. **Share with invitee** via:
   - Personal message/text
   - Email (manual)
   - Chat application
   - In-person
3. **Instruct invitee** to:
   - Log in to app with invited email
   - Check dashboard for pending invitations
   - Click "Accept" to join household

**Example message**:

```
Hi! I've invited you to join our household "The Smith Family"
on our family dashboard app.

Please:
1. Go to https://our-family-app.com
2. Sign up / Log in with this email: jane@example.com
3. You'll see the invitation on your dashboard
4. Click "Accept" to join!

Invitation expires in 7 days.
```

---

## Future Enhancements

### Planned Features

- [ ] **Email Notifications** (optional SMTP integration)
  - If SMTP configured, send email with invitation link
  - Fallback to in-app display if SMTP fails
- [ ] **Invitation Link** (`/invite/:token`)
  - Direct link to accept invitation
  - Pre-selects invitation on dashboard
- [ ] **Resend Invitation** (admin action)
  - Extends expiry by another 7 days
  - Regenerates token
- [ ] **Revoke Invitation** (admin action)
  - Sets status to 'revoked' before acceptance
- [ ] **Invitation Reminders**
  - Notification badge when invitation about to expire
  - Dashboard alert "Invitation expires in 24 hours"
- [ ] **Bulk Invitations**
  - Import CSV of emails
  - Send multiple invitations at once

### Backend RPC Functions (Future)

```sql
-- Admin functions (require owner/admin permission)
CREATE FUNCTION resend_invitation(p_invitation_id uuid) ...
CREATE FUNCTION revoke_invitation(p_invitation_id uuid) ...
CREATE FUNCTION get_household_invitations(p_household_id uuid) ...
```

---

## Testing

### Manual Testing

1. **Create test users**:

   ```sql
   -- User A: Admin (existing member)
   -- User B: New user with invited email
   ```

2. **Send invitation**:
   - Log in as User A
   - Navigate to household → Members
   - Click "Invite Member"
   - Enter User B's email + role
   - Submit

3. **Verify invitation created**:

   ```sql
   SELECT * FROM invitations WHERE email = 'userb@example.com';
   -- Should see status = 'pending'
   ```

4. **Accept invitation**:
   - Log out
   - Log in as User B (with invited email)
   - Dashboard shows "Pending Invitations" card
   - Click "Accept"
   - Verify household appears in list

5. **Verify member created**:
   ```sql
   SELECT * FROM members WHERE user_id = 'user-b-id';
   -- Should see new member record
   ```

### Automated Testing

**Unit Tests**: [`src/__tests__/use-invitations.test.ts`](../../src/__tests__/use-invitations.test.ts)

```bash
npm test use-invitations
```

**Component Tests**: [`src/__tests__/pending-invitations-card.test.ts`](../../src/__tests__/pending-invitations-card.test.ts)

```bash
npm test pending-invitations
```

---

## Troubleshooting

### User doesn't see invitation

**Possible causes**:

1. Email mismatch (invitation.email != auth.users.email)
   - Check case sensitivity (queries use `lower(trim(...))`)
2. Invitation expired (expires_at < now())
3. Invitation already accepted/declined
4. User not logged in

**Debug**:

```sql
-- Check invitations for email
SELECT * FROM invitations
WHERE lower(trim(email)) = 'user@example.com'
  AND status = 'pending';
```

### "Already a member" error

User already has active membership in household.

**Solutions**:

- If soft-deleted: Restore member record instead of creating new
- If active: User should not accept invitation

### "Invitation not found" error

**Possible causes**:

1. Invitation ID incorrect
2. Status not 'pending' (already processed)
3. RLS blocking query (shouldn't happen with security definer)

---

## Related Documentation

- [RBAC Permissions](../architecture/rbac-permissions.md) - Role hierarchy and permissions
- [Database Schema](../backend/database-schema.md) - Table structure and relationships
- [Security Audit](../backend/security-audit-report.md) - Security patterns and best practices
- [Migration 022](../../supabase/migrations/022_invitation_acceptance_workflow.sql) - SQL implementation

---

**Last Updated**: February 21, 2026
