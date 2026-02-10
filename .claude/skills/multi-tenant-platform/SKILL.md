---
name: multi-tenant-platform
description: Multi-tenant content platform development skill for Yalla London. Handles multi-site routing, bilingual content (EN/AR), SEO optimization, affiliate management, autonomous content systems, design studio, video studio, and WordPress integration.
---

# Multi-Tenant Content Platform Development

## Architecture

This is a Next.js 14 App Router application with Prisma ORM and Supabase PostgreSQL. Deployed on Vercel Pro (60s serverless function timeout).

### Multi-Tenant Resolution
- Tenant resolved via `middleware.ts` headers: `x-site-id`, `x-site-name`, `x-site-locale`
- 5 branded sites: `yalla-london`, `arabaldives`, `gulf-maldives`, `arab-bali`, `luxury-escapes-me`
- Site config stored in `config/sites.ts` (`SiteConfig` interface)
- All content models have optional `site_id` field for tenant scoping
- Sites can be `type: "native"` (Next.js managed) or `type: "wordpress"` (WP REST API managed)

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

**Vercel Pro Plan** - 60s serverless function timeout (not 10s Hobby). Use `export const maxDuration = 60;` for long-running endpoints. Add timeout guards (~55s) to return partial results before Vercel kills the function.

**Environment Variables**:
- `INDEXNOW_KEY` - For search engine URL submission (NOT `INDEXNOW_API_KEY`)
- `NEXT_PUBLIC_SITE_URL` - Base site URL
- `ADMIN_EMAILS` - Comma-separated admin email whitelist
- `ABACUSAI_API_KEY` - Fallback AI provider

### ESLint Configuration
The project uses `next`, `next/core-web-vitals`, and `security` ESLint plugins only (`.eslintrc.json`):
- Do NOT use `@typescript-eslint/*` rule references in disable comments — causes "Definition for rule not found" build errors on Vercel
- Instead of `// eslint-disable-next-line @typescript-eslint/no-explicit-any`, use type casts: `as unknown as TargetType`
- Security plugin warnings (detect-object-injection) are set to `warn` and don't block builds

### Package Installation
- Use `--legacy-peer-deps` for packages with React peer dependency conflicts (react-konva, remotion, use-image)
- Example: `npm install remotion @remotion/player --legacy-peer-deps`

### Prisma Models (Key)
- `BlogPost` - Main content (bilingual, with SEO fields, soft-delete via `deletedAt`)
- `Category` - Content categories (bilingual names)
- `TopicProposal` - AI topic suggestions (statuses: planned, queued, ready, published)
- `SeoReport` - SEO reports (use `data: Json` field for flexible data, `reportType` for categorization)
- `DigitalProduct` - PDF guides and digital products
- `Purchase` - Product purchases with download tokens
- `Lead` - CRM leads (use `lead_source` not `source`, `interests_json` for metadata)
- `AffiliatePartner` / `AffiliateWidget` / `AffiliateAssignment` - Affiliate system
- `MediaAsset` - Media files (with `site_id`, `category`, `folder` for per-site asset pools)
- `MediaEnrichment` - AI-enriched metadata (`content_type`, `use_case`, `mood`, `objects_detected`, `brand_compliance`)

---

## Design Studio

### Architecture
Brand-aware PDF/image design system with Canva-like visual editor using react-konva.

### Key Files
- `lib/pdf/brand-design-system.ts` — `BrandProfile` per site, 8 template categories, `DesignElement` schema (percentage-based positioning), `renderDesignToHTML()`
- `lib/pdf/design-analyzer.ts` — AI vision analysis via Claude/OpenAI, `analyzeDesignImage()`, `generateDesignFromAnalysis()`
- `lib/media/asset-pool.ts` — Per-site media pool with AI auto-categorization, S3 storage with responsive variants
- `components/design-studio/design-canvas.tsx` — react-konva canvas (drag-drop, resize, rotate, text editing, undo/redo, keyboard shortcuts)
- `components/design-studio/editor-toolbar.tsx` — Add text/shapes/images, formatting, zoom, export PNG
- `components/design-studio/layers-panel.tsx` — Visual element list with type icons
- `components/design-studio/properties-panel.tsx` — Position, size, opacity, rotation, text/shape settings
- `app/admin/design-studio/page.tsx` — 5 tabs: Templates, Editor, Similar Design, Media Pool, Preview

