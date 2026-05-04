/**
 * Affiliate Link Monitor — Live monitoring endpoint
 *
 * GET /api/admin/affiliate-monitor?siteId=yalla-london&period=7d
 *
 * Returns:
 * - Click counts (today, 7d, 30d) from CjClickEvent DB
 * - Revenue from CjCommission DB
 * - Link coverage (articles with/without affiliate links)
 * - Top performing articles by clicks
 * - Per-partner click breakdown
 * - GA4 Measurement Protocol status
 * - Diagnostic issues (why clicks might be zero)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getActiveSiteIds } = await import("@/config/sites");
    const { isGA4MPConfigured } = await import("@/lib/analytics/ga4-measurement-protocol");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const activeSiteIds = getActiveSiteIds();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const siteFilter = { OR: [{ siteId }, { siteId: null }] };

    // -----------------------------------------------------------------------
    // 1. Click counts
    // -----------------------------------------------------------------------
    // Count CJ link clicks + direct URL clicks (AuditLog with action=AFFILIATE_CLICK_DIRECT)
    const [cjClicksToday, cjClicks7d, cjClicks30d, directToday, direct7d, direct30d] = await Promise.all([
      prisma.cjClickEvent.count({ where: { ...siteFilter, createdAt: { gte: todayStart } } }),
      prisma.cjClickEvent.count({ where: { ...siteFilter, createdAt: { gte: d7 } } }),
      prisma.cjClickEvent.count({ where: { ...siteFilter, createdAt: { gte: d30 } } }),
      prisma.auditLog.count({ where: { action: "AFFILIATE_CLICK_DIRECT", timestamp: { gte: todayStart } } }),
      prisma.auditLog.count({ where: { action: "AFFILIATE_CLICK_DIRECT", timestamp: { gte: d7 } } }),
      prisma.auditLog.count({ where: { action: "AFFILIATE_CLICK_DIRECT", timestamp: { gte: d30 } } }),
    ]);
    const clicksToday = cjClicksToday + directToday;
    const clicks7d = cjClicks7d + direct7d;
    const clicks30d = cjClicks30d + direct30d;

    // -----------------------------------------------------------------------
    // 2. Revenue
    // -----------------------------------------------------------------------
    const revenueResult = await prisma.cjCommission.aggregate({
      where: { ...siteFilter, eventDate: { gte: d30 } },
      _sum: { commissionAmount: true },
      _count: true,
    });
    const revenue30d = revenueResult._sum.commissionAmount || 0;
    const commissions30d = revenueResult._count;

    // -----------------------------------------------------------------------
    // 3. Link coverage — how many published articles have affiliate links
    // -----------------------------------------------------------------------
    const totalPublished = await prisma.blogPost.count({
      where: { siteId, published: true },
    });

    // Check for affiliate indicators in content
    const withAffiliates = await prisma.blogPost.count({
      where: {
        siteId,
        published: true,
        OR: [
          { content_en: { contains: "affiliate-recommendation" } },
          { content_en: { contains: "affiliate-cta-block" } },
          { content_en: { contains: "affiliate-partners-section" } },
          { content_en: { contains: "data-affiliate-partner=" } },
          { content_en: { contains: 'rel="sponsored' } },
          { content_en: { contains: 'rel="noopener sponsored"' } },
          { content_en: { contains: "/api/affiliate/click" } },
          { content_en: { contains: "data-affiliate-id" } },
          { content_en: { contains: "data-affiliate=" } },
        ],
      },
    });

    const withoutAffiliates = totalPublished - withAffiliates;
    const coveragePercent = totalPublished > 0
      ? Math.round((withAffiliates / totalPublished) * 100)
      : 0;

    // -----------------------------------------------------------------------
    // 4. Top articles by clicks (last 30d) — unified CJ + direct URL clicks
    // -----------------------------------------------------------------------
    const { getClicksByArticle, getClicksByPartner, getRecentClickFeed } = await import(
      "@/lib/affiliate/click-aggregator"
    );
    const articleClickMap = await getClicksByArticle({ siteId, since: d30 });
    const topArticles = [...articleClickMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([slug, clicks]) => ({ slug, clicks }));

    // -----------------------------------------------------------------------
    // 5. Per-partner breakdown — unified CJ + direct
    // -----------------------------------------------------------------------
    const partnerClickMap = await getClicksByPartner({ siteId, since: d30 });
    const partnerBreakdown = [...partnerClickMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([partner, clicks]) => ({ partner, clicks }));

    // -----------------------------------------------------------------------
    // 6. Recent click feed (last 20) — unified CJ + direct
    // -----------------------------------------------------------------------
    const feedItems = await getRecentClickFeed({ siteId }, 20);
    const clickFeed = feedItems.map((c) => ({
      id: c.id,
      partner: c.partner,
      article: c.articleSlug,
      device: c.device,
      country: c.country,
      timestamp: c.timestamp.toISOString(),
      source: c.source,
    }));

    // -----------------------------------------------------------------------
    // 7. Diagnostics — why might clicks be zero?
    // -----------------------------------------------------------------------
    const diagnostics: Array<{ issue: string; severity: "critical" | "high" | "medium" | "info"; fix: string }> = [];

    // Check CJ configuration
    const cjToken = !!process.env.CJ_API_TOKEN;
    const cjWebsiteId = !!process.env.CJ_WEBSITE_ID;
    const cjPublisherCid = !!process.env.CJ_PUBLISHER_CID;
    if (!cjToken || !cjWebsiteId || !cjPublisherCid) {
      diagnostics.push({
        issue: "CJ API credentials not fully configured",
        severity: "critical",
        fix: "Set CJ_API_TOKEN, CJ_WEBSITE_ID, and CJ_PUBLISHER_CID in Vercel env vars",
      });
    }

    // Check GA4 MP
    if (!isGA4MPConfigured()) {
      diagnostics.push({
        issue: "GA4 Measurement Protocol not configured — clicks tracked in DB but invisible in Google Analytics",
        severity: "high",
        fix: "Set GA4_MEASUREMENT_ID (your G-XXXXXXXXXX ID) and GA4_API_SECRET (create in GA4 Admin → Data Streams → Measurement Protocol API secrets) in Vercel",
      });
    }

    // Check client-side GA4
    const ga4MeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";
    if (!ga4MeasurementId || ga4MeasurementId === "G-XXXXX") {
      diagnostics.push({
        issue: "Client-side GA4 tracking not configured — affiliate_click events not firing in browser",
        severity: "high",
        fix: "Set NEXT_PUBLIC_GA_MEASUREMENT_ID to your real GA4 measurement ID (e.g., G-XXXXXXXXXX) in Vercel",
      });
    }

    // Check JOINED advertisers
    const joinedCount = await prisma.cjAdvertiser.count({ where: { status: "JOINED" } });
    if (joinedCount === 0) {
      diagnostics.push({
        issue: `No JOINED CJ advertisers — affiliate links depend on approved advertiser partnerships`,
        severity: "high",
        fix: "Apply to advertisers in CJ dashboard (Booking.com, GetYourGuide, Viator, HalalBooking). Currently only Vrbo is available via deep links.",
      });
    }

    // Check static affiliate env vars
    const staticEnvVars = [
      "BOOKING_AFFILIATE_ID",
      "AGODA_AFFILIATE_ID",
      "GETYOURGUIDE_AFFILIATE_ID",
      "VIATOR_AFFILIATE_ID",
      "HALALBOOKING_AFFILIATE_ID",
    ];
    const missingEnvVars = staticEnvVars.filter(v => !process.env[v]);
    if (missingEnvVars.length > 0) {
      diagnostics.push({
        issue: `${missingEnvVars.length}/${staticEnvVars.length} direct affiliate partner IDs not set — fallback injection limited to CJ deep links only`,
        severity: "medium",
        fix: `Set in Vercel when approved by each network: ${missingEnvVars.join(", ")}`,
      });
    }

    // Check coverage
    if (withoutAffiliates > 0) {
      diagnostics.push({
        issue: `${withoutAffiliates} of ${totalPublished} published articles have NO affiliate links`,
        severity: withoutAffiliates > totalPublished / 2 ? "high" : "medium",
        fix: "Run affiliate-injection cron (Departures Board → Do Now) or wait for next scheduled run (daily 09:00 UTC)",
      });
    }

    // Check last injection cron run
    const lastInjection = await prisma.cronJobLog.findFirst({
      where: { job_name: "affiliate-injection" },
      orderBy: { started_at: "desc" },
      select: { started_at: true, status: true, result_summary: true },
    });

    if (!lastInjection) {
      diagnostics.push({
        issue: "Affiliate injection cron has never run",
        severity: "critical",
        fix: "Trigger manually from Departures Board or check vercel.json schedule",
      });
    } else if (lastInjection.status === "failed") {
      diagnostics.push({
        issue: `Last affiliate injection cron FAILED at ${lastInjection.started_at.toISOString()}`,
        severity: "high",
        fix: "Check CronJobLog for error details. Retry from Departures Board.",
      });
    }

    // Check if site has any traffic at all
    if (clicks30d === 0 && totalPublished > 5) {
      diagnostics.push({
        issue: "Zero affiliate clicks in 30 days — this could mean: (a) articles have no affiliate links injected, (b) no traffic yet, or (c) links use direct partner URLs instead of /api/affiliate/click tracking redirect",
        severity: "info",
        fix: "Verify by visiting a published article and inspecting the affiliate link href. It should start with /api/affiliate/click to be tracked.",
      });
    }

    // Surface attribution pattern — helps explain where revenue lives
    if (cjClicks30d === 0 && direct30d > 0) {
      diagnostics.push({
        issue: `All ${direct30d} clicks in the last 30 days are direct URL redirects (Travelpayouts/static/Vrbo-fallback). Revenue attribution lives in those networks' dashboards, not in CjCommission.`,
        severity: "info",
        fix: "This is expected until more CJ advertisers (Booking.com, GetYourGuide) are approved. Check Travelpayouts dashboard (marker 510776) for commission data.",
      });
    }

    // -----------------------------------------------------------------------
    // Response
    // -----------------------------------------------------------------------
    return NextResponse.json({
      siteId,
      generatedAt: now.toISOString(),
      clicks: {
        today: clicksToday,
        last7d: clicks7d,
        last30d: clicks30d,
      },
      revenue: {
        last30d: revenue30d,
        commissions: commissions30d,
      },
      coverage: {
        totalPublished,
        withAffiliates,
        withoutAffiliates,
        coveragePercent,
      },
      topArticles,
      partnerBreakdown,
      clickFeed,
      integrationStatus: {
        cjConfigured: cjToken && cjWebsiteId && cjPublisherCid,
        ga4MPConfigured: isGA4MPConfigured(),
        ga4ClientConfigured: !!ga4MeasurementId && ga4MeasurementId !== "G-XXXXX",
        joinedAdvertisers: joinedCount,
      },
      diagnostics,
      lastInjectionRun: lastInjection
        ? {
            at: lastInjection.started_at.toISOString(),
            status: lastInjection.status,
            summary: lastInjection.result_summary,
          }
        : null,
    });
  } catch (err) {
    console.error("[affiliate-monitor] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Failed to load affiliate monitor data" },
      { status: 500 }
    );
  }
}
