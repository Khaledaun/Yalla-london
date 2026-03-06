/**
 * Public SEO Audit API — Perplexity-powered deep site analysis
 *
 * GET:  List past audit reports or get specific report
 * POST: Trigger new audit, execute action item, or mark action as skipped
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { runPerplexityAudit, type AuditReport } from "@/lib/seo/perplexity-audit";
import { generateAuditReportMarkdown, extractActionItems } from "@/lib/seo/perplexity-report";
import { getSiteConfig, getSiteDomain, getDefaultSiteId } from "@/config/sites";

// In-memory store for audit reports (use DB in production for persistence)
const auditReports: Map<string, AuditReport> = new Map();
const auditProgress: Map<string, { status: string; section: string; percent: number }> = new Map();

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") || "list";
  const siteId = searchParams.get("siteId") || getDefaultSiteId();

  try {
    if (action === "list") {
      // List all reports for site, newest first
      const reports = Array.from(auditReports.values())
        .filter((r) => r.siteId === siteId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          overallScore: r.overallScore,
          sectionCount: r.sections.length,
          totalFindings: r.sections.reduce((sum, s) => sum + s.findings.length, 0),
          estimatedCostUsd: r.estimatedCostUsd,
        }));

      return NextResponse.json({ reports, siteId });
    }

    if (action === "report") {
      const reportId = searchParams.get("reportId");
      if (!reportId) {
        return NextResponse.json({ error: "reportId required" }, { status: 400 });
      }

      const report = auditReports.get(reportId);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const markdown = generateAuditReportMarkdown(report);
      const actionItems = extractActionItems(report);

      return NextResponse.json({ report, markdown, actionItems });
    }

    if (action === "actions") {
      const reportId = searchParams.get("reportId");
      if (!reportId) {
        return NextResponse.json({ error: "reportId required" }, { status: 400 });
      }

      const report = auditReports.get(reportId);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const actionItems = extractActionItems(report);
      const severity = searchParams.get("severity");
      const filtered = severity
        ? actionItems.filter((a) => a.severity === severity)
        : actionItems;

      return NextResponse.json({ actionItems: filtered, total: actionItems.length });
    }

    if (action === "progress") {
      const auditId = searchParams.get("auditId");
      const progress = auditId ? auditProgress.get(auditId) : null;
      return NextResponse.json({ progress: progress || { status: "idle", section: "", percent: 0 } });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[seo-audit-public] GET error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  try {
    const body = await request.json();
    const action = body.action || "run_audit";

    if (action === "run_audit") {
      const siteId = body.siteId || getDefaultSiteId();
      const depth = body.depth || "standard";
      const siteConfig = getSiteConfig(siteId);

      if (!siteConfig) {
        return NextResponse.json({ error: `Site not found: ${siteId}` }, { status: 400 });
      }

      if (!process.env.PERPLEXITY_API_KEY) {
        return NextResponse.json(
          { error: "PERPLEXITY_API_KEY not configured. Add it to your environment variables." },
          { status: 400 }
        );
      }

      const auditId = `audit-${siteId}-${Date.now()}`;
      auditProgress.set(auditId, { status: "running", section: "Starting...", percent: 0 });

      // Run audit (this takes 2-5 minutes depending on depth)
      const domain = siteConfig.domain;

      try {
        const report = await runPerplexityAudit({ siteId, domain, depth });
        auditReports.set(report.id, report);
        auditProgress.set(auditId, { status: "completed", section: "Done", percent: 100 });

        // Store in DB if SeoAuditAction model exists
        try {
          const { prisma } = await import("@/lib/db");
          for (const section of report.sections) {
            for (const finding of section.findings) {
              await prisma.seoAuditAction.create({
                data: {
                  auditId: report.id,
                  siteId,
                  actionItemId: `${section.id}-${finding.title.slice(0, 50).replace(/\s+/g, "-").toLowerCase()}`,
                  severity: finding.severity,
                  category: section.id,
                  title: finding.title,
                  description: finding.description,
                  autoFixable: finding.autoFixable,
                  fixType: finding.fixType,
                  affectedUrls: finding.affectedUrls,
                  status: "pending",
                },
              }).catch(() => {
                // SeoAuditAction model may not exist yet — that's OK
              });
            }
          }
        } catch {
          // DB persistence is best-effort
        }

        return NextResponse.json({
          success: true,
          reportId: report.id,
          overallScore: report.overallScore,
          sectionsCompleted: report.sections.length,
          totalFindings: report.sections.reduce((sum, s) => sum + s.findings.length, 0),
          estimatedCostUsd: report.estimatedCostUsd,
        });
      } catch (error) {
        auditProgress.set(auditId, {
          status: "failed",
          section: error instanceof Error ? error.message : "Unknown error",
          percent: 0,
        });
        throw error;
      }
    }

    if (action === "skip_action") {
      const { actionId, reason } = body;
      if (!actionId) {
        return NextResponse.json({ error: "actionId required" }, { status: 400 });
      }

      try {
        const { prisma } = await import("@/lib/db");
        await prisma.seoAuditAction.update({
          where: { id: actionId },
          data: { status: "skipped", error: reason || "Skipped by admin" },
        });
        return NextResponse.json({ success: true });
      } catch {
        return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[seo-audit-public] POST error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
