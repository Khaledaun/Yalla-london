export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily SEO Audit Cron
 *
 * Runs the full public SEO health audit for ALL active sites once per day (4:30 AM UTC).
 * Saves each audit report to SeoAuditReport table with triggeredBy="scheduled".
 * Also generates a compact, action-oriented JSON summary saved in the report.
 *
 * Reports are viewable in the cockpit Sites tab → "Audit Reports" button.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 280_000;

async function handleDailySeoAudit(request: NextRequest) {
  const cronStart = Date.now();

  // Auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("daily-seo-audit");
  if (flagResponse) return flagResponse;

  const { prisma } = await import("@/lib/db");
  const { getActiveSiteIds, getSiteConfig, getSiteDomain } = await import("@/config/sites");
  const activeSiteIds = getActiveSiteIds();

  const results: Array<{
    siteId: string;
    healthScore: number;
    findings: number;
    critical: number;
    high: number;
    saved: boolean;
    error?: string;
  }> = [];

  // Process each site sequentially to avoid pool exhaustion
  for (const siteId of activeSiteIds) {
    if (Date.now() - cronStart > BUDGET_MS - 10_000) {
      results.push({ siteId, healthScore: 0, findings: 0, critical: 0, high: 0, saved: false, error: "Budget exceeded — skipped" });
      continue;
    }

    try {
      // Direct function call — avoids cross-function HTTP auth race conditions
      // (rule #100: never internal-fetch from a cron to itself).
      const { runAudit } = await import("@/app/api/admin/seo-audit/route");
      const auditData = (await runAudit(siteId)) as unknown as Record<string, unknown>;

      // Persist to SeoAuditReport (mirrors what the GET handler does on direct calls)
      try {
        await prisma.seoAuditReport.create({
          data: {
            siteId,
            healthScore: (auditData.healthScore as number) || 0,
            totalFindings: (auditData.totalFindings as number) || 0,
            criticalCount: (auditData.criticalCount as number) || 0,
            highCount: (auditData.highCount as number) || 0,
            mediumCount: (auditData.mediumCount as number) || 0,
            lowCount: (auditData.lowCount as number) || 0,
            report: auditData,
            summary: auditData.summary as string,
            triggeredBy: "scheduled",
          },
        });
      } catch (createErr) {
        console.warn(`[daily-seo-audit] Failed to persist report for ${siteId}:`, createErr instanceof Error ? createErr.message : createErr);
      }

      // Generate and attach the compact action-oriented JSON summary.
      const jsonSummary = buildActionSummary(auditData, siteId, getSiteConfig(siteId), getSiteDomain(siteId));
      try {
        const latestReport = await prisma.seoAuditReport.findFirst({
          where: { siteId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (latestReport) {
          const existingReport = await prisma.seoAuditReport.findUnique({
            where: { id: latestReport.id },
            select: { report: true },
          });
          const reportData = (existingReport?.report || {}) as Record<string, unknown>;
          await prisma.seoAuditReport.update({
            where: { id: latestReport.id },
            data: {
              report: { ...reportData, jsonSummary } as Record<string, unknown>,
              triggeredBy: "scheduled",
            },
          });
        }
      } catch (saveErr) {
        console.warn(`[daily-seo-audit] Failed to save JSON summary for ${siteId}:`, saveErr instanceof Error ? saveErr.message : saveErr);
      }

      results.push({
        siteId,
        healthScore: (auditData.healthScore as number) || 0,
        findings: (auditData.totalFindings as number) || 0,
        critical: (auditData.criticalCount as number) || 0,
        high: (auditData.highCount as number) || 0,
        saved: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ siteId, healthScore: 0, findings: 0, critical: 0, high: 0, saved: false, error: msg });
      console.warn(`[daily-seo-audit] Failed for ${siteId}:`, msg);
    }
  }

  const totalProcessed = results.length;
  const totalSucceeded = results.filter((r) => r.saved).length;
  const hasErrors = totalSucceeded < totalProcessed;

  if (hasErrors && totalSucceeded === 0) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "daily-seo-audit", error: results.map((r) => `${r.siteId}: ${r.error}`).join("; ") })
      .catch((err) => console.warn("[daily-seo-audit] onCronFailure hook failed:", err instanceof Error ? err.message : err));
  }

  const errorMessages = results.filter((r) => r.error).map((r) => `${r.siteId}: ${r.error}`);
  await logCronExecution("daily-seo-audit", hasErrors && totalSucceeded === 0 ? "failed" : "completed", {
    durationMs: Date.now() - cronStart,
    itemsProcessed: totalProcessed,
    itemsSucceeded: totalSucceeded,
    resultSummary: { sites: results },
    ...(errorMessages.length > 0 ? { errorMessage: errorMessages.slice(0, 3).join("; ") } : {}),
  }).catch((err) => console.warn("[daily-seo-audit] logCronExecution failed:", err instanceof Error ? err.message : err));

  return NextResponse.json({ success: true, durationMs: Date.now() - cronStart, sites: results });
}

