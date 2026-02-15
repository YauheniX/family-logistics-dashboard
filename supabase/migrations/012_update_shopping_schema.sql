-- ════════════════════════════════════════════════════════════
-- Migration 012: Update Shopping Lists Schema
-- ════════════════════════════════════════════════════════════
-- Updates shopping_lists and shopping_items to reference
-- households and members instead of families and users.
-- 
-- This migration:
-- 1. Adds new columns (household_id, member_id)
-- 2. Migrates data from old columns
-- 3. Updates RLS policies for backward compatibility
-- 4. Adds triggers for activity logging
-- ════════════════════════════════════════════════════════════

-- ─── 1. Add New Columns to shopping_lists ────────────────────

-- Add household_id (nullable during migration)
alter table shopping_lists 
  add column if not exists household_id uuid references households on delete cascade;

-- Add updated_at for tracking changes
alter table shopping_lists
  add column if not exists updated_at timestamptz default now();

-- Add created_by_member_id (references members instead of users)
alter table shopping_lists
  add column if not exists created_by_member_id uuid references members on delete cascade;

comment on column shopping_lists.household_id is 'References households table (replaces family_id)';
comment on column shopping_lists.created_by_member_id is 'References members table (replaces created_by user reference)';

-- ─── 2. Add New Columns to shopping_items ────────────────────

alter table shopping_items
  add column if not exists added_by_member_id uuid references members on delete cascade,
  add column if not exists purchased_by_member_id uuid references members on delete set null,
  add column if not exists purchased_at timestamptz;

comment on column shopping_items.added_by_member_id is 'References members table (replaces added_by user reference)';
comment on column shopping_items.purchased_by_member_id is 'References members table (replaces purchased_by user reference)';
comment on column shopping_items.purchased_at is 'Timestamp when item was purchased';

-- ─── 3. Populate New Columns ─────────────────────────────────

do $$
declare
  v_shopping_lists_updated integer := 0;
  v_shopping_items_updated integer := 0;
begin
  raise notice 'Starting shopping schema migration...';
  
  -- Map shopping_lists.family_id → household_id
  raise notice 'Migrating shopping_lists to households...';
  
  with updates as (
    update shopping_lists sl
    set household_id = h.id,
        updated_at = now()
    from households h
    where h.migrated_from_family_id = sl.family_id
      and sl.household_id is null
    returning sl.id
  )
  select count(*) into v_shopping_lists_updated from updates;
  
  raise notice '  → Updated % shopping lists with household_id', v_shopping_lists_updated;
  
  -- Map shopping_lists.created_by → created_by_member_id
  update shopping_lists sl
  set created_by_member_id = m.id
  from members m
  where m.user_id = sl.created_by
    and m.household_id = sl.household_id
    and sl.created_by_member_id is null;
  
  raise notice '  → Updated shopping lists with created_by_member_id';
  
  -- Map shopping_items.added_by → added_by_member_id
  raise notice 'Migrating shopping_items to members...';
  
  with updates as (
    update shopping_items si
    set added_by_member_id = m.id
    from members m
    join shopping_lists sl on sl.id = si.list_id
    where m.user_id = si.added_by
      and m.household_id = sl.household_id
      and si.added_by_member_id is null
    returning si.id
  )
  select count(*) into v_shopping_items_updated from updates;
  
  raise notice '  → Updated % shopping items with added_by_member_id', v_shopping_items_updated;
  
  -- Map shopping_items.purchased_by → purchased_by_member_id
  update shopping_items si
  set purchased_by_member_id = m.id
  from members m
  join shopping_lists sl on sl.id = si.list_id
  where m.user_id = si.purchased_by
    and m.household_id = sl.household_id
    and si.purchased_by is not null
    and si.purchased_by_member_id is null;
  
  raise notice '  → Updated shopping items with purchased_by_member_id';
  
  -- Verification
  raise notice '';
  raise notice 'Verification:';
  
  declare
    v_unmigrated_lists integer;
    v_unmigrated_lists_creator integer;
    v_unmigrated_items_added integer;
    v_unmigrated_items_purchased integer;
  begin
    select count(*) into v_unmigrated_lists 
    from shopping_lists 
    where household_id is null;
    
    select count(*) into v_unmigrated_lists_creator
    from shopping_lists
    where created_by_member_id is null;
    
    select count(*) into v_unmigrated_items_added
    from shopping_items
    where added_by_member_id is null;
    
    select count(*) into v_unmigrated_items_purchased
    from shopping_items
    where purchased_by is not null 
      and purchased_by_member_id is null;
    
    if v_unmigrated_lists > 0 then
      raise warning '⚠️  % shopping lists not migrated to households', v_unmigrated_lists;
    else
      raise notice '✅ All shopping lists migrated to households';
    end if;
    
    if v_unmigrated_lists_creator > 0 then
      raise warning '⚠️  % shopping lists missing created_by_member_id (orphaned or creator left household)', v_unmigrated_lists_creator;
    else
      raise notice '✅ All shopping lists have created_by_member_id';
    end if;
    
    if v_unmigrated_items_added > 0 then
      raise warning '⚠️  % shopping items (added_by) not migrated to members', v_unmigrated_items_added;
    else
      raise notice '✅ All shopping items (added_by) migrated to members';
    end if;
    
    if v_unmigrated_items_purchased > 0 then
      raise warning '⚠️  % shopping items (purchased_by) not migrated to members', v_unmigrated_items_purchased;
    else
      raise notice '✅ All shopping items (purchased_by) migrated to members';
    end if;
  end;
  
  raise notice 'Shopping schema migration completed!';
