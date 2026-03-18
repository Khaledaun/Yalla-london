# Content Pipeline Orchestration Map

> **Version:** 1.0 — March 18, 2026
> **Purpose:** Complete technical reference for the autonomous content generation, publishing, and enhancement pipeline.
> **Audience:** Platform validation, debugging, onboarding.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Pipeline Lifecycle — 5 Stages](#3-pipeline-lifecycle--5-stages)
4. [Stage 1: Topic Discovery & Draft Creation](#4-stage-1-topic-discovery--draft-creation)
5. [Stage 2: Content Building — 8-Phase Pipeline](#5-stage-2-content-building--8-phase-pipeline)
6. [Stage 3: Quality Gating & Publishing](#6-stage-3-quality-gating--publishing)
7. [Stage 4: Post-Publish Enhancement Chain](#7-stage-4-post-publish-enhancement-chain)
8. [Stage 5: Indexing, Analytics & Revenue](#8-stage-5-indexing-analytics--revenue)
9. [Quality Gate Reference](#9-quality-gate-reference)
10. [Centralized Constants](#10-centralized-constants)
11. [Complete Cron Schedule](#11-complete-cron-schedule)
12. [Error Recovery & Self-Healing](#12-error-recovery--self-healing)
13. [Known Gaps & Edge Cases](#13-known-gaps--edge-cases)
14. [Fixes Applied (Feb–March 2026)](#14-fixes-applied-febmarch-2026)
15. [Anti-Patterns Registry](#15-anti-patterns-registry)

---

## 1. Executive Summary

The platform runs a **fully autonomous content pipeline** that discovers topics, generates bilingual articles (EN + AR), quality-gates them, publishes to the website, enhances them with SEO signals and affiliate links, and submits them to search engines — all without human intervention.

**Daily throughput target:** 4 articles/day (2 EN + 2 AR)

**Key metrics:**
- 47 scheduled cron jobs in `vercel.json`
- 8-phase content building pipeline
- 16-check pre-publication quality gate (7 blockers + 9 warnings)
- 4-cron post-publish enhancement chain
- 3-engine IndexNow submission (Bing, Yandex, api.indexnow.org)
- Circuit breaker + last-defense AI fallback for reliability

**Single source of truth files:**

| File | Controls |
|------|----------|
| `lib/content-pipeline/constants.ts` | All retry caps, budget values, thresholds |
| `lib/seo/standards.ts` | Quality scores, word counts, SEO thresholds |
| `lib/seo/orchestrator/pre-publication-gate.ts` | 16-check publication gate |
| `lib/content-pipeline/phases.ts` | 8-phase pipeline logic + scoring formula |
| `lib/content-pipeline/select-runner.ts` | Reservoir → BlogPost promotion |
| `lib/content-pipeline/build-runner.ts` | Phase orchestration + draft selection |
| `lib/ai/provider.ts` | AI provider chain + circuit breaker |

---

## 2. Architecture Overview

### Master Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: TOPIC DISCOVERY                              │
│                                                                              │
│  weekly-topics ──┐                                                           │
│  (Mon 04:00)     ├──→ TopicProposal (DB) ──→ schedule-executor ──→ ArticleDraft│
│  trends-monitor ─┘       status: "approved"    (every 2h)          status: "research"│
│  (daily 06:00)           site_id scoped                             keyword, locale  │
│                                                                              │
│  daily-content-generate ─────────────────────→ ArticleDraft (parallel path)  │
│  (daily 05:00)                                                               │
│  content-builder-create ─────────────────────→ ArticleDraft (hourly path)    │
│  (hourly :07)                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      STAGE 2: 8-PHASE CONTENT BUILDING                       │
│                                                                              │
│  content-builder (every 15 min)                                              │
│                                                                              │
│  research → outline → drafting → assembly → images → seo → scoring → reservoir│
│     │          │         │           │         │       │       │         │    │
│   AI call    AI call   AI call    AI call   AI/URL  AI call  Formula  DB    │
│   3 max      3 max    8 max      5 max     3 max   3 max   3 max   write  │
│                         │           │                                        │
│                    60s/section  Raw fallback                                  │
│                    Arabic 3500  at attempts≥2                                │
│                    tokens                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    STAGE 3: QUALITY GATING & PUBLISHING                       │
│                                                                              │
│  ┌─ Scoring Phase (phase 7) ─────────────────────────────┐                   │
│  │  100-point formula → score ≥ 55 → "reservoir"         │                   │
│  │                       score < 55 → "rejected"         │                   │
│  └───────────────────────────────────────────────────────┘                   │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─ content-selector (8x/day) ──────────────────────────┐                   │
│  │  Fetch reservoir drafts (score ≥ 45)                  │                   │
│  │  Enhance if score < 55 or words < 500 (max 3 tries)   │                   │
│  │  promoteToBlogPost() — atomic $transaction            │                   │
│  │  ├─ cleanTitle() sanitization                         │                   │
│  │  ├─ Cannibalization check (80% Jaccard)               │                   │
│  │  ├─ 16-check pre-publication gate (FAIL = BLOCK)      │                   │
│  │  └─ BlogPost.create + ArticleDraft.update (atomic)    │                   │
│  │  Max 2 articles per run                               │                   │
│  └───────────────────────────────────────────────────────┘                   │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─ scheduled-publish (3x/day) ─────────────────────────┐                   │
│  │  Publishes ScheduledContent records                   │                   │
│  │  Auto-publishes orphaned BlogPosts (2h+ old)          │                   │
│  └───────────────────────────────────────────────────────┘                   │
│                           │                                                  │
│                           ▼                                                  │
│                    BlogPost (published=true)                                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   STAGE 4: POST-PUBLISH ENHANCEMENT                          │
│                                                                              │
│  seo-deep-review (daily 00:00) ──→ Content expansion, meta fixes,           │
│                                     authenticity signals, heading fixes       │
│                                                                              │
│  seo-agent (3x/day: 07:00, 13:00, 20:00) ──→ Schema injection,             │
│                                                meta optimization,            │
│                                                internal link injection,      │
│                                                IndexNow submission           │
│                                                                              │
│  content-auto-fix (2x/day: 11:00, 18:00) ──→ Orphan page resolution,       │
│                                                thin content unpublish,       │
│                                                duplicate detection,          │
│                                                broken link cleanup           │
│                                                                              │
│  affiliate-injection (daily 09:25) ──→ CJ tracking links,                   │
│                                         booking/activity links               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  STAGE 5: INDEXING & REVENUE                                 │
│                                                                              │
│  IndexNow → Bing, Yandex, api.indexnow.org (3 engines, batch POST)          │
│  gsc-sync (daily 04:00) → Per-day click/impression data                     │
│  verify-indexing (2x/day) → Status tracking                                 │
│  google-indexing (daily 09:35) → Google Indexing API                        │
│  CJ sync-advertisers (4x/day) → Advertiser database                        │
│  CJ sync-commissions (daily 06:50) → Revenue attribution via SID            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Models

| Model | Role | Key Fields |
|-------|------|-----------|
| `TopicProposal` | Topic queue | `title`, `status` (approved/generating/used), `site_id` |
| `ArticleDraft` | Pipeline draft | `keyword`, `current_phase`, `phase_attempts`, `quality_score`, `locale`, `site_id`, `topic_proposal_id` |
| `BlogPost` | Published article | `title_en`, `title_ar`, `content_en`, `content_ar`, `slug`, `seo_score`, `published`, `siteId` |
| `ContentScheduleRule` | Publishing schedule | `frequency_hours`, `min_hours_between`, `max_posts_per_day`, `language` |
| `CronJobLog` | Execution history | `job_name`, `status`, `started_at`, `items_succeeded`, `result_summary` |
| `URLIndexingStatus` | Indexing tracker | `url`, `status`, `submission_attempts`, `engines_submitted` |

**Critical field warnings (source of repeated production bugs):**
- `ArticleDraft` has `keyword` (NOT `title`), `topic_proposal_id` (NOT `topic_id`), NO `slug` field
- `BlogPost` has `title_en`/`title_ar` (NOT `title`), `seo_score` (NOT `quality_score`), `created_at` (NOT `published_at`)
- `BlogPost.title_ar`/`content_ar` are required (non-nullable) — always provide fallback values

---

## 3. Pipeline Lifecycle — 5 Stages

| Stage | What Happens | Cron Jobs | Frequency | Output |
|-------|-------------|-----------|-----------|--------|
| **1. Topic Discovery** | Discover trending topics, research keywords, create draft entries | `weekly-topics`, `trends-monitor`, `schedule-executor`, `content-builder-create`, `daily-content-generate` | Hourly–Weekly | `TopicProposal` (approved), `ArticleDraft` (research phase) |
| **2. Content Building** | AI generates research, outline, sections, assembles full article | `content-builder` | Every 15 min | `ArticleDraft` advances through 8 phases |
| **3. Quality & Publishing** | Score articles, gate quality, promote to published BlogPost | `content-selector`, `scheduled-publish`, `reserve-publisher` | 8x/day | `BlogPost` (published=true) |
| **4. Post-Publish Enhancement** | Add SEO signals, internal links, affiliate links, fix issues | `seo-deep-review`, `seo-agent`, `content-auto-fix`, `affiliate-injection` | 1-3x/day each | Enhanced `BlogPost` with links, schema, improved meta |
| **5. Indexing & Revenue** | Submit to search engines, sync GSC data, track affiliate revenue | `gsc-sync`, `verify-indexing`, `google-indexing`, `sync-advertisers`, `sync-commissions` | 1-4x/day | `URLIndexingStatus`, `CjCommission`, GSC metrics |

---

## 4. Stage 1: Topic Discovery & Draft Creation

### 4.1 weekly-topics

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/weekly-topics/route.ts` |
| **Schedule** | `0 4 * * 1` — Monday 04:00 UTC |
| **Reads** | Site config (`getActiveSiteIds()`), existing `TopicProposal` for dedup |
| **Writes** | `TopicProposal` records (status: "approved", site_id scoped) |
| **AI Provider** | Perplexity (direct API), then AI provider chain (Grok → OpenAI → Claude) |
| **Output** | 8-10 topics per site per week |
| **Blocking conditions** | No approved topics = pipeline starves |

**Topic mix:** 60-70% general luxury travel + 30-40% Arab niche (Rule #48)

### 4.2 trends-monitor

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/trends-monitor/route.ts` |
| **Schedule** | `0 6 * * *` — Daily 06:00 UTC |
| **Reads** | `MONITORED_KEYWORDS` (12 keywords: 7 general + 5 niche), existing topics for dedup |
| **Writes** | `TopicProposal` records with `source: "trends"` |
| **AI Provider** | Grok live search (web-search tool) |
| **Loops** | All active sites (skips `zenitha-yachts-med`) |

### 4.3 schedule-executor

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/schedule-executor/route.ts` |
| **Schedule** | `15 1,3,5,7,9,11,13,15,17,19,21,23 * * *` — Every 2 hours at :15 |
| **Reads** | `ContentScheduleRule` (active), `TopicProposal` (approved), `ArticleDraft` (today count) |
| **Writes** | `ArticleDraft` (phase: "research"), updates `TopicProposal` status to "used" |
| **Auto-seed** | Creates default rule if none exist: 4 articles/day (2 EN + 2 AR), 6h frequency |
| **Guards** | `max_posts_per_day` cap, `min_hours_between` check (uses own CronJobLog, not all drafts) |
| **Atomic claiming** | `TopicProposal.updateMany` with status="approved" in WHERE prevents race conditions |

**Critical fix applied (March 18):** Fixed 3 wrong Prisma field names (`title` → `keyword`, `topic_id` → `topic_proposal_id`, removed non-existent `slug`).

### 4.4 content-builder-create

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/content-builder-create/route.ts` |
| **Schedule** | `7 */1 * * *` — Hourly at :07 |
| **Reads** | `TopicProposal` (approved), active `ArticleDraft` count per site |
| **Writes** | `ArticleDraft` pair (1 EN + 1 AR) in `$transaction` |
| **Guards** | Max 2 active drafts per site (excludes drafts not updated in 1h per `ACTIVE_DRAFT_STALENESS_HOURS`), excludes diagnostic-agent-touched drafts |
| **Dedup** | Writes "started" marker BEFORE processing; re-checks for duplicate markers in 90s window |

### 4.5 daily-content-generate

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/daily-content-generate/route.ts` |
| **Schedule** | `0 5 * * *` — Daily 05:00 UTC |
| **Reads** | `TopicProposal` or generates topics via AI |
| **Writes** | `ArticleDraft` and/or `BlogPost` (parallel path — bypasses 8-phase pipeline) |
| **Note** | This is a LEGACY parallel path. Has pre-pub gate. Can create BlogPosts directly when AI returns complete articles |

---

## 5. Stage 2: Content Building — 8-Phase Pipeline

### Phase Orchestrator: content-builder

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/content-builder/route.ts` → calls `build-runner.ts` |
| **Schedule** | `*/15 * * * *` — Every 15 minutes |
| **Budget** | 53s (7s buffer from Vercel 60s limit) |
| **Draft selection** | Sort by: light phases first (+20 priority), then by phase order (scoring > seo > images > assembly > drafting), then by oldest `updated_at` |
| **Per-site** | Loops all active sites, max 2 drafts per site per run |

### The 8 Phases

| # | Phase | AI? | Max Attempts | What It Does | Output Field |
|---|-------|-----|-------------|-------------|-------------|
| 1 | **research** | Yes | 3 | Topic research, keyword analysis, competitor scan | `research_data` JSON |
| 2 | **outline** | Yes | 3 | Generate article structure (H2/H3 headings, section briefs) | `outline_data` JSON |
| 3 | **drafting** | Yes | 8 | Write article sections one-by-one (60s per section, Arabic 3500 tokens) | `sections_json` array |
| 4 | **assembly** | Yes* | 5 | Combine sections into full HTML article | `content_en` or `content_ar` |
| 5 | **images** | No | 3 | Find/generate hero image and inline images | `featured_image`, image metadata |
| 6 | **seo** | Yes | 3 | Generate meta title, meta description, focus keyword | `seo_meta` JSON |
| 7 | **scoring** | No | 3 | Calculate 100-point quality score | `quality_score` → advances to "reservoir" or "rejected" |
| 8 | **reservoir** | — | — | Waiting pool for content-selector to promote | (no processing) |

*Assembly has a **raw HTML fallback** that fires when `phase_attempts >= 2` or `budget < 20s`. This concatenates sections without AI, is instant, and always succeeds.

### Phase Priority System

Light phases (`images`, `seo`, `scoring`) get +20 priority boost because:
- They take 5-15s (no heavy AI)
- They're 1-3 phases from reservoir
- Processing a heavy draft (30-60s) starves light phases for 15+ minutes

### Drafting Phase — Section-by-Section

- Outline defines 6-8 sections
- Each section gets one AI call (60s budget per `SECTION_BUDGET_MS`)
- Arabic sections use `maxTokens: 3500` (Arabic is 2.5x more token-dense)
- Sections are stored incrementally in `sections_json`
- If a section times out but prior sections exist, it's a partial success (deferred to next run, NOT counted as a failure)
- A full article typically requires 2-3 cron runs to complete drafting

### Assembly Phase — Raw Fallback Contract

```
IF phase_attempts >= ASSEMBLY_RAW_FALLBACK_ATTEMPTS (2)
   OR budget < ASSEMBLY_BUDGET_THRESHOLD_MS (20s):
     → Skip AI entirely
     → Concatenate raw HTML sections
     → Always succeeds (instant)
     → phase_attempts NOT reset to 0 (prevents re-entering AI path)
```

**Contract enforcement (3 files must stay aligned):**
- `phases.ts`: checks `attempts >= 2` for raw fallback
- `constants.ts`: exports `ASSEMBLY_RAW_FALLBACK_ATTEMPTS = 2`
- `diagnostic-agent.ts`: sets attempts to `Math.max(current, 2)` when forcing raw assembly

---

## 6. Stage 3: Quality Gating & Publishing

### 6.1 Scoring Phase (Phase 7)

**100-point formula:**

| Component | Max Points | Criteria |
|-----------|-----------|---------|
| Word count | 25 | 2000+ = 25, 1500+ = 20, 1200+ = 15, 800+ = 10, else 5 |
| Meta tags | 20 | Title 10-60 chars = 10; Description 120-160 = 10 |
| Schema markup | 10 | JSON-LD present = 10 |
| Heading structure | 15 | H2 ≥ 4 = 10 (≥2 = 5); H3 ≥ 2 = 5 |
| Internal links | 10 | ≥ 3 = 10 (≥1 = 5) |
| Affiliate links | 5 | ≥ 2 = 5 (≥1 = 3) |
| Images | 10 | ≥ 3 = 10 (≥1 = 5) |
| Keywords | 5 | Primary keyword in HTML = 5 |

**Critical note:** Internal links (10pts) and affiliate links (5pts) are injected POST-publish by other crons. At scoring time, max achievable is ~85. Threshold is 55.

**Decision:** Score ≥ 55 → "reservoir" | Score < 55 → "rejected"

### 6.2 content-selector

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/content-selector/route.ts` → calls `select-runner.ts` |
| **Schedule** | `0 7,9,11,13,15,17,19,21 * * *` — 8x/day |
| **Reads** | `ArticleDraft` (phase: "reservoir", quality_score ≥ 45) |
| **Writes** | `BlogPost` (via `promoteToBlogPost()`), updates `ArticleDraft` (phase: "published") |
| **Max per run** | 2 articles |

**Promotion flow (`promoteToBlogPost()`):**

```
1. Atomic claim: updateMany WHERE current_phase="reservoir" SET "promoting"
2. cleanTitle() — strips slug artifacts, AI markers, normalizes casing
3. Cannibalization check — 80% Jaccard word overlap with existing BlogPosts
4. Run 16-check pre-publication gate (FAIL = BLOCK, revert to "reservoir")
5. $transaction {
     BlogPost.create (published=true)
     ArticleDraft.update (phase="published")
   }
6. On any failure: revert to "reservoir" (never orphan in "promoting")
```

**Enhancement within selector:** If score < 55 or words < 500 and attempts < 3, runs `enhanceReservoirDraft()` first. After 3 failed enhancements, attempts direct publish if score ≥ 45.

### 6.3 Pre-Publication Gate — 16 Checks

**Function:** `runPrePublicationGate(targetUrl, content, siteUrl)` → `{ allowed, blockers, warnings }`
**Philosophy:** Fail-closed — ANY blocker = article NOT published.

| # | Check | Severity | Threshold | Source |
|---|-------|----------|-----------|--------|
| 0 | Slug artifact detection | BLOCKER | Regex pattern | Hardcoded |
| 1 | Route existence (HTTP HEAD) | BLOCKER | Non-404 | Live check |
| 2 | Arabic route existence | BLOCKER | Non-404 | Live check |
| 3 | Title exists + length | BLOCKER | ≥ 10 chars | Hardcoded |
| 3b | Meta title length | WARNING | ≥ 30 chars | `standards.ts` |
| 3c | Meta title max | WARNING | ≤ 160 chars | Hardcoded |
| 3d | Meta description min | WARNING | ≥ 120 chars | `standards.ts` |
| 3e | Meta description max | WARNING | ≤ 160 chars | `standards.ts` |
| 3f | Content length | BLOCKER | ≥ 300 chars (thin threshold) | `standards.ts` |
| 4 | SEO score | BLOCKER < 30 / WARNING < 70 | Per content type | `standards.ts` |
| 5 | Heading hierarchy | WARNING | 1 H1, ≥ 2 H2 | `standards.ts` |
| 6 | Word count | BLOCKER < 500 / WARNING < 1800 | Per content type | `standards.ts` |
| 7 | Internal links | WARNING | ≥ 3 | `standards.ts` |
| 8 | Readability | WARNING | Flesch-Kincaid ≤ 10 | `standards.ts` |
| 9 | Image alt text | WARNING | All images need alt | Hardcoded |
| 10 | Author attribution | WARNING | author_id present | Hardcoded |
| 11 | Structured data | WARNING | JSON-LD or keywords present | Hardcoded |
| 12 | Authenticity signals | WARNING (never blocker) | 3+ experience markers, ≤1 generic phrase | Hardcoded |
| 13 | Affiliate links | WARNING | Present (if required for type) | `standards.ts` |
| 14 | AIO readiness | WARNING | Direct answer, question H2s | Hardcoded |
| 15 | Keyword cannibalization | WARNING | < 80% Jaccard overlap | Hardcoded |
| 16 | Citability (GEO) | WARNING (never blocker) | Stats, attributions, self-contained paragraphs | Hardcoded |
| 17 | Content format | BLOCKER | No raw markdown patterns | Hardcoded |

**Per-content-type overrides** (detected from URL prefix):

| Type | URL Prefix | minWords | seoScoreBlocker | qualityGateScore |
|------|-----------|----------|-----------------|------------------|
| blog | `/blog/` (default) | 500 | 30 | 70 |
| news | `/news/` | 150 | 20 | 40 |
| information | `/information/` | 300 | 30 | 50 |
| guide | `/guides/` | 400 | 30 | 50 |

### 6.4 scheduled-publish

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/scheduled-publish/route.ts` |
| **Schedule** | `15 9 * * *`, `15 12 * * *`, `0 16 * * *` — 3x/day |
| **Reads** | `ScheduledContent` (status: "scheduled", time ≤ now), orphaned `BlogPost` (published=false, 2h+ old) |
| **Writes** | Sets `ScheduledContent.status = "published"`, sets `BlogPost.published = true` for orphans |
| **Gate** | Full pre-publication gate on ScheduledContent (fail-closed: marks as "failed") |

### 6.5 reserve-publisher

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/reserve-publisher/route.ts` |
| **Schedule** | `0 21 * * *` — Daily 21:00 UTC |
| **Purpose** | End-of-day safety net — publishes any remaining reservoir articles that content-selector missed |

---

## 7. Stage 4: Post-Publish Enhancement Chain

After a BlogPost is published, 4 cron jobs progressively enhance it over hours/days:

### Enhancement Timeline

```
Hour 0:     Article published (BlogPost.published = true)
Hour 0-1:   seo-deep-review catches it (runs at midnight)
Hour 1-7:   seo-agent catches it (runs at 07:00, 13:00, 20:00)
             → Schema injection, meta optimization, internal links, IndexNow
Hour 9:     affiliate-injection (09:25)
             → CJ tracking links, booking links
Hour 11-18: content-auto-fix (11:00, 18:00)
             → Orphan page resolution, broken link cleanup
```

### 7.1 seo-deep-review

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/seo-deep-review/route.ts` |
| **Schedule** | `0 0 * * *` — Daily midnight UTC |
| **Window** | Pass 1: Articles published in last 26h. Pass 2: Articles up to 7 days old with SEO score < 70 |
| **Batch** | 5 articles per run |
| **Budget** | 53s with per-article budget guard |

**10 fix types:**
1. Content expansion (short articles)
2. Meta title generation/optimization
3. Meta description generation/optimization
4. Meta title trimming (> 60 chars)
5. Meta description trimming (> 160 chars)
6. Heading hierarchy fix (demote extra H1 to H2)
7. Alt text for images
8. Internal link injection (< 3 links)
9. Schema markup injection
10. Authenticity signal injection (insider tip callout)

### 7.2 seo-agent

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/seo-agent/route.ts` |
| **Schedule** | `0 7,13,20 * * *` — 3x/day |
| **Batch** | 20 articles per run (schema injection), 3 articles (AI meta optimization), 5 articles (internal links) |

**Operations:**
1. **URL Discovery** — finds new/updated BlogPosts, news items, Arabic variants → writes `URLIndexingStatus` (status: "pending")
2. **Schema Injection** — generates Article JSON-LD, injects into `content_en`/`content_ar`
3. **Meta Optimization** — AI generates/improves meta titles and descriptions (up to 8 per run)
4. **Meta Trimming** — trims titles > 60 chars, descriptions > 160 chars at word boundary (up to 100 per run)
5. **Internal Link Injection** — articles with < 3 internal links get `<section class="related-articles">` with up to 3 recent posts (5 per run)
6. **Content Strengthening** — flags low-scoring content for expansion (up to 3 per run)
7. **IndexNow Submission** — delegates to `seo/cron` (discovers URLs only, doesn't submit directly)

### 7.3 content-auto-fix

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/content-auto-fix/route.ts` |
| **Schedule** | `0 11,18 * * *` — 2x/day |
| **Budget** | 53s |

**14 sections:**

| # | Section | What It Does | Batch |
|---|---------|-------------|-------|
| 1 | Meta description expansion | Expand short meta descriptions | 10/run |
| 2 | Meta description trimming | Trim > 160 chars to ≤ 155 | 20/run |
| 3 | ArticleDraft meta trimming | Trim draft meta descriptions | 20/run |
| 4 | Word count expansion | Enhance articles < 500 words | 5/run |
| 5 | Heading hierarchy fix | Demote extra H1 to H2 | 10/run |
| 6 | Alt text injection | Add missing image alt text | 10/run |
| 7 | Schema markup injection | Add JSON-LD to articles without it | 5/run |
| 8 | Internal link injection | Fix articles with < 3 internal links | 5/run |
| 9 | Broken link cleanup | Strip TOPIC_SLUG placeholders, fix hallucinated slugs | 50/run |
| 10 | Affiliate link injection | Add affiliate links to uncovered articles | 5/run |
| 11 | Orphan page resolution | Fix published articles with 0 inbound links | 5/run |
| 12 | Thin content unpublish | Unpublish articles < `CONTENT_QUALITY.minWords` words (skips active campaigns) | 5/run |
| 13 | Duplicate detection | Unpublish newer duplicate (80% title overlap) | 3/run |
| 14 | Chronic indexing failure | Tag articles with 10+ failed IndexNow submissions | 10/run |

### 7.4 affiliate-injection

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/affiliate-injection/route.ts` |
| **Schedule** | `25 9 * * *` — Daily 09:25 UTC |
| **Reads** | Published `BlogPost` without affiliate links, `CjLink` table (JOINED advertisers) |
| **Writes** | Injects affiliate tracking links into `content_en`/`content_ar` |
| **Per-site** | Loops all active sites with per-site advertiser category mapping |
| **Fallback** | When CJ circuit breaker is OPEN: uses hardcoded Vrbo deep link |
| **Dedup** | Checks for both `"related-articles"` AND `"related-link"` AND `"affiliate-recommendation"` CSS classes |

### 7.5 content-auto-fix-lite

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/content-auto-fix-lite/route.ts` |
| **Schedule** | `30 0,4,8,12,16,20 * * *` — 6x/day |
| **Purpose** | Lightweight fixes that don't need AI |

**Operations:**
1. Sitemap cache rebuild (every 4h)
2. URL tracking for never-submitted pages (200/batch)
3. Arabic URL auto-tracking
4. Meta description trimming
5. Heading hierarchy fixes
6. Orphaned BlogPost recovery
7. Never-submitted pages IndexNow catch-up

---

## 8. Stage 5: Indexing, Analytics & Revenue

### 8.1 IndexNow Multi-Engine Submission

| Engine | Endpoint | Method |
|--------|----------|--------|
| Bing | `bing.com/indexnow` | Batch POST (up to 10,000 URLs) |
| Yandex | `yandex.com/indexnow` | Batch POST |
| api.indexnow.org | `api.indexnow.org/indexnow` | Batch POST |

- Independent per-engine (one failure doesn't block others)
- Exponential backoff on 429/5xx
- Chronic failure cap: stop submitting after 15 failed attempts per URL

### 8.2 GSC Sync

| Property | Value |
|----------|-------|
| **Route** | `app/api/cron/gsc-sync/route.ts` |
| **Schedule** | `0 4 * * *` — Daily 04:00 UTC |
| **Dimensions** | `["page", "date"]` — stores per-day breakdown (prevents overcounting) |
| **Writes** | `GscPagePerformance` with actual date from GSC response |

### 8.3 CJ Affiliate Revenue Chain

```
sync-advertisers (4x/day at :30) → CjAdvertiser DB
sync-commissions (daily 06:50)   → CjCommission DB (siteId from SID)
affiliate-injection (daily 09:25) → Links in BlogPost content
link-tracker (on click)           → CjClickEvent DB (siteId tracked)
```

**SID format:** `{siteId}_{articleSlug}` (max 100 chars for CJ)

---

## 9. Quality Gate Reference

### Gate Stack (ordered by pipeline position)

| # | Gate | Where | Threshold | Source | Action on Fail |
|---|------|-------|-----------|--------|---------------|
| 1 | Phase max attempts | `build-runner.ts` | Per phase (3-8) | `constants.ts` | Draft rejected |
| 2 | Lifetime recovery cap | `failure-hooks.ts` | 5 total | `constants.ts` | Permanent rejection |
| 3 | Scoring formula | `phases.ts` (phase 7) | Score ≥ 55 | `standards.ts` | Draft → "rejected" (not "reservoir") |
| 4 | Reservoir min score | `select-runner.ts` | Score ≥ 45 | `standards.ts` | Draft not fetched from DB |
| 5 | Publish threshold | `select-runner.ts` | Score ≥ 55 + words ≥ 500 | `standards.ts` | Enhancement triggered |
| 6 | Enhancement cap | `select-runner.ts` | Max 3 attempts | Hardcoded | Direct publish attempt (if score ≥ 45) |
| 7 | Title sanitization | `select-runner.ts` | `cleanTitle()` result non-empty | Logic | Draft skipped |
| 8 | Cannibalization | `select-runner.ts` | < 80% word overlap | Hardcoded | Draft skipped |
| 9 | Pre-publication gate | `pre-publication-gate.ts` | 16 checks (7 blockers) | `standards.ts` + hardcoded | Publication blocked |
| 10 | Thin content auto-unpublish | `content-auto-fix` | words < `CONTENT_QUALITY.minWords` | `standards.ts` | Article unpublished |
| 11 | Duplicate auto-unpublish | `content-auto-fix` | 80% title overlap | Hardcoded | Newer article unpublished |

---

## 10. Centralized Constants

**File:** `lib/content-pipeline/constants.ts`

### Phase Attempt Caps

| Phase | Max Attempts | Rationale |
|-------|-------------|-----------|
| research | 3 | Single AI call, quick |
| outline | 3 | Single AI call |
| **drafting** | **8** | 6-8 sections × 1 AI call each, needs 2-3 cron runs |
| **assembly** | **5** | Raw fallback at attempts ≥ 2; extra margin |
| images | 3 | URL fetch, not AI-dependent |
| seo | 3 | Single AI call |
| scoring | 3 | Formula calculation, no AI |

### Budget Values

| Constant | Value | Purpose |
|----------|-------|---------|
| `SECTION_BUDGET_MS` | 60,000ms | Time per drafting section |
| `MIN_SECTION_BUDGET_MS` | 12,000ms | Min to attempt a section |
| `ASSEMBLY_BUDGET_THRESHOLD_MS` | 20,000ms | Below this: raw fallback |
| `SELECTOR_STALE_MARKER_MS` | 90,000ms | Stale marker cleanup |
| `SELECTOR_DEDUP_WINDOW_MS` | 60,000ms | Concurrent run prevention |
| `AI_MIN_PROVIDER_MS` | 5,000ms | Min for meaningful AI call |
| `AI_BUDGET_SKIP_MS` | 2,000ms | Skip provider threshold |

### AI Provider Budget Split

| Task Weight | First Provider | Remaining |
|------------|---------------|-----------|
| light | 45% | Split among 2-3 fallbacks |
| medium | 50% | Split among 2-3 fallbacks |
| heavy | 55% | Split among 2-3 fallbacks |

### Self-Healing Thresholds

| Constant | Value | Effect |
|----------|-------|--------|
| `LIFETIME_RECOVERY_CAP` | 5 | Permanent rejection after 5 total recoveries |
| `DRAFTING_BACKLOG_REJECT_HOURS` | 24h | Auto-reject drafts stuck in drafting |
| `GENERAL_STUCK_REJECT_HOURS` | 24h | Auto-reject ANY phase stuck 24h |
| `STUCK_WITH_ATTEMPTS_REJECT_HOURS` | 12h | Auto-reject if stuck 12h with 2+ attempts |
| `ACTIVE_DRAFT_STALENESS_HOURS` | 1h | Drafts not updated = stuck (excluded from active count) |
| `INDEXNOW_CHRONIC_FAILURE_CAP` | 15 | Stop submitting after 15 failures |
| `NEVER_SUBMITTED_BATCH_SIZE` | 200 | Pages per auto-fix-lite catch-up run |

---

## 11. Complete Cron Schedule

### Content Pipeline Crons (sorted by time)

| Time (UTC) | Cron | Frequency | What It Does |
|------------|------|-----------|-------------|
| `:07 */1h` | content-builder-create | Hourly | Creates draft pairs (1 EN + 1 AR) |
| `:15 every 2h` | schedule-executor | 12x/day | Creates drafts from ContentScheduleRule |
| `*/15 min` | content-builder | 96x/day | Advances drafts through 8 phases |
| `00:00` | seo-deep-review | Daily | Post-publish article enhancement (10 fix types) |
| `04:00 Mon` | weekly-topics | Weekly | AI topic research (8-10 per site) |
| `05:00` | daily-content-generate | Daily | Legacy direct content generation |
| `06:00` | trends-monitor | Daily | Trending topic discovery |
| `07:00, 09:00, ...21:00` | content-selector | 8x/day | Promotes reservoir → BlogPost |
| `09:15, 12:15, 16:00` | scheduled-publish | 3x/day | Publishes scheduled content + orphans |
| `09:25` | affiliate-injection | Daily | Injects CJ tracking + booking links |
| `11:00, 18:00` | content-auto-fix | 2x/day | 14 auto-fix sections |
| `21:00` | reserve-publisher | Daily | End-of-day reservoir cleanup |

### SEO & Indexing Crons

| Time (UTC) | Cron | Frequency | What It Does |
|------------|------|-----------|-------------|
| `04:00` | gsc-sync | Daily | GSC click/impression data (per-day storage) |
| `05:00 Sun` | seo-orchestrator (weekly) | Weekly | Full SEO orchestration |
| `05:20` | daily-seo-audit | Daily | Automated SEO scoring |
| `06:10` | seo-orchestrator (daily) | Daily | Daily SEO checks |
| `07:00, 13:00, 20:00` | seo-agent | 3x/day | Schema, meta, links, IndexNow discovery |
| `07:15, 13:15, 20:15` | process-indexing-queue | 3x/day | Process pending IndexNow submissions |
| `07:30` | seo/cron (daily) | Daily | SEO metrics + IndexNow batch submit |
| `08:00 Sun` | seo/cron (weekly) | Weekly | Weekly SEO report |
| `09:35` | google-indexing | Daily | Google Indexing API |
| `11:00, 17:00` | verify-indexing | 2x/day | Check indexing status |
| `14:00` | seo-agent-intelligence | Daily | AI-powered SEO analysis |

### Infrastructure & Monitoring Crons

| Time (UTC) | Cron | Frequency | What It Does |
|------------|------|-----------|-------------|
| `*/2h` | diagnostic-sweep | 12x/day | Self-healing: diagnose + fix stuck drafts |
| `*/15 min` | seo-audit-runner | 96x/day | Incremental SEO audits |
| `00:30, 04:30, ...20:30` | content-auto-fix-lite | 6x/day | Lightweight fixes, sitemap cache, URL tracking |
| `01:30, 07:30, 13:30, 19:30` | pipeline-health | 4x/day | Pipeline health monitoring |
| `03:00, 09:00, 15:00, 21:00` | discovery-monitor | 4x/day | Discovery funnel monitoring |
| `08:45, 14:45, 20:45` | sweeper | 3x/day | Stuck/rejected draft cleanup |
| `02:30` | analytics | Daily | GA4 analytics sync |
| `06:20` | london-news | Daily | London news aggregation |
| `10:00, 15:00, 20:00` | social | 3x/day | Social media auto-publish |
| `11:00` | subscriber-emails | Daily | Email subscriber notifications |
| `22:00` | site-health-check | Daily | Overall site health |

### Affiliate Crons

| Time (UTC) | Cron | Frequency | What It Does |
|------------|------|-----------|-------------|
| `00:30, 06:30, 12:30, 18:30` | sync-advertisers | 4x/day | CJ advertiser database sync |
| `05:30` | discover-deals | Daily | CJ deal discovery |
| `06:50` | sync-commissions | Daily | CJ commission/revenue sync (SID attribution) |
| `03:00 Sun` | refresh-links | Weekly | CJ link refresh |

### Perplexity & Campaign Crons

| Time (UTC) | Cron | Frequency | What It Does |
|------------|------|-----------|-------------|
| `:15, :45 every hour` | perplexity-executor | 48x/day | Execute Perplexity Computer tasks |
| `*/2h` | perplexity-scheduler | 12x/day | Schedule Perplexity tasks |
| `:20, :50 every hour` | campaign-executor | 48x/day | Execute enhancement campaigns |

---

## 12. Error Recovery & Self-Healing

### Recovery Hierarchy

```
Level 1: Phase-level retry (max attempts per phase)
    ↓ exceeds max
Level 2: failure-hooks.ts (recovery logic per error type)
    ↓ exceeds lifetime cap (5)
Level 3: diagnostic-agent.ts (diagnose → fix → verify)
    ↓ exceeds 48h stuck
Level 4: sweeper.ts (reject/cleanup stuck drafts)
    ↓ still broken
Level 5: CEO Inbox (alert Khaled, auto-fix attempt, delayed retest)
```

### Diagnostic Agent Triggers

| Condition | Action |
|-----------|--------|
| Stuck > 24h (any phase) | Auto-reject |
| Created > 48h | Auto-reject regardless |
| Stuck > 12h with 2+ attempts | Auto-reject |
| `phase_attempts >= 5` | Permanent rejection (`MAX_RECOVERIES_EXCEEDED`) |
| Stuck in "promoting" > 30 min | Revert to "reservoir" |
| Assembly timeout | Set attempts ≥ 2 (triggers raw fallback next run) |
| Duplicate title detected | Newer copy unpublished |
| Garbage keyword (single word, slug > 30 chars) | Rejected |

### Circuit Breaker (AI Providers)

```
States: CLOSED → OPEN → HALF_OPEN
Threshold: 3 consecutive failures → OPEN
Cooldown: 5 minutes
Half-open: 1 probe request → if success → CLOSED
Provider chain: Grok → OpenAI → Claude → Perplexity
Last-defense: probes ALL providers including disabled ones
```

### Queue Monitor (6 health rules)

**API:** `GET /api/admin/queue-monitor`

| Rule | Severity | Auto-Fix |
|------|----------|----------|
| near-max-attempts | critical/high | No |
| stuck-24h | critical/high | Yes (reject) |
| drafting-backlog > 50 | critical/high | Yes (reject old) |
| assembly-stuck | high | Yes (unlock for raw fallback) |
| diagnostic-stuck | medium | Yes (reject) |
| pipeline-stalled (0 progress in 4h) | critical | No (investigate) |

---

## 13. Known Gaps & Edge Cases

### Active Known Gaps

| ID | Area | Issue | Severity | Workaround |
|----|------|-------|----------|------------|
| KG-018 | Pipeline | Dual pipeline paths (content-builder + daily-content-generate) | MEDIUM | Both have pre-pub gate; legacy path intentional |
| KG-020 | Schema | 31 orphan Prisma models | LOW | No runtime impact |
| KG-032 | SEO | Arabic SSR renders English on server | MEDIUM | `serverLocale` prop added for blog pages; other pages pending |
| KG-054 | Content | Hotels/experiences pages are static hardcoded data | MEDIUM | No affiliate tracking on these pages |
| KG-058 | E-E-A-T | Author profiles are AI-generated personas | MEDIUM | Named author rotation implemented |

### Edge Cases

1. **Route 404 on cold deploys** — Pre-pub gate HTTP check may get 404 during Vercel cold start. Not a systematic blocker; retries naturally on next run.

2. **EN/AR paired draft wait** — If EN draft reaches reservoir but AR is still in drafting, they're promoted independently. This is by design (don't block EN for AR delays).

3. **ScheduledContent permanent "failed" status** — If pre-pub gate fails on a ScheduledContent record, it's marked "failed" permanently. No auto-retry mechanism. Requires manual intervention via cockpit.

4. **Post-publish scoring gap** — Internal links (10pts) and affiliate links (5pts) only exist after post-publish crons run. Articles scored pre-publish will always miss these 15 points. This is why `qualityGateScore` is 55 (not 70).

5. **Campaign enhancer vs content-auto-fix race** — content-auto-fix may unpublish a thin article while campaign-enhancer is working on it. Fixed: content-auto-fix checks for active `CampaignItem` tasks before unpublishing.

---

## 14. Fixes Applied (Feb–March 2026)

### Critical Fixes (production-breaking)

| Date | Fix | Root Cause | Files |
|------|-----|-----------|-------|
| Mar 18 | schedule-executor field names | `title`, `slug`, `topic_id` don't exist on ArticleDraft | `schedule-executor/route.ts` |
| Mar 18 | Light-phase priority boost | Heavy drafts (95 drafting) starved light phases (5 scoring) | `build-runner.ts` |
| Mar 18 | Quality gate threshold 70→55 | Max achievable pre-reservoir = ~85; 70 was too aggressive | `standards.ts`, `phases.ts` |
| Mar 17 | Section budget 45s→60s | Arabic sections take 45-60s; was overcommitting | `phases.ts` |
| Mar 17 | Arabic maxTokens 2000→3500 | Arabic is 2.5x more token-dense | `phases.ts` |
| Mar 17 | AI first provider 65%→50% | Fallbacks starved (2.3s each = useless) | `provider.ts` |
| Mar 17 | Stale marker 5min→90s | Blocked publishing for 4+ minutes after any crash | `select-runner.ts` |
| Mar 16 | Assembly raw fallback no-reset | Resetting attempts to 0 re-entered AI path → infinite loop | `build-runner.ts` |
| Mar 16 | Auto-seed ContentScheduleRule | Empty table → schedule-executor never created drafts | `schedule-executor/route.ts` |
| Mar 9 | GSC per-day storage | 7x overcounting from aggregated-per-page storage | `gsc-sync/route.ts` |
| Mar 9 | Atomic reservoir claiming | Race condition: two selectors promoting same draft → duplicate BlogPosts | `select-runner.ts` |
| Mar 9 | Content-builder dedup | Vercel double-invocation both processing same drafts | `content-builder-create/route.ts` |
| Mar 5 | AI timeout cascade | First provider consumed 100% budget, 0 for fallbacks | `provider.ts` |
| Mar 5 | Arabic JSON parse crash | HTML attributes in JSON broke regex parser | `phases.ts` |

### Systematic Fixes

| Date | Fix | Impact |
|------|-----|--------|
| Mar 18 | content-auto-fix uses CONTENT_QUALITY from standards.ts | Prevents auto-unpublish of articles the gate now allows |
| Mar 17 | Centralized constants.ts | Single source of truth for all retry/budget values |
| Mar 17 | Queue Monitor (6 rules + auto-fix) | Real-time pipeline health dashboard |
| Mar 10 | GEO/Citability gate (check 16) | AI Overview optimization |
| Mar 10 | Topic diversification 60/40 | 10-50x more search volume for general topics |
| Mar 9 | Title sanitization + cannibalization | Prevents slug-style titles and duplicate content |
| Mar 5 | Circuit breaker + last-defense fallback | AI reliability across all providers |
| Feb 26 | Per-content-type quality gates | News/info/guide not blocked by blog thresholds |
| Feb 19 | Google Jan 2026 Authenticity Update | First-hand experience signals, anti-generic checks |

---

## 15. Anti-Patterns Registry

**Patterns that have caused production failures. Never repeat these.**

| # | Anti-Pattern | Correct Pattern | Times Burned |
|---|-------------|----------------|-------------|
| 1 | Using `title` on ArticleDraft | Use `keyword` | 4 |
| 2 | Using `title` on BlogPost | Use `title_en`/`title_ar` | 4 |
| 3 | Using `quality_score` on BlogPost | Use `seo_score` | 3 |
| 4 | Using `published_at` on BlogPost | Use `created_at` | 3 |
| 5 | Using `topic_id` on ArticleDraft | Use `topic_proposal_id` | 2 |
| 6 | Assuming ArticleDraft has `slug` | It doesn't — no slug field | 2 |
| 7 | Sending `null` for BlogPost `title_ar`/`content_ar` | Required fields — use English as fallback | 2 |
| 8 | Prisma `{ not: null }` on required fields | Use `{ not: "" }` | 2 |
| 9 | Hardcoding retry counts inline | Import from `constants.ts` | 5+ |
| 10 | Resetting assembly `phase_attempts` to 0 | Preserves current value (prevents re-entering AI path) | 3 |
| 11 | Import from `@/lib/prisma` | Use `@/lib/db` | 37 |
| 12 | Import from `@/lib/auth/admin` | Use `@/lib/admin-middleware` | 5 |
| 13 | `Promise.all` for dashboard DB queries | Sequential (prevents PgBouncer exhaustion) | 2 |
| 14 | Scoring internal/affiliate links pre-publish | They're injected post-publish by other crons | 1 |
| 15 | Grok `allowed_domains` with paths | Root domains only (`bbc.co.uk` not `bbc.co.uk/news/`) | 2 |
| 16 | CJ `lookupAdvertisers({ joined: true })` | Fetch all statuses, classify locally | 1 |
| 17 | `String(err)` on plain objects | Returns `[object Object]` — use `err.message || JSON.stringify(err)` | 2 |

---

## Appendix: File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `lib/content-pipeline/constants.ts` | 88 | Centralized constants |
| `lib/content-pipeline/phases.ts` | ~1200 | 8-phase logic + scoring |
| `lib/content-pipeline/build-runner.ts` | ~350 | Phase orchestration |
| `lib/content-pipeline/select-runner.ts` | ~500 | Reservoir → BlogPost |
| `lib/content-pipeline/enhance-runner.ts` | ~200 | Score enhancement |
| `lib/seo/standards.ts` | ~400 | SEO thresholds |
| `lib/seo/orchestrator/pre-publication-gate.ts` | ~700 | 16-check gate |
| `lib/ai/provider.ts` | ~800 | AI provider chain + circuit breaker |
| `lib/ai/last-defense.ts` | ~200 | Final safety net |
| `lib/ops/failure-hooks.ts` | ~300 | Error recovery |
| `lib/ops/diagnostic-agent.ts` | ~900 | Self-healing |
| `lib/ops/ceo-inbox.ts` | ~480 | Automated incident response |
| `lib/content-pipeline/queue-monitor.ts` | ~300 | Pipeline health rules |
| `vercel.json` | ~200 | 47 cron schedules |

---

*Document generated from production codebase analysis. All threshold values verified against source files as of March 18, 2026.*
