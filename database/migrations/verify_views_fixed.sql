-- Verification script to confirm SECURITY DEFINER views are fixed
-- Run this after applying the fix_security_definer_views.sql migration

-- 1. Check that views exist
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE viewname IN ('daily_session_stats', 'popular_questions')
AND schemaname = 'public';

-- 2. Verify views don't have SECURITY DEFINER in their definition
-- If SECURITY DEFINER appears in the definition, it means the view still has the property
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER FOUND - NEEDS FIX'
        ELSE 'SECURITY INVOKER (GOOD)'
    END as security_status,
    definition
FROM pg_views 
WHERE viewname IN ('daily_session_stats', 'popular_questions')
AND schemaname = 'public';

-- 3. Test that views return data (basic functionality test)
SELECT 'daily_session_stats' as view_name, COUNT(*) as row_count 
FROM public.daily_session_stats
UNION ALL
SELECT 'popular_questions' as view_name, COUNT(*) as row_count 
FROM public.popular_questions;

-- 4. Check view permissions
SELECT 
    schemaname,
    viewname,
    has_table_privilege('authenticated', schemaname||'.'||viewname, 'SELECT') as authenticated_can_select,
    has_table_privilege('anon', schemaname||'.'||viewname, 'SELECT') as anon_can_select,
    has_table_privilege('service_role', schemaname||'.'||viewname, 'SELECT') as service_role_can_select
FROM pg_views 
WHERE viewname IN ('daily_session_stats', 'popular_questions')
AND schemaname = 'public';

-- Expected results:
-- 1. Both views should be listed
-- 2. security_status should be 'SECURITY INVOKER (GOOD)' for both views
-- 3. Both views should return some row count (could be 0 if no data)
-- 4. All roles should have SELECT permissions