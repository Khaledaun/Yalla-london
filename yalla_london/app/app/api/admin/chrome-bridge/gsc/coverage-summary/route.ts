/**
 * GET /api/admin/chrome-bridge/gsc/coverage-summary?siteId=X
 *
 * Coverage report derived from URLIndexingStatus DB table (which GSC writes
 * to via gsc-sync cron + direct inspection). GSC's Coverage report UI is NOT
 * available via API — this is the best we can do.
 *
 * Aggregates URLs by status + coverage_state + indexing_state and surfaces:
 *   - Indexed count / rate
 *   - Top 10 coverage_state buckets with counts (e.g., "Crawled — currently
 *     not indexed" is a Google quality signal)
 *   - URLs with submission_attempts ≥ 15 (chronic failures)
 *   - URLs with 5+ submission attempts but not indexed (recent struggles)
 *   - URLs deindexed (regressions)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import type { Finding, InterpretedAction } from "@/lib/chrome-bridge/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();

    const [
      statusGroups,
      coverageGroups,
      indexingStateGroups,
      chronicFailures,
      recentStruggles,
      deindexed,
      totalTracked,
    ] = await Promise.all([
      prisma.uRLIndexingStatus.groupBy({
        by: ["status"],
        where: { site_id: siteId },
        _count: { _all: true },
      }),
      prisma.uRLIndexingStatus.groupBy({
        by: ["coverage_state"],
        where: { site_id: siteId, coverage_state: { not: null } },
        _count: { _all: true },
        take: 30,
      }),
      prisma.uRLIndexingStatus.groupBy({
        by: ["indexing_state"],
        where: { site_id: siteId, indexing_state: { not: null } },
        _count: { _all: true },
        take: 15,
      }),
      prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          submission_attempts: { gte: 15 },
          status: { notIn: ["indexed"] },
        },
        orderBy: { submission_attempts: "desc" },
        take: 30,
        select: {
          url: true,
          status: true,
          coverage_state: true,
          submission_attempts: true,
          last_error: true,
          last_inspected_at: true,
        },
      }),
      prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          submission_attempts: { gte: 5, lt: 15 },
          status: { notIn: ["indexed"] },
        },
        orderBy: { submission_attempts: "desc" },
        take: 30,
        select: {
          url: true,
          status: true,
          coverage_state: true,
          submission_attempts: true,
          last_error: true,
        },
      }),
      prisma.uRLIndexingStatus.findMany({
        where: { site_id: siteId, status: "deindexed" },
        orderBy: { last_inspected_at: "desc" },
        take: 20,
        select: {
          url: true,
          coverage_state: true,
          last_inspected_at: true,
        },
      }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId } }),
    ]);

    const indexedCount = statusGroups.find((g) => g.status === "indexed")?._count._all ?? 0;
    const submittedCount = statusGroups.find((g) => g.status === "submitted")?._count._all ?? 0;
    const discoveredCount = statusGroups.find((g) => g.status === "discovered")?._count._all ?? 0;
    const errorCount = statusGroups.find((g) => g.status === "error")?._count._all ?? 0;
    const deindexedCount = statusGroups.find((g) => g.status === "deindexed")?._count._all ?? 0;
    const indexingRate = totalTracked > 0 ? indexedCount / totalTracked : 0;

    const findings: Finding[] = [];
    const actions: InterpretedAction[] = [];

    // Chronic failures (15+ attempts)
    if (chronicFailures.length > 0) {
      findings.push({
        pillar: "technical",
        issue: `${chronicFailures.length} URLs with ≥15 IndexNow submission attempts without indexing`,
        severity: "critical",
        evidence: `Top examples: ${chronicFailures.slice(0, 3).map((c) => c.url).join(", ")}`,
      });
      actions.push({
        action: "Manually inspect chronic-failure URLs in GSC. Check for 'Crawled — currently not indexed' (quality gate) vs 'Blocked by robots.txt' vs 'Canonical mismatch'. Content fixes needed, not more submissions.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "medium",
      });
    }

    // Recent struggles (5-14 attempts)
    if (recentStruggles.length > 5) {
      findings.push({
        pillar: "technical",
        issue: `${recentStruggles.length} URLs with 5-14 submission attempts — not yet chronic, but struggling`,
        severity: "warning",
      });
    }

    // Deindexed pages
    if (deindexedCount > 0) {
      findings.push({
        pillar: "technical",
        issue: `${deindexedCount} URLs were indexed but have been deindexed`,
        severity: "critical",
        evidence: `Top examples: ${deindexed.slice(0, 3).map((d) => d.url).join(", ")}`,
      });
      actions.push({
        action: "Investigate deindexing cause per URL: thin content auto-unpublish? Manual action? Quality gate failure? Some may be intentional (duplicate consolidation), others may need re-submission.",
        priority: "critical",
        autoFixable: false,
        estimatedEffort: "medium",
      });
    }

    // Low indexing rate
    if (totalTracked >= 20 && indexingRate < 0.5) {
      findings.push({
        pillar: "technical",
        issue: `Indexing rate ${(indexingRate * 100).toFixed(1)}% is below 50% threshold`,
        severity: "warning",
        metric: { name: "indexing_rate", value: `${(indexingRate * 100).toFixed(1)}%`, benchmark: "≥70%" },
      });
    }

    // "Crawled — currently not indexed" detection
    const crawledNotIndexed = coverageGroups.find(
      (c) =>
        typeof c.coverage_state === "string" &&
        c.coverage_state.toLowerCase().includes("crawled") &&
        c.coverage_state.toLowerCase().includes("not indexed"),
    );
    if (crawledNotIndexed && crawledNotIndexed._count._all >= 5) {
      findings.push({
        pillar: "technical",
        issue: `${crawledNotIndexed._count._all} URLs have "Crawled — currently not indexed" coverage state`,
        severity: "critical",
        evidence: "This is Google's quality-gate signal. Pages are discovered + crawled but fail assessment.",
      });
      actions.push({
        action: "Audit these pages for: thin content (<500w), authenticity signals, E-E-A-T markers (author bio, dates), first-hand experience, internal link support. This is a systemic quality issue, not an indexing issue.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "medium",
        relatedKG: "KG-058",
      });
    }

    return NextResponse.json({
      success: true,
      siteId,
      summary: {
        totalTracked,
        indexed: indexedCount,
        submitted: submittedCount,
        discovered: discoveredCount,
        error: errorCount,
        deindexed: deindexedCount,
        indexingRate: Number(indexingRate.toFixed(3)),
        indexingRatePct: `${(indexingRate * 100).toFixed(1)}%`,
      },
      statusGroups,
      coverageStateBuckets: coverageGroups
        .map((c) => ({
          coverageState: c.coverage_state,
          count: c._count._all,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      indexingStateBuckets: indexingStateGroups.map((i) => ({
        indexingState: i.indexing_state,
        count: i._count._all,
      })),
      chronicFailures,
      recentStruggles,
      deindexed,
      findings,
      interpretedActions: actions,
      note: "GSC Coverage Report UI is NOT available via API. This summary uses URLIndexingStatus DB data (populated by gsc-sync cron + live URL inspections). For full UI coverage details, open Search Console directly.",
      _hints: buildHints({ justCalled: "gsc-coverage" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/gsc/coverage-summary]", message);
    return NextResponse.json(
      { error: "Failed to build coverage summary", details: message },
      { status: 500 },
    );
  }
}
