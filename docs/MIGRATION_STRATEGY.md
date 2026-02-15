# Migration Strategy - From Families to Households

## 1. Overview

This document provides a complete, production-safe migration strategy from the current `families`-based schema to the new multi-tenant `households` architecture.

### Migration Goals

- ✅ **Zero downtime**: Application remains available during migration
- ✅ **Zero data loss**: All existing data preserved and migrated
- ✅ **Backward compatible**: Old code continues working during transition
- ✅ **Rollback ready**: Can revert if issues discovered
- ✅ **Gradual cutover**: Incremental migration of features

---

## 2. Current Schema Analysis

### 2.1 Current Tables

```
families
├── id (PK)
├── name
├── created_by (FK → auth.users)
└── created_at

family_members
├── id (PK)
├── family_id (FK → families)
├── user_id (FK → auth.users)  ← ALWAYS required
├── role ('owner' | 'member')
└── joined_at

shopping_lists
├── id (PK)
├── family_id (FK → families)
├── title
├── created_by (FK → auth.users)  ← Direct user reference
└── ...

shopping_items
├── id (PK)
├── list_id (FK → shopping_lists)
├── added_by (FK → auth.users)  ← Direct user reference
├── purchased_by (FK → auth.users)  ← Direct user reference
└── ...

wishlists
├── id (PK)
├── user_id (FK → auth.users)  ← No family context
├── title
└── ...
```

### 2.2 Migration Challenges

| Challenge                               | Impact                              | Solution                                      |
| --------------------------------------- | ----------------------------------- | --------------------------------------------- |
| `family_members` requires `user_id`     | Can't add children without accounts | New `members` table with nullable `user_id`   |
| Shopping items reference users directly | Need to map to members              | Migration script with user→member mapping     |
| Wishlists have no family context        | Can't determine household           | Infer from user's families or prompt user     |
| No invitation system                    | Can't track pending invites         | New `invitations` table                       |
| Simple owner/member roles               | Need more granularity               | Map owner→owner, member→member, add new roles |

---

## 3. Migration Strategy: Parallel Table Approach

### 3.1 Overview

We'll create new tables alongside old ones, gradually migrate data, then deprecate old tables.

```
Phase 1: Create New Tables (Parallel)
┌──────────┐     ┌────────────┐
│ families │     │ households │ (new)
└──────────┘     └────────────┘

Phase 2: Dual Write (Both Tables)
┌──────────┐ ──▶ ┌────────────┐
│ families │     │ households │
└──────────┘     └────────────┘

Phase 3: Read from New, Write to Both
┌──────────┐     ┌────────────┐ ◀── READ
│ families │ ◀─▶ │ households │
└──────────┘     └────────────┘

Phase 4: Full Cutover
                 ┌────────────┐
                 │ households │
                 └────────────┘
┌──────────┐
│ families │ (deprecated)
└──────────┘

Phase 5: Cleanup
                 ┌────────────┐
                 │ households │
                 └────────────┘
```

---

## 4. Migration Scripts

### 4.1 Migration 010: Create New Tables

