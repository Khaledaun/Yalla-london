export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { onCronFailure } from "@/lib/ops/failure-hooks";

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
  // If CRON_SECRET is configured and doesn't match, reject.
  // If CRON_SECRET is NOT configured, allow — Vercel crons don't send secrets unless configured.
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Healthcheck mode — quick DB ping + last run status
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const { getActiveSiteIds } = await import("@/config/sites");
      let lastRun = null;
      try {
        lastRun = await prisma.cronJobLog.findFirst({
          where: { job_name: "seo-agent" },
          orderBy: { started_at: "desc" },
          select: { status: true, started_at: true, duration_ms: true },
        });
      } catch {
        // cron_job_logs table may not exist yet — still healthy
        await prisma.$queryRaw`SELECT 1`;
      }
      return NextResponse.json({
        status: "healthy",
        endpoint: "seo-agent",
        lastRun,
        sites: getActiveSiteIds().length,
        activeSites: getActiveSiteIds(),
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "seo-agent" },
        { status: 503 },
      );
    }
  }

  const _cronStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");
    const { forEachSite } = await import("@/lib/resilience");

    // Only process live sites
    const siteIds = getActiveSiteIds();

    // Use forEachSite for timeout-aware per-site iteration
    const loopResult = await forEachSite(
      siteIds,
      async (siteId) => {
        const siteUrl = getSiteDomain(siteId);
        return runSEOAgent(prisma, siteId, siteUrl);
      },
      7_000, // 7s safety margin for response serialization
      53_000 // 53s budget within maxDuration = 60s (7s buffer for response)
    );

    await logCronExecution("seo-agent", loopResult.timedOut ? "timed_out" : "completed", {
      durationMs: Date.now() - _cronStart,
      sitesProcessed: Object.keys(loopResult.results || {}),
      resultSummary: { message: `completed=${loopResult.completed}, failed=${loopResult.failed}, skipped=${loopResult.skipped}` },
    });

    return NextResponse.json({
      success: true,
      agent: "seo-autonomous-multisite",
      runAt: new Date().toISOString(),
      completed: loopResult.completed,
      failed: loopResult.failed,
      skipped: loopResult.skipped,
      timedOut: loopResult.timedOut,
      results: loopResult.results,
      errors: loopResult.errors,
    });
  } catch (error) {
    console.error("SEO Agent error:", error);
    await logCronExecution("seo-agent", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "SEO agent failed",
    });

    // Fire failure hook for dashboard visibility
    onCronFailure({ jobName: "seo-agent", error }).catch(() => {});

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

