-- ============================================================================
-- Public web pre-registrations gate on REAL session capacity
-- ============================================================================
-- Problem (reported by Tata, 2026-10-17): the public booking form accepted
-- bookings into a class she was already packed for, and told her "7 spots
-- left". That number was fiction: /api/bookings gated on tu_slot_reserve →
-- tu_class_slots, a legacy table written ONLY by that endpoint and seeded with
-- a hardcoded capacity of 12. It never looked at tu_class_sessions, which
-- holds the real capacity and the real enrolled count.
--
-- Live proof on the day: Sat 2026-10-17 11:00 Sun Salutation —
--   tu_class_definitions.capacity = 10   (the room Tata actually has)
--   tu_class_sessions             = 14 enrolled / 15 capacity
--   tu_class_slots                =  7 enrolled / 12 capacity  ← what the form read
-- …plus 7 unconfirmed tu_bookings rows (5 people) holding no seat at all.
--
-- This replaces that gate with tu_web_prereserve: one SECURITY DEFINER call
-- that resolves the real session, locks it, counts confirmed seats AND
-- outstanding web pre-registrations, and only then inserts — so the check and
-- the write cannot race. A full class records a waitlist row instead, which
-- keeps the demand signal without overselling the mat count.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Time normalizer
-- ─────────────────────────────────────────────────────────────────────────────
-- tu_bookings.class_time stores a 12h display string ("11:00 AM") while
-- tu_class_sessions.start_time is a real time ("11:00:00"). Matching them is
-- what lets a web pre-registration find its session. Mirrors normalizeTime()
-- in src/lib/web-pending-bookings.ts — keep the two in step.
CREATE OR REPLACE FUNCTION tu_parse_class_time(p_raw text)
RETURNS time
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_m      text[];
  v_hour   int;
  v_minute int;
  v_period text;
BEGIN
  IF p_raw IS NULL THEN
    RETURN NULL;
  END IF;

  v_m := regexp_match(btrim(p_raw), '^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$');
  IF v_m IS NULL THEN
    RETURN NULL;
  END IF;

  v_hour   := v_m[1]::int;
  v_minute := v_m[2]::int;
  v_period := upper(coalesce(v_m[3], ''));

  IF v_period = 'PM' AND v_hour < 12 THEN v_hour := v_hour + 12; END IF;
  IF v_period = 'AM' AND v_hour = 12 THEN v_hour := 0;           END IF;

  IF v_hour > 23 OR v_minute > 59 THEN
    RETURN NULL;
  END IF;

  RETURN make_time(v_hour, v_minute, 0);
END $$;

COMMENT ON FUNCTION tu_parse_class_time(text) IS
  'Normalizes a class time string ("11:00 AM" / "11:00:00" / "11:00") to a time, or NULL when unparseable.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1b. Phone identity key
