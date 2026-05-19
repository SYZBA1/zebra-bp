-- RAG Knowledge System Schema Enhancement

-- Knowledge sectors for organizing documents
CREATE TABLE public.knowledge_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sectors"
  ON public.knowledge_sectors FOR SELECT
  USING (true);

CREATE POLICY "Admins manage sectors"
  ON public.knowledge_sectors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add new columns to knowledge_documents for enhanced metadata
ALTER TABLE public.knowledge_documents
ADD COLUMN IF NOT EXISTS sector_id UUID REFERENCES public.knowledge_sectors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS knowledge_documents_sector_id_idx ON public.knowledge_documents(sector_id);
CREATE INDEX IF NOT EXISTS knowledge_documents_status_idx ON public.knowledge_documents(status);
CREATE INDEX IF NOT EXISTS knowledge_chunks_sector_idx ON public.knowledge_chunks USING GIN ((kc.metadata->'sector'));

-- Enhanced similarity search function with sector filtering
CREATE OR REPLACE FUNCTION public.match_knowledge_by_sector(
  query_embedding vector(1024),
  sector_id UUID DEFAULT NULL,
  match_count INTEGER DEFAULT 5,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    AND kd.status = 'processed'
    AND (sector_id IS NULL OR kd.sector_id = sector_id)
    AND (filter_language IS NULL OR kd.language = filter_language OR kd.language = 'en')
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Updated trigger for knowledge_sectors
CREATE TRIGGER update_knowledge_sectors_updated_at
  BEFORE UPDATE ON public.knowledge_sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add admin RLS policy for documents insert with sector
CREATE POLICY "Admins insert knowledge docs with sector"
  ON public.knowledge_documents FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add admin policy to update document status
CREATE POLICY "Admins update knowledge docs"
  ON public.knowledge_documents FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Ensure the search function defaults to using the updated match function
COMMENT ON FUNCTION public.match_knowledge_by_sector IS 'Search knowledge chunks with optional sector filtering for RAG retrieval';