end $$;

-- ─── 4. Create Triggers ──────────────────────────────────────

-- Ensure update_updated_at_column function exists (from migration 010)
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Update updated_at on shopping_lists
create trigger update_shopping_lists_updated_at
  before update on shopping_lists
  for each row
  execute function update_updated_at_column();

-- Log shopping list activity
create or replace function log_shopping_list_activity()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    -- Only log if migrated fields are populated
    if new.household_id is not null and new.created_by_member_id is not null then
      perform log_activity(
        new.household_id,
        new.created_by_member_id,
        'created',
        'shopping_list',
        new.id,
        jsonb_build_object('title', new.title)
      );
    end if;
  elsif (TG_OP = 'UPDATE' and old.status IS DISTINCT FROM new.status) then
    -- Only log if migrated fields are populated
    if new.household_id is not null then
      perform log_activity(
        new.household_id,
        get_member_id(new.household_id, auth.uid()),
        case when new.status = 'archived' then 'archived' else 'unarchived' end,
        'shopping_list',
        new.id,
        jsonb_build_object('title', new.title, 'status', new.status)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger shopping_list_activity_log
  after insert or update on shopping_lists
  for each row
  when (TG_OP = 'INSERT' or OLD.status IS DISTINCT FROM NEW.status)
  execute function log_shopping_list_activity();

-- Log shopping item activity
create or replace function log_shopping_item_activity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_household_id uuid;
begin
  -- Get household_id from parent list
  select household_id into v_household_id
  from shopping_lists
  where id = new.list_id;
  
  if (TG_OP = 'INSERT') then
    -- Only log if migrated fields are populated
    if v_household_id is not null and new.added_by_member_id is not null then
      perform log_activity(
        v_household_id,
        new.added_by_member_id,
        'added',
        'shopping_item',
        new.id,
        jsonb_build_object('title', new.title, 'quantity', new.quantity)
      );
    end if;
  elsif (TG_OP = 'UPDATE' and not old.is_purchased and new.is_purchased) then
    -- Only log if migrated fields are populated
    if v_household_id is not null and new.purchased_by_member_id is not null then
      perform log_activity(
        v_household_id,
        new.purchased_by_member_id,
        'purchased',
        'shopping_item',
        new.id,
        jsonb_build_object('title', new.title)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger shopping_item_activity_log
  after insert or update on shopping_items
  for each row
  when (TG_OP = 'INSERT' or (not OLD.is_purchased and NEW.is_purchased))
  execute function log_shopping_item_activity();

-- ─── 5. Update RLS Policies ──────────────────────────────────

-- Drop old shopping_lists policies
drop policy if exists "shopping_lists_select" on shopping_lists;
drop policy if exists "shopping_lists_insert" on shopping_lists;
drop policy if exists "shopping_lists_update" on shopping_lists;
drop policy if exists "shopping_lists_delete" on shopping_lists;

-- Create new household-aware policies with backward compatibility

-- Select: Users can see lists from households they belong to (or old families)
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

-- Insert: Members can create lists in their households
create policy "shopping_lists_insert_v2"
  on shopping_lists for insert
  with check (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
        and role in ('owner', 'admin', 'member')  -- Children cannot create lists
    )
  );

-- Update: Members can update lists in their households
create policy "shopping_lists_update_v2"
  on shopping_lists for update
  using (
    household_id in (
      select household_id from members
      where user_id = auth.uid()
        and is_active = true
        and role in ('owner', 'admin', 'member')
    )
  );

-- Delete: Owner/admin can delete any, members can delete own
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
      created_by_member_id in (
        select id from members
        where user_id = auth.uid()
          and is_active = true
      )
    )
  );

-- Drop old shopping_items policies
drop policy if exists "shopping_items_select" on shopping_items;
drop policy if exists "shopping_items_insert" on shopping_items;
drop policy if exists "shopping_items_update" on shopping_items;
drop policy if exists "shopping_items_delete" on shopping_items;

-- Create new shopping_items policies

-- Select: See items from lists in your households
create policy "shopping_items_select_v2"
  on shopping_items for select
  using (
    exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and sl.household_id in (
          select household_id from members
          where user_id = auth.uid()
            and is_active = true
        )
    )
  );

-- Insert: Members and children can add items
create policy "shopping_items_insert_v2"
  on shopping_items for insert
  with check (
    exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = list_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('owner', 'admin', 'member', 'child')  -- Even children can add items
    )
  );

-- Update: Members and children can update items
create policy "shopping_items_update_v2"
  on shopping_items for update
  using (
    exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = list_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('owner', 'admin', 'member', 'child')
    )
  );

-- Delete: Owner/admin can delete any, others can delete own
create policy "shopping_items_delete_v2"
  on shopping_items for delete
  using (
    exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = list_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('owner', 'admin')
    )
    or (
      added_by_member_id in (
        select id from members
        where user_id = auth.uid()
          and is_active = true
      )
    )
  );

-- ─── 6. Indexes ──────────────────────────────────────────────

create index if not exists idx_shopping_lists_household_id on shopping_lists(household_id);
create index if not exists idx_shopping_lists_created_by_member_id on shopping_lists(created_by_member_id);
create index if not exists idx_shopping_items_added_by_member_id on shopping_items(added_by_member_id);
create index if not exists idx_shopping_items_purchased_by_member_id 
  on shopping_items(purchased_by_member_id) where purchased_by_member_id is not null;
create index if not exists idx_shopping_items_purchased_at 
  on shopping_items(purchased_at desc) where purchased_at is not null;
