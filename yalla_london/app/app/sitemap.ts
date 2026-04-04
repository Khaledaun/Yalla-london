import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSiteDomain, getDefaultSiteId } from "@/config/sites";

/**
 * Sitemap — Cache-first, instant response
 *
 * Reads pre-built sitemap data from SiteSettings cache (one DB row, <50ms).
 * Cache is refreshed every 4 hours by content-auto-fix-lite cron.
 *
 * Fallback: if cache is missing or stale (>24h), triggers async regeneration
 * and returns a minimal static sitemap so Google never sees a 500 or timeout.
 *
 * Previous design (10+ live DB queries per request) caused timeouts under
 * cold starts and Supabase latency spikes — Google could not reach sitemap.xml.
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const headersList = await headers();
    const siteId = headersList.get("x-site-id") || getDefaultSiteId();
    const hostname = headersList.get("x-hostname") || getSiteDomain(siteId).replace(/^https?:\/\//, "");
    const baseUrl = hostname === "localhost:3000" ? "http://localhost:3000" : `https://${hostname}`;

    // Try reading from cache — single DB query, instant
    const { getCachedSitemap, regenerateSitemapCache } = await import("@/lib/sitemap-cache");
    const cached = await getCachedSitemap(siteId);

    if (cached && cached.entries.length > 0) {
      // Cache hit — serve instantly. Rewrite URLs if hostname differs from cached.
      const cachedDomain = new URL(cached.entries[0].url).origin;
      if (cachedDomain === baseUrl) {
        return cached.entries;
      }
      // Hostname mismatch (e.g. www vs non-www) — rewrite URLs
      return cached.entries.map((entry) => ({
        ...entry,
        url: entry.url.replace(cachedDomain, baseUrl),
        alternates: entry.alternates
          ? {
              languages: Object.fromEntries(
                Object.entries(entry.alternates.languages).map(([lang, url]) => [
                  lang,
                  (url as string).replace(cachedDomain, baseUrl),
                ]),
              ),
            }
          : undefined,
      }));
    }

    // Cache miss — trigger async regeneration for next request
    // Return minimal sitemap now so Google doesn't see 500
    console.warn(`[sitemap] Cache miss for ${siteId} — triggering regeneration`);
    regenerateSitemapCache(siteId).catch((err) =>
      console.error("[sitemap] Background regeneration failed:", err instanceof Error ? err.message : String(err)),
    );

    return buildFallbackSitemap(baseUrl, siteId);
  } catch (err) {
    console.error("[sitemap] FATAL:", err instanceof Error ? err.message : String(err));
    const fallbackSiteId = getDefaultSiteId();
    const fallbackDomain = getSiteDomain(fallbackSiteId).replace(/^https?:\/\//, "");
    return buildFallbackSitemap(`https://${fallbackDomain}`, fallbackSiteId);
  }
}

/**
 * Fallback sitemap when cache is empty.
 * Includes static pages + live blog post query (single fast query)
 * so Google always sees published articles even if cache is stale.
 */
async function buildFallbackSitemap(baseUrl: string, siteId: string): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const pages = [
    { path: "", priority: 1 },
    { path: "/blog", priority: 0.9 },
    { path: "/recommendations", priority: 0.9 },
    { path: "/hotels", priority: 0.8 },
    { path: "/experiences", priority: 0.8 },
    { path: "/events", priority: 0.8 },
    { path: "/news", priority: 0.8 },
    { path: "/halal-restaurants-london", priority: 0.9 },
    { path: "/luxury-hotels-london", priority: 0.9 },
    { path: "/london-with-kids", priority: 0.9 },
    { path: "/about", priority: 0.7 },
    { path: "/contact", priority: 0.6 },
  ];

  const entries: MetadataRoute.Sitemap = pages.map(({ path, priority }) => ({
    url: path ? `${baseUrl}${path}` : baseUrl,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority,
    alternates: {
      languages: {
        "en-GB": path ? `${baseUrl}${path}` : baseUrl,
        "ar-SA": path ? `${baseUrl}/ar${path}` : `${baseUrl}/ar`,
        "x-default": path ? `${baseUrl}${path}` : baseUrl,
      },
    },
  }));

  // Live query for published blog posts — single fast query, no cache needed
  try {
    const { prisma } = await import("@/lib/db");
    const posts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null, siteId },
      select: { slug: true, updated_at: true },
      orderBy: { updated_at: "desc" },
      take: 5000,
    });
    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at?.toISOString() || now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: {
          languages: {
            "en-GB": `${baseUrl}/blog/${post.slug}`,
            "ar-SA": `${baseUrl}/ar/blog/${post.slug}`,
            "x-default": `${baseUrl}/blog/${post.slug}`,
          },
        },
      });
    }
  } catch (err) {
    console.warn("[sitemap] Fallback blog query failed:", err instanceof Error ? err.message : String(err));
  }

  return entries;
}
