/**
 * Sweeper Agent — Automatic Failure Recovery
 *
 * Detects failed/stuck ArticleDrafts, diagnoses the cause,
 * applies automatic fixes, and restarts the process.
 *
 * Callable directly (no HTTP). Used by:
 * - /api/cron/sweeper (scheduled cron)
 * - /api/admin/ops-center (Fix Now button)
 *
 * Recovery strategies:
 * 1. JSON parse failures → reset phase, clear error, retry
 * 2. Stuck drafts (no update >2h) → reset phase timer
 * 3. Rejected drafts with retryable errors → reset to previous phase
 * 4. Orphaned drafts (no paired draft) → clean up
 */

import { logCronExecution } from "@/lib/cron-logger";
import type { SweeperLogEntry } from "@/lib/ops/failure-hooks";

export interface SweeperResult {
  success: boolean;
  message?: string;
  recovered: SweeperAction[];
  skipped: number;
  durationMs: number;
}

export interface SweeperAction {
  draftId: string;
  keyword: string;
  locale: string;
  problem: string;
  diagnosis: string;
  fix: string;
  previousPhase: string;
  newPhase: string;
}

const STUCK_THRESHOLD_MS = 1 * 60 * 60 * 1000; // 1 hour (reduced from 2h — 33+ drafts were getting stuck)
const MAX_RECOVERIES_PER_RUN = 50; // Raised from 10 — need to handle 28+ stuck drafts in one sweep

