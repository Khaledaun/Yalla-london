# SEO QA Ledger -- Yalla London Multi-Site Platform

| Field           | Value                                                  |
|-----------------|--------------------------------------------------------|
| Project         | Zenitha.Luxury LLC -- Zenitha Content Network          |
| Primary Site    | yalla-london.com (active)                              |
| Audit Date      | 2026-02-19                                             |
| Version         | 1.0.0                                                  |
| Auditor         | Claude Code (claude-opus-4-6) -- automated static analysis |
| Codebase Root   | /home/user/Yalla-london/yalla_london/app/              |
| Framework       | Next.js 14 App Router                                  |
| Database        | Prisma ORM + Supabase PostgreSQL                       |
| Host            | Vercel Pro (60s function timeout)                      |
| Standards Ref   | lib/seo/standards.ts v2026-02-18                       |

---

## CHANGELOG

| Date       | Phase                | Summary                                                         |
|------------|----------------------|-----------------------------------------------------------------|
| 2026-02-19 | Phase 0 -- Discovery | Initial static code analysis completed. 23 findings across CRITICAL/HIGH/MEDIUM/LOW. Baseline reports generated for crawl, metadata, sitemap, schema, and performance. System map documented. All findings logged in CHECKS table below. |

---

## SYSTEM MAP

```
                         +---------------------------+
                         |      Vercel Pro CDN       |
                         |  (60s timeout, edge cache)|
                         +------------+--------------+
                                      |
                         +------------v--------------+
                         |    middleware.ts           |
                         |  hostname -> siteId       |
                         |  x-site-id header         |
                         |  Arabic /ar/ rewrite      |
                         |  CSRF Origin validation   |
                         |  non-www -> www 301       |
                         +------------+--------------+
                                      |
              +-----------------------------------------------------+
              |                       |                             |
   +----------v---------+  +---------v----------+  +---------------v---+
   |   Public Pages     |  |   Admin Pages      |  |   API Routes      |
   |   28 page.tsx      |  |   78 page.tsx      |  |   269 route.ts    |
   |   (5 dynamic)      |  |   (4 dynamic)      |  |   (23 dynamic)    |
   +--------------------+  +--------------------+  |   22 cron routes  |
                                                    +-------------------+

Page Templates:
  - Blog:           /blog, /blog/[slug], /blog/category/[slug]
  - Information Hub: /information, /information/[section], /information/articles, /information/articles/[slug]
  - News:           /news, /news/[slug]
  - Events:         /events
  - London by Foot: /london-by-foot, /london-by-foot/[slug]
  - Static:         /, /about, /contact, /privacy, /terms, /recommendations
  - Commerce:       /shop, /shop/[slug], /shop/download, /shop/purchases
  - Other:          /experiences, /hotels, /offline, /affiliate-disclosure, /brand-guidelines, /brand-showcase

SEO Infrastructure:
  +---------------------+   +---------------------+   +---------------------+
  |   sitemap.ts        |   |   robots.ts         |   |   structured-data   |
  |   Dynamic per-site  |   |   AI bot allow-all  |   |   .tsx              |
  |   DB + static merge |   |   Admin/API blocked |   |   Article, Event,   |
  |   Hreflang en/ar    |   |   Sitemap reference |   |   Place, Review,    |
  +---------------------+   +---------------------+   |   Organization,     |
                                                       |   WebSite, FAQ*,    |
  +---------------------+   +---------------------+   |   Breadcrumb        |
  |   hreflang-tags.tsx |   |   standards.ts      |   +---------------------+
  |   en-GB / ar-SA     |   |   CWV, E-E-A-T,    |
  |   x-default         |   |   content quality,  |   +---------------------+
  |   Hardcoded fallback|   |   schema types,     |   |   pre-pub gate      |
  |   to yalla-london   |   |   indexing config   |   |   11+ checks        |
  +---------------------+   +---------------------+   |   route, title,     |
                                                       |   meta, content,    |
                                                       |   headings, links,  |
                                                       |   readability, alt  |
                                                       |   author, schema    |
                                                       +---------------------+

Content Pipeline:
  +----------------+     +------------------+     +----------------+
  | weekly-topics  | --> | TopicProposal DB | --> | content-builder|
  | trends-monitor |     | (per site_id)    |     | (8 phases)     |
  +----------------+     +------------------+     +-------+--------+
                                                          |
                                                  +-------v--------+
                                                  | ArticleDraft   |
                                                  | (reservoir)    |
                                                  +-------+--------+
                                                          |
                                                  +-------v--------+
                                                  | content-selector|
                                                  +-------+--------+
                                                          |
  +----------------+     +------------------+     +-------v--------+
  | IndexNow       | <-- | seo-agent        | <-- | BlogPost       |
  | + GSC sitemap  |     | (3 daily runs)   |     | (published,    |
  |                |     |                  |     |  bilingual)    |
  +----------------+     +------------------+     +----------------+

Cron Schedule:
  22 cron route files, 17 scheduled in vercel.json
  Key timing (UTC): Topics Mon 4am, Content 5am+8:30am, SEO 7am+1pm+8pm,
  Publish 9am+4pm, Health 10pm
```

