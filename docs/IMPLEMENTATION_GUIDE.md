# Implementation Guide - Multi-Tenant SaaS Redesign

## Overview

This guide provides step-by-step instructions for implementing the multi-tenant household architecture in your Family Planning application.

---

## Quick Reference

| Document | Purpose |
|----------|---------|
| [MULTI_TENANT_ARCHITECTURE.md](./MULTI_TENANT_ARCHITECTURE.md) | Complete architecture design and ERD |
| [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md) | Role-based access control details |
| [NAVIGATION_STRUCTURE.md](./NAVIGATION_STRUCTURE.md) | UX and navigation updates |
| [SCALABILITY_NOTES.md](./SCALABILITY_NOTES.md) | Performance and scaling considerations |
| [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) | Database migration approach |

---

## Phase 1: Database Migration (Backend)

### Step 1.1: Backup Current Database

```bash
# Create full database backup before migration
pg_dump -h your-db-host -U postgres -d postgres > backup_before_migration_$(date +%Y%m%d).sql

# Verify backup
ls -lh backup_*.sql
```

### Step 1.2: Run Migration Scripts (Staging First)

Execute migrations in order on **staging environment first**:

```bash
# 1. Create new tables (households, members, invitations, activity_logs)
psql -h staging-db -U postgres -d postgres -f supabase/migrations/010_create_households_schema.sql

# 2. Migrate data from families to households
psql -h staging-db -U postgres -d postgres -f supabase/migrations/011_migrate_families_to_households.sql

# 3. Update shopping_lists schema
psql -h staging-db -U postgres -d postgres -f supabase/migrations/012_update_shopping_schema.sql

# 4. Update wishlists schema
psql -h staging-db -U postgres -d postgres -f supabase/migrations/013_update_wishlists_schema.sql
```

### Step 1.3: Verify Migration

Run verification queries from each migration file:

```sql
-- Check migration completeness
SELECT 
  (SELECT count(*) FROM families) as families_count,
  (SELECT count(*) FROM households WHERE migrated_from_family_id IS NOT NULL) as migrated_households,
  (SELECT count(*) FROM family_members) as family_members_count,
  (SELECT count(*) FROM members WHERE migrated_from_family_member_id IS NOT NULL) as migrated_members;

-- Verify no data loss
SELECT 
  CASE 
    WHEN (SELECT count(*) FROM families) = (SELECT count(*) FROM households WHERE migrated_from_family_id IS NOT NULL)
    THEN 'All families migrated ✓'
    ELSE 'WARNING: Missing families!'
  END as families_status,
  CASE 
    WHEN (SELECT count(*) FROM family_members) = (SELECT count(*) FROM members WHERE migrated_from_family_member_id IS NOT NULL)
    THEN 'All members migrated ✓'
    ELSE 'WARNING: Missing members!'
  END as members_status;
```

### Step 1.4: Test on Staging

Before deploying to production:

- [ ] Create a new household via application
- [ ] Add members to household
- [ ] Create shopping lists
- [ ] Create wishlists with different visibility levels
- [ ] Test public wishlist sharing
- [ ] Test member invitations
- [ ] Verify RLS policies work correctly
- [ ] Check activity logs are being created

### Step 1.5: Deploy to Production

Once staging validation is complete:

```bash
# Run same migrations on production
psql -h prod-db -U postgres -d postgres -f supabase/migrations/010_create_households_schema.sql
psql -h prod-db -U postgres -d postgres -f supabase/migrations/011_migrate_families_to_households.sql
psql -h prod-db -U postgres -d postgres -f supabase/migrations/012_update_shopping_schema.sql
psql -h prod-db -U postgres -d postgres -f supabase/migrations/013_update_wishlists_schema.sql

# Monitor for errors
tail -f /var/log/postgresql/postgresql.log
```

---

## Phase 2: Update Application Code (Frontend)

### Step 2.1: Update TypeScript Types

The entity types have been updated in `src/features/shared/domain/entities.ts` to include:

- `Household` interface
- `Member` interface (with soft member support)
- `Invitation` interface
- `ActivityLog` interface
- Updated `ShoppingList`, `ShoppingItem`, `Wishlist`, `WishlistItem` with new fields

