-- Fix: Replace absolute UNIQUE(session_id, student_id) with partial index
-- The old constraint blocked re-booking after cancellation because
-- cancelled rows still existed in the table with the same (session_id, student_id).
-- The new partial index only enforces uniqueness for non-cancelled bookings.

-- Already applied to production on 2026-05-19
-- ALTER TABLE tu_class_bookings DROP CONSTRAINT tu_class_bookings_session_id_student_id_key;
-- CREATE UNIQUE INDEX idx_active_booking_unique ON tu_class_bookings (session_id, student_id) WHERE status NOT IN ('cancelled');
