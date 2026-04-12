/**
 * CEO Intelligence Engine — Core Orchestrator
 *
 * Weekly autonomous intelligence gathering, KPI comparison, plan generation,
 * auto-fix execution, and email reporting. The CEO's virtual CTO.
 *
 * Called by: /api/cron/ceo-intelligence (Sundays 6:00 UTC)
 * Budget: 280s (300s maxDuration - 20s buffer)
 */

import type { KPIDelta } from "./kpi-manager";
import type { StandardsReport } from "./standards-updater";

// ── Types ──────────────────────────────────────────────────────────────

export interface CEOMetrics {
  // GA4
  sessions30d: number;
  pageViews30d: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; views: number }>;
  topSources: Array<{ source: string; sessions: number }>;

  // GSC
  clicks7d: number;
  impressions7d: number;
  avgCTR: number;
  avgPosition: number;
  clicksChange: number | null;
  impressionsChange: number | null;

  // Pipeline
  publishedTotal: number;
  publishedLast7d: number;
  reservoirCount: number;
  activeDrafts: number;
  rejectedDrafts: number;
  contentVelocity: number; // articles/day over last 7d

  // Indexing
  indexedPages: number;
  submittedPages: number;
  neverSubmitted: number;

  // Affiliate
  affiliateClicks30d: number;
  affiliateRevenue30d: number;

  // AI costs
  aiCost7d: number;
  aiCost30d: number;

  // SEO
  avgSeoScore: number;

  fetchedAt: string;
}

export interface CEOPlans {
  technicalPlan: string[];
  marketingPlan: string[];
  salesPlan: string[];
  khaledActions: string[];
}

export interface AutoFixResults {
  contentCleanup: Record<string, unknown> | null;
  seoFixes: Record<string, unknown> | null;
  errors: string[];
}

export interface CEOReport {
  grade: string;
  gradeColor: string;
  metrics: CEOMetrics;
  kpiDeltas: KPIDelta[];
  plans: CEOPlans;
  fixes: AutoFixResults;
  standards: StandardsReport;
  generatedAt: string;
  siteId: string;
}

// ── Main Orchestrator ──────────────────────────────────────────────────

export async function runCeoIntelligence(
  siteId: string,
  budgetMs: number = 280000,
): Promise<CEOReport> {
  const startTime = Date.now();
  const elapsed = () => Date.now() - startTime;
  const remaining = () => budgetMs - elapsed();

  // Phase 1: Gather metrics (45s budget)
  console.log("[ceo-intelligence] Phase 1: Gathering metrics...");
  const metrics = await gatherMetrics(siteId);

  // Phase 2: Auto-fix (60s budget)
  let fixes: AutoFixResults = { contentCleanup: null, seoFixes: null, errors: [] };
  if (remaining() > 80000) {
    console.log("[ceo-intelligence] Phase 2: Executing auto-fixes...");
    fixes = await executeAutoFixes(siteId, Math.min(60000, remaining() - 60000));
  } else {
    console.warn("[ceo-intelligence] Skipping Phase 2 — insufficient budget");
  }

  // Phase 3: Compare KPIs (5s)
  console.log("[ceo-intelligence] Phase 3: Comparing KPIs...");
  const { getKPIs, compareMetrics } = await import("./kpi-manager");
  const kpiSet = await getKPIs(siteId);
  const actuals = buildActualsMap(metrics);
  const kpiDeltas = compareMetrics(kpiSet.kpis, actuals);

  // Phase 4: Generate plans (60s budget)
  let plans: CEOPlans = {
    technicalPlan: ["AI plan generation skipped — insufficient budget"],
    marketingPlan: [],
    salesPlan: [],
    khaledActions: [],
  };
  if (remaining() > 50000) {
    console.log("[ceo-intelligence] Phase 4: Generating plans...");
    plans = await generatePlans(metrics, kpiDeltas, siteId, Math.min(60000, remaining() - 30000));
  }

  // Phase 5: Standards review (30s budget)
  let standards: StandardsReport = {
    checkedAt: new Date().toISOString(),
    proposals: [],
    summary: "Skipped — insufficient budget",
  };
  if (remaining() > 25000) {
    console.log("[ceo-intelligence] Phase 5: Checking standards...");
    const { checkForStandardsUpdates } = await import("./standards-updater");
    standards = await checkForStandardsUpdates(siteId, Math.min(25000, remaining() - 15000));
  }

  // Compute grade
  const grade = computeGrade(kpiDeltas);

  const report: CEOReport = {
    grade: grade.letter,
    gradeColor: grade.color,
    metrics,
    kpiDeltas,
    plans,
    fixes,
    standards,
    generatedAt: new Date().toISOString(),
    siteId,
  };

  // Phase 6: Email report (10s)
  if (remaining() > 12000) {
    console.log("[ceo-intelligence] Phase 6: Sending email...");
    try {
      const html = buildEmailReport(report);
      const { sendEmail } = await import("@/lib/email/sender");
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean) || [];
      if (adminEmails.length > 0) {
        const { getSiteDomain } = await import("@/config/sites");
        const domain = getSiteDomain(siteId);
        await sendEmail({
          to: adminEmails,
          subject: `[${domain}] Weekly CEO Report — Grade ${grade.letter} — ${new Date().toISOString().split("T")[0]}`,
          html,
        });
      }
    } catch (err) {
      console.warn("[ceo-intelligence] Email send failed:", err instanceof Error ? err.message : err);
    }
  }

  // Phase 7: Store report history (5s)
  if (remaining() > 3000) {
    console.log("[ceo-intelligence] Phase 7: Storing report...");
    await storeReport(siteId, report);
  }

  console.log(`[ceo-intelligence] Complete in ${elapsed()}ms — Grade ${grade.letter}`);
  return report;
}

