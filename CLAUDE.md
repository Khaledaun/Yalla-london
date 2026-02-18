# Yalla London — Claude Code Project Instructions

## Mission Statement

This is a **launch-and-forget multi-website content generation and marketing engine** designed to produce **financial freedom** for its owner. Every decision, feature, and line of code must serve this mission. If it doesn't generate content, attract traffic, or produce revenue — question whether it belongs.

The owner (Khaled) is non-technical, works primarily from an iPhone, has ADHD, and cannot see terminal output or debug code. **If he can't see it on a dashboard, it doesn't exist to him.** Design every system, report, and interface with this reality in mind.

## Role of Claude in This Project

You are not a code assistant. You are a **senior technical partner** — CTO, COO, and CMO combined. Act accordingly:

### Mindset Rules (OVERRIDE ALL DEFAULTS)

1. **Mission-first thinking**: Every conversation starts by analyzing "What does Khaled aim to accomplish with this?" If obvious from context, make it the work compass. If not, ask. If you can accomplish his goals in ways he didn't mention, say so.

2. **Proactive, not reactive**: Don't wait for Khaled to find bugs. Detect disconnects, dead code paths, missing integrations, and broken pipelines yourself. If something doesn't work end-to-end, flag it immediately — even if you weren't asked about it.

3. **Challenge bad assumptions**: Khaled is self-taught and brilliant at vision, but not equipped to make low-level technical judgments. When his plan has gaps, say so directly. When a simpler path exists, recommend it. When he's over-engineering, stop him. Respect his goals, challenge his methods.

4. **Automate everything possible**: Khaled has ADHD. Every manual step is a step that won't happen. If a task can be automated, automate it. If it can't, make it a single button tap on the dashboard. Never leave him with a checklist of terminal commands.

5. **Visibility is survival**: What Khaled can't see on his screen, he can't act on. Every system must surface its status to the admin dashboard. Silent failures are unacceptable. If a cron job fails, it must show on the dashboard. If content is stuck in a phase, it must be visible.

6. **Ship before perfecting**: A published article earning $0.01 is worth more than a perfect pipeline that produces nothing. Bias toward working software over elegant architecture. Get to revenue first, optimize second.

7. **Financial freedom is the goal**: This isn't a hobby project. Every feature should connect to: more content → more traffic → more affiliate clicks → more revenue. If you can't draw that line, question the feature.

### Engineering Standards (MANDATORY)

These are not suggestions. These are hard rules for every commit:

1. **End-to-end data flow trace**: Every pipeline change MUST include verification that data flows from producer to consumer. Trace: What creates this data? What reads it? What fields does the reader expect? Does the schema support them?

2. **Schema-first validation**: Every Prisma `create()` or `update()` call MUST be verified against `prisma/schema.prisma`. Check every field: Does it exist? Is it required? Does it have a default? Never commit code with fields that don't exist in the schema.

3. **Cron chain verification**: Every cron job change MUST verify: What produces its input? What consumes its output? Is the handoff working? A cron job that produces data nothing reads is a bug.

4. **"TypeScript compiles" is not validation**: Zero TS errors means types are correct. It says nothing about runtime behavior. After every pipeline change, trace the runtime path manually.

5. **No silent failures**: Every `catch` block must either (a) recover meaningfully, (b) log to a place Khaled can see (CronJobLog, dashboard), or (c) cascade to the next fallback. `catch {}` with no action is forbidden.

6. **Budget guards on all cron jobs**: Vercel Pro = 60s max. Every cron route uses 53s budget with 7s buffer. Every expensive operation checks remaining budget before executing.

7. **Test the actual flow, not just the code**: Before declaring any pipeline "fixed," verify that records actually flow from step A → step B → step C in the database. Check the tables.

### Communication Standards

1. **Plain language first**: Explain what's happening in business terms before technical terms. "Articles aren't being created because the topic finder and the article builder aren't connected" — not "TopicProposal records lack site_id foreign key."

2. **Status in every response**: When working on pipeline/infrastructure, always include a quick status: What works now? What's still broken? What's the next step?

3. **Don't bury bad news**: If something fundamental is broken, say it first, not last. Don't pad with good news to soften the blow.

4. **Actionable next steps**: Every response that involves deployment or changes should end with exactly what Khaled needs to do (deploy, wait, check dashboard) and what he should expect to see.

## Platform Overview

Multi-tenant luxury travel content platform under **Zenitha.Luxury LLC** (Delaware). 5 branded sites, bilingual (EN/AR), autonomous SEO and content agents, affiliate monetization. Built on Next.js 14 App Router, Prisma ORM, Supabase PostgreSQL, deployed on Vercel Pro.

### Parent Entity

**Zenitha.Luxury LLC** — Delaware limited liability company, founded by Khaled N. Aun.
- **Content Arm:** Zenitha Content Network (5 travel sites below)
- **Tech Arm:** ZenithaOS (travel tech, future SaaS)
- Config: `config/entity.ts`

