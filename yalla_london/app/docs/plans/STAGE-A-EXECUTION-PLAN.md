# Stage A: Infrastructure Completion — Executable Plan

**Created:** March 11, 2026
**Reference:** `docs/plans/MASTER-BUILD-PLAN.md`
**Goal:** Complete all infrastructure gaps so the engine is bulletproof before building new sites.

---

## How to Use This Plan

Each task has:
- **What:** Plain-language description
- **Files:** Exact files to create/modify
- **Verify:** How to confirm it works (using existing tools)
- **Dashboard:** What Khaled sees when it's done

Work through phases in order. Each task follows the mandatory build cycle: Plan → Build → Audit → Log → Fix → Log.

---

## Phase A.1: Revenue Visibility (PRIORITY — Do First)

**Business goal:** Khaled opens his phone and sees real traffic numbers and revenue.

### A.1.1 — GA4 Dashboard Wiring

**What:** Connect Google Analytics 4 Data API to cockpit panels so traffic numbers are real (currently 0s).

**Current state:**
- MCP server (`scripts/mcp-google-server.ts`) can query GA4 — WORKS
- Cockpit Tab 1 has traffic cards — shows 0s
- Env vars `GA4_PROPERTY_ID`, `GA4_CREDENTIALS_JSON` exist in Vercel
- `googleapis` npm package available

