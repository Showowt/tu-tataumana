# CHANGELOG — TU. by Tata Umaña

## 2026-08-10 — ADVERSARIAL AUDIT ROUND 2 (fresh-session, 6 passes) — deployed 2158930 + jvsi46jx8

Six cold hostile passes (A–F) with **live rolled-back DB probes**. Round 2 caught what
code-only review missed — including a P0 that Round 1 could not see.

### 🔴 P0 — CLOSED (DB, proven live)
- **R2A-01/02 + systemic RLS-grant hole:** every `tu_` table granted anon/`authenticated`
  INSERT/UPDATE/DELETE, and several had `WITH CHECK(true)` policies. **Proven with a
  live anon insert:** anyone with the public anon key could insert a `confirmed`
  `tu_class_bookings` row (bypassing `tu_book_class` — free unlimited classes); a
  logged-in user could mint a `tu_passes` row; anon could forge `tu_transactions` /
  vandalize `tu_faq|services|teachers|retreats`. **Fix:** blanket `REVOKE INSERT/UPDATE/
  DELETE/TRUNCATE` from anon+authenticated on all `tu_` tables (all legit writes go via
  SECURITY DEFINER RPCs + service_role; browser never writes tables directly). Verified:
  anon/authenticated writes now `permission denied`; service_role + RPCs intact.

### 🔴 Ship-blocker — CLOSED (money)
- **R2F-01:** the PUBLIC card path (`yoga/payment` → `getServicePriceCop`) charged a
  flat **80,000 COP** for every card while the modal displayed the real DB price
  (TU UNLIMITED displayed 1,050,000 → charged 80,000; industry rate overcharged). NOTE-01
  had only fixed the *portal* path. **Fix:** read `tu_pricing_cards` by label (JS match,
  floor-guarded) before the flat fallback.

### P1/MEDIUM — CLOSED
- **R2B-03:** Wompi/Square webhooks stored amount/price_paid in **centavos (100×)** vs
  every other path — latent (no webhook pack minted yet) but the first card payment would
  corrupt records. Normalized to COP pesos.
- **R2B-01:** capped 100%-off codes over-redeemable across students — atomic
  `tu_claim_discount_use` enforces `max_uses` + rollback on exhausted.
- **R2B-05:** admin-verify vs webhook double-mint — admin no longer mints packs for
  gateway (wompi/square) methods (they settle via the signed webhook).
- **R2E-01/R2C-06 & R2E-04:** PostgREST `.or()` filter injection (bookings pass lookup,
  yoga/payment price lookup) — strip phone to digits / sanitize name.
- **R2E-02:** Telegram webhook now **fails closed** when secret unset (was fail-open;
  chat_id is body-forgeable).
- **R2C-01/02:** atomic `tu_slot_reserve` RPC + `UNIQUE(class_date,class_time)` for the
  public website capacity soft-count.
- **R2A-05:** pinned `search_path` on all definer/helper functions.
- **R2D-03:** capture `tu_adjust_enrolled` RPC errors. **R2B-06/07/R2D-02:** free-path
  `uses_count` release on rollback + manual-notification uses DB base price.
- **R2D-01:** rate limiter fails open on unknown IP + signup 5→15/min (shared NAT).
- **R2A-04:** 2x1 guest-booking failure surfaced (not swallowed). **R2F-06:** CMS reorder
  returns 500 on failure. **R2C-05:** `/api/admin/book` is dead (retire — see Round 3).
- Migrations `20260810000000` + `20260810010000` capture the as-built functions + R2 grants.

### Verified SOLID by Round 2 (no change needed)
`tu_book_class` enforces pack ownership (`id=p_pack_id AND student_id=p_student_id FOR
UPDATE`) — student-pack IDOR closed; overbooking/double-spend/double-refund through the
RPC are `FOR UPDATE`-serialized; webhooks fail-closed w/ HMAC; no unauth admin route; no
secret/PII/redirect exposure; timezone + cron idempotency + capacity `>=` all correct.

