/**
 * CJ Link Refresh Cron — weekly Sunday 3 AM UTC
 * Refreshes links for all joined advertisers.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

const BUDGET_MS = 53_000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("affiliate-refresh-links");
  if (flagResponse) return flagResponse;

  const startTime = Date.now();

  try {
    const { isCjConfigured, CJ_NETWORK_ID} = await import("@/lib/affiliate/cj-client");
    if (!isCjConfigured()) {
      return NextResponse.json({ success: true, skipped: true, message: "CJ_API_TOKEN not configured" });
    }

    const { prisma } = await import("@/lib/db");
    const { syncLinks } = await import("@/lib/affiliate/cj-sync");

    const joinedAdvertisers = await prisma.cjAdvertiser.findMany({
      where: { networkId: CJ_NETWORK_ID, status: "JOINED" },
      select: { externalId: true, name: true },
    });

    let totalLinksCreated = 0;
    const errors: string[] = [];

    for (const adv of joinedAdvertisers) {
      if (Date.now() - startTime > BUDGET_MS) {
        console.warn("[affiliate-refresh-links] Budget exhausted");
        break;
      }

      try {
        const result = await syncLinks(adv.externalId);
        totalLinksCreated += result.created;
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : (typeof err === "object" && err !== null ? JSON.stringify(err) : String(err));
        errors.push(`Failed for ${adv.name}: ${errMsg}`);
      }
    }

    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("affiliate-refresh-links", "completed", {
      durationMs: Date.now() - startTime,
      itemsProcessed: joinedAdvertisers.length,
      itemsSucceeded: joinedAdvertisers.length - errors.length,
      itemsFailed: errors.length,
      resultSummary: { advertisersProcessed: joinedAdvertisers.length, linksCreated: totalLinksCreated, errors },
    }).catch((err: Error) => console.warn("[affiliate-refresh-links] log failed:", err.message));

    return NextResponse.json({
      success: true,
      advertisersProcessed: joinedAdvertisers.length,
      linksCreated: totalLinksCreated,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "affiliate-refresh-links", error }).catch((err: Error) => console.warn("[affiliate-refresh-links] failure hook failed:", err.message));

    return NextResponse.json({ success: false, error: "Link refresh failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
