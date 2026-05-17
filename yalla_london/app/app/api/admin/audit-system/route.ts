/**
 * Audit System — Main API Route
 *
 * GET: Health overview + latest run + audit history for a site
 * POST: Trigger a new audit run (manual)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { getSiteHealthOverview, getAuditRunHistory } = await import(
      "@/lib/audit-system/db-adapter"
    );

    const siteId =
      request.nextUrl.searchParams.get("siteId") ?? getDefaultSiteId();
    const historyLimit = parseInt(
      request.nextUrl.searchParams.get("historyLimit") ?? "10",
      10
    );

    const [overview, history] = await Promise.all([
      getSiteHealthOverview(siteId),
      getAuditRunHistory(siteId, historyLimit),
    ]);

    return NextResponse.json({
      success: true,
      overview,
      history,
    });
  } catch (error) {
    console.error("[audit-system] GET error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const siteId = body.siteId ?? getDefaultSiteId();
    const mode = body.mode ?? "full";

    const { getActiveAuditRun, createAuditRun } = await import(
      "@/lib/audit-system/db-adapter"
    );

    // Check for existing active run
    const activeRun = await getActiveAuditRun(siteId);
    if (activeRun) {
      return NextResponse.json(
        {
          success: false,
          error: "An audit is already running for this site",
          activeRunId: activeRun.id,
          activeRunStatus: activeRun.status,
        },
        { status: 409 }
      );
    }

    const runId = await createAuditRun(siteId, mode, "manual");

    return NextResponse.json({
      success: true,
      runId,
      message: `Audit triggered for ${siteId} (${mode} mode). The cron will pick it up within 15 minutes, or you can poll the status.`,
    });
  } catch (error) {
    console.error("[audit-system] POST error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to trigger audit" },
      { status: 500 }
    );
  }
}
