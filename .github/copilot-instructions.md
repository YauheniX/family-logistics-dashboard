# AI Agent Instructions

**Project**: Family Logistics Dashboard  
**Type**: Multi-tenant household management (shopping lists + wishlists)

---

## Core Rules

1. **Household is the tenant** - All data must belong to a household
2. **Use `households` not `families`** - Legacy schema has been removed
3. **Follow repository pattern** - Don't access Supabase directly
4. **Maintain 70%+ test coverage** - Required by CI
5. **Update `/docs/` when architecture changes**

---

## What This Application Is

✅ Family Shopping & Wishlist Planner  
✅ Multi-tenant household management  
✅ Production-grade Vue 3 + Supabase app  
✅ Clean architecture with comprehensive documentation

---

## Quick Architecture

```
Frontend: Vue 3 + TypeScript + Pinia + TailwindCSS
Backend: Supabase (PostgreSQL + Auth + RLS)
Architecture: Clean Architecture (3-layer)
Testing: Vitest (70% minimum coverage)
```

---

## Key Principles

### 1. Multi-Tenant Isolation

```typescript
// ✅ Good - includes household context
const lists = await repo.findByHouseholdId(householdId);

// ❌ Bad - missing household context
const lists = await repo.findAll();
```

### 2. Use Current Schema

```typescript
// ✅ Good - current schema
.from('households')
.from('members')

// ❌ Bad - these tables no longer exist
// .from('families')     ← REMOVED
// .from('family_members') ← REMOVED
```

### 3. Repository Pattern

```typescript
// ✅ Good - use repository
const repo = new ShoppingListRepository();
const list = await repo.create(dto);

// ❌ Bad - direct Supabase access
await supabase.from('shopping_lists').insert(data);
```

### 4. Permission Checks

```typescript
// ✅ Good - permissions enforced by RLS + composables
const { canManageMembers } = useHouseholdPermissions();

// ❌ Bad - hardcoded role checks
if (user.role === 'admin') {
}
```

### 5. Pinia State Management

**Store IDs must be unique** across all stores. Check existing stores before creating new ones.

```typescript
// ✅ Good - unique store ID
export const useShoppingStore = defineStore('shopping', () => { ... });

// ❌ Bad - duplicate store ID (causes silent state sharing bugs)
export const useAuthStore = defineStore('auth', { ... });  // In stores/auth.ts
export const useAuthStore = defineStore('auth', { ... });  // In features/auth/ - COLLISION!
```

**Use setter actions instead of direct mutation:**

```typescript
// ✅ Good - use action
shoppingStore.setCurrentList(list);

// ❌ Bad - direct mutation breaks strict patterns
shoppingStore.currentList = list;
```

**Reset stores on logout** to prevent data leakage between sessions:

```typescript
// ✅ Good - clear all stores on logout (in App.vue)
householdStore.$reset();
shoppingStore.$reset();
wishlistStore.$reset();

// ❌ Bad - only clearing some stores
householdStore.setCurrentHousehold(null);
// Shopping/wishlist data from previous user still present!
```

**Import from correct location:**

```typescript
// ✅ Good - use primary stores
import { useAuthStore } from '@/stores/auth';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';

// ❌ Bad - feature-internal auth store (ID: 'auth-feature', not for app use)
import { useAuthStore } from '@/features/auth/presentation/auth.store';
```

---

## Database Security Rules

**CRITICAL:** Follow these rules when writing SQL migrations or database functions.

### 1. SECURITY DEFINER Functions

**ALWAYS** add `SET search_path = public` to prevent search path injection attacks (CWE-427).

```sql
-- ✅ Good - protected against injection
create or replace function user_is_household_member(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public  -- 🔒 REQUIRED
as $$
  select exists (select 1 from members where household_id = p_household_id and user_id = p_user_id);
$$;

-- ❌ Bad - vulnerable to search path injection
create or replace function user_is_household_member(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
security definer  -- Missing SET search_path!
stable
as $$
  select exists (select 1 from members where household_id = p_household_id and user_id = p_user_id);
$$;
```

**If function needs auth.users access:**

```sql
set search_path = public, auth  -- Explicit schema list
```

### 2. RLS Policies - Use EXISTS, Not IN

**ALWAYS** use `EXISTS` instead of `IN (SELECT ...)` for better performance (3-10x faster).

```sql
-- ✅ Good - EXISTS pattern (fast, short-circuits)
create policy "households_select"
  on households for select
  using (
    exists (
      select 1 from members
      where household_id = households.id
        and user_id = auth.uid()
        and is_active = true
    )
  );

-- ❌ Bad - IN pattern (slow, materializes all results)
create policy "households_select"
  on households for select
  using (
    id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );
```

### 3. Email Columns - Use CITEXT

**ALWAYS** use `citext` type for email addresses (case-insensitive).

> **Note**: The `citext` extension is in the `extensions` schema. Use `extensions.citext` or ensure `extensions` is in your search_path.

```sql
-- ✅ Good - case-insensitive email (reference full schema path)
alter table invitations
  add column email extensions.citext not null;

-- ❌ Bad - case-sensitive, causes duplicates
alter table invitations
  add column email text not null;
```

### 4. RPC Functions - Validate Permissions

**ALWAYS** validate caller permissions using `has_min_role()` or explicit role checks.

