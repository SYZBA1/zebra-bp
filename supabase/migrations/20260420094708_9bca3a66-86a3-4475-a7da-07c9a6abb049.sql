
-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge documents (uploaded PDFs / reference material)
CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT,
  sector TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  description TEXT,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge documents"
  ON public.knowledge_documents FOR SELECT
  USING (true);

-- Knowledge chunks with embeddings (Voyage voyage-3 = 1024 dims)
CREATE TABLE public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view knowledge chunks"
  ON public.knowledge_chunks FOR SELECT
  USING (true);

CREATE INDEX knowledge_chunks_embedding_idx
  ON public.knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX knowledge_chunks_document_id_idx
  ON public.knowledge_chunks(document_id);

-- Similarity search function
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1024),
  match_count INTEGER DEFAULT 5,
  filter_language TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
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
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  LEFT JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.embedding IS NOT NULL
    AND (filter_language IS NULL OR kd.language = filter_language OR kd.language = 'en')
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Health diagnostic questions (data-driven wizard)
CREATE TABLE public.health_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar TEXT NOT NULL,
  question_en TEXT NOT NULL,
  question_am TEXT,
  input_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active health questions"
  ON public.health_questions FOR SELECT
  USING (is_active = true);

-- Seed default questions
INSERT INTO public.health_questions (pillar, question_en, question_am, input_type, order_index) VALUES
('Market', 'How would you describe your current customer base size?', 'የአሁኑ የደንበኛ መሰረትዎ መጠን እንዴት ይገልጹታል?', 'select', 1),
('Market', 'What percentage of revenue comes from your top 3 customers?', 'ከገቢዎ ምን ያህል በመቶ ከከፍተኛ 3 ደንበኞች ይመጣል?', 'text', 2),
('Financial', 'What is your average monthly revenue (ETB)?', 'አማካይ ወርሃዊ ገቢዎ (ETB) ስንት ነው?', 'number', 3),
('Financial', 'What is your average monthly operating cost (ETB)?', 'አማካይ ወርሃዊ የስራ ማስኬጃ ወጪዎ (ETB) ስንት ነው?', 'number', 4),
('Financial', 'How many months of runway do you currently have?', 'በአሁኑ ጊዜ ለስንት ወራት የሚሆን ገንዘብ አለዎት?', 'number', 5),
('Operational', 'How many full-time employees do you have?', 'ስንት ሙሉ ጊዜ ሰራተኞች አሉዎት?', 'number', 6),
('Operational', 'Do you have documented standard operating procedures?', 'የተመዘገቡ መደበኛ የስራ አሰራሮች አሉዎት?', 'select', 7),
('Strategic', 'What is your primary growth challenge right now?', 'አሁን ዋናው የእድገት ፈተናዎ ምንድነው?', 'text', 8),
('Legal', 'Are all your business licenses and permits up to date?', 'ሁሉም የንግድ ፍቃዶችዎ ወቅታዊ ናቸው?', 'select', 9),
('Strategic', 'What is your main goal for the next 12 months?', 'ለሚቀጥሉት 12 ወራት ዋናው ግብዎ ምንድነው?', 'text', 10);

-- Health assessments (user's diagnostic results)
CREATE TABLE public.health_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_score INTEGER,
  rating TEXT,
  pillar_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  solutions JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assessments"
  ON public.health_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessments"
  ON public.health_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments"
  ON public.health_assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessments"
  ON public.health_assessments FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_health_assessments_updated_at
  BEFORE UPDATE ON public.health_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX health_assessments_user_id_idx ON public.health_assessments(user_id);
