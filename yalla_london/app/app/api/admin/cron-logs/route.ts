export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * GET /api/admin/cron-logs
 * Returns paginated cron job execution history with filtering.
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 50, max: 200)
 *   - status (filter: completed, failed, timed_out, running)
 *   - job (filter by job_name)
 *   - hours (time window, default: 168 = 7 days)
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const statusFilter = url.searchParams.get("status");
  const jobFilter = url.searchParams.get("job");
  const hours = parseInt(url.searchParams.get("hours") ?? "168", 10); // 7 days default

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const skip = (page - 1) * limit;

  try {
    const { prisma } = await import("@/lib/db");

    const where: Record<string, unknown> = {
      started_at: { gte: since },
    };
    if (statusFilter) {
      where.status = statusFilter;
    }
    if (jobFilter) {
      where.job_name = jobFilter;
    }

    const [logs, total, jobNames] = await Promise.all([
      (prisma as any).cronJobLog.findMany({
        where,
        orderBy: { started_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          job_name: true,
          job_type: true,
          status: true,
          started_at: true,
          completed_at: true,
          duration_ms: true,
          items_processed: true,
          items_succeeded: true,
          items_failed: true,
          error_message: true,
          sites_processed: true,
          sites_skipped: true,
          timed_out: true,
          result_summary: true,
          site_id: true,
        },
      }),
      (prisma as any).cronJobLog.count({ where }),
      (prisma as any).cronJobLog.findMany({
        where: { started_at: { gte: since } },
        distinct: ["job_name"],
        select: { job_name: true },
        orderBy: { job_name: "asc" },
      }),
    ]);

    // Compute summary stats
    const allInWindow = await (prisma as any).cronJobLog.groupBy({
      by: ["status"],
      where: { started_at: { gte: since } },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    for (const row of allInWindow) {
      statusCounts[row.status] = row._count;
    }

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        id: log.id,
        jobName: log.job_name,
        jobType: log.job_type,
        status: log.status,
        startedAt: log.started_at?.toISOString(),
        completedAt: log.completed_at?.toISOString(),
        durationMs: log.duration_ms,
        itemsProcessed: log.items_processed ?? 0,
        itemsSucceeded: log.items_succeeded ?? 0,
        itemsFailed: log.items_failed ?? 0,
        errorMessage: log.error_message,
        sitesProcessed: log.sites_processed ?? [],
        sitesSkipped: log.sites_skipped ?? [],
        timedOut: log.timed_out ?? false,
        resultSummary: log.result_summary,
        siteId: log.site_id,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        availableJobs: jobNames.map((j: any) => j.job_name),
        timeRange: `${hours}h`,
        since: since.toISOString(),
      },
      summary: {
        total: Object.values(statusCounts).reduce((a: number, b: number) => a + b, 0),
        completed: statusCounts.completed ?? 0,
        failed: statusCounts.failed ?? 0,
        timedOut: statusCounts.timed_out ?? 0,
        running: statusCounts.running ?? 0,
        partial: statusCounts.partial ?? 0,
      },
    });
  } catch (err) {
    console.error("Cron logs API error:", err);
    return NextResponse.json(
      {
        logs: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
        error: err instanceof Error ? err.message : "Failed to fetch cron logs",
      },
      { status: 500 },
    );
  }
});
