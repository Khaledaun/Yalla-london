# Yalla London - Cron Operations & System Status Summary

**Last Updated**: February 14, 2026
**Branch**: `claude/seo-agent-orchestration-7JOkl`

---

## Active Sites

Only **yalla-london** is currently active. The other 4 sites (arabaldives, yalladubai, yallaistanbul, yallathailand) are inactive and excluded from all cron processing to save AI tokens and avoid timeouts.

Controlled by `getActiveSiteIds()` in `config/sites.ts`.

---

## Cron Schedule (UTC)

| Time | Job | Endpoint | Status |
|------|-----|----------|--------|
| 03:00 | Analytics Sync | `/api/cron/analytics` | Working - syncs GA4 + GSC data |
| 04:00 Mon | Weekly Topics | `/api/cron/weekly-topics` | Working - requires XAI_API_KEY or AI provider |
| 05:00 | Daily Content Generation | `/api/cron/daily-content-generate` | Working - requires AI provider (Grok preferred) |
| 05:00 Sun | SEO Orchestrator (weekly) | `/api/cron/seo-orchestrator?mode=weekly` | Working |
| 06:00 | Trends Monitor | `/api/cron/trends-monitor` | Partial - may timeout on external API calls |
| 06:00 | SEO Orchestrator (daily) | `/api/cron/seo-orchestrator?mode=daily` | Working |
| 07:00 | SEO Agent Run 1 | `/api/cron/seo-agent` | Working - 13-step autonomous agent |
| 07:30 | SEO Cron (daily) | `/api/seo/cron?task=daily` | Working |
| 08:00 Sun | SEO Cron (weekly) | `/api/seo/cron?task=weekly` | Working |
| 09:00 | Scheduled Publish (AM) | `/api/cron/scheduled-publish` | Working |
| 10:00 | Google Indexing | `/api/cron/google-indexing` | Working - requires INDEXNOW_KEY + GSC creds |
| 13:00 | SEO Agent Run 2 | `/api/cron/seo-agent` | Working |
| 16:00 | Scheduled Publish (PM) | `/api/cron/scheduled-publish` | Working |
| 20:00 | SEO Agent Run 3 | `/api/cron/seo-agent` | Working |

**Not in cron schedule (manual only):**
- `/api/cron/social` - Social posting (MOCK - not integrated with real APIs)
- `/api/cron/london-news` - London news aggregation
- `/api/cron/site-health-check` - Cross-site health check

---

## Environment Variables Status

### Confirmed Working
| Variable | Purpose | Notes |
|----------|---------|-------|
| `DATABASE_URL` | PostgreSQL via Supabase | PgBouncer session mode, `connection_limit=1` |
| `DIRECT_URL` | Direct DB connection | Used for migrations |
| `CRON_SECRET` | Cron auth | Required for all cron endpoints |
| `XAI_API_KEY` | Grok AI (primary) | Used for EN content generation, trending topics |
| `TWITTER_API_KEY` | X/Twitter API | Recently configured on Vercel |

