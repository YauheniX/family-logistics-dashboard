-- ════════════════════════════════════════════════════════════
-- Migration 025: Drop Legacy Families Schema
-- ════════════════════════════════════════════════════════════
-- This migration removes the legacy families/family_members tables
-- and all related objects. The households schema is now the
-- authoritative source for multi-tenant organization.
--
-- PREREQUISITES:
-- - All data has been migrated to households/members tables
-- - shopping_lists.household_id is populated for all rows
-- - Application code no longer references families tables
-- ════════════════════════════════════════════════════════════

-- ─── 1. Drop RLS Policies on Legacy Tables ───────────────────

-- Drop families policies
drop policy if exists "families_select" on families;
drop policy if exists "families_insert" on families;
drop policy if exists "families_update" on families;
drop policy if exists "families_delete" on families;

-- Drop family_members policies
drop policy if exists "family_members_select" on family_members;
drop policy if exists "family_members_insert" on family_members;
drop policy if exists "family_members_update" on family_members;
drop policy if exists "family_members_delete" on family_members;

-- ─── 2. Drop Legacy Shopping Lists RLS Policies ──────────────
-- These policies reference user_is_family_member/user_is_family_owner

drop policy if exists "shopping_lists_select" on shopping_lists;
drop policy if exists "shopping_lists_select_v2" on shopping_lists;
drop policy if exists "shopping_lists_insert" on shopping_lists;
drop policy if exists "shopping_lists_insert_v2" on shopping_lists;
drop policy if exists "shopping_lists_update" on shopping_lists;
drop policy if exists "shopping_lists_update_v2" on shopping_lists;
drop policy if exists "shopping_lists_delete" on shopping_lists;
drop policy if exists "shopping_lists_delete_v2" on shopping_lists;

-- Drop legacy shopping items policies
drop policy if exists "shopping_items_select" on shopping_items;
drop policy if exists "shopping_items_select_v2" on shopping_items;
drop policy if exists "shopping_items_insert" on shopping_items;
drop policy if exists "shopping_items_insert_v2" on shopping_items;
drop policy if exists "shopping_items_update" on shopping_items;
drop policy if exists "shopping_items_update_v2" on shopping_items;
drop policy if exists "shopping_items_delete" on shopping_items;
drop policy if exists "shopping_items_delete_v2" on shopping_items;

-- ─── 3. Drop Constraints and Foreign Keys ────────────────────

-- Drop the family_or_household check constraint on shopping_lists
alter table shopping_lists
  drop constraint if exists shopping_lists_family_or_household_check;

-- Drop family_id foreign key from shopping_lists
alter table shopping_lists
  drop constraint if exists shopping_lists_family_id_fkey;

-- ─── 4. Drop family_id Column from shopping_lists ────────────

alter table shopping_lists
  drop column if exists family_id;

-- ─── 5. Make household_id NOT NULL on shopping_lists ─────────

-- Delete orphaned shopping lists that have no household_id
-- These are leftover from the old families system
do $$
declare
  v_orphaned_lists integer;
begin
  select count(*) into v_orphaned_lists
  from shopping_lists
  where household_id is null;
  
  if v_orphaned_lists > 0 then
    raise notice 'Deleting % orphaned shopping lists with NULL household_id', v_orphaned_lists;
    
    -- First delete the items in those lists
    delete from shopping_items
    where list_id in (select id from shopping_lists where household_id is null);
    
    -- Then delete the orphaned lists
    delete from shopping_lists
    where household_id is null;
  end if;
end;
$$;

-- Now make it NOT NULL
alter table shopping_lists
  alter column household_id set not null;

comment on column shopping_lists.household_id is 'References households table (required)';

-- ─── 6. Drop Legacy Indexes ──────────────────────────────────

drop index if exists idx_family_members_user_id;
drop index if exists idx_family_members_family_id;
drop index if exists idx_shopping_lists_family_id;

-- ─── 7. Drop Legacy Helper Functions ─────────────────────────

drop function if exists user_is_family_member(uuid, uuid);
drop function if exists user_is_family_owner(uuid, uuid);

-- ─── 8. Drop Legacy Tables ───────────────────────────────────

-- family_members must be dropped first (references families)
drop table if exists family_members cascade;
drop table if exists families cascade;

-- ─── 9. Remove Migration Tracking Columns ────────────────────
-- These are no longer needed since families table is gone

alter table households
  drop column if exists migrated_from_family_id;

alter table members
  drop column if exists migrated_from_family_member_id;

-- ─── 10. Recreate Shopping Lists RLS Policies ────────────────
-- Using household-based policies (v2 policies should already exist from 019)

-- Verify v2 policies exist, if not create them

