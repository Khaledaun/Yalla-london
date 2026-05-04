/**
 * Content Tool Handlers — wraps content pipeline for CEO Agent.
 *
 * Tools: get_articles (in analytics.ts), search_knowledge (in analytics.ts)
 *
 * This file provides additional content-related tools for triggering
 * content generation and querying the pipeline.
 */

import { prisma } from "@/lib/db";
import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// Content pipeline status query (used internally by CEO Brain)
// ---------------------------------------------------------------------------

export async function getContentPipelineStatus(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;

  const phases = await prisma.articleDraft.groupBy({
    by: ["current_phase"],
    where: { site_id: siteId },
    _count: true,
  });

  const phaseMap: Record<string, number> = {};
  for (const p of phases) {
    phaseMap[p.current_phase] = p._count;
  }

  const totalDrafts = Object.values(phaseMap).reduce((a, b) => a + b, 0);
  const reservoir = phaseMap["reservoir"] || 0;
  const rejected = phaseMap["rejected"] || 0;
  const active = totalDrafts - reservoir - rejected;

  return {
    success: true,
    data: { phases: phaseMap, totalDrafts, active, reservoir, rejected },
    summary: `Pipeline: ${active} active drafts, ${reservoir} in reservoir, ${rejected} rejected.`,
  };
}

// ---------------------------------------------------------------------------
// Recent topics query
// ---------------------------------------------------------------------------

export async function getRecentTopics(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;
  const limit = Math.min(Number(params.limit) || 10, 50);

  const topics = await prisma.topicProposal.findMany({
    where: { site_id: siteId },
    select: {
      id: true,
      title: true,
      status: true,
      intent: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  return {
    success: true,
    data: topics.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      intent: t.intent,
      createdAt: t.created_at.toISOString(),
    })),
    summary: `Found ${topics.length} recent topics for site "${siteId}".`,
  };
}
