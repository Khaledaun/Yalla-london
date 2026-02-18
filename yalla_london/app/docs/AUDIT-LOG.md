# Platform Audit Log

> Persistent tracking of all audit findings, fixes, and outcomes.
> Updated each session. Referenced by future audits for regression checks.

---

## Audit Sessions

| # | Date | Scope | Findings | Fixed | Remaining |
|---|------|-------|----------|-------|-----------|
| 1 | 2026-02-18 | SEO standards, multi-site scoping, dashboard data | 18 issues | 18 | 0 |
| 2 | 2026-02-18 | Schema validation, field names, hardcoded fallbacks | 9 issues | 9 | 0 |
| 3 | 2026-02-18 | Deep comprehensive audit (6 dimensions) | 45+ issues | 15 | 30+ (documented) |
| 4 | 2026-02-18 | API routes, pipeline, frontend, schema, security, config | 80+ issues | 11 | 70+ (documented) |

---

## Audit #1 — SEO Standards Overhaul & Dashboard Data Integrity

**Date:** 2026-02-18
**Trigger:** Research report on 2025-2026 SEO changes (deprecated schemas, CWV updates, algorithm shifts)
**Scope:** SEO standards alignment, multi-site scoping, dashboard mock data
**Commit:** `1ad23d1` — `feat: SEO standards overhaul, multi-site scoping, dashboard data integrity`

### Findings

#### A1-001: Phase 7 Quality Gate Threshold Mismatch
- **Issue:** `phases.ts` used `>= 50` threshold but `standards.ts` defines `qualityGateScore: 60`
- **Error:** Articles scoring 50–59 would pass Phase 7 but get blocked at pre-publication gate
- **What went wrong:** Two files defining the same threshold independently without cross-reference
- **What it affects:** Content pipeline — drafts could oscillate between "reservoir" and "rejected" states
- **Fix:** Changed `phases.ts` line ~760 from `>= 50` to `>= 60`
- **Verification:** Threshold now consistent across `standards.ts`, `phases.ts`, and pre-pub gate
- **File:** `lib/content-pipeline/phases.ts`

#### A1-002: Deprecated FAQPage Schema Generation
- **Issue:** `enhanced-schema-injector.ts` generated FAQPage JSON-LD schema
- **Error:** FAQPage restricted to government/health sites only since August 2023 — generates no rich results for travel sites
- **What went wrong:** Schema code predated Google's deprecation announcement
- **What it affects:** Wasted structured data that Google ignores; potential "invalid schema" warnings in Search Console
- **Fix:** Replaced FAQPage generation with Article schema; added deprecation comment
- **Verification:** `isSchemaDeprecated('FAQPage')` returns true in standards.ts
- **File:** `lib/seo/enhanced-schema-injector.ts` (lines 226-245)

#### A1-003: Deprecated HowTo Schema Generation
- **Issue:** `enhanced-schema-injector.ts` generated HowTo JSON-LD schema
- **Error:** HowTo deprecated September 2023 — no longer generates rich results
- **What went wrong:** Same as A1-002
- **What it affects:** Same as A1-002
- **Fix:** Replaced HowTo generation with Article schema; added deprecation comment
- **Verification:** `isSchemaDeprecated('HowTo')` returns true in standards.ts
- **File:** `lib/seo/enhanced-schema-injector.ts` (lines 226-245)

#### A1-004: SEO Score Bonuses for Deprecated Schemas
- **Issue:** `enhanced-schema-injector.ts` awarded +10 SEO score for FAQ and HowTo schemas
- **Error:** Inflated SEO scores for deprecated, non-functional schema types
- **What went wrong:** Score bonuses weren't updated when Google deprecated the types
- **What it affects:** Quality gate scoring — articles with deprecated schemas got artificially higher scores
- **Fix:** Removed bonus scoring for FAQ/HowTo; added comment explaining removal
- **Verification:** No score bonuses for deprecated types remain
- **File:** `lib/seo/enhanced-schema-injector.ts` (lines 375-376)

#### A1-005: Enhanced Schema Injector Hardcoded Branding
- **Issue:** Constructor hardcoded "Yalla London", email, social URLs for all sites
- **Error:** All 5 sites would get Yalla London branding in their structured data
- **What went wrong:** Component built for single-site, never updated for multi-site
- **What it affects:** Schema markup accuracy for Arabaldives, Yalla Riviera, Yalla Istanbul, Yalla Thailand
- **Fix:** Added `siteId` parameter; constructor loads brand config from `getSiteConfig()`
- **Verification:** Each site gets its own name, description, domain in schema output
- **File:** `lib/seo/enhanced-schema-injector.ts` (lines 40-75)

