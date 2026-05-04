/**
 * POST /api/admin/chrome-bridge/report
 * Upload a per-page, sitewide, or offsite audit report.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken, isBridgeTokenRequest } from "@/lib/agents/bridge-auth";
import { ReportUploadSchema } from "@/lib/chrome-bridge/types";
import {
  buildReportPath,
  extractSlugFromUrl,
  createAgentTaskForReport,
  logBridgeUpload,
  fireCeoInboxAlertIfCritical,
} from "@/lib/chrome-bridge/helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const bodyRaw = await request.json().catch(() => null);
    if (!bodyRaw) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = ReportUploadSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const payload = parsed.data;

    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");

    const activeSiteIds = getActiveSiteIds();
    if (!activeSiteIds.includes(payload.siteId)) {
      return NextResponse.json(
        { error: `Unknown siteId: ${payload.siteId}` },
        { status: 400 },
      );
    }

    const pageSlug = payload.pageSlug ?? extractSlugFromUrl(payload.pageUrl);
    const reportPath = buildReportPath(payload.siteId, payload.auditType, pageSlug);

    const highestSeverity = deriveSeverity(payload.findings, payload.severity);

    const report = await prisma.chromeAuditReport.create({
      data: {
        siteId: payload.siteId,
        pageUrl: payload.pageUrl,
        pageSlug,
        auditType: payload.auditType,
        severity: highestSeverity,
        status: "new",
        findings: payload.findings as unknown as object,
        interpretedActions: payload.interpretedActions as unknown as object,
        rawData: (payload.rawData ?? {}) as unknown as object,
        reportMarkdown: payload.reportMarkdown,
        reportPath,
        uploadedBy: isBridgeTokenRequest(request) ? "chrome-bridge" : "admin",
      },
      select: { id: true, uploadedAt: true },
    });

    const criticalOrHighCount = payload.interpretedActions.filter(
      (a) => a.priority === "critical" || a.priority === "high",
    ).length;
    const description =
      payload.auditType === "per_page"
        ? `Chrome audit: ${pageSlug} on ${payload.siteId} — ${payload.findings.length} findings, ${criticalOrHighCount} high-priority actions`
        : `Chrome ${payload.auditType} audit on ${payload.siteId} — ${payload.findings.length} findings`;

    const agentTaskId = await createAgentTaskForReport({
      reportId: report.id,
      siteId: payload.siteId,
      auditType: payload.auditType,
      severity: highestSeverity,
      pageUrl: payload.pageUrl,
      interpretedActions: payload.interpretedActions,
      description,
    });

    if (agentTaskId) {
      await prisma.chromeAuditReport.update({
        where: { id: report.id },
        data: { agentTaskId },
      });
    }

    await logBridgeUpload({
      siteId: payload.siteId,
      auditType: payload.auditType,
      severity: highestSeverity,
      findingsCount: payload.findings.length,
      reportId: report.id,
      viaBridgeToken: isBridgeTokenRequest(request),
    });

    await fireCeoInboxAlertIfCritical({
      reportId: report.id,
      siteId: payload.siteId,
      auditType: payload.auditType,
      severity: highestSeverity,
      pageUrl: payload.pageUrl,
      findingsCount: payload.findings.length,
      topFindingIssue: payload.findings[0]?.issue,
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      agentTaskId: agentTaskId ?? null,
      reportPath,
      severity: highestSeverity,
      findingsCount: payload.findings.length,
      actionsCount: payload.interpretedActions.length,
      uploadedAt: report.uploadedAt,
      viewerUrl: `/admin/chrome-audits?reportId=${report.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/report]", message);
    return NextResponse.json(
      { error: "Failed to save report", details: message },
      { status: 500 },
    );
  }
}

function deriveSeverity(
  findings: { severity?: string }[],
  fallback: string,
): string {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "warning")) return "warning";
  return fallback;
}
