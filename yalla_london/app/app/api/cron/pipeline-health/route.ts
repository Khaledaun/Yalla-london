export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pipeline Health Monitor — Throughput & Bottleneck Detection
 *
 * Runs every 4 hours. Captures a snapshot of the entire content pipeline state
 * and logs it as structured data in CronJobLog. This gives us:
 *
 * 1. THROUGHPUT: drafts entering vs exiting per period
 * 2. VELOCITY: average time from creation to reservoir/published
 * 3. BOTTLENECKS: which phase has the most drafts stuck
 * 4. RECYCLING RATE: how many drafts are being touched by recovery agents
 * 5. ACTIVE COUNT ACCURACY: what content-builder-create actually sees
 * 6. CONFLICT DETECTION: recovery agents fighting over the same drafts
 *
 * This cron NEVER modifies data — pure observation.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { checkCronEnabled } from "@/lib/cron-feature-guard";

const BUDGET_MS = 53_000;

async function handleRequest(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flagBlock = await checkCronEnabled("pipeline-health");
  if (flagBlock) return flagBlock;

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");
    const activeSiteIds = getActiveSiteIds();

    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const perSiteSnapshots: Record<string, unknown>[] = [];

    for (const siteId of activeSiteIds) {
      if (Date.now() - cronStart > BUDGET_MS) break;

      // ── 1. Phase distribution (current state) ──
      const allDrafts = await prisma.articleDraft.groupBy({
        by: ["current_phase"],
        where: { site_id: siteId },
        _count: true,
      });
      const phaseDistribution: Record<string, number> = {};
      let totalInPipeline = 0;
      for (const row of allDrafts) {
        phaseDistribution[row.current_phase] = row._count;
        if (!["rejected", "published", "completed"].includes(row.current_phase)) {
          totalInPipeline += row._count;
        }
      }

      // ── 2. Throughput (last 4h) ──
      const draftsCreatedLast4h = await prisma.articleDraft.count({
        where: { site_id: siteId, created_at: { gte: fourHoursAgo } },
      });
      const draftsReachedReservoirLast4h = await prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: "reservoir",
          updated_at: { gte: fourHoursAgo },
        },
      });
      const draftsPublishedLast4h = await prisma.blogPost.count({
        where: {
          siteId,
          published: true,
          publishedAt: { gte: fourHoursAgo },
        },
      });
      const draftsRejectedLast4h = await prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: "rejected",
          updated_at: { gte: fourHoursAgo },
        },
      });

      // ── 3. Active count (what content-builder-create sees) ──
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const activeByCreateDef = await prisma.articleDraft.findMany({
        where: {
          site_id: siteId,
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
          updated_at: { gte: thirtyMinAgo },
          phase_attempts: { lt: 3 },
          NOT: {
            OR: [
              { last_error: { contains: "Reset phase timer" } },
              { last_error: { startsWith: "[diagnostic-agent" } },
              { last_error: { startsWith: "[diagnostic-agent-reset]" } },
              { last_error: { contains: "MAX_RECOVERIES_EXCEEDED" } },
              { last_error: { contains: "[sweeper]" } },
            ],
          },
        },
        select: { id: true, keyword: true, current_phase: true, phase_attempts: true, updated_at: true },
      });

      // Also count what the OLD definition would see (1h window, no attempts filter)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const activeByOldDef = await prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
          updated_at: { gte: oneHourAgo },
        },
      });

      // ── 4. Recovery agent activity (last 4h) ──
      const recoveryLogs = await prisma.cronJobLog.findMany({
        where: {
          job_name: { in: ["sweeper-agent", "diagnostic-sweep", "failure-hook"] },
          started_at: { gte: fourHoursAgo },
        },
        select: { job_name: true, status: true, result_summary: true, items_processed: true },
      });
      const recoveryStats: Record<string, { runs: number; recovered: number; skipped: number }> = {};
      for (const log of recoveryLogs) {
        const name = log.job_name;
        if (!recoveryStats[name]) recoveryStats[name] = { runs: 0, recovered: 0, skipped: 0 };
        recoveryStats[name].runs++;
        const summary = log.result_summary as Record<string, unknown> | null;
        if (summary) {
          if (typeof summary.recovered === "number") recoveryStats[name].recovered += summary.recovered;
          if (typeof summary.skipped === "number") recoveryStats[name].skipped += summary.skipped;
          // Also handle structured recovery entries
          const ctx = summary.context as Record<string, unknown> | undefined;
          if (ctx) {
            if (typeof ctx.recovered === "number") recoveryStats[name].recovered += ctx.recovered;
            if (typeof ctx.skipped === "number") recoveryStats[name].skipped += ctx.skipped;
          }
        }
      }

      // ── 5. Conflict detection — drafts touched by multiple agents in last 4h ──
      const draftTouchLogs = await prisma.cronJobLog.findMany({
        where: {
          job_name: { in: ["sweeper-agent", "failure-hook", "diagnostic-sweep"] },
          started_at: { gte: fourHoursAgo },
          status: "completed",
        },
        select: { job_name: true, result_summary: true },
        take: 200,
      });
      const draftTouches = new Map<string, Set<string>>();
      for (const log of draftTouchLogs) {
        const summary = log.result_summary as Record<string, unknown> | null;
        if (summary?.target && typeof summary.target === "string" && !summary.target.startsWith("garbage-") && !summary.target.startsWith("topic-")) {
          if (!draftTouches.has(summary.target)) draftTouches.set(summary.target, new Set<string>());
          draftTouches.get(summary.target)!.add(log.job_name);
        }
      }
      const conflictDrafts = [...draftTouches.entries()]
        .filter(([, agents]) => agents.size >= 2)
        .map(([draftId, agents]) => ({ draftId, agents: [...agents] }));

      // ── 6. Velocity — average age of drafts in each phase ──
      const pipelineDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: siteId,
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring", "reservoir"],
          },
        },
        select: { current_phase: true, created_at: true, updated_at: true },
      });
      const phaseAges: Record<string, { count: number; totalAgeHours: number; avgAgeHours: number }> = {};
      for (const d of pipelineDrafts) {
        const phase = d.current_phase;
        if (!phaseAges[phase]) phaseAges[phase] = { count: 0, totalAgeHours: 0, avgAgeHours: 0 };
        phaseAges[phase].count++;
        phaseAges[phase].totalAgeHours += (now.getTime() - new Date(d.created_at).getTime()) / 3_600_000;
      }
      for (const phase of Object.keys(phaseAges)) {
        phaseAges[phase].avgAgeHours = Math.round(phaseAges[phase].totalAgeHours / phaseAges[phase].count * 10) / 10;
      }

      // ── 7. AI provider health (last 4h) ──
      const aiLogs = await prisma.apiUsageLog.groupBy({
        by: ["provider", "success"],
        where: { createdAt: { gte: fourHoursAgo }, siteId },
        _count: true,
        _sum: { estimatedCostUsd: true },
      });
      const providerHealth: Record<string, { calls: number; failures: number; costUsd: number; failRate: number }> = {};
      for (const row of aiLogs) {
        const p = row.provider;
        if (!providerHealth[p]) providerHealth[p] = { calls: 0, failures: 0, costUsd: 0, failRate: 0 };
        providerHealth[p].calls += row._count;
        if (!row.success) providerHealth[p].failures += row._count;
        providerHealth[p].costUsd += row._sum.estimatedCostUsd || 0;
      }
      for (const p of Object.keys(providerHealth)) {
        providerHealth[p].failRate = providerHealth[p].calls > 0
          ? Math.round((providerHealth[p].failures / providerHealth[p].calls) * 100)
          : 0;
        providerHealth[p].costUsd = Math.round(providerHealth[p].costUsd * 1000) / 1000;
      }

      // ── 8. Bottleneck detection ──
      const pipelinePhases = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"];
      const bottleneck = pipelinePhases
        .map(phase => ({ phase, count: phaseDistribution[phase] || 0 }))
        .sort((a, b) => b.count - a.count)[0];

      // ── 9. Stall indicator ──
      // If more drafts are being rejected+recycled than reaching reservoir, the pipeline is stalling
      const recyclingRate = draftsRejectedLast4h > 0 && draftsReachedReservoirLast4h === 0
        ? "STALLED"
        : draftsRejectedLast4h > draftsReachedReservoirLast4h * 3
          ? "HIGH_RECYCLING"
          : "HEALTHY";

      perSiteSnapshots.push({
        siteId,
        snapshot: {
          phaseDistribution,
          totalInPipeline,
          throughput: {
            created4h: draftsCreatedLast4h,
            reservoir4h: draftsReachedReservoirLast4h,
            published4h: draftsPublishedLast4h,
            rejected4h: draftsRejectedLast4h,
          },
          activeCount: {
            currentDef: activeByCreateDef.length,
            oldDef: activeByOldDef,
            activeDrafts: activeByCreateDef.map(d => ({
              id: d.id,
              keyword: d.keyword?.substring(0, 40),
              phase: d.current_phase,
              attempts: d.phase_attempts,
              updatedMinAgo: Math.round((now.getTime() - new Date(d.updated_at).getTime()) / 60_000),
            })),
          },
          recoveryAgents: recoveryStats,
          conflicts: conflictDrafts.length > 0 ? conflictDrafts : null,
          phaseAges,
          providerHealth,
          bottleneck: bottleneck.count > 0 ? bottleneck : null,
          stallIndicator: recyclingRate,
        },
      });
    }

    // ── Determine overall health ──
    const hasStall = perSiteSnapshots.some(s => (s.snapshot as Record<string, unknown>).stallIndicator === "STALLED");
    const hasConflicts = perSiteSnapshots.some(s => (s.snapshot as Record<string, unknown>).conflicts !== null);
    const overallStatus = hasStall ? "STALLED" : hasConflicts ? "CONFLICTS" : "HEALTHY";

    const durationMs = Date.now() - cronStart;

    await logCronExecution("pipeline-health", "completed", {
      durationMs,
      itemsProcessed: activeSiteIds.length,
      itemsSucceeded: perSiteSnapshots.length,
      resultSummary: {
        overallStatus,
        sites: perSiteSnapshots,
        capturedAt: now.toISOString(),
      },
    }).catch(err => console.warn("[pipeline-health] Log failed:", err instanceof Error ? err.message : err));

    return NextResponse.json({
      success: true,
      overallStatus,
      sites: perSiteSnapshots,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - cronStart;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[pipeline-health] Fatal:", errorMessage);

    await logCronExecution("pipeline-health", "failed", {
      durationMs,
      errorMessage,
    }).catch(err => console.warn("[pipeline-health] Error log failed:", err instanceof Error ? err.message : err));

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
