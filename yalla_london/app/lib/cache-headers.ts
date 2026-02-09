/**
 * Cache header utilities for Cloudflare CDN optimization.
 *
 * Cloudflare respects `s-maxage` for edge caching and `stale-while-revalidate`
 * for serving stale content while fetching fresh data in the background.
 *
 * Cache strategy:
 * - Static pages (about, contact): 1 hour edge, 60s browser
 * - Content pages (blog, events): 10 min edge, 0s browser (always fresh for users)
 * - Public API (listings, search): 5 min edge, 0s browser
 * - Admin API: never cache
 * - Assets (images, fonts, JS/CSS): 1 year immutable (handled by next.config.js)
 */

export const CACHE_PROFILES = {
  /** Static marketing pages - rarely change */
  staticPage: "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",

  /** Content pages - blog posts, events - moderate freshness */
  contentPage: "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",

  /** Home page - changes frequently */
  homePage: "public, max-age=0, s-maxage=300, stale-while-revalidate=600",

  /** Public API responses - short edge cache */
  publicApi: "public, max-age=0, s-maxage=300, stale-while-revalidate=600",

  /** Sitemap/robots - daily freshness */
  seoFiles: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",

  /** Admin API - never cache */
  noCache: "no-store, no-cache, must-revalidate",

  /** Immutable assets */
  immutable: "public, max-age=31536000, immutable",
} as const;

/**
 * Returns headers object for a NextResponse with proper cache control.
 * Use in API routes: return NextResponse.json(data, { headers: cacheHeaders('publicApi') })
 */
export function cacheHeaders(
  profile: keyof typeof CACHE_PROFILES,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    "Cache-Control": CACHE_PROFILES[profile],
    // CDN-Tag for Cloudflare cache purging by tag
    ...(extra || {}),
  };
}

/**
 * Cloudflare-specific cache tags for targeted purging.
 * Use: headers['CDN-Tag'] = cdnTag('blog', 'yalla-london')
 */
export function cdnTag(...tags: string[]): string {
  return tags.join(",");
}
