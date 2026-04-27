/**
 * Daily Briefing Builder
 *
 * Assembles the 19-section briefing payload for the CEO email + the
 * /api/cron/daily-briefing route + the briefing_get MCP tool.
 *
 * Each section runs in its own try/catch via SectionResult so a single
 * failing section doesn't tank the whole briefing. Failures appear in the
 * email as an "Unavailable" stub rather than a 500.
 *
 * Spec: docs/briefing/CEO-DAILY-BRIEFING.md
 */

import { prisma } from "@/lib/db";
import { getActiveSiteIds } from "@/config/sites";
import { fetchGA4Metrics, isGA4Configured } from "@/lib/seo/ga4-data-api";
import { runPublicAudit } from "@/app/api/admin/public-audit/route";
import {
  AbTesting,
  AffiliateClicksRevenue,
  AffiliateComparisons,
  AffiliateHealth,
  AffiliateLinkUpdates,
  AffiliateTrends,
  DailyBriefingData,
  EnArComparison,
  ExecutiveSummary,
  FixesApplied,
  Ga4Numbers,
  GscUpdate,
  KpisProgress,
  PerSiteDeepDive,
  SectionResult,
  Severity,
  SiteStatusRow,
  SystemLogs,
  TechnicalIssues,
  TestsRun,
  TrafficSources,
  Validation,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * Wrap any section build in a try/catch that returns a SectionResult.
 * Errors are captured as strings so the JSON-serialized briefing remains
 * fully readable.
 */
async function safe<T>(builder: () => Promise<T>): Promise<SectionResult<T>> {
  try {
    const data = await builder();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function clusterCronFailures(rows: Array<{ jobName: string; error: string | null }>) {
  const byJob = new Map<string, { count: number; lastError: string }>();
  for (const r of rows) {
    const cur = byJob.get(r.jobName) || { count: 0, lastError: "" };
    cur.count++;
    if (!cur.lastError && r.error) cur.lastError = r.error.slice(0, 200);
    byJob.set(r.jobName, cur);
  }
  return [...byJob.entries()].map(([jobName, v]) => ({ jobName, ...v }));
}

function severityForFailureCount(n: number): Severity {
  if (n >= 5) return "critical";
  if (n >= 2) return "high";
  return "medium";
}

// ───────────────────────────────────────────────────────────────────────────
// §2: Tests run
// ───────────────────────────────────────────────────────────────────────────

async function buildTestsRun(siteIds: string[]): Promise<TestsRun> {
  // siteIds intentionally unused — CronJobLog is global. Kept for symmetry.
  void siteIds;
  const since = new Date(Date.now() - DAY_MS);
  const rows = await prisma.cronJobLog.findMany({
    where: { started_at: { gte: since } },
    select: { job_name: true, status: true, duration_ms: true, started_at: true },
    take: 1000,
  });

  const passed = rows.filter((r) => r.status === "completed").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  const byJobMap = new Map<string, { runs: number; failures: number; lastDurationMs: number | null }>();
  for (const r of rows) {
    const cur = byJobMap.get(r.job_name) || { runs: 0, failures: 0, lastDurationMs: null };
    cur.runs++;
    if (r.status === "failed") cur.failures++;
    if (cur.lastDurationMs === null) cur.lastDurationMs = r.duration_ms ?? null;
    byJobMap.set(r.job_name, cur);
  }
  const byCron = [...byJobMap.entries()]
    .map(([jobName, v]) => ({ jobName, ...v }))
    .sort((a, b) => b.failures - a.failures || b.runs - a.runs)
    .slice(0, 30);

  return { totalRuns: rows.length, passed, failed, byCron };
}

// ───────────────────────────────────────────────────────────────────────────
// §3: Website status (per site)
// ───────────────────────────────────────────────────────────────────────────

async function buildSiteStatus(siteIds: string[]): Promise<SiteStatusRow[]> {
  const out: SiteStatusRow[] = [];
  for (const siteId of siteIds) {
    try {
      const audit = await runPublicAudit(siteId, 200);
      const dimensionScores: Record<string, number> = {};
      let critical = 0;
      let high = 0;
      for (const [name, dim] of Object.entries(audit.dimensions)) {
        dimensionScores[name] = dim.score;
        critical += dim.bySeverity.critical;
        high += dim.bySeverity.high;
      }
      out.push({
        siteId,
        publicAuditGrade: audit.overallGrade,
        publicAuditScore: audit.overallScore,
        dimensionScores,
        criticalIssues: critical,
        highIssues: high,
      });
    } catch (err) {
      out.push({
        siteId,
        publicAuditGrade: "?",
        publicAuditScore: 0,
        dimensionScores: {},
        criticalIssues: 0,
        highIssues: 0,
      });
      console.warn(`[briefing] site status failed for ${siteId}:`, err);
    }
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// §4: GSC update
// ───────────────────────────────────────────────────────────────────────────

async function buildGscUpdate(siteIds: string[]): Promise<GscUpdate> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d7 = new Date(today.getTime() - 7 * DAY_MS);
  const d14 = new Date(today.getTime() - 14 * DAY_MS);

  const rows = await prisma.gscPagePerformance.findMany({
    where: {
      site_id: { in: siteIds },
      date: { gte: d14 },
    },
    select: { url: true, date: true, clicks: true, impressions: true, ctr: true, position: true },
    take: 50_000,
  });

  if (rows.length === 0) {
    return {
      hasData: false,
      last7d: { clicks: 0, impressions: 0, avgCtr: 0, avgPosition: 0 },
      prior7d: { clicks: 0, impressions: 0, avgCtr: 0, avgPosition: 0 },
      delta: { clicks: 0, impressions: 0, ctrPp: 0, positionPlaces: 0 },
      topMovers: [],
      trafficSparkline: [],
      notes: ["No GSC data — gsc-sync may not have run yet."],
    };
  }

  // Aggregate windows
  function aggregate(window: typeof rows) {
    const clicks = window.reduce((s, r) => s + r.clicks, 0);
    const impressions = window.reduce((s, r) => s + r.impressions, 0);
    const positions = window.filter((r) => r.position > 0).map((r) => r.position);
    const avgCtr = impressions > 0 ? clicks / impressions : 0;
    const avgPosition = positions.length > 0 ? positions.reduce((s, p) => s + p, 0) / positions.length : 0;
    return { clicks, impressions, avgCtr, avgPosition };
  }
  const last7d = aggregate(rows.filter((r) => r.date >= d7));
  const prior7d = aggregate(rows.filter((r) => r.date < d7));

  // Per-URL deltas → top movers
  const byUrl = new Map<string, { last7d: number; prior7d: number; lastPos: number; priorPos: number }>();
  for (const r of rows) {
    const cur = byUrl.get(r.url) || { last7d: 0, prior7d: 0, lastPos: 0, priorPos: 0 };
    if (r.date >= d7) {
      cur.last7d += r.clicks;
      if (r.position > 0) cur.lastPos = cur.lastPos === 0 ? r.position : (cur.lastPos + r.position) / 2;
    } else {
      cur.prior7d += r.clicks;
      if (r.position > 0) cur.priorPos = cur.priorPos === 0 ? r.position : (cur.priorPos + r.position) / 2;
    }
    byUrl.set(r.url, cur);
  }
  const topMovers = [...byUrl.entries()]
    .map(([url, v]) => ({
      url,
      clicksDelta: v.last7d - v.prior7d,
      positionDelta: v.priorPos > 0 && v.lastPos > 0 ? v.priorPos - v.lastPos : 0,
    }))
    .sort((a, b) => Math.abs(b.clicksDelta) - Math.abs(a.clicksDelta))
    .slice(0, 10);

  // 14-day daily clicks sparkline
  const dailyClicks = new Map<string, number>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    dailyClicks.set(key, (dailyClicks.get(key) || 0) + r.clicks);
  }
  const sparkline: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    sparkline.push(dailyClicks.get(d.toISOString().slice(0, 10)) || 0);
  }

  return {
    hasData: true,
    last7d,
    prior7d,
    delta: {
      clicks: last7d.clicks - prior7d.clicks,
      impressions: last7d.impressions - prior7d.impressions,
      ctrPp: (last7d.avgCtr - prior7d.avgCtr) * 100,
      positionPlaces: prior7d.avgPosition - last7d.avgPosition, // positive = improved
    },
    topMovers,
    trafficSparkline: sparkline,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// §5: GA4 numbers
// ───────────────────────────────────────────────────────────────────────────

async function buildGa4Numbers(siteIds: string[]): Promise<Ga4Numbers> {
  // GA4 single-property model — picks the first siteId's GA4 property if
  // multi-site env vars exist; otherwise the global GA4_PROPERTY_ID.
  void siteIds;

  if (!isGA4Configured()) {
    return {
      hasData: false,
      last7d: { sessions: 0, users: 0, pageViews: 0, engagementRate: 0, bounceRate: 0 },
      topPages: [],
      briefExplanation: "GA4 not configured. Add GA4_PROPERTY_ID + service account credentials to enable.",
      trafficSparkline: [],
    };
  }

  const report = await fetchGA4Metrics("7daysAgo", "today");
  if (!report) {
    return {
      hasData: false,
      last7d: { sessions: 0, users: 0, pageViews: 0, engagementRate: 0, bounceRate: 0 },
      topPages: [],
      briefExplanation: "GA4 fetch returned null — check service account permissions on the GA4 property.",
      trafficSparkline: [],
    };
  }

  // Brief explanation tries to read the numbers in plain English.
  const ratio = report.metrics.totalUsers > 0 ? report.metrics.sessions / report.metrics.totalUsers : 0;
  const explanation = [
    `${report.metrics.sessions.toLocaleString()} sessions from ${report.metrics.totalUsers.toLocaleString()} users last 7d.`,
    `Engagement rate ${(report.metrics.engagementRate * 100).toFixed(1)}%.`,
    ratio > 1.4
      ? "Users come back — return visit ratio is healthy."
      : "Mostly first-time visitors — return rate is low.",
  ].join(" ");

  // GA4 sparkline isn't in fetchGA4Metrics by default; leave empty for now,
  // the email template renders a flat bar when this is empty.
  return {
    hasData: true,
    last7d: {
      sessions: report.metrics.sessions,
      users: report.metrics.totalUsers,
      pageViews: report.metrics.pageViews,
      engagementRate: report.metrics.engagementRate,
      bounceRate: report.metrics.bounceRate,
    },
    topPages: report.topPages.slice(0, 10).map((p) => ({ path: p.path, views: p.pageViews })),
    briefExplanation: explanation,
    trafficSparkline: [],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// §6: System logs deep audit
// ───────────────────────────────────────────────────────────────────────────

async function buildSystemLogs(): Promise<SystemLogs> {
  const since = new Date(Date.now() - DAY_MS);
  const rows = await prisma.cronJobLog.findMany({
    where: { started_at: { gte: since } },
    select: { job_name: true, status: true, error_message: true },
    take: 2000,
  });

  const failed = rows.filter((r) => r.status === "failed");
  const clustered = clusterCronFailures(failed.map((r) => ({ jobName: r.job_name, error: r.error_message }))).sort(
    (a, b) => b.count - a.count,
  );

  const topFailures = clustered.slice(0, 10).map((c) => ({
    jobName: c.jobName,
    failures: c.count,
    lastError: c.lastError,
    severity: severityForFailureCount(c.count),
  }));

  // Meaningful findings — pattern detection.
  const findings: string[] = [];
  if (failed.length === 0 && rows.length > 0) {
    findings.push(`${rows.length} cron runs in the last 24h, all passed.`);
  }
  if (clustered.length > 0 && clustered[0].count >= 3) {
    findings.push(`${clustered[0].jobName} failed ${clustered[0].count}x — recurring failure, not transient.`);
  }
  const dbConnErrors = failed.filter((r) =>
    /can't reach|database server|pooler|econnrefused/i.test(r.error_message || ""),
  ).length;
  if (dbConnErrors >= 3) {
    findings.push(`${dbConnErrors} cron failures due to DB connection issues — Supabase pooler instability.`);
  }
  const aiTimeouts = failed.filter((r) =>
    /timed out|timeout|circuit breaker|insufficient_quota|budget exhausted/i.test(r.error_message || ""),
  ).length;
  if (aiTimeouts >= 3) {
    findings.push(`${aiTimeouts} AI provider timeouts — check provider quota + circuit breakers.`);
  }
  if (rows.length === 0) {
    findings.push("No cron runs in the last 24h — schedule may be paused.");
  }

  return {
    totalCronRuns: rows.length,
    failedRuns: failed.length,
    topFailures,
    meaningfulFindings: findings.length > 0 ? findings : ["No noteworthy patterns in the last 24h."],
  };
}

// ───────────────────────────────────────────────────────────────────────────
// §1: Executive summary (computed AFTER other sections are available)
// ───────────────────────────────────────────────────────────────────────────

function buildExecutiveSummary(
  siteStatus: SectionResult<SiteStatusRow[]>,
  gsc: SectionResult<GscUpdate>,
  systemLogs: SectionResult<SystemLogs>,
): ExecutiveSummary {
  // Average grade across sites.
  let overallGrade: ExecutiveSummary["overallGrade"] = "?";
  let overallScore = 0;
  if (siteStatus.ok && siteStatus.data.length > 0) {
    overallScore = Math.round(siteStatus.data.reduce((s, r) => s + r.publicAuditScore, 0) / siteStatus.data.length);
    overallGrade =
      overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "F";
  }

  const wins: string[] = [];
  const attention: string[] = [];

  if (gsc.ok && gsc.data.hasData) {
    const d = gsc.data.delta;
    if (d.clicks > 0) wins.push(`+${d.clicks} GSC clicks vs prior 7d`);
    if (d.clicks < 0) attention.push(`${d.clicks} GSC clicks vs prior 7d`);
    if (d.positionPlaces > 0.5) wins.push(`Avg position improved ${d.positionPlaces.toFixed(1)} places`);
    if (d.positionPlaces < -0.5) attention.push(`Avg position dropped ${(-d.positionPlaces).toFixed(1)} places`);
  }

  if (systemLogs.ok) {
    if (systemLogs.data.failedRuns === 0 && systemLogs.data.totalCronRuns > 50) {
      wins.push(`All ${systemLogs.data.totalCronRuns} cron runs passed`);
    }
    if (systemLogs.data.failedRuns >= 5) {
      attention.push(`${systemLogs.data.failedRuns} cron failures in 24h`);
    }
  }

  if (siteStatus.ok) {
    const totalCritical = siteStatus.data.reduce((s, r) => s + r.criticalIssues, 0);
    if (totalCritical > 0) attention.push(`${totalCritical} critical audit issues across sites`);
  }

  const oneLine = `${overallGrade} grade across ${siteStatus.ok ? siteStatus.data.length : 0} site(s). ${wins.length} wins, ${attention.length} need attention.`;

  return {
    overallGrade,
    overallScore,
    oneLine,
    topThreeWins: wins.slice(0, 3),
    topThreeAttention: attention.slice(0, 3),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Main entry point — sections 7-19 stub for B3a, real impl in B3b
// ───────────────────────────────────────────────────────────────────────────

async function buildEnArComparison(siteIds: string[]): Promise<EnArComparison> {
  // Publication counts: an article counts as "EN" when content_en is
  // substantive (>200 chars) and "AR" when content_ar is substantive.
  // Bilingual articles count toward both.
  const posts = await prisma.blogPost.findMany({
    where: { siteId: { in: siteIds }, published: true },
    select: { content_en: true, content_ar: true },
    take: 5000,
  });
  const enCount = posts.filter((p) => (p.content_en || "").length > 200).length;
  const arCount = posts.filter((p) => (p.content_ar || "").length > 200).length;

  // GSC traffic split: Arabic URLs contain `/ar/` segment.
  const since = new Date(Date.now() - 7 * DAY_MS);
  const gsc = await prisma.gscPagePerformance.findMany({
    where: { site_id: { in: siteIds }, date: { gte: since } },
    select: { url: true, clicks: true, impressions: true },
    take: 50_000,
  });
  let enClicks = 0;
  let arClicks = 0;
  let enImpressions = 0;
  let arImpressions = 0;
  for (const r of gsc) {
    const isAr = r.url.includes("/ar/");
    if (isAr) {
      arClicks += r.clicks;
      arImpressions += r.impressions;
    } else {
      enClicks += r.clicks;
      enImpressions += r.impressions;
    }
  }

  const notes: string[] = [];
  if (arCount === 0 && enCount > 0) {
    notes.push("No Arabic publications — only English content live.");
  } else if (arCount > 0 && arClicks === 0 && enClicks > 0) {
    notes.push(
      "Arabic articles published but receiving zero clicks — check Arabic SSR (KG-032) or hreflang reciprocity.",
    );
  } else if (enClicks > 0 && arClicks > 0) {
    const ratio = arClicks / enClicks;
    if (ratio > 0.3) notes.push(`Strong Arabic engagement: AR is ${(ratio * 100).toFixed(0)}% of EN traffic.`);
    else notes.push(`Arabic underperforming: AR is only ${(ratio * 100).toFixed(0)}% of EN traffic.`);
  }

  return {
    publications: {
      en: enCount,
      ar: arCount,
      ratio: enCount > 0 ? arCount / enCount : 0,
    },
    traffic: { enClicks, arClicks, enImpressions, arImpressions },
    enArTrafficRatio: enClicks > 0 ? arClicks / enClicks : 0,
    notes,
  };
}

async function buildTrafficSources(siteIds: string[]): Promise<TrafficSources> {
  void siteIds;
  if (!isGA4Configured()) {
    return { hasData: false, sources: [], countries: [] };
  }
  const { fetchGA4TrafficBreakdown } = await import("@/lib/seo/ga4-data-api");
  const breakdown = await fetchGA4TrafficBreakdown("7daysAgo", "today");
  if (!breakdown) {
    return { hasData: false, sources: [], countries: [] };
  }

  // Aggregate sourceMedium → just source (collapse google/organic + google/cpc).
  const bySource = new Map<string, number>();
  let totalSourceSessions = 0;
  for (const r of breakdown.bySourceMedium) {
    const key = r.source || "(direct)";
    bySource.set(key, (bySource.get(key) || 0) + r.sessions);
    totalSourceSessions += r.sessions;
  }
  const sources = [...bySource.entries()]
    .map(([source, sessions]) => ({
      source,
      sessions,
      share: totalSourceSessions > 0 ? sessions / totalSourceSessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const totalCountrySessions = breakdown.byCountry.reduce((s, c) => s + c.sessions, 0);
  const countries = breakdown.byCountry
    .map((c) => ({
      country: c.country,
      sessions: c.sessions,
      share: totalCountrySessions > 0 ? c.sessions / totalCountrySessions : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  return { hasData: true, sources, countries };
}
async function buildAffiliateClicksRevenue(_siteIds: string[]): Promise<AffiliateClicksRevenue> {
  void _siteIds;
  throw new Error("Affiliate clicks/revenue — pending Batch B3b");
}
async function buildAffiliateHealth(_siteIds: string[]): Promise<AffiliateHealth> {
  void _siteIds;
  throw new Error("Affiliate health — pending Batch B3b");
}
async function buildAffiliateComparisons(_siteIds: string[]): Promise<AffiliateComparisons> {
  void _siteIds;
  throw new Error("Affiliate comparisons — pending Batch B3b");
}
async function buildAffiliateTrends(_siteIds: string[]): Promise<AffiliateTrends> {
  void _siteIds;
  throw new Error("Affiliate trends — pending Batch B3b");
}
async function buildAffiliateLinkUpdates(_siteIds: string[]): Promise<AffiliateLinkUpdates> {
  void _siteIds;
  throw new Error("Affiliate link updates — pending Batch B3b");
}
async function buildAbTesting(_siteIds: string[]): Promise<AbTesting> {
  void _siteIds;
  throw new Error("A/B testing — pending Batch B3b");
}
async function buildTechnicalIssues(_siteIds: string[]): Promise<TechnicalIssues> {
  void _siteIds;
  throw new Error("Technical issues — pending Batch B3b");
}
async function buildFixesApplied(_siteIds: string[]): Promise<FixesApplied> {
  void _siteIds;
  throw new Error("Fixes applied — pending Batch B3b");
}
async function buildValidation(_siteIds: string[]): Promise<Validation> {
  void _siteIds;
  throw new Error("Validation — pending Batch B3b");
}
async function buildKpisProgress(_siteIds: string[]): Promise<KpisProgress> {
  void _siteIds;
  throw new Error("KPIs progress — pending Batch B3b");
}
async function buildPerSiteDeepDive(_siteIds: string[]): Promise<PerSiteDeepDive[]> {
  void _siteIds;
  throw new Error("Per-site deep dive — pending Batch B3b");
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

export async function buildDailyBriefing(siteId: string | null): Promise<DailyBriefingData> {
  const start = Date.now();
  const siteIds = siteId ? [siteId] : getActiveSiteIds();

  // Run sections 2-6 in parallel — they're independent.
  const [testsRun, siteStatus, gscUpdate, ga4Numbers, systemLogs] = await Promise.all([
    safe(() => buildTestsRun(siteIds)),
    safe(() => buildSiteStatus(siteIds)),
    safe(() => buildGscUpdate(siteIds)),
    safe(() => buildGa4Numbers(siteIds)),
    safe(() => buildSystemLogs()),
  ]);

  // Sections 7-19 in parallel (currently stubbed).
  const [
    enArComparison,
    trafficSources,
    affiliateClicksRevenue,
    affiliateHealth,
    affiliateComparisons,
    affiliateTrends,
    affiliateLinkUpdates,
    abTesting,
    technicalIssues,
    fixesApplied,
    validation,
    kpisProgress,
    perSiteDeepDive,
  ] = await Promise.all([
    safe(() => buildEnArComparison(siteIds)),
    safe(() => buildTrafficSources(siteIds)),
    safe(() => buildAffiliateClicksRevenue(siteIds)),
    safe(() => buildAffiliateHealth(siteIds)),
    safe(() => buildAffiliateComparisons(siteIds)),
    safe(() => buildAffiliateTrends(siteIds)),
    safe(() => buildAffiliateLinkUpdates(siteIds)),
    safe(() => buildAbTesting(siteIds)),
    safe(() => buildTechnicalIssues(siteIds)),
    safe(() => buildFixesApplied(siteIds)),
    safe(() => buildValidation(siteIds)),
    safe(() => buildKpisProgress(siteIds)),
    safe(() => buildPerSiteDeepDive(siteIds)),
  ]);

  // Executive summary derives from the other sections.
  const executiveSummary: SectionResult<ExecutiveSummary> = {
    ok: true,
    data: buildExecutiveSummary(siteStatus, gscUpdate, systemLogs),
  };

  return {
    metadata: {
      siteId,
      siteIds,
      briefingDate: todayDateString(),
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    },
    sections: {
      executiveSummary,
      testsRun,
      siteStatus,
      gscUpdate,
      ga4Numbers,
      systemLogs,
      enArComparison,
      trafficSources,
      affiliateClicksRevenue,
      affiliateHealth,
      affiliateComparisons,
      affiliateTrends,
      affiliateLinkUpdates,
      abTesting,
      technicalIssues,
      fixesApplied,
      validation,
      kpisProgress,
      perSiteDeepDive,
    },
  };
}
