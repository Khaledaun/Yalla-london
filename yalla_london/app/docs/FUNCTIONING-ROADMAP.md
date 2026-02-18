# Functioning Roadmap — Path to 100% Healthy Platform

> **Purpose:** Single source of truth for every remaining gap, fix, and milestone needed to reach a fully functional, production-grade, multi-site content-to-revenue engine.
>
> **Generated:** 2026-02-18 after 11 deep audits (~195 issues fixed, 5 comprehensive research sweeps)
>
> **Owner:** Claude Code (CTO/COO/CMO partner) for Khaled / Zenitha.Luxury LLC

---

## Table of Contents

1. [Current Health Assessment](#1-current-health-assessment)
2. [Phase 1: Critical Security Lockdown](#2-phase-1-critical-security-lockdown)
3. [Phase 2: Data Integrity & Pipeline Reliability](#3-phase-2-data-integrity--pipeline-reliability)
4. [Phase 3: Multi-Site SEO Correctness](#4-phase-3-multi-site-seo-correctness)
5. [Phase 4: Observability & Error Visibility](#5-phase-4-observability--error-visibility)
6. [Phase 5: Dashboard Truth & Usability](#6-phase-5-dashboard-truth--usability)
7. [Phase 6: Revenue Pipeline Activation](#7-phase-6-revenue-pipeline-activation)
8. [Phase 7: Scale to Multi-Site](#8-phase-7-scale-to-multi-site)
9. [Phase 8: Optimization & Growth](#9-phase-8-optimization--growth)
10. [Master Checklist](#10-master-checklist)
11. [Anti-Patterns Registry](#11-anti-patterns-registry)
12. [Validation Protocol](#12-validation-protocol)

---

## 1. Current Health Assessment

### What Works (Verified Across 11 Audits)

| System | Status | Evidence |
|--------|--------|----------|
| TypeScript compilation | CLEAN | 0 errors consistently |
| Prisma schema | SOLID | 95 models, all referenced fields verified |
| Cron auth pattern | CONSISTENT | 22/22 routes follow standard pattern |
| Content pipeline (topic → draft → publish) | FUNCTIONAL | TopicProposal → ArticleDraft (8 phases) → BlogPost |
| Pre-publication SEO gate | ENFORCED | 11 checks, fail-closed, threshold 60 |
| XSS sanitization | COMPLETE | 9/9 dangerouslySetInnerHTML instances sanitized |
| Hardcoded emails | RESOLVED | Dynamic from site config across all files |
| IndexNow submission | SINGLE PATH | seo/cron is canonical, seo-agent discovers only |
| Related articles | DB-BACKED | Queries BlogPost + static, merged, deduped |
| Affiliate injection | PER-SITE | 5-destination URL mappings in both paths |
| Multi-site config | READY | 5 sites configured, middleware maps all domains |
| CSP headers | CONFIGURED | next.config.js security headers present |
| SEO standards | CURRENT | 2025-2026 compliance, deprecated schemas removed |

### What Doesn't Work (Organized by Severity)

#### CRITICAL (Security vulnerabilities — fix before any deployment)
- [ ] 4 database API routes completely unauthenticated (backup, restore, download, stats)
- [ ] Admin setup endpoint allows unauthenticated password reset
- [ ] 7+ public API routes allow unauthenticated mutations (content gen, file upload, homepage, cache)

#### HIGH (Broken core features — fix before launch)
- [ ] 5 page metadata exports hardcode yalla-london.com canonical/OG URLs
- [ ] 38+ URL fallbacks hardcode yalla-london.com across layouts/pages/APIs
- [ ] 61 empty catch blocks silently swallow errors (pipeline, crons, dashboard)
- [ ] 3 content pipelines consume TopicProposals without locking (race condition)
- [ ] 13+ admin pages show entirely mock/fake data
- [ ] 14+ admin buttons are dead (no handlers)

#### MEDIUM (Suboptimal but not blocking)
- [ ] 26 admin pages orphaned from sidebar navigation
- [ ] Missing site_id on TopicProposals from content-strategy and admin/topics/generate
- [ ] No rate limiting on admin login
- [ ] GA4 integration returns zeros (API calls stubbed)
- [ ] No push/email alerts for cron failures

#### LOW (Technical debt)
- [ ] 16+ orphan Prisma models never referenced
- [ ] Brand templates only exist for Yalla London
- [ ] Stale site lists in video-studio, design-studio (gulf-maldives, arab-bali)

---

## 2. Phase 1: Critical Security Lockdown

**Goal:** Zero unauthenticated access to admin/destructive operations
**Timeline:** IMMEDIATE — must be complete before any production deployment
**Blocking:** Everything else

### 1.1 Database Routes Auth (CRITICAL)
- [ ] Add `requireAdmin` to `/api/database/backups` GET+POST
- [ ] Add `requireAdmin` to `/api/database/backups/[id]/restore` POST
- [ ] Add `requireAdmin` to `/api/database/backups/[id]/download` GET
- [ ] Add `requireAdmin` to `/api/database/stats` GET
- [ ] Fix `pg_dump` password injection — use `env` option instead of string interpolation

### 1.2 Admin Setup Lockdown (CRITICAL)
- [ ] Disable password reset via `/api/admin/setup` when an admin with password already exists
- [ ] Return 403 "Setup already completed" for POST when admin exists

### 1.3 Public API Auth (HIGH)
- [ ] Add `requireAdmin` to `/api/content/auto-generate` POST
- [ ] Add `requireAdmin` to `/api/content/schedule` POST
- [ ] Add `requireAdmin` to `/api/homepage-blocks` POST
- [ ] Add `requireAdmin` to `/api/homepage-blocks/publish` POST
- [ ] Add `requireAdmin` to `/api/cache/invalidate` POST
- [ ] Add `requireAdmin` to `/api/media/upload` POST
- [ ] Add `requireAdmin` to `/api/test-content-generation` GET+POST
- [ ] Add auth to `/api/phase4b/content/generate` and `/api/phase4b/topics/research`

### 1.4 Information Disclosure (HIGH)
- [ ] Remove API key prefix logging from test-content-generation
- [ ] Remove verification token logging from CRM subscribe route
- [ ] Fix DB password in shell command string (database backups)

### 1.5 IDOR Fix (MEDIUM)
- [ ] Add auth to `/api/shop/purchases` — require session or signed token

### Validation:
```
grep -r "requireAdmin\|withAdminAuth" app/api/ | wc -l  # Should cover all mutation endpoints
grep -r "console.log.*apiKey\|console.log.*token\|console.log.*password" lib/ app/ | wc -l  # Should be 0
```

---

## 3. Phase 2: Data Integrity & Pipeline Reliability

**Goal:** Content pipeline produces articles reliably without race conditions or data loss
**Timeline:** After Phase 1
**Blocking:** Revenue (no reliable content = no traffic = no money)

### 2.1 Race Condition Fix (CRITICAL)
- [ ] Implement atomic topic claiming with `$transaction` or `updateMany` pattern
- [ ] Add "generating" status to TopicProposal lifecycle
- [ ] Ensure daily-content-generate claims topic immediately (not after 30s processing)
- [ ] Exclude "generating" status from all consumer queries

### 2.2 Draft Processing Lock (HIGH)
- [ ] Add soft-lock to ArticleDraft processing using `phase_started_at`
- [ ] Skip drafts where `phase_started_at` is within last 60 seconds
- [ ] Prevent build-runner and full-pipeline-runner from processing same draft

### 2.3 Missing site_id (HIGH)
- [ ] Add `siteId` parameter to `saveContentProposals()` in content-strategy.ts
- [ ] Add `site_id` to admin/topics/generate create call (default: `getDefaultSiteId()`)
- [ ] When claiming a null-site topic, set `site_id` to the claiming site

### 2.4 Schema Integrity (MEDIUM)
- [ ] Add missing `title` field to admin/topics/generate create call
- [ ] Use English title as fallback for empty `title_ar` in select-runner
- [ ] Populate `featured_longtails` from cron jobs (top 2 from longtails array)

### 2.5 Slug Collision Protection (LOW)
- [ ] Add retry loop for slug creation in daily-content-generate
- [ ] Both slug creation paths handle unique constraint errors gracefully

### Validation:
```sql
-- No topics stuck in "ready" status for >1 hour during active cron windows
SELECT COUNT(*) FROM "TopicProposal" WHERE status = 'ready' AND updated_at < NOW() - INTERVAL '1 hour';
-- No drafts with null site_id
SELECT COUNT(*) FROM "ArticleDraft" WHERE site_id IS NULL;
-- No BlogPosts with empty title_ar
SELECT COUNT(*) FROM "BlogPost" WHERE title_ar = '' AND status = 'published';
```

---

## 4. Phase 3: Multi-Site SEO Correctness

**Goal:** Every page on every site has correct canonical URLs, OG tags, and metadata
**Timeline:** After Phase 2 (or parallel if resources allow)
**Blocking:** Google indexing of non-London sites

### 3.1 Static Metadata → Dynamic (CRITICAL for multi-site)
- [ ] Convert `app/layout.tsx` metadata to `generateMetadata()`
- [ ] Convert `app/blog/page.tsx` metadata to `generateMetadata()`
- [ ] Convert `app/news/page.tsx` metadata to `generateMetadata()`
- [ ] Convert `app/information/page.tsx` metadata to `generateMetadata()`
- [ ] Convert `app/information/articles/page.tsx` metadata to `generateMetadata()`
- [ ] All use `x-site-id` header → `getSiteDomain()` for canonical/OG URLs

### 3.2 URL Fallback Utility (HIGH)
- [ ] Create `lib/url-utils.ts` with `getBaseUrl(headers?: Headers)` helper
- [ ] Reads `x-hostname` header → `NEXT_PUBLIC_SITE_URL` env → `getSiteDomain(getDefaultSiteId())`
- [ ] Replace 38+ `process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com"` with `getBaseUrl()`
- [ ] Target files: 9 layouts, 6 page files, 8 API routes, 5 lib files, 3 components

### 3.3 API Response URLs (HIGH)
- [ ] Fix `/api/content/route.ts` — blog URL construction
- [ ] Fix `/api/content/blog/[slug]/route.ts` — editorial email
- [ ] Fix `/api/seo/save-meta/route.ts` — hreflang alternates
- [ ] Fix `/api/booking/confirm-payment/route.ts` — confirmation email URL
- [ ] Fix `/api/social/generate-reel-script/route.ts` — CTA domain

### 3.4 Site ID Fallbacks (MEDIUM)
- [ ] Replace 12+ hardcoded `"yalla-london"` site IDs with `getDefaultSiteId()`
- [ ] Fix stale site lists in video-studio, design-studio, PDF page

### 3.5 Remaining Emails (MEDIUM)
- [ ] Fix akea-footer.tsx — `hello@yallalondon.com`
- [ ] Fix privacy-page-editor.tsx — `privacy@yallalondon.com`
- [ ] Fix team/page.tsx — `careers@yalla-london.com`
- [ ] Fix notifications.ts — `admin@yalla-london.com`
- [ ] Fix email-marketing.ts — URLs in welcome email

### Validation:
```bash
# Zero hardcoded yalla-london.com in runtime code (excluding config/docs)
grep -r "yalla-london\.com" app/ lib/ components/ --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v config/ | grep -v docs/ | grep -v ".md" | wc -l  # Target: 0
```

---

## 5. Phase 4: Observability & Error Visibility

**Goal:** Every error is visible on the dashboard or Vercel logs; zero silent failures
**Timeline:** After Phase 2
**Blocking:** Khaled's ability to monitor the system

### 4.1 Central Fix: onCronFailure (HIGH — fixes 21 instances)
- [ ] Add `try/catch` with `console.error` inside `onCronFailure()` in failure-hooks.ts
- [ ] One change eliminates 21 `.catch(() => {})` call sites

### 4.2 Central Fix: logCronExecution (HIGH — fixes 9 instances)
- [ ] Add `.catch(err => console.error("[cron-logger]:", err))` inside `logCronExecution()`
- [ ] One change eliminates 9 `.catch(() => {})` call sites

### 4.3 Pipeline DB Update Catches (HIGH — 4 instances)
- [ ] Add `console.warn` to select-runner.ts lines 151, 410, 432
- [ ] Add `console.warn` to verify-indexing/route.ts line 168

### 4.4 Intelligence Engine Catches (MEDIUM — 5 instances)
- [ ] Add `console.warn` to intelligence-engine.ts lines 83, 293, 308, 381, 398

### 4.5 Failure Hooks Recovery (MEDIUM — 4 instances)
- [ ] Add logging to failure-hooks.ts lines 358, 428, 540, 588

### 4.6 SEO Agent Helper Catches (MEDIUM — 4 instances)
- [ ] Add logging to seo-agent/route.ts lines 665, 713, 790, 882

### 4.7 Scheduled Publish IndexNow (HIGH — 1 instance)
- [ ] Add logging to scheduled-publish/route.ts line 165

### Validation:
```bash
# Count remaining empty catches
grep -rn "\.catch\s*(\s*(\(\s*\)\s*=>\s*\{\s*\}|function\s*\(\s*\)\s*\{\s*\})\s*)" app/ lib/ \
  | grep -v node_modules | grep -v ".md" | wc -l  # Target: <5 (only acceptable JSON.parse guards)
```

---

## 6. Phase 5: Dashboard Truth & Usability

**Goal:** Every dashboard page shows real data or an honest empty state; every button works
**Timeline:** After Phases 1-4
**Blocking:** Khaled's trust in the system

### 5.1 Replace Mock Data with Real APIs or Empty States (HIGH)
- [ ] `/admin/transactions` — replace fake data with real shop stats or empty state
- [ ] `/admin/crm` — replace fake subscribers/campaigns with empty state
- [ ] `/admin/articles/new` — wire to real `/api/admin/content` POST
- [ ] `/admin/site` — wire save functions to real `/api/admin/site`
- [ ] `/admin/editor` — wire AI review to real scoring API
- [ ] `/admin/ai-prompt-studio` — wire save/test to real `/api/admin/prompts`
- [ ] `/admin/media` — wire upload to real `/api/admin/media/upload`
- [ ] `/admin/command-center/content` — wire generate to real API

### 5.2 Fix Dead Buttons (HIGH)
- [ ] Shop: Add Product, View/Edit/Download/Delete handlers
- [ ] CRM: New Campaign, Add Subscriber, Edit, Send Email, Send Now
- [ ] Members: Invite User, Resend, Filter by Role
- [ ] Transactions: Export CSV, Filter

### 5.3 Fix Dead Navigation (HIGH)
- [ ] Remove or create pages for `/admin/news` (3 sidebar links)
- [ ] Remove or create pages for `/admin/facts` (3 sidebar links)

### 5.4 Expose Hidden Features (MEDIUM)
- [ ] Add valuable orphaned pages to sidebar: audit-logs, indexing, prompts, topics-pipeline
- [ ] Remove or clearly mark pages that are placeholders

### 5.5 Remove Fake Metrics (MEDIUM)
- [ ] Backlink inspect: Remove Math.random() SEO score
- [ ] Topic generate: Remove Math.random() confidence score

### 5.6 Fix Stale Site Lists (LOW)
- [ ] Video studio: Replace gulf-maldives/arab-bali/luxury-escapes-me with real sites
- [ ] Design studio: Same
- [ ] PDF products: Same

### Validation:
```bash
# Zero Math.random() in admin code (excluding test files)
grep -rn "Math\.random()" app/admin/ app/api/admin/ components/admin/ | wc -l  # Target: 0
# Zero "Simulate" comments in admin code
grep -rn "Simulate API\|Simulate upload\|Simulate generation" app/ components/ | wc -l  # Target: 0
```

---

## 7. Phase 6: Revenue Pipeline Activation

**Goal:** Published articles contain affiliate links, are indexed by Google, and generate revenue
**Timeline:** After Phases 1-3
**Blocking:** First dollar of revenue

### 6.1 Content Pipeline End-to-End Validation
- [ ] Trigger weekly-topics → verify TopicProposals created with correct site_id
- [ ] Trigger content-builder → verify ArticleDraft advances through all 8 phases
- [ ] Trigger content-selector → verify reservoir drafts promote to BlogPost
- [ ] Trigger scheduled-publish → verify BlogPost is publicly accessible
- [ ] Verify published article passes all 11 pre-publication checks
- [ ] Verify published article contains affiliate links (per-site rules)
- [ ] Verify IndexNow submission for new article (via seo/cron)

### 6.2 Affiliate Link Verification
- [ ] Verify affiliate links render correctly on published pages
- [ ] Verify click tracking works (`/api/track/click`)
- [ ] Verify affiliate URLs are correct for each site destination

### 6.3 SEO Verification
- [ ] Verify sitemap includes new BlogPosts
- [ ] Verify robots.txt allows crawling
- [ ] Verify JSON-LD structured data on published pages
- [ ] Verify hreflang tags point to correct domains
- [ ] Submit sitemap to Google Search Console

### 6.4 GA4 Integration (MEDIUM — future revenue tracking)
- [ ] Connect GA4 Data API for traffic metrics
- [ ] Wire dashboard traffic cards to real data
- [ ] Set up conversion tracking for affiliate clicks

---

## 8. Phase 7: Scale to Multi-Site

**Goal:** Activate site #2 (Arabaldives) and #3 (Yalla Riviera)
**Timeline:** After Phase 6 proves revenue on Yalla London
**Blocking:** Scaling revenue

### 7.1 Pre-Activation Checklist (per site)
- [ ] Verify domain DNS → Vercel
- [ ] Verify middleware maps domain → site_id
- [ ] Verify per-site config in `config/sites.ts`
- [ ] Verify per-site brand theme in `destination-themes.ts`
- [ ] Verify per-site affiliate rules exist
- [ ] Verify cron jobs produce content for this site_id
- [ ] Create per-site brand template in `brand-templates.ts`
- [ ] Verify llms.txt serves correct content for site
- [ ] Verify sitemap scoped to site's content
- [ ] Verify JSON-LD uses site's branding
- [ ] Test published article renders with correct branding

### 7.2 Post-Activation Monitoring
- [ ] Verify articles publishing per-site (dashboard)
- [ ] Verify IndexNow submissions per-site
- [ ] Verify no cross-site content contamination
- [ ] Verify affiliate links match site destination
- [ ] Verify Google indexes new site's content (Search Console)

---

## 9. Phase 8: Optimization & Growth

**Goal:** Improve performance, conversion, and content velocity
**Timeline:** After multi-site is live
**Not blocking:** Runs in parallel with revenue

### 8.1 Performance
- [ ] Core Web Vitals audit (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] Image optimization (next/image, lazy loading, WebP)
- [ ] Bundle size analysis and code splitting

### 8.2 Content Velocity
- [ ] Scale to 2 articles/site/day
- [ ] Add trending topic integration (Grok/xAI)
- [ ] Improve content quality scores

### 8.3 CRO
- [ ] A/B testing framework
- [ ] Affiliate link placement optimization
- [ ] Exit intent / email capture

### 8.4 Arabic Content
- [ ] Arabic SSR for hreflang compliance (KG-032)
- [ ] RTL layout testing
- [ ] Arabic SEO audit

---

## 10. Master Checklist

### Anti-Duplication Verification

| Check | Status | Notes |
|-------|--------|-------|
| No duplicate IndexNow submissions | RESOLVED (A11) | seo-agent discovers, seo/cron submits |
| No duplicate cron auth patterns | RESOLVED (A9, A10) | All 22 routes standardized |
| No duplicate Prisma import paths | RESOLVED (A6) | All use `@/lib/db` |
| No duplicate SEO quality thresholds | RESOLVED (A1) | standards.ts is single source |
| No duplicate content pipeline consumers | OPEN | 3 consumers, needs locking (Phase 2) |

### Anti-Conflict Verification

| Check | Status | Notes |
|-------|--------|-------|
| Cron schedule conflicts | CLEAN | No overlapping critical jobs |
| Static metadata vs middleware x-site-id | CONFLICT | Static exports ignore middleware headers (Phase 3) |
| Supabase auth vs NextAuth admin routes | CONFLICT | 3 routes use wrong auth (Phase 1) |
| Pipeline status transitions | CONFLICT | "generating" status missing, allowing re-consumption (Phase 2) |

### Anti-Contradiction Verification

| Check | Status | Notes |
|-------|--------|-------|
| SEO score thresholds consistent | RESOLVED (A1) | 60 everywhere |
| Email format consistent | RESOLVED (A11) | Dynamic from config |
| Site IDs consistent | PARTIAL | 12+ hardcoded remain (Phase 3) |
| Affiliate URLs match site destinations | RESOLVED (A10) | Per-site mappings |

### Anti-Misalignment Verification

| Check | Status | Notes |
|-------|--------|-------|
| Schema fields match code usage | RESOLVED (A2, A8) | All verified |
| Cron output feeds next cron's input | RESOLVED (A8, A9) | Pipeline chain verified |
| Dashboard data matches DB reality | PARTIAL | Mock data remains (Phase 5) |
| Pre-pub gate matches quality standards | RESOLVED (A1) | Both use threshold 60 |

### Anti-Malfunction Verification

| Check | Status | Notes |
|-------|--------|-------|
| All catch blocks log errors | PARTIAL | 61 empty catches remain (Phase 4) |
| All cron jobs handle budget timeout | RESOLVED | 53s budget, 7s buffer |
| All DB queries scoped by site_id | PARTIAL | Some queries still global |
| All admin routes require auth | PARTIAL | 7+ public routes exposed (Phase 1) |

---

## 11. Anti-Patterns Registry

These patterns have been identified as recurring problems. Any future code MUST NOT introduce them.

| Anti-Pattern | Correct Pattern | Audits Found |
|--------------|----------------|--------------|
| `if (!cronSecret) return 500` | `if (cronSecret && authHeader !== Bearer) return 401` | A4, A9, A10 |
| `catch {}` or `.catch(() => {})` | `.catch(err => console.error("context:", err))` | A3, A6, A12 |
| `"yalla-london"` hardcoded | `getDefaultSiteId()` from `@/config/sites` | A1-A11 |
| `"https://www.yalla-london.com"` hardcoded | `getBaseUrl(headers)` or `getSiteDomain()` | A5, A7, A12 |
| `hello@yallalondon.com` hardcoded | `hello@${getSiteDomain(getDefaultSiteId())}` | A11 |
| `Math.random()` for metrics | Real data or null/0 with honest empty state | A1, A7, A12 |
| `// Simulate API call` + setTimeout | Actual `fetch()` to real API endpoint | A12 |
| `metadata = { ... }` with hardcoded URLs | `generateMetadata()` with dynamic URLs | A12 |
| `export async function POST()` without auth | `withAdminAuth` wrapper or `requireAdmin()` call | A3, A5, A12 |
| `@/lib/prisma` import | `@/lib/db` import (canonical) | A6 |
| `dangerouslySetInnerHTML={{ __html: x }}` | `dangerouslySetInnerHTML={{ __html: sanitizeHtml(x) }}` | A10, A11 |
| `activeSites[0]` (first site only) | `for (const site of activeSites)` loop | A9, A10 |

---

## 12. Validation Protocol

### After Every Code Change

1. `npx tsc --noEmit` — zero TypeScript errors
2. `grep -r "Math\.random()" app/ components/ --include="*.ts" --include="*.tsx" | grep -v node_modules` — no fake data
3. `grep -r "catch\s*{\s*}" app/ lib/ --include="*.ts" | grep -v node_modules` — no empty catches

### After Every Pipeline Change

1. Verify TopicProposal → ArticleDraft → BlogPost flow in DB
2. Verify site_id is set at every stage
3. Verify no duplicate processing (check updated_at timestamps)
4. Verify published article is publicly accessible
5. Verify affiliate links present in published content

### Before Every Deployment

1. All Phase 1 security checks pass
2. No unauthenticated mutation endpoints
3. No API key/token/password values in console.log statements
4. All cron routes respond to healthcheck GET
5. Dashboard shows real data (not mock/simulated)

### Weekly Maintenance

1. Check CronJobLog for failed runs (dashboard)
2. Verify IndexNow submissions are being accepted
3. Check for stuck ArticleDrafts (phase_started_at > 1 hour ago)
4. Review SEO scores for recently published content
5. Check Google Search Console for indexing issues

---

## Known Gap Resolution Tracker

| KG ID | Description | Phase | Status |
|-------|-------------|-------|--------|
| KG-001 | GA4 dashboard returns 0s | Phase 6 | Open |
| KG-002 | Social APIs engagement stats | Phase 8 | Open |
| KG-003 | No AI image/logo generation | Phase 8 | Open |
| KG-004 | Automation Hub/Autopilot placeholders | Phase 5 | Open |
| KG-005 | Feature flags not wired to runtime | Phase 8 | Open |
| KG-006 | Article CRUD buttons TODO | Phase 5 | Open |
| KG-007 | Rate limiting in-memory | Phase 8 | Open |
| KG-008 | TopicPolicy no UI | Phase 8 | Open |
| KG-009 | ContentScheduleRule no site_id | Phase 7 | Open |
| KG-010 | Prompt templates global | Phase 7 | Open |
| KG-011 | WordPress sync no cron | Phase 8 | Open |
| KG-012 | Inconsistent auth patterns | Phase 1 | Open |
| KG-013 | PDF models missing from schema | Phase 5 | Open |
| KG-014 | 260+ console.error invisible | Phase 4 | Open |
| KG-015 | standards.ts exports unused | Phase 8 | Open |
| KG-016 | 14+ admin pages mock data | Phase 5 | Open |
| KG-017 | Per-site env docs missing | Phase 7 | Open |
| KG-018 | daily-content-generate bypasses pipeline | Phase 2 | Open |
| KG-019 | Duplicate IndexNow | — | **RESOLVED** (A11) |
| KG-020 | 23 orphan Prisma models | Phase 8 | Open |
| KG-021 | 50+ SEO routes hardcode domain | Phase 3 | Open |
| KG-022 | Hardcoded emails | — | **RESOLVED** (A11) |
| KG-023 | XSS dangerouslySetInnerHTML | — | **RESOLVED** (A10, A11) |
| KG-024 | No login rate limiting | Phase 1 | Open |
| KG-025 | Race conditions in pipeline | Phase 2 | Open |
| KG-026 | CSP headers | — | **RESOLVED** (false positive) |
| KG-027 | Only London brand template | Phase 7 | Open |
| KG-028 | Cron auth bypass | — | **RESOLVED** (A9) |
| KG-029 | daily-publish dead code | — | **RESOLVED** (A10) |
| KG-030 | Build-runner single-site | — | **RESOLVED** (A9) |
| KG-031 | Trends monitor single-site | — | **RESOLVED** (A10) |
| KG-032 | No Arabic SSR | Phase 8 | Open |
| KG-033 | Related articles static-only | — | **RESOLVED** (A11) |
| KG-034 | Affiliate injection London-only | — | **RESOLVED** (A10) |
| KG-035 | No traffic/revenue dashboard data | Phase 6 | Open |
| KG-036 | No push/email cron failure alerts | Phase 4 | Open |
| KG-037 | Scheduled-publish bypass | — | **RESOLVED** (A9) |
| KG-038 | IndexNow 24h window | — | **RESOLVED** (A11) |
| KG-039 | Blog slug global uniqueness | — | **RESOLVED** (A9) |
| KG-040 | Unauthenticated database routes | Phase 1 | **NEW** (A12) |
| KG-041 | Admin setup password reset bypass | Phase 1 | **NEW** (A12) |
| KG-042 | Unauthenticated public mutation APIs | Phase 1 | **NEW** (A12) |
| KG-043 | 61 empty catch blocks | Phase 4 | **NEW** (A12) |
| KG-044 | Static metadata hardcoded URLs | Phase 3 | **NEW** (A12) |
| KG-045 | Admin mock data pages | Phase 5 | **NEW** (A12) |
| KG-046 | Admin dead buttons | Phase 5 | **NEW** (A12) |
| KG-047 | Broken sidebar navigation links | Phase 5 | **NEW** (A12) |

---

## Document Maintenance

- **Location:** `docs/FUNCTIONING-ROADMAP.md`
- **Updated by:** Claude Code after each audit session
- **Referenced by:** CLAUDE.md, AUDIT-LOG.md, all future development
- **Phases are sequential:** Complete Phase N before starting Phase N+1 (except where noted as parallelizable)
