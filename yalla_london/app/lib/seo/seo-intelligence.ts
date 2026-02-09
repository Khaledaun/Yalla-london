/**
 * SEO Intelligence Module
 *
 * Pulls real GSC and GA4 data, analyzes performance issues,
 * and auto-fixes problems using AI-generated meta optimizations.
 *
 * Used by the autonomous SEO agent (3x daily cron).
 */

import { searchConsole } from "../integrations/google-search-console";
import { fetchGA4Metrics } from "./ga4-data-api";

// ============================================
// TYPES
// ============================================

export interface SearchPerformanceAnalysis {
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  lowCTRPages: PageIssue[];
  almostPage1: PageIssue[];
  zeroClickBrandQueries: KeywordIssue[];
  page1NoClicks: PageIssue[];
  contentGapKeywords: KeywordIssue[];
  issues: string[];
  opportunities: string[];
}

export interface TrafficAnalysis {
  sessions: number;
  organicShare: number;
  bounceRate: number;
  engagementRate: number;
  topPagesNotInGSC: string[];
  lowEngagementPages: { path: string; bounceRate: number }[];
  issues: string[];
}

export interface PageIssue {
  url: string;
  slug: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  issue: string;
  fix: string;
}

export interface KeywordIssue {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  opportunity: string;
  suggestedAction: string;
}

export interface MetaOptimization {
  postId: string;
  slug: string;
  oldTitle: string;
  newTitle: string;
  oldDescription: string;
  newDescription: string;
  reason: string;
  topKeywords: string[];
}

// ============================================
// GSC SEARCH PERFORMANCE ANALYSIS
// ============================================

export async function analyzeSearchPerformance(
  days: number = 28
): Promise<SearchPerformanceAnalysis | null> {
  const siteUrl =
    process.env.GSC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const [pageData, keywordData] = await Promise.all([
      searchConsole.getTopPages(startDate, endDate, 50),
      searchConsole.getTopKeywords(startDate, endDate, 100),
    ]);

    if (!pageData?.length && !keywordData?.length) {
      return null;
    }

    // Calculate totals
    const totals = {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    const pages = (pageData || []).map((p: any) => ({
      url: p.keys?.[0] || p.url || "",
      clicks: p.clicks || 0,
      impressions: p.impressions || 0,
      ctr: p.ctr ? p.ctr * 100 : 0,
      position: p.position || 0,
    }));

    for (const p of pages) {
      totals.clicks += p.clicks;
      totals.impressions += p.impressions;
    }
    totals.ctr =
      totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.position =
      pages.length > 0
        ? pages.reduce((s: number, p: any) => s + p.position, 0) / pages.length
        : 0;

    const keywords = (keywordData || []).map((k: any) => ({
      query: k.keys?.[0] || k.query || "",
      clicks: k.clicks || 0,
      impressions: k.impressions || 0,
      ctr: k.ctr ? k.ctr * 100 : 0,
      position: k.position || 0,
    }));

    const issues: string[] = [];
    const opportunities: string[] = [];

    // ANALYSIS 1: Low CTR pages (ranking well but not getting clicks)
    const lowCTRPages: PageIssue[] = pages
      .filter(
        (p: any) =>
          p.impressions >= 10 && p.ctr < 3 && p.position <= 15
      )
      .map((p: any) => {
        const slug = extractSlug(p.url);
        return {
          url: p.url,
          slug,
          clicks: p.clicks,
          impressions: p.impressions,
          ctr: Math.round(p.ctr * 100) / 100,
          position: Math.round(p.position * 10) / 10,
          issue: `CTR ${p.ctr.toFixed(1)}% at position ${p.position.toFixed(1)} — meta title/description not compelling`,
          fix: "auto_optimize_meta",
        };
      });

    if (lowCTRPages.length > 0) {
      issues.push(
        `${lowCTRPages.length} pages have low CTR despite good ranking positions`
      );
    }

    // ANALYSIS 2: Almost page 1 (positions 11-20)
    const almostPage1: PageIssue[] = pages
      .filter(
        (p: any) =>
          p.position > 10 && p.position <= 20 && p.impressions >= 5
      )
      .map((p: any) => ({
        url: p.url,
        slug: extractSlug(p.url),
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: Math.round(p.ctr * 100) / 100,
        position: Math.round(p.position * 10) / 10,
        issue: `Position ${p.position.toFixed(1)} — just off page 1`,
        fix: "strengthen_content",
      }));

    if (almostPage1.length > 0) {
      opportunities.push(
        `${almostPage1.length} pages are on page 2 and could be pushed to page 1`
      );
    }

    // ANALYSIS 3: Zero-click high-impression queries (brand + valuable keywords)
    const zeroClickBrandQueries: KeywordIssue[] = keywords
      .filter(
        (k: any) =>
          k.clicks === 0 && k.impressions >= 5 && k.position <= 10
      )
      .map((k: any) => ({
        query: k.query,
        clicks: k.clicks,
        impressions: k.impressions,
        ctr: 0,
        position: Math.round(k.position * 10) / 10,
        opportunity:
          k.position <= 5 ? "high_value_zero_click" : "page1_optimize",
        suggestedAction: "Optimize meta snippet for this query",
      }));

    if (zeroClickBrandQueries.length > 0) {
      issues.push(
        `${zeroClickBrandQueries.length} queries on page 1 getting 0 clicks — meta snippets need work`
      );
    }

    // ANALYSIS 4: Page 1 rankings with no clicks
    const page1NoClicks: PageIssue[] = pages
      .filter(
        (p: any) =>
          p.clicks === 0 && p.impressions >= 10 && p.position <= 10
      )
      .map((p: any) => ({
        url: p.url,
        slug: extractSlug(p.url),
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: 0,
        position: Math.round(p.position * 10) / 10,
        issue: `Page 1 (pos ${p.position.toFixed(1)}) with ${p.impressions} impressions but 0 clicks`,
        fix: "auto_optimize_meta",
      }));

    if (page1NoClicks.length > 0) {
      issues.push(
        `CRITICAL: ${page1NoClicks.length} pages ranking on page 1 but getting ZERO clicks`
      );
    }

    // ANALYSIS 5: Content gap keywords (high position = no relevant content)
    const contentGapKeywords: KeywordIssue[] = keywords
      .filter(
        (k: any) =>
          k.position > 20 && k.impressions >= 3
      )
      .map((k: any) => ({
        query: k.query,
        clicks: k.clicks,
        impressions: k.impressions,
        ctr: Math.round(k.ctr * 100) / 100,
        position: Math.round(k.position * 10) / 10,
        opportunity: "content_gap",
        suggestedAction: "Create or strengthen content targeting this keyword",
      }));

    if (contentGapKeywords.length > 0) {
      opportunities.push(
        `${contentGapKeywords.length} keywords with ranking potential need dedicated content`
      );
    }

    return {
      totals,
      lowCTRPages,
      almostPage1,
      zeroClickBrandQueries,
      page1NoClicks,
      contentGapKeywords,
      issues,
      opportunities,
    };
  } catch (error) {
    console.error("Search performance analysis failed:", error);
    return null;
  }
}

