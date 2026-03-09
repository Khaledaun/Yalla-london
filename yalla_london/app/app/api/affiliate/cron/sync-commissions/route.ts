/**
 * CJ Commission Sync Cron — daily at 4 AM UTC
 * Fetches commission/transaction data from CJ for the last 7 days.
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
  const flagResponse = await checkCronEnabled("affiliate-sync-commissions");
  if (flagResponse) return flagResponse;

  const startTime = Date.now();

  try {
    const { isFeatureFlagEnabled } = await import("@/lib/feature-flags");
    const enabled = await isFeatureFlagEnabled("FEATURE_AFFILIATE_CJ_SYNC");
    if (!enabled) {
      return NextResponse.json({ success: true, skipped: true, message: "CJ sync disabled" });
    }

    const { isCjConfigured } = await import("@/lib/affiliate/cj-client");
    if (!isCjConfigured()) {
      return NextResponse.json({ success: true, skipped: true, message: "CJ_API_TOKEN not configured" });
    }

    // Sync last 7 days of commissions
    const dateTo = new Date().toISOString().split("T")[0];
    const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { syncCommissions } = await import("@/lib/affiliate/cj-sync");
    const result = await syncCommissions(dateFrom, dateTo);

    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("affiliate-sync-commissions", "completed", {
      durationMs: Date.now() - startTime,
      itemsProcessed: result.processed,
      resultSummary: result as unknown as Record<string, unknown>,
    }).catch((err: Error) => console.warn("[affiliate-sync-commissions] log failed:", err.message));

    return NextResponse.json({ success: true, ...result, durationMs: Date.now() - startTime });
  } catch (error) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "affiliate-sync-commissions", error }).catch((err: Error) => console.warn("[affiliate-sync-commissions] failure hook failed:", err.message));

    return NextResponse.json({ success: false, error: "Commission sync failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