**No immediate action required** - types are backward compatible.

### Step 2.2: Create Household Repository

Create `src/features/household/infrastructure/household.repository.ts`:

```typescript
import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type { Household, CreateHouseholdDto, UpdateHouseholdDto } from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class HouseholdRepository extends BaseRepository<Household, CreateHouseholdDto, UpdateHouseholdDto> {
  constructor() {
    super(supabase, 'households');
  }

  async findByUserId(userId: string): Promise<ApiResponse<Household[]>> {
    return this.execute<Household[]>(async () => {
      return await supabase
        .from('households')
        .select(`
          *,
          members!inner(user_id)
        `)
        .eq('members.user_id', userId)
        .eq('members.is_active', true)
        .order('created_at');
    });
  }
}

export const householdRepository = new HouseholdRepository();
```

### Step 2.3: Create Member Repository

Create `src/features/household/infrastructure/member.repository.ts`:

```typescript
import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type { Member, CreateMemberDto, UpdateMemberDto } from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class MemberRepository extends BaseRepository<Member, CreateMemberDto, UpdateMemberDto> {
  constructor() {
    super(supabase, 'members');
  }

  async findByHouseholdId(householdId: string): Promise<ApiResponse<Member[]>> {
    return this.findAll((builder) =>
      builder
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('joined_at')
    );
  }

  async findByUserId(userId: string): Promise<ApiResponse<Member[]>> {
    return this.findAll((builder) =>
      builder
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('joined_at')
    );
  }

  async inviteByEmail(
    householdId: string,
    email: string,
    role: string
  ): Promise<ApiResponse<any>> {
    // TODO: Implement invitation logic
    // This will create an invitation record and send email
    throw new Error('Not implemented yet');
  }
}

export const memberRepository = new MemberRepository();
```

### Step 2.4: Create Household Store

Create `src/features/household/presentation/household.store.ts`:

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { householdRepository } from '../infrastructure/household.repository';
import { memberRepository } from '../infrastructure/member.repository';
import type { Household, Member } from '../../shared/domain/entities';

export const useHouseholdStore = defineStore('household', () => {
  // State
  const households = ref<Household[]>([]);
  const currentHousehold = ref<Household | null>(null);
  const currentMembers = ref<Member[]>([]);
  const currentUserMember = ref<Member | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isOwner = computed(() => currentUserMember.value?.role === 'owner');
  const isAdmin = computed(() => 
    currentUserMember.value?.role === 'owner' || 
    currentUserMember.value?.role === 'admin'
  );
  const canManageMembers = computed(() => isAdmin.value);
  const canCreateLists = computed(() => 
    currentUserMember.value?.role !== 'viewer' && 
    currentUserMember.value?.role !== 'child'
  );

  // Actions
  async function fetchUserHouseholds(userId: string) {
    loading.value = true;
    error.value = null;

    const response = await householdRepository.findByUserId(userId);

    if (response.error) {
      error.value = response.error.message;
      loading.value = false;
      return;
    }

    households.value = response.data || [];
    
    // Auto-select first household if none selected
    if (!currentHousehold.value && households.value.length > 0) {
      await selectHousehold(households.value[0].id);
    }

    loading.value = false;
  }

  async function selectHousehold(householdId: string) {
    const household = households.value.find(h => h.id === householdId);
    if (!household) return;

    currentHousehold.value = household;
    
    // Fetch members for this household
    const membersResponse = await memberRepository.findByHouseholdId(householdId);
    if (!membersResponse.error) {
      currentMembers.value = membersResponse.data || [];
      
      // Find current user's member record
      // This would need the current user ID from auth store
      // currentUserMember.value = currentMembers.value.find(m => m.user_id === currentUserId);
    }

    // Store in localStorage for persistence
    localStorage.setItem('currentHouseholdId', householdId);
  }

  async function createHousehold(name: string, userId: string) {
    loading.value = true;
    error.value = null;

    const response = await householdRepository.create({ name });

    if (response.error || !response.data) {
      error.value = response.error?.message || 'Failed to create household';
      loading.value = false;
      return null;
    }

    // Add to households list
    households.value.push(response.data);

    // Create owner member record
    await memberRepository.create({
      household_id: response.data.id,
      user_id: userId,
      role: 'owner',
      display_name: 'Me',
    });

    loading.value = false;
    return response.data;
  }

  return {
    // State
    households,
    currentHousehold,
    currentMembers,
    currentUserMember,
    loading,
    error,
    // Getters
    isOwner,
    isAdmin,
    canManageMembers,
    canCreateLists,
    // Actions
    fetchUserHouseholds,
    selectHousehold,
    createHousehold,
  };
});
```

### Step 2.5: Create Household Switcher Component

Create `src/features/household/presentation/HouseholdSwitcher.vue`:

```vue
<template>
  <div class="household-switcher">
    <button @click="isOpen = !isOpen" class="switcher-button">
      <span class="household-icon">🏠</span>
      <span class="household-name">{{ currentHousehold?.name || 'Select Household' }}</span>
      <span class="dropdown-icon">▼</span>
    </button>

    <div v-if="isOpen" class="dropdown-menu">
      <div 
        v-for="household in households" 
        :key="household.id"
        @click="selectHousehold(household)"
        class="dropdown-item"
        :class="{ active: household.id === currentHousehold?.id }"
      >
        <span class="household-icon">🏠</span>
        <span>{{ household.name }}</span>
        <span v-if="household.id === currentHousehold?.id" class="check-icon">✓</span>
      </div>

      <hr class="divider" />

      <div @click="createNewHousehold" class="dropdown-item create-new">
        <span class="plus-icon">➕</span>
        <span>Create New Household</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useHouseholdStore } from './household.store';
