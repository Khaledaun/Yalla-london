/**
 * Commerce Trend Engine — AI-powered market research for digital products
 *
 * Discovers trending niches, scores opportunities, and generates ProductBriefs.
 * Uses the platform's AI provider system (Grok → Claude → OpenAI → Gemini fallback).
 *
 * Flow: cron trigger → fetchTrendSignals() → scoreOpportunities() → generateBriefs()
 *       → TrendRun + ProductBrief records in DB
 */

import type {
  TrendSignal,
  NicheOpportunity,
  OpportunityScore,
} from "./types";
import {
  PRODUCT_ONTOLOGY,
  OPPORTUNITY_SCORE_WEIGHTS,
} from "./constants";

// ─── Main Entry Point ─────────────────────────────────────

export interface TrendRunResult {
  trendRunId: string;
  niches: NicheOpportunity[];
  briefsCreated: number;
  tokensUsed: { prompt: number; completion: number };
  estimatedCostUsd: number;
  durationMs: number;
}

/**
 * Execute a full trend research run for a site.
 * Creates a TrendRun record and generates ProductBriefs for top opportunities.
 */
export async function executeTrendRun(
  siteId: string,
  options: {
    maxNiches?: number;
    minScore?: number;
    calledFrom?: string;
  } = {},
): Promise<TrendRunResult> {
  const startTime = Date.now();
  const maxNiches = options.maxNiches ?? 10;
  const minScore = options.minScore ?? 50;
  const calledFrom = options.calledFrom ?? "commerce-trends";

  const { prisma } = await import("@/lib/db");
  const { getSiteConfig } = await import("@/config/sites");

  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name ?? siteId;
  const siteDestination = siteConfig?.destination ?? "travel";

  // Create TrendRun record (status: running)
  const trendRun = await prisma.trendRun.create({
    data: {
      siteId,
      status: "running",
    },
  });

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  try {
    // Step 1: Discover niches via AI
    const { niches, usage: nicheUsage } = await discoverNiches(siteId, siteName, siteDestination, maxNiches, calledFrom);
    totalPromptTokens += nicheUsage.prompt;
    totalCompletionTokens += nicheUsage.completion;

    // Step 2: Score each niche opportunity
    const scoredNiches = niches.map((niche) => ({
      ...niche,
      score: computeOpportunityScore(niche),
    }));

    // Sort by composite score descending
    scoredNiches.sort((a, b) => b.score - a.score);

    // Step 3: Filter by minimum score threshold
    const qualifiedNiches = scoredNiches.filter((n) => n.score >= minScore);

    // Step 4: Generate ProductBriefs for qualified niches
    let briefsCreated = 0;
    for (const niche of qualifiedNiches.slice(0, 5)) {
      // Cap at 5 briefs per run
      try {
        await createBriefFromNiche(siteId, trendRun.id, niche);
        briefsCreated++;
      } catch (err) {
        console.warn(
          `[trend-engine] Failed to create brief for "${niche.niche}":`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Step 5: Estimate cost (grok-4-1-fast: $0.20/$0.50 per 1M tokens)
    const estimatedCostUsd =
      (totalPromptTokens * 0.2 + totalCompletionTokens * 0.5) / 1_000_000;

    // Step 6: Update TrendRun with results
    const durationMs = Date.now() - startTime;
    await prisma.trendRun.update({
      where: { id: trendRun.id },
      data: {
        status: "completed",
        nichesJson: scoredNiches as unknown as Record<string, unknown>[],
        trendsJson: scoredNiches.map((n) => ({
          keyword: n.niche,
          score: n.score,
          keywords: n.keywords,
        })) as unknown as Record<string, unknown>[],
        opportunitiesJson: qualifiedNiches as unknown as Record<string, unknown>[],
        aiProvider: "grok",
        aiModel: "grok-4-1-fast",
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        estimatedCostUsd,
        durationMs,
      },
    });

    return {
      trendRunId: trendRun.id,
      niches: qualifiedNiches,
      briefsCreated,
      tokensUsed: { prompt: totalPromptTokens, completion: totalCompletionTokens },
      estimatedCostUsd,
      durationMs,
    };
  } catch (error) {
    // Mark TrendRun as failed
    const durationMs = Date.now() - startTime;
    await prisma.trendRun.update({
      where: { id: trendRun.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
      },
    });
    throw error;
  }
}

// ─── AI Niche Discovery ───────────────────────────────────

async function discoverNiches(
  siteId: string,
  siteName: string,
  siteDestination: string,
  maxNiches: number,
  calledFrom: string,
): Promise<{
  niches: NicheOpportunity[];
  usage: { prompt: number; completion: number };
}> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const { getProviderForTask } = await import("@/lib/ai/provider-config");

  const route = await getProviderForTask("commerce_trends", siteId);

  const ontologyCategories = PRODUCT_ONTOLOGY.map(
    (p) => `${p.category} (${p.label}, Tier ${p.tier}, $${(p.priceRange.min / 100).toFixed(2)}-$${(p.priceRange.max / 100).toFixed(2)})`,
  ).join("\n  ");

  const prompt = `You are a digital product market researcher specializing in travel and lifestyle niches.

SITE CONTEXT:
- Site: ${siteName}
- Destination focus: ${siteDestination}
- Target audience: Arab luxury travelers, travel enthusiasts, content creators

PRODUCT CATEGORIES WE SELL (digital downloads):
  ${ontologyCategories}

TASK:
Research the current market for digital travel products on Etsy and similar marketplaces.
Identify ${maxNiches} trending niches that align with our product categories.

For each niche, provide:
1. "niche" — concise niche name (e.g. "Dubai skyline wall art printables")
2. "score" — estimated opportunity score 0-100
3. "rationale" — 1-2 sentences explaining why this is a good opportunity
4. "keywords" — array of 5-8 relevant search keywords/phrases
5. "competitorCount" — estimated number of competing products on Etsy
6. "avgPrice" — average competitor price in cents (USD)
7. "demandSignal" — "high" | "medium" | "low"
8. "ontologyCategory" — best matching category from our product list
9. "suggestedTier" — 1, 2, or 3
10. "buyerIntent" — 0-100 estimated buyer intent strength
11. "trendVelocity" — 0-100 how fast this trend is growing
12. "competitionGap" — 0-100 how underserved this niche is
13. "productionEase" — 0-100 how easy it is to produce
14. "authorityFit" — 0-100 how well it fits our brand authority
15. "seasonalTiming" — 0-100 current seasonal relevance
16. "bundlePotential" — 0-100 cross-sell/bundle opportunity

Focus on niches where:
- Search volume is growing (not saturated)
- Our travel brand has natural authority
- Production cost is low (digital products)
- Price point allows healthy margins

Respond with a JSON array of objects. No markdown fencing.`;

  const result = await generateJSON<NicheOpportunity[]>(prompt, {
    provider: route.provider as "grok" | "claude" | "openai" | "gemini",
    model: route.model,
    maxTokens: 4096,
    temperature: 0.7,
    siteId,
    taskType: "commerce_trends",
    calledFrom,
  });

  // Extract usage from the last call (generateJSON wraps generateCompletion)
  // Usage is logged automatically by the provider — we approximate here
  const estimatedPromptTokens = Math.round(prompt.length / 4);
  const estimatedCompletionTokens = Math.round(JSON.stringify(result).length / 4);

  return {
    niches: Array.isArray(result) ? result.slice(0, maxNiches) : [],
    usage: { prompt: estimatedPromptTokens, completion: estimatedCompletionTokens },
  };
}

// ─── Opportunity Scoring ──────────────────────────────────

function computeOpportunityScore(niche: NicheOpportunity): number {
  const weights = OPPORTUNITY_SCORE_WEIGHTS;

  const composite =
    (niche.buyerIntent ?? 50) * weights.buyerIntent +
    (niche.trendVelocity ?? 50) * weights.trendVelocity +
    (niche.competitionGap ?? 50) * weights.competitionGap +
    (niche.productionEase ?? 50) * weights.productionEase +
    (niche.authorityFit ?? 50) * weights.authorityFit +
    (niche.seasonalTiming ?? 50) * weights.seasonalTiming +
    (niche.bundlePotential ?? 50) * weights.bundlePotential;

  return Math.round(composite);
}

// ─── Brief Generation ─────────────────────────────────────

async function createBriefFromNiche(
  siteId: string,
  trendRunId: string,
  niche: NicheOpportunity,
): Promise<void> {
  const { prisma } = await import("@/lib/db");
  const ontologyItem = PRODUCT_ONTOLOGY.find(
    (p) => p.category === niche.ontologyCategory,
  );

  await prisma.productBrief.create({
    data: {
      siteId,
      trendRunId,
      title: niche.niche,
      description: niche.rationale ?? "",
      productType: ontologyItem?.productType ?? "TEMPLATE",
      tier: niche.suggestedTier ?? ontologyItem?.tier ?? 2,
      ontologyCategory: niche.ontologyCategory ?? null,
      targetPrice: niche.avgPrice ?? ontologyItem?.priceRange.min ?? 999,
      currency: "USD",
      keywordsJson: niche.keywords ?? [],
      competitorUrls: [],
      status: "draft",
    },
  });
}

// ─── Utility: Get trend signals for a category ────────────

export function getCategoryTrendSignals(
  category: string,
  nichesData: NicheOpportunity[],
): TrendSignal[] {
  return nichesData
    .filter((n) => n.ontologyCategory === category)
    .flatMap((n) =>
      (n.keywords ?? []).map((kw) => ({
        keyword: kw,
        score: n.score ?? 50,
        source: "ai_research" as const,
        volume: undefined,
        competition: n.demandSignal === "high" ? "low" : n.demandSignal === "low" ? "high" : "medium",
      })),
    );
}

// ─── Utility: Summarize TrendRun for dashboard ────────────

export interface TrendRunSummary {
  id: string;
  siteId: string;
  runDate: Date;
  status: string;
  nicheCount: number;
  briefCount: number;
  topNiches: { name: string; score: number }[];
  estimatedCostUsd: number;
  durationMs: number | null;
}

export async function getTrendRunSummaries(
  siteId: string,
  limit: number = 10,
): Promise<TrendRunSummary[]> {
  const { prisma } = await import("@/lib/db");

  const runs = await prisma.trendRun.findMany({
    where: { siteId },
    orderBy: { runDate: "desc" },
    take: limit,
    include: {
      briefs: {
        select: { id: true },
      },
    },
  });

  return runs.map((run) => {
    const niches = (run.nichesJson as NicheOpportunity[] | null) ?? [];
    return {
      id: run.id,
      siteId: run.siteId,
      runDate: run.runDate,
      status: run.status,
      nicheCount: niches.length,
      briefCount: run.briefs.length,
      topNiches: niches
        .slice(0, 3)
        .map((n) => ({ name: n.niche ?? "Unknown", score: n.score ?? 0 })),
      estimatedCostUsd: run.estimatedCostUsd,
      durationMs: run.durationMs,
    };
  });
}
