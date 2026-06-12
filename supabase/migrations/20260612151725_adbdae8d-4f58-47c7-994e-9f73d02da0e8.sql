
ALTER TABLE public.marketplace_templates
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS review_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS submission_file_name text,
  ADD COLUMN IF NOT EXISTS submission_file_path text,
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid;

CREATE OR REPLACE FUNCTION public.match_knowledge_by_sector(
  query_embedding vector,
  sector_id text DEFAULT NULL,
  match_count integer DEFAULT 5,
  filter_language text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_title text,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kd.title AS document_title,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  LEFT JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.embedding IS NOT NULL
    AND (filter_language IS NULL OR kd.language = filter_language OR kd.language = 'en')
    AND (sector_id IS NULL OR kd.sector = sector_id)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.match_knowledge_by_sector(vector, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_knowledge_by_sector(vector, text, integer, text) TO authenticated, service_role;
