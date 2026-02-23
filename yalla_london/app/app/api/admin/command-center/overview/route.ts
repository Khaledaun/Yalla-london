export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Unified Command Center API — One endpoint for all dashboard data.
 *
 * Returns: pipeline stages with health indicators, alerts, cron status,
 * per-site metrics, indexing data, and recent activity.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

type Health = "green" | "yellow" | "red" | "gray";

function health(good: boolean, degraded: boolean): Health {
  if (good) return "green";
  if (degraded) return "yellow";
  return "red";
}

export const GET = withAdminAuth(async (_request: NextRequest) => {
  try {
  const { prisma } = await import("@/lib/db");
  const { getActiveSiteIds } = await import("@/config/sites");

  const siteIds = getActiveSiteIds();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Helper: safely run a Prisma query, returning fallback on table/connection errors
  async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try { return await fn(); } catch (e) {
      console.warn("[command-center] Query failed:", e instanceof Error ? e.message : e);
      return fallback;
    }
  }

  // ── Parallel queries (each individually safe) ──
  const [
    topicsByStatus,
    draftsByPhase,
    reservoirCount,
    publishedTotal,
    publishedToday,
    indexingAgg,
    recentIndexing,
    cronLogs24h,
    cronLatestPerJob,
    siteArticleCounts,
    siteTopicCounts,
    siteDraftCounts,
    siteIndexCounts,
  ] = await Promise.all([
    safeQuery(() => prisma.topicProposal.groupBy({
      by: ["status"],
      _count: { id: true },
    }), []),
    safeQuery(() => prisma.articleDraft.groupBy({
      by: ["current_phase"],
      where: { current_phase: { notIn: ["published", "rejected", "failed"] } },
      _count: { id: true },
    }), []),
    safeQuery(() => prisma.articleDraft.count({ where: { current_phase: "reservoir" } }), 0),
    safeQuery(() => prisma.blogPost.count({ where: { published: true } }), 0),
    safeQuery(() => prisma.blogPost.count({
      where: { published: true, updated_at: { gte: yesterday } },
    }), 0),
    safeQuery(() => prisma.uRLIndexingStatus.groupBy({
      by: ["status"],
      _count: { id: true },
    }), []),
    safeQuery(() => prisma.uRLIndexingStatus.findMany({
      orderBy: { last_submitted_at: "desc" },
      take: 15,
      select: {
        url: true,
        status: true,
        last_submitted_at: true,
        last_crawled_at: true,
        last_error: true,
        site_id: true,
        indexing_state: true,
        coverage_state: true,
      },
    }), []),
    safeQuery(() => prisma.cronJobLog.findMany({
      where: { started_at: { gte: yesterday } },
      orderBy: { started_at: "desc" },
      take: 200,
    }), []),
    safeQuery(() => prisma.cronJobLog.findMany({
      orderBy: { started_at: "desc" },
      distinct: ["job_name"],
      take: 30,
    }), []),
    safeQuery(() => prisma.blogPost.groupBy({ by: ["siteId"], where: { published: true }, _count: { id: true } }), []),
    safeQuery(() => prisma.topicProposal.groupBy({ by: ["site_id"], _count: { id: true } }), []),
    safeQuery(() => prisma.articleDraft.groupBy({
      by: ["site_id"],
      where: { current_phase: { notIn: ["published", "rejected", "failed"] } },
      _count: { id: true },
    }), []),
    safeQuery(() => prisma.uRLIndexingStatus.groupBy({ by: ["site_id"], where: { status: "indexed" }, _count: { id: true } }), []),
  ]);

  // ── Pipeline stages ──
  const topicTotal = topicsByStatus.reduce((s, g) => s + g._count.id, 0);
  const topicStatusMap: Record<string, number> = {};
  topicsByStatus.forEach((g) => { topicStatusMap[g.status] = g._count.id; });

  const draftTotal = draftsByPhase.reduce((s, g) => s + g._count.id, 0);
  const draftPhaseMap: Record<string, number> = {};
  draftsByPhase.forEach((g) => { draftPhaseMap[g.current_phase] = g._count.id; });

  const indexMap: Record<string, number> = {};
  indexingAgg.forEach((g) => { indexMap[g.status] = g._count.id; });
  const indexTotal = indexingAgg.reduce((s, g) => s + g._count.id, 0);
  const indexedCount = indexMap["indexed"] || 0;
  const submittedCount = indexMap["submitted"] || 0;
  const discoveredCount = indexMap["discovered"] || 0;
  const errorCount = indexMap["error"] || 0;
  const indexRate = indexTotal > 0 ? Math.round((indexedCount / indexTotal) * 100) : 0;

  const pipeline = {
    topics: {
      total: topicTotal,
      byStatus: topicStatusMap,
      health: health(topicTotal > 0, topicTotal === 0) as Health,
    },
    drafts: {
      total: draftTotal,
      byPhase: draftPhaseMap,
      phases: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring", "reservoir"],
      health: health(draftTotal > 0, draftTotal === 0) as Health,
    },
    reservoir: {
      total: reservoirCount,
      health: health(reservoirCount > 0, reservoirCount === 0) as Health,
    },
    published: {
      total: publishedTotal,
      today: publishedToday,
      health: health(publishedTotal > 0, publishedToday === 0) as Health,
    },
    indexed: {
      total: indexedCount,
      submitted: submittedCount,
      discovered: discoveredCount,
      errors: errorCount,
      indexRate,
      health: health(indexRate >= 50, indexRate > 0 && indexRate < 50) as Health,
    },
  };

  // ── Alerts — ALL failed/timed-out cron logs, no fix-guide filter ──
  const failedLogs = cronLogs24h.filter(
    (log) => log.status === "failed" || log.status === "timeout" || log.timed_out
  );
  const alerts = failedLogs.map((log) => ({
    id: log.id,
    severity: (log.timed_out ? "warning" : "critical") as "critical" | "warning" | "info",
    jobName: log.job_name,
    error: log.error_message || "Unknown error (no message captured)",
    errorStack: log.error_stack?.substring(0, 500) || null,
    timestamp: log.started_at.toISOString(),
    duration: log.duration_ms,
    itemsProcessed: log.items_processed,
    itemsFailed: log.items_failed,
    sites: log.sites_processed,
  }));

  // ── Cron job status ──
  const CRON_SCHEDULE: Record<string, string> = {
    "weekly-topics": "Mon 4:00 UTC",
    "daily-content-generate": "Daily 5:00 UTC",
    "content-builder": "Every 15 min",
    "content-selector": "Daily 8:30 UTC",
    "scheduled-publish": "Daily 9:00/16:00 UTC",
    "affiliate-injection": "Daily 9:00 UTC",
    "google-indexing": "Daily 6:00 UTC",
    "seo-agent": "3x daily 7/13/20 UTC",
    "seo-orchestrator": "Daily 6:00 UTC",
    "trends-monitor": "Daily 6:00 UTC",
    "site-health-check": "Daily 22:00 UTC",
    "verify-indexing": "Daily",
    "analytics": "Daily 3:00 UTC",
    "sweeper": "Every 30 min",
    "fact-verification": "Daily",
    "autopilot": "Continuous",
  };

  const crons = cronLatestPerJob.map((log) => {
    const failures24h = cronLogs24h.filter(
      (l) => l.job_name === log.job_name && (l.status === "failed" || l.timed_out)
    ).length;
    const runs24h = cronLogs24h.filter((l) => l.job_name === log.job_name).length;

    let cronHealth: Health = "gray";
    if (runs24h === 0) cronHealth = "gray";
    else if (failures24h === 0 && log.status === "completed") cronHealth = "green";
    else if (failures24h > 0 && failures24h < runs24h) cronHealth = "yellow";
    else if (failures24h > 0 && failures24h === runs24h) cronHealth = "red";
    else cronHealth = "green";

    return {
      name: log.job_name,
      lastRun: log.started_at.toISOString(),
      lastStatus: log.status,
      lastDuration: log.duration_ms,
      schedule: CRON_SCHEDULE[log.job_name] || "Unknown",
      runs24h,
      failures24h,
      health: cronHealth,
      lastError: log.status === "failed" ? log.error_message : null,
    };
  });

  // ── Per-site metrics ──
  const { SITES } = await import("@/config/sites");
  const sites = Object.values(SITES).map((site) => {
    const articles = siteArticleCounts.find((s) => s.siteId === site.id)?._count.id || 0;
    const topics = siteTopicCounts.find((s) => s.site_id === site.id)?._count.id || 0;
    const drafts = siteDraftCounts.find((s) => s.site_id === site.id)?._count.id || 0;
    const indexed = siteIndexCounts.find((s) => s.site_id === site.id)?._count.id || 0;
    const isActive = siteIds.includes(site.id);

    return {
      siteId: site.id,
      name: site.name,
      domain: site.domain,
      locale: site.locale,
      articles,
      topics,
      drafts,
      indexed,
      active: isActive,
      health: (!isActive ? "gray" : articles > 0 ? "green" : topics > 0 ? "yellow" : "red") as Health,
    };
  });

  // ── Indexing detail ──
  const indexing = {
    totalUrls: indexTotal,
    indexed: indexedCount,
    submitted: submittedCount,
    discovered: discoveredCount,
    errors: errorCount,
    indexRate,
    recentSubmissions: recentIndexing.map((u) => ({
      url: u.url,
      status: u.status,
      siteId: u.site_id,
      indexingState: u.indexing_state,
      coverageState: u.coverage_state,
      submittedAt: u.last_submitted_at?.toISOString() || null,
      crawledAt: u.last_crawled_at?.toISOString() || null,
      error: u.last_error,
    })),
  };

  // ── Recent logs for timeline ──
  const recentLogs = cronLogs24h.slice(0, 30).map((log) => ({
    id: log.id,
    jobName: log.job_name,
    status: log.status,
    startedAt: log.started_at.toISOString(),
    duration: log.duration_ms,
    items: log.items_processed,
    succeeded: log.items_succeeded,
    failed: log.items_failed,
    error: log.error_message,
    timedOut: log.timed_out,
  }));

  return NextResponse.json({
    pipeline,
    alerts,
    crons,
    sites,
    indexing,
    recentLogs,
    generatedAt: now.toISOString(),
  });
  } catch (err) {
    console.error("[command-center] Overview API crashed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Dashboard data unavailable — database may need migration", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
});
