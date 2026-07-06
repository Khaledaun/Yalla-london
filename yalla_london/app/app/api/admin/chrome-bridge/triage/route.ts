/**
 * POST /api/admin/chrome-bridge/triage
 * Upload an action-log triage report (cross-cron failure clustering).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken, isBridgeTokenRequest } from "@/lib/agents/bridge-auth";
import { TriageUploadSchema } from "@/lib/chrome-bridge/types";
import {
  buildReportPath,
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

    const parsed = TriageUploadSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const payload = parsed.data;

    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getDefaultSiteId } = await import("@/config/sites");

    const resolvedSiteId = payload.siteId ?? getDefaultSiteId();
    if (payload.siteId && !getActiveSiteIds().includes(payload.siteId)) {
      return NextResponse.json(
        { error: `Unknown siteId: ${payload.siteId}` },
        { status: 400 },
      );
    }

    const reportPath = buildReportPath(resolvedSiteId, "action_log_triage");
    const highestSeverity = deriveSeverity(payload.findings, payload.severity);

    const report = await prisma.chromeAuditReport.create({
      data: {
        siteId: resolvedSiteId,
        pageUrl: `triage://${resolvedSiteId}/${payload.periodHours}h`,
        pageSlug: "action-log-triage",
        auditType: "action_log_triage",
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

    const description = `Chrome action-log triage (${payload.periodHours}h) — ${payload.findings.length} findings, ${payload.interpretedActions.length} proposed fixes`;

    const agentTaskId = await createAgentTaskForReport({
      reportId: report.id,
      siteId: resolvedSiteId,
      auditType: "action_log_triage",
      severity: highestSeverity,
      pageUrl: `triage://${resolvedSiteId}/${payload.periodHours}h`,
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
      siteId: resolvedSiteId,
      auditType: "action_log_triage",
      severity: highestSeverity,
      findingsCount: payload.findings.length,
      reportId: report.id,
      viaBridgeToken: isBridgeTokenRequest(request),
    });

    await fireCeoInboxAlertIfCritical({
      reportId: report.id,
      siteId: resolvedSiteId,
      auditType: "action_log_triage",
      severity: highestSeverity,
      pageUrl: `triage://${resolvedSiteId}/${payload.periodHours}h`,
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
    console.error("[chrome-bridge/triage]", message);
    return NextResponse.json(
      { error: "Failed to save triage", details: message },
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
