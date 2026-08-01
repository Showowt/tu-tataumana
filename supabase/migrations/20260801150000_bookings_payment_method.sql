-- Web bookings: persist the payment method the student selected in the booking modal.
-- Values: cash | nequi | bancolombia | zelle | wompi (null = closed modal before choosing).
-- Used by Telegram /reservas + daily digest to show pending web pre-registrations
-- like "Natalia Guerrero (efectivo - pendiente)".

ALTER TABLE tu_bookings
  ADD COLUMN IF NOT EXISTS payment_method text;

-- The Telegram overlay queries pending web bookings by class date.
CREATE INDEX IF NOT EXISTS idx_tu_bookings_class_date
  ON tu_bookings (class_date)
  WHERE status = 'new';
