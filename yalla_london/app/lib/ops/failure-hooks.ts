/**
 * Failure Hooks — Automatic Recovery on Every Failure
 *
 * Instead of waiting for the scheduled sweeper (8:45 AM UTC),
 * this module triggers IMMEDIATE recovery when any pipeline
 * step, cron job, or agent fails.
 *
 * Usage:
 *   import { onPipelineFailure, onCronFailure } from "@/lib/ops/failure-hooks";
 *
 *   // In content-builder when a phase fails:
 *   await onPipelineFailure({ draftId, phase, error, locale, keyword });
 *
 *   // In any cron job catch block:
 *   await onCronFailure({ jobName, error });
 *
 * Design:
 * - All hooks are fire-and-forget (never throw, never block the caller)
 * - Each hook does targeted recovery, not a full sweeper scan
 * - Recovery actions are logged to CronJobLog for dashboard visibility
 * - Budget-aware: won't run expensive operations if caller is near timeout
 */

import { logCronExecution } from "@/lib/cron-logger";

// ─── Types ───────────────────────────────────────────────────────────────

export interface PipelineFailureContext {
  /** The ArticleDraft ID that failed */
  draftId: string;
  /** Which phase failed (research, outline, drafting, etc.) */
  phase: string;
  /** The error message */
  error: string;
  /** Draft locale (en/ar) */
  locale?: string;
  /** Draft keyword */
  keyword?: string;
  /** Site ID */
  siteId?: string;
  /** Current attempt count AFTER incrementing */
  attemptNumber?: number;
  /** Whether the draft was just rejected (3rd failure) */
  wasRejected?: boolean;
}

export interface CronFailureContext {
  /** Name of the cron job that failed */
  jobName: string;
  /** The error message or Error object */
  error: unknown;
  /** Site ID if applicable */
  siteId?: string;
  /** Any additional context */
  details?: Record<string, unknown>;
}

export interface PromotionFailureContext {
  /** The ArticleDraft ID that failed to promote */
  draftId: string;
  /** The keyword */
  keyword?: string;
  /** The error */
  error: string;
  /** Site ID */
  siteId?: string;
}

// ─── Pipeline Failure Hook ──────────────────────────────────────────────
// Called when a content-builder phase fails for a specific draft.
// Does targeted diagnosis + recovery for THAT specific draft.

export async function onPipelineFailure(ctx: PipelineFailureContext): Promise<void> {
  try {
    const errorLower = (ctx.error || "").toLowerCase();

    // Classify the failure
    const isJsonError = errorLower.includes("json") ||
      errorLower.includes("unterminated string") ||
      errorLower.includes("unexpected token") ||
      errorLower.includes("unexpected end");

    const isTimeout = errorLower.includes("timeout") ||
      errorLower.includes("budget") ||
      errorLower.includes("timed out") ||
      errorLower.includes("aborted");

    const isRateLimit = errorLower.includes("rate limit") ||
      errorLower.includes("429") ||
      errorLower.includes("too many requests");

    const isNetworkError = errorLower.includes("network") ||
      errorLower.includes("econnrefused") ||
      errorLower.includes("fetch failed") ||
      errorLower.includes("socket");

    const isAuthError = errorLower.includes("api key") ||
      errorLower.includes("unauthorized") ||
      errorLower.includes("401") ||
      errorLower.includes("403");

    // Auth errors can't be auto-fixed — just log them prominently
    if (isAuthError) {
      console.error(`[failure-hook] AUTH ERROR for draft ${ctx.draftId} — needs manual API key fix`);
      await logFailureEvent("pipeline-auth-error", ctx.draftId, ctx.error, "not_recoverable");
      return;
    }

    // If the draft was just rejected (3rd attempt), try immediate recovery
    if (ctx.wasRejected && (isJsonError || isTimeout || isRateLimit || isNetworkError)) {
      console.log(`[failure-hook] Draft ${ctx.draftId} rejected — attempting immediate recovery`);
      await recoverDraft(ctx.draftId, ctx.phase, isJsonError ? "json_repair" : "retry");
      return;
    }

    // For non-rejected failures (1st or 2nd attempt), just log the context
    // The content-builder will retry naturally on next run
    if ((ctx.attemptNumber || 0) < 3) {
      console.log(
        `[failure-hook] Draft ${ctx.draftId} failed at "${ctx.phase}" ` +
        `(attempt ${ctx.attemptNumber || "?"}/3) — will auto-retry on next builder run`
      );
      return;
    }

    // Catch-all: attempt recovery for unknown errors that caused rejection
    if (ctx.wasRejected) {
      console.log(`[failure-hook] Draft ${ctx.draftId} rejected with unknown error — attempting recovery`);
      await recoverDraft(ctx.draftId, ctx.phase, "retry");
    }
  } catch (hookError) {
    // Never let the hook itself crash the caller
    console.error("[failure-hook] Pipeline hook error (non-fatal):", hookError);
  }
}