**Files to modify:**
1. `lib/analytics/ga4-client.ts` — NEW: GA4 Data API client (reuse MCP server's proven auth pattern)
   - `getMetrics(siteId, dateRange)` → sessions, users, pageViews, bounceRate
   - `getTopPages(siteId, limit)` → page paths ranked by views
   - `getTrafficSources(siteId)` → source/medium breakdown
   - Cache results for 15 min (avoid API quota burn)
2. `app/api/admin/cockpit/route.ts` — Replace stubbed traffic data with `ga4Client.getMetrics()`
3. `app/api/admin/analytics/route.ts` — Wire to ga4-client instead of returning 0s
4. `app/api/admin/cycle-health/route.ts` — Update GA4 health check to verify API connectivity

**Verify:**
- `curl /api/admin/cockpit` → `traffic.sessions > 0`
- Cycle health no longer flags "GA4 not connected"
- Cockpit Mission Control tab shows real numbers on iPhone
- Smoke test: add GA4 connectivity check

**Dashboard impact:** Mission Control tab → traffic cards show real numbers instead of dashes.

---

### A.1.2 — Affiliate Click Tracking

**What:** When a visitor clicks an affiliate link on any article, log it to the database so we can track revenue attribution.

**Current state:**
- `AffiliateClick` Prisma model EXISTS
- CJ SID tracking EXISTS (server-side link decoration)
- No client-side click handler exists

**Files to create/modify:**
1. `components/affiliate-click-tracker.tsx` — NEW: Client component
   - Intercepts clicks on `[data-affiliate-id]` and `[rel*="sponsored"]` links
   - POSTs to `/api/affiliate/track-click` with: articleSlug, affiliatePartner, destinationUrl, siteId
   - Fire-and-forget (don't block navigation)
   - Uses `navigator.sendBeacon()` for reliability (works even on page unload)
2. `app/api/affiliate/track-click/route.ts` — NEW: Public endpoint (no auth — visitor action)
   - Rate limited (100/min per IP)
   - Validates referrer is own domain
   - Creates `AffiliateClick` record with siteId, articleSlug, partner, timestamp
3. `app/blog/[slug]/page.tsx` — Add `<AffiliateClickTracker />` component
4. `app/api/admin/affiliate-hq/route.ts` — Revenue tab queries real `AffiliateClick` data

**Verify:**
- `test-connections.html` → Affiliate panel → "Click Tracking" test returns OK
- Open any article → click affiliate link → check DB has new AffiliateClick record
- Affiliate HQ Revenue tab shows click counts per article
- Smoke test: verify AffiliateClick schema fields exist

**Dashboard impact:** Affiliate HQ → Revenue tab shows real click data per article.

---

### A.1.3 — Per-Site OG Images

**What:** When someone shares a Yalla London URL on WhatsApp/Twitter/LinkedIn, they see a branded preview image instead of a broken image.

**Current state:**
- Root layout references `${baseUrl}/images/${siteConfig.slug}-og.jpg`
- No actual image files exist at those paths

**Files to create:**
1. `public/images/yalla-london-og.jpg` — 1200×630px, navy/gold brand, "Yalla London" text + tagline
2. `public/images/arabaldives-og.jpg` — Turquoise/coral, Maldives imagery
3. `public/images/french-riviera-og.jpg` — Mediterranean navy/champagne
4. `public/images/istanbul-og.jpg` — Burgundy/copper, Bosphorus
5. `public/images/thailand-og.jpg` — Emerald/golden amber
6. `public/images/zenitha-yachts-med-og.jpg` — Navy/gold/aegean, yacht

**Approach:** Use the Design System's `brand-kit-generator.ts` to generate SVG logos, then create OG images from brand colors + text overlay. Alternatively, create simple branded images with site name + tagline using HTML-to-image.

**Verify:**
- `curl -I https://www.yalla-london.com/images/yalla-london-og.jpg` → 200
- Share URL in Slack/WhatsApp → preview shows branded image
- Facebook Debugger tool confirms OG image loads

**Dashboard impact:** Shared links look professional → better click-through from social/messaging.

---

### A.1.4 — Login Rate Limiting

**What:** Prevent brute-force attacks on admin login.

**Current state:**
- Rate limiting middleware exists with 4 tiers
- Login endpoint has NO rate limiting

**Files to modify:**
1. `app/api/admin/login/route.ts` — Add rate limiter (10 attempts per IP per 15 min)
   - On limit exceeded: return 429 with "Too many login attempts. Try again in X minutes."
   - Log blocked attempts to `AuditLog`
2. `lib/rate-limiter.ts` — If not DB-backed, add DB-backed variant using `RateLimitEntry` or similar

**Verify:**
- Smoke test: 11 rapid POST to `/api/admin/login` → 11th returns 429
- `test-connections.html` → Auth panel shows rate limit status
- AuditLog shows blocked attempts

**Dashboard impact:** Security hardened — no more unlimited login attempts.

---

## Phase A.2: Multi-Site Hardening

**Business goal:** Engine is safe for running multiple live sites simultaneously.

### A.2.1 — CJ Schema Migration (BLOCKER for site #2)

**What:** Add `siteId` to CJ models so revenue data doesn't leak between sites.

**Files to modify:**
1. `prisma/schema.prisma` — Add `siteId String?` to: CjCommission, CjClickEvent, CjOffer
2. `prisma/migrations/YYYYMMDD_add_cj_site_id/migration.sql` — ALTER TABLE ADD COLUMN
3. `lib/affiliate/cj-sync.ts` — Set siteId on commission records from SID parameter
4. `lib/affiliate/link-tracker.ts` — Set siteId on CjClickEvent from `x-site-id` header
5. `lib/affiliate/deal-discovery.ts` — Set siteId on CjOffer records
6. `lib/affiliate/monitor.ts` — Scope all aggregate queries by siteId where field exists
7. `app/api/admin/affiliate-hq/route.ts` — Revenue/links/deals tabs filtered by active site

**Verify:**
- `npx prisma validate` → 0 errors
- Smoke test: CJ models include siteId field
- Affiliate HQ with site selector shows per-site data only
- No cross-site revenue leakage in reports

---

### A.2.2 — Arabic SSR (KG-032)

**What:** Server-render Arabic HTML at `/ar/` routes so Google indexes Arabic content properly.

**Current state:**
- `/ar/` routes return 200 but serve English HTML
- hreflang tags promise Arabic content at `/ar/` paths
- Client-side React switches to Arabic after hydration — Google never sees it

**Files to modify:**
1. `middleware.ts` — Set `x-locale: ar` header when path starts with `/ar/`
2. Key page layouts (`about`, `contact`, `blog`, `hotels`, `experiences`, etc.) — Read `x-locale` from headers, return Arabic content from server
3. `components/content-renderer.tsx` or equivalent — Accept `locale` prop, render `content_ar`/`title_ar` when `locale === 'ar'`

**Verify:**
- `curl https://www.yalla-london.com/ar/about` → response contains Arabic text (right-to-left)
- Google Search Console → URL Inspection on `/ar/about` → shows Arabic content
- hreflang reciprocity: EN page links to AR, AR page links to EN

**Dashboard impact:** Arabic pages start appearing in Google index → doubles content footprint.

---

### A.2.3 — Feature Flags Runtime Wiring

**What:** Connect stored feature flags to actual runtime behavior.

**Current state:**
- FeatureFlag DB table exists with real flags
- `checkCronEnabled()` works for cron jobs
- Other runtime checks don't read from DB

**Files to modify:**
1. `lib/feature-flags.ts` — NEW: `isFeatureEnabled(flagKey, siteId?)` with 60s cache
2. Key integration points:
   - Content pipeline: check `content_pipeline_enabled` before processing
   - Affiliate injection: check `affiliate_injection_enabled` before injecting
   - Social posting: check `social_auto_publish_enabled` before posting
   - Email campaigns: check `email_campaigns_enabled` before sending

**Verify:**
- Feature flags page → toggle a flag → runtime behavior changes within 60s
- Smoke test: `isFeatureEnabled()` reads from DB, returns boolean
- Cockpit shows flag state per feature

---

### A.2.4 — Brand Templates for Non-London Sites

**What:** Ensure brand-kit-generator produces correct output for all 5 sites.

**Files to modify:**
1. `lib/design/brand-provider.ts` — Verify `getBrandProfile()` returns correct colors for all sites
2. `lib/design/brand-kit-generator.ts` — Test generation for each siteId
3. Add destination-specific design tokens for remaining sites (if missing from `destination-themes.ts`)

**Verify:**
- `/api/admin/brand-kit?siteId=arabaldives` → returns valid ZIP
- Each site's brand kit has correct colors matching `destination-themes.ts`

---

## Phase A.3: Compliance & Social

### A.3.1 — Cookie Consent Banner

**What:** EU/UK GDPR requires cookie consent before setting non-essential cookies.

**Files to create:**
1. `components/cookie-consent.tsx` — NEW: Banner component
   - Shows on first visit, remembers choice in localStorage
   - "Accept All" / "Essential Only" buttons
   - Links to privacy policy
   - Blocks GA4 + social tracking scripts until consent given
2. `app/layout.tsx` — Add `<CookieConsent />` to root layout
3. `lib/consent.ts` — NEW: `hasConsent(category)` helper for conditional script loading

**Verify:**
- Visit site in incognito → banner appears
- Click "Accept" → banner disappears, GA4 loads
- Click "Essential Only" → banner disappears, GA4 does NOT load
- Return visit → no banner (choice remembered)

---

### A.3.2 — GDPR Data Deletion

**What:** Users can request deletion of their data (email subscribers, inquiry forms).

**Files to create:**
1. `app/api/gdpr/delete/route.ts` — NEW: Public endpoint
   - Accepts email address
   - Deletes from: EmailSubscriber, CharterInquiry, CjClickEvent (by email)
   - Logs deletion to AuditLog
   - Returns confirmation
2. Privacy policy page — Add "Request Data Deletion" section with link

**Verify:**
- POST `/api/gdpr/delete` with test email → returns success
- Verify records deleted from relevant tables
- AuditLog shows deletion event

---

### A.3.3 — Twitter/X Auto-Publish

**What:** Wire Twitter API so social cron publishes posts automatically.

**Current state:** Social scheduler exists, cron exists, just needs API keys configured.

**Files to verify/modify:**
1. `lib/social/scheduler.ts` — Verify Twitter publish function works with API v2
2. `app/api/cron/social/route.ts` — Verify posts marked as "published" after successful tweet

**Verify:**
- Add env vars: `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`
- Social calendar → schedule post → cron fires → post appears on Twitter
- Social calendar shows "Published" badge

---

### A.3.4 — SendGrid Integration

**What:** Wire email campaigns to actually send via SendGrid.

**Current state:** Email sender supports SMTP/Resend/SendGrid, just needs keys.

**Files to verify:**
1. `lib/email/sender.ts` — Verify SendGrid integration works
2. `app/api/admin/email-center/route.ts` — Test send endpoint

**Verify:**
- Add env var: `SENDGRID_API_KEY`
- Email center → Test Send → email arrives
- Cockpit email panel shows "Provider: Active"

---

## Phase A.4: Cleanup

### A.4.1 — Orphan Prisma Models Audit

**What:** Remove unused models that add schema complexity without value.

**Approach:**
1. Grep entire codebase for each model name
2. Models with 0 references outside schema.prisma → candidates for removal
3. Preserve models used by: DB migrations, API routes, admin pages, cron jobs

**Verify:**
- `npx prisma validate` after removal
- `npx tsc --noEmit` → 0 errors
- Smoke test passes

---

### A.4.2 — Dead Admin Buttons

**What:** Find and wire all non-functional buttons in admin pages.

**Approach:**
1. Grep for `TODO`, `// not implemented`, `onClick={() => {}}`, `disabled` in admin pages
2. Wire each to its correct API endpoint or remove if obsolete

**Verify:**
- Manual click-through of all admin pages
- No button shows "Not implemented" toast

---

### A.4.3 — Test Suite Expansion

**What:** Expand smoke tests to cover all fragility patterns and new features.

**Target:** 120+ tests across 20+ categories.

**New test categories to add:**
- GA4 connectivity (3 tests)
- Affiliate click tracking (4 tests)
- Cookie consent (2 tests)
- GDPR deletion (2 tests)
- Feature flags runtime (3 tests)
- Arabic SSR (3 tests)
- CJ siteId scoping (3 tests)
- OG image existence (2 tests)
- Login rate limiting (2 tests)

**Verify:**
- `npx tsx scripts/smoke-test.ts` → 120+ PASS, 0 FAIL

---

## Execution Order & Dependencies

```
A.1.1 GA4 Wiring ──────────────────┐
A.1.2 Click Tracking ──────────────┤
A.1.3 OG Images ───────────────────┤── Phase A.1 (parallel, no deps)
A.1.4 Login Rate Limit ────────────┘
                                    │
                                    ▼
A.2.1 CJ Schema Migration ─────────┐
A.2.2 Arabic SSR ───────────────────┤── Phase A.2 (A.2.1 blocks Stage B)
A.2.3 Feature Flags ────────────────┤
A.2.4 Brand Templates ─────────────┘
                                    │
                                    ▼
A.3.1 Cookie Consent ──────────────┐
A.3.2 GDPR Deletion ───────────────┤── Phase A.3 (parallel)
A.3.3 Twitter API ──────────────────┤
A.3.4 SendGrid ────────────────────┘
                                    │
                                    ▼
A.4.1 Orphan Models ───────────────┐
A.4.2 Dead Buttons ────────────────┤── Phase A.4 (parallel)
A.4.3 Test Expansion ──────────────┘
                                    │
                                    ▼
                            STAGE B BEGINS
```

---

## Tools Khaled Needs to Provide/Configure

| Tool/Key | Where to Add | Why |
|----------|-------------|-----|
| `GA4_CREDENTIALS_JSON` | Vercel env vars | Already exists — verify it's valid JSON |
| `GA4_PROPERTY_ID` | Vercel env vars | Already exists — verify correct property |
| `TWITTER_API_KEY` + 3 more | Vercel env vars | For social auto-publish |
| `SENDGRID_API_KEY` | Vercel env vars | For email campaigns |
| DNS for zenithayachts.com | Vercel dashboard | Point domain to Vercel |
| CJ advertiser applications | CJ dashboard | Apply to more advertisers |

---

## Post-Completion Checklist (Before Starting Stage B)

- [ ] `npx tsx scripts/smoke-test.ts` → 120+ PASS, 0 FAIL
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Cockpit Mission Control → all cards show real data (not 0s)
- [ ] Affiliate HQ → Revenue tab shows click data
- [ ] Cycle Health → Grade A (no critical findings)
- [ ] System Health Audit → 0 critical, 0 high findings
- [ ] Aggregated Report → composite score ≥ 85/100
- [ ] 24h cron log → 0 failures, 0 pool exhaustion
- [ ] Share yalla-london.com on WhatsApp → branded OG image appears
- [ ] CJ models have siteId fields in schema
- [ ] `/ar/about` returns Arabic HTML in `curl` response
- [ ] Cookie consent banner appears on first visit
- [ ] Login returns 429 after 10 rapid attempts

---

*This plan should be executed across 4-6 Claude Code sessions.*
*Phase A.1 tasks are independent — run all 4 in parallel in a single session.*
*Update CLAUDE.md after each phase completes.*
