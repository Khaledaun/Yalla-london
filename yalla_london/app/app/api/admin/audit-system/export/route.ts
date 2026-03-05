/**
 * Audit System — Export Route
 *
 * GET: Export audit data as JSON or CSV
 * Params: siteId, format (json|csv), runId (optional)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ?? getDefaultSiteId();
    const format = request.nextUrl.searchParams.get("format") ?? "json";
    const runId = request.nextUrl.searchParams.get("runId") ?? undefined;

    // Get the run (latest completed or specific)
    const run = runId
      ? await prisma.auditRun.findUnique({ where: { id: runId } })
      : await prisma.auditRun.findFirst({
          where: { siteId, status: "completed" },
          orderBy: { completedAt: "desc" },
        });

    if (!run) {
      return NextResponse.json(
        { success: false, error: "No completed audit run found" },
        { status: 404 }
      );
    }

    // Get all issues for this run
    const issues = await prisma.auditIssue.findMany({
      where: { auditRunId: run.id },
      orderBy: [{ severity: "asc" }, { category: "asc" }],
    });

    if (format === "csv") {
      const csvRows = [
        // Header
        [
          "Severity",
          "Category",
          "URL",
          "Title",
          "Status",
          "First Detected",
          "Detection Count",
        ].join(","),
        // Data rows
        ...issues.map((issue) =>
          [
            issue.severity,
            issue.category,
            `"${issue.url}"`,
            `"${issue.title.replace(/"/g, '""')}"`,
            issue.status,
            issue.firstDetectedAt.toISOString(),
            issue.detectionCount,
          ].join(",")
        ),
      ];

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-${siteId}-${run.id}.csv"`,
        },
      });
    }

    // Default: JSON
    return NextResponse.json({
      success: true,
      run: {
        id: run.id,
        siteId: run.siteId,
        status: run.status,
        mode: run.mode,
        triggeredBy: run.triggeredBy,
        totalUrls: run.totalUrls,
        totalIssues: run.totalIssues,
        healthScore: run.healthScore,
        hardGatesPassed: run.hardGatesPassed,
        hardGates: run.hardGatesJson,
        softGates: run.softGatesJson,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
      },
      issues: issues.map((issue) => ({
        id: issue.id,
        severity: issue.severity,
        category: issue.category,
        url: issue.url,
        title: issue.title,
        description: issue.description,
        evidence: issue.evidence,
        suggestedFix: issue.suggestedFix,
        status: issue.status,
        fingerprint: issue.fingerprint,
        firstDetectedAt: issue.firstDetectedAt.toISOString(),
        lastDetectedAt: issue.lastDetectedAt.toISOString(),
        detectionCount: issue.detectionCount,
      })),
      reportMarkdown: run.reportMarkdown,
      fixPlanMarkdown: run.fixPlanMarkdown,
    });
  } catch (error) {
    console.error("[audit-system] Export error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to export audit data" },
      { status: 500 }
    );
  }
}
