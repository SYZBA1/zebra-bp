
-- Trigger: notify admins on new booking, notify booker + expert on status change
CREATE OR REPLACE FUNCTION public.notify_on_expert_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- notify all admins
    FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (admin_id, 'booking',
        'New expert booking — payment pending verification',
        NEW.full_name || ' booked: ' || NEW.topic || ' (ETB ' || NEW.amount_etb::text || ', Tx ' || NEW.transaction_ref || ')',
        jsonb_build_object('booking_id', NEW.id, 'expert_id', NEW.expert_id));
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- notify booker
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (NEW.user_id, 'booking',
      'Booking ' || NEW.status,
      'Your booking for "' || NEW.topic || '" is now ' || NEW.status || '.',
      jsonb_build_object('booking_id', NEW.id));
    -- notify expert if linked
    IF NEW.expert_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (NEW.expert_user_id, 'booking',
        CASE WHEN NEW.status = 'confirmed' THEN 'Booking confirmed — login to manage'
             WHEN NEW.status = 'rejected' THEN 'Booking rejected by admin'
             ELSE 'Booking status: ' || NEW.status END,
        NEW.full_name || ' — ' || NEW.topic,
        jsonb_build_object('booking_id', NEW.id));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_expert_booking ON public.expert_bookings;
CREATE TRIGGER trg_notify_on_expert_booking
AFTER INSERT OR UPDATE ON public.expert_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_expert_booking();