/**
 * Build a compact, action-oriented JSON summary designed for:
 * 1. Khaled to copy-paste into conversations for context
 * 2. Historical tracking of progress over time
 * 3. Quick identification of what to fix next
 */
function buildActionSummary(
  auditData: Record<string, unknown>,
  siteId: string,
  siteConfig: { name?: string; domain?: string } | null,
  siteDomain: string,
) {
  const findings = (auditData.findings || []) as Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    fix: string;
    count: number;
    affected: string[];
  }>;

  const trends = auditData.trends as {
    weeklyClicks?: { current: number; previous: number; change: number };
    weeklyImpressions?: { current: number; previous: number; change: number };
    indexingVelocity?: { thisWeek: number; lastWeek: number };
    contentVelocity?: { thisWeek: number; lastWeek: number };
    topGrowing?: Array<{ url: string; clickGain: number }>;
    topDeclining?: Array<{ url: string; clickLoss: number }>;
  } | undefined;

  const indexingSummary = auditData.indexingSummary as {
    totalTracked: number;
    indexed: number;
    submitted: number;
    errors: number;
    chronicFailures: number;
    neverSubmitted: number;
    indexRate: number;
  } | undefined;

  // Critical actions: what to fix RIGHT NOW
  const criticalActions = findings
    .filter((f) => f.severity === "critical")
    .map((f) => ({
      issue: f.title,
      fix: f.fix,
      affected: f.count,
    }));

  // High-priority actions: fix this week
  const highActions = findings
    .filter((f) => f.severity === "high")
    .map((f) => ({
      issue: f.title,
      fix: f.fix,
      affected: f.count,
    }));

  // Category scores
  const sections = (auditData.sections || []) as Array<{
    name: string;
    score: number;
    maxScore: number;
    findings: Array<{ severity: string }>;
  }>;
  const categoryScores: Record<string, { score: number; critical: number; high: number }> = {};
  for (const section of sections) {
    categoryScores[section.name] = {
      score: section.score,
      critical: section.findings.filter((f) => f.severity === "critical").length,
      high: section.findings.filter((f) => f.severity === "high").length,
    };
  }

  return {
    _format: "yalla-seo-audit-v1",
    _generated: new Date().toISOString(),
    site: {
      id: siteId,
      name: siteConfig?.name || siteId,
      domain: siteDomain,
    },
    healthScore: auditData.healthScore as number,
    summary: auditData.summary as string,
    counts: {
      total: (auditData.totalFindings as number) || 0,
      critical: (auditData.criticalCount as number) || 0,
      high: (auditData.highCount as number) || 0,
      medium: (auditData.mediumCount as number) || 0,
      low: (auditData.lowCount as number) || 0,
    },
    indexing: indexingSummary ? {
      rate: indexingSummary.indexRate,
      indexed: indexingSummary.indexed,
      totalTracked: indexingSummary.totalTracked,
      errors: indexingSummary.errors,
      chronicFailures: indexingSummary.chronicFailures,
      neverSubmitted: indexingSummary.neverSubmitted,
    } : null,
    trends: trends ? {
      clicks: { current: trends.weeklyClicks?.current || 0, previous: trends.weeklyClicks?.previous || 0, changePercent: trends.weeklyClicks?.change || 0 },
      impressions: { current: trends.weeklyImpressions?.current || 0, previous: trends.weeklyImpressions?.previous || 0, changePercent: trends.weeklyImpressions?.change || 0 },
      contentPublished: { thisWeek: trends.contentVelocity?.thisWeek || 0, lastWeek: trends.contentVelocity?.lastWeek || 0 },
      indexingVelocity: { thisWeek: trends.indexingVelocity?.thisWeek || 0, lastWeek: trends.indexingVelocity?.lastWeek || 0 },
      topGrowing: (trends.topGrowing || []).slice(0, 3),
      topDeclining: (trends.topDeclining || []).slice(0, 3),
    } : null,
    categoryScores,
    fixNow: criticalActions,
    fixThisWeek: highActions,
    plainLanguage: buildPlainLanguageReport(
      auditData.healthScore as number,
      criticalActions,
      highActions,
      indexingSummary,
      trends,
    ),
  };
}

