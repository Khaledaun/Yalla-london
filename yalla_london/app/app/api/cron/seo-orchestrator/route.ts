export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * SEO Orchestrator — Master Agent Cron Route
 *
 * Schedule:
 *   Daily:  Full orchestration (live audit + goals + agent monitor)
 *   Weekly: Full orchestration + research (SEO/AIO publications scan)
 *
 * Query params:
 *   ?mode=daily     — Standard orchestration run (default)
 *   ?mode=weekly    — Includes research agent
 *   ?mode=audit     — Live site audit only (fast)
 *   ?healthcheck=true — Quick healthcheck
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 503 }
    );
  }

  const mode = request.nextUrl.searchParams.get("mode") || "daily";

  // Healthcheck
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const lastRun = await prisma.seoReport
        .findFirst({
          where: { reportType: "orchestrator" },
          orderBy: { generatedAt: "desc" },
          select: { generatedAt: true, data: true },
        })
        .catch(() => null);

      return NextResponse.json({
        status: "healthy",
        endpoint: "seo-orchestrator",
        lastRun: lastRun
          ? {
              at: lastRun.generatedAt,
              healthScore: (lastRun.data as any)?.healthScore,
              status: (lastRun.data as any)?.status,
            }
          : null,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "seo-orchestrator" },
        { status: 503 }
      );
    }
  }

  const cronStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");
    const { runOrchestrator } = await import("@/lib/seo/orchestrator");

    // Only orchestrate live sites
    const siteIds = getActiveSiteIds();
    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    for (const siteId of siteIds) {
      // Timeout guard: leave 7s for response serialization
      if (Date.now() - cronStart > 53000) {
        results[siteId] = { skipped: true, reason: "timeout" };
        continue;
      }

      try {
        const siteUrl = getSiteDomain(siteId);
        const report = await runOrchestrator(prisma, siteId, siteUrl || getSiteDomain(siteId), {
          includeResearch: mode === "weekly",
          maxDurationMs: Math.min(45000, 53000 - (Date.now() - cronStart)),
        });

        results[siteId] = {
          healthScore: report.healthScore,
          status: report.status,
          criticalIssues: report.criticalIssues.length,
          prioritizedActions: report.prioritizedActions.length,
          agentDirectives: report.agentDirectives.length,
          durationMs: report.durationMs,
        };
      } catch (e) {
        errors[siteId] = (e as Error).message;
      }
    }

    await logCronExecution(
      "seo-orchestrator",
      Object.keys(errors).length > 0 ? "completed" : "completed",
      {
        durationMs: Date.now() - cronStart,
        sitesProcessed: Object.keys(results),
        resultSummary: {
          mode,
          sites: Object.keys(results).length,
          errors: Object.keys(errors).length,
        },
      }
    );

    return NextResponse.json({
      success: true,
      agent: "seo-orchestrator-v1",
      mode,
      runAt: new Date().toISOString(),
      durationMs: Date.now() - cronStart,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("SEO Orchestrator error:", error);
    await logCronExecution("seo-orchestrator", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "seo-orchestrator", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