import type { Household } from '../../shared/domain/entities';

const householdStore = useHouseholdStore();
const { households, currentHousehold } = storeToRefs(householdStore);

const isOpen = ref(false);

function selectHousehold(household: Household) {
  householdStore.selectHousehold(household.id);
  isOpen.value = false;
}

function createNewHousehold() {
  // Show create household modal
  isOpen.value = false;
  // Emit event or navigate to create page
}
</script>

<style scoped>
.household-switcher {
  position: relative;
}

.switcher-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  cursor: pointer;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  z-index: 1000;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.active {
  background: #e3f2fd;
}

.divider {
  margin: 0.5rem 0;
  border: none;
  border-top: 1px solid #ddd;
}
</style>
```

---

## Phase 3: Update Existing Features

### Step 3.1: Update Shopping Lists

Modify shopping list repository to use household_id:

```typescript
// In src/features/shopping/infrastructure/shopping.repository.ts

// Update to filter by household instead of family
async findByHouseholdId(householdId: string): Promise<ApiResponse<ShoppingList[]>> {
  return this.findAll((builder) =>
    builder
      .eq('household_id', householdId)  // New field
      .order('created_at', { ascending: false })
  );
}
```

### Step 3.2: Update Wishlists

Add visibility support:

```typescript
// In wishlist repository

async findByMemberId(memberId: string): Promise<ApiResponse<Wishlist[]>> {
  return this.findAll((builder) =>
    builder
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
  );
}

