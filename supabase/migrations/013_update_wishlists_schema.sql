-- ════════════════════════════════════════════════════════════
-- Migration 013: Update Wishlists Schema
-- ════════════════════════════════════════════════════════════
-- Adds household context and member ownership to wishlists.
-- 
-- This migration:
-- 1. Adds member_id, household_id, and visibility columns
-- 2. Migrates existing wishlists to new structure
-- 3. Updates RLS policies for visibility control
-- 4. Enhances wishlist_items with reservation tracking
-- ════════════════════════════════════════════════════════════

-- ─── 1. Add New Columns to wishlists ─────────────────────────

alter table wishlists
  add column if not exists member_id uuid references members on delete cascade,
  add column if not exists household_id uuid references households on delete cascade,
  add column if not exists visibility text 
    check (visibility in ('private', 'household', 'public')),
  add column if not exists updated_at timestamptz default now();

comment on column wishlists.member_id is 'Owner member (can be soft member without account)';
comment on column wishlists.household_id is 'Household context for the wishlist';
comment on column wishlists.visibility is 'private (owner+admins), household (all members), public (share link)';

-- ─── 2. Add New Columns to wishlist_items ────────────────────

alter table wishlist_items
  add column if not exists reserved_by_name text,
  add column if not exists reserved_at timestamptz;

comment on column wishlist_items.reserved_by_name is 'Name of person reserving (for public reservations)';
comment on column wishlist_items.reserved_at is 'Timestamp when item was reserved';

-- ─── 3. Migrate Existing Data ────────────────────────────────

do $$
declare
  v_wishlist record;
  v_user_household_id uuid;
  v_member_id uuid;
  v_wishlists_migrated integer := 0;
  v_personal_households_created integer := 0;
begin
  raise notice 'Starting wishlists schema migration...';
  
  -- Migrate visibility from is_public boolean to visibility enum
  raise notice 'Migrating visibility settings...';
  
  update wishlists
  set visibility = case
    when is_public then 'public'
    else 'private'
  end
  where visibility is null;
  
  raise notice '  → Updated visibility for existing wishlists';
  
  -- Process each wishlist that needs household assignment
  raise notice 'Assigning wishlists to households and members...';
  
  for v_wishlist in 
    select distinct w.user_id, count(*) as wishlist_count
    from wishlists w
    where w.member_id is null or w.household_id is null
    group by w.user_id
  loop
    raise notice '  Processing user % (% wishlists)', v_wishlist.user_id, v_wishlist.wishlist_count;
    
    -- Check if user has any household membership
    select m.household_id, m.id into v_user_household_id, v_member_id
    from members m
    where m.user_id = v_wishlist.user_id
      and m.is_active = true
    order by m.joined_at asc
    limit 1;
    
    -- If no household exists, create a personal one
    if v_user_household_id is null then
      raise notice '    → Creating personal household for user';
      
      -- Create household
      insert into households (name, created_by, slug, settings)
      values (
        'Personal',
        v_wishlist.user_id,
        generate_household_slug('personal-' || v_wishlist.user_id::text),
        jsonb_build_object('type', 'personal', 'created_for', 'wishlist_migration')
      )
      returning id into v_user_household_id;
      
      -- Create owner member
      declare
        v_display_name text;
      begin
        -- Get display name from user_profiles, use default if not found
        select display_name into v_display_name
        from user_profiles
        where id = v_wishlist.user_id;
        
        insert into members (household_id, user_id, role, display_name)
        values (
          v_user_household_id,
          v_wishlist.user_id,
          'owner',
          coalesce(v_display_name, 'Me')
        )
        returning id into v_member_id;
      end;
      
      v_personal_households_created := v_personal_households_created + 1;
    end if;
    
    -- Update wishlists for this user
    declare
      v_updated_count integer;
    begin
      with updates as (
        update wishlists
        set household_id = v_user_household_id,
            member_id = v_member_id,
            updated_at = now()
        where user_id = v_wishlist.user_id
          and (household_id is null or member_id is null)
        returning id
      )
      select count(*) into v_updated_count from updates;
      
      -- Accumulate counter across iterations
      v_wishlists_migrated := coalesce(v_wishlists_migrated, 0) + v_updated_count;
    end;
    
  end loop;
  
  raise notice '';
  raise notice 'Migration Summary:';
  raise notice '  Wishlists migrated: %', v_wishlists_migrated;
  raise notice '  Personal households created: %', v_personal_households_created;
  
  -- Verification
  declare
    v_unmigrated_wishlists integer;
  begin
    select count(*) into v_unmigrated_wishlists
    from wishlists
    where household_id is null or member_id is null;
    
    if v_unmigrated_wishlists > 0 then
      raise warning '⚠️  % wishlists not migrated', v_unmigrated_wishlists;
    else
      raise notice '✅ All wishlists successfully migrated!';
    end if;
  end;
  
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

