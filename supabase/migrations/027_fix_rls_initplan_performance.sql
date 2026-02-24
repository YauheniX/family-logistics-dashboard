-- ════════════════════════════════════════════════════════════
-- Migration 027: Fix RLS Auth Function Re-evaluation (InitPlan)
-- ════════════════════════════════════════════════════════════
-- Addresses Supabase linter warning: auth_rls_initplan
-- 
-- Problem: RLS policies using auth.uid() or auth.jwt() without wrapping
-- in a scalar subquery (select auth.uid()) cause the function to be
-- re-evaluated for every row scanned.
--
-- Solution: Wrap all auth.<function>() calls with (select auth.<function>())
-- This allows PostgreSQL to evaluate once and reuse the value.
--
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ════════════════════════════════════════════════════════════

-- ─── 1. Update RLS Helper Functions ──────────────────────────
-- These SECURITY DEFINER functions also benefit from the optimization

create or replace function get_my_member_role(p_household_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role
  from members
  where household_id = p_household_id
    and user_id = (select auth.uid())
    and is_active = true
  limit 1;
$$;

create or replace function is_active_member_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from members
    where household_id = p_household_id
      and user_id = (select auth.uid())
      and is_active = true
  );
$$;

create or replace function is_owner_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from members
    where household_id = p_household_id
      and user_id = (select auth.uid())
      and role = 'owner'
      and is_active = true
  );
$$;

create or replace function is_owner_or_admin_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from members
    where household_id = p_household_id
      and user_id = (select auth.uid())
      and role in ('owner', 'admin')
      and is_active = true
  );
$$;

-- ─── 2. User Profiles Policies ───────────────────────────────

drop policy if exists "user_profiles_insert" on user_profiles;
create policy "user_profiles_insert"
  on user_profiles for insert
  with check (id = (select auth.uid()));

drop policy if exists "user_profiles_update" on user_profiles;
create policy "user_profiles_update"
  on user_profiles for update
  using (id = (select auth.uid()));

-- ─── 3. Households Policies ──────────────────────────────────

drop policy if exists "households_select" on households;
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

drop policy if exists "households_insert" on households;
create policy "households_insert"
  on households for insert
  with check ((select auth.uid()) is not null);

drop policy if exists "households_update" on households;
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

drop policy if exists "households_delete" on households;
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

-- ─── 4. Members Policies ─────────────────────────────────────
-- Note: These use helper functions that now also have the fix

drop policy if exists "members_select" on members;
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

drop policy if exists "members_insert" on members;
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

drop policy if exists "members_update" on members;
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

drop policy if exists "members_delete" on members;
create policy "members_delete"
  on members for delete
  using (
    public.is_owner_of_household(members.household_id)
  );

-- ─── 5. Invitations Policies ─────────────────────────────────

drop policy if exists "invitations_select" on invitations;
create policy "invitations_select"
  on invitations for select
  using (
    email = ((select auth.jwt()) ->> 'email')
    or exists (
      select 1 from members
      where household_id = invitations.household_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
        and is_active = true
    )
  );

drop policy if exists "invitations_insert" on invitations;
create policy "invitations_insert"
  on invitations for insert
  with check (
    public.is_owner_or_admin_of_household(invitations.household_id)
  );

drop policy if exists "invitations_update" on invitations;
create policy "invitations_update"
  on invitations for update
  using (
    public.is_owner_or_admin_of_household(invitations.household_id)
  );

-- ─── 6. Shopping Lists Policies (v2) ─────────────────────────

