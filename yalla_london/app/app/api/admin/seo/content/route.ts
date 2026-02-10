/**
 * Content Pipeline + SEO Status API
 *
 * Fetches published blog posts from the database and cross-references
 * with GSC search performance and indexing status to show which content
 * is performing, which needs optimization, and what's in the pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gscApi } from "@/lib/seo/indexing-service";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  const report: Record<string, any> = {
    published: [],
    scheduled: [],
    pipeline: [],
    contentSEO: [],
    summary: {},
  };

  // 1. Fetch published blog posts
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        excerpt_en: true,
        published: true,
        seo_score: true,
        page_type: true,
        tags: true,
        meta_title_en: true,
        meta_description_en: true,
        featured_image: true,
        created_at: true,
        updated_at: true,
        category: { select: { name_en: true, slug: true } },
      },
    });

    // Build URL for each post
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

    report.published = posts.map((post) => ({
      id: post.id,
      title: post.title_en || post.title_ar || "Untitled",
      slug: post.slug,
      url: `${siteUrl}/blog/${post.slug}`,
      seoScore: post.seo_score || 0,
      pageType: post.page_type || "article",
      category: post.category?.name_en || "Uncategorized",
      tags: post.tags || [],
      hasMetaTitle: !!post.meta_title_en,
      hasMetaDescription: !!post.meta_description_en,
      hasFeaturedImage: !!post.featured_image,
      publishedAt: post.created_at,
      updatedAt: post.updated_at,
    }));
  } catch (error) {
    console.error("[CONTENT-SEO] Failed to fetch blog posts:", error);
    report.published = [];
  }

  // 2. Fetch scheduled/pending content
  try {
    const scheduled = await prisma.scheduledContent.findMany({
      where: {
        status: { in: ["pending", "scheduled"] },
      },
      orderBy: { scheduled_time: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        content_type: true,
        language: true,
        status: true,
        scheduled_time: true,
        seo_score: true,
        category: true,
        tags: true,
        platform: true,
      },
    });

    report.scheduled = scheduled.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.content_type,
      language: item.language,
      status: item.status,
      scheduledFor: item.scheduled_time,
      seoScore: item.seo_score || 0,
      category: item.category,
      platform: item.platform || "blog",
    }));
  } catch {
    report.scheduled = [];
  }

  // 3. Fetch topic proposals in pipeline
  try {
    const topics = await prisma.topicProposal.findMany({
      where: {
        status: { in: ["planned", "queued", "generated", "drafted", "ready"] },
      },
      orderBy: { created_at: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        primary_keyword: true,
        status: true,
        intent: true,
        suggested_page_type: true,
        confidence_score: true,
        evergreen: true,
        locale: true,
        suggested_window_start: true,
        created_at: true,
      },
    });

    report.pipeline = topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      keyword: topic.primary_keyword,
      status: topic.status,
      intent: topic.intent,
      pageType: topic.suggested_page_type,
      confidence: topic.confidence_score,
      evergreen: topic.evergreen,
      locale: topic.locale,
      targetDate: topic.suggested_window_start,
      createdAt: topic.created_at,
    }));
  } catch {
    report.pipeline = [];
  }

  // 4. Cross-reference published content with GSC data
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  let gscPages: any = null;
  try {
    gscPages = await gscApi.getSearchAnalytics(startDate, endDate, ["page"]);
  } catch {
    // GSC not available
  }

  // 5. Check indexing status for recent posts (sample up to 10)
  const recentPosts = report.published.slice(0, 10);
  const contentSEO = [];

  for (const post of recentPosts) {
    const entry: Record<string, any> = {
      ...post,
      indexingStatus: "unknown",
      searchClicks: 0,
      searchImpressions: 0,
      searchCTR: 0,
      searchPosition: 0,
      issues: [],
      recommendations: [],
    };

    // Match GSC page data
    if (gscPages?.rows) {
      const pageRow = gscPages.rows.find(
        (r: any) =>
          r.keys?.[0]?.includes(`/blog/${post.slug}`) ||
          r.keys?.[0]?.includes(post.slug),
      );
      if (pageRow) {
        entry.searchClicks = pageRow.clicks || 0;
        entry.searchImpressions = pageRow.impressions || 0;
        entry.searchCTR = Math.round((pageRow.ctr || 0) * 10000) / 100;
        entry.searchPosition = Math.round((pageRow.position || 0) * 10) / 10;
      }
    }

    // Check indexing (limit API calls)
    try {
      const indexStatus = await gscApi.checkIndexingStatus(post.url);
      if (indexStatus) {
        entry.indexingStatus = indexStatus.coverageState || "unknown";
        entry.lastCrawled = indexStatus.lastCrawlTime;
      }
    } catch {
      // Skip indexing check
    }

    // Generate per-article recommendations
    if (
      entry.indexingStatus !== "Submitted and indexed" &&
      entry.indexingStatus !== "unknown"
    ) {
      entry.issues.push("Not indexed by Google");
      entry.recommendations.push("Submit URL for indexing via the cron job");
    }

    if (!post.hasMetaTitle) {
      entry.issues.push("Missing meta title");
      entry.recommendations.push(
        "Add a unique meta title (50-60 characters) with primary keyword",
      );
    }

    if (!post.hasMetaDescription) {
      entry.issues.push("Missing meta description");
      entry.recommendations.push(
        "Add a meta description (150-160 characters) with a call to action",
      );
    }

    if (post.seoScore < 60) {
      entry.issues.push(`Low SEO score (${post.seoScore}/100)`);
      entry.recommendations.push(
        "Improve heading structure, add internal links, optimize keyword density",
      );
    }

    if (entry.searchImpressions > 50 && entry.searchCTR < 2) {
      entry.issues.push(
        `Low CTR (${entry.searchCTR}%) despite ${entry.searchImpressions} impressions`,
      );
      entry.recommendations.push(
        "Rewrite title tag and meta description to be more compelling",
      );
    }

    if (entry.searchPosition > 10 && entry.searchImpressions > 20) {
      entry.recommendations.push(
        `Currently ranking at position ${entry.searchPosition} - add internal links and refresh content to push to page 1`,
      );
    }

    contentSEO.push(entry);
  }

  report.contentSEO = contentSEO;

  // 6. Summary stats
  const totalPublished = report.published.length;
  const indexed = contentSEO.filter(
    (c: any) => c.indexingStatus === "Submitted and indexed",
  ).length;
  const withIssues = contentSEO.filter((c: any) => c.issues.length > 0).length;
  const avgSEOScore =
    totalPublished > 0
      ? Math.round(
          report.published.reduce(
            (s: number, p: any) => s + (p.seoScore || 0),
            0,
          ) / totalPublished,
        )
      : 0;

  report.summary = {
    totalPublished,
    totalScheduled: report.scheduled.length,
    totalInPipeline: report.pipeline.length,
    indexedOfSampled: `${indexed}/${contentSEO.length}`,
    articlesWithIssues: withIssues,
    avgSEOScore,
  };

  report.durationMs = Date.now() - startTime;

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}