File: `supabase/migrations/010_create_households_schema.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 010: Create New Multi-Tenant Schema
-- ════════════════════════════════════════════════════════════
-- This migration creates new tables alongside existing ones.
-- Old tables (families, family_members) remain functional.
-- ════════════════════════════════════════════════════════════

-- ─── 1. Households Table ─────────────────────────────────────

create table if not exists households (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  slug             text not null unique,
  created_by       uuid not null references auth.users on delete restrict,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  is_active        boolean not null default true,
  settings         jsonb not null default '{}'::jsonb,

  -- Migration tracking
  migrated_from_family_id uuid,  -- Links to old families table

  constraint households_name_length check (char_length(name) between 1 and 100),
  constraint households_slug_format check (slug ~ '^[a-z0-9-]+$')
);

comment on table households is 'Multi-tenant household (replaces families)';
comment on column households.migrated_from_family_id is 'Tracks migration from families table';

-- ─── 2. Members Table ────────────────────────────────────────

create table if not exists members (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  user_id          uuid references auth.users on delete set null,  -- Nullable!
  role             text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'child', 'viewer')),
  display_name     text not null,
  date_of_birth    date,
  avatar_url       text,
  is_active        boolean not null default true,
  joined_at        timestamptz not null default now(),
  invited_by       uuid references members(id) on delete set null,
  metadata         jsonb not null default '{}'::jsonb,

  -- Migration tracking
  migrated_from_family_member_id uuid,  -- Links to old family_members table

  constraint members_name_length check (char_length(display_name) between 1 and 100),
  constraint members_unique_user_per_household unique (household_id, user_id),
  constraint members_child_dob check (role != 'child' or date_of_birth is not null)
);

comment on table members is 'Household members with optional user accounts';
comment on column members.user_id is 'NULL for soft members (children without accounts)';

-- ─── 3. Invitations Table ────────────────────────────────────

create table if not exists invitations (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  email            text not null,
  role             text not null default 'member'
    check (role in ('admin', 'member', 'viewer')),
  invited_by       uuid not null references members(id) on delete cascade,
  status           text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'expired')),
  token            text not null unique,
  expires_at       timestamptz not null,
  created_at       timestamptz not null default now(),
  accepted_at      timestamptz,

  constraint invitations_email_format
    check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  constraint invitations_unique_pending
    unique (household_id, email, status)
    where status = 'pending'
);

-- ─── 4. Activity Logs Table ──────────────────────────────────

create table if not exists activity_logs (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  member_id        uuid references members(id) on delete set null,
  action           text not null,
  entity_type      text not null,
  entity_id        uuid,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),

  constraint activity_logs_action_length check (char_length(action) between 1 and 100)
);

-- ─── 5. Indexes ──────────────────────────────────────────────

-- Households
create index idx_households_created_by on households(created_by);
create index idx_households_slug on households(slug);
create index idx_households_is_active on households(is_active) where is_active = true;
create index idx_households_migrated_from on households(migrated_from_family_id)
  where migrated_from_family_id is not null;

-- Members
create index idx_members_household_id on members(household_id);
create index idx_members_user_id on members(user_id) where user_id is not null;
create index idx_members_role on members(role);
create index idx_members_is_active on members(is_active) where is_active = true;
create unique index idx_members_household_owner
  on members(household_id)
  where role = 'owner' and is_active = true;
create index idx_members_migrated_from on members(migrated_from_family_member_id)
  where migrated_from_family_member_id is not null;

-- Invitations
create index idx_invitations_household_id on invitations(household_id);
create index idx_invitations_email on invitations(email);
create index idx_invitations_status on invitations(status) where status = 'pending';
create index idx_invitations_token on invitations(token);
create index idx_invitations_expires_at on invitations(expires_at) where status = 'pending';

-- Activity Logs
create index idx_activity_logs_household_id on activity_logs(household_id);
create index idx_activity_logs_member_id on activity_logs(member_id) where member_id is not null;
create index idx_activity_logs_created_at on activity_logs(created_at desc);
create index idx_activity_logs_entity on activity_logs(entity_type, entity_id);

-- ─── 6. Helper Functions ─────────────────────────────────────

-- Generate household slug
create or replace function generate_household_slug(p_name text)
returns text
language plpgsql
as $$
declare
  v_slug text;
  v_counter integer := 0;
  v_exists boolean;
begin
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  if v_slug = '' then
    v_slug := 'household';
  end if;

  loop
    select exists(select 1 from households where slug = v_slug) into v_exists;
    if not v_exists then
      return v_slug;
    end if;
    v_counter := v_counter + 1;
    v_slug := v_slug || '-' || v_counter;
  end loop;
end;
$$;

-- Auto-generate slug on insert
create or replace function auto_generate_household_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := generate_household_slug(new.name);
  end if;
  return new;
end;
$$;

create trigger household_slug_generation
  before insert on households
  for each row
  execute function auto_generate_household_slug();

-- Update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_households_updated_at
  before update on households
  for each row
  execute function update_updated_at_column();

-- ─── 7. RLS Policies ─────────────────────────────────────────

alter table households enable row level security;
alter table members enable row level security;
alter table invitations enable row level security;
alter table activity_logs enable row level security;

-- Households: Visible to members
create policy "households_select"
  on households for select
  using (
    id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );

-- Households: Any authenticated user can create
create policy "households_insert"
  on households for insert
  with check (created_by = auth.uid());

-- Households: Only owner can update
create policy "households_update"
  on households for update
  using (
    exists (
      select 1 from members
      where household_id = households.id
        and user_id = auth.uid()
        and role = 'owner'
        and is_active = true
    )
  );

-- Households: Only owner can delete
create policy "households_delete"
  on households for delete
  using (
    exists (
      select 1 from members
      where household_id = households.id
        and user_id = auth.uid()
        and role = 'owner'
        and is_active = true
    )
  );

-- Members: Visible to household members
create policy "members_select"
  on members for select
  using (
    user_id = auth.uid()
    or household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );

-- Members: Owner/admin can add members
create policy "members_insert"
  on members for insert
  with check (
    exists (
      select 1 from members
      where household_id = members.household_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
    or (
      -- Allow self-insert when creating household
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1 from households
        where id = household_id
          and created_by = auth.uid()
      )
    )
  );

-- Members: Owner/admin can update, users can update own profile
create policy "members_update"
  on members for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from members m
      where m.household_id = members.household_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.is_active = true
    )
  );

-- Members: Owner/admin can delete, users can remove self
create policy "members_delete"
  on members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from members m
      where m.household_id = members.household_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.is_active = true
    )
  );

-- Invitations: Owner/admin can view
create policy "invitations_select"
  on invitations for select
  using (
    exists (
      select 1 from members
      where household_id = invitations.household_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- Invitations: Owner/admin can create
create policy "invitations_insert"
  on invitations for insert
  with check (
    exists (
      select 1 from members
      where household_id = invitations.household_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- Invitations: Owner/admin can update
create policy "invitations_update"
  on invitations for update
  using (
    exists (
      select 1 from members
      where household_id = invitations.household_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- Activity logs: Household members can view
create policy "activity_logs_select"
  on activity_logs for select
  using (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );

-- Activity logs: System can insert (security definer functions)
create policy "activity_logs_insert"
  on activity_logs for insert
  with check (true);  -- Restricted via security definer functions
```

