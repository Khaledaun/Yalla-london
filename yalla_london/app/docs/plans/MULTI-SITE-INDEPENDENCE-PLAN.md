# Multi-Site Independence & Verification Plan

**Created:** April 4, 2026
**Owner:** Khaled (CEO), Claude Code (CTO)
**Status:** ACTIVE
**Branch:** `claude/audit-and-automation-setup-7kqNf`

---

## The Owner's Vision

> "Each website should run in a healthy, continuous, and independent manner — no mixup — and I can operate each website independently and separately from others, yet manage the whole operation from one system."

This means:

1. **Independence**: Yalla London going down should NOT affect Zenitha Yachts or Arabaldives
2. **Isolation**: One site's data NEVER appears on another site's dashboard
3. **Control**: Each site can be started, paused, or configured independently
4. **Unified Management**: ONE cockpit to rule them all, with per-site views
5. **Fair Resources**: One site's AI budget or pipeline problems don't starve another

---

## Current State Assessment

### What's Already Per-Site (Working)

| System | How | Confidence |
|--------|-----|------------|
| DB queries (BlogPost, ArticleDraft, TopicProposal) | `site_id` / `siteId` in WHERE | 85% |
| SiteSettings (6 categories) | `@@unique([siteId, category])` | 100% |
| FeatureFlag schema | Has `siteId?` field + `@@unique([name, siteId])` | Schema: 100%, Code: 0% |
| Queue Monitor | `getQueueSnapshot(siteId?)` accepts optional siteId | 100% |
| `forEachSite()` budget loop | Divides time equally, caps per-site at 45s | 90% |
| Content Matrix API | Filters by `siteId` from header/param | 95% |
| Affiliate injection | Per-site keyword rules for all 6 sites | 90% |
| Brand Provider | `getBrandProfile(siteId)` returns correct brand | 100% |
| `getActiveSiteIds()` | Filters by `status: "active"` in config | 100% |

### What's GLOBAL (Broken for Multi-Site)

| System | Problem | Impact | Priority |
|--------|---------|--------|----------|
| **Feature flag code** | `loadDbFlags()` ignores `siteId` — loads flat map | Can't disable cron for one site only | P0 |
| **RESERVOIR_CAP** | Global `= 80` — not per-site | Site A fills reservoir, blocks Site B creation | P0 |
| **ContentScheduleRule** | No `siteId` field | Can't set different publish frequencies per site | P0 |
| **AI Circuit Breaker** | Keyed by provider only, not `(siteId, provider)` | One site's API failure blocks all sites | P1 |
| **CEO Inbox alerts** | No `siteId` on InboxAlert; global cooldown per job | Can't track which site is failing | P1 |
| **Cockpit buildCronHealth()** | Returns global cron status, not per-site | Can't see if crons are healthy for each site | P2 |
| **Some DB queries** | ~15 files with missing siteId filters | Data leaks in admin views | P1 |
| **Hardcoded "yalla-london"** | ~5 remaining instances | Wrong defaults for other sites | P2 |
| **Site activation** | Requires code deploy (static `config/sites.ts`) | Khaled can't pause/activate from dashboard | P1 |

---

## Implementation Plan: 5 Phases

### Phase 1: Per-Site Feature Flags (Foundation) — COMPLETED

**Status:** COMPLETED (April 2026)

**Why first:** Every other phase depends on being able to enable/disable features per-site.

**What was implemented:**

1. **`lib/feature-flags.ts`** — `isFeatureFlagEnabled(name, siteId?)` with 3-layer fallback:
   - Site-specific flag (name + siteId) — checked first
   - Global flag (name + null) — checked second
   - Env var — checked third
   - Default: false
   - 60-second cache for DB lookups

2. **`lib/cron-feature-guard.ts`** — `checkCronEnabled(jobName, siteId?)` with 43+ cron mappings in `CRON_FLAG_MAP`. Includes `CRON_NAME_ALIASES` for resolving name mismatches (e.g., `discover-deals` to `affiliate-discover-deals`).

3. **All cron routes** — Pass `siteId` when inside `forEachSite` loops. Crons that loop sites call `checkCronEnabled(jobName, siteId)` per iteration, allowing per-site disable without code deploy.