async findHouseholdWishlists(householdId: string): Promise<ApiResponse<Wishlist[]>> {
  return this.findAll((builder) =>
    builder
      .eq('household_id', householdId)
      .in('visibility', ['household', 'public'])
      .order('created_at', { ascending: false })
  );
}
```

---

## Phase 4: Add New Features

### Step 4.1: Member Management

Create member management page with:
- List all household members
- Invite new members
- Edit member roles (owner/admin only)
- Remove members (owner/admin only)
- Add soft members (children without accounts)

### Step 4.2: Activity Feed

Create activity feed component:
- Fetch from `activity_logs` table
- Group by date
- Show member avatars
- Link to related entities

### Step 4.3: Invitation System

Implement invitation workflow:
1. Admin sends invitation (creates record in `invitations` table)
2. Email sent with magic link
3. Recipient clicks link, accepts invitation
4. Member record created, invitation marked as accepted

---

## Phase 5: Testing

### Unit Tests

```typescript
// Test household repository
describe('HouseholdRepository', () => {
  it('should create a household', async () => {
    const household = await householdRepository.create({ name: 'Test Family' });
    expect(household.data).toBeTruthy();
    expect(household.data?.slug).toMatch(/test-family/);
  });
});
```

### Integration Tests

Test full workflows:
- User creates household → becomes owner
- Owner invites member → member accepts
- Member creates shopping list → visible to household
- Child creates wishlist → visible based on visibility setting

### E2E Tests

```typescript
// Cypress test
describe('Household Creation', () => {
  it('allows creating a new household', () => {
    cy.login('user@example.com', 'password');
    cy.get('[data-test=household-switcher]').click();
    cy.get('[data-test=create-household]').click();
    cy.get('[data-test=household-name]').type('My Family');
    cy.get('[data-test=submit]').click();
    cy.contains('My Family').should('be.visible');
  });
});
```

---

## Phase 6: Rollout Plan

### Week 1: Soft Launch (10% of users)

- Deploy to production with feature flag
- Enable for 10% of users
- Monitor error rates, performance
- Collect feedback

### Week 2: Gradual Rollout (50% of users)

- Increase to 50% if no major issues
- Continue monitoring
- Fix bugs found

### Week 3: Full Rollout (100% of users)

- Enable for all users
- Announce new features via email/blog
- Provide in-app tour

### Week 4: Cleanup

- Drop old `families` and `family_members` tables (after backup)
- Remove migration tracking columns
- Update documentation

---

## Troubleshooting

### Issue: Migration fails partway through

**Solution:**
```sql
-- Check which step failed
SELECT * FROM households WHERE migrated_from_family_id IS NULL;
SELECT * FROM members WHERE migrated_from_family_member_id IS NULL;

-- Re-run migration (it's idempotent)
\i supabase/migrations/011_migrate_families_to_households.sql
```

### Issue: RLS policies blocking access

**Solution:**
```sql
-- Temporarily disable RLS for debugging (dev only!)
ALTER TABLE households DISABLE ROW LEVEL SECURITY;

-- Check if user has member record
SELECT * FROM members WHERE user_id = 'user-uuid' AND is_active = true;

-- Re-enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
```

### Issue: Wishlists not showing after migration

**Solution:**
```sql
-- Check if wishlists were assigned households
SELECT 
  w.id, 
  w.title, 
  w.household_id, 
  w.member_id 
FROM wishlists w 
WHERE household_id IS NULL OR member_id IS NULL;

-- Manually assign if needed (replace UUIDs)
UPDATE wishlists 
SET household_id = 'household-uuid', 
    member_id = 'member-uuid'
WHERE id = 'wishlist-uuid';
```

---

## Performance Optimization

After migration, run these optimizations:

```sql
-- Analyze tables for query planner
ANALYZE households;
ANALYZE members;
ANALYZE shopping_lists;
ANALYZE wishlists;
ANALYZE activity_logs;

-- Vacuum to reclaim space
VACUUM ANALYZE;

-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;
```

---

## Monitoring Checklist

After deployment, monitor:

- [ ] Database CPU usage (should be < 70%)
- [ ] Query response times (p95 < 200ms)
- [ ] RLS policy performance
- [ ] Connection pool usage
- [ ] Error rates in application logs
- [ ] User feedback and support tickets

---

## Success Criteria

Migration is successful when:

- ✅ All families migrated to households (100%)
- ✅ All family members migrated to members (100%)
- ✅ Shopping lists working with households
- ✅ Wishlists with visibility controls working
- ✅ Member management functional
- ✅ Invitation system working
- ✅ Activity logs populating
- ✅ No increase in error rates
- ✅ Performance metrics within targets
- ✅ Positive user feedback

---

## Next Steps

After successful migration:

1. **New Features**
   - Household settings page
   - Advanced member permissions
   - Bulk operations
   - Email notifications

2. **Optimizations**
   - Implement caching strategy
   - Add database partitioning for activity logs
   - Optimize RLS policies

3. **Billing Integration**
   - Add subscription plans
   - Implement usage tracking
   - Create billing dashboard

4. **Mobile App**
   - React Native or Flutter app
   - Offline support
   - Push notifications

---

## Support

For questions or issues during implementation:

1. Check existing documentation
2. Review migration logs
3. Test on staging first
4. Contact team lead if blocked

**Good luck with the migration!** 🚀
