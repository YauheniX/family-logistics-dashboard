-- ════════════════════════════════════════════════════════════
-- Migration 033: Fix child wishlist visibility in dashboard RPC
-- ════════════════════════════════════════════════════════════
-- Problem:
--   Household wishlists in get_dashboard_summary excluded rows by user_id,
--   which hid child/member wishlists created under the same account.
--
-- Fix:
--   Exclude only the caller's own member wishlist (v_member_id), while
--   still excluding legacy self-owned rows with member_id IS NULL.
--   This keeps child wishlists visible when they have a different member_id.

create or replace function get_dashboard_summary(
  p_household_id uuid,
  p_user_id      uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_member_id           uuid;
  v_shopping_lists      jsonb;
  v_household_wishlists jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = 'P0001';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized: cannot query data for another user'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from members
    where household_id = p_household_id
      and user_id      = p_user_id
      and is_active    = true
  ) then
    raise exception 'User is not an active member of this household'
      using errcode = 'P0001';
  end if;

  select id
  into   v_member_id
  from   members
  where  household_id = p_household_id
    and  user_id      = p_user_id
    and  is_active    = true
  limit  1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',                   sl.id,
        'household_id',         sl.household_id,
        'title',                sl.title,
        'description',          sl.description,
        'status',               sl.status,
        'created_by',           sl.created_by,
        'created_by_member_id', sl.created_by_member_id,
        'created_at',           sl.created_at,
        'updated_at',           sl.updated_at
      ) order by sl.created_at desc
    ),
    '[]'::jsonb
  )
  into  v_shopping_lists
  from  shopping_lists sl
  where sl.household_id = p_household_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',           w.id,
        'user_id',      w.user_id,
        'member_id',    w.member_id,
        'household_id', w.household_id,
        'title',        w.title,
        'description',  w.description,
        'visibility',   w.visibility,
        'share_slug',   w.share_slug,
        'created_at',   w.created_at,
        'updated_at',   w.updated_at,
        'member_name',  m.display_name,
        'is_public',    (w.visibility = 'public')
      ) order by w.created_at desc
    ),
    '[]'::jsonb
  )
  into  v_household_wishlists
  from  wishlists w
  left  join members m on m.id = w.member_id
  where w.household_id = p_household_id
    and w.visibility   in ('household', 'public')
    and w.member_id    is distinct from v_member_id
    and (w.member_id is not null or w.user_id is distinct from p_user_id);

  return jsonb_build_object(
    'shopping_lists',      v_shopping_lists,
    'household_wishlists', v_household_wishlists
  );
end;
$$;

comment on function get_dashboard_summary(uuid, uuid) is
  'Single-call dashboard aggregate: returns shopping_lists and '
  'household_wishlists for the given household scoped to the authenticated user. '
  'Child/member wishlists created by the same user account remain visible. '
  'Security: SECURITY DEFINER + search_path guard + auth.uid() == p_user_id check + membership check.';

do $$
begin
  raise notice '✅ Migration 033: fixed child wishlist visibility in get_dashboard_summary';
end $$;
