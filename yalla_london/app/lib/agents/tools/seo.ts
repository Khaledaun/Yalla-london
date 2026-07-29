/**
 * SEO Tool Handlers — wraps indexing status + GSC data for CEO/CTO Agent.
 *
 * Tools: get_site_health, check_cron_health, check_pipeline_health
 */

import { prisma } from "@/lib/db";
import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// get_site_health — alerts, cron health, pipeline status
// ---------------------------------------------------------------------------

export async function getSiteHealth(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [failedCrons, indexingErrors, pipelineStuck, activeAlerts] =
    await Promise.all([
      // Failed crons in last 24h
      prisma.cronJobLog.count({
        where: { status: "failed", started_at: { gte: twentyFourHoursAgo } },
      }),
      // Indexing errors
      prisma.uRLIndexingStatus.count({
        where: { site_id: siteId, status: "error" },
      }),
      // Stuck drafts (not updated in 4+ hours, not rejected/reservoir)
      prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: { notIn: ["rejected", "reservoir", "published"] },
          updated_at: {
            lt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          },
        },
      }),
      // CEO Inbox active alerts
      prisma.cronJobLog.count({
        where: {
          job_name: "ceo-inbox",
          job_type: "alert",
          started_at: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

  const healthScore =
    failedCrons === 0 && indexingErrors === 0 && pipelineStuck === 0
      ? "healthy"
      : failedCrons > 5 || pipelineStuck > 10
        ? "critical"
        : "degraded";

  return {
    success: true,
    data: {
      healthScore,
      failedCrons24h: failedCrons,
      indexingErrors,
      stuckDrafts: pipelineStuck,
      activeAlerts,
    },
    summary: `Site health: ${healthScore}. ${failedCrons} failed crons, ${indexingErrors} indexing errors, ${pipelineStuck} stuck drafts.`,
  };
}

// ---------------------------------------------------------------------------
// check_cron_health — recent cron job results
// ---------------------------------------------------------------------------

export async function checkCronHealth(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const hoursBack = Number(params.hoursBack) || 24;
  const jobName = params.jobName as string | undefined;
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    started_at: { gte: since },
  };
  if (jobName) where.job_name = jobName;

  const logs = await prisma.cronJobLog.findMany({
    where,
    select: {
      job_name: true,
      status: true,
      started_at: true,
      duration_ms: true,
      error_message: true,
    },
    orderBy: { started_at: "desc" },
    take: 100,
  });

  // Aggregate by job name
  const byJob: Record<
    string,
    { total: number; failed: number; lastRun: string; avgMs: number }
  > = {};

  for (const log of logs) {
    const name = log.job_name;
    if (!byJob[name]) {
      byJob[name] = { total: 0, failed: 0, lastRun: "", avgMs: 0 };
    }
    byJob[name].total++;
    if (log.status === "failed") byJob[name].failed++;
    if (!byJob[name].lastRun) {
      byJob[name].lastRun = log.started_at.toISOString();
    }
    byJob[name].avgMs += log.duration_ms || 0;
  }

  for (const name of Object.keys(byJob)) {
    byJob[name].avgMs = Math.round(byJob[name].avgMs / byJob[name].total);
  }

  const totalFailed = Object.values(byJob).reduce(
    (sum, j) => sum + j.failed,
    0,
  );

  return {
    success: true,
    data: byJob,
    summary: `${Object.keys(byJob).length} crons ran in last ${hoursBack}h. ${totalFailed} total failures.`,
  };
}

// ---------------------------------------------------------------------------
// check_pipeline_health — content pipeline queue monitor snapshot
// ---------------------------------------------------------------------------

export async function checkPipelineHealth(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;

  const [phases, stuckDrafts, recentPublished] = await Promise.all([
    prisma.articleDraft.groupBy({
      by: ["current_phase"],
      where: { site_id: siteId },
      _count: true,
    }),
    // Drafts stuck >24h in non-terminal phases
    prisma.articleDraft.count({
      where: {
        site_id: siteId,
        current_phase: { notIn: ["rejected", "reservoir", "published"] },
        updated_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    // Published in last 7d
    prisma.blogPost.count({
      where: {
        siteId,
        published: true,
        created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const phaseMap: Record<string, number> = {};
  for (const p of phases) {
    phaseMap[p.current_phase] = p._count;
  }

  const health =
    stuckDrafts === 0
      ? "healthy"
      : stuckDrafts > 10
        ? "critical"
        : "degraded";

  return {
    success: true,
    data: {
      health,
      phases: phaseMap,
      stuckDrafts24h: stuckDrafts,
      publishedLast7d: recentPublished,
    },
    summary: `Pipeline ${health}: ${stuckDrafts} stuck drafts, ${recentPublished} published in 7d.`,
  };
}
