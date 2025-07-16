-- Debug queries to check message history issues
-- Run these in Supabase SQL editor to investigate the conversation history problem

-- 1. Check recent chat sessions
SELECT 
    id,
    email,
    token,
    status,
    created_at,
    total_tokens_used,
    total_cost_usd
FROM chat_sessions 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check messages for the most recent session
-- Replace 'your-session-id' with actual session ID from query 1
SELECT 
    id,
    session_id,
    role,
    content,
    created_at,
    tokens_used,
    cost_usd
FROM chat_messages 
WHERE session_id = (
    SELECT id FROM chat_sessions 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY created_at ASC;

-- 3. Count messages by role for recent sessions
SELECT 
    cs.id as session_id,
    cs.email,
    cs.status,
    cs.created_at as session_created,
    COUNT(cm.id) as total_messages,
    COUNT(cm.id) FILTER (WHERE cm.role = 'user') as user_messages,
    COUNT(cm.id) FILTER (WHERE cm.role = 'assistant') as assistant_messages
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
WHERE cs.created_at > NOW() - INTERVAL '1 day'
GROUP BY cs.id, cs.email, cs.status, cs.created_at
ORDER BY cs.created_at DESC;

-- 4. Check for orphaned messages (messages without sessions)
SELECT 
    cm.id,
    cm.session_id,
    cm.role,
    cm.content,
    cm.created_at,
    cs.id as session_exists
FROM chat_messages cm
LEFT JOIN chat_sessions cs ON cm.session_id = cs.id
WHERE cs.id IS NULL
ORDER BY cm.created_at DESC;

-- 5. Look for patterns in message saving issues
-- Check if user messages are being saved without corresponding assistant messages
SELECT 
    session_id,
    COUNT(*) as message_count,
    COUNT(*) FILTER (WHERE role = 'user') as user_count,
    COUNT(*) FILTER (WHERE role = 'assistant') as assistant_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE role = 'user') > COUNT(*) FILTER (WHERE role = 'assistant') 
        THEN 'Missing assistant responses'
        WHEN COUNT(*) FILTER (WHERE role = 'assistant') > COUNT(*) FILTER (WHERE role = 'user') 
        THEN 'Extra assistant responses'
        ELSE 'Balanced'
    END as message_balance
FROM chat_messages
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY session_id
ORDER BY message_count DESC;

-- Expected patterns:
-- - Each user message should have a corresponding assistant message
-- - Messages should be saved in order with proper timestamps
-- - No orphaned messages without valid sessions
-- - Message count should be balanced or have 1 more user message (if last message is from user)