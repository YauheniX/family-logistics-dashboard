-- ════════════════════════════════════════════════════════════
-- Verify Migration Success
-- Run this to confirm everything is working
-- ════════════════════════════════════════════════════════════

-- 1. Check RPC function exists
SELECT 
  proname as function_name,
  'EXISTS ✅' as status
FROM pg_proc 
WHERE proname = 'create_household_with_owner';

-- 2. Check all required functions
SELECT 
  proname as function_name,
  'EXISTS ✅' as status
FROM pg_proc 
WHERE proname IN (
  'user_is_household_member',
  'user_is_household_owner',
  'create_household_with_owner',
  'generate_household_slug'
)
ORDER BY proname;

-- 3. Check RLS policies on households
SELECT 
  schemaname,
  tablename,
  policyname,
  'ACTIVE ✅' as status
FROM pg_policies
WHERE tablename IN ('households', 'members')
ORDER BY tablename, policyname;

-- 4. Count existing data
SELECT 
  'households' as table_name,
  count(*) as record_count
FROM households
UNION ALL
SELECT 
  'members' as table_name,
  count(*) as record_count
FROM members;
