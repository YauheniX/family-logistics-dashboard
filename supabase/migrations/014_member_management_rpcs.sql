-- ════════════════════════════════════════════════════════════
-- Migration 014: Member Management RPCs & Enhanced RLS
-- ════════════════════════════════════════════════════════════
-- Adds RPC functions for member creation and invitation,
-- account activation workflow, and enhanced RLS policies.
-- ════════════════════════════════════════════════════════════

-- ─── 1. RPC: Create Child Member ─────────────────────────────

create or replace function create_child_member(
  p_household_id uuid,
  p_name text,
  p_date_of_birth date,
  p_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_member_id uuid;
begin
  -- Check caller is owner or admin
  v_caller_role := get_member_role(p_household_id, auth.uid());

  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'Only owner or admin can add child members'
      using errcode = 'P0001';
  end if;

  -- Validate name
  if p_name is null or char_length(trim(p_name)) < 1 then
    raise exception 'Child name is required'
      using errcode = 'P0001';
  end if;

  -- Validate date of birth
  if p_date_of_birth is null then
    raise exception 'Date of birth is required for child members'
      using errcode = 'P0001';
  end if;

  -- Insert child member (user_id is null for children)
  insert into members (
    household_id,
    user_id,
    role,
    display_name,
    date_of_birth,
    avatar_url,
    invited_by
  ) values (
    p_household_id,
    null,
    'child',
    trim(p_name),
    p_date_of_birth,
    p_avatar_url,
    get_member_id(p_household_id, auth.uid())
  )
  returning id into v_member_id;

  -- Log activity
  perform log_activity(
    p_household_id,
    get_member_id(p_household_id, auth.uid()),
    'member_added',
    'member',
    v_member_id,
    jsonb_build_object('role', 'child', 'name', trim(p_name))
  );

  return v_member_id;
end;
$$;

comment on function create_child_member(uuid, text, date, text) is
  'Create a child member in a household (no user account). Only owner/admin can call.';

-- ─── 2. RPC: Invite Member ──────────────────────────────────

create or replace function invite_member(
  p_household_id uuid,
  p_email text,
  p_role text default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_invitation_id uuid;
  v_token text;
  v_existing_user_id uuid;
  v_caller_member_id uuid;
begin
  -- Check caller is owner or admin
  v_caller_role := get_member_role(p_household_id, auth.uid());

  if v_caller_role is null or v_caller_role not in ('owner', 'admin') then
    raise exception 'Only owner or admin can invite members'
      using errcode = 'P0001';
  end if;

  -- Validate role (cannot invite as owner or child)
  if p_role not in ('admin', 'member', 'viewer') then
    raise exception 'Invalid role for invitation. Must be admin, member, or viewer.'
      using errcode = 'P0001';
  end if;

  -- Validate email format
  if p_email is null or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Invalid email address'
      using errcode = 'P0001';
  end if;

  -- Check if user already exists and is already a member
  select id into v_existing_user_id
  from auth.users
  where email = lower(trim(p_email));

  if v_existing_user_id is not null then
    -- Check if already a member of this household
    if exists (
      select 1 from members
      where household_id = p_household_id
        and user_id = v_existing_user_id
        and is_active = true
    ) then
      raise exception 'User is already a member of this household'
        using errcode = 'P0001';
    end if;
  end if;

  -- Check for existing pending invitation
  if exists (
    select 1 from invitations
    where household_id = p_household_id
      and email = lower(trim(p_email))
      and status = 'pending'
      and expires_at > now()
  ) then
    raise exception 'An invitation is already pending for this email'
      using errcode = 'P0001';
  end if;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_caller_member_id := get_member_id(p_household_id, auth.uid());

  -- Create invitation
  insert into invitations (
    household_id,
    email,
    role,
    invited_by,
    token,
    expires_at
  ) values (
    p_household_id,
    lower(trim(p_email)),
    p_role,
    v_caller_member_id,
    v_token,
    now() + interval '7 days'
  )
  returning id into v_invitation_id;

  -- Log activity
  perform log_activity(
    p_household_id,
    v_caller_member_id,
    'member_invited',
    'invitation',
    v_invitation_id,
    jsonb_build_object('email', lower(trim(p_email)), 'role', p_role)
  );

  return v_invitation_id;
end;
$$;

comment on function invite_member(uuid, text, text) is
  'Invite a member to a household by email. Only owner/admin can call.';

-- ─── 3. RPC: Activate Child Account ────────────────────────

create or replace function activate_child_account(
  p_member_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  -- Get the member record
  select * into v_member
  from members
  where id = p_member_id
    and is_active = true;

  if not found then
    raise exception 'Member not found'
      using errcode = 'P0001';
  end if;

  -- Must be a child member
  if v_member.role != 'child' then
    raise exception 'Only child members can be activated'
      using errcode = 'P0001';
  end if;

  -- Must not already have a user_id linked
  if v_member.user_id is not null then
    raise exception 'Member already has an account linked'
      using errcode = 'P0001';
  end if;

  -- Prevent duplicate user in the same household
  if exists (
    select 1 from members
    where household_id = v_member.household_id
      and user_id = p_user_id
      and is_active = true
  ) then
    raise exception 'User is already a member of this household'
      using errcode = 'P0001';
  end if;

  -- Link the user account and upgrade to member role
  update members
  set user_id = p_user_id,
      role = 'member',
      metadata = metadata || jsonb_build_object(
        'activated_at', now()::text,
        'previous_role', 'child'
      )
  where id = p_member_id;

  -- Log activity
  perform log_activity(
    v_member.household_id,
    p_member_id,
    'account_activated',
    'member',
    p_member_id,
    jsonb_build_object(
      'previous_role', 'child',
      'new_role', 'member'
    )
  );

  return true;
end;
$$;

comment on function activate_child_account(uuid, uuid) is
  'Link a user account to an existing child member and upgrade role to member';

-- ─── 4. Enhanced RLS: Child members can only see themselves and other children ──

-- Drop the existing members_select policy and replace with enhanced version
drop policy if exists "members_select" on members;

create policy "members_select"
  on members for select
  using (
    -- User can always see their own member record
    user_id = auth.uid()
    or (
      -- Members of same household can see each other
      household_id in (
        select m.household_id from members m
        where m.user_id = auth.uid()
          and m.is_active = true
          -- Child members with restricted visibility cannot see others
          and m.role != 'child'
      )
    )
    or (
      -- Child members can still see themselves (handled above) and
      -- household members with child role can see other children in same household
      -- for parent views
      household_id in (
        select m.household_id from members m
        where m.user_id = auth.uid()
          and m.is_active = true
          and m.role = 'child'
      )
      and role = 'child'
    )
  );

-- ─── 5. Enhanced RLS: Only owner can delete members ─────────

drop policy if exists "members_delete" on members;

create policy "members_delete"
  on members for delete
  using (
    -- Only owner can delete members (not self-removal anymore for safety)
    exists (
      select 1 from members m
      where m.household_id = members.household_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
        and m.is_active = true
    )
  );
