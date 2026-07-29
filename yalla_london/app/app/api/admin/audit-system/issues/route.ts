/**
 * Audit System — Issues List Route
 *
 * GET: List issues with filters (severity, category, status, url search)
 * Supports pagination and sorting.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { getAuditIssues } = await import("@/lib/audit-system/db-adapter");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ?? getDefaultSiteId();
    const runId = request.nextUrl.searchParams.get("runId") ?? undefined;
    const severity =
      request.nextUrl.searchParams.get("severity") ?? undefined;
    const category =
      request.nextUrl.searchParams.get("category") ?? undefined;
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
    const sortBy =
      request.nextUrl.searchParams.get("sortBy") ?? "severity";
    const sortOrder =
      (request.nextUrl.searchParams.get("sortOrder") as "asc" | "desc") ??
      "asc";

    const result = await getAuditIssues({
      siteId,
      runId,
      severity,
      category,
      status,
      urlSearch,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[audit-system] Issues GET error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch issues" },
      { status: 500 }
    );
  }
}
