/**
 * Affiliate Alerts API — Actionable alerts
 * GET /api/affiliate/analytics/alerts
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const { getAlerts } = await import("@/lib/affiliate/analytics");
    const alerts = await getAlerts();

    return NextResponse.json({ success: true, alerts, count: alerts.length });
  } catch (error) {
    console.warn("[affiliate-alerts] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch alerts" }, { status: 500 });
  }
});