export async function runSweeper(): Promise<SweeperResult> {
  const start = Date.now();
  const recovered: SweeperAction[] = [];
  let skipped = 0;

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");
    const activeSiteIds = getActiveSiteIds();

    // ── 0. Read recent recovery logs to avoid double-recovering ─────
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
      if (recentlyRecoveredIds.size > 0) {
        console.log(`[sweeper] Found ${recentlyRecoveredIds.size} recently recovered draft(s) — will skip these`);
      }
    } catch (dedupErr) {
      console.warn("[sweeper] Dedup check failed — proceeding without dedup:", dedupErr instanceof Error ? dedupErr.message : dedupErr);
    }

    // ── 1. Find rejected drafts with retryable errors ──────────────
    let rejectedDrafts: Array<Record<string, unknown>> = [];
    try {
      rejectedDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: "rejected",
          rejection_reason: { not: null },
          // Only sweep recent rejections (last 24h)
          completed_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { completed_at: "desc" },
        take: MAX_RECOVERIES_PER_RUN * 2,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        return {
          success: false,
          message: "ArticleDraft table not found. Run Fix Database first.",
          recovered: [],
          skipped: 0,
          durationMs: Date.now() - start,
        };
      }
      throw e;
    }

    for (const draft of rejectedDrafts) {
      if (recovered.length >= MAX_RECOVERIES_PER_RUN) break;

      const reason = (draft.rejection_reason as string) || "";
      const draftId = draft.id as string;
      const keyword = (draft.keyword as string) || "unknown";
      const locale = (draft.locale as string) || "en";

      // Skip if already recovered by failure hooks recently
      if (recentlyRecoveredIds.has(draftId)) {
        console.log(`[sweeper] Skipping draft ${draftId} — already recovered by failure hook`);
        skipped++;
        continue;
      }

      // Diagnose the failure
      const diagnosis = diagnoseProblem(reason);
      if (!diagnosis.retryable) {
        skipped++;
        continue;
      }

      // Apply fix
      try {
        await prisma.articleDraft.update({
          where: { id: draftId },
          data: {
            current_phase: diagnosis.resetToPhase,
            phase_attempts: 0,
            last_error: null,
            rejection_reason: null,
            completed_at: null,
            phase_started_at: new Date(),
            updated_at: new Date(),
          },
        });

        recovered.push({
          draftId,
          keyword,
          locale,
          problem: reason.substring(0, 150),
          diagnosis: diagnosis.explanation,
          fix: diagnosis.fixDescription,
          previousPhase: "rejected",
          newPhase: diagnosis.resetToPhase,
        });

        console.log(`[sweeper] Recovered draft ${draftId} (${keyword} ${locale}): ${diagnosis.fixDescription}`);
      } catch (err) {
        console.error(`[sweeper] Failed to recover draft ${draftId}:`, err);
        skipped++;
      }
    }

    // ── 2. Find stuck drafts (no update for >2 hours) ──────────────
    let stuckDrafts: Array<Record<string, unknown>> = [];
    try {
      stuckDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
          updated_at: { lt: new Date(Date.now() - STUCK_THRESHOLD_MS) },
          phase_attempts: { lt: 3 },
        },
        take: MAX_RECOVERIES_PER_RUN,
      });
    } catch (stuckErr) {
      console.warn("[sweeper] Stuck drafts query failed:", stuckErr instanceof Error ? stuckErr.message : stuckErr);
    }

    for (const draft of stuckDrafts) {
      if (recovered.length >= MAX_RECOVERIES_PER_RUN) break;

      const draftId = draft.id as string;
      const keyword = (draft.keyword as string) || "unknown";
      const locale = (draft.locale as string) || "en";
      const phase = (draft.current_phase as string) || "unknown";
      const updatedAt = draft.updated_at as Date;
      const hoursStuck = Math.round((Date.now() - updatedAt.getTime()) / 3_600_000);

      try {
        // Reset the phase timer so content-builder picks it up again
        await prisma.articleDraft.update({
          where: { id: draftId },
          data: {
            phase_started_at: new Date(),
            updated_at: new Date(),
            last_error: null,
          },
        });

        recovered.push({
          draftId,
          keyword,
          locale,
          problem: `Stuck in "${phase}" for ${hoursStuck}h with no progress`,
          diagnosis: "Draft appears abandoned by content-builder. Timer reset.",
          fix: `Reset phase timer — content-builder will pick it up on next run`,
          previousPhase: phase,
          newPhase: phase,
        });

        console.log(`[sweeper] Unstuck draft ${draftId} (${keyword} ${locale}): was in "${phase}" for ${hoursStuck}h`);
      } catch (unstuckErr) {
        console.warn(`[sweeper] Failed to unstick draft ${draftId}:`, unstuckErr instanceof Error ? unstuckErr.message : unstuckErr);
        skipped++;
      }
    }

    // ── 3. Find failed drafts at max attempts but with fixable errors ─
    let failingDrafts: Array<Record<string, unknown>> = [];
    try {
      failingDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
          phase_attempts: { gte: 3 },
          // Not yet rejected (about to be on next run)
        },
        take: MAX_RECOVERIES_PER_RUN,
      });
    } catch (failErr) {
      console.warn("[sweeper] Failing drafts query failed:", failErr instanceof Error ? failErr.message : failErr);
    }

    for (const draft of failingDrafts) {
      if (recovered.length >= MAX_RECOVERIES_PER_RUN) break;

      const draftId = draft.id as string;
      const keyword = (draft.keyword as string) || "unknown";
      const locale = (draft.locale as string) || "en";
      const phase = (draft.current_phase as string) || "unknown";
      const lastError = (draft.last_error as string) || "";

      const diagnosis = diagnoseProblem(lastError || `Phase "${phase}" failed 3 times`);
      if (!diagnosis.retryable) {
        skipped++;
        continue;
      }

      try {
        await prisma.articleDraft.update({
          where: { id: draftId },
          data: {
            current_phase: diagnosis.resetToPhase,
            phase_attempts: 0,
            last_error: null,
            phase_started_at: new Date(),
            updated_at: new Date(),
          },
        });

        recovered.push({
          draftId,
          keyword,
          locale,
          problem: `Failed 3x at "${phase}": ${lastError.substring(0, 100)}`,
          diagnosis: diagnosis.explanation,
          fix: diagnosis.fixDescription,
          previousPhase: phase,
          newPhase: diagnosis.resetToPhase,
        });
      } catch (fixErr) {
        console.warn(`[sweeper] Failed to recover failing draft ${draftId}:`, fixErr instanceof Error ? fixErr.message : fixErr);
        skipped++;
      }
    }

    // ── 4. Recover reservoir articles stuck at max enhancement attempts ─
    // The content-selector skips articles with phase_attempts >= 3 to prevent
    // infinite retry loops. But these articles are permanently frozen in the
    // reservoir — no other system picks them up. Reset their attempt counter
    // so they get another chance (enhancement may succeed with different AI output).
    // Only reset articles that have been stuck for >12 hours to avoid thrashing.
    let frozenReservoir: Array<Record<string, unknown>> = [];
    try {
      frozenReservoir = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: "reservoir",
          phase_attempts: { gte: 3 },
          updated_at: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) }, // >12h since last attempt
        },
        take: MAX_RECOVERIES_PER_RUN,
      });
    } catch {
      console.warn("[sweeper] Non-fatal: failed to query frozen reservoir articles");
    }

    for (const draft of frozenReservoir) {
      if (recovered.length >= MAX_RECOVERIES_PER_RUN) break;

      const draftId = draft.id as string;
      const keyword = (draft.keyword as string) || "unknown";
      const locale = (draft.locale as string) || "en";
      const attempts = (draft.phase_attempts as number) || 0;
      const lastError = (draft.last_error as string) || "Enhancement failed 3x";

      // Skip if already recovered recently
      if (recentlyRecoveredIds.has(draftId)) {
        skipped++;
        continue;
      }

      try {
        await prisma.articleDraft.update({
          where: { id: draftId },
          data: {
            phase_attempts: 0,
            last_error: null,
            updated_at: new Date(),
          },
        });

        recovered.push({
          draftId,
          keyword,
          locale,
          problem: `Frozen in reservoir after ${attempts} failed enhancement attempts: ${lastError.substring(0, 100)}`,
          diagnosis: "Article was permanently stuck — content-selector skips articles with 3+ failed attempts. Reset attempt counter for another try.",
          fix: "Reset phase_attempts to 0 — content-selector will try enhancement again on next run",
          previousPhase: "reservoir",
          newPhase: "reservoir",
        });

        console.log(`[sweeper] Unfroze reservoir draft ${draftId} (${keyword} ${locale}): was at ${attempts} failed enhancement attempts`);
      } catch (unfreezeErr) {
        console.warn(`[sweeper] Failed to unfreeze reservoir draft ${draftId}:`, unfreezeErr instanceof Error ? unfreezeErr.message : unfreezeErr);
        skipped++;
      }
    }

    const durationMs = Date.now() - start;

    // Log each recovery action as a structured sweeper event
    for (const action of recovered) {
      const entry: SweeperLogEntry = {
        eventType: "auto_recovery",
        source: "sweeper-agent",
        target: action.draftId,
        failureDescription: `Draft "${action.keyword}" (${action.locale}) — ${action.problem}`,
        detectedAt: new Date(Date.now() - durationMs).toISOString(),
        diagnosis: action.diagnosis,
        errorCategory: classifyErrorForLog(action.problem),
        fixApplied: action.fix,
        reactivatedAt: new Date().toISOString(),
        outcome: "recovered",
        context: { keyword: action.keyword, locale: action.locale, previousPhase: action.previousPhase, newPhase: action.newPhase },
      };

      await prisma.cronJobLog.create({
        data: {
          job_name: "sweeper-agent",
          job_type: "scheduled",
          status: "completed",
          started_at: new Date(Date.now() - durationMs),
          completed_at: new Date(),
          duration_ms: durationMs,
          items_processed: 1,
          items_succeeded: 1,
          items_failed: 0,
          result_summary: entry as unknown as Record<string, unknown>,
        },
      }).catch((logErr) => console.warn("[sweeper] Failed to log recovery action:", logErr instanceof Error ? logErr.message : logErr));
    }

    // Also log a summary
    await logCronExecution("sweeper-agent", "completed", {
      durationMs,
      itemsProcessed: recovered.length + skipped,
      itemsSucceeded: recovered.length,
      itemsFailed: skipped,
      resultSummary: {
        eventType: "targeted_sweep",
        source: "sweeper-agent",
        target: "all",
        failureDescription: `Scheduled sweep: recovered ${recovered.length}, skipped ${skipped}`,
        detectedAt: new Date(Date.now() - durationMs).toISOString(),
        diagnosis: `Scanned ${rejectedDrafts.length} rejected, ${stuckDrafts.length} stuck, ${failingDrafts.length} failing, ${frozenReservoir.length} frozen reservoir drafts`,
        errorCategory: "unknown",
        fixApplied: recovered.length > 0 ? recovered.map((r) => `${r.keyword} (${r.locale}): ${r.fix}`).join("; ") : null,
        reactivatedAt: recovered.length > 0 ? new Date().toISOString() : null,
        outcome: recovered.length > 0 ? "recovered" : "logged",
        context: { recovered: recovered.length, skipped, recentlySkipped: recentlyRecoveredIds.size },
      },
    }).catch((logErr) => console.warn("[sweeper] Failed to log summary:", logErr instanceof Error ? logErr.message : logErr));

    return {
      success: true,
      message: recovered.length > 0
        ? `Recovered ${recovered.length} draft(s), skipped ${skipped}`
        : `No recoverable failures found (checked ${rejectedDrafts.length} rejected, ${stuckDrafts.length} stuck, ${failingDrafts.length} failing, ${frozenReservoir.length} frozen reservoir)`,
      recovered,
      skipped,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    console.error("[sweeper] Fatal error:", error);

    await logCronExecution("sweeper-agent", "failed", {
      durationMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    }).catch((logErr) => console.warn("[sweeper] Failed to log fatal error:", logErr instanceof Error ? logErr.message : logErr));

    return {
      success: false,
      message: error instanceof Error ? error.message : "Sweeper failed",
      recovered,
      skipped,
      durationMs,
    };
  }
}

