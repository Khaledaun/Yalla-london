/**
 * Failure Hooks — Automatic Recovery on Every Failure
 *
 * Instead of waiting for the scheduled sweeper (8:45 AM UTC),
 * this module triggers IMMEDIATE recovery when any pipeline
 * step, cron job, or agent fails.
 *
 * Every recovery action is logged to CronJobLog with detailed structured data:
 * - What failed (source cron/pipeline, draft ID, error)
 * - When the failure was detected
 * - What diagnosis was made
 * - What fix was applied
 * - When the process was reactivated
 * - Result of the recovery
 *
 * The sweeper and failure hooks READ recent logs before acting to avoid
 * double-recovery or harming the system.
 */

// ─── Types ───────────────────────────────────────────────────────────────

export interface PipelineFailureContext {
  draftId: string;
  phase: string;
  error: string;
  locale?: string;
  keyword?: string;
  siteId?: string;
  attemptNumber?: number;
  wasRejected?: boolean;
}

export interface CronFailureContext {
  jobName: string;
  error: unknown;
  siteId?: string;
  details?: Record<string, unknown>;
}

export interface PromotionFailureContext {
  draftId: string;
  keyword?: string;
  error: string;
  siteId?: string;
}

/** Structured log entry for every sweeper/recovery action */
export interface SweeperLogEntry {
  /** Type of event */
  eventType: "pipeline_failure" | "cron_failure" | "promotion_failure" | "auto_recovery" | "targeted_sweep" | "topic_backlog_alert";
  /** Source that triggered this (e.g., "content-builder", "content-selector") */
  source: string;
  /** Target entity (draft ID, cron name) */
  target: string;
  /** Human-readable description of what failed */
  failureDescription: string;
  /** When the failure was detected */
  detectedAt: string;
  /** Diagnosis: what went wrong */
  diagnosis: string;
  /** Category of the error */
  errorCategory: "json_parse" | "timeout" | "rate_limit" | "network" | "auth" | "data_integrity" | "quality" | "unknown";
  /** What fix was applied */
  fixApplied: string | null;
  /** When the process was reactivated (null if not recoverable) */
  reactivatedAt: string | null;
  /** Outcome of the recovery attempt */
  outcome: "recovered" | "will_retry" | "not_recoverable" | "logged" | "critical_alert";
  /** Additional context */
  context: Record<string, unknown>;
}

// ─── Error Classification ────────────────────────────────────────────────

function classifyError(errorText: string): SweeperLogEntry["errorCategory"] {
  const lower = errorText.toLowerCase();
  if (lower.includes("json") || lower.includes("unterminated string") || lower.includes("unexpected token") || lower.includes("unexpected end")) return "json_parse";
  if (lower.includes("timeout") || lower.includes("budget") || lower.includes("timed out") || lower.includes("aborted")) return "timeout";
  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("too many requests")) return "rate_limit";
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch failed") || lower.includes("socket")) return "network";
  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("403")) return "auth";
  if (lower.includes("required") || lower.includes("not null") || lower.includes("foreign key") || lower.includes("unique constraint") || lower.includes("duplicate")) return "data_integrity";
  if (lower.includes("quality score") || lower.includes("below threshold")) return "quality";
  return "unknown";
}

const RETRYABLE_CATEGORIES = new Set<SweeperLogEntry["errorCategory"]>(["json_parse", "timeout", "rate_limit", "network", "unknown"]);

// ─── Pipeline Failure Hook ──────────────────────────────────────────────

