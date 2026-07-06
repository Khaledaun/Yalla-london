/**
 * Trigger full advertiser sync
 * POST /api/affiliate/advertisers/sync
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const POST = withAdminAuth(async () => {
  try {
    const { syncAdvertisers } = await import("@/lib/affiliate/cj-sync");
    const { result, newlyApproved } = await syncAdvertisers();

    return NextResponse.json({ success: true, ...result, newlyApproved });
  } catch (error) {
    console.warn("[affiliate-sync] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
});
