-- ROUND 2 AUDIT — security + integrity DB changes (2026-08-10). Applied live via
-- Management API; captured here so version control reflects reality (audit R2A-07).

-- ============================================================================
-- R2A-01/02 + systemic RLS-grant fix (P0):
-- Every tu_ table granted anon/authenticated INSERT/UPDATE/DELETE, and several had
-- permissive (WITH CHECK true) policies — a logged-in user could mint a tu_passes
-- row, anon could forge tu_transactions / vandalize tu_faq|services|teachers|retreats,
-- and (proven live) anon could insert a `confirmed` tu_class_bookings row, bypassing
-- tu_book_class entirely. All legitimate writes go through SECURITY DEFINER RPCs or
-- the service_role (admin/webhooks/public API routes) — the browser never writes
-- tables directly — so revoke ALL anon/authenticated write privileges on tu_ tables.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'tu_%'
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- ============================================================================
-- R2C-01/02: atomic capacity reserve for the public website booking soft-count.
-- Replaces a read-modify-write that could overbook / duplicate slot rows.
CREATE UNIQUE INDEX IF NOT EXISTS tu_class_slots_date_time_uniq
  ON public.tu_class_slots(class_date, class_time);

CREATE OR REPLACE FUNCTION tu_slot_reserve(p_date date, p_time text, p_name text, p_dow int, p_capacity int)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_enrolled int; v_cap int;
BEGIN
  INSERT INTO tu_class_slots (class_date, class_time, class_name, day_of_week, enrolled, capacity)
    VALUES (p_date, p_time, p_name, p_dow, 1, p_capacity)
    ON CONFLICT (class_date, class_time) DO UPDATE
      SET enrolled = tu_class_slots.enrolled + 1
      WHERE tu_class_slots.enrolled < tu_class_slots.capacity
    RETURNING enrolled, capacity INTO v_enrolled, v_cap;
  IF NOT FOUND THEN
    RETURN -1;               -- slot existed and was full
  END IF;
  RETURN v_cap - v_enrolled; -- spots left after this reservation
END $$;

-- ============================================================================
-- TODO (deferred to Round 3, tracked in CHANGELOG):
--   R2A-05  ALTER FUNCTION tu_book_class/tu_cancel_booking/tu_is_admin/
--           tu_current_student_id SET search_path = public, pg_temp;
--   R2A-06  REVOKE EXECUTE on the mutating RPCs FROM anon (keep authenticated).
