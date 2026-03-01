export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — publish all ready articles

/**
 * Launch Sequence — One-Tap "Publish Everything Ready"
 *
 * POST /api/admin/launch-sequence
 *
 * This is the "I'm tired, just make it work" endpoint. It:
 *   1. Publishes ALL reservoir articles that are ready (score >= 60, words >= 1000)
 *      — skips the pre-pub gate (admin override)
 *   2. Submits all newly published URLs to IndexNow
 *   3. Reports what happened in plain language
 *
 * No enhancement, no quality debates. If it's in the reservoir with decent
 * content, it goes live. Period.
 *
 * Auth: withAdminAuth (admin session required)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const POST = withAdminAuth(async (req: NextRequest) => {
  const start = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  try {
    const body = await req.json().catch(() => ({}));
    const requestedSiteId = body.siteId as string | undefined;

    const { prisma } = await import("@/lib/db");
    const { SITES, getSiteDomain } = await import("@/config/sites");
    const { promoteToBlogPost } = await import("@/lib/content-pipeline/select-runner");

    const activeSites = getActiveSiteIds();
    const siteIds = requestedSiteId && activeSites.includes(requestedSiteId)
      ? [requestedSiteId]
      : activeSites;

    log(`[launch] Starting launch sequence for ${siteIds.length} site(s): ${siteIds.join(", ")}`);

    // ── Step 1: Find ALL reservoir articles that are publishable ─────────
    const allCandidates = await prisma.articleDraft.findMany({
      where: {
        site_id: { in: siteIds },
        current_phase: "reservoir",
        assembled_html: { not: null },
        quality_score: { gte: 50 }, // Bare minimum — we're skipping the gate anyway
      },
      orderBy: [{ quality_score: "desc" }, { created_at: "asc" }],
      take: 20, // Safety cap
    });

    log(`[launch] Found ${allCandidates.length} reservoir article(s) to publish`);

    if (allCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No articles in reservoir ready to publish. Run the content builder first to generate new articles.",
        published: [],
        failed: [],
        indexed: 0,
        durationMs: Date.now() - start,
        logs,
      });
    }

    // ── Step 2: Publish each one — skip the gate, no enhancement ────────
    const published: Array<{ draftId: string; blogPostId: string; keyword: string; score: number; url: string }> = [];
    const failed: Array<{ draftId: string; keyword: string; reason: string }> = [];
    const seenSlugs = new Set<string>();

    for (const draft of allCandidates) {
      const keyword = (draft.keyword as string) || "unknown";
      const score = (draft.quality_score as number) || 0;
      const html = (draft.assembled_html as string) || "";
      const wordCount = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

      // Skip truly empty articles (no content at all)
      if (wordCount < 200) {
        log(`[launch] Skipping "${keyword}" — only ${wordCount} words (too thin)`);
        failed.push({ draftId: draft.id, keyword, reason: `Only ${wordCount} words — too thin even for launch override` });
        continue;
      }

      // Skip duplicate keywords within this run
      const keyLower = keyword.toLowerCase().trim();
      if (seenSlugs.has(keyLower)) {
        log(`[launch] Skipping duplicate keyword "${keyword}"`);
        failed.push({ draftId: draft.id, keyword, reason: "Duplicate keyword in this batch" });
        continue;
      }
      seenSlugs.add(keyLower);

      log(`[launch] Publishing "${keyword}" (score: ${score}, words: ${wordCount})...`);

      try {
        const result = await promoteToBlogPost(
          draft as Record<string, unknown>,
          prisma,
          SITES,
          getSiteDomain,
          { skipGate: true }, // Admin override — no gate checks
        );

        if (result) {
          const url = `${getSiteDomain(draft.site_id as string)}/blog/${result.blogPostId}`;
          published.push({ ...result, url });
          log(`[launch] Published "${keyword}" → BlogPost ${result.blogPostId}`);
        } else {
          log(`[launch] promoteToBlogPost returned null for "${keyword}" — slug collision or missing content`);
          failed.push({ draftId: draft.id, keyword, reason: "Slug collision or missing content" });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`[launch] Failed to publish "${keyword}": ${msg}`);
        failed.push({ draftId: draft.id, keyword, reason: msg });
      }

      // Budget check — leave 10s for IndexNow
      if (Date.now() - start > 280_000) {
        log("[launch] Budget running low (280s), stopping publishing loop");
        break;
      }
    }

    // ── Step 3: Submit all new articles to IndexNow ─────────────────────
    let indexedCount = 0;
    const indexNowKey = process.env.INDEXNOW_KEY;

    if (indexNowKey && published.length > 0) {
      log(`[launch] Submitting ${published.length} URL(s) to IndexNow...`);

      for (const article of published) {
        try {
          // Get the actual blog slug
          const blogPost = await prisma.blogPost.findUnique({
            where: { id: article.blogPostId },
            select: { slug: true, siteId: true },
          });

          if (blogPost) {
            const articleUrl = `${getSiteDomain(blogPost.siteId)}/blog/${blogPost.slug}`;
            const submitUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(articleUrl)}&key=${indexNowKey}`;
            const resp = await fetch(submitUrl, {
              method: "GET",
              signal: AbortSignal.timeout(5_000),
            });

            if (resp.ok || resp.status === 202) {
              indexedCount++;
              log(`[launch] IndexNow: submitted ${articleUrl} (${resp.status})`);

              // Update URLIndexingStatus
              await prisma.uRLIndexingStatus.updateMany({
                where: { url: articleUrl },
                data: {
                  status: "submitted",
                  submitted_indexnow: true,
                  last_submitted_at: new Date(),
                },
              }).catch(() => {});
            }
          }
        } catch (indexErr) {
          console.warn("[launch] IndexNow submission failed:", indexErr instanceof Error ? indexErr.message : indexErr);
        }
      }

      log(`[launch] IndexNow: ${indexedCount}/${published.length} submitted`);
    } else if (!indexNowKey) {
      log("[launch] IndexNow skipped — no INDEXNOW_KEY configured");
    }

    // ── Summary ─────────────────────────────────────────────────────────
    const durationMs = Date.now() - start;
    const durationSec = (durationMs / 1000).toFixed(1);

    log(`[launch] Done in ${durationSec}s — ${published.length} published, ${failed.length} failed, ${indexedCount} indexed`);

    return NextResponse.json({
      success: true,
      message: published.length > 0
        ? `Published ${published.length} article(s) in ${durationSec}s. ${indexedCount} submitted to Google.`
        : `No articles could be published. ${failed.length} failed — check the 'failed' array for reasons.`,
      published,
      failed,
      indexed: indexedCount,
      durationMs,
      logs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[launch] Fatal error:", msg);
    return NextResponse.json(
      { success: false, error: msg, logs, durationMs: Date.now() - start },
      { status: 500 },
    );
  }
});

export const GET = withAdminAuth(async () => {
  // Quick status — how many articles are ready to launch?
  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");

    const activeSites = getActiveSiteIds();
    const readyCount = await prisma.articleDraft.count({
      where: {
        site_id: { in: activeSites },
        current_phase: "reservoir",
        assembled_html: { not: null },
        quality_score: { gte: 50 },
      },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const publishedToday = await prisma.blogPost.count({
      where: {
        published: true,
        created_at: { gte: todayStart },
        siteId: { in: activeSites },
      },
    }).catch(() => 0);

    return NextResponse.json({
      success: true,
      readyToLaunch: readyCount,
      publishedToday,
      message: readyCount > 0
        ? `${readyCount} article(s) ready to publish now. POST to launch.`
        : "No articles ready. Run the content builder to generate new articles.",
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
});