// ============================================
// GA4 TRAFFIC ANALYSIS
// ============================================

export async function analyzeTrafficPatterns(
  days: number = 28
): Promise<TrafficAnalysis | null> {
  try {
    const startDate = `${days}daysAgo`;
    const ga4Data = await fetchGA4Metrics(startDate, "today");

    if (!ga4Data) return null;

    const { metrics, topPages, topSources } = ga4Data;
    const issues: string[] = [];

    // Calculate organic search share from sources
    const totalSessions = metrics.sessions || 0;
    const googleSource = (topSources || []).find(
      (s: any) => s.source === "google"
    );
    const organicSessions = googleSource?.sessions || 0;
    const organicShare =
      totalSessions > 0 ? (organicSessions / totalSessions) * 100 : 0;

    if (organicShare < 20) {
      issues.push(
        `Organic search is only ${organicShare.toFixed(1)}% of traffic — indexing and ranking need improvement`
      );
    }

    if (metrics.bounceRate > 50) {
      issues.push(
        `Overall bounce rate is ${metrics.bounceRate.toFixed(1)}% — content engagement needs work`
      );
    }

    // Identify low-engagement pages (pages with very short session times)
    const lowEngagementPages: { path: string; bounceRate: number }[] = [];
    if (topPages) {
      for (const page of topPages) {
        // Flag pages with very low engagement time (< 10s) and enough sessions
        if (
          page.avgEngagementTime < 10 &&
          page.sessions >= 5
        ) {
          lowEngagementPages.push({
            path: page.path,
            bounceRate: Math.round(
              (1 - page.avgEngagementTime / 60) * 100
            ),
          });
        }
      }
    }

    if (lowEngagementPages.length > 0) {
      issues.push(
        `${lowEngagementPages.length} pages have very low engagement time (<10s)`
      );
    }

    return {
      sessions: totalSessions,
      organicShare: Math.round(organicShare * 10) / 10,
      bounceRate: metrics.bounceRate,
      engagementRate: metrics.engagementRate,
      topPagesNotInGSC: [],
      lowEngagementPages,
      issues,
    };
  } catch (error) {
    console.error("Traffic analysis failed:", error);
    return null;
  }
}

// ============================================
// AI-POWERED META OPTIMIZATION
// ============================================

