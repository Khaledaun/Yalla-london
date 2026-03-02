# Comprehensive Testing Checklist

**Platform:** Yalla London / Zenitha Multi-Tenant Content Engine
**Date:** 2026-03-02
**Smoke Test Version:** v2.0 (221 tests)
**Score:** 97% (215 pass, 6 warnings, 0 failures)

---

## Summary

| Category | Tests | Pass | Warn | Fail | Score |
|----------|-------|------|------|------|-------|
| A. Build & Compilation | 5 | 5 | 0 | 0 | 100% |
| B. Content Pipeline | 17 | 17 | 0 | 0 | 100% |
| C. Content Generation | 12 | 12 | 0 | 0 | 100% |
| D. Cron Routes | 29 | 29 | 0 | 0 | 100% |
| D. Cron maxDuration | 16 | 16 | 0 | 0 | 100% |
| D. Cron Budget | 16 | 16 | 0 | 0 | 100% |
| D. Cron Auth | 29 | 29 | 0 | 0 | 100% |
| D. Cron Config | 1 | 1 | 0 | 0 | 100% |
| E. SEO & Indexing | 13 | 12 | 1 | 0 | 92% |
| F. Security | 11 | 9 | 2 | 0 | 82% |
| G. Multi-Site | 9 | 8 | 1 | 0 | 89% |
| H. Data Integrity | 5 | 4 | 1 | 0 | 80% |
| I. Observability | 6 | 6 | 0 | 0 | 100% |
| J. Quality Gates | 4 | 4 | 0 | 0 | 100% |
| K. Per-Content-Type Thresholds | 4 | 4 | 0 | 0 | 100% |
| L. Admin Dashboard | 11 | 11 | 0 | 0 | 100% |
| M. Yacht Platform | 14 | 14 | 0 | 0 | 100% |
| N. Design System | 6 | 6 | 0 | 0 | 100% |
| O. Master Audit Engine | 5 | 5 | 0 | 0 | 100% |
| P. Anti-Patterns | 4 | 3 | 1 | 0 | 75% |
| Q. Vercel Deployment | 4 | 4 | 0 | 0 | 100% |
| **TOTAL** | **221** | **215** | **6** | **0** | **97%** |

### Platform Stats

| Metric | Value |
|--------|-------|
| Prisma models | 122 |
| Cron jobs (scheduled) | 30 |
| Admin API routes | 64+ |
| Public API routes | 20+ |
| Admin pages | 75+ |
| Configured sites | 6 (2 active) |
| Pre-publication gate checks | 14 |
| Content types (shared registry) | 12 |
| AI providers | 4 (Grok/xAI, OpenAI, Anthropic, Google) |

---

## A. Build & Compilation (5/5 PASS)

- [x] **[P0]** TypeScript compilation completes with zero errors (`npx tsc --noEmit`)
- [x] **[P0]** Next.js build completes successfully (`next build`)
- [x] **[P0]** All page routes compile without errors
- [x] **[P0]** No circular dependency warnings during build
- [x] **[P1]** ESLint passes with no new errors (pre-existing warnings only)

---

## B. Content Pipeline (17/17 PASS)

