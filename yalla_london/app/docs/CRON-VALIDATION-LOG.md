# Cron Job Validation Log

**Date:** 2026-02-27
**Validator:** Claude Code (Audit Session)
**Scope:** All 27 cron routes × 10 validation checks each = 270 total checks
**Result:** All critical/high issues fixed. TypeScript: 0 errors.

---

## Validation Categories (10 per cron)

| # | Category | What it checks |
|---|----------|---------------|
| 1 | **Auth Pattern** | Standard CRON_SECRET check: allow if unset, reject if set and doesn't match |
| 2 | **Budget Guard** | 53s budget with 7s buffer (Vercel Pro 60s limit) |
| 3 | **SiteId Scoping** | All DB queries filter by siteId — no cross-site data leakage |
| 4 | **Import Crashes** | Dynamic `await import("@/lib/db")` — never top-level `import { prisma }` |
| 5 | **Schema Mismatches** | Every Prisma create/update field verified against `prisma/schema.prisma` |
| 6 | **Empty Catches** | Every catch block logs context — no silent `catch {}` |
| 7 | **Null Checks** | Nullable fields guarded before access (content_ar, siteId, etc.) |
| 8 | **Hardcoded Values** | No hardcoded "yalla-london" fallbacks — uses `getDefaultSiteId()` |
| 9 | **Race Conditions** | Atomic claiming where multiple consumers compete for same records |
| 10 | **Graceful Degradation** | Partial success returns data + errors (not just 500) |

---

## Per-Cron Results

### ✅ analytics (`/api/cron/analytics`) — 3:00 UTC daily
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ⚠️ N/A | Single GA4+GSC fetch — low risk of timeout |
| SiteId | 🔧 FIXED | `AnalyticsSnapshot.create` was missing `site_id` → added `getDefaultSiteId()` |
| Import | 🔧 FIXED | Top-level `import { prisma }` → changed to dynamic `await import("@/lib/db")` |
| Schema | ✅ PASS | All fields verified against AnalyticsSnapshot model |
| Empty Catches | ✅ PASS | All catches log context |
| Null Checks | ✅ PASS | GA4/GSC data null-checked |
| Hardcoded | ✅ PASS | Uses dynamic config |
| Race Conditions | ✅ N/A | Single write, no contention |
| Graceful | ✅ PASS | Returns partial results if GA4 or GSC unconfigured |

### ✅ weekly-topics (`/api/cron/weekly-topics`) — 4:00 UTC Monday
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s budget checked in loop |
| SiteId | ✅ PASS | Loops all active sites |
| Import | ✅ PASS | Dynamic imports |
| Schema | ✅ PASS | TopicProposal fields verified |
| Empty Catches | ⚠️ ACCEPTABLE | Line 408: `catch { /* ignore parse failures */ }` — JSON.parse failure is expected for malformed AI output |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | Single producer |
| Graceful | ✅ PASS | Returns per-site results |

### ✅ daily-content-generate (`/api/cron/daily-content-generate`) — 5:00 UTC daily
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | Budget guard in generation loop |
| SiteId | ✅ PASS | Loops active sites |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | BlogPost fields verified |
| Empty Catches | ⚠️ ACCEPTABLE | Healthcheck degraded-status catches don't log (intentional — avoid noise during pool exhaustion) |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ PASS | Atomic claiming with "generating" status |
| Graceful | ✅ PASS | |

### ✅ seo-orchestrator (`/api/cron/seo-orchestrator`) — 5:00 UTC Sun + 6:00 UTC daily
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard in site loop |
| SiteId | ✅ PASS | Loops all active sites |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | SeoReport fields verified |
| Empty Catches | 🔧 FIXED | Healthcheck catch was empty → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | 🔧 FIXED | Status was always "completed" even with errors → now "failed" when errors exist, with errorDetails in resultSummary |

### ✅ trends-monitor (`/api/cron/trends-monitor`) — 6:00 UTC daily
| Check | Status | Notes |
|-------|--------|-------|
| Auth | 🔧 FIXED | POST handler was completely unprotected → added CRON_SECRET auth |
| Budget | ✅ PASS | 53s guard |
| SiteId | ✅ PASS | Loops active sites, skips zenitha-yachts-med |
| Import | ✅ PASS | Dynamic |
| Schema | 🔧 FIXED | **CRITICAL**: `SeoReport.create` had `status: "completed"` as top-level field — SeoReport has NO `status` field → moved inside `data` JSON |
| Empty Catches | 🔧 FIXED | Line 518 empty catch → added logging with topic details |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | Healthcheck returns "degraded" on DB failure |

### ✅ seo-agent (`/api/cron/seo-agent`) — 7:00, 13:00, 20:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | Per-site budget |
| SiteId | ✅ PASS | Loops active sites |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | All log context |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ seo/cron (`/api/seo/cron`) — 7:30 UTC daily, 8:00 UTC Sunday
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | |
| SiteId | ✅ PASS | |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ content-builder (`/api/cron/content-builder`) — every 15 min
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | Uses withCronLog + per-site budget |
| SiteId | ✅ PASS | Loops all active sites |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | ArticleDraft fields verified |
| Empty Catches | ⚠️ ACCEPTABLE | Healthcheck degraded-status catch (intentional) |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ PASS | Soft-lock on draft processing |
| Graceful | ✅ PASS | Returns per-site phase counts |

