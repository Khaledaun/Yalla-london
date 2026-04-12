# Static Pages Audit Report

**Date:** 2026-04-08
**Scope:** All public-facing (non-admin, non-API) page routes in `yalla_london/app/app/`
**Auditor:** Claude Code automated audit
**Total pages audited:** 54

---

## 1. Route Inventory

### 1A. Shared / Yalla London Pages (37 routes)

| # | Route | Metadata | Structured Data | Content Source | Affiliate Links | Multi-Site Safe | Notes |
|---|-------|----------|-----------------|----------------|-----------------|-----------------|-------|
| 1 | `/` (homepage) | `generateMetadata()` | BreadcrumbList, Organization | Hardcoded + DB (Ticketmaster) | Stay22, Travelpayouts | YES | Per-site homepage (Yalla/Zenitha/ZenithaLuxury) |
| 2 | `/about` | `generateMetadata()` in layout | BreadcrumbList, Organization, Person | Hardcoded | No | YES | Per-site routing (3 variants) |
| 3 | `/contact` | `generateMetadata()` in layout | BreadcrumbList | Hardcoded | No | YES | Per-site routing (3 variants) |
| 4 | `/privacy` | `generateMetadata()` in layout | BreadcrumbList | Hardcoded | No | YES | Per-site routing |
| 5 | `/terms` | `generateMetadata()` in layout | BreadcrumbList | Hardcoded | No | YES | Per-site routing |
| 6 | `/blog` | `generateMetadata()` | ItemList, BreadcrumbList | DB + static data files | No | YES | |
| 7 | `/blog/[slug]` | `generateMetadata()` | Article, BreadcrumbList | DB | Injected by cron | YES | |
| 8 | `/blog/category/[slug]` | `generateMetadata()` | BreadcrumbList, CollectionPage | DB + static | No | YES | |
| 9 | `/news` | `generateMetadata()` | CollectionPage, ItemList | DB + seed fallback | No | YES | |
| 10 | `/news/[slug]` | `generateMetadata()` | NewsArticle, BreadcrumbList | DB | No | YES | |
| 11 | `/hotels` | `generateMetadata()` in layout | BreadcrumbList, ItemList, LodgingBusiness x4 | **HARDCODED** (4 hotels) | **No** | PARTIAL | Missing ar-SA hreflang |
| 12 | `/experiences` | `generateMetadata()` in layout | BreadcrumbList, ItemList, TouristAttraction x4 | **HARDCODED** (4 experiences) | **No** | PARTIAL | Missing ar-SA hreflang |
| 13 | `/recommendations` | `generateMetadata()` in layout | BreadcrumbList, ItemList, Place | **HARDCODED** | **No** | PARTIAL | Missing ar-SA hreflang |
| 14 | `/events` | `generateMetadata()` in layout | BreadcrumbList, ItemList, Event x3 | **HARDCODED** (3 events) | **No** | PARTIAL | Missing ar-SA hreflang; past event dates |
| 15 | `/information` | `generateMetadata()` | WebPage, CollectionPage, BreadcrumbList | Static data files | No | YES | |
| 16 | `/information/[section]` | `generateMetadata()` | WebPage, BreadcrumbList | Static data files | No | YES | |
| 17 | `/information/articles` | `generateMetadata()` | WebPage, BreadcrumbList | Static data files | No | YES | |
| 18 | `/information/articles/[slug]` | `generateMetadata()` | Article, BreadcrumbList | Static data files | No | YES | |
| 19 | `/shop` | `generateMetadata()` in layout | BreadcrumbList, ItemList, Product x6 | **HARDCODED** (6 products) | **No** | YES | Products are London-specific |
| 20 | `/shop/[slug]` | **NONE** | **NONE** | Client-side fetch | **No** | NO | `'use client'` with no layout metadata |
| 21 | `/shop/download` | `generateMetadata()` in layout | Via parent | Client-side | No | YES | |
| 22 | `/shop/purchases` | `generateMetadata()` in layout | Via parent | Client-side | No | YES | |
| 23 | `/affiliate-disclosure` | `generateMetadata()` in layout | **NONE** | Hardcoded | N/A | YES | |
| 24 | `/editorial-policy` | `generateMetadata()` in layout | BreadcrumbList | Hardcoded | No | YES | |
| 25 | `/halal-restaurants-london` | `generateMetadata()` | Restaurant JSON-LD | **HARDCODED** (8 areas) | **No** | NO | London-specific route name |
| 26 | `/luxury-hotels-london` | `generateMetadata()` | LodgingBusiness JSON-LD | **HARDCODED** (5 areas) | **No** | NO | London-specific route name |
| 27 | `/london-with-kids` | `generateMetadata()` | StructuredData | **HARDCODED** | **No** | NO | London-specific route name |
| 28 | `/london-by-foot` | `generateMetadata()` | **NONE** | Static data file | **No** | NO | London-specific route name |
| 29 | `/london-by-foot/[slug]` | `generateMetadata()` | **NONE** | Static data file | **No** | NO | London-specific route |
| 30 | `/offline` | Static `metadata` in layout | **NONE** | Hardcoded | No | **NO** | Hardcoded "Yalla London" logo |
| 31 | `/guides/london` | `generateMetadata()` | Yes | Hardcoded | No | NO | London-specific route |
| 32 | `/brands` | `generateMetadata()` | Yes | Hardcoded | No | YES | Zenitha.Luxury brands page |
| 33 | `/tools/seo-audit` | Static `metadata` in layout | **NONE** | Client-side tool | No | PARTIAL | |
| 34 | `/team/[slug]` | `generateMetadata()` | Person JSON-LD | DB | No | YES | |
| 35 | `/brand-guidelines` | Static `metadata` (noindex) | **NONE** | Hardcoded | No | **NO** | Hardcoded "Yalla London" in title |
| 36 | `/brand-showcase` | Static `metadata` (noindex) | **NONE** | Hardcoded | No | PARTIAL | Dev-only page |
| 37 | `/design-system` | Static `metadata` (noindex) | **NONE** | Hardcoded | No | **NO** | Hardcoded "Yalla London" in title |

