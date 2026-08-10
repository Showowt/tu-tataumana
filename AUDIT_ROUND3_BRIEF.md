# ADVERSARIAL AUDIT — ROUND 3 BRIEF
### TU. by Tata Umaña · run in a FRESH session

> Round 2 closed the P0 systemic RLS-grant hole + the public-path mispricing ship-blocker
> and most MEDIUMs (see CHANGELOG "ROUND 2"). Round 3 = close the deferred cluster + a
> fresh cold pass to confirm no siblings remain. Ground rules unchanged: audit cold,
> verify against LIVE data (rolled-back probes), cite file:line, close severity-ordered
> with pasted proof, battery every 5. Management-API token recipe + battery: see the
> retained notes in CHANGELOG / this repo's git history.

## Priority 1 — Rebuild 2x1 atomicity (R2A-03 / R2A-04 / R2F-02)
The 2x1 promo is broken end-to-end today:
- The route-level `locked_session_id` write (`student/book` ~L124) runs on the RLS
  client and `tu_packs` UPDATE is admin-only → **the lock is never set** (inert).
- The guest booking calls `tu_book_class(p_student_id=guest, p_pack_id=primary's pack)`;
  `tu_book_class` enforces `pack.student_id=p_student_id` → **guest is rejected**, so a
  paid 2-for-1 yields ONE seat (Round 2 now logs the failure, doesn't fix it).
- `reschedule` (admin/check-in) moves one leg, splitting the pair across two sessions.
**Fix:** a dedicated SECURITY DEFINER `tu_book_2x1(p_pack_id, p_session_id, p_guest_name)`
that verifies ownership by the primary, books both attendees, deducts 2 credits, and sets
`locked_session_id` atomically. Make reschedule move both legs (or reject a 2x1 leg).
Verify with live rolled-back concurrent probes.

## Priority 2 — Discount + price display consistency
- **R2B-02:** move `consumeDiscountCode` out of the pending-tx path; consume on APPROVAL
  (Wompi/Square `handleApprovedPayment`, admin verify) so an abandoned card checkout
  doesn't burn a capped/one-time code. (Free path already consumes correctly.)
- **R2B-04:** source the portal catalog, `PackPaymentModal`, and `/api/discounts/validate`
  from `/api/public/pricing` (DB) with the constant as fallback — the same precedence the
  CHARGE now uses — so display == charge after `/admin/precios` edits.

## Priority 3 — DB security hardening finish
- **R2A-06:** `REVOKE EXECUTE` on `tu_book_class`/`tu_cancel_booking`/`tu_adjust_enrolled`/
  `tu_slot_reserve` FROM anon (GRANT to authenticated + service_role) so the mutating RPCs
  aren't callable with the public anon key. Test student booking still works after.
- **R2A-07:** dump all `tu_*` RLS policies + role grants into a migration (VCS parity).

## Priority 4 — Robustness sweep (LOW, mechanical)
- **FAIL-09/R2F-05:** wrap `request.json()` in `.catch(()=>null)` + 400 across the ~11
  admin routes listed in the Round-2 Pass-F report (check-in, cms, events, pack ×2,
  discounts ×2, sessions, students, pricing ×2, book-class).
- **R2E-03** (booking PATCH ownership), **R2E-05** (pass GET enum/rate-limit),
  **R2E-06** (discount-validate rate-limit), **R2E-07** (chat-session opaque session_id),
  **R2F-08** (dashboard week = Colombia boundaries), **R2F-09** (modal subtitle honors es),
  **R2F-10** (session-gen uses getColombia*), **R2F-07** (attendance recovery sweep for
  completed sessions whose bookings are still confirmed+checked_in=false).

## Fresh cold pass
Re-run the 6 hostile passes on the current HEAD — Round 2 changed grants, added RPCs, and
touched the money paths; confirm no new siblings (esp. any table write that now relies on
a definer RPC that could be called as anon, and any `.insert()` that could 23505 on the
new unique indexes). Then declare SHIP or Round 4.

## Owner (Tata) data cleanup — DONE (2026-08-10, handled on our end)
Added FRIDAY_OPEN + JUSTB_MEMBERSHIP to PACK_DEFINITIONS; DB-mapped the $280,000 JUSTB
MEMBERSHIP card and deactivated the $280 typo duplicate. Every active `tu_pricing_cards`
row now maps to a valid pack definition (verified live). No open pricing-data items.