### Deferred to ROUND 3 (documented risk — see AUDIT_ROUND3_BRIEF.md)
- **2x1 cluster (R2A-03/R2A-04/R2F-02):** the lock write is inert (packs UPDATE is
  admin-only RLS) and reschedule splits a 2x1 — needs a dedicated `tu_book_2x1` definer
  RPC (atomic book-primary + guest + lock). Highest Round-3 priority.
- **R2B-02:** consume discount on payment APPROVAL (webhook/verify), not on the pending tx
  (paid path burns a code on abandonment). **R2B-04:** portal catalog + PackPaymentModal +
  discounts/validate still DISPLAY the constant, not the DB price.
- **R2A-06:** revoke RPC EXECUTE from anon (keep authenticated). **R2A-07:** dump RLS
  policies to VCS. **FAIL-09/R2F-05:** `request.json()` guards on ~11 admin routes (500→400).
- LOW: R2E-03 (booking PATCH IDOR), R2E-05 (pass enum), R2E-06 (discount enum limit),
  R2E-07 (chat-session PII), R2F-08 (dashboard week UTC), R2F-09 (modal subtitle es),
  R2F-10 (session-gen Date), R2F-07 (attendance recovery sweep).

---

## 2026-08-10 — P2/P3 Closure Pass (deployed 27f4751)

Closed NOTE-01 + a large batch of the accepted P2/P3 findings. Battery green
(tsc 0, build ✓); deployed to www.tataumana.com; live-verified; no regressions.

**CLOSED:**
- **NOTE-01** (money) — `payments/create` now charges the admin-editable DB price
  (`tu_pricing_cards.price_cop` by `pack_type`, fallback constant) with a **floor
  (≥10,000 COP)** so a typo can't become a real charge. Decision: DB authoritative.
  Live proof: services/pricing APIs serve edited values; floor blocks underpricing.
- **SEC-05** — legacy client-`amount` branch of `yoga/payment` disabled → `400`.
- **FAIL-10** — generic error messages (signup, student/book).
- **HYG-01/02** — customer email/params + full payload removed from prod logs.
- **HYG-04** — concierge no longer quotes a firm price for the unbuilt content platform.
- **I18N-03** — `/portal/{packs,bookings}` honor `preferred_lang`.
- **STATE-05** — portal dashboard/packs/bookings `load()` try/catch/finally.
- **STATE-02** — ServicesSection renders DB `description_en/es` (proof: API exposes both).
- **FAIL-05** — `AbortSignal.timeout(8000)` on 6 external fetches.
- **FAIL-06** — check-in attendance writes merge-upsert (unique `booking_id`) + error capture.
- **CORRECT-05** — session cancel resets `enrolled=0`.
- **DEADEND-01** — ChatBot fallback uses business WhatsApp (573166333663).
- **DEADEND-02 / HYG-05 / HYG-06** — deleted 7 orphan components (~2,970 lines).
- **SEC-06** (partial) — live DB functions + integrity indexes dumped to
  `supabase/migrations/20260810000000_asbuilt_functions_and_indexes.sql`.

**⚠️ NOTE-01 data cleanup owed by Tata (surfaced, not silently changed):**
- "Just B Membership" card priced **280 COP** (typo for 280,000) — floor now blocks
  it from charging, but fix the card in /admin/precios.
- Cards `VIERNES OPEN FLOW` (`pack_type: FRIDAY_OPEN`) + 2× `JUSTB MEMBERSHIP`
  (`pack_type: ""`) have no matching pack definition → not purchasable. Set a valid
  `pack_type` or mark display-only.

**Still deferred to Round 2:** CORRECT-07 (discount consume timing), CORRECT-08 (2x1
lock atomicity — RPC surgery), FAIL-07/CORRECT-06 (legacy `tu_class_slots` oversell),
FAIL-09 (admin `request.json()` 500s), SEC-04 (phone-matched pass burn — mitigated),
SEC-06 remainder (add `p_pack_id` ownership check inside `tu_book_class`), remaining
check-in sibling-write error captures, HYG-03 (`console.log`→leveled), SEC-07/08 (P3),
SPEC-04–12, CORRECT-09/10.