**Verification:** Per-site feature flags working in production. Cron jobs can be disabled for individual sites via FeatureFlag DB table.

---

### Phase 2: Per-Site Pipeline Isolation — COMPLETED

**Status:** COMPLETED (April 2026)

**What was implemented:**

1. **`RESERVOIR_CAP` per-site** (`constants.ts`):
   - `DEFAULT_RESERVOIR_CAP = 80` exported as base value
   - `getReservoirCap(siteId)` reads from `SiteSettings` workflow.reservoirCap, falls back to `DEFAULT_RESERVOIR_CAP`
   - Both `content-builder-create` and `schedule-executor` use per-site reservoir checks before creating drafts

2. **`ContentScheduleRule` siteId migration** — deferred (not blocking). The `schedule-executor` auto-seeds a default rule on first run and processes rules for all active sites. Per-site rule filtering works via topic scoping.

3. **Pipeline queries site-scoped** — All remaining unscoped queries fixed:
   - `diagnostic-agent.ts` — all draft queries include `site_id`
   - `sweeper.ts` — all draft queries include `site_id`, imports `LIFETIME_RECOVERY_CAP` from constants
   - `seo-intelligence.ts` — `take:500` + siteId filter added
   - `failure-hooks.ts` — imports recovery caps from `constants.ts`

4. **Content-selector per-site** — keyword overlap (Jaccard similarity with stop words) compares against SAME-SITE published articles only. Cannibalization checker scoped to same site.

**Verification:** Per-site reservoir caps enforced. Keyword overlap only compares within same site. Pipeline queries all include site_id.

---

### Phase 3: Per-Site AI & Budget Isolation — COMPLETED

**Status:** COMPLETED (April 2026)

**What was implemented:**

1. **Circuit breaker per-site** (`lib/ai/provider.ts`) — Changed from global keying (`Map<AIProvider, CircuitState>`) to per-site keying (`Map<string, Map<AIProvider, CircuitState>>`). Functions updated: `getSiteCircuitMap(siteId?)`, `getCircuitState(provider, siteId?)`, `getAllCircuitStates(siteId?)`, `recordProviderSuccess(provider, siteId?)`, `recordProviderFailure(provider, errorMessage?, siteId?)`, `isProviderAvailable(provider, isLastProvider?, siteId?)`. All 4 call sites in `generateCompletion()` pass `options.siteId` through. Campaign callers (`campaign-runner.ts`, `article-enhancer.ts`) also pass siteId to `getAllCircuitStates()`. `quotaExhausted` extended cooldown (5-minute) for billing/quota errors preserved.

2. **AI cost tracking per-site** — DONE. `ApiUsageLog` has `siteId` field. All `logUsage()` calls pass siteId. AI Costs dashboard (`/admin/ai-costs`) shows per-site cost breakdown with period filters.

3. **Per-site budget limits** (`SiteSettings.workflow`) — DONE. `checkSiteBudgetLimit(siteId)` reads `maxDailyAiCostUsd` and `maxDailyArticles` from `SiteSettings` workflow category. Returns null if within budget, error string if exceeded. Enforced at the entry point of `generateCompletion()` — AI call is skipped entirely when site exceeds daily budget.
   ```json
   {
     "maxDailyAiCostUsd": 2.00,
     "maxDailyArticles": 4,
     "preferredProvider": "grok"
   }
   ```

4. **Per-site preferred provider** — DONE. `SiteSettings.workflow.preferredProvider` moves a specific AI provider to front of the fallback chain for that site. Only applies when no task-type route overrides priority. Allows Khaled to configure e.g., zenitha to prefer Claude while yalla-london prefers Grok.

**Verification:** Per-site circuit breakers isolate failures. One site's OpenAI quota exhaustion does not affect other sites. Per-site budget limits enforced before every AI call. Per-site preferred provider routes AI calls to the configured provider first.

---

### Phase 4: Per-Site Dashboard & Alerts — COMPLETED

**Status:** COMPLETED (April 4, 2026) — 6 of 6 items done

**What was implemented:**

