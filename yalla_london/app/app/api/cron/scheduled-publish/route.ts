export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
export const GET = withCronLog(
  "scheduled-publish",
  async (log) => {
    // Feature flag guard — can be disabled via DB flag or env var CRON_SCHEDULED_PUBLISH=false
    const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
    const flagResponse = await checkCronEnabled("scheduled-publish");
    if (flagResponse) return { skipped: true, message: "Disabled via feature flag" };

    const { prisma } = await import("@/lib/db");
    const now = new Date();

    const results: { id: string; title: string; slug: string; site_id: string }[] = [];
    const activeSites = getActiveSiteIds();

    // Normalize title for dedup: strip years, fillers, punctuation (shared across both publish paths)
    const normalizeTitle = (t: string) =>
      t
        .toLowerCase()
        .replace(/\b20\d{2}\b/g, "")
        .replace(/\b(comparison|guide|review|complete|ultimate|best|top|london|luxury|halal|yalla|skip|line)\b/gi, "")
        .replace(/\bv\d+\b/gi, "") // Strip version suffixes (v2, v3, etc.)
        .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]/g, "") // Preserve Arabic Unicode
        .replace(/\s+/g, " ")
        .trim();

    // Jaccard similarity for fuzzy title matching — catches "London Eye Tickets Fast Track: Skip the Line"
    // vs "London Eye Tickets Fast Track: Skip Queues Guide" as duplicates even when subtitles differ
    const jaccardSimilarity = (a: string, b: string): number => {
      const setA = new Set(a.split(/\s+/).filter(Boolean));
      const setB = new Set(b.split(/\s+/).filter(Boolean));
      if (setA.size === 0 && setB.size === 0) return 1;
      let intersection = 0;
      for (const w of setA) if (setB.has(w)) intersection++;
      const union = setA.size + setB.size - intersection;
      return union === 0 ? 0 : intersection / union;
    };

    const isDuplicateTitle = (normTitle: string): boolean => {
      if (!normTitle) return false;
      // Exact match
      if (publishedTitleSet.has(normTitle)) return true;
      // Fuzzy match — 0.7 Jaccard similarity catches near-duplicates with different subtitles
      for (const existing of publishedTitleSet) {
        if (jaccardSimilarity(normTitle, existing) >= 0.7) return true;
      }
      return false;
    };

    // Pre-fetch published titles for dedup — shared by ScheduledContent and orphan paths
    const recentPublished = await prisma.blogPost
      .findMany({
        where: { published: true, ...(activeSites.length > 0 ? { siteId: { in: activeSites } } : {}) },
        select: { title_en: true },
        orderBy: { created_at: "desc" },
        take: 200,
      })
      .catch(() => [] as Array<{ title_en: string | null }>);

    const publishedTitleSet = new Set<string>(
      recentPublished.map((p) => normalizeTitle(p.title_en || "")).filter(Boolean),
    );

    // Find scheduled content that is due for publishing.
    // Filter by active site IDs to prevent cross-site content mixing —
    // each item's site context (domain, SEO gate, IndexNow) must be correct.
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

        // Per-site feature flag check — allows disabling publishing for a single site
        const siteFlag = await checkCronEnabled("scheduled-publish", siteId);
        if (siteFlag) continue;

        try {
          // Pre-publication gate: verify the target URL will work before publishing
          const postData = await prisma.blogPost.findUnique({
            where: { id: item.content_id },
            select: {
              id: true,
              slug: true,
              title_en: true,
              title_ar: true,
              meta_title_en: true,
              meta_description_en: true,
              content_en: true,
              content_ar: true,
              seo_score: true,
              tags: true,
            },
          });

          if (postData) {
            try {
              const { runPrePublicationGate } = await import("@/lib/seo/orchestrator/pre-publication-gate");
              const siteUrl = getSiteDomain(siteId);
              // 10s timeout per gate check — prevents a single slow gate from consuming the entire cron budget
              const gatePromise = runPrePublicationGate(
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
                siteUrl,
                { skipRouteCheck: true }, // Route already exists — HTTP checks waste 10s and cause timeouts that block ALL publishing
              );
              const gateTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Pre-pub gate timeout (10s)")), 10_000),
              );
              const gateResult = await Promise.race([gatePromise, gateTimeout]);

              if (!gateResult.allowed) {
                console.warn(
                  `[Scheduled Publish] Pre-pub gate BLOCKED ${postData.slug}: ${gateResult.blockers.join("; ")}`,
                );
                // Don't publish — but allow retry up to 3 times instead of permanent failure.
                // Previous behavior: permanent "failed" status → article never published.
                // New behavior: increment attempt counter, only mark "failed" after 3 attempts.
                const currentAttempts = ((item as Record<string, unknown>).publish_attempts as number) || 0;
                const maxAttempts = 3;
                if (currentAttempts + 1 >= maxAttempts) {
                  await prisma.scheduledContent.update({
                    where: { id: item.id },
                    data: { status: "failed" },
                  });
                  console.warn(
                    `[Scheduled Publish] Permanently failed ${postData.slug} after ${maxAttempts} gate failures`,
                  );
                } else {
                  // Keep as "pending" — will retry on next cron run
                  await prisma.scheduledContent
                    .update({
                      where: { id: item.id },
                      data: { status: "pending" },
                    })
                    .catch(() => {});
                  console.log(
                    `[Scheduled Publish] Gate blocked ${postData.slug} (attempt ${currentAttempts + 1}/${maxAttempts}) — will retry`,
                  );
                }
                log.trackItem(false);
                continue;
              }
            } catch (gateErr) {
              // Gate check failed — fail CLOSED: skip this attempt but allow retry
              console.warn(
                `[Scheduled Publish] Pre-pub gate error for ${postData.slug} — skipping this attempt (fail closed):`,
                gateErr,
              );
              // Keep as "pending" for retry — gate errors are often transient (timeouts, DB pool)
              await prisma.scheduledContent
                .update({
                  where: { id: item.id },
                  data: { status: "pending" },
                })
                .catch(() => {});
              log.trackItem(false);
              continue;
            }
          }

          // Normalized title dedup check before publishing (Rule #145)
          if (postData?.title_en) {
            const normScheduledTitle = normalizeTitle(postData.title_en);
            if (isDuplicateTitle(normScheduledTitle)) {
              console.warn(`[Scheduled Publish] BLOCKED duplicate: "${postData.title_en}" (normalized match exists)`);
              await prisma.scheduledContent
                .update({
                  where: { id: item.id },
                  data: { status: "failed" },
                })
                .catch(() => {});
              log.trackItem(false);
              continue;
            }
            if (normScheduledTitle) publishedTitleSet.add(normScheduledTitle);
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
          const enUrl = `${siteUrl}/blog/${post.slug}`;
          // Per rule #67 — Arabic /ar/ variants must be tracked alongside EN
          // or they're only discovered at the daily sync. Include both URLs in
          // the batch so IndexNow submission AND URLIndexingStatus tracking
          // covers both languages atomically.
          const arUrl = `${siteUrl}/ar/blog/${post.slug}`;
          if (!bySite.has(post.site_id)) bySite.set(post.site_id, []);
          bySite.get(post.site_id)!.push(enUrl, arUrl);
        }
        for (const [sid, urls] of bySite) {
          // Track every published URL in URLIndexingStatus FIRST — before
          // attempting IndexNow. This guarantees process-indexing-queue can
          // retry submission later even if all 3 IndexNow engines reject the
          // batch. Without this, ALL 309 never-submitted URLs we saw in the
          // briefing were caused by a single IndexNow failure on publish-day,
          // and the URL never re-entered the queue.
          for (const url of urls) {
            await prisma.uRLIndexingStatus
              .upsert({
                where: { site_id_url: { site_id: sid, url } },
                create: {
                  site_id: sid,
                  url,
                  slug: url.split("/blog/").pop() || null,
                  status: "discovered",
                  submitted_indexnow: false,
                },
                update: {}, // existing rows untouched here — IndexNow result handles them below
              })
              .catch((e: unknown) =>
                console.warn(
                  "[scheduled-publish] URLIndexingStatus pre-track upsert failed:",
                  e instanceof Error ? e.message : e,
                ),
              );
          }

          const siteUrl = getSiteDomain(sid);
          const indexResults = await submitToIndexNow(urls, siteUrl);
          const success = indexResults.some((r) => r.success);
          if (success) {
            console.log(`[scheduled-publish] Batch IndexNow submitted ${urls.length} URL(s) for ${sid}`);
            // Bump tracked URLs from "discovered" → "submitted".
            for (const url of urls) {
              await prisma.uRLIndexingStatus
                .upsert({
                  where: { site_id_url: { site_id: sid, url } },
                  create: {
                    site_id: sid,
                    url,
                    slug: url.split("/blog/").pop() || null,
                    status: "submitted",
                    submitted_indexnow: true,
                    last_submitted_at: new Date(),
                  },
                  update: {
                    status: "submitted",
                    submitted_indexnow: true,
                    last_submitted_at: new Date(),
                    submission_attempts: { increment: 1 },
                  },
                })
                .catch((e: unknown) =>
                  console.warn(
                    "[scheduled-publish] URLIndexingStatus upsert failed:",
                    e instanceof Error ? e.message : e,
                  ),
                );
            }
          } else {
            // ALL engines rejected. Pre-track upsert above already keeps the URL
            // in the queue at status="discovered" so process-indexing-queue will
            // retry on its next run with exponential backoff.
            const rejections = indexResults.map((r) => `${r.engine}: ${r.status || "n/a"}`).join(", ");
            console.warn(
              `[scheduled-publish] IndexNow rejected by ALL engines for ${sid} (${urls.length} URLs): ${rejections} — URLs left as "discovered" for retry`,
            );
          }
        }
      } catch (indexErr) {
        console.warn(
          "[scheduled-publish] IndexNow batch submission failed:",
          indexErr instanceof Error ? indexErr.message : indexErr,
        );
      }
    }

    // Also check for unpublished blog posts that were created by the content
    // pipeline but never published (safety net)
    let orphanedDraftCount = 0;
    try {
      // activeSites already declared at top of handler
      const orphanedDrafts = await prisma.blogPost.findMany({
        where: {
          published: false,
          content_en: { not: "" },
          created_at: { lte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // 2h+ old
          // Exclude articles intentionally unpublished by content-auto-fix or duplicate detection
          // CRITICAL: ALL content-auto-fix markers must be listed here. If content-auto-fix
          // unpublishes an article but this list doesn't exclude its marker, scheduled-publish
          // RE-PUBLISHES it on the next run — creating an infinite publish/unpublish loop.
          NOT: {
            OR: [
              { meta_description_en: { contains: "[AUTO-UNPUBLISHED:" } },
              { meta_description_en: { contains: "[DUPLICATE-FLAGGED:" } },
              { meta_description_en: { contains: "[UNPUBLISHED-THIN:" } },
              { meta_description_en: { contains: "[UNPUBLISHED:" } },
            ],
          },
          ...(activeSites.length > 0 ? { siteId: { in: activeSites } } : {}),
        },
        select: { id: true, slug: true, title_en: true, siteId: true },
        take: 10,
      });

      orphanedDraftCount = orphanedDrafts.length;
      if (orphanedDraftCount > 0) {
        console.log(
          `[scheduled-publish] Found ${orphanedDraftCount} orphaned unpublished BlogPost(s) — auto-publishing`,
        );

        // Auto-publish orphaned BlogPosts that have content.
        // These are articles created by the pipeline (via content-selector promoteToBlogPost)
        // but never set published=true — likely due to a crash between creation and update.
        // They already passed the pre-pub gate during promotion, so publish them directly.
        // normalizeTitle and publishedTitleSet defined at top of handler (shared with ScheduledContent path)

        for (const orphan of orphanedDrafts) {
          if (log.isExpired()) break;

          try {
            // Per-site feature flag check for orphan auto-publish
            const orphanSiteId = ((orphan as Record<string, unknown>).siteId as string) || activeSites[0];
            const orphanFlag = await checkCronEnabled("scheduled-publish", orphanSiteId);
            if (orphanFlag) continue;

            // Title dedup: skip orphans whose normalized title matches an already-published article.
            // Uses Jaccard similarity to catch near-duplicates like "London Eye Fast Track: Skip Line"
            // vs "London Eye Fast Track: Skip Queues Guide" (Rule #17, #155, #203).
            const normTitle = normalizeTitle(orphan.title_en || "");
            if (isDuplicateTitle(normTitle)) {
              console.log(
                `[scheduled-publish] Skipping duplicate orphan: "${orphan.title_en}" (normalized: "${normTitle}")`,
              );
              // Mark as duplicate so it doesn't get picked up again
              await prisma.blogPost
                .update({
                  where: { id: orphan.id },
                  data: { meta_description_en: `[DUPLICATE-FLAGGED:${new Date().toISOString()}] ${orphan.title_en}` },
                })
                .catch(() => {});
              continue;
            }
            // Add to set so subsequent orphans in this batch are also deduped
            if (normTitle) publishedTitleSet.add(normTitle);

            // BlogPost has NO published_at field (uses created_at/updated_at).
            // Previous code crashed on every orphan with Prisma "Unknown field" error.
            await prisma.blogPost.update({
              where: { id: orphan.id },
              data: { published: true },
            });
            const siteId = ((orphan as Record<string, unknown>).siteId as string) || activeSites[0];
            results.push({ id: orphan.id, title: orphan.title_en, slug: orphan.slug, site_id: siteId });
            log.trackItem(true);
            console.log(`[scheduled-publish] Auto-published orphan: ${orphan.slug}`);
          } catch (pubErr) {
            console.warn(
              `[scheduled-publish] Failed to auto-publish orphan ${orphan.slug}:`,
              (pubErr as Error).message,
            );
            log.trackItem(false);
          }
        }
      }
    } catch (err) {
      console.warn("[scheduled-publish] Orphan check failed:", err instanceof Error ? err.message : err);
    }

    // Invalidate sitemap cache if any articles were published
    if (results.length > 0 || (orphanedDraftCount || 0) > 0) {
      try {
        const { invalidateSitemapCache } = await import("@/lib/sitemap-cache");
        const activeSitesForCache = getActiveSiteIds();
        for (const sid of activeSitesForCache) {
          invalidateSitemapCache(sid);
        }
      } catch (e) {
        console.warn("[scheduled-publish] Sitemap invalidation failed:", e instanceof Error ? e.message : e);
      }
    }

    return {
      published_count: results.length,
      published: results,
      orphaned_drafts: orphanedDraftCount,
    };
  },
  { maxDurationMs: 53_000 },
);

