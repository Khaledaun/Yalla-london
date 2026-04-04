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

### Phase 1: Per-Site Feature Flags (Foundation)

**Why first:** Every other phase depends on being able to enable/disable features per-site.

**Changes:**

1. **`lib/feature-flags.ts`** — Upgrade `loadDbFlags()` to be site-aware:
   ```
   loadDbFlags() → returns Map<string, Map<string|null, boolean>>
   - Key 1: flag name
   - Key 2: siteId (null = global)
   
   isFeatureFlagEnabled(name, siteId?) → checks:
     1. Site-specific flag (name + siteId) → if exists, use it
     2. Global flag (name + null) → if exists, use it
     3. Env var → if exists, use it
     4. Default → false
   ```

2. **`lib/cron-feature-guard.ts`** — Upgrade `checkCronEnabled()`:
   ```
   checkCronEnabled(jobName, siteId?) → checks per-site first, falls back to global
   ```

3. **Every cron route** — Pass `siteId` when inside a `forEachSite` loop:
   ```
   // Before (global check):
   const disabled = await checkCronEnabled("content-builder");
   
   // After (per-site check inside loop):
   for (const siteId of activeSiteIds) {
     const disabled = await checkCronEnabled("content-builder", siteId);
     if (disabled) { skip this site; continue; }
   }
   ```

**Verification test:**
- Create flag `CRON_CONTENT_BUILDER` with `siteId="zenitha-yachts-med"`, `enabled=false`
- Create flag `CRON_CONTENT_BUILDER` with `siteId=null`, `enabled=true`
- Verify: content-builder runs for yalla-london, skips zenitha

---

### Phase 2: Per-Site Pipeline Isolation

**Changes:**

1. **`RESERVOIR_CAP` per-site** (`constants.ts`):
   ```
   // Before:
   export const RESERVOIR_CAP = 80;
   
   // After:
   export const DEFAULT_RESERVOIR_CAP = 80;
   export function getReservoirCap(siteId: string): number {
     // Check SiteSettings workflow.reservoirCap first
     // Fall back to DEFAULT_RESERVOIR_CAP
   }
   ```
   Update all consumers: `content-builder-create`, `schedule-executor`, `select-runner`

2. **`ContentScheduleRule` add siteId** (Prisma migration):
   ```prisma
   model ContentScheduleRule {
     ...existing fields...
     siteId String?   // null = applies to all sites
     @@index([siteId])
   }
   ```
   Update `schedule-executor` to filter rules by siteId.
   Auto-seed default rule per site on first run.

3. **Pipeline queries site-scoped** — Audit and fix remaining unscoped queries:
   - `diagnostic-agent.ts` — all draft queries must include `site_id`
   - `sweeper.ts` — all draft queries must include `site_id`
   - `failure-hooks.ts` — recovery queries must include `site_id`
   - `seo-intelligence.ts` — add `take:500` + siteId filter

4. **Content-selector per-site** — Already mostly scoped, but:
   - Keyword overlap check must compare against SAME-SITE published articles only (not cross-site)
   - Cannibalization checker must scope to same site

**Verification tests:**
- Set reservoir cap to 10 for zenitha, 80 for yalla-london
- Verify zenitha stops creating drafts at 10 while yalla-london continues to 80
- Verify keyword overlap only compares within same site

---

### Phase 3: Per-Site AI & Budget Isolation

**Changes:**

1. **Circuit breaker per-site** (`lib/ai/provider.ts`):
   ```
   // Before:
   const circuitBreakers = new Map<AIProvider, CircuitState>();
   
   // After:
   const circuitBreakers = new Map<string, Map<AIProvider, CircuitState>>();
   // Key: siteId (or "__global__" for non-site contexts)
   
   function getCircuitState(provider, siteId?) → site-specific first, global fallback
   function recordFailure(provider, siteId?) → only trips for that site
   function recordSuccess(provider, siteId?) → only recovers for that site
   ```

2. **AI cost tracking per-site** — `ApiUsageLog` already has `siteId`. Verify all `logUsage()` calls pass siteId.

3. **Per-site budget limits** (`SiteSettings.workflow`):
   ```json
   {
     "maxDailyAiCostUsd": 2.00,
     "maxDailyArticles": 4,
     "preferredProvider": "grok"
   }
   ```
   Check budget before AI calls in pipeline phases.

**Verification tests:**
- Exhaust OpenAI quota for yalla-london only
- Verify zenitha can still use OpenAI
- Verify yalla-london falls back to Grok while zenitha uses OpenAI

---

### Phase 4: Per-Site Dashboard & Alerts

**Changes:**

1. **Cockpit API site scoping** — All builder functions receive `activeSiteIds`:
   - `buildCronHealth()` — filter CronJobLog by `site_id` when site selected
   - `buildTraffic()` — already uses siteId for GA4
   - `buildRevenue()` — already uses activeSiteIds for CJ

2. **CEO Inbox per-site** (`lib/ops/ceo-inbox.ts`):
   ```
   interface InboxAlert {
     ...existing...
     siteId?: string;  // Which site failed (null = multi-site)
   }
   
   // Cooldown key changes from job_name to `${siteId}:${jobName}`
   // This allows alerting for each site independently
   ```

3. **Aggregated report per-site** — Accept `?siteId=` param, scope all 9 sections.

4. **Departures board** — Show cron schedules filtered to the selected site context.

5. **Cycle health per-site** — All 17 checks should accept siteId and only check that site's data.

**Verification tests:**
- Select "yalla-london" in cockpit → verify zero zenitha data in any tab
- Select "zenitha-yachts-med" → verify zero yalla-london data
- Select "All Sites" → verify combined view
- Trigger failure for yalla-london → verify CEO Inbox shows site label

---

### Phase 5: Multi-Site Isolation Test Suite

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

| Phase | Effort | Files | Impact |
|-------|--------|-------|--------|
| Phase 1: Per-Site Feature Flags | 2-3 hours | 3-5 files | Foundation for everything |
| Phase 2: Pipeline Isolation | 3-4 hours | 8-10 files | Stops resource starvation |
| Phase 3: AI & Budget Isolation | 2-3 hours | 3-5 files | Stops cascade failures |
| Phase 4: Dashboard & Alerts | 2-3 hours | 5-8 files | Owner visibility |
| Phase 5: Test Suite | 1-2 hours | 1 new file | Verification confidence |
| **Total** | **10-15 hours** | **~25 files** | **Full independence** |
