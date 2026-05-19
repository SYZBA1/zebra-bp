-- Admin coverage + marketplace submission bucket hardening

-- Ensure admins can access all user projects.
DROP POLICY IF EXISTS "Admins view all projects" ON public.projects;
CREATE POLICY "Admins view all projects"
ON public.projects
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert projects" ON public.projects;
CREATE POLICY "Admins insert projects"
ON public.projects
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update all projects" ON public.projects;
CREATE POLICY "Admins update all projects"
ON public.projects
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete all projects" ON public.projects;
CREATE POLICY "Admins delete all projects"
ON public.projects
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure admins can manage profile records.
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete all profiles" ON public.profiles;
CREATE POLICY "Admins delete all profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Ensure admins can fully manage consultant appointments.
DROP POLICY IF EXISTS "Admins delete all appointments" ON public.consultant_appointments;
CREATE POLICY "Admins delete all appointments"
ON public.consultant_appointments
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create/repair storage bucket used by expert marketplace submissions.
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-submissions', 'marketplace-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Re-apply storage policies for submission files in case they were skipped.
DROP POLICY IF EXISTS "Experts upload own submission files" ON storage.objects;
CREATE POLICY "Experts upload own submission files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'marketplace-submissions'
  AND public.has_role(auth.uid(), 'expert')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Experts view own submission files" ON storage.objects;
CREATE POLICY "Experts view own submission files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'marketplace-submissions'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Admins delete submission files" ON storage.objects;
CREATE POLICY "Admins delete submission files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'marketplace-submissions'
  AND public.has_role(auth.uid(), 'admin')
);
