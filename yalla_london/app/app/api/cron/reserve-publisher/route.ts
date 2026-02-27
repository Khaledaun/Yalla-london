export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — Vercel Pro allows up to 300s for crons

/**
 * Reserve Publisher — Daily Safety Net (21:00 UTC)
 *
 * MISSION: Guarantee at least 1 English + 1 Arabic article published per site per day.
 *
 * How it works:
 *   1. For each active site, count BlogPosts published today
 *   2. If < 1 English OR < 1 Arabic published:
 *      a. First: try to promote reservoir articles (fastest, ~5s)
 *      b. If no reservoir: generate from scratch via full-pipeline-runner (~50s)
 *   3. Submit all new articles to IndexNow immediately
 *   4. Log everything to CronJobLog for dashboard visibility
 *
 * This cron is the LAST line of defense. If the regular pipeline (content-builder
 * → content-selector → scheduled-publish) all failed or produced nothing today,
 * this cron fires and ensures we still hit our daily minimum.
 *
 * The reserve drafting agent uses STRICT SEO requirements — articles must be
 * indexing-ready from birth because the SEO deep-review runs 3 hours later.
 *
 * Schedule: 21:00 UTC daily (vercel.json)
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { onCronFailure } from "@/lib/ops/failure-hooks";

const TOTAL_BUDGET_MS = 280_000; // 280s safe budget in 300s function
const PER_SITE_BUDGET_MS = 120_000; // 120s per site max

interface SitePublishResult {
  siteId: string;
  alreadyPublishedEN: number;
  alreadyPublishedAR: number;
  reservePublishedEN: number;
  reservePublishedAR: number;
  generatedEN: boolean;
  generatedAR: boolean;
  indexedUrls: number;
  errors: string[];
}

export async function GET(request: NextRequest) {
  const cronStart = Date.now();

  // Standard cron auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: SitePublishResult[] = [];

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, SITES, getSiteDomain } = await import("@/config/sites");
    const { promoteToBlogPost } = await import("@/lib/content-pipeline/select-runner");
    const { submitToIndexNow } = await import("@/lib/seo/indexing-service");

    const activeSites = getActiveSiteIds().filter(
      (id) => id !== "zenitha-yachts-med" // Yachts don't use content pipeline
    );

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    for (const siteId of activeSites) {
      if (Date.now() - cronStart > TOTAL_BUDGET_MS) {
        const skippedSites = activeSites.filter((s) => !results.some((r) => r.siteId === s));
        console.log(`[reserve-publisher] Total budget exhausted, skipping ${skippedSites.length} remaining site(s): ${skippedSites.join(", ")}`);
        break;
      }

      const siteStart = Date.now();
      const siteResult: SitePublishResult = {
        siteId,
        alreadyPublishedEN: 0,
        alreadyPublishedAR: 0,
        reservePublishedEN: 0,
        reservePublishedAR: 0,
        generatedEN: false,
        generatedAR: false,
        indexedUrls: 0,
        errors: [],
      };

      try {
        // ── Count what was already published today ──────────────────────
        const todayPosts = await prisma.blogPost.findMany({
          where: {
            siteId,
            published: true,
            created_at: { gte: todayStart },
          },
          select: { id: true, content_en: true, content_ar: true, slug: true },
        });

        siteResult.alreadyPublishedEN = todayPosts.filter(
          (p: any) => p.content_en && p.content_en.length > 100
        ).length;
        siteResult.alreadyPublishedAR = todayPosts.filter(
          (p: any) => p.content_ar && p.content_ar.length > 100
        ).length;

        const needsEN = siteResult.alreadyPublishedEN < 1;
        const needsAR = siteResult.alreadyPublishedAR < 1;

        if (!needsEN && !needsAR) {
          console.log(`[reserve-publisher] ${siteId}: Already has ${siteResult.alreadyPublishedEN} EN + ${siteResult.alreadyPublishedAR} AR — no action needed`);
          results.push(siteResult);
          continue;
        }

        console.log(`[reserve-publisher] ${siteId}: Needs ${needsEN ? "EN" : ""}${needsEN && needsAR ? " + " : ""}${needsAR ? "AR" : ""} article(s)`);

        const newArticleUrls: string[] = [];

        // ── Strategy A: Promote from reservoir (fastest) ────────────────
        if (needsEN) {
          const enResult = await tryReservoirPublish(
            prisma, siteId, "en", SITES, getSiteDomain, promoteToBlogPost
          );
          if (enResult.success) {
            siteResult.reservePublishedEN = 1;
            if (enResult.url) newArticleUrls.push(enResult.url);
            console.log(`[reserve-publisher] ${siteId}: Published EN from reservoir → ${enResult.url}`);
          } else if (enResult.error) {
            siteResult.errors.push(`EN reservoir: ${enResult.error}`);
          }
        }

        if (needsAR && (Date.now() - siteStart < PER_SITE_BUDGET_MS)) {
          const arResult = await tryReservoirPublish(
            prisma, siteId, "ar", SITES, getSiteDomain, promoteToBlogPost
          );
          if (arResult.success) {
            siteResult.reservePublishedAR = 1;
            if (arResult.url) newArticleUrls.push(arResult.url);
            console.log(`[reserve-publisher] ${siteId}: Published AR from reservoir → ${arResult.url}`);
          } else if (arResult.error) {
            siteResult.errors.push(`AR reservoir: ${arResult.error}`);
          }
        }

        // ── Strategy B: Generate from scratch if reservoir was empty ────
        const stillNeedsEN = needsEN && siteResult.reservePublishedEN === 0;
        const stillNeedsAR = needsAR && siteResult.reservePublishedAR === 0;

        if ((stillNeedsEN || stillNeedsAR) && (Date.now() - siteStart < PER_SITE_BUDGET_MS - 30_000)) {
          try {
            const { runFullPipeline } = await import("@/lib/content-pipeline/full-pipeline-runner");
            const remainingMs = Math.min(
              PER_SITE_BUDGET_MS - (Date.now() - siteStart),
              TOTAL_BUDGET_MS - (Date.now() - cronStart),
              55_000, // Vercel function limit for full-pipeline-runner
            );

            if (stillNeedsEN && remainingMs > 30_000) {
              console.log(`[reserve-publisher] ${siteId}: No EN in reservoir — generating from scratch (${Math.round(remainingMs / 1000)}s budget)`);
              const genResult = await runFullPipeline({
                siteId,
                locale: "en",
                singleLanguage: true, // Faster — we handle AR separately
                timeoutMs: remainingMs,
              });

              if (genResult.published && genResult.blogPostUrl) {
                siteResult.generatedEN = true;
                newArticleUrls.push(genResult.blogPostUrl);
                console.log(`[reserve-publisher] ${siteId}: Generated + published EN → ${genResult.blogPostUrl}`);
              } else {
                siteResult.errors.push(`EN generate: ${genResult.stopReason} — ${genResult.message}`);
                console.warn(`[reserve-publisher] ${siteId}: EN generation failed: ${genResult.stopReason}`);
              }
            }

            // Check budget again for AR generation
            const remainingMs2 = Math.min(
              PER_SITE_BUDGET_MS - (Date.now() - siteStart),
              TOTAL_BUDGET_MS - (Date.now() - cronStart),
              55_000,
            );

            if (stillNeedsAR && remainingMs2 > 30_000) {
              console.log(`[reserve-publisher] ${siteId}: No AR in reservoir — generating from scratch (${Math.round(remainingMs2 / 1000)}s budget)`);
              const genResult = await runFullPipeline({
                siteId,
                locale: "ar",
                singleLanguage: true,
                timeoutMs: remainingMs2,
              });

              if (genResult.published && genResult.blogPostUrl) {
                siteResult.generatedAR = true;
                newArticleUrls.push(genResult.blogPostUrl);
                console.log(`[reserve-publisher] ${siteId}: Generated + published AR → ${genResult.blogPostUrl}`);
              } else {
                siteResult.errors.push(`AR generate: ${genResult.stopReason} — ${genResult.message}`);
                console.warn(`[reserve-publisher] ${siteId}: AR generation failed: ${genResult.stopReason}`);
              }
            }
          } catch (genErr) {
            const msg = genErr instanceof Error ? genErr.message : String(genErr);
            siteResult.errors.push(`Generation crashed: ${msg}`);
            console.error(`[reserve-publisher] ${siteId}: Generation crashed:`, msg);
          }
        }

        // ── Submit new articles to IndexNow immediately ─────────────────
        if (newArticleUrls.length > 0) {
          try {
            const indexResults = await submitToIndexNow(
              newArticleUrls,
              getSiteDomain(siteId),
            );
            const submitted = indexResults.filter((r) => r.success).length;
            siteResult.indexedUrls = submitted;
            console.log(`[reserve-publisher] ${siteId}: Submitted ${submitted}/${newArticleUrls.length} URLs to IndexNow`);

            // Track in URLIndexingStatus
            for (const url of newArticleUrls) {
              await prisma.uRLIndexingStatus.upsert({
                where: { site_id_url: { site_id: siteId, url } },
                create: {
                  site_id: siteId,
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
              }).catch((e: unknown) => console.warn("[reserve-publisher] URLIndexingStatus upsert failed:", e instanceof Error ? e.message : e));
            }
          } catch (indexErr) {
            console.warn("[reserve-publisher] IndexNow submission failed:", indexErr instanceof Error ? indexErr.message : indexErr);
          }
        }
      } catch (siteErr) {
        const msg = siteErr instanceof Error ? siteErr.message : String(siteErr);
        siteResult.errors.push(`Site processing crashed: ${msg}`);
        console.error(`[reserve-publisher] ${siteId}: Crashed:`, msg);
      }

      results.push(siteResult);
    }

    // ── Summary + logging ───────────────────────────────────────────────
    const totalPublished = results.reduce(
      (sum, r) => sum + r.reservePublishedEN + r.reservePublishedAR + (r.generatedEN ? 1 : 0) + (r.generatedAR ? 1 : 0),
      0,
    );
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const sitesNeeded = results.filter(
      (r) => r.alreadyPublishedEN < 1 || r.alreadyPublishedAR < 1
    ).length;

    await logCronExecution("reserve-publisher", totalErrors > 0 && totalPublished === 0 ? "failed" : "completed", {
      durationMs: Date.now() - cronStart,
      itemsProcessed: results.length, // Only count sites we actually processed (not skipped by budget)
      itemsSucceeded: totalPublished,
      itemsFailed: totalErrors,
      sitesProcessed: results.map((r) => r.siteId),
      resultSummary: { results, sitesNeeded, totalPublished, totalSites: activeSites.length },
    });

    const message = sitesNeeded === 0
      ? `All ${activeSites.length} site(s) already had their daily articles — no reserve publishing needed.`
      : `Reserve publisher activated for ${sitesNeeded} site(s): published ${totalPublished} article(s), ${totalErrors} error(s).`;

    console.log(`[reserve-publisher] ${message}`);

    return NextResponse.json({
      success: true,
      message,
      results,
      durationMs: Date.now() - cronStart,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[reserve-publisher] Fatal error:", errMsg);

    await onCronFailure({ jobName: "reserve-publisher", error });
    await logCronExecution("reserve-publisher", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    });

    return NextResponse.json(
      { success: false, error: errMsg, durationMs: Date.now() - cronStart },
      { status: 500 },
    );
  }
}

// Also support POST for dashboard trigger
export const POST = GET;

/**
 * Try to publish an article from the reservoir for a specific locale.
 */