---

## SITE CONFIG TABLE

| # | Site ID         | Brand Name      | Domain               | Locale | Status   | Destination      | Currency |
|---|-----------------|-----------------|----------------------|--------|----------|------------------|----------|
| 1 | yalla-london    | Yalla London    | yalla-london.com     | en     | active   | London, UK       | GBP      |
| 2 | arabaldives     | Arabaldives     | arabaldives.com      | ar     | planned  | Maldives         | USD      |
| 3 | french-riviera  | Yalla Riviera   | yallariviera.com     | en     | planned  | French Riviera   | EUR      |
| 4 | istanbul        | Yalla Istanbul  | yallaistanbul.com    | en     | planned  | Istanbul, Turkey | TRY      |
| 5 | thailand        | Yalla Thailand  | yallathailand.com    | en     | planned  | Thailand         | THB      |

Legacy domain redirects configured in middleware.ts:
- gulfmaldives.com -> arabaldives
- arabbali.com -> thailand
- luxuryescapes.me -> french-riviera

---

## CHECKS

| ID       | Category             | Description                                                                                                                                                              | Severity | Status | Module / File                                                  |
|----------|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|--------|----------------------------------------------------------------|
| SEO-001  | Schema / Multi-site  | StructuredData component has 6+ hardcoded "Yalla London" references: author name (L88-89), publisher name (L92-93), logo path "yalla-london-logo.svg" (L20, L51, L274), and fallback URL "https://yalla-london.com" (L13). Other sites will emit incorrect Organization/Article schema. | CRITICAL | OPEN   | components/structured-data.tsx                                |
| SEO-002  | Multi-site / Hreflang | HreflangTags component fallback hardcoded to "https://www.yalla-london.com" (L21). Multi-site deployment without NEXT_PUBLIC_SITE_URL env var emits wrong hreflang for non-London sites. | CRITICAL | OPEN   | components/hreflang-tags.tsx                                  |
| SEO-003  | Multi-site / Layout  | Root layout.tsx hardcodes London-specific values: theme-color "#C8322B" (L99), apple-mobile-web-app-title "Yalla London" (L103), geo.region "GB-LND" (L107), geo.placename "London" (L108), geo.position "51.5074;-0.1278" (L109), ICBM London coords (L110), OG image alt "Yalla London - Luxury London Guide" (L43). | CRITICAL | OPEN   | app/layout.tsx                                                |
| SEO-004  | Schema / Deprecated  | FAQPage schema still generated in structured-data.tsx getFAQStructuredData() (L189-200) and exposed via type='faq' prop. FAQPage deprecated by Google Aug 2023, restricted to authoritative health/government sites only. standards.ts correctly lists it as deprecated but component still generates it. | CRITICAL | OPEN   | components/structured-data.tsx L189-200                       |
| SEO-005  | Sitemap / Hreflang   | Sitemap uses bare `en`/`ar` language codes in hreflang alternates (e.g., L39, L117-119), while HTML metadata uses `en-GB`/`ar-SA`. Less specific language-only codes reduce regional targeting precision. | HIGH     | OPEN   | app/sitemap.ts (all alternates blocks)                        |
| SEO-006  | Sitemap / Hreflang   | Sitemap hreflang alternates do not include `x-default` variant. HTML hreflang in metadata does include x-default. TECHNICAL_SEO.hreflangIncludeXDefault in standards.ts requires x-default. | HIGH     | OPEN   | app/sitemap.ts                                                |
| SEO-007  | Sitemap / Hreflang   | Event pages in sitemap (L165-173) have NO hreflang alternates, unlike blog/info/news/category pages which all declare en/ar alternates. | HIGH     | OPEN   | app/sitemap.ts L155-173                                       |
| SEO-008  | Sitemap              | Multiple public page types missing from sitemap: /experiences, /hotels, /privacy, /terms, /affiliate-disclosure, /shop, /shop/[slug], /london-by-foot, /london-by-foot/[slug], /offline, /brand-guidelines, /brand-showcase. At least 8 indexable pages absent. | HIGH     | OPEN   | app/sitemap.ts                                                |
| SEO-009  | Sitemap              | No per-language sitemaps. Single sitemap.xml serves all URLs with hreflang annotations inline. Google recommends separate per-language sitemaps for large multilingual sites. | HIGH     | OPEN   | app/sitemap.ts                                                |
| SEO-010  | Sitemap              | No sitemap index file. As content scales across 5 sites, a single flat sitemap will exceed Google's 50,000 URL recommendation. No sitemap index splitting strategy implemented. | HIGH     | OPEN   | app/sitemap.ts                                                |
| SEO-011  | Layout / Hreflang    | Root layout HreflangTags only covers path="/" (L89). Other pages must handle their own hreflang, but many static pages (about, contact, events, experiences, hotels, shop, recommendations, privacy, terms, affiliate-disclosure) rely on layout-level metadata which may not include per-page hreflang in HTML head. | HIGH     | OPEN   | app/layout.tsx L89                                            |
| SEO-012  | Schema               | No ItemList schema on index/listing pages: blog hub (/blog), information hub (/information), information articles listing (/information/articles). Blog hub uses CollectionPage. News page uses CollectionPage with nested ItemList (correct). | MEDIUM   | OPEN   | app/blog/page.tsx, app/information/page.tsx, app/information/articles/page.tsx |
| SEO-013  | Schema               | Blog category page uses CollectionPage schema (L166-178) with hardcoded "Yalla London" publisher. CollectionPage is valid but less standard than ItemList for paginated listings. Also hardcodes "Yalla London Blog" in name and isPartOf. | MEDIUM   | OPEN   | app/blog/category/[slug]/page.tsx L166-178                    |
| SEO-014  | Schema               | No breadcrumb schema on information hub pages: /information, /information/[section], /information/articles, /information/articles/[slug]. Blog post pages have breadcrumbs but info hub does not. | MEDIUM   | OPEN   | app/information/**                                            |
| SEO-015  | Sitemap / Schema     | Shop/product pages (/shop, /shop/[slug]) entirely absent from sitemap and have no Product schema markup. These are potential revenue pages that should be discoverable and rich-result eligible. | MEDIUM   | OPEN   | app/shop/**, app/sitemap.ts                                   |
| SEO-016  | Schema               | News detail pages (/news/[slug]) generate schema via generateStructuredData() but the news listing page (/news) uses CollectionPage+ItemList (correct). Individual news articles use NewsArticle schema. Verified working. | MEDIUM   | OPEN   | app/news/[slug]/page.tsx                                      |
| SEO-017  | Config / Multi-site  | brandConfig loaded from brand-config.ts always uses the luxury-guide template (ACTIVE_BRAND env var). This is a single global config, not per-site. StructuredData component uses brandConfig for siteName/description but these values are Yalla London specific. | MEDIUM   | OPEN   | config/brand-config.ts, components/structured-data.tsx        |
| SEO-018  | Metadata / Canonical | Static pages (about, contact, events, experiences, hotels, privacy, terms, recommendations, shop) use layout-level metadata. Canonicals in layouts may produce base path URLs rather than full page-specific absolute URLs, depending on how Next.js resolves the metadata cascade. | MEDIUM   | OPEN   | app/about/layout.tsx, app/contact/layout.tsx, etc.            |
| SEO-019  | Schema               | No WebSite SearchAction schema. This is correct since no site search feature exists. Listed for documentation completeness. If site search is added later, SearchAction schema should be added. | MEDIUM   | OPEN   | N/A (no site search feature)                                  |
| SEO-020  | Sitemap              | currentDate (new Date().toISOString()) used as lastModified for all static pages and content without DB timestamps. Should use actual last build/deploy date or content modification date for more accurate crawl signaling. | LOW      | OPEN   | app/sitemap.ts L28, multiple entries                          |
| SEO-021  | Performance          | Performance monitoring script in root layout.tsx uses dangerouslySetInnerHTML with ~45 lines of inline JS (L172-218). Content is static/safe but cannot be deferred. Adds to main thread blocking time on every page load. | LOW      | OPEN   | app/layout.tsx L172-218                                       |
| SEO-022  | OG / Meta            | OG image is static "/og-image.jpg" across all pages (L39 in layout generateMetadata). Should be per-page dynamic OG images where possible for better social sharing CTR. | LOW      | OPEN   | app/layout.tsx L39                                            |
| SEO-023  | Indexing / Robots    | No noindex directive on transactional pages: /shop/download, /shop/purchases. These post-purchase pages have no SEO value and consume crawl budget if indexed. /offline page also should be noindex. | LOW      | OPEN   | app/shop/download/page.tsx, app/shop/purchases/page.tsx, app/offline/page.tsx |

---

## BASELINE METRICS

> Scores below are placeholders. Populate after running live audits (Lighthouse, GSC, PageSpeed Insights).

| Metric                        | Baseline | Target    | Final    | Source            |
|-------------------------------|----------|-----------|----------|-------------------|
| Total public pages (code)     | 28       | --        | --       | Static analysis   |
| Total admin pages             | 78       | --        | --       | Static analysis   |
| Total API routes              | 269      | --        | --       | Static analysis   |
| Dynamic public routes         | 5        | --        | --       | Static analysis   |
| Pages with generateMetadata   | 10       | 28        | --       | Grep analysis     |
| Pages with static metadata    | 12       | 0         | --       | Grep analysis     |
| Pages with no metadata        | 6        | 0         | --       | Grep analysis     |
| Sitemap content types         | 8        | 12+       | --       | sitemap.ts review |
| Schema types on pages         | 5        | 8+        | --       | Code review       |
| Hreflang coverage (HTML)      | ~40%     | 100%      | --       | Code review       |
| Hreflang coverage (sitemap)   | ~80%     | 100%      | --       | sitemap.ts review |
| Lighthouse Performance        | TBD      | >= 80     | --       | --                |
| Lighthouse Accessibility      | TBD      | >= 90     | --       | --                |
| Lighthouse SEO                | TBD      | >= 90     | --       | --                |
| LCP (lab)                     | TBD      | <= 2.5s   | --       | --                |
| INP (field)                   | TBD      | <= 200ms  | --       | --                |
| CLS (lab)                     | TBD      | <= 0.1    | --       | --                |
| Indexed pages (GSC)           | TBD      | 20+       | --       | --                |
| Organic sessions/month        | TBD      | 200+      | --       | --                |
| Average CTR                   | TBD      | 3.0%+     | --       | --                |

---

## REPORT FILES

| Report                  | Path                                       | Format |
|-------------------------|--------------------------------------------|--------|
| Crawl Analysis          | docs/seo/baseline/crawl_report.json        | JSON   |
| Metadata Analysis       | docs/seo/baseline/metadata_report.json     | JSON   |
| Sitemap Analysis        | docs/seo/baseline/sitemap_report.json      | JSON   |
| Schema Analysis         | docs/seo/baseline/schema_report.json       | JSON   |
| Performance Notes       | docs/seo/baseline/perf_notes.md            | MD     |

---

## NEXT STEPS

1. **Phase 1 -- Critical Fixes:** Remove deprecated FAQPage schema from structured-data.tsx. Replace all hardcoded "Yalla London" in structured-data.tsx with dynamic site config. Fix HreflangTags fallback to use getBaseUrl() or site config.
2. **Phase 2 -- Metadata Remediation:** Convert all 12 static-metadata layouts to `generateMetadata()` with dynamic site config. Add metadata to the 6 pages with none.
3. **Phase 3 -- Sitemap Completeness:** Add missing page types to sitemap (shop, london-by-foot, experiences, hotels, privacy, terms, affiliate-disclosure). Add hreflang to event entries. Upgrade hreflang codes from en/ar to en-GB/ar-SA. Add x-default alternates.
4. **Phase 4 -- Schema Expansion:** Add ItemList to blog/info listing pages. Add breadcrumbs to information hub. Add Product schema to shop pages. Add noindex to transactional pages.
5. **Phase 5 -- Multi-site Hardcode Purge:** Replace all London-specific values in root layout (geo tags, PWA title, theme-color, OG image alt). Make brandConfig site-aware.
6. **Phase 6 -- Live Audit:** Run Lighthouse, PageSpeed Insights, and GSC validation on deployed site. Populate baseline metrics. Verify fixes with Rich Results Test.
