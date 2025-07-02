-- Add ended_at field to chat_sessions table for session end tracking
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- Update the status check constraint to include 'ended' status
ALTER TABLE chat_sessions 
DROP CONSTRAINT IF EXISTS chat_sessions_status_check;

ALTER TABLE chat_sessions 
ADD CONSTRAINT chat_sessions_status_check 
CHECK (status IN ('pending', 'active', 'completed', 'expired', 'queued', 'ended'));