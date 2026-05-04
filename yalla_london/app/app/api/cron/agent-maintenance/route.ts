/**
 * CTO Agent Maintenance — Weekly Cron
 *
 * Schedule: Sundays 6:30 UTC (after ceo-intelligence at 5:50 and seo-orchestrator daily at 6:10)
 * Budget: 280s (300s maxDuration - 20s buffer)
 *
 * Runs the CTO Agent's 5-phase maintenance loop:
 * SCAN → BROWSE → PROPOSE → EXECUTE → REPORT
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUDGET_MS = 280_000;

async function handler(request: NextRequest) {
  const startTime = Date.now();

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const blocked = await checkCronEnabled("agent-maintenance");
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
  let totalFindings = 0;
  let overallStatus = "completed";

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
      const { runCTOMaintenance } = await import("@/lib/agents/cto-brain");
      const report = await runCTOMaintenance(siteId, siteBudget);

      const criticalCount = report.findings.filter((f) => f.severity === "critical").length;
      const highCount = report.findings.filter((f) => f.severity === "high").length;

      results[siteId] = {
        phase: report.phase,
        durationMs: report.durationMs,
        findings: report.findings.length,
        critical: criticalCount,
        high: highCount,
        actions: report.actionsPerformed.length,
        errors: report.errors.length,
      };

      totalFindings += report.findings.length;

      if (report.errors.length > 0 && report.findings.length === 0) {
        overallStatus = "failed";
      }
    } catch (err) {
      console.error(`[agent-maintenance] Failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
      results[siteId] = { error: err instanceof Error ? err.message : String(err) };
      overallStatus = "failed";
    }
  }

  // Log to CronJobLog
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.cronJobLog.create({
      data: {
        job_name: "agent-maintenance",
        job_type: "cto",
        status: overallStatus,
        started_at: new Date(startTime),
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        result_summary: {
          totalFindings,
          sites: results,
        },
      },
    });
  } catch (err) {
    console.warn("[agent-maintenance] Failed to log:", err instanceof Error ? err.message : String(err));
  }

  // CEO Inbox notification on critical findings
  if (totalFindings > 0) {
    try {
      const { prisma } = await import("@/lib/db");
      const criticalFindings = Object.values(results).filter(
        (r) => typeof r === "object" && r !== null && "critical" in r && (r as Record<string, number>).critical > 0,
      );
      if (criticalFindings.length > 0) {
        await prisma.cronJobLog.create({
          data: {
            job_name: "ceo-inbox",
            job_type: "alert",
            status: "completed",
            started_at: new Date(),
            completed_at: new Date(),
            duration_ms: 0,
            result_summary: {
              type: "cto-agent-findings",
              message: `CTO Agent found ${totalFindings} issue(s) including critical findings`,
              results,
            },
          },
        });
      }
    } catch (err) {
      console.warn("[agent-maintenance] Failed to send CEO alert:", err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({
    success: overallStatus === "completed",
    totalFindings,
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
