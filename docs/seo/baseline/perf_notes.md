# SEO Baseline -- Performance Notes

**Generated:** 2026-02-19
**Site:** yalla-london.com
**Framework:** Next.js 14 App Router on Vercel Pro
**Config File:** next.config.js
**Standards Reference:** lib/seo/standards.ts v2026-02-18

---

## Core Web Vitals Targets (from standards.ts)

| Metric | Target | March 2024 Update |
|--------|--------|-------------------|
| LCP    | <= 2.5s | Unchanged |
| INP    | <= 200ms | Replaced FID as of March 2024 |
| CLS    | <= 0.1  | Unchanged |
| TTFB   | <= 600ms | Not an official CWV but monitored |

> **Note:** FID was replaced by INP (Interaction to Next Paint) as a Core Web Vital in March 2024. INP measures all interactions, not just the first one. The inline CWV tracking script in the root layout still references `first-input` events, which corresponds to the deprecated FID metric.

---

## Image Optimization

### Configuration (next.config.js)

| Setting | Value | Assessment |
|---------|-------|------------|
| Formats | AVIF + WebP | GOOD -- AVIF provides ~30-50% better compression than WebP |
| Min cache TTL | 2,592,000s (30 days) | GOOD -- appropriate for content images |
| Device sizes | 640, 750, 828, 1080, 1200, 1920, 2048 | GOOD -- covers mobile through 2K |
| Image sizes | 16, 32, 48, 64, 96, 128, 256, 384 | GOOD -- covers icons through thumbnails |
| Unoptimized | false | GOOD -- optimization enabled |
| Remote patterns | Supabase, Vercel, Cloudflare, Unsplash, Pexels, all 5 site domains | GOOD -- comprehensive |

### Usage Assessment

- `next/image` component is used for blog post images, homepage hero, and content images.
- No raw `<img>` tags detected on major public page templates (blog, news, information hub).
- No `placeholder="blur"` or `blurDataURL` usage detected in page files. Adding blur placeholders would improve perceived LCP by showing an immediate low-resolution preview.
- No explicit `priority` prop detected on hero/banner images. Above-the-fold images default to lazy loading, which delays LCP.

### Risks

| Risk | Impact | Severity |
|------|--------|----------|
| Hero images without `priority` prop | LCP delayed by lazy loading on above-fold images | HIGH |
| No blur placeholder on content images | Empty space visible until image loads, poor perceived performance | MEDIUM |
| Blog featured images from DB may lack width/height | Layout shift (CLS) as image dimensions unknown at render time | MEDIUM |
| Missing 3840px device size for 4K displays | Upscaled 2048px images on 4K screens | LOW |

### Recommendations

1. Add `priority` prop to hero/featured images on homepage, blog post pages, and any above-the-fold image components.
2. Add `placeholder="blur"` with `blurDataURL` (10px base64 thumbnail) to content images.
3. Verify blog post featured images from DB include width and height fields, or use `fill` mode with a sized container to prevent CLS.

---

## Font Strategy

### Configuration (app/layout.tsx)

| Setting | Value | Assessment |
|---------|-------|------------|
| Preconnect | fonts.googleapis.com | GOOD -- reduces DNS/TCP overhead |
| Preconnect | fonts.gstatic.com (crossOrigin="") | GOOD -- for font file delivery |
| font-display | Not explicitly set | NEEDS IMPROVEMENT |
| Font loading method | Google Fonts external `<link>` | ACCEPTABLE -- not self-hosted |

### Font Stack (from destination-themes.ts)

| Role | Font Family | Source |
|------|-------------|--------|
| Heading | Anybody | Google Fonts |
| Body | Source Serif 4 | Google Fonts |
| Arabic | IBM Plex Sans Arabic | Google Fonts |
| Code | N/A | System stack |

### Body CSS Class

The `<body>` tag uses `className="font-editorial"` which maps to a custom font family defined in the Tailwind configuration.

### Risks

