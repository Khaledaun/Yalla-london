export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * SEO Agent INTELLIGENCE — AI & Analytics Steps Only
 *
 * Split from seo-agent to prevent budget exhaustion. The main seo-agent
 * handles DB audit/fix work (steps 1-7, 12). This route handles the
 * expensive analytics + AI steps that were often skipped due to budget:
 *
 * 1. GSC Search Performance analysis (API call, 10s timeout)
 * 2. AI meta title/description optimization for low-CTR pages
 * 3. AI content strengthening for almost-page-1 articles
 * 4. GA4 traffic pattern analysis (API call, 10s timeout)
 * 5. Content rewrite queue from GSC+GA4 data
 * 6. Content strategy + diversity analysis
 *
 * Runs 1x/day (analytics data doesn't change faster than that).
 * Gets the full 53s budget for AI + API work.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { onCronFailure } from "@/lib/ops/failure-hooks";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");
    const { forEachSite } = await import("@/lib/resilience");

    const siteIds = getActiveSiteIds();

    const loopResult = await forEachSite(
      siteIds,
      async (siteId) => {
        const siteUrl = getSiteDomain(siteId);
        return runIntelligence(prisma, siteId, siteUrl);
      },
      7_000,
      53_000,
    );

    await logCronExecution("seo-agent-intelligence", loopResult.timedOut ? "timed_out" : "completed", {
      durationMs: Date.now() - cronStart,
      sitesProcessed: Object.keys(loopResult.results || {}),
      resultSummary: { message: `completed=${loopResult.completed}, failed=${loopResult.failed}` },
    }).catch(err => console.warn("[seo-intel] logCronExecution failed:", err instanceof Error ? err.message : err));

    return NextResponse.json({
      success: loopResult.completed > 0 || loopResult.failed === 0,
      agent: "seo-intelligence",
      completed: loopResult.completed,
      failed: loopResult.failed,
      results: loopResult.results,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    await logCronExecution("seo-agent-intelligence", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    }).catch(err => console.warn("[seo-intel] logCronExecution failed:", err instanceof Error ? err.message : err));
    onCronFailure({ jobName: "seo-agent-intelligence", error }).catch(err => console.warn("[seo-intel] onCronFailure hook failed:", err instanceof Error ? err.message : err));

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

async function runIntelligence(prisma: any, siteId: string, siteUrl?: string) {
  const report: Record<string, any> = { siteId };
  const issues: string[] = [];
  const fixes: string[] = [];

  const agentStart = Date.now();
  const BUDGET_MS = 45_000; // 45s per site
  const budgetLeft = () => BUDGET_MS - (Date.now() - agentStart);
  const hasBudget = (minMs = 3_000) => budgetLeft() > minMs;

  try {
    const { withTimeout } = await import("@/lib/resilience");
    const {
      analyzeSearchPerformance,
      analyzeTrafficPatterns,
      autoOptimizeLowCTRMeta,
      flagContentForStrengthening,
    } = await import("@/lib/seo/seo-intelligence");

    // 1. GSC SEARCH PERFORMANCE
    const searchData = await withTimeout(
      analyzeSearchPerformance(28, siteId), 10_000, "GSC analyzeSearchPerformance"
    ).catch((e: Error) => { console.warn(`[seo-intel:${siteId}] GSC analysis failed:`, e.message); return null; });

    if (searchData) {
      report.searchPerformance = {
        totals: searchData.totals,
        lowCTRPages: searchData.lowCTRPages.length,
        almostPage1: searchData.almostPage1.length,
        contentGapKeywords: searchData.contentGapKeywords.length,
      };
      issues.push(...searchData.issues);

      // 2. AI META OPTIMIZATION for low-CTR pages
      if (hasBudget(15_000)) {
        try {
          report.metaOptimizations = await withTimeout(
            autoOptimizeLowCTRMeta(prisma, searchData, issues, fixes),
            Math.min(15_000, budgetLeft() - 5_000),
            "autoOptimizeLowCTRMeta"
          );
        } catch (err) {
          console.warn(`[seo-intel:${siteId}] Meta optimization skipped:`, err instanceof Error ? err.message : err);
          report.metaOptimizations = [];
        }
      }

      // 3. AI CONTENT STRENGTHENING for almost-page-1 articles
      if (hasBudget(10_000)) {
        try {
          report.contentStrengthening = await withTimeout(
            flagContentForStrengthening(prisma, searchData, fixes),
            Math.min(12_000, budgetLeft() - 5_000),
            "flagContentForStrengthening"
          );
        } catch (err) {
          console.warn(`[seo-intel:${siteId}] Content strengthening skipped:`, err instanceof Error ? err.message : err);
          report.contentStrengthening = { expanded: 0, flagged: 0 };
        }
      }
    } else {
      report.searchPerformance = { status: "no_data" };
    }

    // 4. GA4 TRAFFIC PATTERNS
    const trafficData = hasBudget(8_000) ? await withTimeout(
      analyzeTrafficPatterns(28, siteId), 10_000, "GA4 analyzeTrafficPatterns"
    ).catch((e: Error) => { console.warn(`[seo-intel:${siteId}] GA4 failed:`, e.message); return null; }) : null;

    if (trafficData) {
      report.trafficAnalysis = {
        sessions: trafficData.sessions,
        organicShare: trafficData.organicShare,
        bounceRate: trafficData.bounceRate,
        lowEngagementPages: trafficData.lowEngagementPages.length,
      };
      issues.push(...trafficData.issues);
    } else {
      report.trafficAnalysis = { status: "no_data" };
    }

    // 5. CONTENT STRATEGY + DIVERSITY
    if (hasBudget(5_000)) {
      try {
        const {
          generateContentProposals,
          saveContentProposals,
          analyzeContentDiversity,
          applyDiversityQuotas,
        } = await import("@/lib/seo/content-strategy");

        const diversity = await analyzeContentDiversity(prisma);
        report.contentDiversity = {
          mix: diversity.currentMix,
          totalPublished: diversity.totalPublished,
          underrepresented: diversity.underrepresented,
        };

        if (searchData) {
          const existingPosts = await prisma.blogPost.findMany({
            where: { published: true, siteId },
            select: { slug: true },
            take: 500,
          });
          const existingSlugs = existingPosts.map((p: any) => p.slug);
          let proposals = generateContentProposals(searchData, existingSlugs);
          proposals = applyDiversityQuotas(proposals, diversity);
          const saved = await saveContentProposals(prisma, proposals, fixes, siteId);
          report.contentStrategy = {
            proposalsGenerated: proposals.length,
            proposalsCreated: saved.created,
            diversityAdjusted: true,
          };
        }
      } catch (err) {
        console.warn(`[seo-intel:${siteId}] Content strategy error:`, err instanceof Error ? err.message : err);
        report.contentStrategy = { status: "error" };
      }
    }

    // Store report
    try {
      await prisma.seoReport.create({
        data: {
          reportType: "intelligence",
          site_id: siteId,
          generatedAt: new Date(),
          data: {
            ...report,
            issues,
            fixes,
            agent: "seo-intelligence-v1",
            runType: "scheduled",
          },
        },
      });
    } catch (dbErr) {
      console.warn(`[seo-intel:${siteId}] Failed to store report:`, dbErr instanceof Error ? dbErr.message : dbErr);
    }

  } catch (err) {
    console.warn(`[seo-intel:${siteId}] Intelligence module error:`, err instanceof Error ? err.message : err);
    report.error = err instanceof Error ? err.message : String(err);
  }

  return report;
}