#### A1-006: Schema Generator Hardcoded Logo/Author
- **Issue:** Logo path hardcoded as `/images/logo.svg`, author as "Yalla London Team"
- **Error:** All sites share same logo path and author attribution
- **What went wrong:** Single-site assumption in schema generator
- **What it affects:** Schema accuracy for non-Yalla-London sites
- **Fix:** Logo uses `brandConfig.logoFileName`, author uses `brandConfig.siteName`
- **Verification:** Dynamic branding flows through from constructor config
- **Files:** `lib/seo/schema-generator.ts` (lines 264, 282)

#### A1-007: Content-Indexing API Hardcoded Site IDs (×3)
- **Issue:** Three instances of hardcoded `"yalla-london"` as default siteId
- **Error:** Non-Yalla-London sites would submit indexing as wrong site
- **What went wrong:** API route copied from single-site implementation
- **What it affects:** URLIndexingStatus records would have wrong site_id
- **Fix:** All 3 replaced with `getDefaultSiteId()` from config
- **File:** `app/api/admin/content-indexing/route.ts`

#### A1-008: Full-Audit API Hardcoded Site ID
- **Issue:** Hardcoded `"yalla-london"` fallback in SEO full-audit route
- **Error:** Audit results tagged to wrong site for multi-site deployments
- **Fix:** Replaced with `getDefaultSiteId()`
- **File:** `app/api/seo/full-audit/route.ts`

#### A1-009: Pre-Publication Gate Hardcoded Domain List
- **Issue:** Internal links regex hardcoded 5 domains: `yalla-london|arabaldives|...`
- **Error:** New sites added to config wouldn't be counted as internal links
- **What went wrong:** Static regex instead of config-driven
- **What it affects:** Internal link count check (minimum 3 per article) could fail for new sites
- **Fix:** Regex now dynamically built from `SITES` config object
- **File:** `lib/seo/orchestrator/pre-publication-gate.ts`

#### A1-010–A1-016: Dashboard Mock Data (7 instances)
- **A1-010:** Social posts API — `Math.random()` engagement stats → returns null
- **A1-011:** Social page — fake "+2.5% this week" growth claims → removed
- **A1-012:** Social page — mockPosts fallback array → empty state
- **A1-013:** PDF guide page — mockGuides fallback → empty state
- **A1-014:** Flags API — hardcoded `cronStatus: 'running'` → real CronJobLog query
- **A1-015:** Rate-limiting API — `Math.random()` stats → zero-initialized
- **A1-016:** Articles performance API — hardcoded "yalla-london" → dynamic siteId
- **Files:** 7 files across `app/api/admin/` and `app/admin/`

#### A1-017: SEO Report API Hardcoded Domain
- **Issue:** Hardcoded `yallalondon.com` fallback URL
- **Fix:** Replaced with `getSiteDomain(getDefaultSiteId())`
- **File:** `app/api/admin/seo-report/route.ts`

#### A1-018: Pre-Publication Gate Meta Thresholds Too Low
- **Issue:** Meta title min 20 chars, meta description min 50 chars, word count blocker 500
- **Error:** Thresholds below Google's current best practices (30/70/800)
- **Fix:** Updated to match `standards.ts` values: title ≥30, description ≥70, blocker ≥800
- **File:** `lib/seo/orchestrator/pre-publication-gate.ts`

---

## Audit #2 — Schema Validation & Hardcoded Fallback Purge

**Date:** 2026-02-18
**Trigger:** User request for comprehensive end-to-end validation
**Scope:** Prisma schema match, field names, remaining hardcoded fallbacks
**Commit:** `2caea4f` — `fix: Schema mismatches, AuditLog field names, 15+ hardcoded fallbacks`

### Findings

#### A2-001: BlogPost `structured_data_json` Field Doesn't Exist
- **Issue:** Pre-pub gate interface defined `structured_data_json?: any` and check 11 read it
- **Error:** Field doesn't exist in BlogPost Prisma model — runtime would always be undefined
- **What went wrong:** Pre-pub gate assumed structured data stored in DB; it's actually auto-injected at render time by EnhancedSchemaInjector
- **What it affects:** Check 11 (structured data presence) always passed vacuously — no meaningful validation
- **Fix:** Removed field from interface; check 11 now uses `keywords_json` as proxy signal for structured data readiness
- **Verification:** Confirmed BlogPost schema — no `structured_data_json` field; JSON-LD injected at render
- **File:** `lib/seo/orchestrator/pre-publication-gate.ts`

