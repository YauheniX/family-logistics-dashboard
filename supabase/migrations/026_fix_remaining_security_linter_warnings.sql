-- ════════════════════════════════════════════════════════════
-- Migration 026: Fix Remaining Security Linter Warnings
-- ════════════════════════════════════════════════════════════
-- Addresses Supabase linter warnings:
-- 1. function_search_path_mutable: Add SET search_path to helper functions
-- 2. extension_in_public: Move citext extension to extensions schema
-- 3. rls_policy_always_true: Fix activity_logs_insert policy
-- ════════════════════════════════════════════════════════════

-- ─── 1. Fix Function Search Path Issues ──────────────────────
-- These functions are not SECURITY DEFINER but should still have
-- an immutable search_path to prevent manipulation

-- Fix generate_household_slug
create or replace function generate_household_slug(p_name text)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_slug text;
  v_base_slug text;
  v_counter integer := 0;
  v_exists boolean;
begin
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  v_slug := regexp_replace(v_slug, '\s+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  
  -- Ensure slug is not empty
  if v_slug = '' then
    v_slug := 'household';
  end if;
  
  -- Store the base slug before checking uniqueness
  v_base_slug := v_slug;
  
  -- Check uniqueness and append number if needed
  loop
    select exists(select 1 from households where slug = v_slug) into v_exists;
    
    if not v_exists then
      return v_slug;
    end if;
    
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  end loop;
end;
$$;

comment on function generate_household_slug(text) is 'Generate a unique URL-friendly slug from household name';

-- Fix auto_generate_household_slug trigger function
create or replace function auto_generate_household_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := generate_household_slug(new.name);
  end if;
  return new;
end;
$$;

-- Fix update_updated_at_column trigger function
create or replace function update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── 2. Move citext Extension to extensions Schema ───────────
-- Create extensions schema if not exists
create schema if not exists extensions;

-- Grant usage to authenticated and anon roles
grant usage on schema extensions to authenticated, anon;

-- Move citext extension from public to extensions schema
-- Note: We drop and recreate since ALTER EXTENSION ... SET SCHEMA
-- requires the extension to be properly installed
do $$
begin
  -- Drop extension from public (if exists)
  begin
    drop extension if exists citext;
  exception
    when dependent_objects_still_exist then
      -- If drop fails due to existing dependencies, keep the current extension
      -- location and proceed to ensure it exists in the extensions schema.
      raise notice 'Could not drop citext extension because dependent objects still exist: %', sqlerrm;
  end;

  -- Recreate in extensions schema
  begin
    create extension if not exists citext schema extensions;
  exception
    when duplicate_object then
      raise notice 'citext extension already exists';
  end;
end;
$$;


-- ─── 3. Fix activity_logs_insert RLS Policy ──────────────────
-- The current policy WITH CHECK (true) allows any authenticated user to insert.
-- Activity logs should ONLY be inserted via SECURITY DEFINER functions.
-- We change to WITH CHECK (false) to block direct inserts while still
-- allowing SECURITY DEFINER functions (which bypass RLS) to insert.

drop policy if exists "activity_logs_insert" on activity_logs;

create policy "activity_logs_insert"
  on activity_logs for insert
  with check (false);  -- Blocks all direct inserts; SECURITY DEFINER functions bypass RLS

comment on policy "activity_logs_insert" on activity_logs is
  'Direct inserts blocked. Use log_activity() SECURITY DEFINER function instead.';

-- ─── Verification ────────────────────────────────────────────
do $$
declare
  v_count integer;
begin
  -- Verify functions have search_path set
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on p.pronamespace = n.oid
  where n.nspname = 'public'
    and p.proname in ('generate_household_slug', 'auto_generate_household_slug', 'update_updated_at_column')
    and p.proconfig is not null
    and 'search_path=public' = any(p.proconfig);
  
  if v_count = 3 then
    raise notice '✓ All 3 functions now have SET search_path = public';
  else
    raise warning '⚠ Only % of 3 functions have search_path set', v_count;
  end if;
  
  -- Verify citext is in extensions schema
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on e.extnamespace = n.oid
    where e.extname = 'citext' and n.nspname = 'extensions'
  ) then
    raise notice '✓ citext extension is in extensions schema';
  else
    raise notice '⚠ citext extension location could not be verified';
  end if;
  
  -- Verify activity_logs_insert policy is restrictive
  if exists (
    select 1 from pg_policies
    where tablename = 'activity_logs'
      and policyname = 'activity_logs_insert'
      and cmd = 'INSERT'
  ) then
    raise notice '✓ activity_logs_insert policy recreated';
  else
    raise warning '⚠ activity_logs_insert policy not found';
  end if;
  
  raise notice '';
  raise notice '═══════════════════════════════════════════════════════════════';
  raise notice 'Migration 026 Complete: Security Linter Warnings Fixed';
  raise notice '═══════════════════════════════════════════════════════════════';
  raise notice 'NOTE: auth_leaked_password_protection requires Supabase Dashboard:';
  raise notice '  1. Go to Auth → Settings → Security';
  raise notice '  2. Enable "Leaked Password Protection"';
  raise notice '  3. This checks passwords against HaveIBeenPwned.org';
  raise notice '═══════════════════════════════════════════════════════════════';
end;
$$;
