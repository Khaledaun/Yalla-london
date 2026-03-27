/**
 * CEO Intelligence Engine — Weekly Cron
 *
 * Schedule: Sundays 6:00 UTC (after weekly-topics at 4:10, before seo-orchestrator at 6:10)
 * Budget: 280s (300s maxDuration - 20s buffer)
 *
 * Gathers metrics → auto-fixes → compares KPIs → generates plans → reviews standards → emails report
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUDGET_MS = 280_000;

async function handler(request: NextRequest) {
  const startTime = Date.now();

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const blocked = await checkCronEnabled("ceo-intelligence");
  if (blocked) return blocked;

  // CRON_SECRET auth (standard pattern)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { getActiveSiteIds } = await import("@/config/sites");
  const siteIds = getActiveSiteIds();

  const results: Record<string, unknown> = {};
  let overallGrade = "?";

  for (const siteId of siteIds) {
    // Skip yacht site (no content pipeline)
    if (siteId === "zenitha-yachts-med") continue;

    const elapsed = Date.now() - startTime;
    const siteBudget = Math.min(BUDGET_MS - elapsed - 5000, BUDGET_MS / siteIds.length);

    if (siteBudget < 30000) {
      results[siteId] = { skipped: true, reason: "insufficient budget" };
      continue;
    }

    try {
      const { runCeoIntelligence } = await import("@/lib/ceo-engine/intelligence");
      const report = await runCeoIntelligence(siteId, siteBudget);
      results[siteId] = {
        grade: report.grade,
        greenKPIs: report.kpiDeltas.filter((d) => d.status === "green").length,
        totalKPIs: report.kpiDeltas.length,
        fixErrors: report.fixes.errors.length,
        standardsProposals: report.standards.proposals.length,
      };
      overallGrade = report.grade;
    } catch (err) {
      console.error(`[ceo-intelligence] Failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
      results[siteId] = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Log to CronJobLog
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.cronJobLog.create({
      data: {
        job_name: "ceo-intelligence",
        job_type: "ceo",
        status: "completed",
        started_at: new Date(startTime),
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        result_summary: results,
      },
    });
  } catch (err) {
    console.warn("[ceo-intelligence] Failed to log:", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({
    success: true,
    grade: overallGrade,
    durationMs: Date.now() - startTime,
    results,
  });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
