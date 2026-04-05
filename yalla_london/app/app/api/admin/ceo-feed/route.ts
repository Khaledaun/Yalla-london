export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * CEO Activity Feed API
 *
 * Aggregates platform activity into 4 sections:
 *   1. Timeline — chronological feed of all autonomous actions
 *   2. Self-Healing — diagnostic agent fixes, auto-remediation history
 *   3. Self-Learning — pattern detection, quality trends, system adaptations
 *   4. Observations — technical insights derived from operational data
 *
 * GET /api/admin/ceo-feed?period=24h&siteId=yalla-london
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getActiveSiteIds, getDefaultSiteId } from "@/config/sites";

type PeriodKey = "1h" | "6h" | "12h" | "24h" | "3d" | "7d";

function periodToMs(period: PeriodKey): number {
  const map: Record<PeriodKey, number> = {
    "1h": 3_600_000,
    "6h": 21_600_000,
    "12h": 43_200_000,
    "24h": 86_400_000,
    "3d": 259_200_000,
    "7d": 604_800_000,
  };
  return map[period] || map["24h"];
}

// ─── Timeline event shape ─────────────────────────────────────────────────
interface TimelineEvent {
  id: string;
  time: string;
  icon: "cron" | "fix" | "ai" | "publish" | "index" | "alert" | "manual" | "heal" | "learn";
  title: string;
  detail: string;
  status: "success" | "failed" | "partial" | "info";
  category: string;
  siteId: string | null;
}

// ─── Self-healing record ──────────────────────────────────────────────────
interface HealingRecord {
  id: string;
  time: string;
  agent: string;
  what: string;
  target: string;
  targetType: string;
  fixType: string;
  success: boolean;
  before: string | null;
  after: string | null;
  error: string | null;
}

// ─── Learning insight ─────────────────────────────────────────────────────
interface LearningInsight {
  id: string;
  type: "pattern" | "trend" | "adaptation" | "discovery";
  title: string;
  detail: string;
  evidence: string;
  severity: "info" | "positive" | "warning" | "critical";
  learnedAt: string;
}

// ─── Technical observation ────────────────────────────────────────────────
interface TechObservation {
  id: string;
  area: string;
  title: string;
  detail: string;
  metric: string | null;
  trend: "up" | "down" | "stable" | "new";
  severity: "info" | "positive" | "warning" | "critical";
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");

  const params = request.nextUrl.searchParams;
  const period = (params.get("period") || "24h") as PeriodKey;
  const siteId = params.get("siteId") || null;
  const cutoff = new Date(Date.now() - periodToMs(period));
  const activeSiteIds = siteId ? [siteId] : getActiveSiteIds();