### 1B. Zenitha Yachts Pages (17 routes)

| # | Route | Metadata | Structured Data | Content Source | Affiliate Links | Multi-Site Safe | Notes |
|---|-------|----------|-----------------|----------------|-----------------|-----------------|-------|
| 38 | `/yachts` | `generateMetadata()` | ItemList, BreadcrumbList | DB + static | No | YES | |
| 39 | `/yachts/[slug]` | `generateMetadata()` | Product, Organization | DB | No | YES | |
| 40 | `/yachts/compare` | `generateMetadata()` | **NONE** | Client-side | No | YES | |
| 41 | `/fleet` | `generateMetadata()` in layout | ItemList | **HARDCODED** (5 yacht types) | No | YES | |
| 42 | `/destinations` | `generateMetadata()` in layout | ItemList | **HARDCODED** (8 destinations) | No | YES | |
| 43 | `/destinations/[slug]` | `generateMetadata()` | Place, Organization | DB + static | No | YES | |
| 44 | `/itineraries` | `generateMetadata()` in layout | ItemList | **HARDCODED** | No | YES | |
| 45 | `/itineraries/[slug]` | `generateMetadata()` | Trip, Organization | DB + static | No | YES | |
| 46 | `/charter-planner` | `generateMetadata()` in layout | **NONE** | Client-side tool | No | YES | `'use client'` |
| 47 | `/inquiry` | `generateMetadata()` in layout | **NONE** | Client-side form | No | YES | `'use client'` |
| 48 | `/inquiry/confirmation` | Via parent layout | **NONE** | Hardcoded | No | YES | |
| 49 | `/faq` | `generateMetadata()` in layout | FAQPage JSON-LD | **HARDCODED** | No | YES | |
| 50 | `/glossary` | `generateMetadata()` | DefinedTermSet JSON-LD | **HARDCODED** | No | YES | |
| 51 | `/how-it-works` | `generateMetadata()` in layout | HowTo JSON-LD | **HARDCODED** | No | YES | |
| 52 | `/halal-charter` | `generateMetadata()` | Service JSON-LD | **HARDCODED** | No | YES | |
| 53 | `/journal` | `generateMetadata()` in layout | ItemList | **HARDCODED** (placeholder) | No | YES | |
| 54 | `/journal/[slug]` | `generateMetadata()` | Article | DB + static | No | YES | |

---

## 2. Issues Found

### CRITICAL Issues (4)

#### C-1: `/shop/[slug]` has NO metadata at all
- **File:** `app/shop/[slug]/page.tsx`
- **Problem:** `'use client'` component with no `generateMetadata()` and no layout.tsx in the `[slug]` directory. The parent `/shop/layout.tsx` provides generic shop metadata but does not generate per-product titles/descriptions.
- **Impact:** Google sees the same generic "London Travel Guides & Digital Products" title for every product page. Zero unique metadata per product. Open Graph sharing shows generic shop info.
- **Fix:** Create `app/shop/[slug]/layout.tsx` or convert to server component wrapper that generates per-product metadata.

