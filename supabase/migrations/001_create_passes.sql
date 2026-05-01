-- ============================================================
-- Migration: 001_create_passes.sql
-- Description: Create tu_passes table for yoga class pass tracking
-- Project: TU. by Tata Umana
-- Date: 2026-04-30
-- ============================================================
-- NOTE: The Supabase CLI is linked to the wrong project (tmvgsaztytlzvrnwltmb).
-- Run this via the Supabase Management API or the Dashboard SQL editor
-- against the project matching NEXT_PUBLIC_SUPABASE_URL in Vercel.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- UP MIGRATION
-- ────────────────────────────────────────────────────────────

-- Enable moddatetime extension for updated_at triggers
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ── Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tu_passes (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Client identity (phone is the primary lookup key via WhatsApp)
  phone             TEXT        NOT NULL,
  name              TEXT,
  email             TEXT,

  -- Pass configuration
  -- Valid values: 'MAYO MES MAMÁ' | 'JUST FLOW PACK' | 'TU HEALING PACK' | 'TU EQUILIBRIUM' | 'TU LIFE PACK'
  pass_type         TEXT        NOT NULL,
  total_classes     INTEGER     NOT NULL,          -- -1 = unlimited (TU LIFE PACK)
  classes_used      INTEGER     NOT NULL DEFAULT 0,

  -- Computed: 999 sentinel for unlimited passes so comparisons are safe
  classes_remaining INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN total_classes = -1 THEN 999
      ELSE total_classes - classes_used
    END
  ) STORED,

  -- Lifecycle
  -- Valid values: 'active' | 'expired' | 'cancelled'
  status            TEXT        NOT NULL DEFAULT 'active',
  expires_at        TIMESTAMPTZ,                   -- Required for TU LIFE PACK (end of billing month)

  -- Payment
  -- Valid values: 'wompi' | 'nequi' | 'bancolombia' | 'zelle' | 'cash'
  payment_method    TEXT,
  payment_confirmed BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Constraints
  CONSTRAINT tu_passes_status_check
    CHECK (status IN ('active', 'expired', 'cancelled')),

  CONSTRAINT tu_passes_pass_type_check
    CHECK (pass_type IN (
      'MAYO MES MAMÁ',
      'JUST FLOW PACK',
      'TU HEALING PACK',
      'TU EQUILIBRIUM',
      'TU LIFE PACK'
    )),

  CONSTRAINT tu_passes_total_classes_check
    CHECK (total_classes = -1 OR total_classes > 0),

  CONSTRAINT tu_passes_classes_used_check
    CHECK (classes_used >= 0),

  CONSTRAINT tu_passes_payment_method_check
    CHECK (payment_method IS NULL OR payment_method IN (
      'wompi', 'nequi', 'bancolombia', 'zelle', 'cash'
    )),

  -- Unlimited passes must have an expiry date (their boundary is time, not count)
  CONSTRAINT tu_passes_unlimited_requires_expiry
    CHECK (total_classes != -1 OR expires_at IS NOT NULL)
);

-- ── Indexes ──────────────────────────────────────────────────
-- Primary lookup: find a client's active pass by phone
CREATE INDEX IF NOT EXISTS idx_tu_passes_phone
  ON public.tu_passes (phone);

-- Filter by status frequently (active passes for check-in)
CREATE INDEX IF NOT EXISTS idx_tu_passes_status
  ON public.tu_passes (status);

-- Composite: the most common query pattern — active pass for a phone number
CREATE INDEX IF NOT EXISTS idx_tu_passes_phone_status
  ON public.tu_passes (phone, status);

-- Expiry sweeps (cron job to auto-expire TU LIFE PACK)
CREATE INDEX IF NOT EXISTS idx_tu_passes_expires_at
  ON public.tu_passes (expires_at)
  WHERE expires_at IS NOT NULL;

-- ── updated_at trigger ───────────────────────────────────────
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.tu_passes
  FOR EACH ROW
  EXECUTE PROCEDURE extensions.moddatetime(updated_at);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.tu_passes ENABLE ROW LEVEL SECURITY;

-- POLICY: Service role has full access (admin dashboard, WhatsApp bot, cron jobs)
-- Justification: All writes originate from server-side Edge Functions or API routes
-- that authenticate with the service role key. No client-side writes allowed.
CREATE POLICY "Service role full access"
  ON public.tu_passes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- POLICY: Authenticated admin users can read all passes
-- (Studio owner / staff logged in via Supabase Auth)
CREATE POLICY "Authenticated users can read all passes"
  ON public.tu_passes
  FOR SELECT
  TO authenticated
  USING (true);

-- POLICY: Authenticated admin users can insert passes
CREATE POLICY "Authenticated users can insert passes"
  ON public.tu_passes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- POLICY: Authenticated admin users can update passes
CREATE POLICY "Authenticated users can update passes"
  ON public.tu_passes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- POLICY: Authenticated admin users can delete passes
-- (Soft delete via status = 'cancelled' is preferred; hard delete reserved for admins)
CREATE POLICY "Authenticated users can delete passes"
  ON public.tu_passes
  FOR DELETE
  TO authenticated
  USING (true);

-- POLICY: Anonymous clients cannot access this table directly
-- All client-facing lookups go through the server API (which uses service role)
-- No anon policy = anon is blocked by default.

-- ── Comments ─────────────────────────────────────────────────
COMMENT ON TABLE public.tu_passes IS
  'Tracks yoga class passes sold by TU. by Tata Umana. Phone is the primary lookup key via WhatsApp check-in.';

COMMENT ON COLUMN public.tu_passes.phone IS
  'WhatsApp number in E.164 format (e.g. +573001234567). Used as client identity key.';

COMMENT ON COLUMN public.tu_passes.total_classes IS
  'Number of classes included. -1 means unlimited (TU LIFE PACK monthly subscription).';

COMMENT ON COLUMN public.tu_passes.classes_remaining IS
  'Computed: total_classes - classes_used. Returns 999 for unlimited passes.';

COMMENT ON COLUMN public.tu_passes.expires_at IS
  'Required for TU LIFE PACK (set to last day of billing month). Optional for counted packs.';

COMMENT ON COLUMN public.tu_passes.status IS
  'active = usable. expired = time/classes exhausted. cancelled = refunded or voided.';

-- ────────────────────────────────────────────────────────────
-- ROLLBACK / DOWN MIGRATION
-- Run this block ONLY to undo — do not run alongside the UP block.
-- ────────────────────────────────────────────────────────────
/*
DROP TRIGGER IF EXISTS handle_updated_at ON public.tu_passes;

DROP POLICY IF EXISTS "Service role full access"          ON public.tu_passes;
DROP POLICY IF EXISTS "Authenticated users can read all passes"   ON public.tu_passes;
DROP POLICY IF EXISTS "Authenticated users can insert passes"     ON public.tu_passes;
DROP POLICY IF EXISTS "Authenticated users can update passes"     ON public.tu_passes;
DROP POLICY IF EXISTS "Authenticated users can delete passes"     ON public.tu_passes;

DROP TABLE IF EXISTS public.tu_passes;
*/