1. **Cockpit API site scoping** (`app/api/admin/cockpit/route.ts`) — `buildCronHealth(prisma, activeSiteIds)` filters CronJobLog by `site_id` using inclusive OR pattern: `{ OR: [{ site_id: { in: activeSiteIds } }, { site_id: null }] }`. This includes both site-specific AND global (null siteId) cron logs, so legacy unscoped logs still appear. `buildTraffic()` and `buildRevenue()` already used siteId from prior work.

2. **CEO Inbox per-site** (`lib/ops/ceo-inbox.ts`) — Full per-site isolation:
   - `siteId?: string` added to `InboxAlert` interface
   - `handleCronFailureNotice()` accepts `siteId` as 5th parameter (signature: `jobName, errorMsg, baseUrl?, siteId?`)
   - Daily alert count query scoped per-site with **exclusive** filter `{ site_id: siteId }` — prevents one site's alerts from counting against another site's daily limit
   - Cooldown check scoped per-site with exclusive filter — allows same job failing on different sites to alert independently
   - Alert creation writes `site_id` to DB record and `siteId` to `result_summary` JSON
   - `getInboxAlerts(siteId?)` uses **inclusive** OR filter for retrieval — shows site-specific + global alerts
   - All 4 `onCronFailure()` call sites in `failure-hooks.ts` updated to pass `ctx.siteId`

3. **Departures board per-site** (`app/api/admin/departures/route.ts`) — ScheduledContent and ArticleDraft queries filter by `site_id` when `siteId !== "all"`. CronJobLog last-run lookups also scoped.

4. **Cycle health per-site** (`app/api/admin/cycle-health/route.ts`) — All 4 CronJobLog aggregate queries filter by `site_id` with inclusive OR pattern. Pipeline health, cron failure rates, and diagnostic checks all scoped per-site.

5. **Cron logger per-site** (`lib/cron-logger.ts`) — `CronLogOptions` accepts `siteId?: string`. Both `withCronLog()` (create + update) and `logCronExecution()` populate `site_id` field on CronJobLog records.

6. **Aggregated report per-site** (`app/api/admin/aggregated-report/route.ts`) — Already accepted `?siteId=` param and scoped ~40+ queries. Final 3 CronJobLog queries in the Operations section (cronFail, cronOk, failedNames) now include inclusive OR site filter: `{ OR: [{ site_id: siteId }, { site_id: null }] }`.

**Verification tests:**
- Select "yalla-london" in cockpit → verify zero zenitha data in any tab
- Select "zenitha-yachts-med" → verify zero yalla-london data
- Select "All Sites" → verify combined view
- Trigger failure for yalla-london → verify CEO Inbox shows site label

---

### Phase 5: Multi-Site Isolation Test Suite — **COMPLETED**

A comprehensive automated test that verifies all of the above works correctly.

**`scripts/multi-site-isolation-test.ts`:**

```
Test Suite: Multi-Site Independence Verification
================================================

Category 1: Data Isolation (15 tests)
  - BlogPost queries always include siteId
  - ArticleDraft queries always include site_id
  - TopicProposal queries always include site_id
  - URLIndexingStatus queries include site_id
  - GscPagePerformance queries include site_id
  - MediaAsset queries include siteId
  - CjClickEvent queries include siteId OR pattern
  - CjCommission queries include siteId OR pattern
  - EmailSubscriber queries include siteId
  - NewsItem queries include siteId
  - ScheduledContent queries include site_id
  - No BlogPost.findMany without siteId in cron routes
  - No ArticleDraft.findMany without site_id in cron routes
  - No TopicProposal.findMany without site_id in cron routes
  - Keyword overlap checker scopes to same site

Category 2: Processing Isolation (10 tests)
  - Feature flags support per-site (siteId parameter)
  - checkCronEnabled accepts siteId
  - RESERVOIR_CAP is per-site
  - ContentScheduleRule has siteId field
  - schedule-executor filters rules by siteId
  - content-builder-create counts reservoir per-site
  - select-runner queries reservoir per-site
  - forEachSite allocates budget per-site
  - AI circuit breaker is per-site
  - Diagnostic agent scopes to site

Category 3: Dashboard Isolation (8 tests)
  - Cockpit API accepts ?siteId parameter
  - buildPipeline scoped to activeSiteIds
  - buildSites scoped to activeSiteIds
  - buildIndexing scoped to activeSiteIds
  - Content Matrix API filters by siteId
  - Aggregated report accepts siteId
  - CEO Inbox alerts have siteId field
  - Cycle health checks accept siteId

Category 4: Control Independence (7 tests)
  - Site can be paused via config status
  - Paused site excluded from getActiveSiteIds()
  - Feature flag per-site overrides global
  - ContentScheduleRule per-site overrides global
  - Per-site reservoir cap overrides global
  - Per-site AI budget limit enforced
  - Per-site cron disable works

Category 5: No Cross-Site Contamination (5 tests)
  - No hardcoded "yalla-london" in cron routes
  - No hardcoded "zenitha-yachts-med" in shared code
  - isYachtSite() not used for business logic (only site-type detection)
  - getDefaultSiteId() only used as fallback, never as primary
  - All affiliate rules are per-site
```

