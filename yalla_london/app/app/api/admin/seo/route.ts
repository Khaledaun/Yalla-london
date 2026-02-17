export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    switch (type) {
      case "overview":
        return await getSEOOverview();
      case "trends":
        return await getSEOTrends();
      case "audits":
        return await getSEOAudits();
      case "quick-fixes":
        return await getQuickFixes();
      default:
        return await getSEOOverview();
    }
  } catch (error) {
    console.error("Error fetching SEO data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case "run_audit":
        return await handleRunAudit(data);
      case "apply_quick_fix":
        return await handleApplyQuickFix(data);
      case "generate_internal_links":
        return await handleGenerateInternalLinks(data);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing SEO request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

async function getSEOOverview() {
  const avgScoreResult = await prisma.blogPost.aggregate({
    _avg: { seo_score: true },
    where: { seo_score: { not: null } },
  });

  const averageScore = Math.round(avgScoreResult._avg.seo_score || 0);

  const autoPublishCount = await prisma.blogPost.count({
    where: { seo_score: { gte: 85 }, published: true },
  });

  const totalPublished = await prisma.blogPost.count({
    where: { published: true },
  });

  const autoPublishRate =
    totalPublished > 0
      ? Math.round((autoPublishCount / totalPublished) * 100)
      : 0;

  const reviewQueue = await prisma.blogPost.count({
    where: { seo_score: { gte: 70, lt: 85 }, published: false },
  });

  const criticalIssues = await prisma.blogPost.count({
    where: { seo_score: { lt: 50 } },
  });

  const analyticsSnapshot = await prisma.analyticsSnapshot.findFirst({
    orderBy: { created_at: "desc" },
  });
  const indexedPages = analyticsSnapshot?.indexed_pages || 0;

  return NextResponse.json({
    averageScore,
    autoPublishRate,
    reviewQueue,
    criticalIssues,
    indexedPages,
    canShowInternalLinks: indexedPages >= 40,
  });
}

async function getSEOTrends() {
  const trends = await prisma.blogPost.findMany({
    select: { seo_score: true, created_at: true, page_type: true },
    where: { seo_score: { not: null } },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  const trendsByMonth = trends.reduce((acc: any, post) => {
    const month = post.created_at.toISOString().substring(0, 7);
    if (!acc[month]) {
      acc[month] = { total: 0, count: 0, byType: {} };
    }
    acc[month].total += post.seo_score || 0;
    acc[month].count += 1;

    if (!acc[month].byType[post.page_type || "unknown"]) {
      acc[month].byType[post.page_type || "unknown"] = { total: 0, count: 0 };
    }
    acc[month].byType[post.page_type || "unknown"].total += post.seo_score || 0;
    acc[month].byType[post.page_type || "unknown"].count += 1;

    return acc;
  }, {});

  const trendData = Object.entries(trendsByMonth).map(
    ([month, data]: [string, any]) => ({
      month,
      averageScore: Math.round(data.total / data.count),
      byType: Object.entries(data.byType).map(
        ([type, typeData]: [string, any]) => ({
          type,
          averageScore: Math.round(typeData.total / typeData.count),
        }),
      ),
    }),
  );

  return NextResponse.json({ trends: trendData });
}

async function getSEOAudits() {
  const audits = await prisma.seoAuditResult.findMany({
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return NextResponse.json({ audits });
}

async function getQuickFixes() {
  const articlesNeedingFixes = await prisma.blogPost.findMany({
    where: {
      OR: [
        { meta_title_en: null },
        { meta_description_en: null },
        { featured_image: null },
      ],
      published: true,
    },
    select: {
      id: true,
      title_en: true,
      slug: true,
      meta_title_en: true,
      meta_description_en: true,
      featured_image: true,
    },
  });

  const quickFixes = articlesNeedingFixes.map((article) => ({
    id: article.id,
    title: article.title_en,
    slug: article.slug,
    fixes: [
      ...(article.meta_title_en ? [] : ["missing_meta_title"]),
      ...(article.meta_description_en ? [] : ["missing_meta_description"]),
      ...(article.featured_image ? [] : ["missing_featured_image"]),
    ],
  }));

  return NextResponse.json({ quickFixes });
}

async function handleRunAudit(data: any) {
  const { contentId, contentType = "blog_post" } = data;

  // Get real article data for proper audit
  const article = await prisma.blogPost.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      title_en: true,
      title_ar: true,
      meta_title_en: true,
      meta_description_en: true,
      content_en: true,
      featured_image: true,
      slug: true,
      tags: true,
      seo_score: true,
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Perform real SEO audit based on article content
  const auditResult = performSEOAudit(article);

  // Save audit result
  const savedAudit = await prisma.seoAuditResult.create({
    data: {
      content_id: contentId,
      content_type: contentType,
      score: auditResult.score,
      breakdown_json: auditResult.breakdown,
      suggestions: auditResult.suggestions,
      quick_fixes: auditResult.quickFixes,
      internal_link_offers: auditResult.internalLinkOffers,
    },
  });

  // Update the blog post's SEO score
  await prisma.blogPost.update({
    where: { id: contentId },
    data: { seo_score: auditResult.score },
  });

  return NextResponse.json({ success: true, audit: savedAudit });
}

/**
 * Real SEO audit based on actual article content
 */
function performSEOAudit(article: any) {
  let titleScore = 0;
  let metaDescScore = 0;
  let headingsScore = 0;
  let contentScore = 0;
  let imageScore = 0;
  let internalLinksScore = 0;

  const suggestions: string[] = [];
  const quickFixes: string[] = [];

  // Title check (0-100)
  const title = article.meta_title_en || article.title_en || "";
  if (!title) {
    titleScore = 0;
    quickFixes.push("missing_meta_title");
    suggestions.push("Add a meta title for better search visibility");
  } else if (title.length < 30) {
    titleScore = 60;
    suggestions.push("Meta title is too short - aim for 50-60 characters");
  } else if (title.length > 60) {
    titleScore = 75;
    suggestions.push(
      "Meta title may be truncated in search results - keep under 60 characters",
    );
  } else {
    titleScore = 95;
  }

  // Meta description check (0-100)
  const metaDesc = article.meta_description_en || "";
  if (!metaDesc) {
    metaDescScore = 0;
    quickFixes.push("missing_meta_description");
    suggestions.push("Add a meta description to improve click-through rate");
  } else if (metaDesc.length < 120) {
    metaDescScore = 65;
    suggestions.push(
      "Meta description is too short - aim for 150-160 characters",
    );
  } else if (metaDesc.length > 160) {
    metaDescScore = 75;
    suggestions.push(
      "Meta description may be truncated - keep under 160 characters",
    );
  } else {
    metaDescScore = 95;
  }

  // Content quality check (0-100)
  const content = article.content_en || "";
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) {
    contentScore = 40;
    suggestions.push(
      "Content is very thin - aim for at least 1000 words for better rankings",
    );
  } else if (wordCount < 800) {
    contentScore = 65;
    suggestions.push(
      "Content could be more comprehensive - aim for 1000+ words",
    );
  } else if (wordCount < 1500) {
    contentScore = 80;
  } else {
    contentScore = 95;
  }

  // Headings check
  const hasH2 = /<h2/i.test(content);
  const hasH3 = /<h3/i.test(content);
  if (!hasH2 && !hasH3) {
    headingsScore = 40;
    suggestions.push("Add heading tags (H2, H3) to structure your content");
  } else if (!hasH3) {
    headingsScore = 75;
    suggestions.push("Add H3 subheadings for better content hierarchy");
  } else {
    headingsScore = 90;
  }

  // Image check
  if (!article.featured_image) {
    imageScore = 30;
    quickFixes.push("missing_featured_image");
    suggestions.push("Add a featured image to improve visual appeal and SEO");
  } else {
    imageScore = 85;
    // Check for alt text in content images
    const imgTags = content.match(/<img[^>]*>/gi) || [];
    const missingAlt = imgTags.filter(
      (tag: string) => !tag.includes("alt="),
    ).length;
    if (missingAlt > 0) {
      imageScore = 70;
      suggestions.push(
        `${missingAlt} image(s) missing alt text - add descriptive alt attributes`,
      );
    }
  }

  // Internal links check
  const internalLinks = (
    content.match(/href=["'][^"']*(?:yalla|\/blog|\/guide)/gi) || []
  ).length;
  if (internalLinks === 0) {
    internalLinksScore = 40;
    suggestions.push("Add internal links to related content for better SEO");
  } else if (internalLinks < 3) {
    internalLinksScore = 70;
    suggestions.push("Add more internal links - aim for 3-5 per article");
  } else {
    internalLinksScore = 90;
  }

  const breakdown = {
    title: titleScore,
    meta_description: metaDescScore,
    headings: headingsScore,
    content_quality: contentScore,
    images: imageScore,
    internal_links: internalLinksScore,
  };

  // Weighted overall score
  const score = Math.round(
    titleScore * 0.2 +
      metaDescScore * 0.15 +
      headingsScore * 0.15 +
      contentScore * 0.25 +
      imageScore * 0.1 +
      internalLinksScore * 0.15,
  );

  // Generate internal link suggestions from related articles
  const internalLinkOffers: any[] = [];

  return { score, breakdown, suggestions, quickFixes, internalLinkOffers };
}

async function handleApplyQuickFix(data: any) {
  const { articleId, fixType } = data;

  const article = await prisma.blogPost.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  let updateData: any = {};

  switch (fixType) {
    case "missing_meta_title":
      updateData.meta_title_en = article.title_en;
      updateData.meta_title_ar = article.title_ar;
      break;
    case "missing_meta_description":
      updateData.meta_description_en = article.excerpt_en || article.title_en;
      updateData.meta_description_ar = article.excerpt_ar || article.title_ar;
      break;
    case "missing_featured_image":
      updateData.featured_image =
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";
      break;
  }

  const updatedArticle = await prisma.blogPost.update({
    where: { id: articleId },
    data: updateData,
  });

  return NextResponse.json({ success: true, article: updatedArticle });
}

async function handleGenerateInternalLinks(data: any) {
  const { articleId } = data;

  const analyticsSnapshot = await prisma.analyticsSnapshot.findFirst({
    orderBy: { created_at: "desc" },
  });
  const indexedPages = analyticsSnapshot?.indexed_pages || 0;

  if (indexedPages < 40) {
    return NextResponse.json(
      {
        error: "Internal link offers require at least 40 indexed pages",
      },
      { status: 400 },
    );
  }

  const suggestions = await generateInternalLinkSuggestions(articleId);

  return NextResponse.json({ success: true, suggestions });
}

async function generateInternalLinkSuggestions(articleId: string) {
  const article = await prisma.blogPost.findUnique({
    where: { id: articleId },
    select: { tags: true, title_en: true },
  });

  // Find articles with overlapping tags for relevance-based linking
  const relatedArticles = await prisma.blogPost.findMany({
    where: {
      id: { not: articleId },
      published: true,
    },
    select: {
      id: true,
      title_en: true,
      slug: true,
      tags: true,
    },
    take: 10,
  });

  // Calculate relevance based on tag overlap
  const articleTags = (article?.tags || []) as string[];

  return relatedArticles
    .map((related) => {
      const relatedTags = (related.tags || []) as string[];
      const overlap = articleTags.filter((tag) =>
        relatedTags.includes(tag),
      ).length;
      const relevance =
        articleTags.length > 0
          ? Math.min(overlap / articleTags.length + 0.5, 1.0)
          : 0.5;

      return {
        targetPage: related.title_en,
        targetUrl: `/blog/${related.slug}`,
        anchorText: (related.title_en || "").toLowerCase(),
        relevanceScore: Math.round(relevance * 100) / 100,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
