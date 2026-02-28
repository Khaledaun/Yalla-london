export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { googleTrends } from "@/lib/integrations/google-trends";
import { prisma } from "@/lib/db";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Google Trends Monitoring Cron Job
 * Runs daily to track trending topics relevant to Yalla London
 *
 * Schedule: 0 6 * * * (6 AM daily via Vercel Cron)
 *
 * Data Collected:
 * - Daily trending searches in UK
 * - Interest over time for target keywords
 * - Related queries and topics
 * - Seasonal trend patterns
 */

// Target keywords to monitor (reduced from 10 to 6 to prevent timeout)
const MONITORED_KEYWORDS = [
  "halal food london",
  "luxury london",
  "london restaurants",
  "london hotels",
  "arab restaurants london",
  "things to do london",
];

// Arabic keywords for GCC audience
const ARABIC_KEYWORDS = ["سياحة لندن", "فنادق لندن", "مطاعم لندن", "حلال لندن"];

interface TrendData {
  keyword: string;
  interestScore: number;
  trend: "rising" | "stable" | "declining";
  relatedQueries: string[];
  timestamp: Date;
}

interface TrendingTopic {
  title: string;
  traffic: string;
  isRelevant: boolean;
  relevanceScore: number;
  category: string;
}

export async function GET(request: NextRequest) {
  // Standard cron auth: reject only if CRON_SECRET is set and doesn't match
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Healthcheck mode — quick DB ping + last run status
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const lastRun = await prisma.seoReport.findFirst({
        where: { reportType: "trends-monitor" },
        orderBy: { generatedAt: "desc" },
        select: { reportType: true, generatedAt: true },
      });
      return NextResponse.json({
        status: "healthy",
        endpoint: "trends-monitor",
        lastRun: lastRun || null,
        monitoredKeywords: MONITORED_KEYWORDS.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Return 200 degraded, not 503 — DB pool exhaustion during concurrent health checks
      // should not appear as a hard failure. Cron runs on schedule regardless.
      return NextResponse.json(
        { status: "degraded", endpoint: "trends-monitor", note: "DB temporarily unavailable for healthcheck." },
        { status: 200 },
      );
    }
  }

  const cronStart = Date.now();

  try {
    const results = await runTrendsMonitoring();

    await logCronExecution("trends-monitor", "completed", {
      durationMs: Date.now() - cronStart,
      resultSummary: {
        trendingTopics: results.trendingTopics.length,
        keywordTrends: results.keywordTrends.length,
        contentOpportunities: results.contentOpportunities.length,
        relevantTrendingTopics: results.summary.relevantTrendingTopics,
        risingKeywords: results.summary.risingKeywords.length,
      },
    });

    return NextResponse.json(results);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Trends monitoring failed:", error);
    await logCronExecution("trends-monitor", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "trends-monitor", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { error: errMsg },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Auth check — same standard as GET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Manual trigger endpoint
  try {
    const body = await request.json().catch(() => ({}));
    const { keywords, geo } = body as { keywords?: string[]; geo?: string };

    const results = await runTrendsMonitoring(keywords, geo);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Manual trends monitoring failed:", error);
    return NextResponse.json(
      { error: "Monitoring failed" },
      { status: 500 },
    );
  }
}

async function runTrendsMonitoring(
  customKeywords?: string[],
  geo: string = "GB",
): Promise<{
  success: boolean;
  timestamp: string;
  trendingTopics: TrendingTopic[];
  keywordTrends: TrendData[];
  contentOpportunities: ContentOpportunity[];
  summary: TrendsSummary;
}> {
  const timestamp = new Date().toISOString();
  const keywords = customKeywords || MONITORED_KEYWORDS;

  // 1. Get daily trending searches
  const trendingSearches = await googleTrends.getTrendingSearches(geo);

  // 2. Analyze trending topics for relevance
  const trendingTopics = analyzeTrendingTopics(trendingSearches);

  // 3. Get interest over time for monitored keywords
  const keywordTrends = await getKeywordTrends(keywords, geo);

  // 3b. Supplement with Grok X/Twitter social buzz (if XAI_API_KEY is configured)
  const socialTrends = await getGrokSocialTrends();
  if (socialTrends.length > 0) {
    // Merge Grok social trends into trending topics
    trendingTopics.push(...socialTrends);
    trendingTopics.sort((a, b) => b.relevanceScore - a.relevanceScore);
    console.log(`[trends-monitor] Added ${socialTrends.length} social trends from Grok X search`);
  }

  // 4. Identify content opportunities
  const contentOpportunities = identifyContentOpportunities(
    trendingTopics,
    keywordTrends,
  );

  // 5. Generate summary
  const summary = generateTrendsSummary(
    trendingTopics,
    keywordTrends,
    contentOpportunities,
  );

  // 6. Save to database for historical tracking (deadline = 55s from outer cron start)
  await saveTrendsData({
    timestamp: new Date(),
    trendingTopics,
    keywordTrends,
    contentOpportunities,
    summary,
  }, Date.now() + 8_000); // 8s budget for DB saves

  return {
    success: true,
    timestamp,
    trendingTopics,
    keywordTrends,
    contentOpportunities,
    summary,
  };
}

function analyzeTrendingTopics(trendingSearches: any[]): TrendingTopic[] {
  const relevantCategories = [
    "travel",
    "tourism",
    "food",
    "restaurant",
    "hotel",
    "london",
    "luxury",
    "shopping",
    "entertainment",
    "events",
    "arab",
    "halal",
    "ramadan",
    "eid",
    "christmas",
    "new year",
  ];

  return trendingSearches
    .map((topic) => {
      const title = topic.title?.toLowerCase() || "";
      const matchedCategories = relevantCategories.filter((cat) =>
        title.includes(cat),
      );
      const isRelevant =
        matchedCategories.length > 0 || title.includes("london");

      return {
        title: topic.title,
        traffic: topic.traffic || "N/A",
        isRelevant,
        relevanceScore:
          matchedCategories.length * 0.25 +
          (title.includes("london") ? 0.5 : 0),
        category: matchedCategories[0] || "general",
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

async function getKeywordTrends(
  keywords: string[],
  geo: string,
): Promise<TrendData[]> {
  const trends: TrendData[] = [];
  // Budget: leave 10s for trending-search + opportunities + DB save + response
  const deadlineMs = Date.now() + 45_000; // 45s keyword budget within 60s maxDuration

  for (const keyword of keywords) {
    // Stop processing if we're running out of time
    if (Date.now() >= deadlineMs) {
      console.warn(`[trends-monitor] Deadline approaching, processed ${trends.length}/${keywords.length} keywords`);
      break;
    }

    try {
      const result = await googleTrends.getInterestOverTime(
        [keyword],
        geo,
        "today 3-m",
      );

      if (result.length > 0) {
        const data = result[0];
        const recentInterest = data.interestOverTime.slice(-7);
        const olderInterest = data.interestOverTime.slice(-14, -7);

        const recentAvg =
          recentInterest.reduce((sum, p) => sum + p.value, 0) /
            recentInterest.length || 0;
        const olderAvg =
          olderInterest.reduce((sum, p) => sum + p.value, 0) /
            olderInterest.length || 0;

        let trend: "rising" | "stable" | "declining";
        if (recentAvg > olderAvg * 1.1) trend = "rising";
        else if (recentAvg < olderAvg * 0.9) trend = "declining";
        else trend = "stable";

        // Clamp to 0-100 range — SerpAPI should return normalized values
        // but guard against raw extracted values leaking through
        const clampedScore = Math.min(100, Math.max(0, recentAvg));

        trends.push({
          keyword,
          interestScore: clampedScore,
          trend,
          relatedQueries: data.relatedQueries.slice(0, 5).map((q) => q.query),
          timestamp: new Date(),
        });
      }
    } catch (error) {
      // If a single keyword fetch was aborted/timed out, skip it and continue
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("abort") || msg.includes("timeout")) {
        console.warn(`[trends-monitor] Timeout for "${keyword}", skipping`);
        continue;
      }
      console.error(`Failed to get trends for "${keyword}":`, error);
    }

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return trends;
}

interface ContentOpportunity {
  title: string;
  keyword: string;
  type: "trending" | "rising" | "seasonal" | "gap";
  priority: "high" | "medium" | "low";
  suggestedAction: string;
  estimatedTraffic: number;
}

function identifyContentOpportunities(
  trendingTopics: TrendingTopic[],
  keywordTrends: TrendData[],
): ContentOpportunity[] {
  const opportunities: ContentOpportunity[] = [];

  // 1. High-relevance trending topics
  trendingTopics
    .filter((t) => t.isRelevant && t.relevanceScore >= 0.5)
    .slice(0, 5)
    .forEach((topic) => {
      opportunities.push({
        title: `Write about: ${topic.title}`,
        keyword: topic.title,
        type: "trending",
        priority: "high",
        suggestedAction: `Create timely content about "${topic.title}" - currently trending`,
        estimatedTraffic:
          parseInt(topic.traffic.replace(/[^0-9]/g, "")) || 1000,
      });
    });

  // 2. Rising keyword trends
  keywordTrends
    .filter((t) => t.trend === "rising")
    .forEach((trend) => {
      opportunities.push({
        title: `Optimize for: ${trend.keyword}`,
        keyword: trend.keyword,
        type: "rising",
        priority: trend.interestScore > 50 ? "high" : "medium",
        suggestedAction: `Update existing content or create new content for "${trend.keyword}" - interest rising`,
        estimatedTraffic: Math.round(trend.interestScore * 100),
      });
    });

  // 3. Related queries as content gaps
  keywordTrends.forEach((trend) => {
    trend.relatedQueries.slice(0, 2).forEach((query) => {
      opportunities.push({
        title: `Content gap: ${query}`,
        keyword: query,
        type: "gap",
        priority: "medium",
        suggestedAction: `Create content targeting related query "${query}"`,
        estimatedTraffic: Math.round(trend.interestScore * 50),
      });
    });
  });

  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

interface TrendsSummary {
  totalTrendingTopics: number;
  relevantTrendingTopics: number;
  risingKeywords: string[];
  decliningKeywords: string[];
  topOpportunities: string[];
  recommendedActions: string[];
}

function generateTrendsSummary(
  trendingTopics: TrendingTopic[],
  keywordTrends: TrendData[],
  contentOpportunities: ContentOpportunity[],
): TrendsSummary {
  return {
    totalTrendingTopics: trendingTopics.length,
    relevantTrendingTopics: trendingTopics.filter((t) => t.isRelevant).length,
    risingKeywords: keywordTrends
      .filter((t) => t.trend === "rising")
      .map((t) => t.keyword),
    decliningKeywords: keywordTrends
      .filter((t) => t.trend === "declining")
      .map((t) => t.keyword),
    topOpportunities: contentOpportunities.slice(0, 5).map((o) => o.title),
    recommendedActions: [
      ...contentOpportunities
        .filter((o) => o.priority === "high")
        .map((o) => o.suggestedAction),
    ].slice(0, 5),
  };
}

/**
 * Get supplementary social trends from Grok's X/Twitter search.
 * Captures social buzz about London travel that Google Trends may miss.
 * Returns empty array if XAI_API_KEY is not configured (graceful degradation).
 */
async function getGrokSocialTrends(): Promise<TrendingTopic[]> {
  try {
    const { isGrokSearchAvailable, searchSocialBuzz } = await import(
      "@/lib/ai/grok-live-search"
    );
    if (!isGrokSearchAvailable()) {
      return [];
    }

    const result = await searchSocialBuzz("London travel");

    // Parse the JSON response
    let jsonStr = result.content.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    // Map Grok social trends to TrendingTopic format
    return parsed.slice(0, 5).map((item: any) => ({
      title: `[X] ${item.trend || item.title || "Unknown trend"}`,
      traffic: item.engagement || "N/A",
      isRelevant: (item.relevance_to_tourism ?? 0.5) >= 0.3,
      relevanceScore: item.relevance_to_tourism ?? 0.5,
      category: "social",
    }));
  } catch (error) {
    console.warn(
      "[trends-monitor] Grok social trends failed (non-fatal):",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

async function saveTrendsData(data: any, deadlineMs?: number): Promise<void> {
  try {
    // Persist trends data as an SeoReport record for historical tracking
    await prisma.seoReport.create({
      data: {
        reportType: "trends-monitor",
        data: {
          summary: data.summary,
          trendingTopics: data.trendingTopics?.slice(0, 20),
          keywordTrends: data.keywordTrends,
          contentOpportunities: data.contentOpportunities?.slice(0, 15),
          collectedAt: data.timestamp.toISOString(),
          status: "completed",
        },
      },
    });
    console.log("[Trends Monitor] Data persisted to SeoReport table");

    // Feed high-relevance trending topics into the content pipeline as TopicProposals
    // This connects trends → content-builder → articles
    // Creates proposals for ALL active sites, not just the first one
    const { getActiveSiteIds, getDefaultSiteId, isYachtSite } = await import("@/config/sites");
    const activeSites = getActiveSiteIds();
    const targetSites = activeSites.length > 0 ? activeSites : [getDefaultSiteId()];

    const relevantTopics = (data.trendingTopics || []).filter(
      (t: any) => t.isRelevant && t.relevanceScore >= 0.5,
    );

    let trendsQueued = 0;
    for (const siteId of targetSites) {
      // Budget guard: stop if time is running out
      if (deadlineMs && Date.now() > deadlineMs - 3_000) {
        console.log(`[trends-monitor] Budget exhausted during topic creation — saved ${trendsQueued} topics`);
        break;
      }
      // Yacht sites use a different content model (fleet inventory) — skip blog topic generation
      if (isYachtSite(siteId)) {
        console.log(`[Trends Monitor] Skipping ${siteId} — yacht site does not use TopicProposals`);
        continue;
      }
      for (const topic of relevantTopics.slice(0, 5)) {
        const keyword = (topic.title || "").toLowerCase().trim();
        if (!keyword || keyword.length < 5) continue;

        // Skip if a similar topic already exists for this site
        const exists = await prisma.topicProposal.findFirst({
          where: { primary_keyword: keyword, site_id: siteId },
        });
        if (exists) continue;

        try {
          await prisma.topicProposal.create({
            data: {
              title: topic.title,
              primary_keyword: keyword,
              site_id: siteId,
              locale: "en",
              longtails: [],
              questions: [],
              intent: "info",
              suggested_page_type: "news",
              status: "ready",
              confidence_score: Math.min(topic.relevanceScore || 0.5, 1.0),
              evergreen: false,
              source_weights_json: { source: "trends-monitor" },
              authority_links_json: { traffic: topic.traffic, category: topic.category },
            },
          });
          trendsQueued++;
        } catch (topicErr) {
          console.warn(`[trends-monitor] Failed to create TopicProposal for "${keyword}" on ${siteId}:`, topicErr instanceof Error ? topicErr.message : topicErr);
        }
      }
    }

    if (trendsQueued > 0) {
      console.log(`[Trends Monitor] Queued ${trendsQueued} trending topics as TopicProposals across ${targetSites.length} sites`);
    }
  } catch (error) {
    console.error("[Trends Monitor] Failed to save trends data:", error);
    // Log summary even if DB save fails
    console.log("Trends summary:", JSON.stringify(data.summary, null, 2));
  }
}
