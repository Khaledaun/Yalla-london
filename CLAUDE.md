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
| Yalla Thailand | yallathailand.com | thailand | en | Emerald + saffron | Planned |

**Note:** Yalla Dubai was replaced by Yalla Riviera (French Riviera / Côte d'Azur) — higher affiliate value, stronger Gulf tourist presence, and uncontested Arabic-language niche.

### Site Research Reports

Comprehensive market research for each site lives in `yalla_london/app/docs/site-research/`:

| # | Site | File | Status | Key Findings |
|---|------|------|--------|-------------|
| 1 | Yalla London | `01-yalla-london.md` | Complete | 746 lines — design, content strategy, affiliate programs, site architecture, content engine integration |
| 2 | Arabaldives | `02-arabaldives.md` | Complete | 282 lines — Maldives launch strategy, RTL Arabic-first content, halal resort reviews |
| 3 | Yalla Riviera | `03-yalla-riviera.md` | Complete | 712 lines — Côte d'Azur design, Gulf tourist market ($75B+ GCC spending), yacht charter affiliates, halal dining guide |
| 4 | Yalla Istanbul | — | Not started | — |
| 5 | Yalla Thailand | — | Not started | — |

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
│   ├── api/cron/                    # 13 scheduled cron jobs
│   ├── api/seo/                     # 30 SEO API routes
│   ├── api/admin/                   # Admin dashboard API
│   └── admin/                       # Admin UI (53 sections)
├── lib/                             # Shared utilities (423 files)
│   ├── seo/orchestrator/            # Master SEO orchestrator (5 modules)
│   ├── seo/                         # SEO services (schema, indexing, audit, analytics)
│   ├── content-automation/          # Content generation pipeline
│   └── db.ts                        # Prisma singleton
├── config/sites.ts                  # 5-site configuration (brand, keywords, prompts)
├── middleware.ts                     # Multi-tenant routing, CSRF, UTM, sessions
├── prisma/schema.prisma             # 94 models (2659 lines)
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
| 8:30 | Content selector | BlogPost table (published) |
| 9:00 | Scheduled publish (morning) | Public pages |
| 13:00 | SEO agent run 2 | IndexNow + monitoring |
| 16:00 | Scheduled publish (afternoon) | Public pages |
| 20:00 | SEO agent run 3 | IndexNow + monitoring |

## Launch Priority Order

This is the order in which things must work. Do not jump ahead.

1. **Yalla London produces 1 article/day automatically** (content pipeline end-to-end)
2. **Articles are indexed by Google** (SEO agent + IndexNow)
3. **Articles contain affiliate links** (monetization)
4. **Dashboard shows pipeline status** (Khaled can monitor from phone)
5. **Scale to 2 articles/day on Yalla London**
6. **Complete site research for all 5 sites** (3/5 done — Istanbul & Thailand remaining)
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

**Site Research Reports (3 of 5 complete):**
- Yalla London: Full research — design, content, affiliates (HalalBooking as top priority), site architecture
- Arabaldives: Arabic-first Maldives strategy — RTL layout, halal resorts, honeymoon content focus
- Yalla Riviera: French Riviera research — Gulf tourist market ($75B+ GCC spending), yacht charter affiliates (Boatbookings 20%), Michelin dining, halal restaurant guide

**Pipeline & Infrastructure (prior sessions):**
- Content pipeline: Topics → Drafts (8 phases) → Reservoir → BlogPost (published, bilingual)
- Cron jobs: 13 scheduled jobs with budget guards (53s budget / 7s buffer)
- SEO orchestrator: 5 modules (index, audit, research, goals, performance monitor)
- Admin dashboard: Mobile-accessible, cron controls, pipeline status, health monitoring
- Grok (xAI) integration for EN content generation and trending topics
- Pre-publication SEO gate enforced on all content
