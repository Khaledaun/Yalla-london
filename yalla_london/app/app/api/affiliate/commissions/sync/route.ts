/**
 * Trigger commission sync
 * POST /api/affiliate/commissions/sync
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const days = (body as Record<string, number>).days || 30;

    const dateTo = new Date().toISOString().split("T")[0];
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { syncCommissions } = await import("@/lib/affiliate/cj-sync");
    const result = await syncCommissions(dateFrom, dateTo);

    return NextResponse.json({ success: true, ...result, dateFrom, dateTo });
  } catch (error) {
    console.warn("[commission-sync] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Commission sync failed" }, { status: 500 });
  }
});