### Needs Verification
| Variable | Purpose | How to Verify |
|----------|---------|---------------|
| `GA4_PROPERTY_ID` | GA4 Data API | Analytics cron returns `status: "success"` with metrics |
| `GOOGLE_ANALYTICS_CLIENT_EMAIL` | GA4 service account | Same as above |
| `GOOGLE_ANALYTICS_PRIVATE_KEY` | GA4 private key | Watch for `\\n` vs real newline encoding issues |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` | GSC API | Google indexing cron returns `hasGscCredentials: true` |
| `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` | GSC API | Same as above |
| `INDEXNOW_KEY` | Bing/Yandex indexing | Google indexing cron returns `hasIndexNowKey: true` |
| `GSC_SITE_URL` | GSC site URL | Must match exactly what's in Search Console |

### Missing / Not Yet Configured
| Variable | Purpose | Impact |
|----------|---------|--------|
| `TWITTER_API_SECRET` | X/Twitter posting | Social cron can't post to X |
| `TWITTER_ACCESS_TOKEN` | X/Twitter posting | Social cron can't post to X |
| `TWITTER_ACCESS_TOKEN_SECRET` | X/Twitter posting | Social cron can't post to X |
| `GOOGLE_PAGESPEED_API_KEY` | PageSpeed Insights | SEO agent skips Core Web Vitals check |
| `SERPAPI_API_KEY` | Google Trends | Trends monitor may not fetch trends |

---

## Problems Encountered & Solutions

### 1. Cron Timeouts (5 sites x 120s budget)
**Problem**: Daily content generation (54s) and SEO agent (66s) were timing out because they processed all 5 sites sequentially.
**Solution**: Created `getActiveSiteIds()` that returns only `["yalla-london"]`. All cron routes now use this function instead of `getAllSiteIds()`. Reduced processing time by ~80%.
**Files Changed**: `config/sites.ts`, 5 cron route files.

### 2. Silent Failures (HTTP 200 with errors)
**Problem**: 12+ try-catch blocks in cron routes swallow errors and return HTTP 200, making it impossible to tell if a job actually worked.
**Solution**: Enhanced test dashboard (`test-connections.html`) with `extractJobDetails()` that parses response JSON for known failure patterns and surfaces them prominently. Also enhanced `renderJsonResult()` to auto-generate recommendations from failures.

### 3. Google Indexing Errors
**Problem**: Google indexing was reporting "3 error(s)" because it was submitting URLs for non-existent sites.
**Solution**: Switched to `getActiveSiteIds()` so only yalla-london URLs are submitted. Also enhanced the cron response to include per-URL status from `URLIndexingStatus` table.

### 4. Analytics Cron Missing Details
**Problem**: Analytics cron returned only basic session/pageview counts, missing bounce rate, engagement, top pages, sources, and alerts.
**Solution**: Enhanced `analytics/route.ts` to return full GA4 metrics including alerts (high bounce rate, low engagement, low sessions, short duration), top pages with views/sessions, traffic sources, and insights (pages/session, new vs returning).

### 5. Social Posting is MOCK
**Problem**: Social cron marks posts as "published" in DB but does NOT actually post to any platform.
**Solution**: Documented clearly in test dashboard. Added section 21b (X/Twitter API & Social Integration) that shows mock status and lists exactly what env vars and code changes are needed for real integration.
**Status**: Awaiting real Twitter API v2 integration in `app/api/cron/social/route.ts`.

### 6. Trends Monitor "Fetch is aborted"
**Problem**: Client-side 55s timeout causes the trends monitor test to abort.
**Solution**: This is expected behavior when external APIs (SerpAPI, Google Trends) are slow. The cron itself has a 120s Vercel budget. Test dashboard now shows clear explanation.

### 7. PgBouncer Connection Issues
**Problem**: Supabase PgBouncer in session mode can exhaust connection slots when multiple cron jobs run concurrently.
**Solution**: Added `connection_limit=1` to DATABASE_URL. Cron jobs are scheduled at different times to avoid overlap. DB circuit breaker in SEO agent skips remaining DB operations if first query fails.

### 8. Build Failure - x-post-embed.tsx
**Problem**: TypeScript error "Not all code paths return a value" in useEffect.
**Solution**: Replaced bare `return` statements with `return undefined` for consistent return types. Commit `52f3853`.

---

## Test Dashboard Enhancements

The test dashboard at `/test-connections.html` now includes:

### Quick Test Mode (no auth needed)
- Sections 1-6: GA4 tag, static assets, blog pages, DB connection, API health, sitemap/robots

### Full Pipeline Test (needs CRON_SECRET)
- **Section 7**: Content generation pipeline
- **Section 8**: Trends monitor with Grok/X social trends
- **Section 9**: London news aggregation
- **Section 10**: Scheduled publish
- **Section 11**: Analytics sync (extensive GA4 + GSC data, alerts, top pages, sources, insights)
- **Section 12**: SEO agent (13-step autonomous agent)
- **Section 13**: SEO daily cron
- **Section 14**: SEO orchestrator
- **Section 15**: Health monitor
- **Section 16**: SEO indexing (admin stats + cron healthcheck for IndexNow/GSC credential status)
- **Section 17**: GA4 server-side data API
- **Section 18**: Blog content audit
- **Section 19**: SEO reports (DB proof)
- **Section 20**: Yalla London site health check
- **Section 21**: Content & indexing deep audit (per-site breakdown, stuck pages, errors)
- **Section 21b**: X/Twitter API & social integration (healthcheck, queue processing, mock status)
- **Section 22**: Database schema health (missing tables/columns scan)

### JSON Export
The "Copy JSON" button exports a comprehensive report including:
- Platform info and active sites
- Health score and verdict
- Environment variables detected as confirmed/missing
- Auto-generated recommendations
- Full cron schedule
- Known issues
- All test results grouped by section

### Run All Jobs
The "Run All Cron Jobs" button:
- Runs all 14+ cron endpoints sequentially
- Shows per-job expanded details (what was generated, where saved, why failed)
- Tracks environment variable status from responses
- Generates extensive summary JSON with copy button

---

## Architecture Notes

### AI Provider Fallback Chain
Grok (XAI_API_KEY) -> Claude -> OpenAI -> Gemini -> AbacusAI

### Key Paths
- Cron routes: `app/api/cron/` (17 endpoints)
- SEO services: `lib/seo/` (orchestrator, indexing, audit, analytics)
- Site config: `config/sites.ts` (5 sites, active site filtering)
- DB singleton: `lib/db.ts` (Prisma with PgBouncer)
- Test dashboard: `public/test-connections.html`

### Database
- 94 Prisma models, Supabase PostgreSQL
- Key tables: `BlogPost`, `SeoReport`, `URLIndexingStatus`, `AnalyticsSnapshot`, `CronJobLog`, `ScheduledContent`, `ModelProvider`
- Soft-delete infrastructure exists but is disabled (`SOFT_DELETE_MODELS` array is empty)

---

## Next Steps

1. **Real Twitter/X Integration**: Implement Twitter API v2 in `app/api/cron/social/route.ts`
2. **GSC URL Inspection**: Add per-URL indexing verification via GSC API
3. **Background Job Processing**: Leverage existing `BackgroundJobService` for long-running tasks
4. **Multi-site Activation**: When other sites go live, add their IDs to `LIVE_SITES` in `config/sites.ts`
5. **Monitoring Alerts**: Set up Vercel alerts for cron job failures
