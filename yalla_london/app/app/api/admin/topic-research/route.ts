export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * SEO Topic Research API — AI-Powered Keyword Discovery
 *
 * POST — Researches trending, high-performing topics for a given site/niche.
 *
 * Uses Grok Live Search (preferred — real-time trending data) or falls back
 * to the unified AI provider chain for keyword research.
 *
 * Returns 20 topics with:
 *   - Main keyword + long-tail variants
 *   - Estimated monthly search volume (relative: high/medium/low)
 *   - Trend direction (rising/stable/declining)
 *   - Competition level (low/medium/high)
 *   - Relevance score (0-100) for the site's niche
 *   - Suggested page type and content angle
 *   - Evidence-based rationale
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { logManualAction } from "@/lib/action-logger";

interface ResearchedTopic {
  rank: number;
  keyword: string;
  longTails: string[];
  searchVolume: "high" | "medium" | "low";
  estimatedMonthlySearches: string; // e.g. "5,000-10,000"
  trend: "rising" | "stable" | "declining";
  trendEvidence: string;
  competition: "low" | "medium" | "high";
  relevanceScore: number; // 0-100
  suggestedPageType: string;
  contentAngle: string;
  rationale: string;
  questions: string[];
}

async function handlePost(request: NextRequest) {
  const body = await request.json();
  const { getDefaultSiteId, getSiteConfig } = await import("@/config/sites");

  const siteId = body.siteId || getDefaultSiteId();
  const site = getSiteConfig(siteId);
  const count = Math.min(Math.max(body.count || 20, 5), 30);
  const focusArea = body.focusArea || ""; // Optional: narrow focus (e.g. "Ramadan", "summer", "luxury hotels")
  const language = body.language || "en";

  if (!site) {
    return NextResponse.json({ error: `Site "${siteId}" not found` }, { status: 400 });
  }

  const cronStart = Date.now();
  const BUDGET_MS = 50_000;

  try {
    const { generateJSON } = await import("@/lib/ai/provider");

    // Build a rich context prompt for the AI
    const destination = site.destination || site.name;
    const existingTopics = site.topicsEN?.map((t: { keyword: string }) => t.keyword).slice(0, 10).join(", ") || "";

    const focusClause = focusArea
      ? `\n\nFOCUS AREA: "${focusArea}" — prioritize topics related to this theme, but include a few broader topics too.`
      : "";

    const prompt = `You are an SEO strategist for "${site.name}", a luxury travel blog covering ${destination}'s finest experiences for international visitors, with special expertise serving Arab and Gulf travelers.

RESEARCH TASK: Find ${count} high-potential blog topics for this site that will rank well in Google and attract qualified traffic.

SITE CONTEXT:
- Destination: ${destination}
- Primary audience: International luxury travelers (broadest search volume)
- Secondary audience: Arab travelers, Gulf tourists, halal-conscious travelers (niche differentiator)
- Monetization: Affiliate links (hotels, restaurants, experiences, tours)
- Content style: First-hand experience, insider tips, luxury positioning
- Existing topics (avoid duplicates): ${existingTopics}${focusClause}

CRITICAL TOPIC MIX (mandatory balance):
- 60-70% GENERAL luxury travel topics: "best hotels in ${destination}", "top restaurants", "things to do", "weekend itinerary", "shopping guide", "spa experiences", "nightlife", "day trips" — these have the highest search volume
- 30-40% NICHE Arab/halal/Gulf topics: "halal restaurants", "Arab-friendly hotels", "Ramadan events", "prayer facilities" — these are our differentiator with less competition

RESEARCH CRITERIA — For each topic:
1. **Search demand**: Focus on keywords with real search volume. Prioritize long-tail keywords (3-6 words) that have clear intent. General luxury terms typically have 10-50x more search volume than Arab-specific variants.
2. **Trend analysis**: Flag topics that are RISING in search interest (seasonal events, new openings, upcoming holidays, travel trends).
3. **Competition**: For general topics, find underserved angles. For niche topics, we often own the SERP.
4. **Revenue potential**: Topics that naturally lead to hotel bookings, restaurant reservations, tour bookings, or experience purchases.
5. **Topical authority**: Topics that build the site's authority cluster around ${destination} luxury travel.

MIX REQUIREMENTS:
- 5-7 evergreen topics (year-round relevance)
- 3-5 seasonal/timely topics (upcoming events, holidays, seasons)
- 3-5 comparison/listicle topics ("best X in ${destination}", "top 10 Y")
- 2-3 practical guide topics (how-to, planning, budgeting)
- 2-3 niche/underserved topics (gaps in existing content)

Return JSON array of ${count} topics, ordered by potential impact (highest first):
[
  {
    "rank": 1,
    "keyword": "main keyword phrase",
    "longTails": ["long tail variant 1", "long tail variant 2", "long tail variant 3"],
    "searchVolume": "high" | "medium" | "low",
    "estimatedMonthlySearches": "1,000-5,000",
    "trend": "rising" | "stable" | "declining",
    "trendEvidence": "Why this is trending (specific data point or event)",
    "competition": "low" | "medium" | "high",
    "relevanceScore": 85,
    "suggestedPageType": "guide" | "listicle" | "comparison" | "news" | "deep-dive",
    "contentAngle": "Unique angle to take on this topic",
    "rationale": "Why this topic will perform well for this site",
    "questions": ["Question searchers ask about this", "Another question"]
  }
]`;

    const result = await generateJSON<ResearchedTopic[]>(prompt, {
      systemPrompt: `You are an expert SEO researcher specializing in luxury travel content. Your primary focus is high-volume general travel keywords, supplemented by Arab/halal niche topics where the site has competitive advantage. Return only valid JSON arrays. Base your search volume estimates on realistic ranges for travel keywords. Be specific about trend evidence — cite actual events, seasons, or data points.`,
      maxTokens: 4000,
      temperature: 0.7,
      timeoutMs: BUDGET_MS - 5_000,
      siteId,
      taskType: "topic_research",
      calledFrom: "topic-research",
    });

    // Validate and normalize results
    const topics: ResearchedTopic[] = Array.isArray(result) ? result : [];
    const validTopics = topics
      .filter((t) => t.keyword && typeof t.keyword === "string")
      .map((t, i) => ({
        rank: i + 1,
        keyword: t.keyword.trim(),
        longTails: Array.isArray(t.longTails) ? t.longTails.slice(0, 5) : [],
        searchVolume: (["high", "medium", "low"].includes(t.searchVolume) ? t.searchVolume : "medium") as "high" | "medium" | "low",
        estimatedMonthlySearches: t.estimatedMonthlySearches || "unknown",
        trend: (["rising", "stable", "declining"].includes(t.trend) ? t.trend : "stable") as "rising" | "stable" | "declining",
        trendEvidence: t.trendEvidence || "",
        competition: (["low", "medium", "high"].includes(t.competition) ? t.competition : "medium") as "low" | "medium" | "high",
        relevanceScore: typeof t.relevanceScore === "number" ? Math.min(100, Math.max(0, t.relevanceScore)) : 70,
        suggestedPageType: t.suggestedPageType || "guide",
        contentAngle: t.contentAngle || "",
        rationale: t.rationale || "",
        questions: Array.isArray(t.questions) ? t.questions.slice(0, 4) : [],
      }));

    const durationMs = Date.now() - cronStart;

    logManualAction(request, {
      action: "topic-research",
      resource: "topic",
      siteId,
      success: true,
      summary: `Researched ${validTopics.length} topics for ${site.name}${focusArea ? ` (focus: ${focusArea})` : ""}`,
      details: { topicCount: validTopics.length, focusArea: focusArea || null, destination, durationMs },
      durationMs,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      siteId,
      siteName: site.name,
      destination,
      language,
      focusArea: focusArea || null,
      topicCount: validTopics.length,
      topics: validTopics,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[topic-research] Failed:", msg);

    logManualAction(request, {
      action: "topic-research",
      resource: "topic",
      siteId,
      success: false,
      summary: "Topic research failed",
      error: msg,
      fix: "Check AI provider configuration in the AI Config tab. The provider may be down or rate-limited.",
    }).catch(() => {});

    return NextResponse.json(
      { error: "Topic research failed", detail: msg.substring(0, 200) },
      { status: 500 },
    );
  }
}

export const POST = withAdminAuth(handlePost);
