-- ════════════════════════════════════════════════════════════
-- Migration 031: Fix Wishlist Items Child Access
-- ════════════════════════════════════════════════════════════
-- Fixes bug in wishlist_items RLS policies to allow household
-- owner/admin to manage items in children's wishlists.
--
-- Problem: Migration 027 changed wishlist_items policies to use
-- w.user_id instead of joining with members table. This breaks
-- for child members without accounts (user_id=NULL).
--
-- Solution: Restore member_id-based checks from migration 013
-- and add household owner/admin access for managing children's wishlists.
-- ════════════════════════════════════════════════════════════

-- ─── 1. Fix wishlist_items_insert_v2 ──────────────────────────

drop policy if exists "wishlist_items_insert_v2" on wishlist_items;

create policy "wishlist_items_insert_v2"
  on wishlist_items for insert
  with check (
    exists (
      select 1 from wishlists w
      join members m on m.id = w.member_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
    or exists (
      select 1 from wishlists w
      join members m on m.household_id = w.household_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.is_active = true
    )
  );

comment on policy "wishlist_items_insert_v2" on wishlist_items is
  'Allow wishlist owner OR household owner/admin to add items';

-- ─── 2. Fix wishlist_items_update_v2 ──────────────────────────

drop policy if exists "wishlist_items_update_v2" on wishlist_items;

create policy "wishlist_items_update_v2"
  on wishlist_items for update
  using (
    exists (
      select 1 from wishlists w
      join members m on m.id = w.member_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
    or exists (
      select 1 from wishlists w
      join members m on m.household_id = w.household_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.is_active = true
    )
  );

comment on policy "wishlist_items_update_v2" on wishlist_items is
  'Allow wishlist owner OR household owner/admin to update items';

-- ─── 3. Fix wishlist_items_delete_v2 ──────────────────────────

drop policy if exists "wishlist_items_delete_v2" on wishlist_items;

create policy "wishlist_items_delete_v2"
  on wishlist_items for delete
  using (
    exists (
      select 1 from wishlists w
      join members m on m.id = w.member_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
    or exists (
      select 1 from wishlists w
      join members m on m.household_id = w.household_id
      where w.id = wishlist_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.is_active = true
    )
  );

comment on policy "wishlist_items_delete_v2" on wishlist_items is
  'Allow wishlist owner OR household owner/admin to delete items';

-- ─── 4. Verification ──────────────────────────────────────────

do $$
begin
  raise notice '';
  raise notice '✓ Migration 031 complete: wishlist_items policies updated';
  raise notice '  → Parents (owner/admin) can now manage children''s wishlist items';
  raise notice '  → Child members without accounts supported';
  raise notice '';
end $$;