### ✅ content-selector (`/api/cron/content-selector`) — 9:00, 13:00, 17:00, 21:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | timeoutMs: 53_000 |
| SiteId | ✅ PASS | |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | 🔧 FIXED | Healthcheck catch was empty → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | Pre-publication gate with fail-closed |

### ✅ affiliate-injection (`/api/cron/affiliate-injection`) — 9:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard |
| SiteId | ✅ PASS | Per-site affiliate rules |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | |
| Null Checks | 🔧 FIXED | `content_ar` could be null → added null guard before `injectAffiliates()` |
| Hardcoded | ✅ PASS | Per-site destination URLs for all 6 sites |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ scheduled-publish (`/api/cron/scheduled-publish`) — 9:00 + 16:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Uses withCronLog (handles auth internally) |
| Budget | ✅ PASS | maxDurationMs: 53_000 |
| SiteId | ✅ PASS | Uses getDefaultSiteId fallback |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | All log context |
| Null Checks | ✅ PASS | content_id null checked |
| Hardcoded | ✅ PASS | |
| Race Conditions | ⚠️ LOW RISK | No atomic claiming on ScheduledContent — but low concurrency (2x daily) |
| Graceful | ✅ PASS | Pre-pub gate fail-closed on both GET and POST |

### ✅ google-indexing (`/api/cron/google-indexing`) — 9:15 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard |
| SiteId | ✅ PASS | |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | 🔧 FIXED | 4 empty catches → all now log warnings with context |
| Null Checks | ✅ PASS | |
| Hardcoded | 🔧 FIXED | `"yalla-london"` fallback → `getDefaultSiteId()` |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ social (`/api/cron/social`) — 10:00, 15:00, 20:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | 🔧 FIXED | No budget guard → added 53s BUDGET_MS check in post loop |
| SiteId | ✅ PASS | ScheduledContent has site_id |
| Import | 🔧 FIXED | Top-level `import { prisma }` → dynamic `await import("@/lib/db")` |
| Schema | ✅ PASS | |
| Empty Catches | 🔧 FIXED | Healthcheck catch → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | Returns published + failed counts |

### ✅ etsy-sync (`/api/cron/etsy-sync`) — 10:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard in sync loop |
| SiteId | ✅ PASS | Loops sites with Etsy config |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ⚠️ ACCEPTABLE | Import failure catches record error and return (not silent) |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | Returns per-site results |

### ✅ verify-indexing (`/api/cron/verify-indexing`) — 11:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | Budget guard |
| SiteId | ✅ PASS | Filters by site_id |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | URLIndexingStatus fields verified |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ content-auto-fix (`/api/cron/content-auto-fix`) — 11:00 + 18:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard |
| SiteId | ✅ PASS | Filters active sites |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ scheduled-publish (afternoon) — 16:00 UTC
Same route as 9:00 UTC — see above.

### ✅ reserve-publisher (`/api/cron/reserve-publisher`) — 21:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 280s total + 120s per-site |
| SiteId | ✅ PASS | Loops active sites, skips zenitha-yachts-med |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | 🔧 FIXED | Line 357 empty catch → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | Returns per-site results with errors |

### ✅ site-health-check (`/api/cron/site-health-check`) — 22:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Uses withCronLog |
| Budget | ✅ PASS | forEachSite handles timeouts |
| SiteId | ✅ PASS | Loops active sites |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | SiteHealthCheck fields verified |
| Empty Catches | 🔧 FIXED | 2 empty catches → both now log warnings with context |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | forEachSite handles partial failures |
| Dead Import | 🔧 FIXED | Removed unused `getSiteSeoConfigFromVault` import |

### ✅ seo-deep-review (`/api/cron/seo-deep-review`) — 0:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 280s total + 45s per article |
| SiteId | ✅ PASS | Filters active sites, skips zenitha-yachts-med |
| Import | ✅ PASS | Dynamic |
| Schema | 🔧 FIXED | **CRITICAL**: `updateData.word_count = newWC` — BlogPost has NO `word_count` field (only ArticleDraft has it). Would crash every article update that had content expansion. → Removed |
| Empty Catches | 🔧 FIXED | Sitemap ping catch + URLIndexingStatus catch → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | Returns per-article fix details |

### ✅ sweeper (`/api/cron/sweeper`) — 8:45 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | Budget guard in loop |
| SiteId | ✅ PASS | Loops active sites |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ london-news (`/api/cron/london-news`) — 6:00 UTC
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard |
| SiteId | ✅ PASS | Uses getDefaultSiteId, accepts siteId param |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | NewsItem fields verified |
| Empty Catches | 🔧 FIXED | Healthcheck catch → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ⚠️ LOW | Template data has "2025" year — cosmetic, AI generates fresh content at runtime |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ fact-verification (`/api/cron/fact-verification`) — 3:00 UTC Sunday
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard in verification loop |
| SiteId | ⚠️ LOW | FactEntry queries globally scoped (no site_id column on model) — by design for cross-site facts |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | FactEntry fields verified |
| Empty Catches | 🔧 FIXED | Healthcheck catch → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | Weekly cadence, single consumer |
| Graceful | ✅ PASS | Disconnects DB in finally block |

