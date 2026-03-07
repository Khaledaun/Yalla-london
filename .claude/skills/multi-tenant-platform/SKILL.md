---
name: multi-tenant-platform
description: Multi-tenant content platform development skill for Yalla London. Handles multi-site routing, bilingual content (EN/AR), SEO optimization, affiliate management, autonomous content systems, design studio, video studio, and WordPress integration.
---

# Multi-Tenant Content Platform Development

## Architecture

This is a Next.js 14 App Router application with Prisma ORM and Supabase PostgreSQL. Deployed on Vercel Pro (60s serverless function timeout).

### Multi-Tenant Resolution
- Tenant resolved via `middleware.ts` headers: `x-site-id`, `x-site-name`, `x-site-locale`
- 5 branded sites: `yalla-london`, `arabaldives`, `dubai`, `istanbul`, `thailand`
- Legacy domains redirect: `gulfmaldives.com` → arabaldives, `arabbali.com` → thailand, `luxuryescapes.me` → dubai
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

## Creative & Design Philosophy

### Philosophy-First Design
Before creating any visual asset (PDF, image, video, social post), generate a **design philosophy** for the piece. This isn't just a style choice — it's a named aesthetic movement that guides every decision:

1. **Name the aesthetic** — Give it a distinctive name (e.g., "Arabian Deco", "Desert Minimalism", "Gulf Luxury Noir")
2. **Write the manifesto** — 3-4 sentences describing how the philosophy manifests through space, form, color, scale, rhythm, and composition
3. **Embed the subtle reference** — Every piece should contain one conceptual thread tied to the destination/brand that only attentive viewers will notice. Like a jazz musician quoting another song — invisible to casual viewers, rewarding for those who catch it.
4. **Execute with mastery** — The final work must appear as though it "took countless hours to create" by "someone at the absolute top of their field." Prioritize: meticulously crafted spacing, painstaking color selection, expert-level composition.
5. **Refine, don't add** — After the first pass, always assume "it isn't perfect enough" and do a polish pass focused on improving what exists, not adding more elements.

### Anti-Convergence Design Rules
Avoid generic "AI-generated" aesthetics. Every visual must have distinctive character:

**Typography** — NEVER default to Inter, Roboto, Arial, or system fonts. Choose fonts that are beautiful, unique, and contextually appropriate. Pair a distinctive display font with a refined body font. For Arabic: use Noto Kufi Arabic, Tajawal, or Cairo — never generic Naskh.

**Color Strategy** — Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Each site has brand colors in `config/sites.ts` — use them as the foundation but add site-specific accent colors that create atmosphere:
- Yalla London: Deep navy + gold accents (British luxury)
- Arabaldives: Turquoise + coral (tropical warmth)
- Dubai: Black + rose gold (modern opulence)
- Istanbul: Burgundy + copper (historical richness)
- Thailand: Emerald + saffron (natural vibrancy)

**Layout** — Break predictable patterns. Use asymmetry, overlap, diagonal flow, grid-breaking elements, generous negative space OR controlled density. Never center-align everything.

**Motion** — Focus on high-impact moments. One well-orchestrated animation with staggered reveals creates more delight than scattered micro-interactions. Prioritize CSS-only solutions; use animation libraries only for complex sequences.

**Backgrounds** — Create atmosphere: gradient meshes, noise textures, geometric patterns, layered transparencies, grain overlays. Never default to solid white or solid colors.

### Brainstorming & Planning Protocol
Before any feature, design, or content strategy implementation, follow this structured process:

1. **Understanding** — Review project state, ask one question at a time, prefer multiple-choice questions, focus on purpose/constraints/success criteria
2. **Exploring approaches** — Propose 2-3 approaches with trade-offs, lead with recommended option, explain rationale
3. **Presenting the design** — Break into digestible sections (200-300 words), check understanding after each section, cover architecture/components/data flow/error handling
4. **Key principles**: YAGNI ruthlessly, one question at a time, always explore alternatives, incremental validation
5. **The differentiation question**: "What makes this UNFORGETTABLE? What's the one thing someone will remember?"