#### A2-002: AuditLog Wrong Field Names in Analytics Route
- **Issue:** Code used `entity_type`, `entity_id`, `user_id`, `ip_address`, `created_at`
- **Error:** Prisma model uses `resource`, `resourceId`, `userId`, `ipAddress`, `timestamp`
- **What went wrong:** Code written using assumed column names rather than checking schema
- **What it affects:** `prisma.auditLog.create()` would throw at runtime → analytics config updates silently fail
- **Fix:** Mapped all 5 fields to correct Prisma model names
- **Verification:** Cross-checked against `prisma/schema.prisma` AuditLog model
- **File:** `app/api/admin/analytics/route.ts` (line ~326)

#### A2-003: SEO Agent — 3 Hardcoded URL Fallbacks
- **Issue:** `checkIndexingStatus`, `submitNewUrls`, `verifySitemapHealth` all had hardcoded `"https://www.yalla-london.com"` fallback
- **Error:** Non-Yalla-London sites would submit/check against wrong domain
- **What went wrong:** SEO agent written for single-site deployment
- **What it affects:** Indexing checks would query wrong property; sitemap verification would check wrong domain
- **Fix:** All 3 fallbacks now use `getSiteDomain(siteId || getDefaultSiteId())`
- **File:** `app/api/cron/seo-agent/route.ts` (lines ~688, 731, 833)

#### A2-004: Admin Indexing Route — 4 Hardcoded Fallbacks
- **Issue:** GET handler, getIndexingStatus(), and runLiveCheck() all had hardcoded "yalla-london" default; submitForIndexing() hardcoded siteId
- **Error:** All indexing operations defaulted to Yalla London regardless of request context
- **Fix:** All 4 replaced with `getDefaultSiteId()`; submitForIndexing accepts siteId parameter
- **File:** `app/api/admin/indexing/route.ts`

#### A2-005: Indexing Service — BASE_URL Hardcoded
- **Issue:** `BASE_URL` constant was `"https://www.yalla-london.com"` at module scope
- **Error:** All URL generation in indexing service used wrong base for non-YL sites
- **What went wrong:** Module-level constant set before any request context available
- **What it affects:** `getAllIndexableUrls()`, `submitSitemap()`, `submitToIndexNow()` all build URLs from BASE_URL
- **Fix:** IIFE that tries `getSiteDomain(getDefaultSiteId())`, falls back to hardcoded only if config unavailable
- **File:** `lib/seo/indexing-service.ts` (lines 22-25)

#### A2-006: Indexing Service — 4 Site-Gated `"yalla-london"` Checks
- **Issue:** Static content functions checked `siteId === "yalla-london"` to decide what to include
- **Error:** Other sites would get empty arrays from static content functions
- **What went wrong:** Reasonable for now (static data is YL-specific) but string was hardcoded
- **What it affects:** Future sites that add static data files would need code changes
- **Fix:** Changed to `siteId === getDefaultSiteId()` — config-driven comparison
- **File:** `lib/seo/indexing-service.ts` (lines 662, 673, 709, 753)

#### A2-007: Content-Audit Route — Hardcoded Fallback
- **Issue:** `siteId ?? "yalla-london"` fallback in post count aggregation
- **Fix:** Replaced with `getDefaultSiteId()`
- **File:** `app/api/admin/content-audit/route.ts`

#### A2-008: Seed-Topics Route — Hardcoded Site ID
- **Issue:** `const siteId = "yalla-london"` at top of handler
- **Fix:** Replaced with `getDefaultSiteId()`
- **File:** `app/api/admin/seed-topics/route.ts`

#### A2-009: Generate-Schema Route — Hardcoded Brand Config
- **Issue:** Brand name hardcoded as "Yalla London", description as "Your Guide to London"
- **Fix:** Loads site config dynamically, builds brand from site name and destination
- **File:** `app/api/seo/generate-schema/route.ts`

---

## Audit #3 — Deep Comprehensive Audit

**Date:** 2026-02-18
**Trigger:** User request for deeper, more comprehensive audit
**Scope:** Auth patterns, middleware, error handling, dead code, env vars, DB migrations, API consistency, cron chain integrity
**Commit:** TBD (see below)
**Agents Used:** 6 parallel audit agents covering: (1) Auth & Middleware, (2) Error Handling, (3) DB Schema vs Code, (4) Env Vars & Config, (5) Cron Chain & Pipeline, (6) Dead Code & Unused Exports