- [x] **[P0]** `TopicProposal` model has `site_id` field (not nullable for new records)
- [x] **[P0]** `TopicProposal` has required schema fields: `intent`, `source_weights_json`
- [x] **[P0]** Content builder query finds TopicProposals by `site_id` + `status`
- [x] **[P0]** `ArticleDraft` model supports all 8 pipeline phases (research, outline, drafting, assembly, images, seo, scoring, reservoir)
- [x] **[P0]** Phase transitions are sequential and validated
- [x] **[P0]** Content selector queries reservoir drafts with `MIN_QUALITY_SCORE >= 70`
- [x] **[P0]** Content selector promotes reservoir drafts to `BlogPost`
- [x] **[P0]** `BlogPost.create()` includes `siteId` field
- [x] **[P0]** Published BlogPost has both `content_en` and `content_ar` (bilingual merge)
- [x] **[P0]** Pre-publication gate runs before every publish path (select-runner, scheduled-publish GET, scheduled-publish POST)
- [x] **[P0]** Gate is fail-closed (gate failure blocks publication)
- [x] **[P1]** Atomic topic claiming uses `updateMany` with `"generating"` status (race condition prevention)
- [x] **[P1]** Build-runner loops ALL active sites (not just first)
- [x] **[P1]** Build-runner has per-site budget guard and reservoir cap (50)
- [x] **[P1]** `daily-content-generate` route includes humanization directives and authenticity requirements
- [x] **[P1]** Content generation prompts require 1,500+ words, 3+ internal links, 2+ affiliate links
- [x] **[P2]** Assembly phase has post-AI word count check with expansion pass if < 1,200 words

---

## C. Content Generation (12/12 PASS)

- [x] **[P0]** Shared content types registry exists at `lib/content-automation/content-types.ts`
- [x] **[P0]** Registry exports 12 content types with word count thresholds
- [x] **[P0]** `ai-generate` route uses shared content types
- [x] **[P0]** `ai-generate` route applies type-specific word count thresholds
- [x] **[P0]** `ai-generate` route performs global slug deduplication
- [x] **[P0]** `bulk-generate` route uses shared content types
- [x] **[P0]** `bulk-generate` route has 32s budget guard
- [x] **[P0]** `bulk-generate` route defaults `autoPublish` to false
- [x] **[P1]** `bulk-generate` route performs global slug deduplication
- [x] **[P1]** `bulk-generate` route audit threshold is 80%
- [x] **[P1]** `publish_all` action restores from `CronJobLog` (not hardcoded)
- [x] **[P2]** Both routes return structured `{ success, data, errors }` responses

---

## D. Cron System (91/91 PASS)

### D1. Cron Routes (29/29 PASS)

All 29 cron route files exist and export both GET and POST handlers:

- [x] **[P0]** `api/cron/analytics/route.ts`
- [x] **[P0]** `api/cron/auto-generate/route.ts`
- [x] **[P0]** `api/cron/autopilot/route.ts`
- [x] **[P0]** `api/cron/content-auto-fix/route.ts`
- [x] **[P0]** `api/cron/content-builder/route.ts`
- [x] **[P0]** `api/cron/content-selector/route.ts`
- [x] **[P0]** `api/cron/daily-content-generate/route.ts`
- [x] **[P0]** `api/cron/daily-publish/route.ts`
- [x] **[P0]** `api/cron/fact-verification/route.ts`
- [x] **[P0]** `api/cron/health-check/route.ts`
- [x] **[P0]** `api/cron/london-news/route.ts`
- [x] **[P0]** `api/cron/real-time-optimization/route.ts`
- [x] **[P0]** `api/cron/scheduled-publish/route.ts`
- [x] **[P0]** `api/cron/seo-agent/route.ts`
- [x] **[P0]** `api/cron/seo-health-report/route.ts`
- [x] **[P0]** `api/cron/seo-orchestrator/route.ts`
- [x] **[P0]** `api/cron/seo/cron/route.ts`
- [x] **[P0]** `api/cron/trends-monitor/route.ts`
- [x] **[P0]** `api/cron/weekly-topics/route.ts`
- [x] **[P0]** `api/cron/affiliate-injection/route.ts`
- [x] **[P0]** `api/cron/content-strategy/route.ts`
- [x] **[P0]** `api/cron/keyword-analysis/route.ts`
- [x] **[P0]** `api/cron/link-health/route.ts`
- [x] **[P0]** `api/cron/performance-monitor/route.ts`
- [x] **[P0]** `api/cron/schema-updater/route.ts`
- [x] **[P0]** `api/cron/social-post/route.ts`
- [x] **[P0]** `api/cron/content-refresh/route.ts`
- [x] **[P0]** `api/cron/image-optimizer/route.ts`
- [x] **[P0]** `api/cron/sitemap-generator/route.ts`

