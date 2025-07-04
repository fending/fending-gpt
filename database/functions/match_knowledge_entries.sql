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