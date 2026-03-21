export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Unified SEO Intelligence API
 *
 * Single source of truth for ALL SEO data: GSC, GA4, indexing, content quality.
 * Cross-references every data source to surface blockers and opportunities.
 *
 * GET: Returns full SEO intelligence report
 * Query params:
 *   ?siteId=yalla-london (optional, defaults to first active site)
 *   ?period=7d|28d|90d (optional, defaults to 28d)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const start = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const period = request.nextUrl.searchParams.get("period") || "28d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 28;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const domain = getSiteDomain(siteId);

    // ── Parallel data fetching ──
    const [
      indexingSummary,
      ga4Report,
      gscPages,
      gscQueries,
      publishedPosts,
      urlStatuses,
      recentCronLogs,
    ] = await Promise.allSettled([
      // 1. Indexing summary (single source of truth)
      import("@/lib/seo/indexing-summary").then((m) => m.getIndexingSummary(siteId)),

      // 2. GA4 live metrics
      import("@/lib/seo/ga4-data-api").then(async (m) => {
        const status = m.getGA4ConfigStatus();
        if (!status.configured) return null;
        return m.fetchGA4Metrics(`${days}daysAgo`, "today");
      }),

      // 3. GSC page performance from DB (already synced by gsc-sync cron)
      prisma.gscPagePerformance.findMany({
        where: { site_id: siteId, date: { gte: since } },
        orderBy: { date: "desc" },
      }),

      // 4. GSC queries — aggregate by URL for the period
      prisma.gscPagePerformance.groupBy({
        by: ["url"],
        where: { site_id: siteId, date: { gte: since } },
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, position: true },
        orderBy: { _sum: { impressions: "desc" } },
        take: 200,
      }),

      // 5. Published blog posts
      prisma.blogPost.findMany({
        where: { siteId, published: true },
        select: {
          id: true,
          title_en: true,
          slug: true,
          seo_score: true,
          content_en: true,
          meta_title_en: true,
          meta_description_en: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: "desc" },
      }),

      // 6. URL indexing statuses
      prisma.uRLIndexingStatus.findMany({
        where: { site_id: siteId },
        select: {
          url: true,
          status: true,
          indexing_state: true,
          last_submitted_at: true,
          last_inspected_at: true,
          submission_attempts: true,
          submitted_indexnow: true,
          last_error: true,
        },
      }),

      // 7. Recent GSC sync logs
      prisma.cronJobLog.findMany({
        where: { job_name: "gsc-sync", started_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { started_at: "desc" },
        take: 5,
        select: { started_at: true, status: true, result_summary: true },
      }),
    ]);

    // ── Extract results with fallbacks ──
    const indexing = indexingSummary.status === "fulfilled" ? indexingSummary.value : null;
    const ga4 = ga4Report.status === "fulfilled" ? ga4Report.value : null;
    const gscPageData = gscPages.status === "fulfilled" ? gscPages.value : [];
    const gscQueryData = gscQueries.status === "fulfilled" ? gscQueries.value : [];
    const posts = publishedPosts.status === "fulfilled" ? publishedPosts.value : [];
    const urlStatusList = urlStatuses.status === "fulfilled" ? urlStatuses.value : [];
    const cronLogs = recentCronLogs.status === "fulfilled" ? recentCronLogs.value : [];

    // ── Build URL lookup maps ──
    type UrlStatusEntry = (typeof urlStatusList)[number];
    const urlStatusMap = new Map<string, UrlStatusEntry>(urlStatusList.map((u) => [u.url, u]));
    interface GscEntry { clicks: number; impressions: number; ctr: number; position: number }
    const gscByUrl = new Map<string, GscEntry>(
      gscQueryData.map((g) => [
        g.url,
        {
          clicks: g._sum?.clicks || 0,
          impressions: g._sum?.impressions || 0,
          ctr: g._avg?.ctr || 0,
          position: g._avg?.position || 0,
        },
      ])
    );

    // ── Per-page intelligence ──
    interface PageIntel {
      slug: string;
      title: string;
      url: string;
      wordCount: number;
      seoScore: number | null;
      hasMeta: boolean;
      hasMetaDesc: boolean;
      indexingStatus: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      submissionAttempts: number;
      lastSubmitted: string | null;
      issues: string[];
      opportunity: string | null;
      severity: "critical" | "high" | "medium" | "low" | "ok";
    }

    const pageIntel: PageIntel[] = [];

    for (const post of posts) {
      const blogUrl = `${domain}/blog/${post.slug}`;
      const arUrl = `${domain}/ar/blog/${post.slug}`;
      const urlStatus = urlStatusMap.get(blogUrl) || urlStatusMap.get(`https://www.${domain.replace("https://", "")}/blog/${post.slug}`);
      const gsc = gscByUrl.get(blogUrl) || gscByUrl.get(`https://www.${domain.replace("https://", "")}/blog/${post.slug}`);
      const wordCount = (post.content_en || "").split(/\s+/).filter(Boolean).length;

      const issues: string[] = [];
      let opportunity: string | null = null;
      let severityNum = 4; // 0=critical, 1=high, 2=medium, 3=low, 4=ok
      const severityFromNum = (n: number): PageIntel["severity"] =>
        n === 0 ? "critical" : n === 1 ? "high" : n === 2 ? "medium" : n === 3 ? "low" : "ok";

      // Indexing issues
      const idxStatus = urlStatus?.status || "never_submitted";
      if (idxStatus === "never_submitted") {
        issues.push("Never submitted to Google");
        severityNum = 0;
      } else if (idxStatus === "error") {
        issues.push(`Indexing error: ${urlStatus?.last_error?.slice(0, 60) || "unknown"}`);
        severityNum = 0;
      } else if (idxStatus === "deindexed") {
        issues.push("Deindexed by Google");
        severityNum = 0;
      } else if (idxStatus === "submitted" && (urlStatus?.submission_attempts || 0) >= 5) {
        issues.push(`Submitted ${urlStatus?.submission_attempts} times but not indexed — chronic failure`);
        severityNum = Math.min(severityNum, 1);
      } else if (idxStatus === "submitted") {
        issues.push("Submitted but not yet indexed");
        severityNum = Math.min(severityNum, 2);
      }

      // Content quality issues
      if (wordCount < 300) {
        issues.push(`Very thin content (${wordCount} words)`);
        severityNum = Math.min(severityNum, 1);
      } else if (wordCount < 500) {
        issues.push(`Short content (${wordCount} words — target 1000+)`);
        severityNum = Math.min(severityNum, 2);
      }

      if (!post.meta_title_en) {
        issues.push("Missing meta title");
        severityNum = Math.min(severityNum, 2);
      }
      if (!post.meta_description_en) {
        issues.push("Missing meta description");
        severityNum = Math.min(severityNum, 2);
      }
      if (post.seo_score !== null && post.seo_score < 30) {
        issues.push(`Very low SEO score (${post.seo_score}/100)`);
        severityNum = Math.min(severityNum, 1);
      }

      // GSC-based intelligence
      if (gsc) {
        if (gsc.impressions > 100 && gsc.ctr < 0.02) {
          issues.push(`High impressions (${gsc.impressions}) but very low CTR (${(gsc.ctr * 100).toFixed(1)}%) — meta title/description needs work`);
          opportunity = "Improve meta title and description to boost CTR";
          severityNum = Math.min(severityNum, 2);
        }
        if (gsc.impressions > 50 && gsc.position > 20) {
          issues.push(`Appearing on page 3+ (position ${gsc.position.toFixed(1)}) — needs content strengthening`);
          severityNum = Math.min(severityNum, 2);
        }
        if (gsc.impressions > 200 && gsc.position < 10 && gsc.ctr < 0.03) {
          opportunity = `Page 1 with ${gsc.impressions} impressions but only ${(gsc.ctr * 100).toFixed(1)}% CTR — quick CTR win with better meta`;
        }
        if (gsc.clicks > 5 && gsc.position > 5 && gsc.position < 15) {
          opportunity = `Position ${gsc.position.toFixed(0)} with ${gsc.clicks} clicks — could reach top 5 with content refresh`;
        }
        if (gsc.impressions === 0 && idxStatus === "indexed") {
          issues.push("Indexed but zero impressions — may be low-quality or cannibalizing another page");
          severityNum = Math.min(severityNum, 3);
        }
      }

      // Bad slug
      if (post.slug === "-" || !post.slug || post.slug.length < 3) {
        issues.push("Bad/missing slug");
        severityNum = 0;
      }

      pageIntel.push({
        slug: post.slug,
        title: (post.title_en || "").slice(0, 80),
        url: blogUrl,
        wordCount,
        seoScore: post.seo_score,
        hasMeta: !!post.meta_title_en,
        hasMetaDesc: !!post.meta_description_en,
        indexingStatus: idxStatus,
        clicks: gsc?.clicks || 0,
        impressions: gsc?.impressions || 0,
        ctr: gsc?.ctr || 0,
        position: gsc?.position || 0,
        submissionAttempts: urlStatus?.submission_attempts || 0,
        lastSubmitted: urlStatus?.last_submitted_at?.toISOString() || null,
        issues,
        opportunity,
        severity: severityFromNum(severityNum),
      });
    }

    // ── Sort: worst problems first ──
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, ok: 4 };
    pageIntel.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // ── Aggregate blockers ──
    const blockerCounts = {
      neverSubmitted: pageIntel.filter((p) => p.indexingStatus === "never_submitted").length,
      chronicFailure: pageIntel.filter((p) => p.submissionAttempts >= 5 && p.indexingStatus !== "indexed").length,
      thinContent: pageIntel.filter((p) => p.wordCount < 300).length,
      missingMeta: pageIntel.filter((p) => !p.hasMeta || !p.hasMetaDesc).length,
      lowSeoScore: pageIntel.filter((p) => p.seoScore !== null && p.seoScore < 30).length,
      deindexed: pageIntel.filter((p) => p.indexingStatus === "deindexed").length,
      badSlugs: pageIntel.filter((p) => p.slug === "-" || !p.slug || p.slug.length < 3).length,
      highImpressionsLowCtr: pageIntel.filter((p) => p.impressions > 100 && p.ctr < 0.02).length,
      zeroImpressions: pageIntel.filter((p) => p.indexingStatus === "indexed" && p.impressions === 0).length,
    };

    // ── Top opportunities (sorted by potential impact) ──
    const opportunities = pageIntel
      .filter((p) => p.opportunity)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        opportunity: p.opportunity,
        impressions: p.impressions,
        clicks: p.clicks,
        position: p.position,
        ctr: p.ctr,
      }));

    // ── Top performers (pages actually driving traffic) ──
    const topPerformers = pageIntel
      .filter((p) => p.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        clicks: p.clicks,
        impressions: p.impressions,
        position: p.position,
        ctr: p.ctr,
        seoScore: p.seoScore,
      }));

    // ── SEO-hurting pages (candidates for unpublish/noindex) ──
    const seoHurting = pageIntel
      .filter(
        (p) =>
          p.severity === "critical" ||
          (p.wordCount < 300 && p.impressions === 0) ||
          (p.seoScore !== null && p.seoScore < 20 && p.clicks === 0)
      )
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        wordCount: p.wordCount,
        seoScore: p.seoScore,
        issues: p.issues,
        recommendation:
          p.wordCount < 100
            ? "DELETE — empty/stub page hurting crawl budget"
            : p.wordCount < 300
              ? "NOINDEX — thin content diluting site quality"
              : p.slug === "-" || !p.slug
                ? "DELETE — bad slug, unfixable URL"
                : "UNPUBLISH — fix issues then republish",
      }));

    // ── GSC data freshness ──
    const lastGscSync = cronLogs.length > 0 ? cronLogs[0] : null;
    const gscFreshness = lastGscSync
      ? {
          lastSync: lastGscSync.started_at?.toISOString(),
          status: lastGscSync.status,
          ageHours: Math.round((Date.now() - (lastGscSync.started_at?.getTime() || 0)) / (1000 * 60 * 60)),
          isStale: (Date.now() - (lastGscSync.started_at?.getTime() || 0)) > 48 * 60 * 60 * 1000,
        }
      : { lastSync: null, status: "never", ageHours: null, isStale: true };

    // ── GA4 snapshot ──
    const trafficSnapshot = ga4
      ? {
          configured: true,
          sessions: ga4.metrics.sessions,
          users: ga4.metrics.totalUsers,
          pageViews: ga4.metrics.pageViews,
          bounceRate: ga4.metrics.bounceRate,
          avgSessionDuration: ga4.metrics.avgSessionDuration,
          topPages: ga4.topPages.slice(0, 10),
          topSources: ga4.topSources.slice(0, 10),
        }
      : { configured: false, sessions: 0, users: 0, pageViews: 0, bounceRate: 0, avgSessionDuration: 0, topPages: [], topSources: [] };

    // ── Overall health score (0-100) ──
    let healthScore = 100;
    // Deductions
    if (blockerCounts.neverSubmitted > 0) healthScore -= Math.min(20, blockerCounts.neverSubmitted * 2);
    if (blockerCounts.chronicFailure > 0) healthScore -= Math.min(15, blockerCounts.chronicFailure * 3);
    if (blockerCounts.thinContent > 0) healthScore -= Math.min(15, blockerCounts.thinContent * 3);
    if (blockerCounts.missingMeta > 0) healthScore -= Math.min(10, blockerCounts.missingMeta * 2);
    if (blockerCounts.deindexed > 0) healthScore -= Math.min(10, blockerCounts.deindexed * 5);
    if (blockerCounts.badSlugs > 0) healthScore -= Math.min(10, blockerCounts.badSlugs * 5);
    if (blockerCounts.lowSeoScore > 0) healthScore -= Math.min(10, blockerCounts.lowSeoScore * 2);
    if (gscFreshness.isStale) healthScore -= 5;
    if (!trafficSnapshot.configured) healthScore -= 5;
    healthScore = Math.max(0, healthScore);

    const healthGrade =
      healthScore >= 90 ? "A" : healthScore >= 75 ? "B" : healthScore >= 60 ? "C" : healthScore >= 40 ? "D" : "F";

    // ── Plain-language summary ──
    const summaryParts: string[] = [];
    if (indexing) {
      summaryParts.push(`${indexing.indexed} of ${indexing.total} pages indexed (${indexing.rate.toFixed(0)}%)`);
    }
    if (trafficSnapshot.sessions > 0) {
      summaryParts.push(`${trafficSnapshot.sessions} sessions in last ${days} days`);
    }
    if (blockerCounts.neverSubmitted > 0) {
      summaryParts.push(`${blockerCounts.neverSubmitted} pages never submitted to Google`);
    }
    if (blockerCounts.thinContent > 0) {
      summaryParts.push(`${blockerCounts.thinContent} pages with thin content (<300 words)`);
    }
    if (opportunities.length > 0) {
      summaryParts.push(`${opportunities.length} quick-win opportunities found`);
    }
    if (seoHurting.length > 0) {
      summaryParts.push(`${seoHurting.length} pages hurting your SEO`);
    }

    return NextResponse.json({
      success: true,
      siteId,
      domain,
      period,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - start,

      // ── Health ──
      health: {
        score: healthScore,
        grade: healthGrade,
        summary: summaryParts.join(". ") + ".",
      },

      // ── Indexing (from unified source) ──
      indexing: indexing
        ? {
            total: indexing.total,
            indexed: indexing.indexed,
            submitted: indexing.submitted,
            discovered: indexing.discovered,
            neverSubmitted: indexing.neverSubmitted,
            errors: indexing.errors,
            deindexed: indexing.deindexed,
            chronicFailures: indexing.chronicFailures,
            rate: indexing.rate,
            velocity7d: indexing.velocity7d,
            staleCount: indexing.staleCount,
            topBlocker: indexing.topBlocker,
            blockers: indexing.blockers,
          }
        : null,

      // ── Traffic (GA4) ──
      traffic: trafficSnapshot,

      // ── GSC data freshness ──
      gscFreshness,

      // ── Blockers (aggregated cross-source) ──
      blockers: blockerCounts,

      // ── Top opportunities ──
      opportunities,

      // ── Top performers ──
      topPerformers,

      // ── SEO-hurting pages ──
      seoHurting,

      // ── Critical pages (severity = critical) ──
      criticalPages: pageIntel.filter((p) => p.severity === "critical").map((p) => ({
        slug: p.slug,
        title: p.title,
        issues: p.issues,
        wordCount: p.wordCount,
        seoScore: p.seoScore,
        indexingStatus: p.indexingStatus,
      })),

      // ── All pages (for detailed view) ──
      allPages: pageIntel.map((p) => ({
        slug: p.slug,
        title: p.title,
        wordCount: p.wordCount,
        seoScore: p.seoScore,
        indexingStatus: p.indexingStatus,
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        position: p.position,
        issues: p.issues,
        opportunity: p.opportunity,
        severity: p.severity,
      })),

      // ── Data sources status ──
      dataSources: {
        ga4: trafficSnapshot.configured ? "connected" : "not_configured",
        gsc: gscFreshness.isStale ? "stale" : gscFreshness.lastSync ? "connected" : "not_configured",
        indexing: indexing ? "connected" : "error",
        database: "connected",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
