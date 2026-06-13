
-- 1) Marketplace premium content protection
REVOKE SELECT (contents, full_document) ON public.marketplace_templates FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_template_full_document(_template_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.marketplace_templates%ROWTYPE;
  has_purchase boolean;
BEGIN
  SELECT * INTO t FROM public.marketplace_templates WHERE id = _template_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF NOT t.is_premium THEN
    RETURN t.full_document;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for premium templates';
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN t.full_document;
  END IF;

  IF t.submitted_by_user_id = auth.uid() THEN
    RETURN t.full_document;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.template_purchases
    WHERE template_id = _template_id
      AND user_id = auth.uid()
      AND status IN ('approved','paid','delivered','confirmed')
  ) INTO has_purchase;

  IF has_purchase THEN
    RETURN t.full_document;
  END IF;

  RAISE EXCEPTION 'Purchase required to access premium template content';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_template_full_document(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_template_full_document(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_template_contents(_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.marketplace_templates%ROWTYPE;
  has_purchase boolean;
BEGIN
  SELECT * INTO t FROM public.marketplace_templates WHERE id = _template_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF NOT t.is_premium THEN RETURN t.contents; END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.has_role(auth.uid(), 'admin') OR t.submitted_by_user_id = auth.uid() THEN
    RETURN t.contents;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.template_purchases
    WHERE template_id = _template_id
      AND user_id = auth.uid()
      AND status IN ('approved','paid','delivered','confirmed')
  ) INTO has_purchase;

  IF has_purchase THEN RETURN t.contents; END IF;
  RAISE EXCEPTION 'Purchase required';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_template_contents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_template_contents(uuid) TO authenticated;

-- 2) Notifications: restrict INSERT to the recipient or an admin
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3) Knowledge chunks: restrict to admins (RAG retrieval uses SECURITY DEFINER RPC + service role)
DROP POLICY IF EXISTS "Anyone can view knowledge chunks" ON public.knowledge_chunks;
CREATE POLICY "Admins view knowledge chunks"
ON public.knowledge_chunks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4) Visitor feedback: allow admins to delete (for data removal requests)
CREATE POLICY "Admins delete feedback"
ON public.visitor_feedback
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5) Lock down SECURITY DEFINER retrieval functions from direct API exposure
REVOKE EXECUTE ON FUNCTION public.match_knowledge(vector, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_knowledge_by_sector(vector, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge_by_sector(vector, text, integer, text) TO service_role;
