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

// Target keywords to monitor
const MONITORED_KEYWORDS = [
  "london restaurants",
  "london hotels",
  "london events",
  "halal food london",
  "luxury london",
  "london tourism",
  "things to do london",
  "arab restaurants london",
  "shisha london",
  "afternoon tea london",
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
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV === "production"
  ) {
    // Allow without auth in development or if CRON_SECRET not set
    if (process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Healthcheck mode — quick DB ping + last run status
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const lastRun = await prisma.seoReport.findFirst({
        where: { reportType: "trends-monitor" },
        orderBy: { createdAt: "desc" },
        select: { status: true, createdAt: true },
      });
      return NextResponse.json({
        status: "healthy",
        endpoint: "trends-monitor",
        lastRun: lastRun || null,
        monitoredKeywords: MONITORED_KEYWORDS.length,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "trends-monitor" },
        { status: 503 },
      );
    }
  }

  const _cronStart = Date.now();

  try {
    const results = await runTrendsMonitoring();

    await logCronExecution("trends-monitor", "completed", {
      durationMs: Date.now() - _cronStart,
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
    console.error("Trends monitoring failed:", error);
    await logCronExecution("trends-monitor", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Monitoring failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  // Manual trigger endpoint
  try {
    const body = await request.json();
    const { keywords, geo } = body;

    const results = await runTrendsMonitoring(keywords, geo);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Manual trends monitoring failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Monitoring failed" },
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

  // 6. Save to database for historical tracking
  await saveTrendsData({
    timestamp: new Date(),
    trendingTopics,
    keywordTrends,
    contentOpportunities,
    summary,
  });

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

  for (const keyword of keywords) {
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

        trends.push({
          keyword,
          interestScore: recentAvg,
          trend,
          relatedQueries: data.relatedQueries.slice(0, 5).map((q) => q.query),
          timestamp: new Date(),
        });
      }
    } catch (error) {
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

async function saveTrendsData(data: any): Promise<void> {
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
        },
        status: "completed",
      },
    });
    console.log("[Trends Monitor] Data persisted to SeoReport table");
  } catch (error) {
    console.error("[Trends Monitor] Failed to save trends data:", error);
    // Log summary even if DB save fails
    console.log("Trends summary:", JSON.stringify(data.summary, null, 2));
  }
}
