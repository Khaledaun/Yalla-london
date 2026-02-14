export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Content Builder — Incremental Phase Processor
 *
 * Runs every 15 minutes. Each invocation:
 * 1. Finds the oldest in-progress ArticleDraft and advances it one phase
 * 2. If no in-progress drafts, creates TWO new ones (EN + AR) from TopicProposal queue
 * 3. Each phase completes within 53s budget (7s safety buffer)
 * 4. Drafting phase batches up to 3 sections per invocation
 *
 * Pipeline: research → outline → drafting (×N sections, batched) → assembly → images → seo → scoring → reservoir
 * Articles in "reservoir" status are picked by the content-selector cron for publishing.
 *
 * Bilingual: Each topic generates two separate drafts (EN + AR), paired via paired_draft_id.
 * Arabic drafts use culturally adapted prompts (Gulf dialect, halal-first framing).
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUILDER_TIMEOUT_MS = 53_000; // 53s usable budget out of 120s maxDuration

async function handleContentBuilder(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const counts = await prisma.$queryRawUnsafe(
        `SELECT current_phase, COUNT(*) as count FROM article_drafts GROUP BY current_phase`,
      ).catch(() => []) as Array<{ current_phase: string; count: bigint }>;
      const phaseCounts: Record<string, number> = {};
      for (const row of counts) {
        phaseCounts[row.current_phase] = Number(row.count);
      }
      return NextResponse.json({
        status: "healthy",
        endpoint: "content-builder",
        phaseCounts,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "content-builder", note: "ArticleDraft table may not exist yet. Run DB migration." },
        { status: 503 },
      );
    }
  }

  const cronStart = Date.now();
  const deadline = {
    remainingMs: () => BUILDER_TIMEOUT_MS - (Date.now() - cronStart),
    isExpired: () => Date.now() - cronStart >= BUILDER_TIMEOUT_MS,
  };

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");
    const { SITES } = await import("@/config/sites");
    const { runPhase } = await import("@/lib/content-pipeline/phases");

    const activeSites = getActiveSiteIds();
    if (activeSites.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active sites",
        timestamp: new Date().toISOString(),
      });
    }

    // Step 1: Find the oldest in-progress draft (not in terminal states)
    // Prioritize drafts further along the pipeline, then oldest first
    let draft: Record<string, unknown> | null = null;
    try {
      // Fetch all in-progress drafts, then sort by pipeline order in application code
      // (Prisma can't do custom enum ordering)
      const allDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSites },
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
          phase_attempts: { lt: 3 }, // Max 3 retries per phase
        },
        orderBy: { updated_at: "asc" }, // Oldest first within each phase
        take: 20, // Reasonable limit
      });

      // Sort by pipeline order: later phases first (finish what's closest to done)
      const phaseOrder: Record<string, number> = {
        scoring: 7, seo: 6, images: 5, assembly: 4, drafting: 3, outline: 2, research: 1,
      };
      allDrafts.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const orderA = phaseOrder[a.current_phase as string] || 0;
        const orderB = phaseOrder[b.current_phase as string] || 0;
        return orderB - orderA; // Higher phase order = more advanced = process first
      });

      draft = allDrafts[0] || null;
    } catch (e) {
      // Table may not exist yet
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        return NextResponse.json({
          success: false,
          message: "ArticleDraft table not found. Run DB migration: click 'Fix Missing Tables & Columns' in test dashboard.",
          timestamp: new Date().toISOString(),
        });
      }
      throw e;
    }

    // Step 2: If no in-progress draft, create a new one from topic queue
    if (!draft) {
      const siteId = activeSites[0];
      const site = SITES[siteId];
      if (!site) {
        return NextResponse.json({
          success: true,
          message: "No site config found for " + siteId,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if we already have enough drafts in the reservoir
      const reservoirCount = await prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: "reservoir",
        },
      });

      if (reservoirCount >= 10) {
        return NextResponse.json({
          success: true,
          message: "Reservoir is full (" + reservoirCount + " articles). Waiting for selector to publish.",
          reservoirCount,
          timestamp: new Date().toISOString(),
        });
      }

      // Pick a topic from TopicProposal or use template fallback
      let keyword = "";
      let topicProposalId: string | null = null;
      let strategy = "template_cycle";
      let locale = "en";

      try {
        // Accept topics assigned to this site OR orphaned topics (site_id is null)
        const topic = await prisma.topicProposal.findFirst({
          where: {
            status: { in: ["ready", "queued", "planned", "proposed"] },
            OR: [
              { site_id: siteId },
              { site_id: null },
            ],
          },
          orderBy: [
            { confidence_score: "desc" },
            { created_at: "asc" },
          ],
        });

        if (topic) {
          keyword = topic.primary_keyword;
          topicProposalId = topic.id;
          locale = topic.locale || "en";
          strategy = "topic_db";

          // Mark topic as being worked on
          await prisma.topicProposal.update({
            where: { id: topic.id },
            data: { status: "generated" },
          });
        }
      } catch {
        // TopicProposal query failed — fall through to template
      }

      // Fallback: use site template topics
      if (!keyword) {
        const topics = site.topicsEN;
        if (!topics || topics.length === 0) {
          return NextResponse.json({
            success: true,
            message: "No template topics configured for site " + siteId,
            timestamp: new Date().toISOString(),
          });
        }
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000,
        );
        const topic = topics[dayOfYear % topics.length];
        keyword = topic.keyword;
        locale = "en";
        strategy = "template_cycle";
      }

      // Create paired bilingual drafts (EN + AR) — each goes through the full pipeline independently
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

      // Link the EN draft back to the AR draft
      await prisma.articleDraft.update({
        where: { id: enDraft.id },
        data: { paired_draft_id: arDraft.id },
      });

      // Process the EN draft first this run (AR will be picked up next)
      draft = enDraft;

      console.log(
        `[content-builder] Created bilingual pair: EN=${enDraft.id}, AR=${arDraft.id} for keyword "${keyword}" (${strategy})`,
      );
    }

    // Step 3: Run the current phase
    if (deadline.isExpired()) {
      return NextResponse.json({
        success: true,
        message: "Budget expired before phase execution",
        draftId: (draft as Record<string, unknown>).id,
        phase: (draft as Record<string, unknown>).current_phase,
        timestamp: new Date().toISOString(),
      });
    }

    const draftRecord = draft as Record<string, unknown>;
    const siteId = draftRecord.site_id as string;
    const site = SITES[siteId];

    if (!site) {
      return NextResponse.json({
        success: false,
        message: "No site config for " + siteId,
        timestamp: new Date().toISOString(),
      });
    }

    const currentPhase = draftRecord.current_phase as string;
    console.log(
      `[content-builder] Running phase "${currentPhase}" for draft ${draftRecord.id} (keyword: "${draftRecord.keyword}")`,
    );

    const result = await runPhase(draftRecord as any, site, deadline.remainingMs());

    // Step 4: Save phase result to DB
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (result.success) {
      updateData.current_phase = result.nextPhase;
      updateData.phase_attempts = 0;
      updateData.last_error = null;
      updateData.phase_started_at = new Date();

      // Merge phase-specific data
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

      // Mark completed if entering reservoir or rejected
      if (result.nextPhase === "reservoir" || result.nextPhase === "rejected") {
        updateData.completed_at = new Date();
        if (result.nextPhase === "rejected") {
          updateData.rejection_reason = "Quality score below threshold";
        }
      }
    } else {
      // Phase failed — increment attempts
      updateData.phase_attempts = ((draftRecord.phase_attempts as number) || 0) + 1;
      updateData.last_error = result.error || "Unknown error";

      // If max retries reached, reject the draft
      if ((updateData.phase_attempts as number) >= 3) {
        updateData.current_phase = "rejected";
        updateData.rejection_reason = `Phase "${currentPhase}" failed after 3 attempts: ${result.error ?? "Unknown error"}`;
        updateData.completed_at = new Date();
      }
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

    return NextResponse.json({
      success: true,
      draftId: draftRecord.id,
      keyword: draftRecord.keyword,
      locale: draftRecord.locale,
      previousPhase: currentPhase,
      nextPhase: result.nextPhase,
      phaseSuccess: result.success,
      phaseError: result.error || null,
      strategy: draftRecord.generation_strategy,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - cronStart;
    console.error("[content-builder] Failed:", error);

    await logCronExecution("content-builder", "failed", {
      durationMs,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }).catch(() => {});

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleContentBuilder(request);
}

export async function POST(request: NextRequest) {
  return handleContentBuilder(request);
}
