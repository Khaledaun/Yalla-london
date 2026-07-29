/**
 * Operations Feed API — Unified chronological feed of all platform operations.
 * Powers the Tube Map activity overlay and train movement animations.
 *
 * Merges: CronJobLog + AutoFixLog + enhancement_log into one stream.
 * All queries scoped by siteId (mandatory).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 60;

// ─── Agent display names ────────────────────────────────────────────────────

const AGENT_DISPLAY: Record<string, { name: string; icon: string }> = {
  "content-builder": { name: "Content Builder", icon: "🏗️" },
  "content-builder-create": { name: "Draft Creator", icon: "📝" },
  "content-selector": { name: "Publisher", icon: "📰" },
  "seo-agent": { name: "SEO Agent", icon: "🔍" },
  "seo-deep-review": { name: "SEO Review", icon: "🔬" },
  "affiliate-injection": { name: "Affiliate Agent", icon: "💰" },
  "content-auto-fix": { name: "Auto-Fix", icon: "🔧" },
  "content-auto-fix-lite": { name: "Auto-Fix Lite", icon: "🪛" },
  "weekly-topics": { name: "Topic Generator", icon: "💡" },
  "daily-content-generate": { name: "Content Generator", icon: "✍️" },
  "scheduled-publish": { name: "Scheduler", icon: "📅" },
  "schedule-executor": { name: "Schedule Runner", icon: "⏰" },
  "gsc-sync": { name: "GSC Sync", icon: "📊" },
  "process-indexing-queue": { name: "IndexNow", icon: "🌐" },
  "diagnostic-sweep": { name: "Diagnostics", icon: "🩺" },
  "sweeper": { name: "Sweeper", icon: "🧹" },
  "london-news": { name: "News Agent", icon: "📰" },
  "sync-advertisers": { name: "CJ Sync", icon: "🤝" },
  "image-pipeline": { name: "Image Agent", icon: "📷" },
  "retention-executor": { name: "Retention", icon: "📧" },
  "ceo-intelligence": { name: "CEO Brain", icon: "🧠" },
  "reserve-publisher": { name: "Reserve Publisher", icon: "🛟" },
  manual: { name: "Manual Action", icon: "👤" },
};

function getAgentDisplay(jobName: string): { name: string; icon: string } {
  return AGENT_DISPLAY[jobName] ?? { name: jobName, icon: "⚙️" };
}

// ─── Build action description from cron result_summary ──────────────────────

function buildActionDescription(
  jobName: string,
  status: string,
  itemsProcessed: number,
  itemsSucceeded: number,
  itemsFailed: number,
  resultSummary: Record<string, unknown> | null
): string {
  if (status === "failed") {
    return `Failed after processing ${itemsProcessed} items`;
  }

  // Try to build a specific description from result_summary
  if (resultSummary) {
    const rs = resultSummary;

    if (jobName === "content-selector" || jobName === "scheduled-publish") {
      const published = (rs.published as number) ?? (rs.articlesPublished as number) ?? itemsSucceeded;
      if (published > 0) return `Published ${published} article${published > 1 ? "s" : ""}`;
      return "Checked reservoir — nothing ready to publish";
    }

    if (jobName === "content-builder" || jobName === "content-builder-create") {
      const advanced = (rs.advanced as number) ?? (rs.draftsAdvanced as number) ?? itemsSucceeded;
      if (advanced > 0) return `Advanced ${advanced} draft${advanced > 1 ? "s" : ""} through pipeline`;
      return `Processed ${itemsProcessed} draft${itemsProcessed !== 1 ? "s" : ""}`;
    }

    if (jobName === "seo-agent") {
      const parts: string[] = [];
      if (rs.metaFixed) parts.push(`${rs.metaFixed} meta fixes`);
      if (rs.linksInjected) parts.push(`${rs.linksInjected} links injected`);
      if (rs.schemaInjected) parts.push(`${rs.schemaInjected} schemas`);
      if (parts.length > 0) return parts.join(", ");
      return `Optimized ${itemsSucceeded} article${itemsSucceeded !== 1 ? "s" : ""}`;
    }

    if (jobName === "affiliate-injection") {
      const injected = (rs.injected as number) ?? itemsSucceeded;
      if (injected > 0) return `Injected affiliate links on ${injected} article${injected > 1 ? "s" : ""}`;
      return "Scanned articles — all have affiliate links";
    }

    if (jobName === "process-indexing-queue") {
      const submitted = (rs.indexNowSubmitted as number) ?? (rs.totalIndexNowSubmitted as number) ?? itemsSucceeded;
      if (submitted > 0) return `Submitted ${submitted} URL${submitted > 1 ? "s" : ""} to IndexNow`;
      return `Processed ${itemsProcessed} URLs`;
    }

    if (jobName === "gsc-sync") {
      const clicks = rs.totalClicks ?? rs.clicks;
      if (clicks !== undefined) return `Synced GSC data: ${clicks} clicks today`;
      return "Synced Google Search Console data";
    }

    if (jobName === "weekly-topics") {
      const topics = (rs.topicsCreated as number) ?? itemsSucceeded;
      if (topics > 0) return `Generated ${topics} new topic${topics > 1 ? "s" : ""}`;
      return "Checked topic pool — sufficient topics available";
    }
  }

  // Generic fallback
  if (itemsSucceeded > 0) {
    return `Processed ${itemsSucceeded} item${itemsSucceeded > 1 ? "s" : ""} successfully`;
  }
  if (itemsProcessed > 0) {
    return `Processed ${itemsProcessed} item${itemsProcessed !== 1 ? "s" : ""}`;
  }
  return status === "completed" ? "Completed successfully" : `Status: ${status}`;
}

// ─── Extract phase changes from result_summary ──────────────────────────────

interface PhaseChange {
  articleId: string;
  from: string;
  to: string;
}

function extractPhaseChanges(
  jobName: string,
  resultSummary: Record<string, unknown> | null
): PhaseChange[] {
  if (!resultSummary) return [];
  const changes: PhaseChange[] = [];

  // content-builder logs phase advances
  const advanced = resultSummary.advancedDrafts as Array<{
    id?: string;
    draftId?: string;
    from?: string;
    to?: string;
    fromPhase?: string;
    toPhase?: string;
  }> | undefined;

  if (Array.isArray(advanced)) {
    for (const a of advanced) {
      const id = a.id ?? a.draftId;
      const from = a.from ?? a.fromPhase;
      const to = a.to ?? a.toPhase;
      if (id && from && to) {
        changes.push({ articleId: id, from, to });
      }
    }
  }

  // content-selector logs promotions
  const promoted = resultSummary.promotedArticles as Array<{
    id?: string;
    draftId?: string;
    blogPostId?: string;
  }> | undefined;

  if (Array.isArray(promoted)) {
    for (const p of promoted) {
      changes.push({
        articleId: p.blogPostId ?? p.draftId ?? p.id ?? "unknown",
        from: "reservoir",
        to: "published",
      });
    }
  }

  return changes;
}

// ─── Build details array from result_summary ────────────────────────────────

function buildDetails(
  resultSummary: Record<string, unknown> | null,
  itemsFailed: number,
  errorMessage: string | null
): string[] {
  const details: string[] = [];

  if (itemsFailed > 0) {
    details.push(`${itemsFailed} item${itemsFailed > 1 ? "s" : ""} failed`);
  }
  if (errorMessage) {
    // Trim long error messages
    details.push(errorMessage.length > 120 ? errorMessage.slice(0, 117) + "..." : errorMessage);
  }

  if (resultSummary) {
    // Surface useful summary fields
    if (typeof resultSummary.aiCostUsd === "number" && resultSummary.aiCostUsd > 0) {
      details.push(`AI cost: $${(resultSummary.aiCostUsd as number).toFixed(3)}`);
    }
    if (typeof resultSummary.skippedSites === "object" && Array.isArray(resultSummary.skippedSites)) {
      const skipped = resultSummary.skippedSites as string[];
      if (skipped.length > 0) details.push(`Skipped sites: ${skipped.join(", ")}`);
    }
  }

  return details;
}

// ─── Extract article IDs from result_summary ────────────────────────────────

function extractArticleIds(resultSummary: Record<string, unknown> | null): string[] {
  if (!resultSummary) return [];
  const ids = new Set<string>();

  // Common patterns for article IDs in result summaries
  const arrayFields = [
    "promotedArticles", "advancedDrafts", "publishedArticles",
    "enhancedArticles", "fixedArticles", "rejectedDrafts",
  ];

  for (const field of arrayFields) {
    const arr = resultSummary[field];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const id = typeof item === "string" ? item : (item?.id ?? item?.draftId ?? item?.blogPostId);
        if (typeof id === "string") ids.add(id);
      }
    }
  }

  return [...ids].slice(0, 20); // Cap at 20
}

// ─── OperationEntry interface ───────────────────────────────────────────────

interface OperationEntry {
  timestamp: string;
  agent: string;
  agentIcon: string;
  action: string;
  details: string[];
  articleIds: string[];
  cost: number | null;
  status: "success" | "warning" | "error";
  phaseChanges: PhaseChange[];
}

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") || getDefaultSiteId();
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const hoursBack = parseInt(searchParams.get("hours") || "24", 10);
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  try {
    const { prisma } = await import("@/lib/db");

    // ─── Fetch CronJobLog entries ───────────────────────────────────
    const cronLogs = await prisma.cronJobLog.findMany({
      where: {
        started_at: { gte: since },
        OR: [
          { site_id: siteId },
          { site_id: null }, // multi-site crons
        ],
      },
      orderBy: { started_at: "desc" },
      take: limit * 2, // fetch more to account for filtering
      select: {
        id: true,
        job_name: true,
        status: true,
        started_at: true,
        completed_at: true,
        duration_ms: true,
        items_processed: true,
        items_succeeded: true,
        items_failed: true,
        result_summary: true,
        error_message: true,
      },
    });

    // ─── Fetch AutoFixLog entries ───────────────────────────────────
    const autoFixLogs = await prisma.autoFixLog.findMany({
      where: {
        siteId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        fixType: true,
        agent: true,
        targetType: true,
        targetId: true,
        success: true,
        error: true,
        createdAt: true,
      },
    });

    // ─── Convert CronJobLog to OperationEntry ───────────────────────
    const cronEntries: OperationEntry[] = cronLogs
      .filter((log) => {
        // Skip noisy internal logs
        if (log.job_name === "ceo-inbox") return false;
        if (log.status === "running") return false;
        return true;
      })
      .map((log) => {
        const agent = getAgentDisplay(log.job_name);
        const rs = (log.result_summary as Record<string, unknown>) ?? null;
        const entryStatus: "success" | "warning" | "error" =
          log.status === "failed" || log.status === "timed_out"
            ? "error"
            : log.items_failed > 0
              ? "warning"
              : "success";

        const aiCost = rs && typeof rs.aiCostUsd === "number" ? rs.aiCostUsd : null;

        return {
          timestamp: (log.completed_at ?? log.started_at).toISOString(),
          agent: agent.name,
          agentIcon: agent.icon,
          action: buildActionDescription(
            log.job_name,
            log.status,
            log.items_processed,
            log.items_succeeded,
            log.items_failed,
            rs
          ),
          details: buildDetails(rs, log.items_failed, log.error_message),
          articleIds: extractArticleIds(rs),
          cost: aiCost as number | null,
          status: entryStatus,
          phaseChanges: extractPhaseChanges(log.job_name, rs),
        };
      });

    // ─── Convert AutoFixLog to OperationEntry ───────────────────────
    const fixEntries: OperationEntry[] = autoFixLogs.map((log) => {
      const agent = getAgentDisplay(log.agent);
      const fixLabel = log.fixType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        timestamp: log.createdAt.toISOString(),
        agent: agent.name,
        agentIcon: agent.icon,
        action: `${fixLabel} on ${log.targetType}`,
        details: log.error ? [log.error] : [],
        articleIds: [log.targetId],
        cost: null,
        status: log.success ? "success" : "error",
        phaseChanges: [],
      };
    });

    // ─── Merge and sort ─────────────────────────────────────────────
    const allEntries = [...cronEntries, ...fixEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    // ─── Compute summary ────────────────────────────────────────────
    const summary = {
      totalActions: allEntries.length,
      articlesPublished: cronEntries.filter((e) =>
        e.action.toLowerCase().includes("publish")
      ).length,
      articlesEnhanced: fixEntries.filter((e) => e.status === "success").length,
      cronFailures: cronEntries.filter((e) => e.status === "error").length,
      aiCostUsd: cronEntries.reduce((sum, e) => sum + (e.cost ?? 0), 0),
      // Collect all phase changes for train animation
      phaseChanges: allEntries.flatMap((e) => e.phaseChanges).slice(0, 50),
    };

    return NextResponse.json({
      entries: allEntries,
      summary,
      siteId,
      since: since.toISOString(),
      cached: false,
    });
  } catch (err) {
    console.error("[operations-feed] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to fetch operations feed", entries: [], summary: null },
      { status: 500 }
    );
  }
}
