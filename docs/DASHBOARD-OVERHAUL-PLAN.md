# Dashboard Overhaul Development Plan
**Version:** 1.0
**Started:** 2026-02-25
**Branch:** claude/dashboard-audit-report-vfw8n
**Owner:** Khaled N. Aun

---

## Mission

Transform the admin dashboard from a partially-wired, mock-data-heavy interface into a **fully operational command center** that Khaled can use from his iPhone to monitor, control, and fix the entire platform — without touching a terminal.

---

## Goals & Objectives

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Every section shows real data (zero mock/placeholder) | 0 pages with hardcoded fake data |
| G2 | Every button does something | 0 onClick-less buttons |
| G3 | Settings tab is a complete control panel | 5+ functional sections |
| G4 | AI providers configurable per-task per-site | ModelRoute table populated + UI working |
| G5 | API token activity visible in dashboard | Usage stats per provider per day |
| G6 | Content list shows full article metadata | Phase, score, word count, indexing status |
| G7 | Cron jobs show schedule, last run, health, trigger | Per-cron expandable cards |
| G8 | All new endpoints in test-connections.html | 100% coverage |
| G9 | Zero TypeScript errors after each phase | tsc --noEmit passes |
| G10 | Mobile-first on all new pages | iPhone-usable layout |

---

## Architecture Decisions

1. **No new Prisma migrations** — use existing `ModelProvider`, `ModelRoute`, `ApiSettings`, `CronJobLog` models
2. **Client components for interactive sections** — settings pages require real-time updates
3. **Server components for data display** — articles, cron list, indexing data fetched server-side
4. **Encrypt API keys** — use existing AES-GCM encryption from `models/providers/route.ts`
5. **Tab-based layout** for Settings Hub — one URL, multiple concerns
6. **Consistent neu-morphic design** — match existing `var(--neu-bg)` / `var(--neu-raised)` tokens

---

## Phase Plan

### PHASE 1: Settings Hub (Priority: CRITICAL)
**Target:** `/admin/settings/page.tsx` — master settings page with 5 tabs

| Tab | What it contains |
|-----|-----------------|
| **To-Do** | Action items for Khaled (pending DB migrations, missing env vars, health warnings). Each item has instructions + action button |
| **Database** | Migration status, run migration button, schema health, Prisma studio link |
| **Variable Vault** | Per-site env vars, Vercel sync button, copy-to-clipboard, status badges |
| **AI Models** | Provider cards (Claude, OpenAI, Gemini, Perplexity, xAI), API key input, test connection, usage stats, task router |
| **System** | Theme settings, feature flags shortcut, cron schedule overview |

**New files:**
- `app/admin/settings/page.tsx` — tabs container
- `app/admin/settings/todo-tab.tsx` — dynamic todo list
- `app/admin/settings/database-tab.tsx` — migration + schema health
- `app/admin/settings/variable-vault-tab.tsx` — env vars + Vercel sync
- `app/admin/settings/ai-models-tab.tsx` — providers + task router + token monitoring
- `app/admin/settings/system-tab.tsx` — theme + flags + schedule
- `app/api/admin/settings/todo/route.ts` — generate todo list from system state
- `app/api/admin/settings/db-status/route.ts` — migration status + schema health
- `app/api/admin/ai-models/route.ts` — CRUD for providers + routes
- `app/api/admin/ai-models/test/route.ts` — test API key connectivity
- `app/api/admin/ai-models/usage/route.ts` — token usage stats per provider

**AI Provider Support:**
- Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku, Claude Opus)
- OpenAI (GPT-4o, GPT-4o-mini, o1)
- Google (Gemini 1.5 Pro, Gemini Flash)
- Perplexity (Sonar Pro, Sonar)
- xAI (Grok, Grok Vision)

**Task Router Tasks (mappable per site):**
- `topic_generation` — discovers weekly topics
- `content_generation_en` — writes English articles
- `content_generation_ar` — writes Arabic articles
- `fact_verification` — verifies article facts
- `seo_audit` — audits page SEO health
- `affiliate_injection` — finds affiliate links
- `social_content` — generates social posts
- `image_description` — describes images for alt text
- `sentiment_analysis` — analyzes content quality

---

### PHASE 2: Dashboard Redesign
**Target:** `/components/admin/CommandCenter.tsx` — replace CommandCenter with real data