export async function onPipelineFailure(ctx: PipelineFailureContext): Promise<void> {
  try {
    const category = classifyError(ctx.error);
    const detectedAt = new Date().toISOString();

    // Auth errors can't be auto-fixed
    if (category === "auth") {
      console.error(`[failure-hook] AUTH ERROR for draft ${ctx.draftId} — needs manual API key fix`);
      await logSweeperEvent({
        eventType: "pipeline_failure",
        source: "content-builder",
        target: ctx.draftId,
        failureDescription: `Draft "${ctx.keyword || ctx.draftId}" (${ctx.locale || "en"}) failed at "${ctx.phase}" — API authentication error`,
        detectedAt,
        diagnosis: "AI provider authentication failed. Needs valid API key.",
        errorCategory: category,
        fixApplied: null,
        reactivatedAt: null,
        outcome: "not_recoverable",
        context: { phase: ctx.phase, locale: ctx.locale, keyword: ctx.keyword, siteId: ctx.siteId, error: ctx.error.substring(0, 300) },
      });
      return;
    }

    // If the draft was just rejected (3rd attempt), try immediate recovery
    if (ctx.wasRejected && RETRYABLE_CATEGORIES.has(category)) {
      // Check if this draft was already recovered recently (prevent loops)
      const alreadyRecovered = await wasRecentlyRecovered(ctx.draftId);
      if (alreadyRecovered) {
        console.log(`[failure-hook] Draft ${ctx.draftId} was already recovered recently — skipping to prevent loop`);
        await logSweeperEvent({
          eventType: "pipeline_failure",
          source: "content-builder",
          target: ctx.draftId,
          failureDescription: `Draft "${ctx.keyword || ctx.draftId}" (${ctx.locale || "en"}) rejected again at "${ctx.phase}" — already recovered once`,
          detectedAt,
          diagnosis: `Error: ${category}. Already recovered once — not retrying again to prevent loops.`,
          errorCategory: category,
          fixApplied: null,
          reactivatedAt: null,
          outcome: "logged",
          context: { phase: ctx.phase, locale: ctx.locale, keyword: ctx.keyword, siteId: ctx.siteId, error: ctx.error.substring(0, 300), reason: "already_recovered_recently" },
        });
        return;
      }

      console.log(`[failure-hook] Draft ${ctx.draftId} rejected — attempting immediate recovery`);
      const strategy = category === "json_parse" ? "json_repair" : "retry";
      const recovered = await recoverDraft(ctx.draftId, ctx.phase, strategy);

      await logSweeperEvent({
        eventType: "auto_recovery",
        source: "content-builder",
        target: ctx.draftId,
        failureDescription: `Draft "${ctx.keyword || ctx.draftId}" (${ctx.locale || "en"}) rejected at "${ctx.phase}" after 3 attempts`,
        detectedAt,
        diagnosis: `Error category: ${category}. ${strategy === "json_repair" ? "AI returned malformed JSON — retrying with JSON repair logic" : "Transient error — retrying with fresh attempts"}`,
        errorCategory: category,
        fixApplied: recovered ? `Reset to "${ctx.phase}" with fresh attempt counter (strategy: ${strategy})` : "Recovery failed — could not update draft",
        reactivatedAt: recovered ? new Date().toISOString() : null,
        outcome: recovered ? "recovered" : "logged",
        context: { phase: ctx.phase, locale: ctx.locale, keyword: ctx.keyword, siteId: ctx.siteId, error: ctx.error.substring(0, 300), strategy },
      });
      return;
    }

    // For non-rejected failures (1st or 2nd attempt), log for visibility but don't intervene
    if ((ctx.attemptNumber || 0) < 3) {
      console.log(`[failure-hook] Draft ${ctx.draftId} failed at "${ctx.phase}" (attempt ${ctx.attemptNumber || "?"}/3) — will auto-retry`);
      await logSweeperEvent({
        eventType: "pipeline_failure",
        source: "content-builder",
        target: ctx.draftId,
        failureDescription: `Draft "${ctx.keyword || ctx.draftId}" (${ctx.locale || "en"}) failed at "${ctx.phase}" (attempt ${ctx.attemptNumber}/3)`,
        detectedAt,
        diagnosis: `Error category: ${category}. Attempt ${ctx.attemptNumber}/3 — content-builder will auto-retry on next run.`,
        errorCategory: category,
        fixApplied: "No intervention — auto-retry on next builder run",
        reactivatedAt: null,
        outcome: "will_retry",
        context: { phase: ctx.phase, locale: ctx.locale, keyword: ctx.keyword, siteId: ctx.siteId, attemptNumber: ctx.attemptNumber, error: ctx.error.substring(0, 300) },
      });
      return;
    }

    // Catch-all: attempt recovery for unknown errors that caused rejection
    if (ctx.wasRejected) {
      const recovered = await recoverDraft(ctx.draftId, ctx.phase, "retry");
      await logSweeperEvent({
        eventType: "auto_recovery",
        source: "content-builder",
        target: ctx.draftId,
        failureDescription: `Draft "${ctx.keyword || ctx.draftId}" (${ctx.locale || "en"}) rejected at "${ctx.phase}" — unknown error`,
        detectedAt,
        diagnosis: `Unknown error category. Giving it one more chance.`,
        errorCategory: category,
        fixApplied: recovered ? `Reset to "${ctx.phase}" with fresh attempts` : "Recovery failed",
        reactivatedAt: recovered ? new Date().toISOString() : null,
        outcome: recovered ? "recovered" : "logged",
        context: { phase: ctx.phase, locale: ctx.locale, keyword: ctx.keyword, siteId: ctx.siteId, error: ctx.error.substring(0, 300) },
      });
    }
  } catch (hookError) {
    console.error("[failure-hook] Pipeline hook error (non-fatal):", hookError);
  }
}

