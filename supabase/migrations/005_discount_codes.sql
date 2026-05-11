-- Discount codes table
CREATE TABLE IF NOT EXISTS public.tu_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER DEFAULT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ DEFAULT NULL,
  one_time_per_student BOOLEAN NOT NULL DEFAULT false,
  specific_student_id UUID REFERENCES public.tu_students(id) DEFAULT NULL,
  applicable_packs TEXT[] DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_percentage CHECK (discount_type != 'percentage' OR discount_value <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_codes_upper_code ON public.tu_discount_codes (UPPER(code));

CREATE TABLE IF NOT EXISTS public.tu_discount_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES public.tu_discount_codes(id),
  student_id UUID NOT NULL REFERENCES public.tu_students(id),
  transaction_id UUID REFERENCES public.tu_transactions(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(discount_code_id, student_id)
);

-- Enable RLS
ALTER TABLE public.tu_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tu_discount_usage ENABLE ROW LEVEL SECURITY;

-- Service role has full access (all API operations go through service role)
-- No direct client access — all discount operations are server-side via API routes
CREATE POLICY "service_role_discount_codes" ON public.tu_discount_codes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_discount_usage" ON public.tu_discount_usage
  FOR ALL USING (true) WITH CHECK (true);
