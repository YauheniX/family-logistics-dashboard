-- ════════════════════════════════════════════════════════════
-- Migration 029: Replace Reservation Code with Email
-- ════════════════════════════════════════════════════════════
-- Removes the 4-digit reservation code system and replaces it
-- with email-based reservation verification.
-- Users must provide their email to reserve/unreserve items.
-- ════════════════════════════════════════════════════════════

-- ─── 1. Update Reserve Function to Use Email ──────────────

drop function if exists reserve_wishlist_item(uuid, boolean, text, text, text);
create or replace function reserve_wishlist_item(
  p_item_id uuid,
  p_reserved boolean,
  p_email text default null,
  p_name text default null,
  p_code text default null  -- Keeping for backward compatibility during transition, will be ignored
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
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

  -- Validate email if provided (required for unreserving, optional for reserving)
  if not v_is_owner and p_email is not null and trim(p_email) <> '' then
    -- Validate email format
    if not (p_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
      raise exception 'Invalid email format';
    end if;
    
    if char_length(p_email) > 255 then
      raise exception 'Email too long (max 255 characters)';
    end if;
  end if;

  -- For unreserving: require email match if item was reserved with email (unless owner)
  if not p_reserved and not v_is_owner then
    -- Check if item was reserved with an email
    if exists (
      select 1 from wishlist_items
      where id = p_item_id
        and is_reserved = true
        and reserved_by_email is not null
    ) then
      -- Item has email - require matching email to unreserve
      if p_email is null or trim(p_email) = '' then
        raise exception 'Email is required to unreserve this item';
      end if;
    end if;
    -- If item was reserved without email (null), anyone can unreserve it
  end if;

  -- If reserving, validate inputs
  if p_reserved then
    if p_name is not null then
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
  end if;

  -- If unreserving with email verification, check email matches (unless owner or item has no email)
  if not p_reserved and not v_is_owner and p_email is not null and trim(p_email) <> '' then
    if not exists (
      select 1 from wishlist_items
      where id = p_item_id 
        and reserved_by_email = p_email
        and is_reserved = true
    ) then
      raise exception 'Email does not match the reservation';
    end if;
  end if;

  -- Update reservation fields (with atomic guard for reservations)
  if p_reserved then
    update wishlist_items
    set is_reserved = true,
        reserved_by_email = p_email,
        reserved_by_name = p_name,
        reserved_at = now()
    where id = p_item_id
      and is_reserved = false;  -- Atomic guard against race conditions
    
    if not found then
      return jsonb_build_object(
        'success', false,
        'error', 'already_reserved'
      );
    end if;
  else
    -- Atomic unreserve: enforce email match or NULL in WHERE clause
    update wishlist_items
    set is_reserved = false,
        reserved_by_email = null,
        reserved_by_name = null,
        reserved_at = null
    where id = p_item_id
      and is_reserved = true
      and (
        v_is_owner  -- Owner can always unreserve
        or reserved_by_email is null  -- Item has no email protection, anyone can unreserve
        or (p_email is not null and trim(p_email) <> '' and reserved_by_email = p_email)  -- Email matches
      );
    
    if not found then
      -- Check why update failed
      if not exists (select 1 from wishlist_items where id = p_item_id and is_reserved = true) then
        raise exception 'Item is not reserved';
      elsif not v_is_owner and exists (
        select 1 from wishlist_items 
        where id = p_item_id and reserved_by_email is not null
      ) then
        if p_email is null or trim(p_email) = '' then
          raise exception 'Email is required to unreserve this item';
        else
          raise exception 'Email does not match the reservation';
        end if;
      end if;
    end if;
  end if;

  -- Return success (no code needed)
  return jsonb_build_object(
    'success', true
  );
end;
$$;

-- ─── 2. Remove reservation_code Column ────────────────────

-- Drop the constraint first
alter table wishlist_items
  drop constraint if exists wishlist_items_reservation_code_format;

-- Drop the column
alter table wishlist_items
  drop column if exists reservation_code;

-- ─── 3. Update Comments ────────────────────────────────

comment on column wishlist_items.reserved_by_email is 'Email of person who reserved (required for unreserving)';
comment on column wishlist_items.reserved_by_name is 'Name of person reserving (optional)';
comment on table wishlist_items is 'Items in a wishlist with email-based reservation support';