### ✅ commerce-trends (`/api/cron/commerce-trends`) — 4:30 UTC Monday
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ✅ PASS | 53s guard |
| SiteId | ✅ PASS | Loops active sites with commerce flag |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ seo-health-report (`/api/cron/seo-health-report`) — not scheduled (triggered manually)
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | 🔧 FIXED | Unused `BUDGET_MS` constant → removed (report is fast, single query batch) |
| SiteId | 🔧 FIXED | `analyzeSchemacoverage()` was globally scoped → added siteId parameter |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | SeoReport + SeoAuditResult fields verified |
| Empty Catches | 🔧 FIXED | Healthcheck catch → added logging |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ real-time-optimization (`/api/cron/real-time-optimization`) — not scheduled
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ⚠️ LOW | No budget guard — but only reads data + flags, no AI/network calls |
| SiteId | 🔧 FIXED | `blogPost.findMany` was querying ALL sites → added `siteId: { in: activeSites }` filter |
| Import | ✅ PASS | Dynamic |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | Read-only |
| Graceful | ✅ PASS | |

### ✅ auto-generate (`/api/cron/auto-generate`) — not scheduled
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ⚠️ DELEGATED | Delegates to `autoContentScheduler` which has own budget |
| SiteId | ✅ DELEGATED | Handled by autoContentScheduler |
| Import | ✅ PASS | |
| Schema | ✅ DELEGATED | |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ autopilot (`/api/cron/autopilot`) — not scheduled
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ PASS | Standard pattern |
| Budget | ⚠️ LOW | POST handler missing withTimeout wrapper — but not scheduled, manual trigger only |
| SiteId | ✅ PASS | |
| Import | ✅ PASS | |
| Schema | ✅ PASS | |
| Empty Catches | ✅ PASS | |
| Null Checks | ✅ PASS | |
| Hardcoded | ✅ PASS | |
| Race Conditions | ✅ N/A | |
| Graceful | ✅ PASS | |

### ✅ daily-publish (`/api/cron/daily-publish`) — DEPRECATED
| Check | Status | Notes |
|-------|--------|-------|
| Auth | ✅ N/A | Deprecation stub — returns 410 Gone |
| All Others | ✅ N/A | 55-line no-op, logs deprecation notice |

---

## Summary of Fixes Applied This Session

### CRITICAL (would crash at runtime)
1. **seo-deep-review line 335**: `updateData.word_count = newWC` — BlogPost has no `word_count` field → **REMOVED**
2. **trends-monitor line 467**: `status: "completed"` was top-level on `SeoReport.create` — SeoReport has no `status` field → **MOVED inside data JSON**

### HIGH (data integrity / security)
3. **trends-monitor POST**: No auth check on POST handler → **ADDED CRON_SECRET auth**
4. **real-time-optimization**: Missing siteId on `blogPost.findMany` (queried ALL sites) → **ADDED siteId filter**
5. **analytics**: Top-level `import { prisma }` (crash risk on cold start) → **CHANGED to dynamic import**
6. **analytics**: Missing `site_id` on `AnalyticsSnapshot.create` → **ADDED getDefaultSiteId()**
7. **social**: Top-level `import { prisma }` → **CHANGED to dynamic import**
8. **social**: No budget guard in post loop → **ADDED 53s BUDGET_MS check**
9. **seo-orchestrator**: Status always "completed" even with errors → **FIXED: "failed" when errors exist**
10. **seo-health-report**: `analyzeSchemacoverage()` not scoped by siteId → **ADDED siteId parameter**
11. **affiliate-injection**: `content_ar` could be null → **ADDED null guard**
12. **site-health-check**: Dead import `getSiteSeoConfigFromVault` → **REMOVED**

### MEDIUM (observability / logging)
13. **google-indexing**: 4 empty catches → **ADDED contextual logging**
14. **google-indexing**: Hardcoded `"yalla-london"` → **REPLACED with getDefaultSiteId()**
15. **trends-monitor**: Empty catch at line 518 → **ADDED logging**
16. **seo-orchestrator**: Healthcheck empty catch → **ADDED logging**
17. **seo-deep-review**: Sitemap ping empty catch → **ADDED logging**
18. **seo-deep-review**: URLIndexingStatus empty catch → **ADDED logging**
19. **reserve-publisher**: Empty catch at line 357 → **ADDED logging**
20. **site-health-check**: 2 empty catches → **ADDED contextual logging**
21. **seo-health-report**: Healthcheck empty catch → **ADDED logging**
22. **seo-health-report**: Unused `BUDGET_MS` variable → **REMOVED**
23. **social**: Healthcheck empty catch → **ADDED logging**
24. **content-selector**: Healthcheck empty catch → **ADDED logging**
25. **london-news**: Healthcheck empty catch → **ADDED logging**
26. **fact-verification**: Healthcheck empty catch → **ADDED logging**

---

## Smoke Test Results

