
-- BLOG POSTS
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  author_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert posts" ON public.blog_posts
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update posts" ON public.blog_posts
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete posts" ON public.blog_posts
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BUDGETS
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT,
  currency TEXT NOT NULL DEFAULT 'ETB',
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view budgets" ON public.budgets
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert budgets" ON public.budgets
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update budgets" ON public.budgets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete budgets" ON public.budgets
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to UPDATE marketplace templates and DELETE so admin dashboard can manage them
CREATE POLICY "Admins insert marketplace" ON public.marketplace_templates
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update marketplace" ON public.marketplace_templates
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete marketplace" ON public.marketplace_templates
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete knowledge documents (chunks cascade via app logic)
CREATE POLICY "Admins insert knowledge docs" ON public.knowledge_documents
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete knowledge docs" ON public.knowledge_documents
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete knowledge chunks" ON public.knowledge_chunks
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles for user management
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
