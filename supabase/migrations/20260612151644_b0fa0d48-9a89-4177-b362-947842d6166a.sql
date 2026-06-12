
-- 1. Phase 1 answers on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS phase1_answers jsonb DEFAULT '{}'::jsonb;

-- 2. knowledge_sectors lookup table
CREATE TABLE IF NOT EXISTS public.knowledge_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.knowledge_sectors TO authenticated, anon;
GRANT ALL ON public.knowledge_sectors TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.knowledge_sectors TO authenticated;

ALTER TABLE public.knowledge_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view sectors" ON public.knowledge_sectors;
CREATE POLICY "Anyone can view sectors" ON public.knowledge_sectors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage sectors" ON public.knowledge_sectors;
CREATE POLICY "Admins manage sectors" ON public.knowledge_sectors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. knowledge_documents: allow raw text content + sector text already exists
ALTER TABLE public.knowledge_documents
  ADD COLUMN IF NOT EXISTS raw_text text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS file_path text;

-- 4. Storage policies for knowledge-documents bucket (bucket created via tool)
DROP POLICY IF EXISTS "Admins read knowledge files" ON storage.objects;
CREATE POLICY "Admins read knowledge files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins upload knowledge files" ON storage.objects;
CREATE POLICY "Admins upload knowledge files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete knowledge files" ON storage.objects;
CREATE POLICY "Admins delete knowledge files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'admin'));
