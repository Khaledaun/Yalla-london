export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Audit Roundup
 *
 * One endpoint that pulls findings from every audit surface in the platform,
 * scores each finding by ROI (severity × pages-affected × fixability / cost),
 * and returns a single ranked action queue.
 *
 * Sources pulled:
 *   - runPublicAudit()        → 6-dimension public-website audit (Batches 1-5)
 *   - getQueueSnapshot()      → pipeline queue health (6 rules)
 *   - CjCommission + Click    → affiliate revenue summary (last 7d / 30d)
 *   - URLIndexingStatus       → indexing rate
 *   - CronJobLog              → recent failure pattern
 *
 * Used by:
 *   - GET /api/admin/audit-roundup     ← this route (dashboard + manual)
 *   - POST /api/cron/audit-roundup     ← Batch 7 (auto-fix cron)
 *   - public_audit_roundup MCP tool    ← Batch 8 (cross-MCP enrichment)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";
import { prisma } from "@/lib/db";
import { runPublicAudit } from "@/app/api/admin/public-audit/route";
import { getQueueSnapshot } from "@/lib/content-pipeline/queue-monitor";

type Severity = "critical" | "high" | "medium" | "low";

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

// Maps known nextAction strings to fixability + cost so we can score them.
// Anything not in this table defaults to manual + medium cost.
type FixProfile = { fixability: "auto" | "semi-auto" | "manual"; cost: number; cron?: string };
const FIX_PROFILE: Record<string, FixProfile> = {
  "image-pipeline": { fixability: "auto", cost: 1, cron: "/api/cron/image-pipeline" },
  "seo-agent": { fixability: "auto", cost: 1, cron: "/api/cron/seo-agent" },
  "seo-deep-review": { fixability: "auto", cost: 1, cron: "/api/cron/seo-deep-review" },
  "content-auto-fix": { fixability: "auto", cost: 1, cron: "/api/cron/content-auto-fix" },
  "content-auto-fix-lite": { fixability: "auto", cost: 1, cron: "/api/cron/content-auto-fix-lite" },
  "affiliate-injection": { fixability: "auto", cost: 1, cron: "/api/cron/affiliate-injection" },
  "diagnostic-sweep": { fixability: "auto", cost: 1, cron: "/api/cron/diagnostic-sweep" },
  "content-cleanup": { fixability: "auto", cost: 5, cron: "/api/admin/content-cleanup" },
  "daily-content-generate": { fixability: "auto", cost: 1, cron: "/api/cron/daily-content-generate" },
  manual: { fixability: "manual", cost: 20 },
};

// Explicit dimension → cron routing. Takes precedence over text-matching
// so we don't accidentally fire content-auto-fix for an affiliate-disclosure
// finding just because the nextAction prose mentions both crons.
//
// Dimensions with no working auto-fix are mapped to "manual" — currently:
//   - affiliatePractices: no cron adds FTC disclosure paragraphs
//   - newsRefresh:        archiving stale news is a human decision
//   - thin-content:       expansion needs human review
//
// When a dimension is missing from this map, profileForAction falls back to
// text-matching against FIX_PROFILE keys (longest match wins).
const DIMENSION_TO_FIX: Record<string, FixProfile> = {
  // Public audit dimensions
  photos: FIX_PROFILE["image-pipeline"],
  unedited: FIX_PROFILE["content-auto-fix"],
  newsRefresh: FIX_PROFILE.manual,
  seoUpdates: FIX_PROFILE["seo-agent"],
  aioAlignment: FIX_PROFILE["seo-deep-review"],
  affiliatePractices: FIX_PROFILE.manual, // no cron adds disclosure paragraphs
  // Indexing dimensions
  "never-submitted": FIX_PROFILE["content-auto-fix-lite"],
  "submission-errors": FIX_PROFILE["seo-agent"],
  // Affiliate revenue dimensions
  "dead-advertisers": FIX_PROFILE["affiliate-injection"],
  "zero-revenue": FIX_PROFILE.manual, // attribution debugging is manual
  // Queue monitor dimensions
  "stuck-24h": FIX_PROFILE["diagnostic-sweep"],
  "drafting-backlog": FIX_PROFILE["diagnostic-sweep"],
  "assembly-stuck": FIX_PROFILE["diagnostic-sweep"],
  "near-max-attempts": FIX_PROFILE["diagnostic-sweep"],
  "pipeline-stalled": FIX_PROFILE["diagnostic-sweep"],
  "diagnostic-stuck": FIX_PROFILE["diagnostic-sweep"],
};

function profileForAction(nextAction: string, dimension?: string): FixProfile {
  // 1. Explicit dimension routing wins — the most reliable signal.
  if (dimension && DIMENSION_TO_FIX[dimension]) {
    return DIMENSION_TO_FIX[dimension];
  }

  // 2. Manual prefix in the action string.
  const lower = nextAction.toLowerCase();
  if (lower.startsWith("manual:") || lower.startsWith("manual ")) {
    return FIX_PROFILE.manual;
  }

  // 3. Text-match fallback. Sort keys longest-first so "content-auto-fix-lite"
  //    beats "content-auto-fix" when both substrings would match.
  const sortedKeys = Object.keys(FIX_PROFILE)
    .filter((k) => k !== "manual")
    .sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lower.includes(key)) return FIX_PROFILE[key];
  }

  return { fixability: "semi-auto", cost: 5 };
}

