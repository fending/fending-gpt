-- Fix SECURITY DEFINER views to resolve Supabase security warnings
-- This script removes SECURITY DEFINER from views and recreates them safely

-- Drop existing views that have SECURITY DEFINER
DROP VIEW IF EXISTS public.daily_session_stats;
DROP VIEW IF EXISTS public.popular_questions;

-- Recreate daily_session_stats view without SECURITY DEFINER
-- Default is SECURITY INVOKER which is what we want
CREATE VIEW public.daily_session_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'queued') as queued_sessions,
  COUNT(DISTINCT email) FILTER (WHERE email IS NOT NULL) as unique_users,
  AVG(EXTRACT(EPOCH FROM (completed_at - activated_at))/60) FILTER (WHERE completed_at IS NOT NULL) as avg_duration_minutes
FROM chat_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Recreate popular_questions view without SECURITY DEFINER
-- Default is SECURITY INVOKER which is what we want
CREATE VIEW public.popular_questions AS
SELECT 
  question_type,
  COUNT(*) as frequency,
  AVG(confidence_score) as avg_confidence,
  AVG(response_time_ms) as avg_response_time_ms
FROM chat_messages 
WHERE role = 'user' AND created_at > NOW() - INTERVAL '30 days'
GROUP BY question_type
ORDER BY frequency DESC;

-- Grant appropriate permissions to ensure views work properly
GRANT SELECT ON public.daily_session_stats TO authenticated, anon, service_role;
GRANT SELECT ON public.popular_questions TO authenticated, anon, service_role;

-- Add comments to document the views
COMMENT ON VIEW public.daily_session_stats IS 'Daily session statistics view - uses SECURITY INVOKER (default)';
COMMENT ON VIEW public.popular_questions IS 'Popular question types view - uses SECURITY INVOKER (default)';

-- Verify the views were created without SECURITY DEFINER
-- You can run this query after applying the migration to confirm:
-- SELECT schemaname, viewname, definition FROM pg_views 
-- WHERE viewname IN ('daily_session_stats', 'popular_questions') 
-- AND schemaname = 'public';