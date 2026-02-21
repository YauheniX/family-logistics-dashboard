# 🔐 RBAC Permission Matrix

Complete role-based access control (RBAC) permission matrix for the Family Logistics Dashboard.

**Last Updated**: February 21, 2026

---

## Overview

The system implements a hierarchical role-based access control (RBAC) system with **5 distinct roles** for authenticated users, plus public guest access for shared wishlists.

---

## Role Hierarchy

```
┌─────────────────────────────────────────────┐
│  Owner    (Full control, billing, delete)  │  ← Highest privileges
├─────────────────────────────────────────────┤
│  Admin    (Manage members, all content)    │
├─────────────────────────────────────────────┤
│  Member   (Create/edit content)            │
├─────────────────────────────────────────────┤
│  Child    (Limited content, no invites)    │
├─────────────────────────────────────────────┤
│  Viewer   (Read-only access)               │
├─────────────────────────────────────────────┤
│  Public   (Anonymous, public wishlists)    │  ← Lowest privileges
└─────────────────────────────────────────────┘
```

---

## Role Descriptions

| Role             | Description                                                       | Typical Users            | Has Account?   |
| ---------------- | ----------------------------------------------------------------- | ------------------------ | -------------- |
| **Owner**        | Complete control over household, billing, and critical operations | Head of household        | Yes (required) |
| **Admin**        | Manage members and all household content                          | Co-parent, trusted adult | Yes (required) |
| **Member**       | Full access to create and manage content                          | Adult family members     | Yes (required) |
| **Child**        | Limited access, cannot invite others                              | Children with accounts   | Yes (optional) |
| **Viewer**       | Read-only access to household content                             | Grandparents, caregivers | Yes (optional) |
| **Public Guest** | Access only to public wishlists via share link                    | External friends, family | No             |

---

## Permission Matrix

### Legend

- ✅ **Allowed** - Can perform action
- ❌ **Denied** - Cannot perform action
- 🔒 **Own Only** - Can only perform on own content
- 👀 **View Only** - Read-only access

---

## 1. Household Management

| Action                    | Owner | Admin | Member | Child | Viewer | Public |
| ------------------------- | ----- | ----- | ------ | ----- | ------ | ------ |
| View household details    | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Update household name     | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Update household settings | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Delete household          | ✅    | ❌    | ❌     | ❌    | ❌     | ❌     |
| Leave household           | ❌    | ✅    | ✅     | ✅    | ✅     | ❌     |
| View household slug       | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |

**Notes:**

- Owner cannot leave household (must transfer ownership first)
- Only one owner per household
- Household deletion is a destructive action reserved for owner only

---

## 2. Member Management

| Action                          | Owner | Admin | Member | Child | Viewer | Public |
| ------------------------------- | ----- | ----- | ------ | ----- | ------ | ------ |
| View all members                | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| View member details             | ✅    | ✅    | ✅     | ✅    | 👀     | ❌     |
| Invite new member               | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Create soft member (no account) | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Update member profile (own)     | 🔒    | 🔒    | 🔒     | 🔒    | 🔒     | ❌     |
| Update member profile (others)  | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Change member role              | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Promote to owner                | ✅    | ❌    | ❌     | ❌    | ❌     | ❌     |
| Remove member                   | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Remove self                     | ✅\*  | ✅    | ✅     | ✅    | ✅     | ❌     |

**Notes:**

- \*Owner can only remove self after transferring ownership
- Admin can change roles for members with equal or lower roles
- Admin cannot promote self to owner
- Soft members (children without accounts) can be created by owner/admin

---

## 3. Invitation Management

| Action                   | Owner | Admin | Member | Child | Viewer | Public |
| ------------------------ | ----- | ----- | ------ | ----- | ------ | ------ |
| Send invitation          | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| View pending invitations | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Resend invitation        | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Revoke invitation        | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Accept invitation (own)  | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Decline invitation (own) | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |

**Notes:**

- **In-app invitation system** - No email server required (Migration 022)
- Users see pending invitations on dashboard when logged in with invited email
- Invitations expire after 7 days by default
- Invitation acceptance creates member record with specified role
- Only one pending invitation per email per household
- Admin must manually share invitation details with invitee (email/SMS/chat)

