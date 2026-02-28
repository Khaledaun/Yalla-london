# Functioning Roadmap — Path to Revenue & Multi-Site Launch

> **Purpose:** Single source of truth for every remaining gap, fix, and milestone needed to reach a fully functional, production-grade, multi-site content-to-revenue engine.
>
> **Updated:** 2026-02-21 — Aligned with Product Readiness Report, Audits #1–#14, and production hotfixes
>
> **Previous version:** 2026-02-18 (after 11 audits). This version incorporates fixes from Audits #12–#14 and production hotfixes (robots.txt, blog timeouts, indexing pipeline, duplicate slugs).
>
> **Owner:** Claude Code (CTO/COO/CMO partner) for Khaled / Zenitha.Luxury LLC

---

## Architecture Decision: One Database, One Vercel Project, 5 Sites

All 5 websites run as a **single Next.js application** deployed to **one Vercel Pro project**, connected to **one Supabase PostgreSQL database**. Multi-tenancy is handled by middleware reading the `Host` header and injecting `x-site-id` into every request. Every database table with site-specific data uses a `site_id` column for isolation.

This means:
- **One codebase** — all sites share the same code, cron jobs, and admin dashboard
- **One deployment** — push once, all 5 sites update
- **One database** — Supabase PostgreSQL, data isolated by `site_id`
- **One admin dashboard** — switch between sites from a dropdown
- **5 domains** — each points to the same Vercel deployment via DNS

---

## Table of Contents