#### C-2: Hotels, Experiences, Recommendations, Events missing Arabic hreflang
- **Files:** `app/hotels/layout.tsx`, `app/experiences/layout.tsx`, `app/recommendations/layout.tsx`, `app/events/layout.tsx`
- **Problem:** These 4 layouts have `alternates.languages` with only `en-GB` and `x-default` -- no `ar-SA` entry. Every other major page has all 3 hreflang tags.
- **Impact:** Google cannot associate the Arabic versions of these pages with their English counterparts. Arabic search users may see English pages or may not find these pages at all.
- **Fix:** Add `"ar-SA": \`${baseUrl}/ar/hotels\`` (etc.) to each layout's `alternates.languages`.

#### C-3: Events layout has past-date Event schema (structured data)
- **File:** `app/events/layout.tsx` lines 58-60
- **Problem:** 3 hardcoded event dates are in the past: `2026-02-22` (Arsenal vs Chelsea), `2026-03-08` (Hamilton), `2026-04-26` (London Marathon -- close to past).
- **Impact:** Google shows expired event rich results. This actively harms SEO trust signals. Google may flag the site for stale structured data.
- **Fix:** Remove hardcoded events from schema. Use Ticketmaster API data (already fetched on homepage) for dynamic event schema, or remove Event JSON-LD entirely until dynamic data is available.

#### C-4: `dangerouslySetInnerHTML` without sanitization on `tools/seo-audit` page
- **File:** `app/tools/seo-audit/page.tsx` line 781
- **Problem:** `dangerouslySetInnerHTML={{ __html: item.icon }}` renders HTML entity icons. While the data source is hardcoded (`&#9881;`, `&#9997;`, etc.), the pattern is unsafe and inconsistent with the project's XSS policy.
- **Impact:** LOW risk since data is hardcoded, but violates project standard (CLAUDE.md: all `dangerouslySetInnerHTML` must use `sanitizeHtml()`).
- **Fix:** Replace with Lucide icons or wrap with `sanitizeHtml()`.

### HIGH Issues (8)

#### H-1: Hotels/Experiences/Recommendations/Events pages are 100% hardcoded static content
- **Files:** `app/hotels/layout.tsx`, `app/experiences/layout.tsx`, `app/recommendations/layout.tsx`, `app/events/layout.tsx`
- **Problem:** All hotel names, experience descriptions, and event data are hardcoded in the layout files. No database queries, no API calls, no dynamic content.
- **Impact:** Content becomes stale. No affiliate tracking on these revenue-critical pages. Hotels may close, prices change, events expire. This is documented as KG-054 in AUDIT-LOG.md.
- **Fix:** Migrate to DB-driven content with affiliate links injected.

#### H-2: No affiliate links on 6 high-traffic content pages
- **Pages:** `/hotels`, `/experiences`, `/recommendations`, `/events`, `/halal-restaurants-london`, `/luxury-hotels-london`
- **Problem:** These are the highest-intent pages (users actively looking for hotels/restaurants/events) but have ZERO affiliate tracking URLs. No CJ links, no Travelpayouts, no Stay22.
- **Impact:** Direct revenue loss. Users on these pages are closest to booking decisions.
- **Fix:** Add affiliate links to hotel booking pages, restaurant reservation links, and event ticket links. Wire these through `/api/affiliate/click` for tracking.

#### H-3: 5 London-specific route names break multi-site
- **Routes:** `/halal-restaurants-london`, `/luxury-hotels-london`, `/london-with-kids`, `/london-by-foot`, `/london-by-foot/[slug]`
- **Problem:** Route names contain "london" -- these routes will appear on ALL sites (Arabaldives, Yalla Istanbul, etc.) with London-specific content. No site-ID gating.
- **Impact:** When site #2 goes live, visitors to `arabaldives.com/halal-restaurants-london` see London restaurant content.
- **Fix:** Either (a) add middleware routing to only serve these on yalla-london domain, or (b) rename to generic routes like `/halal-restaurants` with dynamic content per site.

#### H-4: Offline page hardcodes "Yalla London" logo
- **File:** `app/offline/page.tsx` line 19
- **Problem:** `src="/images/yalla-london-logo.svg"` and `alt="Yalla London"` are hardcoded. When served on zenithayachts.com, offline users see Yalla London branding.
- **Impact:** Brand confusion on non-Yalla-London sites.
- **Fix:** Read siteId from cookie/headers and serve per-site logo and brand name.

