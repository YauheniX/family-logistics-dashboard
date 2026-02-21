-- ════════════════════════════════════════════════════════════
-- Database Migration State Diagnostic
-- Run this in SQL Editor to check current state
-- ════════════════════════════════════════════════════════════

-- Check which tables exist
SELECT 
  'Table Existence Check' as check_type,
  tablename as name,
  'EXISTS' as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('families', 'family_members', 'households', 'members')
ORDER BY tablename;

-- Check for migration tracking
SELECT 
  'Applied Migrations' as check_type,
  version as name,
  name as status
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '010_create_households_schema',
  '011_migrate_families_to_households', 
  '016_finalize_household_rename',
  '017_atomic_household_creation'
)
ORDER BY version;

-- Check if RPC function exists
SELECT 
  'RPC Functions' as check_type,
  proname as name,
  'EXISTS' as status
FROM pg_proc 
WHERE proname IN (
  'user_is_family_member',
  'user_is_family_owner',
  'user_is_household_member',
  'user_is_household_owner',
  'create_household_with_owner'
)
ORDER BY proname;