| Test | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| All 27 cron route files parse correctly | ✅ |
| No top-level prisma imports remaining in cron routes | ✅ |
| All empty catches either log or are acceptable patterns | ✅ |

---

## Known Low-Priority Items (Not Fixed — Acceptable Risk)

| Cron | Issue | Risk | Reason |
|------|-------|------|--------|
| london-news | Template seed data has "2025" year | LOW | AI generates fresh content at runtime; templates are just seeds |
| fact-verification | FactEntry queries globally scoped | LOW | By design — facts span sites |
| real-time-optimization | No budget guard | LOW | Read-only, no AI calls |
| autopilot POST | Missing withTimeout wrapper | LOW | Not scheduled, manual trigger only |
| scheduled-publish | No atomic claiming on ScheduledContent | LOW | Runs 2x daily, very low collision risk |

---

# Round 2 — Indexing & Sequencing Deep Audit

**Date:** 2026-02-27
**Focus:** Indexing pipeline integrity, cron sequencing, state machine correctness
**Scope:** All indexing-related crons + supporting libraries × 10 NEW validation categories
**Result:** 16 issues found, 16 fixed. TypeScript: 0 errors.

---

## Round 2 Validation Categories (10 new)

| # | Category | What it checks |
|---|----------|---------------|
| 1 | **IndexNow Submission Integrity** | Batch POST (not per-URL GET), correct siteUrl, key present |
| 2 | **Indexing State Machine** | Status transitions: discovered → submitted → indexed. No invalid states written |
| 3 | **Cron Ordering & Dependencies** | Upstream cron produces data before downstream consumes it |
| 4 | **Data Handoff Between Crons** | DB fields written by producer match fields read by consumer |
| 5 | **Retry & Backoff Logic** | Atomic increment on `submission_attempts`, proper retry thresholds |
| 6 | **Duplicate Submission Prevention** | Same URL not submitted by multiple crons in same cycle |
| 7 | **Stale Data Propagation** | Module-level constants not cached across multi-site runs |
| 8 | **Batch Size & Memory Limits** | All `findMany` queries have `take` limits, IndexNow batch ≤ 10,000 |
| 9 | **Timestamp & Date Handling** | Date comparisons use correct units, no timezone bugs |
| 10 | **Error Recovery & Partial Failure** | Failed items don't block remaining batch, status reflects reality |

---

## Indexing Pipeline Sequence Analysis

```
09:00  content-selector    → publishes BlogPost, calls submitUrlImmediately()
09:00  scheduled-publish   → publishes ScheduledContent, batch IndexNow
09:15  google-indexing      → discovers new URLs, submits IndexNow + GSC sitemap
11:00  verify-indexing      → checks GSC URL Inspection API for submitted URLs
13:00  content-selector #2  → more publications
16:00  scheduled-publish #2 → afternoon publish round
17:00  content-selector #3  → evening selection
20:00  seo-agent #3         → discovers new URLs, writes "discovered" to URLIndexingStatus
21:00  reserve-publisher    → publishes reservoir articles, calls submitUrlImmediately()
00:00  seo-deep-review      → retries failed IndexNow for stale URLs
07:00  seo-agent #1         → morning discovery
07:30  seo/cron             → daily IndexNow + GSC sitemap submission
```

### Sequencing Findings

| Check | Status | Detail |
|-------|--------|--------|
| content-selector → google-indexing (09:00 → 09:15) | ✅ | 15 min gap sufficient |
| google-indexing → verify-indexing (09:15 → 11:00) | ✅ | 1:45 gap allows GSC processing |
| seo-agent writes "discovered" → seo/cron reads "discovered" | ✅ | seo-agent runs before seo/cron on same day |
| seo-deep-review retries after all daily submissions | ✅ | 00:00 UTC = after all daily runs |
| reserve-publisher (21:00) → verify-indexing (11:00 next day) | ✅ | 14h gap OK — GSC needs time |
| verify-indexing checks 6h window | ✅ | Prevents re-checking URLs checked earlier same day |

---

## Issues Found & Fixed (Round 2)

### Fix R2-01: scheduled-publish — per-URL IndexNow GET → batch POST
**Category:** IndexNow Submission Integrity
**Severity:** HIGH
**File:** `app/api/cron/scheduled-publish/route.ts`
**Problem:** Used individual `fetch("https://api.indexnow.org/indexnow?url=...")` per published URL instead of batch POST via `submitToIndexNow()`. Also, IndexNow and orphan check were in the same try/catch — IndexNow failure killed orphan diagnostics.
**Fix:** Switched to `submitToIndexNow()` batch POST grouped by site. Separated IndexNow into its own try/catch. Moved orphan check to its own block.

### Fix R2-02: seo/cron trackSubmittedUrls — blanket status update
**Category:** Indexing State Machine
**Severity:** HIGH
**File:** `app/api/seo/cron/route.ts`
**Problem:** `trackSubmittedUrls()` updated ALL `discovered`/`pending` URLs for a site to "submitted" after ANY IndexNow success — could mark ancient URLs as submitted when they weren't in the batch.
**Fix:** Added time window filter: only URLs with `created_at >= 10 minutes ago` or `updated_at >= 10 minutes ago` are transitioned.

