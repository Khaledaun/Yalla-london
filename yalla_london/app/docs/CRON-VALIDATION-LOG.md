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
