-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure storage bucket exists for documents
-- Note: This should be created via Supabase dashboard or with admin API
-- Required bucket name: 'documents'
-- Policy: authenticated users can read, only admins can upload/delete

-- Storage bucket policies (if not already set):
-- 1. Public read access:
-- SELECT on objects WHERE bucket_id = 'documents'
-- 
-- 2. Admin upload:
-- INSERT on objects WHERE bucket_id = 'documents' 
-- AND has_role(auth.uid(), 'admin')
-- 
-- 3. Admin delete:
-- DELETE on objects WHERE bucket_id = 'documents'
-- AND has_role(auth.uid(), 'admin')

-- Verify vector extension is installed
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Verify tables exist
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'knowledge_sectors'
) AS sectors_exists;

SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'knowledge_documents'
) AS documents_exists;

SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'knowledge_chunks'
) AS chunks_exists;

-- Sample data for testing (optional)
INSERT INTO public.knowledge_sectors (name, description, color)
VALUES 
  ('Healthcare', 'Medical and healthcare business documents', '#10B981'),
  ('Finance', 'Financial services and banking documents', '#3B82F6'),
  ('Agriculture', 'Agricultural and farming sector documents', '#F59E0B'),
  ('Technology', 'Tech startup and software business documents', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;
