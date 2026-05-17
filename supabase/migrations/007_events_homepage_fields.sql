-- ============================================================
-- Migration: 007_events_homepage_fields.sql
-- Description: Add homepage promo fields to tu_events + storage bucket
-- Project: TU. by Tata Umana — Supabase project: toutdlfdaviioysyuzxo
-- Date: 2026-05-17
-- Applied via: Supabase MCP execute_sql
-- ============================================================

-- Storage bucket for event flyer images (uploaded via Telegram)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-flyers', 'event-flyers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read event flyers" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-flyers');
CREATE POLICY "Service role upload event flyers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-flyers');
CREATE POLICY "Service role update event flyers" ON storage.objects
  FOR UPDATE USING (bucket_id = 'event-flyers');
CREATE POLICY "Service role delete event flyers" ON storage.objects
  FOR DELETE USING (bucket_id = 'event-flyers');

-- Homepage promo fields on tu_events
ALTER TABLE tu_events
  ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'RESERVE YOUR SPOT',
  ADD COLUMN IF NOT EXISTS cta_text_es TEXT DEFAULT 'RESERVA TU CUPO',
  ADD COLUMN IF NOT EXISTS booking_service TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'gold',
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN DEFAULT true;
