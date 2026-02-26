/**
 * Commerce Trends Cron — Weekly AI market research
 *
 * Schedule: Monday 4:30 UTC (vercel.json)
 * Loops all active sites with COMMERCE_ENGINE flag enabled.
 * Creates TrendRun + ProductBriefs for top opportunities.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 53_000;

async function handleCommerceTrends(request: NextRequest) {
  const cronStart = Date.now();

  // Auth — allow if CRON_SECRET unset, block only if set and doesn't match
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { getActiveSiteIds } = await import("@/config/sites");
  const { isFeatureFlagEnabled } = await import("@/lib/feature-flags");
  const { executeTrendRun } = await import("@/lib/commerce/trend-engine");

  const activeSiteIds = getActiveSiteIds();
  const results: Record<string, unknown> = {};
  let totalProcessed = 0;
  let totalFailed = 0;
  const errors: string[] = [];
  const sitesProcessed: string[] = [];

  for (const siteId of activeSiteIds) {
    // Budget check
    const budgetUsed = Date.now() - cronStart;
    if (budgetUsed > BUDGET_MS - 20_000) {
      console.warn(
        `[commerce-trends] Budget low (${Math.round(budgetUsed / 1000)}s used) — stopping`,
      );
      break;
    }

    // Skip sites without commerce engine enabled
    const commerceEnabled = await isFeatureFlagEnabled("COMMERCE_ENGINE");
    if (!commerceEnabled) {
      continue;
    }

    // Skip yacht sites (they don't use digital product pipeline)
    if (siteId.includes("yacht")) {
      continue;
    }

    try {
      const runResult = await executeTrendRun(siteId, {
        maxNiches: 10,
        minScore: 50,
        calledFrom: "/api/cron/commerce-trends",
      });

      results[siteId] = {
        trendRunId: runResult.trendRunId,
        nichesFound: runResult.niches.length,
        briefsCreated: runResult.briefsCreated,
        costUsd: runResult.estimatedCostUsd,
        durationMs: runResult.durationMs,
      };

      totalProcessed++;
      sitesProcessed.push(siteId);
    } catch (err) {
      totalFailed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${siteId}: ${msg}`);
      console.warn(`[commerce-trends] Failed for site ${siteId}:`, msg);
    }
  }

  // Log to CronJobLog
  const durationMs = Date.now() - cronStart;
  const hasErrors = errors.length > 0;
  await logCronExecution(
    "commerce-trends",
    hasErrors && totalProcessed === 0 ? "failed" : "completed",
    {
      durationMs,
      itemsProcessed: totalProcessed + totalFailed,
      itemsSucceeded: totalProcessed,
      itemsFailed: totalFailed,
      sitesProcessed,
      errorMessage: hasErrors ? errors.slice(0, 3).join(" | ") : undefined,
      resultSummary: results,
    },
  ).catch((e) =>
    console.warn(
      "[commerce-trends] Log failed:",
      e instanceof Error ? e.message : e,
    ),
  );

  return NextResponse.json({
    success: true,
    durationMs,
    sitesProcessed,
    results,
    errors: hasErrors ? errors : undefined,
  });
}

export async function GET(request: NextRequest) {
  return handleCommerceTrends(request);
}
export async function POST(request: NextRequest) {
  return handleCommerceTrends(request);
}