---

## 2026-08-10 — Adversarial Audit + Gap Closure (Round 1)

Six-pass fresh-eyes adversarial audit of the entire site + software (69 API routes,
29 pages, 28 components), followed by severity-ordered gap closure with live proof.

### Findings by severity
- **P0: 3** — all CLOSED
- **P1: 8** — all CLOSED (1 reclassified to P3 on live evidence)
- **P2: ~18** — accepted/documented (listed below)
- **P3: ~11** — accepted/documented
- **Total: ~40.** P0+P1 = ~11 (≈27%).

### P0 — CLOSED
| ID | Finding | Fix | Proof |
|----|---------|-----|-------|
| SEC-02 / FAIL-01 | `/api/passes` POST/PATCH minted paid passes unauthenticated; booking honored `payment_confirmed:false` | `verifyAdmin` gate on POST/PATCH; bookings require `payment_confirmed=true` | `POST/PATCH /api/passes → 401`; GET → 200 |
| SEC-01 | `/api/auth/signup` could create an admin-email account with attacker password | Reject `ADMIN_EMAILS` at signup + force `role=student` | `signup(admin email) → 403 ×5`. (Not live-exploitable — all 3 admin emails already registered → effectively P1) |
| CORRECT-01 | Free-checkout double-submit minted N free packs | Claim `tu_discount_usage` UNIQUE(code,student) row FIRST as idempotency key + rollback on failure | DB constraint verified; 2nd submit → `23505` → idempotent success |

### P1 — CLOSED
| ID | Finding | Fix | Proof |
|----|---------|-----|-------|
| CORRECT-02 | Duplicate-pack race (verify/webhook check-then-insert) | Atomic `pending→approved` status guard + `UNIQUE tu_packs(wompi_transaction_id)` | index live; verify bails on 0-row update |
| CORRECT-03 | `enrolled` counter drift → overbooking | `tu_adjust_enrolled(session,delta)` atomic RPC replaces read-modify-write in book-class/check-in | function live; 4 call sites swapped |
| FAIL-02 | Approved-payment ledger writes swallowed `{error}` | Capture + loud error log (wompi upsert, square insert) | code |
| FAIL-03 | Attendance insert ignored `{error}` + ran after `checked_in=true` (unrecoverable) | Record attendance FIRST (idempotent via `UNIQUE tu_attendance(booking_id)`), flip `checked_in` only on success | index live; session-complete + cron |
| FAIL-04 / SEC-03 | No rate limiting on public writes | `src/lib/rate-limit.ts` per-IP limiter on signup/bookings/leads/payments-create/chat-session | `signup req 6-7 → 429` |
| I18N-01 | Pricing card labels ignored `label_es` on Spanish site | Render `label_es` when `lang==="es"` | pricing API serves distinct `label_es` (WALK-IN CLASS→CLASE INDIVIDUAL) |
| SPEC-01/02/03 | Spec asserted Stripe/Twilio/Resend/content-platform that don't exist | AS-BUILT DIVERGENCE header on `BUILD_SPECIFICATION.md` | doc |

### Reclassified on live evidence
- **CORRECT-04** (money-unit "100× corruption") **P1 → P3**: live `tu_transactions.amount` is stored in **pesos across every method** (wompi approved 80k–160k, not 8M cents). Only latent items: the unused Square code path multiplies ×100, and `zelle` has one stray USD value. No live corruption.