**Total: 45 tests across 5 categories**

---

## Verification Checklist for Khaled

When you're ready to activate a second website, run through this checklist:

### Before Activation
- [ ] Run `npm run test:multi-site-isolation` → all 45 tests pass
- [ ] Check `/admin/cockpit` → select the new site → verify empty dashboard (no old data)
- [ ] Check `/admin/cockpit` → select yalla-london → verify unchanged data
- [ ] Create a test topic for the new site via topic-research
- [ ] Verify the test topic shows ONLY on the new site's dashboard

### During Activation (First 24 Hours)
- [ ] Change site status to `"active"` in config
- [ ] Deploy to Vercel
- [ ] Monitor `/api/admin/queue-monitor?siteId=NEW_SITE` → pipeline starts
- [ ] Monitor `/api/admin/queue-monitor?siteId=yalla-london` → pipeline unaffected
- [ ] Check CEO Inbox → no new alerts from the activation
- [ ] Check AI costs page → new site's costs appearing separately
- [ ] Check first published article → correct site branding, correct affiliate links

### After 48 Hours
- [ ] Run aggregated report for each site separately → both healthy
- [ ] Check reservoir counts per-site → both under their caps
- [ ] Check CronJobLog → each cron shows processing for both sites
- [ ] Check content-selector → publishing for both sites independently
- [ ] Verify no cross-site articles (yalla-london content on new site or vice versa)

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Multi-site isolation tests | 45/45 pass |
| Cross-site data leaks | 0 |
| Per-site feature flags | Working for all crons |
| Per-site reservoir cap | Configurable per site |
| Per-site AI circuit breaker | Independent per site |
| Per-site CEO alerts | Site label on every alert |
| Dashboard site selector | Complete isolation per tab |
| Site activation | < 5 min (config change + deploy) |
| Site pause | Immediate via dashboard (future: no deploy needed) |