-- Update updated_at on wishlists
create trigger update_wishlists_updated_at
  before update on wishlists
  for each row
  execute function update_updated_at_column();

-- Log wishlist activity
create or replace function log_wishlist_activity()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    perform log_activity(
      new.household_id,
      new.member_id,
      'created',
      'wishlist',
      new.id,
      jsonb_build_object('title', new.title, 'visibility', new.visibility)
    );
  elsif (TG_OP = 'UPDATE' and old.visibility IS DISTINCT FROM new.visibility) then
    perform log_activity(
      new.household_id,
      new.member_id,
      'visibility_changed',
      'wishlist',
      new.id,
      jsonb_build_object('title', new.title, 'from', old.visibility, 'to', new.visibility)
    );
  end if;
  return new;
end;
$$;

create trigger wishlist_activity_log
  after insert or update on wishlists
  for each row
  execute function log_wishlist_activity();

-- Log wishlist item activity (reservation tracking)
create or replace function log_wishlist_item_activity()
returns trigger
language plpgsql
security definer
as $$
declare
  v_wishlist record;
begin
  -- Get wishlist details
  select household_id, member_id into v_wishlist
  from wishlists
  where id = new.wishlist_id;
  
  if (TG_OP = 'INSERT') then
    perform log_activity(
      v_wishlist.household_id,
      v_wishlist.member_id,
      'added',
      'wishlist_item',
      new.id,
      jsonb_build_object('title', new.title, 'priority', new.priority)
    );
  elsif (TG_OP = 'UPDATE' and not old.is_reserved and new.is_reserved) then
    -- Item was reserved
    perform log_activity(
      v_wishlist.household_id,
      null,  -- External reservation, no member_id
      'reserved',
      'wishlist_item',
      new.id,
      jsonb_build_object(
        'title', new.title,
        'reserved_by', coalesce(new.reserved_by_name, new.reserved_by_email, 'anonymous')
      )
    );
  elsif (TG_OP = 'UPDATE' and old.is_reserved and not new.is_reserved) then
    -- Item was unreserved
    perform log_activity(
      v_wishlist.household_id,
      null,
      'unreserved',
      'wishlist_item',
      new.id,
      jsonb_build_object('title', new.title)
    );
  end if;
  return new;
end;
$$;

create trigger wishlist_item_activity_log
  after insert or update on wishlist_items
  for each row
  execute function log_wishlist_item_activity();

-- ─── 5. Update RLS Policies ──────────────────────────────────

-- Drop old wishlist policies
drop policy if exists "wishlists_select" on wishlists;
drop policy if exists "wishlists_insert" on wishlists;
drop policy if exists "wishlists_update" on wishlists;
drop policy if exists "wishlists_delete" on wishlists;

-- Create new visibility-aware policies

