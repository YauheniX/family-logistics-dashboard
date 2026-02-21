-- ════════════════════════════════════════════════════════════
-- Fix Incomplete Migration State
-- Safe to run multiple times (idempotent)
-- ════════════════════════════════════════════════════════════

-- Add missing user_is_household_owner function
create or replace function public.user_is_household_owner(p_household_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    where m.household_id = p_household_id
      and m.user_id = p_user_id
      and m.role = 'owner'
      and m.is_active = true
  );
$$;

-- Ensure RLS policies are correct for households
drop policy if exists households_select on public.households;
create policy households_select on public.households for select
using (
  public.user_is_household_member(id, auth.uid())
  or created_by = auth.uid()
);

drop policy if exists households_insert on public.households;
create policy households_insert on public.households for insert
with check (created_by = auth.uid());

drop policy if exists households_update on public.households;
create policy households_update on public.households for update
using (public.user_is_household_owner(id, auth.uid()));

drop policy if exists households_delete on public.households;
create policy households_delete on public.households for delete
using (public.user_is_household_owner(id, auth.uid()));

-- Ensure RLS policies are correct for members
drop policy if exists members_select on public.members;
create policy members_select on public.members for select
using (public.user_is_household_member(household_id, auth.uid()));

drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert
with check (
  public.user_is_household_owner(household_id, auth.uid())
  or exists (
    select 1 from public.households
    where id = household_id and created_by = auth.uid()
  )
);

drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete
using (
  -- Owner can delete other members (but not themselves to prevent orphaned households)
  (public.user_is_household_owner(household_id, auth.uid()) and user_id != auth.uid())
  -- Non-owner members can delete themselves
  or (user_id = auth.uid() and not public.user_is_household_owner(household_id, auth.uid()))
);

-- Now add the atomic household creation RPC (SECURE VERSION)
create or replace function create_household_with_owner(
  p_name text,
  p_creator_display_name text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_member_id uuid;
  v_display_name text;
  v_creator_user_id uuid;
begin
  -- SECURITY: Get authenticated user from session (not from parameter)
  v_creator_user_id := auth.uid();
  if v_creator_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Determine display name: parameter > user profile > email prefix > fallback
  if p_creator_display_name is not null and trim(p_creator_display_name) <> '' then
    v_display_name := p_creator_display_name;
  else
    select coalesce(
      nullif(trim(raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(email, '@', 1), ''),
      'User'
    ) into v_display_name
    from auth.users
    where id = v_creator_user_id;
    
    -- Final fallback if user lookup fails
    if v_display_name is null then
      v_display_name := 'User';
    end if;
  end if;

  -- Create household
  insert into households (name, slug, created_by)
  values (
    p_name,
    generate_household_slug(p_name),
    v_creator_user_id
  )
  returning id into v_household_id;

  -- Create owner member record
  insert into members (household_id, user_id, display_name, role, is_owner)
  values (v_household_id, v_creator_user_id, v_display_name, 'parent', true)
  returning id into v_member_id;

  -- Optional: Log activity if function exists
  if to_regclass('public.activity_log') is not null then
    perform log_activity(
      'household_created',
      'households',
      v_household_id,
      jsonb_build_object('name', p_name, 'created_by_member', v_member_id)
    );
  end if;

  return json_build_object(
    'household_id', v_household_id,
    'member_id', v_member_id,
    'display_name', v_display_name
  );
end;
$$;

comment on function create_household_with_owner(text, text) is
  'Atomically create a household and add the creator as owner. SECURITY: Uses auth.uid() from session.';

-- SECURITY: Revoke execute from anonymous/public users
revoke execute on function create_household_with_owner(text, text) from public;
revoke execute on function create_household_with_owner(text, text) from anon;

-- Success message
do $$
begin
  raise notice '✅ Migration complete! Added:';
  raise notice '   • user_is_household_owner function';
  raise notice '   • Updated RLS policies';
  raise notice '   • create_household_with_owner RPC (SECURE VERSION with auth.uid())';
  raise notice '   ⚠️  NOTE: Function uses session auth - no user_id parameter needed';
end $$;