/**
 * Brief, phone-readable plain-language report.
 * Written for someone with ADHD who can't debug code.
 */
function buildPlainLanguageReport(
  healthScore: number,
  criticalActions: Array<{ issue: string; fix: string; affected: number }>,
  highActions: Array<{ issue: string; fix: string; affected: number }>,
  indexing: { indexRate: number; indexed: number; errors: number; chronicFailures: number; neverSubmitted: number } | undefined | null,
  trends: { weeklyClicks?: { current: number; change: number }; weeklyImpressions?: { current: number; change: number }; contentVelocity?: { thisWeek: number; lastWeek: number } } | undefined | null,
): string {
  const lines: string[] = [];

  // Grade
  const grade = healthScore >= 80 ? "A" : healthScore >= 65 ? "B" : healthScore >= 50 ? "C" : healthScore >= 35 ? "D" : "F";
  lines.push(`SITE HEALTH: ${healthScore}/100 (Grade ${grade})`);
  lines.push("");

  // Trends
  if (trends) {
    const clickTrend = trends.weeklyClicks?.change || 0;
    const impTrend = trends.weeklyImpressions?.change || 0;
    if (clickTrend !== 0 || impTrend !== 0) {
      lines.push("TRAFFIC:");
      if (trends.weeklyClicks?.current !== undefined) {
        lines.push(`  Clicks: ${trends.weeklyClicks.current} this week (${clickTrend >= 0 ? "+" : ""}${clickTrend}%)`);
      }
      if (trends.weeklyImpressions?.current !== undefined) {
        lines.push(`  Impressions: ${trends.weeklyImpressions.current} (${impTrend >= 0 ? "+" : ""}${impTrend}%)`);
      }
      lines.push("");
    }
    if (trends.contentVelocity) {
      lines.push(`CONTENT: ${trends.contentVelocity.thisWeek} articles published this week (was ${trends.contentVelocity.lastWeek} last week)`);
      lines.push("");
    }
  }

  // Indexing
  if (indexing) {
    lines.push(`INDEXING: ${indexing.indexRate}% of pages indexed by Google (${indexing.indexed} pages)`);
    if (indexing.errors > 0) lines.push(`  ${indexing.errors} pages have indexing errors`);
    if (indexing.chronicFailures > 0) lines.push(`  ${indexing.chronicFailures} pages failed after 5+ attempts`);
    if (indexing.neverSubmitted > 0) lines.push(`  ${indexing.neverSubmitted} pages never submitted to Google`);
    lines.push("");
  }

  // Critical
  if (criticalActions.length > 0) {
    lines.push("FIX NOW (Critical):");
    for (const a of criticalActions) {
      lines.push(`  • ${a.issue}`);
      lines.push(`    → ${a.fix}`);
    }
    lines.push("");
  }

  // High
  if (highActions.length > 0) {
    lines.push("FIX THIS WEEK (High):");
    for (const a of highActions.slice(0, 5)) {
      lines.push(`  • ${a.issue}`);
      lines.push(`    → ${a.fix}`);
    }
    if (highActions.length > 5) {
      lines.push(`  ... and ${highActions.length - 5} more`);
    }
    lines.push("");
  }

  if (criticalActions.length === 0 && highActions.length === 0) {
    lines.push("No critical or high-priority issues found. Keep publishing quality content.");
  }

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  return handleDailySeoAudit(request);
}

export async function POST(request: NextRequest) {
  return handleDailySeoAudit(request);
}