### DB migrations applied (via Management API — backward-compatible, no existing dupes)
- `CREATE UNIQUE INDEX tu_attendance_booking_id_uniq ON tu_attendance(booking_id)`
- `CREATE UNIQUE INDEX tu_packs_wompi_txid_uniq ON tu_packs(wompi_transaction_id) WHERE wompi_transaction_id IS NOT NULL`
- `CREATE FUNCTION tu_adjust_enrolled(uuid, int)` — atomic clamped enrolled adjust
- ⚠️ These live only in the DB. `supabase/migrations/*` are header stubs — dump real schema/RLS/functions to version control (tracked as SEC-06).

### Accepted / deferred to Round 2 (documented risk)

**P2 (accepted):**
- STATE-01 pricing fallback-masks failure — **intentional per Fallback-First pattern** (do not seed empty).
- I18N-03 `/portal/{packs,bookings}` hardcoded `lang="es"` (English users see Spanish).
- STATE-02 `ServicesSection` renders descriptions by array index, ignores DB `description_*`.
- STATE-05 portal `packs`/dashboard `load()` no try/catch → infinite spinner on network fail.
- FAIL-05 external `fetch` (square/wompi/telegram/digest) lacks timeout → hang risk.
- FAIL-06 `admin/check-in` swallows several write errors (admin-only blast radius).
- FAIL-07 / CORRECT-06 legacy `tu_class_slots` oversell (`bookings/route.ts:79`, `admin/book`) — legacy path, superseded by `tu_class_sessions`.
- FAIL-09 `request.json()` unguarded → 500 on malformed body (admin routes).
- FAIL-10 internal error strings returned to client (signup, student/book).
- SEC-04 booking burns a pass matched only by client phone (mitigated by SEC-02 `payment_confirmed` gate).
- SEC-05 `yoga/payment` legacy branch trusts client `amount` (grants no pack).
- SEC-06 `tu_book_class` pack-ownership unverifiable — DB functions not in version control.
- CORRECT-05 session cancel doesn't zero `enrolled` → phantom-full on reactivate/generate.
- CORRECT-07 discount over-redeem race + code burned on abandoned checkout.
- CORRECT-08 2x1 pack can split across two sessions under concurrent booking.
- HYG-01 customer email logged to prod server logs (3 sites).
- NOTE-01 two sources of truth for pack prices — homepage=DB, `/portal/packs` checkout=hardcoded `lib/constants/packs.ts`.
- SPEC-04/05/06/07-12 spec incompleteness (partially addressed by AS-BUILT header).

**P3 (accepted):**
- DEADEND-01 `ChatBot.tsx` dead `openWhatsApp` handler + US number in AI-fail fallback string.
- DEADEND-02 / HYG-05 / HYG-06 ~2,970 lines dead code (7 orphan components: JustbYogaAcademy, BookingForm, PaymentCheckout, YogaBookingCalendar, ClassSelector, MayEventsSection, TestimonialsSection).
- STATE-06 RetreatsSection fallback-mask · I18N-04 TestimonialsSection English-only (orphan).
- HYG-02 full webhook payload logged · HYG-03 `console.log` in prod (~13 sites) · HYG-04 concierge quotes "$19/mo" for unbuilt content platform.
- SEC-07 Telegram webhook secret fail-open if unset (mitigated — `TELEGRAM_WEBHOOK_SECRET` set in prod 2026-08-07).
- SEC-08 `payments/status` reference enumeration (no PII).
- CORRECT-09/10 timezone in dead `yoga/book` + cron generate (correct at scheduled hour).
- `public/teacher-karla.png` orphan asset (Karla is zero-tolerance; 0 code refs).

### Verdict
**All P0/P1 closed with proof; battery green (tsc 0, build ✓, contamination 0, secrets 0); deployed `e7e1c60` → www.tataumana.com; no dead-end regressions.**

⚠️ **A second full adversarial audit in a fresh session is MANDATORY** — P0+P1 were ≈27% of findings (>20% threshold). First audits on defect-dense code miss siblings of what they caught. Round 2 should target: the legacy `tu_class_slots`/`tu_bookings` booking path (multiple accepted P2s live there), the un-versioned DB functions (SEC-06), and the P2 concurrency items (CORRECT-05/07/08).