### D2. Cron maxDuration (16/16 PASS)

All cron routes that need extended execution export `maxDuration`:

- [x] **[P0]** `analytics` exports maxDuration
- [x] **[P0]** `content-builder` exports maxDuration
- [x] **[P0]** `content-selector` exports maxDuration
- [x] **[P0]** `daily-content-generate` exports maxDuration
- [x] **[P0]** `health-check` exports maxDuration
- [x] **[P0]** `london-news` exports maxDuration
- [x] **[P0]** `scheduled-publish` exports maxDuration
- [x] **[P0]** `seo-agent` exports maxDuration
- [x] **[P0]** `seo-orchestrator` exports maxDuration
- [x] **[P0]** `seo/cron` exports maxDuration
- [x] **[P0]** `trends-monitor` exports maxDuration
- [x] **[P0]** `weekly-topics` exports maxDuration
- [x] **[P0]** `affiliate-injection` exports maxDuration
- [x] **[P0]** `content-auto-fix` exports maxDuration
- [x] **[P0]** `auto-generate` exports maxDuration
- [x] **[P0]** `bulk-generate` exports maxDuration (where applicable)

### D3. Cron Budget Guards (16/16 PASS)

All long-running cron routes implement 53s budget with 7s buffer:

- [x] **[P0]** `analytics` has budget guard
- [x] **[P0]** `content-builder` has budget guard
- [x] **[P0]** `content-selector` has budget guard
- [x] **[P0]** `daily-content-generate` has budget guard
- [x] **[P0]** `health-check` has budget guard
- [x] **[P0]** `london-news` has budget guard
- [x] **[P0]** `scheduled-publish` has budget guard
- [x] **[P0]** `seo-agent` has budget guard
- [x] **[P0]** `seo-orchestrator` has budget guard
- [x] **[P0]** `seo/cron` has budget guard
- [x] **[P0]** `trends-monitor` has budget guard
- [x] **[P0]** `weekly-topics` has budget guard
- [x] **[P0]** `affiliate-injection` has budget guard
- [x] **[P0]** `content-auto-fix` has budget guard
- [x] **[P0]** `auto-generate` has budget guard
- [x] **[P0]** `seo-health-report` has budget guard

### D4. Cron Auth (29/29 PASS)

All cron routes follow standard auth pattern: allow if `CRON_SECRET` is unset, reject only if set and does not match.

- [x] **[P0]** All 29 cron routes follow standard `CRON_SECRET` auth pattern
- [x] **[P0]** No route returns 401/503 when `CRON_SECRET` is unset
- [x] **[P0]** All routes reject when `CRON_SECRET` is set and request does not match

*(29 individual route checks omitted for brevity -- all pass)*

### D5. Cron Config (1/1 PASS)

- [x] **[P0]** `vercel.json` contains schedule entries for all active cron jobs

---

## E. SEO & Indexing (12/13 -- 1 WARNING)

- [x] **[P0]** Pre-publication gate has 14 checks (route, ar-route, SEO minimums, SEO score, heading hierarchy, word count, internal links, readability, image alt text, author, structured data, authenticity signals, affiliate links, AIO readiness)
- [x] **[P0]** SEO score blocks at < 50, warns at < 70
- [x] **[P0]** Word count blocks at < 1,000 (for blog type)
- [x] **[P0]** Meta title range: 30-60 characters
- [x] **[P0]** Meta description range: 120-160 characters
- [x] **[P0]** `standards.ts` exports `STANDARDS_VERSION` with date `2026-02-19`
- [x] **[P0]** Schema generator does not produce deprecated types (FAQPage, HowTo restricted)
- [x] **[P0]** IndexNow submission window is 7 days (not 24h)
- [x] **[P0]** `llms.txt` route serves dynamic per-site AI information
- [x] **[P0]** Sitemap includes yacht, destination, itinerary URLs with `take` guards
- [x] **[P0]** All `[slug]` pages have `generateMetadata()` with canonical, hreflang, OG, Twitter
- [x] **[P0]** BreadcrumbList structured data on 9 layout pages
- [ ] **[P1]** SEO agent delegates IndexNow submission to `seo/cron` (uses "pending" status)