### Fixed Issues (15)

#### A3-001: MCP Stripe/Mercury Routes — No Authentication [CRITICAL → FIXED]
- **Issue:** 5 MCP routes (stripe/balance, stripe/customers, stripe/payments, mercury/accounts, mercury/transactions) had zero authentication
- **Error:** Anyone could fetch financial data — Stripe balances, customer emails, payment history, Mercury bank accounts
- **What went wrong:** MCP routes built as internal tools, auth skipped during development
- **What it affects:** CRITICAL security — financial data exposure, GDPR violation potential
- **Fix:** Added `requireAdmin(request)` guard to all 5 routes
- **Files:** `app/api/admin/mcp/stripe/{balance,customers,payments}/route.ts`, `app/api/admin/mcp/mercury/{accounts,transactions}/route.ts`

#### A3-002: Migrate Route — No Authentication [CRITICAL → FIXED]
- **Issue:** GET exposes DB schema, POST can ALTER TABLE — both completely unprotected
- **Error:** Attacker could inspect and modify database schema
- **Fix:** Added `requireAdmin(request)` guard to both GET and POST handlers
- **File:** `app/api/admin/migrate/route.ts`

#### A3-003: Operations Hub Route — No Authentication [CRITICAL → FIXED]
- **Issue:** GET returns full platform configuration checklist including which services are configured
- **Error:** Information disclosure — attacker learns which integrations are active/missing
- **Fix:** Added `requireAdmin(request)` guard
- **File:** `app/api/admin/operations-hub/route.ts`

#### A3-004: next.config.js Hardcoded Image Domains [HIGH → FIXED]
- **Issue:** `remotePatterns` only allowed `*.yalla-london.com` and `*.yallalondon.com`
- **Error:** Images from arabaldives.com, yallariviera.com, yallaistanbul.com, yallathailand.com would fail to load
- **What it affects:** Multi-site image optimization — next/image would reject images from other sites
- **Fix:** Added all 5 site domains to remotePatterns
- **File:** `next.config.js` (lines 42-48)

#### A3-005: next.config.js Hardcoded CORS Origins [HIGH → FIXED]
- **Issue:** `ALLOWED_ORIGINS` default only included `yallalondon.com` and `yalla-london.com`
- **Error:** API requests from other site domains would fail CORS
- **Fix:** Default now includes all 10 domains (5 sites × www + non-www)
- **File:** `next.config.js` (line 68)

#### A3-006: Affiliate Injection — No site_id Scoping [HIGH → FIXED]
- **Issue:** BlogPost query had no `siteId` filter — injected affiliates across all sites
- **Error:** Yalla London affiliates (booking.com/london, TheFork London) injected into Arabaldives Maldives articles
- **What went wrong:** Cron built for single-site, never updated for multi-tenant
- **What it affects:** Revenue attribution — wrong affiliate links = lost commissions for site-specific partners
- **Fix:** Added `siteId: { in: getActiveSiteIds() }` filter to BlogPost query
- **File:** `app/api/cron/affiliate-injection/route.ts` (line 161)

#### A3-007–A3-011: Empty Catch Blocks in Critical Cron Paths (5 instances) [HIGH → FIXED]
- **A3-007:** SEO agent schema injection `catch {}` → now logs warning with post slug
- **A3-008:** SEO agent meta title auto-fix `catch {}` → now logs warning
- **A3-009:** Daily content generate topic status update `catch {}` → now logs warning with topic ID
- **A3-010:** Daily content generate topic lookup `catch {}` → now logs fallback warning
- **A3-011:** Daily content generate Arabic directives `catch {}` → now logs warning
- **What went wrong:** Catch blocks swallowed errors silently — invisible on dashboard
- **What it affects:** Pipeline failures go undetected; duplicate content could be generated (topic not marked as used); Arabic content quality degrades without directives
- **Fix:** All 5 now log descriptive warnings with context
- **Files:** `app/api/cron/seo-agent/route.ts`, `app/api/cron/daily-content-generate/route.ts`

#### A3-012: Cron Route Auth Verification [MEDIUM → VERIFIED OK]
- **Issue flagged:** scheduled-publish and site-health-check appeared to have no auth
- **Verification result:** Both routes use `withCronLog()` wrapper which includes CRON_SECRET validation at line 100 of `lib/cron-logger.ts`
- **Status:** FALSE POSITIVE — routes are properly protected

