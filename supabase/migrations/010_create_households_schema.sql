-- ════════════════════════════════════════════════════════════
-- Migration 010: Create New Multi-Tenant Schema
-- ════════════════════════════════════════════════════════════
-- This migration creates new tables alongside existing ones.
-- Old tables (families, family_members) remain functional.
-- ════════════════════════════════════════════════════════════

-- Required for uuid_generate_v4()
create extension if not exists "uuid-ossp";

-- Supabase installs many extension functions under schema "extensions".
-- Ensure migrations can resolve uuid_generate_v4() without schema-qualifying every call.
set search_path = public, extensions;

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
comment on column households.slug is 'URL-friendly unique identifier for the household';
comment on column households.settings is 'Household-specific settings (timezone, currency, etc.)';
comment on column households.migrated_from_family_id is 'Tracks migration from families table';

-- ─── 2. Members Table ────────────────────────────────────────

create table if not exists members (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  user_id          uuid references auth.users on delete set null,  -- Nullable for soft members!
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

comment on table members is 'Household members with optional user accounts (supports soft members)';
comment on column members.user_id is 'NULL for soft members (children without accounts)';
comment on column members.role is 'Role-based permissions: owner > admin > member > child > viewer';
comment on column members.date_of_birth is 'Required for child role (age verification)';
comment on column members.metadata is 'Additional member data (preferences, onboarding state, etc.)';
comment on column members.migrated_from_family_member_id is 'Tracks migration from family_members table';

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
    check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

comment on table invitations is 'Pending invitations to join households';
comment on column invitations.token is 'Secure random token for invitation acceptance';
comment on column invitations.expires_at is 'Invitation expiration timestamp (typically 7 days)';

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

comment on table activity_logs is 'Audit trail and activity feed for household actions';
comment on column activity_logs.action is 'Action performed (e.g., created, updated, deleted, purchased)';
comment on column activity_logs.entity_type is 'Type of entity (e.g., shopping_list, wishlist_item)';
comment on column activity_logs.entity_id is 'ID of the affected entity';
comment on column activity_logs.metadata is 'Additional context about the action';

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

-- Prevent multiple pending invitations for the same household+email.
-- Postgres supports partial unique indexes, but not partial UNIQUE constraints in CREATE TABLE.
create unique index if not exists idx_invitations_unique_pending
  on invitations(household_id, email)
  where status = 'pending';

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
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  
  -- Ensure slug is not empty
  if v_slug = '' then
    v_slug := 'household';
  end if;
  
  -- Check uniqueness and append number if needed
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

comment on function generate_household_slug(text) is 'Generate a unique URL-friendly slug from household name';

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

-- Helper function: Check if user is household member
create or replace function user_is_household_member(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from members
    where household_id = p_household_id
      and user_id = p_user_id
      and is_active = true
  );
$$;

comment on function user_is_household_member(uuid, uuid) is 'Check if a user belongs to a household';

-- Helper function: Get member ID for a user in a household
create or replace function get_member_id(p_household_id uuid, p_user_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select id from members
  where household_id = p_household_id
    and user_id = p_user_id
    and is_active = true
  limit 1;
$$;

comment on function get_member_id(uuid, uuid) is 'Get member record ID for a user in a household';

-- Helper function: Get member role
create or replace function get_member_role(p_household_id uuid, p_user_id uuid)
returns text
language sql
security definer
stable
as $$
  select role from members
  where household_id = p_household_id
    and user_id = p_user_id
    and is_active = true
  limit 1;
$$;

comment on function get_member_role(uuid, uuid) is 'Get member role for a user in a household';

-- Helper function: Check if user has minimum required role
create or replace function has_min_role(
  p_household_id uuid,
  p_user_id uuid,
  p_required_role text
)
returns boolean
language plpgsql
security definer
stable
as $$
declare
  v_role text;
  v_role_hierarchy integer;
  v_required_hierarchy integer;
begin
  -- Role hierarchy: owner=5, admin=4, member=3, child=2, viewer=1
  v_role := get_member_role(p_household_id, p_user_id);
  
  if v_role is null then
    return false;
  end if;
  
  v_role_hierarchy := case v_role
    when 'owner' then 5
    when 'admin' then 4
    when 'member' then 3
    when 'child' then 2
    when 'viewer' then 1
    else 0
  end;
  
  v_required_hierarchy := case p_required_role
    when 'owner' then 5
    when 'admin' then 4
    when 'member' then 3
    when 'child' then 2
    when 'viewer' then 1
    else 0
  end;
  
  return v_role_hierarchy >= v_required_hierarchy;
end;
$$;

comment on function has_min_role(uuid, uuid, text) is 'Check if user has minimum required role in household';

-- Helper function: Log activity
create or replace function log_activity(
  p_household_id uuid,
  p_member_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Validate that household_id is not null (required field)
  if p_household_id is null then
    raise exception 'household_id cannot be null in activity logs';
  end if;

  -- Note: p_member_id can be null for system actions or external reservations
  
  insert into activity_logs (
    household_id,
    member_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    p_household_id,
    p_member_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
end;
$$;

comment on function log_activity(uuid, uuid, text, text, uuid, jsonb) is 'Log an activity to the activity feed';

-- Helper function: Enforce single active owner per household
create or replace function enforce_single_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only enforce when inserting an owner
  if new.role = 'owner' and new.is_active = true then
    -- Serialize concurrent owner creations for the same household
    perform 1
      from households
     where id = new.household_id
     for update;

    -- Check if an active owner already exists for this household
    if exists (
      select 1
        from members
       where household_id = new.household_id
         and role = 'owner'
         and is_active = true
         and id != new.id  -- Exclude the current row for updates
    ) then
      raise exception 'Household already has an active owner'
        using errcode = 'P0001',
              hint = 'Each household can only have one active owner';
    end if;
  end if;

  return new;
end;
$$;

comment on function enforce_single_owner() is 'Prevent multiple active owners per household with transaction-level locking';

create trigger trg_enforce_single_owner
  before insert or update on members
  for each row
  execute function enforce_single_owner();

-- ─── 7. RLS Policies ─────────────────────────────────────────

alter table households enable row level security;
alter table members enable row level security;
alter table invitations enable row level security;
alter table activity_logs enable row level security;

-- Households: Visible to members or creator
create policy "households_select"
  on households for select
  using (
    created_by = auth.uid()
    or id in (
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

-- Activity logs: System can insert (via security definer functions)
create policy "activity_logs_insert"
  on activity_logs for insert
  with check (true);  -- Restricted via security definer log_activity() function
