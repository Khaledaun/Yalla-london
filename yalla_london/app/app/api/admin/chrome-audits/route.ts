/**
 * Admin API for Chrome audit reports viewer.
 * GET — list reports with filters
 * POST — admin actions: apply_fix (queue AgentTask), dismiss, mark_reviewed
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const siteId = request.nextUrl.searchParams.get("siteId") ?? undefined;
    const auditType = request.nextUrl.searchParams.get("auditType") ?? undefined;
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const reportId = request.nextUrl.searchParams.get("reportId") ?? undefined;
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "30", 10),
      100,
    );

    if (reportId) {
      const report = await prisma.chromeAuditReport.findUnique({
        where: { id: reportId },
      });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    const where: Record<string, unknown> = {};
    if (siteId) where.siteId = siteId;
    if (auditType) where.auditType = auditType;
    if (status) where.status = status;

    const [reports, counts] = await Promise.all([
      prisma.chromeAuditReport.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
        take: limit,
        select: {
          id: true,
          siteId: true,
          pageUrl: true,
          pageSlug: true,
          auditType: true,
          severity: true,
          status: true,
          uploadedAt: true,
          reviewedAt: true,
          fixedAt: true,
          agentTaskId: true,
        },
      }),
      prisma.chromeAuditReport.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      count: reports.length,
      reports,
      counts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/chrome-audits GET]", message);
    return NextResponse.json(
      { error: "Failed to load reports" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.action !== "string" || typeof body.reportId !== "string") {
      return NextResponse.json(
        { error: "Missing required: action, reportId" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/db");
    const report = await prisma.chromeAuditReport.findUnique({
      where: { id: body.reportId },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (body.action === "apply_fix") {
      // Queue the linked AgentTask (or create one if missing)
      let taskId = report.agentTaskId;
      if (!taskId) {
        const task = await prisma.agentTask.create({
          data: {
            agentType: "chrome-bridge",
            taskType: "page_audit_fix",
            priority: report.severity === "critical" ? "critical" : "high",
            status: "pending",
            description: `Apply fixes from Chrome audit ${report.id} (${report.pageSlug ?? report.pageUrl})`,
            input: {
              reportId: report.id,
              pageUrl: report.pageUrl,
              auditType: report.auditType,
              interpretedActions: report.interpretedActions,
            },
            siteId: report.siteId,
            assignedTo: "cli",
          },
        });
        taskId = task.id;
      }
      await Promise.all([
        prisma.agentTask.update({
          where: { id: taskId },
          data: { status: "pending", priority: report.severity === "critical" ? "critical" : "high" },
        }),
        prisma.chromeAuditReport.update({
          where: { id: report.id },
          data: { status: "fix_queued", agentTaskId: taskId, reviewedAt: new Date() },
        }),
      ]);
      return NextResponse.json({
        success: true,
        action: "apply_fix",
        agentTaskId: taskId,
        message: "Queued for Claude Code CLI pick-up",
      });
    }

    if (body.action === "dismiss") {
      await prisma.chromeAuditReport.update({
        where: { id: report.id },
        data: { status: "dismissed", reviewedAt: new Date() },
      });
      return NextResponse.json({ success: true, action: "dismiss" });
    }

    if (body.action === "mark_reviewed") {
      await prisma.chromeAuditReport.update({
        where: { id: report.id },
        data: { status: "reviewed", reviewedAt: new Date() },
      });
      return NextResponse.json({ success: true, action: "mark_reviewed" });
    }

    if (body.action === "mark_fixed") {
      await prisma.chromeAuditReport.update({
        where: { id: report.id },
        data: { status: "fixed", fixedAt: new Date() },
      });
      if (report.agentTaskId) {
        await prisma.agentTask
          .update({
            where: { id: report.agentTaskId },
            data: { status: "completed", completedAt: new Date() },
          })
          .catch((err) => {
            console.warn(
              "[admin/chrome-audits] agentTask completion update failed:",
              err instanceof Error ? err.message : String(err),
            );
          });
      }
      return NextResponse.json({ success: true, action: "mark_fixed" });
    }

    return NextResponse.json(
      { error: `Unknown action: ${body.action}` },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/chrome-audits POST]", message);
    return NextResponse.json(
      { error: "Failed to apply action", details: message },
      { status: 500 },
    );
  }
}
