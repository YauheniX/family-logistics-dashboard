-- ════════════════════════════════════════════════════════════
-- Migration 030: Allow Household Wishlist Reservations
-- ════════════════════════════════════════════════════════════
-- Updates the reserve_wishlist_item function to allow members
-- of the same household to reserve items from wishlists with
-- visibility = 'household' (in addition to 'public' wishlists).
-- ════════════════════════════════════════════════════════════

-- ─── 1. Create Email Validation Helper ────────────────────

-- Robust email validation function (RFC 5321 compliant)
-- Validates: local-part@domain.tld format with proper constraints
create or replace function validate_email_format(p_email text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  -- RFC 5321 compliant email pattern:
  -- - Local part: letters, digits, and special chars (.!#$%&'*+/=?^_`{|}~-)
  -- - No consecutive dots, no leading/trailing dots in local part
  -- - Domain: valid DNS label format (alphanumeric, hyphens not at start/end)
  -- - TLD: at least 2 characters, letters only
  v_email_pattern constant text := 
    '^[a-zA-Z0-9!#$%&''*+/=?^_`{|}~-]+(\.[a-zA-Z0-9!#$%&''*+/=?^_`{|}~-]+)*@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$';
begin
  if p_email is null or trim(p_email) = '' then
    return false;
  end if;
  
  -- Check length constraint
  if char_length(p_email) > 255 then
    return false;
  end if;
  
  -- Validate against RFC 5321 pattern
  return p_email ~* v_email_pattern;
end;
$$;

comment on function validate_email_format(text) is 
  'Validates email format using RFC 5321 compliant pattern. Returns true if valid, false otherwise.';

-- ─── 2. Update Reserve Function ───────────────────────────

drop function if exists reserve_wishlist_item(uuid, boolean, text, text, text);
create or replace function reserve_wishlist_item(
  p_item_id uuid,
  p_reserved boolean,
  p_email text default null,
  p_name text default null,
  p_code text default null  -- Kept for backward compatibility, ignored
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist_user_id uuid;
  v_wishlist_household_id uuid;
  v_wishlist_visibility text;
  v_is_owner boolean := false;
  v_can_access boolean := false;
  v_caller_uid uuid;
begin
  v_caller_uid := auth.uid();

  -- Get wishlist info: owner, household, and visibility
  select w.user_id, w.household_id, w.visibility
    into v_wishlist_user_id, v_wishlist_household_id, v_wishlist_visibility
  from wishlist_items wi
  join wishlists w on w.id = wi.wishlist_id
  where wi.id = p_item_id;

  -- Item not found
  if v_wishlist_user_id is null then
    raise exception 'Item not found';
  end if;

  -- Check if caller is the wishlist owner
  if v_caller_uid is not null and v_caller_uid = v_wishlist_user_id then
    v_is_owner := true;
    v_can_access := true;
  end if;

  -- Determine access based on visibility
  if not v_can_access then
    case v_wishlist_visibility
      when 'public' then
        -- Public wishlists: anyone can reserve (anonymous or authenticated)
        v_can_access := true;
      
      when 'household' then
        -- Household wishlists: only authenticated members of the same household
        if v_caller_uid is null then
          raise exception 'Authentication required to reserve from household wishlists';
        end if;
        
        -- Check if caller is an active member of the same household
        if exists (
          select 1 from members
          where household_id = v_wishlist_household_id
            and user_id = v_caller_uid
            and is_active = true
        ) then
          v_can_access := true;
        else
          raise exception 'You must be a member of this household to reserve items';
        end if;
      
      when 'private' then
        -- Private wishlists: only owner can access (already checked above)
        raise exception 'Cannot reserve items from private wishlists';
      
      else
        raise exception 'Unknown wishlist visibility';
    end case;
  end if;

  -- For reserving: require email from non-owners
  if p_reserved and not v_is_owner then
    if p_email is null or trim(p_email) = '' then
      raise exception 'Email is required to reserve items';
    end if;
  end if;

  -- Validate email format using helper function (if provided and not owner)
  if not v_is_owner and p_email is not null and trim(p_email) <> '' then
    if not validate_email_format(p_email) then
      raise exception 'Invalid email format';
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

  -- Return success
  return jsonb_build_object(
    'success', true
  );
end;
$$;

-- ─── 3. Update Comments ────────────────────────────────

comment on function reserve_wishlist_item(uuid, boolean, text, text, text) is 
  'Reserve/unreserve a wishlist item. Works for public wishlists (anyone) and household wishlists (authenticated household members only).';
