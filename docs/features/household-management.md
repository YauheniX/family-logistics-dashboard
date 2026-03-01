# 🏠 Household Management

Feature documentation for household creation and member management.

**Last Updated**: March 2026

---

## What Is a Household?

A **household** is the primary tenant unit of the application. Every piece of data (shopping lists, wishlists, invitations) belongs to a household. Users belong to one or more households and collaborate within them.

---

## Feature Overview

| Sub-Feature         | Description                                | Who Can Use                  |
| ------------------- | ------------------------------------------ | ---------------------------- |
| Create household    | Start a new household (user becomes owner) | Any authenticated user       |
| View household      | See household name, slug, member count     | All members                  |
| Update settings     | Change household name                      | Owner, Admin                 |
| Invite member       | Send an invitation by email                | Owner, Admin                 |
| Manage member roles | Change a member's role                     | Owner, Admin                 |
| Remove member       | Remove a member from the household         | Owner, Admin                 |
| Leave household     | Remove yourself                            | Member, Admin, Child, Viewer |
| Delete household    | Permanently destroy the household          | Owner only                   |

---

## Creating a Household

### Flow

1. User signs in for the first time.
2. If not a member of any household, the app prompts: "Create or join a household".
3. User enters a name.
4. A household record is created in the database.
5. A member record is created for the user with role `owner`.
6. App redirects to the household dashboard.

### Domain Rules

- A household name is 1–100 characters.
- A unique URL slug is automatically generated from the name.
- The creator is automatically assigned the `owner` role.
- One household can have multiple owners (via role transfer).

---

## Member Management

### Inviting Members

**Who can**: Owner, Admin

Invitations are the primary way to add members to a household.

**Flow**:

1. Owner/Admin goes to Household → Members → Invite Member.
2. Enters invitee's email address and selects a role.
3. An invitation record is created with a 7-day expiry.
4. Owner/Admin manually shares the invitation link or notifies the invitee.
5. When the invitee signs in with that email, they see a pending invitation notification.
6. Invitee accepts or declines.
7. On acceptance, a member record is created.

**Notes**:

- Only one pending invitation per email per household.
- Invitation is tied to an email address, not an existing user account.
- No automated email is sent — admin must notify the invitee manually.

### Soft Members (No Account Required)

Owners and admins can add "soft members" (e.g., young children) who do not have their own account:

1. Household → Members → Add Member (without account).
2. Enter display name, optional avatar, and date of birth.
3. A member record is created with `user_id = null`.

Soft members appear in the household roster but cannot log in. Their data (e.g., wishlists) is managed on their behalf by the owner/admin.

### Changing Roles

**Who can**: Owner (any role); Admin (up to admin level)

1. Household → Members → click member → Change Role.
2. Select new role.
3. Confirm.

**Role change rules**:

- Owner can change any member's role.
- Admin can change roles for members with equal or lower roles (cannot promote to owner).
- A member cannot change their own role (except via ownership transfer).

### Removing Members

**Who can**: Owner (anyone); Admin (anyone below admin level)

1. Household → Members → click member → Remove.
2. Confirm.

Removed members lose access immediately. Their data (items they added to shopping lists, wishlists) is not deleted.

### Ownership Transfer

The owner can transfer ownership to another member:

1. Household → Settings → Transfer Ownership.
2. Select the new owner from existing admin/member list.
3. Confirm.

After transfer, the original owner becomes an Admin.

---

## Household Settings

### Update Name

Owner or Admin can change the household name in:
**Household** → **Settings** → **Name** → Save.

The URL slug updates automatically (but old slug links may break).

### Delete Household

**Only the Owner can delete a household.**

⚠️ Deletion is **permanent and irreversible**. All data is destroyed:

- All shopping lists and items
- All wishlists and items
- All member records
- All invitations

To delete: **Household** → **Settings** → **Delete Household** → Confirm.

---

## Data Model

```typescript
interface Household {
  id: string;
  name: string;
  slug: string; // URL-friendly unique identifier
  created_by: string; // User ID of creator
  created_at: string;
  updated_at: string;
  is_active: boolean; // Soft delete
  settings: Record<string, unknown>;
}

interface Member {
  id: string;
  household_id: string;
  user_id: string | null; // null for soft members
  role: 'owner' | 'admin' | 'member' | 'child' | 'viewer';
  display_name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  is_active: boolean;
  joined_at: string;
}
```

---

## See Also

- [RBAC Permissions](../architecture/rbac-permissions.md) — Complete permission matrix
- [Invitations Feature](invitation-acceptance.md) — Invitation flow details
- [Multi-Tenant Architecture](../architecture/multi-tenant.md) — Data isolation
