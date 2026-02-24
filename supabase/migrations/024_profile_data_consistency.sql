-- Migration 024: Profile Data Consistency
-- Purpose: Ensure user_profiles exist for all auth.users and enforce profile data priority
-- Context: Fixes user profile inconsistency where Google OAuth data sometimes overrides local profiles

-- ============================================================
-- 1. Backfill missing user_profiles
-- ============================================================

-- Create user_profiles for any auth.users that don't have one
-- This handles edge cases where the trigger might have failed
insert into public.user_profiles (id, display_name, avatar_url)
select 
  au.id,
  coalesce(
    au.raw_user_meta_data ->> 'full_name',
    au.raw_user_meta_data ->> 'name',
    split_part(au.email, '@', 1),
    'User'
  ) as display_name,
  au.raw_user_meta_data ->> 'avatar_url' as avatar_url
from auth.users au
left join public.user_profiles up on up.id = au.id
where up.id is null
on conflict (id) do nothing;

-- ============================================================
-- 2. Update handle_new_user trigger to be more robust
-- ============================================================

-- Enhanced trigger that handles duplicate inserts gracefully
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Use ON CONFLICT to handle race conditions
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
      ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;  -- Don't overwrite existing profiles
  
  return new;
end;
$$;

comment on function handle_new_user is 
  'Auto-creates user profile on signup. Uses ON CONFLICT to prevent overwriting existing profiles.';

-- ============================================================
-- 3. Add helpful comments for profile resolution
-- ============================================================

comment on table user_profiles is 
  'User profiles with customizable display names and avatars. Local profile data takes priority over OAuth metadata. Use resolveUserProfile() utility in frontend for consistent display.';

comment on column user_profiles.display_name is 
  'User''s display name. Can be customized by user. Takes priority over OAuth metadata.';

comment on column user_profiles.avatar_url is 
  'User''s avatar URL. Can be uploaded by user. Takes priority over OAuth avatar.';

-- ============================================================
-- 4. Create a function to check profile consistency
-- ============================================================

create or replace function check_profile_consistency()
returns table(
  issue_type text,
  user_id uuid,
  email text,
  details text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Only allow authenticated users to run diagnostics
  -- This function returns sensitive data (emails) so restrict access
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Check for auth.users without user_profiles
  return query
  select 
    'missing_profile'::text as issue_type,
    au.id as user_id,
    au.email,
    'User has no profile entry'::text as details
  from auth.users au
  left join user_profiles up on up.id = au.id
  where up.id is null;
  
  -- Check for profiles with empty display names (shouldn't happen with new trigger)
  return query
  select 
    'empty_display_name'::text as issue_type,
    up.id as user_id,
    au.email,
    'Profile has empty display name'::text as details
  from user_profiles up
  join auth.users au on au.id = up.id
  where trim(up.display_name) = '';
end;
$$;

comment on function check_profile_consistency is 
  'Diagnostic function to check for profile data inconsistencies. ' ||
  'Run periodically to identify and fix data issues.';

-- ============================================================
-- 5. Grant necessary permissions
-- ============================================================

-- Users need to read profiles of other users (e.g., household members)
-- Note: RLS policy uses 'using (true)' which allows any authenticated user
-- to read any profile. This is intentional for displaying member names across
-- households, but should be reviewed for tighter security in the future.
grant select on user_profiles to authenticated;

-- Note: Anonymous users do NOT need access to user_profiles.
-- Public wishlists display only reserved_by_name field (stored in wishlist_items),
-- not data from user_profiles table.

-- RLS policies already handle write permissions
-- (See existing RLS policies for user_profiles)