// ─── Cron Failure Hook ──────────────────────────────────────────────────

export async function onCronFailure(ctx: CronFailureContext): Promise<void> {
  try {
    const errorMsg = ctx.error instanceof Error ? ctx.error.message : String(ctx.error || "Unknown");
    const category = classifyError(errorMsg);
    const detectedAt = new Date().toISOString();
    console.error(`[failure-hook] Cron "${ctx.jobName}" failed: ${errorMsg}`);

    // Content pipeline crons — run targeted sweeper
    const contentCrons = ["content-builder", "daily-content-generate", "content-selector", "content-publish"];
    if (contentCrons.some(name => ctx.jobName.includes(name))) {
      console.log(`[failure-hook] Content cron "${ctx.jobName}" failed — running targeted sweeper`);
      const sweepResult = await runTargetedSweep(ctx.siteId);

      await logSweeperEvent({
        eventType: "cron_failure",
        source: ctx.jobName,
        target: ctx.jobName,
        failureDescription: `Cron job "${ctx.jobName}" crashed with error: ${errorMsg.substring(0, 200)}`,
        detectedAt,
        diagnosis: `Content pipeline cron failed (${category}). Ran targeted sweep to recover any stuck drafts.`,
        errorCategory: category,
        fixApplied: sweepResult > 0 ? `Targeted sweep recovered ${sweepResult} draft(s)` : "Targeted sweep found no recoverable drafts",
        reactivatedAt: sweepResult > 0 ? new Date().toISOString() : null,
        outcome: sweepResult > 0 ? "recovered" : "logged",
        context: { jobName: ctx.jobName, siteId: ctx.siteId, error: errorMsg.substring(0, 300), draftsRecovered: sweepResult },
      });
      return;
    }

    // SEO crons — log
    const seoCrons = ["seo-agent", "seo-cron", "seo-orchestrator"];
    if (seoCrons.some(name => ctx.jobName.includes(name))) {
      await logSweeperEvent({
        eventType: "cron_failure",
        source: ctx.jobName,
        target: ctx.jobName,
        failureDescription: `SEO cron "${ctx.jobName}" failed: ${errorMsg.substring(0, 200)}`,
        detectedAt,
        diagnosis: `SEO failure (${category}). SEO cron failures are non-critical — will retry on next scheduled run.`,
        errorCategory: category,
        fixApplied: "No intervention — SEO runs 3x daily and will retry automatically",
        reactivatedAt: null,
        outcome: "will_retry",
        context: { jobName: ctx.jobName, error: errorMsg.substring(0, 300) },
      });
      return;
    }

    // Topic generation — check backlog
    if (ctx.jobName.includes("weekly-topics") || ctx.jobName.includes("topic")) {
      await handleTopicGenerationFailure(errorMsg, detectedAt, category);
      return;
    }

    // Generic cron failure
    await logSweeperEvent({
      eventType: "cron_failure",
      source: ctx.jobName,
      target: ctx.jobName,
      failureDescription: `Cron "${ctx.jobName}" failed: ${errorMsg.substring(0, 200)}`,
      detectedAt,
      diagnosis: `General cron failure (${category}).`,
      errorCategory: category,
      fixApplied: null,
      reactivatedAt: null,
      outcome: "logged",
      context: { jobName: ctx.jobName, error: errorMsg.substring(0, 300), ...(ctx.details || {}) },
    });
  } catch (hookError) {
    console.error("[failure-hook] Cron hook error (non-fatal):", hookError);
  }
}

// ─── Promotion Failure Hook ─────────────────────────────────────────────

