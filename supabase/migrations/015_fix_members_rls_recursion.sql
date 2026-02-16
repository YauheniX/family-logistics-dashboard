-- ════════════════════════════════════════════════════════════
-- Migration 015: Fix RLS recursion for members
-- ════════════════════════════════════════════════════════════
-- Problem:
--   Policies on "members" referenced "members" in subqueries.
--   Postgres detects this as infinite recursion and rejects queries with:
--   "infinite recursion detected in policy for relation members".
--
-- Fix:
--   Use SECURITY DEFINER helper functions (owned by migration role) to check
--   membership/role, and keep policies themselves free of direct self-joins.

-- Helper: return caller's role in a household (or null if not a member)
create or replace function public.get_my_member_role(p_household_id uuid)
returns text
language sql
security definer
stable
set search_path = public, extensions
as $$
  select role
  from public.members
  where household_id = p_household_id
    and user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

-- Helper: is caller an active member of a household?
create or replace function public.is_active_member_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.members
    where household_id = p_household_id
      and user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.is_owner_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.members
    where household_id = p_household_id
      and user_id = auth.uid()
      and role = 'owner'
      and is_active = true
  );
$$;

create or replace function public.is_owner_or_admin_of_household(p_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.members
    where household_id = p_household_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
      and is_active = true
  );
$$;

-- Replace members policies
drop policy if exists "members_select" on public.members;
drop policy if exists "members_insert" on public.members;
drop policy if exists "members_update" on public.members;
drop policy if exists "members_delete" on public.members;

-- SELECT:
-- - user can always see their own member row
-- - if caller is not a child: can see all members in the household
-- - if caller is a child: can only see other children in the same household
create policy "members_select"
  on public.members for select
  using (
    user_id = auth.uid()
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
  on public.members for insert
  with check (
    public.is_owner_or_admin_of_household(members.household_id)
    or (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1
        from public.households h
        where h.id = members.household_id
          and h.created_by = auth.uid()
      )
    )
  );

-- UPDATE:
-- - owner/admin can update household members
-- - user can update their own member row
create policy "members_update"
  on public.members for update
  using (
    user_id = auth.uid()
    or public.is_owner_or_admin_of_household(members.household_id)
  )
  with check (
    user_id = auth.uid()
    or public.is_owner_or_admin_of_household(members.household_id)
  );

-- DELETE:
-- - only owner can delete members
create policy "members_delete"
  on public.members for delete
  using (
    public.is_owner_of_household(members.household_id)
  );