-- Select: Based on visibility level
create policy "wishlists_select_v2"
  on wishlists for select
  using (
    -- Own wishlists
    member_id in (
      select id from members where user_id = auth.uid() and is_active = true
    )
    -- Household wishlists (if household visibility)
    or (
      visibility = 'household'
      and household_id in (
        select household_id from members
        where user_id = auth.uid()
          and is_active = true
      )
    )
    -- Public wishlists (anyone with link)
    or visibility = 'public'
    -- Admins can see all household wishlists
    or household_id in (
      select household_id from members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- Insert: Must belong to a household where user is a member
create policy "wishlists_insert_v2"
  on wishlists for insert
  with check (
    member_id in (
      select id from members 
      where user_id = auth.uid() 
        and is_active = true
        and role in ('owner', 'admin', 'member', 'child')  -- Even children can create wishlists
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
      select id from members where user_id = auth.uid() and is_active = true
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
      select id from members where user_id = auth.uid() and is_active = true
    )
    or household_id in (
      select household_id from members
      where user_id = auth.uid()
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- Drop old wishlist_items policies
drop policy if exists "wishlist_items_select" on wishlist_items;
drop policy if exists "wishlist_items_insert" on wishlist_items;
drop policy if exists "wishlist_items_update_owner" on wishlist_items;
drop policy if exists "wishlist_items_delete" on wishlist_items;

-- Create new wishlist_items policies

-- Select: Based on parent wishlist visibility
create policy "wishlist_items_select_v2"
  on wishlist_items for select
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and (
          -- Own wishlist
          w.member_id in (
            select id from members where user_id = auth.uid() and is_active = true
          )
          -- Household visibility
          or (
            w.visibility = 'household'
            and w.household_id in (
              select household_id from members
              where user_id = auth.uid() and is_active = true
            )
          )
          -- Public visibility
          or w.visibility = 'public'
          -- Admins can see all
          or w.household_id in (
            select household_id from members
            where user_id = auth.uid()
              and role in ('owner', 'admin')
              and is_active = true
          )
        )
    )
  );

-- Insert: Only wishlist owner
create policy "wishlist_items_insert_v2"
  on wishlist_items for insert
  with check (
    exists (
      select 1 from wishlists w
      join members m on m.id = w.member_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

-- Update: Owner full control, others can reserve
create policy "wishlist_items_update_v2"
  on wishlist_items for update
  using (
    -- Wishlist owner can update anything
    exists (
      select 1 from wishlists w
      join members m on m.id = w.member_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
    -- Note: Public reservation handled via security-definer function
  );

-- Delete: Only wishlist owner
create policy "wishlist_items_delete_v2"
  on wishlist_items for delete
  using (
    exists (
      select 1 from wishlists w
      join members m on m.id = w.member_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

-- ─── 6. Update Public Reservation Function ───────────────────

-- Drop old function
drop function if exists reserve_wishlist_item(uuid, boolean, text);

-- Create enhanced reservation function
create or replace function reserve_wishlist_item(
  p_item_id uuid,
  p_reserved boolean,
  p_email text default null,
  p_name text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Input validation
  if p_email is not null then
    -- Basic email format validation
    if not (p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') then
      raise exception 'Invalid email format';
    end if;
    
    -- Limit email length to prevent abuse
    if char_length(p_email) > 255 then
      raise exception 'Email too long (max 255 characters)';
    end if;
  end if;
  
  if p_name is not null then
    -- Sanitize name - remove potentially harmful characters
    if p_name ~ '[<>"\\/]' then
      raise exception 'Name contains invalid characters';
    end if;
    
    -- Limit name length
    if char_length(p_name) > 100 then
      raise exception 'Name too long (max 100 characters)';
    end if;
  end if;

  -- Verify the item belongs to a public wishlist
  if not exists (
    select 1
    from wishlist_items wi
    join wishlists w on w.id = wi.wishlist_id
    where wi.id = p_item_id
      and w.visibility = 'public'
  ) then
    raise exception 'Item not found or wishlist is not public';
  end if;

  -- Update reservation fields
  update wishlist_items
  set is_reserved = p_reserved,
      reserved_by_email = p_email,
      reserved_by_name = p_name,
      reserved_at = case when p_reserved then now() else null end
  where id = p_item_id;
end;
$$;

comment on function reserve_wishlist_item(uuid, boolean, text, text) is 
  'Allow public reservation of wishlist items (anonymous or with email/name)';

-- ─── 7. Indexes ──────────────────────────────────────────────

create index if not exists idx_wishlists_member_id on wishlists(member_id);
create index if not exists idx_wishlists_household_id on wishlists(household_id);
create index if not exists idx_wishlists_visibility on wishlists(visibility);
create index if not exists idx_wishlist_items_reserved on wishlist_items(is_reserved) where is_reserved = true;
create index if not exists idx_wishlist_items_reserved_at on wishlist_items(reserved_at desc) 
  where reserved_at is not null;