---

### 4.2 Migration 011: Data Migration Script

File: `supabase/migrations/011_migrate_families_to_households.sql`

```sql
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
begin
  raise notice 'Starting migration from families to households...';

  -- ─── Step 1: Migrate Families → Households ────────────────

  for v_family in select * from families where id not in (
    select migrated_from_family_id from households
    where migrated_from_family_id is not null
  )
  loop
    raise notice 'Migrating family: % (ID: %)', v_family.name, v_family.id;

    insert into households (
      id,  -- Reuse same ID for easier migration
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

    -- ─── Step 2: Migrate Family Members → Members ─────────

    for v_family_member in select * from family_members
      where family_id = v_family.id
        and id not in (
          select migrated_from_family_member_id from members
          where migrated_from_family_member_id is not null
        )
    loop
      -- Get user profile for display name
      select * into v_user_profile from user_profiles
      where id = v_family_member.user_id;

      insert into members (
        id,  -- Reuse same ID
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

    end loop;

  end loop;

  raise notice 'Migration completed successfully!';

exception
  when others then
    raise exception 'Migration failed: %', SQLERRM;
    rollback;
end $$;

-- ─── Verification Queries ────────────────────────────────────

-- Check migration completeness
do $$
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

  raise notice 'Migration Summary:';
  raise notice '  Families: % → Households: %', v_families_count, v_households_count;
  raise notice '  Family Members: % → Members: %', v_family_members_count, v_members_count;

  if v_families_count != v_households_count then
    raise warning 'Not all families migrated! Please investigate.';
  end if;

  if v_family_members_count != v_members_count then
    raise warning 'Not all family members migrated! Please investigate.';
  end if;
end $$;
```

---

### 4.3 Migration 012: Update Shopping Lists Schema