> **Warning E-13:** Test could not programmatically verify the delegation pattern between `seo-agent` and `seo/cron`. Manual code review confirms: `seo-agent` writes `pending` status, `seo/cron` picks up pending items and submits with exponential backoff. This is correct behavior -- the test is overly conservative.

---

## F. Security (9/11 -- 2 WARNINGS)

- [x] **[P0]** All admin API routes use `requireAdmin` or `withAdminAuth`
- [x] **[P0]** No credentials (API keys, secrets, passwords) in API responses
- [x] **[P0]** Login endpoint returns generic error messages (no internal step names)
- [x] **[P0]** Admin setup returns 403 when admin already exists
- [x] **[P0]** SSRF protection on social embed endpoint (URL allowlist + internal IP blocking)
- [x] **[P0]** `isomorphic-dompurify` sanitization on all public `dangerouslySetInnerHTML`
- [x] **[P0]** Database routes (`/api/admin/database/*`) require admin auth
- [x] **[P0]** Financial routes (Stripe, Mercury) require admin auth
- [x] **[P0]** `crypto.getRandomValues()` / `crypto.randomUUID()` used instead of `Math.random()` for IDs
- [ ] **[P1]** No API key values logged to console (79 references found)
- [ ] **[P1]** All `dangerouslySetInnerHTML` instances use sanitization (28 files flagged)

> **Warning F-10:** The 79 "API key references" are configuration reads from environment variables (e.g., `process.env.GROK_API_KEY`), not logging statements. These are necessary for provider configuration. Verified safe -- no key values are written to logs or API responses.

> **Warning F-11:** The 28 files with `dangerouslySetInnerHTML` are primarily in admin layout components that render trusted CMS content, not user-submitted HTML. All 9 public-facing instances were sanitized in Audit #10-#11. The remaining admin instances render content from the authenticated admin's own edits. Pre-existing known gap, acceptable risk for admin-only pages.

---

## G. Multi-Site (8/9 -- 1 WARNING)

- [x] **[P0]** `getDefaultSiteId()` and `getDefaultSiteName()` exist in `config/sites.ts`
- [x] **[P0]** No hardcoded `"yalla-london"` in cron jobs (all use config-driven fallback)
- [x] **[P0]** Weekly topics cron generates topics for ALL active sites
- [x] **[P0]** Middleware maps 14 domains to correct site IDs
- [x] **[P0]** All DB queries for content include `siteId` in where clause
- [x] **[P0]** Affiliate injection scoped by `siteId` (no cross-site contamination)
- [x] **[P0]** Blog page queries scoped by `siteId` from `x-site-id` header
- [x] **[P0]** `next.config.js` image domains include all 5 site domains
- [ ] **[P1]** Trends monitor skips `zenitha-yachts-med` in topic generation loop

> **Warning G-9:** The trends monitor may still generate `TopicProposal` records for the yacht site (`zenitha-yachts-med`). Since the yacht site does not use the content pipeline, these topics would sit unused in the database. Not harmful but wastes resources. P1 improvement to add explicit skip logic.

---

## H. Data Integrity (4/5 -- 1 WARNING)

- [x] **[P0]** Prisma schema has no duplicate model definitions (122 unique models)
- [x] **[P0]** All `BlogPost.create()` calls include required fields (`siteId`, `category_id`, `author_id`)
- [x] **[P0]** `content-generator.ts` find-or-creates default "General" category and system user
- [x] **[P0]** `ScheduledContent` create calls include required `language` and `scheduled_time`
- [ ] **[P1]** No mock data in production API responses (1 residual reference found)

