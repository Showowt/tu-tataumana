-- System logs table for admin-visible error tracking
-- Migration 008: tu_system_logs

CREATE TABLE IF NOT EXISTS public.tu_system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('error', 'payment', 'booking', 'discount', 'auth', 'system')),
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  details JSONB DEFAULT NULL,
  route TEXT DEFAULT NULL,
  student_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_logs_created_at ON public.tu_system_logs (created_at DESC);
CREATE INDEX idx_system_logs_category ON public.tu_system_logs (category);
CREATE INDEX idx_system_logs_level ON public.tu_system_logs (level);

ALTER TABLE public.tu_system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_system_logs" ON public.tu_system_logs
  FOR ALL USING (true) WITH CHECK (true);
