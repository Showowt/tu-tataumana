-- Birthday field on students + durable invite links for first-time portal access.
-- Invite links replace raw Supabase magic links (which broke: implicit-flow hash
-- tokens never reach the server callback, WhatsApp previews consume them, 1h expiry).

ALTER TABLE tu_students ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE tu_students ADD COLUMN IF NOT EXISTS invite_token text;
ALTER TABLE tu_students ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tu_students_invite_token
  ON tu_students (invite_token)
  WHERE invite_token IS NOT NULL;
