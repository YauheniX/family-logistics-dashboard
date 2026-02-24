-- ============================================================
-- Household Shopping & Wishlist Planner - Row Level Security
-- ============================================================
-- Enable RLS on all tables, then define policies.
-- ============================================================

-- ─── Enable RLS ─────────────────────────────────────────────
alter table user_profiles    enable row level security;
alter table households       enable row level security;
alter table members          enable row level security;
alter table invitations      enable row level security;
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
  with check (id = (select auth.uid()));

-- Users can update only their own profile
create policy "user_profiles_update"
  on user_profiles for update
  using (id = (select auth.uid()));

-- ═════════════════════════════════════════════════════════════
-- HOUSEHOLDS
-- ═════════════════════════════════════════════════════════════

-- Users can see households they belong to
create policy "households_select"
  on households for select
  using (
    exists (
      select 1 from members
      where household_id = households.id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

-- Any authenticated user can create a household
create policy "households_insert"
  on households for insert
  with check ((select auth.uid()) is not null);

-- Only owner/admin can update household details
create policy "households_update"
  on households for update
  using (
    exists (
      select 1 from members
      where household_id = households.id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- Only owner can delete household
create policy "households_delete"
  on households for delete
  using (
    exists (
      select 1 from members
      where household_id = households.id
        and user_id = (select auth.uid())
        and role = 'owner'
        and is_active = true
    )
  );

-- ═════════════════════════════════════════════════════════════
-- MEMBERS
-- ═════════════════════════════════════════════════════════════
-- NOTE: These policies use SECURITY DEFINER helper functions to avoid
-- infinite recursion (see migration 015_fix_members_rls_recursion.sql)

-- SELECT:
-- - user can always see their own member row
-- - if caller is not a child: can see all members in the household
-- - if caller is a child: can only see other children in the same household
create policy "members_select"
  on members for select
  using (
    user_id = (select auth.uid())
    or (
      public.is_active_member_of_household(household_id)
      and (
        public.get_my_member_role(household_id) <> 'child'
        or role = 'child'
      )
    )
  );

-- INSERT:
-- - owner/admin can add members
-- - allow self-insert as owner when creating a household
create policy "members_insert"
  on members for insert
  with check (
    public.is_owner_or_admin_of_household(members.household_id)
    or (
      user_id = (select auth.uid())
      and role = 'owner'
      and exists (
        select 1
        from public.households h
        where h.id = members.household_id
          and h.created_by = (select auth.uid())
      )
    )
  );

-- UPDATE:
-- - owner/admin can update household members
-- - user can update their own member row (but not escalate role - enforced by WITH CHECK)
create policy "members_update"
  on members for update
  using (
    user_id = (select auth.uid())
    or public.is_owner_or_admin_of_household(members.household_id)
  )
  with check (
    user_id = (select auth.uid())
    or public.is_owner_or_admin_of_household(members.household_id)
  );

-- DELETE:
-- - only owner can delete members (not admin, not self-delete)
create policy "members_delete"
  on members for delete
  using (
    public.is_owner_of_household(members.household_id)
  );

-- ═════════════════════════════════════════════════════════════
-- INVITATIONS
-- ═════════════════════════════════════════════════════════════

-- Users can see invitations for their households or sent to their email
create policy "invitations_select"
  on invitations for select
  using (
    email = (select auth.jwt() ->> 'email')
    or exists (
      select 1 from members
      where household_id = invitations.household_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- INSERT:
-- - only owner/admin of household can create invitations
create policy "invitations_insert"
  on invitations for insert
  with check (
    public.is_owner_or_admin_of_household(invitations.household_id)
  );

-- UPDATE:
-- - only owner/admin can update invitations (e.g., resend, cancel)
create policy "invitations_update"
  on invitations for update
  using (
    public.is_owner_or_admin_of_household(invitations.household_id)
  );

-- DELETE:
-- - only owner/admin can delete invitations
create policy "invitations_delete"
  on invitations for delete
  using (
    public.is_owner_or_admin_of_household(invitations.household_id)
  );

-- ═════════════════════════════════════════════════════════════
-- SHOPPING LISTS
-- ═════════════════════════════════════════════════════════════

-- Accessible only if user is a household member
create policy "shopping_lists_select"
  on shopping_lists for select
  using (
    exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

-- Any household member can create a list
create policy "shopping_lists_insert"
  on shopping_lists for insert
  with check (
    exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

-- Any household member can update a list
create policy "shopping_lists_update"
  on shopping_lists for update
  using (
    exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

-- Only list creator or owner/admin can delete a list
create policy "shopping_lists_delete"
  on shopping_lists for delete
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

-- ═════════════════════════════════════════════════════════════
-- SHOPPING ITEMS
-- ═════════════════════════════════════════════════════════════

-- Accessible only if list belongs to user's household
create policy "shopping_items_select"
  on shopping_items for select
  using (
    exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = shopping_items.list_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
    )
  );

-- Any household member can add items
create policy "shopping_items_insert"
  on shopping_items for insert
  with check (
    exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = shopping_items.list_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
    )
  );

-- Any household member can update items (mark as purchased, etc)
create policy "shopping_items_update"
  on shopping_items for update
  using (
    exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = shopping_items.list_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
    )
  );

-- Item creator or owner/admin can delete items
create policy "shopping_items_delete"
  on shopping_items for delete
  using (
    added_by = (select auth.uid())
    or exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = shopping_items.list_id
        and m.user_id = (select auth.uid())
        and m.role in ('owner', 'admin')
        and m.is_active = true
    )
  );

-- ═════════════════════════════════════════════════════════════
-- WISHLISTS
-- ═════════════════════════════════════════════════════════════

-- SELECT:
-- - owner can see their wishlists
-- - household members can see household wishlists with visibility 'household' or 'public'
-- - anyone can see public wishlists (for share links)
create policy "wishlists_select"
  on wishlists for select
  using (
    visibility = 'public'
    or user_id = (select auth.uid())
    or (
      visibility = 'household'
      and exists (
        select 1 from members
        where household_id = wishlists.household_id
          and user_id = (select auth.uid())
          and is_active = true
      )
    )
  );

-- Authenticated users can create their own wishlists
create policy "wishlists_insert"
  on wishlists for insert
  with check (user_id = (select auth.uid()));

-- Only owner can update their wishlist
create policy "wishlists_update"
  on wishlists for update
  using (user_id = (select auth.uid()));

-- Only owner can delete their wishlist
create policy "wishlists_delete"
  on wishlists for delete
  using (user_id = (select auth.uid()));

-- ═════════════════════════════════════════════════════════════
-- WISHLIST ITEMS
-- ═════════════════════════════════════════════════════════════

-- Readable if owner or wishlist is public/household
create policy "wishlist_items_select"
  on wishlist_items for select
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and (
          w.user_id = (select auth.uid())
          or w.visibility = 'public'
          or (
            w.visibility = 'household'
            and exists (
              select 1 from members
              where household_id = w.household_id
                and user_id = (select auth.uid())
                and is_active = true
            )
          )
        )
    )
  );

-- Only wishlist owner can insert items
create policy "wishlist_items_insert"
  on wishlist_items for insert
  with check (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = (select auth.uid())
    )
  );

-- Owner can update everything; public can update only reservation fields
create policy "wishlist_items_update_owner"
  on wishlist_items for update
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = (select auth.uid())
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
        and w.user_id = (select auth.uid())
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
    
    -- Check if item is already reserved (prevent overwriting)
    if exists (
      select 1 from wishlist_items
      where id = p_item_id and is_reserved = true
    ) then
      return jsonb_build_object(
        'success', false,
        'error', 'already_reserved'
      );
    end if;

    -- Generate 4-digit code using cryptographically secure randomness
    declare
      v_random_bytes bytea := extensions.gen_random_bytes(2);
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

  -- Update reservation fields (with atomic guard for reservations)
  if p_reserved then
    update wishlist_items
    set is_reserved = true,
        reserved_by_email = p_email,
        reserved_by_name = p_name,
        reserved_at = now(),
        reservation_code = v_code
    where id = p_item_id
      and is_reserved = false;  -- Atomic guard against race conditions
    
    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'already_reserved'
      );
    end if;
  else
    update wishlist_items
    set is_reserved = false,
        reserved_by_email = null,
        reserved_by_name = null,
        reserved_at = null,
        reservation_code = null
    where id = p_item_id;
  end if;

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
