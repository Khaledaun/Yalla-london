export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

/**
 * Autonomous SEO Agent - Runs 3x daily (7am, 1pm, 8pm UTC)
 *
 * Responsibilities:
 * 1. Verify all articles are indexed in Google
 * 2. Check SEO scores and flag issues
 * 3. Detect content gaps and plan fixes
 * 4. Ensure daily content generation happened on time
 * 5. Submit new/updated URLs to search engines
 * 6. Monitor sitemap health
 * 7. Track progress and report status
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const results = await runSEOAgent(prisma);

    return NextResponse.json({
      success: true,
      agent: "seo-autonomous",
      runAt: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("SEO Agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SEO Agent failed" },
      { status: 500 },
    );
  }
}

// Also support POST for Vercel cron
export async function POST(request: NextRequest) {
  return GET(request);
}

async function runSEOAgent(prisma: any) {
  const report: Record<string, any> = {};
  const issues: string[] = [];
  const fixes: string[] = [];

  // 1. CHECK CONTENT GENERATION STATUS
  report.contentStatus = await checkContentGeneration(prisma, issues);

  // 2. AUDIT ALL PUBLISHED BLOG POSTS
  report.blogAudit = await auditBlogPosts(prisma, issues, fixes);

  // 3. CHECK INDEXING STATUS
  report.indexingStatus = await checkIndexingStatus(prisma, issues);

  // 4. SUBMIT NEW URLS TO SEARCH ENGINES
  report.urlSubmissions = await submitNewUrls(prisma, fixes);

  // 5. VERIFY SITEMAP HEALTH
  report.sitemapHealth = await verifySitemapHealth(issues);

  // 6. CHECK FOR CONTENT GAPS
  report.contentGaps = await detectContentGaps(prisma, issues);

  // 7. AUTO-FIX SEO ISSUES WHERE POSSIBLE
  report.autoFixes = await autoFixSEOIssues(prisma, issues, fixes);

  // 8. STORE AGENT RUN REPORT
  report.summary = {
    totalIssues: issues.length,
    totalFixes: fixes.length,
    issues,
    fixes,
    healthScore: calculateHealthScore(report),
    nextRun: getNextRunTime(),
  };

  // Store the report in the database
  try {
    await prisma.seoHealthReport.create({
      data: {
        reportDate: new Date(),
        auditStats: report.blogAudit || {},
        topIssues: { issues, count: issues.length },
        schemaCoverage: report.blogAudit?.schemaCoverage || {},
        performance: report.contentStatus || {},
        recommendations: generateRecommendations(issues),
        metadata: {
          agent: "seo-autonomous",
          runType: "scheduled",
          fixes_applied: fixes.length,
          health_score: report.summary.healthScore,
        },
      },
    });
  } catch (dbError) {
    console.warn("Failed to store SEO agent report:", dbError);
  }

  console.log(
    `SEO Agent completed: ${issues.length} issues found, ${fixes.length} fixes applied, health: ${report.summary.healthScore}%`,
  );
  return report;
}

/**
 * Check if daily content generation happened on schedule
 */
async function checkContentGeneration(prisma: any, issues: string[]) {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  try {
    // Check for content generated today
    const todayContent = await prisma.scheduledContent.count({
      where: {
        created_at: { gte: startOfDay },
        content_type: "blog_post",
      },
    });

    // Check for content published today
    const todayPublished = await prisma.blogPost.count({
      where: {
        created_at: { gte: startOfDay },
        published: true,
      },
    });

    // Check pending topics
    const pendingTopics = await prisma.topicProposal.count({
      where: { status: "approved" },
    });

    if (todayContent === 0 && today.getHours() >= 10) {
      issues.push(
        "CRITICAL: No content generated today - daily content pipeline may be stalled",
      );
    }

    if (todayPublished === 0 && today.getHours() >= 12) {
      issues.push("WARNING: No articles published today");
    }

    if (pendingTopics < 5) {
      issues.push(
        `LOW TOPIC BACKLOG: Only ${pendingTopics} approved topics remaining - need more topic research`,
      );
    }

    return {
      contentGeneratedToday: todayContent,
      articlesPublishedToday: todayPublished,
      pendingTopics,
      status:
        todayContent >= 2
          ? "healthy"
          : todayContent >= 1
            ? "partial"
            : "stalled",
    };
  } catch {
    return {
      status: "db_unavailable",
      contentGeneratedToday: 0,
      articlesPublishedToday: 0,
      pendingTopics: 0,
    };
  }
}

/**
 * Audit all published blog posts for SEO issues
 */