interface RankedAction {
  source: "public-audit" | "queue-monitor" | "affiliate-revenue" | "indexing" | "cron-failures";
  dimension?: string;
  severity: Severity;
  detail: string;
  affectedSlug?: string;
  pagesAffected: number;
  nextAction: string;
  fixability: "auto" | "semi-auto" | "manual";
  cron?: string;
  cost: number;
  roiScore: number;
}

function scoreAction(severity: Severity, pagesAffected: number, fixability: string, cost: number): number {
  const fxWeight = fixability === "auto" ? 1.0 : fixability === "semi-auto" ? 0.5 : 0.1;
  return Math.round((SEVERITY_WEIGHT[severity] * Math.max(1, pagesAffected) * fxWeight * 100) / (cost + 1));
}

function buildAction(
  source: RankedAction["source"],
  dimension: string | undefined,
  severity: Severity,
  detail: string,
  affectedSlug: string | undefined,
  pagesAffected: number,
  nextAction: string,
): RankedAction {
  const profile = profileForAction(nextAction, dimension);
  return {
    source,
    dimension,
    severity,
    detail,
    affectedSlug,
    pagesAffected,
    nextAction,
    fixability: profile.fixability,
    cron: profile.cron,
    cost: profile.cost,
    roiScore: scoreAction(severity, pagesAffected, profile.fixability, profile.cost),
  };
}

async function buildAffiliateRevenueSummary(siteId: string) {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);
  // OR siteId: null pattern from rule #64 — covers legacy unscoped rows.
  const filter = { OR: [{ siteId }, { siteId: null }] };

  try {
    const [commissions7d, commissions30d, clicks7d, deadAdvertisers] = await Promise.all([
      prisma.cjCommission.aggregate({
        where: { ...filter, eventDate: { gte: d7 } },
        _sum: { commissionAmount: true },
      }),
      prisma.cjCommission.aggregate({
        where: { ...filter, eventDate: { gte: d30 } },
        _sum: { commissionAmount: true },
      }),
      prisma.cjClickEvent.count({
        where: { ...filter, createdAt: { gte: d7 } },
      }),
      prisma.cjAdvertiser.count({
        // AdvertiserStatus enum: JOINED | PENDING | NOT_JOINED | DECLINED
        where: { status: { in: ["DECLINED", "NOT_JOINED"] } },
      }),
    ]);

    return {
      last7dUsd: Number(commissions7d._sum.commissionAmount) || 0,
      last30dUsd: Number(commissions30d._sum.commissionAmount) || 0,
      clicks7d,
      deadAdvertiserCount: deadAdvertisers,
    };
  } catch {
    // CJ tables may not exist on every site. Don't block the roundup.
    return {
      last7dUsd: 0,
      last30dUsd: 0,
      clicks7d: 0,
      deadAdvertiserCount: 0,
      _unavailable: true,
    };
  }
}

async function buildIndexingSummary(siteId: string) {
  const [indexed, neverSubmitted, withErrors] = await Promise.all([
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "indexed" } }),
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, submitted_indexnow: false, submitted_google_api: false },
    }),
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, last_error: { not: null } },
    }),
  ]);
  return { indexed, neverSubmitted, withErrors };
}

async function buildCronFailureSummary() {
  const since = new Date(Date.now() - 24 * 3600000);
  const failed = await prisma.cronJobLog.findMany({
    where: { status: "failed", started_at: { gte: since } },
    orderBy: { started_at: "desc" },
    take: 20,
    select: { job_name: true, error_message: true, started_at: true },
  });
  // Cluster by job_name so 5 failures of one cron count as one finding.
  const byJob = new Map<string, { count: number; lastError: string }>();
  for (const f of failed) {
    const cur = byJob.get(f.job_name) || { count: 0, lastError: "" };
    cur.count++;
    if (!cur.lastError && f.error_message) cur.lastError = f.error_message.slice(0, 200);
    byJob.set(f.job_name, cur);
  }
  return [...byJob.entries()].map(([job, { count, lastError }]) => ({ job, count, lastError }));
}

