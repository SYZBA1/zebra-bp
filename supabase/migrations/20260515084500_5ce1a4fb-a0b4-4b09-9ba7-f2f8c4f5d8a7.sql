-- Expert marketplace submission workflow
ALTER TABLE public.marketplace_templates
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS submission_file_path text,
  ADD COLUMN IF NOT EXISTS submission_file_name text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS review_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS review_note text;

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_review_status_ready_at
  ON public.marketplace_templates (review_status, review_ready_at);

CREATE INDEX IF NOT EXISTS idx_marketplace_templates_submitted_by_user_id
  ON public.marketplace_templates (submitted_by_user_id);

-- Replace public select policy: only approved are public;
-- admins and submitters can see all statuses.
DROP POLICY IF EXISTS "Anyone can view templates" ON public.marketplace_templates;

CREATE POLICY "Templates visible by status and ownership"
ON public.marketplace_templates
FOR SELECT
USING (
  review_status = 'approved'
  OR public.has_role(auth.uid(), 'admin')
  OR auth.uid() = submitted_by_user_id
);

-- Experts can submit marketplace templates into 2-hour review hold.
CREATE POLICY "Experts insert marketplace submissions"
ON public.marketplace_templates
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'expert')
  AND auth.uid() = submitted_by_user_id
  AND review_status = 'under_review'
);

-- Experts can edit their own submissions before final admin decision.
CREATE POLICY "Experts update own marketplace submissions"
ON public.marketplace_templates
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'expert')
  AND auth.uid() = submitted_by_user_id
  AND review_status IN ('under_review', 'pending_admin', 'rejected')
)
WITH CHECK (
  auth.uid() = submitted_by_user_id
);

-- Storage bucket for expert uploaded files used in admin review.
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-submissions', 'marketplace-submissions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Experts upload own submission files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'marketplace-submissions'
  AND public.has_role(auth.uid(), 'expert')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

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

CREATE POLICY "Admins delete submission files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'marketplace-submissions'
  AND public.has_role(auth.uid(), 'admin')
);