async function tryReservoirPublish(
  prisma: any,
  siteId: string,
  targetLocale: "en" | "ar",
  SITES: Record<string, any>,
  getSiteDomain: (siteId: string) => string,
  promoteToBlogPost: Function,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Find best reservoir article matching the locale
    const candidate = await prisma.articleDraft.findFirst({
      where: {
        site_id: siteId,
        current_phase: "reservoir",
        locale: targetLocale,
        quality_score: { gte: 50 }, // Accept anything decent — this is a safety net
        assembled_html: { not: null },
      },
      orderBy: [
        { quality_score: "desc" },
        { word_count: "desc" },
      ],
    });

    if (!candidate) {
      return { success: false, error: `No ${targetLocale.toUpperCase()} reservoir articles available` };
    }

    const result = await promoteToBlogPost(
      candidate as Record<string, unknown>,
      prisma,
      SITES,
      getSiteDomain,
      { skipGate: true }, // Admin-level override — this is a safety net cron
    );

    if (result) {
      const url = `${getSiteDomain(siteId)}/blog/${result.keyword?.replace(/\s+/g, "-").toLowerCase() || result.blogPostId}`;
      // Try to get actual slug
      try {
        const bp = await prisma.blogPost.findUnique({
          where: { id: result.blogPostId },
          select: { slug: true },
        });
        if (bp?.slug) {
          return { success: true, url: `${getSiteDomain(siteId)}/blog/${bp.slug}` };
        }
      } catch (slugErr) {
        console.warn(`[reserve-publisher] Slug lookup failed for ${result.blogPostId}:`, slugErr instanceof Error ? slugErr.message : slugErr);
      }
      return { success: true, url };
    }

    return { success: false, error: "promoteToBlogPost returned null (slug collision or missing content)" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
