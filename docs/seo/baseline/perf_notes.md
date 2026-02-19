# Performance Baseline Notes

**Date:** 2026-02-19
**Site:** Yalla London (yalla-london.com)
**Stack:** Next.js 14 App Router, Vercel Pro, Supabase PostgreSQL
**Audit Type:** Static code analysis (no live Lighthouse scores yet)
**Standards Reference:** lib/seo/standards.ts -- LCP <= 2.5s, INP <= 200ms, CLS <= 0.1

---

## 1. Image Optimization

**Status:** GOOD

- Next.js Image optimization is ENABLED (`images.unoptimized: false` in next.config.js)
- Format negotiation: AVIF preferred, WebP fallback (`formats: ['image/avif', 'image/webp']`)
- Device sizes configured: 640, 750, 828, 1080, 1200, 1920, 2048
- Image sizes configured: 16, 32, 48, 64, 96, 128, 256, 384
- Cache TTL: 30 days (`minimumCacheTTL: 60 * 60 * 24 * 30`)
- Remote patterns configured for: Supabase storage, Vercel, Cloudflare, Unsplash, Pexels, and all 5 site domains

**Potential Issues:**
- No explicit `loading="lazy"` verification on below-fold images (Next.js Image handles this by default, but custom `<img>` tags in content may not)
- Featured images in blog posts may not have explicit width/height, which could cause CLS

---

## 2. Caching Strategy

**Status:** GOOD

### Edge Caching (CDN / Cloudflare + Vercel)
| Route Pattern            | Cache-Control                                          | CDN-Cache-Control | Effective |
|--------------------------|--------------------------------------------------------|-------------------|-----------|
| Homepage `/`             | `public, max-age=0, s-maxage=300, stale-while-revalidate=600` | `max-age=300` | 5 min edge |
| Blog `/blog/*`           | `public, max-age=0, s-maxage=600, stale-while-revalidate=3600` | `max-age=600` | 10 min edge |
| Events `/events/*`       | `public, max-age=0, s-maxage=600, stale-while-revalidate=3600` | `max-age=600` | 10 min edge |
| Recommendations          | `public, max-age=0, s-maxage=600, stale-while-revalidate=3600` | `max-age=600` | 10 min edge |
| Static (about, contact)  | `public, max-age=60, s-maxage=3600, stale-while-revalidate=86400` | `max-age=3600` | 1 hr edge |
| Sitemap `/sitemap.xml`   | `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` | `max-age=3600` | 1 hr edge |
| Robots `/robots.txt`     | `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` | `max-age=3600` | 1 hr edge |
| Static assets            | `public, max-age=31536000, immutable`                  | --                | 1 year    |
| Next.js static `/_next/` | `public, max-age=31536000, immutable`                  | --                | 1 year    |
| Admin `/admin/*`         | `no-store, no-cache, must-revalidate`                  | --                | No cache  |
| Admin API `/api/admin/*` | `no-store, no-cache, must-revalidate`                  | --                | No cache  |
| Public API `/api/blog/*` | `public, max-age=0, s-maxage=300, stale-while-revalidate=600` | `max-age=300` | 5 min edge |

### ISR (Incremental Static Regeneration)
| Page Type                | Revalidate | Effect                                    |
|--------------------------|------------|-------------------------------------------|
| Blog posts `/blog/[slug]` | 600s      | Regenerated every 10 minutes on request   |
| Blog listing `/blog`     | 600s      | Regenerated every 10 minutes              |
| Category listing         | 600s      | Regenerated every 10 minutes              |
| Information hub pages    | 600s      | Regenerated every 10 minutes              |
| News pages               | 600s      | Regenerated every 10 minutes              |
| Brand guidelines         | 0         | force-dynamic (redirected to admin anyway)|

### Vary Header
- `Vary: Accept-Encoding, x-site-id` set on public pages and public API routes
- This ensures Cloudflare serves correct cached version per-site in multi-tenant setup
- Not set on admin or API admin routes (correctly excluded)

**Potential Issues:**
- `Vary: x-site-id` on public pages could reduce cache hit rate since the header value varies by tenant. For single-site (yalla-london only), this is fine. When multi-site goes live, each site gets its own cache partition (correct behavior).
- No `stale-if-error` directive -- if origin goes down, CDN cannot serve stale content.

---

## 3. JavaScript Loading

**Status:** MIXED

### Analytics (GA4)
- Google Tag Manager loaded with `strategy="afterInteractive"` (non-blocking, correct)
- GA4 configuration script also `afterInteractive`
- Conditional: only loads if `NEXT_PUBLIC_GA_MEASUREMENT_ID` env var is set and non-empty

### Inline Performance Monitoring Script
- **Location:** Root layout.tsx, lines 172-218
- **Method:** `dangerouslySetInnerHTML` with raw `<script>` tag
- **Content:** ~45 lines of JavaScript for:
  - Core Web Vitals tracking (sendToAnalytics function)
  - Page load timing (performance.getEntriesByType)
  - Scroll depth tracking (25% increment events)
