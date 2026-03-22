# Fix Indexing — Single Source of Truth + Google Indexing API + Full URL Tracking

**Date:** February 28, 2026
**Status:** Implemented
**Branch:** `claude/fix-warnings-indexing-t8qSv`

---

## Problem Statement

Khaled sees **different indexing numbers every time he taps a different panel**. The dashboard is untrustworthy. Additionally, Google Search Console shows **60 indexed pages** but the cockpit shows only 6-12 — because the tracking table (`URLIndexingStatus`) only contained records for recently-published English blog posts, missing Arabic variants, static pages, information hub, news, events, walks, and category pages.

Three root causes:
1. **Two APIs computing indexing data independently** with different logic
2. **URLIndexingStatus table massively incomplete** — only ~15% of indexable URLs tracked
3. **No fast-path for time-sensitive content** (events/news have structured data qualifying for Google Indexing API)

---

## Part A: Dashboard Data Consistency (Single Source of Truth)

### The 3 Bugs Fixed

**Bug 1 — Different totals:**
- Cockpit API `total` = `URLIndexingStatus.count()` (only tracked articles)
- Content-indexing API `total` = all published BlogPosts + NewsItems + yacht pages
- Fix: Both now call `getIndexingSummary()` from shared utility

**Bug 2 — Double-counted "neverSubmitted":**
- Cockpit API: `neverSubmitted = orphanedCount + discovered` (overlap)
- Fix: `neverSubmitted` = strictly "published pages with NO tracking record"

**Bug 3 — Different status resolution:**
- One checked `status` only, other cross-checked `status` AND `indexing_state`
- Fix: Single `resolveStatus()` function used everywhere

### Files Changed

| Action | File | What Changed |
|--------|------|-------------|
| CREATE | `lib/seo/indexing-summary.ts` | Shared utility — single `getIndexingSummary()` function |
| MODIFY | `app/api/admin/cockpit/route.ts` | Replaced `buildIndexing()` with shared utility call |
| MODIFY | `app/api/admin/content-indexing/route.ts` | Replaced inline summary with shared utility call |
| MODIFY | `app/admin/cockpit/page.tsx` | Fixed progress bar and labels |

### Invariant

```
total = indexed + submitted + discovered + neverSubmitted + errors + deindexed
```

No double-counting. No exceptions. Both APIs produce identical numbers.

---

## Part B: Full URL Tracking (The 60-Page Gap Fix)

### Root Cause

The `google-indexing` cron only discovered URLs from the **last 3 days** using `getNewUrls(3)`. This missed:

| URL Type | In Sitemap | Tracked in DB | Status |
|----------|-----------|--------------|--------|
| English blog posts (recent) | Yes | Yes | OK |
| English blog posts (>3 days) | Yes | **No** | FIXED |
| Arabic blog posts (`/ar/blog/*`) | Yes | **No** | FIXED |
| Arabic news pages (`/ar/news/*`) | Yes | **No** | FIXED |
| Arabic information pages | Yes | **No** | FIXED |
| Static pages (homepage, /about, /contact, etc.) | Yes | **No** | FIXED |
| Information hub sections + articles | Yes | **No** | FIXED |
| London By Foot walks | Yes | **No** | FIXED |
| Blog category pages | Yes | **No** | FIXED |
| Shop product pages | Yes | **No** | FIXED |
| Events | Yes | Partial | FIXED |

### Fix: `syncAllUrlsToTracking()` + Enhanced `getAllIndexableUrls()`

1. **Enhanced `getAllIndexableUrls()`** (`lib/seo/indexing-service.ts`):
   - Now includes ALL URL types: static pages, categories, walks, shop products, events, information hub
   - New `includeArabic` parameter generates `/ar/*` variants for every English URL
   - No date filter — tracks ALL published content

2. **New `syncAllUrlsToTracking()`** (`lib/seo/indexing-service.ts`):
   - Seeds `URLIndexingStatus` with every indexable URL
   - Creates records as "discovered" (not submitted) so verify-indexing can check them
   - Uses `upsert` — never overwrites existing records
   - Called by `google-indexing` cron on every run

3. **Updated `verify-indexing` cron**:
   - Now checks up to 30 URLs per site per run (was 20)
   - Re-verifies "indexed" URLs every 7 days (catches deindexing)
   - Fills remaining verification slots with re-checks after handling unverified URLs

---

## Part C: Google Indexing API Integration

### Architecture

```
URL Discovery
    |
    +-- Events/News URLs --> Google Indexing API (instant, 200/day quota)
    |                        + IndexNow (Bing/Yandex backup)
    |
    +-- Blog/Other URLs --> IndexNow (Bing/Yandex)
                            + Sitemap submission (Google)
                            + GSC URL Inspection (verification)
```

### Important Limitation

Google's Indexing API only works for pages with:
- `JobPosting` structured data
- `BroadcastEvent` / `Event` structured data
- `NewsArticle` structured data

Blog content uses IndexNow + Sitemap (unchanged).

### New Files

| File | Purpose |
|------|---------|
| `lib/seo/google-indexing-api.ts` | Google Indexing API client (JWT auth, URL classification, bilingual bundling) |
| `app/api/cron/process-indexing-queue/route.ts` | New cron: submits events/news via Indexing API, others via IndexNow |

### Cron Schedule

```
process-indexing-queue: 0 7,13,20 * * *  (3x daily)
google-indexing:        15 9 * * *        (daily — handles blog content)
verify-indexing:        0 11 * * *        (daily — verifies all types)
```

### Environment Variables

```bash
# Google Indexing API (falls back to GSC credentials if not set)
GOOGLE_INDEXING_CLIENT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_INDEXING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_INDEXING_DRY_RUN=false  # Set to "true" for testing
```

---

## Part D: Dashboard Integration

### API Changes

`ArticleIndexingInfo` now includes:
- `submittedGoogleApi: boolean` — whether submitted via Google Indexing API
- `contentType: "blog" | "news" | "event" | "yacht" | "destination" | "itinerary" | "static" | "info"`

### Summary Response

Both cockpit and content-indexing APIs return:
- `dailyQuotaRemaining` — Google Indexing API daily quota remaining
- `channelBreakdown` — { indexnow, sitemap, googleApi } counts

---

## Verification Checklist

- [ ] Both APIs return identical `total`, `indexed`, `submitted`, `neverSubmitted`
- [ ] `total = indexed + submitted + discovered + neverSubmitted + errors + deindexed`
- [ ] Progress bar segments sum to 100%
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `syncAllUrlsToTracking()` creates records for Arabic variants, static pages, info hub, walks, categories
- [ ] `verify-indexing` re-checks "indexed" URLs every 7 days
- [ ] Events/news URLs classified as `indexing_api`, blogs as `standard`
- [ ] Bilingual pairs bundled: `/events/x` + `/ar/events/x` submitted together
- [ ] 200/day quota tracked in DB and respected
- [ ] Dry run mode works: `GOOGLE_INDEXING_DRY_RUN=true`

---

## Deployment Steps (for Khaled)

1. Deploy the branch
2. First `google-indexing` cron run will sync ALL URLs to tracking table
3. Cockpit numbers should immediately improve (showing real total)
4. Over next 24-48h, `verify-indexing` will check actual Google status for all URLs
5. Numbers should converge to match GSC's 60+ indexed pages
6. **Optional:** Set up Google Indexing API credentials for instant event/news indexing