export async function generateOptimizedMeta(
  post: {
    title_en: string;
    meta_title_en?: string | null;
    meta_description_en?: string | null;
    excerpt_en?: string | null;
    content_en?: string | null;
    slug: string;
  },
  topKeywords: string[],
  performance: { ctr: number; position: number; impressions: number }
): Promise<{ title: string; description: string } | null> {
  try {
    const { generateJSON } = await import("@/lib/ai/provider");

    const currentTitle = post.meta_title_en || post.title_en || "";
    const currentDesc = post.meta_description_en || post.excerpt_en || "";
    const contentPreview = (post.content_en || "").slice(0, 500);

    const prompt = `You are an SEO specialist for a luxury travel content site targeting Arab visitors to destinations worldwide.

Current page performance:
- Position: ${performance.position.toFixed(1)} (${performance.position <= 10 ? "page 1" : "page 2"})
- CTR: ${performance.ctr.toFixed(1)}% (${performance.ctr < 3 ? "LOW - needs improvement" : "acceptable"})
- Impressions: ${performance.impressions}

Current meta:
- Title: "${currentTitle}"
- Description: "${currentDesc}"

Top search queries reaching this page: ${topKeywords.slice(0, 5).join(", ")}

Content preview: ${contentPreview}

Generate an optimized meta title and description that will increase CTR. Rules:
- Title: 50-60 characters, include primary keyword near start, use power words (Best, Guide, Top, 2026)
- Description: 140-155 characters, include call-to-action, mention unique value proposition
- Target audience: Arab/Muslim travelers looking for halal-friendly, luxury experiences
- Maintain the same topic/intent as the original

Return JSON: { "title": "...", "description": "..." }`;

    const result = await generateJSON<{ title: string; description: string }>(
      prompt,
      { temperature: 0.4, maxTokens: 200 }
    );

    // Validate lengths
    if (
      result.title &&
      result.title.length >= 30 &&
      result.title.length <= 65 &&
      result.description &&
      result.description.length >= 80 &&
      result.description.length <= 165
    ) {
      return result;
    }

    return null;
  } catch (error) {
    console.error("AI meta generation failed:", error);
    return null;
  }
}

// ============================================
// AUTO-FIX: OPTIMIZE LOW-CTR META
// ============================================

export async function autoOptimizeLowCTRMeta(
  prisma: any,
  searchData: SearchPerformanceAnalysis,
  issues: string[],
  fixes: string[]
): Promise<MetaOptimization[]> {
  const optimizations: MetaOptimization[] = [];

  // Combine page1 no-click pages and low CTR pages — these need meta fixes
  const pagesToOptimize = [
    ...searchData.page1NoClicks,
    ...searchData.lowCTRPages,
  ]
    .filter((p) => p.fix === "auto_optimize_meta")
    .slice(0, 5); // Limit to 5 per run to control AI costs

  if (pagesToOptimize.length === 0) return optimizations;

  // Get keywords for each page
  const keywordMap = new Map<string, string[]>();
  for (const kw of searchData.zeroClickBrandQueries) {
    // We don't have URL-to-keyword mapping from GSC directly,
    // so we'll pass top keywords to the AI
  }

  // Get all top keywords for context
  const allTopKeywords = [
    ...searchData.zeroClickBrandQueries.map((k) => k.query),
    ...searchData.contentGapKeywords.map((k) => k.query),
  ].slice(0, 20);

  for (const page of pagesToOptimize) {
    if (!page.slug || page.slug === "") continue;

    // Find the blog post in the database
    const post = await prisma.blogPost.findFirst({
      where: {
        slug: page.slug,
        published: true,
        deletedAt: null,
      },
      select: {
        id: true,
        title_en: true,
        slug: true,
        meta_title_en: true,
        meta_description_en: true,
        excerpt_en: true,
        content_en: true,
        keywords_json: true,
      },
    });

    if (!post) continue;

    // Find keywords related to this page
    const pageKeywords = allTopKeywords.filter((kw) => {
      const slugWords = page.slug.replace(/-/g, " ").toLowerCase();
      return kw
        .toLowerCase()
        .split(" ")
        .some((w: string) => slugWords.includes(w));
    });

    // Generate optimized meta using AI
    const optimized = await generateOptimizedMeta(
      post,
      pageKeywords.length > 0 ? pageKeywords : allTopKeywords.slice(0, 5),
      {
        ctr: page.ctr,
        position: page.position,
        impressions: page.impressions,
      }
    );

    if (!optimized) continue;

    // Only update if the new meta is actually different
    const titleChanged =
      optimized.title !== (post.meta_title_en || post.title_en);
    const descChanged =
      optimized.description !==
      (post.meta_description_en || post.excerpt_en || "");

    if (!titleChanged && !descChanged) continue;

    // Apply the fix to the database
    try {
      const updateData: any = {};
      if (titleChanged) updateData.meta_title_en = optimized.title;
      if (descChanged) updateData.meta_description_en = optimized.description;

      await prisma.blogPost.update({
        where: { id: post.id },
        data: updateData,
      });

      const optimization: MetaOptimization = {
        postId: post.id,
        slug: post.slug,
        oldTitle: post.meta_title_en || post.title_en,
        newTitle: titleChanged ? optimized.title : post.meta_title_en || "",
        oldDescription: post.meta_description_en || post.excerpt_en || "",
        newDescription: descChanged
          ? optimized.description
          : post.meta_description_en || "",
        reason: page.issue,
        topKeywords: pageKeywords.slice(0, 5),
      };

      optimizations.push(optimization);
      fixes.push(
        `AI-optimized meta for "${post.slug}" — was CTR ${page.ctr}% at pos ${page.position}`
      );
    } catch (error) {
      console.warn(`Failed to update meta for ${post.slug}:`, error);
    }
  }

  if (optimizations.length > 0) {
    issues.push(
      `AUTO-FIX: Optimized meta titles/descriptions for ${optimizations.length} low-CTR pages`
    );
  }

  return optimizations;
}

