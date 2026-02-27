export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { withCronLog } from "@/lib/cron-logger";
import { getSiteDomain, getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

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

  // Find scheduled content that is due for publishing.
  // Filter by active site IDs to prevent cross-site content mixing —
  // each item's site context (domain, SEO gate, IndexNow) must be correct.
  const activeSites = getActiveSiteIds();
  try {
    const dueContent = await prisma.scheduledContent.findMany({
      where: {
        content_type: "blog_post",
        status: { in: ["pending", "scheduled"] },
        scheduled_time: { lte: now },
        ...(activeSites.length > 0 ? { site_id: { in: activeSites } } : {}),
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

      const siteId = item.site_id || getDefaultSiteId();
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
            // Gate check failed — fail CLOSED: skip publish rather than risk broken content
            console.warn(
              `[Scheduled Publish] Pre-pub gate error for ${postData.slug} — skipping publish (fail closed):`,
              gateErr
            );
            await prisma.scheduledContent.update({
              where: { id: item.id },
              data: { status: "failed" },
            });
            log.trackItem(false);
            continue;
          }
        }

        // Publish the blog post
        const post = await prisma.blogPost.update({
          where: { id: item.content_id },
          data: { published: true },
          select: { id: true, title_en: true, slug: true },
        });

        // Mark scheduled content as published
        await prisma.scheduledContent.update({
          where: { id: item.id },
          data: { status: "published", published_time: now },
        });

        results.push({
          id: post.id,
          title: post.title_en || "Untitled",
          slug: post.slug,
          site_id: siteId,
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

  // Submit newly published URLs to IndexNow using batch POST (not per-URL GET)
  // Separated from orphan check so IndexNow failure doesn't kill diagnostics
  if (results.length > 0) {
    try {
      const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
      // Group URLs by site for proper batch submission
      const bySite = new Map<string, string[]>();
      for (const post of results) {
        const siteUrl = getSiteDomain(post.site_id);
        const url = `${siteUrl}/blog/${post.slug}`;
        if (!bySite.has(post.site_id)) bySite.set(post.site_id, []);
        bySite.get(post.site_id)!.push(url);
      }
      for (const [sid, urls] of bySite) {
        const siteUrl = getSiteDomain(sid);
        const indexResults = await submitToIndexNow(urls, siteUrl);
        const success = indexResults.some((r) => r.success);
        if (success) {
          console.log(`[scheduled-publish] Batch IndexNow submitted ${urls.length} URL(s) for ${sid}`);
        }
      }
    } catch (indexErr) {
      console.warn("[scheduled-publish] IndexNow batch submission failed:", indexErr instanceof Error ? indexErr.message : indexErr);
    }
  }

  // Also check for unpublished blog posts that were created by the content
  // pipeline but never published (safety net)
  let orphanedDraftCount = 0;
  try {
    const { getActiveSiteIds } = await import("@/config/sites");
    const activeSites = getActiveSiteIds();
    const orphanedDrafts = await prisma.blogPost.findMany({
      where: {
        published: false,
        content_en: { not: "" },
        created_at: { lte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2h+ old
        ...(activeSites.length > 0 ? { siteId: { in: activeSites } } : {}),
      },
      select: { id: true, slug: true, title_en: true },
      take: 5,
    });

    // Don't auto-publish orphans — just report them
    if (orphanedDrafts.length > 0) {
      log.trackItem(true); // tracking observation
    }
    orphanedDraftCount = orphanedDrafts.length;
  } catch (err) {
    console.warn("[scheduled-publish] Orphan check failed:", err instanceof Error ? err.message : err);
  }

  return {
    published_count: results.length,
    published: results,
    orphaned_drafts: orphanedDraftCount,
  };
}, { maxDurationMs: 53_000 });

export const POST = withCronLog("scheduled-publish-manual", async (log) => {
  const { prisma } = await import("@/lib/db");
  const { runPrePublicationGate } = await import(
    "@/lib/seo/orchestrator/pre-publication-gate"
  );
  const now = new Date();

  let published = 0;
  const skipped: { id: string; slug: string; reason: string }[] = [];

  const activeSitesPost = getActiveSiteIds();
  try {
    const dueContent = await prisma.scheduledContent.findMany({
      where: {
        content_type: "blog_post",
        status: { in: ["pending", "scheduled"] },
        scheduled_time: { lte: now },
        ...(activeSitesPost.length > 0 ? { site_id: { in: activeSitesPost } } : {}),
      },
      select: { id: true, content_id: true, site_id: true },
      take: 20,
    });

    for (const item of dueContent) {
      if (log.isExpired()) break;
      if (!item.content_id) continue;

      const siteId = item.site_id || getDefaultSiteId();
      log.addSite(siteId);

      try {
        // Fetch blog post content for quality gate check
        const postData = await prisma.blogPost.findUnique({
          where: { id: item.content_id },
          select: {
            id: true, slug: true, title_en: true, title_ar: true,
            meta_title_en: true, meta_description_en: true,
            content_en: true, content_ar: true, seo_score: true, tags: true,
          },
        });

        if (!postData) {
          console.warn(`[Scheduled Publish Manual] BlogPost ${item.content_id} not found — skipping`);
          log.trackItem(false);
          continue;
        }

        // Pre-publication gate: fail closed — don't publish if gate errors or blocks
        try {
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
            const reason = gateResult.blockers.join("; ");
            console.warn(
              `[Scheduled Publish Manual] Pre-pub gate BLOCKED ${postData.slug}: ${reason}`
            );
            await prisma.scheduledContent.update({
              where: { id: item.id },
              data: { status: "failed" },
            });
            skipped.push({ id: postData.id, slug: postData.slug, reason });
            log.trackItem(false);
            continue;
          }
        } catch (gateErr) {
          // Gate errored — fail CLOSED: skip publish rather than risk broken content
          console.warn(
            `[Scheduled Publish Manual] Pre-pub gate error for ${postData.slug} — skipping publish (fail closed):`,
            gateErr
          );
          await prisma.scheduledContent.update({
            where: { id: item.id },
            data: { status: "failed" },
          });
          skipped.push({
            id: postData.id,
            slug: postData.slug,
            reason: `Gate error: ${(gateErr as Error).message || "unknown"}`,
          });
          log.trackItem(false);
          continue;
        }

        // Gate passed — publish
        await prisma.blogPost.update({
          where: { id: item.content_id },
          data: { published: true },
        });
        await prisma.scheduledContent.update({
          where: { id: item.id },
          data: { status: "published", published_time: now },
        });
        published++;
        log.trackItem(true);
      } catch (err) {
        console.error(`[Scheduled Publish Manual] Failed to process ${item.content_id}:`, err);
        log.trackItem(false);
      }
    }
  } catch (err) {
    console.warn("[scheduled-publish-manual] Query error (non-fatal):", err instanceof Error ? err.message : err);
  }

  return { published_count: published, skipped_count: skipped.length, skipped };
}, { maxDurationMs: 53_000 });