#### A3-013: CSRF Allowlist [MEDIUM → VERIFIED OK]
- **Issue flagged:** CSRF allowlist in middleware.ts appeared hardcoded to Yalla London only
- **Verification result:** middleware.ts lines 138-156 already include all 5 sites plus legacy domains
- **Status:** FALSE POSITIVE — already comprehensive

#### A3-014: Content Selector site_id Scoping [HIGH → VERIFIED OK]
- **Issue flagged:** content-selector cron route had no site_id filter
- **Verification result:** Core logic in `select-runner.ts` line 51 uses `site_id: { in: activeSites }` — properly scoped
- **Status:** FALSE POSITIVE — select-runner.ts handles scoping correctly

### Documented Issues (Not Fixed — Tracked for Future)

#### Auth & Middleware
- **A3-D01:** Editor + Flags routes use Supabase auth instead of standard `withAdminAuth()` middleware — two parallel auth systems
- **A3-D02:** CRON_SECRET validation inconsistency — some routes silently allow if unset, one (`audit-daily`) requires it with 500

#### Error Handling
- **A3-D03:** 260+ console.error/warn calls across codebase are invisible to dashboard owner (works from iPhone)
- **A3-D04:** `onCronFailure().catch(() => {})` pattern in 15+ cron routes — failure notification hooks themselves can fail silently
- **A3-D05:** Inconsistent error response formats — some use `{ error }`, others `{ success: false, error }`, others `{ success: true }`
- **A3-D06:** Missing error context in CronJobLog entries — which site? which phase? which AI provider?

#### Database Schema
- **A3-D07:** PdfGuide and PdfDownload models referenced in code but missing from Prisma schema — PDF routes will crash
- **A3-D08:** TopicProposal creation via admin topics route missing `site_id` — topics not scoped to any site
- **A3-D09:** AuditLog missing userId/ipAddress/userAgent in bulk operation routes
- **A3-D10:** ContentScheduleRule and PromptTemplate models lack `site_id` for multi-tenancy
- **A3-D11:** 23 orphaned Prisma models (defined in schema, never referenced in code)

#### Environment & Config
- **A3-D12:** Per-site env var pattern (`{VAR}_{SITE_ID_UPPER}`) supported in code but undocumented in `.env.example`
- **A3-D13:** Affiliate IDs use global env vars only — no per-site override pattern
- **A3-D14:** GA4 dashboard analytics domain hardcoded to "www.yalla-london.com"
- **A3-D15:** 10+ undocumented env vars used in code (ABACUSAI_API_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, SMTP_*, GTM_CONTAINER_ID)
- **A3-D16:** Env var naming inconsistency: XAI_API_KEY vs GROK_API_KEY, PPLX_API_KEY vs PERPLEXITY_API_KEY
- **A3-D17:** 3 cron routes in vercel.json undocumented in CLAUDE.md (sweeper, google-indexing, verify-indexing)
- **A3-D18:** 7 cron routes implemented but not scheduled in vercel.json (london-news, auto-generate, autopilot, real-time-optimization, social, fact-verification, daily-publish)

#### Cron Chain & Pipeline
- **A3-D19:** daily-content-generate bypasses ArticleDraft pipeline — creates BlogPost directly without 8-phase quality control
- **A3-D20:** Duplicate SEO cron routes — `/api/cron/seo-agent` and `/api/seo/cron` both submit URLs to IndexNow
- **A3-D21:** social cron is mock only — marks posts as published in DB but doesn't post to any platform

#### Dead Code & Quality
- **A3-D22:** standards.ts has 13 exports but only 2 are imported — 11 exports unused (not yet integrated)
- **A3-D23:** Mock data persists in 14+ admin pages (api-security, content-types, prompts, seo-audits, site-control, etc.)
- **A3-D24:** 3 dead Prisma files: database.ts (shim), prisma-stub.ts (138 lines of mock data), mock-prisma.ts
- **A3-D25:** 50+ `as any` type casts throughout codebase — type safety gaps
- **A3-D26:** 10+ TODO/FIXME comments blocking functionality (article create/edit buttons, translation, category mapping)
- **A3-D27:** Hardcoded "yalla-london" strings remain in: email-marketing.ts templates, payment-booking.ts Calendly URL, tenant/provider.tsx defaults, performance-monitoring.ts component name

---

## Audit #4 — Deep Targeted Audit (API, Pipeline, Frontend, Schema, Security, Config)