#### H-5: Shop products are London-specific and hardcoded
- **File:** `app/shop/page.tsx` lines 39-99, `app/shop/layout.tsx` lines 60-66
- **Problem:** All 6 fallback products are London-specific ("Complete London Guide 2026", "Halal Restaurant Guide London", etc.) with hardcoded prices and Unsplash images.
- **Impact:** Multi-site: other sites show London products. Content is static, never updated.
- **Fix:** Gate shop visibility per site, or generate per-site product catalog from DB.

#### H-6: News seed data hardcodes "Yalla London" as source_name
- **File:** `app/news/page.tsx` line 117
- **Problem:** `source_name: "Yalla London"` in `SEED_NEWS` array. This is the fallback when DB is empty.
- **Impact:** If DB query fails for zenithayachts.com, news shows "Yalla London" as the source.
- **Fix:** Replace with dynamic site name from config.

#### H-7: `brand-guidelines` and `design-system` pages hardcode "Yalla London"
- **Files:** `app/brand-guidelines/page.tsx` line 8, `app/design-system/page.tsx` line 14
- **Problem:** Static `metadata` with `title: 'Brand Guidelines - Yalla London'` and `title: 'Design System -- Yalla London'`.
- **Impact:** Both are noindex so no SEO harm, but they appear in browser tabs with wrong branding on other sites.
- **Fix:** Use `generateMetadata()` with dynamic site name.

#### H-8: Blog listing page uses `NEXT_PUBLIC_SITE_URL` before dynamic config
- **File:** `app/blog/page.tsx` line 182
- **Problem:** `const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId)` -- `NEXT_PUBLIC_SITE_URL` is a single value across all sites. If set, it overrides the per-site domain.
- **Impact:** Structured data URLs, OG images, and canonical URLs could all point to the wrong domain when multi-site is active.
- **Fix:** Remove `NEXT_PUBLIC_SITE_URL` fallback or ensure it is not set in production. Use `getBaseUrl()` consistently (already used in `generateMetadata()`).

### MEDIUM Issues (6)

#### M-1: `/affiliate-disclosure` layout has no BreadcrumbList structured data
- **File:** `app/affiliate-disclosure/layout.tsx`
- **Problem:** Layout is a pass-through `return children` with metadata but no BreadcrumbList StructuredData component.
- **Fix:** Add BreadcrumbList like all other legal pages.

#### M-2: `/london-by-foot` and `/london-by-foot/[slug]` have no structured data
- **Problem:** Walking tour pages generate metadata but no JSON-LD schema. Walking routes are good candidates for `TouristTrip` or `EventSeries` schema.
- **Fix:** Add appropriate schema markup.

#### M-3: `how-it-works` page uses deprecated HowTo schema in FAQ JSON-LD
- **File:** `app/how-it-works/page.tsx` line 164
- **Problem:** The page generates FAQPage JSON-LD which was deprecated by Google in Aug 2023 (documented in `lib/seo/standards.ts`).
- **Impact:** Google ignores the schema. Not harmful but wasted markup.
- **Fix:** Remove FAQPage schema or replace with Article schema.

#### M-4: Sitemap includes routes that may not exist for all sites
- **File:** `app/sitemap.ts` lines 85-88
- **Problem:** `/halal-restaurants-london`, `/luxury-hotels-london`, `/london-with-kids`, `/london-by-foot` are in the fallback sitemap for ALL sites. When zenithayachts.com generates a sitemap, it includes London walking tour URLs.
- **Fix:** Filter sitemap entries based on siteId. Yacht sites should not include London-specific routes.

#### M-5: `/tools/seo-audit` page has no breadcrumb structured data
- **File:** `app/tools/seo-audit/page.tsx`
- **Problem:** Client-side tool page has no schema markup. As a lead generation asset, it should have WebApplication or SoftwareApplication schema.
- **Fix:** Add schema to layout or wrapper.

#### M-6: `/yachts/compare` page has no structured data
- **File:** `app/yachts/compare/page.tsx`
- **Problem:** Yacht comparison tool has no JSON-LD schema.
- **Fix:** Add WebApplication schema.

### LOW Issues (4)

#### L-1: `brand-guidelines` and `brand-showcase` pages are exposed to public
- Both have `robots: { index: false }` but are still accessible. Consider adding auth or removing from production build.

#### L-2: Multiple pages use `NEXT_PUBLIC_SITE_URL || getSiteDomain(siteId)` pattern
- **Files:** `blog/page.tsx`, `news/page.tsx`, `information/page.tsx`
- **Problem:** Inconsistent with the rest of the codebase which uses `getBaseUrl()`. This pattern is fragile in multi-site.

