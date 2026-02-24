-- ════════════════════════════════════════════════════════════
-- Migration 028: Fix Public Wishlist Anonymous Access
-- ════════════════════════════════════════════════════════════
-- Problem: Public wishlists require authentication to view because
-- the RLS policy only allows access if:
--   1. User is the owner (user_id = auth.uid())
--   2. User is a household member
--
-- But anonymous users viewing a public share link have no auth.uid(),
-- so they get 0 rows returned.
--
-- Solution: Add `visibility = 'public'` as a top-level OR condition
-- so anyone (including anonymous users) can read public wishlists.
-- ════════════════════════════════════════════════════════════

-- ─── 1. Fix wishlists_select Policy ──────────────────────────
-- Allow anonymous access to public wishlists

drop policy if exists "wishlists_select" on wishlists;
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

-- ─── 2. Fix wishlists_select_v2 Policy ───────────────────────
-- Same fix for the v2 policy (if it exists from migration 019)

drop policy if exists "wishlists_select_v2" on wishlists;
create policy "wishlists_select_v2"
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

-- ─── 3. Add Index for Visibility Column ─────────────────────
-- Ensures optimal performance when filtering by visibility in RLS policies

create index if not exists idx_wishlists_visibility on wishlists (visibility);

-- ─── 4. Verification ─────────────────────────────────────────

do $$
begin
  raise notice '';
  raise notice '═══════════════════════════════════════════════════════════════';
  raise notice 'Migration 028 Complete: Public Wishlist Anonymous Access Fixed';
  raise notice '═══════════════════════════════════════════════════════════════';
  raise notice '✓ Public wishlists can now be viewed without authentication';
  raise notice '✓ Share links (/wishlist/:slug) now work for anonymous users';
  raise notice '✓ Added idx_wishlists_visibility index for RLS performance';
  raise notice '═══════════════════════════════════════════════════════════════';
end;
$$;