### API Routes
- `GET/POST /api/admin/design-studio` — Generate branded templates by site, category, locale
- `POST /api/admin/design-studio/analyze` — Upload design image → AI analysis → similar template generation
- `GET/POST/PATCH/DELETE /api/admin/design-studio/media-pool` — Per-site asset CRUD with AI enrichment

### Patterns
- Templates use percentage-based coordinates (0-100) for responsive rendering
- Brand profiles derive from `config/sites.ts` (colors, fonts, destination)
- Canvas components use `dynamic()` import with `ssr: false` (react-konva is browser-only)
- 8 template categories: travel-guide, social-post, flyer, menu, itinerary, infographic, poster, brochure

---

## Video Studio

### Architecture
Remotion-powered programmatic video generation with per-site brand themes. Videos are defined as JSON configs (VideoTemplateConfig) and rendered by React components in the browser via `@remotion/player`.

### Key Files
- `lib/video/brand-video-engine.ts` — `VideoTemplateConfig` schema with scenes, elements, animations; `generateVideoTemplate()`, `getAvailableVideoTemplates()`
- `components/video-studio/video-composition.tsx` — Remotion `<Sequence>` + `<AbsoluteFill>` renderer with per-element animations
- `components/video-studio/video-player.tsx` — `@remotion/player` with play/pause, seek, timeline, mute
- `app/admin/video-studio/page.tsx` — 4 tabs: Create, Preview, Templates, Settings

### API Routes
- `GET /api/admin/video-studio?action=templates` — List available video categories
- `GET /api/admin/video-studio?action=generate&siteId=X&category=Y&format=Z` — Generate template config
- `POST /api/admin/video-studio` — Generate template (POST body)

### Video Categories (10)
destination-highlight, blog-promo, hotel-showcase, restaurant-feature, experience-promo, seasonal-campaign, listicle-countdown, travel-tip, before-after, testimonial

### Platform Formats (10)
instagram-reel (1080x1920), instagram-post (1080x1080), instagram-story (1080x1920), youtube-short (1080x1920), youtube-video (1920x1080), tiktok (1080x1920), facebook-post (1200x630), twitter-post (1200x675), landscape-wide (1920x1080), square (1080x1080)

### Animation System
- Enter/exit: fade, slide-up/down/left/right, scale, rotate, bounce, typewriter, blur, none
- Scene transitions: fade, slide-left/right/up, zoom, wipe, none
- Easing: linear, ease-in, ease-out, ease-in-out, spring (Remotion spring physics)

### Important Constraints
- `@remotion/bundler` CANNOT be imported in Next.js API routes (causes webpack build failure). Use browser `@remotion/player` for preview.
- For production MP4 export: Remotion Lambda (AWS) or Cloud Run (not yet configured)
- Component cast for Player: `VideoComposition as unknown as React.ComponentType<Record<string, unknown>>`
- All Remotion/canvas components must use `dynamic()` with `ssr: false`

---

## WordPress Integration

### Architecture
Full WP REST API client for managing WordPress sites within the multi-tenant platform. Non-blank sites get comprehensive audits that generate AI-aligned content profiles.

### Key Files
- `lib/integrations/wordpress.ts` — `WordPressClient` class with Basic auth (Application Passwords)
- `lib/integrations/wordpress-audit.ts` — `runWordPressAudit()`, `generateSiteProfile()`, `generateRecommendations()`
- `app/api/admin/wordpress/route.ts` — WP management API
- `app/api/admin/wordpress/audit/route.ts` — Audit API
- `app/admin/wordpress/page.tsx` — Admin UI (4 tabs: Connect, Audit Report, Site Profile, Content)

### WordPress Client Capabilities
- CRUD: posts, pages, media, categories, tags, users, settings, plugins, themes
- Bulk operations: `getAllPosts()`, `getAllPages()`, `getAllMedia()` with pagination
- SEO meta reading (Yoast/RankMath): `getSeoMeta(postId)`
- Connection testing: `testConnection()`

