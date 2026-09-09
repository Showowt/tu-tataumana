-- Pricing cards become the source of truth for pack credits + validity.
-- Applied to prod 2026-09-08 via Management API (as-built record).
--
-- Context: admin "+ PACK" dropdown and all pack-minting routes resolved packs
-- from hardcoded PACK_DEFINITIONS keyed by pack_type. Cards created in
-- /admin/precios without a known pack_type (e.g. "JUST B LOVE", Sep 1) were
-- invisible to pack creation and unpurchasable. These columns let a card carry
-- its own credits/validity; code falls back to PACK_DEFINITIONS when null.

ALTER TABLE tu_pricing_cards
  ADD COLUMN IF NOT EXISTS total_classes integer,   -- -1 = unlimited
  ADD COLUMN IF NOT EXISTS expiration_days integer;

-- Backfill mapped cards from the code constants (identical values → no behavior change)
UPDATE tu_pricing_cards SET total_classes = v.tc, expiration_days = v.ed
FROM (VALUES
  ('WALK_IN',1,14),('JUST_FLOW_PACK',6,45),('TU_HEALING_PACK',8,60),
  ('TU_BALANCE_PACK',12,90),('TU_UNLIMITED',-1,30),('PRIVATE_SESSION',1,30),
  ('MAYO_MAMA',5,30),('MAYO_2X1',2,14),('ANNIVERSARY_5EXP',5,45),
  ('INDUSTRY_SPECIAL',1,7),('FRIDAY_OPEN',1,7),('JUSTB_MEMBERSHIP',8,60)
) AS v(pt,tc,ed)
WHERE tu_pricing_cards.pack_type = v.pt;

-- Map the orphaned JUST B LOVE promo card (Amor & Amistad, Sep 2026)
UPDATE tu_pricing_cards
SET pack_type = 'JUST_B_LOVE', total_classes = 3, expiration_days = 30
WHERE id = '82f6236f-1447-4e4f-94d3-d385550a44a2' AND pack_type = '';

-- One active card per pack_type — resolver reads by pack_type, ambiguity forbidden
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_pricing_card_per_pack_type
  ON tu_pricing_cards (pack_type)
  WHERE is_active AND pack_type <> '';
