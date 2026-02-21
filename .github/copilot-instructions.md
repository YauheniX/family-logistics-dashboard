# AI Agent Instructions

**Project**: Family Logistics Dashboard  
**Type**: Multi-tenant household management (shopping lists + wishlists)

---

## Core Rules

1. **Household is the tenant** - All data must belong to a household
2. **Use `households` not `families`** - Migration in progress
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

// ❌ Bad - legacy schema (being phased out)
.from('families')
.from('family_members')
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

---

## Common Mistakes to Avoid

1. ❌ Creating data without `household_id`
2. ❌ Using legacy `families` table
3. ❌ Bypassing repository pattern
4. ❌ Hardcoding permissions in UI
5. ❌ Inventing features not in domain
6. ❌ Skipping tests

---

## Pull Request Checklist

- [ ] Tests pass (npm test)
- [ ] Coverage ≥ 70%
- [ ] Linting passes
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] No legacy `families` references
- [ ] All data scoped to household
