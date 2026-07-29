# Master Audit — System Map

**Generated:** 2026-02-20
**Platform:** Yalla London (Zenitha.Luxury LLC)
**Framework:** Next.js 14 App Router | Vercel Pro | Prisma + Supabase PostgreSQL

---

## 1. Folder Map & Responsibilities

```
yalla_london/app/                         # Application root
├── app/                                  # Next.js App Router
│   ├── layout.tsx                        # Root layout: generateMetadata(), Organization+Website JSON-LD, hreflang
│   ├── sitemap.ts                        # Dynamic sitemap: 200+ URLs, per-site scoped via x-site-id header
│   ├── robots.ts                         # Dynamic robots.txt: per-site, AI-crawler friendly
│   ├── blog/                             # Blog listing + [slug] detail (Article JSON-LD)
│   ├── blog/category/[slug]/             # Category pages (CollectionPage JSON-LD)
│   ├── information/                      # Info hub + [section] + articles/[slug] (Article JSON-LD)
│   ├── news/                             # News listing + [slug] detail (NewsArticle JSON-LD)
│   ├── events/                           # Events listing (Event JSON-LD)
│   ├── experiences/                      # Experiences (TouristAttraction JSON-LD)
│   ├── hotels/                           # Hotels (Hotel+AggregateRating JSON-LD)
│   ├── recommendations/                  # Recommendations (CreativeWork JSON-LD)
│   ├── london-by-foot/                   # Walking guides + [slug] (Guide JSON-LD)
│   ├── shop/                             # Products + [slug] + download + purchases (Product JSON-LD)
│   ├── about/                            # About page (Organization JSON-LD)
│   ├── contact/                          # Contact page (Organization JSON-LD)
│   ├── privacy/                          # Privacy policy
│   ├── terms/                            # Terms of service
│   ├── affiliate-disclosure/             # Affiliate disclosure
│   ├── admin/                            # Admin dashboard (75+ pages, not indexed)
│   └── api/                              # API routes (not indexed)
│       ├── cron/                         # 22 cron routes (scheduled in vercel.json)
│       └── seo/                          # 28 SEO API routes
├── lib/                                  # Shared business logic
│   ├── master-audit/                     # << NEW: Master audit engine
│   ├── seo/                              # SEO services
│   │   ├── standards.ts                  # Single source of truth for SEO thresholds
│   │   ├── schema-generator.ts           # JSON-LD schema generation
│   │   ├── enhanced-schema-injector.ts   # Dynamic schema injection
│   │   └── orchestrator/                 # SEO orchestrator (5 modules)
│   │       └── pre-publication-gate.ts   # 13-check quality gate
│   ├── content-pipeline/                 # 8-phase content pipeline
│   ├── url-utils.ts                      # getBaseUrl(), getBaseUrlForSite()
│   ├── db.ts                             # Prisma singleton (canonical import)
│   └── admin-middleware.ts               # Auth guards
├── config/                               # Configuration
│   ├── sites.ts                          # 5-site master config (54KB)
│   ├── sites/                            # << NEW: Audit configs per site
│   │   ├── _default.audit.json
│   │   └── yalla-london.audit.json
│   └── entity.ts                         # Parent entity (Zenitha.Luxury LLC)
├── components/                           # Reusable React components
│   ├── structured-data.tsx               # JSON-LD injection component
│   ├── hreflang-tags.tsx                 # Hreflang link tags
│   ├── language-provider.tsx             # EN/AR context provider
│   └── analytics-tracker.tsx             # GA4 + AI crawler tracking
├── data/                                 # Static content datasets
│   ├── blog-content.ts                   # 20+ legacy blog posts
│   ├── blog-content-extended.ts          # Extended blog posts
│   ├── information-hub-content.ts        # Info hub sections + articles
│   └── information-hub-articles-extended.ts
├── scripts/                              # CLI scripts
│   ├── master-audit.ts                   # << NEW: CLI entry point
│   ├── weekly-policy-monitor.ts          # << NEW: Policy monitor
│   └── smoke-test.ts                     # Existing 90-test smoke suite
├── test/                                 # Vitest unit tests
│   └── master-audit/                     # << NEW: Audit engine tests
├── middleware.ts                          # Multi-tenant routing, CSRF, locale, UTM
├── prisma/schema.prisma                  # 95 models (2729 lines)
└── docs/                                 # Documentation
    ├── master-audit/                     # << NEW
    │   ├── SYSTEM_MAP.md                 # This file
    │   └── README.md                     # How to run and interpret audits
    └── seo/                              # << NEW
        ├── MAX_SEO_AIO_SPEC.md           # SEO/AIO specification
        └── WEEKLY_POLICY_MONITOR.md      # Policy monitoring guide
```

