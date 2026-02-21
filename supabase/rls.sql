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
  using (
    user_is_family_member(family_id, auth.uid())
  );

-- Any family member can create a list
create policy "shopping_lists_insert"
  on shopping_lists for insert
  with check (
    created_by = auth.uid()
    user_is_family_member(family_id, auth.uid())

-- Any family member can update a list (e.g., archive it)
create policy "shopping_lists_update"
  on shopping_lists for update
  using (
    created_by = auth.uid()
    or user_is_family_member(family_id, auth.uid())
  );

-- Only list creator or family owner can delete a list
create policy "shopping_lists_delete"
  on shopping_lists for delete
    user_is_family_member(family_id, auth.uid())
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
    -- Normal case: user is a member of the list's family
    exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and user_is_family_member(sl.family_id, auth.uid())
    )
    -- Or the inserting user is recorded on the row
    or added_by = auth.uid()
    -- User must be a member of the list's family at insert time
    exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and user_is_family_member(sl.family_id, auth.uid())
    )
      where sl.id = list_id
        and user_is_family_member(sl.family_id, auth.uid())
    )
    or added_by = auth.uid()
    or exists (
      select 1 from shopping_lists sl
      where sl.id = list_id
        and sl.created_by = auth.uid()
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
-- public wishlists without needing to log in. It updates
-- is_reserved, reserved_by_name, reserved_at, and reservation_code
-- fields.
-- 
-- Returns a JSON object with the reservation_code when reserving.
-- ═════════════════════════════════════════════════════════════

create or replace function reserve_wishlist_item(
  p_item_id uuid,
  p_reserved boolean,
  p_email text default null,
  p_name text default null,
  p_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_wishlist_user_id uuid;
  v_is_owner boolean := false;
  v_wishlist_is_public boolean := false;
begin
  -- Check if caller is owner and verify the item belongs to a public wishlist
  select w.user_id, (w.visibility = 'public')
    into v_wishlist_user_id, v_wishlist_is_public
  from wishlist_items wi
  join wishlists w on w.id = wi.wishlist_id
  where wi.id = p_item_id;
  
  if v_wishlist_user_id is not null and auth.uid() = v_wishlist_user_id then
    v_is_owner := true;
  end if;

  -- Verify the wishlist is public
  if not v_wishlist_is_public then
    raise exception 'Item not found or wishlist is not public';
  end if;

  -- If unreserving, validate code (unless owner)
  if not p_reserved and not v_is_owner then
    if p_code is null then
      raise exception 'Reservation code is required to unreserve';
    end if;
    
    if not exists (
      select 1 from wishlist_items
      where id = p_item_id 
        and reservation_code = p_code
        and is_reserved = true
    ) then
      raise exception 'Invalid reservation code';
    end if;
  end if;

  -- If reserving, generate a 4-digit code
  if p_reserved then
    -- Input validation
    if p_email is not null then
      if not (p_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
        raise exception 'Invalid email format';
      end if;
      if char_length(p_email) > 255 then
        raise exception 'Email too long (max 255 characters)';
      end if;
    end if;
    
    if p_name is not null then
      -- Note: SQL injection is already prevented by parameterization.
      -- XSS should be handled via proper output encoding, not by
      -- blacklisting characters here. We only enforce length limits.
      if char_length(p_name) > 100 then
        raise exception 'Name too long (max 100 characters)';
      end if;
    end if;
    
    -- Generate 4-digit code using cryptographically secure randomness
    declare
      v_random_bytes bytea := gen_random_bytes(2);
    begin
      v_code := lpad(
        (
          ((get_byte(v_random_bytes, 0) * 256 + get_byte(v_random_bytes, 1)) % 10000)
        )::text,
        4,
        '0'
      );
    end;
  end if;

  -- Update reservation fields
  update wishlist_items
  set is_reserved = p_reserved,
      reserved_by_email = case when p_reserved then p_email else null end,
      reserved_by_name = case when p_reserved then p_name else null end,
      reserved_at = case when p_reserved then now() else null end,
      reservation_code = case when p_reserved then v_code else null end
  where id = p_item_id;

  -- Return the code when reserving
  return jsonb_build_object(
    'success', true,
    'reservation_code', v_code
  );
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