do $$
begin
  -- Check if shopping_lists_select_v2 exists
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_lists' 
      and policyname = 'shopping_lists_select_v2'
  ) then
    raise notice 'Creating shopping_lists_select_v2 policy';
    execute $policy$
      create policy "shopping_lists_select_v2"
        on shopping_lists for select
        using (
          exists (
            select 1 from members
            where household_id = shopping_lists.household_id
              and user_id = auth.uid()
              and is_active = true
          )
        )
    $policy$;
  end if;
  
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_lists' 
      and policyname = 'shopping_lists_insert_v2'
  ) then
    raise notice 'Creating shopping_lists_insert_v2 policy';
    execute $policy$
      create policy "shopping_lists_insert_v2"
        on shopping_lists for insert
        with check (
          exists (
            select 1 from members
            where household_id = shopping_lists.household_id
              and user_id = auth.uid()
              and is_active = true
          )
        )
    $policy$;
  end if;
  
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_lists' 
      and policyname = 'shopping_lists_update_v2'
  ) then
    raise notice 'Creating shopping_lists_update_v2 policy';
    execute $policy$
      create policy "shopping_lists_update_v2"
        on shopping_lists for update
        using (
          exists (
            select 1 from members
            where household_id = shopping_lists.household_id
              and user_id = auth.uid()
              and is_active = true
          )
        )
    $policy$;
  end if;
  
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_lists' 
      and policyname = 'shopping_lists_delete_v2'
  ) then
    raise notice 'Creating shopping_lists_delete_v2 policy';
    execute $policy$
      create policy "shopping_lists_delete_v2"
        on shopping_lists for delete
        using (
          exists (
            select 1 from members
            where household_id = shopping_lists.household_id
              and user_id = auth.uid()
              and is_active = true
              and role in ('owner', 'admin')
          )
          or created_by = auth.uid()
        )
    $policy$;
  end if;
end;
$$;

-- ─── 11. Recreate Shopping Items RLS Policies ────────────────

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_items' 
      and policyname = 'shopping_items_select_v2'
  ) then
    raise notice 'Creating shopping_items_select_v2 policy';
    execute $policy$
      create policy "shopping_items_select_v2"
        on shopping_items for select
        using (
          exists (
            select 1 from shopping_lists sl
            join members m on m.household_id = sl.household_id
            where sl.id = shopping_items.list_id
              and m.user_id = auth.uid()
              and m.is_active = true
          )
        )
    $policy$;
  end if;
  
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_items' 
      and policyname = 'shopping_items_insert_v2'
  ) then
    raise notice 'Creating shopping_items_insert_v2 policy';
    execute $policy$
      create policy "shopping_items_insert_v2"
        on shopping_items for insert
        with check (
          exists (
            select 1 from shopping_lists sl
            join members m on m.household_id = sl.household_id
            where sl.id = shopping_items.list_id
              and m.user_id = auth.uid()
              and m.is_active = true
          )
        )
    $policy$;
  end if;
  
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_items' 
      and policyname = 'shopping_items_update_v2'
  ) then
    raise notice 'Creating shopping_items_update_v2 policy';
    execute $policy$
      create policy "shopping_items_update_v2"
        on shopping_items for update
        using (
          exists (
            select 1 from shopping_lists sl
            join members m on m.household_id = sl.household_id
            where sl.id = shopping_items.list_id
              and m.user_id = auth.uid()
              and m.is_active = true
          )
        )
    $policy$;
  end if;
  
  if not exists (
    select 1 from pg_policies 
    where tablename = 'shopping_items' 
      and policyname = 'shopping_items_delete_v2'
  ) then
    raise notice 'Creating shopping_items_delete_v2 policy';
    execute $policy$
      create policy "shopping_items_delete_v2"
        on shopping_items for delete
        using (
          added_by = auth.uid()
          or exists (
            select 1 from shopping_lists sl
            join members m on m.household_id = sl.household_id
            where sl.id = shopping_items.list_id
              and m.user_id = auth.uid()
              and m.is_active = true
              and m.role in ('owner', 'admin')
          )
        )
    $policy$;
  end if;
end;
$$;

-- ─── 12. Verification ────────────────────────────────────────

do $$
declare
  v_families_exists boolean;
  v_family_members_exists boolean;
  v_family_funcs_exist boolean;
begin
  -- Verify tables are dropped
  v_families_exists := exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'families'
  );
  
  v_family_members_exists := exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'family_members'
  );
  
  -- Verify functions are dropped
  v_family_funcs_exist := exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' 
      and p.proname in ('user_is_family_member', 'user_is_family_owner')
  );
  
  if v_families_exists then
    raise exception 'Migration failed: families table still exists';
  end if;
  
  if v_family_members_exists then
    raise exception 'Migration failed: family_members table still exists';
  end if;
  
  if v_family_funcs_exist then
    raise exception 'Migration failed: family helper functions still exist';
  end if;
  
  raise notice '';
  raise notice '════════════════════════════════════════════════════════';
  raise notice 'Migration 025 completed successfully!';
  raise notice '════════════════════════════════════════════════════════';
  raise notice '✓ Dropped families table';
  raise notice '✓ Dropped family_members table';
  raise notice '✓ Dropped family_id from shopping_lists';
  raise notice '✓ Dropped legacy RLS policies';
  raise notice '✓ Dropped legacy helper functions';
  raise notice '✓ Removed migration tracking columns';
  raise notice '✓ household_id is now required on shopping_lists';
  raise notice '';
end;
$$;
