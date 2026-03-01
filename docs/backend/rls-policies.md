# 🛡️ Row-Level Security Policies

PostgreSQL RLS policies for the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

Every table in the application has **Row-Level Security (RLS) enabled**. This enforces that:

- Users can only access data belonging to their household
- Public wishlists are accessible to anyone with the share link
- Even if application code has a bug, the database prevents data leakage

All policies follow these patterns:

- Use `EXISTS` (not `IN`) for performance
- Reference `auth.uid()` for the current user
- Check `is_active = true` for soft-delete support

---

## Policy Patterns

### Household Member Check

This is the core pattern used across all tables:

```sql
EXISTS (
  SELECT 1 FROM members
  WHERE household_id = <table>.household_id
    AND user_id = auth.uid()
    AND is_active = true
)
```

### Role Check

For operations requiring specific roles:

```sql
EXISTS (
  SELECT 1 FROM members
  WHERE household_id = <table>.household_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND is_active = true
)
```

---

## Table Policies

### households

| Operation | Policy                                                   |
| --------- | -------------------------------------------------------- |
| SELECT    | User is a member of the household                        |
| INSERT    | User is authenticated (creates household for themselves) |
| UPDATE    | User is owner or admin of the household                  |
| DELETE    | User is owner of the household                           |

### members

| Operation | Policy                                      |
| --------- | ------------------------------------------- |
| SELECT    | User is a member of the same household      |
| INSERT    | User is owner or admin of the household     |
| UPDATE    | User is owner/admin, or updating own record |
| DELETE    | User is owner or admin of the household     |

### shopping_lists

| Operation | Policy                                      |
| --------- | ------------------------------------------- |
| SELECT    | User is a member of the household           |
| INSERT    | User is an active member (not viewer/child) |
| UPDATE    | User is a member with edit permissions      |
| DELETE    | User is owner/admin, or is the creator      |

### shopping_items

| Operation | Policy                                              |
| --------- | --------------------------------------------------- |
| SELECT    | User is a member of the household                   |
| INSERT    | User is a member (including child)                  |
| UPDATE    | User is a member with edit permissions, or own item |
| DELETE    | User is owner/admin, or is the item creator         |

### wishlists

| Operation | Policy                                                             |
| --------- | ------------------------------------------------------------------ |
| SELECT    | User is owner of wishlist, household member, or wishlist is public |
| INSERT    | User is authenticated member (not viewer)                          |
| UPDATE    | User is owner of wishlist, or household admin/owner                |
| DELETE    | User is owner of wishlist, or household admin/owner                |

### wishlist_items

| Operation | Policy                                          |
| --------- | ----------------------------------------------- |
| SELECT    | As per parent wishlist visibility               |
| INSERT    | User is wishlist owner, or authenticated member |
| UPDATE    | User is wishlist owner or household admin/owner |
| DELETE    | User is wishlist owner or household admin/owner |

### invitations

| Operation | Policy                                                               |
| --------- | -------------------------------------------------------------------- |
| SELECT    | User is household owner/admin, or invited email matches user's email |
| INSERT    | User is household owner/admin                                        |
| UPDATE    | User is household owner/admin, or accepting own invitation           |
| DELETE    | User is household owner/admin                                        |

---

## Security Functions

The schema includes helper functions for common permission checks:

```sql
-- Check if a user is a member of a household
CREATE FUNCTION user_is_household_member(p_household_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE household_id = p_household_id
      AND user_id = p_user_id
      AND is_active = true
  );
$$;

-- Check if a user has a minimum role in a household
CREATE FUNCTION has_min_role(p_household_id UUID, p_user_id UUID, p_min_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM members
    WHERE household_id = p_household_id
      AND user_id = p_user_id
      AND is_active = true
      AND role = ANY(
        CASE p_min_role
          WHEN 'owner'  THEN ARRAY['owner']
          WHEN 'admin'  THEN ARRAY['owner', 'admin']
          WHEN 'member' THEN ARRAY['owner', 'admin', 'member']
          WHEN 'child'  THEN ARRAY['owner', 'admin', 'member', 'child']
          WHEN 'viewer' THEN ARRAY['owner', 'admin', 'member', 'child', 'viewer']
          ELSE ARRAY[]::text[]
        END
      )
  );
$$;
```

---

## Testing RLS Policies

You can test RLS in the Supabase SQL Editor by impersonating a user:

```sql
-- Test as a specific user
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

SELECT * FROM shopping_lists WHERE household_id = 'household-uuid-here';
-- Should only return rows for households the user belongs to
```

---

## See Also

- [Database Schema](database-schema.md) — Full table definitions
- [Security Audit Report](security-audit-report.md) — Security review findings
- [Multi-Tenant Architecture](../architecture/multi-tenant.md) — Isolation design