---

## Design Studio

### Architecture
Brand-aware PDF/image design system with Canva-like visual editor using react-konva. Follows the philosophy-first design approach — every template starts with a named aesthetic, not generic layouts.

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

### Design Template Philosophy
When generating templates, the AI must:
1. Generate a named design philosophy for the piece before laying out any elements
2. Use minimal text as visual elements — never paragraphs, only headlines and labels
3. Apply the anti-convergence rules (no generic fonts, no predictable layouts)
4. Embed a subtle thematic reference tied to the destination (e.g., a London template might echo Underground signage proportions)
5. Always do a refinement pass: "How can I make what's already here more of a piece of art?"
6. Match complexity to vision: maximalist travel posters need elaborate detail; minimalist guides need precision and restraint

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

## Adding a New Website — Complete Guide

This is the step-by-step process for adding a new branded site to the multi-tenant platform. Each site gets its own domain, Vercel project, SEO integrations, and content strategy — all powered by the shared codebase.

### Prerequisites

Before starting, ensure you have:
- A registered domain name for the new site
- Access to the Vercel team (Pro plan)
- Access to Google Cloud Console (for service account)
- Access to Cloudflare (for DNS/CDN)
- A Google Analytics 4 property created for the domain
- The domain added as a property in Google Search Console

### Step 1: Define Site Identity

Choose values for the new site. Use existing sites as reference:

| Field | Example | Notes |
|-------|---------|-------|
| `id` | `"bali"` | Unique key in SITES record. Used as `site_id` in DB. |
| `name` | `"Yalla Bali"` | Display name shown in UI and emails |
| `slug` | `"yalla-bali"` | URL-safe slug for internal routing |
| `domain` | `"yallabali.com"` | Bare domain (no www, no https) |
| `locale` | `"en"` or `"ar"` | Primary locale — determines default content language |
| `direction` | `"ltr"` or `"rtl"` | Text direction — `"rtl"` for Arabic-primary sites |
| `destination` | `"Bali"` | Travel destination name (used in AI prompts & templates) |
| `country` | `"Indonesia"` | Country name (used in geo-targeting & content) |
| `currency` | `"USD"` | Currency code for pricing displays |
| `primaryColor` | `"#16A34A"` | Hex color — used in Design Studio, Video Studio, UI |
| `secondaryColor` | `"#22D3EE"` | Hex color — accent/secondary brand color |

### Step 2: Write Content Strategy

Prepare these content-related fields before adding to config:

**System Prompts** — AI personality for content generation:
```typescript
systemPromptEN: "You are a luxury travel content writer for Yalla Bali, a premium travel platform for Arab travelers visiting Bali and Indonesia. Write SEO-optimized, engaging content about Bali's resorts, temples, cuisine, and wellness experiences. Always respond with valid JSON.",
systemPromptAR: "أنت كاتب محتوى سفر فاخر لمنصة يالا بالي... أجب دائماً بـ JSON صالح.",
```

**Topic Templates** — Seed topics for the autonomous content engine (5-7 per language):
```typescript
topicsEN: [
  {
    keyword: "best luxury resorts Bali for Arab families 2026",
    longtails: ["halal resorts Bali", "private villa Ubud luxury", "beachfront resort Seminyak"],
    questions: ["Which Bali resorts offer halal dining?", "Best family villas in Ubud?"],
    pageType: "guide",  // guide | list | comparison | deep-dive | answer | seasonal
  },
  // ... 4-6 more topics
],
topicsAR: [ /* Arabic equivalents */ ],
```

**Primary Keywords** — 4-6 high-value SEO target keywords per language:
```typescript
primaryKeywordsEN: ["bali guide for arabs", "halal bali", "luxury resorts bali", "bali for arab families"],
primaryKeywordsAR: ["دليل بالي للعرب", "بالي حلال", "منتجعات فاخرة بالي", "بالي للعائلات العربية"],
```

