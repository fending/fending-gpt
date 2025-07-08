-- Fix Supabase security warnings
-- This migration addresses the security issues identified by Supabase linter

-- 1. Enable RLS on knowledge_base table
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- 2. Add service role policy for knowledge_base to ensure admin operations work
DROP POLICY IF EXISTS "service_role_full" ON knowledge_base;
CREATE POLICY "service_role_full" ON knowledge_base
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Fix SECURITY DEFINER views by recreating them without SECURITY DEFINER
-- Drop existing views
DROP VIEW IF EXISTS daily_session_stats;
DROP VIEW IF EXISTS popular_questions;

-- Recreate views without SECURITY DEFINER (they will use SECURITY INVOKER by default)
CREATE VIEW daily_session_stats AS
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

CREATE VIEW popular_questions AS
SELECT 
  question_type,
  COUNT(*) as frequency,
  AVG(confidence_score) as avg_confidence,
  AVG(response_time_ms) as avg_response_time_ms
FROM chat_messages 
WHERE role = 'user' AND created_at > NOW() - INTERVAL '30 days'
GROUP BY question_type
ORDER BY frequency DESC;

-- 4. Grant necessary permissions for views to work with RLS
-- Views will now respect RLS policies of the underlying tables
GRANT SELECT ON daily_session_stats TO authenticated, anon, service_role;
GRANT SELECT ON popular_questions TO authenticated, anon, service_role;

-- 5. Ensure knowledge_base RLS policies are comprehensive
-- Keep existing policies but ensure they're comprehensive
DROP POLICY IF EXISTS "Sessions can read active knowledge base" ON knowledge_base;
CREATE POLICY "Sessions can read active knowledge base" ON knowledge_base
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage knowledge base" ON knowledge_base;
CREATE POLICY "Admins can manage knowledge base" ON knowledge_base
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- 6. Add comment to document the security model
COMMENT ON TABLE knowledge_base IS 'Knowledge base with RLS enabled. Public read access for active entries, admin-only write access via service role.';