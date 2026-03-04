export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

/**
 * Action Logs API — Unified log viewer for all platform activity
 *
 * Aggregates data from CronJobLog, AutoFixLog, ApiUsageLog, AuditLog,
 * and SeoAuditReport into a single chronological feed.
 *
 * Features:
 * - 21-day retention window
 * - Filter by: period, site, category, function, status
 * - Plain-language summaries for each action
 * - JSON export per task/category/period/site/function
 * - Failed actions include root cause + fix instructions
 *
 * GET /api/admin/action-logs?period=24h&siteId=yalla-london&category=cron&status=failed
 * GET /api/admin/action-logs?export=json&period=7d
 * POST /api/admin/action-logs { action: "cleanup" } — purge logs older than 21 days
 */

interface ActionLog {
  id: string;
  timestamp: string;
  category: "cron" | "auto-fix" | "ai-call" | "audit" | "manual" | "seo";
  action: string;
  status: "success" | "failed" | "partial" | "timeout" | "running";
  siteId: string | null;
  durationMs: number | null;
  summary: string; // Plain-language description
  outcome: string | null; // What was produced (saved URL, count, etc.)
  error: string | null; // Plain-language error
  fix: string | null; // What to do about it
  details: Record<string, unknown>; // Full data for JSON export
}

type PeriodKey = "1h" | "12h" | "24h" | "3d" | "7d" | "14d" | "21d";

function periodToMs(period: PeriodKey): number {
  const map: Record<PeriodKey, number> = {
    "1h": 3_600_000,
    "12h": 43_200_000,
    "24h": 86_400_000,
    "3d": 259_200_000,
    "7d": 604_800_000,
    "14d": 1_209_600_000,
    "21d": 1_814_400_000,
  };
  return map[period] || map["24h"];
}

// Plain-language error interpreter
function interpretError(jobName: string, error: string | null): { summary: string; fix: string } {
  if (!error) return { summary: "Unknown error", fix: "Check the full error in JSON export" };

  const e = error.toLowerCase();

  if (e.includes("timeout") || e.includes("timed out") || e.includes("aborted"))
    return { summary: `${jobName} ran out of time before finishing`, fix: "This usually means too many items per run. The system will retry next scheduled run with remaining items." };

  if (e.includes("rate limit") || e.includes("429") || e.includes("too many requests"))
    return { summary: `${jobName} was rate-limited by an external API`, fix: "Reduce batch sizes or add delays between API calls. Will auto-retry next run." };

  if (e.includes("connection") || e.includes("econnrefused") || e.includes("enotfound"))
    return { summary: `${jobName} couldn't reach an external service`, fix: "Check if the target service (Google, AI provider, DB) is up. Network issues usually resolve on their own." };

  if (e.includes("unauthorized") || e.includes("401") || e.includes("forbidden") || e.includes("403"))
    return { summary: `${jobName} was rejected — bad credentials`, fix: "Check API keys in Settings tab. The relevant key may have expired or been rotated." };

  if (e.includes("prisma") || e.includes("database") || e.includes("relation") || e.includes("column"))
    return { summary: `${jobName} hit a database error`, fix: "Run 'Scan Schema' then 'Fix All' in Settings → Database Migration. A new table or column may be missing." };

  if (e.includes("ai") || e.includes("provider") || e.includes("model") || e.includes("completion"))
    return { summary: `${jobName} failed during AI generation`, fix: "Check AI Config tab. The AI provider may be down or the API key may have hit its spending limit." };

  if (e.includes("no topic") || e.includes("no draft") || e.includes("no article") || e.includes("nothing to"))
    return { summary: `${jobName} had nothing to process`, fix: "This is normal — there's no work queued. Generate topics first, then content will flow." };

  if (e.includes("budget") || e.includes("exhausted"))
    return { summary: `${jobName} ran out of processing budget`, fix: "The job processed what it could within the time limit. Remaining items will be picked up next run." };

  return { summary: `${jobName} failed: ${error.substring(0, 150)}`, fix: "Check the full error details in the JSON export for debugging." };
}

