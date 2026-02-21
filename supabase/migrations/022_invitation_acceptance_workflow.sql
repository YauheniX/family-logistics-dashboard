-- ════════════════════════════════════════════════════════════
-- Migration 022: Invitation Acceptance Workflow (No Email)
-- ════════════════════════════════════════════════════════════
-- Adds RPC functions for users to accept/decline invitations
-- directly in the app without email notification system.
-- ════════════════════════════════════════════════════════════

-- ─── 1. RPC: Get Pending Invitations for Current User ───────

create or replace function get_my_pending_invitations()
returns table (
  id uuid,
  household_id uuid,
  household_name text,
  email text,
  role text,
  invited_by_name text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_email text;
begin
  -- Get current user's email
  select email into v_user_email
  from auth.users
  where id = auth.uid();

  if v_user_email is null then
    raise exception 'User not found'
      using errcode = 'P0001';
  end if;

  -- Return pending invitations for this email that haven't expired
  return query
  select 
    i.id,
    i.household_id,
    h.name as household_name,
    i.email,
    i.role,
    m.display_name as invited_by_name,
    i.expires_at,
    i.created_at
  from invitations i
  inner join households h on h.id = i.household_id
  inner join members m on m.id = i.invited_by
  where i.email = lower(trim(v_user_email))
    and i.status = 'pending'
    and i.expires_at > now()
  order by i.created_at desc;
end;
$$;

comment on function get_my_pending_invitations() is
  'Get all pending (non-expired) invitations for the current user';

-- ─── 2. RPC: Accept Invitation ──────────────────────────────

create or replace function accept_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invitation record;
  v_user_email text;
  v_member_id uuid;
begin
  -- Get current user's email
  select email into v_user_email
  from auth.users
  where id = auth.uid();

  if v_user_email is null then
    raise exception 'User not found'
      using errcode = 'P0001';
  end if;

  -- Get invitation details
  select * into v_invitation
  from invitations
  where id = p_invitation_id
    and status = 'pending';

  if not found then
    raise exception 'Invitation not found or already processed'
      using errcode = 'P0001';
  end if;

  -- Verify invitation is for this user's email
  if lower(trim(v_invitation.email)) != lower(trim(v_user_email)) then
    raise exception 'This invitation is not for your email address'
      using errcode = 'P0001';
  end if;

  -- Check if invitation has expired
  if v_invitation.expires_at <= now() then
    -- Update status to expired
    update invitations
    set status = 'expired'
    where id = p_invitation_id;

    raise exception 'This invitation has expired'
      using errcode = 'P0001';
  end if;

  -- Check if user is already a member of this household
  if exists (
    select 1 from members
    where household_id = v_invitation.household_id
      and user_id = auth.uid()
      and is_active = true
  ) then
    raise exception 'You are already a member of this household'
      using errcode = 'P0001';
  end if;

  -- Create member record
  insert into members (
    household_id,
    user_id,
    role,
    display_name,
    invited_by
  ) values (
    v_invitation.household_id,
    auth.uid(),
    v_invitation.role,
    coalesce(
      (select display_name from user_profiles where id = auth.uid()),
      split_part(v_user_email, '@', 1) -- Default to email prefix
    ),
    v_invitation.invited_by
  )
  returning id into v_member_id;

  -- Update invitation status
  update invitations
  set status = 'accepted',
      accepted_at = now()
  where id = p_invitation_id;

  -- Log activity
  perform log_activity(
    v_invitation.household_id,
    v_member_id,
    'invitation_accepted',
    'invitation',
    p_invitation_id,
    jsonb_build_object('email', v_user_email, 'role', v_invitation.role)
  );

  return v_member_id;
end;
$$;

comment on function accept_invitation(uuid) is
  'Accept an invitation and create member record. Only the invited user can accept.';

-- ─── 3. RPC: Decline Invitation ─────────────────────────────

create or replace function decline_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invitation record;
  v_user_email text;
begin
  -- Get current user's email
  select email into v_user_email
  from auth.users
  where id = auth.uid();

  if v_user_email is null then
    raise exception 'User not found'
      using errcode = 'P0001';
  end if;

  -- Get invitation details
  select * into v_invitation
  from invitations
  where id = p_invitation_id
    and status = 'pending';

  if not found then
    raise exception 'Invitation not found or already processed'
      using errcode = 'P0001';
  end if;

  -- Verify invitation is for this user's email
  if lower(trim(v_invitation.email)) != lower(trim(v_user_email)) then
    raise exception 'This invitation is not for your email address'
      using errcode = 'P0001';
  end if;

  -- Update invitation status
  update invitations
  set status = 'declined'
  where id = p_invitation_id;

  -- Log activity
  perform log_activity(
    v_invitation.household_id,
    v_invitation.invited_by,
    'invitation_declined',
    'invitation',
    p_invitation_id,
    jsonb_build_object('email', v_user_email)
  );

  return true;
end;
$$;

comment on function decline_invitation(uuid) is
  'Decline an invitation. Only the invited user can decline.';

-- ─── 4. Function: Auto-Expire Old Invitations ───────────────

create or replace function expire_old_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count integer;
begin
  -- Update all pending invitations that have expired
  update invitations
  set status = 'expired'
  where status = 'pending'
    and expires_at <= now();

  get diagnostics v_expired_count = row_count;

  return v_expired_count;
end;
$$;

comment on function expire_old_invitations() is
  'Mark all expired pending invitations as expired. Returns count of expired invitations.';