### Fix R2-03: google-indexing — cross-site URLIndexingStatus in response
**Category:** Duplicate Submission Prevention / Data Handoff
**Severity:** MEDIUM
**File:** `app/api/cron/google-indexing/route.ts`
**Problem:** Summary query for URLIndexingStatus had no site filter — response included all sites' data.
**Fix:** Added `where: { site_id: { in: siteIds } }` to the findMany query.

### Fix R2-04: google-indexing — repeated dynamic import in loop
**Category:** Stale Data Propagation
**Severity:** LOW
**File:** `app/api/cron/google-indexing/route.ts`
**Problem:** `getDefaultSiteId` imported inside stuck-page resubmission loop — redundant per-iteration dynamic import.
**Fix:** Moved import above the loop.

### Fix R2-05: seo-deep-review — status update regardless of IndexNow success
**Category:** Indexing State Machine / Error Recovery
**Severity:** HIGH
**File:** `app/api/cron/seo-deep-review/route.ts`
**Problem:** URLIndexingStatus was updated to "submitted" with `submitted_indexnow: true` even when IndexNow submission failed.
**Fix:** Made status/submitted_indexnow/last_submitted_at conditional on `indexNowSuccess`. Only `submission_attempts` increments unconditionally.

### Fix R2-06: indexing-service — empty catch in submitUrlImmediately upsert
**Category:** Error Recovery
**Severity:** MEDIUM
**File:** `lib/seo/indexing-service.ts`
**Problem:** URLIndexingStatus upsert failure was silently swallowed.
**Fix:** Added `console.warn` with URL and error details.

### Fix R2-07: indexing-service — 3 empty catches in pingSitemaps
**Category:** Error Recovery
**Severity:** MEDIUM
**File:** `lib/seo/indexing-service.ts`
**Problem:** GSC config loading and sitemap ping failures silently swallowed.
**Fix:** Added `console.warn` with context to all 3 catch blocks.

### Fix R2-08: indexing-service — empty catch in runAutomatedIndexing
**Category:** Error Recovery
**Severity:** MEDIUM
**File:** `lib/seo/indexing-service.ts`
**Problem:** Two empty catches in runAutomatedIndexing for URLIndexingStatus query and GSC config loading.
**Fix:** Added `console.warn` with error details.

### Fix R2-09: indexing-service — unbounded getAllIndexableUrls
**Category:** Batch Size & Memory Limits
**Severity:** HIGH
**File:** `lib/seo/indexing-service.ts`
**Problem:** `getAllIndexableUrls()` blogPost query had no `take` limit — could OOM on large sites.
**Fix:** Added `take: 2000`.

### Fix R2-10: indexing-service — non-atomic submission_attempts increment
**Category:** Retry & Backoff Logic
**Severity:** HIGH
**File:** `lib/seo/indexing-service.ts` (retryFailedIndexing)
**Problem:** `submission_attempts: (record.submission_attempts || 0) + 1` reads stale value from initial query. Concurrent retries could under-count attempts, allowing URLs past the 5-attempt limit.
**Fix:** Changed to Prisma's atomic `submission_attempts: { increment: 1 }`.

### Fix R2-11: indexing-service — submitUrlImmediately sitemap never awaited
**Category:** Data Handoff Between Crons
**Severity:** HIGH
**File:** `lib/seo/indexing-service.ts`
**Problem:** `pingSitemaps()` was fire-and-forget with `.then()` — the `sitemap` return value was always `false` because the Promise resolved after the function returned.
**Fix:** Changed to `await` with `try/catch` so return value accurately reflects sitemap ping result.

### Fix R2-12: indexing-service — unbounded yacht URL queries (new + updated)
**Category:** Batch Size & Memory Limits
**Severity:** MEDIUM
**File:** `lib/seo/indexing-service.ts` (getNewUrls + getUpdatedUrls)
**Problem:** 6 yacht-related queries (Yacht, YachtDestination, CharterItinerary × 2 functions) had no `take` limits — bulk import could OOM.
**Fix:** Added `take: 500` to all 6 queries.

### Fix R2-13: indexing-service — unbounded getUpdatedUrls blogPost query
**Category:** Batch Size & Memory Limits
**Severity:** MEDIUM
**File:** `lib/seo/indexing-service.ts`
**Problem:** `getUpdatedUrls()` blogPost query had no `take` limit.
**Fix:** Added `take: 2000`.

### Fix R2-14: daily-content-generate — zombie topics from silent catch
**Category:** Indexing State Machine / Error Recovery
**Severity:** HIGH
**File:** `app/api/cron/daily-content-generate/route.ts`
**Problem:** Two `.catch(() => {})` on topic status update to "published" during dedup. If DB update fails, topic stays in "generating" state forever — never picked up again.
**Fix:** Changed to `.catch((e) => console.warn(...))` with topic ID context.

### Fix R2-15: seo-agent — detectContentGaps cross-site leakage
**Category:** Duplicate Submission Prevention / SiteId Scoping
**Severity:** HIGH
**File:** `app/api/cron/seo-agent/route.ts`
**Problem:** `detectContentGaps()` queried all categories with all posts globally — no siteId filter. Content gap reports contaminated by other sites' data.
**Fix:** Added `...(siteId ? { siteId } : {})` to the posts `where` clause inside the Category include.