| Risk | Impact | Severity |
|------|--------|----------|
| No explicit `font-display: swap` | Flash of invisible text (FOIT) on slow connections | HIGH |
| External Google Fonts requests | ~100-200ms added to initial render per font file | HIGH |
| Not using `next/font` | Missing automatic self-hosting, font-display swap, and size-adjust | MEDIUM |
| Multiple font families loaded | Heading + body + Arabic = 3+ font file requests | MEDIUM |

### Recommendations

1. **Migrate to `next/font`** for automatic self-hosting. This eliminates the external Google Fonts dependency entirely, provides automatic `font-display: swap`, and enables `size-adjust` to prevent CLS from font swapping.
2. If keeping Google Fonts, add `&display=swap` to the font CSS URL parameter.
3. Consider `<link rel="preload">` for the critical font files (body font used above-fold).
4. Audit how many font weights are loaded. Each weight is a separate file. Minimize to weights actually used.

---

## Script Loading

### Google Analytics 4 (app/layout.tsx L146-169)

| Property | Value | Assessment |
|----------|-------|------------|
| Script strategy | `afterInteractive` | GOOD -- loads after hydration |
| Conditional | Only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set and non-empty | GOOD -- no production penalty when unset |
| Cookie config | `SameSite=None;Secure` | GOOD -- cross-site compatibility |
| Scripts | 2: external gtag.js loader + inline config | ACCEPTABLE |

**Assessment:** Correct implementation. `afterInteractive` ensures GA4 does not block LCP or INP. Conditional loading prevents unnecessary script in development.

### Core Web Vitals Tracking (app/layout.tsx L172-218)

| Property | Value | Assessment |
|----------|-------|------------|
| Script type | Raw `<script>` via `dangerouslySetInnerHTML` | NEEDS IMPROVEMENT |
| Loading | Synchronous -- executes during HTML parsing | CONCERN |
| Size | ~45 lines of inline JavaScript | CONCERN |
| Content | CWV reporting, page load timing, scroll depth tracking | DOCUMENTED |

**Detailed Analysis:**

The inline script performs three functions:

1. **Performance event listener** (lines ~175-190): Listens for `first-input` PerformanceObserver events and sends them to GA4 via `sendToAnalytics()`. Note: `first-input` measures FID which was deprecated and replaced by INP in March 2024.

2. **Page load timing** (lines ~192-210): Uses `setTimeout(fn, 0)` to defer `performance.getEntriesByType('navigation')` to the next tick. Calculates TTFB, DOM content loaded, page load, and DNS lookup times. Sends to GA4.

3. **Scroll depth tracking** (lines ~212-218): Adds a `scroll` event listener that tracks 25% depth increments (25%, 50%, 75%, 100%). Fires GA4 events at each threshold.

**Risks:**

| Risk | Impact | Severity |
|------|--------|----------|
| ~45 lines of synchronous inline JS | Contributes to Total Blocking Time (TBT), affects INP | MEDIUM |
| Scroll event listener without `passive: true` | May block scrolling on mobile, increasing INP | MEDIUM |
| FID measurement instead of INP | Outdated metric since March 2024 | LOW |
| `sendToAnalytics` may never fire | `web-vitals` library is not imported -- the function definition exists but the observer pattern may be incomplete | LOW |

### Recommendations

1. **Extract to external script file** loaded with `strategy="afterInteractive"` or `strategy="lazyOnload"`.
2. **Add `{ passive: true }` to the scroll event listener** to prevent blocking scroll on mobile.
3. **Replace `first-input` observer with INP measurement** using the `web-vitals` npm package (v4+).
4. **Move scroll depth tracking to `strategy="lazyOnload"`** since it is not critical for any page functionality.

---

## ISR Strategy

### Pages with ISR (Incremental Static Regeneration)

