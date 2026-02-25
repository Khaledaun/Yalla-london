# Dashboard Overhaul — Known Gaps Log
**Last Updated:** 2026-02-25
**Branch:** claude/dashboard-audit-report-vfw8n

---

## Format

Each entry: `[ID] Area | Severity | Status | Description | Fix`

---

## Session 1 Audit (2026-02-25) — Phase 1 & 2

### FIXED ✅

| ID | Area | Description | Fixed In |
|----|------|-------------|----------|
| DG-001 | Settings | No settings hub page — only feature-flags and theme | Phase 1 — created `/admin/settings/page.tsx` with 5 tabs |
| DG-002 | AI Models | ModelProvider/ModelRoute DB models existed but no admin UI | Phase 1 — AI Models tab with CRUD + test connection |
| DG-003 | AI Models | No task routing UI (which model does which task?) | Phase 1 — Task Router sub-tab maps 10 tasks to providers |
| DG-004 | AI Models | API keys had no visibility (configured or not?) | Phase 1 — masked keys shown, test button per provider |
| DG-005 | Cron | No "Run Now" button on cron logs page | Phase 1 — Schedule tab has Run Now per job |
| DG-006 | Cron | No schedule visualization (when each job runs) | Phase 1 — Schedule tab shows humanSchedule + category |
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
| DG-017 | Articles | RichArticleList not embedded in articles page | Phase 3 — "Pipeline View" tab added to articles page |

---

## Session 2 Audit (2026-02-25) — Phase 3 Schema Alignment

### FIXED ✅

| ID | Area | Description | Fixed In |
|----|------|-------------|----------|
| DG-025 | Articles API | `BlogPost.status` doesn't exist — should use `published Boolean` | Phase 3 — rewrote BlogPost select to use correct field names |
| DG-026 | Articles API | `BlogPost.createdAt/updatedAt/seoScore` camelCase → snake_case | Phase 3 — fixed to `created_at`, `updated_at`, `seo_score` |
| DG-027 | Articles API | Non-existent fields in select: `qualityScore`, `indexingStatus`, `indexingState`, `lastSubmittedAt`, `scheduledAt`, `featured` | Phase 3 — removed, replaced with null defaults |
| DG-028 | Articles API | Summary stats used wrong ArticleDraft fields: `siteId` → `site_id`, `status` → `current_phase` | Phase 3 — corrected all 3 count queries |
| DG-029 | Cron Schedule API | CronJobLog field names wrong (camelCase vs snake_case): `startedAt` → `started_at`, `jobName` → `job_name`, `durationMs` → `duration_ms`, `timedOut` → `timed_out`, etc. | Phase 3 — corrected all select/where/orderBy fields |
| DG-030 | Settings Todo API | `BlogPost.status: 'published'` → should be `published: true` | Phase 3 — fixed |
| DG-031 | Settings Todo API | `BlogPost.createdAt` → `created_at` | Phase 3 — fixed |
| DG-032 | Settings Todo API | `BlogPost.indexingStatus` doesn't exist — queried URLIndexingStatus instead | Phase 3 — fixed to use `uRLIndexingStatus.count({ where: { status: 'discovered' } })` |
| DG-033 | Settings Todo API | `ArticleDraft.status` doesn't exist → `current_phase` | Phase 3 — fixed |
| DG-034 | Settings Todo API | `CronJobLog.jobName/startedAt/errorMessage` camelCase → snake_case | Phase 3 — corrected to `job_name`, `started_at`, `error_message` |
| DG-035 | AI Models API | `CronJobLog.resultSummary/startedAt/jobName/siteId` wrong case | Phase 3 — corrected to `result_summary`, `started_at`, `job_name`, `site_id` |
| DG-036 | AI Models API | `resultSummary: { not: undefined }` → `result_summary: { not: null }` | Phase 3 — fixed |
| DG-037 | Dashboard | CommandCenter overview API verified: uses correct snake_case for ArticleDraft (`current_phase`, `site_id`), correct `published Boolean` for BlogPost | Phase 3 — verified CLEAN, no changes needed |

