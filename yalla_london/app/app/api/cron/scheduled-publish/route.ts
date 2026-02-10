export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { withCronLog } from "@/lib/cron-logger";
import { getSiteDomain } from "@/config/sites";

/**
 * Scheduled Content Publishing Cron Job
 * Runs 2x daily at 9:00 AM and 4:00 PM UTC
 *
 * Finds blog posts with status='scheduled' and scheduled_at <= now,
 * then publishes them by setting published=true and status='published'.
 */
export const GET = withCronLog("scheduled-publish", async (log) => {
  const { prisma } = await import("@/lib/db");
  const now = new Date();

  const results: { id: string; title: string; slug: string; site_id: string }[] = [];

  // Find all posts that are scheduled and due for publishing
  const duePosts = await prisma.blogPost.findMany({
    where: {
      status: "scheduled",
      published: false,
      scheduled_at: { lte: now },
      deletedAt: null,
    },
    select: {
      id: true,
      title_en: true,
      slug: true,
      site_id: true,
      siteId: true,
    },
  });

  // Publish each due post
  for (const post of duePosts) {
    if (log.isExpired()) break;

    const siteId = post.siteId || post.site_id || "yalla-london";
    log.addSite(siteId);

    try {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: {
          published: true,
          status: "published",
          updated_at: now,
        },
      });

      results.push({
        id: post.id,
        title: post.title_en || "Untitled",
        slug: post.slug,
        site_id: siteId,
      });
      log.trackItem(true);
    } catch (err) {
      console.error(`[Scheduled Publish] Failed to publish ${post.id}:`, err);
      log.trackItem(false);
    }
  }

  // Submit newly published URLs to IndexNow (per-site domain)
  if (results.length > 0) {
    try {
      const indexNowKey = process.env.INDEXNOW_KEY;
      if (indexNowKey) {
        for (const post of results) {
          const siteUrl = getSiteDomain(post.site_id);
          const url = `${siteUrl}/blog/${post.slug}`;
          await fetch(
            `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${indexNowKey}`,
          ).catch(() => {});
        }
      }
    } catch {
      // IndexNow is best-effort
    }
  }

  // Get next scheduled posts
  const nextScheduled = await prisma.blogPost.findMany({
    where: {
      status: "scheduled",
      published: false,
      scheduled_at: { gt: now },
      deletedAt: null,
    },
    select: { id: true, title_en: true, scheduled_at: true },
    orderBy: { scheduled_at: "asc" },
    take: 5,
  });

  return {
    published_count: results.length,
    published: results,
    next_scheduled: nextScheduled.map((p) => ({
      id: p.id,
      title: p.title_en,
      scheduled_at: p.scheduled_at?.toISOString(),
    })),
  };
}, { maxDurationMs: 30_000 });

export const POST = withCronLog("scheduled-publish-manual", async (log) => {
  // Delegate to the same logic by re-importing the GET handler's logic
  const { prisma } = await import("@/lib/db");
  const now = new Date();

  const duePosts = await prisma.blogPost.findMany({
    where: {
      status: "scheduled",
      published: false,
      scheduled_at: { lte: now },
      deletedAt: null,
    },
    select: { id: true, title_en: true, slug: true, siteId: true, site_id: true },
  });

  let published = 0;
  for (const post of duePosts) {
    if (log.isExpired()) break;
    try {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { published: true, status: "published", updated_at: now },
      });
      published++;
      log.trackItem(true);
    } catch {
      log.trackItem(false);
    }
  }

  return { published_count: published, total_due: duePosts.length };
}, { maxDurationMs: 30_000 });