-- ─────────────────────────────────────────────────────────────────────────────
-- The form takes a free-text phone, so the same person arrives as
-- "+57 300 111 2222", "573001112222" or "3001112222". Comparing raw digits
-- treats those as three people — which is how one resubmit becomes three held
-- seats. Colombian and US national numbers are both 10 digits, so the last 10
-- digits identify the human regardless of how they typed the country code.
CREATE OR REPLACE FUNCTION tu_phone_key(p_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
           WHEN length(regexp_replace(coalesce(p_raw, ''), '\D', '', 'g')) >= 10
             THEN right(regexp_replace(coalesce(p_raw, ''), '\D', '', 'g'), 10)
           ELSE regexp_replace(coalesce(p_raw, ''), '\D', '', 'g')
         END;
$$;

COMMENT ON FUNCTION tu_phone_key(text) IS
  'Identity key for a free-text phone: last 10 digits, so country-code variants of the same number collapse.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Atomic public pre-registration
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns jsonb { status, booking_id, spots_left, capacity, confirmed,
--                 pending, session_id }
--   status = 'created'   → seat available, pre-registration recorded
--            'duplicate' → same phone already pending for this slot; no new row
--            'full'      → no room; recorded as a waitlist row instead
--
-- p_hold_hours: how long an unpaid pre-registration holds a provisional seat.
-- Tata confirms these by hand (Admin > Chats "✓ Gestionada"), so the window
-- self-heals when someone fills the form and never pays.
--
-- Dates beyond generated-session coverage have no session row to check; those
-- still record normally (spots_left NULL) rather than being refused.
CREATE OR REPLACE FUNCTION tu_web_prereserve(
  p_name       text,
  p_phone      text,
  p_email      text,
  p_service    text,
  p_date       date,
  p_time       text,
  p_class_name text,
  p_message    text,
  p_hold_hours int DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_time       time;
  v_phone      text;
  v_cutoff     timestamptz;
  v_existing        bigint;
  v_existing_status text;
  v_session_id uuid;
  v_capacity   int;
  v_confirmed  int;
  v_pending    int := 0;
  v_left       int;
  v_status     text;
  v_id         bigint;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' OR p_phone IS NULL OR btrim(p_phone) = '' THEN
    RAISE EXCEPTION 'name and phone are required';
  END IF;

  v_phone  := tu_phone_key(p_phone);
  v_time   := tu_parse_class_time(p_time);
  v_cutoff := now() - make_interval(hours => greatest(coalesce(p_hold_hours, 24), 1));

  -- ── Duplicate guard ───────────────────────────────────────────────────────
  -- One person resubmitting the form (Gianmarco Scarpa hit it 3× in 6 minutes
  -- on 2026-10-17) must not consume three seats or fire three notifications.
  IF v_phone <> '' AND p_date IS NOT NULL AND v_time IS NOT NULL THEN
    SELECT b.id, b.status
      INTO v_existing, v_existing_status
      FROM tu_bookings b
     WHERE b.class_date = p_date
       AND b.status IN ('new', 'waitlist')
       AND tu_phone_key(b.phone) = v_phone
       AND tu_parse_class_time(b.class_time) = v_time
       AND b.created_at > v_cutoff
     ORDER BY b.created_at DESC
     LIMIT 1;

    IF v_existing IS NOT NULL THEN
      -- Report what the original row actually is. A person already on the
      -- waitlist who resubmits must not be told "you're booked".
      RETURN jsonb_build_object(
        'status',          'duplicate',
        'booking_id',      v_existing,
        'existing_status', v_existing_status
      );
    END IF;
  END IF;

  -- ── Resolve + lock the real session ───────────────────────────────────────
  -- FOR UPDATE serializes concurrent pre-registrations for the same class, so
  -- two people cannot both read "1 spot left" and both be accepted.
  IF p_date IS NOT NULL AND v_time IS NOT NULL THEN
    SELECT s.id, s.capacity, coalesce(s.enrolled, 0)
      INTO v_session_id, v_capacity, v_confirmed
      FROM tu_class_sessions s
     WHERE s.session_date = p_date
       AND s.start_time   = v_time
       AND s.status       = 'scheduled'
     LIMIT 1
       FOR UPDATE;
  END IF;

  IF v_session_id IS NOT NULL THEN
    -- Distinct people already holding an unconfirmed web seat for this slot.
    -- Keyed by phone, falling back to a normalized name, so one person with
    -- two submissions counts once.
    SELECT count(DISTINCT coalesce(
             nullif(tu_phone_key(b.phone), ''),
             lower(btrim(coalesce(b.name, '')))
           ))
      INTO v_pending
      FROM tu_bookings b
     WHERE b.class_date = p_date
       AND b.status     = 'new'
       AND tu_parse_class_time(b.class_time) = v_time
       AND b.created_at > v_cutoff;

    v_left := coalesce(v_capacity, 0) - v_confirmed - coalesce(v_pending, 0);
  END IF;

  v_status := CASE WHEN v_session_id IS NOT NULL AND v_left <= 0 THEN 'full' ELSE 'created' END;

  INSERT INTO tu_bookings (
    name, email, phone, service, preferred_date, message,
    source, status, class_date, class_time, class_name
  )
  VALUES (
    btrim(p_name),
    nullif(btrim(coalesce(p_email, '')), ''),
    btrim(p_phone),
    p_service,
    p_date,
    nullif(btrim(coalesce(p_message, '')), ''),
    'website',
    CASE WHEN v_status = 'full' THEN 'waitlist' ELSE 'new' END,
    p_date,
    p_time,
    p_class_name
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status',     v_status,
    'booking_id', v_id,
    'session_id', v_session_id,
    'capacity',   v_capacity,
    'confirmed',  v_confirmed,
    'pending',    CASE WHEN v_status = 'full' THEN v_pending ELSE coalesce(v_pending, 0) + 1 END,
    'spots_left', CASE
                    WHEN v_session_id IS NULL THEN NULL
                    WHEN v_status = 'full'    THEN 0
                    ELSE v_left - 1
                  END
  );
END $$;

COMMENT ON FUNCTION tu_web_prereserve(text, text, text, text, date, text, text, text, int) IS
  'Atomically records a public website pre-registration against REAL tu_class_sessions capacity. Full classes are recorded as waitlist rows, never as seats.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Grants
-- ─────────────────────────────────────────────────────────────────────────────
-- Round 2 lesson: a mutating SECURITY DEFINER RPC must not be callable with
-- the public anon key. /api/bookings calls this with the service role.
REVOKE ALL ON FUNCTION tu_web_prereserve(text, text, text, text, date, text, text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION tu_web_prereserve(text, text, text, text, date, text, text, text, int) FROM anon;
REVOKE ALL ON FUNCTION tu_web_prereserve(text, text, text, text, date, text, text, text, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION tu_web_prereserve(text, text, text, text, date, text, text, text, int) TO service_role;

GRANT EXECUTE ON FUNCTION tu_parse_class_time(text) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION tu_phone_key(text)        TO service_role, authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Index supporting the pending-seat count
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tu_bookings_slot_pending
  ON tu_bookings (class_date, status, created_at)
  WHERE status IN ('new', 'waitlist');