// Plain-language outcome summary
function summarizeOutcome(jobName: string, result: Record<string, unknown> | null, itemsProcessed: number, itemsSucceeded: number): string {
  if (!result && itemsProcessed === 0) return "No items to process";
  if (!result) return `Processed ${itemsProcessed} items (${itemsSucceeded} succeeded)`;

  const r = result;

  // Content generation
  if (jobName === "daily-content-generate") {
    const sites = Object.keys(r.sites || r || {}).filter(k => k !== "message" && k !== "totalArticles");
    return `Generated articles for ${sites.length} site(s). ${r.totalArticles || itemsSucceeded} article(s) created.`;
  }

  // Content auto-fix
  if (jobName === "content-auto-fix") {
    const parts: string[] = [];
    if (r.enhanced) parts.push(`${r.enhanced} expanded`);
    if (r.enhancedLowScore) parts.push(`${r.enhancedLowScore} quality-boosted`);
    if (r.metaTrimmedPosts || r.metaTrimmedDrafts) parts.push(`${(r.metaTrimmedPosts as number || 0) + (r.metaTrimmedDrafts as number || 0)} meta trimmed`);
    if (r.stuckUnstuck) parts.push(`${r.stuckUnstuck} unstuck`);
    if (r.stuckRejected) parts.push(`${r.stuckRejected} rejected`);
    if (r.internalLinksInjected) parts.push(`${r.internalLinksInjected} links added`);
    return parts.length > 0 ? parts.join(", ") : "No fixes needed";
  }

  // Weekly topics
  if (jobName === "weekly-topics") {
    return `Generated ${r.totalGenerated || r.savedCount || itemsSucceeded} topic(s). ${r.savedCount || ""} saved to DB.`;
  }

  // SEO agent
  if (jobName === "seo-agent") {
    return `SEO fixes applied. ${itemsSucceeded} item(s) updated.`;
  }

  // GSC sync
  if (jobName === "gsc-sync") {
    return `Synced ${itemsProcessed} page performance records from Google Search Console.`;
  }

  // Verify indexing
  if (jobName === "verify-indexing") {
    return `Checked ${itemsProcessed} URL(s) against Google index. ${itemsSucceeded} confirmed indexed.`;
  }

  // Content builder
  if (jobName === "content-builder") {
    return `Advanced ${itemsSucceeded} draft(s) through pipeline phases.`;
  }

  // Content selector
  if (jobName === "content-selector") {
    return `Promoted ${itemsSucceeded} article(s) from reservoir to published.`;
  }

  // Scheduled publish
  if (jobName.includes("publish")) {
    return `Published ${itemsSucceeded} scheduled article(s).`;
  }

  // Generic
  return `${itemsSucceeded}/${itemsProcessed} items processed successfully.`;
}