**Affiliate Categories** — Which affiliate types apply to this destination:
```typescript
affiliateCategories: ["hotel", "activity", "transport"],
// Available: hotel, restaurant, activity, tickets, shopping, transport
```

**Category Name** — Blog category label for this site:
```typescript
categoryName: { en: "Bali Guide", ar: "دليل بالي" },
```

### Step 3: Add to `config/sites.ts`

Add the new site entry to the `SITES` record:

```typescript
// In config/sites.ts
export const SITES: Record<string, SiteConfig> = {
  // ... existing sites ...

  bali: {
    id: "bali",
    name: "Yalla Bali",
    slug: "yalla-bali",
    domain: "yallabali.com",
    locale: "en",
    direction: "ltr",
    destination: "Bali",
    country: "Indonesia",
    currency: "USD",
    primaryColor: "#16A34A",
    secondaryColor: "#22D3EE",
    systemPromptEN: "...",
    systemPromptAR: "...",
    topicsEN: [ /* ... */ ],
    topicsAR: [ /* ... */ ],
    affiliateCategories: ["hotel", "activity", "transport"],
    primaryKeywordsEN: ["bali guide for arabs", "halal bali", ...],
    primaryKeywordsAR: ["دليل بالي للعرب", "بالي حلال", ...],
    categoryName: { en: "Bali Guide", ar: "دليل بالي" },
    // Optional WordPress fields (only if type is "wordpress"):
    // type: "wordpress",
    // wpApiUrl: "https://yallabali.com/wp-json/wp/v2",
    // wpSiteProfile: { /* auto-generated from audit */ },
  },
};
```

**For WordPress sites**, add these optional fields:
- `type: "wordpress"` — enables WP REST API management
- `wpApiUrl` — WP REST API endpoint (e.g. `https://example.com/wp-json/wp/v2`)
- `wpSiteProfile` — auto-generated after running audit (leave empty initially)

### Step 4: Add to `middleware.ts`

Add domain mappings (always include both bare and `www` variants):

```typescript
// In middleware.ts — DOMAIN_TO_SITE record
"yallabali.com": { siteId: "bali", siteName: "Yalla Bali", locale: "en" },
"www.yallabali.com": { siteId: "bali", siteName: "Yalla Bali", locale: "en" },
```

Also add to the `ALLOWED_ORIGINS` set for CSRF protection:
```typescript
const ALLOWED_ORIGINS = new Set([
  // ... existing origins ...
  "https://yallabali.com",
  "https://www.yallabali.com",
]);
```

**Legacy/redirect domains**: If the new site absorbs an older domain, add that domain too with the new site's `siteId`.

### Step 5: Create Site Directory

Create the per-site directory for selective deployment:

```bash
mkdir -p sites/{site-id}
touch sites/{site-id}/.gitkeep
```

This directory is used by `scripts/should-deploy.sh` for selective deployment. Site-specific assets, content overrides, and component overrides go here.

### Step 6: Set Up Vercel Project

1. **Create new Vercel project** linked to the same Git repo
2. **Set Framework Preset**: Next.js
3. **Set Root Directory**: `yalla_london/app` (or wherever your Next.js app root is)

#### Required Environment Variables

**CRITICAL**: Use `echo -n "value" | vercel env add NAME production` to avoid trailing newlines that silently break API auth.

| Variable | Value | Purpose |
|----------|-------|---------|
| `SITE_ID` | `bali` | **Required** — selective deployment + site identification |
| `NEXT_PUBLIC_SITE_URL` | `https://www.yallabali.com` | Public base URL |
| `GSC_SITE_URL` | `sc-domain:yallabali.com` or `https://www.yallabali.com` | **Must match exact GSC property format** |
| `GA4_PROPERTY_ID` | `504032313` (numeric) | Server-side GA4 Data API |
| `GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Client-side gtag.js tracking |
| `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` | `svc@project.iam.gserviceaccount.com` | Shared service account email |
| `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Service account private key |
| `CLOUDFLARE_API_TOKEN` | `cf_token_xxx` | Per-zone API token (see Step 8) |
| `CLOUDFLARE_ZONE_ID` | `zone_id_xxx` | Cloudflare zone for this domain |
| `INDEXNOW_KEY` | `random-uuid-string` | For IndexNow search submission |