// ============================================
// AUTO-FIX: SUBMIT UNINDEXED PAGES
// ============================================

export async function submitUnindexedPages(
  prisma: any,
  fixes: string[]
): Promise<{ submitted: number; urls: string[] }> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
  const indexNowKey = process.env.INDEXNOW_KEY;

  if (!indexNowKey) return { submitted: 0, urls: [] };

  try {
    // Get all published posts
    const posts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null },
      select: { slug: true },
    });

    const allUrls = posts.map((p: any) => `${siteUrl}/blog/${p.slug}`);

    // Submit all URLs (IndexNow is idempotent — already-indexed URLs are ignored)
    if (allUrls.length > 0) {
      const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: new URL(siteUrl).hostname,
          key: indexNowKey,
          urlList: allUrls.slice(0, 100), // IndexNow limit
        }),
      });

      if (response.ok || response.status === 202) {
        fixes.push(
          `Submitted ${Math.min(allUrls.length, 100)} URLs to IndexNow for indexing`
        );
        return { submitted: Math.min(allUrls.length, 100), urls: allUrls };
      }
    }

    return { submitted: 0, urls: [] };
  } catch (error) {
    console.error("IndexNow submission failed:", error);
    return { submitted: 0, urls: [] };
  }
}

// ============================================
// AUTO-FIX: FLAG CONTENT FOR STRENGTHENING
// ============================================

export async function flagContentForStrengthening(
  prisma: any,
  searchData: SearchPerformanceAnalysis,
  fixes: string[]
): Promise<{ flagged: number; posts: string[] }> {
  const flaggedPosts: string[] = [];

  for (const page of searchData.almostPage1) {
    if (!page.slug) continue;

    try {
      // Check if this post exists and doesn't already have a high SEO score
      const post = await prisma.blogPost.findFirst({
        where: {
          slug: page.slug,
          published: true,
          deletedAt: null,
        },
        select: { id: true, slug: true, seo_score: true, content_en: true },
      });

      if (!post) continue;

      // Flag posts with short content that are almost on page 1
      const contentLength = (post.content_en || "").length;
      if (contentLength < 2000) {
        // Store a topic proposal to expand this content
        try {
          await prisma.topicProposal.create({
            data: {
              title: `EXPAND: "${post.slug}" — currently pos ${page.position}, needs content strengthening`,
              description: `This page ranks at position ${page.position} with ${page.impressions} impressions. Content is ${contentLength} chars. Expanding to 2000+ chars with more depth could push it to page 1.`,
              status: "approved",
              priority: "high",
              source: "seo-agent-intelligence",
            },
          });
          flaggedPosts.push(post.slug);
        } catch {
          // Topic proposal might fail if duplicate — that's fine
        }
      }
    } catch (error) {
      console.warn(`Failed to flag ${page.slug}:`, error);
    }
  }

  if (flaggedPosts.length > 0) {
    fixes.push(
      `Flagged ${flaggedPosts.length} almost-page-1 posts for content expansion`
    );
  }

  return { flagged: flaggedPosts.length, posts: flaggedPosts };
}

// ============================================
// HELPERS
// ============================================

function extractSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    if (pathname.includes("/blog/")) {
      return pathname.split("/blog/")[1]?.replace(/\/$/, "") || "";
    }
    return pathname.replace(/^\//, "").replace(/\/$/, "");
  } catch {
    return url;
  }
}
