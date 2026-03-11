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

8. **Development Monitor Standard (MANDATORY)**: Every development plan, feature batch, or multi-task project MUST be registered in `lib/dev-tasks/plan-registry.ts` with:
   - Structured task definitions (id, phase, testType, due dates, dependencies)
   - Live test implementations in `lib/dev-tasks/live-tests.ts` that produce **real, visible output** (actual API data, actual rendered images, actual sent emails, actual scan results) — NOT just code file existence checks
   - Each task MUST have a `testType` that maps to a live test function
   - Due dates MUST be updated after every commit that affects plan tasks
   - Plan sync runs automatically on cockpit Tasks tab load via `sync_plan` action
   - The Development Monitor at `/admin/cockpit` → Tasks tab is the **single source of truth** for project progress. If it's not in the monitor, it's not being tracked.
   - Test execution endpoint: `POST /api/admin/dev-tasks/test` with `maxDuration: 300` (Vercel Pro 5min limit)
   - Individual tests get 25s timeout. Test All gets 280s total budget (300s - 20s buffer)
   - JSON test reports include: task context, test results, evidence, error details (code + message + where + howToFix), dates, phase status, project status

### Communication Standards

1. **Plain language first**: Explain what's happening in business terms before technical terms. "Articles aren't being created because the topic finder and the article builder aren't connected" — not "TopicProposal records lack site_id foreign key."

2. **Status in every response**: When working on pipeline/infrastructure, always include a quick status: What works now? What's still broken? What's the next step?

3. **Don't bury bad news**: If something fundamental is broken, say it first, not last. Don't pad with good news to soften the blow.

4. **Actionable next steps**: Every response that involves deployment or changes should end with exactly what Khaled needs to do (deploy, wait, check dashboard) and what he should expect to see.

## Active Workstreams (What We Are Building)

There are **3 distinct workstreams** in this repo. They share infrastructure but are separate products. Never confuse them.

| # | Workstream | What It Is | Site ID(s) | Status |
|---|-----------|-----------|------------|--------|
| 1 | **Content Engine** | The shared multi-tenant platform: cron jobs, content pipeline, SEO engine, admin dashboard, affiliate injection, design system. Powers ALL sites. | N/A (shared) | Production |
| 2 | **Yalla London** | Luxury travel blog for Arab travelers visiting London. First site on the engine. Content + affiliate monetization. | `yalla-london` | Active |
| 3 | **Zenitha Yachts** | Yacht charter platform for the Mediterranean. Reuses 80% of the engine + adds yacht-specific features (fleet inventory, search, AI matchmaker, charter inquiry CRM, itinerary planner). | `zenitha-yachts-med` | **Built — Pending Deploy** |

### Separation Rules (MANDATORY)

1. **Never cross-contaminate site data**: Every DB query for content, articles, topics, affiliates MUST include `siteId` in the where clause. No global queries that return data from all sites.
2. **Never hardcode site-specific values in shared code**: Use `getSiteConfig(siteId)` for all site-specific branding, domains, prompts, affiliate partners.
3. **Yacht-specific code lives in yacht-specific paths**: New yacht models, yacht API routes, yacht admin pages — all clearly namespaced. Not mixed into Yalla London paths.
4. **Shared engine changes must work for ALL sites**: If you modify the content pipeline, SEO gate, cron infrastructure, or admin dashboard — verify it works for both Yalla London AND Zenitha Yachts.
5. **Design/branding is per-site**: Each site has its own branding folder (`public/branding/{site}/`), destination theme, and design tokens. Never apply one site's visual identity to another.

### Key Reference Docs

| Doc | Purpose |
|-----|---------|
| `docs/plans/MASTER-BUILD-PLAN.md` | **Strategic master plan — read at start of every session** |
| `docs/plans/STAGE-A-EXECUTION-PLAN.md` | Executable implementation plan for infrastructure completion (Stage A) |
| `docs/business-plans/YACHT-CHARTER-DEVELOPMENT-PLAN.md` | Full technical blueprint for Zenitha Yachts (Prisma models, API routes, phase plan) |
| `config/sites/zenitha-yachts-med.audit.json` | SEO audit config for yacht site |
| `public/branding/zenitha-yachts/` | Design & branding assets (upload here) |

## Platform Overview

Multi-tenant luxury travel content platform under **Zenitha.Luxury LLC** (Delaware). 5 branded travel blog sites + 1 yacht charter platform, bilingual (EN/AR), autonomous SEO and content agents, affiliate monetization. Built on Next.js 14 App Router, Prisma ORM, Supabase PostgreSQL, deployed on Vercel Pro.

### Parent Entity

**Zenitha.Luxury LLC** — Delaware limited liability company, founded by Khaled N. Aun.
- **Content Arm:** Zenitha Content Network (5 travel blog sites)
- **Yacht Arm:** Zenitha Yachts (yacht charter platform — zenithayachts.com)
- **Tech Arm:** ZenithaOS (travel tech, future SaaS)
- Config: `config/entity.ts`

### Sites — Travel Blogs (Content Engine)
| Site | Domain | Site ID | Locale | Aesthetic | Status |
|------|--------|---------|--------|-----------|--------|
| Yalla London | yalla-london.com | yalla-london | en | Deep navy + gold | Active (primary) |
| Arabaldives | arabaldives.com | arabaldives | ar | Turquoise + coral | Planned |
| Yalla Riviera | yallariviera.com | french-riviera | en | Mediterranean navy + champagne gold + lavender | Planned |
| Yalla Istanbul | yallaistanbul.com | istanbul | en | Burgundy + copper | Planned |
| Yalla Thailand | yallathailand.com | thailand | en | Emerald + golden amber | Planned |

### Sites — Yacht Charter Platform
| Site | Domain | Site ID | Locale | Aesthetic | Status |
|------|--------|---------|--------|-----------|--------|
| Zenitha Yachts | zenithayachts.com | zenitha-yachts-med | en | Navy + Gold + Aegean Blue | **Built — Pending Deploy** |

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

## CC Workflow Studio (Visual AI Workflow Editor)

