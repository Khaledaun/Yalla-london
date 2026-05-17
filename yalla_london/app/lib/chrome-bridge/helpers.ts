/**
 * Claude Chrome Bridge — Shared helpers.
 *
 * DB writes for report uploads (ChromeAuditReport + AgentTask + CronJobLog).
 * No filesystem writes — Vercel serverless is read-only.
 * Markdown is stored in ChromeAuditReport.reportMarkdown and exported to git
 * on demand via CLI script or admin action (future v2).
 */

/**
 * Compute the conceptual file path under docs/chrome-audits/ for a report.
 * Not actually written at runtime; stored in ChromeAuditReport.reportPath
 * for future git export.
 */
export function buildReportPath(
  siteId: string,
  auditType: string,
  pageSlug?: string | null,
): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeSiteId = siteId.replace(/[^a-z0-9-]/gi, "-");

  if (auditType === "per_page") {
    const safeSlug = (pageSlug || "page").replace(/[^a-z0-9-]/gi, "-").slice(0, 100);
    return `docs/chrome-audits/${date}/${safeSiteId}/pages/${safeSlug}.md`;
  }
  if (auditType === "action_log_triage") {
    return `docs/chrome-audits/${date}/${safeSiteId}/action-log-triage.md`;
  }
  if (auditType === "offsite") {
    return `docs/chrome-audits/${date}/${safeSiteId}/offsite.md`;
  }
  // sitewide
  return `docs/chrome-audits/${date}/${safeSiteId}/sitewide.md`;
}

/**
 * Extract a slug from a URL for grouping.
 * https://site.com/blog/xyz -> xyz
 */
export function extractSlugFromUrl(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "homepage";
  } catch {
    return "unknown";
  }
}

/**
 * Create the AgentTask record that represents a queued "Apply Fix" candidate.
 * Called after a ChromeAuditReport is saved.
 */
export async function createAgentTaskForReport(params: {
  reportId: string;
  siteId: string;
  auditType: string;
  severity: string;
  pageUrl: string;
  interpretedActions: unknown[];
  description: string;
}): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const task = await prisma.agentTask.create({
      data: {
        agentType: "chrome-bridge",
        taskType:
          params.auditType === "action_log_triage" ? "action_log_triage" : "page_audit_fix",
        priority:
          params.severity === "critical"
            ? "critical"
            : params.severity === "warning"
              ? "high"
              : "medium",
        status: "pending",
        description: params.description,
        input: {
          reportId: params.reportId,
          pageUrl: params.pageUrl,
          auditType: params.auditType,
          interpretedActions: params.interpretedActions,
        },
        siteId: params.siteId,
        assignedTo: "cli", // Claude Code CLI picks these up
      },
    });
    return task.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[chrome-bridge] createAgentTaskForReport failed:", message);
    return null;
  }
}

/**
 * Log bridge upload to CronJobLog so it surfaces in cockpit & CEO Inbox.
 */
export async function logBridgeUpload(params: {
  siteId: string;
  auditType: string;
  severity: string;
  findingsCount: number;
  reportId: string;
  viaBridgeToken: boolean;
}): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const startedAt = new Date();
    await prisma.cronJobLog.create({
      data: {
        site_id: params.siteId,
        job_name: "chrome-bridge-upload",
        job_type: "bridge",
        status: "completed",
        started_at: startedAt,
        completed_at: startedAt,
        duration_ms: 0,
        items_processed: params.findingsCount,
        result_summary: {
          auditType: params.auditType,
          severity: params.severity,
          findingsCount: params.findingsCount,
          reportId: params.reportId,
          source: params.viaBridgeToken ? "bridge-token" : "admin-session",
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[chrome-bridge] logBridgeUpload failed:", message);
  }
}

/**
 * Fire a CEO Inbox alert when a critical-severity Chrome audit report is
 * uploaded. Writes to CronJobLog with job_name="ceo-inbox" so it surfaces in
 * the existing cockpit inbox panel without needing a new channel.
 */
export async function fireCeoInboxAlertIfCritical(params: {
  reportId: string;
  siteId: string;
  auditType: string;
  severity: string;
  pageUrl: string;
  findingsCount: number;
  topFindingIssue?: string;
}): Promise<void> {
  if (params.severity !== "critical") return;
  try {
    const { prisma } = await import("@/lib/db");
    const now = new Date();
    const summary = [
      `Claude Chrome flagged a CRITICAL issue on ${params.siteId}.`,
      `Page: ${params.pageUrl}`,
      `Audit type: ${params.auditType}`,
      `${params.findingsCount} finding${params.findingsCount === 1 ? "" : "s"}.`,
      params.topFindingIssue ? `Top: ${params.topFindingIssue.slice(0, 180)}` : "",
      `Review at /admin/chrome-audits?reportId=${params.reportId}`,
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.cronJobLog.create({
      data: {
        site_id: params.siteId,
        job_name: "ceo-inbox",
        job_type: "alert",
        status: "completed",
        started_at: now,
        completed_at: now,
        duration_ms: 0,
        result_summary: {
          source: "chrome-bridge",
          reportId: params.reportId,
          severity: "critical",
          pageUrl: params.pageUrl,
          auditType: params.auditType,
          summary,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[chrome-bridge] fireCeoInboxAlertIfCritical failed:", message);
  }
}

/**
 * Build a plain-English CEO Inbox summary for a batch of reports uploaded in
 * the last N minutes. Returns null if no recent uploads.
 */
export async function buildCeoInboxSummary(
  windowMinutes: number = 15,
): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const reports = await prisma.chromeAuditReport.findMany({
      where: { uploadedAt: { gte: since } },
      select: {
        siteId: true,
        auditType: true,
        severity: true,
        pageUrl: true,
      },
      take: 100,
    });
    if (reports.length === 0) return null;

    const bySite: Record<string, { critical: number; warning: number; info: number; total: number }> = {};
    for (const r of reports) {
      if (!bySite[r.siteId]) bySite[r.siteId] = { critical: 0, warning: 0, info: 0, total: 0 };
      bySite[r.siteId].total += 1;
      if (r.severity === "critical") bySite[r.siteId].critical += 1;
      else if (r.severity === "warning") bySite[r.siteId].warning += 1;
      else bySite[r.siteId].info += 1;
    }

    const lines: string[] = [
      `Claude Chrome uploaded ${reports.length} audit report${reports.length === 1 ? "" : "s"} in the last ${windowMinutes} min.`,
    ];
    for (const [siteId, counts] of Object.entries(bySite)) {
      const parts: string[] = [];
      if (counts.critical > 0) parts.push(`${counts.critical} critical`);
      if (counts.warning > 0) parts.push(`${counts.warning} warning`);
      if (counts.info > 0) parts.push(`${counts.info} info`);
      lines.push(`  • ${siteId}: ${parts.join(", ")} (${counts.total} total)`);
    }
    lines.push("");
    lines.push("Review at /admin/chrome-audits — tap 'Apply Fix' on actionable items.");
    return lines.join("\n");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[chrome-bridge] buildCeoInboxSummary failed:", message);
    return null;
  }
}