### Fix R2-16: verify-indexing — added inline documentation
**Category:** Cron Ordering & Dependencies
**Severity:** LOW
**File:** `app/api/cron/verify-indexing/route.ts`
**Problem:** No documentation explaining the 6h check interval rationale and GSC API quota.
**Fix:** Added comment explaining GSC 2000 inspections/day quota and check frequency math.

---

## Round 2 Summary

| Category | Checks | Issues Found | Fixed |
|----------|--------|-------------|-------|
| IndexNow Submission Integrity | 8 crons | 1 (scheduled-publish GET) | ✅ |
| Indexing State Machine | 8 crons | 3 (seo/cron, seo-deep-review, daily-content-generate) | ✅ |
| Cron Ordering & Dependencies | Full pipeline | 0 (sequence is correct) | ✅ |
| Data Handoff Between Crons | 8 handoffs | 1 (submitUrlImmediately sitemap) | ✅ |
| Retry & Backoff Logic | 3 retry paths | 1 (non-atomic increment) | ✅ |
| Duplicate Submission Prevention | 5 submission points | 1 (google-indexing response) | ✅ |
| Stale Data Propagation | 6 module constants | 1 (google-indexing loop import) | ✅ |
| Batch Size & Memory Limits | 14 queries | 8 (yacht queries + blog queries) | ✅ |
| Timestamp & Date Handling | 6 date comparisons | 0 (all correct) | ✅ |
| Error Recovery & Partial Failure | 12 catch blocks | 6 (empty catches + conditional status) | ✅ |
| **TOTAL** | | **16** | **16 ✅** |

---

## Files Modified in Round 2

| File | Changes |
|------|---------|
| `app/api/cron/scheduled-publish/route.ts` | Batch IndexNow + separated try/catch |
| `app/api/seo/cron/route.ts` | Time-windowed status transition |
| `app/api/cron/google-indexing/route.ts` | Site filter on response + loop import |
| `app/api/cron/seo-deep-review/route.ts` | Conditional IndexNow status update |
| `app/api/cron/verify-indexing/route.ts` | Documentation |
| `app/api/cron/seo-agent/route.ts` | siteId filter on content gaps |
| `app/api/cron/daily-content-generate/route.ts` | Zombie topic catch logging |
| `lib/seo/indexing-service.ts` | Atomic increment, await sitemap, batch limits, empty catches |

---

## Known Low-Priority Items (Round 2 — Not Fixed)

| Area | Issue | Risk | Reason |
|------|-------|------|--------|
| indexing-service.ts | Module-level `BASE_URL`/`GSC_SITE_URL`/`INDEXNOW_KEY` captured at import | LOW | Functions accept siteUrl/key params that override; only affects callers that don't pass params |
| build-runner.ts | findFirst + updateMany gap in topic claiming | LOW | Already mitigated by `phase_started_at` soft-lock check |
| seo-agent | detectContentGaps reports categories with 0 posts as gaps even for new sites | LOW | Acceptable — informational only |
| content-selector | Concurrent bilingual pair promotion risk | LOW | MAX_ARTICLES_PER_RUN=2, collision extremely unlikely |
| weekly-topics | No atomic dedup guard on topic creation loop | LOW | Runs once weekly on Monday only |

---

# Round 3 — News Pipeline & Indexing Flow Audit

**Date:** 2026-02-27
**Focus:** News content lifecycle, news → indexing flow, cross-site scoping
**Result:** 8 issues found, 8 fixed. TypeScript: 0 errors.

---

## News Pipeline Trace

```
london-news cron (6am UTC)
  ├── Templates (seasonal) → NewsItem (DB, status=published)
  ├── Grok live search → NewsItem (DB, status=published)
  └── FactEntry (cross-reference with info articles)

NewsItem (DB)
  ├── /news (listing page) → getAllNews() query
  ├── /news/[slug] (detail page) → getNewsItem() query
  ├── sitemap.ts → includes /news/* URLs
  └── ❌ indexing-service.ts → DID NOT discover news URLs (FIXED)

indexing-service.ts
  ├── getAllIndexableUrls() → blog + yacht + ❌ news (FIXED: now includes news)
  ├── getNewUrls() → blog + yacht + ❌ news (FIXED: now includes news)
  └── getUpdatedUrls() → blog + yacht + ❌ news (FIXED: now includes news)
```

---

## Issues Found & Fixed (Round 3)

### Fix R3-01: indexing-service — news URLs not discovered
**Severity:** CRITICAL
**Files:** `lib/seo/indexing-service.ts`
**Problem:** `getAllIndexableUrls()`, `getNewUrls()`, and `getUpdatedUrls()` all queried blog posts and yacht pages but completely ignored news URLs. News pages were in the sitemap but never submitted to IndexNow.
**Fix:** Added NewsItem queries to all 3 functions with proper siteId filter, expiry check, and `take` limits (500/200/200).

### Fix R3-02: london-news cron — no IndexNow on publish
**Severity:** CRITICAL
**File:** `app/api/cron/london-news/route.ts`
**Problem:** News items were created and saved to DB but never submitted to IndexNow. The cron had no integration with the indexing service.
**Fix:** Added step 7c: after creating news items, calls `submitUrlImmediately()` for each new URL with budget guard.

