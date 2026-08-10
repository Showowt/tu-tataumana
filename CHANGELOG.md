# CHANGELOG — TU. by Tata Umaña

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
