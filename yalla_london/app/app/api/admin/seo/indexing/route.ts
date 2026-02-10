export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * GET /api/admin/seo/indexing
 *
 * Returns indexing history, current status, and submission logs.
 *
 * Query params:
 *   ?type=history  — all indexing reports (default)
 *   ?type=latest   — latest report only
 *   ?type=stats    — aggregated statistics
 *   ?limit=N       — max reports to return (default: 20)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const type = request.nextUrl.searchParams.get("type") || "history";
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "20", 10),
    100,
  );

  try {
    const { prisma } = await import("@/lib/db");

    if (type === "latest") {
      const latest = await prisma.seoReport.findFirst({
        where: {
          reportType: { in: ["indexing_audit", "indexing_submission"] },
        },
        orderBy: { generatedAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        report: latest
          ? {
              id: latest.id,
              type: latest.reportType,
              date: latest.generatedAt,
              data: latest.data,
            }
          : null,
      });
    }

    if (type === "stats") {
      // Get all indexing reports for aggregation
      const reports = await prisma.seoReport.findMany({
        where: {
          reportType: { in: ["indexing_audit", "indexing_submission"] },
        },
        orderBy: { generatedAt: "desc" },
        take: 100,
      });

      // Aggregate stats
      const submissions = reports.filter(
        (r) => r.reportType === "indexing_submission",
      );
      const audits = reports.filter(
        (r) => r.reportType === "indexing_audit",
      );

      // Get the latest inspection data for current indexed count
      const latestWithInspection = reports.find((r) => {
        const data = r.data as any;
        return data?.inspected > 0;
      });

      const latestSubmission = submissions[0];
      const latestSubmissionData = latestSubmission?.data as any;

      // Calculate total URLs submitted across all submissions
      let totalGoogleSubmitted = 0;
      let totalIndexNowSubmitted = 0;
      let lastSuccessfulSubmission: Date | null = null;

      for (const s of submissions) {
        const d = s.data as any;
        if (d?.submission?.googleApi?.submitted) {
          totalGoogleSubmitted += d.submission.googleApi.submitted;
        }
        if (d?.submission?.indexNow?.submitted) {
          totalIndexNowSubmitted += d.submission.indexNow.submitted;
        }
        if (
          d?.submission?.googleApi?.status === "success" &&
          !lastSuccessfulSubmission
        ) {
          lastSuccessfulSubmission = s.generatedAt;
        }
      }

      const latestInspectionData = latestWithInspection?.data as any;

      return NextResponse.json({
        success: true,
        stats: {
          totalReports: reports.length,
          totalSubmissions: submissions.length,
          totalAudits: audits.length,
          totalGoogleSubmitted,
          totalIndexNowSubmitted,
          lastSubmission: latestSubmission?.generatedAt || null,
          lastSuccessfulSubmission,
          latestSnapshot: latestInspectionData
            ? {
                totalPages: latestInspectionData.totalPages,
                inspected: latestInspectionData.inspected,
                indexed: latestInspectionData.indexed,
                notIndexed: latestInspectionData.notIndexed,
                date: latestWithInspection?.generatedAt,
              }
            : null,
          latestSubmissionResult: latestSubmissionData?.submission || null,
          // Timeline: last 10 submissions with key metrics
          timeline: submissions.slice(0, 10).map((s) => {
            const d = s.data as any;
            return {
              date: s.generatedAt,
              mode: d?.mode,
              totalPages: d?.totalPages,
              googleSubmitted: d?.submission?.googleApi?.submitted || 0,
              googleStatus: d?.submission?.googleApi?.status || "unknown",
              indexNowSubmitted: d?.submission?.indexNow?.submitted || 0,
              indexNowStatus: d?.submission?.indexNow?.status || "unknown",
            };
          }),
        },
      });
    }

    // Default: history
    const reports = await prisma.seoReport.findMany({
      where: {
        reportType: { in: ["indexing_audit", "indexing_submission"] },
      },
      orderBy: { generatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      count: reports.length,
      reports: reports.map((r) => ({
        id: r.id,
        type: r.reportType,
        date: r.generatedAt,
        data: r.data,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch indexing data",
      },
      { status: 500 },
    );
  }
}
