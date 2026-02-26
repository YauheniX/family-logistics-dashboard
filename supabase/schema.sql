-- ============================================================
-- Household Shopping & Wishlist Planner - Database Schema
-- ============================================================

-- Create extensions schema for security best practices
create schema if not exists extensions;
grant usage on schema extensions to authenticated, anon;

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists citext schema extensions;

-- ─── User Profiles ──────────────────────────────────────────
create table if not exists user_profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

comment on table user_profiles is 'Extended user profile linked to auth.users';

-- ─── Households ─────────────────────────────────────────────
-- NOTE: Migration 010_create_households_schema.sql adds additional features
-- like auto_generate_household_slug trigger and constraints
create table if not exists households (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  slug             text not null unique,
  created_by       uuid not null references auth.users on delete restrict,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  is_active        boolean not null default true,
  settings         jsonb not null default '{}'::jsonb,
  
  constraint households_name_length check (char_length(name) between 1 and 100),
  constraint households_slug_format check (slug ~ '^[a-z0-9-]+$')
);

comment on table households is 'Multi-tenant household (replaces families)';
comment on column households.slug is 'URL-friendly unique identifier for the household';
comment on column households.settings is 'Household-specific settings (timezone, currency, etc.)';

-- ─── Members ────────────────────────────────────────────────
create table if not exists members (
  id               uuid primary key default uuid_generate_v4(),
  household_id     uuid not null references households on delete cascade,
  user_id          uuid references auth.users on delete set null,
  role             text not null default 'member' 
    check (role in ('owner', 'admin', 'member', 'child', 'viewer')),
  display_name     text not null,
  date_of_birth    date,
  avatar_url       text,
  is_active        boolean not null default true,
  joined_at        timestamptz not null default now(),
  invited_by       uuid references members(id) on delete set null,
  metadata         jsonb not null default '{}'::jsonb,
  
  constraint members_name_length check (char_length(display_name) between 1 and 100),
  constraint members_unique_user_per_household unique (household_id, user_id),
  constraint members_child_dob check (role != 'child' or date_of_birth is not null)
);

comment on table members is 'Household members with optional user accounts (supports soft members)';
comment on column members.user_id is 'NULL for soft members (children without accounts)';
comment on column members.role is 'Role-based permissions: owner > admin > member > child > viewer';
comment on column members.date_of_birth is 'Required for child role (age verification)';

-- ─── Invitations ────────────────────────────────────────────
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

-- ─── Shopping Lists ─────────────────────────────────────────
create table if not exists shopping_lists (
  id          uuid primary key default uuid_generate_v4(),
  household_id uuid not null references households on delete cascade,
  title       text not null,
  description text,
  created_by  uuid not null default auth.uid() references auth.users on delete cascade,
  created_by_member_id uuid references members on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz default now(),
  status      text not null default 'active' check (status in ('active', 'archived'))
);

comment on table shopping_lists is 'Shared shopping lists within a household';
comment on column shopping_lists.household_id is 'References households table (required)';
comment on column shopping_lists.created_by_member_id is 'References members table (replaces created_by user reference)';

-- ─── Shopping Items ─────────────────────────────────────────
create table if not exists shopping_items (
  id            uuid primary key default uuid_generate_v4(),
  list_id       uuid not null references shopping_lists on delete cascade,
  title         text not null,
  quantity      integer not null default 1,
  category      text not null default 'General',
  is_purchased  boolean not null default false,
  added_by      uuid not null default auth.uid() references auth.users on delete cascade,
  purchased_by  uuid references auth.users on delete set null,
  created_at    timestamptz not null default now()
);

comment on table shopping_items is 'Items in a shopping list';

-- ─── Wishlists ──────────────────────────────────────────────
create table if not exists wishlists (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  member_id     uuid references members on delete cascade,
  household_id  uuid references households on delete cascade,
  title         text not null,
  description   text,
  visibility    text not null default 'private' check (visibility in ('private', 'household', 'public')),
  share_slug    text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz default now()
);

comment on table wishlists is 'Personal wishlists that can be publicly shared';
comment on column wishlists.member_id is 'Owner member (can be soft member without account)';
comment on column wishlists.household_id is 'Household context for the wishlist';
comment on column wishlists.visibility is 'private (owner+admins), household (all members), public (share link)';

-- ─── Wishlist Items ─────────────────────────────────────────
create table if not exists wishlist_items (
  id                uuid primary key default uuid_generate_v4(),
  wishlist_id       uuid not null references wishlists on delete cascade,
  title             text not null,
  description       text,
  link              text,
  price             numeric(10, 2),
  currency          text not null default 'USD',
  priority          text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_reserved       boolean not null default false,
  reserved_by_email extensions.citext,
  reserved_by_name  text,
  reserved_at       timestamptz,
  created_at        timestamptz not null default now()
);

