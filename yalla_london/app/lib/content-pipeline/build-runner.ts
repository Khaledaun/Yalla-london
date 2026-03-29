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
import { getMaxAttempts, validatePhaseTransition, BUILD_RUNNER_BUDGET_RESERVE_MS, SECOND_DRAFT_MIN_BUDGET_MS } from "@/lib/content-pipeline/constants";

const DEFAULT_TIMEOUT_MS = 280_000; // 280s usable budget within 300s maxDuration

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
  additionalDrafts?: Array<{ draftId: string; phase: string; success: boolean }>;
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
      // Optimization for statement_timeout (PostgresError 57014):
      // 1. Two-phase query: first get IDs with lightweight WHERE + ORDER BY (uses compound
      //    index on site_id, current_phase, updated_at), then fetch full records by ID.
      // 2. This avoids the complex OR on phase_started_at forcing a seq scan on the full table.
      // 3. The compound index handles the first query efficiently; the second is a simple PK lookup.
      const candidateIds = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSites },
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
          phase_attempts: { lt: getMaxAttempts("drafting") },
          OR: [
            { phase_started_at: null },
            { phase_started_at: { lt: new Date(Date.now() - 300 * 1000) } },
          ],
        },
        orderBy: { updated_at: "asc" },
        take: 8,
        select: { id: true },
      });

      // Fetch full records for the small set of candidates (max 8 rows by PK)
      const allDrafts = candidateIds.length > 0
        ? await prisma.articleDraft.findMany({
            where: { id: { in: candidateIds.map(c => c.id) } },
            orderBy: { updated_at: "asc" },
          })
        : [];

      const phaseOrder: Record<string, number> = {
        scoring: 7, seo: 6, images: 5, assembly: 4, drafting: 3, outline: 2, research: 1,
      };
      // Build a set of paired IDs and their phases so we can prioritize drafts
      // whose bilingual partner is further ahead (the lagging draft needs to catch up).
      const pairedPhaseMap = new Map<string, number>();
      // Track AR drafts whose EN pair is already in reservoir/published — these need
      // maximum priority boost to prevent EN publishing with English-in-Arabic fallback.
      const arDraftsWithReadyEnPair = new Set<string>();

      // Collect paired IDs that are NOT in the current allDrafts list
      // (they've already advanced past the pipeline — reservoir, published, etc.)
      const missingPairedIds: string[] = [];
      for (const d of allDrafts) {
        const pid = d.paired_draft_id as string | null;
        if (pid) {
          const paired = allDrafts.find(x => (x.id as string) === pid);
          if (paired) {
            pairedPhaseMap.set(d.id as string, phaseOrder[paired.current_phase as string] || 0);
          } else if ((d.locale as string) === "ar") {
            // AR draft whose EN pair is NOT in the pipeline query — check if EN is in reservoir/published
            missingPairedIds.push(pid);
          }
        }
      }

      // Look up missing paired drafts to check if they're in reservoir/published
      if (missingPairedIds.length > 0) {
        try {
          const pairedStatuses = await prisma.articleDraft.findMany({
            where: { id: { in: missingPairedIds } },
            select: { id: true, current_phase: true, paired_draft_id: true },
          });
          for (const ps of pairedStatuses) {
            const phase = ps.current_phase as string;
            if (phase === "reservoir" || phase === "published") {
              // The EN pair is ready/published — its AR partner gets max priority
              const arDraftId = ps.paired_draft_id as string;
              if (arDraftId) arDraftsWithReadyEnPair.add(arDraftId);
            }
          }
          if (arDraftsWithReadyEnPair.size > 0) {
            console.log(`[content-builder] ${arDraftsWithReadyEnPair.size} AR draft(s) have EN pair in reservoir/published — boosting priority`);
          }
        } catch (pairLookupErr) {
          console.warn("[content-builder] Paired status lookup failed (non-fatal):", pairLookupErr instanceof Error ? pairLookupErr.message : pairLookupErr);
        }
      }

      // PRIORITY FIX (March 18, 2026): Light-phase drafts (images, seo, scoring) take 5-15s
      // and are closest to reservoir — they MUST be processed first to fill the reservoir.
      // With 95+ drafts in drafting and 33 in assembly, heavy phases monopolize every run,
      // and light-phase drafts never advance. This starves the reservoir → 0 articles published.
      // Solution: Give light phases a +20 priority boost so they always process before heavy phases.
      const LIGHT_PHASE_SET = new Set(["images", "seo", "scoring"]);
      allDrafts.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const orderA = phaseOrder[a.current_phase as string] || 0;
        const orderB = phaseOrder[b.current_phase as string] || 0;
        // CRITICAL: Light-phase drafts get a massive priority boost to prevent starvation.
        // Without this, 128 heavy-phase drafts block 5 light-phase drafts from ever advancing.
        const aLightBoost = LIGHT_PHASE_SET.has(a.current_phase as string) ? 20 : 0;
        const bLightBoost = LIGHT_PHASE_SET.has(b.current_phase as string) ? 20 : 0;
        // Deprioritize drafts that have failed 3+ times with budget errors —
        // they need a full-budget run, not another shared-budget attempt
        const aStuck = ((a.phase_attempts as number) || 0) >= 3 && ((a.last_error as string) || "").includes("Budget too low") ? -10 : 0;
        const bStuck = ((b.phase_attempts as number) || 0) >= 3 && ((b.last_error as string) || "").includes("Budget too low") ? -10 : 0;
        // Boost drafts whose paired draft is further ahead — they need to catch up
        // for bilingual publishing. +5 priority boost per phase gap.
        const aPartnerAhead = pairedPhaseMap.has(a.id as string) ? Math.max(0, (pairedPhaseMap.get(a.id as string) || 0) - orderA) : 0;
        const bPartnerAhead = pairedPhaseMap.has(b.id as string) ? Math.max(0, (pairedPhaseMap.get(b.id as string) || 0) - orderB) : 0;
        // CRITICAL: AR drafts whose EN pair is in reservoir/published get +20 boost.
        // Without this, EN publishes with English content in content_ar because the
        // AR draft is still weeks behind in the backlog. This ensures AR catches up
        // before content-selector gives up waiting and publishes EN-only.
        const aEnReady = arDraftsWithReadyEnPair.has(a.id as string) ? 20 : 0;
        const bEnReady = arDraftsWithReadyEnPair.has(b.id as string) ? 20 : 0;
        return (orderB + bStuck + bPartnerAhead + bEnReady + bLightBoost) - (orderA + aStuck + aPartnerAhead + aEnReady + aLightBoost);
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
    // Keeping build-runner focused on phase advancement maximizes AI budget (280s).
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
    const overheadMs = Date.now() - cronStart;
    console.log(
      `[content-builder] Running phase "${currentPhase}" for draft ${draftRecord.id} (keyword: "${draftRecord.keyword}", overhead: ${overheadMs}ms, budget remaining: ${deadline.remainingMs()}ms)`,
    );

    // ── Budget guard for heavy phases ─────────────────────────────────────
    // If overhead consumed too much budget (>20s, e.g., cold start + pool timeout),
    // skip this run for heavy phases — they need at least 30s to succeed.
    // The draft will be picked up on the next cron run with a fresh budget.
    const heavyPhasesForBudget = ["assembly", "drafting"];
    if (heavyPhasesForBudget.includes(currentPhase) && deadline.remainingMs() < BUILD_RUNNER_BUDGET_RESERVE_MS) {
      console.warn(`[content-builder] Skipping heavy phase "${currentPhase}" — only ${Math.round(deadline.remainingMs() / 1000)}s remaining (need ${BUILD_RUNNER_BUDGET_RESERVE_MS / 1000}s+). Will retry next cron run.`);
      return {
        success: true,
        message: `Budget too low for heavy phase "${currentPhase}" (${Math.round(deadline.remainingMs() / 1000)}s remaining) — deferred to next run`,
        draftId: draftRecord.id as string,
        previousPhase: currentPhase,
        durationMs: Date.now() - cronStart,
      };
    }

    // ── Claim the draft BEFORE processing ─────────────────────────────────
    await prisma.articleDraft.update({
      where: { id: draftRecord.id as string },
      data: { phase_started_at: new Date() },
    });

    // ── LAST DEFENSE CHECK ────────────────────────────────────────────────
    // If this draft has failed 2+ times with a systemic error (timeout,
    // provider down, budget exhaustion, JSON parse), activate the last-defense
    // fallback instead of the normal pipeline. This guarantees forward progress
    // even when only one provider is active or all providers are struggling.
    const { shouldActivateLastDefense, lastDefenseGenerate } = await import("@/lib/ai/last-defense");
    let result;

    if (shouldActivateLastDefense(draftRecord)) {
      console.log(`[content-builder] ⚡ LAST DEFENSE activated for draft ${draftRecord.id} (phase: ${currentPhase}, attempts: ${draftRecord.phase_attempts})`);
      try {
        const defenseResult = await lastDefenseGenerate(draftRecord as any, site, deadline.remainingMs());
        result = {
          success: defenseResult.success,
          nextPhase: defenseResult.nextPhase,
          data: defenseResult.data,
          error: defenseResult.error,
          aiModelUsed: defenseResult.aiModelUsed,
        };
      } catch (defenseErr) {
        const msg = defenseErr instanceof Error ? defenseErr.message : String(defenseErr);
        console.error(`[content-builder] Last defense threw:`, msg);
        result = { success: false, nextPhase: currentPhase, data: {}, error: `Last defense failed: ${msg}` };
      }
    } else {
      // Wrap runPhase in try/catch — a thrown exception should NOT crash the
      // entire cron. Convert it to a { success: false } result so the draft
      // gets properly incremented and logged instead of silently disappearing.
      try {
        result = await runPhase(draftRecord as any, site, deadline.remainingMs());
      } catch (phaseErr) {
        const msg = phaseErr instanceof Error ? phaseErr.message : String(phaseErr);
        console.error(`[content-builder] Phase "${currentPhase}" threw (not returned):`, msg);
        result = { success: false, nextPhase: currentPhase, data: {}, error: `Phase threw: ${msg}` };
      }
    }

    // Step 4: Save phase result to DB
    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (result.success) {
      // Validate the phase transition before writing to DB — catches invalid jumps early.
      // Rejections are always valid and handled in the else branch below.
      if (result.nextPhase !== "rejected") {
        validatePhaseTransition(currentPhase, result.nextPhase);
      }
      updateData.current_phase = result.nextPhase;
      // When assembly used raw fallback (aiModelUsed="fallback-raw"), keep phase_attempts
      // intact so the draft doesn't loop back through AI assembly on a future re-queue.
      // Raw fallback permanently resolves assembly — resetting to 0 would let the draft
      // re-enter assembly with AI attempts on future processing, causing timeout loops.
      updateData.phase_attempts = (currentPhase === "assembly" && result.aiModelUsed === "fallback-raw")
        ? (draftRecord.phase_attempts as number || 0)
        : 0;
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

      // Use centralized constants — single source of truth for all attempt caps.
      // See lib/content-pipeline/constants.ts for rationale per phase.
      const maxAttempts = getMaxAttempts(currentPhase);
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
      const raceMaxAttempts = getMaxAttempts(currentPhase);
      const actualAttempts = updated.phase_attempts || 0;
      if (actualAttempts >= raceMaxAttempts) {
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

    // ── PAIRED DRAFT CATCH-UP: Process the bilingual partner if it's behind ──
    // Arabic drafts lag behind English because build-runner processes 1 draft/run.
    // EN reaches reservoir while AR is still in research/outline/drafting.
    // content-selector then publishes EN with empty content_ar.
    // Fix: after processing EN, check if its AR pair is behind — if so, process AR too.
    // This halves the time for bilingual pairs to complete together.
    const pairedId = draftRecord.paired_draft_id as string | null;
    const additionalResults: Array<{ draftId: string; phase: string; success: boolean }> = [];

    if (result.success && pairedId && deadline.remainingMs() > 30_000) {
      try {
        const pairedDraft = await prisma.articleDraft.findUnique({ where: { id: pairedId } });
        if (pairedDraft) {
          const pairedPhase = pairedDraft.current_phase as string;
          const pipelinePhases = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"];
          const isPairedInPipeline = pipelinePhases.includes(pairedPhase);
          const pairedAttempts = (pairedDraft.phase_attempts as number) || 0;
          const pairedSite = SITES[pairedDraft.site_id as string];

          if (isPairedInPipeline && pairedAttempts < 5 && pairedSite) {
            console.log(`[content-builder] 🔗 Paired draft ${pairedId} (locale: ${pairedDraft.locale}, phase: ${pairedPhase}) — processing to keep bilingual pair in sync`);

            // Claim the paired draft
            await prisma.articleDraft.update({
              where: { id: pairedId },
              data: { phase_started_at: new Date() },
            });

            try {
              const pairedResult = await runPhase(pairedDraft as any, pairedSite, deadline.remainingMs());
              const pairedUpdate: Record<string, unknown> = { updated_at: new Date() };

              if (pairedResult.success) {
                if (pairedResult.nextPhase !== "rejected") {
                  validatePhaseTransition(pairedPhase, pairedResult.nextPhase);
                }
                pairedUpdate.current_phase = pairedResult.nextPhase;
                pairedUpdate.phase_attempts = (pairedPhase === "assembly" && pairedResult.aiModelUsed === "fallback-raw")
                  ? (pairedAttempts) : 0;
                pairedUpdate.last_error = null;
                pairedUpdate.phase_started_at = new Date();
                if (pairedResult.data.research_data) pairedUpdate.research_data = pairedResult.data.research_data;
                if (pairedResult.data.outline_data) pairedUpdate.outline_data = pairedResult.data.outline_data;
                if (pairedResult.data.sections_data) pairedUpdate.sections_data = pairedResult.data.sections_data;
                if (pairedResult.data.assembled_html) pairedUpdate.assembled_html = pairedResult.data.assembled_html;
                if (pairedResult.data.assembled_html_alt) pairedUpdate.assembled_html_alt = pairedResult.data.assembled_html_alt;
                if (pairedResult.data.seo_meta) pairedUpdate.seo_meta = pairedResult.data.seo_meta;
                if (pairedResult.data.images_data) pairedUpdate.images_data = pairedResult.data.images_data;
                if (pairedResult.data.topic_title) pairedUpdate.topic_title = pairedResult.data.topic_title;
                if (pairedResult.data.sections_total !== undefined) pairedUpdate.sections_total = pairedResult.data.sections_total;
                if (pairedResult.data.sections_completed !== undefined) pairedUpdate.sections_completed = pairedResult.data.sections_completed;
                if (pairedResult.data.quality_score !== undefined) pairedUpdate.quality_score = pairedResult.data.quality_score;
                if (pairedResult.data.seo_score !== undefined) pairedUpdate.seo_score = pairedResult.data.seo_score;
                if (pairedResult.data.word_count !== undefined) pairedUpdate.word_count = pairedResult.data.word_count;
                if (pairedResult.aiModelUsed) pairedUpdate.ai_model_used = pairedResult.aiModelUsed;
                if (pairedResult.nextPhase === "reservoir" || pairedResult.nextPhase === "rejected") {
                  pairedUpdate.completed_at = new Date();
                }
              } else {
                pairedUpdate.phase_started_at = new Date();
                pairedUpdate.phase_attempts = { increment: 1 };
                pairedUpdate.last_error = pairedResult.error || `Phase "${pairedPhase}" failed`;
              }

              await prisma.articleDraft.update({ where: { id: pairedId }, data: pairedUpdate });
              additionalResults.push({ draftId: pairedId, phase: pairedPhase, success: pairedResult.success });
              console.log(`[content-builder] 🔗 Paired draft ${pairedId}: phase "${pairedPhase}" → ${pairedResult.success ? pairedResult.nextPhase : "FAILED"}`);
            } catch (pairedErr) {
              console.warn(`[content-builder] Paired draft ${pairedId} processing failed:`, pairedErr instanceof Error ? pairedErr.message : pairedErr);
              await prisma.articleDraft.update({
                where: { id: pairedId },
                data: { phase_started_at: null, updated_at: new Date() },
              }).catch(() => {});
              additionalResults.push({ draftId: pairedId, phase: pairedPhase, success: false });
            }
          }
        }
      } catch (pairErr) {
        console.warn("[content-builder] Paired draft lookup failed (non-fatal):", pairErr instanceof Error ? pairErr.message : pairErr);
      }
    }

    // Track all processed draft IDs to avoid double-processing
    const processedIds = new Set<string>([draftRecord.id as string, ...(pairedId ? [pairedId] : [])]);

    // ── Second heavy-phase draft: clear backlog faster ──────────────────────
    // With 150+ drafts in drafting, processing only 1 per 15-min cron = 2+ days to clear.
    // When first draft's drafting call finishes early (1-2 sections, 30-60s used),
    // pick up a second draft from the heavy backlog to double throughput.
    if (result.success && deadline.remainingMs() > SECOND_DRAFT_MIN_BUDGET_MS && ["drafting", "assembly"].includes(currentPhase)) {
      try {
        const secondDraft = await prisma.articleDraft.findFirst({
          where: {
            id: { notIn: Array.from(processedIds) },
            site_id: { in: activeSites },
            current_phase: { in: ["drafting", "assembly"] },
            phase_attempts: { lt: getMaxAttempts("drafting") },
            OR: [
              { phase_started_at: null },
              { phase_started_at: { lt: new Date(Date.now() - 300 * 1000) } },
            ],
          },
          orderBy: { updated_at: "asc" },
        });
        if (secondDraft && deadline.remainingMs() > 30_000) {
          console.log(`[content-builder] Second heavy draft: "${secondDraft.current_phase}" for ${secondDraft.id} (budget: ${Math.round(deadline.remainingMs() / 1000)}s)`);
          await prisma.articleDraft.update({
            where: { id: secondDraft.id as string },
            data: { phase_started_at: new Date() },
          });
          processedIds.add(secondDraft.id as string);
          try {
            const secondResult = await runPhase(secondDraft as any, SITES[secondDraft.site_id as string], deadline.remainingMs());
            const secondUpdate: Record<string, unknown> = { updated_at: new Date() };
            if (secondResult.success) {
              if (secondResult.nextPhase !== "rejected") {
                validatePhaseTransition(secondDraft.current_phase as string, secondResult.nextPhase);
              }
              secondUpdate.current_phase = secondResult.nextPhase;
              secondUpdate.phase_attempts = 0;
              secondUpdate.last_error = null;
              secondUpdate.phase_started_at = new Date();
              // Carry forward phase data
              if (secondResult.data.research_data) secondUpdate.research_data = secondResult.data.research_data;
              if (secondResult.data.outline_data) secondUpdate.outline_data = secondResult.data.outline_data;
              if (secondResult.data.assembled_html) secondUpdate.assembled_html = secondResult.data.assembled_html;
              if (secondResult.data.sections_json) secondUpdate.sections_json = secondResult.data.sections_json;
              if (secondResult.data.seo_meta) secondUpdate.seo_meta = secondResult.data.seo_meta;
              if (secondResult.data.word_count !== undefined) secondUpdate.word_count = secondResult.data.word_count;
              // IMPORTANT: If assembly used raw fallback, preserve attempts (don't reset to 0)
              if (secondDraft.current_phase === "assembly" && secondResult.data.aiModelUsed === "fallback-raw") {
                secondUpdate.phase_attempts = secondDraft.phase_attempts;
              }
              if (secondResult.nextPhase === "reservoir" || secondResult.nextPhase === "rejected") {
                secondUpdate.completed_at = new Date();
              }
            } else {
              secondUpdate.phase_started_at = new Date();
              secondUpdate.phase_attempts = { increment: 1 };
              secondUpdate.last_error = secondResult.error || `Phase failed`;
            }
            await prisma.articleDraft.update({ where: { id: secondDraft.id as string }, data: secondUpdate });
            additionalResults.push({ draftId: secondDraft.id as string, phase: secondDraft.current_phase as string, success: secondResult.success });
          } catch (secondErr) {
            console.warn(`[content-builder] Second heavy draft failed:`, secondErr instanceof Error ? secondErr.message : secondErr);
            await prisma.articleDraft.update({
              where: { id: secondDraft.id as string },
              data: { phase_started_at: null, updated_at: new Date() },
            }).catch(() => {});
          }
        }
      } catch (secondLookupErr) {
        console.warn("[content-builder] Second heavy draft lookup failed (non-fatal):", secondLookupErr instanceof Error ? secondLookupErr.message : secondLookupErr);
      }
    }

    // ── Multi-draft processing: advance additional light-phase drafts if budget allows ──
    // After sweeper resets 40+ drafts, processing 1 draft per 15-min run creates a days-long
    // backlog. Light phases (research, outline, images, seo, scoring) complete in 5-15s,
    // so we can process 2-3 per run when budget allows. Heavy phases (drafting, assembly)
    // need 30s+ and are never batched.
    const LIGHT_PHASES = new Set(["research", "outline", "images", "seo", "scoring"]);
    const MAX_ADDITIONAL_DRAFTS = 4;

    if (result.success && deadline.remainingMs() > SECOND_DRAFT_MIN_BUDGET_MS) {
      try {
        const moreDrafts = await prisma.articleDraft.findMany({
          where: {
            id: { notIn: Array.from(processedIds) },
            site_id: { in: activeSites },
            current_phase: { in: Array.from(LIGHT_PHASES) },
            phase_attempts: { lt: getMaxAttempts("images") }, // Light phases max=3
            OR: [
              { phase_started_at: null },
              { phase_started_at: { lt: new Date(Date.now() - 300 * 1000) } },
            ],
          },
          orderBy: { updated_at: "asc" },
          take: MAX_ADDITIONAL_DRAFTS,
        });

        for (const extraDraft of moreDrafts) {
          if (deadline.remainingMs() < 25_000) break; // Leave 25s buffer

          const extraPhase = extraDraft.current_phase as string;
          if (!LIGHT_PHASES.has(extraPhase)) continue;

          console.log(`[content-builder] Additional light-phase: "${extraPhase}" for draft ${extraDraft.id} (budget: ${Math.round(deadline.remainingMs() / 1000)}s)`);

          // Claim the draft
          await prisma.articleDraft.update({
            where: { id: extraDraft.id as string },
            data: { phase_started_at: new Date() },
          });

          try {
            const extraResult = await runPhase(extraDraft as any, SITES[extraDraft.site_id as string], deadline.remainingMs());
            const extraUpdate: Record<string, unknown> = { updated_at: new Date() };

            if (extraResult.success) {
              if (extraResult.nextPhase !== "rejected") {
                validatePhaseTransition(extraPhase, extraResult.nextPhase);
              }
              extraUpdate.current_phase = extraResult.nextPhase;
              extraUpdate.phase_attempts = 0;
              extraUpdate.last_error = null;
              extraUpdate.phase_started_at = new Date();
              if (extraResult.data.research_data) extraUpdate.research_data = extraResult.data.research_data;
              if (extraResult.data.outline_data) extraUpdate.outline_data = extraResult.data.outline_data;
              if (extraResult.data.seo_meta) extraUpdate.seo_meta = extraResult.data.seo_meta;
              if (extraResult.data.images_data) extraUpdate.images_data = extraResult.data.images_data;
              if (extraResult.data.quality_score !== undefined) extraUpdate.quality_score = extraResult.data.quality_score;
              if (extraResult.data.seo_score !== undefined) extraUpdate.seo_score = extraResult.data.seo_score;
              if (extraResult.data.word_count !== undefined) extraUpdate.word_count = extraResult.data.word_count;
              if (extraResult.nextPhase === "reservoir" || extraResult.nextPhase === "rejected") {
                extraUpdate.completed_at = new Date();
              }
            } else {
              extraUpdate.phase_started_at = new Date();
              extraUpdate.phase_attempts = { increment: 1 };
              extraUpdate.last_error = extraResult.error || `Phase "${extraPhase}" failed`;
            }

            await prisma.articleDraft.update({
              where: { id: extraDraft.id as string },
              data: extraUpdate,
            });
            additionalResults.push({ draftId: extraDraft.id as string, phase: extraPhase, success: extraResult.success });
          } catch (extraErr) {
            console.warn(`[content-builder] Additional draft ${extraDraft.id} failed:`, extraErr instanceof Error ? extraErr.message : extraErr);
            await prisma.articleDraft.update({
              where: { id: extraDraft.id as string },
              data: { phase_started_at: null, updated_at: new Date() },
            }).catch(() => {});
            additionalResults.push({ draftId: extraDraft.id as string, phase: extraPhase, success: false });
          }
        }
      } catch (batchErr) {
        console.warn("[content-builder] Multi-draft batch failed (non-fatal):", batchErr instanceof Error ? batchErr.message : batchErr);
      }
    }

    // Note: route.ts already logs to CronJobLog — don't double-log here
    const durationMs = Date.now() - cronStart;
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
      additionalDrafts: additionalResults.length > 0 ? additionalResults : undefined,
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