### Fix R3-03: News listing — missing siteId filter
**Severity:** HIGH
**File:** `app/news/page.tsx`
**Problem:** `getAllNews()` queried `prisma.newsItem.findMany()` without siteId filter — returned news from all sites.
**Fix:** Added `siteId` from request headers to the where clause.

### Fix R3-04: News detail — missing siteId filter
**Severity:** HIGH
**File:** `app/news/[slug]/page.tsx`
**Problem:** `getNewsItem()` used `findUnique({ where: { slug } })` — no siteId filter. Could return news from wrong site on slug collision.
**Fix:** Changed to `findFirst({ where: { slug, siteId } })` with siteId from request headers.

### Fix R3-05: News listing — silent empty catch
**Severity:** MEDIUM
**File:** `app/news/page.tsx`
**Problem:** DB query failure silently caught with `catch {}` — no logging.
**Fix:** Added `console.warn` with error details.

### Fix R3-06: News detail — silent empty catch
**Severity:** MEDIUM
**File:** `app/news/[slug]/page.tsx`
**Problem:** DB query failure silently caught with `catch {}` — no logging.
**Fix:** Added `console.warn` with error details.

### Fix R3-07: Content indexing API — news not shown
**Severity:** HIGH
**File:** `app/api/admin/content-indexing/route.ts`
**Problem:** Admin content indexing dashboard only showed blog posts and yacht pages — news articles were invisible. Khaled couldn't see news indexing status.
**Fix:** Added section 4c: queries published NewsItem records and appends to articles array with indexing status from URLIndexingStatus. Also included news URLs in the indexing records lookup query.

### Fix R3-08: Content indexing API — news URLs in lookup query
**Severity:** MEDIUM
**File:** `app/api/admin/content-indexing/route.ts`
**Problem:** URLIndexingStatus lookup query only included blog and yacht URLs — any indexing records for news URLs would be missed.
**Fix:** Added news page slugs and URLs to the lookup arrays.

---

## Round 3 Summary

| Category | Issues Found | Fixed |
|----------|-------------|-------|
| News URL discovery (indexing-service) | 1 CRITICAL | ✅ |
| News IndexNow on publish (london-news) | 1 CRITICAL | ✅ |
| News cross-site scoping (listing + detail) | 2 HIGH | ✅ |
| News dashboard visibility (content-indexing) | 2 HIGH+MEDIUM | ✅ |
| Silent empty catches | 2 MEDIUM | ✅ |
| **TOTAL** | **8** | **8 ✅** |

---

## Files Modified in Round 3

| File | Changes |
|------|---------|
| `lib/seo/indexing-service.ts` | Added news URL discovery to all 3 URL functions |
| `app/api/cron/london-news/route.ts` | Added IndexNow submission via submitUrlImmediately |
| `app/news/page.tsx` | Added siteId filter + empty catch logging |
| `app/news/[slug]/page.tsx` | Changed findUnique→findFirst with siteId + empty catch logging |
| `app/api/admin/content-indexing/route.ts` | Added news items to dashboard + URL lookup query |

---

## News Indexing Flow (After Fixes)

```
london-news cron (6am UTC)
  ├── Creates NewsItem (DB, status=published)
  └── submitUrlImmediately() → IndexNow + URLIndexingStatus ← NEW

seo/cron (7:30am UTC)
  ├── runAutomatedIndexing()
  │   ├── getNewUrls() → includes /news/* URLs ← FIXED
  │   └── submitToIndexNow() → batch submit
  └── trackSubmittedUrls() → update URLIndexingStatus

google-indexing (9:15am UTC)
  └── URLIndexingStatus discovery → includes news URLs ← FIXED

verify-indexing (11am UTC)
  └── GSC URL Inspection API → checks news URLs ← FIXED (via URLIndexingStatus)

content-indexing admin API
  └── Shows news articles with indexing status ← FIXED
```

---

## Round 3 Continued: Deep Validation (10 Categories × All Crons)

**Date:** 2026-02-27 (continuation)
**Scope:** 10 new validation categories applied to all 27 cron jobs via 3 parallel audit agents (content pipeline, SEO/indexing, utility/monitoring)

### Round 3 Validation Categories

| # | Category | What it checks |
|---|----------|---------------|
| 1 | **CronLog Accuracy** | `itemsProcessed`/`itemsSucceeded` reflect actual work done (articles, URLs), not proxy counts (sites) |
| 2 | **Budget Expiry Mid-Batch** | Budget checks BEFORE initializing per-item state, not after. Skipped items logged. |
| 3 | **Multi-Site Failure Isolation** | One site's failure doesn't crash the entire cron — per-site try/catch |
| 4 | **Response Shape vs Dashboard** | API response matches what cockpit/departures board expects |
| 5 | **Idempotency** | Re-runs don't needlessly bump `updated_at` or inflate fix counts |
| 6 | **Data Freshness** | Status transitions use time windows (not blanket updates) |
| 7 | **Cascading Failure Isolation** | Downstream failures (IndexNow, sitemap ping) don't crash the main cron |
| 8 | **Query Efficiency** | Unbounded queries have `take` limits, counters use atomic operations |
| 9 | **Env Var Resilience** | Cron runs gracefully when optional env vars (INDEXNOW_KEY, GSC credentials) are unset |
| 10 | **Return Value Completeness** | Success and error paths both return structured data for CronJobLog |