comment on table wishlist_items is 'Items in a wishlist with email-based reservation support';
comment on column wishlist_items.reserved_by_email is 'Email of person who reserved (required for unreserving)';
comment on column wishlist_items.reserved_by_name is 'Name of person reserving (optional)';
comment on column wishlist_items.reserved_at is 'Timestamp when item was reserved';

-- ─── Indexes ────────────────────────────────────────────────

create index if not exists idx_households_created_by on households (created_by);
create index if not exists idx_households_slug on households (slug);
create index if not exists idx_members_household_id on members (household_id);
create index if not exists idx_members_user_id on members (user_id) where user_id is not null;
create index if not exists idx_members_is_active on members (is_active) where is_active = true;
create index if not exists idx_members_household_user_active on members (household_id, user_id, is_active) where is_active = true;
create index if not exists idx_invitations_household_id on invitations (household_id);
create index if not exists idx_invitations_email on invitations (email);
create index if not exists idx_invitations_token on invitations (token);
create index if not exists idx_shopping_lists_household_id on shopping_lists (household_id);
create index if not exists idx_shopping_items_list_id on shopping_items (list_id);
create index if not exists idx_wishlists_user_id on wishlists (user_id);
create index if not exists idx_wishlists_member_id on wishlists (member_id) where member_id is not null;
create index if not exists idx_wishlists_household_id on wishlists (household_id) where household_id is not null;
create index if not exists idx_wishlists_share_slug on wishlists (share_slug);
create index if not exists idx_wishlists_visibility on wishlists (visibility);
create index if not exists idx_wishlist_items_wishlist_id on wishlist_items (wishlist_id);

-- ─── Household Helper Functions ─────────────────────────────

-- Check if a user belongs to a specific household
create or replace function user_is_household_member(p_household_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from members
    where household_id = p_household_id
      and user_id = p_user_id
      and is_active = true
  );
$$;

-- Get member ID for a user in a household
create or replace function get_member_id(p_household_id uuid, p_user_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from members
  where household_id = p_household_id
    and user_id = p_user_id
    and is_active = true
  limit 1;
$$;

-- Get member role for a user in a household
create or replace function get_member_role(p_household_id uuid, p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from members
  where household_id = p_household_id
    and user_id = p_user_id
    and is_active = true
  limit 1;
$$;

-- Check if user has at least the specified role in a household
create or replace function has_min_role(
  p_household_id uuid,
  p_user_id uuid,
  p_required_role text
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
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
  
  -- Fail-closed: reject invalid required_role instead of silently allowing access
  v_required_hierarchy := case p_required_role
    when 'owner' then 5
    when 'admin' then 4
    when 'member' then 3
    when 'child' then 2
    when 'viewer' then 1
    else null  -- Invalid role should fail
  end;
  
  if v_required_hierarchy is null then
    raise exception 'Invalid required_role: %. Must be one of: owner, admin, member, child, viewer', p_required_role;
  end if;
  
  return v_role_hierarchy >= v_required_hierarchy;
end;
$$;

-- Lookup user id by email (for invitations)
create or replace function get_user_id_by_email(lookup_email text)
returns uuid
language plpgsql
security definer
stable
set search_path = public, auth
as $$
declare
  normalized_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  normalized_email := lower(trim(lookup_email));

  if normalized_email is null or normalized_email = '' then
    return null;
  end if;

  return (
    select id
    from auth.users
    where lower(trim(email)) = normalized_email
    limit 1
  );
end;
$$;

-- Lookup email by user id (for displaying member emails)
create or replace function get_email_by_user_id(lookup_user_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  return (select email from auth.users where id = lookup_user_id limit 1);
end;
$$;

-- ─── RLS Helper Functions (avoid recursion) ─────────────────
-- These functions are used by RLS policies to avoid infinite recursion
-- when policies on "members" need to check membership in subqueries.

-- Return caller's role in a household (or null if not a member)
create or replace function get_my_member_role(p_household_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from members
  where household_id = p_household_id
    and user_id = (select auth.uid())
    and is_active = true
  limit 1;
$$;

-- Is caller an active member of a household?
create or replace function is_active_member_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from members
    where household_id = p_household_id
      and user_id = (select auth.uid())
      and is_active = true
  );
$$;

-- Is caller the owner of a household?
create or replace function is_owner_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from members
    where household_id = p_household_id
      and user_id = (select auth.uid())
      and role = 'owner'
      and is_active = true
  );
$$;

-- Is caller an owner or admin of a household?
create or replace function is_owner_or_admin_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from members
    where household_id = p_household_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin')
      and is_active = true
  );
$$;

-- ─── Auto-create user profile on signup ─────────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;  -- Don't overwrite existing profiles
  return new;
end;
$$;

-- Trigger on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ─── Storage ────────────────────────────────────────────────

-- Create wishlist-images bucket (run via Supabase dashboard or API)
-- insert into storage.buckets (id, name, public) values ('wishlist-images', 'wishlist-images', true);
