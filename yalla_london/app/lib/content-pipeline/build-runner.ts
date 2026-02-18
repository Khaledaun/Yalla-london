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
          phase_attempts: { lt: 3 },
          // Soft-lock: skip drafts actively being processed by another runner (within last 60s)
          // This prevents build-runner and full-pipeline-runner from processing the same draft
          OR: [
            { phase_started_at: null },
            { phase_started_at: { lt: new Date(Date.now() - 60 * 1000) } },
          ],
        },
        orderBy: { updated_at: "asc" },
        take: 20,
      });

      const phaseOrder: Record<string, number> = {
        scoring: 7, seo: 6, images: 5, assembly: 4, drafting: 3, outline: 2, research: 1,
      };
      allDrafts.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const orderA = phaseOrder[a.current_phase as string] || 0;
        const orderB = phaseOrder[b.current_phase as string] || 0;
        return orderB - orderA;
      });

      draft = allDrafts[0] || null;
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

    // Step 2: If no in-progress draft, create new ones from topic queue
    // Iterate ALL active sites (not just the first) so sites 2-5 get drafts too.
    // Creates at most 1 bilingual pair per site per run, checking budget between sites.
    if (!draft) {
      const skippedSites: string[] = [];
      const fullReservoirs: string[] = [];

      for (const siteId of activeSites) {
        // Budget guard: stop creating drafts if time is running out
        if (deadline.isExpired()) {
          console.log(`[content-builder] Budget expired during draft creation — processed ${activeSites.indexOf(siteId)} of ${activeSites.length} sites`);
          break;
        }

        const site = SITES[siteId];
        if (!site) {
          skippedSites.push(siteId);
          continue;
        }

        const reservoirCount = await prisma.articleDraft.count({
          where: { site_id: siteId, current_phase: "reservoir" },
        });

        if (reservoirCount >= 10) {
          fullReservoirs.push(siteId + "(" + reservoirCount + ")");
          continue;
        }

        let keyword = "";
        let topicProposalId: string | null = null;
        let strategy = "template_cycle";
        let locale = "en";

        try {
          // Find a candidate topic
          const candidate = await prisma.topicProposal.findFirst({
            where: {
              status: { in: ["ready", "queued", "planned", "proposed"] },
              OR: [{ site_id: siteId }, { site_id: null }],
            },
            orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
          });

          if (candidate) {
            // Atomically claim it — only succeeds if status hasn't changed
            // This prevents race conditions where multiple pipelines grab the same topic
            const claimed = await prisma.topicProposal.updateMany({
              where: {
                id: candidate.id,
                status: { in: ["ready", "queued", "planned", "proposed"] },
              },
              data: {
                status: "generating",
                updated_at: new Date(),
              },
            });

            if (claimed.count === 0) {
              // Another process already claimed this topic — skip it
              console.log(`[content-builder] Topic ${candidate.id} already claimed by another process, skipping`);
            } else {
              keyword = candidate.primary_keyword;
              topicProposalId = candidate.id;
              locale = candidate.locale || "en";
              strategy = "topic_db";
            }
          }
        } catch {
          // TopicProposal query failed — fall through to template
        }

        if (!keyword) {
          const topics = site.topicsEN;
          if (!topics || topics.length === 0) {
            skippedSites.push(siteId);
            continue;
          }
          const dayOfYear = Math.floor(
            (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000,
          );
          const topic = topics[dayOfYear % topics.length];
          keyword = topic.keyword;
          locale = "en";
          strategy = "template_cycle";
        }

        const enDraft = await prisma.articleDraft.create({
          data: {
            site_id: siteId,
            keyword,
            locale: "en",
            current_phase: "research",
            topic_proposal_id: topicProposalId,
            generation_strategy: strategy,
            phase_started_at: new Date(),
          },
        });

        const arDraft = await prisma.articleDraft.create({
          data: {
            site_id: siteId,
            keyword,
            locale: "ar",
            current_phase: "research",
            topic_proposal_id: topicProposalId,
            generation_strategy: strategy + "_ar",
            phase_started_at: new Date(),
            paired_draft_id: enDraft.id,
          },
        });

        await prisma.articleDraft.update({
          where: { id: enDraft.id },
          data: { paired_draft_id: arDraft.id },
        });

        // Transition topic from "generating" to "generated" now that drafts are created
        if (topicProposalId) {
          await prisma.topicProposal.update({
            where: { id: topicProposalId },
            data: { status: "generated" },
          }).catch((err: unknown) => {
            console.warn(`[content-builder] Failed to mark topic ${topicProposalId} as generated:`, err instanceof Error ? err.message : err);
          });
        }

        // Use the first created draft for phase execution in Step 3
        if (!draft) {
          draft = enDraft;
        }

        console.log(
          `[content-builder] Created bilingual pair for site "${siteId}": EN=${enDraft.id}, AR=${arDraft.id} for keyword "${keyword}" (${strategy})`,
        );
      }

      if (skippedSites.length > 0) {
        console.log(`[content-builder] Skipped sites (no config or no topics): ${skippedSites.join(", ")}`);
      }
      if (fullReservoirs.length > 0) {
        console.log(`[content-builder] Full reservoirs: ${fullReservoirs.join(", ")}`);
      }

      // If no draft was created for any site, return informational message
      if (!draft) {
        const reasons: string[] = [];
        if (skippedSites.length > 0) reasons.push("no config/topics: " + skippedSites.join(", "));
        if (fullReservoirs.length > 0) reasons.push("reservoir full: " + fullReservoirs.join(", "));
        return {
          success: true,
          message: "No drafts created across " + activeSites.length + " active sites. " + (reasons.length > 0 ? reasons.join("; ") : "No pending topics found."),
          durationMs: Date.now() - cronStart,
        };
      }
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
      updateData.phase_attempts = ((draftRecord.phase_attempts as number) || 0) + 1;
      const phaseError = result.error || `Phase "${currentPhase}" returned failure with no error details`;
      updateData.last_error = phaseError;

      const wasRejected = (updateData.phase_attempts as number) >= 3;
      if (wasRejected) {
        updateData.current_phase = "rejected";
        updateData.rejection_reason = `Phase "${currentPhase}" failed after 3 attempts: ${phaseError}`;
        updateData.completed_at = new Date();
      }

      // Fire failure hook — triggers immediate recovery for retryable errors
      onPipelineFailure({
        draftId: draftRecord.id as string,
        phase: currentPhase,
        error: phaseError,
        locale: draftRecord.locale as string,
        keyword: draftRecord.keyword as string,
        siteId: siteId,
        attemptNumber: updateData.phase_attempts as number,
        wasRejected,
      }).catch(() => {}); // fire-and-forget
    }

    await prisma.articleDraft.update({
      where: { id: draftRecord.id as string },
      data: updateData,
    });

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
    }).catch(() => {});

    return {
      success: false,
      message: errMsg,
      durationMs,
    };
  }
}