## 2. Page Routes & SEO Signals

### Indexable Pages (22 route patterns, ~200+ URLs)

| Route Pattern | Content Source | Metadata | JSON-LD Type | Hreflang |
|---------------|---------------|----------|--------------|----------|
| `/` | Static | generateMetadata() | Organization+WebSite | en-GB, ar-SA, x-default |
| `/blog` | DB + static | generateMetadata() | CollectionPage | Yes |
| `/blog/[slug]` | DB (BlogPost) + static fallback | generateMetadata() locale-aware | Article+BreadcrumbList | Yes |
| `/blog/category/[slug]` | Static categories | generateMetadata() | CollectionPage | Yes |
| `/information` | Static | generateMetadata() | CollectionPage | Yes |
| `/information/[section]` | Static sections | generateMetadata() | Article | Yes |
| `/information/articles` | Static | generateMetadata() | CollectionPage | Yes |
| `/information/articles/[slug]` | Static articles | generateMetadata() | Article | Yes |
| `/news` | DB (NewsItem) | generateMetadata() | CollectionPage | Yes |
| `/news/[slug]` | DB (NewsItem) | generateMetadata() locale-aware | NewsArticle | Yes |
| `/events` | DB (Event) | generateMetadata() | Event | Yes |
| `/experiences` | Static | generateMetadata() | TouristAttraction | Yes |
| `/hotels` | Static | generateMetadata() | Hotel+AggregateRating | Yes |
| `/recommendations` | Static | generateMetadata() | CreativeWork | Yes |
| `/london-by-foot` | Static walks | generateMetadata() | CollectionPage | Yes |
| `/london-by-foot/[slug]` | Static walks | generateMetadata() | Guide+TouristAttraction | Yes |
| `/shop` | DB (DigitalProduct) | generateMetadata() | CollectionPage | Yes |
| `/shop/[slug]` | DB (DigitalProduct) | generateMetadata() | Product | Yes |
| `/about` | Static | generateMetadata() | Organization+BreadcrumbList | Yes |
| `/contact` | Static | generateMetadata() | Organization | Yes |
| `/privacy` | Static | generateMetadata() | — | Yes |
| `/terms` | Static | generateMetadata() | — | Yes |
| `/affiliate-disclosure` | Static | generateMetadata() | — | Yes |

### Non-Indexable Routes (blocked via robots.txt)
- `/admin/*` — Admin dashboard
- `/api/*` — API endpoints
- `/shop/download` — Authenticated download page
- `/shop/purchases` — Authenticated purchase history

## 3. EN/AR Language Architecture

```
Request: GET /ar/blog/london-hotels
    ↓
Middleware (middleware.ts):
    1. Detect /ar prefix → strip to /blog/london-hotels
    2. Set headers: x-locale=ar, x-direction=rtl
    3. Rewrite URL to /blog/london-hotels (internal)
    ↓
Page (blog/[slug]/page.tsx):
    1. Read x-locale header → "ar"
    2. generateMetadata() returns Arabic title/description
    3. Render: content_ar || content_en (bilingual fallback)
    ↓
Hreflang (always present):
    <link rel="alternate" hreflang="en-GB" href="https://www.yalla-london.com/blog/london-hotels" />
    <link rel="alternate" hreflang="ar-SA" href="https://www.yalla-london.com/ar/blog/london-hotels" />
    <link rel="alternate" hreflang="x-default" href="https://www.yalla-london.com/blog/london-hotels" />
```

**Key audit implication:** Arabic URLs (`/ar/*`) are middleware rewrites — the audit must test both EN and AR variants to verify hreflang reciprocity.

## 4. Canonical URL Construction

```typescript
// lib/url-utils.ts
async function getBaseUrl(): Promise<string>
  // 1. Read x-hostname header (set by middleware per tenant)
  // 2. Fallback: NEXT_PUBLIC_SITE_URL env var
  // 3. Fallback: getSiteDomain(getDefaultSiteId()) from config

// Canonical pattern in layouts:
const baseUrl = await getBaseUrl();
const canonical = `${baseUrl}/${path}`;
// Returns: alternates: { canonical, languages: { en-GB, ar-SA, x-default } }
```

## 5. Sitemap Generation (app/sitemap.ts)