  const timeline: TimelineEvent[] = [];
  const healing: HealingRecord[] = [];
  const insights: LearningInsight[] = [];
  const observations: TechObservation[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: TIMELINE — Build from CronJobLog + AutoFixLog + AuditLog
  // ══════════════════════════════════════════════════════════════════════════

  // 1a. Cron executions
  try {
    const cronWhere: Record<string, unknown> = { started_at: { gte: cutoff } };
    if (siteId) cronWhere.site_id = siteId;

    const cronLogs = await prisma.cronJobLog.findMany({
      where: cronWhere,
      orderBy: { started_at: "desc" },
      take: 100,
    });

    for (const log of cronLogs) {
      const ok = log.status === "completed";
      const failed = log.status === "failed";
      const timedOut = log.timed_out;
      const result = log.result_summary as Record<string, unknown> | null;

      // Determine icon based on job type
      let icon: TimelineEvent["icon"] = "cron";
      if (log.job_name.includes("content") || log.job_name.includes("publish") || log.job_name.includes("selector")) icon = "publish";
      if (log.job_name.includes("seo") || log.job_name.includes("index") || log.job_name.includes("gsc")) icon = "index";
      if (log.job_name.includes("diagnostic") || log.job_name.includes("auto-fix") || log.job_name.includes("sweeper")) icon = "heal";
      if (log.job_name.includes("ai") || log.job_name.includes("generate")) icon = "ai";

      // Build human-readable detail
      let detail = "";
      if (ok) {
        if (log.items_succeeded > 0) detail = `${log.items_succeeded} item${log.items_succeeded > 1 ? "s" : ""} processed`;
        else if (log.items_processed > 0) detail = `${log.items_processed} item${log.items_processed > 1 ? "s" : ""} checked — nothing to do`;
        else detail = "Completed — nothing to process";

        // Enrich with result summary specifics
        if (result) {
          if (result.enhanced) detail = `Expanded ${result.enhanced} thin article${Number(result.enhanced) > 1 ? "s" : ""}`;
          if (result.metaTrimmedPosts) detail += `, trimmed ${result.metaTrimmedPosts} meta tags`;
          if (result.totalArticles) detail = `Created ${result.totalArticles} new article${Number(result.totalArticles) > 1 ? "s" : ""}`;
          if (result.promoted) detail = `Published ${result.promoted} article${Number(result.promoted) > 1 ? "s" : ""} from reservoir`;
          if (result.urlsSubmitted) detail = `Submitted ${result.urlsSubmitted} URL${Number(result.urlsSubmitted) > 1 ? "s" : ""} to search engines`;
          if (result.urlsDiscovered) detail = `Discovered ${result.urlsDiscovered} new URL${Number(result.urlsDiscovered) > 1 ? "s" : ""}`;
        }
      } else if (timedOut) {
        detail = `Ran out of time (${log.duration_ms ? Math.round(log.duration_ms / 1000) : "?"}s). Will retry next run.`;
      } else if (failed) {
        detail = log.error_message?.substring(0, 120) || "Unknown failure";
      }

      timeline.push({
        id: log.id,
        time: (log.started_at || log.created_at).toISOString(),
        icon,
        title: formatJobName(log.job_name),
        detail,
        status: ok ? "success" : failed ? "failed" : timedOut ? "partial" : "info",
        category: "cron",
        siteId: log.site_id,
      });
    }
  } catch (err) {
    console.warn("[ceo-feed] CronJobLog query failed:", err instanceof Error ? err.message : err);
  }

  // 1b. Auto-fix actions (also feeds self-healing section)
  try {
    const fixWhere: Record<string, unknown> = { createdAt: { gte: cutoff } };
    if (siteId) fixWhere.siteId = siteId;

    const autoFixes = await prisma.autoFixLog.findMany({
      where: fixWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    for (const fix of autoFixes) {
      // Timeline entry
      timeline.push({
        id: `fix-${fix.id}`,
        time: fix.createdAt.toISOString(),
        icon: "heal",
        title: `Self-healed: ${formatFixType(fix.fixType)}`,
        detail: `${fix.agent} fixed ${fix.targetType} ${fix.success ? "successfully" : "— FAILED"}`,
        status: fix.success ? "success" : "failed",
        category: "auto-fix",
        siteId: fix.siteId,
      });

      // Healing record with before/after
      healing.push({
        id: fix.id,
        time: fix.createdAt.toISOString(),
        agent: fix.agent,
        what: formatFixType(fix.fixType),
        target: fix.targetId,
        targetType: fix.targetType,
        fixType: fix.fixType,
        success: fix.success,
        before: fix.before ? summarizeJson(fix.before as Record<string, unknown>) : null,
        after: fix.after ? summarizeJson(fix.after as Record<string, unknown>) : null,
        error: fix.error,
      });
    }
  } catch (err) {
    console.warn("[ceo-feed] AutoFixLog query failed:", err instanceof Error ? err.message : err);
  }

  // 1c. AI calls (from ApiUsageLog — these are half the platform activity)
  try {
    const aiWhere: Record<string, unknown> = { createdAt: { gte: cutoff } };
    if (siteId) aiWhere.siteId = siteId;

    const aiCalls = await prisma.apiUsageLog.findMany({
      where: aiWhere,
      orderBy: { createdAt: "desc" },
      take: 150,
    });

    for (const call of aiCalls) {
      const cost = Number(call.estimatedCostUsd) || 0;
      const tokens = Number(call.totalTokens) || 0;
      const model = call.model || "unknown";
      const provider = call.provider || "unknown";
      const task = call.taskType || call.calledFrom || "ai-call";

      let detail = "";
      if (call.success) {
        detail = `${provider}/${model} — ${tokens.toLocaleString()} tokens`;
        if (cost > 0) detail += ` ($${cost.toFixed(4)})`;
        if (call.calledFrom) detail += ` — ${formatCalledFrom(call.calledFrom)}`;
      } else {
        detail = `${provider}/${model} FAILED`;
        if (call.errorMessage) detail += `: ${call.errorMessage.substring(0, 100)}`;
      }

      timeline.push({
        id: `ai-${call.id}`,
        time: call.createdAt.toISOString(),
        icon: "ai",
        title: formatTaskType(task),
        detail,
        status: call.success ? "success" : "failed",
        category: "ai",
        siteId: call.siteId,
      });
    }
  } catch (err) {
    console.warn("[ceo-feed] ApiUsageLog query failed:", err instanceof Error ? err.message : err);
  }

  // 1d. Manual dashboard actions
  try {
    const manualLogs = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: cutoff },
        action: { startsWith: "manual:" },
      },
      orderBy: { timestamp: "desc" },
      take: 30,
    });

