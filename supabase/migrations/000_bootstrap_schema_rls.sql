-- Bootstrap remote schema from local scripts

-- ============================================================
-- Family Shopping & Wishlist Planner - Database Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- â”€â”€â”€ User Profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists user_profiles (
  id          uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

comment on table user_profiles is 'Extended user profile linked to auth.users';

-- â”€â”€â”€ Families â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table families is 'Family groups that contain members and shared shopping lists';

-- â”€â”€â”€ Family Members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  unique (family_id, user_id)
);

comment on table family_members is 'Members of a family with role-based access';

-- â”€â”€â”€ Shopping Lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists shopping_lists (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families on delete cascade,
  title       text not null,
  description text,
  created_by  uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  status      text not null default 'active' check (status in ('active', 'archived'))
);

comment on table shopping_lists is 'Shared shopping lists within a family';

-- â”€â”€â”€ Shopping Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists shopping_items (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references shopping_lists on delete cascade,
  title         text not null,
  quantity      integer not null default 1,
  category      text not null default 'General',
  is_purchased  boolean not null default false,
  added_by      uuid not null references auth.users on delete cascade,
  purchased_by  uuid references auth.users on delete set null,
  created_at    timestamptz not null default now()
);

comment on table shopping_items is 'Items in a shopping list';

-- â”€â”€â”€ Wishlists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  description text,
  is_public   boolean not null default false,
  share_slug  text not null unique,
  created_at  timestamptz not null default now()
);

comment on table wishlists is 'Personal wishlists that can be publicly shared';

-- â”€â”€â”€ Wishlist Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
create table if not exists wishlist_items (
  id                uuid primary key default gen_random_uuid(),
  wishlist_id       uuid not null references wishlists on delete cascade,
  title             text not null,
  description       text,
  link              text,
  price             numeric(10, 2),
  currency          text not null default 'USD',
  image_url         text,
  priority          text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  is_reserved       boolean not null default false,
  reserved_by_email text,
  created_at        timestamptz not null default now()
);

comment on table wishlist_items is 'Items in a wishlist with reservation support';

-- â”€â”€â”€ Indexes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

create index if not exists idx_family_members_user_id on family_members (user_id);
create index if not exists idx_family_members_family_id on family_members (family_id);
create index if not exists idx_shopping_lists_family_id on shopping_lists (family_id);
create index if not exists idx_shopping_items_list_id on shopping_items (list_id);
create index if not exists idx_wishlists_user_id on wishlists (user_id);
create index if not exists idx_wishlists_share_slug on wishlists (share_slug);
create index if not exists idx_wishlist_items_wishlist_id on wishlist_items (wishlist_id);

-- â”€â”€â”€ Helper Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  return (select id from auth.users where email = lookup_email limit 1);
end;
$$;

-- Lookup email by user id (for displaying member emails)
create or replace function get_email_by_user_id(lookup_user_id uuid)
returns text
language plpgsql
security definer
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  return (select email from auth.users where id = lookup_user_id limit 1);
end;
$$;

-- â”€â”€â”€ Auto-create user profile on signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into user_profiles (id, display_name, avatar_url)
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

-- â”€â”€â”€ Storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Create wishlist-images bucket (run via Supabase dashboard or API)
-- insert into storage.buckets (id, name, public) values ('wishlist-images', 'wishlist-images', true);

-- RLS policies

-- ============================================================
-- Family Shopping & Wishlist Planner - Row Level Security
-- ============================================================
-- Enable RLS on all tables, then define policies.
-- ============================================================

-- â”€â”€â”€ Enable RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
alter table user_profiles    enable row level security;
alter table families         enable row level security;
alter table family_members   enable row level security;
alter table shopping_lists   enable row level security;
alter table shopping_items   enable row level security;
alter table wishlists        enable row level security;
alter table wishlist_items   enable row level security;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- USER PROFILES
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Users can read any profile (for displaying names)
create policy "user_profiles_select"
  on user_profiles for select
  using (true);

-- Users can insert their own profile
create policy "user_profiles_insert"
  on user_profiles for insert
  with check (id = auth.uid());

-- Users can update only their own profile
create policy "user_profiles_update"
  on user_profiles for update
  using (id = auth.uid());

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- FAMILIES
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- A user can see families they belong to
create policy "families_select"
  on families for select
  using (user_is_family_member(id, auth.uid()));

-- Any authenticated user can create a family
create policy "families_insert"
  on families for insert
  with check (auth.uid() is not null);

-- Only family owner can update family details
create policy "families_update"
  on families for update
  using (user_is_family_owner(id, auth.uid()));

-- Only family owner can delete the family
create policy "families_delete"
  on families for delete
  using (user_is_family_owner(id, auth.uid()));

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- FAMILY MEMBERS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Members can see other members of their family
create policy "family_members_select"
  on family_members for select
  using (user_is_family_member(family_id, auth.uid()));