File: `supabase/migrations/012_update_shopping_schema.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 012: Update Shopping Schema
-- ════════════════════════════════════════════════════════════
-- Updates shopping_lists and shopping_items to reference
-- households and members instead of families and users.
-- ════════════════════════════════════════════════════════════

-- ─── 1. Add New Columns ──────────────────────────────────────

-- Add household_id to shopping_lists (nullable during migration)
alter table shopping_lists
  add column if not exists household_id uuid references households on delete cascade;

-- Add member_id columns to shopping_items (nullable during migration)
alter table shopping_items
  add column if not exists added_by_member_id uuid references members on delete cascade,
  add column if not exists purchased_by_member_id uuid references members on delete set null;

-- ─── 2. Populate New Columns ─────────────────────────────────

-- Map shopping_lists.family_id → household_id
update shopping_lists sl
set household_id = h.id
from households h
where h.migrated_from_family_id = sl.family_id
  and sl.household_id is null;

-- Map shopping_items.added_by → added_by_member_id
update shopping_items si
set added_by_member_id = m.id
from members m
where m.user_id = si.added_by
  and m.migrated_from_family_member_id is not null
  and si.added_by_member_id is null;

-- Map shopping_items.purchased_by → purchased_by_member_id
update shopping_items si
set purchased_by_member_id = m.id
from members m
where m.user_id = si.purchased_by
  and m.migrated_from_family_member_id is not null
  and si.purchased_by_member_id is null
  and si.purchased_by is not null;

-- ─── 3. Verify Migration ─────────────────────────────────────

do $$
declare
  v_unmigrated_lists integer;
  v_unmigrated_items integer;
begin
  select count(*) into v_unmigrated_lists
  from shopping_lists
  where household_id is null;

  select count(*) into v_unmigrated_items
  from shopping_items
  where added_by_member_id is null;

  if v_unmigrated_lists > 0 then
    raise warning '% shopping lists not migrated to households', v_unmigrated_lists;
  end if;

  if v_unmigrated_items > 0 then
    raise warning '% shopping items not migrated to members', v_unmigrated_items;
  end if;

  raise notice 'Shopping schema migration completed';
end $$;

-- ─── 4. Add Constraints (After Verification) ─────────────────
-- Note: Run this in a separate migration after verifying data

-- alter table shopping_lists alter column household_id set not null;
-- alter table shopping_items alter column added_by_member_id set not null;

-- ─── 5. Update RLS Policies ──────────────────────────────────

-- Drop old policies
drop policy if exists "shopping_lists_select" on shopping_lists;
drop policy if exists "shopping_lists_insert" on shopping_lists;
drop policy if exists "shopping_lists_update" on shopping_lists;
drop policy if exists "shopping_lists_delete" on shopping_lists;

-- Create new household-aware policies
create policy "shopping_lists_select_v2"
  on shopping_lists for select
  using (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
    or family_id in (  -- Backward compatibility
      select f.id from families f
      join family_members fm on fm.family_id = f.id
      where fm.user_id = auth.uid()
    )
  );

create policy "shopping_lists_insert_v2"
  on shopping_lists for insert
  with check (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );

create policy "shopping_lists_update_v2"
  on shopping_lists for update
  using (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );

create policy "shopping_lists_delete_v2"
  on shopping_lists for delete
  using (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
        and role in ('owner', 'admin')
    )
    or (
      household_id in (
        select m.household_id from members m
        where m.user_id = auth.uid()
          and m.is_active = true
      )
      and exists (
        select 1 from members m
        join shopping_lists sl on sl.household_id = m.household_id
        where m.user_id = auth.uid()
          and m.id = sl.created_by  -- Can delete own lists
      )
    )
  );

-- Similar updates for shopping_items policies...
```

---

### 4.4 Migration 013: Update Wishlists Schema