export const POST = withCronLog(
  "scheduled-publish-manual",
  async (log) => {
    const { prisma } = await import("@/lib/db");
    const { runPrePublicationGate } = await import("@/lib/seo/orchestrator/pre-publication-gate");
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
              id: true,
              slug: true,
              title_en: true,
              title_ar: true,
              meta_title_en: true,
              meta_description_en: true,
              content_en: true,
              content_ar: true,
              seo_score: true,
              tags: true,
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
            // 10s timeout per gate check — prevents a single slow gate from consuming entire cron budget
            const gatePromise = runPrePublicationGate(
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
              siteUrl,
            );
            const gateTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Pre-pub gate timeout (10s)")), 10_000),
            );
            const gateResult = await Promise.race([gatePromise, gateTimeout]);

            if (!gateResult.allowed) {
              const reason = gateResult.blockers.join("; ");
              console.warn(`[Scheduled Publish Manual] Pre-pub gate BLOCKED ${postData.slug}: ${reason}`);
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
              gateErr,
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

          // Track URL for indexing (fire-and-forget)
          try {
            const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
            const domain = getSiteDomain(siteId);
            ensureUrlTracked(`https://${domain}/blog/${postData.slug}`, siteId, `blog/${postData.slug}`).catch((e) =>
              console.warn("[scheduled-publish-manual] URL tracking failed:", e instanceof Error ? e.message : e),
            );
            ensureUrlTracked(`https://${domain}/ar/blog/${postData.slug}`, siteId, `ar/blog/${postData.slug}`).catch(
              (e) =>
                console.warn("[scheduled-publish-manual] AR URL tracking failed:", e instanceof Error ? e.message : e),
            );
          } catch {
            /* non-fatal */
          }
        } catch (err) {
          console.error(`[Scheduled Publish Manual] Failed to process ${item.content_id}:`, err);
          log.trackItem(false);
        }
      }
    } catch (err) {
      console.warn("[scheduled-publish-manual] Query error (non-fatal):", err instanceof Error ? err.message : err);
    }

    // Invalidate sitemap cache if any articles were published
    if (published > 0) {
      try {
        const { invalidateSitemapCache } = await import("@/lib/sitemap-cache");
        const activeSitesForCache = getActiveSiteIds();
        for (const sid of activeSitesForCache) {
          invalidateSitemapCache(sid);
        }
      } catch (e) {
        console.warn("[scheduled-publish-manual] Sitemap invalidation failed:", e instanceof Error ? e.message : e);
      }
    }

    return { published_count: published, skipped_count: skipped.length, skipped };
  },
  { maxDurationMs: 53_000 },
);
