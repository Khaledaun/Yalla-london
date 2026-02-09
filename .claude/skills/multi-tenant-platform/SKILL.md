---
name: multi-tenant-platform
description: Multi-tenant content platform development skill for Yalla London. Handles multi-site routing, bilingual content (EN/AR), SEO optimization, affiliate management, and autonomous content systems.
---

# Multi-Tenant Content Platform Development

## Architecture

This is a Next.js 14 App Router application with Prisma ORM and Supabase PostgreSQL.

### Multi-Tenant Resolution
- Tenant resolved via `middleware.ts` headers: `x-site-id`, `x-site-name`, `x-site-locale`
- 5 branded sites: `yalla-london`, `arabaldives`, `gulf-maldives`, `arab-bali`, `luxury-escapes-me`
- Site config stored in `SiteConfig` model
- All content models have optional `site_id` field for tenant scoping

### Key Patterns

**Database Access** - Always import from `@/lib/db`:
```typescript
const { prisma } = await import("@/lib/db");
```

**Admin Auth** - Wrap admin routes with `withAdminAuth`:
```typescript
import { withAdminAuth } from "@/lib/admin-middleware";
export const GET = withAdminAuth(async (request: NextRequest) => { ... });
```

**Bilingual Content** - All content fields have `_en` and `_ar` suffixes:
- `title_en`, `title_ar`, `content_en`, `content_ar`
- `meta_title_en`, `meta_title_ar`, `meta_description_en`, `meta_description_ar`

**Cron Routes** - Support both GET and POST for Vercel cron:
```typescript
export async function GET(request: NextRequest) { ... }
export async function POST(request: NextRequest) { return GET(request); }
```

**Environment Variables**:
- `INDEXNOW_KEY` - For search engine URL submission (NOT `INDEXNOW_API_KEY`)
- `NEXT_PUBLIC_SITE_URL` - Base site URL
- `ADMIN_EMAILS` - Comma-separated admin email whitelist
- `ABACUSAI_API_KEY` - Fallback AI provider

### Prisma Models (Key)
- `BlogPost` - Main content (bilingual, with SEO fields, soft-delete via `deletedAt`)
- `Category` - Content categories (bilingual names)
- `TopicProposal` - AI topic suggestions (statuses: planned, queued, ready, published)
- `SeoReport` - SEO reports (use `data: Json` field for flexible data, `reportType` for categorization)
- `DigitalProduct` - PDF guides and digital products
- `Purchase` - Product purchases with download tokens
- `Lead` - CRM leads (use `lead_source` not `source`, `interests_json` for metadata)
- `AffiliatePartner` / `AffiliateWidget` / `AffiliateAssignment` - Affiliate system

### SEO Best Practices
- Use IndexNow API (`api.indexnow.org`) for URL submission, NOT deprecated Google/Bing ping endpoints
- All blog posts need: `meta_title_en`, `meta_description_en`, `page_type`, `seo_score`, `keywords_json`
- Sitemap served via Next.js metadata route (`app/sitemap.ts`)
- Never hardcode API keys - always use `process.env`

### Google Search Console Integration
- Client: `@/lib/integrations/google-search-console.ts`
- Auth: Service Account JWT (RS256) via `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` + `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`
- **CRITICAL**: Use `GSC_SITE_URL` env var (NOT `NEXT_PUBLIC_SITE_URL`)
  - Domain properties: `sc-domain:example.com`
  - URL prefix properties: `https://example.com` (exact)
  - Mismatch = empty data despite successful auth
- Always check `response.ok` before `.json()` on Google API responses
- Capabilities: Search Analytics, URL Inspection, Sitemap management, URL Indexing
- Rate limits: 5 inspections/batch (2s delay), 10 submissions/batch (1s delay)

### Google Analytics 4 Integration
- Client: `@/lib/seo/ga4-data-api.ts`
- Auth: Same service account (checks `GOOGLE_SEARCH_CONSOLE_*` → `GOOGLE_ANALYTICS_*` → `GSC_*`)
- `GA4_PROPERTY_ID` (numeric e.g. `504032313`) = server-side Data API
- `GA4_MEASUREMENT_ID` (`G-XXXXX`) = client-side gtag.js tracking
- Both are needed, they are NOT the same thing

### Cloudflare Integration
- Client: `@/lib/integrations/cloudflare.ts`
- Auth: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID`
- Audit: `GET /api/cloudflare/audit` (zone, DNS, cache, security, page rules, bot mgmt)
- Actions: `POST /api/cloudflare/actions` (purge_all, purge_urls, set_browser_cache_ttl, set_cache_level, set_always_https, set_minify, set_ssl, create_page_rule)
- For AIO: AI crawl control must be "Allow"
- Target >50% cache hit rate: browser TTL 14400s+, cache level "aggressive"

### Full-Site SEO Audit
- `GET /api/seo/full-audit?days=N&pagespeed=true`
- Pulls GSC + GA4 + Cloudflare + PageSpeed in parallel
- Returns performance totals, keyword analysis, quick wins, zero-click queries, country/device, Cloudflare health
- Scored summary: critical issues, warnings, opportunities

### New Site SEO Setup Checklist
1. Add site to `config/sites.ts`
2. Add to `middleware.ts` domain routing
3. Vercel env vars:
   - `GSC_SITE_URL` = exact GSC property URL (e.g. `sc-domain:newsite.com`)
   - `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID`
   - `GA4_PROPERTY_ID` (numeric)
   - `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` + `_PRIVATE_KEY`
   - `INDEXNOW_KEY`
4. Add service account to new GSC property (Full permissions)
5. Add service account to new GA4 property (Viewer role)
6. Submit sitemap
7. Verify: `/api/seo/full-audit?days=7` + `/api/cloudflare/audit`
8. Cloudflare: SSL=full/strict, Always HTTPS=on, browser TTL=14400+, AI crawlers=allow

### Content Generation
- AI provider layer at `@/lib/ai/provider` with automatic fallback (Claude -> OpenAI -> Gemini)
- Use `generateJSON<T>()` for structured output
- Daily quota: 2 articles (1 EN + 1 AR)
- Tag auto-generated content with `auto-generated` and `primary-en`/`primary-ar`

### HTML Injection Safety
- Always escape user-provided data with HTML entity encoding
- Use `rel="noopener sponsored"` on affiliate links
- Check for `affiliate-recommendation` class to prevent duplicate injection