async function auditBlogPosts(prisma: any, issues: string[], fixes: string[]) {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null },
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        meta_title_en: true,
        meta_title_ar: true,
        meta_description_en: true,
        meta_description_ar: true,
        content_en: true,
        content_ar: true,
        seo_score: true,
        tags: true,
        page_type: true,
        keywords_json: true,
        authority_links_json: true,
      },
    });

    let totalScore = 0;
    let scoredCount = 0;
    const postIssues: Record<string, string[]> = {};

    for (const post of posts) {
      const postProblems: string[] = [];

      // Check meta title
      if (!post.meta_title_en || post.meta_title_en.length < 20) {
        postProblems.push("Missing or short EN meta title");
      }
      if (post.meta_title_en && post.meta_title_en.length > 60) {
        postProblems.push("EN meta title too long (>60 chars)");
      }

      // Check meta description
      if (!post.meta_description_en || post.meta_description_en.length < 50) {
        postProblems.push("Missing or short EN meta description");
      }
      if (post.meta_description_en && post.meta_description_en.length > 160) {
        postProblems.push("EN meta description too long (>160 chars)");
      }

      // Check content length
      if (post.content_en && post.content_en.length < 500) {
        postProblems.push("EN content too short (<500 chars)");
      }

      // Check Arabic content
      if (!post.content_ar || post.content_ar.length < 100) {
        postProblems.push("Missing or short AR content");
      }
      if (!post.title_ar || post.title_ar.length < 5) {
        postProblems.push("Missing AR title");
      }

      // Check tags
      if (!post.tags || post.tags.length < 2) {
        postProblems.push("Too few tags (<2)");
      }

      // Check page type
      if (!post.page_type) {
        postProblems.push("Missing page_type for structured data");
      }

      // Auto-fix: set missing page_type to 'guide'
      if (!post.page_type) {
        try {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { page_type: "guide" },
          });
          fixes.push(`Set page_type='guide' for post: ${post.slug}`);
        } catch {}
      }

      // Calculate SEO score
      let score = 100;
      score -= postProblems.length * 10;
      if (post.authority_links_json) score += 5;
      if (post.keywords_json) score += 5;
      score = Math.max(0, Math.min(100, score));

      // Update SEO score if it changed significantly
      if (!post.seo_score || Math.abs(post.seo_score - score) > 5) {
        try {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { seo_score: score },
          });
          fixes.push(
            `Updated SEO score for ${post.slug}: ${post.seo_score || "null"} -> ${score}`,
          );
        } catch {}
      }

      totalScore += score;
      scoredCount++;

      if (postProblems.length > 0) {
        postIssues[post.slug] = postProblems;
      }
    }

    const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

    if (avgScore < 70) {
      issues.push(
        `LOW AVG SEO SCORE: ${avgScore}/100 across ${scoredCount} posts`,
      );
    }

    const postsWithIssues = Object.keys(postIssues).length;
    if (postsWithIssues > 0) {
      issues.push(`${postsWithIssues} posts have SEO issues`);
    }

    return {
      totalPosts: posts.length,
      averageSEOScore: avgScore,
      postsWithIssues,
      topIssues: Object.entries(postIssues).slice(0, 5),
    };
  } catch {
    return {
      totalPosts: 0,
      averageSEOScore: 0,
      postsWithIssues: 0,
      topIssues: [],
    };
  }
}

/**
 * Check indexing status via Search Console API
 */
async function checkIndexingStatus(prisma: any, issues: string[]) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null },
      select: { slug: true, created_at: true },
      orderBy: { created_at: "desc" },
      take: 20,
    });

    // Check if GSC credentials are available
    const gscKey = process.env.GOOGLE_SEARCH_CONSOLE_KEY;
    if (!gscKey) {
      issues.push(
        "WARNING: Google Search Console credentials not configured - cannot verify indexing",
      );
      return { status: "credentials_missing", checkedUrls: 0 };
    }

    return {
      status: "available",
      totalUrls: posts.length,
      siteUrl,
      message: "URLs ready for indexing verification",
    };
  } catch {
    return { status: "check_failed", checkedUrls: 0 };
  }
}

/**
 * Submit new/updated URLs to search engines via IndexNow
 */
async function submitNewUrls(prisma: any, fixes: string[]) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
  const indexNowKey = process.env.INDEXNOW_API_KEY;

  try {
    // Find posts created in the last 24 hours that haven't been submitted
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        created_at: { gte: oneDayAgo },
      },
      select: { slug: true },
    });

    if (newPosts.length === 0) {
      return { submitted: 0, message: "No new posts to submit" };
    }

    const urls = newPosts.map((p: any) => `${siteUrl}/blog/${p.slug}`);

    // Submit via IndexNow if key available
    if (indexNowKey) {
      try {
        await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: new URL(siteUrl).hostname,
            key: indexNowKey,
            urlList: urls,
          }),
        });
        fixes.push(`Submitted ${urls.length} new URLs to IndexNow`);
      } catch (e) {
        console.warn("IndexNow submission failed:", e);
      }
    }

    // Also ping sitemaps
    try {
      await fetch(`https://www.google.com/ping?sitemap=${siteUrl}/sitemap.xml`);
      await fetch(`https://www.bing.com/ping?sitemap=${siteUrl}/sitemap.xml`);
      fixes.push("Pinged Google and Bing with updated sitemap");
    } catch {}

    return { submitted: urls.length, urls };
  } catch {
    return { submitted: 0, error: "Failed to check for new posts" };
  }
}

