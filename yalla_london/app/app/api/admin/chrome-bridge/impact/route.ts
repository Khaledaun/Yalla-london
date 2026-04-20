/**
 * GET /api/admin/chrome-bridge/impact?reportId=X  — single-audit impact
 * GET /api/admin/chrome-bridge/impact?siteId=X&days=30  — aggregate view
 *
 * Measures CTR / bounce / position / affiliate-click delta for the 7 (and 14
 * and 30) days BEFORE vs AFTER a ChromeAuditReport was marked `fixed`.
 *
 * Closes the learning loop: Claude Chrome sees which past audit fixes worked,
 * which had no effect, and which regressed — and updates its future
 * recommendations accordingly.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_DAYS = [7, 14, 30] as const;

interface Window {
  clicks: number;
  impressions: number;
  avgCtr: number;
  avgPosition: number;
  affiliateClicks: number;
  commissionTotal: number;
  dayCount: number;
}

interface ImpactSummary {
  reportId: string;
  siteId: string;
  pageUrl: string;
  auditType: string;
  severity: string;
  fixedAt: string | null;
  daysWithData: number;
  window7d?: { before: Window; after: Window; delta: DeltaSummary };
  window14d?: { before: Window; after: Window; delta: DeltaSummary };
  window30d?: { before: Window; after: Window; delta: DeltaSummary };
  verdict: "confirmed_improvement" | "no_change" | "regression" | "insufficient_data";
}

interface DeltaSummary {
  ctrDelta: number;
  ctrLift: number;
  positionDelta: number;
  clicksDelta: number;
  impressionsDelta: number;
  affiliateClicksDelta: number;
  commissionDelta: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const reportIdParam = request.nextUrl.searchParams.get("reportId") ?? undefined;

    if (reportIdParam) {
      const report = await prisma.chromeAuditReport.findUnique({
        where: { id: reportIdParam },
      });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const impact = await computeImpact(report);
      return NextResponse.json({
        success: true,
        mode: "single",
        impact,
        _hints: buildHints({ justCalled: "impact" }),
      });
    }

    // Aggregate mode
    const siteId = request.nextUrl.searchParams.get("siteId") ?? undefined;
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      180,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      status: "fixed",
      fixedAt: { gte: since, not: null },
    };
    if (siteId) where.siteId = siteId;

    const reports = await prisma.chromeAuditReport.findMany({
      where,
      orderBy: { fixedAt: "desc" },
      take: 50,
    });

    const impacts: ImpactSummary[] = [];
    for (const report of reports) {
      const impact = await computeImpact(report);
      if (impact) impacts.push(impact);
    }

    const verdictCounts: Record<string, number> = {
      confirmed_improvement: 0,
      no_change: 0,
      regression: 0,
      insufficient_data: 0,
    };
    for (const i of impacts) {
      verdictCounts[i.verdict] = (verdictCounts[i.verdict] ?? 0) + 1;
    }

    const improvementRate =
      impacts.length > 0
        ? verdictCounts.confirmed_improvement /
          (impacts.length - (verdictCounts.insufficient_data ?? 0))
        : 0;

    return NextResponse.json({
      success: true,
      mode: "aggregate",
      siteId: siteId ?? "all",
      dateRange: { days },
      summary: {
        fixesMeasured: impacts.length,
        verdictCounts,
        improvementRate: Number((improvementRate || 0).toFixed(3)),
      },
      impacts,
      _hints: buildHints({ justCalled: "impact" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/impact]", message);
    return NextResponse.json(
      { error: "Failed to compute impact", details: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Per-report impact computation
// ---------------------------------------------------------------------------

async function computeImpact(report: {
  id: string;
  siteId: string;
  pageUrl: string;
  auditType: string;
  severity: string;
  status: string;
  fixedAt: Date | null;
  pageSlug: string | null;
}): Promise<ImpactSummary | null> {
  if (!report.fixedAt) {
    return {
      reportId: report.id,
      siteId: report.siteId,
      pageUrl: report.pageUrl,
      auditType: report.auditType,
      severity: report.severity,
      fixedAt: null,
      daysWithData: 0,
      verdict: "insufficient_data",
    };
  }

  const { prisma } = await import("@/lib/db");
  const fixedAt = report.fixedAt;
  const now = Date.now();
  const daysSinceFix = Math.floor((now - fixedAt.getTime()) / (24 * 60 * 60 * 1000));

  const summary: ImpactSummary = {
    reportId: report.id,
    siteId: report.siteId,
    pageUrl: report.pageUrl,
    auditType: report.auditType,
    severity: report.severity,
    fixedAt: fixedAt.toISOString(),
    daysWithData: daysSinceFix,
    verdict: "insufficient_data",
  };

  // Can't measure a fix that hasn't had time to show results
  if (daysSinceFix < 3) {
    return summary;
  }

  // Only per_page and sitewide audits tie to a URL
  if (report.auditType === "action_log_triage") {
    return summary;
  }

  const sid = report.pageSlug ? `${report.siteId}_${report.pageSlug}` : null;
  const siteFilter = { OR: [{ siteId: report.siteId }, { siteId: null }] };

  for (const windowDays of WINDOW_DAYS) {
    if (daysSinceFix < windowDays) continue;

    const beforeStart = new Date(fixedAt.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const afterEnd = new Date(fixedAt.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const [gscBefore, gscAfter, clicksBefore, clicksAfter, commsBefore, commsAfter] =
      await Promise.all([
        prisma.gscPagePerformance.aggregate({
          where: {
            site_id: report.siteId,
            url: report.pageUrl,
            date: { gte: beforeStart, lt: fixedAt },
          },
          _sum: { clicks: true, impressions: true },
          _avg: { ctr: true, position: true },
          _count: { _all: true },
        }),
        prisma.gscPagePerformance.aggregate({
          where: {
            site_id: report.siteId,
            url: report.pageUrl,
            date: { gte: fixedAt, lt: afterEnd },
          },
          _sum: { clicks: true, impressions: true },
          _avg: { ctr: true, position: true },
          _count: { _all: true },
        }),
        sid
          ? prisma.cjClickEvent.count({
              where: {
                ...siteFilter,
                sessionId: sid,
                createdAt: { gte: beforeStart, lt: fixedAt },
              },
            })
          : Promise.resolve(0),
        sid
          ? prisma.cjClickEvent.count({
              where: {
                ...siteFilter,
                sessionId: sid,
                createdAt: { gte: fixedAt, lt: afterEnd },
              },
            })
          : Promise.resolve(0),
        sid
          ? prisma.cjCommission.findMany({
              where: { ...siteFilter, eventDate: { gte: beforeStart, lt: fixedAt } },
              select: { commissionAmount: true, metadata: true },
            })
          : Promise.resolve([]),
        sid
          ? prisma.cjCommission.findMany({
              where: { ...siteFilter, eventDate: { gte: fixedAt, lt: afterEnd } },
              select: { commissionAmount: true, metadata: true },
            })
          : Promise.resolve([]),
      ]);

    const filteredCommsBefore = sid
      ? commsBefore.filter((c) => {
          const meta = (c.metadata as Record<string, unknown> | null) ?? {};
          return typeof meta.sid === "string" && meta.sid === sid;
        })
      : [];
    const filteredCommsAfter = sid
      ? commsAfter.filter((c) => {
          const meta = (c.metadata as Record<string, unknown> | null) ?? {};
          return typeof meta.sid === "string" && meta.sid === sid;
        })
      : [];

    const before: Window = {
      clicks: gscBefore._sum.clicks ?? 0,
      impressions: gscBefore._sum.impressions ?? 0,
      avgCtr: gscBefore._avg.ctr ?? 0,
      avgPosition: gscBefore._avg.position ?? 0,
      affiliateClicks: clicksBefore,
      commissionTotal: filteredCommsBefore.reduce(
        (s, c) => s + (c.commissionAmount ?? 0),
        0,
      ),
      dayCount: gscBefore._count._all ?? 0,
    };
    const after: Window = {
      clicks: gscAfter._sum.clicks ?? 0,
      impressions: gscAfter._sum.impressions ?? 0,
      avgCtr: gscAfter._avg.ctr ?? 0,
      avgPosition: gscAfter._avg.position ?? 0,
      affiliateClicks: clicksAfter,
      commissionTotal: filteredCommsAfter.reduce(
        (s, c) => s + (c.commissionAmount ?? 0),
        0,
      ),
      dayCount: gscAfter._count._all ?? 0,
    };

    const delta: DeltaSummary = {
      ctrDelta: Number((after.avgCtr - before.avgCtr).toFixed(4)),
      ctrLift: before.avgCtr > 0 ? Number(((after.avgCtr - before.avgCtr) / before.avgCtr).toFixed(3)) : 0,
      positionDelta: Number((after.avgPosition - before.avgPosition).toFixed(2)),
      clicksDelta: after.clicks - before.clicks,
      impressionsDelta: after.impressions - before.impressions,
      affiliateClicksDelta: after.affiliateClicks - before.affiliateClicks,
      commissionDelta: Number((after.commissionTotal - before.commissionTotal).toFixed(2)),
    };

    const windowKey = `window${windowDays}d` as "window7d" | "window14d" | "window30d";
    summary[windowKey] = { before, after, delta };
  }

  // Verdict based on 7-day window (primary), escalated to 14/30d if available
  const primary = summary.window7d ?? summary.window14d ?? summary.window30d;
  if (!primary) {
    return summary;
  }

  const ctrImproved = primary.delta.ctrLift >= 0.1; // 10%+ CTR lift
  const ctrRegressed = primary.delta.ctrLift <= -0.1; // 10%+ drop
  const positionImproved = primary.delta.positionDelta <= -1; // moved up ≥1 position
  const positionRegressed = primary.delta.positionDelta >= 1;
  const revenueImproved = primary.delta.commissionDelta > 0.5;

  if (ctrImproved || positionImproved || revenueImproved) {
    summary.verdict = "confirmed_improvement";
  } else if (ctrRegressed || positionRegressed) {
    summary.verdict = "regression";
  } else if (primary.before.impressions + primary.after.impressions < 20) {
    summary.verdict = "insufficient_data";
  } else {
    summary.verdict = "no_change";
  }

  return summary;
}
