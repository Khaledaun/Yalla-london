export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { withCronLog } from "@/lib/cron-logger";
import { getSiteDomain } from "@/config/sites";

/**
 * Scheduled Content Publishing Cron Job
 * Runs 2x daily at 9:00 AM and 4:00 PM UTC
 *
 * Finds unpublished blog posts from ScheduledContent queue and publishes them.
 * The BlogPost model uses `published: Boolean` (no `status` or `scheduled_at`
 * columns) so we check via the ScheduledContent table which has scheduling info.
 */
export const GET = withCronLog("scheduled-publish", async (log) => {
  const { prisma } = await import("@/lib/db");
  const now = new Date();

  const results: { id: string; title: string; slug: string; site_id: string }[] = [];

  // Find scheduled content that is due for publishing
  try {
    const dueContent = await prisma.scheduledContent.findMany({
      where: {
        content_type: "blog_post",
        status: { in: ["pending", "scheduled"] },
        scheduled_for: { lte: now },
      },
      select: {
        id: true,
        content_id: true,
        site_id: true,
      },
      take: 20,
    });

    for (const item of dueContent) {
      if (log.isExpired()) break;

      if (!item.content_id) {
        log.trackItem(false);
        continue;
      }

      const siteId = item.site_id || "yalla-london";
      log.addSite(siteId);

      try {
        // Pre-publication gate: verify the target URL will work before publishing
        const postData = await prisma.blogPost.findUnique({
          where: { id: item.content_id },
          select: {
            id: true, slug: true, title_en: true, title_ar: true,
            meta_title_en: true, meta_description_en: true,
            content_en: true, content_ar: true, seo_score: true, tags: true,
          },
        });

        if (postData) {
          try {
            const { runPrePublicationGate } = await import(
              "@/lib/seo/orchestrator/pre-publication-gate"
            );
            const siteUrl = getSiteDomain(siteId);
            const gateResult = await runPrePublicationGate(
              `/blog/${postData.slug}`,
              {
                title_en: postData.title_en || undefined,
                title_ar: postData.title_ar || undefined,
                meta_title_en: postData.meta_title_en || undefined,
                meta_description_en: postData.meta_description_en || undefined,
                content_en: postData.content_en || undefined,
                content_ar: postData.content_ar || undefined,
                tags: postData.tags || [],
                seo_score: postData.seo_score || undefined,
              },
              siteUrl
            );

            if (!gateResult.allowed) {
              console.warn(
                `[Scheduled Publish] Pre-pub gate BLOCKED ${postData.slug}: ${gateResult.blockers.join("; ")}`
              );
              // Don't publish — mark as failed with reason
              await prisma.scheduledContent.update({
                where: { id: item.id },
                data: { status: "failed" },
              });
              log.trackItem(false);
              continue;
            }
          } catch (gateErr) {
            // Gate check failed — publish anyway (fail open, not closed)
            console.warn("[Scheduled Publish] Pre-pub gate error (non-fatal):", gateErr);
          }
        }

        // Publish the blog post
        const post = await prisma.blogPost.update({
          where: { id: item.content_id },
          data: { published: true },
          select: { id: true, title_en: true, slug: true, siteId: true },
        });

        // Mark scheduled content as published
        await prisma.scheduledContent.update({
          where: { id: item.id },
          data: { status: "published", published_at: now },
        });

        results.push({
          id: post.id,
          title: post.title_en || "Untitled",
          slug: post.slug,
          site_id: post.siteId || siteId,
        });
        log.trackItem(true);
      } catch (err) {
        console.error(`[Scheduled Publish] Failed to publish ${item.content_id}:`, err);
        log.trackItem(false);
      }
    }
  } catch (err) {
    // ScheduledContent table may not have matching records — that's OK
    console.warn("[Scheduled Publish] Query error (non-fatal):", err);
  }

  // Also check for unpublished blog posts that were created by the content
  // pipeline but never published (safety net)
  try {
    const orphanedDrafts = await prisma.blogPost.findMany({
      where: {
        published: false,
        content_en: { not: "" },
        created_at: { lte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2h+ old
      },
      select: { id: true, slug: true, title_en: true, siteId: true },
      take: 5,
    });

    // Don't auto-publish orphans — just report them
    if (orphanedDrafts.length > 0) {
      log.trackItem(true); // tracking observation
    }

    // Submit newly published URLs to IndexNow
    if (results.length > 0) {
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
    }

    return {
      published_count: results.length,
      published: results,
      orphaned_drafts: orphanedDrafts.length,
    };
  } catch {
    return {
      published_count: results.length,
      published: results,
    };
  }
}, { maxDurationMs: 30_000 });

export const POST = withCronLog("scheduled-publish-manual", async (log) => {
  const { prisma } = await import("@/lib/db");
  const now = new Date();

  let published = 0;

  try {
    const dueContent = await prisma.scheduledContent.findMany({
      where: {
        content_type: "blog_post",
        status: { in: ["pending", "scheduled"] },
        scheduled_for: { lte: now },
      },
      select: { id: true, content_id: true, site_id: true },
      take: 20,
    });

    for (const item of dueContent) {
      if (log.isExpired()) break;
      if (!item.content_id) continue;

      try {
        await prisma.blogPost.update({
          where: { id: item.content_id },
          data: { published: true },
        });
        await prisma.scheduledContent.update({
          where: { id: item.id },
          data: { status: "published", published_at: now },
        });
        published++;
        log.trackItem(true);
      } catch {
        log.trackItem(false);
      }
    }
  } catch {
    // non-fatal
  }

  return { published_count: published };
}, { maxDurationMs: 30_000 });