### Fixes Applied (Round 3 Continued)

#### Fix R3-C1: daily-content-generate — CronLog logs site count, not article count
**File:** `app/api/cron/daily-content-generate/route.ts`
**Category:** CronLog Accuracy (#1)
**Problem:** `logCronExecution` reported `sitesProcessed` count and `resultSummary.sites` (number of sites). Dashboard sees this as "processed 4 items" when the cron actually generated 6 articles across 4 sites.
**Fix:** Extract per-article counts from `result.sites[siteId].results[]` and pass as `itemsProcessed` (total articles attempted), `itemsSucceeded` (articles with `status === "success"`), `itemsFailed` (the difference). `resultSummary` now includes `totalArticles`, `successArticles`, `sitesCount`.

#### Fix R3-C2: reserve-publisher — Budget exhaustion misreports processed site count
**File:** `app/api/cron/reserve-publisher/route.ts`
**Category:** CronLog Accuracy (#1) + Budget Expiry Mid-Batch (#2)
**Problem:** `itemsProcessed: activeSites.length` always reports total active sites, even when budget exhaustion skipped some. Dashboard shows "processed 4 sites" when only 2 were processed.
**Fix:** Changed `itemsProcessed: results.length` to count only sites that actually had their siteResult created and pushed. `sitesProcessed` now uses `results.map(r => r.siteId)` instead of the full `activeSites` array. Added explicit log when budget skips sites: lists skipped site IDs.

#### Fix R3-C3: seo-deep-review — Informational entries inflate fix counts
**File:** `app/api/cron/seo-deep-review/route.ts`
**Category:** Idempotency (#5) + CronLog Accuracy (#1)
**Problem:** `ArticleFix.fixes[]` mixed actual data changes ("Meta title generated", "Injected 3 internal links") with informational observations ("Canonical verified", "Bilingual content present", "All checks passed"). `totalFixes` counted all entries, making CronLog report "12 fixes applied" when only 5 were real changes.
**Fix:** Added `notes: string[]` field to `ArticleFix` interface. Moved 4 informational entries from `fixes` to `notes`: canonical verification, hreflang check, H2 count warning, "all checks passed". `totalFixes` now counts only actual data changes. CronLog `itemsSucceeded` changed from "articles with no errors" to "articles that received actual fixes". Response includes both `totalFixes` and `totalNotes` for dashboard clarity.

#### Fix R3-C4: seo/cron — Per-site failure isolation missing
**File:** `app/api/seo/cron/route.ts`
**Category:** Multi-Site Failure Isolation (#3) + CronLog Accuracy (#1)
**Problem:** In all 3 site-loop switch cases (daily, weekly, new), `runAutomatedIndexing()` was called without try/catch. If site A threw, the outer catch triggered, returning 500 and skipping sites B/C/D entirely. One broken site brought down the entire SEO indexing cron.
**Fix:** Wrapped every per-site `runAutomatedIndexing` + `trackSubmittedUrls` call in individual try/catch blocks across all 3 cases (daily, weekly, new). Failed sites get `{ error: msg }` in actions array instead of crashing the loop. CronLog now reports `totalUrlsProcessed` (sum of all `report.urlsProcessed`) and `siteErrors` (count of failed sites) instead of just `actionsCount`. Status degrades to "failed" only when ALL sites fail and zero URLs were processed.

### Round 3 Summary

| Fix | File | Category | Severity |
|-----|------|----------|----------|
| R3-C1 | daily-content-generate | CronLog Accuracy | HIGH |
| R3-C2 | reserve-publisher | CronLog Accuracy + Budget | HIGH |
| R3-C3 | seo-deep-review | Idempotency + CronLog | MEDIUM |
| R3-C4 | seo/cron | Failure Isolation + CronLog | HIGH |

### Files Modified (Round 3 Continued)

| File | Changes |
|------|---------|
| `app/api/cron/daily-content-generate/route.ts` | CronLog now reports per-article counts instead of site counts |
| `app/api/cron/reserve-publisher/route.ts` | itemsProcessed tracks actual processed sites; budget skip logged |
| `app/api/cron/seo-deep-review/route.ts` | Added `notes[]` field; separated informational from real fixes |
| `app/api/seo/cron/route.ts` | Per-site try/catch in all 3 switch cases; CronLog reports URL counts |

### Cumulative Stats (Rounds 1-3)

| Round | Checks | Fixes | Files Modified |
|-------|--------|-------|---------------|
| Round 1 | 270 (27 crons × 10 categories) | 26 | 14 |
| Round 2 | 10 categories (indexing focus) | 16 | 8 |
| Round 3 | 10 categories (deep accuracy) | 12 | 9 |
| **Total** | **30 categories, 27 crons** | **54** | **~20 unique files** |

**TypeScript:** 0 errors after all rounds.