| Page Type | Path Pattern | Revalidate | Assessment |
|-----------|-------------|------------|------------|
| Blog listing | /blog | 600s (10 min) | GOOD |
| Blog post | /blog/[slug] | 600s | GOOD |
| Blog category | /blog/category/[slug] | 600s | GOOD |
| News listing | /news | 600s | GOOD |
| News detail | /news/[slug] | 600s | GOOD |
| Information hub | /information | 600s | GOOD |
| Information section | /information/[section] | 600s | GOOD |
| Information articles | /information/articles | 600s | GOOD |
| Information article | /information/articles/[slug] | 600s | GOOD |

### Pages with revalidate = 0 (no cache)

| Page | Reason |
|------|--------|
| /brand-guidelines | Internal page, revalidate=0 |
| /brand-showcase | Internal page, revalidate=0 |
| Admin pages (78) | Correct -- admin should never cache |

### Pages with NO explicit revalidate

All other public pages (homepage, about, contact, events, experiences, hotels, shop, etc.) use default Next.js behavior -- static generation at build time with no automatic revalidation.

**Risks:**

- **Homepage has no ISR revalidation.** If the homepage includes dynamic content (latest articles, featured posts), it will only update on redeployment.
- **Events page has no ISR revalidation.** DB events will only appear after redeployment unless ISR is added.
- **Shop pages have no ISR revalidation.** Product changes only visible after redeployment.

### Recommendations

1. Add `revalidate = 600` to homepage, events, and shop pages.
2. London-by-foot pages should have ISR if content is DB-driven.

---

## CDN Cache Headers (next.config.js)