**Shared variables** (same across all sites — inherit from Vercel team env):
- `DATABASE_URL` — Supabase connection string
- `NEXTAUTH_SECRET` — Auth secret
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_AI_API_KEY` — AI providers
- `ADMIN_EMAILS` — Admin whitelist

**WordPress-specific** (only if `type: "wordpress"`):
| Variable | Value | Purpose |
|----------|-------|---------|
| `WP_BALI_API_URL` | `https://yallabali.com/wp-json/wp/v2` | WP REST API URL |
| `WP_BALI_USERNAME` | `admin` | WP user with Application Passwords |
| `WP_BALI_APP_PASSWORD` | `xxxx xxxx xxxx xxxx` | WP Application Password |

4. **Set Ignored Build Step**: Settings → Git → Ignored Build Step: `bash scripts/should-deploy.sh`

### Step 7: Google Search Console Setup

1. **Add property** in [Google Search Console](https://search.google.com/search-console):
   - Prefer **domain property** (`sc-domain:yallabali.com`) for full coverage
   - Or **URL prefix** (`https://www.yallabali.com`) if domain verification isn't possible
2. **Add service account** as a user with **Full** permissions:
   - Go to Settings → Users and permissions → Add user
   - Email: the value from `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`
   - Permission: **Full**
3. **Set `GSC_SITE_URL`** env var to match the **exact** property format:
   - Domain property → `sc-domain:yallabali.com`
   - URL prefix → `https://www.yallabali.com` (no trailing slash)
   - **Mismatch = empty data with no error** — this is the #1 gotcha

### Step 8: Google Analytics 4 Setup

1. **Create GA4 property** in [Google Analytics](https://analytics.google.com)
2. **Add data stream** for the website URL
3. **Get two IDs** (they are NOT the same):
   - `GA4_PROPERTY_ID` — numeric ID (e.g. `504032313`), found in Admin → Property Settings
   - `GA4_MEASUREMENT_ID` — tracking code (e.g. `G-XXXXXXXXXX`), found in Data Streams → your stream
4. **Add service account** as viewer:
   - Admin → Property Access Management → Add user
   - Email: same service account as GSC
   - Role: **Viewer**

### Step 9: Cloudflare Setup

1. **Add domain** to Cloudflare (or ensure it's already there)
2. **Get Zone ID** from the domain's Overview page (right sidebar)
3. **Create API token** with these permissions for the specific zone:
   - Zone: Read
   - Zone Settings: **Edit** (not just Read — PATCH requires Edit)
   - DNS: Edit
   - Cache Purge: Purge
   - Page Rules: Edit
   - SSL and Certificates: Edit
4. **Configure DNS**: Point domain to Vercel
   - `A` record: `@` → `76.76.21.21` (Vercel IP)
   - `CNAME` record: `www` → `cname.vercel-dns.com`
   - Proxy status: DNS only (orange cloud off) for initial setup, then enable proxy after SSL is confirmed
5. **Configure security settings**:
   - SSL/TLS: Full (strict)
   - Always Use HTTPS: On
   - Browser Cache TTL: 14400+ (4 hours)
   - AI crawlers: **Allow** (required for AIO/AI search visibility)

### Step 10: WordPress Setup (if applicable)

Only for sites with `type: "wordpress"`:

1. **Enable Application Passwords** on the WordPress site (WP 5.6+, enabled by default)
2. **Create Application Password**:
   - Go to WP Admin → Users → your user → Application Passwords
   - Create new password, save it
3. **Set environment variables**: `WP_{SITE_ID}_API_URL`, `WP_{SITE_ID}_USERNAME`, `WP_{SITE_ID}_APP_PASSWORD`
4. **Run site audit**: `POST /api/admin/wordpress/audit`
   - This analyzes content, writing style, languages, SEO, design, media, and technical setup
   - Generates AI-aligned content profile
5. **Add profile to config**: Copy the generated `wpSiteProfile` to `config/sites.ts`
6. **Verify connection**: `GET /api/admin/wordpress?action=test`

### Step 11: Database Considerations

No schema changes needed — all models use optional `site_id` fields. The new site's content is automatically scoped by the `site_id` value set in `config/sites.ts`.

**Models that will have data scoped to the new site** (20+ models):
- `BlogPost`, `TopicProposal`, `Category` — content
- `MediaAsset`, `MediaEnrichment` — media pool
- `Lead`, `Subscriber`, `ConsentLog` — CRM
- `DigitalProduct`, `Purchase` — shop
- `AffiliateClick`, `Conversion` — affiliates
- `SeoReport`, `AnalyticsSnapshot` — SEO data
- `PageView`, `ExitIntentImpression` — analytics
- `BackgroundJob`, `Credential` — system

### Step 12: Brand Integration

The new site's `primaryColor` and `secondaryColor` are automatically used by:

- **Design Studio**: `lib/pdf/brand-design-system.ts` generates brand-aware templates using the site's colors, destination name, and category
- **Video Studio**: `lib/video/brand-video-engine.ts` applies brand colors to video template backgrounds, text, and overlays
- **Admin UI**: Theme colors in the admin dashboard
- **PDF Generator**: Brand-colored PDF reports and guides

No additional configuration needed — these systems read from `config/sites.ts` automatically.

### Step 13: Deploy & Verify

1. **Commit and push** all code changes (config/sites.ts, middleware.ts, sites/ dir)
2. **Verify selective deployment**: Only the new site + any core changes should trigger builds
3. **Run verification endpoints** after deployment:

```
GET /api/seo/full-audit?days=7&pagespeed=true
```
Expected: GSC data (may be empty initially), GA4 data, Cloudflare status, PageSpeed scores

```
GET /api/cloudflare/audit
```
Expected: Zone details, DNS records, security settings, cache configuration

```
GET /api/seo/check-and-index?submit_all=true
```
Expected: Discovers all indexable URLs and submits them to Google + IndexNow

4. **Check admin dashboard**: Visit `/admin` and verify the site appears correctly

### Step 14: Post-Launch SEO Workflow

After the site is live:

1. **Submit sitemap** to GSC: `https://www.yallabali.com/sitemap.xml`
2. **Submit all URLs** for indexing: `GET /api/seo/check-and-index?submit_all=true`
3. **Monitor indexing** (expect 24-72 hours): `GET /api/admin/seo/indexing?type=stats`
4. **Let the autonomous agent work**: It will analyze GSC gaps, generate topic proposals, create bilingual content, publish, and submit for indexing automatically
5. **Review content quality** in `/admin/articles` within the first week

### Quick Reference: File Changes for New Site

| File | Change | Affects |
|------|--------|---------|
| `config/sites.ts` | Add `SiteConfig` entry | All sites (core file) |
| `middleware.ts` | Add domain mapping + CSRF origin | All sites (core file) |
| `sites/{site-id}/.gitkeep` | Create directory | Only new site |
| Vercel Dashboard | New project + env vars | Only new site |
| GSC / GA4 / Cloudflare | External service setup | Only new site |

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| GSC returns empty data | `GSC_SITE_URL` doesn't match property format | Check GSC Settings → Property type; set env var exactly |
| GA4 returns no data | Wrong property ID or no service account access | Verify `GA4_PROPERTY_ID` is numeric, service account has Viewer role |
| Cloudflare settings update fails | Token has Read-only, not Edit | Recreate token with Zone Settings:Edit |
| Env var has trailing newline | Used `echo` without `-n` | Use `echo -n "value" \| vercel env add` |
| Build triggers for wrong sites | Missing `SITE_ID` env var or wrong path | Verify `SITE_ID` is set, check `should-deploy.sh` output |
| Middleware returns default site | Domain not in `DOMAIN_TO_SITE` | Add both bare and www variants |
| CSRF blocks API requests | Domain not in `ALLOWED_ORIGINS` | Add https://domain to the Set |

## Selective Deployment

Each Vercel project uses `scripts/should-deploy.sh` as its Ignored Build Step.

### How it works
- **Core files changed** (`lib/`, `components/`, `app/`, `middleware.ts`, `config/`, `package.json`, `prisma/`) → ALL sites rebuild
- **Only `sites/{site-id}/` changed** → only that site's Vercel project rebuilds
- **Only non-deploy files changed** (`.claude/`, `docs/`, `*.md`, `scripts/`) → NO sites rebuild

### File classification
```
Core (all sites build):     lib/ components/ app/ config/ middleware.ts
                            package.json yarn.lock next.config.* prisma/
                            public/ styles/ tsconfig.json .eslintrc.json

Site-specific (one site):   sites/{site-id}/*

Non-deploy (no build):      .claude/ docs/ *.md scripts/ .github/
```

### Setup per Vercel project
1. Settings → Git → Ignored Build Step: `bash scripts/should-deploy.sh`
2. Settings → Environment Variables → `SITE_ID` = `yalla-london`

## Content Generation

### AI Content Pipeline
- AI provider layer at `@/lib/ai/provider` with automatic fallback (Claude -> OpenAI -> Gemini)
- Use `generateJSON<T>()` for structured output
- Daily quota: 2 articles (1 EN + 1 AR)
- Tag auto-generated content with `auto-generated` and `primary-en`/`primary-ar`
- WordPress sites: use `wpSiteProfile` system prompt for voice alignment

### Autonomous Content Lifecycle
The platform runs a fully autonomous content loop across all 5 sites:

1. **Discovery**: SEO agent analyzes GSC search data → identifies content gaps, low-CTR pages, keyword opportunities
2. **Strategy**: Content strategy engine classifies keywords → generates typed proposals (answer/comparison/deep-dive/listicle/seasonal/guide/rewrite)
3. **Diversity**: Content diversity balancer ensures healthy mix of content types per site, adjusts proposal priorities
4. **Generation**: Daily content generator picks highest-priority proposals → generates bilingual articles with structured SEO data
5. **Quality Gates**: Auto-injects structured data (JSON-LD), validates meta lengths, assigns SEO scores
6. **Publishing**: Daily publisher picks approved content → sets publish date → marks proposals as published
7. **Indexing**: SEO agent submits new URLs to Google Indexing API + IndexNow → tracks per-URL status
8. **Monitoring**: Agent checks indexing coverage, crawl rates, ranking changes
9. **Optimization**: Auto-optimizes low-CTR meta titles/descriptions using AI (reads GSC performance → rewrites metas → applies directly)
10. **Feedback Loop**: Posts with sustained low CTR or high bounce (30+ days) get auto-queued for full content rewrites

### Content Rewrite System
The feedback loop (`queueContentRewrites` in seo-agent) auto-detects underperforming content:
- **Trigger**: Published 30+ days, CTR < 1% with 50+ impressions, OR appears in GA4 low-engagement pages
- **Action**: Creates `TopicProposal` with `source: "seo-agent-rewrite"`, `intent: "rewrite"`, links to original post via `authority_links_json.originalPostId`
- **Execution**: Daily content generator picks up rewrite proposals and regenerates the content
- **Dedup**: Won't queue a rewrite if one is already pending/queued/ready for the same slug

### Resilience & Multi-Site Safety
- `lib/resilience.ts` provides `createDeadline()`, `fetchWithRetry()`, `forEachSite()` for timeout-safe multi-site processing
- All cron jobs use deadline guards (~55s) to return partial results before Vercel's 60s timeout
- Per-site error isolation: one site failing doesn't stop others from being processed
- Per-site env var convention: `{VAR_NAME}_{SITE_ID_UPPER}` falls back to global (via `getSiteSeoConfig()`)

### Security
- ALL admin API routes are protected with `requireAdmin` authentication guard
- Cron routes require `CRON_SECRET` — no hardcoded fallbacks
- CSRF protection validates Origin header on all mutating `/api/` requests (except cron/webhook/internal)
- Rate limits: 429/503 responses handled with exponential backoff via `fetchWithRetry()`

## Frontend Design Standards

When building or modifying admin UI, public pages, or any frontend component, follow these principles:

### Design Thinking Before Code
Before writing any frontend code, consider:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick a clear aesthetic direction aligned with the site's brand identity
- **Constraints**: Framework (Next.js App Router), performance, mobile-first, RTL support
- **Differentiation**: "What makes this UNFORGETTABLE?" — avoid generic dashboards and cookie-cutter layouts

### Anti-Generic Rules
- Never use default component library styling without customization
- Never use generic chart colors — use site brand colors
- Admin dashboards should feel like premium SaaS, not open-source boilerplate
- Arabic interfaces: proper RTL layout (not just `dir="rtl"`), culturally appropriate imagery, Arabic-first typography
- Use CSS variables from the site's theme for consistency

### Spatial Composition
- Unexpected layouts beat predictable grids
- Generous whitespace for data-heavy pages (SEO dashboards, analytics)
- Controlled density for action-heavy pages (content editors, command center)
- Card-based layouts with visual hierarchy through size variation

## HTML Injection Safety
- Always escape user-provided data with HTML entity encoding
- Use `rel="noopener sponsored"` on affiliate links
- Check for `affiliate-recommendation` class to prevent duplicate injection

## Automation Tracking Models
Three new Prisma models support full automation visibility:

- **URLIndexingStatus** — Per-URL indexing state (discovered → submitted → indexed). Tracks IndexNow, Google API, and sitemap submission separately. Stores full GSC inspection results.
- **CronJobLog** — Every cron execution logged with status, duration, items processed/succeeded/failed, multi-site tracking (which sites were processed vs. skipped due to timeout).
- **SiteHealthCheck** — Periodic aggregated health snapshots per site: SEO score, indexing rate, GSC metrics, GA4 traffic, content counts, automation status, PageSpeed scores.

---

## Orchestration & Skill Network

This skill is the **foundation layer** for the entire orchestration system. All other skills and agents depend on the multi-tenant architecture, bilingual patterns, and infrastructure defined here.

### Agent Hierarchy
```
workflow-orchestrator (master coordinator)
├── seo-growth-agent          → 8 SEO skills
├── content-pipeline-agent    → 7 content + 5 research skills
├── analytics-intelligence-agent → 3 analytics skills
├── frontend-optimization-agent  → 9 frontend skills
├── conversion-optimization-agent → 3 CRO skills
├── research-intelligence-agent   → 5 research skills
├── growth-marketing-agent        → 6 marketing skills
└── multi-tenant-platform (this) → Platform foundation for all
```

### Workflow Commands
- `/full-seo-audit` — Technical SEO audit across all sites
- `/content-pipeline` — End-to-end content creation
- `/performance-audit` — Frontend performance audit
- `/analytics-review` — Analytics deep dive
- `/conversion-audit` — CRO analysis
- `/competitive-research` — Competitor intelligence

### Cross-Skill Dependencies
Every skill in the system must respect these platform rules:
1. **Multi-tenant context** — Always check `x-site-id`, `x-site-locale`, `x-direction` headers
2. **Bilingual content** — All text has `_en` and `_ar` variants
3. **Brand voice** — Each site has unique system prompts in `config/sites.ts`
4. **Timeout guards** — All operations fit within Vercel Pro 60s limit
5. **Audit trails** — All agent actions logged in CronJobLog or AuditLog
6. **Quality gates** — SEO score >= 70, Lighthouse >= 80, WCAG a11y >= 90
