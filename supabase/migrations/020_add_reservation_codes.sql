-- ════════════════════════════════════════════════════════════
-- Migration 020: Add Reservation Codes
-- ════════════════════════════════════════════════════════════
-- Adds confirmation codes for wishlist item reservations.
-- Public users need the code to unreserve items.
-- Wishlist owners can unreserve without the code.
-- ════════════════════════════════════════════════════════════

-- ─── 1. Add reservation_code Column ───────────────────────

alter table wishlist_items
  add column if not exists reservation_code text;

-- Drop constraint if it exists, then recreate (for idempotency)
alter table wishlist_items
  drop constraint if exists wishlist_items_reservation_code_format;

alter table wishlist_items
  add constraint wishlist_items_reservation_code_format
  check (reservation_code ~ '^\d{4}$' or reservation_code is null);
  
comment on column wishlist_items.reservation_code is '4-digit code required to unreserve (owner can unreserve without code)';

-- ─── 2. Update Reserve Function with Code Support ─────────

drop function if exists reserve_wishlist_item(uuid, boolean, text, text, text);
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
  select w.user_id, coalesce(w.is_public, false) or (w.visibility = 'public')
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
      if not (p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') then
        raise exception 'Invalid email format';
      end if;
      if char_length(p_email) > 255 then
        raise exception 'Email too long (max 255 characters)';
      end if;
    end if;
    
    if p_name is not null then
      if char_length(p_name) > 100 then
        raise exception 'Name too long (max 100 characters)';
      end if;
    end if;
  end if;

  -- Generate 4-digit code when reserving
  if p_reserved then
    v_code := lpad(
      (
        ('x' || substr(encode(extensions.gen_random_bytes(2), 'hex'), 1, 4))::bit(16)::int
        % 10000
      )::text,
      4,
      '0'
    );
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

comment on function reserve_wishlist_item(uuid, boolean, text, text, text) is 
  'Reserve/unreserve wishlist items with confirmation codes. Public users need code to unreserve; owners can unreserve without code.';

-- ═════════════════════════════════════════════════════════════
-- Migration Complete
-- ═════════════════════════════════════════════════════════════