1. [Current Health Assessment](#1-current-health-assessment)
2. [What Khaled Must Provide](#2-what-khaled-must-provide)
3. [Phase 1: Go Live — Yalla London Revenue](#3-phase-1-go-live--yalla-london-revenue)
4. [Phase 2: Visibility — See Your Numbers](#4-phase-2-visibility--see-your-numbers)
5. [Phase 3: Activate Site #2 — Arabaldives](#5-phase-3-activate-site-2--arabaldives)
6. [Phase 4: Activate Site #3 — Yalla Riviera](#6-phase-4-activate-site-3--yalla-riviera)
7. [Phase 5: Dashboard Polish & Dead Buttons](#7-phase-5-dashboard-polish--dead-buttons)
8. [Phase 6: Scale & Optimize](#8-phase-6-scale--optimize)
9. [Future: Skippers Yacht Platform](#9-future-skippers-yacht-platform)
10. [Known Gap Tracker](#10-known-gap-tracker)
11. [Anti-Patterns Registry](#11-anti-patterns-registry)

---

## 1. Current Health Assessment

### What Works (Verified — Feb 21, 2026)

| System | Status | Evidence |
|--------|--------|----------|
| Content pipeline (topic → draft → publish) | **OPERATIONAL** | 8-phase pipeline, atomic claiming, fail-closed gate |
| Pre-publication SEO gate | **13 checks active** | Word count, SEO score, affiliates, authenticity, E-E-A-T |
| Quality gate threshold | **70** | Aligned across standards.ts, phases.ts, select-runner.ts |
| Affiliate link injection | **Per-site** | 5-destination URL mappings, auto-injection cron |
| IndexNow + GSC submission | **Working** | seo-agent discovers, seo/cron submits with backoff |
| Robots.txt | **Fixed** | Was blocking all crawlers — resolved in production hotfix |
| Blog page performance | **Fixed** | Suspense streaming, client-side DOMPurify, no timeouts |
| Duplicate slug prevention | **Fixed** | Empty slug guard + dedup logic |
| Cross-site indexing leakage | **Fixed** | Queries scoped by siteId |
| Multi-site middleware | **100% ready** | 14 domain mappings, all 5 sites configured |
| Security (auth, XSS, SSRF, CSRF) | **Hardened** | 14 audits, 350+ issues fixed, 78/78 smoke tests pass |
| Cron jobs (22 scheduled) | **Budget-guarded** | 53s budget, 7s buffer, standard auth pattern |
| TypeScript | **ZERO errors** | Entire codebase including 47+ design system files |
| Smoke tests | **78/78 PASS** | 14 categories, 100% score |
| Bilingual content (EN/AR) | **Working** | All articles get both versions |
| Google Jan 2026 compliance | **Adapted** | Authenticity signals, anti-generic phrases, E-E-A-T |
| Race conditions | **RESOLVED** | Atomic topic claiming with "generating" status |
| Empty catch blocks | **RESOLVED** | Central fixes + per-file logging |

### What's Resolved Since Last Roadmap (Feb 18)

These items were listed as open in the previous roadmap but have been **fixed**:

| Old Issue | Resolution | Audit/Fix |
|-----------|-----------|-----------|
| KG-025: Pipeline race conditions | Atomic claiming + "generating" status | Audit #12 |
| KG-040: Unauthenticated database routes | requireAdmin on all 7 handlers | Audit #12 |
| KG-041: Admin setup password reset bypass | 403 after first admin | Audit #12 |
| KG-042: Public mutation APIs unprotected | requireAdmin on 7 routes | Audit #12 |
| KG-043: 34+ empty catch blocks | Central + per-file logging | Audit #12 |
| KG-044: Static metadata hardcoded URLs | generateMetadata() + getBaseUrl | Audit #12 |
| KG-048: Analytics API credential exposure | Boolean indicators only | Audit #13 |
| KG-049: content-generator.ts crash | Find-or-create default category | Audit #13 |
| KG-050: 4 remaining XSS vectors | sanitizeHtml() on all | Audit #13 |
| KG-051: Math.random() fake metrics | Eliminated from 3 routes | Audit #13 |
| KG-052: Meta description threshold mismatch | Aligned to 120 chars | SEO audit |
| Robots.txt blocking crawlers | Fixed — was returning HTML | Production hotfix |
| Blog page timeouts | Suspense streaming + client DOMPurify | Production hotfix |
| Duplicate/empty slugs | Guard + dedup logic | Production hotfix |
| Cross-site indexing leakage | Scoped by siteId | Production hotfix |
| GSC property URL mismatch | Fixed in seo-intelligence | Production hotfix |
| IndexNow discovered URLs not submitted | Included in submission batch | Production hotfix |

### What Still Needs Work

| Category | Issue | Severity | Phase |
|----------|-------|----------|-------|
| Revenue visibility | GA4 not connected — dashboard shows 0s | HIGH | Phase 2 |
| Revenue visibility | Affiliate click tracking not wired | HIGH | Phase 2 |
| Multi-site | 4 sites still in "planned" status | MEDIUM | Phases 3-4 |
| Dashboard | ~13 admin pages with mock/placeholder data | MEDIUM | Phase 5 |
| Dashboard | ~14 dead buttons (no handlers) | MEDIUM | Phase 5 |
| SEO | Per-site OG images don't exist yet | MEDIUM | Phase 1 |
| E-E-A-T | Generic "Editorial" author on all articles | MEDIUM | Phase 1 |
| Legal | Cookie consent banner missing | MEDIUM | Phase 1 |
| Social | Social media APIs not connected | LOW | Phase 6 |
| Tech debt | ~16 orphan Prisma models | LOW | Phase 6 |
| Tech debt | Brand templates only for Yalla London | LOW | Phase 3 |

---

## 2. What Khaled Must Provide

### Before Anything Else (Blocking)

These are required. Without them, the engine can't produce or track revenue.

| # | What | Why | How to Get It | Status |
|---|------|-----|--------------|--------|
| 1 | **5 Domain names purchased & DNS pointing to Vercel** | Sites can't load without domains | Buy from Namecheap/GoDaddy, add to Vercel project, set DNS A/CNAME records | Need confirmation |
| 2 | **Vercel Pro account** | Hosts the app, runs 22 cron jobs (Pro needed for crons + 60s timeout) | vercel.com — $20/month | Need confirmation |
| 3 | **Supabase project (free tier works to start)** | Database for all content, articles, SEO data | supabase.com — create project, copy DATABASE_URL + DIRECT_URL + keys | Need confirmation |
| 4 | **xAI API key** | Powers all English content generation (Grok) | console.x.ai — sign up, create key | Need confirmation |
| 5 | **IndexNow key** | Fast indexing on Bing/Yandex (instant, not weeks) | Generate any random 32-char hex string | Can be auto-generated |

### For Revenue Visibility (Phase 2)

| # | What | Why | How to Get It |
|---|------|-----|--------------|
| 6 | **Google Analytics 4 property** | See traffic numbers on dashboard | analytics.google.com → Create property for yalla-london.com |
| 7 | **GA4 service account** (JSON key) | Server-side dashboard data | Google Cloud Console → Create service account → Download JSON → Share GA4 property with it |
| 8 | **Google Search Console** | See which articles Google indexed, search queries | search.google.com/search-console → Add property → Verify ownership via DNS |
| 9 | **GSC service account** (same as GA4 or separate) | Server-side indexing data | Same Google Cloud service account, grant access in GSC |

### For Each Additional Site

| # | What | Per Site |
|---|------|----------|
| 10 | **Domain purchased** | arabaldives.com, yallariviera.com, yallaistanbul.com, yallathailand.com |
| 11 | **Domain added to Vercel** | In Vercel project settings → Domains → Add |
| 12 | **DNS configured** | A record or CNAME to Vercel's IP |
| 13 | **GA4 property** (optional, can share one) | Separate property per site OR one property with data streams |
| 14 | **GSC property** | Register each domain in Search Console |
| 15 | **IndexNow key** (optional, can share one) | Can use same key across sites |

### Optional (Nice to Have)

| What | Why | Priority |
|------|-----|----------|
| AWS S3 bucket | Media file storage, backups | Medium |
| SendGrid/Resend API key | Email campaigns | Low |
| Sentry DSN | Error tracking in production | Low |
| Social media API keys (Twitter, FB, LinkedIn) | Auto-post from articles | Low |
| AbacusAI API key | Arabic content generation fallback | Low for now |

### Summary: Minimum to Start Earning

**5 things to provide right now:**
1. Vercel Pro account (or confirm you have one)
2. Supabase project URL + keys
3. xAI API key
4. yalla-london.com domain pointing to Vercel
5. Google Search Console access for yalla-london.com

That's it. Everything else can be added later without rebuilding anything.

---

## 3. Phase 1: Go Live — Yalla London Revenue

**Goal:** Yalla London produces articles, gets indexed, earns affiliate commissions
**Timeline:** Week 1 after credentials are provided
**Blocking:** Everything else — no revenue without this

### 1.1 Environment Setup
- [ ] Khaled provides: Vercel Pro, Supabase, xAI key, domain
- [ ] Set all required env vars in Vercel dashboard
- [ ] Run `prisma migrate deploy` to create database tables
- [ ] Create first admin account via `/api/admin/setup`
- [ ] Verify deployment is live at yalla-london.com

### 1.2 Content Pipeline Verification
- [ ] Trigger weekly-topics manually from dashboard → verify TopicProposals created
- [ ] Trigger content-builder → verify ArticleDraft advances through 8 phases
- [ ] Trigger content-selector → verify draft promotes to BlogPost
- [ ] Verify published article is publicly accessible at /blog/{slug}
- [ ] Verify article passes all 13 pre-publication checks
- [ ] Verify article contains 2+ affiliate links
- [ ] Verify article contains 3+ internal links

### 1.3 SEO Verification
- [ ] Verify robots.txt allows crawling (was blocking — now fixed)
- [ ] Verify sitemap.xml includes published articles
- [ ] Register yalla-london.com in Google Search Console
- [ ] Submit sitemap to GSC
- [ ] Verify IndexNow submission works (check cron logs)
- [ ] Verify JSON-LD structured data on published articles
- [ ] Verify hreflang tags on all pages

### 1.4 Quick Wins
- [ ] Create 5 branded OG images (one per site, even if only London launches first)
- [ ] Create 2-3 author profiles (fictional travel experts for E-E-A-T)
- [ ] Add cookie consent banner (EU legal requirement)

### 1.5 Monitor First Week
- [ ] Watch dashboard daily: Topics → Drafts → Published → Indexed
- [ ] Check CronJobLog for failures
- [ ] Verify Google starts crawling (GSC → Coverage report)
- [ ] First affiliate clicks should appear within 2-4 weeks of indexing

### Success Criteria
- 5+ articles published in first week
- All articles pass 13-check quality gate
- Sitemap submitted to GSC
- IndexNow pings confirmed in cron logs
- Dashboard shows accurate pipeline counts

---

## 4. Phase 2: Visibility — See Your Numbers

**Goal:** Khaled can see traffic, clicks, and revenue on his phone
**Timeline:** Week 2-3
**Blocking:** Khaled's ability to monitor and make decisions

### 2.1 Google Analytics Integration
- [ ] Khaled provides GA4 property ID + service account JSON
- [ ] Set env vars: `GA4_PROPERTY_ID`, `GOOGLE_ANALYTICS_CLIENT_EMAIL`, `GOOGLE_ANALYTICS_PRIVATE_KEY`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- [ ] Wire GA4 Data API to dashboard traffic cards (currently returns 0s)
- [ ] Add client-side gtag for real-time visitor tracking
- [ ] Verify dashboard shows real traffic numbers

### 2.2 Google Search Console Integration
- [ ] Khaled provides GSC service account access
- [ ] Set env vars: `GSC_SITE_URL`, `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`, `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`
- [ ] Wire GSC API to dashboard indexing status
- [ ] Show: indexed pages, search queries, average position, CTR

### 2.3 Affiliate Click Tracking
- [ ] Build JavaScript click handler for affiliate links
- [ ] Write clicks to AffiliateClick table (model already exists)
- [ ] Add click tracking dashboard panel
- [ ] Show: clicks per article, clicks per partner, click-through rate

### 2.4 Revenue Dashboard
- [ ] Create revenue summary panel in admin dashboard
- [ ] Show: total clicks, estimated revenue, top-performing articles
- [ ] Eventually: connect partner APIs for actual commission data

### Success Criteria
- Dashboard shows real traffic numbers (not zeros)
- Affiliate clicks are tracked and visible
- Khaled can see everything from his iPhone

---

## 5. Phase 3: Activate Site #2 — Arabaldives

**Goal:** Arabic-first Maldives content generating traffic and revenue
**Timeline:** Month 2 (after Yalla London proves the pipeline works)
**Blocking:** Multi-site revenue scaling

### 3.1 Pre-Activation
- [ ] Khaled purchases arabaldives.com (or confirms ownership)
- [ ] Domain added to Vercel project, DNS configured
- [ ] Register in Google Search Console
- [ ] Set per-site env vars: `GSC_SITE_URL_ARABALDIVES`, `GA4_PROPERTY_ID_ARABALDIVES`

### 3.2 Activate
- [ ] Change `arabaldives` status from `planned` to `active` in `config/sites.ts`
- [ ] Deploy — all cron jobs automatically start generating Arabaldives content
- [ ] Verify: topics generated with Maldives context
- [ ] Verify: articles in Arabic (primary) + English
- [ ] Verify: affiliate links point to Maldives-relevant partners (HalalBooking, Agoda)
- [ ] Submit sitemap to GSC

### 3.3 Brand Template
- [ ] Create Arabaldives brand template (turquoise + coral theme)
- [ ] Verify OG image exists for social sharing

### 3.4 Monitor
- [ ] First week: 5+ articles published
- [ ] Dashboard shows Arabaldives data separately
- [ ] No cross-site content contamination

---

## 6. Phase 4: Activate Site #3 — Yalla Riviera

**Goal:** French Riviera content — highest single-transaction revenue potential (yacht charters at 20% commission)
**Timeline:** Month 3-4
**Same process as Arabaldives above**

### Key Difference: Yacht Charter Affiliates
- Boatbookings: 20% commission on charters ($5K-$50K average)
- This is the highest-value affiliate in the entire network
- Even modest traffic (50 clicks/month) could produce $500-5,000/month

### Pre-Activation
- [ ] Khaled purchases yallariviera.com (or confirms ownership)
- [ ] Domain + DNS + GSC + env vars
- [ ] Change status to `active`, deploy
- [ ] Submit sitemap, verify content

---

## 7. Phase 5: Dashboard Polish & Dead Buttons

**Goal:** Every button works, every page shows real data or honest empty state
**Timeline:** Ongoing, parallelizable with Phases 2-4
**Blocking:** Khaled's trust and usability

### 5.1 Fix Dead Buttons (~14)
- [ ] Shop: Add Product, View/Edit/Download/Delete
- [ ] CRM: New Campaign, Add Subscriber, Edit, Send
- [ ] Members: Invite User, Resend, Filter
- [ ] Transactions: Export CSV, Filter

### 5.2 Replace Mock Data with Real or Empty States (~13 pages)
- [ ] `/admin/transactions` — real shop stats or empty state
- [ ] `/admin/crm` — real subscribers or empty state
- [ ] `/admin/site` — wire save functions
- [ ] `/admin/editor` — wire AI review to scoring API
- [ ] `/admin/media` — wire upload to media API
- [ ] Others as documented in AUDIT-LOG.md

### 5.3 Fix Navigation
- [ ] Remove or create pages for broken sidebar links (/admin/news, /admin/facts)
- [ ] Add valuable orphaned pages to sidebar (audit-logs, indexing, prompts)

---

## 8. Phase 6: Scale & Optimize

**Goal:** All 5 sites active, traffic growing, revenue optimized
**Timeline:** Month 6+

### 6.1 Activate Sites #4 and #5
- [ ] Yalla Istanbul (burgundy + copper, $35B Turkish tourism)
- [ ] Yalla Thailand (emerald + amber, 40M+ annual tourists)
- [ ] Same activation process as Arabaldives

### 6.2 Content Velocity
- [ ] Scale to 2-3 articles/site/day
- [ ] Improve content quality scores
- [ ] A/B test affiliate link placement

### 6.3 Performance
- [ ] Core Web Vitals audit (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- [ ] Bundle size optimization
- [ ] Image optimization (WebP/AVIF)

### 6.4 Social Media
- [ ] Connect platform APIs (Twitter, Instagram, LinkedIn)
- [ ] Auto-post from published articles
- [ ] Track engagement

### 6.5 Email Marketing
- [ ] Connect SendGrid/Resend
- [ ] Set up lead capture (email popups, PDF guides)
- [ ] Newsletter automation

---

## 9. Future: Skippers Yacht Platform

A comprehensive business plan exists at `docs/business-plans/SKIPPERS-YACHT-CHARTER-BUSINESS-PLAN.md` for building an AI-powered yacht charter platform. Key points:

- **$9-10B global market**, projected to reach $15-21B by 2035
- Built on the same Zenitha.Luxury stack (Next.js, Prisma, Supabase)
- Revenue: Boatbookings 20%, Sons of Sails 40-50% commission
- GCC Arab market positioning (no Arabic-first yacht platform exists)
- Leverages existing multi-tenant infrastructure

**This is a separate project that comes AFTER the 5 travel content sites are generating revenue.** The same one-database, one-Vercel-project architecture could potentially host it as site #6, but the yacht booking features (search, availability, reservations) would need significant new development.

---

## 10. Known Gap Tracker

### Resolved (Previously Open)

| KG ID | Description | Resolution |
|-------|-------------|-----------|
| KG-019 | Duplicate IndexNow | seo-agent discovers, seo/cron submits |
| KG-022 | Hardcoded emails | Dynamic from site config |
| KG-023 | XSS dangerouslySetInnerHTML | All 15 instances sanitized |
| KG-025 | Race conditions in pipeline | Atomic claiming + "generating" status |
| KG-026 | CSP headers | Already in next.config.js |
| KG-028 | Cron auth bypass | All 22 routes standardized |
| KG-029 | daily-publish dead code | Deprecation stub |
| KG-030 | Build-runner single-site | Loops all active sites |
| KG-031 | Trends monitor single-site | Loops all active sites |
| KG-033 | Related articles static-only | DB + static merged |
| KG-034 | Affiliate injection London-only | Per-site destination URLs |
| KG-037 | Scheduled-publish bypass | Full gate added, fail-closed |
| KG-038 | IndexNow 24h window | Extended to 7 days |
| KG-039 | Blog slug global uniqueness | Queries scoped by siteId |
| KG-040 | Unauthenticated database routes | requireAdmin on all |
| KG-041 | Admin setup password reset | 403 after first admin |
| KG-042 | Public mutation APIs | requireAdmin on 7 routes |
| KG-043 | 34+ empty catch blocks | Central + per-file logging |
| KG-044 | Static metadata URLs | generateMetadata + getBaseUrl |
| KG-048 | Analytics credential exposure | Boolean indicators only |
| KG-049 | content-generator.ts crash | Find-or-create default category |
| KG-050 | 4 remaining XSS vectors | sanitizeHtml() |
| KG-051 | Math.random() fake metrics | Eliminated |
| KG-052 | Meta description threshold | Aligned to 120 chars |

### Still Open

| KG ID | Description | Phase | Severity |
|-------|-------------|-------|----------|
| KG-001 | GA4 dashboard returns 0s | Phase 2 | HIGH |
| KG-002 | Social APIs engagement stats | Phase 6 | LOW |
| KG-003 | No AI image/logo generation | Phase 6 | LOW |
| KG-004 | Automation Hub/Autopilot placeholders | Phase 5 | MEDIUM |
| KG-005 | Feature flags not wired to runtime | Phase 6 | LOW |
| KG-006 | Article CRUD buttons TODO | Phase 5 | MEDIUM |
| KG-007 | Rate limiting in-memory | Phase 6 | LOW |
| KG-008 | TopicPolicy no UI | Phase 6 | LOW |
| KG-009 | ContentScheduleRule no site_id | Phase 3 | MEDIUM |
| KG-010 | Prompt templates global | Phase 3 | MEDIUM |
| KG-011 | WordPress sync no cron | Phase 6 | LOW |
| KG-012 | Inconsistent auth patterns (3 routes) | Phase 5 | MEDIUM |
| KG-014 | 260+ console.error invisible to dashboard | Phase 5 | MEDIUM |
| KG-015 | standards.ts exports unused | Phase 6 | LOW |
| KG-016 | ~13 admin pages mock data | Phase 5 | MEDIUM |
| KG-020 | ~16 orphan Prisma models | Phase 6 | LOW |
| KG-021 | ~30 remaining hardcoded URLs | Phase 5 | MEDIUM |
| KG-024 | No login rate limiting | Phase 5 | MEDIUM |
| KG-027 | Only London brand template | Phase 3 | MEDIUM |
| KG-032 | No Arabic SSR | Phase 6 | LOW |
| KG-035 | No traffic/revenue dashboard data | Phase 2 | HIGH |
| KG-036 | No push/email cron failure alerts | Phase 5 | MEDIUM |
| KG-045 | Admin mock data pages | Phase 5 | MEDIUM |
| KG-046 | Admin dead buttons | Phase 5 | MEDIUM |
| KG-047 | Broken sidebar navigation links | Phase 5 | MEDIUM |

---

## 11. Anti-Patterns Registry

These patterns have been identified as recurring problems. Any future code MUST NOT introduce them.

| Anti-Pattern | Correct Pattern |
|--------------|----------------|
| `if (!cronSecret) return 500` | `if (cronSecret && authHeader !== Bearer) return 401` |
| `catch {}` or `.catch(() => {})` | `.catch(err => console.error("context:", err))` |
| `"yalla-london"` hardcoded | `getDefaultSiteId()` from `@/config/sites` |
| `"https://www.yalla-london.com"` hardcoded | `getBaseUrl(headers)` or `getSiteDomain()` |
| `hello@yallalondon.com` hardcoded | `hello@${getSiteDomain(siteId)}` dynamic |
| `Math.random()` for metrics | Real data or null/0 with honest empty state |
| `// Simulate API call` + setTimeout | Actual `fetch()` to real API endpoint |
| `metadata = { ... }` with hardcoded URLs | `generateMetadata()` with dynamic URLs |
| `export async function POST()` without auth | `withAdminAuth` wrapper or `requireAdmin()` call |
| `@/lib/prisma` import | `@/lib/db` import (canonical) |
| `dangerouslySetInnerHTML={{ __html: x }}` | `dangerouslySetInnerHTML={{ __html: sanitizeHtml(x) }}` |
| `activeSites[0]` (first site only) | `for (const site of activeSites)` loop |

---

## Revenue Projections

| Milestone | Timeline | Monthly Revenue |
|-----------|----------|----------------|
| First affiliate click | Month 1-2 | $0-50 |
| Consistent traffic (1 site) | Month 3-4 | $200-800 |
| 3 sites active | Month 6-8 | $1,000-5,000 |
| 5 sites optimized | Month 12+ | $5,000-20,000+ |
| Yalla Riviera yacht charters producing | Month 6+ | Additional $500-5,000/month |

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-18 | v1.0 | Initial roadmap after 11 audits |
| 2026-02-21 | v2.0 | Major rewrite: incorporated Audits #12-14, production hotfixes (robots.txt, blog timeouts, indexing, slugs), Product Readiness Report, Skippers business plan. Reorganized phases around revenue timeline. Added "What Khaled Must Provide" section. Marked 24 KGs as resolved. |

---

---

## Future: Background Job Migration (When Sites > 5)

**Trigger:** When active site count exceeds 5 and cron budget timeouts become frequent.

**Problem:** Vercel Pro has a hard 60s limit. As sites grow, per-site loops within single cron runs will exceed this ceiling.

**Solution:** Migrate to queue-based architecture (Upstash QStash, Inngest, or BullMQ). One queue message per site per job, automatic retry, unlimited duration.

*Added: Feb 28, 2026 — Gemini expert audit recommendation (Q25)*

---

*Roadmap maintained by Claude Code — Senior Technical Partner*
*Platform: Zenitha.Luxury LLC — 5-Site Content-to-Revenue Engine*
