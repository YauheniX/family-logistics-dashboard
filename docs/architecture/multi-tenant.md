# 🏘️ Multi-Tenant Architecture

How household isolation is implemented in the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

The application is **multi-tenant** — each **household** is a completely isolated data tenant. A user can belong to multiple households, but data never crosses household boundaries.

Tenant isolation is enforced at **two levels**:

1. **Application level** — every data query includes `household_id`
2. **Database level** — Row-Level Security (RLS) policies on all tables

---

## Tenant Model

```
auth.users (Supabase Auth)
  └── members (links a user to a household with a role)
        └── households (the tenant)
              ├── shopping_lists
              │     └── shopping_items
              └── invitations
```

Every data table that belongs to a household includes a `household_id` foreign key:

```sql
-- Example: shopping_lists is scoped to a household
CREATE TABLE shopping_lists (
  id           UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  -- ...
);
```

---

## Data Flow

```
User logs in
  └── App loads their memberships (which households they belong to)
        └── User selects active household
              └── All subsequent queries include household_id
                    └── RLS verifies the user is a member of that household
                          └── Data returned (or access denied)
```

---

## Row-Level Security (RLS)

Supabase PostgreSQL RLS policies ensure that **even if application code has a bug**, users cannot read or write another household's data.

### Example RLS Policy

```sql
-- Users can only select shopping lists from their household
CREATE POLICY "shopping_lists_select"
  ON shopping_lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE household_id = shopping_lists.household_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );
```

Key points:
- Uses `EXISTS` (not `IN`) for performance
- Checks `is_active = true` to exclude removed members
- References `auth.uid()` — Supabase's current authenticated user function

See [RLS Policies](../backend/rls-policies.md) for the full policy list.

---

## Application-Level Enforcement

Repository code always scopes queries to the current household:

```typescript
// ✅ Correct — always includes household_id
async findByHouseholdId(householdId: string): Promise<ShoppingList[]> {
  const { data } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('household_id', householdId);  // ← tenant filter
  return data ?? [];
}

// ❌ Wrong — missing household scope
async findAll(): Promise<ShoppingList[]> {
  const { data } = await supabase.from('shopping_lists').select('*');
  return data ?? [];
}
```

---

## Household Switching

A user can belong to multiple households. The active household is stored in the Pinia `householdStore`:

```typescript
const householdStore = useHouseholdStore();
householdStore.setCurrentHousehold(selectedHousehold);
```

When the active household changes, all feature stores are refreshed with data from the new household.

---

## Wishlist Exception

Wishlists are the only cross-tenant data exception. **Public wishlists** can be accessed by anyone via a share link (`/w/:share_slug`), even unauthenticated users.

This is intentional and enforced by a specific RLS policy:

```sql
-- Public wishlists are readable by anyone
CREATE POLICY "wishlists_public_select"
  ON wishlists FOR SELECT
  USING (
    is_public = true
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM members
      WHERE household_id = wishlists.household_id
        AND user_id = auth.uid()
    )
  );
```

---

## Mock Mode

In Mock Mode, tenant isolation is implemented in the mock repositories using localStorage namespacing by `household_id`. The same API contract is maintained — application code doesn't know whether it's talking to Supabase or localStorage.

---

## See Also

- [RLS Policies](../backend/rls-policies.md) — Database security policies
- [Database Schema](../backend/database-schema.md) — Table structure
- [Repository Pattern](../development/repository-pattern.md) — How repositories enforce isolation
