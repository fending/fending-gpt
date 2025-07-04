-- Manual setup for vector embeddings in Supabase
-- Run this in your Supabase SQL editor if the migration doesn't work automatically

-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to knowledge_base table
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
ON knowledge_base USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create the vector similarity search function
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