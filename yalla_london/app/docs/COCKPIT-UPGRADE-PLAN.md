# Cockpit Mega-Upgrade — Implementation Summary

> Auto-generated development plan saved for future Claude Code sessions.
> Date: 2026-02-27

## Overview

The cockpit was transformed from a basic monitoring dashboard into a self-healing, multi-site command center. 9 phases implemented across ~30 new files and ~14 modified files.

## Architecture Decisions

1. **System Validator**: Cockpit sub-page at `/admin/cockpit/validator` (behind admin auth)
2. **Site Switcher**: Global dropdown in cockpit header — switching reloads ALL data
3. **Builder Plans**: Both markdown plan AND structured DevTask records saved to DB

## Phases Completed

### Phase 1: Database Models + CRUD APIs
- `DevTask` model: persistent tasks with due dates, "Do Now" actions, auto-generated from diagnostics
- `SystemDiagnostic` model: persistent test run results for trend tracking
- CRUD APIs at `/api/admin/dev-tasks/` and `/api/admin/diagnostics/`

### Phase 2: Server-Side Diagnostic Runner
- 9 diagnostic section files porting tests from `test-connections.html`
- Sections: general, pipeline, indexing, seo, crons, yachts, commerce, security, ai-models
- Budget guards (50s execution limit), per-section error isolation
- Plain-English explanations for every test

### Phase 3: Validator Page
- Full React page at `/admin/cockpit/validator`
- Mode selector (Quick/Full/Group), site selector, group pills
- Results accordion with pass/warn/fail badges
- "Fix Now" buttons with spinner + result feedback
- History panel showing last 5 runs
- Fix actions API at `/api/admin/diagnostics/fix/`

### Phase 4: Multi-Site Cockpit Scoping
- "All Sites" option in cockpit header dropdown
- Cockpit API accepts `?siteId=` parameter to filter pipeline/indexing data
- All tabs receive and use `activeSiteId` prop

### Phase 5: Task Management
- Auto-generator scans system state (pipeline stalls, cron failures, indexing gaps)
- Deduplication by `sourceRef` prevents duplicate tasks
- Tasks tab in cockpit with summary cards, priority grouping, "Do Now" buttons
- API at `/api/admin/dev-tasks/auto-generate/`

### Phase 6: Enhanced Departures Board
- Category grouping view (Content Pipeline, SEO & Indexing, Publishing, Analytics, Maintenance)
- Plain-English descriptions for every cron job
- 7-day success rate badges (green/amber/red)
- Dependency chain visualization (Weekly Topics → Content Builder → Content Selector → Publish → SEO Agent → IndexNow)
- Expandable rows showing description, feedsInto, avg duration, last error
- Average execution duration per cron
- Last error in plain English (via `interpretError()`)

### Phase 7: Enhanced New Site Builder
- 10-step wizard (was 8): added Research & Niche, Development Plan, Post-Build Diagnostics
- Step 5 (Research): paste niche research markdown, add target keywords
- Step 6 (Content & Automation): automation toggle switches with plain-English descriptions
- Step 7 (Development Plan): AI-generated plan preview, "Copy for Claude Code", "Save Tasks to DB"
- Step 9 (Post-Build Check): runs quick diagnostic for new site
- Color palette presets from destination themes
- Plan generator library at `lib/new-site/plan-generator.ts`
- Plan API at `/api/admin/site-builder/plan/`

### Phase 8: Expanded Cockpit Data + Automation Readiness
- Per-site automation readiness checklist (6 checks with progress bar)
- Content gap indicator (days since last publish, amber warning)
- Per-site quick action buttons: Gen Topics, Build, SEO, Index
- Readiness percentage badge on each site card

### Phase 9: Documentation, Audit Cycle, Final Report
- Progressive audit system with 3 levels and auto-escalation
- Report generator for LAST-DIAGNOSTIC.md and DEVELOPMENT-REPORT.md
- This plan document saved to `docs/COCKPIT-UPGRADE-PLAN.md`

## Key Files Created

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | DevTask + SystemDiagnostic models |
| `lib/system-diagnostics/runner.ts` | Diagnostic orchestrator |
| `lib/system-diagnostics/sections/*.ts` | 9 diagnostic section files |
| `lib/system-diagnostics/progressive-audit.ts` | 3-level progressive audit |
| `lib/system-diagnostics/report-generator.ts` | Markdown report generator |
| `lib/dev-tasks/auto-generator.ts` | Task auto-generation from system state |
| `lib/new-site/plan-generator.ts` | Development plan generator |
| `app/admin/cockpit/validator/page.tsx` | System Validator page |
| `app/admin/cockpit/new-site/page.tsx` | Enhanced 10-step site builder |
| `app/admin/departures/page.tsx` | Enhanced departures board |
| `app/api/admin/dev-tasks/route.ts` | Task CRUD API |
| `app/api/admin/dev-tasks/auto-generate/route.ts` | Task auto-generate API |
| `app/api/admin/diagnostics/route.ts` | Diagnostics API |
| `app/api/admin/diagnostics/fix/route.ts` | Fix actions API |
| `app/api/admin/site-builder/plan/route.ts` | Plan generator API |

## Progressive Audit Levels

| Level | Name | Sections | Duration | Cadence |
|-------|------|----------|----------|---------|
| 1 | Quick | general, security | ~5s | Daily / on-demand |
| 2 | Full | All 9 groups | ~30s | Weekly |
| 3 | Deep | Full + extended checks | ~50s | Monthly |

Auto-escalation: Quick failures → suggest Full. Full failures → suggest Deep.
