/**
 * Sitemap Cache — Pre-generate & serve instantly
 *
 * Instead of running 10+ DB queries on every Google crawl request,
 * the sitemap is pre-built by a cron job and cached in the SiteSettings table.
 * The sitemap.ts route reads one row — instant response, zero timeout risk.
 *
 * Cache is refreshed:
 * - By content-auto-fix-lite cron (every 4 hours)
 * - After content publish events (content-selector, scheduled-publish)
 * - Manually via dashboard "Refresh Sitemap" action
 *
 * If cache is missing or stale (>24h), sitemap.ts falls back to live generation.
 */

import { prisma } from "@/lib/db";
import { getSiteDomain, getDefaultSiteId, getActiveSiteIds, isYachtSite as checkIsYachtSite } from "@/config/sites";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  alternates?: {
    languages: Record<string, string>;
  };
}

interface SitemapCacheData {
  entries: SitemapEntry[];
  generatedAt: string;
  urlCount: number;
  siteId: string;
}

const CACHE_CATEGORY = "sitemap-cache";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Read cache ───────────────────────────────────────────────────────────────

export async function getCachedSitemap(siteId: string): Promise<SitemapCacheData | null> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { siteId_category: { siteId, category: CACHE_CATEGORY } },
      select: { config: true, updatedAt: true },
    });
    if (!row || !row.config) return null;

    const data = row.config as unknown as SitemapCacheData;
    if (!data.entries || !Array.isArray(data.entries)) return null;

    // Check staleness
    const age = Date.now() - new Date(data.generatedAt).getTime();
    if (age > CACHE_MAX_AGE_MS) {
      console.warn(`[sitemap-cache] Cache for ${siteId} is stale (${Math.round(age / 3600000)}h old)`);
      return null;
    }

    return data;
  } catch (err) {
    console.warn("[sitemap-cache] Read failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ── Write cache ──────────────────────────────────────────────────────────────

async function writeSitemapCache(siteId: string, entries: SitemapEntry[]): Promise<void> {
  const data: SitemapCacheData = {
    entries,
    generatedAt: new Date().toISOString(),
    urlCount: entries.length,
    siteId,
  };

  await prisma.siteSettings.upsert({
    where: { siteId_category: { siteId, category: CACHE_CATEGORY } },
    create: {
      siteId,
      category: CACHE_CATEGORY,
      config: data as any,
      enabled: true,
      updatedBy: "system/sitemap-cache",
    },
    update: {
      config: data as any,
      updatedBy: "system/sitemap-cache",
    },
  });
}

// ── Generate sitemap data ────────────────────────────────────────────────────

/**
 * Builds the full sitemap entries array for a site.
 * Called by cron jobs — NOT by the sitemap route itself.
 * Takes as long as it needs (no request timeout pressure).
 */
export async function regenerateSitemapCache(siteId: string): Promise<{ urlCount: number; durationMs: number }> {
  const start = Date.now();
  const domain = getSiteDomain(siteId).replace(/^https?:\/\//, "");
  const baseUrl = `https://${domain}`;
  const isYachtSite = checkIsYachtSite(siteId);
  const staticDate = "2026-02-19T00:00:00.000Z";

  function hreflang(path: string) {
    const enUrl = path ? `${baseUrl}${path}` : baseUrl;
    const arUrl = path ? `${baseUrl}/ar${path}` : `${baseUrl}/ar`;
    return {
      languages: {
        "en-GB": enUrl,
        "ar-SA": arUrl,
        "x-default": enUrl,
      },
    };
  }

  const entries: SitemapEntry[] = [];

  // ── Static pages ─────────────────────────────────────────────────────────

  if (isYachtSite) {
    // IMPORTANT: Keep in sync with buildFallbackSitemap() in app/sitemap.ts
    const yachtStatic: Array<[string, string, SitemapEntry["changeFrequency"], number]> = [
      ["", staticDate, "daily", 1],
      ["/fleet", staticDate, "weekly", 0.9],
      ["/yachts", staticDate, "daily", 0.9],
      ["/destinations", staticDate, "weekly", 0.9],
      ["/journal", staticDate, "weekly", 0.8],
      ["/itineraries", staticDate, "weekly", 0.8],
      ["/charter-planner", staticDate, "weekly", 0.8],
      ["/inquiry", staticDate, "monthly", 0.7],
      ["/how-it-works", staticDate, "monthly", 0.7],
      ["/faq", staticDate, "monthly", 0.6],
      ["/glossary", staticDate, "monthly", 0.8],
      ["/halal-charter", staticDate, "monthly", 0.9],
      ["/about", staticDate, "monthly", 0.7],
      ["/contact", staticDate, "monthly", 0.6],
      ["/blog", staticDate, "weekly", 0.7],
      ["/privacy", staticDate, "yearly", 0.3],
      ["/terms", staticDate, "yearly", 0.3],
    ];
    for (const [path, lastMod, freq, prio] of yachtStatic) {
      entries.push({
        url: path ? `${baseUrl}${path}` : baseUrl,
        lastModified: lastMod,
        changeFrequency: freq,
        priority: prio,
        alternates: hreflang(path),
      });
    }
  } else {
    // IMPORTANT: Keep in sync with buildFallbackSitemap() in app/sitemap.ts
    // Every static page must appear in BOTH places.
    const blogStatic: Array<[string, string, SitemapEntry["changeFrequency"], number]> = [
      // Homepage + content hubs
      ["", staticDate, "daily", 1],
      ["/blog", staticDate, "daily", 0.9],
      ["/recommendations", staticDate, "weekly", 0.9],
      ["/events", staticDate, "daily", 0.8],
      ["/experiences", staticDate, "weekly", 0.8],
      ["/hotels", staticDate, "weekly", 0.8],
      ["/news", staticDate, "daily", 0.8],
      // High-value long-tail pages
      ["/halal-restaurants-london", staticDate, "weekly", 0.9],
      ["/luxury-hotels-london", staticDate, "weekly", 0.9],
      ["/london-with-kids", staticDate, "weekly", 0.9],
      // Structured data pages (DefinedTermSet, Service, FAQPage)
      ["/faq", staticDate, "monthly", 0.8],
      ["/glossary", staticDate, "monthly", 0.8],
      ["/halal-charter", staticDate, "monthly", 0.9],
      // Navigation & discovery
      ["/destinations", staticDate, "weekly", 0.8],
      ["/itineraries", staticDate, "weekly", 0.8],
      ["/journal", staticDate, "weekly", 0.7],
      ["/shop", staticDate, "weekly", 0.7],
      ["/tools", staticDate, "monthly", 0.7],
      ["/tools/seo-audit", staticDate, "monthly", 0.7],
      ["/how-it-works", staticDate, "monthly", 0.7],
      // E-E-A-T trust signals
      ["/team", staticDate, "monthly", 0.6],
      ["/editorial-policy", staticDate, "yearly", 0.5],
      ["/affiliate-disclosure", staticDate, "yearly", 0.5],
      // Standard pages
      ["/about", staticDate, "monthly", 0.7],
      ["/contact", staticDate, "monthly", 0.6],
      ["/privacy", staticDate, "yearly", 0.3],
      ["/terms", staticDate, "yearly", 0.3],
    ];
    for (const [path, lastMod, freq, prio] of blogStatic) {
      entries.push({
        url: path ? `${baseUrl}${path}` : baseUrl,
        lastModified: lastMod,
        changeFrequency: freq,
        priority: prio,
        alternates: hreflang(path),
      });
    }
  }

  // ── Static content files (yalla-london only) ────────────────────────────

  if (siteId === "yalla-london") {
    try {
      const { blogPosts, categories } = await import("@/data/blog-content");
      const { extendedBlogPosts } = await import("@/data/blog-content-extended");
      const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

      const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      for (const post of allStaticPosts.filter(p => p.published)) {
        const isRecent = post.updated_at.getTime() > sevenDaysAgoMs;
        entries.push({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: post.updated_at.toISOString(),
          changeFrequency: isRecent ? "daily" : "weekly",
          priority: isRecent ? 0.9 : 0.8,
          alternates: hreflang(`/blog/${post.slug}`),
        });
      }

      // Category pages
      for (const cat of categories) {
        entries.push({
          url: `${baseUrl}/blog/category/${cat.slug}`,
          lastModified: staticDate,
          changeFrequency: "weekly",
          priority: 0.7,
          alternates: hreflang(`/blog/category/${cat.slug}`),
        });
      }

      // Information hub
      const { informationSections, informationArticles: baseInfoArticles, } = await import("@/data/information-hub-content");
      const { extendedInformationArticles } = await import("@/data/information-hub-articles-extended");
      const allInfoArticles = [...baseInfoArticles, ...extendedInformationArticles];

      entries.push(
        { url: `${baseUrl}/information`, lastModified: staticDate, changeFrequency: "weekly", priority: 0.9, alternates: hreflang("/information") },
        { url: `${baseUrl}/information/articles`, lastModified: staticDate, changeFrequency: "weekly", priority: 0.8, alternates: hreflang("/information/articles") },
      );

      for (const section of informationSections.filter(s => s.published)) {
        entries.push({
          url: `${baseUrl}/information/${section.slug}`,
          lastModified: staticDate,
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: hreflang(`/information/${section.slug}`),
        });
      }

      for (const article of allInfoArticles.filter(a => a.published)) {
        entries.push({
          url: `${baseUrl}/information/articles/${article.slug}`,
          lastModified: article.updated_at.toISOString(),
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: hreflang(`/information/articles/${article.slug}`),
        });
      }

      // London by foot
      const { walks } = await import("@/app/london-by-foot/walks-data");
      entries.push({
        url: `${baseUrl}/london-by-foot`,
        lastModified: staticDate,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: hreflang("/london-by-foot"),
      });
      for (const walk of walks) {
        entries.push({
          url: `${baseUrl}/london-by-foot/${walk.slug}`,
          lastModified: staticDate,
          changeFrequency: "monthly",
          priority: 0.75,
          alternates: hreflang(`/london-by-foot/${walk.slug}`),
        });
      }
    } catch (err) {
      console.warn("[sitemap-cache] Static content import failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── DB content ───────────────────────────────────────────────────────────

  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
  // Track static slugs to avoid duplicates
  const existingSlugs = new Set(entries.filter(e => e.url.includes("/blog/")).map(e => {
    const parts = e.url.split("/blog/");
    return parts[1] || "";
  }));

  // Blog posts from DB
  try {
    const dbPosts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null, siteId },
      select: { slug: true, updated_at: true },
      orderBy: { updated_at: "desc" },
      take: 500,
    });
    for (const post of dbPosts) {
      if (existingSlugs.has(post.slug)) continue;
      const isRecent = post.updated_at && post.updated_at.getTime() > sevenDaysAgoMs;
      entries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updated_at?.toISOString() || staticDate,
        changeFrequency: isRecent ? "daily" : "weekly",
        priority: isRecent ? 0.9 : 0.8,
        alternates: hreflang(`/blog/${post.slug}`),
      });
    }
  } catch (err) {
    console.warn("[sitemap-cache] BlogPost query failed:", err instanceof Error ? err.message : String(err));
  }

  // Events
  try {
    const events = await prisma.event.findMany({
      where: { published: true, siteId },
      select: { id: true, updated_at: true },
      orderBy: { updated_at: "desc" },
      take: 200,
    });
    for (const event of events) {
      entries.push({
        url: `${baseUrl}/events/${event.id}`,
        lastModified: event.updated_at?.toISOString() || staticDate,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: hreflang(`/events/${event.id}`),
      });
    }
  } catch (err) {
    console.warn("[sitemap-cache] Event query failed:", err instanceof Error ? err.message : String(err));
  }

  // News
  try {
    entries.push({
      url: `${baseUrl}/news`,
      lastModified: staticDate,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: hreflang("/news"),
    });

    const newsItems = await prisma.newsItem.findMany({
      where: { status: "published", siteId },
      select: { slug: true, updated_at: true },
      orderBy: { published_at: "desc" },
      take: 100,
    });
    for (const item of newsItems) {
      entries.push({
        url: `${baseUrl}/news/${item.slug}`,
        lastModified: item.updated_at?.toISOString() || staticDate,
        changeFrequency: "daily",
        priority: 0.7,
        alternates: hreflang(`/news/${item.slug}`),
      });
    }
  } catch (err) {
    console.warn("[sitemap-cache] NewsItem query failed:", err instanceof Error ? err.message : String(err));
  }

  // Shop products
  if (!isYachtSite) {
    try {
      const products = await prisma.digitalProduct.findMany({
        where: { is_active: true, OR: [{ site_id: siteId }, { site_id: null }] },
        select: { slug: true, updated_at: true },
        orderBy: { updated_at: "desc" },
        take: 100,
      });
      for (const product of products) {
        entries.push({
          url: `${baseUrl}/shop/${product.slug}`,
          lastModified: product.updated_at?.toISOString() || staticDate,
          changeFrequency: "weekly",
          priority: 0.6,
          alternates: hreflang(`/shop/${product.slug}`),
        });
      }
    } catch (err) {
      console.warn("[sitemap-cache] DigitalProduct query failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // Yacht-specific pages
  if (isYachtSite) {
    try {
      const yachts = await prisma.yacht.findMany({
        where: { siteId, status: "active" },
        select: { slug: true, updatedAt: true },
        take: 500,
      });
      for (const yacht of yachts) {
        entries.push({
          url: `${baseUrl}/yachts/${yacht.slug}`,
          lastModified: yacht.updatedAt?.toISOString() || staticDate,
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: hreflang(`/yachts/${yacht.slug}`),
        });
      }
    } catch (err) {
      console.warn("[sitemap-cache] Yacht query failed:", err instanceof Error ? err.message : String(err));
    }

    try {
      const destinations = await prisma.yachtDestination.findMany({
        where: { siteId, status: "active" },
        select: { slug: true, updatedAt: true },
        take: 200,
      });
      for (const dest of destinations) {
        entries.push({
          url: `${baseUrl}/destinations/${dest.slug}`,
          lastModified: dest.updatedAt?.toISOString() || staticDate,
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: hreflang(`/destinations/${dest.slug}`),
        });
      }
    } catch (err) {
      console.warn("[sitemap-cache] YachtDestination query failed:", err instanceof Error ? err.message : String(err));
    }

    try {
      const itineraries = await prisma.charterItinerary.findMany({
        where: { siteId, status: "active" },
        select: { slug: true, updatedAt: true },
        take: 200,
      });
      for (const itin of itineraries) {
        entries.push({
          url: `${baseUrl}/itineraries/${itin.slug}`,
          lastModified: itin.updatedAt?.toISOString() || staticDate,
          changeFrequency: "weekly",
          priority: 0.7,
          alternates: hreflang(`/itineraries/${itin.slug}`),
        });
      }
    } catch (err) {
      console.warn("[sitemap-cache] CharterItinerary query failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── Update lastModified for listing pages based on actual content ────────

  // Find the most recent blog post date and update the /blog listing page
  const latestBlogEntry = entries
    .filter(e => e.url.includes("/blog/") && !e.url.includes("/category/"))
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())[0];

  if (latestBlogEntry) {
    const blogListing = entries.find(e => e.url === `${baseUrl}/blog`);
    if (blogListing) blogListing.lastModified = latestBlogEntry.lastModified;
  }

  const latestNewsEntry = entries
    .filter(e => e.url.includes("/news/"))
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())[0];

  if (latestNewsEntry) {
    const newsListing = entries.find(e => e.url === `${baseUrl}/news`);
    if (newsListing) newsListing.lastModified = latestNewsEntry.lastModified;
  }

  // ── Write to cache ───────────────────────────────────────────────────────

  await writeSitemapCache(siteId, entries);

  const durationMs = Date.now() - start;
  console.log(`[sitemap-cache] Regenerated for ${siteId}: ${entries.length} URLs in ${durationMs}ms`);

  return { urlCount: entries.length, durationMs };
}

// ── Invalidate cache (fire-and-forget regeneration) ─────────────────────────

/**
 * Call after publishing, unpublishing, or deleting content.
 * Triggers async regeneration so stale URLs are purged from sitemap.
 * Never blocks the caller — errors are swallowed with a log.
 */
export function invalidateSitemapCache(siteId: string): void {
  regenerateSitemapCache(siteId).catch((err) =>
    console.warn("[sitemap-cache] Invalidation regeneration failed:", err instanceof Error ? err.message : String(err)),
  );
}

// ── Regenerate for all active sites ──────────────────────────────────────────

export async function regenerateAllSitemapCaches(): Promise<{ sites: Array<{ siteId: string; urlCount: number; durationMs: number }> }> {
  const activeSites = getActiveSiteIds();
  const results: Array<{ siteId: string; urlCount: number; durationMs: number }> = [];

  for (const siteId of activeSites) {
    try {
      const result = await regenerateSitemapCache(siteId);
      results.push({ siteId, ...result });
    } catch (err) {
      console.error(`[sitemap-cache] Failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
      results.push({ siteId, urlCount: 0, durationMs: 0 });
    }
  }

  return { sites: results };
}
