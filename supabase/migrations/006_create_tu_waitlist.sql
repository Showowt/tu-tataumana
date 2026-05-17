-- ============================================================
-- Migration: 006_create_tu_waitlist.sql
-- Description: Waitlist feature for TU. yoga class sessions
-- Project: TU. by Tata Umana — Supabase project: toutdlfdaviioysyuzxo
-- Date: 2026-05-14
-- Applied via: Supabase MCP execute_sql
-- ============================================================
-- NOTE: The Supabase CLI is linked to the wrong project (tmvgsaztytlzvrnwltmb).
-- Apply via Supabase Management API / MCP only — not CLI push.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TYPE ALIGNMENT NOTES
--   tu_students.id   → UUID  (match: student_id UUID)
--   tu_class_slots.id → BIGINT (match: session_id BIGINT)
-- ────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════
-- UP MIGRATION
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tu_waitlist (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL REFERENCES public.tu_students(id)   ON DELETE CASCADE,
  session_id   BIGINT      NOT NULL REFERENCES public.tu_class_slots(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at  TIMESTAMPTZ,
  status       TEXT        NOT NULL DEFAULT 'waiting',

  CONSTRAINT tu_waitlist_status_check
    CHECK (status IN ('waiting', 'notified', 'booked', 'expired')),

  CONSTRAINT tu_waitlist_unique_entry
    UNIQUE (student_id, session_id)
);

-- ── Indexes ──────────────────────────────────────────────────
-- Fast lookup: "who is waiting / notified for this session?"
CREATE INDEX IF NOT EXISTS idx_tu_waitlist_session_status
  ON public.tu_waitlist (session_id, status);

-- Fast lookup: "all waitlist entries for a student"
CREATE INDEX IF NOT EXISTS idx_tu_waitlist_student_id
  ON public.tu_waitlist (student_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.tu_waitlist ENABLE ROW LEVEL SECURITY;

-- Students can read their own waitlist entries
CREATE POLICY "students_select_own_waitlist"
  ON public.tu_waitlist
  FOR SELECT
  USING (
    student_id = (
      SELECT id FROM public.tu_students
      WHERE auth_id = auth.uid()
    )
  );

-- Service role has full unrestricted access for all server-side operations
-- (notifications, status transitions, admin queries).
-- The anon/authenticated roles never write to this table directly.
CREATE POLICY "service_role_manage_waitlist"
  ON public.tu_waitlist
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════
-- DOWN MIGRATION (rollback)
-- ════════════════════════════════════════════════════════════
-- DROP INDEX  IF EXISTS public.idx_tu_waitlist_student_id;
-- DROP INDEX  IF EXISTS public.idx_tu_waitlist_session_status;
-- DROP TABLE  IF EXISTS public.tu_waitlist;
