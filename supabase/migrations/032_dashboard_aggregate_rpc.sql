-- ════════════════════════════════════════════════════════════
-- Migration 032: Dashboard Aggregate RPC
-- ════════════════════════════════════════════════════════════
-- Introduces a single RPC endpoint that returns all data
-- required by the Dashboard view in one round-trip.
--
-- BEFORE: 3 parallel Supabase queries per household change
--   1. GET /rest/v1/shopping_lists?household_id=…
--   2. GET /rest/v1/wishlists?user_id=…&household_id=…  (personal)
--   3. GET /rest/v1/wishlists?household_id=…&visibility=…  (shared)
--
-- AFTER:  1 RPC call
--   POST /rest/v1/rpc/get_dashboard_summary
--
-- Benchmark notes (estimated, based on typical Supabase latency):
--   Before: ~3 × 20–50 ms = 60–150 ms elapsed (parallel, but 3 TCP connections)
--   After:  ~1 × 25–60 ms = 25–60 ms elapsed (single server-side join)
--   Expected reduction: ~50–60 % in total dashboard load latency
--
-- Security guarantees:
--   • SECURITY DEFINER with SET search_path = public (CWE-427 mitigation)
--   • auth.uid() verified at runtime (authentication check)
--   • p_user_id must equal auth.uid() (prevents cross-user data leakage)
--   • Explicit EXISTS membership check (multi-tenant isolation)
-- ════════════════════════════════════════════════════════════

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
  v_member_id          uuid;
  v_shopping_lists     jsonb;
  v_my_wishlists       jsonb;
  v_household_wishlists jsonb;
begin
  -- ── Authentication ────────────────────────────────────────────
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = 'P0001';
  end if;

  -- ── Prevent cross-user data access ───────────────────────────
  if auth.uid() <> p_user_id then
    raise exception 'Unauthorized: cannot query data for another user'
      using errcode = 'P0001';
  end if;

  -- ── Household membership check ───────────────────────────────
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

  -- ── Resolve caller's member_id (for wishlist exclusion) ──────
  select id
  into   v_member_id
  from   members
  where  household_id = p_household_id
    and  user_id      = p_user_id
    and  is_active    = true
  limit  1;

  -- ── Shopping lists (all statuses, newest first) ───────────────
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

  -- ── Personal wishlists (current user, non-child role) ────────
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',          w.id,
        'user_id',     w.user_id,
        'member_id',   w.member_id,
        'household_id', w.household_id,
        'title',       w.title,
        'description', w.description,
        'visibility',  w.visibility,
        'share_slug',  w.share_slug,
        'created_at',  w.created_at,
        'updated_at',  w.updated_at,
        'member_name', m.display_name,
        'is_public',   (w.visibility = 'public')
      ) order by w.created_at desc
    ),
    '[]'::jsonb
  )
  into  v_my_wishlists
  from  wishlists w
  left  join members m on m.id = w.member_id
  where w.user_id      = p_user_id
    and w.household_id = p_household_id
    and coalesce(m.role, 'member') <> 'child';

  -- ── Household wishlists (other members' shared wishlists) ────
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',          w.id,
        'user_id',     w.user_id,
        'member_id',   w.member_id,
        'household_id', w.household_id,
        'title',       w.title,
        'description', w.description,
        'visibility',  w.visibility,
        'share_slug',  w.share_slug,
        'created_at',  w.created_at,
        'updated_at',  w.updated_at,
        'member_name', m.display_name,
        'is_public',   (w.visibility = 'public')
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
    and w.user_id      is distinct from p_user_id;

  -- ── Return aggregate ─────────────────────────────────────────
  return jsonb_build_object(
    'shopping_lists',      v_shopping_lists,
    'my_wishlists',        v_my_wishlists,
    'household_wishlists', v_household_wishlists
  );
end;
$$;

comment on function get_dashboard_summary(uuid, uuid) is
  'Single-call dashboard aggregate: returns shopping_lists, my_wishlists, and '
  'household_wishlists for the given household scoped to the authenticated user. '
  'Reduces dashboard round-trips from 3 to 1. '
  'Security: SECURITY DEFINER + search_path guard + auth.uid() == p_user_id check + membership check.';

-- ═════════════════════════════════════════════════════════════
-- END OF MIGRATION 032
-- ═════════════════════════════════════════════════════════════
do $$
begin
  raise notice '✅ Migration 032: get_dashboard_summary RPC created';
  raise notice '   Reduces dashboard round-trips from 3 → 1';
end $$;