**Date:** 2026-02-18
**Trigger:** User request for deeper audit after Audits #1-3 each found critical issues
**Scope:** 6 parallel audit agents: (1) API Route Completeness, (2) Content Pipeline Integrity, (3) Frontend Admin Pages, (4) Prisma Schema Orphans, (5) Security & Input Validation, (6) Hardcoded Strings & Config
**Commit:** `ec7e647` + current session commit

### Fixed Issues (11)

#### A4-001: Wrong Prisma Import Path — Analytics Route [CRITICAL → FIXED]
- **Issue:** `import { prisma } from "@/lib/prisma"` — module doesn't exist, correct path is `@/lib/db`
- **Error:** Route crashes at runtime with module not found error
- **Fix:** Removed top-level import; use dynamic `const { prisma } = await import("@/lib/db")` in handler
- **File:** `app/api/admin/command-center/analytics/route.ts` (line 9)

#### A4-002: Wrong Prisma Import Path — Sites Route [CRITICAL → FIXED]
- **Issue:** `const { prisma } = await import("@/lib/prisma")` — wrong module path
- **Error:** GET handler falls through to config (silent); POST handler references undefined `prisma` variable
- **Fix:** Changed to `"@/lib/db"` in GET handler; added `const { prisma } = await import("@/lib/db")` to POST handler
- **File:** `app/api/admin/sites/route.ts` (lines 64, 95)

#### A4-003: SSRF in Social Embed-Data Route [CRITICAL → FIXED]
- **Issue:** POST handler fetches user-supplied URLs server-side without any URL validation
- **Error:** Attacker could use the endpoint to probe internal infrastructure (localhost, 192.168.x.x)
- **Attack Vector:** `POST /api/social/embed-data { url: "http://localhost:5432/admin", type: "youtube" }`
- **Fix:** Added `isAllowedUrl()` validator with HTTPS-only enforcement, hostname allowlist (youtube, instagram, tiktok, facebook), and internal IP blocking
- **File:** `app/api/social/embed-data/route.ts`

#### A4-004: Fake Social Proof Numbers [HIGH → FIXED]
- **Issue:** `SocialProof` component generated random view/booking stats when no real data available
- **Error:** Visitors shown fake engagement numbers (e.g., "47 people viewing now") built from Math.random()
- **What it affects:** Trust — showing fabricated social proof is deceptive and could violate consumer protection laws
- **Fix:** Replaced random fallbacks with zeros; component now hides when no real data exists
- **File:** `components/marketing/social-proof.tsx` (lines 94-99, 191)

#### A4-005: Fake SocialProofBadge Count [HIGH → FIXED]
- **Issue:** `SocialProofBadge` showed random count when no prop passed
- **Fix:** Returns null when count is 0 instead of showing random number
- **File:** `components/marketing/social-proof.tsx` (line 191)

#### A4-006: Non-Existent Site in Content Generator Dropdown [HIGH → FIXED]
- **Issue:** Command center content page had `<option value="gulf-maldives">Gulf Maldives</option>` — this site doesn't exist
- **Error:** Selecting it would attempt to generate content for a non-existent site
- **Fix:** Replaced with correct 5 sites from config: yalla-london, arabaldives, french-riviera, istanbul, thailand
- **File:** `app/admin/command-center/content/page.tsx` (lines 312-316)

#### A4-007: Feature Flags Page — All Mock Data [HIGH → FIXED]
- **Issue:** Entire page loaded hardcoded mock flags and mock health metrics — never called any API
- **Error:** Users believed they were managing real feature flags; all changes were illusory
- **Fix:** Replaced mock data with real API calls to `/api/admin/feature-flags` and `/api/admin/operations-hub`
- **File:** `app/admin/feature-flags/page.tsx` (lines 82-233)

#### A4-008: Analytics Route Hardcoded "Yalla London" [HIGH → FIXED]
- **Issue:** Response always returned `siteId: "yalla-london"`, `siteName: "Yalla London"`, `domain: "www.yalla-london.com"`
- **Fix:** Now reads siteId from request params/headers, loads config dynamically
- **File:** `app/api/admin/command-center/analytics/route.ts` (lines 114-131)

#### A4-009: Information Disclosure — Login Error [HIGH → FIXED]
- **Issue:** Login route returned internal error details: `error: "Login failed at step: ${step}"`, `detail: error.message`
- **Error:** Reveals internal code structure (step names, error messages) to attackers
- **Fix:** Generic error message: `"Login failed. Please try again."`
- **File:** `app/api/admin/login/route.ts` (lines 73-81)