// ─── Diagnosis Engine ───────────────────────────────────────────────────

interface Diagnosis {
  retryable: boolean;
  resetToPhase: string;
  explanation: string;
  fixDescription: string;
}

function diagnoseProblem(errorText: string): Diagnosis {
  const lower = errorText.toLowerCase();

  // JSON parse failures — most common, very retryable
  if (lower.includes("json") || lower.includes("unterminated string") || lower.includes("unexpected token") || lower.includes("unexpected end")) {
    const failedPhase = extractPhaseFromError(errorText);
    return {
      retryable: true,
      resetToPhase: failedPhase,
      explanation: "AI returned malformed JSON. This is intermittent — a retry usually succeeds with the new JSON repair logic.",
      fixDescription: `Reset to "${failedPhase}" phase with fresh attempt counter`,
    };
  }

  // Timeout / budget expired
  if (lower.includes("timeout") || lower.includes("budget") || lower.includes("timed out") || lower.includes("aborted")) {
    const failedPhase = extractPhaseFromError(errorText);
    return {
      retryable: true,
      resetToPhase: failedPhase,
      explanation: "Request timed out. Server was likely under load. A retry at a quieter time should work.",
      fixDescription: `Reset to "${failedPhase}" phase for retry`,
    };
  }

  // Rate limiting
  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("too many requests")) {
    const failedPhase = extractPhaseFromError(errorText);
    return {
      retryable: true,
      resetToPhase: failedPhase,
      explanation: "AI provider rate limit hit. Will retry later when the limit resets.",
      fixDescription: `Reset to "${failedPhase}" phase — rate limit is temporary`,
    };
  }

  // API key / auth issues — not retryable without config change
  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("403")) {
    return {
      retryable: false,
      resetToPhase: "research",
      explanation: "AI provider authentication failed. This needs a valid API key to be configured.",
      fixDescription: "Not auto-retryable — requires API key fix",
    };
  }

  // Network errors — retryable
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch failed") || lower.includes("socket")) {
    const failedPhase = extractPhaseFromError(errorText);
    return {
      retryable: true,
      resetToPhase: failedPhase,
      explanation: "Network connection to AI provider failed. Likely temporary.",
      fixDescription: `Reset to "${failedPhase}" phase for retry`,
    };
  }

  // Quality score too low — skip, this is intentional rejection
  if (lower.includes("quality score") || lower.includes("below threshold")) {
    return {
      retryable: false,
      resetToPhase: "research",
      explanation: "Article didn't meet quality standards. Starting over is better than retrying.",
      fixDescription: "Not auto-retryable — quality rejection is intentional",
    };
  }

  // Unknown error — give it one retry from the failed phase
  const failedPhase = extractPhaseFromError(errorText);
  return {
    retryable: true,
    resetToPhase: failedPhase,
    explanation: "Unknown error. Giving it one more chance with fresh attempts.",
    fixDescription: `Reset to "${failedPhase}" phase for retry`,
  };
}

function classifyErrorForLog(errorText: string): SweeperLogEntry["errorCategory"] {
  const lower = errorText.toLowerCase();
  if (lower.includes("json") || lower.includes("parse")) return "json_parse";
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  if (lower.includes("rate limit") || lower.includes("429")) return "rate_limit";
  if (lower.includes("network") || lower.includes("fetch")) return "network";
  if (lower.includes("auth") || lower.includes("api key")) return "auth";
  return "unknown";
}

function extractPhaseFromError(errorText: string): string {
  // Try to find which phase failed from the error text
  const phases = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"];
  const lower = errorText.toLowerCase();

  for (const phase of phases) {
    if (lower.includes(`"${phase}"`)) return phase;
    if (lower.includes(`phase "${phase}"`)) return phase;
  }

  // Default: restart from outline (most common failure point)
  return "outline";
}