export async function onPromotionFailure(ctx: PromotionFailureContext): Promise<void> {
  try {
    const category = classifyError(ctx.error);
    const detectedAt = new Date().toISOString();
    console.warn(`[failure-hook] Promotion failed for draft ${ctx.draftId}: ${ctx.error}`);

    if (category === "data_integrity" && (ctx.error.toLowerCase().includes("unique") || ctx.error.toLowerCase().includes("duplicate"))) {
      await logSweeperEvent({
        eventType: "promotion_failure",
        source: "content-selector",
        target: ctx.draftId,
        failureDescription: `Draft "${ctx.keyword || ctx.draftId}" promotion failed — duplicate slug`,
        detectedAt,
        diagnosis: "Duplicate slug detected. The selector will generate a unique slug on next run.",
        errorCategory: category,
        fixApplied: "No intervention — selector auto-generates unique slug on retry",
        reactivatedAt: null,
        outcome: "will_retry",
        context: { draftId: ctx.draftId, keyword: ctx.keyword, siteId: ctx.siteId, error: ctx.error.substring(0, 300) },
      });
      return;
    }

    if (category === "data_integrity") {
      const recovered = await recoverDraft(ctx.draftId, "scoring", "reprocess");
      await logSweeperEvent({
        eventType: "promotion_failure",
        source: "content-selector",
        target: ctx.draftId,
        failureDescription: `Draft "${ctx.keyword || ctx.draftId}" promotion failed — data integrity issue`,
        detectedAt,
        diagnosis: "Missing required field or relation. Resetting to previous phase for reprocessing.",
        errorCategory: category,
        fixApplied: recovered ? "Reset draft to 'seo' phase (one step before scoring) for reprocessing" : "Recovery failed",
        reactivatedAt: recovered ? new Date().toISOString() : null,
        outcome: recovered ? "recovered" : "logged",
        context: { draftId: ctx.draftId, keyword: ctx.keyword, siteId: ctx.siteId, error: ctx.error.substring(0, 300) },
      });
      return;
    }

    await logSweeperEvent({
      eventType: "promotion_failure",
      source: "content-selector",
      target: ctx.draftId,
      failureDescription: `Draft "${ctx.keyword || ctx.draftId}" promotion failed: ${ctx.error.substring(0, 150)}`,
      detectedAt,
      diagnosis: `Promotion error (${category}).`,
      errorCategory: category,
      fixApplied: null,
      reactivatedAt: null,
      outcome: "logged",
      context: { draftId: ctx.draftId, keyword: ctx.keyword, siteId: ctx.siteId, error: ctx.error.substring(0, 300) },
    });
  } catch (hookError) {
    console.error("[failure-hook] Promotion hook error (non-fatal):", hookError);
  }
}

// ─── Recovery Helpers ────────────────────────────────────────────────────

/**
 * Check if a draft was already recovered in the last 2 hours.
 * Prevents infinite recovery loops.
 */
async function wasRecentlyRecovered(draftId: string): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/db");
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const recentRecovery = await prisma.cronJobLog.findFirst({
      where: {
        job_name: { in: ["failure-hook", "sweeper-agent"] },
        status: "completed",
        started_at: { gte: twoHoursAgo },
        result_summary: {
          path: ["target"],
          equals: draftId,
        },
      },
    });

    return !!recentRecovery;
  } catch {
    // If we can't check, allow recovery (better to recover twice than never)
    return false;
  }
}

async function recoverDraft(
  draftId: string,
  failedPhase: string,
  strategy: "json_repair" | "retry" | "reprocess",
): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/db");

    let resetPhase = failedPhase;
    if (strategy === "reprocess") {
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
    return true;
  } catch (err) {
    console.error(`[failure-hook] Failed to recover draft ${draftId}:`, err);
    return false;
  }
}

/**
 * Run a targeted sweep for stuck/failed drafts.
 * Reads recent recovery logs to avoid double-recovering the same draft.
 * Returns number of recovered drafts.
 */
async function runTargetedSweep(siteId?: string): Promise<number> {
  try {
    const { prisma } = await import("@/lib/db");

    // Read recent recovery logs to avoid double-recovery
    const recentlyRecoveredIds = new Set<string>();
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recentLogs = await prisma.cronJobLog.findMany({
        where: {
          job_name: { in: ["failure-hook", "sweeper-agent"] },
          status: "completed",
          started_at: { gte: twoHoursAgo },
        },
        select: { result_summary: true },
        take: 50,
      });
      for (const log of recentLogs) {
        const summary = log.result_summary as Record<string, unknown> | null;
        if (summary?.target && typeof summary.target === "string") {
          recentlyRecoveredIds.add(summary.target);
        }
      }
    } catch {
      // Non-fatal — proceed without dedup
    }

    const whereClause: Record<string, unknown> = {
      current_phase: "rejected",
      rejection_reason: { not: null },
      completed_at: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    };
    if (siteId) whereClause.site_id = siteId;

    const rejected = await prisma.articleDraft.findMany({
      where: whereClause,
      take: 5,
    });

    let recovered = 0;
    for (const draft of rejected) {
      // Skip if already recovered recently
      if (recentlyRecoveredIds.has(draft.id)) {
        console.log(`[failure-hook] Skipping draft ${draft.id} — already recovered recently`);
        continue;
      }

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

    return recovered;
  } catch (err) {
    console.error("[failure-hook] Targeted sweep failed:", err);
    return 0;
  }
}

