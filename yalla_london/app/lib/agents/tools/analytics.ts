/**
 * Analytics Tool Handlers — wraps GA4 Data API + GSC for CEO Agent.
 *
 * Tools: get_metrics, get_articles, search_knowledge
 */

import { prisma } from "@/lib/db";
import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// get_metrics — traffic, revenue, pipeline stats
// ---------------------------------------------------------------------------

export async function getMetrics(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;
  const period = (params.period as string) || "7d";

  const daysBack =
    period === "today" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  // Gather metrics in parallel
  const [
    publishedCount,
    draftCount,
    indexedCount,
    recentPosts,
    gscData,
    aiCost,
  ] = await Promise.all([
    prisma.blogPost.count({
      where: { siteId, published: true },
    }),
    prisma.articleDraft.count({
      where: { site_id: siteId, current_phase: { not: "rejected" } },
    }),
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, status: "indexed" },
    }),
    prisma.blogPost.count({
      where: { siteId, published: true, created_at: { gte: since } },
    }),
    prisma.gscPagePerformance
      .aggregate({
        where: { site_id: siteId, date: { gte: since } },
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, position: true },
      })
      .catch(() => null),
    prisma.apiUsageLog
      .aggregate({
        where: { siteId, createdAt: { gte: since } },
        _sum: { estimatedCostUsd: true },
        _count: true,
      })
      .catch(() => null),
  ]);

  const metrics = {
    period,
    content: {
      totalPublished: publishedCount,
      activeDrafts: draftCount,
      publishedInPeriod: recentPosts,
      indexedPages: indexedCount,
    },
    traffic: {
      clicks: gscData?._sum?.clicks || 0,
      impressions: gscData?._sum?.impressions || 0,
      avgCtr: gscData?._avg?.ctr
        ? Math.round(gscData._avg.ctr * 10000) / 100
        : 0,
      avgPosition: gscData?._avg?.position
        ? Math.round(gscData._avg.position * 10) / 10
        : 0,
    },
    ai: {
      totalCalls: aiCost?._count || 0,
      estimatedCostUsd:
        Math.round((aiCost?._sum?.estimatedCostUsd || 0) * 100) / 100,
    },
  };

  return {
    success: true,
    data: metrics,
    summary: `${period} metrics: ${metrics.content.totalPublished} published, ${metrics.traffic.clicks} clicks, ${metrics.traffic.impressions} impressions, avg position ${metrics.traffic.avgPosition}.`,
  };
}

// ---------------------------------------------------------------------------
// get_articles — recent/popular published articles
// ---------------------------------------------------------------------------

export async function getArticles(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;
  const sort = (params.sort as string) || "recent";
  const limit = Math.min(Number(params.limit) || 10, 50);

  let orderBy: Record<string, string>;
  if (sort === "popular") {
    orderBy = { seo_score: "desc" };
  } else if (sort === "clicks") {
    orderBy = { created_at: "desc" }; // GSC data is separate
  } else {
    orderBy = { created_at: "desc" };
  }

  const articles = await prisma.blogPost.findMany({
    where: { siteId, published: true },
    select: {
      id: true,
      slug: true,
      title_en: true,
      title_ar: true,
      seo_score: true,
      category_id: true,
      created_at: true,
    },
    orderBy,
    take: limit,
  });

  const formattedArticles = articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title_en || a.title_ar || a.slug,
    seoScore: a.seo_score,
    publishedAt: a.created_at.toISOString(),
  }));

  return {
    success: true,
    data: formattedArticles,
    summary: `Found ${formattedArticles.length} articles (sorted by ${sort}).`,
  };
}

// ---------------------------------------------------------------------------
// search_knowledge — search published content for customer Q&A
// ---------------------------------------------------------------------------

export async function searchKnowledge(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const query = params.query as string;
  const siteId = (params.siteId as string) || ctx.siteId;
  const limit = Math.min(Number(params.limit) || 5, 20);

  // Search by keyword match in title and content
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) {
    return { success: false, error: "Query too short — need at least one word with 3+ characters." };
  }

  // Build OR conditions for keyword matching
  const conditions = keywords.map((kw) => ({
    OR: [
      { title_en: { contains: kw, mode: "insensitive" as const } },
      { content_en: { contains: kw, mode: "insensitive" as const } },
    ],
  }));

  const results = await prisma.blogPost.findMany({
    where: {
      siteId,
      published: true,
      AND: conditions,
    },
    select: {
      id: true,
      slug: true,
      title_en: true,
      meta_description_en: true,
      content_en: true,
      seo_score: true,
    },
    take: limit,
    orderBy: { seo_score: "desc" },
  });

  // Extract relevant snippets
  const snippets = results.map((r) => {
    const content = r.content_en || "";
    // Find first keyword occurrence and extract surrounding text
    const lowerContent = content.toLowerCase();
    let snippet = r.meta_description_en || "";
    for (const kw of keywords) {
      const idx = lowerContent.indexOf(kw);
      if (idx >= 0) {
        const start = Math.max(0, idx - 100);
        const end = Math.min(content.length, idx + 200);
        snippet = content.slice(start, end).replace(/<[^>]+>/g, "").trim();
        break;
      }
    }
    return {
      title: r.title_en,
      slug: r.slug,
      snippet: snippet.slice(0, 300),
      seoScore: r.seo_score,
    };
  });

  return {
    success: true,
    data: snippets,
    summary: `Found ${snippets.length} articles matching "${query}".`,
  };
}
