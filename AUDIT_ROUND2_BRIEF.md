# ADVERSARIAL AUDIT — ROUND 2 BRIEF
### TU. by Tata Umaña · run in a FRESH session (no ego in the Round-1 code)

> **Why Round 2 is mandatory:** Round 1 found ~40 issues, ~11 P0/P1 (≈27% > 20%).
> Defect-dense first audits always miss *siblings* of what they caught. This round
> hunts those siblings + verifies the Round-1 fixes didn't introduce new defects.
> Read `CHANGELOG.md` first — it lists every Round-1 closure and every deferred item.

## Ground rules
- **Fresh eyes, hostile.** Cite `file:line`; never assert without reading the code.
- **Verify against LIVE data, not just code paths** — Round 1's CORRECT-04 ("money
  100× corruption") was a false positive that a live query disproved. Do the same.
- **Audit-only in the audit phase; no edits.** Close in a second phase, severity-ordered,
  with pasted proof (grep→0 / curl→right code / DB query), battery every 5 closures.

## Constitution battery (must stay green)
```
npx tsc --noEmit            # 0 errors
npm run build               # succeeds
grep -rniE "uvtfipynpwndximtntto|\bkarla\b|lorem ipsum|<other-client-names>" src/   # 0
grep -rnE "(service_role\b|sk-ant-|eyJhbGciOiJ|[0-9]{9,10}:AA[A-Za-z0-9_-]{20,})" src/ | grep -v process.env  # 0
```

## Live DB access (Supabase Management API — read + DDL)
```
TOKEN = macOS keychain: security find-generic-password -s "Supabase CLI" -w
        → strip "go-keyring-base64:" prefix → base64 -d → sbp_...
POST https://api.supabase.com/v1/projects/toutdlfdaviioysyuzxo/database/query
     header: User-Agent: SupabaseCLI/1.0 ; body: {"query":"..."}
```
Prod deploy: `npx vercel --prod` from repo root (git-connect is OFF; CLI push = deploy).
Phil's FortiGate blocks tataumana.com locally — verify via vercel inspect + DB, but
plain curl to www.tataumana.com DID work in Round 1.

## Six hostile passes (fan out as parallel agents)
1. **Dead-end walk** — every CTA/link/form → real destination. (Round 1: clean; re-check
   after the 7 deleted components + disabled yoga/payment legacy branch.)
2. **State grid + i18n** — loading/error/empty/success/edge on every data surface;
   `_es/_en` render mismatches; fallback-masking (Fallback-First is intentional — do NOT
   "fix" by seeding empty).
3. **Failure injection + API contract** — try/catch, input validation, unchecked DB writes,
   rate limits, third-party outage behavior.
4. **Security / authz / payments** — auth on every mutating route, IDOR, webhook signatures,
   payment-amount trust, secret/PII exposure.
5. **Correctness / concurrency** — races, timezone (America/Bogota), cron idempotency,
   money math, counter drift.
6. **Hygiene / spec drift** — TODO/placeholder/dead assets; `BUILD_SPECIFICATION.md` has an
   AS-BUILT header now — verify it against reality.

## PRE-SCOPED HIGH-VALUE TARGETS (Round-1 deferred + likely sibling clusters)
- **Legacy booking path** `tu_class_slots` / `tu_bookings` (`/api/bookings`, `/api/admin/book`)
  — non-atomic capacity (FAIL-07/CORRECT-06). Confirm whether it's still reachable/needed;
  if dead, retire it; if live, make capacity atomic like `tu_class_sessions`.
- **`tu_book_class` / `tu_cancel_booking`** (now dumped to migrations) — AUDIT THE SQL:
  does `tu_book_class` assert `pack.student_id = p_student_id`? (SEC-06 remainder / IDOR).
  Also audit atomicity of credit decrement + `enrolled` bump + `locked_session_id`.
- **Discounts** — CORRECT-07: consume on payment APPROVAL (not on pending tx); enforce
  `max_uses` with a conditional UPDATE. CORRECT-08: 2x1 `locked_session_id` acquired after
  the credit is spent → can split across sessions. Both need RPC-level atomicity.
- **NOTE-01 fallout** — verify the DB-price + floor change: does every purchasable card
  have a valid `pack_type` mapping to `PACK_DEFINITIONS`? (FRIDAY_OPEN + empty pack_type
  cards were non-purchasable.) Confirm no card can charge below floor or mismatch display.
- **admin/check-in** — remaining bare writes (sibling deletes, 2x1 lock update) still
  swallow `{error}` (FAIL-06 partial).
- **admin routes** `request.json()` unguarded → 500 on malformed body (FAIL-09).
- **Verify Round-1 fixes** — the new unique indexes (`tu_attendance.booking_id`,
  `tu_packs.wompi_transaction_id`) and `tu_adjust_enrolled` RPC: any code path that still
  does a plain `.insert()` that could now 23505 unexpectedly? Any enrolled mutation still
  read-modify-write?

## Deliverable
Findings list (ID, severity+justification, file:line, PROOF, fix), then severity-ordered
closure with pasted proof, final battery, and a Round-2 section appended to `CHANGELOG.md`.
Declare SHIP or Round 3.