File: `supabase/migrations/013_update_wishlists_schema.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Migration 013: Update Wishlists Schema
-- ════════════════════════════════════════════════════════════
-- Adds household context and member ownership to wishlists.
-- ════════════════════════════════════════════════════════════

-- ─── 1. Add New Columns ──────────────────────────────────────

alter table wishlists
  add column if not exists member_id uuid references members on delete cascade,
  add column if not exists household_id uuid references households on delete cascade,
  add column if not exists visibility text
    check (visibility in ('private', 'household', 'public'));

-- Migrate existing wishlists to 'public' if is_public=true, else 'private'
update wishlists
set visibility = case
  when is_public then 'public'
  else 'private'
end
where visibility is null;

-- ─── 2. Infer Household Context ──────────────────────────────

-- Option 1: Assign to user's primary household (first household they joined)
update wishlists w
set household_id = (
  select m.household_id
  from members m
  where m.user_id = w.user_id
    and m.is_active = true
  order by m.joined_at asc
  limit 1
)
where w.household_id is null;

-- Option 2: Create member records for wishlists owners
-- This handles users who have wishlists but no household yet
do $$
declare
  v_wishlist record;
  v_user_household_id uuid;
  v_member_id uuid;
begin
  for v_wishlist in select distinct user_id from wishlists
    where member_id is null
  loop
    -- Check if user has any household
    select m.household_id into v_user_household_id
    from members m
    where m.user_id = v_wishlist.user_id
      and m.is_active = true
    limit 1;

    -- If no household, create a personal one
    if v_user_household_id is null then
      insert into households (name, created_by, slug)
      values ('Personal', v_wishlist.user_id, generate_household_slug('personal-' || v_wishlist.user_id::text))
      returning id into v_user_household_id;

      insert into members (household_id, user_id, role, display_name)
      values (v_user_household_id, v_wishlist.user_id, 'owner', 'Me')
      returning id into v_member_id;
    else
      select id into v_member_id
      from members
      where household_id = v_user_household_id
        and user_id = v_wishlist.user_id
      limit 1;
    end if;

    -- Update wishlists
    update wishlists
    set household_id = v_user_household_id,
        member_id = v_member_id
    where user_id = v_wishlist.user_id
      and household_id is null;

  end loop;
end $$;

-- ─── 3. Update RLS Policies ──────────────────────────────────

drop policy if exists "wishlists_select" on wishlists;
drop policy if exists "wishlists_insert" on wishlists;
drop policy if exists "wishlists_update" on wishlists;
drop policy if exists "wishlists_delete" on wishlists;

-- Select: Owner, household members (if household visibility), or public
create policy "wishlists_select_v2"
  on wishlists for select
  using (
    member_id in (
      select id from members where user_id = auth.uid()
    )
    or (
      visibility = 'household'
      and household_id in (
        select household_id from members
        where user_id = auth.uid()
          and is_active = true
      )
    )
    or (
      visibility = 'public'
    )
    or (
      -- Admins can see all household wishlists
      household_id in (
        select household_id from members
        where user_id = auth.uid()
          and role in ('owner', 'admin')
          and is_active = true
      )
    )
  );

-- Insert: Must belong to a household where user is a member
create policy "wishlists_insert_v2"
  on wishlists for insert
  with check (
    member_id in (
      select id from members where user_id = auth.uid()
    )
    and household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
    )
  );

-- Update: Owner can update own, admins can update household wishlists
create policy "wishlists_update_v2"
  on wishlists for update
  using (
    member_id in (
      select id from members where user_id = auth.uid()
    )
    or household_id in (
      select household_id from members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- Delete: Owner can delete own, admins can delete household wishlists
create policy "wishlists_delete_v2"
  on wishlists for delete
  using (
    member_id in (
      select id from members where user_id = auth.uid()
    )
    or household_id in (
      select household_id from members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
  );
```

---

## 5. Rollback Strategy

### 5.1 Rollback Migration Script

File: `supabase/migrations/099_rollback_to_families.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- Rollback Migration: Revert to Families Schema
-- ════════════════════════════════════════════════════════════
-- ⚠️ WARNING: This drops all new tables and data added after
-- migration. Only use if something went seriously wrong.
-- ════════════════════════════════════════════════════════════

do $$
begin
  raise notice 'Starting rollback to families schema...';

  -- Drop new tables (in reverse order of creation)
  drop table if exists activity_logs cascade;
  drop table if exists invitations cascade;
  drop table if exists members cascade;
  drop table if exists households cascade;

  -- Restore old columns if they were modified
  -- (This assumes you haven't dropped old columns yet)

  -- Re-enable old RLS policies
  -- (This assumes you kept old policies with different names)

  raise notice 'Rollback completed. Application should work with old schema.';

exception
  when others then
    raise exception 'Rollback failed: %', SQLERRM;
    rollback;
end $$;
```

### 5.2 Rollback Checklist

Before rolling back:

- [ ] Verify no data was added to new tables that needs preserving
- [ ] Ensure old tables (`families`, `family_members`) still exist
- [ ] Check that old RLS policies are still in place
- [ ] Backup database before rollback
- [ ] Notify users of potential data loss

---

## 6. Deployment Steps

### 6.1 Pre-Deployment Checklist

- [ ] Backup entire database
- [ ] Test migrations on staging environment
- [ ] Verify all data migrates correctly
- [ ] Check RLS policies work as expected
- [ ] Test rollback procedure
- [ ] Prepare monitoring and alerts

