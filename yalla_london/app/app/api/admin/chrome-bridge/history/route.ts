/**
 * GET /api/admin/chrome-bridge/history?siteId=X&pageUrl=X&auditType=per_page&limit=20
 *
 * Audit memory loop. Returns chronological history of ChromeAuditReport rows
 * for a specific URL or audit target, so Claude Chrome can compare "what was
 * flagged last month" vs "what's still there now" and measure fix impact.
 *
 * Filters:
 *   - siteId   — required when pageUrl not provided (returns site-wide history)
 *   - pageUrl  — if provided, exact URL match
 *   - auditType — optional: per_page | sitewide | action_log_triage | offsite
 *   - limit    — max rows (default 20, max 100)
 *
 * Returns: timeline (newest first) + quick findings-delta summary comparing
 * the two most recent reports.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const pageUrl = request.nextUrl.searchParams.get("pageUrl") ?? undefined;
    const siteId =
      request.nextUrl.searchParams.get("siteId") ??
      (pageUrl ? undefined : getDefaultSiteId());
    const auditType = request.nextUrl.searchParams.get("auditType") ?? undefined;
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "20", 10),
      100,
    );

    const where: Record<string, unknown> = {};
    if (siteId) where.siteId = siteId;
    if (pageUrl) where.pageUrl = pageUrl;
    if (auditType) where.auditType = auditType;

    const reports = await prisma.chromeAuditReport.findMany({
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
        findings: true,
        interpretedActions: true,
        uploadedAt: true,
        reviewedAt: true,
        fixedAt: true,
        agentTaskId: true,
        uploadedBy: true,
      },
    });

    // Build a simple delta between the two most recent per-URL reports so
    // Claude Chrome can see which findings repeat vs which got resolved.
    let delta: {
      resolved: string[];
      recurring: string[];
      newFindings: string[];
      latestAt: string | null;
      previousAt: string | null;
    } | null = null;

    if (pageUrl && reports.length >= 2) {
      const latest = reports[0];
      const previous = reports[1];
      const latestIssues = extractIssueKeys(latest.findings);
      const previousIssues = extractIssueKeys(previous.findings);
      delta = {
        resolved: [...previousIssues].filter((k) => !latestIssues.has(k)),
        recurring: [...latestIssues].filter((k) => previousIssues.has(k)),
        newFindings: [...latestIssues].filter((k) => !previousIssues.has(k)),
        latestAt: latest.uploadedAt.toISOString(),
        previousAt: previous.uploadedAt.toISOString(),
      };
    }

    // Aggregate quick stats
    const statusCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    for (const r of reports) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
      severityCounts[r.severity] = (severityCounts[r.severity] ?? 0) + 1;
    }

    const fixedCount = reports.filter((r) => r.status === "fixed").length;
    const newCount = reports.filter((r) => r.status === "new").length;
    const fixRate = reports.length > 0 ? fixedCount / reports.length : 0;

    return NextResponse.json({
      success: true,
      siteId: siteId ?? "all",
      pageUrl: pageUrl ?? null,
      auditType: auditType ?? "all",
      count: reports.length,
      statusCounts,
      severityCounts,
      fixRate: Number(fixRate.toFixed(3)),
      delta,
      timeline: reports,
      _hints: buildHints({ justCalled: "history" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/history]", message);
    return NextResponse.json(
      { error: "Failed to load audit history", details: message },
      { status: 500 },
    );
  }
}

/**
 * Build a stable set of keys from a findings JSON array so we can diff two
 * audits. Key format: `<pillar>:<issue-normalized>`.
 */
function extractIssueKeys(findings: unknown): Set<string> {
  const keys = new Set<string>();
  if (!Array.isArray(findings)) return keys;
  for (const f of findings) {
    if (!f || typeof f !== "object") continue;
    const record = f as Record<string, unknown>;
    const pillar = typeof record.pillar === "string" ? record.pillar : "unknown";
    const issue = typeof record.issue === "string" ? record.issue : "";
    if (!issue) continue;
    const normalized = issue
      .toLowerCase()
      .replace(/\d+(\.\d+)?%?/g, "N") // numbers collapse to 'N' so "CTR 0.8%" and "CTR 1.2%" match
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    keys.add(`${pillar}:${normalized}`);
  }
  return keys;
}
