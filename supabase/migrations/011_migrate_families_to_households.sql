-- ════════════════════════════════════════════════════════════
-- Migration 011: Migrate Data from Families to Households
-- ════════════════════════════════════════════════════════════
-- This script migrates all existing data to the new schema.
-- It's idempotent and can be run multiple times safely.
-- ════════════════════════════════════════════════════════════

do $$
declare
  v_family record;
  v_family_member record;
  v_household_id uuid;
  v_member_id uuid;
  v_user_profile record;
  v_families_migrated integer := 0;
  v_members_migrated integer := 0;
begin
  raise notice 'Starting migration from families to households...';
  raise notice 'Timestamp: %', now();
  
  -- ─── Step 1: Migrate Families → Households ────────────────
  
  raise notice '';
  raise notice '══════════════════════════════════════════════════';
  raise notice 'STEP 1: Migrating Families to Households';
  raise notice '══════════════════════════════════════════════════';
  
  for v_family in 
    select * from families 
    where id not in (
      select migrated_from_family_id 
      from households 
      where migrated_from_family_id is not null
    )
    order by created_at
  loop
    raise notice 'Migrating family: % (ID: %)', v_family.name, v_family.id;
    
    -- Insert household with same ID for easier migration
    insert into households (
      id,
      name,
      slug,
      created_by,
      created_at,
      updated_at,
      is_active,
      migrated_from_family_id
    ) values (
      v_family.id,
      v_family.name,
      generate_household_slug(v_family.name),
      v_family.created_by,
      v_family.created_at,
      now(),
      true,
      v_family.id
    )
    on conflict (id) do nothing;
    
    v_household_id := v_family.id;
    v_families_migrated := v_families_migrated + 1;
    
    -- ─── Step 2: Migrate Family Members → Members ─────────
    
    for v_family_member in 
      select * from family_members 
      where family_id = v_family.id
        and id not in (
          select migrated_from_family_member_id from members
          where migrated_from_family_member_id is not null
        )
      order by joined_at
    loop
      -- Get user profile for display name
      select * into v_user_profile 
      from user_profiles
      where id = v_family_member.user_id;
      
      raise notice '  → Migrating member: % (Role: %)', 
        coalesce(v_user_profile.display_name, 'Unknown'),
        v_family_member.role;
      
      -- Insert member with same ID
      insert into members (
        id,
        household_id,
        user_id,
        role,
        display_name,
        date_of_birth,
        avatar_url,
        is_active,
        joined_at,
        migrated_from_family_member_id
      ) values (
        v_family_member.id,
        v_household_id,
        v_family_member.user_id,
        v_family_member.role,  -- owner or member (no new roles yet)
        coalesce(v_user_profile.display_name, 'Member'),
        null,  -- No DOB in old schema
        v_user_profile.avatar_url,
        true,
        v_family_member.joined_at,
        v_family_member.id
      )
      on conflict (id) do nothing;
      
      v_members_migrated := v_members_migrated + 1;
      
    end loop;
    
  end loop;
  
  -- ─── Step 3: Migration Summary ────────────────────────────
  
  raise notice '';
  raise notice '══════════════════════════════════════════════════';
  raise notice 'MIGRATION SUMMARY';
  raise notice '══════════════════════════════════════════════════';
  raise notice 'Families migrated: %', v_families_migrated;
  raise notice 'Members migrated: %', v_members_migrated;
  raise notice '';
  
  -- ─── Step 4: Verification ──────────────────────────────────
  
  raise notice '══════════════════════════════════════════════════';
  raise notice 'VERIFICATION';
  raise notice '══════════════════════════════════════════════════';
  
  declare
    v_families_count integer;
    v_households_count integer;
    v_family_members_count integer;
    v_members_count integer;
  begin
    select count(*) into v_families_count from families;
    select count(*) into v_households_count from households 
      where migrated_from_family_id is not null;
    select count(*) into v_family_members_count from family_members;
    select count(*) into v_members_count from members
      where migrated_from_family_member_id is not null;
    
    raise notice 'Total families: %', v_families_count;
    raise notice 'Total households (migrated): %', v_households_count;
    raise notice 'Total family members: %', v_family_members_count;
    raise notice 'Total members (migrated): %', v_members_count;
    raise notice '';
    
    if v_families_count != v_households_count then
      raise warning '⚠️  Not all families migrated! Missing: %', 
        v_families_count - v_households_count;
    else
      raise notice '✅ All families successfully migrated!';
    end if;
    
    if v_family_members_count != v_members_count then
      raise warning '⚠️  Not all family members migrated! Missing: %',
        v_family_members_count - v_members_count;
    else
      raise notice '✅ All family members successfully migrated!';
    end if;
  end;
  
  raise notice '';
  raise notice '══════════════════════════════════════════════════';
  raise notice 'Migration completed at: %', now();
  raise notice '══════════════════════════════════════════════════';
  
exception
  when others then
    raise exception '❌ Migration failed: %', SQLERRM;
end $$;

-- ═════════════════════════════════════════════════════════════
-- Validation Queries
-- ═════════════════════════════════════════════════════════════
-- Run these queries manually to verify the migration

-- Check migration completeness
select 
  (select count(*) from families) as families_count,
  (select count(*) from households where migrated_from_family_id is not null) as migrated_households,
  (select count(*) from family_members) as family_members_count,
  (select count(*) from members where migrated_from_family_member_id is not null) as migrated_members;

-- List migrated households
select 
  h.id,
  h.name,
  h.slug,
  h.created_at,
  (select count(*) from members where household_id = h.id) as member_count,
  h.migrated_from_family_id
from households h
where h.migrated_from_family_id is not null
order by h.created_at;

-- Check for unmigrated families
select 
  f.id,
  f.name,
  f.created_at,
  (select count(*) from family_members where family_id = f.id) as member_count
from families f
where f.id not in (
  select migrated_from_family_id 
  from households 
  where migrated_from_family_id is not null
);

-- Check for unmigrated family members
select 
  fm.id,
  fm.family_id,
  fm.user_id,
  fm.role,
  (select name from families where id = fm.family_id) as family_name
from family_members fm
where fm.id not in (
  select migrated_from_family_member_id
  from members
  where migrated_from_family_member_id is not null
);
