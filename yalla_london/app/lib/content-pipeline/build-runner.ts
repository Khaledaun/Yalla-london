/**
 * Content Builder — Core Logic (extracted from cron route)
 *
 * Callable directly without HTTP. Used by:
 * - /api/cron/content-builder (cron route)
 * - /api/admin/content-generation-monitor (dashboard trigger)
 *
 * Each invocation:
 * 1. Finds the oldest in-progress ArticleDraft (across all active sites) and advances it one phase
 * 2. If no in-progress drafts, iterates ALL active sites and creates bilingual pairs (EN + AR)
 *    from each site's TopicProposal queue (max 1 pair per site per run, budget-guarded)
 * 3. Respects budget timeout — stops creating drafts early if time is running out
 */

import { logCronExecution } from "@/lib/cron-logger";
import { onPipelineFailure } from "@/lib/ops/failure-hooks";

const DEFAULT_TIMEOUT_MS = 53_000;

export interface BuildRunnerResult {
  success: boolean;
  draftId?: string;
  keyword?: string;
  locale?: string;
  previousPhase?: string;
  nextPhase?: string;
  phaseSuccess?: boolean;
  phaseError?: string | null;
  strategy?: string;
  message?: string;
  reservoirCount?: number;
  durationMs: number;
}

export async function runContentBuilder(
  options: { timeoutMs?: number } = {},
): Promise<BuildRunnerResult> {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const cronStart = Date.now();
  const deadline = {
    remainingMs: () => timeoutMs - (Date.now() - cronStart),
    isExpired: () => Date.now() - cronStart >= timeoutMs,
  };

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, SITES } = await import("@/config/sites");
    const { runPhase } = await import("@/lib/content-pipeline/phases");

    const activeSites = getActiveSiteIds();
    if (activeSites.length === 0) {
      return { success: true, message: "No active sites", durationMs: Date.now() - cronStart };
    }

    // Step 1: Find the oldest in-progress draft
    let draft: Record<string, unknown> | null = null;
    try {
      const allDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSites },
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
          phase_attempts: { lt: 5 }, // Must match maxAttempts for drafting phase (line ~339)
          // Soft-lock: skip drafts actively being processed by another runner (within last 5 min)
          // 300s allows a full phase cycle to complete before another runner picks it up.
          // Previous 180s was too short — slow AI calls (30-50s) + overlapping crons
          // could cause drafts to get re-picked mid-processing, leading to stuck drafts.
          OR: [
            { phase_started_at: null },
            { phase_started_at: { lt: new Date(Date.now() - 300 * 1000) } },
          ],
        },
        orderBy: { updated_at: "asc" },
        take: 8, // Reduced from 20 — only need top few; saves ~1s on large tables
      });

      const phaseOrder: Record<string, number> = {
        scoring: 7, seo: 6, images: 5, assembly: 4, drafting: 3, outline: 2, research: 1,
      };
      allDrafts.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const orderA = phaseOrder[a.current_phase as string] || 0;
        const orderB = phaseOrder[b.current_phase as string] || 0;
        // Deprioritize drafts that have failed 3+ times with budget errors —
        // they need a full-budget run, not another shared-budget attempt
        const aStuck = ((a.phase_attempts as number) || 0) >= 3 && ((a.last_error as string) || "").includes("Budget too low") ? -10 : 0;
        const bStuck = ((b.phase_attempts as number) || 0) >= 3 && ((b.last_error as string) || "").includes("Budget too low") ? -10 : 0;
        return (orderB + bStuck) - (orderA + aStuck);
      });

      draft = allDrafts[0] || null;

      // PHASE-AWARE BUDGET: Assembly and drafting are "heavy" phases that need the full
      // cron budget. If the selected draft is in one of these, skip creating new drafts
      // and give it the entire remaining budget. Drafting generates 3500 tokens (Arabic)
      // and needs 25-35s per section — can't share budget with topic creation.
      const heavyPhases = ["assembly", "drafting"];
      if (draft && heavyPhases.includes(draft.current_phase as string)) {
        console.log(`[content-builder] Heavy phase "${draft.current_phase}" detected for draft ${draft.id} — dedicating full budget`);
        // Skip Step 2 entirely — go straight to Step 3
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        return {
          success: false,
          message: "ArticleDraft table not found. Use Fix Database button to create it.",
          durationMs: Date.now() - cronStart,
        };
      }
      throw e;
    }

    // Step 2: No in-progress draft — defer creation to content-builder-create cron.
    // Draft creation is handled by /api/cron/content-builder-create (runs every 30min).
    // Keeping build-runner focused on phase advancement maximizes AI budget (53s).
    // Safety net: if content-builder-create hasn't run in 2+ hours, we still skip — the
    // departures board and cron log will surface the issue for Khaled.
    if (!draft) {
      return {
        success: true,
        message: "No drafts to advance — content-builder-create handles new draft creation",
        durationMs: Date.now() - cronStart,
      };
    }

    // Step 3: Run the current phase
    if (deadline.isExpired()) {
      return {
        success: true,
        message: "Budget expired before phase execution",
        draftId: draft.id as string,
        previousPhase: draft.current_phase as string,
        durationMs: Date.now() - cronStart,
      };
    }

    const draftRecord = draft as Record<string, unknown>;
    const siteId = draftRecord.site_id as string;
    const site = SITES[siteId];

    if (!site) {
      return { success: false, message: "No site config for " + siteId, durationMs: Date.now() - cronStart };
    }

    const currentPhase = draftRecord.current_phase as string;
    console.log(
      `[content-builder] Running phase "${currentPhase}" for draft ${draftRecord.id} (keyword: "${draftRecord.keyword}")`,
    );

    // ── Claim the draft BEFORE processing ─────────────────────────────────
    // Previously phase_started_at was only set AFTER processing completed.
    // If processing took >5 minutes (common for drafting/assembly phases),
    // the 5-minute soft-lock expired and another runner would re-pick the
    // same draft, causing duplicate work and stuck drafts.
    await prisma.articleDraft.update({
      where: { id: draftRecord.id as string },
      data: { phase_started_at: new Date() },
    });

    const result = await runPhase(draftRecord as any, site, deadline.remainingMs());

    // Step 4: Save phase result to DB
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (result.success) {
      updateData.current_phase = result.nextPhase;
      updateData.phase_attempts = 0;
      updateData.last_error = null;
      updateData.phase_started_at = new Date();

      if (result.data.research_data) updateData.research_data = result.data.research_data;
      if (result.data.outline_data) updateData.outline_data = result.data.outline_data;
      if (result.data.sections_data) updateData.sections_data = result.data.sections_data;
      if (result.data.assembled_html) updateData.assembled_html = result.data.assembled_html;
      if (result.data.assembled_html_alt) updateData.assembled_html_alt = result.data.assembled_html_alt;
      if (result.data.seo_meta) updateData.seo_meta = result.data.seo_meta;
      if (result.data.images_data) updateData.images_data = result.data.images_data;
      if (result.data.topic_title) updateData.topic_title = result.data.topic_title;
      if (result.data.sections_total !== undefined) updateData.sections_total = result.data.sections_total;
      if (result.data.sections_completed !== undefined) updateData.sections_completed = result.data.sections_completed;
      if (result.data.quality_score !== undefined) updateData.quality_score = result.data.quality_score;
      if (result.data.seo_score !== undefined) updateData.seo_score = result.data.seo_score;
      if (result.data.word_count !== undefined) updateData.word_count = result.data.word_count;
      if (result.data.readability_score !== undefined) updateData.readability_score = result.data.readability_score;
      if (result.data.content_depth_score !== undefined) updateData.content_depth_score = result.data.content_depth_score;
      if (result.aiModelUsed) updateData.ai_model_used = result.aiModelUsed;

      if (result.nextPhase === "reservoir" || result.nextPhase === "rejected") {
        updateData.completed_at = new Date();
        if (result.nextPhase === "rejected") {
          updateData.rejection_reason = "Quality score below threshold";
        }
      }
    } else {
      // Reset phase_started_at on failure too — prevents the draft from being
      // immediately re-picked by another runner. The 180s soft-lock starts fresh.
      updateData.phase_started_at = new Date();

      // Use Prisma's atomic { increment: 1 } to prevent race conditions where
      // two runners read the same stale phase_attempts and both write the same value.
      updateData.phase_attempts = { increment: 1 };
      const phaseError = result.error || `Phase "${currentPhase}" returned failure with no error details`;
      updateData.last_error = phaseError;

      // Drafting phase gets 5 attempts (complex, transient JSON parse errors common
      // especially for Arabic content with dir="rtl" HTML attributes).
      // All other phases get 3 attempts.
      const maxAttempts = currentPhase === "drafting" ? 5 : 3;
      const currentAttempts = ((draftRecord.phase_attempts as number) || 0) + 1;
      const wasRejected = currentAttempts >= maxAttempts;
      if (wasRejected) {
        updateData.current_phase = "rejected";
        updateData.rejection_reason = `Phase "${currentPhase}" failed after ${maxAttempts} attempts: ${phaseError}`;
        updateData.completed_at = new Date();
      }

      // Fire failure hook — triggers immediate recovery for retryable errors
      // IMPORTANT: currentAttempts is the real number (not the Prisma { increment: 1 } object)
      onPipelineFailure({
        draftId: draftRecord.id as string,
        phase: currentPhase,
        error: phaseError,
        locale: draftRecord.locale as string,
        keyword: draftRecord.keyword as string,
        siteId: siteId,
        attemptNumber: currentAttempts,
        wasRejected,
      }, { deadlineMs: deadline.remainingMs() }).catch((err) => console.warn("[build-runner] onPipelineFailure hook error:", err instanceof Error ? err.message : err));
    }

    const updated = await prisma.articleDraft.update({
      where: { id: draftRecord.id as string },
      data: updateData,
      select: { phase_attempts: true, current_phase: true },
    });

    // ── Race-condition recovery ──────────────────────────────────────────
    // If two runners process the same draft simultaneously (possible when
    // processing exceeds the 5-minute soft-lock), both read the same stale
    // phase_attempts and neither rejects the draft — even though the DB
    // value (atomically incremented by both) exceeds maxAttempts.
    // Re-check the ACTUAL DB value and reject if needed.
    if (!result.success && updated.current_phase !== "rejected") {
      const maxAttempts = currentPhase === "drafting" ? 5 : 3;
      const actualAttempts = updated.phase_attempts || 0;
      if (actualAttempts >= maxAttempts) {
        await prisma.articleDraft.update({
          where: { id: draftRecord.id as string },
          data: {
            current_phase: "rejected",
            rejection_reason: `Phase "${currentPhase}" failed after ${actualAttempts} attempts (race-condition recovery)`,
            completed_at: new Date(),
            updated_at: new Date(),
          },
        });
        console.log(`[content-builder] Race-condition recovery: rejected draft ${draftRecord.id} after ${actualAttempts} actual attempts`);
      }
    }

    const durationMs = Date.now() - cronStart;

    await logCronExecution("content-builder", "completed", {
      durationMs,
      resultSummary: {
        draftId: draftRecord.id,
        keyword: draftRecord.keyword,
        phase: currentPhase,
        nextPhase: result.nextPhase,
        success: result.success,
        error: result.error,
      },
    });

    return {
      success: true,
      draftId: draftRecord.id as string,
      keyword: draftRecord.keyword as string,
      locale: draftRecord.locale as string,
      previousPhase: currentPhase,
      nextPhase: result.nextPhase,
      phaseSuccess: result.success,
      phaseError: result.error || null,
      strategy: draftRecord.generation_strategy as string,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - cronStart;
    const errMsg = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error) || "Content builder crashed with no error details";
    console.error("[content-builder] Failed:", errMsg);

    await logCronExecution("content-builder", "failed", {
      durationMs,
      errorMessage: errMsg,
    }).catch((err) => console.warn("[build-runner] Failed to log cron execution:", err instanceof Error ? err.message : err));

    return {
      success: false,
      message: errMsg,
      durationMs,
    };
  }
}