drop policy if exists "shopping_lists_select_v2" on shopping_lists;
create policy "shopping_lists_select_v2"
  on shopping_lists for select
  using (
    exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

drop policy if exists "shopping_lists_insert_v2" on shopping_lists;
create policy "shopping_lists_insert_v2"
  on shopping_lists for insert
  with check (
    exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

drop policy if exists "shopping_lists_update_v2" on shopping_lists;
create policy "shopping_lists_update_v2"
  on shopping_lists for update
  using (
    exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

drop policy if exists "shopping_lists_delete_v2" on shopping_lists;
create policy "shopping_lists_delete_v2"
  on shopping_lists for delete
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from members
      where household_id = shopping_lists.household_id
        and user_id = (select auth.uid())
        and is_active = true
        and role in ('owner', 'admin')
    )
  );

-- ─── 7. Shopping Items Policies (v2) ─────────────────────────

drop policy if exists "shopping_items_select_v2" on shopping_items;
create policy "shopping_items_select_v2"
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

drop policy if exists "shopping_items_insert_v2" on shopping_items;
create policy "shopping_items_insert_v2"
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

drop policy if exists "shopping_items_update_v2" on shopping_items;
create policy "shopping_items_update_v2"
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

drop policy if exists "shopping_items_delete_v2" on shopping_items;
create policy "shopping_items_delete_v2"
  on shopping_items for delete
  using (
    added_by = (select auth.uid())
    or exists (
      select 1 from shopping_lists sl
      join members m on m.household_id = sl.household_id
      where sl.id = shopping_items.list_id
        and m.user_id = (select auth.uid())
        and m.is_active = true
        and m.role in ('owner', 'admin')
    )
  );

-- ─── 8. Wishlists Policies (v2) ──────────────────────────────

drop policy if exists "wishlists_select_v2" on wishlists;
create policy "wishlists_select_v2"
  on wishlists for select
  using (
    user_id = (select auth.uid())
    or (
      visibility in ('household', 'public')
      and exists (
        select 1 from members
        where household_id = wishlists.household_id
          and user_id = (select auth.uid())
          and is_active = true
      )
    )
  );

drop policy if exists "wishlists_insert_v2" on wishlists;
create policy "wishlists_insert_v2"
  on wishlists for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "wishlists_update_v2" on wishlists;
create policy "wishlists_update_v2"
  on wishlists for update
  using (user_id = (select auth.uid()));

drop policy if exists "wishlists_delete_v2" on wishlists;
create policy "wishlists_delete_v2"
  on wishlists for delete
  using (user_id = (select auth.uid()));

-- ─── 9. Wishlist Items Policies (v2) ─────────────────────────

drop policy if exists "wishlist_items_select_v2" on wishlist_items;
create policy "wishlist_items_select_v2"
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

drop policy if exists "wishlist_items_insert_v2" on wishlist_items;
create policy "wishlist_items_insert_v2"
  on wishlist_items for insert
  with check (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "wishlist_items_update_owner" on wishlist_items;
drop policy if exists "wishlist_items_update_v2" on wishlist_items;
create policy "wishlist_items_update_v2"
  on wishlist_items for update
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = (select auth.uid())
    )
  );

drop policy if exists "wishlist_items_delete_v2" on wishlist_items;
create policy "wishlist_items_delete_v2"
  on wishlist_items for delete
  using (
    exists (
      select 1 from wishlists w
      where w.id = wishlist_id
        and w.user_id = (select auth.uid())
    )
  );

-- ─── 10. Activity Logs Policies ──────────────────────────────

drop policy if exists "activity_logs_select" on activity_logs;
create policy "activity_logs_select"
  on activity_logs for select
  using (
    exists (
      select 1 from members
      where household_id = activity_logs.household_id
        and user_id = (select auth.uid())
        and is_active = true
    )
  );

-- ─── 11. Verification ────────────────────────────────────────

do $$
declare
  v_policy_count integer;
begin
  -- Count policies using the optimized pattern
  select count(*) into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and (qual like '%select auth.uid()%' or with_check like '%select auth.uid()%');
  
  raise notice '';
  raise notice '═══════════════════════════════════════════════════════════════';
  raise notice 'Migration 027 Complete: RLS InitPlan Performance Fix';
  raise notice '═══════════════════════════════════════════════════════════════';
  raise notice '✓ Updated % policies with (select auth.uid()) optimization', v_policy_count;
  raise notice '✓ Updated 4 helper functions with same optimization';
  raise notice '';
  raise notice 'Impact: auth.uid() is now evaluated ONCE per query instead of';
  raise notice '        being re-evaluated for each row scanned.';
  raise notice '═══════════════════════════════════════════════════════════════';
end;
$$;
