export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-middleware";
import { getSiteConfig } from "@/config/sites";

/**
 * GET /api/admin/sites/[siteId]/health
 *
 * Returns the latest health check data for a specific site.
 * Includes SEO health, GSC performance, GA4 traffic, content stats,
 * and automation health from the SiteHealthCheck table.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const authError = await requireAdminOrCron(request);
  if (authError) return authError;

  try {
    const { siteId } = await params;
    const siteConfig = getSiteConfig(siteId);

    if (!siteConfig) {
      return NextResponse.json(
        { error: `Unknown site: ${siteId}` },
        { status: 404 },
      );
    }

    const { prisma } = await import("@/lib/db");

    // Get latest health check
    const latestHealth = await (prisma as any).siteHealthCheck.findFirst({
      where: { site_id: siteId },
      orderBy: { checked_at: "desc" },
    });

    // Get cron job stats for this site (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cronStats = await (prisma as any).cronJobLog.groupBy({
      by: ["status"],
      where: {
        site_id: siteId,
        started_at: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    const cronStatusMap = new Map(
      cronStats.map((c: any) => [c.status, c._count]),
    );

    // Get indexing status for this site
    const indexingCounts = await (prisma as any).uRLIndexingStatus.groupBy({
      by: ["status"],
      where: { site_id: siteId },
      _count: true,
    });

    const indexMap = new Map(
      indexingCounts.map((c: any) => [c.status, c._count]),
    );
    const totalUrls = indexingCounts.reduce(
      (sum: number, c: any) => sum + c._count,
      0,
    );
    const indexed = (indexMap.get("indexed") as number) ?? 0;

    // Get blog post counts for this site
    // Note: siteId column exists in Prisma schema but not yet migrated to DB.
    // Fall back to global counts until migration is run.
    let totalPosts = 0;
    let publishedPosts = 0;
    try {
      [totalPosts, publishedPosts] = await Promise.all([
        prisma.blogPost.count({
          where: { siteId, deletedAt: null },
        }),
        prisma.blogPost.count({
          where: { siteId, published: true, deletedAt: null },
        }),
      ]);
    } catch {
      // siteId column doesn't exist yet — fall back to global counts
      [totalPosts, publishedPosts] = await Promise.all([
        prisma.blogPost.count({
          where: { deletedAt: null },
        }),
        prisma.blogPost.count({
          where: { published: true, deletedAt: null },
        }),
      ]);
    }

    // Determine health status
    const healthScore = latestHealth?.health_score ?? null;
    const failures7d = (cronStatusMap.get("failed") as number) ?? 0;
    let status: "healthy" | "degraded" | "down" | "unknown" = "unknown";

    if (healthScore !== null) {
      if (healthScore >= 70 && failures7d === 0) status = "healthy";
      else if (healthScore >= 40 || failures7d <= 2) status = "degraded";
      else status = "down";
    }

    return NextResponse.json({
      siteId,
      siteName: siteConfig.name,
      domain: siteConfig.domain,
      status,
      healthScore,
      checkedAt: latestHealth?.checked_at ?? null,
      seo: latestHealth
        ? {
            indexed_pages: latestHealth.indexed_pages,
            total_pages: latestHealth.total_pages,
            indexing_rate: latestHealth.indexing_rate,
          }
        : null,
      gsc: latestHealth
        ? {
            clicks: latestHealth.gsc_clicks,
            impressions: latestHealth.gsc_impressions,
            ctr: latestHealth.gsc_ctr,
            avgPosition: latestHealth.gsc_avg_position,
          }
        : null,
      ga4: latestHealth
        ? {
            sessions: latestHealth.ga4_sessions,
            bounceRate: latestHealth.ga4_bounce_rate,
            engagementRate: latestHealth.ga4_engagement_rate,
            organicShare: latestHealth.ga4_organic_share,
          }
        : null,
      content: {
        totalPosts,
        publishedPosts,
        avgSeoScore: latestHealth?.avg_seo_score ?? null,
        pendingProposals: latestHealth?.pending_proposals ?? null,
      },
      automation: latestHealth
        ? {
            lastAgentRun: latestHealth.last_agent_run,
            lastContentGen: latestHealth.last_content_gen,
            rewriteQueue: latestHealth.rewrite_queue,
          }
        : null,
      indexing: {
        totalUrls,
        indexed,
        submitted: (indexMap.get("submitted") as number) ?? 0,
        discovered: (indexMap.get("discovered") as number) ?? 0,
        errors: (indexMap.get("error") as number) ?? 0,
        indexRate: totalUrls > 0 ? Math.round((indexed / totalUrls) * 100) : 0,
      },
      crons7d: {
        completed: (cronStatusMap.get("completed") as number) ?? 0,
        failed: failures7d,
        timedOut: (cronStatusMap.get("timed_out") as number) ?? 0,
      },
      pagespeed: latestHealth
        ? {
            mobile: latestHealth.pagespeed_mobile,
            desktop: latestHealth.pagespeed_desktop,
          }
        : null,
    });
  } catch (error) {
    console.error("[Site Health] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch site health" },
      { status: 500 },
    );
  }
}

export const POST = GET;