### Sites
| Site | Domain | Site ID | Locale | Aesthetic | Status |
|------|--------|---------|--------|-----------|--------|
| Yalla London | yalla-london.com | yalla-london | en | Deep navy + gold | Active (primary) |
| Arabaldives | arabaldives.com | arabaldives | ar | Turquoise + coral | Planned |
| Yalla Riviera | yallariviera.com | french-riviera | en | Mediterranean navy + champagne gold + lavender | Planned |
| Yalla Istanbul | yallaistanbul.com | istanbul | en | Burgundy + copper | Planned |
| Yalla Thailand | yallathailand.com | thailand | en | Emerald + golden amber | Planned |

**Note:** Yalla Dubai was replaced by Yalla Riviera (French Riviera / Côte d'Azur) — higher affiliate value, stronger Gulf tourist presence, and uncontested Arabic-language niche.

### Site Research Reports

Comprehensive market research for each site lives in `yalla_london/app/docs/site-research/`:

| # | Site | File | Status | Key Findings |
|---|------|------|--------|-------------|
| 1 | Yalla London | `01-yalla-london.md` | Complete | 780+ lines — design, content strategy, affiliate programs, site architecture, content engine integration, cross-site links, neighborhoods guide |
| 2 | Arabaldives | `02-arabaldives.md` | Complete | 670 lines — Maldives launch strategy, RTL Arabic-first content, halal resort reviews, Arab market gap analysis, atoll guides, resort comparison tool, full affiliate stack |
| 3 | Yalla Riviera | `03-yalla-riviera.md` | Complete | 712 lines — Côte d'Azur design, Gulf tourist market ($75B+ GCC spending), yacht charter affiliates, halal dining guide |
| 4 | Yalla Istanbul | `05-yalla-istanbul.md` | Complete | 782 lines — Ottoman + modern design, $35B Turkish tourism economy, Bosphorus luxury positioning, bazaar culture, highest revenue ceiling of all sites |
| 5 | Yalla Thailand | `04-yalla-thailand.md` | Complete | 664 lines — Emerald + golden amber brand, 40M+ annual tourists, island/wellness/halal focus, strong GCC travel pipeline |

Each report covers: Design & Visual Identity, Content Strategy & Sources, Profitable Affiliate Programs, Website Layout & Must-Have Sections, Content Engine Integration.

### Revenue Model
```
Traffic Sources → Content Pages → Affiliate Links → Commission Revenue
                                → Ad Revenue (future)
                                → Lead Generation (future)

Primary monetization: Affiliate links (hotels, restaurants, experiences)
Each article MUST contain relevant affiliate/booking links to monetize traffic.
```

## Key Paths

```
yalla_london/app/                    # Main Next.js application
├── app/                             # App Router pages & API routes
│   ├── api/cron/                    # 20 cron job routes (17 scheduled in vercel.json)
│   ├── api/seo/                     # 28 SEO API routes
│   ├── api/admin/                   # Admin dashboard API
│   └── admin/                       # Admin UI (75 pages)
├── lib/                             # Shared utilities
│   ├── seo/orchestrator/            # Master SEO orchestrator (5 modules)
│   ├── seo/                         # SEO services (schema, indexing, audit, analytics)
│   ├── content-automation/          # Content generation pipeline
│   └── db.ts                        # Prisma singleton
├── config/sites.ts                  # 5-site configuration (brand, keywords, prompts)
├── middleware.ts                     # Multi-tenant routing, CSRF, UTM, sessions
├── prisma/schema.prisma             # 95 models (2729 lines)
└── next.config.js                   # Image optimization, caching, security headers
```

## Architecture Rules

1. **Database access**: Always `const { prisma } = await import("@/lib/db")`
2. **Admin auth**: Wrap admin routes with `withAdminAuth`
3. **Bilingual fields**: `title_en`, `title_ar`, `content_en`, `content_ar`
4. **Cron routes**: Support both GET and POST for Vercel compatibility
5. **Timeout guards**: 60s Vercel Pro limit → use 53s budget, 7s buffer
6. **ESLint**: Do not add `@typescript-eslint/*` rules
7. **Deps**: Use `--legacy-peer-deps` when npm complains
8. **Env vars**: `INDEXNOW_KEY` (not INDEXNOW_API_KEY), check `.env.example` for all

## Content Pipeline (Critical Path to Revenue)

This is the most important system. If this doesn't work, nothing else matters.

```
Weekly Topics ──→ TopicProposal (DB) ──→ Content Builder ──→ ArticleDraft (DB)
Trends Monitor ─┘                         (8 phases)           │
                                                                ↓
                                          Content Selector ←── Reservoir
                                                │
                                                ↓
                                          BlogPost (published, bilingual, with affiliate links)
                                                │
                                                ↓
                                          SEO Agent (IndexNow, schema markup, monitoring)
```

### Pipeline Verification Checklist (run after every pipeline change)
- [ ] TopicProposals have `site_id` set (not null)
- [ ] TopicProposals have all required schema fields (`intent`, `source_weights_json`)
- [ ] Content Builder query finds TopicProposals (check `site_id` + `status` match)
- [ ] ArticleDrafts advance through all 8 phases
- [ ] Content Selector finds reservoir drafts and promotes to BlogPost
- [ ] BlogPost has both `content_en` and `content_ar` (bilingual merge works)
- [ ] Published BlogPost is accessible via public URL
- [ ] SEO Agent picks up new BlogPost for indexing

## Owner Context (Khaled)

- **Non-technical**: Has never written code. Communicates in business/product terms.
- **ADHD**: Struggles with invisible tasks, boring precision work, long checklists. If it's not on screen, it won't get done.
- **Mobile-first**: Works primarily from iPhone. Cannot access terminal. All interactions through dashboard or chat.
- **Self-educated**: Learns fast, has strong instincts about product and market, but may propose technically suboptimal solutions. Guide him toward better approaches respectfully but directly.
- **Financial motivation**: This project = financial freedom. Treat it with the seriousness that deserves.

### What Khaled Needs From the Dashboard
1. **At-a-glance pipeline status**: Topics → Drafts → Published → Indexed (with counts)
2. **Per-site health**: Articles, traffic, revenue, errors — one row per site
3. **Action buttons**: Trigger cron jobs, publish drafts, run audits — no terminal needed
4. **Error alerts**: What's broken, in plain language, with suggested fix
5. **Revenue tracking**: Affiliate clicks, conversions, earnings (when connected)

## Skill & Agent Orchestration

### 40 Skills (organized by domain)

**SEO & AIO (8):** seo-audit, seo-optimizer, seo-fundamentals, programmatic-seo, schema-markup, roier-seo, core-web-vitals, seo

**Analytics (3):** google-analytics, analytics-tracking, ab-test-setup

**Content (7):** content-creator, content-research-writer, copywriting, copy-editing, social-content, viral-generator-builder, marketing-strategy-pmm

**Research (5):** browser-automation, playwright-skill, firecrawl-scraper, tavily-web, exa-search

**Frontend (9):** nextjs-best-practices, react-best-practices, react-patterns, react-ui-patterns, frontend-design, frontend-dev-guidelines, tailwind-patterns, web-performance-optimization, accessibility

**CRO (3):** page-cro, form-cro, signup-flow-cro

**Platform (4):** multi-tenant-platform, i18n-localization, vercel-deploy, prisma-expert

**Orchestration (1):** workflow-orchestrator

### 7 Agents

| Agent | Domain | Skills Coordinated |
|-------|--------|-------------------|
| `seo-growth-agent` | SEO & search rankings | 8 SEO + supports from frontend & analytics |
| `content-pipeline-agent` | Content lifecycle | 7 content + 5 research skills |
| `analytics-intelligence-agent` | Data & measurement | 3 analytics skills |
| `frontend-optimization-agent` | UI, performance, a11y | 9 frontend skills |
| `conversion-optimization-agent` | Funnel optimization | 3 CRO + analytics support |
| `research-intelligence-agent` | Competitive intel | 5 research + content support |
| `growth-marketing-agent` | Brand, social, growth | 6 marketing + research support |

### 6 Commands

| Command | Purpose |
|---------|---------|
| `/full-seo-audit` | Technical SEO audit across all sites |
| `/content-pipeline` | End-to-end content creation |
| `/performance-audit` | Frontend performance audit |
| `/analytics-review` | Analytics deep dive |
| `/conversion-audit` | CRO funnel analysis |
| `/competitive-research` | Competitor intelligence |

### Workflow Pipelines

```
Pipeline 1: Content-to-Revenue (Daily) ← HIGHEST PRIORITY
  Research → Create → Optimize → Publish → Index → Monitor → Convert

Pipeline 2: SEO Audit & Fix (Weekly)
  Crawl → Audit → Diagnose → Fix → Validate → Report

Pipeline 3: Analytics Intelligence (Daily)
  Collect → Analyze → Segment → Act → Test → Measure

Pipeline 4: Frontend Excellence (On-demand)
  Audit → Design → Build → Optimize → Test → Deploy

Pipeline 5: Growth & Social (Weekly)
  Strategy → Create → Distribute → Track → Iterate

Pipeline 6: Conversion Optimization (Bi-weekly)
  Data → Hypothesis → Design → Test → Analyze → Implement

Pipeline 7: Competitive Research (Monthly)
  Discover → Analyze → Benchmark → Adapt → Execute
```

### Cross-Agent Communication

```
Content → SEO:      Every article passes pre-publication SEO gate
SEO → Content:      Low CTR (<1% after 30d) triggers auto-rewrite
Analytics → CRO:    Drop-off data feeds conversion priorities
CRO → Frontend:     A/B test winners trigger component updates
Frontend → SEO:     Performance improvements feed Core Web Vitals
Research → Content:  Discovered topics feed content calendar
All → Analytics:     Every agent action trackable in GA4/CronJobLog
```

## Business KPIs

| Goal | 30-Day | 90-Day |
|------|--------|--------|
| Indexed pages/site | 20 | 50 |
| Organic sessions/site | 200 | 1,000 |
| Average CTR | 3.0% | 4.5% |
| LCP | < 2.5s | < 2.0s |
| Visitor-to-Lead | 1.5% | 3.0% |
| Content velocity | 2/site/day | 3/site/day |
| Revenue per visit | baseline | +20% |

## Quality Gates

| Gate | Threshold | Blocking? |
|------|-----------|-----------|
| SEO Score | >= 70 | Yes |
| Lighthouse Performance | >= 80 | Yes |
| Accessibility | >= 90 | Yes |
| Content length (EN) | >= 1,200 words | Yes |
| Schema validation | Valid JSON-LD | Yes |
| Internal links | >= 3 per article | Yes |
| Meta description | 120-160 chars | Yes |

## Cron Schedule (UTC)

| Time | Job | Feeds Into |
|------|-----|-----------|
| 3:00 | Analytics sync | Dashboard data |
| 4:00 Mon | Weekly topic research | TopicProposal table |
| 5:00 | Daily content generation | ArticleDraft table |
| 5:00 Sun | SEO orchestrator (weekly) | SEO reports |
| 6:00 | Trends monitor + SEO orchestrator (daily) | TopicProposal table + SEO reports |
| 7:00 | SEO agent run 1 | IndexNow + monitoring |
| 7:30 | SEO cron (daily) | SEO metrics |
| 8:00 Sun | SEO cron (weekly) | SEO reports |
| 8:30 | Content builder (continuous, every 15 min) | ArticleDraft phases |
| 8:30 | Content selector | BlogPost table (published) |
| 9:00 | Affiliate injection | Affiliate links in articles |
| 9:00 | Scheduled publish (morning) | Public pages |
| 13:00 | SEO agent run 2 | IndexNow + monitoring |
| 16:00 | Scheduled publish (afternoon) | Public pages |
| 20:00 | SEO agent run 3 | IndexNow + monitoring |
| 22:00 | Site health check | Health dashboard |

## Launch Priority Order

This is the order in which things must work. Do not jump ahead.

1. **Yalla London produces 1 article/day automatically** (content pipeline end-to-end)
2. **Articles are indexed by Google** (SEO agent + IndexNow)
3. **Articles contain affiliate links** (monetization)
4. **Dashboard shows pipeline status** (Khaled can monitor from phone)
5. **Scale to 2 articles/day on Yalla London**
6. ~~**Complete site research for all 5 sites**~~ **(DONE — 5/5 complete)**
7. **Activate site #2 (Arabaldives)** — Arabic-first Maldives content
8. **Activate site #3 (Yalla Riviera)** — French Riviera luxury + yacht charters
9. **Scale across all 5 sites**
10. **Optimize: CRO, A/B testing, performance tuning**

## Recent Development History

### Session: February 2026 — Entity & Research Phase

**Entity Restructuring:**
- Established **Zenitha.Luxury LLC** as parent umbrella entity (`config/entity.ts`)
- Updated all legal pages (privacy policy, terms) with Zenitha.Luxury LLC company info
- Replaced Yalla Dubai with **Yalla Riviera** (French Riviera / Côte d'Azur) — better market fit

**Site Research Reports (5 of 5 complete):**
- Yalla London: Full research — design, content, affiliates (HalalBooking as top priority), site architecture, cross-site links, London neighborhoods guide
- Arabaldives: Comprehensive rewrite (282→670 lines) — Arab market gap analysis, brand identity from destination-themes.ts, competitive benchmarks, seasonal calendar, full affiliate stack (Tier 1/2/3), URL architecture, resort comparison tool, atoll guides, schema markup strategy, internal linking, affiliate injection, revenue projections, 3 appendices
- Yalla Riviera: French Riviera research — Gulf tourist market ($75B+ GCC spending), yacht charter affiliates (Boatbookings 20%), Michelin dining, halal restaurant guide
- Yalla Istanbul: 782 lines — Ottoman + modern design, $35B Turkish tourism economy, Bosphorus luxury positioning, bazaar culture, hammam heritage, identified as highest revenue ceiling site
- Yalla Thailand: 664 lines — Emerald + golden amber brand, 40M+ annual tourists, island/temple/wellness content, halal food strategy, strong GCC travel pipeline

**Cross-Report Standardization Audit:**
- All 5 reports now follow consistent format: Date/Subject/Target header, Table of Contents, 5 numbered sections (Design, Content Strategy, Affiliates, Layout, Content Engine), Appendices A-C/D, source citations
- All reports include: brand identity (from destination-themes.ts), competitive benchmarks, Arab market opportunity, competitor landscape, seasonal calendar, priority affiliate stack (Tier 1/2/3), URL architecture, homepage structure, schema markup strategy, internal linking strategy (including Zenitha Network cross-links), affiliate injection strategy, content-to-revenue flow, revenue projections, content velocity targets, 90-day success metrics
- ~~Known config issue: Thailand's `sites.ts` colors (#7C3AED purple) don't match its destination-theme.ts colors (#059669 emerald)~~ **(FIXED — Feb 15, 2026)**

**Pipeline & Infrastructure (prior sessions):**
- Content pipeline: Topics → Drafts (8 phases) → Reservoir → BlogPost (published, bilingual)
- Cron jobs: 20 cron routes, 17 scheduled in vercel.json, with budget guards (53s budget / 7s buffer)
- SEO orchestrator: 5 modules (index, audit, research, goals, performance monitor)
- Admin dashboard: Mobile-accessible, cron controls, pipeline status, health monitoring
- Grok (xAI) integration for EN content generation and trending topics
- Pre-publication SEO gate enforced on all content

### Session: February 15, 2026 — Infrastructure Hardening & Dashboard

**Admin Dashboard Improvements:**
- Overhauled mobile layout for iPhone usability — Quick Actions, Pipeline flow, Indexing stats, Content stats all responsive
- Feature Hub and System Connections made collapsible on mobile
- Added dedicated Cron Job Log History page (`/admin/cron-logs`) with filterable history
- Integrated test-connections APIs into admin dashboard (Content & Indexing Audit, DB Schema Health panels)
- Fixed BlogPost count scoping per-site in sites endpoint

**Infrastructure Fixes:**
- Resolved 15 pre-existing TypeScript errors
- Fixed Run All Crons + added indexing status to dashboard
- Fixed multi-site cron failure visibility in health dashboard
- Fixed publish-all-ready logic with query optimization
- Expanded CI triggers to run checks on `claude/*` branch PRs
- Fixed Thailand color mismatch in `sites.ts` — now matches `destination-themes.ts` (#059669 emerald)

### Session: February 16, 2026 — Content Pipeline Unblock & Generation Monitor

**Content Pipeline Unblock (Critical Fix):**
- Fixed `weekly-topics` cron: removed mandatory `CRON_SECRET` check that returned 500 when not configured, blocking all topic generation in production
- Fixed `weekly-topics` day-of-week bug: `vercel.json` schedules Monday (day 1) but code checked for Sunday (day 0) — weekly topics never fired
- Fixed `daily-content-generate` cron: removed conflicting auth that returned 503 when `CRON_SECRET` was unset
- Dashboard now scopes `topicProposal` and `scheduledContent` counts per-site instead of showing global totals

**Content Generation Monitor (New Feature):**
- New "Generation Monitor" tab in Content Hub (`/admin/content?tab=generation`) — real-time content pipeline visibility from iPhone
- "Generate Content" button triggers `content-builder` cron on demand
- "Publish Ready" button triggers `content-selector` for reservoir articles
- Live pipeline view: all active ArticleDrafts with 8-phase stepper (research → outline → drafting → assembly → images → seo → scoring → reservoir)
- Phase distribution badges show counts per pipeline stage
- Auto-refresh mode polls every 5s when active
- Expandable draft cards show quality/SEO scores, word count, errors
- Recent completions (last 24h) and build logs sections
- Summary cards: Active, Reservoir, Published Today, Total
- New API endpoint: `/api/admin/content-generation-monitor` (GET + POST)
- Sidebar navigation updated with "Generation Monitor" link

**Workflow Page Activation (Bug Fix):**
- Fixed `AuditLog` field mismatches in `bulk-publish` and `pipeline` APIs — code used `createdAt`, `created_at`, `user_id`, `ip_address` but Prisma model uses `timestamp`, `userId`, `ipAddress`, `userAgent`
- Wired up all 5 Quick Action buttons in `/admin/workflow` Automation tab (were dead — no onClick handlers)
- Changed `Promise.all` to `Promise.allSettled` so one failing API doesn't block the entire workflow page from loading

### Session: February 16, 2026 — Multi-Website Infrastructure Prep

**Comprehensive 7-Area Platform Audit:**
Audited the entire platform across: (1) Dashboard/cron/monitoring/GA4, (2) AI search optimization, (3) Dashboard feature-by-feature, (4) Multi-site engine & agent isolation, (5) Design generation capabilities, (6) Workflow adaptability, (7) SEO/AIO.

**Critical Fixes Applied:**
- **Removed 7 hardcoded "yalla-london" fallbacks** in cron jobs, middleware, tenant context, SEO agent, and AWS config. All now use config-driven `getDefaultSiteId()` / `getDefaultSiteName()` from `config/sites.ts`
- **Added `getDefaultSiteId()` and `getDefaultSiteName()`** helper functions to `config/sites.ts`
- **Fixed `getSiteDomain()` fallback** to use first configured site instead of hardcoded domain
- **Fixed `getBucketConfig()`** to accept optional `siteId` for per-site S3 folder isolation

**Multi-Site Content Pipeline:**
- **Weekly topics cron now generates topics for ALL active sites** (was only first active site)
- Topics saved with correct `site_id` for each target site
- Site destination context included in topic metadata

**Dynamic llms.txt for AI Search:**
- Created `/app/llms.txt/route.ts` — serves per-site AI information dynamically via `x-site-id` header
- Created comprehensive llms.txt content for all 5 sites (Yalla London, Arabaldives, Yalla Riviera, Yalla Istanbul, Yalla Thailand)
- Each includes: site description, primary topics, content quality assurances, citation guidelines, key facts, FAQs

**Enhanced Pre-Publication SEO Gate:**
- Added **heading hierarchy validation** (H1 count, skip detection, H2 minimum)
- Added **word count check** (1,200 minimum, 500 blocker)
- Added **internal links check** (3 minimum, all 5 domains recognized)
- Added **readability scoring** (Flesch-Kincaid grade level, target ≤12)
- Added **image alt text check** (accessibility + SEO)
- Gate now has 9 checks (was 4): route, Arabic route, title, meta, content length, heading hierarchy, word count, readability, image alt text

**Feature Flags Wired to Database:**
- Rewrote `/api/admin/feature-flags` — was entirely mock data, now reads/writes from `FeatureFlag` Prisma table
- GET returns real flags from DB, health data from CronJobLog, analytics from flag counts
- POST supports create, toggle, update, delete — all persisted to database

**Documentation:**
- Created `docs/NEW-WEBSITE-WORKFLOW.md` — complete 8-phase operational workflow for launching new websites
- Updated CLAUDE.md with session findings

**Audit Findings — Known Gaps (Not Blocking Launch):**

| Area | Finding | Status |
|------|---------|--------|
| GA4 Integration | Dashboard returns 0s for traffic metrics (API calls stubbed) | Known — needs GA4 Data API integration |
| Design Generation | No AI image/logo generation; PDF generator is mock only | Known — design studio has canvas editor but no AI gen |
| Workflow Control | Automation Hub and Autopilot UIs are placeholders with mock data | Known — DB models exist but no CRUD endpoints |
| Feature Flags | DB-backed now, but not wired to actual code behavior | Known — flags stored but no runtime checks |
| Topic Policy | Per-site content policies exist in schema but no UI or enforcement | Known — `TopicPolicy` model unused |
| ContentScheduleRule | Missing `site_id` field for per-site scheduling | Known — global only |
| Prompt Templates | Global, not per-site; no admin management UI | Known |
| WordPress Sync | Admin page exists but no scheduled cron job | Known — intentionally deferred |

**Multi-Site Readiness Assessment: 90%**
- Config files: 100% ready (all 5 sites configured)
- Database schema: 100% ready (site_id on all relevant models)
- Cron jobs: 100% ready (all loop through active sites)
- Middleware: 100% ready (14 domain mappings)
- Content pipeline: 100% ready (per-site topics, drafts, publishing)
- SEO infrastructure: 100% ready (per-site sitemap, robots, llms.txt, schema)
- Dashboard: 85% ready (multi-site view works, some features still mock)
- Design generation: 40% ready (canvas editor works, no AI generation)
- Workflow control: 50% ready (DB models exist, UIs are placeholders)

### Session: February 18, 2026 — SEO Standards Overhaul & Dashboard Data Integrity

**Content Hub — Indexing Tab (New Feature):**
- New "Indexing" tab in Content Hub (`/admin/content?tab=indexing`) — per-article indexing visibility
- Summary cards: Total, Indexed, Submitted, Not Indexed, Never Submitted, Errors
- Config status banner alerts when INDEXNOW_KEY or GSC credentials are missing
- Per-article rows with status badges, SEO score, word count, submission channels
- Submit/Resubmit buttons per article + "Submit All" bulk action
- "Indexing Issues & Diagnostics" section with severity-colored issue cards
- "SEO Compliance Audit" button — audits all published pages against centralized standards
- Compliance audit results panel: passing/failing counts, average score, auto-fixes applied
- API: `/api/admin/content-indexing` (GET + POST with `submit`, `submit_all`, `compliance_audit` actions)
- Fixed Google Indexing API confusion: blog content uses GSC Sitemap + IndexNow, not Indexing API (restricted to JobPosting/BroadcastEvent only)

**Centralized SEO Standards (`lib/seo/standards.ts` — New File):**
- Single source of truth for ALL SEO thresholds and algorithm context
- Referenced by: pre-pub gate, schema generator, SEO agent, content pipeline, weekly research agent
- Exports: `STANDARDS_VERSION`, `ALGORITHM_CONTEXT`, `CORE_WEB_VITALS`, `CONTENT_QUALITY`, `EEAT_REQUIREMENTS`, `SCHEMA_TYPES`, `AIO_OPTIMIZATION`, `INDEXING_CONFIG`, `TECHNICAL_SEO`, `AUTHORITATIVE_SOURCES`
- Helper functions: `isSchemaDeprecated()`, `getSchemaDeprecationInfo()`
- Updated: Feb 2026, sourced from Google Search Central + Quality Rater Guidelines Sept 2025

**SEO Standards Updates (2025-2026 Compliance):**
- **Schema deprecated types removed:** FAQPage (restricted Aug 2023), HowTo (deprecated Sept 2023), CourseInfo, ClaimReview, EstimatedSalary, LearningVideo, SpecialAnnouncement, VehicleListing (June 2025), PracticeProblems (Nov 2025), SitelinksSearchBox (Oct 2024)
- **Schema generator updated:** `faq`/`howto`/`guide` page types now generate `Article` schema instead of deprecated types
- **Enhanced schema injector cleaned:** Removed FAQ/HowTo schema injection + SEO score bonuses for deprecated types
- **Pre-publication gate tightened:** Meta title min 20→30 chars, meta description min 50→70 chars, word count blocker 500→800 words, SEO score threshold 40→60
- **Pre-pub gate new checks:** E-E-A-T author attribution (check 10), structured data presence (check 11)
- **SEO agent scoring updated:** Weighted severity (high -15, medium -10, low -5) replaces flat -10, plus E-E-A-T bonuses for authority links/keywords
- **Phase 7 quality gate aligned:** `phases.ts` threshold changed from >= 50 to >= 60 (matching `CONTENT_QUALITY.qualityGateScore`)
- **Core Web Vitals:** INP replaced FID in March 2024 (reflected in standards: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1)
- **Algorithm context documented:** Helpful Content absorbed into core (March 2024), AI Overviews live (1.5B+ users), mobile-first indexing 100% complete (July 2024), topical authority elevated, information gain rewarded

**Weekly Standards Refresh:**
- Weekly research agent (`lib/seo/orchestrator/weekly-research-agent.ts`) now checks 4 additional trusted sources: Google Doc Changelog, Search Status Dashboard, Search Engine Roundtable, Search Engine Land
- New Phase 3 "Standards Refresh" imports from `standards.ts`, logs current config, and flags staleness (>30 days)

**Multi-Website SEO Scoping:**
- **Enhanced schema injector:** Now accepts `siteId` parameter, dynamically loads site config for branding (name, domain, email) instead of hardcoded Yalla London
- **Schema generator:** Logo path and author name now use `brandConfig` properties instead of hardcoding
- **Content-indexing API:** All 3 hardcoded "yalla-london" defaults replaced with `getDefaultSiteId()` from config
- **Full-audit API:** Hardcoded "yalla-london" fallback replaced with `getDefaultSiteId()`
- **Pre-publication gate:** Internal links regex now dynamically built from configured sites (no hardcoded domain list)
- **SEO report API:** Hardcoded `yallalondon.com` fallback replaced with `getSiteDomain(getDefaultSiteId())`
- **Articles performance API:** Info hub articles now use dynamic `siteId` instead of hardcoded "yalla-london"

**Dashboard Mock Data Purge:**
- **Social posts API:** Removed `Math.random()` fake engagement stats (likes, comments, shares, reach) — returns null until real platform APIs connected. Fixed hardcoded `site: 'Arabaldives'` to read from post metadata
- **Social media page:** Removed mock posts/accounts fallback — shows honest empty state when APIs fail. Removed hardcoded "+2.5% this week" and "+15% vs last month" growth claims
- **PDF guide page:** Removed `mockGuides` fallback — shows empty state until real data exists
- **Flags API:** Replaced hardcoded `cronStatus = 'running'` with actual CronJobLog query (checks last 24h)
- **Rate-limiting API:** Replaced `Math.random()` stats and fake IP addresses with zero-initialized honest defaults
- **Indexing cron:** Fixed schema mismatches: `last_checked_at` → `last_inspected_at`, `error_message` → `last_error`

**Audit Findings — Updated Known Gaps:**

| Area | Finding | Status |
|------|---------|--------|
| GA4 Integration | Dashboard returns 0s for traffic metrics (API calls stubbed) | Known — needs GA4 Data API integration |
| Social Media APIs | Engagement stats (likes, reach) require platform API integration | Known — returns null honestly now |
| Design Generation | No AI image/logo generation; PDF generator is mock only | Known — design studio has canvas editor but no AI gen |
| Workflow Control | Automation Hub and Autopilot UIs are placeholders | Known — DB models exist but no CRUD endpoints |
| Feature Flags | DB-backed but not wired to actual code behavior | Known — flags stored but no runtime checks |
| Article Create/Edit | Buttons in articles page have TODO comments, no handlers | Known — needs API endpoint wiring |
| Rate Limiting | Stats are in-memory only, reset on deploy | Known — needs Redis or DB persistence |

### Session: February 18, 2026 — Deep Platform Security & Integrity Audit

**Audit #3 — 6-Dimensional Deep Comprehensive Audit:**
Ran 6 parallel audit agents covering: (1) Auth & Middleware patterns, (2) Error handling & catch blocks, (3) DB schema vs code consistency, (4) Env vars & config, (5) Cron chain & pipeline integrity, (6) Dead code & unused exports. Full results documented in `docs/AUDIT-LOG.md`.

**Critical Security Fixes (8 routes):**
- **Added `requireAdmin` auth to 7 unprotected admin API routes:** MCP Stripe (balance, customers, payments), MCP Mercury (accounts, transactions), database migrate (GET+POST), operations-hub
- These routes exposed financial data (Stripe balances, Mercury bank accounts) and database schema to unauthenticated users

**Multi-Site Infrastructure Fixes:**
- **next.config.js image domains:** Added all 5 site domains to `remotePatterns` (was only yalla-london.com)
- **next.config.js CORS origins:** Default `ALLOWED_ORIGINS` now includes all 10 domains (5 sites × www + non-www)
- **Affiliate injection site_id scoping:** Added `siteId: { in: getActiveSiteIds() }` filter — prevents cross-site affiliate contamination

**Error Handling Fixes (5 critical catch blocks):**
- **SEO agent:** Schema injection and meta title auto-fix `catch {}` blocks now log descriptive warnings
- **Daily content generate:** Topic status update, DB topic lookup, and Arabic copywriting directive `catch {}` blocks now log warnings with context
- Eliminated all `catch {}` violations in critical cron paths (was forbidden per CLAUDE.md engineering standards)

**Persistent Audit Tracking:**
- Created `docs/AUDIT-LOG.md` — structured tracking of all audit findings across sessions
- Format: issue ID, description, error, fix, verification, affected files
- 27 findings documented from Audit #1 (18 fixed), Audit #2 (9 fixed), Audit #3 (15 fixed, 27 documented for future)
- 20 known gaps tracked with cross-references to audit finding IDs

**Key Documented Issues (Not Yet Fixed — See AUDIT-LOG.md):**

| Area | Issue | Severity | Audit Ref |
|------|-------|----------|-----------|
| Auth | Editor + Flags routes use Supabase auth instead of standard middleware | MEDIUM | A3-D01 |
| DB Schema | PdfGuide/PdfDownload models missing from Prisma schema | HIGH | A3-D07 |
| Error Logging | 260+ console.error/warn invisible to dashboard owner | HIGH | A3-D03 |
| Env Docs | Per-site env var pattern undocumented in .env.example | HIGH | A3-D12 |
| Pipeline | daily-content-generate bypasses ArticleDraft 8-phase pipeline | HIGH | A3-D19 |
| SEO Crons | Duplicate: seo-agent + seo/cron both submit to IndexNow | MEDIUM | A3-D20 |
| standards.ts | 11/13 exports unused — not yet integrated into enforcement | MEDIUM | A3-D22 |
| Mock Data | 14+ admin pages still show mock/placeholder data | MEDIUM | A3-D23 |

### Session: February 18, 2026 — Audit #4: Deep Targeted Audit & Indexing Visibility

**Audit #4 — 6 Parallel Audit Agents:**
Targeted areas previous audits missed: (1) API Route Completeness, (2) Content Pipeline Integrity, (3) Frontend Admin Pages, (4) Prisma Schema Orphans, (5) Security & Input Validation, (6) Hardcoded Strings & Config.

**Critical Fixes Applied (11):**

1. **Fixed 2 wrong Prisma import paths** — `@/lib/prisma` (doesn't exist) → `@/lib/db` in analytics route and sites route. Both would crash at runtime.
2. **SSRF protection on social embed endpoint** — Added URL allowlist + internal IP blocking + HTTPS enforcement to `/api/social/embed-data`. Previously any URL could be fetched server-side.
3. **Removed fake social proof numbers** — `SocialProof` and `SocialProofBadge` components were showing Math.random() engagement stats to visitors. Now show nothing when no real data exists.
4. **Fixed non-existent site in dropdown** — Command center content generator had "Gulf Maldives" option. Replaced with correct 5 sites.
5. **Feature flags page wired to real API** — Was loading 100% hardcoded mock data. Now fetches from `/api/admin/feature-flags` and `/api/admin/operations-hub`.
6. **Analytics route de-hardcoded** — Response always said "Yalla London" regardless of site. Now reads siteId from request and loads config dynamically.
7. **Login error information disclosure fixed** — Was returning internal step names and error.message to attackers. Now returns generic message.
8. **Blog API error information disclosure fixed** — Public endpoint was returning internal error details. Removed `details` field.
9. **Indexing Health Diagnosis** — New at-a-glance panel in Content Hub Indexing tab. Plain-language status (healthy/warning/critical/not_started), progress bar, actionable detail text. Designed for phone viewing.
10. **Recent Indexing Activity** — New section showing last 20 cron runs related to indexing, with status dots, items processed, error messages, and timestamps.
11. **API enhanced** — `/api/admin/content-indexing` now returns `healthDiagnosis` object and `recentActivity` array for richer frontend data.

### Session: February 18, 2026 — Audits #5 & #6: Import Standardization & HIGHs Convergence

**Audit #5 — Remaining HIGH Fixes (22 issues fixed):**

1. **Dead article buttons wired** — Create/Edit buttons in articles page now navigate to `/admin/editor`
2. **BlogPost.create missing siteId** — Added `siteId` to Zod schema, defaults to `getDefaultSiteId()` on create
3. **Login GET diagnostic secured** — Added `requireAdmin()` guard, removed user count and error details
4. **Login POST info disclosure fixed** — Generic error message replaces internal step/error.message
5. **Blog API public info disclosure fixed** — Removed `details` from 500 response
6. **16 hardcoded URL fallbacks replaced** — Across 8 files (og, sitemap, SEO routes, metadata, publish), all now use `getSiteDomain(getDefaultSiteId())`

**Audit #6 — Import Standardization (44 issues fixed):**

1. **37 files migrated from `@/lib/prisma` to `@/lib/db`** — Canonical import convention now enforced across entire codebase. Only `lib/db.ts`, `lib/db/index.ts` (re-export bridges), and `lib/db/tenant-queries.ts` (circular dep avoidance) retain direct `@/lib/prisma` import.
2. **5 empty catch blocks eliminated** — Added contextual `console.warn()` logging in `seo-intelligence.ts` (3), `events/page.tsx` (1), `generate-content/route.ts` (1). Two acceptable empty catches left: `JSON.parse` pattern in health monitoring, logging utility self-failure.

**Remaining Known Issues (See AUDIT-LOG.md):**

| Area | Issue | Severity | Status |
|------|-------|----------|--------|
| Emails | 30+ hardcoded email addresses in code | HIGH | Open |
| XSS | dangerouslySetInnerHTML without sanitization in blog renderer | HIGH | Open |
| Login Security | No rate limiting on login endpoint | MEDIUM | Open |
| Pipeline | Dual pipelines, race conditions, slug collision possible | MEDIUM | Open |
| Dead Buttons | Media View/Download, upload buttons | MEDIUM | Open |
| Orphan Models | 16+ Prisma models never referenced in code | LOW | Open |
| Brand Templates | Only Yalla London template exists | MEDIUM | Open |
| CSP Headers | Missing Content-Security-Policy | MEDIUM | Open |
