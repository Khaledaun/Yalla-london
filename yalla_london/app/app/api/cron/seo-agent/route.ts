export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro supports up to 300s per route

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { onCronFailure } from "@/lib/ops/failure-hooks";
import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";

const BUDGET_MS = 53_000; // Standard Vercel Pro 60s budget with 7s buffer (used as fallback guard)

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

  // Feature flag guard — can be disabled via DB flag or env var CRON_SEO_AGENT=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("seo-agent");
  if (flagResponse) return flagResponse;

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
      } catch (logErr) {
        console.warn("[seo-agent] CronJobLog query failed (table may not exist yet):", logErr instanceof Error ? logErr.message : logErr);
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
    } catch (healthErr) {
      console.warn("[seo-agent] Healthcheck failed:", healthErr instanceof Error ? healthErr.message : healthErr);
      // Return 200 degraded, not 503 — DB pool exhaustion during concurrent health checks
      // should not appear as a hard failure. Cron runs on schedule regardless.
      return NextResponse.json(
        { status: "degraded", endpoint: "seo-agent", note: "DB temporarily unavailable for healthcheck." },
        { status: 200 },
      );
    }
  }

  const start = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");
    const { forEachSite } = await import("@/lib/resilience");

    // Budget guard: abort if setup already consumed too much time
    if (Date.now() - start > BUDGET_MS - 7_000) {
      return NextResponse.json({ success: false, error: "Budget exhausted before main loop" }, { status: 200 });
    }

    // Only process live sites
    const siteIds = getActiveSiteIds();

    // Use forEachSite for timeout-aware per-site iteration
    const remainingBudget = Math.min(280_000, (maxDuration * 1000) - (Date.now() - start) - 20_000);
    const loopResult = await forEachSite(
      siteIds,
      async (siteId) => {
        const siteUrl = getSiteDomain(siteId);
        return runSEOAgent(prisma, siteId, siteUrl);
      },
      20_000, // 20s safety margin for response serialization
      remainingBudget
    );

    await logCronExecution("seo-agent", loopResult.timedOut ? "timed_out" : "completed", {
      durationMs: Date.now() - start,
      sitesProcessed: Object.keys(loopResult.results || {}),
      resultSummary: { message: `completed=${loopResult.completed}, failed=${loopResult.failed}, skipped=${loopResult.skipped}` },
    });

    // success = true only when at least one site completed without failure
    const overallSuccess = loopResult.completed > 0 || loopResult.failed === 0;
    return NextResponse.json({
      success: overallSuccess,
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
      durationMs: Date.now() - start,
      errorMessage: error instanceof Error ? error.message : "SEO agent failed",
    });

    // Fire failure hook for dashboard visibility
    onCronFailure({ jobName: "seo-agent", error }).catch(err => console.error("[seo-agent] onCronFailure hook failed:", err instanceof Error ? err.message : err));

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
  const AGENT_BUDGET_MS = 120_000; // 120s budget per site (within forEachSite's 280s total)
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

  // NOTE: Steps 8-11 (GSC analysis, AI meta optimization, content strengthening,
  // GA4 analysis) moved to seo-agent-intelligence (runs 1x/day with full budget).
  // This agent now focuses on fast DB audit + fix work only.
  report.searchPerformance = { status: "delegated_to_seo-agent-intelligence" };
  report.trafficAnalysis = { status: "delegated_to_seo-agent-intelligence" };
  report.contentStrategy = { status: "delegated_to_seo-agent-intelligence" };

  // 12. INDEXING STATUS CHECK (discovery only — submission handled by google-indexing cron)
  if (hasBudget(3_000)) {
      try {
        const unindexed = await prisma.uRLIndexingStatus.count({
          where: { site_id: siteId, status: { notIn: ["indexed"] } },
        });
        const total = await prisma.uRLIndexingStatus.count({ where: { site_id: siteId } });
        report.indexingSubmission = {
          status: "discovery_only",
          unindexedCount: unindexed,
          totalTracked: total,
          note: "Submission delegated to google-indexing cron (9:15 UTC)",
        };
      } catch (indexCheckErr) {
        console.warn(`[seo-agent:${siteId}] Indexing status check failed:`, indexCheckErr instanceof Error ? indexCheckErr.message : indexCheckErr);
        report.indexingSubmission = { status: "check_failed" };
      }
    } else {
      report.indexingSubmission = { status: "budget_exhausted" };
    }

    // 12b. AUTO-INJECT STRUCTURED DATA FOR POSTS MISSING SCHEMAS
    if (hasBudget(5_000)) {
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
        take: 20, // Process 20 per run (was 5) — larger batch closes schema gap faster
      });

      let schemasInjected = 0;
      const { getSiteDomain: _gsd } = await import("@/config/sites");
      const baseSiteUrl = siteUrl || _gsd(siteId);
      for (const post of postsWithoutSchema) {
        if (!hasBudget(2_000)) break;
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
    }

    // 12c. AUTO-INJECT INTERNAL LINKS FOR POSTS WITH < 3 INTERNAL LINKS
    if (hasBudget(5_000)) {
      try {
        const postsWithFewLinks = await prisma.blogPost.findMany({
          where: {
            published: true,
            ...siteFilter,
          },
          select: { id: true, slug: true, title_en: true, content_en: true, content_ar: true, category_id: true },
          take: 50,
          orderBy: { created_at: "desc" },
        });

        // Count internal links in each post (check both EN and AR)
        const needsLinks = postsWithFewLinks.filter((post: { id: string; slug: string | null; content_en: string | null; content_ar: string | null }) => {
          const enHtml = post.content_en || "";
          const arHtml = post.content_ar || "";
          const enInternalLinks = (enHtml.match(/href=["']\//g) || []).length;
          const arInternalLinks = (arHtml.match(/href=["']\//g) || []).length;
          return enInternalLinks < 3 || arInternalLinks < 3;
        });

        let linksInjected = 0;
        const publishedSlugs = postsWithFewLinks
          .filter((p: { slug: string | null }) => p.slug)
          .map((p: { slug: string; title_en: string }) => ({ slug: p.slug, title: p.title_en }));

        for (const post of needsLinks.slice(0, 10)) {
          if (!post.content_en || post.content_en.length < 200) continue;

          // Find 3 related posts (different slug, has title)
          const relatedCandidates = publishedSlugs
            .filter((p: { slug: string }) => p.slug !== post.slug)
            .slice(0, 6);

          if (relatedCandidates.length < 2) continue;

          // Build a "Related Articles" section to append
          const relatedLinks = relatedCandidates.slice(0, 3)
            .map((r: { slug: string; title: string }) =>
              `<li><a href="/blog/${r.slug}" class="internal-link">${r.title || r.slug}</a></li>`
            ).join("\n");

          const relatedSection = `\n<section class="related-articles"><h2>Related Articles</h2><ul>\n${relatedLinks}\n</ul></section>`;

          // Append the section if it doesn't already have one
          // Check both CSS class names used by different injectors to prevent duplicate sections:
          // - "related-articles" is used by seo-agent
          // - "related-link" is used by content-auto-fix orphan resolution
          if (!post.content_en.includes("related-articles") && !post.content_en.includes("related-link")) {
            try {
              await optimisticBlogPostUpdate(post.id, (current) => ({
                content_en: current.content_en + relatedSection,
              }), { tag: "[seo-agent]" });
              linksInjected++;
            } catch (e) {
              console.warn(`[seo-agent] Internal link injection failed for ${post.slug}:`, e instanceof Error ? e.message : e);
            }
          }
        }

        // Also inject Arabic related-articles for posts with content_ar and few Arabic internal links
        let arLinksInjected = 0;
        for (const post of needsLinks.slice(0, 10)) {
          const arHtml = (post as Record<string, unknown>).content_ar as string | null;
          if (!arHtml || arHtml.length < 200) continue;
          if (arHtml.includes("related-articles")) continue;

          const arInternalLinks = (arHtml.match(/href=["']\//g) || []).length;
          if (arInternalLinks >= 3) continue;

          const arRelatedCandidates = publishedSlugs
            .filter((p: { slug: string }) => p.slug !== post.slug)
            .slice(0, 3);
          if (arRelatedCandidates.length < 2) continue;

          const arRelatedLinks = arRelatedCandidates
            .map((r: { slug: string; title: string }) =>
              `<li><a href="/ar/blog/${r.slug}" class="internal-link">${r.title || r.slug}</a></li>`
            ).join("\n");

          const arRelatedSection = `\n<section class="related-articles" dir="rtl"><h2>مقالات ذات صلة</h2><ul>\n${arRelatedLinks}\n</ul></section>`;

          try {
            await optimisticBlogPostUpdate(post.id, (current) => ({
              content_ar: current.content_ar + arRelatedSection,
            }), { tag: "[seo-agent]" });
            arLinksInjected++;
          } catch (e) {
            console.warn(`[seo-agent] Arabic internal link injection failed for ${post.slug}:`, e instanceof Error ? e.message : e);
          }
        }

        if (linksInjected > 0 || arLinksInjected > 0) {
          fixes.push(`Injected internal link sections into ${linksInjected} EN + ${arLinksInjected} AR posts with < 3 links`);
        }
        report.internalLinkInjection = { postsChecked: needsLinks.length, linksInjected, arLinksInjected };
      } catch (linkErr) {
        console.warn("[seo-agent] Internal link injection failed (non-fatal):", linkErr instanceof Error ? linkErr.message : linkErr);
      }
    }

    // 12d. ORPHAN PAGE RESCUE — find pages with zero inbound links and add links to them
    // from existing well-linked articles. Orphan pages can't be discovered by crawlers.
    if (hasBudget(5_000)) {
      let orphansRescued = 0;
      try {
        const allPublished = await prisma.blogPost.findMany({
          where: { published: true, ...siteFilter, deletedAt: null },
          select: { id: true, slug: true, title_en: true, content_en: true },
          take: 200,
        });

        // Build a set of slugs that are linked TO by at least one other article
        const linkedSlugs = new Set<string>();
        for (const post of allPublished) {
          const links = (post.content_en || "").match(/href="\/blog\/([a-zA-Z0-9_-]+)"/gi) || [];
          for (const link of links) {
            const match = link.match(/href="\/blog\/([a-zA-Z0-9_-]+)"/i);
            if (match) linkedSlugs.add(match[1]);
          }
        }

        // Orphans = published articles that no other article links to
        const orphans = allPublished.filter(p => p.slug && !linkedSlugs.has(p.slug));

        if (orphans.length > 0) {
          // Find well-linked articles (articles that already have related-articles sections)
          // and add orphan page links to their content
          const hostsWithLinks = allPublished.filter(p =>
            p.content_en && p.content_en.length > 500 && p.slug &&
            !orphans.some(o => o.id === p.id)
          );

          for (const orphan of orphans.slice(0, 10)) {
            if (!hasBudget(2_000)) break;
            if (!orphan.slug || !orphan.title_en) continue;

            // Find a host article to add the orphan link to (round-robin by orphan index)
            const host = hostsWithLinks[orphansRescued % hostsWithLinks.length];
            if (!host || !host.content_en) continue;

            // Check if host already links to this orphan
            if (host.content_en.includes(`/blog/${orphan.slug}`)) continue;

            // Inject a contextual link near the end of the article (before closing tags)
            const linkHtml = `<p>You may also enjoy: <a href="/blog/${orphan.slug}" class="internal-link">${orphan.title_en}</a></p>`;

            // Add before the last </section> or </article> or at the end
            let updatedContent = host.content_en;
            const insertPoint = updatedContent.lastIndexOf("</section>");
            if (insertPoint > 0) {
              updatedContent = updatedContent.slice(0, insertPoint) + linkHtml + updatedContent.slice(insertPoint);
            } else {
              updatedContent += linkHtml;
            }

            try {
              await optimisticBlogPostUpdate(host.id, (current) => {
                let freshContent = current.content_en;
                const freshInsertPoint = freshContent.lastIndexOf("</section>");
                if (freshInsertPoint > 0) {
                  freshContent = freshContent.slice(0, freshInsertPoint) + linkHtml + freshContent.slice(freshInsertPoint);
                } else {
                  freshContent += linkHtml;
                }
                return { content_en: freshContent };
              }, { tag: "[seo-agent]" });
              orphansRescued++;
            } catch (e) {
              console.warn(`[seo-agent] Orphan rescue failed for ${orphan.slug}:`, e instanceof Error ? e.message : e);
            }
          }
        }

        if (orphansRescued > 0) {
          fixes.push(`Rescued ${orphansRescued} orphan pages by adding inbound links from existing articles`);
        }
        report.orphanPageRescue = { totalOrphans: orphans.length, rescued: orphansRescued };
      } catch (orphanErr) {
        console.warn("[seo-agent] Orphan page rescue failed (non-fatal):", orphanErr instanceof Error ? orphanErr.message : orphanErr);
      }
    }

    // NOTE: Step 13 (content strategy + diversity) moved to seo-agent-intelligence

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

  // ── Mark modified posts for IndexNow resubmission ────────────────────────
  // When the seo-agent fixes content (internal links, meta, schema), the updated
  // version should be re-crawled by Google. Reset submission flags so the next
  // google-indexing cron picks them up.
  if (fixes.length > 0 && siteId) {
    try {
      const { getSiteDomain } = await import("@/config/sites");
      const recentlyModified = await prisma.blogPost.findMany({
        where: { siteId, published: true, updated_at: { gte: new Date(agentStart) } },
        select: { slug: true },
      });
      if (recentlyModified.length > 0) {
        const siteUrl = getSiteDomain(siteId);
        const urls = recentlyModified.map((p: { slug: string }) => `${siteUrl}/blog/${p.slug}`);
        await prisma.uRLIndexingStatus.updateMany({
          where: { site_id: siteId, url: { in: urls } },
          data: { submitted_indexnow: false, last_submitted_at: null },
        });
        console.log(`[seo-agent:${siteId}] Marked ${urls.length} modified posts for IndexNow resubmission`);
      }
    } catch (resubErr) {
      console.warn("[seo-agent] Resubmission marking failed (non-fatal):", resubErr instanceof Error ? resubErr.message : resubErr);
    }
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
      take: 100, // Prevent OOM on large sites — audit max 100 posts per run
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
          await optimisticBlogPostUpdate(post.id, (current) => ({
            page_type: "guide",
          }), { tag: "[seo-agent]" });
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
          await optimisticBlogPostUpdate(post.id, (current) => ({
            seo_score: score,
          }), { tag: "[seo-agent]" });
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
  } catch (err) {
    console.warn("[seo-agent] auditBlogPosts failed:", err instanceof Error ? err.message : err);
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
  } catch (err) {
    console.warn("[seo-agent] checkIndexingStatus failed:", err instanceof Error ? err.message : err);
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

    // Also discover news items (not just blog posts)
    try {
      const newsItems = await prisma.newsItem.findMany({
        where: { siteId, created_at: { gte: sevenDaysAgo }, status: "published" },
        select: { slug: true },
        take: 50,
      });
      for (const n of newsItems) {
        urls.push(`${siteUrl}/news/${n.slug}`);
      }
    } catch { /* NewsItem table might not exist */ }

    // Add Arabic variants for all discovered URLs
    const arUrls = urls.map((u: string) => u.replace(/^(https?:\/\/[^/]+)(\/.*)$/, "$1/ar$2"));
    urls.push(...arUrls);

    // IndexNow submission is delegated to seo/cron (via lib/seo/indexing-service.ts)
    // which uses fetchWithRetry with exponential backoff for better reliability.
    console.log(
      `[SEO-Agent] Found ${urls.length} new URLs — IndexNow submission delegated to seo/cron`,
    );
    fixes.push(
      `Found ${urls.length} new URLs for indexing (submission handled by seo/cron)`,
    );

    // Track URLs as discovered in URLIndexingStatus so seo/cron and verify-indexing pick them up
    // Status lifecycle: discovered → submitted → indexed/not_indexed
    let newlyTracked: string[] = [];
    if (siteId) {
      try {
        const results = await Promise.allSettled(
          urls.map((url: string) =>
            prisma.uRLIndexingStatus.upsert({
              where: { site_id_url: { site_id: siteId, url } },
              create: {
                site_id: siteId,
                url,
                slug: url.replace(/^https?:\/\/[^/]+\/?/, "").replace(/^ar\//, "") || "/",
                status: "discovered",
                submitted_indexnow: false,
                last_submitted_at: null,
              },
              update: {
                // Don't overwrite submitted/indexed — only update if still in initial state
              },
            }),
          ),
        );
        // Collect URLs that were actually created (not pre-existing)
        newlyTracked = urls.filter((_: string, i: number) => results[i].status === "fulfilled");
      } catch (trackErr) {
        console.warn("[seo-agent] URL tracking in URLIndexingStatus failed (non-fatal):", trackErr instanceof Error ? trackErr.message : trackErr);
      }
    }

    // Submit newly discovered URLs to IndexNow immediately (don't wait for seo/cron)
    let indexNowSubmitted = 0;
    if (newlyTracked.length > 0) {
      try {
        const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
        await submitToIndexNow(newlyTracked, siteUrl);
        indexNowSubmitted = newlyTracked.length;
        // Mark as submitted in DB
        await prisma.uRLIndexingStatus.updateMany({
          where: { site_id: siteId, url: { in: newlyTracked } },
          data: { submitted_indexnow: true, last_submitted_at: new Date() },
        }).catch(err => console.warn("[seo-agent] URLIndexingStatus update failed:", err instanceof Error ? err.message : String(err)));
        fixes.push(`Submitted ${indexNowSubmitted} URLs to IndexNow immediately`);
      } catch (indexNowErr) {
        console.warn("[seo-agent] Immediate IndexNow submission failed (seo/cron will retry):", indexNowErr instanceof Error ? indexNowErr.message : indexNowErr);
      }
    }

    return { discovered: urls.length, urls, submitted: indexNowSubmitted };
  } catch (err) {
    console.warn("[seo-agent] submitNewUrls failed:", err instanceof Error ? err.message : err);
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
  } catch (err) {
    console.warn("[seo-agent] verifySitemapHealth failed (may be running locally):", err instanceof Error ? err.message : err);
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
          where: { published: true, ...(siteId ? { siteId } : {}) },
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
  } catch (err) {
    console.warn("[seo-agent] detectContentGaps failed:", err instanceof Error ? err.message : err);
    return { categoryGaps: [], enPosts: 0, arPosts: 0 };
  }
}

/**
 * Auto-fix common SEO issues
 *
 * Fixes (in priority order):
 * 1. Missing meta titles → generate from title_en (truncated to 57 chars)
 * 2. Missing meta descriptions → generate from excerpt_en (truncated to 155 chars)
 * 3. Meta titles that are too long (> 60 chars) → trim to 57 + "..."
 * 4. Meta titles that are too short (< 30 chars) → prepend site keyword context
 * 5. Meta descriptions that are too long (> 160 chars) → trim to 155 + "…"
 * 6. Meta descriptions that are too short (< 120 chars) → extend from content excerpt
 */
async function autoFixSEOIssues(
  prisma: any,
  issues: string[],
  fixes: string[],
  siteId?: string,
) {
  const fixedCount = { metaTitles: 0, metaDescriptions: 0, slugs: 0 };
  const blogSiteFilter = siteId ? { siteId } : {};

  // ── Fix 1 + 2: Missing meta titles OR descriptions ─────────────────────────
  try {
    const postsWithoutMeta = await prisma.blogPost.findMany({
      where: {
        published: true,
        ...blogSiteFilter,
        OR: [
          { meta_title_en: null },
          { meta_title_en: "" },
          { meta_description_en: null },
          { meta_description_en: "" },
        ],
      },
      select: { id: true, title_en: true, excerpt_en: true, content_en: true },
      take: 50,
    });

    for (const post of postsWithoutMeta) {
      const updates: Record<string, string> = {};

      if (!post.meta_title_en) {
        // Build a 50-57 char title: clip at last word boundary before 57 chars
        let title = (post.title_en || "").trim();
        if (title.length > 57) {
          title = title.substring(0, 57);
          const lastSpace = title.lastIndexOf(" ");
          if (lastSpace > 40) title = title.substring(0, lastSpace);
          title = title + "…";
        }
        if (title.length >= 10) updates.meta_title_en = title;
      }

      if (!post.meta_description_en) {
        // Build 120-155 char description: prefer excerpt, fall back to content strip
        const source = post.excerpt_en || (post.content_en || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        let desc = source.substring(0, 155).trim();
        const lastSentence = desc.search(/[.!?][^.!?]*$/);
        if (lastSentence > 80) desc = desc.substring(0, lastSentence + 1);
        if (desc.length >= 50) updates.meta_description_en = desc;
      }

      if (Object.keys(updates).length > 0) {
        try {
          await optimisticBlogPostUpdate(post.id, (current) => updates, { tag: "[seo-agent]" });
          fixedCount.metaTitles++;
        } catch (e) {
          console.warn("[seo-agent] Failed to auto-fix meta fields:", e instanceof Error ? e.message : e);
        }
      }
    }

    if (fixedCount.metaTitles > 0) {
      fixes.push(`Auto-generated missing meta fields for ${fixedCount.metaTitles} posts`);
    }
  } catch (metaErr) {
    console.warn("[seo-agent] Missing meta auto-fix failed:", metaErr instanceof Error ? metaErr.message : metaErr);
  }

  // ── Fix 3: Meta titles too long (> 60 chars) ──────────────────────────────
  try {
    const postsLongTitle = await prisma.blogPost.findMany({
      where: {
        published: true,
        ...blogSiteFilter,
        meta_title_en: { not: null },
      },
      select: { id: true, meta_title_en: true },
      take: 100,
    });

    let longTitleFixed = 0;
    for (const post of postsLongTitle) {
      const title = post.meta_title_en || "";
      if (title.length > 60) {
        let trimmed = title.substring(0, 57);
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace > 40) trimmed = trimmed.substring(0, lastSpace);
        trimmed = trimmed.replace(/[.,;:!?-]+$/, "") + "…";
        try {
          await optimisticBlogPostUpdate(post.id, (current) => ({ meta_title_en: trimmed }), { tag: "[seo-agent]" });
          longTitleFixed++;
        } catch (e) {
          console.warn("[seo-agent] Long title trim failed:", e instanceof Error ? e.message : e);
        }
      }
    }
    if (longTitleFixed > 0) {
      fixes.push(`Trimmed ${longTitleFixed} meta titles exceeding 60 chars`);
    }
  } catch (err) {
    console.warn("[seo-agent] Long title fix failed:", err instanceof Error ? err.message : err);
  }

  // ── Fix 4: Meta descriptions too long (> 160 chars) ───────────────────────
  try {
    const postsLongDesc = await prisma.blogPost.findMany({
      where: {
        published: true,
        ...blogSiteFilter,
        meta_description_en: { not: null },
      },
      select: { id: true, meta_description_en: true },
      take: 100,
    });

    let longDescFixed = 0;
    for (const post of postsLongDesc) {
      const desc = post.meta_description_en || "";
      if (desc.length > 160) {
        let trimmed = desc.substring(0, 155);
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace > 120) trimmed = trimmed.substring(0, lastSpace);
        trimmed = trimmed.replace(/[.,;:!?]+$/, "") + "…";
        try {
          await optimisticBlogPostUpdate(post.id, (current) => ({ meta_description_en: trimmed }), { tag: "[seo-agent]" });
          longDescFixed++;
          fixedCount.metaDescriptions++;
        } catch (e) {
          console.warn("[seo-agent] Long desc trim failed:", e instanceof Error ? e.message : e);
        }
      }
    }
    if (longDescFixed > 0) {
      fixes.push(`Trimmed ${longDescFixed} meta descriptions exceeding 160 chars`);
    }
  } catch (err) {
    console.warn("[seo-agent] Long description fix failed:", err instanceof Error ? err.message : err);
  }

  return fixedCount;
}

function calculateHealthScore(report: Record<string, any>): number {
  // Diminishing returns per category — prevents trivially hitting 0 on any real site.
  // Max total deductions capped so a functioning site with issues scores 30-70, not 0.
  let totalDeductions = 0;

  // Content generation (max 12 pts)
  if (report.contentStatus?.status === "stalled") totalDeductions += 12;
  else if (report.contentStatus?.status === "partial") totalDeductions += 6;

  // Blog audit (max 12 pts)
  if (report.blogAudit?.averageSEOScore < 70) totalDeductions += 8;
  if (report.blogAudit?.postsWithIssues > 5) totalDeductions += 4;

  // Indexing (max 8 pts)
  if (report.indexingStatus?.status === "credentials_missing") totalDeductions += 8;

  // Sitemap (max 10 pts)
  if (report.sitemapHealth?.healthy === false) totalDeductions += 10;

  // Content gaps (max 6 pts)
  if (report.contentGaps?.categoryGaps?.length > 2) totalDeductions += 6;

  // GSC search performance (max 12 pts)
  if (report.searchPerformance?.page1NoClicks > 0) totalDeductions += 5;
  if (report.searchPerformance?.lowCTRPages > 3) totalDeductions += 5;
  if (report.searchPerformance?.totals?.ctr < 3) totalDeductions += 2;

  // GA4 traffic analysis (max 8 pts)
  if (report.trafficAnalysis?.organicShare < 20) totalDeductions += 5;
  if (report.trafficAnalysis?.bounceRate > 50) totalDeductions += 3;

  // Bonus for fixes applied
  const fixCount = report.metaOptimizations?.length || 0;
  const bonus = fixCount > 0 ? Math.min(fixCount * 2, 10) : 0;

  // Floor at 15 — a functioning site with real issues is never 0
  return Math.max(15, Math.min(100, 100 - totalDeductions + bonus));
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
