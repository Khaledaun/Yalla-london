# Agent System Discovery Report

**Date:** 2026-02-13
**Audit Reference:** Yalla London SEO/AIO/UX Technical Audit (same date)
**Scope:** Full codebase mapping of agents, SEO modules, content pipeline, cron infrastructure, and gap analysis against production audit findings.

---

## Table of Contents

1. [Existing Agents](#1-existing-agents)
2. [Existing Audit/Check Modules](#2-existing-auditcheck-modules)
3. [Cron & Scheduling Infrastructure](#3-cron--scheduling-infrastructure)
4. [Database Schema (Relevant Models)](#4-database-schema-relevant-models)
5. [Feature Flags](#5-feature-flags)
6. [Gap Analysis: Audit Findings vs Current System](#6-gap-analysis-audit-findings-vs-current-system)
7. [Summary of Gaps](#7-summary-of-gaps)

---

## 1. Existing Agents

### 1.1 SEO Intelligence Agent (Autonomous, 3x daily)

**File:** `yalla_london/app/app/api/cron/seo-agent/route.ts` (1067 lines)
**Schedule:** 7am, 1pm, 8pm UTC via Vercel cron
**Trigger:** `GET /api/cron/seo-agent` with `CRON_SECRET` auth

**Capabilities:**
| # | Capability | Status |
|---|-----------|--------|
| 1 | Check daily content generation status | Working |
| 2 | Audit published blog posts (meta tags, content length, AR content, tags, page_type) | Working |
| 3 | Check indexing status via GSC | Stub only (checks if credentials exist, doesn't call GSC API) |
| 4 | Submit new URLs to IndexNow | Working |
| 5 | Verify sitemap accessibility (HTTP status + URL count) | Working (basic) |
| 6 | Detect content gaps by category | Working |
| 7 | Auto-fix missing meta titles, page_types, SEO scores | Working |
| 8 | Analyze GSC search performance (CTR, position) | Working (if GSC configured) |
| 9 | Auto-optimize low-CTR meta titles/descriptions | Working (if GSC configured) |
| 10 | Flag almost-page-1 content for strengthening | Working |
| 11 | Analyze GA4 traffic patterns | Working (if GA4 configured) |
| 12 | Queue content rewrites for underperformers | Working |
| 13 | Auto-inject structured data for posts missing schemas | Working |
| 14 | Generate strategic content proposals | Working |
| 15 | Analyze content diversity + apply quotas | Working |
| 16 | Store health report in SeoReport table | Working |

**What it does NOT do:**
- Does NOT verify that URLs in sitemap actually return HTTP 200
- Does NOT check hreflang URLs resolve (just declares them)
- Does NOT verify structured data URLs (e.g., logo.png) resolve
- Does NOT check robots.txt for conflicts
- Does NOT detect CSR bailout issues
- Does NOT check CDN/cache performance
- Does NOT verify actual Google indexation (only checks if credentials exist)
- Does NOT check image alt text quality
- Does NOT verify internal links resolve
- Does NOT check for AI discoverability files (llms.txt, ai-plugin.json)
- Does NOT check security headers
- Does NOT verify hreflang tags in HTML `<head>` (only sitemap)

### 1.2 Content Improvement Agent

**File:** `yalla_london/app/lib/seo/content-improvement-agent.ts`

**Capabilities:**
- Analyzes content performance using GSC data (position, impressions, CTR)
- Generates improvement plans with effort estimation
- Identifies keyword opportunities and quick wins

**Limitations:** Library module only — not wired to any cron job or autonomous trigger. Must be invoked manually via API.

### 1.3 Parallel SEO Agents Dispatcher

**File:** `yalla_london/app/lib/seo/skills/parallel-seo-agents.ts`

**7 Specialized Agent Types:**
1. Indexing Verifier
2. Content Auditor
3. Technical SEO
4. Keyword Optimizer
5. Meta Enhancer
6. Internal Linker
7. Schema Validator

**Limitations:** Framework/dispatcher only — defines task types and dependency graph but agents are shells. Not wired to cron. Must be triggered via SEO Workflow API.

### 1.4 SEO Workflow Orchestrator

**File:** `yalla_london/app/lib/seo/seo-workflow-orchestrator.ts`

**Capabilities:**
- GSC connection verification
- Content audit with issue detection
- Indexing verification and submission
- Full SEO workflow, indexing workflow, content optimization workflow, research workflow

**Limitations:** Orchestrates the parallel agents above. Available via API (`/api/seo/workflow`) and cron (`/api/seo/workflow/cron`). But the cron only runs daily/weekly SEO tasks — not the full capabilities.

### 1.5 Topic Orchestrator

**File:** `yalla_london/app/lib/services/TopicOrchestrator.ts`

**Capabilities:**
- Phase 2 topic generation with safety controls
- Rate limiting (5 requests/hour)
- Content safety checks, quality validation, London relevance
- Manual approval workflow (configurable)

**Limitations:** Topic generation only. No SEO awareness of site health before generating topics.

### 1.6 Content Automation Engine

**File:** `yalla_london/app/lib/content-automation/content-generator.ts`

**Capabilities:**
- AI-powered blog post generation with SEO optimization
- Event and recommendation generation
- Schema markup generation (Article, Event, Place)
- SEO score calculation
- Content scheduling

**Limitations:** No pre-publication SEO gate. Generates content without checking if target URL will work, if locale routes exist, or if site has critical SEO issues.

### 1.7 Auto Content Scheduler

**File:** `yalla_london/app/lib/content-automation/auto-scheduler.ts`

**Capabilities:**
- Automated generation with rate limiting (10/run, 20/day)
- Content deduplication (7-day window, 60% threshold)
- Smart scheduling (9am, 3pm, 9pm optimal slots)
- Automatic Arabic translation
- Bilingual publishing + GSC submission

**Limitations:** Generates Arabic content even though /ar/ routes return 404. No check that target routes exist before publishing.

---

## 2. Existing Audit/Check Modules

### 2.1 AI SEO Audit

**File:** `yalla_london/app/lib/seo/ai-seo-audit.ts` (870 lines)

**8 Audit Categories (0-100 each):**
1. Title audit (length, keyword, emotional words, numbers, brand)
2. Meta description audit (length, CTA, keyword, uniqueness)
3. Content audit (word count, keyword density, readability, links, images)
4. Structure audit (headings, H1 count, hierarchy, keyword in headings)
5. Images audit (alt text presence, keyword in alt, descriptiveness)
6. Links audit (internal count, external presence, descriptive anchor text)
7. Schema audit (presence, multiple types, specific types)
8. Performance audit (basic, large image detection)

**What it checks:** Content quality on a per-page basis.
**What it does NOT check:** Live HTTP status codes, route existence, CDN performance, robots.txt, hreflang resolution, structured data URL validity.

### 2.2 Schema Generator

**File:** `yalla_london/app/lib/seo/schema-generator.ts` (850 lines)

**Generates:** WebSite, Article, Event, Place, FAQ, HowTo, Review, Video, Breadcrumb, Person, Organization schemas.
**Auto-detection:** FAQ from Q&A patterns, HowTo from numbered steps, Review from rating patterns.

### 2.3 Enhanced Schema Injector

**File:** `yalla_london/app/lib/seo/enhanced-schema-injector.ts` (490 lines)

**Capabilities:** Analyzes content, detects types, injects multiple schemas, calculates schema SEO score.
**Limitation:** Does NOT validate that URLs referenced in schemas (logo, images) actually resolve.

### 2.4 Structured Data Component

**File:** `yalla_london/app/components/structured-data.tsx` (340 lines)

**Renders:** JSON-LD script tags for all content types.
**CRITICAL BUG:** Line 20 hardcodes `${baseUrl}/logo.png` which returns 404. Line 51 does the same for publisher logo.

### 2.5 Sitemap Generator (Next.js)

**File:** `yalla_london/app/app/sitemap.ts` (305 lines)

**Generates:** Static pages, blog posts (static + DB), events, categories, information hub, news — all with hreflang alternates for en/ar.
**CRITICAL GAP:** Declares `/ar/*` hreflang alternates for every URL, but NO /ar/ routes exist in the app. Also declares `/blog/category/{slug}` URLs but no route handler exists.

### 2.6 Robots.txt (Next.js)

**File:** `yalla_london/app/app/robots.ts` (89 lines)

**Configuration:** Correctly allows all AI crawlers, blocks /admin/ and /api/.
**CRITICAL GAP:** Code is correct but Cloudflare prepends managed blocking rules that override these. The system has no way to detect or alert on this conflict.

### 2.7 Multilingual SEO Module

**File:** `yalla_london/app/lib/seo/multilingual-seo.ts` (346 lines)

**Capabilities:** Hreflang tag generation, duplicate content detection, locale-specific schema, hreflang validation.
**Limitation:** Validates hreflang structure (missing x-default, duplicate langs) but does NOT verify target URLs return 200.

### 2.8 Indexing Service

**File:** `yalla_london/app/lib/seo/indexing-service.ts` (855 lines)

**Capabilities:** IndexNow batch submission, GSC API (URL inspection, search analytics, sitemap submission), automated indexing orchestration.
**Limitation:** Rate limiting and retry logic implemented. But GSC URL Inspection is read-only and can't force indexing for regular content.

### 2.9 Auto-SEO Service

**File:** `yalla_london/app/lib/seo/auto-seo-service.ts` (510 lines)

**Orchestrates:** SEO metadata generation, schema injection, internal linking, AI audit, sitemap update, GSC submission — all applied when content is created/updated.
**Limitation:** Applies SEO optimizations but doesn't verify the page will actually be accessible (route exists, returns 200).

---

## 3. Cron & Scheduling Infrastructure

### 3.1 Vercel Cron Jobs (Production)

**File:** `yalla_london/app/vercel.json`

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/daily-content-generate` | `0 5 * * *` (5am) | Daily content generation |
| `/api/cron/scheduled-publish` | `0 9 * * *` (9am) | Morning publish |
| `/api/cron/scheduled-publish` | `0 16 * * *` (4pm) | Afternoon publish |
| `/api/cron/seo-agent` | `0 7 * * *` (7am) | SEO agent run 1 |
| `/api/cron/seo-agent` | `0 13 * * *` (1pm) | SEO agent run 2 |
| `/api/cron/seo-agent` | `0 20 * * *` (8pm) | SEO agent run 3 |
| `/api/cron/weekly-topics` | `0 4 * * 1` (Mon 4am) | Weekly topic generation |
| `/api/cron/trends-monitor` | `0 6 * * *` (6am) | Trend monitoring |
| `/api/cron/analytics` | `0 3 * * *` (3am) | Analytics processing |
| `/api/seo/cron?task=daily` | `30 7 * * *` (7:30am) | Daily SEO tasks |
| `/api/seo/cron?task=weekly` | `0 8 * * 0` (Sun 8am) | Weekly SEO audit |

**Function timeouts:** API=30s, Cron=120s, SEO=60s, Admin=45s

### 3.2 CronManager Service

**File:** `lib/services/cron-manager.ts`

Internal node-cron manager with 5 registered jobs: content-pipeline (9am/3pm), topic-research (8am), analytics-refresh (6h), seo-audit (2am), database-cleanup (weekly).

### 3.3 Background Job Service

**File:** `yalla_london/app/lib/background-jobs.ts`

4 default jobs: backlink_inspector (triggered), topic_balancer (2am), analytics_sync (6h), cleanup (1am).

### 3.4 Cron Logger

**File:** `yalla_london/app/lib/cron-logger.ts`

Wraps cron handlers with auth verification, timeout tracking, status logging to CronJobLog table.

---

## 4. Database Schema (Relevant Models)

**File:** `yalla_london/app/prisma/schema.prisma` (2659 lines, ~123 models)

### SEO Models
- `SeoMeta` — Per-page SEO metadata (title, description, OG, Twitter, robots, schema, hreflang, seoScore)
- `SeoRedirect` — 301/302 redirect management
- `SeoInternalLink` — Internal linking with relevance scores
- `SeoKeyword` — Keyword research tracking
- `SeoContentAnalysis` — Readability, keyword density, sentiment
- `SeoReport` — Period-based SEO reports (used by SEO agent)
- `SeoHealthMetric` — Time-series health metrics
- `SeoPageMetric` — Core Web Vitals (LCP, FID, CLS, FCP, TTI) + indexation status
- `SeoSitemapEntry` — Sitemap management
- `SeoHreflangEntry` — Hreflang alternate tracking
- `SeoStructuredData` — JSON-LD schema storage
- `SeoAuditResult` — Audit results with breakdowns, suggestions, quick fixes

### Agent/Automation Models
- `CronJobLog` — Cron execution tracking (job_name, status, duration, items processed, sites)
- `URLIndexingStatus` — Per-URL indexing journey (discovered → submitted → indexed)
- `BackgroundJob` — Generic background job management with retry
- `SiteHealthCheck` — Periodic health snapshots (health_score, indexed_pages, GSC metrics, GA4 metrics, content health, automation health, PageSpeed)

### Content Models
- `BlogPost` — Core blog with bilingual EN/AR, SEO fields, page_type, keywords, authority links
- `ScheduledContent` — Content scheduled for automated publishing
- `TopicProposal` — Weekly topic research with authority links, long-tails, questions
- `ContentScheduleRule` — Automation rules for content generation

---

## 5. Feature Flags

**Files:** `config/feature-flags.ts`, `yalla_london/app/lib/feature-flags.ts`

All features default to **disabled** (0) in production. Key flags:

| Flag | Purpose |
|------|---------|
| `PHASE4B_ENABLED` | Master toggle for all Phase 4B features |
| `FEATURE_AI_SEO_AUDIT` | AI-powered SEO audit |
| `FEATURE_CONTENT_PIPELINE` | Full content pipeline |
| `SEO_AUTOMATION` | Automated SEO optimization |
| `ANALYTICS_REFRESH` | Analytics data refresh |
| `TOPIC_RESEARCH` | AI topic research |
| `AUTO_CONTENT_GENERATION` | Automatic content generation |
| `AUTO_PUBLISHING` | Automatic publishing |
| `FEATURE_INTERNAL_LINKS` | Internal linking automation |
| `FEATURE_BACKLINK_INSPECTOR` | Backlink inspector |
| `FEATURE_LLM_ROUTER` | LLM routing/failover |

---

## 6. Gap Analysis: Audit Findings vs Current System

### P0 CRITICAL: 3.1 — All Arabic Routes Return 404

**Would the current system have caught this? NO**

**Root Cause:** There is no `/ar/` directory in the app router, no `[locale]` dynamic segment, and the middleware (`middleware.ts`) does NOT handle locale routing — it only resolves tenant (site) context. Arabic routes simply don't exist.

**Why the system missed it:**
1. The **sitemap generator** (`app/sitemap.ts`) declares hreflang alternates for `/ar/*` on every URL (lines 38-42, 49-52, etc.) without verifying routes exist.
2. The **SEO agent** audits blog post content in the database but never makes HTTP requests to verify that declared URLs actually return 200.
3. The **multilingual SEO module** validates hreflang structure (duplicate langs, missing x-default) but does NOT verify target URLs resolve.
4. The **auto content scheduler** generates and translates Arabic content, but there are no routes to serve it.
5. No module performs **live URL health checks** — comparing sitemap URLs against actual HTTP responses.

**Missing capability:** Sitemap URL validator that fetches every declared URL and flags non-200 responses.

---

### P0 CRITICAL: 3.2 — Blog Category Pages Return 404

**Would the current system have caught this? NO**

**Root Cause:** The sitemap generates `/blog/category/{slug}` entries (line 176-187 of `app/sitemap.ts`) from imported `categories` data, but there is no `app/blog/category/[slug]/page.tsx` route handler.

**Why the system missed it:**
1. The **sitemap generator** creates category URLs from data without verifying the route exists.
2. The **SEO agent** doesn't check category page HTTP status — it only audits blog posts in the database.
3. No module verifies that **every sitemap URL has a corresponding route handler**.

**Missing capability:** Same as 3.1 — live URL health check against sitemap.

---

### P0 CRITICAL: 3.3 — Broken Logo URL in Structured Data

**Would the current system have caught this? NO**

**Root Cause:** `structured-data.tsx` line 20 hardcodes `${baseUrl}/logo.png`. No `/public/logo.png` file exists. The actual logos are SVGs in `/branding/yalla-london/brand-kit/01-logos-svg/`.

**Why the system missed it:**
1. The **schema generator** and **enhanced schema injector** generate schemas but don't validate that URLs within the schema (logo, images) resolve.
2. The **AI SEO audit** checks schema presence/types but not schema content validity.
3. The **SEO agent** auto-injects schemas but doesn't verify referenced URLs.
4. No module performs **structured data URL resolution** — checking that every URL field in JSON-LD returns 200 with correct Content-Type.

**Missing capability:** Schema URL validator that extracts all URL fields from JSON-LD and verifies they resolve.

---

### P0 CRITICAL: 3.4 — Conflicting robots.txt Directives

**Would the current system have caught this? NO**

**Root Cause:** `app/robots.ts` correctly allows AI crawlers, but Cloudflare's managed content injection prepends `Disallow: /` rules for those same crawlers. The Cloudflare rules appear first, and most crawlers follow the first matching User-agent group.

**Why the system missed it:**
1. No module fetches and parses the **live robots.txt** (as served through Cloudflare) to detect conflicts.
2. The **SEO agent** verifies sitemap health but does NOT check robots.txt.
3. The system only knows about its own `app/robots.ts` — it has no awareness of CDN-layer modifications.

**Missing capability:** Live robots.txt conflict detector that fetches the actual served robots.txt, parses it, and detects conflicting directives (same User-agent with both Allow and Disallow for same paths, or Cloudflare-injected blocks).

---

### P1 HIGH: 4.1 — Homepage Client-Side Rendering Bailout

**Would the current system have caught this? NO**

**Root Cause:** The homepage (`/`) bails out of static/server rendering to client-side rendering, likely due to client-only dependencies (useEffect/useState for data that should be server-fetched, browser-only library imports, or `dynamic()` with `ssr: false`).

**Why the system missed it:**
1. No module checks **rendering mode** of pages (SSR vs CSR vs SSG).
2. The **AI SEO audit** evaluates content quality but not how the content is delivered.
3. The **SEO agent** doesn't inspect response headers or JavaScript rendering behavior.
4. Build log analysis is not part of any automated check.

**Missing capability:** Rendering mode detector that checks response headers (x-nextjs-cache, x-middleware-*, etc.) and content delivery method for key pages.

---

### P1 HIGH: 4.2 — Low Cloudflare Cache Hit Rate (3.3%)

**Would the current system have caught this? NO**

**Root Cause:** Most requests hit origin. Improper Cache-Control headers for static assets, no Cloudflare Page Rules for HTML caching.

**Why the system missed it:**
1. No module monitors **CDN cache performance** (cf-cache-status headers).
2. The middleware sets Cache-Control for `/` (300s s-maxage) but not for other pages or assets.
3. The **performance monitoring** (`performance-monitoring.ts`) tracks API response times and memory but not CDN cache hit rates.

**Missing capability:** CDN performance monitor that samples cf-cache-status headers across key pages and assets, tracks hit/miss/expired ratios.

---

### P1 HIGH: 4.3 — Zero Google Indexation

**Would the current system have caught this? PARTIALLY**

**Root Cause:** Combination of P0 issues (crawl errors, CSR bailout) plus site not submitted to GSC.

**Why the system partially catches it:**
1. The **SEO agent** step 3 checks for GSC credentials and logs a WARNING if missing, but doesn't escalate this as CRITICAL.
2. The **indexing service** has GSC API integration but it's read-only for regular content.
3. The **URLIndexingStatus** model exists to track per-URL indexing journey, but it's not populated by the agent (the agent only submits to IndexNow, it doesn't verify indexation status).

**Partial detection:** The agent would flag "credentials not configured" but would NOT detect zero indexation even with credentials — it doesn't actually call the URL Inspection API.

---

### P2 MEDIUM: 5.1 — Missing hreflang tags in HTML head

**Would the current system have caught this? NO**

The **multilingual SEO module** generates hreflang tags and validates them, but these are only used when auto-SEO is applied to content. No check verifies that hreflang tags are actually present in the rendered HTML `<head>` of each page.

---

### P2 MEDIUM: 5.2 — No BreadcrumbList schema

**Would the current system have caught this? PARTIALLY**

The **schema generator** has `generateBreadcrumbs()` method and the **enhanced schema injector** generates breadcrumb schemas. But these are only applied to content processed through auto-SEO. Blog posts and category pages may not have them if auto-SEO wasn't run.

---

### P2 MEDIUM: 5.3 — No FAQ/HowTo schema

**Would the current system have caught this? PARTIALLY**

The **schema generator** has FAQ/HowTo auto-detection from content patterns. The **enhanced schema injector** does this automatically. But only for posts processed through the injection pipeline — not retroactively for all existing content.

---

### P2 MEDIUM: 5.4 — High content-to-code ratio

**Would the current system have caught this? NO**

No module analyzes JS bundle size or content-to-code ratio. The **performance audit** in `ai-seo-audit.ts` is basic (80 base points, -10 for large images).

---

### P2 MEDIUM: 5.5 — Image alt text audit needed

**Would the current system have caught this? PARTIALLY**

The **AI SEO audit** images category checks alt text presence and keyword inclusion. But the SEO agent only audits blog post database fields — it doesn't check rendered HTML for actual `<img>` alt attributes on live pages. Stock images from Unsplash with generic/empty alts would be missed.

---

## 7. Summary of Gaps

### Critical Missing Capabilities

| # | Missing Capability | Audit Findings It Would Catch |
|---|-------------------|------------------------------|
| 1 | **Live URL Health Check** — Fetch every sitemap URL and verify HTTP 200 | 3.1 (Arabic 404s), 3.2 (Category 404s), 4.3 (Zero indexation root cause) |
| 2 | **Structured Data URL Validator** — Verify all URLs in JSON-LD resolve | 3.3 (Broken logo) |
| 3 | **Live robots.txt Conflict Detector** — Fetch served robots.txt, parse, detect conflicts | 3.4 (Cloudflare conflicts) |
| 4 | **Rendering Mode Detector** — Check SSR/CSR/SSG status per page | 4.1 (CSR bailout) |
| 5 | **CDN Performance Monitor** — Track cache hit/miss ratios | 4.2 (3.3% cache hit rate) |
| 6 | **Actual Indexation Verifier** — Call GSC URL Inspection API | 4.3 (Zero indexation) |
| 7 | **HTML Head Validator** — Verify hreflang, meta tags in rendered HTML | 5.1 (Missing hreflang in head) |
| 8 | **Pre-publication SEO Gate** — Block publishing if routes broken or critical issues exist | Would have prevented publishing AR content to 404 routes |
| 9 | **AI Discoverability Check** — Verify llms.txt, ai-plugin.json exist | Not in audit but needed for AIO |
| 10 | **Internal Link Validator** — Verify all internal links resolve | Not explicitly in audit but related to 3.1, 3.2 |

### Broken/Disabled Capabilities

| # | Capability | Status | Issue |
|---|-----------|--------|-------|
| 1 | GSC indexation verification | Stub | Checks if credentials exist, doesn't call API |
| 2 | Parallel SEO agents | Framework only | Agent types defined but not implemented |
| 3 | Content Improvement Agent | Library only | Not wired to any cron or autonomous trigger |
| 4 | Feature flags | All disabled | All flags default to 0 in production |
| 5 | Auto-SEO service | Available | Not called by publishing pipeline by default |
| 6 | Hreflang validation | Structural only | Validates structure but not URL resolution |

### Architecture Gaps

| # | Gap | Impact |
|---|-----|--------|
| 1 | **No cross-agent communication** — Agents operate independently, no shared signal bus | Content agent publishes to broken routes; SEO agent doesn't block publishing |
| 2 | **No orchestration layer** — No agent sits above others to coordinate or enforce business goals | Each agent optimizes locally without global awareness |
| 3 | **No fix execution engine** — SEO agent detects issues but only auto-fixes DB fields (meta titles, page_type, SEO scores) | Cannot fix routes, robots.txt, structured data URLs, cache config |
| 4 | **No audit-fix-verify cycle** — Agent detects issues and logs them, but doesn't verify fixes after applying them | No feedback loop on fix effectiveness |
| 5 | **No per-page health tracking** — SeoPageMetric and SeoHealthMetric models exist but aren't populated by the agent | No dashboard showing green/yellow/red per page |
| 6 | **No pre-publication gate** — Content publishes without verifying target URL will work, SEO requirements are met, or site health allows it | Arabic content published to 404 routes |
| 7 | **No knowledge base** — No learning from past audit cycles, no pattern matching for recurring issues | Same issues re-detected every run without improving detection/fix speed |
| 8 | **Sitemap declares routes that don't exist** — Sitemap generates URLs from data (categories, hreflang) without verifying route handlers exist | 43+ URLs in sitemap return 404 |

---

### Route Infrastructure Gap (Root Cause of P0s)

The middleware (`middleware.ts`) handles **multi-tenant routing** (hostname → siteId) but does NOT handle **locale routing**:

- No `app/ar/` directory exists
- No `app/[locale]/` dynamic segment exists
- No locale detection/rewriting in middleware
- No i18n library configured (no next-intl, no next-i18next)
- No `app/blog/category/[slug]/page.tsx` route exists

The sitemap and navigation declare these routes, the content pipeline generates Arabic content, but **there are no route handlers to serve them**.

---

*This document should be reviewed before any code changes are made. It establishes the baseline from which all enhancements will be built.*
