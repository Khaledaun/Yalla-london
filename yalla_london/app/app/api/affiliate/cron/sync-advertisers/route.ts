/**
 * CJ Advertiser Sync Cron — every 6 hours
 * Checks pending advertisers for approval and syncs joined advertisers.
 * When an advertiser becomes JOINED, auto-fetches their links and products.
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
  const flagResponse = await checkCronEnabled("affiliate-sync-advertisers");
  if (flagResponse) return flagResponse;

  const startTime = Date.now();

  try {
    const { isCjConfigured} = await import("@/lib/affiliate/cj-client");
    if (!isCjConfigured()) {
      return NextResponse.json({ success: true, skipped: true, message: "CJ_API_TOKEN not configured" });
    }

    const BUDGET_MS = 53_000;
    const { checkPendingAdvertisers } = await import("@/lib/affiliate/cj-sync");
    const result = await checkPendingAdvertisers(BUDGET_MS - (Date.now() - startTime));

    // If newly approved, log notification
    if (result.newlyApproved.length > 0) {
      console.log(`[affiliate-sync-advertisers] ${result.newlyApproved.length} advertiser(s) newly approved! IDs: ${result.newlyApproved.join(", ")}`);
    }

    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("affiliate-sync-advertisers", "completed", {
      durationMs: Date.now() - startTime,
      itemsProcessed: result.checked,
      itemsSucceeded: (result.result?.created ?? 0) + (result.result?.updated ?? 0),
      itemsFailed: result.result?.errors?.length ?? 0,
      resultSummary: result as unknown as Record<string, unknown>,
    }).catch((err: Error) => console.warn("[affiliate-sync-advertisers] log failed:", err.message));

    // Include diagnostic info for dashboard visibility
    const { getWebsiteId, getCircuitBreakerState } = await import("@/lib/affiliate/cj-client");
    const diagnostic = {
      websiteId: getWebsiteId(),
      publisherCid: process.env.CJ_PUBLISHER_CID ? `${process.env.CJ_PUBLISHER_CID.substring(0, 4)}...` : "NOT SET",
      apiTokenSet: !!process.env.CJ_API_TOKEN,
      circuitBreaker: getCircuitBreakerState(),
    };

    return NextResponse.json({
      success: true,
      ...result,
      diagnostic,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "affiliate-sync-advertisers", error }).catch((err: Error) => console.warn("[affiliate-sync-advertisers] failure hook failed:", err.message));

    // Surface the actual error message for dashboard visibility
    const errorMsg = error instanceof Error ? error.message :
      (error && typeof error === "object" && "message" in error) ? String((error as { message: string }).message) :
      String(error);
    console.error(`[affiliate-sync-advertisers] Failed: ${errorMsg}`);

    return NextResponse.json({
      success: false,
      error: `CJ advertiser sync failed: ${errorMsg.substring(0, 300)}`,
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
