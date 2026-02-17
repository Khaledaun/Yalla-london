export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
      return NextResponse.json(
        { status: "unhealthy", endpoint: "content-builder", note: "ArticleDraft table may not exist yet. Run DB migration." },
        { status: 503 },
      );
    }
  }

  try {
    // Run the builder
    const { runContentBuilder } = await import("@/lib/content-pipeline/build-runner");
    const result = await runContentBuilder({ timeoutMs: 53_000 });

    const durationMs = Date.now() - cronStart;

    const resultAny = result as unknown as Record<string, unknown>;

    // Fire failure hook if the builder returned a failure
    if (!result.success && result.message) {
      const { onCronFailure } = await import("@/lib/ops/failure-hooks");
      onCronFailure({ jobName: "content-builder", error: result.message }).catch(() => {});

      await logCronExecution("content-builder", "failed", {
        durationMs,
        errorMessage: result.message,
        resultSummary: { phase: resultAny.phase, draftsProcessed: resultAny.draftsProcessed },
      });
    } else {
      await logCronExecution("content-builder", "completed", {
        durationMs,
        itemsProcessed: (resultAny.draftsProcessed as number) || 0,
        itemsSucceeded: (resultAny.draftsProcessed as number) || 0,
        resultSummary: { message: result.message, phase: resultAny.phase },
      });
    }

    return NextResponse.json(
      { ...result, timestamp: new Date().toISOString() },
      { status: result.success ? 200 : 500 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - cronStart;

    await logCronExecution("content-builder", "failed", {
      durationMs,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "content-builder", error: errMsg }).catch(() => {});

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
