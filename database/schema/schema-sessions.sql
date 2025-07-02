-- Enhanced schema for session-based AI chat system
-- This adds the new session tables while keeping existing ones for migration

-- Chat sessions table for session-based authentication
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'expired')),
    queue_position INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
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

-- Knowledge base for Brian's career information
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('resume', 'projects', 'skills', 'experience', 'personal', 'company')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    priority INTEGER DEFAULT 1, -- Higher number = higher priority for AI context
    is_active BOOLEAN DEFAULT TRUE,
    source TEXT DEFAULT 'manual', -- 'manual', 'conversation', 'import'
    confidence DECIMAL(3, 2) DEFAULT 1.0, -- How confident we are in this info
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_email ON chat_sessions(email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token ON chat_sessions(token);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at ON chat_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_queue_position ON chat_sessions(queue_position) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_question_type ON chat_messages(question_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_priority ON knowledge_base(priority DESC);
CREATE INDEX IF NOT EXISTS idx_daily_budgets_date ON daily_budgets(date);

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

-- Enable RLS (Row Level Security)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
-- Sessions can be accessed via token (no user auth required)
DROP POLICY IF EXISTS "Sessions can be accessed via token" ON chat_sessions;
CREATE POLICY "Sessions can be accessed via token" ON chat_sessions
    FOR ALL USING (true); -- Open access for now, token-based security handled in app layer

-- RLS Policies for chat_messages
-- Messages can be accessed if you have the session token
DROP POLICY IF EXISTS "Messages can be accessed via session" ON chat_messages;
CREATE POLICY "Messages can be accessed via session" ON chat_messages
    FOR ALL USING (true); -- Open access for now, session-based security handled in app layer

-- RLS Policies for knowledge_base
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

-- Admin policies for all tables
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

-- Insert initial admin user (replace with actual admin email)
INSERT INTO admin_users (email) VALUES ('admin@brianfending.com') ON CONFLICT (email) DO NOTHING;

-- Insert sample knowledge base entries
INSERT INTO knowledge_base (category, title, content, priority, tags) VALUES
('personal', 'About Brian Fending', 'Brian Fending is a senior software engineer and technical leader with expertise in full-stack development, cloud architecture, and team leadership. He has over 8 years of experience building scalable web applications and leading development teams.', 5, ARRAY['introduction', 'overview']),
('experience', 'Current Role', 'Currently working as a Senior Software Engineer at a leading technology company, focusing on scalable web applications, cloud infrastructure, and technical leadership. Responsible for architecting and implementing complex systems that serve millions of users.', 4, ARRAY['current', 'role', 'leadership']),
('skills', 'Technical Skills', 'Proficient in JavaScript/TypeScript, React, Node.js, Python, AWS, Docker, PostgreSQL, MongoDB, Redis, Kubernetes, and modern development practices including CI/CD, test-driven development, and agile methodologies.', 4, ARRAY['technical', 'programming', 'cloud']),
('projects', 'Recent Projects', 'Recent projects include building AI-powered applications with Claude and OpenAI, implementing microservices architecture, developing real-time chat applications, creating automated deployment pipelines, and leading development teams on complex technical initiatives.', 3, ARRAY['projects', 'ai', 'microservices']),
('experience', 'Leadership Experience', 'Experienced in leading cross-functional teams, mentoring junior developers, conducting technical interviews, and driving architectural decisions. Has successfully managed projects from conception to deployment with teams of 5-15 developers.', 3, ARRAY['leadership', 'management', 'mentoring']),
('company', 'Work Preferences', 'Looking for senior engineering roles, technical leadership opportunities, or architect positions at innovative companies working on meaningful problems. Particularly interested in AI/ML applications, scalable systems, and teams that value code quality and continuous learning.', 3, ARRAY['preferences', 'career', 'goals'])
ON CONFLICT (title) DO NOTHING;

-- Create initial daily budget entry
INSERT INTO daily_budgets (date, budget_limit_usd) VALUES (CURRENT_DATE, 10.00) ON CONFLICT (date) DO NOTHING;

-- Views for analytics
CREATE OR REPLACE VIEW daily_session_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'pending') as queued_sessions,
  COUNT(DISTINCT email) FILTER (WHERE email IS NOT NULL) as unique_users,
  AVG(EXTRACT(EPOCH FROM (completed_at - activated_at))/60) FILTER (WHERE completed_at IS NOT NULL) as avg_duration_minutes
FROM chat_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW popular_questions AS
SELECT 
  question_type,
  COUNT(*) as frequency,
  AVG(confidence_score) as avg_confidence,
  AVG(response_time_ms) as avg_response_time_ms
FROM chat_messages 
WHERE role = 'user' AND created_at > NOW() - INTERVAL '30 days'
GROUP BY question_type
ORDER BY frequency DESC;