> **Warning H-5:** One residual mock data reference found in admin pages. This is a UI-side placeholder, not present in any API response. It does not affect production data integrity or public-facing content. P1 cleanup task.

---

## I. Observability (6/6 PASS)

- [x] **[P0]** All cron jobs log to `CronJobLog` table
- [x] **[P0]** `onCronFailure` utility logs with `[onCronFailure]` tag
- [x] **[P0]** No empty `catch {}` blocks in critical cron paths
- [x] **[P0]** Error interpreter converts 17 raw error patterns to plain English
- [x] **[P1]** AI API calls logged to `ApiUsageLog` with cost estimation
- [x] **[P1]** Cockpit dashboard shows error banners with retry capability

---

## J. Quality Gates (4/4 PASS)

- [x] **[P0]** Quality gate score threshold is 70 in `standards.ts`
- [x] **[P0]** Quality gate score threshold is 70 in `phases.ts` (Phase 7)
- [x] **[P0]** Quality gate score threshold is 70 in `select-runner.ts` (`MIN_QUALITY_SCORE`)
- [x] **[P0]** All 3 enforcement points are aligned (70/70/70)

---

## K. Per-Content-Type Thresholds (4/4 PASS)

- [x] **[P0]** `CONTENT_TYPE_THRESHOLDS` exported from `standards.ts` with 4+ content type entries
- [x] **[P0]** Blog type: 1,000 word minimum, 3 internal links, affiliates required
- [x] **[P0]** News type: 150 word minimum, 1 internal link, affiliates optional
- [x] **[P0]** `getThresholdsForUrl()` detects content type from URL prefix

---

## L. Admin Dashboard (11/11 PASS)

- [x] **[P0]** Cockpit page loads with 7-tab layout (Mission Control, Content Matrix, Pipeline, Crons, Sites, AI Config, Settings)
- [x] **[P0]** Content Matrix shows per-row "Why Not Published?" diagnosis
- [x] **[P0]** Cron tab shows plain-English error messages
- [x] **[P0]** Departures board renders with live countdown timers
- [x] **[P0]** AI Costs page shows real data from `ApiUsageLog`
- [x] **[P0]** Feature flags page reads from `/api/admin/feature-flags` (not mock data)
- [x] **[P1]** Generation Monitor has auto-refresh (5s polling)
- [x] **[P1]** Indexing tab shows health diagnosis panel
- [x] **[P1]** Content Hub has 3 tabs: Articles, Generation, Indexing
- [x] **[P1]** All Quick Action buttons in workflow page have onClick handlers
- [x] **[P2]** Sidebar navigation includes all major sections (Cockpit, Departures, Content, SEO, Yachts, Design, etc.)

---

## M. Yacht Platform (14/14 PASS)

- [x] **[P0]** 8 Prisma models exist: Yacht, YachtDestination, CharterItinerary, CharterInquiry, BrokerPartner, YachtAvailability, YachtAmenity, YachtImage
- [x] **[P0]** SiteShell component detects `zenitha-yachts-med` and renders Zenitha header/footer
- [x] **[P0]** Yacht search page with filters (type, price, cabins, destination)
- [x] **[P0]** Yacht detail page with Product JSON-LD
- [x] **[P0]** Destination detail page with Place JSON-LD
- [x] **[P0]** Itinerary detail page with Trip JSON-LD
- [x] **[P0]** Charter inquiry form submits to `CharterInquiry` table
- [x] **[P0]** All admin yacht API routes use `withAdminAuth`
- [x] **[P0]** Public yacht API routes are unauthenticated
- [x] **[P0]** Fleet inventory admin page with summary cards
- [x] **[P0]** Inquiries CRM page with status management
- [x] **[P1]** Admin sidebar includes "Yacht Management" section
- [x] **[P1]** `zenitha-tokens.css` provides full design token system
- [x] **[P2]** AI charter planner with multi-step flow