// ── Phase 1: Gather Metrics ────────────────────────────────────────────

async function gatherMetrics(siteId: string): Promise<CEOMetrics> {
  const { prisma } = await import("@/lib/db");
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  // Parallel fetch with individual timeouts
  const [ga4, gsc, pipeline, indexing, affiliate, aiCosts] = await Promise.allSettled([
    fetchGA4(siteId),
    fetchGSC(siteId),
    fetchPipelineStats(prisma, siteId, d7),
    fetchIndexingStats(prisma, siteId),
    fetchAffiliateStats(prisma, siteId, d30),
    fetchAICosts(prisma, siteId, d7, d30),
  ]);

  const ga4Data = ga4.status === "fulfilled" ? ga4.value : null;
  const gscData = gsc.status === "fulfilled" ? gsc.value : null;
  const pipelineData = pipeline.status === "fulfilled" ? pipeline.value : null;
  const indexingData = indexing.status === "fulfilled" ? indexing.value : null;
  const affiliateData = affiliate.status === "fulfilled" ? affiliate.value : null;
  const aiCostData = aiCosts.status === "fulfilled" ? aiCosts.value : null;

  // SEO score average
  let avgSeoScore = 0;
  try {
    const scored = await prisma.blogPost.aggregate({
      where: { siteId, published: true, seo_score: { not: null } },
      _avg: { seo_score: true },
    });
    avgSeoScore = scored._avg.seo_score ?? 0;
  } catch (err) {
    console.warn("[ceo-intelligence] Failed to aggregate seo_score:", err instanceof Error ? err.message : String(err));
  }

  return {
    sessions30d: ga4Data?.sessions ?? 0,
    pageViews30d: ga4Data?.pageViews ?? 0,
    bounceRate: ga4Data?.bounceRate ?? 0,
    avgSessionDuration: ga4Data?.avgSessionDuration ?? 0,
    topPages: ga4Data?.topPages ?? [],
    topSources: ga4Data?.topSources ?? [],

    clicks7d: gscData?.clicks ?? 0,
    impressions7d: gscData?.impressions ?? 0,
    avgCTR: gscData?.ctr ?? 0,
    avgPosition: gscData?.position ?? 0,
    clicksChange: gscData?.clicksChange ?? null,
    impressionsChange: gscData?.impressionsChange ?? null,

    publishedTotal: pipelineData?.publishedTotal ?? 0,
    publishedLast7d: pipelineData?.publishedLast7d ?? 0,
    reservoirCount: pipelineData?.reservoirCount ?? 0,
    activeDrafts: pipelineData?.activeDrafts ?? 0,
    rejectedDrafts: pipelineData?.rejectedDrafts ?? 0,
    contentVelocity: pipelineData?.velocity ?? 0,

    indexedPages: indexingData?.indexed ?? 0,
    submittedPages: indexingData?.submitted ?? 0,
    neverSubmitted: indexingData?.neverSubmitted ?? 0,

    affiliateClicks30d: affiliateData?.clicks ?? 0,
    affiliateRevenue30d: affiliateData?.revenue ?? 0,

    aiCost7d: aiCostData?.cost7d ?? 0,
    aiCost30d: aiCostData?.cost30d ?? 0,

    avgSeoScore,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Metric Fetchers ────────────────────────────────────────────────────

async function fetchGA4(siteId: string) {
  try {
    const { fetchGA4Metrics } = await import("@/lib/seo/ga4-data-api");
    const report = await fetchGA4Metrics("30daysAgo", "today");
    if (!report) return null;
    return {
      sessions: report.metrics?.sessions ?? 0,
      pageViews: report.metrics?.pageViews ?? 0,
      bounceRate: report.metrics?.bounceRate ?? 0,
      avgSessionDuration: report.metrics?.avgSessionDuration ?? 0,
      topPages: (report.topPages || []).slice(0, 10).map((p) => ({
        path: p.path,
        views: p.pageViews,
      })),
      topSources: (report.topSources || []).slice(0, 5),
    };
  } catch (err) {
    console.warn("[ceo-intelligence] GA4 fetch failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function fetchGSC(siteId: string) {
  try {
    const { getPerformanceTrend } = await import("@/lib/seo/gsc-trend-analysis");
    const trend = await getPerformanceTrend(siteId, "7d");
    return {
      clicks: trend.totalClicks.current,
      impressions: trend.totalImpressions.current,
      ctr: trend.avgCtr.current,
      position: trend.avgPosition.current,
      clicksChange: trend.totalClicks.changePercent,
      impressionsChange: trend.totalImpressions.changePercent,
    };
  } catch (err) {
    console.warn("[ceo-intelligence] GSC fetch failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function fetchPipelineStats(prisma: any, siteId: string, d7: Date) {
  const [publishedTotal, publishedLast7d, reservoir, active, rejected] = await Promise.all([
    prisma.blogPost.count({ where: { siteId, published: true } }),
    prisma.blogPost.count({ where: { siteId, published: true, created_at: { gte: d7 } } }),
    prisma.articleDraft.count({ where: { site_id: siteId, current_phase: "reservoir" } }),
    prisma.articleDraft.count({
      where: {
        site_id: siteId,
        current_phase: { notIn: ["reservoir", "published", "rejected"] },
      },
    }),
    prisma.articleDraft.count({ where: { site_id: siteId, current_phase: "rejected" } }),
  ]);

  return {
    publishedTotal,
    publishedLast7d,
    reservoirCount: reservoir,
    activeDrafts: active,
    rejectedDrafts: rejected,
    velocity: publishedLast7d / 7,
  };
}

async function fetchIndexingStats(prisma: any, siteId: string) {
  const [indexed, submitted, neverSubmitted] = await Promise.all([
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "indexed" } }),
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_indexnow: true } }),
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, submitted_indexnow: false, status: { not: "indexed" } },
    }),
  ]);
  return { indexed, submitted, neverSubmitted };
}

