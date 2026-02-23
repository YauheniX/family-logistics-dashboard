-- ============================================================
-- Family Shopping & Wishlist Planner - Database Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── User Profiles ──────────────────────────────────────────
create table if not exists user_profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

comment on table user_profiles is 'Extended user profile linked to auth.users';

-- ─── Families ───────────────────────────────────────────────
create table if not exists families (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_by  uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table families is 'Family groups that contain members and shared shopping lists';

-- ─── Family Members ─────────────────────────────────────────
create table if not exists family_members (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  unique (family_id, user_id)
);

comment on table family_members is 'Members of a family with role-based access';

-- ─── Shopping Lists ─────────────────────────────────────────
create table if not exists shopping_lists (
  id          uuid primary key default uuid_generate_v4(),
  family_id   uuid not null references families on delete cascade,
  title       text not null,
  description text,
  created_by  uuid not null default auth.uid() references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  status      text not null default 'active' check (status in ('active', 'archived'))
);

comment on table shopping_lists is 'Shared shopping lists within a family';

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
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  description text,
  is_public   boolean not null default false,
  share_slug  text not null unique,
  created_at  timestamptz not null default now()
);

comment on table wishlists is 'Personal wishlists that can be publicly shared';

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
  reserved_by_email text,
  reserved_by_name  text,
  reserved_at       timestamptz,
  reservation_code  text check (reservation_code ~ '^\d{4}$' or reservation_code is null),
  created_at        timestamptz not null default now()
);

comment on table wishlist_items is 'Items in a wishlist with reservation support';
comment on column wishlist_items.reserved_by_name is 'Name of person reserving (for public reservations)';
comment on column wishlist_items.reserved_at is 'Timestamp when item was reserved';
comment on column wishlist_items.reservation_code is '4-digit code required to unreserve (owner can unreserve without code)';

-- ─── Indexes ────────────────────────────────────────────────

create index if not exists idx_family_members_user_id on family_members (user_id);
create index if not exists idx_family_members_family_id on family_members (family_id);
create index if not exists idx_shopping_lists_family_id on shopping_lists (family_id);
create index if not exists idx_shopping_items_list_id on shopping_items (list_id);
create index if not exists idx_wishlists_user_id on wishlists (user_id);
create index if not exists idx_wishlists_share_slug on wishlists (share_slug);
create index if not exists idx_wishlist_items_wishlist_id on wishlist_items (wishlist_id);

-- ─── Helper Functions ───────────────────────────────────────

-- Check if a user belongs to a specific family
create or replace function user_is_family_member(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = p_family_id
      and user_id = p_user_id
  );
$$;

-- Check if a user is the owner of a specific family
create or replace function user_is_family_owner(p_family_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = p_family_id
      and user_id = p_user_id
      and role = 'owner'
  );
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
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  );
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
