-- Record expert applications in the experts table so admins can approve or deny them.
-- Applications were previously inserted client-side, which RLS rejected (no applicant insert policy).

ALTER TABLE public.experts ADD COLUMN IF NOT EXISTS applicant_email text;
COMMENT ON COLUMN public.experts.applicant_email IS 'Email supplied when applying to join the expert network; NULL for seeded catalogue entries.';

-- Create or update a pending application for the current account (or email when signed out).
CREATE OR REPLACE FUNCTION public.apply_as_expert(_name text, _industry text, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(_email, '')));
  v_name text := btrim(coalesce(_name, ''));
  v_industry text := btrim(coalesce(_industry, ''));
  v_id uuid;
BEGIN
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Enter a valid email address to apply.';
  END IF;
  IF v_name = '' THEN
    v_name := split_part(v_email, '@', 1);
  END IF;
  IF v_industry = '' THEN
    v_industry := 'General';
  END IF;

  SELECT id INTO v_id
    FROM public.experts
   WHERE (v_uid IS NOT NULL AND user_id = v_uid)
      OR lower(applicant_email) = v_email
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.experts e WHERE e.id = v_id AND e.verified) THEN
      RAISE EXCEPTION 'This account is already an approved expert.';
    END IF;
    UPDATE public.experts
       SET name = v_name,
           industry = v_industry,
           title = 'New Consultant',
           bio = 'Pending profile completion.',
           applicant_email = v_email,
           user_id = COALESCE(user_id, v_uid),
           updated_at = now()
     WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.experts
      (user_id, name, title, industry, bio, verified, online, initials, applicant_email)
  VALUES
      (v_uid, v_name, 'New Consultant', v_industry, 'Pending profile completion.',
       false, false, upper(left(v_name, 2)), v_email)
  RETURNING id INTO v_id;
  RETURN v_id;
END
$$;

-- Attach an application submitted while signed out to the account that later signs in with the same email.
CREATE OR REPLACE FUNCTION public.link_expert_application()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH linked AS (
    UPDATE public.experts
       SET user_id = auth.uid(), updated_at = now()
     WHERE auth.uid() IS NOT NULL
       AND user_id IS NULL
       AND applicant_email IS NOT NULL
       AND lower(applicant_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    RETURNING 1
  )
  SELECT count(*)::integer FROM linked;
$$;

GRANT EXECUTE ON FUNCTION public.apply_as_expert(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_expert_application() TO authenticated;

-- Applicants need to see their own pending row; the existing 'Anyone can view experts' policy already allows it.