- **Type:** Next.js native `MetadataRoute.Sitemap`
- **Scoping:** Reads `x-site-id` header → filters DB queries by siteId
- **URL sources:**
  - 12 static pages (always included)
  - BlogPost (DB: published, not deleted, scoped by siteId)
  - Event (DB: published, scoped by siteId)
  - Categories (static array)
  - Information hub sections + articles (static arrays)
  - NewsItem (DB: published, scoped by siteId, take:100)
  - Walking guides (static, Yalla London only)
  - DigitalProduct (DB: active, site-scoped or shared)
- **Hreflang:** Every URL includes en-GB + ar-SA + x-default alternates
- **Dedup:** Blog posts deduped against static content by slug

## 6. Robots.txt (app/robots.ts)

- All major search engines + AI crawlers: Allow `/`, Disallow `/admin/`, `/api/`
- Sitemap reference: `${baseUrl}/sitemap.xml`
- AI-friendly: Google-Extended, GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot all allowed

## 7. JSON-LD Structured Data

**Injection method:** `<script type="application/ld+json">` in page components and layouts.

**Schema types in use:** Organization, WebSite, Article, NewsArticle, CollectionPage, BreadcrumbList, Event, Place, Hotel, Restaurant, TouristAttraction, Review, AggregateRating, Product, Guide.

**Deprecated types (removed):** FAQPage, HowTo, CourseInfo, ClaimReview.

**Multi-site:** Schema uses site config for branding (name, logo, domain, contact email).

## 8. Integration Points for Audit Triggers

### CLI Entry Points (NEW)
```bash
# Master audit
npx tsx scripts/master-audit.ts --site=yalla-london --mode=preview --batchSize=200 --concurrency=6

# Weekly policy monitor
npx tsx scripts/weekly-policy-monitor.ts --site=yalla-london
```

### npm Scripts (NEW)
```json
{
  "audit:master": "tsx scripts/master-audit.ts",
  "audit:weekly-policy-monitor": "tsx scripts/weekly-policy-monitor.ts"
}
```

### Module Structure (NEW)
```
lib/master-audit/
├── index.ts              # Main orchestrator
├── config-loader.ts      # Deep-merge _default + site configs
├── inventory-builder.ts  # URL collection from sitemap + crawl
├── crawler.ts            # HTTP crawler with batching + rate limiting
├── extractor.ts          # HTML → SEO signal extraction
├── validators/           # Hard-gate validators
│   ├── http.ts           # Status code + redirect validation
│   ├── canonical.ts      # Canonical presence + correctness
│   ├── hreflang.ts       # Reciprocity validation
│   ├── sitemap.ts        # Sitemap parse + indexability check
│   ├── schema.ts         # JSON-LD validity + required types
│   ├── links.ts          # Broken link detection
│   ├── metadata.ts       # Title/description uniqueness
│   └── robots.ts         # Robots policy compliance
├── risk-scanners/        # Spam policy risk detection
│   ├── scaled-content.ts
│   ├── site-reputation.ts
│   └── expired-domain.ts
├── reporter.ts           # EXEC_SUMMARY.md + FIX_PLAN.md generation
├── state-manager.ts      # Batch resume via state.json
└── types.ts              # Shared TypeScript interfaces
```

## 9. Preview/Local Run Instructions

### Option A: Preview Mode (local dev server)
```bash
cd yalla_london/app
npm run dev                    # Start Next.js dev server on :3000
# In another terminal:
npx tsx scripts/master-audit.ts --site=yalla-london --mode=preview --baseUrl=http://localhost:3000
```

### Option B: Prod Mode (live site, read-only)
```bash
npx tsx scripts/master-audit.ts --site=yalla-london --mode=prod --batchSize=200 --concurrency=6
# Rate-limited: max 6 concurrent, 200ms minimum between requests
# Read-only: only GET requests, no mutations
```

### Option C: Static Analysis (no server needed)
```bash
npx tsx scripts/master-audit.ts --site=yalla-london --mode=static
# Analyzes: sitemap.ts output, robots.ts output, page source files
# Cannot check: HTTP status codes, redirect chains, live canonical headers
```

## 10. Multi-Site Configuration

| Site ID | Domain | Locale | Status | Audit Config |
|---------|--------|--------|--------|-------------|
| yalla-london | yalla-london.com | en | Active | yalla-london.audit.json |
| arabaldives | arabaldives.com | ar | Planned | (future) |
| french-riviera | yallariviera.com | en | Planned | (future) |
| istanbul | yallaistanbul.com | en | Planned | (future) |
| thailand | yallathailand.com | en | Planned | (future) |

Each site inherits `_default.audit.json` with site-specific overrides.