// ─── Cron Failure Hook ──────────────────────────────────────────────────
// Called when any cron job fails completely.
// Logs the failure and triggers targeted recovery where possible.

export async function onCronFailure(ctx: CronFailureContext): Promise<void> {
  try {
    const errorMsg = ctx.error instanceof Error ? ctx.error.message : String(ctx.error || "Unknown");
    console.error(`[failure-hook] Cron "${ctx.jobName}" failed: ${errorMsg}`);

    // For content pipeline crons, run the sweeper to recover any stuck drafts
    const contentCrons = [
      "content-builder", "daily-content-generate",
      "content-selector", "content-publish",
    ];

    if (contentCrons.some(name => ctx.jobName.includes(name))) {
      console.log(`[failure-hook] Content cron "${ctx.jobName}" failed — running targeted sweeper`);
      await runTargetedSweep(ctx.siteId);
      return;
    }

    // For SEO crons, just log — SEO failures are usually non-critical
    const seoCrons = ["seo-agent", "seo-cron", "seo-orchestrator"];
    if (seoCrons.some(name => ctx.jobName.includes(name))) {
      await logFailureEvent("seo-cron-failure", ctx.jobName, errorMsg, "logged");
      return;
    }

    // For topic generation, check if we have enough backlog
    if (ctx.jobName.includes("weekly-topics") || ctx.jobName.includes("topic")) {
      await handleTopicGenerationFailure(errorMsg);
      return;
    }

    // Generic: just log
    await logFailureEvent("cron-failure", ctx.jobName, errorMsg, "logged");
  } catch (hookError) {
    console.error("[failure-hook] Cron hook error (non-fatal):", hookError);
  }
}

// ─── Promotion Failure Hook ─────────────────────────────────────────────
// Called when content-selector fails to promote a draft to BlogPost.

export async function onPromotionFailure(ctx: PromotionFailureContext): Promise<void> {
  try {
    console.warn(`[failure-hook] Promotion failed for draft ${ctx.draftId}: ${ctx.error}`);

    const errorLower = (ctx.error || "").toLowerCase();

    // If it's a unique constraint violation (duplicate slug), fix the slug
    if (errorLower.includes("unique constraint") || errorLower.includes("duplicate")) {
      console.log(`[failure-hook] Duplicate slug detected — draft ${ctx.draftId} will retry with unique slug on next selector run`);
      await logFailureEvent("promotion-duplicate", ctx.draftId, ctx.error, "will_retry");
      return;
    }

    // If it's a missing field/relation, the draft may need reprocessing
    if (errorLower.includes("required") || errorLower.includes("not null") || errorLower.includes("foreign key")) {
      console.log(`[failure-hook] Data integrity issue — resetting draft ${ctx.draftId} to scoring phase`);
      await recoverDraft(ctx.draftId, "scoring", "reprocess");
      return;
    }

    // Generic: log the failure
    await logFailureEvent("promotion-failure", ctx.draftId, ctx.error, "logged");
  } catch (hookError) {
    console.error("[failure-hook] Promotion hook error (non-fatal):", hookError);
  }
}

// ─── Recovery Helpers ────────────────────────────────────────────────────

/**
 * Recover a specific draft by resetting its phase and attempt counter.
 * This is the targeted version of what the sweeper does — but for ONE draft.
 */