| Path Pattern | Browser Cache | CDN Cache (s-maxage) | Stale-While-Revalidate | Vary |
|-------------|---------------|---------------------|------------------------|------|
| /blog/* | 0 | 600s (10 min) | 3600s (1 hour) | Accept-Encoding, x-site-id |
| /events/* | 0 | 600s | 3600s | Accept-Encoding, x-site-id |
| /recommendations/* | 0 | 600s | 3600s | Accept-Encoding, x-site-id |
| /about | 60s | 3600s (1 hour) | 86400s (24 hours) | Accept-Encoding |
| /contact | 60s | 3600s | 86400s | Accept-Encoding |
| /sitemap.xml | 0 | 3600s | 86400s | -- |
| /robots.txt | 0 | 3600s | 86400s | -- |
| /_next/static/* | 31536000s (1 year, immutable) | -- | -- | -- |
| Static assets (.ico, .svg, .jpg, etc.) | 31536000s (1 year, immutable) | -- | -- | -- |
| /admin/* | no-store, no-cache, must-revalidate | -- | -- | -- |
| /api/admin/* | no-store, no-cache, must-revalidate | -- | -- | -- |
| /api/blog/* | 0 | 300s (5 min) | 600s | -- |
| /api/events/* | 0 | 300s | 600s | -- |

### Assessment

- Content pages: Aggressive CDN caching (600s) with generous stale-while-revalidate (1 hour). Users see cached content while Vercel regenerates in background. Good for performance.
- Static pages: 1-hour CDN cache with 24-hour stale-while-revalidate. Appropriate for rarely-changing pages.
- Static assets: 1-year immutable cache. Correct for hashed Next.js bundles.
- Admin: No-store is correct for authenticated pages.
- `Vary: x-site-id` on content pages ensures multi-site responses are cached separately per site.

---

## Security Headers Relevant to Performance and SEO

| Header | Value | Impact |
|--------|-------|--------|
| HSTS | max-age=63072000; includeSubDomains; preload | Ensures HTTPS (positive ranking signal). Eliminates HTTP-to-HTTPS redirect latency after first visit. |
| CSP | self + Google Analytics + Supabase + fonts.googleapis.com + fonts.gstatic.com | May block future third-party scripts if not updated. |
| X-Frame-Options | DENY | Prevents embedding. No SEO/perf impact. |
| X-Content-Type-Options | nosniff | Security. No SEO/perf impact. |
| Referrer-Policy | strict-origin-when-cross-origin | May limit referrer data to analytics. |

---

## General Performance Configuration

| Setting | Value | Assessment |
|---------|-------|------------|
| compress | true | GOOD -- gzip/brotli compression enabled |
| poweredByHeader | false | GOOD -- removes X-Powered-By header |
| reactStrictMode | true | GOOD -- dev only, no production impact |
| optimizeCss | true (experimental) | GOOD -- CSS optimization enabled |
| serverExternalPackages | @prisma/client, prisma | GOOD -- prevents Prisma bundling into serverless functions |

---

## Known CWV Risks Summary

### LCP Risks (Largest Contentful Paint)

| # | Risk | Source | Estimated Impact | Fix Difficulty |
|---|------|--------|-----------------|----------------|
| 1 | External Google Fonts render-blocking | app/layout.tsx preconnect | +100-200ms | MEDIUM (migrate to next/font) |
| 2 | Hero images without `priority` prop | Blog, homepage | +200-500ms | LOW (add priority prop) |
| 3 | No blur placeholder on images | Content images | Perceived +200ms | LOW (add blurDataURL) |

### INP Risks (Interaction to Next Paint)

| # | Risk | Source | Estimated Impact | Fix Difficulty |
|---|------|--------|-----------------|----------------|
| 1 | Inline synchronous CWV script | app/layout.tsx L172-218 | +10-20ms TBT | LOW (extract to external) |
| 2 | Scroll listener without passive:true | app/layout.tsx ~L212 | Up to +50ms on mobile | LOW (add passive) |
| 3 | React hydration of client components | LanguageProvider, ThemeProvider, etc. | Varies | N/A (inherent to framework) |

### CLS Risks (Cumulative Layout Shift)

| # | Risk | Source | Estimated Impact | Fix Difficulty |
|---|------|--------|-----------------|----------------|
| 1 | Font swap without size-adjust | Google Fonts loading | +0.05-0.1 CLS | MEDIUM (migrate to next/font) |
| 2 | DynamicHeader component | Client-side render after hydration | +0.05 CLS if height changes | MEDIUM |
| 3 | Images without dimensions | Blog featured images from DB | +0.1+ CLS per image | LOW (use fill mode or DB dimensions) |
| 4 | Cookie consent banner | CookieConsentBanner component | +0.05 CLS if pushes content | LOW (use fixed positioning) |
| 5 | Fixed pt-20 padding assumption | Main content padding for header | CLS if header != 5rem | LOW |

---

## Action Items (Priority Order)

| # | Priority | Item | Expected Impact | Effort |
|---|----------|------|-----------------|--------|
| 1 | HIGH | Migrate from Google Fonts to `next/font` | Eliminate render-blocking font request. Improve LCP by 100-200ms. Automatic font-display:swap prevents CLS from font swap. | 2-4 hours |
| 2 | HIGH | Add `priority` prop to above-fold hero/featured images | Improve LCP by 200-500ms on key landing pages. | 30 min |
| 3 | HIGH | Extract inline CWV script to external file with afterInteractive | Reduce TBT by 10-20ms. Improve INP. | 1 hour |
| 4 | MEDIUM | Add `placeholder="blur"` to content images | Reduce perceived LCP. Better user experience. | 1-2 hours |
| 5 | MEDIUM | Add `{ passive: true }` to scroll event listener | Improve INP on mobile by preventing scroll blocking. | 5 min |
| 6 | MEDIUM | Replace FID measurement with INP using web-vitals v4+ | Measure the actual CWV metric (INP replaced FID March 2024). | 1 hour |
| 7 | MEDIUM | Add ISR revalidation to homepage and events page | Ensure fresh content without redeployment. | 30 min |
| 8 | LOW | Add blur data URLs to blog post featured images | Smoother image loading experience. | 2 hours |
| 9 | LOW | Verify no raw `<img>` tags on public pages | Ensure all images use next/image optimization. | 30 min |
| 10 | LOW | Add width/height to DB blog post featured images or use fill mode | Prevent CLS from images without dimensions. | 1-2 hours |
