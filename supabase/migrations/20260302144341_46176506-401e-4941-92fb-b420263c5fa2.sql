
-- Add columns for section content storage to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contents jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_titles jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'feasibility';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