    for (const log of manualLogs) {
      const actionName = log.action.replace("manual:", "");
      timeline.push({
        id: `manual-${log.id}`,
        time: log.timestamp.toISOString(),
        icon: "manual",
        title: `You: ${formatActionName(actionName)}`,
        detail: (log.details as Record<string, unknown>)?.summary as string || `${actionName} on ${log.resource || "item"}`,
        status: log.success ? "success" : "failed",
        category: "manual",
        siteId: null,
      });
    }
  } catch (err) {
    console.warn("[ceo-feed] AuditLog manual query failed:", err instanceof Error ? err.message : err);
  }

  // Sort timeline by time descending
  timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: SELF-LEARNING — Pattern detection from operational data
  // ══════════════════════════════════════════════════════════════════════════

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);

    // 3a. Cron failure patterns — detect recurring failures
    const cronFailures = await prisma.cronJobLog.groupBy({
      by: ["job_name"],
      where: {
        status: "failed",
        started_at: { gte: sevenDaysAgo },
        ...(siteId ? { site_id: siteId } : {}),
      },
      _count: { id: true },
    });

    const cronTotal = await prisma.cronJobLog.groupBy({
      by: ["job_name"],
      where: {
        started_at: { gte: sevenDaysAgo },
        ...(siteId ? { site_id: siteId } : {}),
      },
      _count: { id: true },
    });

    const totalMap = new Map<string, number>(cronTotal.map((c) => [c.job_name, c._count.id]));

    for (const failure of cronFailures) {
      const total = totalMap.get(failure.job_name) || 1;
      const failCount = Number(failure._count.id);
      const rate = Math.round((failCount / total) * 100);

      if (rate >= 50 && failCount >= 3) {
        insights.push({
          id: `learn-cron-${failure.job_name}`,
          type: "pattern",
          title: `${formatJobName(failure.job_name)} fails ${rate}% of the time`,
          detail: `${failCount} failures out of ${total} runs in the last 7 days. This job may need attention.`,
          evidence: `${failCount}/${total} runs failed (${rate}%)`,
          severity: rate >= 80 ? "critical" : "warning",
          learnedAt: new Date().toISOString(),
        });
      }
    }

    // 3b. AI provider reliability — which provider works best
    const aiByProvider = await prisma.apiUsageLog.groupBy({
      by: ["provider"],
      where: {
        createdAt: { gte: sevenDaysAgo },
        ...(siteId ? { siteId } : {}),
      },
      _count: { id: true },
      _sum: { estimatedCostUsd: true, totalTokens: true },
      _avg: { estimatedCostUsd: true },
    }).catch(() => []);

    const aiFailsByProvider = await prisma.apiUsageLog.groupBy({
      by: ["provider"],
      where: {
        createdAt: { gte: sevenDaysAgo },
        success: false,
        ...(siteId ? { siteId } : {}),
      },
      _count: { id: true },
    }).catch(() => []);

    const aiFailMap = new Map<string, number>(aiFailsByProvider.map((p) => [p.provider, p._count.id]));

    for (const prov of aiByProvider) {
      const fails = aiFailMap.get(prov.provider) || 0;
      const provCount = Number(prov._count.id);
      const successRate = Math.round(((provCount - fails) / provCount) * 100);
      const cost = Number(prov._sum.estimatedCostUsd) || 0;

      if (successRate < 80 && provCount >= 5) {
        insights.push({
          id: `learn-ai-${prov.provider}`,
          type: "adaptation",
          title: `${prov.provider} has ${successRate}% success rate`,
          detail: `${fails} failures out of ${provCount} calls. Cost: $${cost.toFixed(2)}. The system automatically falls back to other providers when this one fails.`,
          evidence: `${provCount - fails}/${provCount} successful, $${cost.toFixed(2)} spent`,
          severity: successRate < 50 ? "critical" : "warning",
          learnedAt: new Date().toISOString(),
        });
      } else if (provCount >= 3) {
        insights.push({
          id: `learn-ai-reliable-${prov.provider}`,
          type: "discovery",
          title: `${prov.provider} is ${successRate}% reliable (${provCount} calls)`,
          detail: `$${cost.toFixed(2)} total cost this week. ${Number(prov._sum.totalTokens || 0).toLocaleString()} tokens used.`,
          evidence: `${successRate}% success, $${cost.toFixed(2)} cost`,
          severity: "positive",
          learnedAt: new Date().toISOString(),
        });
      }
    }

    // 3c. Auto-fix effectiveness — which fix types work
    const fixStats = await prisma.autoFixLog.groupBy({
      by: ["fixType"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    }).catch(() => []);

    const fixSuccessStats = await prisma.autoFixLog.groupBy({
      by: ["fixType"],
      where: { createdAt: { gte: sevenDaysAgo }, success: true },
      _count: { id: true },
    }).catch(() => []);

    const fixSuccessMap = new Map<string, number>(fixSuccessStats.map((f) => [f.fixType, f._count.id]));

    for (const fix of fixStats) {
      const successes = fixSuccessMap.get(fix.fixType) || 0;
      const fixCount = Number(fix._count.id);
      const rate = Math.round((successes / fixCount) * 100);

      if (fixCount >= 3) {
        insights.push({
          id: `learn-fix-${fix.fixType}`,
          type: "adaptation",
          title: `"${formatFixType(fix.fixType)}" auto-fix: ${rate}% effective`,
          detail: `Applied ${fixCount} times this week. ${successes} succeeded, ${fixCount - successes} failed.`,
          evidence: `${successes}/${fixCount} successful (${rate}%)`,
          severity: rate >= 80 ? "positive" : rate >= 50 ? "info" : "warning",
          learnedAt: new Date().toISOString(),
        });
      }
    }

    // 3d. Content quality evolution
    const recentQuality = await prisma.blogPost.aggregate({
      where: {
        published: true,
        deletedAt: null,
        created_at: { gte: threeDaysAgo },
        siteId: { in: activeSiteIds },
      },
      _avg: { seo_score: true, word_count: true },
      _count: { id: true },
    }).catch(() => null);

    const olderQuality = await prisma.blogPost.aggregate({
      where: {
        published: true,
        deletedAt: null,
        created_at: { gte: sevenDaysAgo, lt: threeDaysAgo },
        siteId: { in: activeSiteIds },
      },
      _avg: { seo_score: true, word_count: true },
      _count: { id: true },
    }).catch(() => null);

    if (recentQuality && olderQuality && recentQuality._count.id > 0 && olderQuality._count.id > 0) {
      const seoTrend = (recentQuality._avg.seo_score || 0) - (olderQuality._avg.seo_score || 0);
      const wcTrend = (recentQuality._avg.word_count || 0) - (olderQuality._avg.word_count || 0);

      if (Math.abs(seoTrend) >= 3) {
        insights.push({
          id: "learn-quality-seo",
          type: "trend",
          title: `SEO scores ${seoTrend > 0 ? "improving" : "declining"}: ${seoTrend > 0 ? "+" : ""}${Math.round(seoTrend)} points`,
          detail: `Recent articles average ${Math.round(recentQuality._avg.seo_score || 0)}/100 vs ${Math.round(olderQuality._avg.seo_score || 0)}/100 from last week.`,
          evidence: `${Math.round(recentQuality._avg.seo_score || 0)} avg (last 3d) vs ${Math.round(olderQuality._avg.seo_score || 0)} avg (days 4-7)`,
          severity: seoTrend > 0 ? "positive" : "warning",
          learnedAt: new Date().toISOString(),
        });
      }

      if (Math.abs(wcTrend) >= 100) {
        insights.push({
          id: "learn-quality-wc",
          type: "trend",
          title: `Article length ${wcTrend > 0 ? "increasing" : "decreasing"}: ${wcTrend > 0 ? "+" : ""}${Math.round(wcTrend)} words`,
          detail: `Recent articles average ${Math.round(recentQuality._avg.word_count || 0)} words vs ${Math.round(olderQuality._avg.word_count || 0)} from last week.`,
          evidence: `${Math.round(recentQuality._avg.word_count || 0)}w avg (last 3d) vs ${Math.round(olderQuality._avg.word_count || 0)}w (days 4-7)`,
          severity: wcTrend > 0 ? "positive" : "warning",
          learnedAt: new Date().toISOString(),
        });
      }
    }

    // 3e. Pipeline bottleneck detection
    const phaseDistribution = await prisma.articleDraft.groupBy({
      by: ["current_phase"],
      where: {
        status: { notIn: ["rejected", "published"] },
        site_id: { in: activeSiteIds },
      },
      _count: { id: true },
    }).catch(() => []);

    const totalActive = phaseDistribution.reduce((sum, p) => sum + p._count.id, 0);
    for (const phase of phaseDistribution) {
      const pct = totalActive > 0 ? Math.round((phase._count.id / totalActive) * 100) : 0;
      if (pct >= 40 && phase._count.id >= 5) {
        insights.push({
          id: `learn-bottleneck-${phase.current_phase}`,
          type: "pattern",
          title: `"${phase.current_phase}" phase is a bottleneck: ${pct}% of drafts stuck here`,
          detail: `${phase._count.id} out of ${totalActive} active drafts are in the ${phase.current_phase} phase. This suggests a slowdown at this stage.`,
          evidence: `${phase._count.id}/${totalActive} drafts (${pct}%)`,
          severity: pct >= 60 ? "critical" : "warning",
          learnedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("[ceo-feed] Learning analysis failed:", err instanceof Error ? err.message : err);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: TECHNICAL OBSERVATIONS — System health insights
  // ══════════════════════════════════════════════════════════════════════════

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    // 4a. Indexing velocity
    const indexedRecent = await prisma.uRLIndexingStatus.count({
      where: {
        status: { in: ["indexed", "verified"] },
        last_inspected_at: { gte: sevenDaysAgo },
        ...(siteId ? { site_id: siteId } : {}),
      },
    }).catch(() => 0);

    const totalTracked = await prisma.uRLIndexingStatus.count({
      where: siteId ? { site_id: siteId } : {},
    }).catch(() => 0);

    if (totalTracked > 0) {
      const indexRate = Math.round((indexedRecent / Math.max(totalTracked, 1)) * 100);
      observations.push({
        id: "obs-index-velocity",
        area: "SEO",
        title: "Indexing Velocity",
        detail: `${indexedRecent} pages confirmed indexed in the last 7 days out of ${totalTracked} tracked.`,
        metric: `${indexRate}%`,
        trend: indexedRecent > 5 ? "up" : indexedRecent > 0 ? "stable" : "down",
        severity: indexRate >= 50 ? "positive" : indexRate >= 20 ? "info" : "warning",
      });
    }

    // 4b. Content pipeline throughput
    const publishedThisWeek = await prisma.blogPost.count({
      where: {
        published: true,
        deletedAt: null,
        created_at: { gte: sevenDaysAgo },
        siteId: { in: activeSiteIds },
      },
    }).catch(() => 0);

    const reservoirSize = await prisma.articleDraft.count({
      where: {
        current_phase: "reservoir",
        site_id: { in: activeSiteIds },
      },
    }).catch(() => 0);

    observations.push({
      id: "obs-content-throughput",
      area: "Content",
      title: "Publishing Velocity",
      detail: `${publishedThisWeek} articles published this week. ${reservoirSize} articles waiting in reservoir.`,
      metric: `${publishedThisWeek}/week`,
      trend: publishedThisWeek >= 7 ? "up" : publishedThisWeek >= 3 ? "stable" : "down",
      severity: publishedThisWeek >= 5 ? "positive" : publishedThisWeek >= 1 ? "info" : "warning",
    });

    // 4c. AI spend
    const aiSpend = await prisma.apiUsageLog.aggregate({
      where: {
        createdAt: { gte: sevenDaysAgo },
        ...(siteId ? { siteId } : {}),
      },
      _sum: { estimatedCostUsd: true, totalTokens: true },
      _count: { id: true },
    }).catch(() => null);

    if (aiSpend) {
      const cost = aiSpend._sum.estimatedCostUsd || 0;
      const tokens = aiSpend._sum.totalTokens || 0;
      observations.push({
        id: "obs-ai-spend",
        area: "AI",
        title: "AI Spend This Week",
        detail: `${aiSpend._count.id} API calls, ${tokens.toLocaleString()} tokens, $${cost.toFixed(2)} total.`,
        metric: `$${cost.toFixed(2)}`,
        trend: cost > 5 ? "up" : "stable",
        severity: cost > 20 ? "warning" : cost > 0 ? "info" : "positive",
      });
    }

    // 4d. Auto-healing effectiveness
    const totalFixes = await prisma.autoFixLog.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }).catch(() => 0);
    const successFixes = await prisma.autoFixLog.count({
      where: { createdAt: { gte: sevenDaysAgo }, success: true },
    }).catch(() => 0);

    if (totalFixes > 0) {
      const rate = Math.round((successFixes / totalFixes) * 100);
      observations.push({
        id: "obs-healing-rate",
        area: "Self-Healing",
        title: "Auto-Fix Success Rate",
        detail: `${successFixes} out of ${totalFixes} auto-fixes succeeded this week (${rate}%).`,
        metric: `${rate}%`,
        trend: rate >= 80 ? "up" : "stable",
        severity: rate >= 80 ? "positive" : rate >= 50 ? "info" : "warning",
      });
    }

    // 4e. Cron system health
    const cronRuns = await prisma.cronJobLog.count({
      where: { started_at: { gte: sevenDaysAgo } },
    }).catch(() => 0);
    const cronFails = await prisma.cronJobLog.count({
      where: { status: "failed", started_at: { gte: sevenDaysAgo } },
    }).catch(() => 0);

    if (cronRuns > 0) {
      const successRate = Math.round(((cronRuns - cronFails) / cronRuns) * 100);
      observations.push({
        id: "obs-cron-health",
        area: "Operations",
        title: "Cron System Health",
        detail: `${cronRuns} cron runs this week, ${cronFails} failures. ${successRate}% success rate.`,
        metric: `${successRate}%`,
        trend: successRate >= 90 ? "up" : successRate >= 70 ? "stable" : "down",
        severity: successRate >= 90 ? "positive" : successRate >= 70 ? "info" : "warning",
      });
    }

    // 4f. GSC search performance
    const gscRecent = await prisma.gscPagePerformance.aggregate({
      where: {
        date: { gte: sevenDaysAgo },
        ...(siteId ? { siteId } : {}),
      },
      _sum: { clicks: true, impressions: true },
    }).catch(() => null);

    if (gscRecent && (gscRecent._sum.clicks || gscRecent._sum.impressions)) {
      observations.push({
        id: "obs-gsc-performance",
        area: "Search",
        title: "Google Search Performance",
        detail: `${gscRecent._sum.clicks?.toLocaleString() || 0} clicks, ${gscRecent._sum.impressions?.toLocaleString() || 0} impressions in the last 7 days.`,
        metric: `${gscRecent._sum.clicks || 0} clicks`,
        trend: (gscRecent._sum.clicks || 0) > 10 ? "up" : "stable",
        severity: (gscRecent._sum.clicks || 0) > 20 ? "positive" : (gscRecent._sum.clicks || 0) > 0 ? "info" : "warning",
      });
    }
  } catch (err) {
    console.warn("[ceo-feed] Observations failed:", err instanceof Error ? err.message : err);
  }

  // ── Summary stats ───────────────────────────────────────────────────────
  const stats = {
    totalEvents: timeline.length,
    successEvents: timeline.filter((e) => e.status === "success").length,
    failedEvents: timeline.filter((e) => e.status === "failed").length,
    healingActions: healing.length,
    healingSuccessRate: healing.length > 0 ? Math.round((healing.filter((h) => h.success).length / healing.length) * 100) : 100,
    insightsCount: insights.length,
    observationsCount: observations.length,
    criticalInsights: insights.filter((i) => i.severity === "critical").length,
  };

  return NextResponse.json({
    success: true,
    period,
    siteId: siteId || "all",
    timestamp: new Date().toISOString(),
    stats,
    timeline: timeline.slice(0, 200),
    healing,
    insights,
    observations,
  });
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatJobName(name: string): string {
  const names: Record<string, string> = {
    "content-builder": "Content Builder",
    "content-builder-create": "Draft Creator",
    "content-selector": "Article Publisher",
    "content-auto-fix": "Content Auto-Fix",
    "content-auto-fix-lite": "Quick Auto-Fix",
    "daily-content-generate": "Content Generator",
    "weekly-topics": "Topic Research",
    "trends-monitor": "Trends Monitor",
    "seo-agent": "SEO Agent",
    "seo-deep-review": "SEO Deep Review",
    "gsc-sync": "Google Search Console Sync",
    "verify-indexing": "Indexing Verifier",
    "scheduled-publish": "Scheduled Publisher",
    "diagnostic-sweep": "Diagnostic Agent",
    "affiliate-injection": "Affiliate Link Injector",
    "sync-advertisers": "CJ Advertiser Sync",
    "sync-commissions": "Commission Sync",
    "discover-deals": "Deal Discovery",
    "analytics": "Analytics Sync",
    "london-news": "London News",
    "social": "Social Media",
    "subscriber-emails": "Subscriber Emails",
    "schedule-executor": "Schedule Executor",
    "sweeper": "Pipeline Sweeper",
    "site-health": "Site Health Check",
    "sitemap-refresh": "Sitemap Refresh",
    "discovery-monitor": "Discovery Monitor",
  };
  return names[name] || name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatFixType(fixType: string): string {
  const types: Record<string, string> = {
    meta_trim: "Trimmed meta description",
    word_expand: "Expanded thin content",
    heading_fix: "Fixed heading hierarchy",
    affiliate_inject: "Injected affiliate links",
    internal_link_add: "Added internal links",
    arabic_meta_gen: "Generated Arabic metadata",
    title_sanitize: "Cleaned article title",
    seo_score_recalc: "Recalculated SEO score",
    orphan_link_add: "Added links to orphan page",
    thin_unpublish: "Unpublished thin article",
    duplicate_unpublish: "Unpublished duplicate",
    broken_link_fix: "Fixed broken links",
    draft_reset: "Reset stuck draft",
    draft_reject: "Rejected failed draft",
    force_raw_assembly: "Forced raw assembly",
    schema_inject: "Injected structured data",
  };
  return types[fixType] || fixType.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatActionName(action: string): string {
  return action.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatTaskType(task: string): string {
  const names: Record<string, string> = {
    content_generation: "Content Generation",
    content_research: "Content Research",
    content_outline: "Content Outline",
    content_drafting: "Content Drafting",
    content_assembly: "Content Assembly",
    content_expansion: "Content Expansion",
    seo_meta_generation: "SEO Meta Generation",
    seo_optimization: "SEO Optimization",
    seo_deep_review: "SEO Deep Review",
    topic_research: "Topic Research",
    arabic_translation: "Arabic Translation",
    article_enhancement: "Article Enhancement",
    diagnostic: "Diagnostic",
    image_generation: "Image Generation",
  };
  return names[task] || task.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function formatCalledFrom(caller: string): string {
  const names: Record<string, string> = {
    "content-builder": "pipeline",
    "content-builder-create": "draft creation",
    "daily-content-generate": "content generator",
    "seo-agent": "SEO agent",
    "seo-deep-review": "SEO review",
    "content-auto-fix": "auto-fix",
    "weekly-topics": "topic research",
    "article-enhancer": "campaign enhancer",
  };
  return names[caller] || caller;
}

function summarizeJson(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val === null || val === undefined) continue;
    if (typeof val === "string" && val.length > 80) {
      parts.push(`${key}: "${val.substring(0, 77)}…"`);
    } else if (typeof val === "object") {
      parts.push(`${key}: {…}`);
    } else {
      parts.push(`${key}: ${val}`);
    }
    if (parts.length >= 4) break;
  }
  return parts.join(" | ");
}
