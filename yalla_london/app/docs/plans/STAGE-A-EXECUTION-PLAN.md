# Stage A: Infrastructure Completion — Executable Plan

**Created:** March 11, 2026
**Updated:** April 4, 2026
**Reference:** `docs/plans/MASTER-BUILD-PLAN.md`
**Status:** COMPLETE — 16/16 tasks done, ~97% readiness
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

### A.1.1 — GA4 Dashboard Wiring — **DONE**

**Status:** COMPLETED. `lib/analytics/ga4-data-api.ts` uses real JWT credentials with `GOOGLE_SERVICE_ACCOUNT_KEY` JSON blob parsing. Cockpit `buildTraffic()` calls `fetchGA4Metrics()`. Cycle health checks GA4 connectivity. All 4 GA4 env vars set: `GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `GA4_API_SECRET`, `GA4_PROPERTY_ID`. GA4 Measurement Protocol enabled for server-side affiliate click tracking via `lib/analytics/ga4-measurement-protocol.ts`.

---

### A.1.2 — Affiliate Click Tracking — **DONE**

**Status:** ALREADY IMPLEMENTED. Server-side redirect tracking via `/api/affiliate/click/route.ts` + `lib/affiliate/link-tracker.ts` trackClick(). CTA blocks with SID tracking injected by `lib/affiliate/content-processor.ts`. Revenue data flows through `CjClickEvent` table to Affiliate HQ dashboard.

---

### A.1.3 — Per-Site OG Images — **DONE**

**Status:** ALREADY IMPLEMENTED. Dynamic OG image generator at `app/api/og/route.tsx` using Next.js `ImageResponse` (edge runtime). Accepts `?siteId=` and `?title=` params, uses brand colors from `config/sites.ts`. Root layout references `/api/og?siteId=${siteId}` for both OpenGraph and Twitter card images. All 6 sites supported via `getSiteConfig()` color lookup.

---

### A.1.4 — Login Rate Limiting — **DONE**

**Status:** ALREADY IMPLEMENTED. Login route has 5 attempts/15min with progressive delays (1-4s). Middleware adds 5 req/15min on auth routes. Returns 429 with Retry-After header.

---

## Phase A.2: Multi-Site Hardening

**Business goal:** Engine is safe for running multiple live sites simultaneously.

### A.2.1 — CJ Schema Migration — **DONE**

**Status:** COMPLETED. `siteId String?` added to CjCommission, CjClickEvent, CjOffer with `@@index([siteId])`. Migration: `prisma/migrations/20260311_add_siteid_to_cj_models/migration.sql`. Backfill from SID: `UPDATE cj_click_events SET siteId = SPLIT_PART(sessionId, '_', 1)`. `cj-sync.ts` extracts siteId from SID on commission sync. `link-tracker.ts` stores siteId on CjClickEvent. `monitor.ts` scopes queries with `OR: [{ siteId }, { siteId: null }]` pattern. Affiliate HQ tabs filtered by active site.

---

### A.2.2 — Arabic SSR (KG-032) — **DONE**

**Status:** COMPLETED. Added `serverLocale?: 'en' | 'ar'` prop to `BlogPostClient`. `app/blog/[slug]/page.tsx` passes `serverLocale={locale}` where locale is read from `x-locale` header (set by middleware for `/ar/` routes). `BlogPostClient` uses `effectiveLanguage = serverLocale ?? language` so initial SSR HTML contains Arabic content. Full fallback to English when `content_ar` is empty.

---

### A.2.3 — Feature Flags Runtime Wiring — **DONE**

**Status:** ALREADY IMPLEMENTED. `lib/feature-flags.ts` exports `isFeatureFlagEnabled()` with 60s cache, DB + env var fallback. `lib/cron-feature-guard.ts` maps 32+ crons. All cron routes call `checkCronEnabled()` at start.

---

### A.2.4 — Brand Templates for Non-London Sites — **DONE**

**Status:** COMPLETED. `lib/design/brand-provider.ts` `getBrandProfile(siteId)` merges `config/sites.ts` + `destination-themes.ts` into unified BrandProfile for all 6 sites. `lib/design/brand-kit-generator.ts` generates color palettes, typography, logo SVGs, social templates, ZIP export per site. 95% readiness — logo SVGs and social links not yet created for non-London sites.

---

## Phase A.3: Compliance & Social

### A.3.1 — Cookie Consent Banner — **DONE**

**Status:** ALREADY IMPLEMENTED. `components/cookie-consent-banner.tsx` rendered in root layout. Bilingual EN/AR, 4 cookie categories (Necessary/Analytics/Functional/Marketing), localStorage-persisted, auto-applied on load.

---

### A.3.2 — GDPR Data Deletion — **DONE**

**Status:** COMPLETED. Public endpoint `app/api/gdpr/delete/route.ts` accepts email + optional siteId/reason. Deletes EmailSubscriber records, anonymizes CharterInquiry (firstName→`[Deleted]`, email→`deleted-{hash}@anonymized.local`, nulls phone/whatsapp/notes). Logs to AuditLog with GDPR Article 30 compliance action. SHA-256 hash of email used for logging (never logs raw PII). Separate admin endpoint `/api/admin/gdpr` for User account deletion.

---

### A.3.3 — Twitter/X Auto-Publish — **DONE**

**Status:** COMPLETED (code). `lib/social/scheduler.ts` `publishPost()` uses `twitter-api-v2` dynamic import. `app/api/cron/social/route.ts` calls `publishPost()` for Twitter/X platform posts. Code is complete — needs 4 env vars in Vercel: `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`.

---

### A.3.4 — SendGrid Integration — **DONE**

**Status:** COMPLETED. `lib/email/sender.ts` supports SMTP/Resend/SendGrid with auto-detection. Resend is now the primary provider (`RESEND_API_KEY` set in Vercel). 4 React Email templates built (welcome, newsletter-digest, booking-confirmation, contact-confirmation). Webhook handler for bounce/complaint auto-unsubscribe. SendGrid remains available as fallback — add `SENDGRID_API_KEY` to activate.

---

## Phase A.4: Cleanup

### A.4.1 — Orphan Prisma Models Audit — **DONE**

**Status:** COMPLETED (audit). 31 orphan models identified via grep analysis — models in schema.prisma with zero code references. Removal deferred: requires `prisma validate` + `tsc --noEmit` in full environment. Low risk: orphan models add no runtime overhead, just schema bloat. Documented as KG-020.

---

### A.4.2 — Dead Admin Buttons — **DONE**

**Status:** COMPLETED. All admin buttons wired across 50+ pages during dashboard redesign and audit rounds. Create/Edit article buttons navigate to `/admin/editor`. All cron "Run Now" buttons use departures API proxy. `useConfirm` hook replaced all `window.confirm()` calls (21 files). 0 empty `onClick` handlers remain.

---

### A.4.3 — Test Suite Expansion — **DONE**

**Status:** COMPLETED. 131+ smoke tests across 29+ categories in `scripts/smoke-test.ts`. Includes: GA4 wiring (3), affiliate siteId (4), cookie consent (2), GDPR (2), feature flags (3), Arabic SSR (3), OG images (2), login security (2), connection pool (2), pipeline fragility (13), CJ affiliate (8), London News (7), SEO audit scalability (6), plus original 12 categories.

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
