# ZENITHA HQ — Admin Dashboard Redesign Implementation Plan

## Decisions Confirmed
- **Theme:** Full dark navy (#0A1628) across ALL admin pages
- **Alerts:** Email alerts via existing sender (skip WhatsApp)
- **Redirects:** Reuse existing `SeoRedirect` model (no new Prisma model)
- **Fonts:** Space Mono + Space Grotesk in admin scope only (public site untouched)

## Constraints (from CLAUDE.md — DO NOT TOUCH)
- Cron route logic, schedules, budget guards
- `config/sites.ts`, `config/entity.ts`
- Public-facing site (non-admin routes)
- `lib/seo/orchestrator/pre-publication-gate.ts`
- `lib/content-pipeline/constants.ts`
- `middleware.ts` domain routing
- `prisma/schema.prisma` (no new models)
- Zenitha Yachts routes
- Auth/security middleware
- `vercel.json` cron schedules

---

## Phase 0 — Preparation & Audit (no code changes)

### 0.1 Create feature branch
```
git checkout -b claude/redesign-admin-dashboard-IgHEr
```

### 0.2 TypeScript health check
```
cd yalla_london/app && npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

### 0.3 Report any pre-existing issues before proceeding

---

## Phase 1 — Design System Foundation

### 1.1 Add Space Mono + Space Grotesk fonts to admin layout only
**File:** `yalla_london/app/app/admin/layout.tsx`
- Import `Space_Mono` and `Space_Grotesk` from `next/font/google`
- Apply CSS variables `--f-mono` and `--f-ui` to the admin layout wrapper div
- Public site fonts remain untouched

### 1.2 Add dark theme CSS tokens
**File:** `yalla_london/app/app/globals.css` (append admin-specific section)
- Add `.zh-dark` scoped CSS variables:
  - `--navy: #0A1628`, `--navy-mid: #0F1F35`, `--navy-light: #162843`, `--navy-hover: #1C3250`
  - `--gold: #C9A84C`, `--gold-muted: #7A6535`, `--gold-dim: #3A2E18`
  - `--cream: #F0EAD6`, `--cream-muted: #8A8070`, `--cream-dim: #4A4438`
  - Status colors: `--success`, `--warn`, `--error`, `--info` with text variants
  - `--border: #1C3250`

### 1.3 Extend Tailwind config
**File:** `yalla_london/app/tailwind.config.ts`
- Add `zh-*` color tokens under `extend.colors`
- Add font family entries for `f-mono` and `f-ui`

### 1.4 Build `components/zh/` component library (NEW directory)
**File:** `yalla_london/app/components/zh/index.tsx` (~400 lines)

10 components, all dark-themed:
1. `ZHCard` — dark card with `--navy-mid` bg, `--border` border, optional header/footer
2. `ZHBadge` — status badges: Live/Ready/Draft/Failed/Indexed/Pending with colored dots
3. `ZHStatusPill` — service health: green/amber/red dot + label + value
4. `ZHMetricCell` — summary strip cell: label (Space Mono 9px uppercase) + big number + sub-label
5. `ZHAlertBanner` — full-width: critical (red) / warning (amber) / info (teal)
6. `ZHTable` — sortable table with dark rows, hover `--navy-hover`, pagination
7. `ZHActionBtn` — icon button with hover states
8. `ZHSectionLabel` — Space Mono uppercase gold-muted section divider
9. `ZHMonoVal` — Space Mono number with optional delta badge (green up / red down)
10. `ZHPipelineTrack` — horizontal pipeline phase nodes with counts

---

## Phase 2 — Navigation Rebuild

### 2.1 Replace sidebar navigation
**File:** `yalla_london/app/components/admin/mophy/mophy-admin-layout.tsx` (REWRITE)

New structure — 6 sections, ~18 items:

```
ZENITHA HQ / zenitha.luxury
[Site Switcher: YL ▾]
─────────────────────
COMMAND
  • Mission control
  • Blockers 🔴 (badge from /api/admin/system/blocker-count)
  • System health
─────────────────────
CONTENT
  • Article library
  • Content pipeline
  • Topic research
  • Write article
─────────────────────
INTELLIGENCE
  • SEO command
  • Search console
  • Analytics
─────────────────────
REVENUE
  • Affiliate hub
  • Commerce
─────────────────────
DESIGN
  • Brand assets
  • Media library
  • Design studio
─────────────────────
SYSTEM
  • Automation
  • Feature flags
  • Settings
─────────────────────
KA  Khaled Aun
```

- Dark sidebar: `--navy` background, `--cream-muted` text, `--gold` active indicator
- Mobile: collapses to icon rail, hamburger opens slide-over
- Blockers badge: polls `/api/admin/system/blocker-count` every 60s
- Site switcher: shows all 6 sites with status dots

### 2.2 Update admin layout wrapper
**File:** `yalla_london/app/app/admin/layout.tsx`
- Add `zh-dark` class and font variables to wrapper
- Ensure dark background covers full viewport

---

## Phase 3 — API Endpoints (4 new)

### 3.1 `GET /api/admin/system/api-health` (NEW)
**File:** `yalla_london/app/app/api/admin/system/api-health/route.ts`
- Checks 8 services: DB ping, Grok (XAI_API_KEY + last call), IndexNow (key file check), GSC (credentials + last sync), GA4 (4 env vars), CJ (token + last sync), Crons (failed count 24h), Supabase (active connections)
- Returns `{ services: {...}, overall: 'ok'|'degraded'|'critical', checked_at }`
- 60s cache. Protected by `requireAdmin`

### 3.2 `GET /api/admin/system/env-health` (NEW)
**File:** `yalla_london/app/app/api/admin/system/env-health/route.ts`
- Checks 18 env vars, returns SET/MISSING status per var
- Never exposes actual values
- Categories: core, analytics, search, affiliate, email
- Protected by `requireAdmin`

### 3.3 `GET /api/admin/system/blocker-count` (NEW)
**File:** `yalla_london/app/app/api/admin/system/blocker-count/route.ts`
- Lightweight aggregate: 404 count + zombie crons + failed crons 24h + duplicate slugs + stuck drafts
- Returns `{ total, critical, high, medium }`
- Protected by `requireAdmin`

### 3.4 `POST /api/admin/seo/fix-404s` (NEW)
**File:** `yalla_london/app/app/api/admin/seo/fix-404s/route.ts`
- Scans URLIndexingStatus WHERE error_type = '404'
- For each: checks if BlogPost exists with matching slug
  - If exists + published: resubmit to IndexNow, clear error
  - If slug changed: create SeoRedirect (301), update URLIndexingStatus
  - If deleted: mark as deindexed, stop tracking
- Logs to CronJobLog as job_name = 'manual-404-fix'
- Returns `{ audited, fixed, redirected, deindexed }`
- Protected by `requireAdmin`

---

## Phase 4 — Mission Control Rebuild

### 4.1 Rewrite cockpit page
**File:** `yalla_london/app/app/admin/cockpit/page.tsx` (REWRITE — currently 8,411 lines → target ~1,500 lines)

Split into sub-components:
- `yalla_london/app/app/admin/cockpit/components/hero-bar.tsx` — TODAY stats
- `yalla_london/app/app/admin/cockpit/components/service-pills.tsx` — 7 live status pills
- `yalla_london/app/app/admin/cockpit/components/pipeline-track.tsx` — horizontal phase nodes
- `yalla_london/app/app/admin/cockpit/components/metric-cards.tsx` — 3 cards (Indexing, Search, Traffic)
- `yalla_london/app/app/admin/cockpit/components/cron-table.tsx` — last 8 cron runs

Data sources (all existing APIs):
- Hero bar: `/api/admin/cockpit` (published today, indexed count)
- Service pills: `/api/admin/system/api-health` (new, from Phase 3)
- Pipeline track: `/api/admin/cockpit` → byPhase data
- Indexing card: `/api/admin/cockpit` → indexing data
- Search card: existing GSC data from cockpit API
- Traffic card: existing GA4 data from cockpit API
- Cron table: `/api/admin/cockpit` → recentCrons

All ZH components. Dark theme. Auto-refresh 60s.

---

## Phase 5 — Blockers Page (NEW)

### 5.1 Create blockers page
**File:** `yalla_london/app/app/admin/blockers/page.tsx` (~600 lines)

Sections:
1. **Blocker rows** — severity-sorted list from real DB queries:
   - 404 errors (URLIndexingStatus WHERE error_type='404') → "Run 404 Fix" button
   - Failed crons 24h (CronJobLog) → "View logs" link
   - Zombie crons (CronJobLog running >15min) → "Clear zombies" button
   - Duplicate slugs (BlogPost GROUP BY) → "Fix duplicates" link
   - Noindex blocks (URLIndexingStatus WHERE error_type='noindex') → "Audit pages" link
   - Stuck drafts (ArticleDraft phase_attempts > 8) → "Run diagnostic" button
   - Missing AR translation → "View articles" link
   - Below SEO threshold → "View articles" link
   - IndexNow broken → "Fix IndexNow" link

2. **Env var health panel** — from `/api/admin/system/env-health`
   - 18 env vars grouped by category
   - Green dot = SET, red dot = MISSING, with blocking indicator

All action buttons call real endpoints. No placeholders.

---

## Phase 6 — Article Library Rebuild

### 6.1 Rebuild articles page
**File:** `yalla_london/app/app/admin/articles/page.tsx` (REWRITE)

Unified table replacing separate Articles + SEO Audits + Indexing pages:

**Summary strip:** Total / Published / Reservoir / Indexed / Clicks (7d) / Avg SEO

**Filter toolbar:** All / Published / Reservoir / Drafts / Not indexed / No clicks / Low SEO

**Table columns (exact order):**
Title+slug | Published | Status | SEO | Words | Indexed | Clicks | Impr. | Pos. | Lang | Actions

**Per-row actions:** Open (external) / Edit / Submit to GSC / Delete (soft)

Data sources:
- BlogPost table (title_en, slug, created_at, status, seo_score, word_count_en)
- URLIndexingStatus (indexing status per URL)
- GscPagePerformance (cached clicks/impressions/position per URL)
- ArticleDraft (for drafts/reservoir items)

Uses ZHTable component with dark theme, sortable columns, pagination.

---

## Phase 7 — Intelligence Page (NEW)

### 7.1 Create intelligence page
**File:** `yalla_london/app/app/admin/intelligence/page.tsx` (~500 lines)

Tabs: Overview / GSC / GA4

**Alert banners** at top (driven by real data):
- RED if 404 count > 0
- AMBER if noindex count > 0
- AMBER if IndexNow broken

**KPI strip:** Clicks (3mo) / Impressions / CTR / Avg position / Indexed / Not indexed / Users (30d)

**Auto-generated insights** from real numbers (not hardcoded):
- Single query dependency warning
- Organic traffic status
- Indexing rate assessment
- Growth trends

Data sources: existing `/api/admin/analytics/gsc`, `/api/admin/analytics/ga4`, cockpit API

---

## Phase 8 — Automation Page Rebuild

### 8.1 Rebuild automation page
**File:** `yalla_london/app/app/admin/automation/page.tsx` (NEW — replaces departures + cron-logs + automation-hub)

**Cron status grid:** All 35+ crons as cards showing:
- Job name (Space Mono, snake_case)
- Schedule (human readable)
- maxDuration configured (flag if defaulting to 60s)
- Last run: time + status badge
- Duration
- Card border: green (OK) / red (FAIL) / amber (no run 48h+)

**Flag unscheduled crons** — any in filesystem but NOT in vercel.json

**Cron log table** — paginated, filterable by job/status/date/site

**Manual trigger panel** — "Run now" button per cron → calls cron route with CRON_SECRET

---

## Phase 9 — Dark Theme Migration for Remaining Pages

### 9.1 Update admin-ui.tsx components to support dark mode
**File:** `yalla_london/app/components/admin/admin-ui.tsx`
- Update all 10 components to use CSS variables that respond to `.zh-dark` context
- Background: `var(--navy-mid)`, text: `var(--cream)`, borders: `var(--border)`
- Since `.zh-dark` is applied at the admin layout level, all pages get dark automatically
- This avoids rewriting 52+ individual page files

### 9.2 Update high-traffic admin pages for dark theme consistency
Apply dark wrapper / minor adjustments to:
- `affiliate-hq/page.tsx`
- `ai-costs/page.tsx`
- `design/page.tsx` (+ add Canva MCP browse button)
- `media/page.tsx`
- `settings/page.tsx`
- `feature-flags/page.tsx`

---

## Phase 10 — Email Alert System (replaces WhatsApp)

### 10.1 Add email alerts to CEO Inbox
**File:** `yalla_london/app/lib/ops/ceo-inbox.ts` (UPDATE)
- Already has `handleCronFailureNotice()` with auto-fix
- Add `sendAlertEmail()` using existing `lib/email/sender.ts`
- 5 alert conditions: cron_failure, zero_published_today, db_unreachable, 404_spike, crons_silent
- Rate limiting: 1 per condition per hour (uses CronJobLog dedup)
- Email includes: site name, UTC timestamp, direct dashboard link, plain-English diagnosis

---

## Phase 11 — Dead Code Cleanup

### 11.1 Remove unused admin pages
Delete page directories that are NOT in the new nav and have no active dependencies.

**Safety protocol per directory:**
1. `grep -rn "/admin/[dirname]" yalla_london/app/ --include="*.tsx" --include="*.ts"` — check references
2. Remove from any navigation arrays
3. Delete directory

Candidates for deletion (~30 directories):
`activity`, `ai-prompt-studio`, `api-security`, `billing`, `brand-assets`,
`command-center`, `crm`, `cron-logs`, `cron-monitor`, `departures`,
`discovery`, `editor`, `facts`, `health-monitoring`, `help`, `indexing`,
`information`, `people`, `photo-pool`, `pipeline`, `profile`, `shop`,
`site`, `site-control`, `site-health`, `sync-test`, `team`, `topics`,
`transactions`, `variable-vault`, `video-studio`, `wordpress`, `workflow`

### 11.2 Remove unused nav component
**File:** `yalla_london/app/components/admin/premium-admin-nav.tsx` — DELETE

### 11.3 Audit for remaining mock data
Remove any `Math.random()`, hardcoded fake data, or `TODO` placeholders from production paths.

---

## Phase 12 — Verification & Push

### 12.1 TypeScript check — must be 0 errors
### 12.2 Build check — must compile successfully
### 12.3 No hardcoded domains in admin paths
### 12.4 No Math.random in production paths
### 12.5 Mobile viewport test at 390px
### 12.6 Commit and push to `claude/redesign-admin-dashboard-IgHEr`

---

## File Change Summary

| Action | Count | Description |
|--------|-------|-------------|
| NEW files | ~15 | zh/ components, 4 API endpoints, blockers page, intelligence page, automation page, cockpit sub-components |
| REWRITE | ~5 | cockpit/page.tsx, mophy-admin-layout.tsx, articles/page.tsx, admin layout, globals.css additions |
| UPDATE | ~10 | admin-ui.tsx dark mode, tailwind.config, affiliate-hq, ai-costs, design, media, settings, ceo-inbox |
| DELETE | ~35 | Dead admin page directories, premium-admin-nav.tsx |

## Risk Mitigation
- All data APIs already exist — we're rebuilding UI, not backend logic
- `SeoRedirect` model already in schema — no migration needed
- Font changes scoped to admin only — public site untouched
- Dark theme via CSS variables on `.zh-dark` class — cascades to all admin pages
- Deletion happens LAST (Phase 11) after everything else works
- TypeScript + build checks at every phase boundary
- No cron logic, pipeline logic, or auth middleware is modified
