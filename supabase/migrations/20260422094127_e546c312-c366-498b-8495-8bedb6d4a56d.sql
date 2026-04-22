CREATE TABLE public.visitor_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visitor_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
ON public.visitor_feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (rating >= 1 AND rating <= 5 AND (comment IS NULL OR length(comment) <= 1000) AND (name IS NULL OR length(name) <= 100) AND (email IS NULL OR length(email) <= 255));

CREATE POLICY "Admins can view all feedback"
ON public.visitor_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));