```sql
-- ✅ Good - validates permission
create or replace function invite_member(p_household_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Permission check using role hierarchy
  if not has_min_role(p_household_id, auth.uid(), 'admin') then
    raise exception 'Only owner or admin can invite members';
  end if;

  -- ... rest of function
end;
$$;

-- ❌ Bad - no permission validation
create or replace function invite_member(p_household_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Missing permission check!
  insert into invitations ...
end;
$$;
```

### 5. Partial Unique Indexes

**USE** partial indexes when uniqueness applies only to non-NULL values.

```sql
-- ✅ Good - partial unique index (excludes NULL user_id for soft members)
create unique index idx_members_unique_user_per_household
  on members(household_id, user_id)
  where user_id is not null;

-- ❌ Bad - standard unique constraint (allows multiple NULLs incorrectly)
alter table members
  add constraint members_unique_user_per_household unique (household_id, user_id);
```

### 6. Index All RLS Predicates

**ALWAYS** create indexes on columns used in RLS policy WHERE clauses.

```sql
-- ✅ Good - indexed predicate columns
create index idx_members_household_id on members(household_id);
create index idx_members_user_id on members(user_id) where user_id is not null;
create index idx_members_is_active on members(is_active) where is_active = true;

-- For complex RLS policies, use composite indexes:
create index idx_members_household_role_active
  on members(household_id, role, is_active)
  where is_active = true;
```

### 7. Migration File Placement

**DO NOT** place utility/debugging SQL in `supabase/migrations/`.

```plaintext
✅ Good:
supabase/migrations/019_security_hardening.sql  ← Actual migrations
scripts/db/check-migration-state.sql            ← Utility scripts

❌ Bad:
supabase/migrations/check-migration-state.sql   ← Wrong location
```

### 8. Security Audit Reference

**READ** before creating database code:

- `/docs/backend/security-audit-report.md` - Comprehensive security guide
- `/docs/backend/vulnerability-list.md` - Quick vulnerability reference
- `/docs/backend/security-hardening-guide.md` - Implementation patterns

---

## Role Hierarchy

```
Owner   → Full control (cannot be removed)
Admin   → Manage members, all content
Member  → Create/edit content
Child   → Limited access, no invites
Viewer  → Read-only
Public  → Anonymous (public wishlists only)
```

---

## Before Making Changes

1. Read relevant docs in `/docs/`
2. Understand domain model
3. Check RBAC permissions
4. Follow existing patterns
5. Write tests
6. Update documentation

---

## Documentation

**Key docs**:

- Architecture: `/docs/architecture/overview.md`
- Domain Model: `/docs/domain/overview.md`
- Database Schema: `/docs/backend/database-schema.md`
- RBAC Permissions: `/docs/architecture/rbac-permissions.md`
- **Security:** `/docs/backend/security-audit-report.md` ⚠️ READ BEFORE WRITING SQL
- **Security Quick Ref:** `/docs/backend/vulnerability-list.md`

---

## Common Mistakes to Avoid

### Application Layer

1. ❌ Creating data without `household_id`
2. ❌ Using legacy `families` table
3. ❌ Bypassing repository pattern
4. ❌ Hardcoding permissions in UI
5. ❌ Inventing features not in domain
6. ❌ Skipping tests

### Pinia State Management

7. ❌ Duplicate store IDs (e.g., two stores with `defineStore('auth', ...)`)
8. ❌ Direct state mutation outside actions (`store.property = value`)
9. ❌ Not resetting stores on logout (data leakage between sessions)
10. ❌ Destructuring store properties without `storeToRefs()` (breaks reactivity)
11. ❌ Importing from feature-internal stores instead of primary store paths

### Database Layer (SQL/Migrations)

7. ❌ SECURITY DEFINER without `SET search_path = public`
8. ❌ RLS policies using `IN (SELECT ...)` instead of `EXISTS`
9. ❌ Email columns using `text` instead of `citext`
10. ❌ RPC functions without permission validation
11. ❌ Missing indexes on RLS predicate columns
12. ❌ Utility SQL files in `migrations/` directory

---

## Pull Request Checklist

### Application Code

- [ ] Tests pass (npm test)
- [ ] Coverage ≥ 70%
- [ ] Linting passes
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] No legacy `families` references
- [ ] All data scoped to household
- [ ] Store IDs are unique (no duplicates)
- [ ] Stores reset on logout via `$reset()`

### Database Code (if SQL changes)

- [ ] All SECURITY DEFINER functions have `SET search_path = public`
- [ ] RLS policies use `EXISTS` not `IN (SELECT ...)`
- [ ] Email columns use `citext` type
- [ ] RPC functions validate permissions with `has_min_role()`
- [ ] All RLS predicate columns are indexed
- [ ] Migration files numbered sequentially (000-999)
- [ ] Utility scripts in `scripts/db/` not `migrations/`

### Mandatory Local Quality Gate (ALWAYS RUN)

Before completing ANY task, you MUST run:

```bash
npm run format
npm run lint
npm run type-check
npm test:coverage

All must pass.
Hard Requirements
✅ No ESLint errors
✅ No TypeScript errors
✅ Tests pass
✅ Coverage ≥ 70%
✅ No skipped tests unless explicitly justified
❌ Do NOT assume code works
❌ Do NOT skip type-checking
❌ Do NOT leave failing tests
If working in cloud / remote agent:
You must simulate full validation reasoning
You must not claim "it should work"
You must behave as if CI will immediately reject the PR