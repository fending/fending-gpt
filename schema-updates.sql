-- Email suppression and rate limiting tables

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON suppressed_emails(email);
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_active ON suppressed_emails(is_active, type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier, type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_created ON email_events(created_at);
CREATE INDEX IF NOT EXISTS idx_disposable_domains_domain ON disposable_email_domains(domain);

-- Insert some common disposable email domains
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

-- RLS Policies (Row Level Security)
ALTER TABLE suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposable_email_domains ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for admin operations)
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