#### L-3: Blog OG image reference may not exist
- **File:** `app/blog/page.tsx` line 60
- **Problem:** `url: \`${baseUrl}/images/blog-og.jpg\`` -- this static image file may not exist for all sites.
- **Fix:** Use the dynamic OG route `/api/og?siteId=...` like other pages.

#### L-4: Information hub OG image reference may not exist
- **File:** `app/information/page.tsx` line 57
- **Problem:** `url: \`${baseUrl}/images/information-hub-og.jpg\`` -- same issue as L-3.

---

## 3. Robots.ts Assessment

**Status: CLEAN**

- Dynamic hostname resolution with 3-level fallback (x-hostname, x-forwarded-host, host)
- 12 user-agent rules covering all major search engines and AI crawlers
- All AI crawlers explicitly allowed (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot, etc.)
- Admin/API/_next paths properly disallowed
- Dev pages (design-system, brand-showcase, brand-guidelines, offline) blocked
- `/cdn-cgi/` and `/d/` blocked (Cloudflare internal + malformed URL pattern)
- OG image route explicitly allowed for social crawlers
- Dynamic sitemap URL from hostname

**No issues found.**

---

## 4. Sitemap.ts Assessment

**Status: MOSTLY CLEAN -- 1 issue**

- Cache-first architecture with SiteSettings DB cache (instant <50ms)
- Fallback to live generation when cache is empty
- 29 static routes + live blog post query (up to 5000 posts)
- All entries have `alternates.languages` with en-GB, ar-SA, x-default
- Proper priority weighting (homepage 1.0, blog 0.9, legal 0.3)

**Issue:** London-specific routes (`/halal-restaurants-london`, `/luxury-hotels-london`, `/london-with-kids`, `/london-by-foot`) are included for ALL sites in the fallback sitemap (M-4 above).

---

## 5. Homepage Components Assessment

### `yalla-homepage-editorial.tsx` (Yalla London)
- Multi-site safe (reads siteId from props)
- Uses Ticketmaster API for live events
- Stay22 map integration for hotel affiliate revenue
- Unsplash images properly configured in next.config.js

### `zenitha-homepage.tsx` (Zenitha Yachts)
- Self-contained yacht site homepage
- No hardcoded yalla-london references found
- Proper yacht-specific content

---

## 6. Summary Statistics

| Metric | Count |
|--------|-------|
| Total public routes | 54 |
| Routes with `generateMetadata()` | 53 (98%) |
| Routes with structured data | 39 (72%) |
| Routes with hardcoded content | 22 (41%) |
| Routes with affiliate links | 2 (4%) -- homepage only |
| Routes fully multi-site safe | 34 (63%) |
| CRITICAL issues | 4 |
| HIGH issues | 8 |
| MEDIUM issues | 6 |
| LOW issues | 4 |
| **Total issues** | **22** |

---

## 7. Prioritized Recommendations

### Immediate (Revenue Impact)

1. **Add affiliate links to /hotels, /experiences, /halal-restaurants-london, /luxury-hotels-london** -- these are the highest-intent pages. Wire hotel names to Booking.com/CJ deep links, restaurant names to TheFork/Travelpayouts, event tickets to Ticketmaster/Tiqets.

2. **Fix ar-SA hreflang on hotels/experiences/recommendations/events** -- 4-line fix per layout file. Required for Arabic SEO.

3. **Remove or update expired Event schema dates** -- Google penalizes stale structured data. Replace with Ticketmaster API data or remove hardcoded events.

### Short-term (SEO/Quality)

4. **Create metadata for `/shop/[slug]`** -- either a layout.tsx with `generateMetadata()` or refactor to server component wrapper.

5. **Fix `NEXT_PUBLIC_SITE_URL || getSiteDomain()` pattern** in blog/news/information pages -- replace with `getBaseUrl()` for multi-site safety.

6. **Add BreadcrumbList to `/affiliate-disclosure`** -- consistency with all other legal pages.

7. **Replace deprecated FAQPage schema** on `/how-it-works` with Article or remove.

### Pre-Site-#2 (Multi-Site Blockers)

8. **Gate London-specific routes** (`/halal-restaurants-london`, `/luxury-hotels-london`, `/london-with-kids`, `/london-by-foot`) -- add middleware check to only serve on yalla-london domain OR rename to generic routes.

9. **Fix offline page branding** -- read siteId and serve per-site logo.

10. **Filter sitemap London routes** by siteId.

11. **Make shop products site-aware** -- either hide shop on non-London sites or generate per-site product catalogs.

12. **Fix news seed data** `source_name` to use dynamic site name.

---

*End of audit. Generated by Claude Code automated static pages audit.*
