# Dashboard Overhaul — Known Gaps Log
**Last Updated:** 2026-02-25
**Branch:** claude/dashboard-audit-report-vfw8n

---

## Format

Each entry: `[ID] Area | Severity | Status | Description | Fix`

---

## Session 1 Audit (2026-02-25)

### FIXED ✅

| ID | Area | Description | Fixed In |
|----|------|-------------|----------|
| DG-001 | Settings | No settings hub page — only feature-flags and theme | Phase 1 — created `/admin/settings/page.tsx` with 5 tabs |
| DG-002 | AI Models | ModelProvider/ModelRoute DB models existed but no admin UI | Phase 1 — AI Models tab with CRUD + test connection |
| DG-003 | AI Models | No task routing UI (which model does which task?) | Phase 1 — Task Router sub-tab maps 10 tasks to providers |
| DG-004 | AI Models | API keys had no visibility (configured or not?) | Phase 1 — masked keys shown, test button per provider |
| DG-005 | Cron | No "Run Now" button on cron logs page | Phase 1 — Schedule tab has Run Now per job |
| DG-006 | Cron | No schedule visualization (when each job runs) | Phase 1 — Schedule tab shows humanSchedule + next run info |
| DG-007 | Cron | No budget visualization (how much of 53s used) | Phase 1 — budget bar per job |
| DG-008 | Cron | No health classification per job | Phase 1 — green/yellow/red/gray per job based on 7-day history |
| DG-009 | Settings | No todo/action list from system state | Phase 1 — dynamic todo from: crons, topics, content, providers |
| DG-010 | Settings | No DB health view from dashboard | Phase 1 — Database tab with table counts, latency, health |
| DG-011 | Settings | No env var documentation | Phase 1 — Variable Vault tab documents all env vars |
| DG-012 | Navigation | Settings section led to feature-flags, not a hub | Phase 1 — nav updated to link to /admin/settings hub |
| DG-013 | Articles | Articles API read from JSON file, not database | Phase 2 — rewrote `/api/admin/articles/route.ts` to use Prisma |
| DG-014 | Articles | No word count, SEO score, indexing status in list | Phase 2 — RichArticleList component shows all metadata |
| DG-015 | Articles | No draft phase progress visible in articles list | Phase 2 — RichArticleList shows phase stepper + progress % |
| DG-016 | Test | No test coverage for Settings Hub / AI Models / Cron Schedule | Phase 2 — Section 24 added to test-connections.html |

---

### OPEN ⚠️

| ID | Area | Severity | Description | Proposed Fix |
|----|------|----------|-------------|--------------|
| DG-017 | Articles | MEDIUM | RichArticleList not yet embedded in `/admin/articles/page.tsx` | Add tab or replace existing list in articles page |
| DG-018 | AI Models | LOW | Token usage stats UI not built (only CronJobLog proxy data) | Build proper usage tracking with a new DB table or log parse |
| DG-019 | Settings | LOW | Model-test with raw API key (before saving) not implemented | POST body needs provider name to route to right test function |
| DG-020 | Cron | LOW | Cron schedule "next run at" time not calculated | Parse cron expression to compute next UTC run time |
| DG-021 | Dashboard | MEDIUM | CommandCenter still uses /api/admin/command-center/overview which may have stale data | Verify overview API returns real pipeline data |
| DG-022 | Articles | LOW | `article.hasAffiliate` always false — not queried | Query AffiliateLink table per blogPost |
| DG-023 | Settings | LOW | Variable Vault tab links to Vercel but doesn't show current .env.example | Could render env.example file for reference |
| DG-024 | Test | LOW | test-connections.html subtitle says "25 sections" but needs renaming in title too | Update title element |

---

## Audit Protocol

After each code session, re-run this checklist:

1. ✅ Does `npx tsc --noEmit` show only pre-existing errors (no new ones from our files)?
2. ✅ Does every new API route have `requireAdmin`?
3. ✅ Does every new API route have `export const dynamic = 'force-dynamic'`?
4. ✅ Does every DB query use `siteId` scoping?
5. ✅ Do API keys never return in plaintext (masked or boolean)?
6. ✅ Does every catch block log with context?
7. ✅ Are all new endpoints in test-connections.html?
8. ✅ Are all new pages linked from navigation?

---

## Resolution Targets

| Priority | Target |
|----------|--------|
| DG-017 (Articles embed) | Next session |
| DG-021 (Dashboard data verify) | Next session |
| DG-018, DG-019, DG-020 | Future session |
| DG-022, DG-023, DG-024 | Low priority, do when time permits |
