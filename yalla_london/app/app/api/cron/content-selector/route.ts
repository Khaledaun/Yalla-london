export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — needs budget for publish + 2 enhancements

/**
 * Content Selector — Reservoir-to-BlogPost Publisher
 *
 * Thin cron route wrapper. Core logic lives in @/lib/content-pipeline/select-runner.
 *
 * Runs daily at 08:30 UTC. Selects highest-quality articles from the
 * ArticleDraft reservoir and promotes them to published BlogPosts.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

async function handleContentSelector(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_CONTENT_SELECTOR=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("content-selector");
  if (flagResponse) return flagResponse;

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const { getActiveSiteIds } = await import("@/config/sites");
      const activeSites = getActiveSiteIds();
      const siteFilter = activeSites.length > 0 ? { site_id: { in: activeSites } } : {};
      const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
      const reservoirCount = await prisma.articleDraft.count({
        where: { current_phase: "reservoir", ...siteFilter },
      }).catch(() => 0);
      const publishedCount = await prisma.articleDraft.count({
        where: { current_phase: "published", ...siteFilter },
      }).catch(() => 0);
      return NextResponse.json({
        status: "healthy",
        endpoint: "content-selector",
        reservoirCount,
        publishedCount,
        minQualityScore: CONTENT_QUALITY.reservoirMinScore,
        qualityGateScore: CONTENT_QUALITY.qualityGateScore,
        maxPerRun: 2,
        timestamp: new Date().toISOString(),
      });
    } catch (hcErr) {
      console.warn("[content-selector] Healthcheck failed:", hcErr instanceof Error ? hcErr.message : hcErr);
      return NextResponse.json(
        { status: "unhealthy", endpoint: "content-selector", note: "ArticleDraft table may not exist yet." },
        { status: 503 },
      );
    }
  }

  try {
    // Eagerly connect to DB — prevents "Engine is not yet connected" on Vercel
    // cold starts when Supabase pooler is under load (same pattern as cockpit route).
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.$connect();
    } catch {
      // $connect may fail if already connected (safe to ignore)
    }

    // Run the selector
    const { runContentSelector } = await import("@/lib/content-pipeline/select-runner");
    const result = await runContentSelector({ timeoutMs: 280_000 }); // 280s (300s max - 20s buffer)

    // Fire failure hook if the selector returned a failure.
    // Note: runContentSelector already logs to CronJobLog internally with accurate
    // per-article counts. We only log here on failure (for the failure hook) to avoid
    // double-logging the success path.
    if (!result.success && result.message) {
      const { onCronFailure } = await import("@/lib/ops/failure-hooks");
      onCronFailure({ jobName: "content-selector", error: result.message }).catch((e) =>
        console.warn("[content-selector] Failure hook error:", e instanceof Error ? e.message : e));
    }

    return NextResponse.json(
      { ...result, timestamp: new Date().toISOString() },
      { status: result.success ? 200 : 500 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - cronStart;

    // CRITICAL: Revert any drafts stuck in "promoting" phase from this crashed run.
    // Without this, crashed runs leave drafts orphaned in "promoting" forever.
    try {
      const { prisma } = await import("@/lib/db");
      const reverted = await prisma.articleDraft.updateMany({
        where: { current_phase: "promoting" },
        data: {
          current_phase: "reservoir",
          last_error: `Crash revert: ${errMsg.slice(0, 200)}`,
          updated_at: new Date(),
        },
      });
      if (reverted.count > 0) {
        console.log(`[content-selector] Crash recovery: reverted ${reverted.count} "promoting" draft(s) to reservoir`);
      }
    } catch (revertErr) {
      console.warn("[content-selector] Crash revert failed:", revertErr instanceof Error ? revertErr.message : String(revertErr));
    }

    await logCronExecution("content-selector", "failed", {
      durationMs,
      errorMessage: errMsg,
    }).catch((e) => console.warn("[content-selector] Log failed:", e instanceof Error ? e.message : e));

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "content-selector", error: errMsg }).catch((e) =>
      console.warn("[content-selector] Failure hook error:", e instanceof Error ? e.message : e));

    return NextResponse.json(
      { success: false, error: errMsg, timestamp: new Date().toISOString() },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleContentSelector(request);
}

export async function POST(request: NextRequest) {
  return handleContentSelector(request);
}