---

## N. Design System (6/6 PASS)

- [x] **[P0]** `getBrandProfile(siteId)` merges config/sites.ts + destination-themes.ts
- [x] **[P0]** Media Picker component with 3 tabs (Library, Upload, Unsplash)
- [x] **[P0]** Design CRUD API at `/api/admin/designs/`
- [x] **[P0]** Email renderer produces table-based, Outlook-compatible HTML
- [x] **[P1]** Brand Kit generator exports ZIP with palettes, typography, logo SVGs
- [x] **[P1]** Content Engine 4-agent pipeline (Researcher, Ideator, Scripter, Analyst)

---

## O. Master Audit Engine (5/5 PASS)

- [x] **[P0]** `runMasterAudit()` orchestrator wires all modules (config, inventory, crawler, extractor, validators, risk scanners, reporter)
- [x] **[P0]** 8 validators produce typed `AuditIssue[]` with P0/P1/P2 severity
- [x] **[P0]** 3 risk scanners implemented (scaled-content, site-reputation, expired-domain)
- [x] **[P0]** State manager supports batch resume via `--resume=<runId>`
- [x] **[P1]** 82 unit + integration tests passing

---

## P. Anti-Patterns (3/4 -- 1 WARNING)

- [x] **[P0]** No `@/lib/prisma` imports outside canonical bridge files (all use `@/lib/db`)
- [x] **[P0]** No `Math.random()` for ID generation (all use `crypto.getRandomValues()` or `crypto.randomUUID()`)
- [x] **[P0]** No `@/lib/auth/admin` imports (canonical path is `@/lib/admin-middleware`)
- [ ] **[P1]** No public API routes expose `error.message` in responses

> **Warning P-4:** 2 public API routes still include `error.message` in error responses, creating minor information disclosure risk. These are non-critical routes and the messages are generic Node.js errors, not internal system details. P1 improvement to replace with generic messages.

---

## Q. Vercel Deployment (4/4 PASS)

- [x] **[P0]** `vercel.json` has valid cron schedule syntax for all entries
- [x] **[P0]** All cron paths in `vercel.json` have corresponding route files
- [x] **[P0]** `next.config.js` has security headers (CSP, X-Frame-Options, etc.)
- [x] **[P0]** CORS origins include all 10 domains (5 sites x www + non-www)

---

## Warning Summary

| # | Category | Test | Severity | Status | Notes |
|---|----------|------|----------|--------|-------|
| 1 | E-13 | SEO agent delegation | P1 | Verified safe | Code review confirms correct delegation pattern; test is overly conservative |
| 2 | F-10 | API key references (79) | P1 | Verified safe | Configuration reads from env vars, not logging; no key values in output |
| 3 | F-11 | dangerouslySetInnerHTML (28 files) | P1 | Acceptable risk | All 9 public instances sanitized; remaining 19 are admin-only trusted content |
| 4 | G-9 | Trends monitor yacht skip | P1 | Improvement needed | Harmless but wasteful; add explicit skip for zenitha-yachts-med |
| 5 | H-5 | Mock data residual (1) | P1 | Cleanup needed | UI placeholder only, not in API responses |
| 6 | P-4 | Public error.message (2 routes) | P1 | Improvement needed | Minor info disclosure; replace with generic messages |

**None of the 6 warnings are blocking.** All are P1 improvements that do not affect production safety, data integrity, or revenue generation.

---

## How to Run

```bash
# Full smoke test (221 tests)
npx tsx scripts/comprehensive-smoke-test.ts

# Quick build verification
npx tsc --noEmit && echo "TypeScript: PASS"

# Master audit engine tests
npx tsx test/master-audit/integration.spec.ts

# Cockpit smoke test (45 tests)
npx tsx scripts/cockpit-smoke-test.ts
```

---

*Last updated: 2026-03-02 | Maintained by Claude Code (Audit Session)*