async function fetchAffiliateStats(prisma: any, siteId: string, d30: Date) {
  try {
    const [clicks, commissions] = await Promise.all([
      prisma.cjClickEvent.count({
        where: { OR: [{ siteId }, { siteId: null }], createdAt: { gte: d30 } },
      }),
      prisma.cjCommission.aggregate({
        where: { OR: [{ siteId }, { siteId: null }], createdAt: { gte: d30 } },
        _sum: { commissionAmount: true },
      }),
    ]);
    return {
      clicks,
      revenue: commissions._sum.commissionAmount ?? 0,
    };
  } catch (err) {
    console.warn("[ceo-intelligence] fetchAffiliateStats failed:", err instanceof Error ? err.message : String(err));
    return { clicks: 0, revenue: 0 };
  }
}

async function fetchAICosts(prisma: any, siteId: string, d7: Date, d30: Date) {
  try {
    const [cost7d, cost30d] = await Promise.all([
      prisma.apiUsageLog.aggregate({
        where: { siteId, createdAt: { gte: d7 } },
        _sum: { estimatedCostUsd: true },
      }),
      prisma.apiUsageLog.aggregate({
        where: { siteId, createdAt: { gte: d30 } },
        _sum: { estimatedCostUsd: true },
      }),
    ]);
    return {
      cost7d: cost7d._sum.estimatedCostUsd ?? 0,
      cost30d: cost30d._sum.estimatedCostUsd ?? 0,
    };
  } catch (err) {
    console.warn("[ceo-intelligence] fetchAICosts failed:", err instanceof Error ? err.message : String(err));
    return { cost7d: 0, cost30d: 0 };
  }
}

