/**
 * GET /api/admin/chrome-bridge/action-logs?hours=24&siteId=X
 * Unified view: CronJobLog + AuditLog + AutoFixLog + ApiUsageLog
 * for the last N hours, clustered by category for triage.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const hours = Math.min(
      parseInt(request.nextUrl.searchParams.get("hours") || "24", 10),
      168,
    );
    const siteId = request.nextUrl.searchParams.get("siteId") ?? undefined;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const cronWhere: Record<string, unknown> = { started_at: { gte: since } };
    if (siteId) cronWhere.site_id = siteId;

    const autoFixWhere: Record<string, unknown> = { createdAt: { gte: since } };
    if (siteId) autoFixWhere.siteId = siteId;

    const apiUsageWhere: Record<string, unknown> = { createdAt: { gte: since } };
    if (siteId) apiUsageWhere.siteId = siteId;

    const [cronLogs, cronSummary, auditLogs, autoFixes, apiUsage] = await Promise.all([
      prisma.cronJobLog.findMany({
        where: cronWhere,
        orderBy: { started_at: "desc" },
        take: 200,
        select: {
          id: true,
          site_id: true,
          job_name: true,
          job_type: true,
          status: true,
          started_at: true,
          duration_ms: true,
          items_processed: true,
          items_succeeded: true,
          items_failed: true,
          error_message: true,
        },
      }),
      prisma.cronJobLog.groupBy({
        by: ["job_name", "status"],
        where: cronWhere,
        _count: { _all: true },
      }),
      prisma.auditLog.findMany({
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: "desc" },
        take: 100,
        select: {
          id: true,
          action: true,
          resource: true,
          success: true,
          errorMessage: true,
          timestamp: true,
        },
      }),
      prisma.autoFixLog.findMany({
        where: autoFixWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          siteId: true,
          targetType: true,
          fixType: true,
          agent: true,
          success: true,
          error: true,
          createdAt: true,
        },
      }),
      prisma.apiUsageLog.groupBy({
        by: ["provider", "success"],
        where: apiUsageWhere,
        _count: { _all: true },
        _sum: { totalTokens: true, estimatedCostUsd: true },
      }),
    ]);

    const failedCrons = cronLogs.filter((c) => c.status === "failed");
    const failureByJob: Record<string, number> = {};
    for (const c of failedCrons) {
      failureByJob[c.job_name] = (failureByJob[c.job_name] ?? 0) + 1;
    }

    return NextResponse.json({
      success: true,
      windowHours: hours,
      siteId: siteId ?? "all",
      generatedAt: new Date().toISOString(),
      summary: {
        totalCronRuns: cronLogs.length,
        failedCronRuns: failedCrons.length,
        failuresByJob: failureByJob,
        autoFixesAttempted: autoFixes.length,
        autoFixesSucceeded: autoFixes.filter((a) => a.success).length,
        aiCalls: apiUsage.reduce((s, r) => s + r._count._all, 0),
        aiCostUsd: apiUsage.reduce(
          (s, r) => s + (r._sum.estimatedCostUsd ?? 0),
          0,
        ),
      },
      cronLogs,
      cronSummary,
      auditLogs,
      autoFixes,
      apiUsageByProvider: apiUsage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/action-logs]", message);
    return NextResponse.json(
      { error: "Failed to load action logs" },
      { status: 500 },
    );
  }
}