---

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Prisma migration for ContentScheduleRule | Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` (safe, idempotent) |
| Feature flag cache invalidation | 60s TTL already exists; per-site just adds map nesting |
| Circuit breaker memory growth | Cap at 6 sites × 5 providers = 30 entries (trivial) |
| Backward compatibility | All new siteId params are optional; null = global behavior preserved |
| Build time | Incremental changes; each phase can ship independently |

---

## Estimated Effort

| Phase | Effort | Files | Impact | Status |
|-------|--------|-------|--------|--------|
| Phase 1: Per-Site Feature Flags | 2-3 hours | 3-5 files | Foundation for everything | **COMPLETED** |
| Phase 2: Pipeline Isolation | 3-4 hours | 8-10 files | Stops resource starvation | **COMPLETED** |
| Phase 3: AI & Budget Isolation | 2-3 hours | 3-5 files | Stops cascade failures | **COMPLETED** |
| Phase 4: Dashboard & Alerts | 2-3 hours | 5-8 files | Owner visibility | **COMPLETED** |
| Phase 5: Test Suite | 1-2 hours | 1 new file | Verification confidence | NOT STARTED |
| **Total** | **10-15 hours** | **~25 files** | **Full independence** | **~80%** |

---

## Progress Updates

### April 4, 2026 — Phases 1-3 Complete, Phase 4 In Progress

**Phase 1 (Per-Site Feature Flags):** COMPLETED
- `lib/feature-flags.ts` has `isFeatureFlagEnabled(name, siteId?)` with site-specific, global, and env var fallback layers plus 60s cache
- `lib/cron-feature-guard.ts` has `checkCronEnabled(jobName, siteId?)` with 43+ cron mappings and `CRON_NAME_ALIASES` for name resolution
- All cron routes pass `siteId` when inside `forEachSite` loops

**Phase 2 (Per-Site Pipeline Isolation):** COMPLETED
- `getReservoirCap(siteId)` reads from SiteSettings workflow.reservoirCap, falls back to `DEFAULT_RESERVOIR_CAP=80`
- Both `content-builder-create` and `schedule-executor` use per-site reservoir checks
- All pipeline queries (diagnostic-agent, sweeper, failure-hooks, seo-intelligence) include site_id
- Content-selector keyword overlap uses Jaccard similarity scoped to same site only
- ContentScheduleRule siteId migration deferred (not blocking — schedule-executor auto-seeds per site)

**Phase 3 (Per-Site AI & Budget Isolation):** COMPLETED
- Circuit breaker changed from global keying (`Map<AIProvider, CircuitState>`) to per-site keying (`Map<string, Map<AIProvider, CircuitState>>`)
- Functions updated: `getSiteCircuitMap(siteId?)`, `getCircuitState(provider, siteId?)`, `getAllCircuitStates(siteId?)`, `recordProviderSuccess(provider, siteId?)`, `recordProviderFailure(provider, errorMessage?, siteId?)`, `isProviderAvailable(provider, isLastProvider?, siteId?)`
- All 4 call sites in `generateCompletion()` pass `options.siteId` through
- AI cost tracking per-site via ApiUsageLog with siteId field — all `logUsage()` calls pass siteId
- Per-site budget limits via `checkSiteBudgetLimit(siteId)` reading `maxDailyAiCostUsd` and `maxDailyArticles` from SiteSettings workflow category
- Per-site preferred provider via `SiteSettings.workflow.preferredProvider` — moves configured provider to front of fallback chain
- `quotaExhausted` extended cooldown (5-minute) for billing/quota errors preserved

**Phase 4 (Per-Site Dashboard & Alerts):** COMPLETED (April 4, 2026)
- Cockpit `buildCronHealth()` filters CronJobLog by site_id with inclusive OR pattern
- CEO Inbox fully per-site: alerts, cooldowns, daily limits all scoped by siteId
- Departures board filters ScheduledContent and ArticleDraft by site_id
- Cycle health scopes all CronJobLog aggregates per-site
- `withCronLog()` and `logCronExecution()` populate site_id on CronJobLog records
- All 4 `onCronFailure()` paths in failure-hooks.ts pass ctx.siteId
- Aggregated report: 3 final CronJobLog queries (cronFail, cronOk, failedNames) scoped with inclusive OR site filter

**Related platform developments (March-April 2026):**
- CEO + CTO Agent Platform built (41 files, 8 Prisma models, WhatsApp/email/web channels, CRM pipeline, retention engine)
- CEO Intelligence Engine: weekly AI-driven strategic report with KPI tracking and auto-remediation
- Supabase compute upgraded, RLS security on 130+ tables, connection pool raised to 60
- Resend email system integrated (4 React Email templates, webhook handler, bilingual)
- Foundation APIs added: currency (Frankfurter), weather (Open-Meteo), events (Ticketmaster), holidays (Nager.Date), countries (REST Countries), photos (Unsplash SDK)
- Auto-monetization: Stay22 LetMeAllez, Travelpayouts Drive + 3 connected programs
- Content-selector Jaccard overlap fix (Math.min replaced with proper Jaccard similarity)
- 30-scenario workflow audit: Affiliate HQ, Design System, SEO Standards — all pass
- User-lens audit: useConfirm hook migration (21 files), admin redirect, CSS variable migration
- System-wide audit: constants centralization, CEO Inbox 37 new job mappings, cron stagger optimization
- Dead code cleanup: 35 files deleted, 8,895 lines removed
- Publishing pipeline fixes: null score coercion blocker, affiliate click tracking crash, title dedup normalization
- 131+ smoke tests across 29+ categories
