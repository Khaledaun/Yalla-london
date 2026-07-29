/**
 * Check pending advertisers for approval
 * POST /api/affiliate/advertisers/check-pending
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const POST = withAdminAuth(async () => {
  try {
    const { checkPendingAdvertisers } = await import("@/lib/affiliate/cj-sync");
    const result = await checkPendingAdvertisers();

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.warn("[check-pending] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Check failed" }, { status: 500 });
  }
});
