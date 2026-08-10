-- AS-BUILT SNAPSHOT (2026-08-10) — reverse-engineered from the live DB.
-- The booking/cancel functions were applied directly via Supabase and were NOT
-- in version control (audit SEC-06). This file captures them + the integrity
-- indexes/functions added during the 2026-08-10 gap-closure. Idempotent.
--
-- Integrity objects added 2026-08-10 (gap closure):
CREATE UNIQUE INDEX IF NOT EXISTS tu_attendance_booking_id_uniq ON public.tu_attendance(booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS tu_packs_wompi_txid_uniq ON public.tu_packs(wompi_transaction_id) WHERE wompi_transaction_id IS NOT NULL;
-- (tu_discount_usage already carries UNIQUE(discount_code_id, student_id))

-- ================================================================
-- Functions (CREATE OR REPLACE — safe to re-run):
-- ================================================================

CREATE OR REPLACE FUNCTION public.tu_adjust_enrolled(p_session_id uuid, p_delta integer)
 RETURNS integer
 LANGUAGE sql
AS $function$ UPDATE tu_class_sessions SET enrolled = GREATEST(0, COALESCE(enrolled,0) + p_delta) WHERE id = p_session_id RETURNING enrolled; $function$


-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tu_book_class(p_session_id uuid, p_student_id uuid, p_pack_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_session RECORD;
  v_pack RECORD;
  v_booking_id UUID;
BEGIN
  -- Lock session row
  SELECT * INTO v_session FROM tu_class_sessions
  WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;

  IF v_session.status != 'scheduled' THEN
    RETURN json_build_object('error', 'Session is not available');
  END IF;

  IF v_session.enrolled >= v_session.capacity THEN
    RETURN json_build_object('error', 'Session is full');
  END IF;

  -- Check duplicate booking
  IF EXISTS (
    SELECT 1 FROM tu_class_bookings
    WHERE session_id = p_session_id
    AND student_id = p_student_id
    AND status IN ('confirmed', 'waitlisted')
  ) THEN
    RETURN json_build_object('error', 'Already booked for this session');
  END IF;

  -- Validate and deduct pack credit
  SELECT * INTO v_pack FROM tu_packs
  WHERE id = p_pack_id AND student_id = p_student_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Pack not found');
  END IF;

  IF v_pack.status != 'active' THEN
    RETURN json_build_object('error', 'Pack is not active');
  END IF;

  IF v_pack.expires_at < NOW() THEN
    UPDATE tu_packs SET status = 'expired' WHERE id = p_pack_id;
    RETURN json_build_object('error', 'Pack has expired');
  END IF;

  IF v_pack.total_classes != -1 AND v_pack.classes_used >= v_pack.total_classes THEN
    UPDATE tu_packs SET status = 'exhausted' WHERE id = p_pack_id;
    RETURN json_build_object('error', 'No credits remaining');
  END IF;

  -- Deduct credit (skip for unlimited)
  IF v_pack.total_classes != -1 THEN
    UPDATE tu_packs SET classes_used = classes_used + 1
    WHERE id = p_pack_id;

    -- Check if exhausted after deduction
    IF v_pack.classes_used + 1 >= v_pack.total_classes THEN
      UPDATE tu_packs SET status = 'exhausted' WHERE id = p_pack_id;
    END IF;
  END IF;

  -- Create booking
  INSERT INTO tu_class_bookings (session_id, student_id, pack_id, status)
  VALUES (p_session_id, p_student_id, p_pack_id, 'confirmed')
  RETURNING id INTO v_booking_id;

  -- Increment enrolled count
  UPDATE tu_class_sessions SET enrolled = enrolled + 1
  WHERE id = p_session_id;

  RETURN json_build_object(
    'booking_id', v_booking_id,
    'status', 'confirmed',
    'session_date', v_session.session_date,
    'start_time', v_session.start_time
  );
END;
$function$


-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tu_cancel_booking(p_booking_id uuid, p_student_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM tu_class_bookings
  WHERE id = p_booking_id AND student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found');
  END IF;

  IF v_booking.status != 'confirmed' THEN
    RETURN json_build_object('error', 'Booking cannot be cancelled');
  END IF;

  -- Cancel booking
  UPDATE tu_class_bookings
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancel_reason = COALESCE(p_reason, 'Cancelled by student')
  WHERE id = p_booking_id;

  -- Decrement enrolled
  UPDATE tu_class_sessions SET enrolled = GREATEST(enrolled - 1, 0)
  WHERE id = v_booking.session_id;

  -- Refund pack credit
  IF v_booking.pack_id IS NOT NULL THEN
    UPDATE tu_packs
    SET classes_used = GREATEST(classes_used - 1, 0),
        status = CASE WHEN status = 'exhausted' THEN 'active' ELSE status END
    WHERE id = v_booking.pack_id
    AND total_classes != -1;
  END IF;

  RETURN json_build_object(
    'booking_id', p_booking_id,
    'status', 'cancelled',
    'refunded', v_booking.pack_id IS NOT NULL
  );
END;
$function$


