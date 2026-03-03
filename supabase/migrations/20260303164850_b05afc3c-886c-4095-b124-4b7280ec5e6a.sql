
-- Add phone_number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Add service_description to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS service_description text DEFAULT '';

-- Create marketplace_templates table
CREATE TABLE public.marketplace_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  sector text NOT NULL,
  category text NOT NULL DEFAULT 'Service',
  document_type text NOT NULL DEFAULT 'feasibility',
  contents jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_titles jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_premium boolean NOT NULL DEFAULT false,
  price_cents integer DEFAULT 0,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
ON public.marketplace_templates FOR SELECT
USING (true);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger for updated_at on marketplace_templates
CREATE TRIGGER update_marketplace_templates_updated_at
BEFORE UPDATE ON public.marketplace_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
