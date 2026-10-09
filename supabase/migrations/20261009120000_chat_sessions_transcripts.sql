-- Chat transcripts: extend tu_chat_sessions to the shape /api/chat-session writes.
-- The table existed with only (id, created_at, updated_at, session_id, messages, extracted)
-- and had ZERO rows — the save endpoint was never wired to the chat widget, and its
-- upsert payload didn't match this schema. This migration aligns the table so website
-- chat conversations persist and are reviewable in Admin > Chats.

ALTER TABLE tu_chat_sessions
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_message text,
  ADD COLUMN IF NOT EXISTS last_message text,
  ADD COLUMN IF NOT EXISTS last_activity timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS extracted_name text,
  ADD COLUMN IF NOT EXISTS extracted_email text,
  ADD COLUMN IF NOT EXISTS extracted_phone text,
  ADD COLUMN IF NOT EXISTS extracted_interests jsonb,
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0;

-- Upsert key for onConflict: "session_id"
CREATE UNIQUE INDEX IF NOT EXISTS uq_tu_chat_sessions_session_id
  ON tu_chat_sessions (session_id);

-- Admin list reads newest-activity-first
CREATE INDEX IF NOT EXISTS idx_tu_chat_sessions_last_activity
  ON tu_chat_sessions (last_activity DESC);

-- PII lock-down (transcripts hold emails/phones). RLS is already ON with a
-- service-role-only policy; also drop the lingering SELECT grant so the table
-- is closed at both layers. All reads/writes go through service-role API routes.
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON tu_chat_sessions FROM anon, authenticated;