#### A4-010: Information Disclosure — Blog API Error [HIGH → FIXED]
- **Issue:** Public blog API returned `details: error.message` in error responses
- **Error:** Could expose DB schema, file paths, or internal details to unauthenticated users
- **Fix:** Removed `details` field from error response
- **File:** `app/api/content/blog/[slug]/route.ts` (lines 128-134)

#### A4-011: Indexing Visibility Enhancement [FEATURE → ADDED]
- **Issue:** User requested clearer visibility into whether indexing is working, what's indexed, what failed, and why
- **Enhancement:** Added "Indexing Health Diagnosis" panel with plain-language status, progress bar, and actionable detail text. Added "Recent Indexing Activity" section showing last 20 cron runs with status, items processed, and errors. API now returns `healthDiagnosis` and `recentActivity` data.
- **Files:** `app/api/admin/content-indexing/route.ts`, `components/admin/ContentIndexingTab.tsx`

### Documented Issues (Not Fixed — Tracked)

#### API Routes
- **A4-D01:** 50+ hardcoded `process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com'` fallbacks across SEO routes
- **A4-D02:** BlogPost.create in admin content route missing `siteId` field
- **A4-D03:** Hardcoded email addresses in 30+ files (hello@yallalondon.com, system@yallalondon.com)
- **A4-D04:** Inconsistent email format: hello@yallalondon.com vs hello@yalla-london.com (28 vs 11 instances)

#### Content Pipeline
- **A4-D05:** Dual content pipeline — daily-content-generate creates BlogPost directly, bypassing 8-phase quality gates
- **A4-D06:** TopicProposal status race condition — both content-builder and daily-content-generate can consume same topic
- **A4-D07:** BlogPost slug collision possible under simultaneous content-selector runs

#### Frontend Admin Pages
- **A4-D08:** Articles page: Create/Edit buttons have TODO comments, no handlers (lines 465, 636)
- **A4-D09:** Automation Hub: Fetches from `/api/admin/automation-hub` — endpoint likely doesn't exist
- **A4-D10:** Content generator: POST doesn't check response status before claiming success
- **A4-D11:** Media View/Download buttons have no click handlers
- **A4-D12:** Multiple upload buttons across admin pages have no onClick handlers
- **A4-D13:** Command center content locale defaults to Arabic instead of English

#### Prisma Schema
- **A4-D14:** 16 orphaned models never referenced in code (Recommendation, ContentGeneration, BillingEntity, URLIndexingStatus, ConsentLog, FactEntry, ExitIntentImpression, SystemMetrics, UserExtended, ModelRoute, ModelProvider, NewsResearchLog, RulebookVersion, PageTypeRecipe, Agreement, TrackingPartner)
- **A4-D15:** Premium model family (6 models) defined but never instantiated
- **A4-D16:** Inconsistent naming: ArticleDraft uses `site_id` (snake_case), BlogPost uses `siteId` (camelCase)

#### Security
- **A4-D17:** XSS risk — BlogPostClient.tsx uses `dangerouslySetInnerHTML` without sanitization (content is admin-generated, risk is stored XSS via compromised admin)
- **A4-D18:** No rate limiting on admin login endpoint — brute force possible
- **A4-D19:** Cron auth bypass when CRON_SECRET env var not set (routes silently allow)
- **A4-D20:** Login GET handler returns diagnostic info (env var presence, user count) without auth
- **A4-D21:** Missing Content-Security-Policy headers

#### Hardcoded Strings
- **A4-D22:** 50+ SEO route files use `process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com'` — needs per-site URL resolution
- **A4-D23:** Brand templates (config/brand-templates.ts) only have Yalla London entry
- **A4-D24:** UTM source hardcoded as "yallalondon" in affiliate links — should be per-site
- **A4-D25:** Security headers in middleware hardcode Vercel deployment URLs
- **A4-D26:** 18 TODO/FIXME comments indicating incomplete work (email confirmations, GA4 API, social posting, translations)
- **A4-D27:** 26 Math.random() instances for non-deterministic data (SEO scores, engagement stats, confidence scores)

---

## Known Gaps (Not Blocking — Tracked for Future)