| Section | Data Source | What to show |
|---------|-------------|--------------|
| Pipeline Status | TopicProposal, ArticleDraft, BlogPost tables | Count per phase, last 24h activity |
| Per-Site Health | CronJobLog, BlogPost, SeoReport | Articles published, cron health, indexing status |
| Cron Health Summary | CronJobLog | Last run per job, status dots, error count |
| Quick Actions | API triggers | Generate Topics, Build Content, Publish Ready, Run SEO |
| Revenue Snapshot | Affiliate click data | Clicks today, clicks this week |

---

### PHASE 3: Content Hub Expansion
**Target:** `/app/admin/content/page.tsx` + articles list

| Section | Enhancement |
|---------|-------------|
| Articles List | Add: phase badge, SEO score, word count, indexing status, last modified, actions |
| Generation Monitor | Real-time draft pipeline with expandable cards |
| Indexing Tab | Per-article indexing status, submit buttons, health diagnosis |
| Topics Tab | Topics with source, status, site, score, promote/reject buttons |
| Performance Tab | Per-article clicks, impressions, CTR from GSC |

---

### PHASE 4: Cron Job Monitor
**Target:** `/app/admin/cron-logs/page.tsx` — major expansion

| Enhancement | Detail |
|-------------|--------|
| Schedule Grid | Show next run time for all 16 scheduled jobs |
| Per-Job Cards | Expandable: last run time, status, items processed, errors, avg duration |
| Manual Trigger | "Run Now" button for every cron job |
| Health Alerts | Red/yellow/green per job based on last 7 days |
| Budget Display | Show time usage vs 53s budget for last run |

---

### PHASE 5: Navigation Update
Add Settings Hub to main nav. Update `mophy-admin-layout.tsx` settings section.

---

### PHASE 6: Test-Connections Update
Update `test-connections.html` with all new endpoints.

---

### PHASE 7: Gap Audit + Fix Loop
Audit all phases, document in `docs/DASHBOARD-GAPS.md`, fix, repeat.

---

## Progress Log

| Date | Phase | Status | Notes |
|------|-------|--------|-------|
| 2026-02-25 | Plan | ✅ Created | Initial plan document |
| 2026-02-25 | Phase 1: Settings Hub | ✅ Complete | 5-tab settings hub, AI models CRUD + test, task router, todo API, DB status API, cron schedule API |
| 2026-02-25 | Phase 2: Content Hub | ✅ Complete | Articles API rewritten to Prisma, RichArticleList with full metadata, Pipeline View in articles page |
| 2026-02-25 | Phase 3: Schema Alignment | ✅ Complete | Fixed 13 schema mismatches (DG-025 to DG-037) across 4 API routes — BlogPost/ArticleDraft/CronJobLog snake_case fixes |
| 2026-02-25 | Phase 4: Cron Monitor | ✅ Complete | CronSchedulePanel with health, budget bar, expandable history, Run Now; cron-logs page now has 2 tabs |
| 2026-02-25 | Phase 5: Navigation | ✅ Complete | Settings Hub with sub-tabs in nav sidebar |
| 2026-02-25 | Phase 6: Test-Connections | ✅ Complete | Section 24 added (6 new endpoint tests) |
| 2026-02-25 | Phase 7: Gap Audit | ✅ Complete | 37 gaps documented (DG-001 to DG-037), 33 fixed, 4 low-priority open |

---

## Known Gaps Log

Documented in `docs/DASHBOARD-GAPS.md` (created during audit phase).

---

## Anti-Patterns (Do Not Do)

1. **No Math.random() for any displayed metric** — empty state > fake data
2. **No dead buttons** — every button must have a real handler
3. **No hardcoded site IDs** — use `getDefaultSiteId()` or `x-site-id` header
4. **No unencrypted API keys in responses** — mask with `****`
5. **No skipping requireAdmin** on settings mutations

---

## Skills Leveraged

From CLAUDE.md skill registry:
- `multi-tenant-platform` — site isolation patterns
- `prisma-expert` — schema queries
- `nextjs-best-practices` — App Router patterns
- `react-ui-patterns` — loading states, error boundaries
- `frontend-design` — neumorphic design consistency
- `vercel-deploy` — env var management
- `analytics-tracking` — token usage monitoring