// ── Phase 2: Auto-Fixes ────────────────────────────────────────────────

async function executeAutoFixes(siteId: string, budgetMs: number): Promise<AutoFixResults> {
  const results: AutoFixResults = { contentCleanup: null, seoFixes: null, errors: [] };
  const startTime = Date.now();

  // Content cleanup
  try {
    const { getSiteDomain } = await import("@/config/sites");
    const domain = getSiteDomain(siteId);
    const baseUrl = `https://${domain}`;

    const cleanupRes = await fetch(`${baseUrl}/api/admin/content-cleanup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "full_cleanup", siteId }),
      signal: AbortSignal.timeout(Math.min(30000, budgetMs / 2)),
    });
    if (cleanupRes.ok) {
      results.contentCleanup = await cleanupRes.json();
    }
  } catch (err) {
    results.errors.push(`Content cleanup: ${err instanceof Error ? err.message : String(err)}`);
  }

  // SEO intelligence fixes
  if (Date.now() - startTime < budgetMs - 10000) {
    try {
      const { getSiteDomain } = await import("@/config/sites");
      const domain = getSiteDomain(siteId);
      const baseUrl = `https://${domain}`;

      const seoRes = await fetch(`${baseUrl}/api/admin/seo-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix_all", siteId }),
        signal: AbortSignal.timeout(Math.min(25000, budgetMs - (Date.now() - startTime) - 5000)),
      });
      if (seoRes.ok) {
        results.seoFixes = await seoRes.json();
      }
    } catch (err) {
      results.errors.push(`SEO fixes: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return results;
}

// ── Phase 4: Generate Plans ────────────────────────────────────────────

async function generatePlans(
  metrics: CEOMetrics,
  kpiDeltas: KPIDelta[],
  siteId: string,
  budgetMs: number,
): Promise<CEOPlans> {
  const { generateCompletion } = await import("@/lib/ai/provider");

  const redKPIs = kpiDeltas.filter((k) => k.status === "red");
  const amberKPIs = kpiDeltas.filter((k) => k.status === "amber");

  const { getSiteDomain } = await import("@/config/sites");
  const siteDomain = getSiteDomain(siteId);

  const prompt = `You are the CTO/CMO of a luxury travel content platform (${siteDomain}). Based on the following real performance data, create actionable plans.

REAL METRICS (last 7-30 days):
- Sessions: ${metrics.sessions30d} (30d) | Page views: ${metrics.pageViews30d}
- GSC Clicks: ${metrics.clicks7d} (7d) | Impressions: ${metrics.impressions7d}
- CTR: ${(metrics.avgCTR * 100).toFixed(1)}% | Avg Position: ${metrics.avgPosition.toFixed(1)}
- Published articles: ${metrics.publishedTotal} total, ${metrics.publishedLast7d} last 7d
- Content velocity: ${metrics.contentVelocity.toFixed(1)} articles/day
- Indexed pages: ${metrics.indexedPages} | Never submitted: ${metrics.neverSubmitted}
- Affiliate clicks: ${metrics.affiliateClicks30d} | Revenue: $${metrics.affiliateRevenue30d.toFixed(2)}
- AI costs: $${metrics.aiCost7d.toFixed(2)} (7d), $${metrics.aiCost30d.toFixed(2)} (30d)
- Avg SEO score: ${metrics.avgSeoScore.toFixed(0)}/100
- Reservoir: ${metrics.reservoirCount} articles waiting

RED KPIs (needs immediate attention):
${redKPIs.map((k) => `- ${k.label}: target ${k.target}${k.unit}, actual ${k.actual}${k.unit}`).join("\n") || "None"}

AMBER KPIs (monitor closely):
${amberKPIs.map((k) => `- ${k.label}: target ${k.target}${k.unit}, actual ${k.actual}${k.unit}`).join("\n") || "None"}

Generate 3 plans with 2-3 bullet points each. Focus on ACTIONABLE items, not vague advice.

Respond with JSON:
{
  "technicalPlan": ["bullet1", "bullet2"],
  "marketingPlan": ["bullet1", "bullet2"],
  "salesPlan": ["bullet1", "bullet2"],
  "khaledActions": ["action Khaled must do manually"]
}

Respond ONLY with JSON.`;

  try {
    const result = await generateCompletion(
      [{ role: "user", content: prompt }],
      {
        maxTokens: 1500,
        temperature: 0.4,
        taskType: "ceo-plan-generation",
        calledFrom: "ceo-intelligence",
        siteId,
        timeoutMs: Math.min(budgetMs - 2000, 55000),
        phaseBudgetHint: "heavy",
      },
    );

    const parsed = JSON.parse(result.content) as CEOPlans;
    return {
      technicalPlan: Array.isArray(parsed.technicalPlan) ? parsed.technicalPlan : [],
      marketingPlan: Array.isArray(parsed.marketingPlan) ? parsed.marketingPlan : [],
      salesPlan: Array.isArray(parsed.salesPlan) ? parsed.salesPlan : [],
      khaledActions: Array.isArray(parsed.khaledActions) ? parsed.khaledActions : [],
    };
  } catch (err) {
    console.warn("[ceo-intelligence] Plan generation failed:", err instanceof Error ? err.message : String(err));
    return {
      technicalPlan: ["Plan generation failed — check AI provider status"],
      marketingPlan: [],
      salesPlan: [],
      khaledActions: [],
    };
  }
}

// ── Actuals Map Builder ────────────────────────────────────────────────

function buildActualsMap(m: CEOMetrics): Record<string, number> {
  return {
    indexedPages: m.indexedPages,
    organicSessions: m.sessions30d,
    averageCTR: m.avgCTR * 100, // convert decimal to %
    lcpMs: 0, // placeholder — requires live PageSpeed call
    contentVelocity: m.contentVelocity,
    affiliateClicks: m.affiliateClicks30d,
    publishedArticles: m.publishedTotal,
    seoScore: m.avgSeoScore,
  };
}

// ── Grade Computation ──────────────────────────────────────────────────

function computeGrade(deltas: KPIDelta[]): { letter: string; color: string } {
  const green = deltas.filter((d) => d.status === "green").length;
  const total = deltas.length || 1;
  const ratio = green / total;

  if (ratio >= 0.8) return { letter: "A", color: "#2D5A3D" };
  if (ratio >= 0.6) return { letter: "B", color: "#3B7EA1" };
  if (ratio >= 0.4) return { letter: "C", color: "#C49A2A" };
  if (ratio >= 0.2) return { letter: "D", color: "#E07C24" };
  return { letter: "F", color: "#C8322B" };
}

// ── Phase 6: Email Report ──────────────────────────────────────────────

function buildEmailReport(report: CEOReport): string {
  const { grade, gradeColor, metrics, kpiDeltas, plans, fixes, standards } = report;

  const statusEmoji = (s: string) => (s === "green" ? "&#9989;" : s === "amber" ? "&#9888;&#65039;" : "&#10060;");

  const kpiRows = kpiDeltas
    .map(
      (k) =>
        `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${k.label}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${k.target}${k.unit === "%" ? "%" : ""}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${k.actual}${k.unit === "%" ? "%" : ""}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${statusEmoji(k.status)}</td>
    </tr>`,
    )
    .join("");

  const fixSummary: string[] = [];
  if (fixes.contentCleanup && typeof fixes.contentCleanup === "object") {
    const c = fixes.contentCleanup as Record<string, unknown>;
    if (c.artifactsFixed) fixSummary.push(`${c.artifactsFixed} title artifacts cleaned`);
    if (c.duplicatesUnpublished) fixSummary.push(`${c.duplicatesUnpublished} duplicates removed`);
  }
  if (fixes.seoFixes && typeof fixes.seoFixes === "object") {
    const s = fixes.seoFixes as Record<string, unknown>;
    const results = s.results as Record<string, unknown> | undefined;
    if (results) {
      const ns = results.neverSubmitted as Record<string, unknown> | undefined;
      if (ns?.submittedToIndexNow) fixSummary.push(`${ns.submittedToIndexNow} URLs submitted to IndexNow`);
      const sh = results.seoHurtingFixes as Record<string, unknown> | undefined;
      if (sh?.thinUnpublished) fixSummary.push(`${sh.thinUnpublished} thin articles unpublished`);
    }
  }
  if (fixes.errors.length > 0) fixSummary.push(`${fixes.errors.length} fix error(s) — check logs`);

  const bullet = (items: string[]) =>
    items.length > 0
      ? `<ul style="margin:0;padding-left:20px">${items.map((i) => `<li style="margin:4px 0">${i}</li>`).join("")}</ul>`
      : "<p style='color:#999'>None this week</p>";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f3ef">
<div style="max-width:600px;margin:0 auto;padding:20px">

<!-- Grade Header -->
<div style="background:${gradeColor};color:white;padding:24px;border-radius:12px;text-align:center;margin-bottom:20px">
  <div style="font-size:48px;font-weight:bold">${grade}</div>
  <div style="font-size:14px;opacity:0.9">Weekly Health Grade</div>
  <div style="font-size:12px;opacity:0.7;margin-top:4px">${report.generatedAt.split("T")[0]}</div>
</div>

<!-- KPI Dashboard -->
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a2e">KPI Dashboard</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <tr style="background:#f9f8f5">
      <th style="padding:8px;text-align:left">Metric</th>
      <th style="padding:8px;text-align:center">Target</th>
      <th style="padding:8px;text-align:center">Actual</th>
      <th style="padding:8px;text-align:center">Status</th>
    </tr>
    ${kpiRows}
  </table>
</div>

<!-- Key Metrics -->
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a2e">Traffic Snapshot</h2>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <div style="flex:1;min-width:120px;background:#f9f8f5;padding:12px;border-radius:8px;text-align:center">
      <div style="font-size:20px;font-weight:bold;color:#1a1a2e">${metrics.clicks7d}</div>
      <div style="font-size:11px;color:#666">Clicks (7d)</div>
    </div>
    <div style="flex:1;min-width:120px;background:#f9f8f5;padding:12px;border-radius:8px;text-align:center">
      <div style="font-size:20px;font-weight:bold;color:#1a1a2e">${metrics.impressions7d.toLocaleString()}</div>
      <div style="font-size:11px;color:#666">Impressions (7d)</div>
    </div>
    <div style="flex:1;min-width:120px;background:#f9f8f5;padding:12px;border-radius:8px;text-align:center">
      <div style="font-size:20px;font-weight:bold;color:#1a1a2e">${metrics.sessions30d}</div>
      <div style="font-size:11px;color:#666">Sessions (30d)</div>
    </div>
  </div>
</div>

<!-- What Was Fixed -->
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a2e">Auto-Fixed This Week</h2>
  ${fixSummary.length > 0 ? bullet(fixSummary) : "<p style='color:#999'>No fixes needed</p>"}
</div>

<!-- Technical Plan -->
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#3B7EA1">Technical Plan</h2>
  ${bullet(plans.technicalPlan)}
</div>

<!-- Marketing Plan -->
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#2D5A3D">Marketing Plan</h2>
  ${bullet(plans.marketingPlan)}
</div>

<!-- Sales Plan -->
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#C49A2A">Sales Plan (Affiliate & Revenue)</h2>
  ${bullet(plans.salesPlan)}
</div>

<!-- Khaled's Action Items -->
<div style="background:#fff3e0;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #C49A2A">
  <h2 style="margin:0 0 12px;font-size:16px;color:#C49A2A">Your Action Items</h2>
  ${plans.khaledActions.length > 0 ? `<ol style="margin:0;padding-left:20px">${plans.khaledActions.map((a) => `<li style="margin:4px 0">${a}</li>`).join("")}</ol>` : "<p style='color:#999'>Nothing needed from you this week</p>"}
</div>

<!-- Standards Proposals -->
${standards.proposals.length > 0 ? `
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#C8322B">Algorithm Update Proposals</h2>
  <p style="font-size:12px;color:#666">Review these proposed changes. They will NOT be applied automatically.</p>
  ${bullet(standards.proposals.map((p) => `<strong>${p.source}</strong>: ${p.reason} (Impact: ${p.impact})`))}
</div>` : ""}

<!-- Pipeline Status -->
<div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px">
  <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a2e">Pipeline Status</h2>
  <div style="font-size:13px;line-height:1.8">
    Published: <strong>${metrics.publishedTotal}</strong> total (${metrics.publishedLast7d} this week)<br>
    Reservoir: <strong>${metrics.reservoirCount}</strong> articles waiting<br>
    Active drafts: <strong>${metrics.activeDrafts}</strong> | Rejected: <strong>${metrics.rejectedDrafts}</strong><br>
    Indexed: <strong>${metrics.indexedPages}</strong> pages | Never submitted: ${metrics.neverSubmitted}<br>
    AI cost: $${metrics.aiCost7d.toFixed(2)} (7d) / $${metrics.aiCost30d.toFixed(2)} (30d)
  </div>
</div>

<div style="text-align:center;padding:16px;color:#999;font-size:11px">
  CEO Intelligence Engine &mdash; Automated weekly report<br>
  Generated ${report.generatedAt.split("T")[0]}
</div>

</div>
</body>
</html>`;
}

// ── Phase 7: Store Report History ──────────────────────────────────────

async function storeReport(siteId: string, report: CEOReport): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const HISTORY_CATEGORY = "ceo-report-history";

    const existing = await prisma.siteSettings.findFirst({
      where: { siteId, category: HISTORY_CATEGORY },
    });

    const history: Array<{ date: string; grade: string; summary: Record<string, unknown> }> = [];
    if (existing?.config && typeof existing.config === "object") {
      const cfg = existing.config as Record<string, unknown>;
      if (Array.isArray(cfg.reports)) {
        history.push(...(cfg.reports as typeof history));
      }
    }

    // Add this report (compact summary only, not full HTML)
    history.unshift({
      date: report.generatedAt,
      grade: report.grade,
      summary: {
        sessions30d: report.metrics.sessions30d,
        clicks7d: report.metrics.clicks7d,
        indexedPages: report.metrics.indexedPages,
        publishedTotal: report.metrics.publishedTotal,
        affiliateClicks: report.metrics.affiliateClicks30d,
        aiCost7d: report.metrics.aiCost7d,
        greenKPIs: report.kpiDeltas.filter((d) => d.status === "green").length,
        totalKPIs: report.kpiDeltas.length,
      },
    });

    // Keep last 12 weeks
    const trimmed = history.slice(0, 12);

    await prisma.siteSettings.upsert({
      where: { siteId_category: { siteId, category: HISTORY_CATEGORY } },
      update: { config: { reports: trimmed } as unknown as Record<string, unknown> },
      create: { siteId, category: HISTORY_CATEGORY, config: { reports: trimmed } as unknown as Record<string, unknown> },
    });
  } catch (err) {
    console.warn("[ceo-intelligence] Failed to store report:", err instanceof Error ? err.message : String(err));
  }
}