export async function GET(request: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const params = request.nextUrl.searchParams;
    const period = (params.get("period") || "24h") as PeriodKey;
    const siteId = params.get("siteId") || null;
    const category = params.get("category") || null;
    const status = params.get("status") || null;
    const functionName = params.get("function") || null;
    const isExport = params.get("export") === "json";
    const limit = Math.min(parseInt(params.get("limit") || "200"), 500);

    const cutoff = new Date(Date.now() - periodToMs(period));
    const logs: ActionLog[] = [];

    // ══════════════════════════════════════════════════════════════════
    // SOURCE 1: CronJobLog — all cron executions
    // ══════════════════════════════════════════════════════════════════
    if (!category || category === "cron") {
      try {
        const where: Record<string, unknown> = { started_at: { gte: cutoff } };
        if (siteId) where.site_id = siteId;
        if (functionName) where.job_name = functionName;
        if (status) {
          const statusMap: Record<string, string[]> = {
            success: ["completed"],
            failed: ["failed"],
            partial: ["partial", "timed_out"],
            timeout: ["timeout", "timed_out"],
            running: ["running"],
          };
          where.status = { in: statusMap[status] || [status] };
        }

        const cronLogs = await prisma.cronJobLog.findMany({
          where,
          orderBy: { started_at: "desc" },
          take: limit,
        });

        for (const log of cronLogs) {
          const statusNorm: ActionLog["status"] =
            log.status === "completed" ? "success" :
            log.status === "failed" ? "failed" :
            log.status === "timed_out" || log.timed_out ? "timeout" :
            log.status === "partial" ? "partial" : "running";

          const result = log.result_summary as Record<string, unknown> | null;
          const errorInfo = statusNorm === "failed" || statusNorm === "timeout"
            ? interpretError(log.job_name, log.error_message)
            : null;

          logs.push({
            id: log.id,
            timestamp: (log.started_at || log.created_at).toISOString(),
            category: "cron",
            action: log.job_name,
            status: statusNorm,
            siteId: log.site_id,
            durationMs: log.duration_ms,
            summary: statusNorm === "success" || statusNorm === "partial"
              ? summarizeOutcome(log.job_name, result, log.items_processed, log.items_succeeded)
              : errorInfo?.summary || `${log.job_name} ${statusNorm}`,
            outcome: statusNorm === "success"
              ? summarizeOutcome(log.job_name, result, log.items_processed, log.items_succeeded)
              : null,
            error: statusNorm !== "success" ? (errorInfo?.summary || log.error_message) : null,
            fix: statusNorm !== "success" ? (errorInfo?.fix || null) : null,
            details: {
              jobName: log.job_name,
              jobType: log.job_type,
              itemsProcessed: log.items_processed,
              itemsSucceeded: log.items_succeeded,
              itemsFailed: log.items_failed,
              sitesProcessed: log.sites_processed,
              sitesSkipped: log.sites_skipped,
              timedOut: log.timed_out,
              durationMs: log.duration_ms,
              resultSummary: result,
              errorMessage: log.error_message,
              errorStack: isExport ? log.error_stack : undefined,
            },
          });
        }
      } catch (cronErr) {
        console.warn("[action-logs] CronJobLog query failed:", cronErr instanceof Error ? cronErr.message : cronErr);
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // SOURCE 2: AutoFixLog — automated remediation actions
    // ══════════════════════════════════════════════════════════════════
    if (!category || category === "auto-fix") {
      try {
        const where: Record<string, unknown> = { createdAt: { gte: cutoff } };
        if (siteId) where.siteId = siteId;

        const autoFixLogs = await prisma.autoFixLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: Math.min(limit, 100),
        });

        for (const log of autoFixLogs) {
          logs.push({
            id: log.id,
            timestamp: log.createdAt.toISOString(),
            category: "auto-fix",
            action: `${log.agent}: ${log.fixType}`,
            status: log.success ? "success" : "failed",
            siteId: log.siteId,
            durationMs: null,
            summary: log.success
              ? `Auto-fixed ${log.targetType} ${log.targetId}: ${log.fixType}`
              : `Auto-fix failed on ${log.targetType} ${log.targetId}`,
            outcome: log.success ? `Fixed ${log.targetType} → ${log.fixType}` : null,
            error: log.error,
            fix: log.error ? "Check the target content and retry the auto-fix manually." : null,
            details: {
              agent: log.agent,
              fixType: log.fixType,
              targetType: log.targetType,
              targetId: log.targetId,
              before: isExport ? log.before : undefined,
              after: isExport ? log.after : undefined,
            },
          });
        }
      } catch {
        // AutoFixLog table may not exist
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // SOURCE 3: ApiUsageLog — AI API calls with costs
    // ══════════════════════════════════════════════════════════════════
    if (!category || category === "ai-call") {
      try {
        const where: Record<string, unknown> = { createdAt: { gte: cutoff } };
        if (siteId) where.siteId = siteId;
        if (functionName) where.calledFrom = functionName;
        if (status === "failed") where.success = false;
        else if (status === "success") where.success = true;

        const aiLogs = await prisma.apiUsageLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: Math.min(limit, 100),
        });

        for (const log of aiLogs) {
          logs.push({
            id: log.id,
            timestamp: log.createdAt.toISOString(),
            category: "ai-call",
            action: `${log.provider}/${log.model} → ${log.taskType}`,
            status: log.success ? "success" : "failed",
            siteId: log.siteId,
            durationMs: null,
            summary: log.success
              ? `${log.provider} ${log.taskType}: ${log.totalTokens} tokens ($${(log.estimatedCostUsd || 0).toFixed(4)})`
              : `${log.provider} ${log.taskType} failed`,
            outcome: log.success ? `${log.totalTokens} tokens, $${(log.estimatedCostUsd || 0).toFixed(4)}` : null,
            error: log.errorMessage,
            fix: log.errorMessage ? "Check AI Config tab. Provider may be down or key expired." : null,
            details: {
              provider: log.provider,
              model: log.model,
              taskType: log.taskType,
              calledFrom: log.calledFrom,
              promptTokens: log.promptTokens,
              completionTokens: log.completionTokens,
              totalTokens: log.totalTokens,
              estimatedCostUsd: log.estimatedCostUsd,
            },
          });
        }
      } catch {
        // ApiUsageLog table may not exist
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // SOURCE 4: SeoAuditReport — audit snapshots
    // ══════════════════════════════════════════════════════════════════
    if (!category || category === "audit" || category === "seo") {
      try {
        const where: Record<string, unknown> = { createdAt: { gte: cutoff } };
        if (siteId) where.siteId = siteId;

        const auditLogs = await prisma.seoAuditReport.findMany({
          where,
          select: {
            id: true,
            siteId: true,
            healthScore: true,
            totalFindings: true,
            criticalCount: true,
            highCount: true,
            summary: true,
            triggeredBy: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: Math.min(limit, 50),
        });

        for (const log of auditLogs) {
          logs.push({
            id: log.id,
            timestamp: log.createdAt.toISOString(),
            category: "audit",
            action: `SEO Audit (${log.triggeredBy})`,
            status: log.criticalCount > 0 ? "partial" : "success",
            siteId: log.siteId,
            durationMs: null,
            summary: log.summary || `Health score: ${log.healthScore}/100, ${log.totalFindings} findings`,
            outcome: `Health: ${log.healthScore}/100 | ${log.criticalCount} critical, ${log.highCount} high`,
            error: log.criticalCount > 0 ? `${log.criticalCount} critical issue(s) found` : null,
            fix: log.criticalCount > 0 ? "Open the audit report from Sites tab → Reports to see details and fix actions." : null,
            details: {
              healthScore: log.healthScore,
              totalFindings: log.totalFindings,
              criticalCount: log.criticalCount,
              highCount: log.highCount,
              triggeredBy: log.triggeredBy,
              reportUrl: `/admin/cockpit?tab=sites`,
            },
          });
        }
      } catch {
        // SeoAuditReport table may not exist
      }
    }

    // ── Sort all logs by timestamp descending ──
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // ── Trim to limit ──
    const trimmedLogs = logs.slice(0, limit);

    // ── Compute stats ──
    const stats = {
      total: trimmedLogs.length,
      success: trimmedLogs.filter(l => l.status === "success").length,
      failed: trimmedLogs.filter(l => l.status === "failed").length,
      partial: trimmedLogs.filter(l => l.status === "partial").length,
      timeout: trimmedLogs.filter(l => l.status === "timeout").length,
      running: trimmedLogs.filter(l => l.status === "running").length,
      byCategory: {
        cron: trimmedLogs.filter(l => l.category === "cron").length,
        autoFix: trimmedLogs.filter(l => l.category === "auto-fix").length,
        aiCall: trimmedLogs.filter(l => l.category === "ai-call").length,
        audit: trimmedLogs.filter(l => l.category === "audit").length,
      },
    };

    // ── Available filters for UI ──
    const availableFilters = {
      periods: ["1h", "12h", "24h", "3d", "7d", "14d", "21d"] as PeriodKey[],
      categories: ["cron", "auto-fix", "ai-call", "audit"],
      statuses: ["success", "failed", "partial", "timeout", "running"],
      functions: [...new Set(trimmedLogs.filter(l => l.category === "cron").map(l => l.action))].sort(),
    };

    return NextResponse.json({
      success: true,
      period,
      siteId: siteId || "all",
      stats,
      logs: trimmedLogs,
      filters: availableFilters,
      exportUrl: isExport ? undefined : `/api/admin/action-logs?export=json&period=${period}${siteId ? `&siteId=${siteId}` : ""}${category ? `&category=${category}` : ""}`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[action-logs] Failed:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;

    // ── ACTION: Cleanup old logs ──
    if (action === "cleanup") {
      const { prisma } = await import("@/lib/db");
      const twentyOneDaysAgo = new Date(Date.now() - 21 * 86_400_000);
      let deleted = 0;

      try {
        const result = await prisma.cronJobLog.deleteMany({
          where: { started_at: { lt: twentyOneDaysAgo } },
        });
        deleted += result.count;
      } catch { /* table may not exist */ }

      try {
        const result = await prisma.autoFixLog.deleteMany({
          where: { createdAt: { lt: twentyOneDaysAgo } },
        });
        deleted += result.count;
      } catch { /* table may not exist */ }

      return NextResponse.json({ success: true, deleted, message: `Cleaned up ${deleted} log entries older than 21 days` });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[action-logs] POST failed:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