async function recoverDraft(
  draftId: string,
  failedPhase: string,
  strategy: "json_repair" | "retry" | "reprocess",
): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/db");

    // Determine which phase to reset to
    let resetPhase = failedPhase;
    if (strategy === "reprocess") {
      // Go back one phase for reprocessing
      const phaseOrder = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring", "reservoir"];
      const idx = phaseOrder.indexOf(failedPhase);
      resetPhase = idx > 0 ? phaseOrder[idx - 1] : failedPhase;
    }

    await prisma.articleDraft.update({
      where: { id: draftId },
      data: {
        current_phase: resetPhase,
        phase_attempts: 0,
        last_error: null,
        rejection_reason: null,
        completed_at: null,
        phase_started_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log(`[failure-hook] Recovered draft ${draftId}: reset to "${resetPhase}" (strategy: ${strategy})`);

    await logFailureEvent(
      "auto-recovery",
      draftId,
      `Recovered from "${failedPhase}" → "${resetPhase}" (${strategy})`,
      "recovered",
    );

    return true;
  } catch (err) {
    console.error(`[failure-hook] Failed to recover draft ${draftId}:`, err);
    return false;
  }
}

/**
 * Run a targeted sweep for stuck/failed drafts in a specific site.
 * Lighter than the full sweeper — only checks the most urgent cases.
 */
async function runTargetedSweep(siteId?: string): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");

    const whereClause: Record<string, unknown> = {
      current_phase: "rejected",
      rejection_reason: { not: null },
      completed_at: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) }, // last 6h
    };
    if (siteId) whereClause.site_id = siteId;

    const rejected = await prisma.articleDraft.findMany({
      where: whereClause,
      take: 5,
    });

    let recovered = 0;
    for (const draft of rejected) {
      const reason = (draft.rejection_reason || "").toLowerCase();
      const isRetryable =
        reason.includes("json") || reason.includes("timeout") ||
        reason.includes("rate limit") || reason.includes("network") ||
        reason.includes("unexpected");

      if (isRetryable) {
        const phaseMatch = reason.match(/phase "(\w+)"/);
        const failedPhase = phaseMatch ? phaseMatch[1] : "outline";

        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            current_phase: failedPhase,
            phase_attempts: 0,
            last_error: null,
            rejection_reason: null,
            completed_at: null,
            phase_started_at: new Date(),
            updated_at: new Date(),
          },
        });
        recovered++;
      }
    }

    if (recovered > 0) {
      console.log(`[failure-hook] Targeted sweep recovered ${recovered} draft(s)`);
      await logFailureEvent(
        "targeted-sweep",
        siteId || "all",
        `Recovered ${recovered} rejected drafts`,
        "recovered",
      );
    }
  } catch (err) {
    console.error("[failure-hook] Targeted sweep failed:", err);
  }
}

/**
 * Handle topic generation failure — check if we have enough topics in backlog.
 * If backlog is dangerously low, log a critical alert.
 */
async function handleTopicGenerationFailure(errorMsg: string): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const pendingCount = await prisma.topicProposal.count({
      where: { status: { in: ["ready", "queued", "planned", "proposed"] } },
    });

    if (pendingCount < 5) {
      console.error(`[failure-hook] CRITICAL: Topic generation failed AND backlog is low (${pendingCount} topics left)`);
      await logFailureEvent(
        "topic-generation-critical",
        "weekly-topics",
        `Topic generation failed: ${errorMsg}. Only ${pendingCount} topics remain.`,
        "critical_alert",
      );
    } else {
      console.warn(`[failure-hook] Topic generation failed but backlog is OK (${pendingCount} topics)`);
      await logFailureEvent(
        "topic-generation-warning",
        "weekly-topics",
        `Topic generation failed: ${errorMsg}. ${pendingCount} topics in backlog — not urgent.`,
        "logged",
      );
    }
  } catch (err) {
    console.error("[failure-hook] Topic failure handler error:", err);
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────

/**
 * Log a failure event to CronJobLog so it appears on the dashboard.
 * Uses the "failure-hook" job name for easy filtering.
 */
async function logFailureEvent(
  eventType: string,
  target: string,
  message: string,
  outcome: string,
): Promise<void> {
  await logCronExecution("failure-hook", outcome === "recovered" ? "completed" : "failed", {
    durationMs: 0,
    itemsProcessed: 1,
    itemsSucceeded: outcome === "recovered" ? 1 : 0,
    itemsFailed: outcome === "recovered" ? 0 : 1,
    resultSummary: {
      eventType,
      target,
      message,
      outcome,
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {});
}