---

### RESOLVED BY AUDIT ✅

| ID | Area | Description | Fixed By |
|----|------|-------------|----------|
| DG-019 | Settings | Model test with raw API key (before saving) not implemented | C-002 fix — single `request.json()` call with `providerName` routing |
| DG-021 | Dashboard | IndexNow indexing stats in articles page show placeholder counts | M-001 fix — connected to real `URLIndexingStatus` table via batch lookup |
| DG-022 | Articles | `article.hasAffiliate` always false | M-002 fix — connected to real `AffiliateAssignment` table via batch lookup |

### OPEN ⚠️ (All LOW Priority)

| ID | Area | Severity | Description | Proposed Fix |
|----|------|----------|-------------|--------------|
| DG-018 | AI Models | LOW | Token usage stats UI shows job run count, not actual token usage (no real token tracking table) | Build `ApiUsageLog` table or parse `result_summary` JSON for token counts |
| DG-020 | Cron | LOW | Cron schedule "next run at" time not calculated (shows cron expression only) | Parse cron expression client-side or use `cron-parser` npm package |
| DG-023 | Settings | LOW | Variable Vault tab links to Vercel but doesn't show current .env.example | Render env.example file content for reference |
| DG-024 | Test | LOW | test-connections.html subtitle needs title tag update | Update `<title>` element from "24 sections" to "25 sections" |

---

## Schema Reference (Critical Facts)

### BlogPost (model `blog_posts`)
- `published Boolean` — use `published: true` NOT `status: 'published'`
- `created_at DateTime` — snake_case (NOT `createdAt`)
- `updated_at DateTime` — snake_case (NOT `updatedAt`)
- `seo_score Int?` — snake_case (NOT `seoScore`)
- `siteId String?` — camelCase EXCEPTION (not `site_id`)
- **NO fields**: `status`, `qualityScore`, `indexingStatus`, `indexingState`, `publishedAt`, `scheduledAt`, `featured`

### ArticleDraft (model `article_drafts`)
- ALL fields are snake_case: `site_id`, `current_phase`, `seo_score`, `quality_score`, `word_count`, `last_error`, `keyword`, `topic_title`, `created_at`, `updated_at`, `locale`
- **NO fields**: `siteId`, `status`, `phase`, `seoScore`, `qualityScore`

### CronJobLog (model `cron_job_logs`)
- ALL fields are snake_case: `job_name`, `started_at`, `completed_at`, `duration_ms`, `items_processed`, `items_succeeded`, `items_failed`, `error_message`, `error_stack`, `result_summary`, `sites_processed`, `sites_skipped`, `timed_out`, `site_id`, `created_at`
- **NO fields**: `jobName`, `startedAt`, `durationMs`, `errorMessage`, `timedOut`, `resultSummary`, `siteId`

---

## Audit Protocol

After each code session, re-run this checklist:

1. ✅ Does every new API route have `requireAdmin`?
2. ✅ Does every new API route have `export const dynamic = 'force-dynamic'`?
3. ✅ Does every DB query use `siteId` scoping where applicable?
4. ✅ Do API keys never return in plaintext (masked or boolean)?
5. ✅ Does every catch block log with context?
6. ✅ Are all new endpoints in test-connections.html?
7. ✅ Are all new pages linked from navigation?
8. ✅ Are all Prisma field names verified against schema.prisma (snake_case vs camelCase)?

---

## Resolution Targets

| Priority | Target | Status |
|----------|--------|--------|
| DG-018 (Token tracking) | Future session | Open (LOW) |
| DG-019 (Model test pre-save) | Audit branch | **RESOLVED** (C-002) |
| DG-020 (Next run time) | Future session | Open (LOW) |
| DG-021 (Indexing stats from DB) | Audit branch | **RESOLVED** (M-001) |
| DG-022 (hasAffiliate) | Audit branch | **RESOLVED** (M-002) |
| DG-023 (.env.example display) | Low priority | Open (LOW) |
| DG-024 (test title tag) | Low priority | Open (LOW) |
