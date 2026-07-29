/**
 * Audit System — Single Run Detail Route
 *
 * GET: Full run detail with issues (paginated)
 * PUT: Update issue lifecycle status (open/ignored/fixed/wontfix)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { runId } = await params;
    const siteId =
      request.nextUrl.searchParams.get("siteId") ?? getDefaultSiteId();
    const { getAuditRun, getAuditIssues } = await import(
      "@/lib/audit-system/db-adapter"
    );

    const run = await getAuditRun(runId, siteId);
    if (!run) {
      return NextResponse.json(
        { success: false, error: "Audit run not found" },
        { status: 404 }
      );
    }

    // Parse query params for issue filtering
    const severity = request.nextUrl.searchParams.get("severity") ?? undefined;
    const category = request.nextUrl.searchParams.get("category") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const urlSearch =
      request.nextUrl.searchParams.get("urlSearch") ?? undefined;
    const page = parseInt(
      request.nextUrl.searchParams.get("page") ?? "1",
      10
    );
    const limit = parseInt(
      request.nextUrl.searchParams.get("limit") ?? "50",
      10
    );

    const issueResult = await getAuditIssues({
      siteId: run.siteId,
      runId,
      severity,
      category,
      status,
      urlSearch,
      page,
      limit,
    });

    // Only include large markdown blobs if explicitly requested
    const includeReport = request.nextUrl.searchParams.get("include") === "report";

    return NextResponse.json({
      success: true,
      run: {
        id: run.id,
        siteId: run.siteId,
        status: run.status,
        mode: run.mode,
        triggeredBy: run.triggeredBy,
        totalUrls: run.totalUrls,
        processedUrls: run.processedUrls,
        currentBatch: run.currentBatch,
        totalBatches: run.totalBatches,
        totalIssues: run.totalIssues,
        p0Count: run.p0Count,
        p1Count: run.p1Count,
        p2Count: run.p2Count,
        healthScore: run.healthScore,
        hardGatesPassed: run.hardGatesPassed,
        hardGates: run.hardGatesJson,
        softGates: run.softGatesJson,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
        errorMessage: run.errorMessage,
        ...(includeReport ? {
          reportMarkdown: run.reportMarkdown,
          fixPlanMarkdown: run.fixPlanMarkdown,
        } : {}),
      },
      issues: issueResult.issues,
      pagination: issueResult.pagination,
    });
  } catch (error) {
    console.error("[audit-system] GET run error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit run" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // runId is in the URL but we use issueId from body for the update
    await params; // consume params to avoid Next.js warning

    const body = await request.json();
    const { issueId, status: newStatus, siteId } = body;

    if (!issueId || !newStatus) {
      return NextResponse.json(
        { success: false, error: "issueId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["open", "ignored", "fixed", "wontfix"];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { updateIssueStatus } = await import(
      "@/lib/audit-system/db-adapter"
    );

    await updateIssueStatus(issueId, newStatus, siteId || getDefaultSiteId());

    return NextResponse.json({
      success: true,
      message: `Issue ${issueId} updated to ${newStatus}`,
    });
  } catch (error) {
    console.error("[audit-system] PUT error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to update issue" },
      { status: 500 }
    );
  }
}
