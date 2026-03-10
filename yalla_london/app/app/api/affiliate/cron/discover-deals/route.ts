/**
 * CJ Deal Discovery Cron — daily at 5 AM UTC
 * Searches for London-relevant deals across joined advertisers.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("affiliate-discover-deals");
  if (flagResponse) return flagResponse;

  const startTime = Date.now();

  try {
    const { isCjConfigured} = await import("@/lib/affiliate/cj-client");
    if (!isCjConfigured()) {
      return NextResponse.json({ success: true, skipped: true, message: "CJ_API_TOKEN not configured" });
    }

    const { runDealDiscovery } = await import("@/lib/affiliate/deal-discovery");
    const { getActiveSiteIds } = await import("@/config/sites");
    const activeSites = getActiveSiteIds().filter((s: string) => s !== "zenitha-yachts-med");
    const BUDGET_MS = 50_000;
    const perSiteBudget = Math.floor(BUDGET_MS / Math.max(activeSites.length, 1));
    const results: Record<string, unknown> = {};
    let totalDeals = 0;

    for (const site of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;
      try {
        const result = await runDealDiscovery(perSiteBudget, site);
        results[site] = result;
        totalDeals += result.totalDealsFound || 0;
      } catch (err) {
        console.warn(`[affiliate-discover-deals] ${site} failed:`, err instanceof Error ? err.message : String(err));
        results[site] = { error: "failed" };
      }
    }

    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("affiliate-discover-deals", "completed", {
      durationMs: Date.now() - startTime,
      itemsProcessed: totalDeals,
      resultSummary: { sites: Object.keys(results), totalDeals, results },
    }).catch((err: Error) => console.warn("[affiliate-discover-deals] log failed:", err.message));

    return NextResponse.json({ success: true, totalDeals, results, durationMs: Date.now() - startTime });
  } catch (error) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "affiliate-discover-deals", error }).catch((err: Error) => console.warn("[affiliate-discover-deals] failure hook failed:", err.message));

    return NextResponse.json({ success: false, error: "Deal discovery failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
