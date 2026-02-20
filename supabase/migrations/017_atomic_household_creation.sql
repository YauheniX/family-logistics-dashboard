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
  v_creator_user_id uuid;
begin
  -- Get authenticated user ID
  v_creator_user_id := auth.uid();
  
  if v_creator_user_id is null then
    raise exception 'Authentication required'
      using errcode = 'P0001';
  end if;

  -- Validate inputs
  if p_name is null or char_length(trim(p_name)) < 1 then
    raise exception 'Household name is required'
      using errcode = 'P0001';
  end if;

  if char_length(trim(p_name)) > 100 then
    raise exception 'Household name must be 100 characters or less'
      using errcode = 'P0001';
  end if;

  -- Generate a unique slug
  v_slug := generate_household_slug(p_name);

  -- Get display name for the owner member
  -- Use provided name, or fall back to user profile, or email prefix, or generate from user ID
  if p_creator_display_name is not null and char_length(trim(p_creator_display_name)) > 0 then
    v_display_name := trim(p_creator_display_name);
  else
    -- Try to get from user_profiles
    select display_name into v_display_name
    from user_profiles
    where id = v_creator_user_id;
    
    -- Check if still null or empty
    if v_display_name is null or char_length(trim(v_display_name)) = 0 then
      -- Try email prefix
      select split_part(email, '@', 1) into v_display_name
      from auth.users
      where id = v_creator_user_id;
      
      -- Final fallback: generate from user ID
      if v_display_name is null or char_length(trim(v_display_name)) = 0 then
        v_display_name := 'user_' || substring(v_creator_user_id::text from 1 for 8);
      end if;
    end if;
  end if;

  -- Insert household and owner member within function scope
  -- Atomicity provided by being within a single PL/pgSQL function body
  -- Insert household
  insert into households (
    name,
    slug,
    created_by,
    is_active
  ) values (
    trim(p_name),
    v_slug,
    v_creator_user_id,
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
    v_creator_user_id,
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

comment on function create_household_with_owner(text, text) is
  'Atomically create a household and add the creator as owner in a single transaction. Prevents orphaned household records.';

-- ─── Grant Permissions ────────────────────────────────────────

-- Revoke from public and anon for security
revoke execute on function create_household_with_owner(text, text) from public;
revoke execute on function create_household_with_owner(text, text) from anon;

-- Allow authenticated users to call this function
grant execute on function create_household_with_owner(text, text) to authenticated;
