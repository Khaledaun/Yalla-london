export const dynamic = "force-dynamic";

/**
 * Audit Export — Comprehensive JSON file generator
 *
 * Aggregates all audit data for a site into a single downloadable JSON file.
 * Designed for Khaled to export from the cockpit Sites tab.
 *
 * Data sources:
 *   - CronJobLog: last 7 days of cron runs
 *   - SeoAuditReport: last 5 audit reports
 *   - BlogPost: article counts, avg SEO scores, publishing stats
 *   - ArticleDraft: pipeline phase distribution, stuck drafts
 *   - URLIndexingStatus: indexing stats
 *   - ApiUsageLog: AI cost summary (tokens, cost by provider)
 *   - AutoFixLog: remediation history (last 7 days)
 *
 * GET /api/admin/audit-export?siteId=yalla-london
 * Returns: JSON file as download attachment
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Auth
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const { prisma } = await import("@/lib/db");

    // Run all queries in parallel for speed
    const [
      cronLogs,
      seoReports,
      blogPostStats,
      draftsByPhase,
      stuckDrafts,
      indexingStats,
      aiUsageSummary,
      autoFixLogs,
      recentPublished,
      totalDrafts,
    ] = await Promise.allSettled([
      // 1. Cron Job Logs (last 7 days)
      prisma.cronJobLog.findMany({
        where: { started_at: { gte: sevenDaysAgo } },
        select: {
          id: true,
          job_name: true,
          status: true,
          started_at: true,
          duration_ms: true,
          items_processed: true,
          items_succeeded: true,
          error_message: true,
        },
        orderBy: { started_at: "desc" },
        take: 500,
      }),

      // 2. SEO Audit Reports (last 5)
      prisma.seoAuditReport.findMany({
        where: { siteId },
        select: {
          id: true,
          healthScore: true,
          totalFindings: true,
          criticalCount: true,
          highCount: true,
          mediumCount: true,
          lowCount: true,
          summary: true,
          triggeredBy: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // 3. Blog Post Stats
      prisma.blogPost.aggregate({
        where: { siteId, published: true, deletedAt: null },
        _count: true,
        _avg: { seo_score: true },
      }),

      // 4. Draft Phase Distribution
      prisma.$queryRawUnsafe(
        `SELECT current_phase, COUNT(*) as count FROM article_drafts WHERE site_id = $1 GROUP BY current_phase ORDER BY count DESC`,
        siteId,
      ).catch(() => []),

      // 5. Stuck Drafts (3+ attempts)
      prisma.articleDraft.findMany({
        where: {
          site_id: siteId,
          current_phase: { in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"] },
          phase_attempts: { gte: 3 },
        },
        select: {
          id: true,
          keyword: true,
          locale: true,
          current_phase: true,
          phase_attempts: true,
          last_error: true,
          updated_at: true,
        },
        take: 50,
      }),

      // 6. Indexing Stats
      prisma.$queryRawUnsafe(
        `SELECT status, COUNT(*) as count FROM url_indexing_status WHERE site_id = $1 GROUP BY status`,
        siteId,
      ).catch(() => []),

      // 7. AI Usage Summary (last 7 days)
      prisma.apiUsageLog.groupBy({
        by: ["provider"],
        where: { createdAt: { gte: sevenDaysAgo }, siteId },
        _sum: { totalTokens: true, estimatedCostUsd: true },
        _count: true,
      }).catch(() => []),

      // 8. Auto-Fix Logs (last 7 days)
      prisma.autoFixLog.findMany({
        where: { siteId, createdAt: { gte: sevenDaysAgo } },
        select: {
          id: true,
          fixType: true,
          agent: true,
          success: true,
          error: true,
          createdAt: true,
          targetType: true,
          targetId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),

      // 9. Recent Published (last 7 days)
      prisma.blogPost.findMany({
        where: { siteId, published: true, created_at: { gte: sevenDaysAgo } },
        select: { id: true, title_en: true, slug: true, seo_score: true, created_at: true },
        orderBy: { created_at: "desc" },
        take: 50,
      }),

      // 10. Total Draft Count
      prisma.articleDraft.count({ where: { site_id: siteId } }),
    ]);

    // Build safe extractors (Promise.allSettled returns {status, value} or {status, reason})
    const safe = <T>(result: PromiseSettledResult<T>, fallback: T): T =>
      result.status === "fulfilled" ? result.value : fallback;

    // Aggregate cron stats
    const cronLogsData = safe(cronLogs, []) as Array<Record<string, unknown>>;
    const cronSummary: Record<string, { total: number; success: number; failed: number; avgDurationMs: number }> = {};
    for (const log of cronLogsData) {
      const name = log.job_name as string;
      if (!cronSummary[name]) cronSummary[name] = { total: 0, success: 0, failed: 0, avgDurationMs: 0 };
      cronSummary[name].total++;
      if (log.status === "completed") cronSummary[name].success++;
      else cronSummary[name].failed++;
      cronSummary[name].avgDurationMs += (log.duration_ms as number || 0);
    }
    for (const name of Object.keys(cronSummary)) {
      if (cronSummary[name].total > 0) {
        cronSummary[name].avgDurationMs = Math.round(cronSummary[name].avgDurationMs / cronSummary[name].total);
      }
    }

    const exportData = {
      meta: {
        exportedAt: now.toISOString(),
        siteId,
        period: { from: sevenDaysAgo.toISOString(), to: now.toISOString() },
        version: "1.0",
      },
      overview: {
        publishedArticles: safe(blogPostStats, { _count: 0, _avg: { seo_score: null } }),
        totalDrafts: safe(totalDrafts, 0),
        recentlyPublished: safe(recentPublished, []),
      },
      pipeline: {
        phaseDistribution: safe(draftsByPhase, []),
        stuckDrafts: safe(stuckDrafts, []),
      },
      seo: {
        auditReports: safe(seoReports, []),
        indexingStats: safe(indexingStats, []),
      },
      crons: {
        summary: cronSummary,
        recentLogs: cronLogsData.slice(0, 100), // Cap at 100 for file size
      },
      ai: {
        usageSummary: safe(aiUsageSummary, []),
      },
      remediation: {
        autoFixLogs: safe(autoFixLogs, []),
      },
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const dateStr = now.toISOString().split("T")[0];
    const filename = `audit-${siteId}-${dateStr}.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[audit-export] Failed:", msg);
    // Surface the actual error type so we can debug from the dashboard
    const isTableMissing = msg.includes("does not exist") || msg.includes("P2021") || msg.includes("relation");
    const isConnectionError = msg.includes("connect") || msg.includes("pool") || msg.includes("ECONNREFUSED");
    const hint = isTableMissing
      ? "One or more database tables are missing. Run 'npx prisma db push' to sync schema."
      : isConnectionError
        ? "Database connection failed. Check DATABASE_URL in Vercel env vars."
        : "Unexpected error during audit export.";
    return NextResponse.json(
      { error: "Failed to generate audit export", hint, detail: msg.substring(0, 200) },
      { status: 500 },
    );
  }
}
