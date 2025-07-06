-- Function to update embeddings bypassing RLS
CREATE OR REPLACE FUNCTION update_embedding(
  entry_id uuid,
  embedding_vector vector(1536)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE knowledge_base 
  SET embedding = embedding_vector
  WHERE id = entry_id;
END;
$$;