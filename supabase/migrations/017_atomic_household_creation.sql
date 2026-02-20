-- ════════════════════════════════════════════════════════════
-- Migration 017: Atomic Household Creation with Owner
-- ════════════════════════════════════════════════════════════
-- Creates an RPC function to atomically create a household and 
-- the owner member record in a single transaction, preventing 
-- orphaned household records.
-- ════════════════════════════════════════════════════════════

-- ─── RPC: Create Household with Owner ────────────────────────

create or replace function create_household_with_owner(
  p_name text,
  p_creator_user_id uuid,
  p_creator_display_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_member_id uuid;
  v_slug text;
  v_display_name text;
begin
  -- Validate inputs
  if p_name is null or char_length(trim(p_name)) < 1 then
    raise exception 'Household name is required'
      using errcode = 'P0001';
  end if;

  if char_length(trim(p_name)) > 100 then
    raise exception 'Household name must be 100 characters or less'
      using errcode = 'P0001';
  end if;

  if p_creator_user_id is null then
    raise exception 'Creator user ID is required'
      using errcode = 'P0001';
  end if;

  -- Verify the creator user exists
  if not exists(select 1 from auth.users where id = p_creator_user_id) then
    raise exception 'Creator user does not exist'
      using errcode = 'P0001';
  end if;

  -- Generate a unique slug
  v_slug := generate_household_slug(p_name);

  -- Get display name for the owner member
  -- Use provided name, or fall back to user profile, or email prefix
  if p_creator_display_name is not null and char_length(trim(p_creator_display_name)) > 0 then
    v_display_name := trim(p_creator_display_name);
  else
    -- Try to get from user_profiles
    select display_name into v_display_name
    from user_profiles
    where id = p_creator_user_id;
    
    -- If still null, use email prefix
    if v_display_name is null then
      select split_part(email, '@', 1) into v_display_name
      from auth.users
      where id = p_creator_user_id;
    end if;
  end if;

  -- Start atomic transaction
  -- Insert household
  insert into households (
    name,
    slug,
    created_by,
    is_active
  ) values (
    trim(p_name),
    v_slug,
    p_creator_user_id,
    true
  )
  returning id into v_household_id;

  -- Insert owner member
  insert into members (
    household_id,
    user_id,
    role,
    display_name,
    is_active
  ) values (
    v_household_id,
    p_creator_user_id,
    'owner',
    v_display_name,
    true
  )
  returning id into v_member_id;

  -- Log activity (best-effort; do not abort transaction on logging failure)
  begin
    perform log_activity(
      v_household_id,
      v_member_id,
      'household_created',
      'household',
      v_household_id,
      jsonb_build_object('name', trim(p_name))
    );
  exception
    when others then
      -- Prevent logging failures from rolling back household creation
      raise notice 'log_activity failed in create_household_with_owner: %', sqlerrm;
  end;

  -- Return both IDs as JSON
  return jsonb_build_object(
    'household_id', v_household_id,
    'member_id', v_member_id,
    'household_name', trim(p_name),
    'slug', v_slug
  );
end;
$$;

comment on function create_household_with_owner(text, uuid, text) is
  'Atomically create a household and add the creator as owner in a single transaction. Prevents orphaned household records.';

-- ─── Grant Permissions ────────────────────────────────────────

-- Allow authenticated users to call this function
grant execute on function create_household_with_owner(text, uuid, text) to authenticated;
