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

### Content Generation
- AI provider layer at `@/lib/ai/provider` with automatic fallback (Claude -> OpenAI -> Gemini)
- Use `generateJSON<T>()` for structured output
- Daily quota: 2 articles (1 EN + 1 AR)
- Tag auto-generated content with `auto-generated` and `primary-en`/`primary-ar`

### HTML Injection Safety
- Always escape user-provided data with HTML entity encoding
- Use `rel="noopener sponsored"` on affiliate links
- Check for `affiliate-recommendation` class to prevent duplicate injection