export async function runAuditRoundup(siteId: string) {
  const start = Date.now();
  const [publicAudit, queue, revenue, indexing, cronFailures] = await Promise.all([
    runPublicAudit(siteId, 500),
    getQueueSnapshot(siteId),
    buildAffiliateRevenueSummary(siteId),
    buildIndexingSummary(siteId),
    buildCronFailureSummary(),
  ]);

  // Convert each source's findings to RankedAction[]
  const actions: RankedAction[] = [];

  // Public audit topActions — already severity-ranked, one per dim.
  for (const a of publicAudit.topActions) {
    actions.push(buildAction("public-audit", a.dimension, a.severity, a.detail, a.affectedSlug, 1, a.nextAction));
  }

  // Queue monitor — only surface critical/high.
  for (const rule of queue.healthRules) {
    if (rule.severity !== "critical" && rule.severity !== "high") continue;
    const sev: Severity = rule.severity;
    actions.push(
      buildAction(
        "queue-monitor",
        rule.id,
        sev,
        rule.description,
        undefined,
        rule.affectedDrafts.length || 1,
        rule.autoFixAvailable ? `Run diagnostic-sweep — auto-fixes "${rule.id}"` : `manual: investigate ${rule.id}`,
      ),
    );
  }

  // Affiliate revenue — surface dead advertisers + zero-revenue weeks as
  // findings. Not technically a "finding" but worth ranking against fixes.
  if (revenue.deadAdvertiserCount > 0) {
    actions.push(
      buildAction(
        "affiliate-revenue",
        "dead-advertisers",
        "high",
        `${revenue.deadAdvertiserCount} CJ advertisers in DECLINED/NOT_JOINED status — links earn $0`,
        undefined,
        revenue.deadAdvertiserCount,
        "Run affiliate-injection cron — swaps dead links for live partners",
      ),
    );
  }
  if (revenue.last7dUsd === 0 && revenue.clicks7d > 0) {
    actions.push(
      buildAction(
        "affiliate-revenue",
        "zero-revenue",
        "medium",
        `${revenue.clicks7d} affiliate clicks in last 7d but $0 commission — attribution chain broken`,
        undefined,
        1,
        "manual: verify SID parameter format on tracked links",
      ),
    );
  }

  // Indexing — never-submitted backlog as a single finding.
  if (indexing.neverSubmitted >= 20) {
    actions.push(
      buildAction(
        "indexing",
        "never-submitted",
        "high",
        `${indexing.neverSubmitted} URLs never submitted to IndexNow — invisible to Bing/Yandex`,
        undefined,
        indexing.neverSubmitted,
        "Run content-auto-fix-lite — Section 7 catches these in batches of 200",
      ),
    );
  }
  if (indexing.withErrors >= 10) {
    actions.push(
      buildAction(
        "indexing",
        "submission-errors",
        "medium",
        `${indexing.withErrors} URLs have IndexNow submission errors`,
        undefined,
        indexing.withErrors,
        "Run seo-agent — retries failed submissions with exponential backoff",
      ),
    );
  }

  // Cron failures — each clustered job = one finding.
  for (const f of cronFailures) {
    if (f.count < 2) continue; // single failures aren't worth surfacing
    const sev: Severity = f.count >= 5 ? "critical" : "high";
    actions.push(
      buildAction(
        "cron-failures",
        f.job,
        sev,
        `${f.job} failed ${f.count}x in 24h — last error: ${f.lastError || "(no message)"}`,
        undefined,
        1,
        `manual: check CEO Inbox for ${f.job} auto-fix attempts`,
      ),
    );
  }

  // Sort by ROI score descending. Cap at 20 for surfacing, keep all in `all`.
  actions.sort((a, b) => b.roiScore - a.roiScore);
  const topActions = actions.slice(0, 20);

  // Plain-language summary.
  const totalCritical = actions.filter((a) => a.severity === "critical").length;
  const totalHigh = actions.filter((a) => a.severity === "high").length;
  const autoFixable = actions.filter((a) => a.fixability === "auto").length;
  const summary =
    actions.length === 0
      ? `Site ${siteId} is healthy. No critical or high actions across 5 audit sources.`
      : `Site ${siteId}: ${totalCritical} critical + ${totalHigh} high-severity actions across ${actions.length} total findings. ${autoFixable} are auto-fixable. Top action by ROI: ${topActions[0]?.detail || "(none)"}`;

  return {
    site: siteId,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    sources: {
      publicAudit: {
        grade: publicAudit.overallGrade,
        score: publicAudit.overallScore,
        critical: Object.values(publicAudit.dimensions).reduce((s, d) => s + d.bySeverity.critical, 0),
        high: Object.values(publicAudit.dimensions).reduce((s, d) => s + d.bySeverity.high, 0),
      },
      queueMonitor: {
        health: queue.overallHealth,
        criticalRules: queue.healthRules.filter((r) => r.severity === "critical").length,
      },
      affiliateRevenue: revenue,
      indexing,
      cronFailures: { uniqueJobs: cronFailures.length, totalFailures: cronFailures.reduce((s, f) => s + f.count, 0) },
    },
    totals: {
      findings: actions.length,
      critical: totalCritical,
      high: totalHigh,
      autoFixable,
    },
    topActions,
    allActions: actions,
    plainLanguageSummary: summary,
    _format: "yalla-audit-roundup-v1",
  };
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;
  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  try {
    const report = await runAuditRoundup(siteId);
    return NextResponse.json({ success: true, ...report });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
