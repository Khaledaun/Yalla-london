/**
 * Trigger deal discovery engine
 * POST /api/affiliate/offers/discover
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const POST = withAdminAuth(async () => {
  try {
    const { runDealDiscovery } = await import("@/lib/affiliate/deal-discovery");
    const result = await runDealDiscovery(40_000);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.warn("[deal-discover] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Discovery failed" }, { status: 500 });
  }
});
