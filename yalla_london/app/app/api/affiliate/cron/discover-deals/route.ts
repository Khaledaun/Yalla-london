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
    const { isFeatureFlagEnabled } = await import("@/lib/feature-flags");
    const enabled = await isFeatureFlagEnabled("FEATURE_AFFILIATE_DEAL_DISCOVERY");
    if (!enabled) {
      return NextResponse.json({ success: true, skipped: true, message: "Deal discovery disabled" });
    }

    const { isCjConfigured } = await import("@/lib/affiliate/cj-client");
    if (!isCjConfigured()) {
      return NextResponse.json({ success: true, skipped: true, message: "CJ_API_TOKEN not configured" });
    }

    const { runDealDiscovery } = await import("@/lib/affiliate/deal-discovery");
    const result = await runDealDiscovery(50_000);

    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("affiliate-discover-deals", "completed", {
      durationMs: Date.now() - startTime,
      itemsProcessed: result.totalDealsFound,
      resultSummary: result as unknown as Record<string, unknown>,
    }).catch((err: Error) => console.warn("[affiliate-discover-deals] log failed:", err.message));

    return NextResponse.json({ success: true, ...result, durationMs: Date.now() - startTime });
  } catch (error) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "affiliate-discover-deals", error }).catch((err: Error) => console.warn("[affiliate-discover-deals] failure hook failed:", err.message));

    return NextResponse.json({ success: false, error: "Deal discovery failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