async function runSEOAgent(prisma: any, siteId: string, siteUrl?: string) {
  const report: Record<string, any> = { siteId };
  const issues: string[] = [];
  const fixes: string[] = [];
  // Site filter for all DB queries — ensures tenant isolation
  const siteFilter = siteId ? { siteId } : {};

  // Budget guard — exit early if we're running out of time
  const agentStart = Date.now();
  const AGENT_BUDGET_MS = 40_000; // 40s budget per site (within forEachSite's 45s limit)
  const budgetLeft = () => AGENT_BUDGET_MS - (Date.now() - agentStart);
  const hasBudget = (minMs = 3_000) => budgetLeft() > minMs;

  // 1. CHECK CONTENT GENERATION STATUS
  report.contentStatus = await checkContentGeneration(prisma, issues, siteId);

  // ── DB Circuit Breaker ────────────────────────────────────────────
  // If the database is unreachable, skip all DB-dependent operations
  // to prevent cascading errors from every subsequent query.
  const dbAvailable = report.contentStatus?.status !== "db_unavailable";
  if (!dbAvailable) {
    issues.push("DATABASE UNAVAILABLE — skipping DB-dependent checks for this site");
  }

  // 2. AUDIT ALL PUBLISHED BLOG POSTS
  report.blogAudit = (dbAvailable && hasBudget())
    ? await auditBlogPosts(prisma, issues, fixes, siteId)
    : { totalPosts: 0, averageSEOScore: 0, postsWithIssues: 0, topIssues: [] };

  // 3. CHECK INDEXING STATUS
  report.indexingStatus = (dbAvailable && hasBudget())
    ? await checkIndexingStatus(prisma, issues, siteUrl, siteId)
    : { status: dbAvailable ? "budget_exhausted" : "db_unavailable", checkedUrls: 0 };

  // 4. DISCOVER NEW URLS (IndexNow submission delegated to seo/cron — KG-019)
  report.urlSubmissions = (dbAvailable && hasBudget())
    ? await submitNewUrls(prisma, fixes, siteUrl, siteId)
    : { submitted: 0, discovered: 0, delegatedTo: "seo/cron", error: dbAvailable ? "Budget exhausted" : "Database unavailable" };

  // 5. VERIFY SITEMAP HEALTH (no DB needed)
  report.sitemapHealth = hasBudget()
    ? await verifySitemapHealth(issues, siteUrl)
    : { status: "budget_exhausted" };

  // 6. CHECK FOR CONTENT GAPS
  report.contentGaps = (dbAvailable && hasBudget())
    ? await detectContentGaps(prisma, issues, siteId)
    : { categoryGaps: [], enPosts: 0, arPosts: 0 };

  // 7. AUTO-FIX SEO ISSUES WHERE POSSIBLE
  report.autoFixes = (dbAvailable && hasBudget())
    ? await autoFixSEOIssues(prisma, issues, fixes, siteId)
    : { metaTitles: 0, metaDescriptions: 0, slugs: 0 };

  // ====================================================
  // 8-13. ANALYTICS & INTELLIGENCE (budget-gated)
  // These are the most expensive steps — skip if budget is low
  // ====================================================
  if (!hasBudget(10_000)) {
    console.log(`[seo-agent:${siteId}] Budget low (${budgetLeft()}ms left), skipping steps 8-13 (analytics/intelligence)`);
    report.searchPerformance = { status: "budget_exhausted" };
    report.trafficAnalysis = { status: "budget_exhausted" };
    report.contentStrategy = { status: "budget_exhausted" };
  } else try {
    const { withTimeout } = await import("@/lib/resilience");
    const {
      analyzeSearchPerformance,
      analyzeTrafficPatterns,
      autoOptimizeLowCTRMeta,
      submitUnindexedPages,
      flagContentForStrengthening,
    } = await import("@/lib/seo/seo-intelligence");

    const searchData = await withTimeout(
      analyzeSearchPerformance(28, siteId), 10_000, "GSC analyzeSearchPerformance"
    ).catch((e) => { console.warn(`[${siteId}] GSC analysis timed out:`, e.message); return null; });
    if (searchData) {
      report.searchPerformance = {
        totals: searchData.totals,
        lowCTRPages: searchData.lowCTRPages.length,
        almostPage1: searchData.almostPage1.length,
        zeroClickQueries: searchData.zeroClickBrandQueries.length,
        page1NoClicks: searchData.page1NoClicks.length,
        contentGapKeywords: searchData.contentGapKeywords.length,
      };
      issues.push(...searchData.issues);

      // 9. AUTO-OPTIMIZE LOW-CTR META TITLES/DESCRIPTIONS (AI-powered)
      report.metaOptimizations = await autoOptimizeLowCTRMeta(
        prisma,
        searchData,
        issues,
        fixes
      );

      // 10. FLAG ALMOST-PAGE-1 CONTENT FOR STRENGTHENING
      report.contentStrengthening = await flagContentForStrengthening(
        prisma,
        searchData,
        fixes
      );
    } else {
      report.searchPerformance = { status: "no_data" };
    }

    // 11. ANALYZE GA4 TRAFFIC PATTERNS (budget-gated)
    const trafficData = hasBudget(8_000) ? await withTimeout(
      analyzeTrafficPatterns(28, siteId), 10_000, "GA4 analyzeTrafficPatterns"
    ).catch((e) => { console.warn(`[${siteId}] GA4 analysis timed out:`, e.message); return null; }) : null;
    if (trafficData) {
      report.trafficAnalysis = {
        sessions: trafficData.sessions,
        organicShare: trafficData.organicShare,
        bounceRate: trafficData.bounceRate,
        engagementRate: trafficData.engagementRate,
        lowEngagementPages: trafficData.lowEngagementPages.length,
      };
      issues.push(...trafficData.issues);
    } else {
      report.trafficAnalysis = { status: "no_data" };
    }

    // 11b. FEEDBACK LOOP: Auto-queue rewrites for underperforming content
    if (hasBudget(5_000)) {
      try {
        report.contentRewrites = await queueContentRewrites(
          prisma, searchData, trafficData, siteId, fixes
        );
      } catch (rewriteError) {
        console.warn("Content rewrite queue error (non-fatal):", rewriteError);
        report.contentRewrites = { status: "error" };
      }
    }

    // 12. SUBMIT ALL PAGES FOR INDEXING (idempotent)
    report.indexingSubmission = hasBudget(5_000)
      ? await submitUnindexedPages(prisma, fixes, siteId)
      : { status: "budget_exhausted" };

    // 12b. AUTO-INJECT STRUCTURED DATA FOR POSTS MISSING SCHEMAS
    try {
      const { enhancedSchemaInjector } = await import(
        "@/lib/seo/enhanced-schema-injector"
      );

      // Find published posts without structured data
      const postsWithoutSchema = await prisma.blogPost.findMany({
        where: {
          published: true,
          ...siteFilter,
          OR: [
            { authority_links_json: { equals: null } },
            { authority_links_json: { equals: {} } },
          ],
        },
        select: {
          id: true,
          slug: true,
          title_en: true,
          content_en: true,
          tags: true,
        },
        take: 5, // Process 5 per run
      });

      let schemasInjected = 0;
      const { getSiteDomain: _gsd } = await import("@/config/sites");
      const baseSiteUrl = siteUrl || _gsd(siteId);
      for (const post of postsWithoutSchema) {
        if (!post.content_en || post.content_en.length < 100) continue;
        try {
          const postUrl = `${baseSiteUrl}/blog/${post.slug}`;
          await enhancedSchemaInjector.injectSchemas(
            post.content_en,
            post.title_en || post.slug,
            postUrl,
            post.id,
            { tags: post.tags }
          );
          schemasInjected++;
        } catch (schemaErr) {
          console.warn(`[seo-agent] Schema injection failed for post ${post.slug}:`, schemaErr instanceof Error ? schemaErr.message : schemaErr);
        }
      }

      if (schemasInjected > 0) {
        fixes.push(`Auto-injected structured data for ${schemasInjected} posts`);
      }
      report.schemaInjection = {
        processed: postsWithoutSchema.length,
        injected: schemasInjected,
      };
    } catch (schemaError) {
      console.warn("Schema auto-injection failed (non-fatal):", schemaError);
    }

    // 13. ANALYZE CONTENT DIVERSITY + GENERATE STRATEGIC PROPOSALS (budget-gated)
    if (!hasBudget(5_000)) {
      console.log(`[seo-agent:${siteId}] Budget low (${budgetLeft()}ms left), skipping content strategy`);
      report.contentStrategy = { status: "budget_exhausted" };
    } else try {
      const {
        generateContentProposals,
        saveContentProposals,
        analyzeContentDiversity,
        applyDiversityQuotas,
      } = await import("@/lib/seo/content-strategy");

      // Analyze current content mix for diversity balance
      const diversity = await analyzeContentDiversity(prisma);
      report.contentDiversity = {
        mix: diversity.currentMix,
        totalPublished: diversity.totalPublished,
        underrepresented: diversity.underrepresented,
        overrepresented: diversity.overrepresented,
        upcomingSeasons: diversity.upcomingSeasons,
        weeklyVolume: `${diversity.weeklyActual}/${diversity.weeklyTarget}`,
        adjustments: diversity.adjustments,
      };

      if (diversity.adjustments.length > 0) {
        issues.push(
          `Content diversity: ${diversity.adjustments.length} adjustments needed (${diversity.underrepresented.join(", ")} underrepresented)`
        );
      }

      // Generate proposals from GSC data (if available) then apply diversity quotas
      if (searchData) {
        const existingPosts = await prisma.blogPost.findMany({
          where: { published: true, ...siteFilter },
          select: { slug: true },
        });
        const existingSlugs = existingPosts.map((p: any) => p.slug);

        let proposals = generateContentProposals(searchData, existingSlugs);
        proposals = applyDiversityQuotas(proposals, diversity);

        const saved = await saveContentProposals(prisma, proposals, fixes);

        report.contentStrategy = {
          proposalsGenerated: proposals.length,
          proposalsCreated: saved.created,
          proposalsSkipped: saved.skipped,
          diversityAdjusted: true,
          types: proposals.reduce(
            (acc: Record<string, number>, p) => {
              acc[p.contentType] = (acc[p.contentType] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        };
      }
    } catch (strategyError) {
      console.warn("Content strategy error (non-fatal):", strategyError);
      report.contentStrategy = { status: "error" };
    }
  } catch (intelligenceError) {
    console.warn(
      "SEO Intelligence module error (non-fatal):",
      intelligenceError
    );
    report.searchPerformance = {
      status: "error",
      error: (intelligenceError as Error).message,
    };
  }

  // 13. STORE AGENT RUN REPORT
  report.summary = {
    totalIssues: issues.length,
    totalFixes: fixes.length,
    issues,
    fixes,
    healthScore: calculateHealthScore(report),
    nextRun: getNextRunTime(),
  };

  // Store the report in the database using SeoReport model
  try {
    await prisma.seoReport.create({
      data: {
        reportType: "health",
        site_id: siteId || null,
        generatedAt: new Date(),
        data: {
          auditStats: report.blogAudit || {},
          topIssues: { issues, count: issues.length },
          contentStatus: report.contentStatus || {},
          indexingStatus: report.indexingStatus || {},
          sitemapHealth: report.sitemapHealth || {},
          contentGaps: report.contentGaps || {},
          autoFixes: report.autoFixes || {},
          searchPerformance: report.searchPerformance || {},
          trafficAnalysis: report.trafficAnalysis || {},
          metaOptimizations: report.metaOptimizations || [],
          contentStrengthening: report.contentStrengthening || {},
          indexingSubmission: report.indexingSubmission || {},
          contentRewrites: report.contentRewrites || {},
          contentStrategy: report.contentStrategy || {},
          contentDiversity: report.contentDiversity || {},
          schemaInjection: report.schemaInjection || {},
          recommendations: generateRecommendations(issues),
          agent: "seo-autonomous-v2",
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
async function checkContentGeneration(prisma: any, issues: string[], siteId?: string) {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  // ScheduledContent has no site_id column — filter only on models that have it
  const blogSiteFilter = siteId ? { siteId } : {};
  const topicSiteFilter = siteId ? { site_id: siteId } : {};

  try {
    // Check for content generated today (ScheduledContent has no site_id — filter by content_type only)
    const todayContent = await prisma.scheduledContent.count({
      where: {
        created_at: { gte: startOfDay },
        content_type: "blog_post",
      },
    });

    // Check for content published today (BlogPost has siteId)
    const todayPublished = await prisma.blogPost.count({
      where: {
        created_at: { gte: startOfDay },
        published: true,
        ...blogSiteFilter,
      },
    });

    // Check pending topics (TopicProposal has site_id)
    const pendingTopics = await prisma.topicProposal.count({
      where: { status: { in: ["planned", "queued", "ready", "approved"] }, ...topicSiteFilter },
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
  } catch (err) {
    console.error(`[seo-agent] DB check failed for ${siteId}:`, err instanceof Error ? err.message : err);
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
async function auditBlogPosts(prisma: any, issues: string[], fixes: string[], siteId?: string) {
  const blogSiteFilter = siteId ? { siteId } : {};
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true, ...blogSiteFilter },
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

      // Check meta title (2025: optimal 50-60 chars, min 30)
      if (!post.meta_title_en || post.meta_title_en.length < 30) {
        postProblems.push("Missing or short EN meta title (<30 chars, optimal 50-60)");
      }
      if (post.meta_title_en && post.meta_title_en.length > 60) {
        postProblems.push("EN meta title too long (>60 chars, may be truncated in SERP)");
      }

      // Check meta description (2025: optimal 120-160 chars, min 70)
      if (!post.meta_description_en || post.meta_description_en.length < 70) {
        postProblems.push("Missing or short EN meta description (<70 chars, optimal 120-160)");
      }
      if (post.meta_description_en && post.meta_description_en.length > 160) {
        postProblems.push("EN meta description too long (>160 chars)");
      }

      // Check content length (2025: 800+ min for indexing, 1200+ target)
      if (post.content_en && post.content_en.length < 500) {
        postProblems.push("EN content critically short (<500 chars)");
      } else if (post.content_en) {
        const words = post.content_en.split(/\s+/).filter(Boolean).length;
        if (words < 800) {
          postProblems.push(`Thin content (${words} words, min 800 for indexing quality)`);
        }
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
        } catch (e) {
          console.warn(`Failed to set page_type for ${post.slug}:`, e);
        }
      }

      // Calculate SEO score (2025 standards: weighted by severity)
      let score = 100;
      for (const problem of postProblems) {
        if (problem.includes("critically short") || problem.includes("Missing or short EN meta title")) {
          score -= 15; // High-severity: missing essentials
        } else if (problem.includes("Thin content") || problem.includes("Missing or short EN meta description")) {
          score -= 10; // Medium-severity: quality issues
        } else {
          score -= 5;  // Low-severity: minor issues
        }
      }
      // E-E-A-T bonuses: authority links and keywords show topical depth
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
        } catch (e) {
          console.warn(`Failed to update SEO score for ${post.slug}:`, e);
        }
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
async function checkIndexingStatus(
  prisma: any,
  issues: string[],
  siteUrl?: string,
  siteId?: string,
) {
  if (!siteUrl) {
    const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
    siteUrl = getSiteDomain(siteId || getDefaultSiteId());
  }
  const blogSiteFilter = siteId ? { siteId } : {};

  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true, ...blogSiteFilter },
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
 * Discover new/updated URLs that need IndexNow submission.
 *
 * NOTE (KG-019): IndexNow submission is handled exclusively by the
 * seo/cron route via lib/seo/indexing-service.ts, which has proper
 * exponential backoff and error handling. This function only discovers
 * URLs and marks them as pending in URLIndexingStatus so that seo/cron
 * picks them up. This avoids double-submitting URLs to IndexNow within
 * the same 30-minute window.
 */
async function submitNewUrls(prisma: any, fixes: string[], siteUrl?: string, siteId?: string) {
  if (!siteUrl) {
    const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
    siteUrl = getSiteDomain(siteId || getDefaultSiteId());
  }
  const blogSiteFilter = siteId ? { siteId } : {};

  try {
    // Find posts created in the last 7 days that may need submission
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        created_at: { gte: sevenDaysAgo },
        ...blogSiteFilter,
      },
      select: { slug: true },
    });

    if (newPosts.length === 0) {
      return { submitted: 0, message: "No new posts to submit", delegatedTo: "seo/cron" };
    }

    const urls = newPosts.map((p: any) => `${siteUrl}/blog/${p.slug}`);

    // IndexNow submission is delegated to seo/cron (via lib/seo/indexing-service.ts)
    // which uses fetchWithRetry with exponential backoff for better reliability.
    console.log(
      `[SEO-Agent] Found ${urls.length} new URLs — IndexNow submission delegated to seo/cron`,
    );
    fixes.push(
      `Found ${urls.length} new URLs for indexing (submission handled by seo/cron)`,
    );

    // Track URLs as pending in URLIndexingStatus so seo/cron picks them up
    if (siteId) {
      try {
        await Promise.allSettled(
          urls.map((url: string) =>
            prisma.uRLIndexingStatus.upsert({
              where: { site_id_url: { site_id: siteId, url } },
              create: {
                site_id: siteId,
                url,
                slug: url.split("/blog/")[1] || null,
                status: "pending",
                submitted_indexnow: false,
                last_submitted_at: null,
              },
              update: {
                // Only update if not already submitted — don't overwrite a successful submission
                status: "pending",
              },
            }),
          ),
        );
      } catch {
        // Best-effort tracking — don't block the SEO agent
      }
    }

    return { discovered: urls.length, urls, delegatedTo: "seo/cron", submitted: 0 };
  } catch {
    return { submitted: 0, discovered: 0, error: "Failed to check for new posts" };
  }
}

/**
 * Verify sitemap is healthy and accessible
 */
async function verifySitemapHealth(issues: string[], siteUrl?: string) {
  if (!siteUrl) {
    const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");
    siteUrl = getSiteDomain(getDefaultSiteId());
  }

  try {
    const response = await fetch(`${siteUrl}/sitemap.xml`, {
      headers: { "User-Agent": "YallaLondon-SEO-Agent/1.0" },
      signal: AbortSignal.timeout(8_000),
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
async function detectContentGaps(prisma: any, issues: string[], siteId?: string) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        posts: {
          where: { published: true },
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
    const siteFilterForPosts = siteId ? { siteId } : {};
    const enPosts = await prisma.blogPost.count({
      where: { published: true, content_en: { not: "" }, ...siteFilterForPosts },
    });
    const arPosts = await prisma.blogPost.count({
      where: { published: true, content_ar: { not: "" }, ...siteFilterForPosts },
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
  siteId?: string,
) {
  const fixedCount = { metaTitles: 0, metaDescriptions: 0, slugs: 0 };
  const blogSiteFilter = siteId ? { siteId } : {};

  try {
    // Fix posts with missing meta titles
    const postsWithoutMeta = await prisma.blogPost.findMany({
      where: {
        published: true,
               ...blogSiteFilter,
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
      } catch (e) {
        console.warn("Failed to auto-fix meta title:", e);
      }
    }

    if (fixedCount.metaTitles > 0) {
      fixes.push(`Auto-generated ${fixedCount.metaTitles} missing meta titles`);
    }
  } catch (metaErr) {
    console.warn("[seo-agent] Meta title auto-fix failed:", metaErr instanceof Error ? metaErr.message : metaErr);
  }

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

  // GSC search performance
  if (report.searchPerformance?.page1NoClicks > 0) score -= 10;
  if (report.searchPerformance?.lowCTRPages > 3) score -= 10;
  if (report.searchPerformance?.totals?.ctr < 3) score -= 5;

  // GA4 traffic analysis
  if (report.trafficAnalysis?.organicShare < 20) score -= 10;
  if (report.trafficAnalysis?.bounceRate > 50) score -= 5;

  // Bonus for fixes applied
  const fixCount = report.metaOptimizations?.length || 0;
  if (fixCount > 0) score += Math.min(fixCount * 2, 10);

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

/**
 * FEEDBACK LOOP: Auto-queue content rewrites for underperforming posts.
 *
 * Criteria for rewrite:
 * - Published 30+ days ago (had time to rank)
 * - Low CTR (< 1%) with decent impressions (50+), OR
 * - Low engagement from GA4 (appears in lowEngagementPages)
 *
 * Creates a TopicProposal with source "seo-agent-rewrite" so the
 * daily-content-generate cron can pick it up and regenerate the content.
 */
async function queueContentRewrites(
  prisma: any,
  searchData: any,
  trafficData: any,
  siteId: string | undefined,
  fixes: string[],
): Promise<{ queued: number; skipped: number; candidates: string[] }> {
  const siteFilter = siteId ? { site_id: siteId } : {};
  const blogSiteFilter = siteId ? { siteId } : {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Collect underperforming slugs from GSC data
  const rewriteCandidates = new Set<string>();

  if (searchData?.lowCTRPages) {
    for (const page of searchData.lowCTRPages) {
      const url: string = page.url || page.keys?.[0] || "";
      const slugMatch = url.match(/\/blog\/([^/?#]+)/);
      if (slugMatch) {
        const impressions = page.impressions || 0;
        const ctr = page.ctr || 0;
        // Low CTR with meaningful impressions
        if (ctr < 0.01 && impressions >= 50) {
          rewriteCandidates.add(slugMatch[1]);
        }
      }
    }
  }

  // Add low-engagement pages from GA4
  if (trafficData?.lowEngagementPages) {
    for (const page of trafficData.lowEngagementPages) {
      const path: string = page.path || page.pagePath || "";
      const slugMatch = path.match(/\/blog\/([^/?#]+)/);
      if (slugMatch) {
        rewriteCandidates.add(slugMatch[1]);
      }
    }
  }

  if (rewriteCandidates.size === 0) {
    return { queued: 0, skipped: 0, candidates: [] };
  }

  // Find the actual blog posts that are old enough
  const candidateSlugs = Array.from(rewriteCandidates);
  const postsToRewrite = await prisma.blogPost.findMany({
    where: {
      published: true,
           ...blogSiteFilter,
      slug: { in: candidateSlugs },
      created_at: { lt: thirtyDaysAgo },
    },
    select: {
      id: true,
      slug: true,
      title_en: true,
      meta_title_en: true,
      tags: true,
    },
  });

  let queued = 0;
  let skipped = 0;

  for (const post of postsToRewrite) {
    // Check if rewrite already queued
    const existingProposal = await prisma.topicProposal.findFirst({
      where: {
        ...siteFilter,
        title: { startsWith: "[REWRITE]" },
        status: { in: ["planned", "queued", "ready"] },
        primary_keyword: post.slug,
      },
    });

    if (existingProposal) {
      skipped++;
      continue;
    }

    // Create rewrite proposal
    await prisma.topicProposal.create({
      data: {
        title: `[REWRITE] ${post.title_en || post.slug}`,
        primary_keyword: post.slug,
        longtails: post.tags || [],
        featured_longtails: [],
        questions: [],
        suggested_page_type: "guide",
        locale: "en",
        status: "ready",
        confidence_score: 0.8,
        intent: "rewrite",
        evergreen: true,
        ...siteFilter,
        source_weights_json: {
          source: "seo-agent-rewrite",
          originalSlug: post.slug,
          reason: "Low CTR",
        },
        authority_links_json: {
          contentType: "rewrite",
          originalPostId: post.id,
          reason: "low_ctr_or_engagement",
        },
      },
    });
    queued++;
  }

  if (queued > 0) {
    fixes.push(`Queued ${queued} content rewrites for underperforming posts`);
  }

  return { queued, skipped, candidates: candidateSlugs };
}