async function handleTopicGenerationFailure(errorMsg: string, detectedAt: string, category: SweeperLogEntry["errorCategory"]): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const pendingCount = await prisma.topicProposal.count({
      where: { status: { in: ["ready", "queued", "planned", "proposed"] } },
    });

    const isCritical = pendingCount < 5;

    await logSweeperEvent({
      eventType: "topic_backlog_alert",
      source: "weekly-topics",
      target: "weekly-topics",
      failureDescription: `Topic generation failed: ${errorMsg.substring(0, 200)}`,
      detectedAt,
      diagnosis: isCritical
        ? `CRITICAL: Topic generation failed AND only ${pendingCount} topics remain. Pipeline will stall soon.`
        : `Topic generation failed but backlog is OK (${pendingCount} topics). Not urgent — will retry on next schedule.`,
      errorCategory: category,
      fixApplied: null,
      reactivatedAt: null,
      outcome: isCritical ? "critical_alert" : "will_retry",
      context: { pendingTopics: pendingCount, error: errorMsg.substring(0, 300) },
    });
  } catch (err) {
    console.error("[failure-hook] Topic failure handler error:", err);
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────

/**
 * Log a structured sweeper event to CronJobLog.
 * Uses job_name "failure-hook" for easy filtering in the dashboard.
 */
async function logSweeperEvent(entry: SweeperLogEntry): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.cronJobLog.create({
      data: {
        job_name: "failure-hook",
        job_type: "reactive",
        status: entry.outcome === "recovered" ? "completed" : "failed",
        started_at: new Date(entry.detectedAt),
        completed_at: new Date(),
        duration_ms: 0,
        items_processed: 1,
        items_succeeded: entry.outcome === "recovered" ? 1 : 0,
        items_failed: entry.outcome === "recovered" ? 0 : 1,
        // Store the full description in error_message so alerts & cron tab can read it
        error_message: entry.failureDescription,
        error_stack: entry.diagnosis,
        result_summary: entry as unknown as Record<string, unknown>,
      },
    });
  } catch {
    // Best-effort — never break the caller
  }
}

// ─── Query: Fetch Sweeper Logs for Dashboard ─────────────────────────────

/**
 * Fetch structured sweeper/failure-hook logs for the Ops Center dashboard.
 * Returns the most recent recovery events with full detail.
 */
export async function getSweeperLogs(limit = 50): Promise<SweeperLogEntry[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const logs = await prisma.cronJobLog.findMany({
      where: {
        job_name: { in: ["failure-hook", "sweeper-agent"] },
      },
      orderBy: { started_at: "desc" },
      take: limit,
    });

    const entries: SweeperLogEntry[] = [];
    for (const log of logs) {
      const summary = log.result_summary as Record<string, unknown> | null;
      if (summary?.eventType) {
        entries.push(summary as unknown as SweeperLogEntry);
      } else {
        // Legacy sweeper-agent logs — convert to our format
        entries.push({
          eventType: "auto_recovery",
          source: "sweeper-agent",
          target: (summary?.target as string) || "unknown",
          failureDescription: (summary?.message as string) || "Scheduled sweeper run",
          detectedAt: log.started_at?.toISOString() || new Date().toISOString(),
          diagnosis: (summary?.message as string) || "Scheduled sweep",
          errorCategory: "unknown",
          fixApplied: summary?.outcome === "recovered"
            ? `Recovered ${summary?.recovered || 0} draft(s)`
            : null,
          reactivatedAt: summary?.outcome === "recovered" ? log.completed_at?.toISOString() || null : null,
          outcome: (summary?.outcome as SweeperLogEntry["outcome"]) || "logged",
          context: summary || {},
        });
      }
    }

    return entries;
  } catch {
    return [];
  }
}
