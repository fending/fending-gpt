-- ========================================
-- COMPLETE DATABASE SCHEMA FOR CLEAN INSTALLATION
-- fending-gpt AI Chat Application
-- ========================================
-- 
-- This script creates a complete database from scratch.
-- Run this in Supabase SQL Editor for new installations.
--
-- Based on:
-- - database/schema/schema-sessions-fixed.sql
-- - database/schema/schema-updates.sql  
-- - database/migrations/migration-add-ended-at.sql
-- - database/migrations/add_vector_embeddings.sql
-- - Vector extension security fixes
-- - View security fixes
-- ========================================

-- ========================================
-- EXTENSIONS
-- ========================================

-- Enable pgvector extension in extensions schema (security best practice)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ========================================
-- CORE SESSION TABLES
-- ========================================

-- Chat sessions table for session-based authentication
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'expired', 'queued', 'ended')),
    queue_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_cost_usd DECIMAL(10, 6) DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    user_agent TEXT,
    referrer TEXT
);

-- Chat messages table (enhanced version for session-based chat)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    confidence_score DECIMAL(3, 2), -- AI response confidence 0.00-1.00
    response_time_ms INTEGER,
    question_type TEXT, -- 'experience', 'skills', 'projects', 'personal', 'other'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge base for Brian's career information with vector embeddings
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('affiliations', 'experience', 'skills', 'projects', 'education', 'personal', 'company')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    priority INTEGER DEFAULT 1, -- Higher number = higher priority for AI context
    is_active BOOLEAN DEFAULT TRUE,
    source TEXT DEFAULT 'manual', -- 'manual', 'conversation', 'import'
    confidence DECIMAL(3, 2) DEFAULT 1.0, -- How confident we are in this info
    embedding vector(1536), -- OpenAI ada-002 embedding vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training conversations for AI improvement
CREATE TABLE IF NOT EXISTS training_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_session_id UUID REFERENCES chat_sessions(id),
    category TEXT, -- What type of question/conversation
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    admin_notes TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    training_category TEXT, -- What this conversation teaches
    extracted_knowledge JSONB, -- New knowledge learned from this conversation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Daily budget tracking
CREATE TABLE IF NOT EXISTS daily_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    budget_limit_usd DECIMAL(10, 2) DEFAULT 10.00,
    current_spend_usd DECIMAL(10, 6) DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    is_exceeded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin users (simple table for admin access)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SECURITY TABLES
-- ========================================

-- Suppressed emails (blacklist/whitelist)
CREATE TABLE IF NOT EXISTS suppressed_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL DEFAULT 'blacklist', -- 'blacklist' or 'whitelist'
    reason VARCHAR(500),
    added_by VARCHAR(255), -- admin email who added it
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT valid_type CHECK (type IN ('blacklist', 'whitelist'))
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- IP address or email
    type VARCHAR(10) NOT NULL, -- 'ip' or 'email'
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE, -- NULL if not currently blocked
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(identifier, type),
    CONSTRAINT valid_type CHECK (type IN ('ip', 'email'))
);

-- Postmark webhook events
CREATE TABLE IF NOT EXISTS email_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'bounce', 'complaint', 'delivery', 'open', 'click'
    event_data JSONB, -- Full webhook payload
    bounce_type VARCHAR(50), -- 'HardBounce', 'SoftBounce', etc.
    complaint_type VARCHAR(50), -- 'SpamComplaint', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT false -- Whether we've acted on this event
);