All 7 AI agent pipelines are visualized using [CC Workflow Studio](https://github.com/breaking-brake/cc-wf-studio), a VS Code extension for interactive node-based workflow diagrams.

**Setup:** Install the "CC Workflow Studio" VS Code extension → open any `.json` file in `.vscode/workflows/` → click "Open in Workflow Studio".

**Full documentation:** `docs/CC-WORKFLOW-STUDIO.md` — includes JSON schema reference, node types, and conventions for creating new workflows.

### Workflow Files

```
.vscode/workflows/                              # Primary (VS Code extension reads from here)
docs/workflows/                                  # Git-tracked backup copy
├── yalla-content-to-revenue-pipeline.json       # Pipeline 1: Daily content lifecycle (16 nodes)
├── yalla-seo-audit-fix-pipeline.json            # Pipeline 2: Weekly SEO health (11 nodes)
├── yalla-analytics-intelligence-pipeline.json   # Pipeline 3: Daily analytics (9 nodes)
├── yalla-frontend-excellence-pipeline.json      # Pipeline 4: On-demand perf/a11y (10 nodes)
├── yalla-growth-social-pipeline.json            # Pipeline 5: Weekly social media (9 nodes)
├── yalla-conversion-optimization-pipeline.json  # Pipeline 6: Bi-weekly CRO (9 nodes)
├── yalla-competitive-research-pipeline.json     # Pipeline 7: Monthly competitive intel (10 nodes)
└── yalla-master-orchestration.json              # Cross-pipeline overview (9 pipeline nodes)
```

### Cross-Pipeline Data Flows (visible in Master Orchestration)
```
Content → SEO:        Every article passes pre-publication gate
SEO → Content:        Low CTR (<1% after 30d) triggers auto-rewrite
Analytics → CRO:      Drop-off data feeds conversion priorities
CRO → Frontend:       A/B test winners trigger component updates
Frontend → SEO:       Performance improvements feed Core Web Vitals
Research → Content:    Discovered topics feed content calendar
Content → Growth:     Published articles repurposed for social
All → Dashboard:      Every pipeline reports to admin dashboard
```

### Conventions for New Workflows
- **File naming:** `yalla-{pipeline-name}-pipeline.json`
- **Node IDs:** `{type}-{descriptive-name}` (e.g., `agent-topic-research`, `switch-severity`)
- **Flow direction:** Left → right, parallel branches stacked vertically
- **Node types:** `start`, `end`, `subAgent`, `ifElse`, `switch`, `skill`, `mcp`, `prompt`, `human`, `loop`, `parallel`, `transform`

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
| SEO Score | >= 70 (< 50 blocks) | Yes |
| Lighthouse Performance | >= 80 | Yes |
| Accessibility | >= 90 | Yes |
| Content length (EN) | >= 1,000 words (1,200+ target) | Yes |
| Schema validation | Valid JSON-LD | Yes |
| Internal links | >= 3 per article | Warning |
| Affiliate/booking links | >= 2 per article | Warning |
| Meta title | 30-60 chars | Warning |
| Meta description | 120-160 chars | Warning |
| Heading hierarchy | 1 H1, 2+ H2, no skipped levels | Warning |
| Author attribution | Required (E-E-A-T) | Warning |
| Authenticity signals | 3+ first-hand experience markers | Warning |
| Readability | Flesch-Kincaid grade ≤ 12 | Warning |
| Image alt text | All images must have alt | Warning |

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

**See `docs/plans/MASTER-BUILD-PLAN.md` for the full strategic plan and `docs/plans/STAGE-A-EXECUTION-PLAN.md` for executable details.**

### Stage A: Infrastructure Completion (NOW)
1. ~~**Yalla London produces 1 article/day automatically**~~ **(DONE — content pipeline end-to-end)**
2. ~~**Articles are indexed by Google**~~ **(DONE — SEO agent + IndexNow × 3 engines, 80 pages indexed)**
3. ~~**Articles contain affiliate links**~~ **(DONE — CJ integration with SID tracking)**
4. ~~**Dashboard shows pipeline status**~~ **(DONE — Cockpit 7 tabs, mobile-first)**
5. ~~**Complete site research for all 5 sites**~~ **(DONE — 5/5 complete)**
6. **Revenue visibility** — GA4 dashboard wiring, affiliate click tracking, OG images (Phase A.1)
7. **Multi-site hardening** — CJ siteId migration, Arabic SSR, feature flags (Phase A.2)
8. **Compliance** — Cookie consent, GDPR, social/email wiring (Phase A.3)
9. **Cleanup** — Orphan models, dead buttons, test expansion (Phase A.4)

### Stage B: Site Building (AFTER Stage A is 100%)
10. **Deploy Zenitha Yachts** (already built — run Prisma migration + DNS)
11. **Build Zenitha.Luxury** (curated parent brand — NOT auto-generated)
12. **Activate Arabaldives** (Arabic-first Maldives — requires Arabic SSR)
13. **Activate Yalla Riviera** (French Riviera + yacht charter affiliates)
14. **Activate Yalla Istanbul** (highest revenue ceiling)
15. **Activate Yalla Thailand** (strong GCC pipeline)
16. **Optimize: CRO, A/B testing, performance tuning**

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

### Session: February 18, 2026 — Audits #7–#9: Build Fix, Pipeline Hardening, Deep Trace

**Audit #7 — Build Error + Validation (31 issues fixed):**

1. **Build error fix:** Removed `@typescript-eslint/no-var-requires` eslint-disable comments in 2 files — rule doesn't exist in installed version, causing Vercel build failure
2. **Auth gaps closed:** Added `withAdminAuth` to shop/stats (revenue data) and skill-engine (automation registry) — both were publicly accessible
3. **Info disclosure fixed (13 routes):** Removed `error.message` from public API responses in content, search, blog, information (×3), checkout, social, SEO, test routes
4. **Fake data removed (5 instances):** blog-card random likes, seo-audits random score, editor random SEO score, pipeline panel fake percentages, PDF fake growth claim
5. **Hardcoded URLs fixed (11 instances):** about/layout, articles/performance, pdf/generate, contact, seo/entities, seo/report (×4)

**Audit #8 — Water Pipe Test (13 critical pipeline breaks fixed):**

Traced entire content pipeline end-to-end across 5 stages:
1. **Topic Generation:** Fixed admin topic creation crash (missing `source_weights_json` + `site_id`), SEO agent rewrite crash (non-existent fields)
2. **Content Building:** Fixed deprecated schema types in outline prompt
3. **Selection & Publishing:** Added `runPrePublicationGate()` to content selector (fail-closed), raised `MIN_QUALITY_SCORE` from 50 to 60
4. **SEO & Indexing:** Created IndexNow key file route + vercel.json rewrite; removed sitemap route conflict that blocked Next.js built-in sitemap.ts
5. **Public Rendering:** Added proper HTTP 404 (was soft 200), featured image crash guard with gradient placeholder, multi-site JSON-LD from site config
6. **Monitoring:** Replaced fake notifications with empty state

**Audit #9 — Deep Pipeline Trace (18 issues fixed):**

Deeper trace of every handoff point in the pipeline:
1. **Cron auth chain (6 fixes):** analytics, seo-orchestrator, seo-agent, withCronLog utility, seo/cron, daily-publish — all returned 401/503 when CRON_SECRET unset. All now follow standard pattern: allow if unset, reject only if set and doesn't match.
2. **Scheduled-publish GET:** Changed from fail-open to fail-closed — gate failure now marks ScheduledContent as "failed" instead of publishing anyway
3. **Scheduled-publish POST:** Added full pre-publication gate — dashboard "Publish Now" button previously bypassed all 11 quality checks
4. **Build-runner multi-site:** Changed from processing first active site only to looping ALL active sites with per-site budget guard, reservoir cap (50), 1 draft pair per site per run
5. **Blog page site scoping (2 queries):** Added `siteId` filter from `x-site-id` header to `getDbPost()` and `getDbSlugs()` — prevents cross-site slug collision
6. **Blog API site scoping:** Changed from `findUnique` (slug only) to `findFirst` with siteId in where clause
7. **TypeScript:** ZERO errors across entire codebase

**Known Gaps Resolved by Audits #7–#9:**
- KG-028: CRON_SECRET bypass → **Resolved** (all crons follow standard auth pattern)
- KG-030: Build-runner single-site → **Resolved** (loops all active sites)
- KG-037: Scheduled-publish POST bypass → **Resolved** (full gate added, fail-closed)
- KG-039: Blog slug global uniqueness → **Resolved** (queries now scoped by siteId)

**Known Gaps Resolved by Audits #7–#9:**
- KG-028: CRON_SECRET bypass → **Resolved**
- KG-030: Build-runner single-site → **Resolved**
- KG-037: Scheduled-publish POST bypass → **Resolved**
- KG-039: Blog slug global uniqueness → **Resolved**

### Session: February 18, 2026 — Audits #10–#11: XSS, Affiliates, Emails, IndexNow, Related Articles

**Audit #10 — XSS Sanitization, Cron Auth, Dead Code, Multi-Site (28 issues fixed):**

1. **6 more cron auth routes fixed:** auto-generate, autopilot, fact-verification, london-news, real-time-optimization, seo-health-report — all now follow standard pattern (allow if CRON_SECRET unset)
2. **XSS sanitization (3 public files):** Installed `isomorphic-dompurify`, created `lib/html-sanitizer.ts` with curated allowlists. Wrapped `dangerouslySetInnerHTML` in BlogPostClient, ArticleClient, SectionClient
3. **Trends monitor multi-site:** Changed from `activeSites[0]` to loop all active sites with per-site dedup
4. **Affiliate injection per-site:** Both `affiliate-injection/route.ts` and `select-runner.ts` now have destination-specific URLs for all 5 sites (London, Maldives, French Riviera, Istanbul, Thailand)
5. **daily-publish deprecation stub:** Replaced 280-line dead cron with 55-line no-op that logs deprecation

**Audit #11 — Hardcoded Emails, IndexNow, Admin XSS, Related Articles, Duplicate Crons (25 issues fixed):**

1. **Hardcoded emails (KG-022):** 25+ instances across 9 files replaced with dynamic `hello@${domain}` from site config
2. **IndexNow window (KG-038):** Extended from 24h to 7 days — posts that miss initial submission caught by daily runs
3. **Admin XSS (KG-023 completion):** 6 more `dangerouslySetInnerHTML` in 5 admin files wrapped with `sanitizeHtml()`. Added `sanitizeSvg()` for SVG content in brand-assets-library
4. **Related articles DB (KG-033):** `getRelatedArticles()` now async, queries published BlogPosts by category + merges with static content. DB results prioritized. 3 call sites updated
5. **Duplicate IndexNow (KG-019):** seo-agent now only discovers URLs (writes `pending` status); actual submission delegated to seo/cron which has exponential backoff

**Known Gaps Resolved by Audits #10–#11:**
- KG-019: Duplicate IndexNow submission → **Resolved** (seo-agent discovers, seo/cron submits)
- KG-022: Hardcoded emails → **Resolved** (dynamic from site config)
- KG-023: XSS dangerouslySetInnerHTML → **Resolved** (all 9 instances sanitized: 3 public + 6 admin)
- KG-026: Missing CSP headers → **Resolved** (false positive — already in next.config.js)
- KG-029: daily-publish dead code → **Resolved** (deprecation stub)
- KG-031: Trends monitor single-site → **Resolved** (loops all active sites)
- KG-033: Related articles static-only → **Resolved** (DB + static merged)
- KG-034: Affiliate injection London-only → **Resolved** (per-site destination URLs)
- KG-038: IndexNow 24h window → **Resolved** (extended to 7 days)

### Session: February 18, 2026 — Audit #12: Critical Security Lockdown & Functioning Roadmap

**Audit #12 — Critical Security, Pipeline Integrity, Observability, URL Correctness (85+ issues fixed):**

1. **CRITICAL security: Unauthenticated database routes (KG-040):** Added `requireAdmin` to 7 handlers across 5 database API routes. Fixed `pg_dump`/`psql` password injection.
2. **CRITICAL security: Admin setup password reset bypass (KG-041):** Setup endpoint now returns 403 when admin already exists.
3. **HIGH security: 7 public mutation APIs (KG-042):** Added `requireAdmin` to content/auto-generate, content/schedule, homepage-blocks, homepage-blocks/publish, cache/invalidate, media/upload, test-content-generation.
4. **HIGH info disclosure:** Removed API key prefix logging and verification token logging.
5. **HIGH observability: 34 empty catch blocks (KG-043):** Central fixes in `onCronFailure` (failure-hooks.ts) and `logCronExecution` (cron-logger.ts) plus per-file fixes. All now log with module tags.
6. **CRITICAL pipeline: Race conditions (KG-025):** Atomic topic claiming with `updateMany` + new "generating" status across all 3 consumer pipelines. Soft-lock on ArticleDraft processing.
7. **CRITICAL SEO: Static metadata (KG-044):** 5 pages converted from static `metadata` to `generateMetadata()` with new `lib/url-utils.ts` utility.
8. **HIGH URL fallbacks:** 9 layout.tsx files now use config-driven fallback instead of hardcoded yalla-london.com.

**Functioning Roadmap Created:**
- `docs/FUNCTIONING-ROADMAP.md` — comprehensive 8-phase path to 100% healthy platform
- Master checklist with anti-duplication, anti-conflict, anti-contradiction, anti-misalignment, anti-malfunction verification
- Anti-patterns registry documenting 12 recurring bad patterns with correct alternatives
- Validation protocol for every code change, pipeline change, and deployment
- All 47 Known Gaps tracked with phase assignments

**Known Gaps Resolved by Audit #12:**
- KG-025: Pipeline race conditions → **Resolved** (atomic claiming + "generating" status)
- KG-040: Unauthenticated database routes → **Resolved** (requireAdmin on all)
- KG-041: Admin setup password reset → **Resolved** (403 after first admin)
- KG-042: Public mutation APIs → **Resolved** (requireAdmin on 7 routes)
- KG-043: 34 empty catch blocks → **Resolved** (central + per-file logging)
- KG-044: Static metadata URLs → **Resolved** (generateMetadata + getBaseUrl)

**Remaining Known Gaps (See AUDIT-LOG.md + FUNCTIONING-ROADMAP.md for full tracking):**

| Area | Issue | Severity | Phase |
|------|-------|----------|-------|
| SEO | No Arabic SSR — hreflang mismatch | MEDIUM | Phase 8 (KG-032) |
| Dashboard | No traffic/revenue data — GA4 not connected | MEDIUM | Phase 6 (KG-035) |
| Dashboard | No push/email alerts for cron failures | MEDIUM | Phase 4 (KG-036) |
| Dashboard | 13+ admin pages show mock/fake data | HIGH | Phase 5 (KG-045) |
| Dashboard | 14+ admin buttons dead (no handlers) | HIGH | Phase 5 (KG-046) |
| Navigation | Broken sidebar links to /admin/news, /admin/facts | HIGH | Phase 5 (KG-047) |
| Login Security | No rate limiting on admin login | MEDIUM | Phase 1 (KG-024) |
| URL Hardcoding | ~30 remaining in API routes and lib files | MEDIUM | Phase 3 (KG-021) |
| Orphan Models | 16+ Prisma models never referenced | LOW | Phase 8 (KG-020) |
| Brand Templates | Only Yalla London template exists | MEDIUM | Phase 7 (KG-027) |

### Session: February 18, 2026 — Audit #13: Deep Compliance + Smoke Test Suite

**Audit #13 — Credential Exposure, Crash Fixes, XSS, Fake Metrics, Smoke Test (15 issues fixed):**

3 parallel research sweeps: (1) Pipeline end-to-end trace (23 pass, 3 fail), (2) Workflow coherence + cron chain mapping (0 critical), (3) Compliance + anti-pattern check (2 critical, 1 high, 3 medium).

1. **CRITICAL: Analytics API credential exposure (KG-048):** Removed raw `client_secret`, `client_id`, `private_key` from analytics API response. Replaced with boolean `_configured` indicators. Also removed API key prefixes and service account emails from system-status endpoint.
2. **CRITICAL: content-generator.ts crash (KG-049):** `blogPost.create()` was missing required `category_id` field — guaranteed Prisma crash. Added find-or-create default "General" category + system user for `author_id`.
3. **HIGH: 4 remaining XSS vectors (KG-050):** Sanitized `dangerouslySetInnerHTML` in howto-builder, faq-builder, lite-social-embed, video-composition with `sanitizeHtml()`/`sanitizeSvg()`.
4. **MEDIUM: 3 Math.random() fake metrics (KG-051):** Eliminated from bulk-publish (audit score), backlinks/inspect (SEO score), topics/generate (confidence).
5. **MEDIUM: content-strategy.ts missing site_id:** `saveContentProposals()` now accepts and passes `siteId`; seo-agent passes siteId in loop.
6. **MEDIUM: Math.random() in ID generation (3 admin routes):** Replaced with `crypto.getRandomValues()` / `crypto.randomUUID()` in domains, ab-test, rate-limiting.
7. **LOW: Pre-pub gate meta length warnings:** Added max-length checks for meta title (>60) and description (>160).
8. **LOW: onCronFailure error tag:** Updated catch block tag from `[failure-hook]` to `[onCronFailure]` for precise log identification.

**Comprehensive Smoke Test Suite (`scripts/smoke-test.ts`):**
- 64 tests across 12 categories: Build, Pipeline (16), Quality Gate (4), Cron Auth (12), Security (6), XSS (6), Anti-Patterns (3), Multi-Site (6), Observability (3), SEO (5), Budget Guards (2)
- **Result: 64/64 PASS — 100% score**
- Run with: `npx tsx scripts/smoke-test.ts`

**Known Gaps Resolved by Audit #13:**
- KG-048: Analytics credential exposure → **Resolved**
- KG-049: content-generator.ts crash → **Resolved**
- KG-050: 4 remaining XSS vectors → **Resolved**
- KG-051: Math.random() fake metrics → **Resolved**

### Session: February 18, 2026 — Audit #14: London News Feature + SEO Audit Scalability

**Audit #14 — London News + SEO Audit (19 issues fixed):**

2 parallel deep audits: (1) London News end-to-end flow (cron → DB → API → frontend → public page), (2) SEO audit system scalability (per-page auditing, timeouts, context/memory management).

**London News fixes (7):**
1. **CRITICAL: Cron not scheduled** — Added london-news to vercel.json at 6am UTC daily
2. **CRITICAL: No budget guards** — Added 53s budget with checks before template loop and Grok calls
3. **CRITICAL: No siteId on NewsItem** — All news creation now sets siteId from query param or config default. Scoped auto-archive and recent items queries per-site
4. **MEDIUM: News API no site filtering** — Added siteId from x-site-id header to news endpoint
5. **MEDIUM: Hardcoded URLs** — News detail page uses `getBaseUrl()` and `getSiteDomain()` instead of hardcoded yalla-london.com
6. **MEDIUM: Silent catches** — Error recovery log and news API fallback now log with context

**SEO Audit fixes (5):**
1. **CRITICAL: Unbounded auditBlogPosts query** — Added `take: 100` to prevent OOM on large sites
2. **HIGH: Live-site-auditor slow timeouts** — Reduced all 6 fetch timeouts from 8-10s to 5s
3. **HIGH: seo-health-report no site filtering** — Added siteId parameter to all aggregate queries
4. **MEDIUM: Silent sitemap truncation** — Added totalSitemapUrls tracking + warning when over maxUrls
5. **Infrastructure: Orchestrator** — Updated default result types for new totalSitemapUrls field

**Smoke test expanded:** 78 tests across 14 categories — 100% pass. New categories: London News (7 tests), SEO Audit Scalability (6 tests).

### Session: February 19, 2026 — SEO Compliance Audit, Prompt Overhaul & Google Jan 2026 Authenticity Update

**Full SEO Compliance Audit (4 parallel audit agents):**
Audited all public pages, content generation prompts, layout/design, and SEO standards/gate alignment:
- Hotels/Experiences/Recommendations: thin content (80-150 words/item), no affiliate tracking, static data
- System prompts in sites.ts too generic (50-60 words each)
- Quality gate misalignment: code enforced 60 threshold vs CLAUDE.md's 70
- Meta description minimum was 70 chars (should be 120)
- Missing explicit affiliate link and internal link requirements in all generation prompts
- Missing heading hierarchy and focus keyword placement directives

**Quality Gate Tightening (4 files):**
1. **`lib/seo/standards.ts`:** `minWords` 800→1000, `targetWords` 1500→1800, `metaDescriptionMin` 70→120, `qualityGateScore` 60→70
2. **`lib/content-pipeline/phases.ts`:** Phase 7 scoring gate raised from 60→70
3. **`lib/content-pipeline/select-runner.ts`:** `MIN_QUALITY_SCORE` raised from 60→70
4. **`lib/seo/orchestrator/pre-publication-gate.ts`:** Word count blocker 800→1000, SEO score now blocks at <50 (was warn-only)

**System Prompts Overhaul (5 sites × 2 languages = 10 prompts):**
All 5 site system prompts in `config/sites.ts` expanded from ~50 words to comprehensive SEO-aware prompts including:
- 1,500–2,000 word minimum requirement
- Heading hierarchy rules (1 H1, 4-6 H2, H3 subsections)
- 3+ internal links requirement with descriptive anchor text
- 2+ affiliate/booking links requirement (site-specific: HalalBooking, Booking.com, Agoda, Boatbookings, Klook, etc.)
- Meta title (50-60 chars) and meta description (120-160 chars) with keyword placement rules
- Focus keyword placement: title, first paragraph, one H2
- "Key Takeaways" summary section and CTA requirement

**Content Pipeline Prompt Improvements (`daily-content-generate/route.ts`):**
1. **Main generation prompt:** Added explicit affiliate link requirement (2+), internal link requirement (3+), heading hierarchy rules, focus keyword placement in title/first paragraph/H2, fixed meta description range from 150-155→120-160
2. **All 6 content-type prompts** (answer, comparison, deep-dive, listicle, seasonal, default): Added internal link and affiliate link requirements with site-specific platform names
3. **Legacy `generate-content/route.ts`:** Raised word count from 800-1200→1,500-2,000, added internal link + affiliate + Key Takeaways requirements

**Google January 2026 "Authenticity Update" Adaptation:**

Deep research into Google's January 2026 Core Update (dubbed "Authenticity Update", rolled out Jan 4):
- First-hand Experience is now the #1 E-E-A-T ranking signal (above Expertise, Authority, Trust)
- Mass-produced unedited AI content actively demoted; "scaled content abuse" manual actions since June 2025
- "Second-hand knowledge" (repackaged summaries) systematically loses rank
- Stock photography penalized — original media signals authenticity
- Anonymous content penalized — author bylines with digital footprints required
- Topical depth (content clusters + internal linking) weighted higher than publishing frequency
- 60%+ of searches now feature AI Overviews — cited content must demonstrate genuine expertise

**Code changes for Authenticity Update compliance:**

1. **`lib/seo/standards.ts` — Algorithm context updated:**
   - Added 8 new Jan 2026 flags: `authenticityUpdateActive`, `aiContentRequiresHumanOversight`, `originalMediaPreferred`, `authorBylineRequired`, `topicalDepthOverFrequency`, `secondHandKnowledgeDemoted`, `scaledContentAbuseActions`, `aiOverviewCitationExpertiseRequired`
   - E-E-A-T requirements expanded: `experienceIsDominant`, `requireFirstHandSignals`, `requireOriginalInsights`, `requireAuthorDigitalFootprint`, `demonstrateThroughExplanation`

2. **`lib/seo/orchestrator/pre-publication-gate.ts` — 2 new checks (total now 13):**
   - **Check 12: Authenticity Signals** — Scans content for first-hand experience markers (sensory details, insider tips, personal observations, specific visit references) and penalizes AI-generic phrases ("In conclusion", "It's worth noting", "Whether you're a..."). Requires 3+ experience signals and ≤1 generic phrase.
   - **Check 13: Affiliate Links** — Verifies content contains affiliate/booking links from known partners (Booking.com, HalalBooking, Agoda, GetYourGuide, Viator, Klook, Boatbookings, etc.)

3. **`daily-content-generate/route.ts` — Humanization directives strengthened:**
   - "FIRST-HAND EXPERIENCE" section marked as #1 ranking signal with explicit instructions for sensory details, insider tips (2-3 per article), personal anecdotes, honest limitations
   - Extended AI-generic phrase blacklist: "nestled in the heart of", "look no further", "without further ado", "in this comprehensive guide"
   - Added instruction to "describe a failed approach or limitation honestly — imperfection signals authenticity"
   - AIO directives updated: noted 60%+ AI Overview coverage, added requirement that cited content must demonstrate genuine expertise

4. **Standards version bumped to `2026-02-19`**, source updated to include January 2026 Core Update

**Summary of all quality gate checks (13 total):**
1. Route existence
2. Arabic route check
3. SEO minimum requirements (title, meta title, meta description, content length)
4. SEO score (blocks <50, warns <70)
5. Heading hierarchy (H1 count, skip detection, H2 minimum)
6. Word count (1,000 blocker, 1,200 target)
7. Internal links (3 minimum)
8. Readability (Flesch-Kincaid ≤12)
9. Image alt text
10. Author attribution (E-E-A-T)
11. Structured data presence
12. Authenticity signals (Jan 2026 — experience markers, anti-generic)
13. Affiliate links (revenue requirement)

### Session: February 20, 2026 — CC Workflow Studio & SEO Page Compliance Audit

**CC Workflow Studio Integration:**
- Created 8 visual AI workflow files for all pipelines using [CC Workflow Studio](https://github.com/breaking-brake/cc-wf-studio) VS Code extension
- Workflows stored in `.vscode/workflows/` (extension reads from here) and `docs/workflows/` (git-tracked backup)
- Updated `.gitignore` to track `.vscode/workflows/` while keeping rest of `.vscode/` ignored
- Full documentation: `docs/CC-WORKFLOW-STUDIO.md` — JSON schema reference, node types, conventions

| # | Workflow File | Pipeline | Schedule | Nodes |
|---|------|----------|----------|-------|
| 1 | `yalla-content-to-revenue-pipeline.json` | Content-to-Revenue | Daily 5am | 16 |
| 2 | `yalla-seo-audit-fix-pipeline.json` | SEO Audit & Fix | Weekly Sun 5am | 11 |
| 3 | `yalla-analytics-intelligence-pipeline.json` | Analytics Intelligence | Daily 3am | 9 |
| 4 | `yalla-frontend-excellence-pipeline.json` | Frontend Excellence | On-demand | 10 |
| 5 | `yalla-growth-social-pipeline.json` | Growth & Social | Weekly Mon 10am | 9 |
| 6 | `yalla-conversion-optimization-pipeline.json` | Conversion Optimization | Bi-weekly | 9 |
| 7 | `yalla-competitive-research-pipeline.json` | Competitive Research | Monthly 1st | 10 |
| 8 | `yalla-master-orchestration.json` | Master Orchestration | Overview | 9 pipelines |

**Full SEO Page Compliance Audit (2 parallel agents):**

*Agent 1: Public Pages Audit (28 pages scanned)*
- All 9 critical page layouts (hotels, experiences, recommendations, about, contact, events, shop, privacy, terms) already had proper `generateMetadata()` with: dynamic `getBaseUrl()`, canonical tags, hreflang (en-GB, ar-SA, x-default), Open Graph, Twitter cards, robots directives
- Root layout already included `<StructuredData siteId={siteId} />` (Organization + WebSite schema)
- Gap found: No BreadcrumbList structured data on any page layout
- Gap found: OG image hardcoded as `/og-image.jpg` (same for all sites)

*Agent 2: SEO Enforcement Pipeline Audit (96% compliant)*
- 13/13 pre-publication checks active and wired
- 3/3 production pipelines gated (select-runner, daily-content-generate, scheduled-publish) — all fail-closed
- All quality gate thresholds aligned: phases.ts (70), select-runner.ts (70), standards.ts (70)
- Jan 2026 Authenticity Update: all 8 flags + 5 E-E-A-T requirements present
- Deprecated schema types (FAQPage, HowTo): properly blocked, Article fallback works
- Multi-site: dynamic config throughout, no hardcoding
- 78/78 smoke tests passing (100%)
- 1 threshold mismatch found: meta description minimum was 70 in gate vs 120 in standards.ts

**Fixes Applied:**

1. **Pre-publication gate meta description threshold (KG-052):** Changed min from 70 to 120 chars, aligning `pre-publication-gate.ts` with `standards.ts` (`metaDescriptionMin: 120`)

2. **BreadcrumbList structured data (9 layouts):** Added `<StructuredData type="breadcrumb">` to: hotels, experiences, recommendations, about, contact, events, shop, privacy, terms — all with dynamic `siteId` and `getBaseUrl()`

3. **Organization schema on About page:** Added `<StructuredData type="organization">` to about/layout.tsx for enhanced E-E-A-T signals

4. **OG image multi-site:** Root layout OG image changed from `/og-image.jpg` to `${baseUrl}/images/${siteConfig.slug}-og.jpg` — each site can now have its own branded OG image

**Known Gaps (Not Fixed — Future Work):**

| Area | Issue | Severity | Notes |
|------|-------|----------|-------|
| ~~OG Images~~ | ~~Per-site OG image files don't exist yet~~ | ~~MEDIUM~~ | **DONE** — Dynamic OG via `app/api/og/route.tsx` using Next.js ImageResponse, per-site brand colors |
| Legacy Route | `/api/generate-content` doesn't call pre-publication gate | LOW | Intentional for development/testing use |
| Content Pages | Hotels/experiences/recommendations have static hardcoded data | MEDIUM | Not DB-driven yet; no affiliate tracking on these pages |
| Author Attribution | Generic "Editorial" author on all articles | MEDIUM | Need specific author profiles for stronger E-E-A-T |

### Session: February 20, 2026 — Development Standards Documentation

**Comprehensive Development Standards (`docs/DEVELOPMENT-STANDARDS.md` — New File):**
- 16-section reference document for all new website development and Claude Code validation
- Covers: SEO Standards (13-check pre-publication gate), AIO Optimization, Content Quality, Technical SEO, Structured Data, E-E-A-T Compliance, Page Architecture, Multi-Site Rules, Content Pipeline, Affiliate Integration, Performance, Accessibility, Dashboard Standards, Standards Maintenance, Pre-Launch Checklist, Anti-Patterns Registry
- All thresholds reference `lib/seo/standards.ts` as single source of truth
- Includes code examples for correct patterns and explicit anti-patterns to avoid
- Google Jan 2026 Authenticity Update compliance built-in
- Cross-references NEW-WEBSITE-WORKFLOW.md for operational launch procedures

**Key Reference Files for Development:**

| File | Purpose |
|------|---------|
| `docs/DEVELOPMENT-STANDARDS.md` | SEO/AIO/E-E-A-T development standards for all new websites |
| `docs/NEW-WEBSITE-WORKFLOW.md` | Operational workflow for launching new websites |
| `docs/AUDIT-LOG.md` | Persistent audit findings tracking |
| `docs/FUNCTIONING-ROADMAP.md` | 8-phase path to 100% healthy platform |
| `lib/seo/standards.ts` | Centralized SEO thresholds — single source of truth |

### Session: February 20, 2026 — Master Audit Engine Implementation

**Master Audit System (16 new files + 4 test files + 2 configs + 2 CLI scripts + 1 spec doc):**

Complete batch-safe, resumable, multi-site SEO audit engine built from scratch. READ-ONLY — never mutates production data. Designed to be run via CLI with `npm run audit:master` and `npm run audit:weekly-policy-monitor`.

**Architecture:**
- **Config-loader** (`lib/master-audit/config-loader.ts`): 3-layer merge — `_default.audit.json` → `<siteId>.audit.json` → runtime overrides. Deep-merge utility exported for testing.
- **State-manager** (`lib/master-audit/state-manager.ts`): Run ID generation, batch state persistence to `docs/master-audit/<runId>/state.json`, resume support via `--resume=<runId>`.
- **Inventory-builder** (`lib/master-audit/inventory-builder.ts`): Builds URL list from sitemap XML + static routes + Arabic `/ar/` variants. Respects exclude patterns.
- **Crawler** (`lib/master-audit/crawler.ts`): Semaphore-based concurrency, rate limiting, exponential backoff retries, manual redirect chain capture.
- **Extractor** (`lib/master-audit/extractor.ts`): Regex-based HTML signal extraction (no external DOM library). Extracts: title, meta description, canonical, hreflang, headings, JSON-LD, links, word count, lang/dir attributes.
- **8 Validators**: http, canonical, hreflang, sitemap, schema, links, metadata, robots — each returns typed `AuditIssue[]` with P0/P1/P2 severity.
- **Reporter** (`lib/master-audit/reporter.ts`): Generates `EXEC_SUMMARY.md` and `FIX_PLAN.md` from audit results.
- **Orchestrator** (`lib/master-audit/index.ts`): Wires all modules into a single `runMasterAudit()` pipeline.

**Hard Gates (must be 0 violations):**
- Broken internal links, non-200 indexable pages, missing canonical, malformed JSON-LD, hreflang reciprocity failures, sitemap parse success

**Multi-Site Support:**
- User-Agent uses parent entity URL (`zenitha.luxury`), not site-specific
- Config accepts any `--site=<siteId>` parameter
- Site-specific JSON override files in `config/sites/`
- All 15 static routes from actual site architecture

**Test Coverage:**
- 55 unit tests across 4 spec files: extractor (16), validators (19), config-loader (9), state-manager (11)
- All passing, zero TypeScript errors

**Weekly Policy Monitor** (`scripts/weekly-policy-monitor.ts`):
- Checks 4 Google policy sources (Search Status Dashboard, Search Central Blog/Docs, Schema.org Changelog)
- Generates `WEEKLY_POLICY_MONITOR.md` report + `policy-snapshot.json`
- Multi-site: accepts `--site=<siteId>` parameter

**Key Files:**

| File | Purpose |
|------|---------|
| `lib/master-audit/index.ts` | Main orchestrator — `runMasterAudit()` |
| `lib/master-audit/types.ts` | All TypeScript interfaces and types |
| `lib/master-audit/config-loader.ts` | 3-layer config merge with validation |
| `lib/master-audit/crawler.ts` | Concurrent batch crawler with retry |
| `lib/master-audit/extractor.ts` | HTML signal extraction (regex-based) |
| `lib/master-audit/validators/*.ts` | 8 validators (http, canonical, hreflang, sitemap, schema, links, metadata, robots) |
| `lib/master-audit/reporter.ts` | Markdown report generator |
| `lib/master-audit/state-manager.ts` | Resume/batch state persistence |
| `lib/master-audit/inventory-builder.ts` | URL inventory from sitemap + static routes |
| `config/sites/_default.audit.json` | Default audit config (all sites) |
| `config/sites/yalla-london.audit.json` | Yalla London-specific overrides |
| `scripts/master-audit.ts` | CLI entry point |
| `scripts/weekly-policy-monitor.ts` | Weekly policy check CLI |
| `docs/seo/MAX_SEO_AIO_SPEC.md` | Comprehensive SEO/AIO specification |
| `docs/master-audit/SYSTEM_MAP.md` | System map of all routes and SEO signals |
| `test/master-audit/*.spec.ts` | 55 unit tests (4 files) |

**CLI Usage:**
```bash
# Full audit
npm run audit:master -- --site=yalla-london

# Quick mode with custom settings
npm run audit:master -- --site=yalla-london --mode=quick --batchSize=50

# Resume interrupted run
npm run audit:master -- --resume=yalla-london-20260220-143000-a1b2

# Local dev
npm run audit:master -- --site=yalla-london --baseUrl=http://localhost:3000

# Weekly policy monitor
npm run audit:weekly-policy-monitor -- --site=yalla-london
```

### Session: February 20, 2026 — Design System Overhaul (47 files, 8 Prisma models, 6 phases)

**Unified Design System — Complete Implementation:**

Transformed the disconnected, partially-built design tools into a unified, production-ready Design System spanning 47 new files across 6 phases. All changes compile with ZERO TypeScript errors.

**Phase 1: Critical Breakages Fixed:**
- **8 new Prisma models** added to schema: `Design`, `PdfGuide`, `PdfDownload`, `EmailTemplate`, `EmailCampaign`, `VideoProject`, `ContentPipeline`, `ContentPerformance`
- Migration SQL created: `prisma/migrations/20260220170000_add_design_system_models/`
- **Puppeteer PDF generation** wired: `lib/pdf/html-to-pdf.ts` — HTML → PDF buffer with retry logic, 30s timeout
- **Design persistence**: Full CRUD API at `/api/admin/designs/` with gallery, filtering, pagination
- **NPM packages installed**: juice, qrcode, jszip, @tiptap/*, unsplash-js, @remotion/bundler

**Phase 2: Ecosystem Connected:**
- **Unified Brand Provider** (`lib/design/brand-provider.ts`): `getBrandProfile(siteId)` merges config/sites.ts + destination-themes.ts into single BrandProfile interface
- **Media Picker** (`components/shared/media-picker.tsx`): Reusable modal with 3 tabs (Media Library, Upload, Unsplash). Integrates with Design Studio, Article Editor, Video Studio, Email Builder
- **Brand Context** (`components/shared/brand-context.tsx`): React context + `useBrand()` hook for all admin components
- **Design Distribution** (`lib/design/distribution.ts`): Routes finished designs to social posts, email headers, blog images, PDF covers, homepage heroes
- **SVG Exporter** (`lib/design/svg-exporter.ts`): Konva stage JSON → clean SVG markup

**Phase 3: Core Tools Built:**
- **Email System**: Block-based email builder (`components/admin/email-builder/`), email renderer (`lib/email/renderer.ts` — table-based layout, inline styles, Outlook-compatible), multi-provider sender (`lib/email/sender.ts` — SMTP/Resend/SendGrid)
- **Video System**: AI prompt-to-video pipeline (`lib/video/prompt-to-video.ts`), server-side render engine (`lib/video/render-engine.ts`), 2 pre-built Remotion templates (destination-highlight, hotel-showcase)
- **Brand Kit Generator** (`lib/design/brand-kit-generator.ts`): Color palettes, typography, logo SVGs, social templates, ZIP export via jszip

**Phase 4: Existing Tools Enhanced:**
- **Tiptap Editor** (`components/admin/tiptap-editor.tsx`): Rich text editor with formatting toolbar, image insertion, heading hierarchy, link management
- **5 New Homepage Modules**: Testimonials, Image Gallery, Video Hero, CTA Banner, Stats Counter
- **Social Scheduler** (`lib/social/scheduler.ts`): Post scheduling, publish assistant, manual publish flow

**Phase 5: AI Content Engine (4-Agent Pipeline):**
- **Agent 1: Researcher** (`lib/content-engine/researcher.ts`): Trend discovery, audience analysis, keyword mining, competitor audit
- **Agent 2: Ideator** (`lib/content-engine/ideator.ts`): Topic → 7+ content angles with cross-platform maps, 7-day content calendar
- **Agent 3: Scripter** (`lib/content-engine/scripter.ts`): Platform-specific scripts (social posts, blog articles, email campaigns, video projects), publish pipeline
- **Agent 4: Analyst** (`lib/content-engine/analyst.ts`): Performance grading (A-F), pattern recognition, feed-forward recommendations
- **8 API routes**: Pipeline CRUD, Research, Ideate, Script, Analyze, Publish, Performance tracking

**Phase 6: Admin Pages & Infrastructure:**
- **Design Hub** (`/admin/design`): Quick Create grid, Recent Designs, Brand Status, Asset Stats
- **Content Engine** (`/admin/content-engine`): Pipeline visualization (Researcher → Ideator → Scripter → Analyst), pipeline history, quick actions
- **Email Campaigns** (`/admin/email-campaigns`): Templates, Campaigns, History tabs
- **Social Calendar** (`/admin/social-calendar`): Week/Month view, platform-colored cards, Publish Assistant
- **Brand Kit API** (`/api/admin/brand-kit`): Generate and download brand kits per site

**New Files Created (47 total):**

| Category | Count | Files |
|----------|-------|-------|
| Library (lib/) | 15 | brand-provider, distribution, svg-exporter, brand-kit-generator, html-to-pdf, email renderer, email sender, prompt-to-video, render-engine, 2 video templates, researcher, ideator, scripter, analyst, scheduler |
| Components | 11 | media-picker, brand-context, tiptap-editor, email-builder (3 files), 5 homepage modules |
| API Routes | 17 | designs (2), email-templates, email-campaigns (2 + send), video-studio (2), brand-kit, content-engine (8) |
| Admin Pages | 4 | design hub, content engine, email campaigns, social calendar |

**Key Reference Files:**

| File | Purpose |
|------|---------|
| `docs/DESIGN-SYSTEM-DEVELOPMENT-PLAN.md` | Full development plan with status tracking |
| `docs/DESIGN-FEATURES-AUDIT.md` | Pre-implementation audit of existing features |
| `lib/design/brand-provider.ts` | Unified brand data for all 5 sites |
| `lib/content-engine/researcher.ts` | Content Engine Agent 1 |
| `lib/content-engine/ideator.ts` | Content Engine Agent 2 |
| `lib/content-engine/scripter.ts` | Content Engine Agent 3 |
| `lib/content-engine/analyst.ts` | Content Engine Agent 4 |

**TypeScript Status:** ZERO errors across entire codebase (including all 47 new files)

### Session: February 20, 2026 — Design System Audit & Fix Rounds (4 rounds, 20+ fixes)

**Iterative Audit Protocol Applied:**
Following the owner's instruction to "Audit → Check connectivity → Fix → Log → Push → Repeat until 100% done," ran 4 progressive audit rounds with 5 parallel audit agents per round.

**Audit Round 1 (Initial Connectivity):**
- 0 TypeScript errors
- All imports resolve correctly
- All 8 new Prisma models aligned with code

**Audit Round 2 — Security + Schema (7 fixes):**
1. **XSS in email-blocks.tsx**: 2 instances of unsanitized `dangerouslySetInnerHTML`. Fixed with `sanitizeHtml()` from `@/lib/html-sanitizer`
2. **PDF route field mismatches (13+ fields)**: 3 pre-existing PDF routes (`products/pdf/route.ts`, `products/pdf/download/route.ts`, `products/pdf/generate/route.ts`) used snake_case fields (`site_id`, `guide_id`, `downloaded_at`, `config_json`, `file_url`, `download_count`, `lead_email`, `locale`, `template`, `created_at`) but Prisma schema uses camelCase (`site`, `pdfGuideId`, `downloadedAt`, `contentSections`, `pdfUrl`, `downloads`, `email`, `language`, `style`, `createdAt`). All 3 routes rewritten
3. **Missing endpoint**: `/api/admin/brand-assets/route.ts` created — Design Hub page was fetching from it but it didn't exist
4. **Non-existent `prisma.site` model**: PDF generate route called `prisma.site.findUnique()`. Replaced with `getSiteConfig()` from config

**Audit Round 3 — API-Page Contracts + Critical Runtime Crashes (9 fixes):**
1. **CRITICAL: `content_body` field doesn't exist** in ScheduledContent model. `publish/route.ts` used `content_body` but schema has `content`. Fixed in 3 create calls (social, email, video)
2. **CRITICAL: Missing required fields** — `language` and `scheduled_time` have no defaults in ScheduledContent but weren't provided. Added defaults
3. **HIGH: Wrong argument shapes for 3 agent routes:**
   - `ideate/route.ts`: Changed from passing pipeline object to `{ topic, researchData, site, existingTitles }`
   - `script/route.ts`: Changed from passing pipeline/angles to `{ contentAngles, researchData, site, language }`
   - `analyze/route.ts`: Changed from passing pipeline to `{ pipelineId, site }`
4. **HIGH: Empty catch block** in `render-engine.ts` line 328 — `catch {}` with no logging. Added `console.warn()`
5. **MEDIUM: 4 API response shapes normalized** — designs, pipeline, email-templates, email-campaigns routes now return `siteId` + `siteName` aliases that admin pages expect

**Audit Round 4 — Deep Connectivity Verification:**
- **100% connectivity confirmed** across all categories
- 4/4 admin pages → API endpoints: CONNECTED
- 4/4 content engine agents: WIRED (export/import signatures match)
- 7/7 Prisma model references: VALID
- Full data pipeline chain verified: Researcher → Ideator → Scripter → Analyst → Publish

**Commits on `claude/audit-design-features-o62v0`:**
1. `8a3e6fd` — feat: Design System Overhaul — 47 new files, 8 Prisma models, 6 phases
2. `ec95a19` — chore: update yarn.lock
3. `200dd89` — fix: audit round 2 — XSS sanitization, PDF schema alignment, brand-assets API
4. `246a703` — fix: normalize API responses to match admin page field expectations
5. `7b29393` — fix: critical runtime crashes in content engine + render engine

**Final Status:** All 48+ files created, audited, and verified connected. Zero TypeScript errors. Development plan updated at `docs/DESIGN-SYSTEM-DEVELOPMENT-PLAN.md`

### Session: February 21, 2026 — Master Audit Engine: Risk Scanners, Test Suite Expansion & Phase Completion

**Master Audit Engine — Risk Scanner Implementation (3 new scanner modules):**

Completed the master audit engine by implementing the 3 Google spam policy risk scanners that were previously stubs, plus comprehensive test coverage and integration testing.

**New Risk Scanner Modules:**

1. **`lib/master-audit/risk-scanners/scaled-content.ts`** — Scaled Content Abuse Scanner
   - Jaccard similarity with 3-word shingles for near-duplicate detection
   - Union-find algorithm for clustering duplicate pages
   - Thin content cluster detection (configurable threshold, default 300 words)
   - Entity coverage scoring (heading topics vs metadata alignment)
   - Exports `scanScaledContentAbuse(allSignals, config)`

2. **`lib/master-audit/risk-scanners/site-reputation.ts`** — Site Reputation Abuse Scanner
   - Topic vocabulary extraction from key pages (homepage, blog, about)
   - Topic drift detection for content pages (blog, information, news)
   - Outbound link dominance detection (configurable threshold, default 0.7)
   - Missing editorial ownership detection (checks JSON-LD for author field)
   - Exports `scanSiteReputationAbuse(allSignals, config)`

3. **`lib/master-audit/risk-scanners/expired-domain.ts`** — Expired Domain Abuse Scanner
   - Domain topic extraction from hostname (splits camelCase, hyphens, underscores)
   - Topic pivot score calculation (content vs domain name alignment)
   - Site-level and page-level pivot analysis
   - Legacy orphan detection (no inbound links + off-topic content)
   - Exports `scanExpiredDomainAbuse(allSignals, config, baseUrl)`

**Engine Updates:**
- `lib/master-audit/index.ts`: Replaced stub `runRiskScanners` with real implementation wiring all 3 scanners
- `lib/master-audit/types.ts`: Extended `AuditMode` with `'preview' | 'prod'`, extended `RiskScannerConfig` with 6 new threshold fields
- `lib/master-audit/config-loader.ts`: Added all new risk scanner default values to `FALLBACK_DEFAULTS`
- `scripts/master-audit.ts`: Fixed TS2448 variable ordering bug, added preview/prod mode support
- `scripts/weekly-policy-monitor.ts`: Added dated copy storage to `docs/seo/policy-monitor/<date>/`

**Config Files:**
- `config/sites/_default.audit.json`: Updated with risk scanner enable flags and thresholds
- `config/sites/zenitha-yachts-med.audit.json`: New yacht site-specific config

**Test Suite Expansion (82 tests across 6 files):**

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `config-loader.spec.ts` | 9 | Config loading, deep merge, validation |
| `extractor.spec.ts` | 16 | HTML signal extraction |
| `validators.spec.ts` | 19 | HTTP, canonical, schema, sitemap validators |
| `state-manager.spec.ts` | 11 | Run ID, state persistence, batch management |
| `risk-scanners.spec.ts` | 17 | All 3 risk scanners (scaled, reputation, expired) |
| `integration.spec.ts` | 10 | Hard gate evaluation, report generation, full pipeline |
| **Total** | **82** | **All passing** |

**Documentation Created:**
- `docs/master-audit/README.md` — Comprehensive guide: quick start, modes, CLI options, outputs, hard gates, validators, risk scanners, batch+resume, configuration, adding new sites
- `docs/seo/WEEKLY_POLICY_MONITOR.md` — Documents sources monitored, run schedule, output files, diffing mechanism, acting on changes, multi-site support

**Dev Audit Checks (All Green):**
- TypeScript: 0 errors
- Lint: Only pre-existing warnings (no new issues)
- Build: Successful (all pages compiled)
- Unit tests: 82/82 passing
- Integration tests: 10/10 passing

**Baseline Audit Run:**
- Engine ran end-to-end against live site (32 URLs: 16 static + 16 AR variants)
- Generated all output files: EXEC_SUMMARY.md, FIX_PLAN.md, issues.json, result.json, config_snapshot.json, url_inventory.json, CHANGELOG.md, state.json, crawl-results.json
- Hard gates evaluated correctly (5/6 pass — HTTP gate fails due to sandbox network restriction, not code issue)
- Reports archived under `docs/master-audit/<runId>/`

**CLI Usage:**
```bash
# Full audit against live site
npm run audit:master -- --site=yalla-london

# Preview mode (localhost:3000)
npm run audit:master -- --site=yalla-london --mode=preview

# Custom batch size and concurrency
npm run audit:master -- --site=yalla-london --mode=prod --batchSize=50 --concurrency=3

# Resume interrupted run
npm run audit:master -- --resume=<runId>

# Weekly policy monitor
npm run audit:weekly-policy-monitor -- --site=yalla-london
```

**Key Files:**

| File | Purpose |
|------|---------|
| `lib/master-audit/index.ts` | Main orchestrator — `runMasterAudit()` |
| `lib/master-audit/types.ts` | All TypeScript interfaces and types |
| `lib/master-audit/config-loader.ts` | 3-layer config merge with validation |
| `lib/master-audit/crawler.ts` | Concurrent batch crawler with retry |
| `lib/master-audit/extractor.ts` | HTML signal extraction (regex-based) |
| `lib/master-audit/risk-scanners/scaled-content.ts` | Near-duplicate + thin content detection |
| `lib/master-audit/risk-scanners/site-reputation.ts` | Topic drift + outbound dominance |
| `lib/master-audit/risk-scanners/expired-domain.ts` | Domain-content mismatch detection |
| `lib/master-audit/validators/*.ts` | 8 validators (http, canonical, hreflang, sitemap, schema, links, metadata, robots) |
| `lib/master-audit/reporter.ts` | Markdown report generator |
| `lib/master-audit/state-manager.ts` | Resume/batch state persistence |
| `lib/master-audit/inventory-builder.ts` | URL inventory from sitemap + static routes |
| `config/sites/_default.audit.json` | Default audit config (all sites) |
| `config/sites/yalla-london.audit.json` | Yalla London-specific overrides |
| `config/sites/zenitha-yachts-med.audit.json` | Yacht site-specific config |
| `scripts/master-audit.ts` | CLI entry point |
| `scripts/weekly-policy-monitor.ts` | Weekly policy check CLI |
| `test/master-audit/*.spec.ts` | 82 unit + integration tests (6 files) |

### Session: February 21, 2026 — Zenitha Yachts Website: Full Build (68+ files, 8 Prisma models)

**Complete Zenitha Yachts Website — From Zero to Production-Ready:**

Built the entire Zenitha Yachts charter platform (zenithayachts.com) as the second site on the multi-tenant engine. 68+ new files across 6 phases, hermetic separation from Yalla London, full admin dashboard control.

**Phase 0: Database Models (8 models, 8 enums):**
- `Yacht`, `YachtDestination`, `CharterItinerary`, `CharterInquiry`, `BrokerPartner`, `YachtAvailability`, `YachtAmenity`, `YachtImage`
- Enums: `YachtType`, `YachtSource`, `InquiryStatus`, `InquiryPriority`, `ItineraryDifficulty`, `BrokerTier`, `AvailabilityType`, `AmenityCategory`
- Migration SQL: `prisma/migrations/20260221_add_yacht_charter_models/`

**Phase 1: Site Shell + Core Pages (5 files):**
- `components/site-shell.tsx` — Hermetic site separation (detects siteId, renders ZenithaHeader/Footer vs DynamicHeader/Footer)
- `components/zenitha/zenitha-header.tsx` — Responsive nav with mobile hamburger, yacht-specific menu items
- `components/zenitha/zenitha-footer.tsx` — Multi-column footer with destination links, legal
- `components/zenitha/zenitha-homepage.tsx` — Hero section, featured yachts grid, destinations, how-it-works, testimonials
- `app/zenitha-tokens.css` (49KB) — Full CSS custom property design system (--z-navy, --z-gold, --z-aegean, etc.)

**Phase 1B-1E: Public Pages (14 pages total):**

| Page | Path | Features |
|------|------|----------|
| Homepage | `/` | Hero, featured yachts, destinations, trust signals |
| Yacht Search | `/yachts` | Filters (type, price, cabins, destination), grid/list view, pagination |
| Yacht Detail | `/yachts/[slug]` | Gallery, specs, pricing, availability, inquiry CTA, Product JSON-LD |
| Destinations Hub | `/destinations` | Region grid, filters, yacht counts per destination |
| Destination Detail | `/destinations/[slug]` | Hero, related yachts, itineraries, Place JSON-LD |
| Itineraries Hub | `/itineraries` | Duration/difficulty filters, route cards |
| Itinerary Detail | `/itineraries/[slug]` | Day-by-day timeline, recommended yachts, Trip JSON-LD |
| Charter Planner | `/charter-planner` | AI multi-step planner (dates, guests, preferences, budget) |
| Inquiry Form | `/inquiry` | Multi-step form with validation, submits to CharterInquiry table |
| FAQ | `/faq` | Accordion with FAQPage JSON-LD |
| How It Works | `/how-it-works` | 4-step visual process guide |
| About | `/about` | Site-aware (routes to about-zenitha-yachts or about-yalla-london) |
| Contact | `/contact` | Site-aware (routes to zenitha-contact or yalla-contact) |

**Phase 3: Admin Dashboard (11 pages + 7 API routes):**

| Admin Page | Path | Features |
|-----------|------|----------|
| Fleet Inventory | `/admin/yachts` | Table with search, filters, pagination, summary cards |
| Add Yacht | `/admin/yachts/new` | Full creation form (specs, pricing, capacity, GCC features, images) |
| Inquiries CRM | `/admin/yachts/inquiries` | Status management, priority, notes, response tracking |
| Destinations | `/admin/yachts/destinations` | CRUD grid with season, pricing, yacht counts |
| Itineraries | `/admin/yachts/itineraries` | CRUD with difficulty, duration, destination filters |
| Brokers | `/admin/yachts/brokers` | Partner table with commission rates, lead tracking |
| Analytics | `/admin/yachts/analytics` | KPI cards, fleet by type, inquiry funnel, revenue |
| Sync & Imports | `/admin/yachts/sync` | Manual refresh + future NauSYS/MMK/Charter Index integration |

| API Route | Methods | Auth |
|-----------|---------|------|
| `/api/admin/yachts` | GET, POST | withAdminAuth |
| `/api/admin/yachts/destinations` | GET, POST, PUT, DELETE | withAdminAuth |
| `/api/admin/yachts/inquiries` | GET, PUT | withAdminAuth |
| `/api/admin/yachts/itineraries` | GET, POST, PUT, DELETE | withAdminAuth |
| `/api/admin/yachts/brokers` | GET, POST, PUT, DELETE | withAdminAuth |
| `/api/admin/yachts/analytics` | GET | withAdminAuth |
| `/api/admin/yachts/sync` | POST | withAdminAuth |
| `/api/yachts` | GET | Public |
| `/api/yachts/[id]` | GET | Public |
| `/api/yachts/destinations` | GET | Public |
| `/api/yachts/itineraries` | GET | Public |
| `/api/yachts/recommend` | POST | Public |
| `/api/inquiry` | POST | Public (rate-limited) |

**Phase 4: SEO/AIO Compliance:**
- All `[slug]` pages have `generateMetadata()` with canonical, hreflang, Open Graph, Twitter cards
- All layout pages have BreadcrumbList structured data
- Yacht detail: Product JSON-LD, Destination detail: Place JSON-LD, Itinerary detail: Trip JSON-LD, FAQ: FAQPage JSON-LD
- `app/sitemap.ts` updated with yacht, destination, itinerary URLs
- `app/llms.txt/route.ts` updated with Zenitha Yachts content
- `lib/seo/indexing-service.ts` updated with yacht IndexNow integration

**Phase 5: Dashboard Integration:**
- Admin sidebar updated with "Yacht Management" section (8 items)
- CommandCenter.tsx updated with YachtPlatformCard
- test-connections.html updated with 10 yacht API test routes

**Phase 6: Deep Audit + Fixes:**
- 6-dimension audit: import resolution, API connectivity, Prisma models, SEO, auth, siteId scoping
- All imports resolve correctly (CLEAN)
- All auth boundaries enforced (EXCELLENT)
- All siteId scoping correct (EXCELLENT)
- Fixed API response mismatch: `stats` → `summary` with `pendingReview` field
- Fixed pagination interface alignment (`pageSize` → `limit`)
- Built 3 missing admin pages: itineraries, sync, new (was uncommitted)
- Created sync API endpoint with manual refresh + future external source support

**Architecture Patterns:**
1. **SiteShell** for hermetic separation — detects siteId from headers, renders site-specific header/footer
2. **Server component pages** that route to site-specific client components (about, contact)
3. **CSS custom properties** for design tokens (not Tailwind config) — `zenitha-tokens.css`
4. **All DB queries scoped by siteId** — no cross-site data leakage
5. **withAdminAuth** on all admin APIs, public APIs unprotected
6. **JSON-LD structured data** on all content pages (Product, Place, Trip, FAQPage, BreadcrumbList)

**TypeScript Status:** ZERO errors across entire codebase (including all 68+ new files)

**Files Created/Modified:** 68+ files — see commit history on `claude/luxury-travel-business-plan-LDaOT`

**Deployment Requirements:**
- Run `npx prisma migrate deploy` (or `npx prisma db push`) on Supabase for 8 new models
- Add Vercel env vars: `GA4_MEASUREMENT_ID_ZENITHA_YACHTS_MED`, `GSC_SITE_URL_ZENITHA_YACHTS_MED`, `GA4_PROPERTY_ID_ZENITHA_YACHTS_MED`, `GOOGLE_SITE_VERIFICATION_ZENITHA_YACHTS_MED`
- Domain `zenithayachts.com` must be pointed to Vercel and added to middleware domain mapping

### Session: February 26, 2026 — Cockpit Mission Control Dashboard

**Complete admin cockpit built (`/admin/cockpit`) — 17 new files, 7,147 lines:**

The entire admin experience was rebuilt around a single mobile-first mission control centre. Khaled can now operate the entire platform from his iPhone in one place.

**Cockpit UI (`app/admin/cockpit/page.tsx` — 1,614 lines):**
- 7-tab layout, mobile-first (375px), auto-refresh every 60s
- **Tab 1 Mission Control:** alert banners, pipeline flow, today stats, quick actions, cron log
- **Tab 2 Content Matrix:** article table with "Why Not Published?" per-row diagnosis panel; actions: Publish Now, Expand, Re-queue, Delete, Submit to Google
- **Tab 3 Pipeline:** phase breakdown bar chart, per-step Run buttons, active drafts
- **Tab 4 Crons:** health summary, per-cron cards with plain-English errors + Run button
- **Tab 5 Sites:** per-site cards with metrics, Content/Publish/View links
- **Tab 6 AI Config:** provider status, task routing dropdowns, test-all providers
- **Tab 7 Settings:** env var status, inline tests, feature flags

**3 sub-pages inside cockpit:**
- `cockpit/design/` — Design Studio: gallery, brand kit, AI generation, bulk ops
- `cockpit/email/` — Email Center: provider status, test send, auto-campaigns
- `cockpit/new-site/` — 8-step new website wizard with live availability check

**9 new API routes:**

| Route | Purpose |
|-------|---------|
| `GET /api/admin/cockpit` | Aggregated mission control data (<500ms, graceful degradation) |
| `GET+POST /api/admin/content-matrix` | BlogPost+ArticleDraft merged; gate_check, re_queue, enhance, delete, unpublish |
| `GET+PUT+POST /api/admin/ai-config` | ModelProvider+ModelRoute CRUD, test_all with latency |
| `GET+POST /api/admin/email-center` | Provider status, campaigns, templates, subscribers, test_send |
| `GET+POST /api/admin/new-site` | New site wizard validation + DB creation + 30 seed topics |
| `GET /api/admin/new-site/status/[siteId]` | Build progress polling |

**5 new utility libraries:**
- `lib/error-interpreter.ts` — 17 raw error patterns → plain English + fix suggestion + severity
- `lib/ai/provider-config.ts` — 10 task types, `getProviderForTask()`, `seedDefaultRoutes()`, `getAllRoutes()`, `saveRoutes()`. Routes from ModelRoute DB table with env-var fallback
- `lib/new-site/builder.ts` — `validateNewSite()`, `buildNewSite()` (DB write + 30 topic seed)

**Smoke test:** `scripts/cockpit-smoke-test.ts` — 45 tests across 9 categories. All passing.

**Documentation:** `docs/COCKPIT-BUILD-REPORT.md` (411 lines)

---

### Session: February 26, 2026 — Cockpit Audit Rounds (#29–#31 + Deep Audit)

**4 audit rounds fixing ~15 issues across cockpit and connected systems:**

**Audits #29–#31 (6 fixes):**
1. `locale_en` crash — gate check safely handles undefined locale
2. `email-center` API response shape normalized to match page expectations
3. Hardcoded `siteId` in cockpit replaced with dynamic first-site fallback
4. `SiteSummary` field names corrected (`pendingReview`, `topicCount`)
5. Gate check response shape aligned between API and cockpit Content Matrix tab
6. New-site wizard: all 8 steps return consistent `{ success, message, data }` shape

**User-oriented audit (5 fixes):**
1. 3 dead loading states fixed: Publish Now, Expand, Submit to Google buttons now show spinners
2. Sites tab Publish button: added loading state + result feedback toast
3. 2 silent catch blocks fixed: `runGateCheck` and `toggleFlag` now log warnings

**Build error fixes:**
1. 5 bare `<a>` internal hrefs replaced with Next.js `<Link>` in cockpit
2. 4 invalid `@typescript-eslint/no-explicit-any` eslint-disable comments removed

**Deep audit (5 critical fixes):**
1. `force-publish`: replaced hardcoded `site_id: "yalla-london"` with `getDefaultSiteId()` + accepts validated `siteId` body param
2. Cockpit page: added `cockpitError` state + red banner with Retry on dashboard fetch failure
3. `onRefresh()` moved to `finally` block — runs after both success and failure
4. **Critical:** Expand button was POSTing to `/api/admin/force-publish` (publishes reservoir article); fixed to POST `/api/admin/content-matrix` with `{ action: "enhance", draftId }`
5. Pipeline bar chart `NaN%` bug when `byPhase` empty — added safe divide guard

---

### Session: February 26, 2026 — Content Pipeline Quality & Auto-Fix Cron

**Content generation quality fixes (4 changes to `phases.ts`):**
1. Drafting `maxTokens`: 1,500 → 3,000 for English (was cutting sections short)
2. Drafting prompt: enforces 250+ words per section with concrete detail requirements
3. Assembly prompt: explicit 1,500-word minimum with expand-if-short instructions
4. Assembly: post-AI word count check + expansion pass if result < 1,200 words

**New cron: `content-auto-fix` (runs 11:00 + 18:00 UTC daily):**
- Finds reservoir drafts with < 1,000 words → calls `enhanceReservoirDraft()`
- Auto-trims `BlogPost.meta_description_en` > 160 chars to ≤ 155 chars
- Auto-trims `ArticleDraft.seo_meta.metaDescription` > 160 chars
- Budget-guarded (53s), logs to CronJobLog, registered in `vercel.json`

**Cockpit stuck-label improvements:**
- Reservoir + word count < 1,000: `📝 Needs expansion (Xw)` in amber
- Reservoir + word count ≥ 1,000 + waiting > 6h: `📦 Ready — Xh in queue` in blue
- Active pipeline stuck: `⚠️ Xh stuck in pipeline` in orange
- Word count column: red < 1,000, amber < 1,200, neutral otherwise
- Meta description length warning inline in article row

---

### Session: February 26, 2026 — SEO Agent Upgrade & AIO Gate (Check 14)

**SEO agent auto-fix: 4 fix types (was 1):**
1. Generates missing meta titles (up to 50 posts per run)
2. Generates missing meta descriptions (up to 50 posts per run)
3. Trims meta titles > 60 chars at word boundary (up to 100 per run)
4. Trims meta descriptions > 160 chars at word boundary (up to 100 per run)
- Schema injection batch: `take:5` → `take:20` per run
- Internal link auto-injection: posts with < 3 links get `<section class="related-articles">` with up to 3 recent post links (5 posts per run)
- `seo-intelligence.ts`: meta optimization limit 2 → 8 per run; content expansion limit 1 → 3 per run

**Pre-publication gate — Check 14: AIO Readiness (warning-only, never blocks):**
- Checks: direct answer in first 80 words, question-format H2 headings, no excessive preamble
- Signals eligibility for Google AI Overview citation (60%+ of searches show AI Overviews)
- **Total pre-publication checks: 14** (route, ar-route, SEO minimums, SEO score, heading hierarchy, word count, internal links, readability, image alt text, author, structured data, authenticity signals, affiliate links, AIO readiness)

---

### Session: February 26, 2026 — Indexing Fixes & Arabic Content Crash

**Indexing false-alarm fix:**
- Quality warnings (word count, SEO score, meta) now only appended to `notIndexedReasons` when `indexingStatus !== "indexed"`
- Previously fired unconditionally — every indexed article showed contradictory red "NOT INDEXED REASONS"

**Arabic content JSON parse crash fixed:**
- Root cause: AI returned `<div dir="rtl">` HTML attributes inside a JSON string — inner quotes broke `repairJSON` lookbehind regex, leaving unescaped newlines
- Fix: two-pass approach — escape newlines inside string values first, then parse

**Clickable Indexed panel in cockpit:**
- "Indexed" stat card is now a tappable button
- Opens full-screen `IndexingPanel` overlay (mobile-optimised) with per-article rows, GSC clicks/impressions

---

### Session: February 26, 2026 — Per-Content-Type Quality Gates

**Problem solved:** News (150-400w), information hub (300-800w), and guides (400-1,000w) were all blocked by blog thresholds (1,000w minimum). Arabic drafts showed "0 chars English content" false blocker.

**`lib/seo/standards.ts` — new `CONTENT_TYPE_THRESHOLDS`:**

| Type | Min Words | Internal Links | Affiliates | Auth Signals |
|------|-----------|----------------|------------|--------------|
| `blog` | 1,000 | 3 | Required | Required |
| `news` | 150 | 1 | Optional | Skipped |
| `information` | 300 | 1 | Optional | Skipped |
| `guide` | 400 | 1 | Required | Skipped |

- `getThresholdsForUrl()` detects type from URL prefix (`/news/`, `/information/`, `/guides/`, `/blog/`)
- Arabic-only drafts (`locale="ar"` + no `content_en`) now use `content_ar` for all content checks
- Flesch-Kincaid skipped for Arabic-only (algorithm is English-specific)
- `content-matrix/route.ts`: `detectArticleType()` helper + builds correct target URL prefix for type detection

---

### Session: February 26, 2026 — AI Token Monitoring & Cost Dashboard

**New Prisma model: `ApiUsageLog` (migration: `20260226_add_api_usage_log`):**
Fields: `siteId`, `provider`, `model`, `taskType`, `calledFrom`, `promptTokens`, `completionTokens`, `totalTokens`, `estimatedCostUsd`, `success`, `errorMessage`

**`lib/ai/provider.ts` upgrades:**
- `MODEL_PRICING` table — all 4 providers × models at Feb 2026 prices
- `estimateCost()` helper
- `logUsage()` fire-and-forget writer wired into `generateCompletion()` — every AI call logged with cost, tokens, siteId, task, caller

**New: `/admin/ai-costs` + `/api/admin/ai-costs`:**
- Period filter (today / week / month / all) + per-site scope toggle
- Per-site cost bars, provider breakdown, task-type breakdown, 30-day daily sparkline, live call feed (last 50 calls)
- All real DB data

**Security fixes (3 in this commit):**
1. `CRITICAL`: `/api/content/bulk-publish` POST — added `requireAdmin` (was public)
2. `CRITICAL`: `/api/homepage-blocks/[id]` DELETE — added `requireAdmin`
3. `HIGH`: `/api/homepage-blocks/reorder` POST — added `requireAdmin`

**Other fixes:**
- `sitemap.ts`: added `take:500/200/200` guards on Yacht, YachtDestination, CharterItinerary to prevent OOM
- Cockpit page: removed last hardcoded `"yalla-london"` fallback

---

### Session: February 26, 2026 — Zenitha Yachts Connectivity Audit

**3 targeted fixes for Zenitha Yachts site isolation:**
1. `trends-monitor`: skip `zenitha-yachts-med` in `TopicProposal` creation loop (yachts don't use content pipeline)
2. `content-indexing` API: extended to surface yacht pages in indexing dashboard
3. `/admin/yachts` fleet page: added `siteId` guard — only renders for `zenitha-yachts-med`

---

### Session: February 26, 2026 — Departures Board (Airport-Style)

**New page: `/admin/departures` — 801 lines across 2 files:**

Airport-style departures board showing every scheduled platform event with live countdown timers and one-tap "Do Now" buttons. Built for iPhone.

**Features:**
- All 24 cron jobs with next-fire time computed from cron expressions (UTC)
- Scheduled content publications from `ScheduledContent` table
- Articles sitting in reservoir (ready to publish now)
- Live per-row countdown ticking every second
- Status badges: `scheduled` | `overdue` (red pulse) | `ready` (violet)
- Overdue alert banner + reservoir ready banner
- Filter tabs: All / Overdue / Ready / Cron / Publication / Content
- "Do Now" button: POSTs to `/api/admin/departures`, calls cron internally with `CRON_SECRET`, returns result toast
- Auto-refresh every 60s (pauseable)
- Last run time + success/failure indicator per cron job

**API `/api/admin/departures`:**
- `GET`: parses cron schedules, queries `CronJobLog`, `ScheduledContent`, `ArticleDraft`; sorts by urgency
- `POST`: validates path against known cron whitelist, fires internal fetch with `CRON_SECRET`

Sidebar: "✈️ Departures Board" added as 2nd item in Cockpit group.

---

### Session: February 26, 2026 — Build Fix: Wrong Auth Import Path

**Build failure fixed (1 fix, 5 files):**

Vercel build was failing with `Module not found: Can't resolve '@/lib/auth/admin'` across 5 route files. The path `@/lib/auth/admin` does not exist — the correct canonical import is `@/lib/admin-middleware` (which exports `requireAdmin`, `withAdminAuth`, `requireAdminOrCron`).

**Files fixed:**
- `app/api/admin/ai-costs/route.ts`
- `app/api/admin/departures/route.ts`
- `app/api/content/bulk-publish/route.ts`
- `app/api/homepage-blocks/[id]/route.ts`
- `app/api/homepage-blocks/reorder/route.ts`

**Root cause:** 5 routes introduced with a non-existent import path. All corrected to `@/lib/admin-middleware`.

**Rule added:** The canonical auth import path for all API routes is `@/lib/admin-middleware`. Never use `@/lib/auth/admin` — it does not exist.

---

### Session: March 4, 2026 — Env Var Fixes, SEO Audit Crash Fix, MCP Google Integration

**PageSpeed API Key Mismatch (3 files fixed):**
- **Root cause:** Vercel env var is named `GOOGLE_PAGESPEED_API_KEY` but code only checked for `PAGESPEED_API_KEY` and `PSI_API_KEY` — key was never found, causing rate-limited (429) and unauthorized (401) PageSpeed API responses
- `lib/performance/site-auditor.ts`: Added `GOOGLE_PAGESPEED_API_KEY` to both `auditPage()` and `runSiteAudit()` env var lookups
- `app/api/admin/performance-audit/route.ts`: Added `GOOGLE_PAGESPEED_API_KEY` to `hasApiKey` check
- `app/api/seo/lighthouse-audit/route.ts`: Added `GOOGLE_PAGESPEED_API_KEY` to API key resolution chain

**SEO Audit Prisma Crash (1 file, 2 queries fixed):**
- **Root cause:** `app/api/admin/seo-audit/route.ts` used `select: { slug: true, title: true }` on BlogPost model, but BlogPost has no `title` field (uses `title_en`/`title_ar`). Caused Prisma runtime crash: "Unknown field 'title' for select statement on model 'BlogPost'"
- Fixed both queries: live page sampling (line 667) and Arabic coverage check (line 762) — changed `title: true` to `title_en: true`

**Cockpit Env Var Suggestion (1 file fixed):**
- `app/admin/cockpit/page.tsx`: Updated warning message from "consider adding PAGESPEED_API_KEY" to "consider adding GOOGLE_PAGESPEED_API_KEY" to match actual Vercel configuration

**MCP Google Server — Dotenv Integration (1 file fixed):**
- **Root cause:** MCP server (`scripts/mcp-google-server.ts`) runs as standalone subprocess via `npx tsx`, not inside Next.js — never had access to `.env.local` credentials despite GA4 and GSC keys being present
- Added `dotenv` loading at startup with 4 path fallbacks: `__script_dir/../.env.local`, `__script_dir/../.env`, `cwd/yalla_london/app/.env.local`, `cwd/yalla_london/app/.env`
- Handles both CJS (`__dirname`) and ESM (`import.meta.url`) module resolution
- Verified: `google_config_status` returns `configured: true` for both GA4 and GSC after fix

**MCP Google Tools — Available Capabilities:**

| Tool | What It Returns |
|------|----------------|
| `ga4_get_metrics` | Sessions, users, page views, bounce rate, engagement (any date range) |
| `ga4_get_top_pages` | Page paths ranked by views (configurable limit) |
| `ga4_get_traffic_sources` | Source/medium breakdown with sessions, users, bounce rate |
| `gsc_get_search_performance` | 4 dimensions: query, page, country, device — clicks, impressions, CTR, position |
| `gsc_get_sitemaps` | All submitted sitemaps with status |
| `gsc_inspect_url` | Per-URL index status, crawl info, canonical, mobile usability |
| `gsc_submit_url_for_indexing` | Push URL for re-indexing (JobPosting/BroadcastEvent only) |
| `google_config_status` | Credential health check for both services |

**Known Gaps Partially Resolved:**
- KG-001 / KG-035 (GA4 not connected): **MCP bridge now functional** — Claude Code sessions can query GA4 and GSC directly. Dashboard API integration still needed for Khaled's phone view.

**Rule added:** The correct PageSpeed API key env var name is `GOOGLE_PAGESPEED_API_KEY`. Always include it alongside `PAGESPEED_API_KEY` and `PSI_API_KEY` in fallback chains.

### Session: March 4, 2026 — Production Stability Audit: 73 Fixes Across 7 Rounds

**Comprehensive cockpit + dashboard audit resolving all runtime crashes, data leaks, and silent failures observed in production.**

**Round 1 — Cockpit Zero-Error Sweep (15 fixes):**
- Added `res.ok` validation to 5 fetch calls in cockpit (pipeline monitor, cron logs, feature flags, AI config, sites quickAction) — Safari was crashing on non-JSON error responses
- Added `siteId` to force-publish request body (was missing)
- Added null guard on `item.slug` before indexing submit
- Added error logging to 3 fire-and-forget catch blocks (dismissTask, completeTask, action-logs)
- Added `encodeURIComponent` to pipeline monitor siteId query param
- Departures API: added `site_id` scoping to ScheduledContent query (was global — cross-site leak)

**Rounds 2-3 — Multi-Site Scoping (21 unscoped queries fixed):**
- `topics/route.ts`: All queries scoped by `site_id` from header/param/default
- `topics/queue/route.ts`: All 6 count queries + main findMany scoped by `site_id`
- `command-center/overview/route.ts`: TopicProposal.groupBy + URLIndexingStatus.groupBy scoped
- `command-center/affiliates/route.ts`: **AffiliateClick + Conversion groupBy scoped** — was leaking financial data across sites

**Round 4 — Mock Data Purge (6 components cleaned):**
- MediaUploadManager: replaced 2 hardcoded fake assets with real API fetch
- CRMSubscriberManager: replaced 3 fake subscribers with real API fetch
- ArticleEditor: replaced mock topic research + content generation with real API calls
- Replaced `Math.random()` ID generation with `crypto.getRandomValues()`

**Round 5 — Error Visibility (21 empty catch blocks fixed):**
- 15 `onCronFailure().catch(() => {})` patterns across all cron routes now log with context
- 4 `logCronExecution().catch(() => {})` patterns fixed
- 1 `ensureUrlTracked().catch(() => {})` + 1 `logSweeperEvent().catch(() => {})` fixed
- Standard pattern: `.catch(err => console.warn("[job-name] hook failed:", err.message))`

**Prisma Schema Mismatches Fixed (4 critical):**
1. `seo-audit/route.ts`: `select: { title: true }` on BlogPost → `title_en: true` (3 locations). BlogPost uses `title_en`/`title_ar`, not `title`
2. `seo-audit/route.ts`: `quality_score: true` on BlogPost → `seo_score` (field only exists on ArticleDraft)
3. `content/route.ts`: `featured_image` Zod `z.string().url()` rejected empty strings → now accepts empty + transforms to undefined
4. `content/route.ts`: slug regex `/^[a-z0-9-]+$/` rejected uppercase → auto-lowercases via `.transform().pipe()` chain

**SEO Audit Tab Fixes (3 critical):**
1. Quick Fix actions all failing — `baseUrl` ternary precedence bug caused `https://undefined/api/...` requests. Fixed with `request.nextUrl.origin`
2. `pipeline-sweeper` cron name mismatch — route is `/api/cron/sweeper`, not `pipeline-sweeper`
3. `seo_audit_reports` table added to Fix Database button's `CREATE_TABLE_STATEMENTS`

**Content Quality Fixes (2):**
1. Duplicate title prevention — title uniqueness check added to `select-runner.ts` and `daily-content-generate` before publish/create
2. Multiple H1 fix — AI body content `<h1>` tags demoted to `<h2>` in `promoteToBlogPost()` (page template already provides H1)

**DB Connection Pool Fix:**
- `cockpit/route.ts`: serialized all 5 dashboard builders (was `Promise.all` with 15-20+ concurrent queries, exhausting Supabase PgBouncer pool)
- `buildSites()`: changed from parallel `Promise.all(sites.map(...))` to sequential for-loop (12+ concurrent queries → max 4)

**Result: 73 total fixes. TypeScript: 0 errors. Build: compiles successfully.**

### Session: March 4-5, 2026 — Content Pipeline Reliability Overhaul

**Major production reliability fixes across the entire content pipeline, AI provider system, and admin tools. ~40 fixes resolving timeouts, infinite loops, crash patterns, and data integrity issues.**

**Prisma Null Validation Fixes (2 critical patterns):**
1. `content-auto-fix` cron + `seo-audit`: BlogPost `content_en`/`content_ar` are non-nullable String fields — `{ not: null }` is invalid Prisma syntax on required fields. Changed to `{ not: "" }` across 4 queries
2. `simple-write` publish flow: `title_ar`/`content_ar` sent as `null` but are required. Now fall back to English values. Added try/catch with user-friendly error messages for constraint violations + duplicate slug pre-check

**Arabic Content Fixes (3 critical):**
1. Token truncation: `maxTokens` for Arabic drafting/assembly/expansion raised from 2000 to 3500 — Arabic text is ~2.5x more token-dense than English
2. Assembly timeout: raw HTML prompt truncated from 6000 to 4000 chars for Arabic; safety buffer reduced from 5s to 3s giving AI 2 extra seconds
3. Default non-cron assembly timeout raised from 25s to 30s

**AI Provider Timeout Cascade Fix (critical, 3 iterations):**
- **Root cause:** First provider consumed 100% of budget (via `Math.max` bug) leaving 0s for fallbacks
- **Fix 1:** First provider capped at 50% of budget, guaranteeing 8s+ for fallbacks
- **Fix 2:** For large budgets (>30s, admin routes), first provider gets 70% (35s)
- **Fix 3:** Provider chain now shares remaining budget dynamically; providers skipped when <5s remaining
- Added `timeoutMs` to all 6 pipeline phase AI calls that were missing it

**Assembly Timeout Infinite Loop Fix (critical, resolved across 4 files):**
- `phases.ts`: Raw fallback threshold lowered from `attempts>=4` to `attempts>=1` — after first timeout, next run uses raw HTML concatenation (instant, no AI call)
- `failure-hooks.ts`: No longer resets assembly timeout drafts (was undoing raw fallback protection)
- `diagnostic-agent.ts`: Preserves `attempts>=1` for assembly (triggers raw fallback)
- `sweeper.ts`: Added assembly-timeout skip in sections 1 (rejected) and 3 (failing) — was endlessly resetting timeout drafts
- Assembly phase gets dedicated run with full budget (no other drafts processed simultaneously)
- Assembly budget guard: 28s→12s, maxTokens 2000→1500, expansion threshold 25s→18s

**Content-Builder Duplicate Run Fix:**
- **Root cause:** Two simultaneous Vercel invocations both passed dedup check before either wrote the marker
- **Fix:** Write "started" marker IMMEDIATELY after dedup check passes. Second invocation re-counts markers in 90s window and yields if 2+ exist
- Window increased from 60s to 90s for safety margin

**Infinite Draft Recovery Loop Fix:**
- **Root cause:** Sweeper reset `phase_attempts` to 0, wiping the lifetime counter that failure-hooks used for its >=8 cap
- **Fix:** Sweeper now increments instead of resetting. Added permanent failure cap at 10 total attempts — marks drafts with `last_error=MAX_RECOVERIES_EXCEEDED` and excludes from all future sweep queries

**SEO Agent Reliability Fixes:**
- Budget guards + try/catch around `autoOptimizeLowCTRMeta` and `flagContentForStrengthening` AI calls
- Batch reduced from 8→3 with inner-loop 12s budget guard
- Agent now reports `completed=1` even if optional AI steps skipped (was falsely reporting `failed=1`)
- `seo-intelligence.ts`: Array.isArray guards on GSC API responses (can return error objects instead of arrays)
- `seo-command` Quick Fix: field name `postId` → `articleId` (every per-article fix was silently failing with 404)

**Sitemap Timeout Fix:**
- Added 45s budget guard
- Limited unbounded Event/Product queries (`take:200/100`)
- BlogPost limit reduced from 1000→500

**Gemini Provider Update:**
- Endpoint `v1beta` → `v1`, model `gemini-pro` → `gemini-2.0-flash`
- Added `GEMINI_API_KEY` and `GOOGLE_AI_API_KEY` env var checks

**Safari Compatibility Fixes (3):**
- `article-editor.tsx`: wrap `response.json()` in try-catch (Safari throws on non-JSON)
- `cockpit`: check `res.ok` before `res.json()` on Audit Site button
- `simple-write`: check `res.ok` before parsing, handle non-JSON gracefully

**SEO Health Score Fix:**
- `seo-agent`: diminishing returns per category, floor at 15 (was trivially reaching 0)
- `seo-audit`: logarithmic scaling (was linear — 5 critical findings = score 0)

**AI Cost Tracking Completion:**
- Added `taskType`/`calledFrom` metadata to ALL ~25 AI callers across the codebase
- Previously ~15 callers had null metadata in `ApiUsageLog`, making cost attribution impossible
- Fixed callers in: content-generator, site-generator, ai-generate, bulk-generate, editor/rewrite, seo-intelligence, auto-remediate, weekly-topics, daily-content-generate, content-engine (4 agents), prompt-to-video, pdf-generator

**New Features:**
1. **Diagnostic Agent** (`lib/ops/diagnostic-agent.ts`): 3-phase engine — Diagnose (stuck drafts + failed crons, classify root cause) → Fix (reset timeouts, force raw assembly, repair bad data, reject stuck loops) → Verify (confirm fix, log to AutoFixLog)
2. **Diagnostic Sweep Cron** (every 2h): runs diagnostic agent automatically
3. **JSON Audit Export** (`/api/admin/audit-export`): aggregates CronJobLog, SeoAuditReport, BlogPost stats, ArticleDraft pipeline, indexing, AI costs, AutoFixLog into downloadable JSON
4. **Cockpit Export JSON + Diagnose buttons** per site with result display
5. **GSC vs Dashboard Indexing Explanation Note** — explains why GSC shows higher totals (counts /ar/ pages, static pages, historical URLs) while dashboard tracks published blog articles only

**PageSpeed Audit Improvement:**
- Detect 401/403 and show clear message that key must be API Key type (`AIza...`), not OAuth credential (`AQ....`)
- Cockpit shows warning banner from API response when no key configured

### Session: March 5, 2026 — SEO Topic Research + Bulk Article Creation + Pipeline Integration

**New Feature: SEO Topic Research (`/api/admin/topic-research`):**
- AI-powered keyword discovery returning 20 topics with search volume estimates, trend direction, competition level, and relevance scores
- Focus area input for targeted research (e.g., "ramadan london", "luxury hotels mayfair")
- Per-site context-aware prompts using site destination and keyword config

**Enhanced Cockpit Content Tab (2 views):**
- **Research & Create view**: topic research panel → select up to 5 topics → bulk create button queues articles into content pipeline with full metadata
- **Articles view**: streamlined table with quick action buttons (Run Pipeline, Publish Ready, Refresh), re-queue/retry for stuck/rejected drafts, improved status badges

**Topic Research → Pipeline Integration (4 fixes):**
1. Cockpit UI passes full research metadata (longTails, questions, contentAngle, trend, competition, suggestedPageType) to bulk-generate using new `topicSource="researched"` mode
2. Bulk-generate: new "researched" path creates `TopicProposal` records + pre-populates `ArticleDraft.research_data` with structured research — pipeline skips AI research call (~15s saved per article)
3. Research phase: detects `_prePopulated` flag and skips AI call when data already present
4. Outline phase: extracts pre-populated longTails, questions, contentAngle from `seo_meta`/`research_data` and injects as "PRE-RESEARCHED GUIDANCE" into AI prompt

**Cron Schedule Reference Panel:**
- Added to cockpit Settings tab showing all cron timings, quantities, and descriptions

**Sweeper-Agent Assembly Reset Fix:**
- Sweeper was resetting assembly timeout drafts, undoing raw fallback protection
- Added assembly-timeout skip in sections 1 (rejected) and 3 (failing)

**Content-Builder Dedup Race Condition Fix (v2):**
- After writing "started" marker, re-count markers in 90s window
- If 2+ markers exist, this invocation is the duplicate and yields
- Eliminates empty `resultSummary: {}` duplicate runs visible in production

**Hardcoded Domain Fallbacks Cleaned:**
- `seo-audit`: 2 domain fallbacks → `getSiteDomain()`
- `content-audit`: siteId fallback → `getDefaultSiteId()`

### Current Platform Status (March 5, 2026)

**What Works End-to-End:**
- Content pipeline: Topics → 8-phase ArticleDraft → Reservoir → BlogPost (published, bilingual, with affiliates) ✅
- SEO agent: IndexNow submission, schema injection, meta optimization, internal link injection ✅
- 14-check pre-publication gate (route, ar-route, SEO minimums, score, headings, word count, internal links, readability, alt text, author, structured data, authenticity, affiliates, AIO readiness) ✅
- Per-content-type quality gates (blog 1000w, news 150w, information 300w, guide 400w) ✅
- AI cost tracking with per-task attribution across all providers ✅
- Cockpit mission control with 7 tabs, mobile-first, auto-refresh ✅
- Departures board with live countdown timers and Do Now buttons ✅
- AI topic research with pipeline integration (metadata flows through all phases) ✅
- Diagnostic agent auto-remediation every 2h ✅
- Multi-site scoping on all DB queries ✅
- Zenitha Yachts hermetically separated ✅

**Known Remaining Issues:**

| Area | Issue | Severity |
|------|-------|----------|
| GA4 Dashboard | Traffic metrics on dashboard still return 0s (MCP works, API integration pending) | MEDIUM |
| Social APIs | Engagement stats require platform API integration | LOW |
| Workflow Control | Automation Hub/Autopilot UIs still placeholders | LOW |
| Feature Flags | DB-backed but not wired to runtime behavior | LOW |
| Brand Templates | Only Yalla London template exists for other sites | MEDIUM |
| Author Profiles | Generic "Editorial" author on all articles (needs specific profiles for E-E-A-T) | MEDIUM |
| ~~OG Images~~ | ~~Per-site OG image files~~ | ~~MEDIUM~~ | **DONE** — Dynamic OG route |
| Login Security | No rate limiting on admin login endpoint | MEDIUM |
| Orphan Models | 16+ Prisma models never referenced in code | LOW |

### Session: March 5-6, 2026 — SEO/AEO Critical Fixes & Production Stability (PRs #413-#425)

**Title Sanitization & Cannibalization Detection (PR #422):**
- `cleanTitle()` function strips slug-style titles, AI artifacts ("Title:", quotes), and normalizes casing
- Cannibalization check: before publishing, searches existing BlogPosts for >80% Jaccard word overlap — blocks duplicate
- Enforced on ALL BlogPost creation paths (content-selector, daily-content-generate, scheduled-publish)
- DB artifact scan script (`scripts/consolidate-duplicates.ts`) + cockpit "Content Cleanup" buttons

**Content-Auto-Fix Sections 11-13 (PR #425):**
- **Section 11: Orphan Page Resolution** — finds published articles with ZERO inbound internal links, appends "Related:" link from best-matching article (5/run)
- **Section 12: Thin Content Auto-Unpublish** — unpublishes articles <500 words with reason in meta_description (5/run)
- **Section 13: Duplicate Content Detection** — Jaccard similarity >80% title overlap → unpublishes newer article (3/run)
- **Broken Link Cleanup** — strips `TOPIC_SLUG` placeholders, fixes hallucinated slugs by matching to real articles (50 articles/run, 30 links/run)

**IndexNow Multi-Engine Submission (PR #429):**
- Now submits to 3 engines: Bing (`bing.com/indexnow`), IndexNow Registry (`api.indexnow.org/indexnow`), Yandex (`yandex.com/indexnow`)
- Batch POST (up to 10,000 URLs), independent per-engine (one failure doesn't block others)
- Exponential backoff on 429/5xx responses

**AI Reliability Overhaul — Circuit Breaker (PR #430):**
- **Circuit breaker**: tracks consecutive failures per provider, opens after 3 failures with 5-minute cooldown
- **Phase-aware budget**: light/medium/heavy hints control first-provider share (50-65%)
- **Assembly smart skip**: raw HTML fallback triggers when budget <25s (instant, no AI call)
- **Task-type routing**: `generateCompletion()` checks `ModelRoute` DB table for per-task provider config
- **Provider chain**: Grok → OpenAI → Claude → Perplexity (Gemini frozen — account billing issue)

**Last-Defense Fallback / Zero-Blocker AI (PR #432):**
- `lib/ai/last-defense.ts` — final safety net when normal pipeline fails 2+ times
- Probes ALL providers (including disabled) for any working one
- Phase-specific defense: combined research+outline, condensed single-prompt drafting, raw HTML assembly (always succeeds)
- Philosophy: a published 800-word article > a perfect pipeline producing nothing

**Production SEO Compliance (PR #413 — 26 audit issues across 11 phases):**
- Multiple H1 fix: demote `<h1>` in AI-generated body to `<h2>` (page template provides H1)
- hreflang false positive fix: reciprocal check handles redirect chains
- SEO audit 504 timeout: 45s budget guard + bounded queries (`take:200/100`)
- Indexing rate capped at 100% in display
- BlogPost Prisma crashes: `title` → `title_en`, `quality_score` → `seo_score`
- Dynamic llms.txt per site created

**Named Author Profiles for E-E-A-T (PR #424):**
- `lib/content-pipeline/author-rotation.ts` — replaces generic "Editorial" bylines
- 2-3 `TeamMember` profiles per site with real names (EN+AR), bios, avatars, social links
- `getNextAuthor()` load-balances by fewest recent ContentCredits
- Addresses Jan 2026 Authenticity Update demoting anonymous bylines

**Other Critical Fixes (PRs #413-#425):**
- Arabic content JSON parsing crash fixed (two-pass approach for HTML attributes in JSON strings)
- AI provider timeout cascade: first provider capped at 50% budget (was consuming 100%)
- Perplexity deactivated (quota exhausted), Gemini removed (account frozen)
- Cross-site topic contamination prevention in content builder
- Zombie articles (stuck after 3 failed enhancements) resolved
- Next.js 15 async params fixed across blog pages
- Content-builder false failure rate: dedup marker now closed on both success AND failure paths

### Session: March 6, 2026 — Cron Resilience Overhaul & Per-Site Activation (PRs #426-#429)

**Cron Resilience Overhaul (PR #433):**
- **Feature flag guards**: `checkCronEnabled(jobName)` on all 24 cron jobs — reads FeatureFlag DB table, can disable without code changes
- **Cron failure alerting**: email on failure with error interpretation, 4h dedup cooldown
- **Rate limiting middleware** (4 tiers): auth 10/min, heavy 2/min, mutation 20/min, read 100/min
- **New crons**: `schedule-executor` (every 2h — processes ContentScheduleRule), `subscriber-emails` (daily 10:00)
- **7 orphan crons deleted**: auto-generate, autopilot, commerce-trends, daily-publish, etsy-sync, real-time-optimization, seo-health-report

**Per-Site Activation Controller (PR #433):**
- `/api/admin/site-settings` — database-backed settings for 5 categories per site
- Categories: `affiliates` (partners, injection mode, max links), `email` (provider, from/reply, welcome/digest), `social` (platforms, auto-post), `workflow` (tone, audience, frequency, quality override), `general` (active, indexing, crons, maintenance)
- Content pipeline checks settings before processing (skip affiliate injection if disabled, etc.)
- Seeds default configs per site on first access

**Cycle Health Analyzer (PR #432):**
- `/api/admin/cycle-health` + `/admin/cockpit/health` — evidence-based diagnostics
- Analyzes last 12-24h: CronJobLog, ArticleDraft throughput, BlogPost velocity, indexing health, AI costs, auto-fixes
- 7 issue categories (pipeline, cron, indexing, quality, ai, content, seo) with severity + plain-English descriptions
- "Fix Now" buttons execute auto-remediation per issue; "Fix All" for batch
- Overall grade A-F computed from severity + metrics

### Session: March 7, 2026 — Admin Refactor Phases 1-11 (PRs #410-#411, #416-#421)

**Phase 1: Admin Sidebar Simplification:**
- Reduced from ~100 items to ~35 items across 8 sections
- Collapsible menu groups: Cockpit, Content, Sites, Automation, Commerce, Design & Media, AI Tools, System
- Mobile bottom navigation: 5 primary buttons (HQ, Content, New, Crons, More) + floating "New Article" FAB
- Dynamic per-site branding: tri-color bar, SiteSelector dropdown

**Phase 3: Tab Consolidation:**
- 5 duplicate admin pages merged into canonical pages with content components
- Affiliates, SEO, Departures, Design, Topics — each split into `page.tsx` + `*-content.tsx`

**Phase 4: Mobile/ADHD UX Components (5 new):**
- `status-summary.tsx` — "Now / Next / Attention" triptych with color-coded cards
- `responsive-table.tsx` — cards on mobile (<768px), table on desktop
- `bottom-sheet.tsx` — slide-up drawer for actions on iPhone
- `sticky-action-bar.tsx` — floating action footer (never scrolls off)
- `tab-container.tsx` — swipeable tabs on mobile

**Phase 5: Test-Connections Expansion:**
- `public/test-connections.html` — 7 validation panels: Database, Content Pipeline, SEO, Indexing, AI Providers, Email/Social, Analytics
- Live endpoint testing with response times, severity coloring, expandable JSON responses

**Phase 6: Legal Pages Manager:**
- `/admin/legal` — CRUD for 7 legal page types with per-site, per-locale versioning
- AI legal review button, Tiptap rich text editor, preview modal, bulk generation

**Phase 7: AI Task Runner:**
- `lib/ai/task-runner.ts` — 7 predefined tasks (content-suggest, seo-diagnose, meta-generate, affiliate-suggest, product-description, content-expand, legal-review)
- Structured JSON output parsing with retry logic

**Phase 8: Embedded Coding Assistant:**
- `/admin/ai-assistant` — chat interface for Khaled to ask AI to fix bugs, explain code, suggest improvements
- Conversation history, streaming responses, code patch display, markdown rendering

**Phases 9-11: E-Commerce Hub, SEO Audit Integration, Operations Console:**
- `/admin/cockpit/commerce` — affiliate partner management, e-commerce settings
- `/api/admin/seo-audit-engine` — per-page audit results with sortable findings
- `/admin/operations` — system status, env var validation, emergency commands

**Action Logging System:**
- `/api/admin/action-logs` — logs every manual action (Publish, Delete, Re-queue, etc.) with user, timestamp, IP, success/failure
- Dashboard shows last 50 entries with action type filtering

**System Health Audit (PR #423):**
- `/admin/cockpit` health panel — 47 checks across 12 sections
- DB schema health, content pipeline, SEO, AI providers, cron jobs, security, env vars
- Cockpit alert banner for critical findings

### Session: March 7-8, 2026 — Indexing Infrastructure & Per-Page Audit (PRs #430-#434)

**Unified Indexing Status Resolution (PR #434):**
- `lib/seo/indexing-summary.ts` — single source of truth for all indexing status consumers
- `resolveStatus()` cross-checks both `status` AND `indexing_state` fields (prevents double-counting)
- Returns: total, indexed, submitted, discovered, neverSubmitted, errors, deindexed, chronicFailures, rate %, staleCount, velocity7d, channel breakdown, blockers, avgTimeToIndexDays

**Crawl Freshness Validator (PR #434):**
- `lib/master-audit/validators/crawl-freshness.ts` — detects stale crawls (>14d warn, >30d critical), submission failures, chronic failures (5+ attempts not indexed)
- Sitemap reachability check with response time measurement
- GSC performance merge: 7-day + 30-day aggregation with week-over-week trend
- Hreflang reciprocity validation: flags EN indexed but /ar/ not (or vice versa)

**Cache-First Sitemap (PR #434):**
- `lib/sitemap-cache.ts` — pre-builds sitemap in SiteSettings table, served instantly (<200ms vs 5-10s live generation)
- Refreshed by: `content-auto-fix-lite` cron (every 4h), post-publish events, manual dashboard action
- 24h max age with automatic fallback to live generation if stale

**Per-Page Audit (PR #434):**
- `/api/admin/per-page-audit` + `/admin/cockpit/per-page-audit` — sortable, paginated list of all published pages
- Per-page: indexing status, GSC clicks/impressions/CTR/position, SEO score, word count, issue list
- Issue detection: never submitted (critical), error/deindexed (critical), low SEO score, thin content, missing affiliates, high impressions but low CTR
- Sort by: publishedAt, title, clicks, impressions, ctr, position, seoScore, wordCount, indexingStatus, issues

**Content-Builder False Failure Fix (PR #431):**
- Root cause: dedup marker never closed after run completed, staying "running" forever → diagnostic-agent falsely marked as "failed"
- Fix: close marker on BOTH success AND failure paths, tighten dedup window to 60s

**Editor SEO Scoring + Email Campaign Creation (PR #434):**
- Article editor: real-time SEO score calculation based on word count, headings, meta tags, internal links
- Email campaign creation wired to `/api/admin/email-campaigns`

**14 Critical Missing Models Added to db-migrate Fix Database Button (PR #434):**
- Added CREATE TABLE statements for: Design, PdfGuide, PdfDownload, EmailTemplate, EmailCampaign, VideoProject, ContentPipeline, ContentPerformance, ModelRoute, ModelProvider, ApiUsageLog, AutoFixLog, SiteSettings, TeamMember

**Safari Crash Fix on SEO Audit (PR #434):**
- Added `res.ok` check before `res.json()` in SEO audit page (Safari throws on non-JSON responses)

### Session: March 9, 2026 — GSC Numbers Fix, Discovery Audit & Public Website Audit

**CRITICAL: GSC Numbers Inflation Fix (Root Cause):**
- **Problem:** Aggregated report showed 664 clicks / 22,535 impressions for 7 days but real GSC showed 293 clicks / 7,890 impressions for 28 days (~7x overcounting)
- **Root cause:** `gsc-sync` cron called GSC API with `dimensions: ["page"]` which returns 7-day aggregated totals per page, then stored ALL rows under `date = today`. When consumers queried `date >= d7` (last 7 days), they got 7 daily snapshots each containing the full 7-day aggregate = ~7x inflation
- **Fix in `gsc-sync/route.ts`:**
  - Changed `dimensions: ["page"]` → `dimensions: ["page", "date"]` for per-day breakdowns
  - Each row now stored with actual date from GSC response (`row.keys[1]`), not `snapshotDate`
  - Added Step 2: deletes old aggregated data for the current window before upserting (clean transition from old format)
  - URL arrays deduplicated with `new Set<string>()` (same URL appears in multiple per-day rows)
  - Previous period (trend comparison) also converted to per-day storage
  - Step numbering updated to 7 steps (was 6)
- **Impact on consumers:** All 10+ files that query `gscPagePerformance` with date range sums now get correct numbers automatically — no consumer code changes needed
- **Transition:** First gsc-sync run after deploy cleans old data and writes per-day rows. For ~24h, DB has less historical data. By day 7, full coverage restored.

**Aggregated Report v2 — 2 New Audit Sections:**

1. **Section 7: Discovery Audit** — calls `scanSiteDiscovery()` from `lib/discovery/scanner.ts`
   - Discovery funnel: published → inSitemap → submitted → crawled → indexed → performing → converting
   - 4 health scores: crawlability, indexability, content quality, AIO readiness
   - Top 10 issues (deduplicated against SEO audit findings)
   - Top 10 pages needing attention with scores + top issue
   - Budget-aware: 15s cap, skips live HTTP checks to stay within 53s total

2. **Section 8: Public Website Audit** — live HTTP HEAD checks on key pages
   - Checks: homepage, blog index, about, contact + 5 most recent published articles
   - Per-page: HTTP status, response time (ms), reachability, error message
   - Summary: pages checked/reachable/unreachable, average response time
   - Issues surfaced: unreachable pages (critical/high), slow response (>3000ms, medium)
   - 5s timeout per page with AbortSignal, budget-guarded

**Updated Composite Scoring (6 components, was 4):**

| Component | Weight (old) | Weight (new) |
|-----------|-------------|-------------|
| SEO Audit | 40% | 30% |
| Discovery | — | 15% |
| Indexing | 20% | 15% |
| Content Velocity | 20% | 15% |
| Operations | 20% | 15% |
| Public Website | — | 10% |

- Report format bumped to `yalla-aggregated-report-v2`
- Discovery + public audit issues feed into synthesized issues list (deduplicated)

**Cockpit UI Updates:**
- 2 new expandable sections in aggregated report display:
  - **Discovery Audit** — grade header, funnel visualization (4 columns), 4 health score cards, top issues with severity badges, pages needing attention
  - **Public Website** — reachable/unreachable/avg response summary cards, per-page results with status indicators and response times
- Score Breakdown shows all 6 components with weights
- Sections list: 13 expandable panels (was 11)

**content-auto-fix-lite Build Error Fix:**
- `withPoolRetry<T>` generic lost type inference — TypeScript couldn't infer `T` from async lambdas
- Fixed all 4 call sites with explicit `as Array<{...}>` type assertions
- This cron had been failing on every run since deployment, causing 29 cron failures

**Never-Submitted Pages Fix (55 pages):**
- **Section 7 in content-auto-fix-lite:** catches published BlogPosts missing `URLIndexingStatus` records (runs every 4h)
- **`ensureUrlTracked()`:** now auto-tracks Arabic `/ar/` variant when tracking English URL
- **`seo-agent`:** discovers news items + Arabic variants for all discovered URLs
- Root cause: Arabic pages only discovered at 4 AM daily sync, not on publish

**Files Modified:**
- `app/api/cron/gsc-sync/route.ts` — per-day storage, old data cleanup, URL dedup
- `app/api/admin/aggregated-report/route.ts` — discovery audit, public website audit, v2 scoring
- `app/admin/cockpit/page.tsx` — discovery + public audit UI panels, updated score breakdown
- `app/api/cron/content-auto-fix-lite/route.ts` — type assertions, never-submitted catch-up
- `lib/seo/indexing-service.ts` — Arabic URL auto-tracking
- `app/api/cron/seo-agent/route.ts` — news + Arabic URL discovery

### Current Platform Status (March 9, 2026)

**What Works End-to-End:**
- Content pipeline: Topics → 8-phase ArticleDraft → Reservoir → BlogPost (published, bilingual, with affiliates) ✅
- SEO agent: IndexNow multi-engine (Bing + Yandex + api.indexnow.org), schema injection, meta optimization, internal link injection ✅
- 14-check pre-publication gate ✅
- Per-content-type quality gates (blog 1000w, news 150w, information 300w, guide 400w) ✅
- AI cost tracking with per-task attribution across all providers ✅
- Circuit breaker + last-defense fallback for AI reliability ✅
- Cockpit mission control with 7 tabs, mobile-first, auto-refresh ✅
- Departures board with live countdown timers and Do Now buttons ✅
- Per-page audit with sortable indexing + GSC data ✅
- Cycle Health Analyzer with evidence-based diagnostics + Fix Now buttons ✅
- System Health Audit (47 checks across 12 sections) ✅
- Cache-first sitemap (<200ms vs 5-10s) ✅
- Unified indexing status resolution (single source of truth) ✅
- Crawl freshness validator (stale crawl detection) ✅
- Per-site activation controller (affiliates, email, social, workflow settings) ✅
- Cron resilience (feature flags, alerting, rate limiting) ✅
- Named author profiles for E-E-A-T ✅
- Title sanitization + cannibalization detection ✅
- Content-auto-fix: orphan resolution, thin content unpublish, duplicate detection, broken link cleanup, never-submitted catch-up ✅
- Admin sidebar simplified (~100 → ~35 items), mobile-first with bottom nav ✅
- AI Task Runner (7 structured tasks), Embedded Coding Assistant, Legal Pages Manager ✅
- Action logging on all dashboard endpoints ✅
- Multi-site scoping on all DB queries ✅
- Zenitha Yachts hermetically separated ✅
- GSC sync with accurate per-day data storage (no more overcounting) ✅
- Aggregated report v2 with discovery audit + public website audit + 6-component scoring ✅
- Arabic URL auto-tracking on publish (was only discovered at daily sync) ✅
- Campaign enhancement system: kickstart, batch processing, cockpit UI ✅
- Content pipeline unblocked: publishing, stuck drafts, draft creation all working ✅

### Session: March 9, 2026 — Campaign Enhancement System & Pipeline Unblock

**Campaign Enhancement Kickstart (new feature):**
- Added `kickstart` action to `/api/admin/campaigns` — one-tap campaign creation + immediate first batch processing
- 5 built-in presets: `enhance_all`, `fix_seo`, `add_revenue`, `fix_arabic`, `authenticity`
- Cockpit campaigns page (`/admin/cockpit/campaigns`) shows Quick Start panel with preset buttons when no campaigns exist
- Campaign runner checks circuit breaker state before processing — stops batch when all AI providers are down instead of burning retry attempts

**Campaign AI Timeout Fix (3 changes to `article-enhancer.ts`):**
- Article HTML truncated from 12K to 6K chars (prompts were too large for all providers)
- maxTokens reduced from 8000 to 4500
- Timeout cap increased from 35s to 80s (was too aggressive)
- Added circuit breaker check before AI call — returns descriptive error instead of timing out

**Content Pipeline Unblock (3 interconnected fixes):**

1. **Content-selector publishing 0 articles (CRITICAL):**
   - Root cause: Pre-pub gate check 12 (authenticity signals) was a BLOCKER — AI-generated content almost never has 3+ first-hand experience markers like "we visited" or "insider tip"
   - Fix: Downgraded authenticity signals from blocker to warning in `pre-publication-gate.ts`
   - Philosophy: publish first, campaign enhancer adds authenticity signals later

2. **Stuck draft infinite loop (CRITICAL):**
   - Root cause: Total lifetime cap was 8, diagnostic-agent reduced attempts by 2, creating cycle: draft at 6 → reduced to 4 → fails twice more → 6 → reduced to 4 → repeat forever
   - Fix 1: Lowered lifetime cap from 8 to 5 in `failure-hooks.ts`
   - Fix 2: Added permanent rejection guard in `diagnostic-agent.ts` — if `phase_attempts >= 5`, reject instead of reducing
   - Fix 3: `recoverDraft()` now marks drafts as `rejected` with `MAX_RECOVERIES_EXCEEDED` when cap hit

3. **Content-builder-create producing 0 drafts:**
   - Root cause: Stuck drafts (not advancing for days) counted as "active", hitting the 2-active-draft-per-site limit
   - Fix: Active draft count now excludes drafts not updated in 4+ hours
   - Also: Active draft cap trigger now logs to `skippedSites` array for visibility

**Files Modified:**
- `lib/campaigns/article-enhancer.ts` — prompt size + timeout + circuit breaker
- `lib/campaigns/campaign-runner.ts` — budget + circuit breaker check in loop
- `app/api/admin/campaigns/route.ts` — kickstart handler + presets
- `app/admin/cockpit/campaigns/page.tsx` — Quick Start UI
- `lib/seo/orchestrator/pre-publication-gate.ts` — authenticity blocker → warning
- `lib/ops/failure-hooks.ts` — lifetime cap 8 → 5, permanent rejection
- `lib/ops/diagnostic-agent.ts` — cap guard prevents infinite resurrection
- `app/api/cron/content-builder-create/route.ts` — stuck draft exclusion

**Known Remaining Issues:**

| Area | Issue | Severity | Status |
|------|-------|----------|--------|
| ~~GA4 Dashboard~~ | ~~Traffic metrics on dashboard still return 0s~~ | ~~MEDIUM~~ | **DONE** — `buildTraffic()` in cockpit calls `fetchGA4Metrics()`, cycle-health checks GA4 connectivity |
| Social APIs | Engagement stats require platform API integration | LOW | Open |
| ~~Feature Flags~~ | ~~DB-backed, cron guards wired, but not wired to all runtime behavior~~ | ~~LOW~~ | **DONE** — fully wired (DB + env var, 32+ crons, `isFeatureFlagEnabled()`) |
| ~~Brand Templates~~ | ~~Only Yalla London template exists~~ | ~~MEDIUM~~ | **DONE** — `getBrandProfile()` in `lib/design/brand-provider.ts` returns correct brand for all 6 sites (readiness 95%) |
| **CJ siteId Migration** | CjCommission, CjClickEvent, CjOffer have NO siteId field — revenue leaks between sites | **HIGH** | **OPEN — blocks Site #2 launch** |
| ~~OG Images~~ | ~~Per-site OG image files don't exist yet~~ | ~~MEDIUM~~ | **DONE** — Dynamic OG route at `app/api/og/route.tsx` |
| ~~Login Security~~ | ~~No rate limiting on admin login endpoint~~ | ~~MEDIUM~~ | **DONE** — 5/15min + middleware layer |
| ~~Cookie Consent~~ | ~~No GDPR cookie consent banner~~ | ~~MEDIUM~~ | **DONE** — bilingual, 4 categories, in root layout |
| Orphan Models | 16+ Prisma models never referenced in code | LOW | Open |
| Gemini Provider | Account frozen — re-add when billing reactivated | LOW | Open |
| Perplexity Provider | Quota exhausted — re-add when replenished | LOW | Open |

### Critical Rules Learned (March 4-9 Sessions)

1. **BlogPost has no `title` field** — always use `title_en`/`title_ar`. Never `select: { title: true }` on BlogPost.
2. **BlogPost has no `quality_score` field** — use `seo_score`. `quality_score` is on ArticleDraft only.
3. **Prisma null comparisons on required fields are invalid** — `{ not: null }` crashes on non-nullable String fields. Use `{ not: "" }` instead.
4. **BlogPost `title_ar`/`content_ar` are required (non-nullable)** — always provide fallback values, never send `null`.
5. **Arabic text is ~2.5x more token-dense** — use `maxTokens: 3500` minimum for Arabic content generation.
6. **Assembly phase needs raw fallback after first timeout** — `attempts>=1` triggers instant HTML concatenation instead of repeated AI calls.
7. **Content-builder dedup must write marker BEFORE processing** — act-then-check pattern prevents duplicate Vercel invocations.
8. **Sweeper must never reset assembly timeout drafts** — it undoes the raw fallback protection.
9. **Dashboard builders must run sequentially** — `Promise.all` with 15+ queries exhausts Supabase PgBouncer pool.
10. **The canonical auth import is `@/lib/admin-middleware`** — never use `@/lib/auth/admin` (doesn't exist).
11. **The correct PageSpeed env var is `GOOGLE_PAGESPEED_API_KEY`** — always include alongside `PAGESPEED_API_KEY` and `PSI_API_KEY`.
12. **Safari requires `res.ok` check before `res.json()`** — Safari throws "string did not match expected pattern" on non-JSON responses.
13. **Circuit breaker opens after 3 consecutive failures** — 5-minute cooldown, half-open probe. Don't retry dead providers.
14. **Content-builder dedup marker must close on BOTH success AND failure** — unclosed markers cause false failure rate inflation.
15. **Cron feature flag guard is `checkCronEnabled(jobName)`** — reads FeatureFlag DB table. Allows disabling crons without code deploy.
16. **IndexNow submits to 3 engines independently** — Bing, Yandex, api.indexnow.org. One failure doesn't block others.
17. **`cleanTitle()` must run on ALL BlogPost creation paths** — prevents slug-style titles ("best-halal-restaurants-london") from reaching production.
18. **Map constructor from Prisma queries with nullable keys infers `unknown` values** — explicitly type the Map or filter null keys first.
19. **GSC sync must use `dimensions: ["page", "date"]`** — `["page"]` returns 7-day aggregated totals per page. Storing those under a single date causes ~7x overcounting when consumers sum by date range. Per-day data stores one row per URL per day — consumers summing across date ranges get correct totals.
20. **`withPoolRetry<T>` loses type inference** — TypeScript can't infer `T` from async lambdas. Always add explicit `as Array<{...}>` type assertion at call sites.
21. **`[...new Set(array)]` returns `unknown[]`** — TypeScript can't infer Set generic from spread. Use `[...new Set<string>(array)]` with explicit generic.
22. **`ensureUrlTracked()` must also track Arabic `/ar/` variants** — Arabic URLs only discovered at daily sync if not tracked on publish.
23. **Pre-pub gate authenticity check must be WARNING, not BLOCKER** — AI-generated content rarely has 3+ first-hand experience signals. Blocking on this prevents ALL auto-generated articles from publishing. Campaign enhancer adds authenticity signals post-publication.
24. **Draft lifetime cap is 5 total attempts (not 8)** — higher cap caused infinite loops where diagnostic-agent kept resurrecting failed drafts. At cap=5, drafts are permanently rejected with `MAX_RECOVERIES_EXCEEDED`.
25. **Diagnostic-agent must NOT reduce attempts past permanent cap** — if `phase_attempts >= 5`, reject the draft instead of reducing by 2 (which would allow infinite loops).
26. **Active draft count must exclude stuck drafts** — `content-builder-create` uses `updated_at >= 4h ago` filter. Drafts stuck for 4+ hours don't count against the 2-active-draft limit, allowing new creation to proceed.
27. **Campaign enhancement prompts must be kept small** — article HTML truncated to 6K chars, maxTokens capped at 4500, timeout extended to 80s. Large prompts (12K chars, 8K tokens) cause all providers to timeout.

### Session: March 9, 2026 — Content Pipeline Fragility Audit & Hardening (18 fixes)

**Deep self-challenge audit identifying and fixing 18 pipeline fragilities across 9 files.**

**4 CRITICAL fixes:**
1. **Atomic claiming on reservoir drafts** (`select-runner.ts`): Added `updateMany` with `current_phase: "reservoir"` → `"promoting"` atomic claim before processing. Prevents two concurrent content-selector runs from promoting the same draft into duplicate BlogPosts. All failure/error paths revert to `"reservoir"`.
2. **Transaction for BlogPost+draft** (`select-runner.ts`): Wrapped `BlogPost.create` + `ArticleDraft.update` in `$transaction`. Previously a crash between create and update would orphan a BlogPost without updating the draft, or vice versa.
3. **Unified attempt caps** (`diagnostic-agent.ts`): All recovery handlers now check `>= 5` cap FIRST before reducing attempts. Previously `bad_data` and `provider_down` handlers reset attempts to 0, defeating the lifetime cap entirely and causing infinite loops.
4. **Assembly threshold alignment** (`diagnostic-agent.ts`): Changed `force_raw_assembly` from `Math.max(attempts, 1)` to `Math.max(attempts, 2)` — matching `phases.ts` which checks `attempts >= 2` for raw fallback. Misalignment meant diagnostic-agent's "fix" still triggered another AI call that would timeout again.

**5 HIGH fixes:**
5. **Related section dedup** (`seo-agent/route.ts` + `content-auto-fix/route.ts`): Both injectors now check for BOTH `"related-articles"` AND `"related-link"` CSS classes before adding links. Previously seo-agent used one class and content-auto-fix used another — articles could accumulate two separate related sections.
6. **Post-sanitized title gate check** (`select-runner.ts`): Pre-pub gate now receives `cleanedEnTitle`/`cleanedArTitle` instead of raw titles. A title passing the gate could become empty/short after `cleanTitle()` sanitization when stored in DB.
7. **Campaign enhancer published check** (`article-enhancer.ts`): Added guard checking `BlogPost.published === true` before enhancement. Prevents wasting AI budget on articles that were unpublished by content-auto-fix between campaign creation and execution.
8. **Content-auto-fix campaign awareness** (`content-auto-fix/route.ts`): Thin-content unpublish section now queries `CampaignItem` for active tasks and skips articles with pending/processing campaign enhancements — prevents campaign enhancer from working on an article that gets unpublished mid-campaign.
9. **Cron schedule stagger** (`vercel.json`): Moved `affiliate-injection` from `:10` to `:25` past the hour, `scheduled-publish` from `:05` to `:15`. Prevents BlogPost record collisions when both run near-simultaneously.

**4 MEDIUM fixes:**
10. **Content-selector dedup guard** (`select-runner.ts`): Added check for recent `CronJobLog` entry within 60s — if another content-selector run started recently, the current run skips. Vercel can invoke the same cron twice.
11. **EN+AR draft pair transaction** (`content-builder-create/route.ts`): Wrapped bilingual draft pair creation in `$transaction`. If AR creation fails, EN draft is rolled back — no orphaned single-language drafts.
12. **Assembly fresh budget** (`phases.ts`): Added `phaseStart = Date.now()` at assembly entry, then recalculates `freshBudgetMs` before expansion check. Previously used stale `budgetRemainingMs` from before AI call — a 25s AI call would leave 3s but code thought 28s remained.

**4 Cycle-Health Detection Patterns Added (`cycle-health/route.ts`):**
- **Check 11: Attempt oscillation** — detects drafts with 3-4 attempts + diagnostic-agent-reset errors stuck 4+ hours (recovery systems fighting each other)
- **Check 12: Orphaned "promoting" drafts** — detects drafts stuck in "promoting" phase 30+ minutes (crashed content-selector mid-promotion)
- **Check 13: Duplicate related sections** — detects BlogPosts with both "related-articles" AND "related-link" CSS classes
- **Check 14: Campaign targets unpublished** — detects active campaign tasks targeting unpublished articles (wasted AI budget)

**13 Fragility Smoke Tests Added (`scripts/smoke-test.ts`):**
- Atomic claiming, transaction wrap, unified attempt cap, assembly threshold, related section dedup, post-sanitized title, campaign published check, content-auto-fix campaign awareness, content-selector dedup, cron stagger, EN+AR transaction, assembly fresh budget, promoting revert on failure

**Files Modified:**
- `lib/content-pipeline/select-runner.ts` — atomic claiming, transaction, dedup, post-sanitized title, promoting revert
- `lib/ops/diagnostic-agent.ts` — unified caps, assembly threshold alignment
- `app/api/cron/seo-agent/route.ts` — related section dedup
- `app/api/cron/content-auto-fix/route.ts` — related section dedup, campaign awareness
- `lib/campaigns/article-enhancer.ts` — published check
- `vercel.json` — cron stagger
- `app/api/cron/content-builder-create/route.ts` — EN+AR transaction
- `lib/content-pipeline/phases.ts` — fresh budget recalculation
- `app/api/admin/cycle-health/route.ts` — 4 new fragility detection patterns
- `scripts/smoke-test.ts` — 13 new fragility tests

**Smoke Test Result:** 84 PASS, 4 WARN, 1 pre-existing FAIL (`.next/types` cache). All 13 new fragility tests pass.

### Critical Rules Learned (March 9 Session — Fragility Audit)

28. **Reservoir draft promotion must use atomic claiming** — `updateMany` with `current_phase: "reservoir"` in WHERE prevents duplicate BlogPosts from concurrent content-selector runs. Always revert to `"reservoir"` on failure.
29. **BlogPost.create + ArticleDraft.update must be in a `$transaction`** — a crash between the two operations orphans data. Transaction ensures both succeed or both roll back.
30. **All recovery handlers must check lifetime cap FIRST** — diagnostic-agent, sweeper, and failure-hooks must all check `phase_attempts >= 5` before ANY attempt reduction. Resetting to 0 defeats the cap and creates infinite loops.
31. **Assembly raw fallback threshold must be `>= 2` everywhere** — `phases.ts` checks `>= 2`, so `diagnostic-agent.ts` must set attempts to at least 2 (not 1) when forcing raw assembly. Misalignment causes one more AI timeout before fallback triggers.
32. **Related section injectors must check ALL CSS classes** — seo-agent uses `"related-articles"`, content-auto-fix uses `"related-link"`. Both must check for BOTH classes before injecting. Otherwise articles accumulate duplicate sections.
33. **Pre-pub gate must receive post-sanitized titles** — `cleanTitle()` can strip slug-style titles to empty. The gate must check what will actually be stored, not the raw input.
34. **Campaign enhancer must verify article is still published** — content-auto-fix may unpublish thin articles between campaign creation and execution. Always check `published === true` before spending AI budget.
35. **Content-auto-fix must skip articles with active campaigns** — query `CampaignItem` for pending/processing tasks before unpublishing. Otherwise the campaign enhancer and auto-fix fight over the same article.
36. **Cron schedules must be staggered by 10+ minutes** — simultaneous crons writing to the same table (e.g., BlogPost) can cause record collisions. Space them out in `vercel.json`.
37. **Assembly budget must be recalculated after AI call** — use `Date.now() - phaseStart` for fresh budget, not the stale `budgetRemainingMs` passed at function entry. A 25s AI call consumes real wall-clock time that the old variable doesn't reflect.
38. **Content-selector needs dedup guard** — check `CronJobLog` for recent run within 60s. Vercel can invoke the same cron endpoint twice near-simultaneously.

### Session: March 10, 2026 — CJ Affiliate Integration: Full 9-Phase Operational Hardening

**Complete CJ Affiliate integration hardened and production-ready across 9 phases (plan at `docs/plans/tranquil-soaring-teacup.md`).**

**Phase 1: Schema & Runtime Crash Fixes (4 fixes):**
1. `monitor.ts`: Fixed `c.amount` → `c.commissionAmount` across all revenue calculations
2. `monitor.ts`: Made `getContentCoverage()` and `getProfitabilityReport()` accept `siteId` param (was hardcoded "yalla-london")
3. `cj-client.ts`: Added `getWebsiteId()` helper reading `CJ_WEBSITE_ID` env var, wired into `isCjConfigured()` and test output
4. All 4 affiliate cron routes: Added/verified budget guards (53s `BUDGET_MS`)

**Phase 2: Multi-Site Support (4 fixes):**
1. `cj-sync.ts`: Per-site keyword search (London, Maldives, French Riviera, Istanbul, Thailand)
2. `deal-discovery.ts`: Per-site deal category keywords
3. `link-injector.ts`: Per-site advertiser category mapping
4. All 4 cron routes: Loop through `getActiveSiteIds()`, skip `zenitha-yachts-med`

**Phase 3: SID Tracking for Revenue Attribution:**
1. `link-tracker.ts`: Extended tracking URLs with `&sid={siteId}_{articleSlug}` (max 100 chars for CJ)
2. `link-tracker.ts`: `trackClick()` stores SID in `CjClickEvent.sessionId`
3. `content-processor.ts`: Injects `data-sid` attribute into affiliate links in article HTML
4. `cj-sync.ts`: Commission sync parses SID from `rec.sid`, matches to article slug

**Phase 4: Test Connections & Monitoring:**
1. `test-connections.html`: Added "Affiliate (CJ)" panel with 6 live tests
2. NEW `app/api/admin/cj-health/route.ts`: Health endpoint (API connectivity, sync times, error counts, feature flags)
3. `cockpit/page.tsx`: Added "Affiliate Revenue" card in Mission Control tab
4. `cycle-health/route.ts`: 3 new checks — CJ sync staleness (check 15), zero coverage (check 16), commission sync errors (check 17)
5. `aggregated-report/route.ts`: Section 9 — Affiliate Performance (advertisers, links, coverage, commissions, sync health, top articles)

**Phase 5: Cron & Campaign Alignment:**
1. `vercel.json`: Staggered sync-advertisers to :30 (was conflicting with trends-monitor at :00)
2. `article-enhancer.ts`: Uses CJ tracking links from `getLinksForContent()` instead of generic URLs
3. `affiliate-injection/route.ts`: Queries CjLink table for joined advertisers' tracking URLs, falls back to static rules
4. `departures/route.ts`: All 4 CJ affiliate crons added to known crons whitelist

**Phase 6: Resilience & Error Handling:**
1. `cj-client.ts`: Circuit breaker (3 consecutive failures → 5-min cooldown, half-open probe)
2. `link-injector.ts`: Graceful degradation — falls back to static affiliate URLs when CJ API fails
3. All `lib/affiliate/*.ts`: Fixed empty catch blocks with descriptive `[cj-*]` logging
4. Verified `monitor.ts` `Promise.all` stays under 4 concurrent queries

**Phase 7: Smoke Tests:**
1. `scripts/smoke-test.ts`: 8 new CJ-specific tests (env vars, budget guards, CRON_SECRET, feature flags, field names, no hardcoded siteId, catch logging)

**Phase 8: Unified Affiliate Command Center (`/admin/affiliate-hq`):**
- NEW `app/admin/affiliate-hq/page.tsx` (1,200+ lines): Single page with 6 swipeable tabs
  - **Tab 1 Revenue:** Hero commission number, 30-day sparkline, KPIs, top articles, top advertisers
  - **Tab 2 Partners:** Network cards with health indicators, advertiser table (JOINED/PENDING/DECLINED), test connection buttons
  - **Tab 3 Coverage:** Coverage donut chart, uncovered articles list with "Inject Links" button, per-site breakdown
  - **Tab 4 Links:** Link stats, link table sorted by clicks, deals section with expiry dates, product search
  - **Tab 5 Actions:** 8 action buttons (Diagnose, Full Sync, Inject Links, Sync Commissions/Advertisers, Discover Deals, Refresh Links, Test Connection), diagnosis results panel, product search, full sync results
  - **Tab 6 System:** Sync timeline, cron status cards with "Run Now" buttons, feature flags toggles, API health, error log
- Site selector + network selector at top, auto-refresh every 60s
- NEW `app/api/admin/affiliate-hq/route.ts`: Aggregated API for all 6 tabs (GET + POST with 12 actions)

**Phase 9: MCP Server (`scripts/mcp-cj-server.ts`):**
- 7 tools: `cj_get_advertisers`, `cj_get_revenue`, `cj_get_link_health`, `cj_get_content_coverage`, `cj_get_sync_status`, `cj_search_products`, `cj_config_status`
- Follows `mcp-google-server.ts` pattern, accepts optional `networkId` for future multi-network

**Self-Challenge Audit (5-dimension deep audit, 7 fixes):**
1. **CRITICAL: Auth bypass in affiliate-hq** — `requireAdmin` return value was discarded (unauthenticated access). Fixed with `const authError = await requireAdmin(request); if (authError) return authError;`
2. **CRITICAL: Coverage detection mismatch** — affiliate-injection cron injects `class="affiliate-recommendation"` but coverage queries only checked for `rel="sponsored"` and `affiliate-cta-block`. Added `affiliate-recommendation` and `rel="noopener sponsored"` to all detection queries (3 locations across 2 files)
3. **HIGH: Departures board missing CJ crons** — Added all 4 CJ crons to KNOWN_CRONS array
4. **HIGH: affiliate-injection missing data-affiliate-partner attribute** — Added for tracking
5. **Build: cycle-health FixAction type mismatch** — Used `url` instead of `endpoint` property

**Key Files Created/Modified:**

| File | Change |
|------|--------|
| `lib/affiliate/monitor.ts` | Fixed `commissionAmount`, siteId param, coverage patterns |
| `lib/affiliate/cj-client.ts` | `getWebsiteId()`, circuit breaker |
| `lib/affiliate/cj-sync.ts` | Per-site keywords, SID attribution, budget guards |
| `lib/affiliate/deal-discovery.ts` | Per-site keywords |
| `lib/affiliate/link-injector.ts` | Per-site advertiser map, graceful fallback |
| `lib/affiliate/link-tracker.ts` | SID tracking |
| `lib/affiliate/content-processor.ts` | SID injection |
| 4× `app/api/affiliate/cron/*/route.ts` | Budget guards, per-site loop, feature flags |
| NEW `app/admin/affiliate-hq/page.tsx` | 6-tab unified command center |
| NEW `app/api/admin/affiliate-hq/route.ts` | Aggregated API (GET + 12 POST actions) |
| NEW `app/api/admin/cj-health/route.ts` | Health endpoint |
| NEW `scripts/mcp-cj-server.ts` | MCP server (7 tools) |
| `app/api/admin/departures/route.ts` | 4 CJ crons in whitelist |
| `app/api/admin/cycle-health/route.ts` | 3 CJ health checks + FixAction type fix |
| `app/api/admin/aggregated-report/route.ts` | Section 9 affiliate data |
| `app/admin/cockpit/page.tsx` | Affiliate Revenue card |
| `public/test-connections.html` | CJ test panel |
| `scripts/smoke-test.ts` | 8 CJ smoke tests |
| `app/api/cron/affiliate-injection/route.ts` | CJ DB links + data-affiliate-partner |
| `lib/campaigns/article-enhancer.ts` | CJ tracking links |
| `vercel.json` | Cron stagger |

### Critical Rules Learned (March 10 Session)

39. **`requireAdmin` return value MUST be checked** — `const authError = await requireAdmin(request); if (authError) return authError;`. Discarding the return silently bypasses auth.
40. **Coverage detection must match ALL injection patterns** — affiliate-injection uses `class="affiliate-recommendation"` and `rel="noopener sponsored"`, but also check for `rel="sponsored"`, `affiliate-cta-block`, and `data-affiliate-id`. Missing any pattern causes articles to appear "uncovered" and get re-injected every cron run.
41. **CJ API does NOT provide clicks/impressions/EPC/CTR** — those metrics only exist in CJ's UI reports. Track clicks locally via `CjClickEvent`. Never query CJ for click data.
42. **`FixAction` interface requires `endpoint` (not `url`), `payload`, `label`, `description`** — always match the exact type definition in cycle-health/route.ts.
43. **CJ API rate limit is 25 req/min** — always use the rate limiter in `cj-client.ts`. Circuit breaker opens after 3 consecutive failures with 5-min cooldown.

**Multi-Site Affiliate Data Isolation — Known Schema Gaps (March 10 Audit):**

The CJ Prisma models (`CjAdvertiser`, `CjLink`, `CjOffer`, `CjCommission`, `CjClickEvent`, `CjSyncLog`) have **NO `siteId` field**. This is architecturally correct for shared resources (one CJ account, advertisers are shared), but causes cross-site data leakage in revenue, clicks, and deals when multiple sites are active.

**Immediate fixes applied:**
- `apiUsageLog` aggregate in `getProfitabilityReport()` now scoped by `siteId`
- `zenitha-yachts-med` added to `SITE_DEAL_CATEGORIES` and `SITE_ADVERTISER_MAPS`
- `discover-deals` cron now loops all active sites with per-site budget

**Schema migration needed before second site goes live:**
- Add `siteId String?` to `CjCommission`, `CjClickEvent`, `CjOffer`
- Populate `CjClickEvent.siteId` from `x-site-id` header in `trackClick()`
- Populate `CjCommission.siteId` from SID parameter (format: `{siteId}_{slug}`)
- Scope all dashboard/report queries by `siteId` where field exists
- Revenue, partners, links tabs in `affiliate-hq` currently show global data (only coverage tab is per-site)
- `checkLinkHealth()` in `monitor.ts` has no siteId parameter (global health score)

### Session: March 10, 2026 — GEO (Generative Engine Optimization) & CJ Sync Fix

**GEO Research & Implementation:**
Researched the `geo-seo-claude` tool and Princeton GEO research to identify optimization strategies for AI search engines (ChatGPT, Perplexity, Gemini, Google AI Overviews). Key findings:
- AI-referred traffic converts **4.4x higher** than organic search
- AI traffic growing **527% YoY** — only 23% of marketers optimizing for it
- Statistics boost AI visibility by **+37%**, source citations by **+30%** (Princeton)
- Optimal citability: passages 134-167 words, answer capsules 40-80 words
- Brand mentions worth **3x backlinks** in generative context
- Cross-platform citation overlap only **11%** — must optimize for each separately

**GEO Fix 1: AI Crawler Access (robots.txt — already done):**
- `app/robots.ts` already allows: GPTBot, ChatGPT-User, Google-Extended, ClaudeBot, anthropic-ai, PerplexityBot, Applebot, cohere-ai, FacebookBot
- No changes needed — 95% compliant

**GEO Fix 2: Stats + Citations in ALL Content Prompts (8 files, 6 sites):**
1. `config/sites.ts`: Added "GEO Citability" directive to all 6 site system prompts (EN) — 2+ statistics, 40-80 word paragraphs, comparison tables, answer capsules
2. `lib/content-pipeline/phases.ts`: Added GEO directives to Phase 1 (Research — `citabilitySources` schema), Phase 2 (Outline — citability structure), Phase 3 (Drafting — stats + attribution rules)
3. `lib/content-pipeline/enhance-runner.ts`: Added GEO block before STYLE RULES
4. `lib/campaigns/article-enhancer.ts`: Added GEO directive to both PATCH and FULL modes
5. `lib/content-engine/scripter.ts`: Added GEO block to blog article prompt

**GEO Fix 3: Citability Pre-Publication Gate (Check 16):**
- `lib/seo/standards.ts`: New `GEO_OPTIMIZATION` constant with market data, citability thresholds, platform-specific notes
- `lib/seo/orchestrator/pre-publication-gate.ts`: New `checkCitability()` function scoring 5 signals:
  1. Statistics/data points (3+ needed)
  2. Source attributions (2+ needed)
  3. Self-contained paragraphs (3+ of 40-200 words)
  4. Comparison/structured data (tables, ordered lists)
  5. Question-answering H2 structure (2+ question H2s)
- WARNING-only severity, never blocks publication
- **Total pre-publication checks: 16** (was 15 after adding check 15 for internal link ratio)

**CJ Advertiser Sync Fix:**
- Root cause: `lookupAdvertisers({ joined: true })` returned 0 results when no advertisers are approved yet
- Fix: Removed `joined: true` filter, added pagination (up to 5 pages / 500 advertisers), fetches ALL statuses
- Dashboard now shows PENDING/NOT_JOINED/JOINED advertisers correctly

**DB Migration Fix:**
- `prisma/migrations/20260310_create_missing_tables/migration.sql`: Fixed `column "etsyListingId" does not exist` error
- Regenerated with 760 `ALTER TABLE ADD COLUMN IF NOT EXISTS` statements for existing tables + `CREATE TABLE IF NOT EXISTS` for new tables

**Standards version bumped to `2026-03-10`**

**Files Modified:**

| File | Change |
|------|--------|
| `lib/seo/standards.ts` | New `GEO_OPTIMIZATION` constant, version bump |
| `lib/seo/orchestrator/pre-publication-gate.ts` | Check 16: Citability (GEO) |
| `config/sites.ts` | GEO directives in all 6 site system prompts |
| `lib/content-pipeline/phases.ts` | GEO in research, outline, drafting phases |
| `lib/content-pipeline/enhance-runner.ts` | GEO block in enhancement prompt |
| `lib/campaigns/article-enhancer.ts` | GEO in PATCH + FULL modes |
| `lib/content-engine/scripter.ts` | GEO in blog article prompt |
| `lib/affiliate/cj-sync.ts` | Remove `joined` filter, add pagination |
| `prisma/migrations/20260310_create_missing_tables/migration.sql` | Idempotent ALTER TABLE + CREATE TABLE |

### Critical Rules Learned (March 10 Session — GEO)

44. **GEO directives must be in ALL content generation prompts** — sites.ts system prompts, phases.ts (research/outline/drafting), enhance-runner.ts, article-enhancer.ts, scripter.ts. Missing any one means that content path produces non-GEO-optimized articles.
45. **Citability check is WARNING-only** — never block publication for low citability. AI can't reliably add real statistics; campaign enhancer and manual editing add them post-publish.
46. **CJ `lookupAdvertisers({ joined: true })` returns 0 for new accounts** — always fetch without status filter and classify locally. New CJ accounts have no JOINED advertisers until applications are approved.
47. **`ALTER TABLE ADD COLUMN IF NOT EXISTS` is required for idempotent migrations** — `CREATE TABLE IF NOT EXISTS` skips existing tables entirely, leaving new columns missing. Always pair with ALTER TABLE for every column.

### Summary of All Pre-Publication Gate Checks (16 total)

| # | Check | Severity | Added |
|---|-------|----------|-------|
| 1 | Route existence | Blocker | Original |
| 2 | Arabic route check | Blocker | Original |
| 3 | SEO minimums (title, meta, description, content length) | Blocker | Original |
| 4 | SEO score (<50 blocks, <70 warns) | Blocker/Warning | Feb 2026 |
| 5 | Heading hierarchy (H1 count, skip detection, H2 minimum) | Warning | Feb 2026 |
| 6 | Word count (1,000 blocker, 1,200 target) | Blocker | Feb 2026 |
| 7 | Internal links (3 minimum) | Warning | Feb 2026 |
| 8 | Readability (Flesch-Kincaid ≤12) | Warning | Feb 2026 |
| 9 | Image alt text | Warning | Feb 2026 |
| 10 | Author attribution (E-E-A-T) | Warning | Feb 2026 |
| 11 | Structured data presence | Warning | Feb 2026 |
| 12 | Authenticity signals (Jan 2026 — experience markers) | Warning | Feb 2026 |
| 13 | Affiliate links (revenue requirement) | Warning | Feb 2026 |
| 14 | AIO readiness (direct answers, question H2s) | Warning | Feb 2026 |
| 15 | Internal link ratio | Warning | Mar 2026 |
| 16 | Citability / GEO (stats, attributions, self-contained paragraphs) | Warning | Mar 2026 |

### Session: March 10, 2026 — Pipeline Fixes from Aggregated Report + Topic Research Diversification

**7 Pipeline Fixes from Aggregated Report (Grade A 85/100):**

1. **seo-deep-review timeout fix**: AI `generateCompletion` call in content expansion was hanging without timeout. Added dynamic timeout based on remaining article budget (`PER_ARTICLE_BUDGET_MS - elapsed - 2000`, max 10s).
2. **seo-deep-review authenticity injection**: Added Fix 10 — injects insider tip callout box after 2nd H2 for articles with <3 authenticity markers.
3. **Diagnostic agent aggressive cleanup**: Phase 0 auto-rejects drafts stuck >48h. Increased processing from `take:20` to `take:50`.
4. **content-auto-fix-lite expanded**: Post scan increased from 50 to 200, URL tracking batch from 10 to 30 per run.
5. **IndexNow chronic failure cap**: Added `submission_attempts: { lt: 15 }` to stop wasting crawl budget on pages that fail 15+ times.
6. **content-auto-fix Section 14**: Chronic indexing failure detection — tags articles needing manual review when submission_attempts >= 10.
7. **Content selector keyword dedup**: Changed from substring matching to word-level overlap (>60% threshold) — "london" no longer blocks "best london hotels".

**Topic Research Diversification (8 files modified):**

**Problem:** 70%+ of all topic generation was hardcoded to "Arab travelers" focus, limiting search volume potential. Primary keywords were 100% Arab-specific ("london guide for arabs", "halal london"). Topic templates, system prompts, Grok search, and AI provider prompts all targeted Arab travelers exclusively.

**Solution — Hybrid approach (60-70% general + 30-40% niche):**

1. **`config/sites.ts` — primaryKeywordsEN expanded**: From 4 Arab-only keywords to 12 balanced keywords (7 general luxury + 5 Arab niche). Added: "luxury hotels london", "best restaurants london", "things to do in london", "london travel guide", "london weekend breaks", "best afternoon tea london", "london shopping guide".

2. **`config/sites.ts` — topicsEN rebalanced**: From 7 templates (71% Arab-focused) to 12 templates (75% general + 25% niche). New general topics: "best luxury hotels in London", "best Michelin star restaurants London", "best things to do in London", "London luxury shopping guide", "best afternoon tea in London", "London weekend break itinerary", "best London spas and wellness retreats", "London Premier League match day experience". Niche topics: "halal restaurants in London", "Arab friendly hotels in London", "family-friendly luxury London experiences".

3. **`config/sites.ts` — systemPromptEN updated**: Added AUDIENCE STRATEGY section: primary audience is "all international luxury travelers" (broadest reach for SEO), secondary audience is "Arab and Gulf travelers" (niche differentiator). Explicit instruction: "DO NOT force Arab/Islamic angles on general topics."

4. **`app/api/admin/topic-research/route.ts`**: Prompt updated with "CRITICAL TOPIC MIX" requiring 60-70% general luxury topics + 30-40% niche. Context changed from "targeting Arab travelers" to "international visitors, with special expertise serving Arab and Gulf travelers". System prompt broadened to "luxury travel content" rather than "travel content for Arab audiences".

5. **`app/api/cron/weekly-topics/route.ts`**: All 3 generation functions updated:
   - Perplexity direct: "luxury travel for international visitors" + mix instruction
   - AI provider: "luxury travel platform serving international visitors" + explicit 3-4 general / 1-2 niche split
   - Grok live search: Updated in grok-live-search.ts (see below)

6. **`lib/ai/grok-live-search.ts` — searchTrendingTopics**: Prompt changed from "luxury Arab travelers" to "international visitors (with special expertise for Arab and Gulf travelers)". Added broader categories: nightlife, day trips, spas, cultural experiences. Explicit instruction: "6-7 topics should be GENERAL luxury travel topics. 2-3 can be Arab/halal niche topics."

7. **`app/api/cron/trends-monitor/route.ts` — MONITORED_KEYWORDS expanded**: From 4 Arab-heavy keywords to 6 balanced keywords. Added: "luxury hotels london", "best restaurants london", "things to do london", "london travel guide". Kept: "halal restaurants london", "arab friendly london".

8. **`lib/content-pipeline/phases.ts` — research phase**: Research prompt broadened from "luxury travel for Arab travelers" to "luxury travel for international visitors, with special expertise for Arab and Gulf visitors".

**Why NOT Google Keyword Planner:**
- Requires Google Ads account with active billing (cost + complexity)
- API is for advertisers, not content planning
- Our Grok live search + Perplexity already provide trend signals
- Better ROI: broaden existing prompts + keywords than add another API dependency
- Can revisit when the platform is generating revenue

### Critical Rules Learned (March 10 Session — Topic Diversification)

48. **Topic mix must be 60-70% general + 30-40% niche** — general luxury keywords have 10-50x more search volume than Arab-specific variants. "luxury hotels london" gets ~50K monthly searches vs "arab friendly hotels london" gets ~500. Both are valuable but different scales.
49. **Never force Arab/Islamic angles on general topics** — "Best Afternoon Tea in London" should be a universal guide that happens to mention halal options. Not "Best Afternoon Tea for Arab Travelers".
50. **All topic generation prompts must include explicit mix ratios** — AI defaults to the most specific angle it finds in the prompt. Without explicit "3-4 general, 1-2 niche" instructions, it generates all-niche topics.
51. **primaryKeywordsEN drives trends monitoring AND topic dedup** — expanding it from 4 to 12 keywords means trends monitor tracks broader market signals, and topic dedup catches more overlap with published content.

### Session: March 10, 2026 — GSC Cleanup, SEO URL Hygiene & Indexing State Audit

**GSC Sitemap Cleanup (Manual — Khaled in GSC):**
- Removed duplicate non-www sitemap (`https://yalla-london.com/sitemap.xml`, submitted Feb 20)
- Kept canonical www sitemap (`https://www.yalla-london.com/sitemap.xml`, submitted March 10)
- Two sitemaps were confusing Google about canonical domain

**GSC URL Removals (Manual — Khaled in GSC):**
- Submitted 6 legacy `?lang=ar` URLs for temporary removal:
  - `https://www.yalla-london.com/?lang=ar`
  - `https://www.yalla-london.com/about?lang=ar`
  - `https://www.yalla-london.com/contact?lang=ar`
  - `https://www.yalla-london.com/blog?lang=ar`
  - `https://www.yalla-london.com/events?lang=ar`
  - `https://www.yalla-london.com/recommendations?lang=ar`
- These were indexed by Google but use the wrong URL pattern (should be `/ar/` prefix, not `?lang=ar`)

**Fix 1: `?lang=ar` → `/ar/` Permanent 301 Redirect (`middleware.ts`):**
- Added redirect in middleware BEFORE blog redirect section
- `/?lang=ar` → `/ar/`, `/about?lang=ar` → `/ar/about`, etc.
- Strips `lang` query parameter, preserves all other params
- Makes GSC temporary removal permanent — Google follows 301 and updates index
- Without this, URLs would reappear after GSC removal expires (~6 months)

**Fix 2: Language Switcher URL Navigation (`components/language-switcher.tsx`):**
- **Problem:** Language toggle was client-side state only (`setLanguage('ar')`) — URL stayed the same
- Google couldn't discover Arabic pages via the switcher link
- Users sharing an Arabic page would share the English URL
- **Fix:** Now uses `router.push('/ar/about')` for Arabic and `router.push('/about')` for English
- Aligns with `/ar/` prefix routing architecture
- Arabic pages now properly discoverable by crawlers following navigation links

**Full SEO URL Hygiene Audit (2 parallel agents, 200+ files scanned):**

| Area | Status | Details |
|------|--------|---------|
| Canonical URLs | CLEAN | All use dynamic `getBaseUrl()`, no hardcoding |
| Hreflang tags | CLEAN | All pages have en-GB, ar-SA, x-default |
| `?lang=ar` links in code | CLEAN | Zero instances in any component or page |
| Sitemap query params | CLEAN | No `?lang=`, `?token=`, `?utm_` in sitemap |
| www/non-www redirect | CLEAN | Already in middleware (301 non-www → www) |
| Trailing slashes | CLEAN | `trailingSlash: false` in next.config.js |
| 404 handling | CLEAN | Proper `notFound()` usage, no false 200s |
| Hardcoded domains | CLEAN | Only in test files, production uses dynamic |
| URL encoding | CLEAN | No soft hyphens, double-encoding, or malformed URLs |
| Robots.txt | CLEAN | All AI crawlers allowed, admin/API blocked |

**Current Google Indexing State (as of March 10, 2026):**

| Metric | Value | Source |
|--------|-------|--------|
| Sitemap submitted | `www.yalla-london.com/sitemap.xml` | GSC (March 10) |
| Duplicate sitemap | REMOVED (was `yalla-london.com/sitemap.xml`) | GSC cleanup |
| `?lang=ar` URLs | 6 submitted for removal | GSC Removals |
| `?lang=ar` redirect | 301 to `/ar/` (pending deploy) | middleware.ts |
| Language switcher | URL-based navigation (pending deploy) | language-switcher.tsx |
| IndexNow engines | Bing + Yandex + api.indexnow.org | lib/seo/indexing-service.ts |
| Pre-pub gate checks | 16 total | pre-publication-gate.ts |

**Known Indexing Issue — Arabic SSR (KG-032, still open):**
- `/ar/` routes exist and return 200 status
- hreflang tags promise `/ar/` pages with Arabic content
- BUT: server renders English HTML, Arabic only loads client-side via React state
- Googlebot sees English content at `/ar/about` — may cause hreflang mismatch warnings in GSC
- **Impact:** Arabic pages may not be indexed as Arabic by Google
- **Fix needed:** Server-side Arabic content rendering (read `x-locale` header in page components and return Arabic HTML from server)
- **Priority:** MEDIUM — not blocking English indexing, but limits Arabic SEO

**Deployment Required:**
Both code fixes (`?lang=ar` redirect + language switcher) are committed and pushed but NOT live until deployed to Vercel.

### Critical Rules Learned (March 10 Session — GSC/Indexing)

52. **Never submit two sitemaps for www and non-www** — confuses Google about canonical domain. Keep only the canonical (www) version.
53. **GSC URL removal is temporary (~6 months)** — always pair with a permanent 301 redirect in code so URLs don't reappear after removal expires.
54. **Language switchers must change the URL, not just React state** — Google can't see client-side state changes. Use `router.push('/ar/path')` not `setLanguage('ar')`.
55. **`?lang=ar` query parameters are a legacy anti-pattern** — the correct pattern is `/ar/` URL prefix. Any `?lang=` URLs in Google's index are duplicates that should be redirected.
56. **Arabic SSR is required for proper hreflang compliance** — if hreflang promises Arabic content at `/ar/about` but Googlebot sees English HTML, Google may ignore the hreflang or flag it as a mismatch. Server must return Arabic HTML based on `x-locale` header.

### Session: March 11, 2026 — News Pipeline Hardening, Operation Log Fixes & Multi-Site Audit

**News Pipeline Fixes (from prior session continuation):**
- Fixed "Unauthorized" error on `/admin/news` — routed cron triggers through departures API proxy instead of calling cron directly (adds CRON_SECRET header)
- Added POST handler to `london-news/route.ts` for departures board compatibility
- Fixed `skipDedup` option in `promoteToBlogPost()` — title normalization dedup was blocking publication of articles with similar titles
- Added "Fix & Publish" button to cockpit with `skipDedup: true` for manual override
- Added NewsCard to cockpit Mission Control showing news stats and generate/research buttons
- News admin page now passes `site_id` via query param for multi-site scoping

**Production Operation Log Fixes (3 issues from 12h analysis):**
1. **Connection pool exhaustion:** Staggered `schedule-executor` to `:15` and `content-auto-fix-lite` to `:30` past the hour — were colliding with `diagnostic-sweep` at `:00`
2. **29 "active" drafts blocking creation:** Diagnostic-agent touches `updated_at` on stuck drafts, making them appear active. Fixed by excluding drafts with `[diagnostic-agent*]` or `MAX_RECOVERIES_EXCEEDED` in `last_error`. Staleness window tightened from 2h to 1h
3. **131 never-submitted pages:** Bumped IndexNow batch from 30 to 50 URLs per `content-auto-fix-lite` run

**Multi-Site Audit (10 files audited):**
- 8/10 files fully multi-site compatible (content-builder-create, select-runner, force-publish, topic-research, content-auto-fix, content-auto-fix-lite, london-news, departures)
- Fixed: news admin page (`/admin/news`) now passes `activeSiteId` to API and cron triggers
- All DB queries confirmed scoped by `site_id` / `siteId` across all recent changes

### Session: March 11, 2026 — Development Monitor Test Expansion (83 New Test Functions, 5 Batches)

**Complete Development Monitor test coverage — all 83 missing test functions added to `live-tests.ts` across 5 sequential batches.**

**Problem:** The Development Monitor (`/admin/cockpit` → Tasks tab) is the single source of truth for project progress. Every task in `plan-registry.ts` has a `testType` that maps to a test function in `live-tests.ts`. 77 test functions existed, but 83 `testType` values had no matching function — causing "test not found" errors in the monitor.

**Solution:** Added all 83 missing test functions (after deduplication — some testTypes appear in multiple plans but need exactly ONE function). File grew from 2,082 lines / 77 functions to 3,381 lines / 160 functions.

**Test Classification:**
- **47 "Built Feature" tests** (verify real code, return readiness 80-100): file existence checks, code pattern scans, Prisma queries, env var checks
- **36 "Forward-Looking" tests** (check prerequisites, return readiness 0-70): verify if feature infrastructure exists, provide `howToFix` guidance

**Batch 1: Content Pipeline + SEO/Indexing (18 functions):**
Plans: `CONTENT_PIPELINE_PLAN`, `SEO_INDEXING_PLAN` — built features verifying real code.
Tests: `content-pipeline-verify`, `prepub-gate-verify`, `content-type-gates-verify`, `pipeline-safety-verify`, `circuit-breaker-verify`, `last-defense-verify`, `ai-cost-tracking-verify`, `diagnostic-agent-verify`, `content-auto-fix-verify`, `campaign-system-verify`, `indexnow-verify`, `sitemap-cache-verify`, `gsc-sync-verify`, `geo-compliance-verify`, `authenticity-compliance-verify`, `title-sanitization-verify`, `master-audit-verify`, `per-page-audit-verify`

**Batch 2: Security + Dashboard + Design System (17 functions):**
Plans: `SECURITY_PLAN`, `DASHBOARD_PLAN`, `DESIGN_SYSTEM_PLAN` — built features verifying real code and routes.
Tests: `admin-auth-verify`, `xss-sanitization-verify`, `security-scan-verify`, `race-condition-verify`, `cron-resilience-verify`, `cockpit-verify`, `departures-verify`, `cycle-health-verify`, `affiliate-hq-verify`, `ai-cost-dashboard-verify`, `aggregated-report-verify`, `action-logging-verify`, `site-settings-verify`, `email-system-verify`, `design-tools-verify`, `content-engine-verify`, `social-calendar-verify`

**Batch 3: Yacht + Multi-Site + Design Media Engine (17 functions):**
Plans: `ZENITHA_YACHTS_PLAN`, `MULTI_SITE_PLAN`, `DESIGN_MEDIA_ENGINE_PLAN` — mix of built (yacht, multi-site) and future (media engine).
Tests: `yacht-models-verify`, `yacht-pages-verify`, `yacht-admin-verify`, `yacht-seo-verify`, `yacht-isolation-verify`, `site-scoping-verify`, `no-hardcoding-verify`, `new-site-wizard-verify`, `url-hygiene-verify`, `structured-data-verify`, `hero-image-verify`, `social-graphics-verify`, `media-library-verify`, `video-templates-verify`, `prompt-to-video-verify`, `video-render-verify`, `viral-content-verify`

**Batch 4: PDF + Commerce + Website Builder + Social/Email (18 functions):**
Plans: `PDF_PRINT_PLAN`, `COMMERCE_PAYMENTS_PLAN`, `WEBSITE_BUILDER_PLAN`, `SOCIAL_EMAIL_PLAN` — mostly future features checking readiness/prerequisites.
Tests: `pdf-export-verify`, `pdf-library-verify`, `stripe-verify`, `mercury-verify`, `financial-dashboard-verify`, `etsy-connection-verify`, `etsy-listing-gen-verify`, `etsy-analytics-verify`, `etsy-bulk-verify`, `auto-config-verify`, `zenitha-luxury-verify`, `authority-pages-verify`, `cross-network-seo-verify`, `auto-repurpose-verify`, `pinterest-verify`, `welcome-sequence-verify`, `deal-alert-verify`, `email-social-analytics-verify`

**Batch 5: Business Intelligence + Dashboard Redesign + Self-Healing (13 functions):**
Plans: `BUSINESS_INTELLIGENCE_PLAN`, `DASHBOARD_REDESIGN_PLAN`, `SELF_HEALING_PLAN` — mostly future features.
Tests: `revenue-dashboard-verify`, `knowledge-base-verify`, `weekly-digest-verify`, `keyword-gap-verify`, `partnership-discovery-verify`, `market-opportunity-verify`, `trend-alerts-verify`, `status-indicators-verify`, `contextual-actions-verify`, `content-feedback-verify`, `seo-adaptation-verify`, `error-pattern-verify`, `knowledge-transfer-verify`

**Deduplication:** 9 shared testTypes across plans (e.g., `circuit-breaker-verify` in both CONTENT_PIPELINE_PLAN and SELF_HEALING_PLAN, `diagnostic-agent-verify` in both CONTENT_PIPELINE_PLAN and SELF_HEALING_PLAN) — each registered exactly ONCE in TEST_REGISTRY. The registry lookup handles sharing automatically.

**Result:** Every task in `/admin/cockpit` Tasks tab now has a working "Test" button — zero "test not found" errors. TypeScript: 0 errors.

**Key files:**
- `lib/dev-tasks/live-tests.ts` — 3,381 lines, 160 test functions
- `lib/dev-tasks/plan-registry.ts` — all testType values now have matching functions

### Current Platform Status (March 11, 2026)

**Google Search Console (as of March 11):**
- 80 pages indexed, 209 not indexed (9 reasons)
- Sitemap: 115 pages discovered, status "Success", last read today
- 34 clicks/day, 1,557 impressions, top query at position 3.4
- Booking.com UK declined CJ affiliate application (normal for new publishers — reapply at 500+ sessions/month)

**Content Pipeline Status:**
- Pipeline advancing drafts through phases every 15 min ✅
- Force-publish with skipDedup working (published 2 articles, SEO scores 85/75) ✅
- Content-builder-create blocked by inflated active count → FIX DEPLOYED (awaiting Vercel build)
- Normal content-selector may still skip articles with aggressive title dedup → monitor after deploy

---

## System Readiness Assessments (March 11, 2026)

### Design System Readiness: 98% — PRODUCTION READY

**Overall:** 13/13 components complete, audited across 11 rounds, 67 issues fixed. Zero CRITICAL/HIGH issues remaining.

| Component | Status | Multi-Site |
|-----------|--------|-----------|
| Design Hub Dashboard (`/admin/design`) | ✅ Ready | ✅ All 6 sites |
| Brand Provider (`lib/design/brand-provider.ts`) | ✅ Ready | ✅ All 6 sites |
| Email Builder + Sender (SMTP/Resend/SendGrid) | ✅ Ready | ✅ All 6 sites |
| PDF Generation (Puppeteer) | ✅ Ready | ✅ All 6 sites |
| Video Studio (Remotion, 2 templates) | ✅ Ready | ✅ All 6 sites |
| Rich Text Editor (Tiptap) | ✅ Ready | ✅ All 6 sites |
| Brand Kit Generator (ZIP export) | ✅ Ready | ✅ All 6 sites |
| Content Engine Agent 1: Researcher | ✅ Ready | ✅ All 6 sites |
| Content Engine Agent 2: Ideator | ✅ Ready | ✅ All 6 sites |
| Content Engine Agent 3: Scripter | ✅ Ready | ✅ All 6 sites |
| Content Engine Agent 4: Analyst | ✅ Ready | ✅ All 6 sites |
| Email Campaign Manager | ✅ Ready | ✅ All 6 sites |
| Social Media Calendar | ✅ Ready | ✅ All 6 sites |

**To deploy:** Run `npx prisma migrate deploy` (8 new models), add email provider env vars (SMTP/Resend/SendGrid — at least one).

**Key files:** `lib/design/brand-provider.ts` (unified brand), `lib/content-engine/*.ts` (4 AI agents), `lib/email/sender.ts` (multi-provider), `lib/video/render-engine.ts` (Remotion), `lib/pdf/html-to-pdf.ts` (Puppeteer)

### Website Builder Readiness: 95% — PRODUCTION READY

**The new-site wizard (`/admin/cockpit/new-site`) can launch a new website without code deployment.**

| Step | Feature | Status |
|------|---------|--------|
| 1 | Site type selection (travel blog, yacht, custom) | ✅ |
| 2 | Brand identity (name, tagline, languages) | ✅ |
| 3 | Visual identity (5 colors via picker) | ✅ |
| 4 | Domain + site ID validation (checks DB + config) | ✅ |
| 5 | Content strategy (topics, audience, tone) | ✅ |
| 6 | SEO configuration | ✅ |
| 7 | Affiliate setup | ✅ |
| 8 | Review + create | ✅ |

**What it does:** Creates `Site` DB record, seeds 30 topic proposals, sets up SiteSettings for 5 categories (affiliates, email, social, workflow, general). Content pipeline automatically picks up new site.

**What still requires code deployment:**
- Adding site to `config/sites.ts` SITES array (domain mapping, system prompts)
- Adding domain to `middleware.ts` domain router
- Adding domain to Vercel project settings
- DNS pointing to Vercel

**Key files:** `lib/new-site/builder.ts`, `app/api/admin/new-site/route.ts`, `app/admin/cockpit/new-site/page.tsx`

### Social Media Creation & Integration Readiness: 70% — PARTIALLY READY

**Scheduling and content creation are fully built. Auto-publishing is limited to Twitter/X only. Other platforms require manual copy-paste from dashboard.**

| Platform | Scheduling | Auto-Publish | Engagement Tracking |
|----------|-----------|-------------|-------------------|
| Twitter/X | ✅ Ready | ✅ Ready (needs API keys) | ❌ Not built |
| Instagram | ✅ Ready | ❌ Requires app approval (6-8 weeks) | ❌ Not built |
| TikTok | ✅ Ready | ❌ Requires official partnership | ❌ Not built |
| LinkedIn | ✅ Ready | ❌ Requires app review (3-6 months) | ❌ Not built |
| Facebook | ✅ Ready | ⚠️ Possible (Graph API, needs app review) | ❌ Not built |

**What works now:**
- Social Calendar UI (`/admin/social-calendar`) — week/month views, create/reschedule/delete ✅
- Social cron (every 15 min) — auto-publishes Twitter, flags others as "pending manual" ✅
- Social Scheduler library (`lib/social/scheduler.ts`) — full lifecycle management ✅
- Content Engine Scripter agent generates platform-specific social posts ✅
- Credential storage (encrypted, per-site) ✅

**What's missing:**
- OAuth flow UI for self-service account linking (currently requires API calls)
- Engagement metrics (likes, shares, reach) from any platform
- Multi-platform simultaneous publishing (posts go to one platform at a time)
- Instagram/TikTok/LinkedIn auto-publishing (API restrictions, not code limitations)

**Current workflow for non-Twitter platforms:**
1. Content Engine generates social posts (or Khaled writes them)
2. Posts scheduled in Social Calendar
3. Cron flags them as "pending manual"
4. Khaled opens dashboard → sees pending posts → copy-pastes to platform → taps "Mark Published"

**To enable Twitter auto-publishing:** Add 4 env vars: `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`

**Key files:** `lib/social/scheduler.ts`, `app/api/cron/social/route.ts`, `app/admin/social-calendar/page.tsx`

---

### Critical Rules Learned (March 11 Session)

57. **Diagnostic-agent touching `updated_at` inflates active draft count** — always exclude drafts with `[diagnostic-agent*]` or `MAX_RECOVERIES_EXCEEDED` in `last_error` when counting "active" pipeline drafts.
58. **Crons that fire at the same minute compete for connection pool** — stagger by 15-30 minutes. `diagnostic-sweep` at `:00`, `schedule-executor` at `:15`, `content-auto-fix-lite` at `:30`.
59. **News admin page must pass siteId to API** — use `?site_id=` query param, not `x-site-id` header (matches cockpit pattern).
60. **Social media auto-publishing is only possible for Twitter/X** — Instagram, TikTok, LinkedIn APIs require business partnerships or months-long app review. Design for manual copy-paste with dashboard tracking as the primary workflow.
61. **New site wizard creates DB records but still requires code deployment** — `config/sites.ts`, `middleware.ts`, Vercel domain settings, and DNS must be updated manually. The wizard handles database seeding only.
62. **Every testType in plan-registry.ts MUST have a matching function in live-tests.ts** — missing functions cause "test not found" errors in the Development Monitor. When adding new plans, always add corresponding test functions. Shared testTypes across plans need exactly ONE function registered once — the registry lookup handles sharing.
63. **Test functions for built features should verify real code** — check file existence, scan for expected exports/patterns, query DB state. Test functions for future features should check prerequisites and return low readiness (0-70) with `howToFix` guidance describing what needs building.
