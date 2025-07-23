-- Test script to verify RLS policies are working correctly
-- This script can be run in Supabase SQL editor to test the fixes

-- 1. Verify RLS is enabled on knowledge_base
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'knowledge_base';

-- 2. Check existing RLS policies on knowledge_base
SELECT 
    pol.polname as policy_name,
    pol.polcmd as policy_command,
    pol.polroles as policy_roles,
    pol.polqual as policy_qual,
    pol.polwithcheck as policy_with_check
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'knowledge_base' AND pn.nspname = 'public';

-- 3. Test public read access to active knowledge base entries
-- This should work for unauthenticated users
SELECT id, category, title, is_active 
FROM knowledge_base 
WHERE is_active = true 
LIMIT 5;

-- 4. Verify views exist and are accessible
SELECT COUNT(*) as daily_stats_count FROM daily_session_stats;
SELECT COUNT(*) as popular_questions_count FROM popular_questions;

-- 5. Check that SECURITY DEFINER is not set on views
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE viewname IN ('daily_session_stats', 'popular_questions')
AND schemaname = 'public';

-- Expected results:
-- 1. knowledge_base should have rowsecurity = true
-- 2. Should see policies like 'Sessions can read active knowledge base', 'Admins can manage knowledge base', 'service_role_full'
-- 3. Should return active knowledge base entries
-- 4. Should return counts from both views
-- 5. Views should not contain SECURITY DEFINER in their definition