**See**: [Invitation Acceptance Feature](../features/invitation-acceptance.md)

---

## 4. Shopping Lists

| Action             | Owner | Admin | Member | Child | Viewer | Public |
| ------------------ | ----- | ----- | ------ | ----- | ------ | ------ |
| View all lists     | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Create list        | ✅    | ✅    | ✅     | ❌    | ❌     | ❌     |
| Update list (any)  | ✅    | ✅    | ✅     | ❌    | ❌     | ❌     |
| Update list (own)  | ✅    | ✅    | ✅     | 🔒    | ❌     | ❌     |
| Archive list (any) | ✅    | ✅    | ✅     | ❌    | ❌     | ❌     |
| Archive list (own) | ✅    | ✅    | ✅     | 🔒    | ❌     | ❌     |
| Delete list (any)  | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Delete list (own)  | ✅    | ✅    | ✅     | ❌    | ❌     | ❌     |

**Notes:**

- Members can create and manage shopping lists collaboratively
- Children cannot create lists but can view and interact with items
- Viewer role is read-only for shopping lists

---

## 5. Shopping Items

| Action              | Owner | Admin | Member | Child | Viewer | Public |
| ------------------- | ----- | ----- | ------ | ----- | ------ | ------ |
| View all items      | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Add item            | ✅    | ✅    | ✅     | ✅    | ❌     | ❌     |
| Update item (any)   | ✅    | ✅    | ✅     | ❌    | ❌     | ❌     |
| Update item (own)   | ✅    | ✅    | ✅     | 🔒    | ❌     | ❌     |
| Mark as purchased   | ✅    | ✅    | ✅     | ✅    | ❌     | ❌     |
| Unmark as purchased | ✅    | ✅    | ✅     | ✅    | ❌     | ❌     |
| Delete item (any)   | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Delete item (own)   | ✅    | ✅    | ✅     | 🔒    | ❌     | ❌     |

**Notes:**

- Children can add items and mark them as purchased
- Purchase tracking records which member completed the purchase
- Viewers can see items but not modify

---

## 6. Wishlists

| Action                    | Owner | Admin | Member | Child | Viewer | Public |
| ------------------------- | ----- | ----- | ------ | ----- | ------ | ------ |
| **Private Wishlists**     |       |       |        |       |        |        |
| View own wishlist         | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| View others' private      | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Create wishlist           | ✅    | ✅    | ✅     | ✅    | ❌     | ❌     |
| Update own wishlist       | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Update others' wishlist   | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Delete own wishlist       | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Delete others' wishlist   | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| **Household Wishlists**   |       |       |        |       |        |        |
| View household wishlist   | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Create household wishlist | ✅    | ✅    | ✅     | ✅    | ❌     | ❌     |
| **Public Wishlists**      |       |       |        |       |        |        |
| View public wishlist      | ✅    | ✅    | ✅     | ✅    | ✅     | ✅     |
| Change visibility         | 🔒    | 🔒    | 🔒     | 🔒    | 🔒     | ❌     |
| Share public link         | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |

**Notes:**

- Three visibility levels: private, household, public
- Children can create wishlists (great for birthday/holiday wishes)
- Owner/Admin can view all wishlists regardless of visibility (parental oversight)
- Public wishlists accessible to anyone with share link

---

## 7. Wishlist Items