### 6.2 Deployment Procedure

**Step 1: Create New Tables (Low Risk)**

```bash
# Run migration 010
psql -h db.supabase.co -U postgres -d postgres -f supabase/migrations/010_create_households_schema.sql
```

**Step 2: Migrate Data (Medium Risk)**

```bash
# Run migration 011 (idempotent)
psql -h db.supabase.co -U postgres -d postgres -f supabase/migrations/011_migrate_families_to_households.sql

# Verify migration
psql -h db.supabase.co -U postgres -d postgres -c "
  select
    (select count(*) from families) as families,
    (select count(*) from households where migrated_from_family_id is not null) as migrated_households,
    (select count(*) from family_members) as family_members,
    (select count(*) from members where migrated_from_family_member_id is not null) as migrated_members;
"
```

**Step 3: Update Shopping Schema (Medium Risk)**

```bash
# Run migration 012
psql -h db.supabase.co -U postgres -d postgres -f supabase/migrations/012_update_shopping_schema.sql
```

**Step 4: Update Wishlists Schema (Medium Risk)**

```bash
# Run migration 013
psql -h db.supabase.co -U postgres -d postgres -f supabase/migrations/013_update_wishlists_schema.sql
```

**Step 5: Deploy Application Updates**

```bash
# Deploy new Vue.js application with household support
npm run build
# Deploy to Vercel/hosting
```

**Step 6: Monitor & Verify**

- Watch error logs for RLS policy violations
- Check user reports
- Monitor database performance
- Verify household switcher works

### 6.3 Post-Deployment

**After 30 Days of Stability:**

- [ ] Make new columns NOT NULL
- [ ] Drop migration tracking columns
- [ ] Drop old tables (`families`, `family_members`)
- [ ] Clean up old RLS policies
- [ ] Update documentation

---

## 7. Testing Strategy

### 7.1 Unit Tests

Test migration functions in isolation:

```sql
-- Test slug generation
select generate_household_slug('The Smiths');  -- Expected: the-smiths
select generate_household_slug('The Smiths');  -- Expected: the-smiths-1

-- Test household creation
insert into households (name, created_by)
values ('Test Family', 'user-uuid');
```

### 7.2 Integration Tests

Test full migration workflow:

```typescript
describe('Family to Household Migration', () => {
  it('migrates families to households', async () => {
    // Setup: Create a family with members
    const family = await createFamily('Test Family');
    await addFamilyMember(family.id, userId, 'owner');

    // Run migration
    await runMigration('011_migrate_families_to_households.sql');

    // Verify: Household exists
    const household = await supabase
      .from('households')
      .select('*')
      .eq('migrated_from_family_id', family.id)
      .single();

    expect(household.data).toBeTruthy();
    expect(household.data.name).toBe('Test Family');
  });
});
```

### 7.3 User Acceptance Testing

- [ ] Create new household works
- [ ] Existing families appear as households
- [ ] Shopping lists still accessible
- [ ] Wishlists maintain privacy settings
- [ ] Members can be invited
- [ ] Soft members (children) can be added
- [ ] Household switcher works
- [ ] Public wishlists still shareable

---

## 8. Communication Plan

### 8.1 User Communication

**Before Migration:**

- Email: "We're upgrading to support multiple households!"
- In-app banner: "New features coming soon"
- Blog post: Feature announcement

**During Migration:**

- Status page: "Maintenance in progress"
- Estimated completion time
- Contact support if issues

**After Migration:**

- Email: "Migration complete! Check out new features"
- In-app tour: Guide to household switcher
- Help docs: Updated screenshots and guides

### 8.2 Stakeholder Communication

- **Product Team**: Feature roadmap updated
- **Support Team**: FAQ and troubleshooting guide
- **Engineering Team**: Migration runbook
- **Management**: Success metrics and KPIs

---

## Summary

This migration strategy provides:

- ✅ **Safe, gradual migration** from families to households
- ✅ **Zero downtime** with parallel table approach
- ✅ **Backward compatibility** during transition
- ✅ **Complete rollback** capability if needed
- ✅ **Comprehensive testing** at each step
- ✅ **Clear communication** to users

The migration can be executed over several deployments, reducing risk and allowing for validation at each step.
