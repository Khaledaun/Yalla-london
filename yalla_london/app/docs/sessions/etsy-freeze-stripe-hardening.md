# Etsy Freeze + Stripe/PDF Hardening

**Date:** 2026-04-07
**Branch:** `claude/review-affiliate-system-fgthN`

## Pre-Execution Scan Results

### Etsy Files Identified (to freeze)
| File | Type | Lines |
|------|------|-------|
| `lib/commerce/etsy-api.ts` | API client (OAuth, CRUD) | 919 |
| `lib/commerce/etsy-csv-import.ts` | CSV import | 322 |
| `lib/commerce/listing-generator.ts` | AI listing gen | — |
| `app/api/auth/etsy/route.ts` | OAuth start | 66 |
| `app/api/auth/etsy/callback/route.ts` | OAuth callback | 114 |
| `app/api/admin/commerce/etsy/route.ts` | Admin API | 252 |
| `app/admin/etsy/page.tsx` | Admin UI page | ~300 |
| `app/admin/cockpit/commerce/page.tsx` | Commerce cockpit (Tab 5 = Etsy) | ~800 |

**Current gating:** Only `isEtsyConfigured()` (checks env vars). No feature flag.

### Stripe/PDF Flow Verified
| Checkpoint | Status |
|------------|--------|
| `/api/checkout/digital-product` reads from DB (DigitalProduct table) | PASS |
| price, currency, name_en passed correctly to Stripe Checkout | PASS |
| `/api/webhooks/stripe` verifies signature via constructEvent() | PASS |
| Webhook marks Purchase as COMPLETED on checkout.session.completed | PASS |
| `/shop/download` validates token via API call | PASS |
| Null file_url handled with fallback UI message | PASS |
| Stripe env vars set in Vercel | CONFIRMED by owner |

---

## Phase 1: Freeze Etsy

**Strategy:** Add `ETSY_ENABLED` feature flag check at entry point of every Etsy route. If flag is missing or `false`, return 503. Hide Etsy tab in commerce cockpit.

**Files to modify:**
1. `app/api/auth/etsy/route.ts` — add flag check before requireAdmin
2. `app/api/auth/etsy/callback/route.ts` — add flag check at top
3. `app/api/admin/commerce/etsy/route.ts` — add flag check to GET and POST
4. `app/admin/cockpit/commerce/page.tsx` — hide Etsy tab behind flag
5. `app/admin/etsy/page.tsx` — show frozen message

**No code deleted.** Only gating added.

### Phase 1 Results
- [x] `lib/commerce/etsy-api.ts` — Added `isEtsyEnabled()` function checking `ETSY_ENABLED === "true"`. Modified `isEtsyConfigured()` to return false when flag is off.
- [x] `app/api/auth/etsy/route.ts` — Added flag check before requireAdmin, returns 503 JSON
- [x] `app/api/auth/etsy/callback/route.ts` — Added flag check at top, returns 503 JSON
- [x] `app/api/admin/commerce/etsy/route.ts` — Added flag check to both GET and POST handlers via shared `ETSY_FROZEN_RESPONSE`
- [x] `app/admin/etsy/page.tsx` — Shows "Temporarily Unavailable" placeholder when `NEXT_PUBLIC_ETSY_ENABLED !== "true"`
- [x] `app/admin/cockpit/commerce/page.tsx` — Etsy tab shows frozen message instead of EtsyTab component

**Zero code deleted. All Etsy logic preserved. Set `ETSY_ENABLED=true` in Vercel to re-enable.**

---

## Phase 2: Verify & Harden Stripe/PDF Flow

**Scan found zero critical bugs in existing code.** One critical gap found and fixed:

### Gap Found: Missing `/api/products/pdf/download` route
- `/shop/download/page.tsx` fetches from `/api/products/pdf/download?token=...` (line 50)
- This API route **did not exist** — the download page would always show an error
- Created `app/api/products/pdf/download/route.ts` with:
  - Token lookup via `prisma.purchase.findFirst({ where: { download_token } })`
  - Payment status checks (PENDING → 402, FAILED → 402, REFUNDED → 403)
  - Download limit enforcement (count >= limit → 403 with `LIMIT_REACHED` code)
  - Counter increment on each download
  - Returns `fileUrl` (or null if product file not yet uploaded)
  - Proper error codes matching what `/shop/download/page.tsx` expects

### Verification Results
| Checkpoint | Status | Notes |
|------------|--------|-------|
| Checkout reads from DB | PASS | `prisma.digitalProduct.findUnique({ where: { id: productId } })` |
| price/currency/name_en to Stripe | PASS | `unit_amount: product.price`, `currency: product.currency.toLowerCase()`, `name: product.name_en` |
| Webhook signature verification | PASS | `stripe.webhooks.constructEvent(body, signature, webhookSecret)` |
| Purchase marked COMPLETED | PASS | `handleDigitalProductPurchase()` updates status + sets completed_at |
| Download token validated | PASS | New route validates token, checks status, enforces limits |
| Null file_url handled | PASS | UI shows "file is being prepared" message; API returns `fileUrl: null` |
| Shop products from DB | PASS | `/api/shop/products` queries DigitalProduct table with filters |
| TypeScript | PASS | Zero new errors in changed files |
