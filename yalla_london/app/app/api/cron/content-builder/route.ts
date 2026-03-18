export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro supports up to 300s per route

/**
 * Content Builder — Incremental Phase Processor
 *
 * Thin cron route wrapper. Core logic lives in @/lib/content-pipeline/build-runner.
 *
 * Runs every 15 minutes. Each invocation:
 * 1. Finds the oldest in-progress ArticleDraft and advances it one phase
 * 2. If no in-progress drafts, creates TWO new ones (EN + AR) from TopicProposal queue
 * 3. Each phase completes within 53s budget (7s safety buffer)
 *
 * Pipeline: research → outline → drafting → assembly → images → seo → scoring → reservoir
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

async function handleContentBuilder(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_CONTENT_BUILDER=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("content-builder");
  if (flagResponse) return flagResponse;

  // ── Pipeline Circuit Breaker (Fix 6) ──
  // If content-builder success rate drops below 30% over the last 4 hours,
  // auto-pause to prevent wasting AI budget on a broken pipeline.
  try {
    const { prisma: _p } = await import("@/lib/db");
    const { ESCALATION_POLICY } = await import("@/lib/content-pipeline/constants");
    const windowStart = new Date(Date.now() - ESCALATION_POLICY.PIPELINE_HEALTH_WINDOW_HOURS * 3600_000);
    const recentRuns = await _p.cronJobLog.findMany({
      where: {
        job_name: "content-builder",
        started_at: { gte: windowStart },
        status: { not: "skipped" },
        result_summary: { not: { equals: {} } }, // Exclude empty markers
      },
      select: { status: true },
      take: 20,
    });

    if (recentRuns.length >= 5) {
      const successCount = recentRuns.filter(r => r.status === "completed").length;
      const successRate = successCount / recentRuns.length;
      if (successRate < ESCALATION_POLICY.PIPELINE_MIN_SUCCESS_RATE) {
        console.warn(
          `[content-builder] Pipeline auto-paused — success rate ${(successRate * 100).toFixed(0)}% ` +
          `(${successCount}/${recentRuns.length}) over last ${ESCALATION_POLICY.PIPELINE_HEALTH_WINDOW_HOURS}h ` +
          `is below ${(ESCALATION_POLICY.PIPELINE_MIN_SUCCESS_RATE * 100).toFixed(0)}% threshold`
        );
        // Send single CEO alert about the pause
        import("@/lib/ops/ceo-inbox").then(m =>
          m.handleCronFailureNotice("content-builder", `Pipeline auto-paused: ${(successRate * 100).toFixed(0)}% success rate`)
        ).catch(err => console.warn("[content-builder] CEO alert failed:", err instanceof Error ? err.message : err));

        return NextResponse.json({
          status: "auto-paused",
          reason: `Success rate ${(successRate * 100).toFixed(0)}% < ${(ESCALATION_POLICY.PIPELINE_MIN_SUCCESS_RATE * 100).toFixed(0)}% threshold`,
          successRate,
          window: `${ESCALATION_POLICY.PIPELINE_HEALTH_WINDOW_HOURS}h`,
          runs: recentRuns.length,
        });
      }
    }
  } catch (cbErr) {
    console.warn("[content-builder] Circuit breaker check failed (non-fatal):", cbErr instanceof Error ? cbErr.message : cbErr);
  }

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const counts = await prisma.$queryRawUnsafe(
        `SELECT current_phase, COUNT(*) as count FROM article_drafts GROUP BY current_phase`,
      ).catch(() => []) as Array<{ current_phase: string; count: bigint }>;
      const phaseCounts: Record<string, number> = {};
      for (const row of counts) {
        phaseCounts[row.current_phase] = Number(row.count);
      }
      return NextResponse.json({
        status: "healthy",
        endpoint: "content-builder",
        phaseCounts,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Return 200 degraded, not 503 — DB pool exhaustion during concurrent health checks
      // should not appear as a hard failure. Cron runs on schedule regardless.
      return NextResponse.json(
        { status: "degraded", endpoint: "content-builder", note: "DB temporarily unavailable for healthcheck — cron runs on schedule." },
        { status: 200 },
      );
    }
  }

  // Hoisted so we can update the marker on completion/failure
  let dedupMarkerId: string | null = null;
  const { prisma } = await import("@/lib/db");

  // Helper to close the dedup marker so diagnostic-agent doesn't falsely flag it
  const closeDedupMarker = async (status: "completed" | "failed", summary: Record<string, unknown>) => {
    if (!dedupMarkerId) return;
    await prisma.cronJobLog.update({
      where: { id: dedupMarkerId },
      data: { status, completed_at: new Date(), result_summary: { dedup_marker: true, ...summary } },
    }).catch(err => console.warn("[content-builder] Failed to close dedup marker:", err instanceof Error ? err.message : err));
  };

  try {
    // Dedup guard: skip if another content-builder started within the last 90 seconds.
    try {
      const recentRun = await prisma.cronJobLog.findFirst({
        where: { job_name: "content-builder", status: { not: "skipped" }, started_at: { gte: new Date(Date.now() - 60_000) } },
        orderBy: { started_at: "desc" },
      });
      if (recentRun) {
        return NextResponse.json({ skipped: true, reason: "dedup", message: "Another content-builder ran within the last 60s", lastRunAt: recentRun.started_at });
      }

      // Write "started" marker IMMEDIATELY so a concurrent invocation sees it.
      const dedupMarker = await prisma.cronJobLog.create({
        data: {
          job_name: "content-builder",
          job_type: "scheduled",
          status: "running",
          started_at: new Date(),
          duration_ms: 0,
          items_processed: 0,
          items_succeeded: 0,
          items_failed: 0,
          result_summary: { phase: "started", dedup_marker: true },
        },
      });
      dedupMarkerId = dedupMarker.id;

      // ACT-THEN-CHECK: if 2+ markers exist, this is the duplicate — abort.
      const markerCount = await prisma.cronJobLog.count({
        where: {
          job_name: "content-builder",
          status: "running",
          started_at: { gte: new Date(Date.now() - 60_000) },
        },
      });
      if (markerCount > 1) {
        await prisma.cronJobLog.update({
          where: { id: dedupMarker.id },
          data: {
            status: "skipped",
            completed_at: new Date(),
            error_message: "Dedup race — another invocation is already processing",
            result_summary: { phase: "skipped", dedup_marker: true, reason: "dedup-race" },
          },
        }).catch(err => console.warn("[content-builder] Failed to clean up dedup marker:", err instanceof Error ? err.message : err));
        dedupMarkerId = null; // Already cleaned up
        return NextResponse.json({ skipped: true, reason: "dedup-race", message: `${markerCount} concurrent content-builders detected — this one yielding` });
      }
    } catch (dedupErr) {
      console.warn("[content-builder] Dedup check failed (non-fatal):", dedupErr instanceof Error ? dedupErr.message : dedupErr);
    }

    // Run the builder
    const { runContentBuilder } = await import("@/lib/content-pipeline/build-runner");
    const result = await runContentBuilder({ timeoutMs: 280_000 });

    const durationMs = Date.now() - cronStart;

    // Close the dedup marker so diagnostic-agent doesn't falsely flag it as stuck
    await closeDedupMarker(
      result.success ? "completed" : "failed",
      { phase: result.previousPhase, nextPhase: result.nextPhase, keyword: result.keyword },
    );

    // Fire failure hook if the builder returned a failure
    if (!result.success && result.message) {
      const { onCronFailure } = await import("@/lib/ops/failure-hooks");
      onCronFailure({ jobName: "content-builder", error: result.message }).catch(err => console.warn("[content-builder] onCronFailure hook failed:", err instanceof Error ? err.message : err));

      await logCronExecution("content-builder", "failed", {
        durationMs,
        errorMessage: result.message,
        resultSummary: { phase: result.previousPhase, draftId: result.draftId, keyword: result.keyword },
      }).catch((logErr: unknown) => {
        console.warn("[content-builder] logCronExecution (failed) error:", logErr instanceof Error ? logErr.message : logErr);
      });
    } else {
      const didProcessDraft = result.draftId ? 1 : 0;
      // Count success if phase advanced OR if still in multi-section drafting (sections progressed)
      const didAdvance = (result.previousPhase && result.nextPhase && result.previousPhase !== result.nextPhase) ? 1
        : (result.phaseSuccess && didProcessDraft) ? 1 : 0;

      await logCronExecution("content-builder", "completed", {
        durationMs,
        itemsProcessed: didProcessDraft,
        itemsSucceeded: didAdvance,
        resultSummary: {
          message: result.message,
          phase: result.previousPhase,
          nextPhase: result.nextPhase,
          draftId: result.draftId,
          keyword: result.keyword,
          success: result.phaseSuccess,
        },
      }).catch((logErr: unknown) => {
        console.warn("[content-builder] logCronExecution (completed) error:", logErr instanceof Error ? logErr.message : logErr);
      });
    }

    return NextResponse.json(
      { ...result, timestamp: new Date().toISOString() },
      { status: result.success ? 200 : 500 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - cronStart;

    // Close the dedup marker so diagnostic-agent doesn't double-count
    await closeDedupMarker("failed", { error: errMsg });

    await logCronExecution("content-builder", "failed", {
      durationMs,
      errorMessage: errMsg,
    }).catch((logErr: unknown) => {
      console.warn("[content-builder] logCronExecution (catch) error:", logErr instanceof Error ? logErr.message : logErr);
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "content-builder", error: errMsg }).catch(err => console.warn("[content-builder] onCronFailure hook failed:", err instanceof Error ? err.message : err));

    return NextResponse.json(
      { success: false, error: errMsg, timestamp: new Date().toISOString() },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleContentBuilder(request);
}

export async function POST(request: NextRequest) {
  return handleContentBuilder(request);
}