### Site Audit Analysis (8 dimensions)
1. **Content**: niche detection (12 niches), content patterns (listicles, how-to, reviews, comparisons, guides, news), word counts
2. **Writing Style**: tone, perspective, readability score, common phrases (bi-gram)
3. **Languages**: multilingual plugin detection (WPML, Polylang, TranslatePress, Weglot), Arabic/RTL
4. **SEO**: plugin detection (Yoast, RankMath, AIOSEO), meta coverage, schema/OG/canonical
5. **Design**: active theme, page builder, child theme
6. **Media**: alt text coverage, format usage, featured images
7. **Technical**: plugin categorization
8. **Structure**: menus, widgets, page hierarchy

### Site Profile for AI Alignment
`generateSiteProfile()` produces system prompt + content guidelines + SEO guidelines, stored in `config/sites.ts` under `wpSiteProfile` and used by the content generation engine for voice alignment.

### Environment Variables
```
WP_{SITE_ID}_API_URL=https://example.com/wp-json/wp/v2
WP_{SITE_ID}_USERNAME=admin
WP_{SITE_ID}_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Patterns
- Both env-var-based and ad-hoc credentials supported (ad-hoc for testing/connecting new sites)
- Audit results stored in `SeoReport` table with `reportType: "wordpress_audit"`
- When adding a non-blank WP site: always run audit first to establish AI alignment profile

---

## SEO Integration

### Google Search Console
- Client: `@/lib/integrations/google-search-console.ts`
- Auth: Service Account JWT (RS256) via `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` + `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY`
- **CRITICAL**: Use `GSC_SITE_URL` env var (NOT `NEXT_PUBLIC_SITE_URL`)
  - Domain properties: `sc-domain:example.com`
  - URL prefix properties: `https://example.com` (exact)
  - Mismatch = empty data despite successful auth
- Always check `response.ok` before `.json()` on Google API responses

### Google Analytics 4
- Client: `@/lib/seo/ga4-data-api.ts`
- `GA4_PROPERTY_ID` (numeric e.g. `504032313`) = server-side Data API
- `GA4_MEASUREMENT_ID` (`G-XXXXX`) = client-side gtag.js tracking
- Both are needed, they are NOT the same thing

### Cloudflare
- Client: `@/lib/integrations/cloudflare.ts`
- Auth: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID`
- **Token permissions needed**: Zone Read, Zone Settings Edit, DNS Edit, Cache Purge, Page Rules Edit, SSL/Certs Edit
- For AIO: AI crawl control must be "Allow"

### Check-and-Index Endpoint
- `GET /api/seo/check-and-index`
- `maxDuration = 60`, 3-tier URL discovery, batch pagination
- `?submit_all=true` skips inspection (fast ~10s for all URLs)
- GSC inspection ~6.5s/URL — don't mix with submission in same request

### Autonomous SEO Agent Loop
GSC data → identify gaps → typed proposals (answer/comparison/deep-dive/listicle/seasonal/guide) → generate bilingual → publish → index → monitor → repeat

## New Site Deployment Checklist
1. Add site to `config/sites.ts` (set `type: "native"` or `"wordpress"`)
2. Add to `middleware.ts` domain routing
3. Vercel env vars (**use `echo -n` to avoid trailing newlines**):
   - `GSC_SITE_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `GA4_PROPERTY_ID`
   - `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` + `_PRIVATE_KEY`, `INDEXNOW_KEY`
4. Add service account to GSC (Full permissions) + GA4 (Viewer role)
5. Create Cloudflare API token with **Zone Settings:Edit**
6. If WordPress: set `WP_{SITE_ID}_*` env vars, run audit, add profile to config
7. Verify: `/api/seo/full-audit?days=7` + `/api/cloudflare/audit`
8. Cloudflare: SSL=full/strict, Always HTTPS=on, browser TTL=14400+, AI crawlers=allow

## Content Generation
- AI provider layer at `@/lib/ai/provider` with automatic fallback (Claude -> OpenAI -> Gemini)
- Use `generateJSON<T>()` for structured output
- Daily quota: 2 articles (1 EN + 1 AR)
- Tag auto-generated content with `auto-generated` and `primary-en`/`primary-ar`
- WordPress sites: use `wpSiteProfile` system prompt for voice alignment

## HTML Injection Safety
- Always escape user-provided data with HTML entity encoding
- Use `rel="noopener sponsored"` on affiliate links
- Check for `affiliate-recommendation` class to prevent duplicate injection
