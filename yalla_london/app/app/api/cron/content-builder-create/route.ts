export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Content Builder CREATE — Draft Pair Creation Only
 *
 * Split from content-builder so the main builder gets the full 53s budget
 * for AI phase advancement (especially drafting + assembly).
 *
 * This route ONLY creates new ArticleDraft bilingual pairs (EN + AR) from
 * the TopicProposal queue. No AI calls, no phase execution. Purely DB work.
 *
 * Runs every 30 minutes. Completes in 5-15 seconds.
 * Creates up to 1 pair per active site per run (budget-guarded).
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 53_000;

async function handleCreate(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_CONTENT_BUILDER_CREATE=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("content-builder-create");
  if (flagResponse) return flagResponse;

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, SITES } = await import("@/config/sites");
    const activeSites = getActiveSiteIds();

    if (activeSites.length === 0) {
      return NextResponse.json({ success: true, message: "No active sites", created: 0 });
    }

    const created: Array<{ siteId: string; keyword: string; enId: string; arId: string }> = [];
    const skippedSites: string[] = [];
    const fullReservoirs: string[] = [];

    for (const siteId of activeSites) {
      if (Date.now() - cronStart > BUDGET_MS - 5_000) {
        console.log(`[builder-create] Budget low — processed ${activeSites.indexOf(siteId)} of ${activeSites.length} sites`);
        break;
      }

      const site = SITES[siteId];
      if (!site) { skippedSites.push(siteId); continue; }

      // Skip if reservoir is full
      const reservoirCount = await prisma.articleDraft.count({
        where: { site_id: siteId, current_phase: "reservoir" },
      });
      if (reservoirCount >= 10) {
        fullReservoirs.push(`${siteId}(${reservoirCount})`);
        continue;
      }

      // Skip if there are already active drafts for this site (builder will advance them)
      const activeDrafts = await prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
        },
      });
      if (activeDrafts >= 2) {
        console.log(`[builder-create] Site ${siteId} has ${activeDrafts} active drafts — skipping creation`);
        continue;
      }

      // Find a topic to turn into drafts
      let keyword = "";
      let topicProposalId: string | null = null;
      let strategy = "template_cycle";
      let prePopulatedResearch: Record<string, unknown> | undefined;

      try {
        const candidate = await prisma.topicProposal.findFirst({
          where: {
            status: { in: ["ready", "queued", "planned", "proposed"] },
            OR: [{ site_id: siteId }, { site_id: null }],
          },
          orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
        });

        if (candidate) {
          const claimed = await prisma.topicProposal.updateMany({
            where: {
              id: candidate.id,
              status: { in: ["ready", "queued", "planned", "proposed"] },
            },
            data: { status: "generating", updated_at: new Date() },
          });

          if (claimed.count > 0) {
            keyword = candidate.primary_keyword;
            topicProposalId = candidate.id;
            strategy = "topic_db";

            const hasLongtails = Array.isArray(candidate.longtails) && candidate.longtails.length > 0;
            const hasQuestions = Array.isArray(candidate.questions) && candidate.questions.length > 0;
            if (hasLongtails || hasQuestions) {
              prePopulatedResearch = {
                keywordData: {
                  primary: keyword,
                  secondary: (candidate.longtails || []).slice(0, 3),
                  longTail: candidate.longtails || [],
                  questions: candidate.questions || [],
                },
                contentStrategy: {
                  recommendedWordCount: 1800,
                  recommendedHeadings: 8,
                  toneGuidance: "luxury, authoritative, helpful for Arab travelers",
                  uniqueAngle: "",
                  affiliateOpportunities: [],
                },
                _prePopulated: true,
                _source: "topic_proposal",
              };
            }
          }
        }
      } catch (topicErr) {
        console.warn(`[builder-create] TopicProposal query failed for ${siteId}:`, topicErr instanceof Error ? topicErr.message : topicErr);
      }

      // Fallback to template cycle if no topic found
      if (!keyword) {
        const topics = site.topicsEN;
        if (!topics || topics.length === 0) { skippedSites.push(siteId); continue; }
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000,
        );
        keyword = topics[dayOfYear % topics.length].keyword;
        strategy = "template_cycle";
      }

      // Create bilingual draft pair
      const enDraft = await prisma.articleDraft.create({
        data: {
          site_id: siteId,
          keyword,
          locale: "en",
          current_phase: "research",
          topic_proposal_id: topicProposalId,
          generation_strategy: strategy,
          phase_started_at: new Date(),
          research_data: prePopulatedResearch,
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

      if (topicProposalId) {
        await prisma.topicProposal.update({
          where: { id: topicProposalId },
          data: { status: "generated" },
        }).catch((err: unknown) => {
          console.warn(`[builder-create] Failed to mark topic ${topicProposalId} as generated:`, err instanceof Error ? err.message : err);
        });
      }

      created.push({ siteId, keyword, enId: enDraft.id, arId: arDraft.id });
      console.log(`[builder-create] Created pair for "${siteId}": EN=${enDraft.id}, AR=${arDraft.id} keyword="${keyword}" (${strategy})`);
    }

    const durationMs = Date.now() - cronStart;

    await logCronExecution("content-builder-create", "completed", {
      durationMs,
      itemsProcessed: created.length,
      itemsSucceeded: created.length,
      resultSummary: {
        created: created.length,
        skipped: skippedSites,
        fullReservoirs,
      },
    }).catch(err => console.warn("[builder-create] logCronExecution failed:", err instanceof Error ? err.message : err));

    return NextResponse.json({
      success: true,
      created: created.length,
      pairs: created,
      skippedSites,
      fullReservoirs,
      durationMs,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - cronStart;

    await logCronExecution("content-builder-create", "failed", {
      durationMs,
      errorMessage: errMsg,
    }).catch(err => console.warn("[builder-create] logCronExecution failed:", err instanceof Error ? err.message : err));

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "content-builder-create", error: errMsg }).catch(err => console.warn("[builder-create] onCronFailure hook failed:", err instanceof Error ? err.message : err));

    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCreate(request);
}

export async function POST(request: NextRequest) {
  return handleCreate(request);
}
