-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to knowledge_base table
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
ON knowledge_base 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add helpful comment
COMMENT ON COLUMN knowledge_base.embedding IS 'OpenAI ada-002 embedding vector (1536 dimensions) for semantic search';