-- Disposable email domains (for blocking)
CREATE TABLE IF NOT EXISTS disposable_email_domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Core session indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_email ON chat_sessions(email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token ON chat_sessions(token);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at ON chat_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_queue_position ON chat_sessions(queue_position) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_question_type ON chat_messages(question_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_priority ON knowledge_base(priority DESC);
CREATE INDEX IF NOT EXISTS idx_daily_budgets_date ON daily_budgets(date);

-- Security table indexes
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON suppressed_emails(email);
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_active ON suppressed_emails(is_active, type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_created ON email_events(created_at);
CREATE INDEX IF NOT EXISTS idx_disposable_domains_domain ON disposable_email_domains(domain);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- ========================================
-- TRIGGERS AND FUNCTIONS
-- ========================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to perform vector similarity search on knowledge base
CREATE OR REPLACE FUNCTION match_knowledge_entries(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 15
)
RETURNS TABLE (
    id uuid,
    category text,
    title text,
    content text,
    tags text[],
    priority int,
    similarity float
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.category,
        kb.title,
        kb.content,
        kb.tags,
        kb.priority,
        (1 - (kb.embedding <=> query_embedding)) AS similarity
    FROM knowledge_base kb
    WHERE 
        kb.is_active = true
        AND kb.embedding IS NOT NULL
        AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to update embeddings bypassing RLS
CREATE OR REPLACE FUNCTION update_embedding(
    entry_id uuid,
    embedding_vector vector(1536)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    UPDATE knowledge_base 
    SET embedding = embedding_vector
    WHERE id = entry_id;
END;
$$;

-- ========================================
-- ANALYTICS VIEWS (with explicit security)
-- ========================================

-- Daily session statistics view
CREATE VIEW public.daily_session_stats 
WITH (security_invoker = true)
AS
SELECT 
    date(created_at) AS date,
    count(*) AS total_sessions,
    count(*) FILTER (WHERE status = 'completed') AS completed_sessions,
    count(*) FILTER (WHERE status = 'active') AS active_sessions,
    count(*) FILTER (WHERE status = 'queued') AS queued_sessions,
    count(DISTINCT email) FILTER (WHERE email IS NOT NULL) AS unique_users,
    avg(EXTRACT(epoch FROM (completed_at - activated_at)) / 60) FILTER (WHERE completed_at IS NOT NULL) AS avg_duration_minutes
FROM chat_sessions
GROUP BY date(created_at)
ORDER BY date(created_at) DESC;

-- Popular questions analytics view
CREATE VIEW public.popular_questions
WITH (security_invoker = true)
AS
SELECT 
    question_type,
    count(*) AS frequency,
    avg(confidence_score) AS avg_confidence,
    avg(response_time_ms) AS avg_response_time_ms
FROM chat_messages
WHERE role = 'user' 
    AND created_at > (now() - interval '30 days')
GROUP BY question_type
ORDER BY count(*) DESC;

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposable_email_domains ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES - Core Tables
-- ========================================

-- Sessions can be accessed via token (no user auth required)
DROP POLICY IF EXISTS "Sessions can be accessed via token" ON chat_sessions;
CREATE POLICY "Sessions can be accessed via token" ON chat_sessions
    FOR ALL USING (true); -- Open access for now, token-based security handled in app layer

-- Messages can be accessed if you have the session token
DROP POLICY IF EXISTS "Messages can be accessed via session" ON chat_messages;
CREATE POLICY "Messages can be accessed via session" ON chat_messages
    FOR ALL USING (true); -- Open access for now, session-based security handled in app layer

-- Knowledge base is readable by all sessions, writable by admins only
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

-- ========================================
-- RLS POLICIES - Admin Access
-- ========================================

-- Admin policies for all core tables
DROP POLICY IF EXISTS "Admins can access all chat sessions" ON chat_sessions;
CREATE POLICY "Admins can access all chat sessions" ON chat_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Admins can access all chat messages" ON chat_messages;
CREATE POLICY "Admins can access all chat messages" ON chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Admins can access training conversations" ON training_conversations;
CREATE POLICY "Admins can access training conversations" ON training_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

DROP POLICY IF EXISTS "Admins can access daily budgets" ON daily_budgets;
CREATE POLICY "Admins can access daily budgets" ON daily_budgets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- ========================================
-- RLS POLICIES - Security Tables
-- ========================================

-- Service role full access policies (for admin operations)
CREATE POLICY "Service role full access suppressed_emails" ON suppressed_emails
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access rate_limits" ON rate_limits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access email_events" ON email_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access disposable_domains" ON disposable_email_domains
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Anonymous users can read disposable domains (for client-side validation)
CREATE POLICY "Anonymous read disposable_domains" ON disposable_email_domains
    FOR SELECT USING (is_active = true);

-- ========================================
-- PERMISSIONS
-- ========================================

-- Grant appropriate permissions on views
GRANT SELECT ON public.daily_session_stats TO anon, authenticated;
GRANT SELECT ON public.popular_questions TO anon, authenticated;

-- ========================================
-- INITIAL DATA
-- ========================================

-- Insert initial admin user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE email = 'admin@brianfending.com') THEN
        INSERT INTO admin_users (email, is_active) VALUES ('admin@brianfending.com', true);
    END IF;
END $$;

-- Insert sample knowledge base entries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM knowledge_base WHERE title = 'About Brian Fending') THEN
        INSERT INTO knowledge_base (category, title, content, priority, tags) VALUES
        ('personal', 'About Brian Fending', 'Brian Fending is a senior software engineer and technical leader with expertise in full-stack development, cloud architecture, and team leadership. He has over 8 years of experience building scalable web applications and leading development teams.', 5, ARRAY['introduction', 'overview']),
        ('experience', 'Current Role', 'Currently working as a Senior Software Engineer at a leading technology company, focusing on scalable web applications, cloud infrastructure, and technical leadership. Responsible for architecting and implementing complex systems that serve millions of users.', 4, ARRAY['current', 'role', 'leadership']),
        ('skills', 'Technical Skills', 'Proficient in JavaScript/TypeScript, React, Node.js, Python, AWS, Docker, PostgreSQL, MongoDB, Redis, Kubernetes, and modern development practices including CI/CD, test-driven development, and agile methodologies.', 4, ARRAY['technical', 'programming', 'cloud']),
        ('projects', 'Recent Projects', 'Recent projects include building AI-powered applications with Claude and OpenAI, implementing microservices architecture, developing real-time chat applications, creating automated deployment pipelines, and leading development teams on complex technical initiatives.', 3, ARRAY['projects', 'ai', 'microservices']),
        ('experience', 'Leadership Experience', 'Experienced in leading cross-functional teams, mentoring junior developers, conducting technical interviews, and driving architectural decisions. Has successfully managed projects from conception to deployment with teams of 5-15 developers.', 3, ARRAY['leadership', 'management', 'mentoring']),
        ('company', 'Work Preferences', 'Looking for senior engineering roles, technical leadership opportunities, or architect positions at innovative companies working on meaningful problems. Particularly interested in AI/ML applications, scalable systems, and teams that value code quality and continuous learning.', 3, ARRAY['preferences', 'career', 'goals']);
    END IF;
END $$;

-- Insert common disposable email domains
INSERT INTO disposable_email_domains (domain) VALUES
('10minutemail.com'),
('guerrillamail.com'),
('mailinator.com'),
('tempmail.org'),
('throwaway.email'),
('temp-mail.org'),
('yopmail.com'),
('maildrop.cc'),
('sharklasers.com'),
('trashmail.com')
ON CONFLICT (domain) DO NOTHING;

-- Create initial daily budget entry
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM daily_budgets WHERE date = CURRENT_DATE) THEN
        INSERT INTO daily_budgets (date, budget_limit_usd) VALUES (CURRENT_DATE, 10.00);
    END IF;
END $$;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON EXTENSION vector IS 'pgvector extension in extensions schema for security';
COMMENT ON COLUMN knowledge_base.embedding IS 'OpenAI ada-002 embedding vector (1536 dimensions) for semantic search';
COMMENT ON VIEW public.daily_session_stats IS 'Daily session statistics with explicit SECURITY INVOKER';
COMMENT ON VIEW public.popular_questions IS 'Popular question analytics with explicit SECURITY INVOKER';

-- ========================================
-- COMPLETION NOTICE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure environment variables';
    RAISE NOTICE '2. Set up Postmark webhook';
    RAISE NOTICE '3. Configure reCAPTCHA domains';
    RAISE NOTICE '4. Test admin access with admin@brianfending.com';
    RAISE NOTICE '========================================';
END $$;