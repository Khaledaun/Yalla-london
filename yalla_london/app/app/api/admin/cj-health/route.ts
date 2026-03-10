/**
 * CJ Affiliate Health API
 *
 * Returns comprehensive CJ integration health data:
 * - API connectivity and credential status
 * - Last sync timestamps per sync type
 * - Advertiser/link/commission counts
 * - Feature flag states
 * - Circuit breaker state
 * - Error counts from recent syncs
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-middleware");
  await requireAdmin(request);

  try {
    const { prisma } = await import("@/lib/db");
    const { isCjConfigured, CJ_NETWORK_ID, getWebsiteId, getCircuitBreakerState } = await import(
      "@/lib/affiliate/cj-client"
    );

    const siteId =
      request.nextUrl.searchParams.get("siteId") ||
      request.headers.get("x-site-id") ||
      undefined;

    // 1. Credential check
    const configured = isCjConfigured();
    const websiteId = getWebsiteId();
    const circuitBreaker = getCircuitBreakerState();

    // 2. Advertiser counts
    const [joinedCount, pendingCount, declinedCount, totalLinks, activeLinks] =
      await Promise.all([
        prisma.cjAdvertiser.count({
          where: { networkId: CJ_NETWORK_ID, status: "JOINED" },
        }),
        prisma.cjAdvertiser.count({
          where: { networkId: CJ_NETWORK_ID, status: "PENDING" },
        }),
        prisma.cjAdvertiser.count({
          where: { networkId: CJ_NETWORK_ID, status: "DECLINED" },
        }),
        prisma.cjLink.count({
          where: { advertiser: { networkId: CJ_NETWORK_ID } },
        }),
        prisma.cjLink.count({
          where: { advertiser: { networkId: CJ_NETWORK_ID }, isActive: true },
        }),
      ]);

    // 3. Commission totals (30d)
    const d30 = new Date(Date.now() - 30 * 86400_000);
    const commissions30d = await prisma.cjCommission.aggregate({
      where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d30 } },
      _sum: { commissionAmount: true },
      _count: true,
    });

    // 4. Last sync times per type
    const syncTypes = ["ADVERTISERS", "LINKS", "PRODUCTS", "COMMISSIONS", "DEALS"] as const;
    const lastSyncs: Record<string, { time: Date | null; status: string; errors: number }> = {};

    for (const syncType of syncTypes) {
      const lastSync = await prisma.cjSyncLog.findFirst({
        where: { networkId: CJ_NETWORK_ID, syncType },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, status: true, errors: true },
      });
      lastSyncs[syncType] = {
        time: lastSync?.createdAt || null,
        status: lastSync?.status || "NEVER",
        errors: Array.isArray(lastSync?.errors) ? (lastSync.errors as string[]).length : 0,
      };
    }

    // 5. Recent errors (last 24h)
    const d24h = new Date(Date.now() - 24 * 3600_000);
    const recentErrors = await prisma.cjSyncLog.findMany({
      where: {
        networkId: CJ_NETWORK_ID,
        createdAt: { gte: d24h },
        status: { in: ["FAILED", "PARTIAL"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { syncType: true, status: true, errors: true, createdAt: true },
    });

    // 6. Feature flags
    let featureFlags: Record<string, boolean> = {};
    try {
      const flags = await prisma.featureFlag.findMany({
        where: { name: { startsWith: "FEATURE_AFFILIATE" } },
        select: { name: true, enabled: true },
      });
      featureFlags = Object.fromEntries(flags.map((f) => [f.name, f.enabled]));
    } catch {
      // Feature flags table may not exist yet
    }

    // 7. Click activity (7d)
    const d7 = new Date(Date.now() - 7 * 86400_000);
    const clicks7d = await prisma.cjClickEvent.count({
      where: { createdAt: { gte: d7 } },
    });

    // 8. Content coverage
    let coveragePercent = 0;
    try {
      const { getDefaultSiteId } = await import("@/config/sites");
      const targetSiteId = siteId || getDefaultSiteId();
      const totalArticles = await prisma.blogPost.count({
        where: { published: true, deletedAt: null, siteId: targetSiteId },
      });
      if (totalArticles > 0) {
        // Count articles with affiliate markers
        const articlesWithAffiliates = await prisma.blogPost.count({
          where: {
            published: true,
            deletedAt: null,
            siteId: targetSiteId,
            OR: [
              { content_en: { contains: 'rel="sponsored' } },
              { content_en: { contains: "affiliate-recommendation" } },
              { content_en: { contains: 'rel="noopener sponsored"' } },
              { content_en: { contains: "data-affiliate-id" } },
            ],
          },
        });
        coveragePercent = Math.round((articlesWithAffiliates / totalArticles) * 100);
      }
    } catch (err) {
      console.warn("[cj-health] Coverage check failed:", err instanceof Error ? err.message : String(err));
    }

    // Compute overall health status
    const isHealthy =
      configured &&
      !circuitBreaker.isOpen &&
      joinedCount > 0 &&
      recentErrors.length === 0;
    const isWarning =
      configured && (circuitBreaker.isOpen || recentErrors.length > 0 || pendingCount > 0);

    return NextResponse.json({
      status: isHealthy ? "healthy" : isWarning ? "warning" : "critical",
      credentials: {
        apiTokenConfigured: configured,
        websiteIdConfigured: !!websiteId,
        websiteId: websiteId || null,
      },
      circuitBreaker,
      advertisers: {
        joined: joinedCount,
        pending: pendingCount,
        declined: declinedCount,
        total: joinedCount + pendingCount + declinedCount,
      },
      links: {
        total: totalLinks,
        active: activeLinks,
      },
      commissions: {
        last30Days: {
          total: commissions30d._sum.commissionAmount || 0,
          count: commissions30d._count || 0,
        },
      },
      clicks: {
        last7Days: clicks7d,
      },
      coverage: {
        percent: coveragePercent,
      },
      lastSyncs,
      recentErrors: recentErrors.map((e) => ({
        syncType: e.syncType,
        status: e.status,
        errors: e.errors,
        time: e.createdAt,
      })),
      featureFlags,
    });
  } catch (error) {
    console.error("[cj-health] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to check CJ health" },
      { status: 500 }
    );
  }
}