-- Only family owner can add members
create policy "family_members_insert"
  on family_members for insert
  with check (user_is_family_owner(family_id, auth.uid()));

-- Only family owner can remove members (or self-remove)
create policy "family_members_delete"
  on family_members for delete
  using (
    user_is_family_owner(family_id, auth.uid())
    or user_id = auth.uid()
  );

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SHOPPING LISTS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Accessible only if user belongs to that family
create policy "shopping_lists_select"
  on shopping_lists for select
  using (user_is_family_member(family_id, auth.uid()));

-- Any family member can create a list
create policy "shopping_lists_insert"
  on shopping_lists for insert
  with check (user_is_family_member(family_id, auth.uid()));

-- Any family member can update a list (e.g., archive it)
create policy "shopping_lists_update"
  on shopping_lists for update
  using (user_is_family_member(family_id, auth.uid()));

-- Only list creator or family owner can delete a list
create policy "shopping_lists_delete"
  on shopping_lists for delete
  using (
    created_by = auth.uid()
    or user_is_family_owner(family_id, auth.uid())
  );

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- SHOPPING ITEMS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Accessible only if list belongs to a family the user is in
create policy "shopping_items_select"
  on shopping_items for select
  using (
    exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and user_is_family_member(sl.family_id, auth.uid())
    )
  );

-- Any family member can add items
create policy "shopping_items_insert"
  on shopping_items for insert
  with check (
    exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and user_is_family_member(sl.family_id, auth.uid())
    )
  );

-- Any family member can update items (mark purchased, edit)
create policy "shopping_items_update"
  on shopping_items for update
  using (
    exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and user_is_family_member(sl.family_id, auth.uid())
    )
  );

-- Item creator or family owner can delete items
create policy "shopping_items_delete"
  on shopping_items for delete
  using (
    added_by = auth.uid()
    or exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and user_is_family_owner(sl.family_id, auth.uid())
    )
  );

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- WISHLISTS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Owner has full access; public wishlists readable by anyone
create policy "wishlists_select"
  on wishlists for select
  using (user_id = auth.uid() or is_public = true);

-- Authenticated users can create their own wishlists
create policy "wishlists_insert"
  on wishlists for insert
  with check (user_id = auth.uid());

-- Only owner can update their wishlist
create policy "wishlists_update"
  on wishlists for update
  using (user_id = auth.uid());

-- Only owner can delete their wishlist
create policy "wishlists_delete"
  on wishlists for delete
  using (user_id = auth.uid());

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- WISHLIST ITEMS
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Readable if owner or wishlist is public
create policy "wishlist_items_select"
  on wishlist_items for select
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and (w.user_id = auth.uid() or w.is_public = true)
    )
  );

-- Only wishlist owner can insert items
create policy "wishlist_items_insert"
  on wishlist_items for insert
  with check (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = auth.uid()
    )
  );

-- Owner can update everything; public can update only reservation fields
create policy "wishlist_items_update_owner"
  on wishlist_items for update
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = auth.uid()
    )
  );

-- Note: Public reservation updates are handled via a security-definer function
-- to restrict which columns can be modified by anonymous users.

-- Only wishlist owner can delete items
create policy "wishlist_items_delete"
  on wishlist_items for delete
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = auth.uid()
    )
  );

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- PUBLIC WISHLIST RESERVATION FUNCTION
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- This function allows anonymous users to reserve items on
-- public wishlists without needing to log in. It restricts
-- updates to only is_reserved and reserved_by_email fields.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

create or replace function reserve_wishlist_item(
  p_item_id uuid,
  p_reserved boolean,
  p_email text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Verify the item belongs to a public wishlist
  if not exists (
    select 1
    from wishlist_items wi
    join wishlists w on w.id = wi.wishlist_id
    where wi.id = p_item_id
      and w.is_public = true
  ) then
    raise exception 'Item not found or wishlist is not public';
  end if;

  -- Update only the reservation fields
  update wishlist_items
  set is_reserved = p_reserved,
      reserved_by_email = p_email
  where id = p_item_id;
end;
$$;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STORAGE POLICIES (wishlist-images bucket)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Users can upload to their own folder: user_id/wishlist_id/...
-- Public read if wishlist is public.
-- These must be applied via Supabase dashboard or API:
--
-- INSERT policy: (bucket_id = 'wishlist-images')
--   WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text)
--
-- SELECT policy: (bucket_id = 'wishlist-images')
--   USING (true)   -- bucket is public
--
-- DELETE policy: (bucket_id = 'wishlist-images')
--   USING ((storage.foldername(name))[1] = auth.uid()::text)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
