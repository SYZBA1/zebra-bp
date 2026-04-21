
CREATE TABLE public.appointment_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.consultant_appointments(id) ON DELETE CASCADE,
  changed_by UUID,
  old_status TEXT,
  new_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_audit_log_appt ON public.appointment_audit_log(appointment_id, created_at DESC);

ALTER TABLE public.appointment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit entries"
ON public.appointment_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own appointment audit"
ON public.appointment_audit_log FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.consultant_appointments a
  WHERE a.id = appointment_id AND a.user_id = auth.uid()
));

CREATE OR REPLACE FUNCTION public.log_appointment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_audit_log (appointment_id, changed_by, old_status, new_status)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status);
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.appointment_audit_log (appointment_id, changed_by, old_status, new_status)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_status_audit
AFTER INSERT OR UPDATE OF status ON public.consultant_appointments
FOR EACH ROW EXECUTE FUNCTION public.log_appointment_status_change();