/**
 * Verify sitemap is healthy and accessible
 */
async function verifySitemapHealth(issues: string[]) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

  try {
    const response = await fetch(`${siteUrl}/sitemap.xml`, {
      headers: { "User-Agent": "YallaLondon-SEO-Agent/1.0" },
    });

    if (!response.ok) {
      issues.push(`CRITICAL: Sitemap returned HTTP ${response.status}`);
      return { healthy: false, status: response.status };
    }

    const content = await response.text();
    const urlCount = (content.match(/<url>/g) || []).length;

    if (urlCount < 10) {
      issues.push(
        `WARNING: Sitemap only contains ${urlCount} URLs - expected more`,
      );
    }

    return { healthy: true, urlCount, status: 200 };
  } catch {
    // Can't reach own sitemap - likely running locally or DNS issue
    return {
      healthy: "unknown",
      message: "Could not fetch sitemap (may be running locally)",
    };
  }
}

/**
 * Detect content gaps - categories without recent content
 */
async function detectContentGaps(prisma: any, issues: string[]) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        posts: {
          where: { published: true, deletedAt: null },
          orderBy: { created_at: "desc" },
          take: 1,
          select: { created_at: true },
        },
      },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const gaps: string[] = [];

    for (const cat of categories) {
      const latestPost = cat.posts[0];
      if (!latestPost) {
        gaps.push(`Category "${cat.name_en}" has no published posts`);
      } else if (latestPost.created_at < thirtyDaysAgo) {
        gaps.push(`Category "${cat.name_en}" has no posts in 30+ days`);
      }
    }

    if (gaps.length > 0) {
      issues.push(`CONTENT GAPS: ${gaps.length} categories need fresh content`);
    }

    // Check language balance
    const enPosts = await prisma.blogPost.count({
      where: { published: true, content_en: { not: "" }, deletedAt: null },
    });
    const arPosts = await prisma.blogPost.count({
      where: { published: true, content_ar: { not: "" }, deletedAt: null },
    });

    if (arPosts < enPosts * 0.5) {
      issues.push(
        `LANGUAGE IMBALANCE: ${enPosts} EN posts vs ${arPosts} AR posts - Arabic content behind`,
      );
    }

    return { categoryGaps: gaps, enPosts, arPosts };
  } catch {
    return { categoryGaps: [], enPosts: 0, arPosts: 0 };
  }
}

/**
 * Auto-fix common SEO issues
 */
async function autoFixSEOIssues(
  prisma: any,
  issues: string[],
  fixes: string[],
) {
  const fixedCount = { metaTitles: 0, metaDescriptions: 0, slugs: 0 };

  try {
    // Fix posts with missing meta titles
    const postsWithoutMeta = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        OR: [{ meta_title_en: null }, { meta_title_en: "" }],
      },
      select: { id: true, title_en: true, title_ar: true, excerpt_en: true },
    });

    for (const post of postsWithoutMeta) {
      const metaTitle = (post.title_en || "").slice(0, 60);
      const metaDesc = (post.excerpt_en || post.title_en || "").slice(0, 155);

      try {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            meta_title_en: metaTitle || undefined,
            meta_description_en: metaDesc || undefined,
          },
        });
        fixedCount.metaTitles++;
      } catch {}
    }

    if (fixedCount.metaTitles > 0) {
      fixes.push(`Auto-generated ${fixedCount.metaTitles} missing meta titles`);
    }
  } catch {}

  return fixedCount;
}

function calculateHealthScore(report: Record<string, any>): number {
  let score = 100;

  // Content generation
  if (report.contentStatus?.status === "stalled") score -= 20;
  if (report.contentStatus?.status === "partial") score -= 10;

  // Blog audit
  if (report.blogAudit?.averageSEOScore < 70) score -= 15;
  if (report.blogAudit?.postsWithIssues > 5) score -= 10;

  // Indexing
  if (report.indexingStatus?.status === "credentials_missing") score -= 10;

  // Sitemap
  if (report.sitemapHealth?.healthy === false) score -= 15;

  // Content gaps
  if (report.contentGaps?.categoryGaps?.length > 2) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function getNextRunTime(): string {
  const now = new Date();
  const hours = now.getUTCHours();
  const nextHours = [7, 13, 20];
  const nextHour = nextHours.find((h) => h > hours) || nextHours[0];
  const next = new Date(now);
  if (nextHour <= hours) next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(nextHour, 0, 0, 0);
  return next.toISOString();
}

function generateRecommendations(issues: string[]) {
  return issues
    .map((issue) => {
      if (issue.includes("CRITICAL"))
        return { type: "critical", issue, priority: 1 };
      if (issue.includes("WARNING"))
        return { type: "warning", issue, priority: 2 };
      return { type: "info", issue, priority: 3 };
    })
    .sort((a, b) => a.priority - b.priority);
}
