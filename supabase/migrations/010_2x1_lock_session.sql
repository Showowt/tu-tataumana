-- Migration: Lock 2x1 packs to a single session
-- When a 2x1 pack's first credit is used, lock it to that session_id.
-- All subsequent bookings from the same pack must use the same session.

ALTER TABLE tu_packs
  ADD COLUMN IF NOT EXISTS locked_session_id UUID REFERENCES tu_class_sessions(id) DEFAULT NULL;

COMMENT ON COLUMN tu_packs.locked_session_id IS '2x1 packs: locks all credits to a single session after first booking';
