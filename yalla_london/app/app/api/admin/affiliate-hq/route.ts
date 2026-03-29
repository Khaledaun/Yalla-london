/**
 * Affiliate HQ — Unified Dashboard API
 *
 * GET  — Returns aggregated data for all 5 dashboard tabs in a single request.
 *        Accepts ?siteId=<id>&networkId=<id> for filtering.
 *        Each section is independently resilient — if CJ tables don't exist yet,
 *        the page still loads with empty defaults.
 * POST — Actions: sync_advertisers, sync_commissions, inject_links, refresh_deals,
 *         toggle_flag, test_connection, search_products
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

// Default empty objects for each tab — returned when CJ tables don't exist or queries fail
const EMPTY_REVENUE = {
  total30d: 0, total7d: 0, count30d: 0, trendPercent: 0, clicks7d: 0,
  topAdvertisers: [] as Array<{ name: string; commission: number }>,
  topArticlesByClicks: [] as Array<{ url: string; clicks: number }>,
};

const EMPTY_LINKS = {
  total: 0, active: 0, inactive: 0,
  byType: {} as Record<string, number>,
  recentDeals: [] as Array<{ id: string; title: string; advertiser: string; price: number | null; previousPrice: number | null; isPriceDrop: boolean; isNewArrival: boolean; category: string; validTo: Date | null }>,
  linksList: [] as Array<{
    id: string; name: string; advertiser: string; category: string | null;
    destinationUrl: string; affiliateUrl: string; linkType: string; isActive: boolean;
    clicks: number; impressions: number; ctr: number; revenue: number; sales: number;
    pages: Array<{ url: string; clicks: number }>;
    lastClickAt: Date | null;
  }>,
};

const EMPTY_SYSTEM_HEALTH = {
  circuitBreaker: { failures: 0, isOpen: false, openedAt: 0 },
  syncHistory: [] as Array<{ id: string; type: string; status: string; processed: number; created: number; updated: number; errors: string[] | null; durationMs: number; time: Date }>,
  featureFlags: [] as Array<{ name: string; enabled: boolean }>,
  credentials: { apiTokenConfigured: false, websiteIdConfigured: false },
};

export async function GET(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-middleware");
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const { CJ_NETWORK_ID, isCjConfigured, getWebsiteId, getCircuitBreakerState } = await import(
    "@/lib/affiliate/cj-client"
  );
  const { getDefaultSiteId } = await import("@/config/sites");

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const start = Date.now();
  const errors: string[] = [];

  // ── Tab 1: Revenue Dashboard ──
  let revenue = EMPTY_REVENUE;
  try {
    const d7 = new Date(Date.now() - 7 * 86400_000);
    const d30 = new Date(Date.now() - 30 * 86400_000);
    const d60 = new Date(Date.now() - 60 * 86400_000);

    // siteId filter: include records scoped to this site OR unscoped (null siteId = legacy/unattributed)
    const siteFilter = siteId ? { OR: [{ siteId }, { siteId: null }] } : {};

    const [commissions30d, commissionsPrev30d, commissions7d] = await Promise.all([
      prisma.cjCommission.aggregate({
        where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d30 }, ...siteFilter },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      prisma.cjCommission.aggregate({
        where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d60, lt: d30 }, ...siteFilter },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      prisma.cjCommission.aggregate({
        where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d7 }, ...siteFilter },
        _sum: { commissionAmount: true },
        _count: true,
      }),
    ]);

    const rev30 = commissions30d._sum.commissionAmount || 0;
    const revPrev30 = commissionsPrev30d._sum.commissionAmount || 0;
    const revTrend = revPrev30 > 0 ? ((rev30 - revPrev30) / revPrev30) * 100 : 0;

    const clickSiteFilter = siteId ? { OR: [{ siteId }, { siteId: null }] } : {};
    const clicks7d = await prisma.cjClickEvent.count({
      where: { createdAt: { gte: d7 }, ...clickSiteFilter },
    });

    const topAdvertisers = await prisma.cjCommission.groupBy({
      by: ["advertiserId"],
      where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d30 }, ...siteFilter },
      _sum: { commissionAmount: true },
      orderBy: { _sum: { commissionAmount: "desc" } },
      take: 10,
    });

    const advIds = topAdvertisers.map((a) => a.advertiserId);
    const advNames = advIds.length > 0
      ? await prisma.cjAdvertiser.findMany({ where: { id: { in: advIds } }, select: { id: true, name: true } })
      : [];
    const nameMap = new Map(advNames.map((a: { id: string; name: string }) => [a.id, a.name]));

    const topClicks = await prisma.cjClickEvent.groupBy({
      by: ["pageUrl"],
      where: { createdAt: { gte: d30 }, ...clickSiteFilter },
      _count: true,
      orderBy: { _count: { pageUrl: "desc" } },
      take: 10,
    });

    revenue = {
      total30d: rev30,
      total7d: commissions7d._sum.commissionAmount || 0,
      count30d: commissions30d._count || 0,
      trendPercent: Math.round(revTrend),
      clicks7d,
      topAdvertisers: topAdvertisers.map((a) => ({
        name: nameMap.get(a.advertiserId) || "Unknown",
        commission: a._sum.commissionAmount || 0,
      })),
      topArticlesByClicks: topClicks.map((c) => ({
        url: c.pageUrl,
        clicks: c._count,
      })),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[affiliate-hq] Revenue section failed:", msg);
    errors.push(`Revenue: ${msg}`);
  }

  // ── Tab 2: Partners (Advertisers) ──
  const tpMarker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || process.env.TRAVELPAYOUTS_MARKER || "";
  const tpConfigured = !!tpMarker;
  let partners = {
    networks: [
      {
        id: "cj",
        name: "CJ Affiliate",
        status: isCjConfigured() ? "active" : "unconfigured",
        apiHealth: getCircuitBreakerState().isOpen ? "red" : isCjConfigured() ? "green" : "gray",
        advertisers: 0,
        websiteId: getWebsiteId() || null,
      },
      {
        id: "travelpayouts",
        name: "Travelpayouts",
        status: tpConfigured ? "active" : "unconfigured",
        apiHealth: tpConfigured ? "green" : "gray",
        advertisers: tpConfigured ? 3 : 0,
        marker: tpMarker || null,
        programs: tpConfigured ? [
          { name: "Welcome Pickups", commission: "8-9%", cookie: "45d", category: "Transport" },
          { name: "Tiqets", commission: "3.5-8%", cookie: "30d", category: "Attractions" },
          { name: "TicketNetwork", commission: "6-12.5%", cookie: "45d", category: "Events" },
        ] : [],
      },
    ],
    advertisers: [] as Array<{
      id: string; externalId: string; name: string; status: string;
      category: string | null; sevenDayEpc: number | null; threeMonthEpc: number | null;
      cookieDuration: number | null; priority: string; lastSynced: Date | null;
    }>,
  };
  try {
    const advertisers = await prisma.cjAdvertiser.findMany({
      where: { networkId: CJ_NETWORK_ID },
      orderBy: { threeMonthEpc: "desc" },
      select: {
        id: true, externalId: true, name: true, status: true, category: true,
        sevenDayEpc: true, threeMonthEpc: true, cookieDuration: true, priority: true, lastSynced: true,
      },
    });
    partners.networks[0].advertisers = advertisers.length;
    partners.advertisers = advertisers.map((a) => ({
      id: a.id, externalId: a.externalId, name: a.name, status: a.status,
      category: a.category, sevenDayEpc: a.sevenDayEpc, threeMonthEpc: a.threeMonthEpc,
      cookieDuration: a.cookieDuration, priority: a.priority, lastSynced: a.lastSynced,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[affiliate-hq] Partners section failed:", msg);
    errors.push(`Partners: ${msg}`);
  }

  // ── Tab 3: Content Coverage — Per-Page Performance ──
  let coverage = {
    totalArticles: 0, withAffiliates: 0, withoutAffiliates: 0, coveragePercent: 0,
    uncoveredArticles: [] as Array<{ id: string; title: string; slug: string; createdAt: Date }>,
    pages: [] as Array<{
      id: string; title: string; slug: string; publishedAt: Date | null;
      hasAffiliateLinks: boolean; linkCount: number; affiliateClicks: number;
      revenue: number; sales: number; advertisers: string[];
    }>,
  };
  try {
    // Get all published articles with content for link counting
    const allArticles = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null, ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}) },
      select: {
        id: true, title_en: true, slug: true, content_en: true,
        created_at: true, siteId: true,
      },
      orderBy: { created_at: "desc" },
      take: 200,
    });

    // Get all click events grouped by pageUrl
    const clickEvents = await prisma.cjClickEvent.findMany({
      where: siteId ? { OR: [{ siteId }, { siteId: null }] } : {},
      select: { pageUrl: true, linkId: true },
    });

    // Build page→clicks map and page→linkIds map
    const pageClickMap = new Map<string, number>();
    const pageLinkIdsMap = new Map<string, Set<string>>();
    for (const ev of clickEvents) {
      const slug = ev.pageUrl.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "").replace(/^\/blog\//, "");
      pageClickMap.set(slug, (pageClickMap.get(slug) || 0) + 1);
      if (!pageLinkIdsMap.has(slug)) pageLinkIdsMap.set(slug, new Set<string>());
      pageLinkIdsMap.get(slug)!.add(ev.linkId);
    }

    // Get commissions grouped by link for revenue attribution
    const commissions = await prisma.cjCommission.findMany({
      where: {
        status: { in: ["APPROVED", "LOCKED"] },
        ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}),
      },
      select: { linkId: true, commissionAmount: true, saleAmount: true },
    });
    const linkRevenueMap = new Map<string, { revenue: number; sales: number }>();
    for (const c of commissions) {
      if (!c.linkId) continue;
      const existing = linkRevenueMap.get(c.linkId) || { revenue: 0, sales: 0 };
      existing.revenue += c.commissionAmount;
      existing.sales += 1;
      linkRevenueMap.set(c.linkId, existing);
    }

    // Get CjLink advertiser names for display
    const cjLinks = await prisma.cjLink.findMany({
      where: { advertiser: { networkId: CJ_NETWORK_ID } },
      select: { id: true, advertiser: { select: { name: true } } },
    });
    const linkAdvertiserMap = new Map<string, string>();
    for (const l of cjLinks) linkAdvertiserMap.set(l.id, l.advertiser.name);

    const affiliatePatterns = ['rel="sponsored', "affiliate-cta-block", "affiliate-recommendation", 'rel="noopener sponsored"'];

    let withAffiliatesCount = 0;
    const uncoveredArticles: Array<{ id: string; title: string; slug: string; createdAt: Date }> = [];

    const pages = allArticles.map((article) => {
      const content = article.content_en || "";
      const hasAffiliateLinks = affiliatePatterns.some((p) => content.includes(p));
      if (hasAffiliateLinks) withAffiliatesCount++;
      else uncoveredArticles.push({ id: article.id, title: article.title_en, slug: article.slug, createdAt: article.created_at });

      // Count affiliate links in content (approximate by counting rel="sponsored" occurrences)
      const linkMatches = content.match(/rel="(noopener )?sponsored"/g);
      const ctaBlocks = content.match(/affiliate-cta-block|affiliate-recommendation/g);
      const linkCount = (linkMatches?.length || 0) + (ctaBlocks?.length || 0);

      // Clicks for this page
      const affiliateClicks = pageClickMap.get(article.slug) || 0;

      // Revenue from links clicked on this page
      const clickedLinkIds = pageLinkIdsMap.get(article.slug);
      let revenue = 0;
      let sales = 0;
      const advertiserNames = new Set<string>();
      if (clickedLinkIds) {
        for (const lid of clickedLinkIds) {
          const rev = linkRevenueMap.get(lid);
          if (rev) { revenue += rev.revenue; sales += rev.sales; }
          const advName = linkAdvertiserMap.get(lid);
          if (advName) advertiserNames.add(advName);
        }
      }

      return {
        id: article.id,
        title: article.title_en,
        slug: article.slug,
        publishedAt: article.created_at,
        hasAffiliateLinks,
        linkCount,
        affiliateClicks,
        revenue: Math.round(revenue * 100) / 100,
        sales,
        advertisers: [...advertiserNames],
      };
    });

    const totalPublished = allArticles.length;
    coverage = {
      totalArticles: totalPublished,
      withAffiliates: withAffiliatesCount,
      withoutAffiliates: totalPublished - withAffiliatesCount,
      coveragePercent: totalPublished > 0 ? Math.round((withAffiliatesCount / totalPublished) * 100) : 0,
      uncoveredArticles: uncoveredArticles.slice(0, 15),
      pages,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[affiliate-hq] Coverage section failed:", msg);
    errors.push(`Coverage: ${msg}`);
  }

  // ── Tab 4: Links & Offers ──
  let links = EMPTY_LINKS;
  try {
    const [totalLinksCount, activeLinksCount, linksByType] = await Promise.all([
      prisma.cjLink.count({ where: { advertiser: { networkId: CJ_NETWORK_ID } } }),
      prisma.cjLink.count({ where: { advertiser: { networkId: CJ_NETWORK_ID }, isActive: true } }),
      prisma.cjLink.groupBy({
        by: ["linkType"],
        where: { advertiser: { networkId: CJ_NETWORK_ID } },
        _count: true,
      }),
    ]);

    const offerSiteFilter = siteId ? { OR: [{ siteId }, { siteId: null }] } : {};
    const recentDeals = await prisma.cjOffer.findMany({
      where: { networkId: CJ_NETWORK_ID, isActive: true, ...offerSiteFilter },
      include: { advertiser: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    // Fetch detailed link list with advertiser info + click/revenue aggregation
    const allLinks = await prisma.cjLink.findMany({
      where: { advertiser: { networkId: CJ_NETWORK_ID } },
      include: {
        advertiser: { select: { name: true, category: true } },
        clickEvents: {
          select: { pageUrl: true },
          take: 200,
        },
        commissions: {
          select: { commissionAmount: true, saleAmount: true, status: true },
        },
      },
      orderBy: { clicks: "desc" },
      take: 100,
    });

    const linksList = allLinks.map((link) => {
      // Aggregate clicks per page from CjClickEvent
      const pageCounts = new Map<string, number>();
      for (const ev of link.clickEvents) {
        const clean = ev.pageUrl.replace(/\?.*$/, ""); // strip query params
        pageCounts.set(clean, (pageCounts.get(clean) || 0) + 1);
      }
      const pages = [...pageCounts.entries()]
        .map(([url, clicks]) => ({ url, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      // Revenue & sales from commissions (only APPROVED/LOCKED count)
      const approvedCommissions = link.commissions.filter(
        (c) => c.status === "APPROVED" || c.status === "LOCKED"
      );
      const revenue = approvedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
      const sales = approvedCommissions.length;
      const ctr = link.impressions > 0 ? (link.clicks / link.impressions) * 100 : 0;

      return {
        id: link.id,
        name: link.name,
        advertiser: link.advertiser.name,
        category: link.category || link.advertiser.category,
        destinationUrl: link.destinationUrl,
        affiliateUrl: link.affiliateUrl,
        linkType: link.linkType,
        isActive: link.isActive,
        clicks: link.clicks,
        impressions: link.impressions,
        ctr: Math.round(ctr * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        sales,
        pages,
        lastClickAt: link.lastClickAt,
        createdAt: link.createdAt,
      };
    });

    links = {
      total: totalLinksCount,
      active: activeLinksCount,
      inactive: totalLinksCount - activeLinksCount,
      byType: Object.fromEntries(linksByType.map((l) => [l.linkType, l._count])),
      recentDeals: recentDeals.map((d) => ({
        id: d.id, title: d.title, advertiser: d.advertiser.name,
        price: d.price, previousPrice: d.previousPrice, isPriceDrop: d.isPriceDropped,
        isNewArrival: d.isNewArrival, category: d.category, validTo: d.validTo,
      })),
      linksList,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[affiliate-hq] Links section failed:", msg);
    errors.push(`Links: ${msg}`);
  }

  // ── Tab 5: System Health ──
  let systemHealth = {
    ...EMPTY_SYSTEM_HEALTH,
    circuitBreaker: getCircuitBreakerState(),
    credentials: {
      apiTokenConfigured: isCjConfigured(),
      websiteIdConfigured: !!getWebsiteId(),
    },
  };
  try {
    const syncLogs = await prisma.cjSyncLog.findMany({
      where: { networkId: CJ_NETWORK_ID },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, syncType: true, status: true, recordsProcessed: true,
        recordsCreated: true, recordsUpdated: true, errors: true, duration: true, createdAt: true,
      },
    });

    let featureFlags: Array<{ name: string; enabled: boolean }> = [];
    try {
      featureFlags = await prisma.featureFlag.findMany({
        where: { name: { startsWith: "FEATURE_AFFILIATE" } },
        select: { name: true, enabled: true },
        orderBy: { name: "asc" },
      });
    } catch {
      // Feature flags table may not exist yet
    }

    systemHealth = {
      circuitBreaker: getCircuitBreakerState(),
      syncHistory: syncLogs.map((s) => ({
        id: s.id, type: s.syncType, status: s.status, processed: s.recordsProcessed,
        created: s.recordsCreated, updated: s.recordsUpdated, errors: s.errors,
        durationMs: s.duration, time: s.createdAt,
      })),
      featureFlags,
      credentials: {
        apiTokenConfigured: isCjConfigured(),
        websiteIdConfigured: !!getWebsiteId(),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[affiliate-hq] System health section failed:", msg);
    errors.push(`SystemHealth: ${msg}`);
  }

  return NextResponse.json({
    success: true,
    siteId,
    revenue,
    partners,
    coverage,
    links,
    systemHealth,
    ...(errors.length > 0 ? { warnings: errors } : {}),
    durationMs: Date.now() - start,
  });
}

export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-middleware");
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "sync_advertisers": {
        // Call checkPendingAdvertisers directly — avoids internal HTTP fetch chain
        // that caused 504 timeouts due to serverless function nesting
        try {
          const { isCjConfigured } = await import("@/lib/affiliate/cj-client");
          if (!isCjConfigured()) {
            return NextResponse.json({
              success: false, action,
              result: { error: "CJ_API_TOKEN not configured. Set CJ_API_TOKEN, CJ_WEBSITE_ID, CJ_PUBLISHER_CID in Vercel env vars." },
            });
          }

          const BUDGET_MS = 50_000;
          const { checkPendingAdvertisers } = await import("@/lib/affiliate/cj-sync");
          const result = await checkPendingAdvertisers(BUDGET_MS);

          const { logCronExecution } = await import("@/lib/cron-logger");
          await logCronExecution("affiliate-sync-advertisers", "completed", {
            durationMs: Date.now() - Date.now(),
            itemsProcessed: result.checked,
            resultSummary: result as unknown as Record<string, unknown>,
          }).catch((err: Error) => console.warn("[affiliate-hq] log failed:", err.message));

          return NextResponse.json({ success: true, action, result });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("[affiliate-hq] sync_advertisers failed:", errMsg);
          return NextResponse.json({
            success: false, action,
            result: { error: `CJ sync failed: ${errMsg.substring(0, 500)}` },
          });
        }
      }

      case "sync_commissions": {
        const origin = request.nextUrl.origin;
        const cronSecret = process.env.CRON_SECRET;
        const headers: Record<string, string> = {};
        if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

        const res = await fetch(`${origin}/api/affiliate/cron/sync-commissions`, {
          method: "POST",
          headers,
        });
        const data = res.ok ? await res.json() : { error: `HTTP ${res.status}` };
        return NextResponse.json({ success: true, action, result: data });
      }

      case "refresh_deals": {
        const origin = request.nextUrl.origin;
        const cronSecret = process.env.CRON_SECRET;
        const headers: Record<string, string> = {};
        if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

        const res = await fetch(`${origin}/api/affiliate/cron/discover-deals`, {
          method: "POST",
          headers,
        });
        const data = res.ok ? await res.json() : { error: `HTTP ${res.status}` };
        return NextResponse.json({ success: true, action, result: data });
      }

      case "refresh_links": {
        const origin = request.nextUrl.origin;
        const cronSecret = process.env.CRON_SECRET;
        const headers: Record<string, string> = {};
        if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

        const res = await fetch(`${origin}/api/affiliate/cron/refresh-links`, {
          method: "POST",
          headers,
        });
        const data = res.ok ? await res.json() : { error: `HTTP ${res.status}` };
        return NextResponse.json({ success: true, action, result: data });
      }

      case "test_connection": {
        const { isCjConfigured, getCircuitBreakerState } = await import("@/lib/affiliate/cj-client");
        return NextResponse.json({
          success: true,
          action,
          result: {
            configured: isCjConfigured(),
            circuitBreaker: getCircuitBreakerState(),
          },
        });
      }

      case "reset_circuit_breaker": {
        const { resetCircuitBreaker, getCircuitBreakerState: getCBState } = await import("@/lib/affiliate/cj-client");
        resetCircuitBreaker();
        return NextResponse.json({
          success: true,
          action,
          result: {
            message: "Circuit breaker reset — you can now retry sync",
            circuitBreaker: getCBState(),
          },
        });
      }

      case "toggle_flag": {
        const { prisma } = await import("@/lib/db");
        const { flagName, enabled } = body;
        if (!flagName) {
          return NextResponse.json({ success: false, error: "flagName required" }, { status: 400 });
        }
        await prisma.featureFlag.upsert({
          where: { name: flagName },
          create: { name: flagName, enabled: !!enabled, description: `Affiliate flag: ${flagName}` },
          update: { enabled: !!enabled },
        });
        return NextResponse.json({ success: true, action, flagName, enabled: !!enabled });
      }

      case "inject_links": {
        const origin = request.nextUrl.origin;
        const cronSecret = process.env.CRON_SECRET;
        const headers: Record<string, string> = {};
        if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

        const res = await fetch(`${origin}/api/cron/affiliate-injection`, {
          method: "POST",
          headers,
        });
        const data = res.ok ? await res.json() : { error: `HTTP ${res.status}` };
        return NextResponse.json({ success: true, action, result: data });
      }

      case "search_products": {
        const { searchProducts } = await import("@/lib/affiliate/cj-client");
        const { keywords: searchKeywords, advertiserId: searchAdvId } = body;
        const results = await searchProducts({
          keywords: searchKeywords || "hotel",
          advertiserIds: searchAdvId ? [searchAdvId] : undefined,
          recordsPerPage: 20,
        });
        return NextResponse.json({
          success: true,
          action,
          result: {
            total: results.totalMatched,
            returned: results.recordsReturned,
            products: results.records.map((r) => ({
              name: r.name,
              price: r.price,
              salePrice: r.salePrice,
              advertiser: r.advertiserName,
              imageUrl: r.imageUrl,
              buyUrl: r.buyUrl,
            })),
          },
        });
      }

      case "run_health_check": {
        const origin2 = request.nextUrl.origin;
        const res2 = await fetch(`${origin2}/api/admin/cj-health`, {
          headers: { cookie: request.headers.get("cookie") || "" },
        });
        if (!res2.ok) return NextResponse.json({ success: false, error: `Health check returned ${res2.status}` });
        const healthData = await res2.json();
        return NextResponse.json({ success: true, action, result: healthData });
      }

      case "full_sync": {
        const origin3 = request.nextUrl.origin;
        const cs = process.env.CRON_SECRET;
        const h: Record<string, string> = {};
        if (cs) h["Authorization"] = `Bearer ${cs}`;

        const syncResults: Record<string, unknown> = {};
        const steps = [
          { name: "advertisers", path: "/api/affiliate/cron/sync-advertisers" },
          { name: "commissions", path: "/api/affiliate/cron/sync-commissions" },
          { name: "deals", path: "/api/affiliate/cron/discover-deals" },
          { name: "links", path: "/api/affiliate/cron/refresh-links" },
        ];
        for (const step of steps) {
          try {
            const sr = await fetch(`${origin3}${step.path}`, { method: "POST", headers: h });
            syncResults[step.name] = sr.ok ? await sr.json() : { error: `HTTP ${sr.status}` };
          } catch (e) {
            syncResults[step.name] = { error: e instanceof Error ? e.message : "failed" };
          }
        }
        return NextResponse.json({ success: true, action, result: syncResults });
      }

      case "diagnose": {
        const { prisma: diagPrisma } = await import("@/lib/db");
        const { getCircuitBreakerState: getCb } = await import("@/lib/affiliate/cj-client");
        const { getDefaultSiteId: getDefSite } = await import("@/config/sites");
        const defSite = getDefSite();

        const cb = getCb();
        const issues: Array<{ severity: string; issue: string; fix: string }> = [];

        if (cb.isOpen) {
          issues.push({ severity: "critical", issue: "Circuit breaker is OPEN — CJ API calls are blocked", fix: "Wait for 5-min cooldown or check CJ API status" });
        }
        if (!process.env.CJ_API_TOKEN) issues.push({ severity: "critical", issue: "CJ_API_TOKEN not configured", fix: "Add CJ_API_TOKEN to Vercel env vars" });
        if (!process.env.CJ_WEBSITE_ID) issues.push({ severity: "high", issue: "CJ_WEBSITE_ID not set — link/product searches may return wrong results", fix: "Add CJ_WEBSITE_ID=101702529 to Vercel env vars" });

        // Sync checks — wrapped individually so missing CJ tables don't crash diagnose
        try {
          const lastAdvSync = await diagPrisma.cjSyncLog.findFirst({
            where: { syncType: "ADVERTISERS" }, orderBy: { createdAt: "desc" },
          });
          const lastCommSync = await diagPrisma.cjSyncLog.findFirst({
            where: { syncType: "COMMISSIONS" }, orderBy: { createdAt: "desc" },
          });

          if (!lastAdvSync) {
            issues.push({ severity: "high", issue: "No advertiser sync has ever run", fix: "Tap 'Sync Advertisers' button" });
          } else if (Date.now() - new Date(lastAdvSync.createdAt).getTime() > 24 * 3600_000) {
            issues.push({ severity: "medium", issue: `Last advertiser sync was ${Math.round((Date.now() - new Date(lastAdvSync.createdAt).getTime()) / 3600_000)}h ago`, fix: "Tap 'Sync Advertisers' or check if cron is disabled" });
          }
          if (lastAdvSync?.status === "FAILED") {
            issues.push({ severity: "high", issue: "Last advertiser sync FAILED", fix: "Check CJ API credentials and retry" });
          }
          if (!lastCommSync) {
            issues.push({ severity: "medium", issue: "No commission sync has ever run", fix: "Tap 'Sync Commissions' button" });
          }
        } catch {
          issues.push({ severity: "medium", issue: "CJ sync tables not yet created in database", fix: "Run database migration or tap 'Fix Database' in System settings" });
        }

        // Coverage check
        try {
          const totalPub = await diagPrisma.blogPost.count({ where: { published: true, deletedAt: null, OR: [{ siteId: defSite }, { siteId: null }] } });
          const withAffs = await diagPrisma.blogPost.count({
            where: {
              published: true, deletedAt: null,
              AND: [
                { OR: [{ siteId: defSite }, { siteId: null }] },
                { OR: [
                  { content_en: { contains: 'rel="sponsored' } },
                  { content_en: { contains: "affiliate-recommendation" } },
                  { content_en: { contains: 'rel="noopener sponsored"' } },
                ] },
              ],
            },
          });
          const coveragePct = totalPub > 0 ? Math.round((withAffs / totalPub) * 100) : 0;
          if (coveragePct < 50) {
            issues.push({ severity: "high", issue: `Only ${coveragePct}% of articles have affiliate links (${withAffs}/${totalPub})`, fix: "Tap 'Inject Affiliate Links' to add links to uncovered articles" });
          }
        } catch (e) {
          console.warn("[affiliate-hq] Coverage check failed in diagnose:", e instanceof Error ? e.message : String(e));
        }

        // Joined advertisers check
        let joinedCount = 0;
        try {
          joinedCount = await diagPrisma.cjAdvertiser.count({ where: { status: "JOINED" } });
          if (joinedCount === 0) {
            issues.push({ severity: "high", issue: "No joined CJ advertisers — cannot generate affiliate links", fix: "Apply to advertisers in CJ dashboard, then sync" });
          }
        } catch {
          issues.push({ severity: "medium", issue: "CJ advertiser table not yet created", fix: "Run database migration" });
        }

        const overallStatus = issues.some(i => i.severity === "critical") ? "critical" : issues.some(i => i.severity === "high") ? "warning" : issues.length > 0 ? "info" : "healthy";

        return NextResponse.json({
          success: true,
          action,
          result: {
            status: overallStatus,
            issueCount: issues.length,
            issues,
            circuitBreaker: cb,
            joinedAdvertisers: joinedCount,
          },
        });
      }

      case "link_health_audit": {
        try {
          const { runLinkHealthAudit } = await import("@/lib/affiliate/link-auditor");
          const auditResult = await runLinkHealthAudit({
            siteId: body.siteId || undefined,
            maxArticles: body.maxArticles || 50,
            skipLiveness: body.skipLiveness || false,
          });
          return NextResponse.json({ success: true, action, result: auditResult });
        } catch (err) {
          console.error("[affiliate-hq] link_health_audit failed:", err instanceof Error ? err.message : String(err));
          return NextResponse.json({
            success: false, action,
            result: { error: `Audit failed: ${err instanceof Error ? err.message : "Unknown error"}` },
          });
        }
      }

      case "fix_affiliate_issues": {
        // Triggers content-auto-fix sections 17-19: dead links, stale links, untracked link wrapping
        try {
          const baseUrl = request.nextUrl.origin;
          const cronSecret = process.env.CRON_SECRET;
          const res = await fetch(`${baseUrl}/api/cron/content-auto-fix`, {
            method: "POST",
            headers: {
              ...(cronSecret ? { authorization: `Bearer ${cronSecret}` } : {}),
              "Content-Type": "application/json",
            },
          });
          const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          return NextResponse.json({
            success: true, action,
            result: {
              deadRemoved: json.results?.deadAffiliateLinksRemoved || 0,
              staleRemoved: json.results?.staleAffiliateLinksRemoved || 0,
              linksWrapped: json.results?.untrackedLinksWrapped || 0,
              fullResult: json,
            },
          });
        } catch (err) {
          console.error("[affiliate-hq] fix_affiliate_issues failed:", err instanceof Error ? err.message : String(err));
          return NextResponse.json({
            success: false, action,
            result: { error: `Fix failed: ${err instanceof Error ? err.message : "Unknown error"}` },
          });
        }
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[affiliate-hq] POST failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Action failed" }, { status: 500 });
  }
}