- **Problem:** This script is inlined directly in the HTML body, not using Next.js `<Script>` component. It cannot be deferred or loaded `afterInteractive`. It runs synchronously on every page load.
- **Size estimate:** ~1.5KB unminified
- **Recommendation:** Extract to a separate file and load with `<Script strategy="afterInteractive">`. Alternatively, use the `web-vitals` library which is tree-shakeable and handles CWV collection more efficiently.

### Cookie Consent Banner
- CookieConsentBanner component loaded in root layout
- Presumably client-side rendered (consent UI)
- Impact on performance depends on component implementation

---

## 4. Font Loading

**Status:** GOOD

- `preconnect` to `fonts.googleapis.com` present in root layout head
- `preconnect` to `fonts.gstatic.com` with `crossOrigin=""` present
- Font strategy appears to be Google Fonts via external stylesheet
- `font-editorial` class applied to body (`className="font-editorial antialiased"`)

**Potential Issues:**
- No `font-display: swap` explicitly visible in code (may be set in the Google Fonts URL or CSS)
- External Google Fonts request adds network round trip. Consider self-hosting fonts for better LCP.
- No preload of the actual font files (only preconnect to the domain)

---

## 5. CSS Optimization

**Status:** GOOD

- `experimental.optimizeCss: true` enabled in next.config.js
- Tailwind CSS used for utility classes (tree-shaken in production)
- `compress: true` enabled in next.config.js

---

## 6. Security Headers (Performance-Relevant)

**Status:** GOOD

- `poweredByHeader: false` -- removes X-Powered-By header (minor security + smaller response)
- HSTS with `max-age=63072000; includeSubDomains; preload` (2 years)
- CSP header present with specific directives (prevents unauthorized script/resource loading)
- X-DNS-Prefetch-Control: on (allows browser DNS prefetching)

---

## 7. PWA / Service Worker

**Status:** PRESENT

- `manifest.json` linked in root layout head
- `theme-color` meta tag set to `#C8322B`
- `apple-mobile-web-app-capable: yes` set
- `apple-touch-icon` linked to `/icons/icon-192x192.png`
- `/offline` page exists as PWA fallback
- Service worker registration not visible in layout (may be in manifest or separate script)

**Potential Issues:**
- `apple-mobile-web-app-title` hardcoded to "Yalla London" (not multi-site)
- `theme-color` hardcoded to `#C8322B` (Yalla London red, not per-site)

---

## 8. Accessibility (Performance-Adjacent)

**Status:** GOOD

- Skip-to-content link present: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>`
- Main content has `id="main-content"` target
- `html` tag has dynamic `lang` and `dir` attributes based on locale (supports LTR/RTL)
- `suppressHydrationWarning` on html and body (for theme provider SSR mismatch, acceptable)

---

## 9. Third-Party Script Impact

| Script                        | Loading Strategy    | Blocking? | Estimated Impact |
|-------------------------------|---------------------|-----------|------------------|
| Google Tag Manager            | afterInteractive    | No        | ~50ms TBT        |
| GA4 config                    | afterInteractive    | No        | ~20ms TBT        |
| Inline performance tracking   | Synchronous (inline)| YES       | ~10-30ms TBT     |
| Cookie consent banner         | Client component    | Partial   | Unknown          |

**Total estimated third-party impact:** 80-100ms Total Blocking Time

---

## 10. Build Configuration

**Status:** GOOD

- `reactStrictMode: true` (catches potential issues in development)
- `typescript.ignoreBuildErrors: false` (enforces type safety)
- `distDir` configurable via env var
- `serverExternalPackages: ['@prisma/client', 'prisma']` (correct for Prisma server-side usage)

---

## Summary of Performance Concerns

| # | Issue                                    | Severity | Impact Area | Recommendation                              |
|---|------------------------------------------|----------|-------------|---------------------------------------------|
| 1 | Inline performance script (45 lines)     | MEDIUM   | TBT, FCP    | Extract to afterInteractive Script component |
| 2 | CWV tracking via custom code             | LOW      | TBT         | Replace with web-vitals library              |
| 3 | External Google Fonts                    | LOW      | LCP         | Consider self-hosting fonts                  |
| 4 | No font-display:swap visible             | LOW      | FCP, CLS    | Verify font-display strategy                 |
| 5 | No stale-if-error caching                | LOW      | Availability| Add stale-if-error to cache headers          |
| 6 | No dynamic import for non-critical       | LOW      | Bundle size | Lazy-load CookieConsentBanner, AnalyticsTracker |
| 7 | Blog featured images may lack dimensions | LOW      | CLS         | Ensure width/height on all images            |

---

## Next Steps for Live Performance Audit

1. Run Lighthouse on deployed site (mobile + desktop) to get actual scores
2. Check CrUX data in PageSpeed Insights for field data (LCP, INP, CLS)
3. Verify font loading waterfall in Chrome DevTools Network tab
4. Measure actual TBT contribution of inline performance script
5. Check if `optimizeCss: true` is effectively reducing CSS bundle size
6. Validate that Vercel edge caching is working (check response headers for cf-cache-status or x-vercel-cache)
7. Run WebPageTest for detailed waterfall analysis