| ID | Area | Description | Ref | Status | Added |
|----|------|-------------|-----|--------|-------|
| KG-001 | GA4 | Dashboard returns 0s for traffic — API calls stubbed | A3-D14 | Open | 2026-02-18 |
| KG-002 | Social APIs | Engagement stats require platform API integration; social cron is mock | A3-D21 | Open | 2026-02-18 |
| KG-003 | Design Gen | No AI image/logo generation; PDF generator is mock | — | Open | 2026-02-18 |
| KG-004 | Workflow | Automation Hub and Autopilot UIs are placeholders | — | Open | 2026-02-18 |
| KG-005 | Feature Flags | DB-backed but not wired to runtime behavior | — | Open | 2026-02-18 |
| KG-006 | Article CRUD | Create/Edit buttons in articles page have TODO comments | A3-D26 | Open | 2026-02-18 |
| KG-007 | Rate Limiting | Stats are in-memory only, reset on deploy | — | Open | 2026-02-18 |
| KG-008 | TopicPolicy | Per-site content policies exist in schema but no UI | — | Open | 2026-02-18 |
| KG-009 | ContentScheduleRule | Missing `site_id` field for per-site scheduling | A3-D10 | Open | 2026-02-18 |
| KG-010 | Prompt Templates | Global, not per-site; no admin UI | A3-D10 | Open | 2026-02-18 |
| KG-011 | WordPress Sync | Admin page exists but no scheduled cron job | — | Open | 2026-02-18 |
| KG-012 | Auth Patterns | Editor + Flags routes use Supabase auth, not standard middleware | A3-D01 | Open | 2026-02-18 |
| KG-013 | PDF Models | PdfGuide/PdfDownload missing from Prisma schema — PDF routes crash | A3-D07 | Open | 2026-02-18 |
| KG-014 | Error Logging | 260+ console.error/warn invisible to dashboard owner | A3-D03 | Open | 2026-02-18 |
| KG-015 | standards.ts | 11/13 exports unused — not yet integrated into enforcement | A3-D22 | Open | 2026-02-18 |
| KG-016 | Mock Data | 14+ admin pages show mock/placeholder data | A3-D23 | Open | 2026-02-18 |
| KG-017 | Env Docs | Per-site env var pattern undocumented in .env.example | A3-D12 | Open | 2026-02-18 |
| KG-018 | Pipeline | daily-content-generate bypasses ArticleDraft 8-phase pipeline | A3-D19 | Open | 2026-02-18 |
| KG-019 | SEO Crons | Duplicate: seo-agent + seo/cron both submit to IndexNow | A3-D20 | Open | 2026-02-18 |
| KG-020 | Orphan Models | 23 Prisma models defined but never referenced in code | A3-D11 | Open | 2026-02-18 |
| KG-021 | URL Fallbacks | 50+ SEO routes hardcode `yalla-london.com` fallback instead of per-site domain | A4-D01,D22 | Open | 2026-02-18 |
| KG-022 | Emails | 30+ hardcoded email addresses; inconsistent format (with/without hyphen) | A4-D03,D04 | Open | 2026-02-18 |
| KG-023 | XSS | dangerouslySetInnerHTML in BlogPostClient without sanitization | A4-D17 | Open | 2026-02-18 |
| KG-024 | Login Security | No rate limiting on admin login; diagnostic GET without auth | A4-D18,D20 | Open | 2026-02-18 |
| KG-025 | Race Conditions | TopicProposal consumed by both pipelines; slug collision possible | A4-D06,D07 | Open | 2026-02-18 |
| KG-026 | CSP Headers | Missing Content-Security-Policy headers | A4-D21 | Open | 2026-02-18 |
| KG-027 | Brand Templates | Only Yalla London template exists in brand-templates.ts | A4-D23 | Open | 2026-02-18 |
| KG-028 | Cron Auth | CRON_SECRET bypass when env var not set | A4-D19 | Open | 2026-02-18 |

---

## Severity Scale

| Level | Meaning | Action |
|-------|---------|--------|
| CRITICAL | Runtime crash, data loss, or security vulnerability | Fix immediately |
| HIGH | Wrong behavior, incorrect data, broken pipeline step | Fix in current session |
| MEDIUM | Suboptimal behavior, inconsistency, degraded output | Fix when touching related code |
| LOW | Code smell, minor inconsistency, cosmetic | Track for future cleanup |

---

## Document Maintenance

- **Location:** `docs/AUDIT-LOG.md`
- **Updated by:** Claude Code during each audit session
- **Referenced by:** CLAUDE.md, future audit runs
- **Format:** Each audit gets a section with numbered findings (A{audit#}-{seq})
