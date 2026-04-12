# SEO Compliance Layer — Changelog

All notable SEO infrastructure changes are documented here.

## [1.0.0] — 2026-02-19 — SEO Audit & Compliance Layer

### Discovery & Analysis (Phase 0-2)
- **CREATED** `docs/seo/QA_LEDGER.md` — Central tracking for all SEO checks and findings
- **CREATED** `docs/seo/MAX_SEO_SPEC.md` — Maximum SEO compliance specification (8 sections, 1200+ lines)
- **CREATED** `docs/seo/IMPLEMENTATION_MATRIX.md` — Gap analysis with PASS/PARTIAL/FAIL status per requirement
- **CREATED** `docs/seo/baseline/crawl_report.json` — Baseline crawl analysis
- **CREATED** `docs/seo/baseline/metadata_report.json` — Baseline metadata coverage report
- **CREATED** `docs/seo/baseline/sitemap_report.json` — Baseline sitemap analysis
- **CREATED** `docs/seo/baseline/schema_report.json` — Baseline schema markup analysis
- **CREATED** `docs/seo/baseline/perf_notes.md` — Performance baseline notes

### Sitemap Fixes (P0)
- **FIXED** Hreflang codes in sitemap: Changed from `en`/`ar` to `en-GB`/`ar-SA`/`x-default` (proper language-region codes)
- **FIXED** Added `x-default` alternate to ALL sitemap entries (was missing entirely)
- **FIXED** Events in sitemap now include hreflang alternates (were missing)
- **ADDED** Missing static pages to sitemap: `/experiences`, `/hotels`, `/privacy`, `/terms`, `/affiliate-disclosure`, `/shop`
- **ADDED** London by Foot hub page to sitemap (site-conditional, only for yalla-london)
- **REFACTORED** Sitemap uses centralized `hreflang()` helper function — eliminates repetitive alternate definitions

### Schema & Structured Data Fixes (P0)
- **FIXED** `components/structured-data.tsx` — Removed 6+ hardcoded "Yalla London" references
  - Organization schema now uses dynamic `siteName` from site config
  - Logo URLs use dynamic `siteSlug` (not hardcoded "yalla-london-logo.svg")
  - Article schema author/publisher use dynamic site identity
  - WebSite schema uses dynamic publisher name
- **FIXED** FAQPage schema deprecated — `structured-data.tsx` no longer generates FAQPage schema type
  - FAQPage restricted to gov/health sites since Aug 2023
  - FAQ content now generates Article schema instead
- **FIXED** Blog hub page schema — Changed from non-standard `Blog` type to `ItemList` (Google-supported)
  - Blog hub now generates proper ItemList with numbered positions
  - Removed hardcoded "Yalla London" from blog schema publisher/author
- **ADDED** Multi-site support to StructuredData component — accepts `siteId` prop, resolves from config

### Hreflang Fixes (P0)
- **FIXED** `components/hreflang-tags.tsx` — Removed hardcoded "https://www.yalla-london.com" fallback
  - Now uses `getSiteDomain(getDefaultSiteId())` from config
  - Handles root path correctly (avoids double-slash `//`)
- **ADDED** Import of `getSiteDomain` and `getDefaultSiteId` from config/sites

### Root Layout Fixes (P1)
- **FIXED** `app/layout.tsx` — OG image alt text no longer hardcoded "Yalla London - Luxury London Guide"
  - Now uses dynamic `${siteName} - ${brandConfig.tagline}`
- **FIXED** PWA meta tags now use site config:
  - `theme-color` uses `primaryColor` from site config (was hardcoded #C8322B)
  - `apple-mobile-web-app-title` uses site name from config (was hardcoded "Yalla London")
- **FIXED** Metadata author/creator/publisher use dynamic site name

### Blog Hub Page Fixes (P1)
- **FIXED** `app/blog/page.tsx` — Metadata now fully multi-site aware
  - Title, description, keywords use dynamic site name and destination
  - Twitter handle uses dynamic site slug
  - OpenGraph site name uses dynamic config
  - Added `x-default` to hreflang alternates
- **FIXED** Structured data generation uses site identity from headers (not hardcoded)

### Noindex Compliance (P1)
- **ADDED** `app/shop/download/layout.tsx` — noindex/nofollow on download page
- **ADDED** `app/shop/purchases/layout.tsx` — noindex/nofollow on purchases page

### SEO Audit Tooling (Phase 4)
- **CREATED** `scripts/seo-audit.ts` — Comprehensive static SEO audit script
  - 8 categories: Sitemap, Robots, Schema, Metadata, Hreflang, Multi-Site, Noindex, Performance
  - 30+ individual checks
  - Run with: `npx tsx scripts/seo-audit.ts`
  - Outputs PASS/FAIL table with summary

### Files Changed
| File | Change Type |
|------|------------|
| `app/sitemap.ts` | Modified — hreflang codes, missing pages, helper function |
| `components/structured-data.tsx` | Modified — multi-site support, removed hardcodes, deprecated FAQPage |
| `components/hreflang-tags.tsx` | Modified — dynamic base URL fallback |
| `app/layout.tsx` | Modified — multi-site metadata, PWA tags |
| `app/blog/page.tsx` | Modified — multi-site metadata + schema |
| `app/shop/download/layout.tsx` | Created — noindex |
| `app/shop/purchases/layout.tsx` | Created — noindex |
| `scripts/seo-audit.ts` | Created — audit tool |
| `docs/seo/QA_LEDGER.md` | Created |
| `docs/seo/MAX_SEO_SPEC.md` | Created |
| `docs/seo/IMPLEMENTATION_MATRIX.md` | Created |
| `docs/seo/CHANGELOG.md` | Created |
| `docs/seo/baseline/*.json` | Created |
| `docs/seo/baseline/perf_notes.md` | Created |

### Remaining Recommended Improvements (Not Implemented — Lower Priority)
| Item | Risk | Reason |
|------|------|--------|
| Per-language sitemaps (sitemap-en.xml, sitemap-ar.xml) | Low | Single sitemap with hreflang alternates is compliant |
| Sitemap index file | Low | Not needed until >50K URLs |
| ItemList schema on category pages | Low | Category pages already have CollectionPage |
| NewsArticle schema on news items | Medium | Requires news page template changes |
| TL;DR / Quick Answers blocks | Medium | Content template change, needs content pipeline update |
| Table of Contents component | Low | Nice-to-have for long articles |
| Breadcrumb schema on all pages | Medium | Currently only on blog posts |
| Root layout geo tags per-site | Low | Only affects local SEO signals |
| brandConfig multi-site awareness | Medium | Requires larger refactor of brand-config system |
