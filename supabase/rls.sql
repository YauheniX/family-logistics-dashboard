-- ============================================================
-- Family Shopping & Wishlist Planner - Row Level Security
-- ============================================================
-- Enable RLS on all tables, then define policies.
-- ============================================================

-- ─── Enable RLS ─────────────────────────────────────────────
alter table user_profiles    enable row level security;
alter table families         enable row level security;
alter table family_members   enable row level security;
alter table shopping_lists   enable row level security;
alter table shopping_items   enable row level security;
alter table wishlists        enable row level security;
alter table wishlist_items   enable row level security;

-- ═════════════════════════════════════════════════════════════
-- USER PROFILES
-- ═════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- FAMILIES
-- ═════════════════════════════════════════════════════════════

-- A user can see families they belong to
create policy "families_select"
  on families for select
  using (
    created_by = auth.uid()
    or user_is_family_member(id, auth.uid())
  );

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
  using (
    created_by = auth.uid()
    or user_is_family_owner(id, auth.uid())
  );

-- ═════════════════════════════════════════════════════════════
-- FAMILY MEMBERS
-- ═════════════════════════════════════════════════════════════

-- Members can see other members of their family
create policy "family_members_select"
  on family_members for select
  using (
    user_id = auth.uid()
    or user_is_family_member(family_id, auth.uid())
  );

-- Only family owner can add members
create policy "family_members_insert"
  on family_members for insert
  with check (
    user_is_family_owner(family_id, auth.uid())
    or (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1 from families f
        where f.id = family_id
          and f.created_by = auth.uid()
      )
    )
  );

-- Only family owner can remove members (or self-remove)
create policy "family_members_delete"
  on family_members for delete
  using (
    user_is_family_owner(family_id, auth.uid())
    or user_id = auth.uid()
  );

-- ═════════════════════════════════════════════════════════════
-- SHOPPING LISTS
-- ═════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- SHOPPING ITEMS
-- ═════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- WISHLISTS
-- ═════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- WISHLIST ITEMS
-- ═════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- PUBLIC WISHLIST RESERVATION FUNCTION
-- ═════════════════════════════════════════════════════════════
-- This function allows anonymous users to reserve items on
-- public wishlists without needing to log in. It restricts
-- updates to only is_reserved and reserved_by_email fields.
-- ═════════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- STORAGE POLICIES (wishlist-images bucket)
-- ═════════════════════════════════════════════════════════════
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
-- ═════════════════════════════════════════════════════════════