| Action                       | Owner | Admin | Member | Child | Viewer | Public |
| ---------------------------- | ----- | ----- | ------ | ----- | ------ | ------ |
| **Private Wishlists**        |       |       |        |       |        |        |
| View items (own wishlist)    | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| View items (others' private) | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |
| Add item (own wishlist)      | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Update item (own wishlist)   | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Delete item (own wishlist)   | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| **Household Wishlists**      |       |       |        |       |        |        |
| View items                   | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Reserve item                 | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Unreserve item               | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| **Public Wishlists**         |       |       |        |       |        |        |
| View items                   | ✅    | ✅    | ✅     | ✅    | ✅     | ✅     |
| Reserve item (authenticated) | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| Reserve item (anonymous)     | ❌    | ❌    | ❌     | ❌    | ❌     | ✅     |

**Notes:**

- Public guests can reserve items on public wishlists (email optional)
- Reservation prevents double-gifting
- Wishlist owner cannot see who reserved (until after event)
- Owner/Admin can see reservations on children's wishlists

---

## 8. Activity Feed

| Action                    | Owner | Admin | Member | Child | Viewer | Public |
| ------------------------- | ----- | ----- | ------ | ----- | ------ | ------ |
| View household activity   | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| View own activity         | ✅    | ✅    | ✅     | ✅    | ✅     | ❌     |
| View others' activity     | ✅    | ✅    | ✅     | ❌    | 👀     | ❌     |
| Filter activity by member | ✅    | ✅    | ✅     | 🔒    | 👀     | ❌     |
| Export activity log       | ✅    | ✅    | ❌     | ❌    | ❌     | ❌     |

**Notes:**

- Activity feed shows recent household actions
- Children can only see their own activities in detail
- Viewers can see general activity but limited details

---

## Implementation

### RLS Policy Structure

Each table uses Row Level Security policies that enforce these permissions:

```sql
-- Example: Shopping lists accessible to household members
create policy "shopping_lists_select"
  on shopping_lists for select
  using (
    exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = auth.uid()
        and is_active = true
    )
  );
```

### Role-Based Checks

Helper functions check minimum role requirements:

```sql
-- Example: Check if user can manage members
select has_min_role(household_id, auth.uid(), 'admin');
```

### Client-Side Enforcement

The TypeScript client also checks permissions before showing UI elements:

```typescript
// Example: Show "Invite Member" button only to admin+
const canInviteMembers = memberRole === 'owner' || memberRole === 'admin';
```

---

## Special Cases

### Soft Members (Children Without Accounts)

- Cannot authenticate or access the app
- Wishlists can be created by parents on their behalf
- Can later activate account and claim their member profile

### Account Activation Flow

1. Soft member (child) turns 13 (or appropriate age)
2. Owner/Admin sends invitation email
3. Child creates account with same email
4. System links user account to existing member record
5. Child maintains history (wishlists, etc.)

### Wishlist Privacy for Children

- **Private**: Child's birthday wishlist (only parents can see)
- **Household**: Family can see but not reserve (planning)
- **Public**: Share with grandparents, aunts, uncles via link

### Public Wishlist Reservation

- Anonymous users can reserve without account
- Optional email/name for gift coordination
- Reservations hidden from wishlist owner to preserve surprise
- After event date, reservations can be revealed

---

## Security Best Practices

### Defense in Depth

1. **RLS Policies**: Permissions enforced at database level
2. **Helper Functions**: Centralized permission checks
3. **Client-Side**: UI hides unauthorized actions

### Principle of Least Privilege

- Each role has minimum required permissions
- Cannot escalate own permissions
- Admin cannot become owner

### Audit Logging

All critical actions logged:

- Member role changes
- Invitation sent/accepted/revoked
- Household settings changes
- Member removal

### GDPR/COPPA Considerations

- **Children under 13**: Cannot create accounts (soft members only)
- **Data export**: Owners can export household data
- **Data deletion**: Deleting household removes all data
- **Right to be forgotten**: Users can request account deletion

---

## Permission Testing Checklist

### Household Level

- [ ] Owner can delete household
- [ ] Admin cannot delete household
- [ ] Members cannot update household settings
- [ ] All roles can view household details

### Member Management

- [ ] Only owner can promote to owner
- [ ] Admin can change member roles (except owner)
- [ ] Members cannot invite others
- [ ] Owner cannot remove self without transfer

### Shopping Lists

- [ ] Members can create/edit lists
- [ ] Children cannot create lists
- [ ] Viewers are read-only
- [ ] All household members can see lists

### Wishlists

- [ ] Private wishlists only visible to owner + admins
- [ ] Household wishlists visible to all members
- [ ] Public wishlists accessible via share link
- [ ] Children can create wishlists

### Activity Logs

- [ ] All members can view household activity
- [ ] Detailed filtering available to admin+
- [ ] Activity properly attributes actions to members

---

## Related Documentation

- [Database Schema](../backend/database-schema.md)
- [RLS Policies](../backend/rls-policies.md)
- [Multi-Tenant Architecture](multi-tenant.md)
- [Domain Model](../domain/overview.md)

---

**Last Updated**: February 21, 2026
