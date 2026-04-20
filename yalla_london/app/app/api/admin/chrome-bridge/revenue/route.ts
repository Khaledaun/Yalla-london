/**
 * GET /api/admin/chrome-bridge/revenue?siteId=X&days=30&limit=50
 *
 * Per-page revenue attribution: joins BlogPost → CjClickEvent (via SID) →
 * CjCommission so Claude Chrome can see "which articles earn vs which are
 * dead weight."
 *
 * SID format on click events is `{siteId}_{slug}` stored in
 * CjClickEvent.sessionId. March 11 migration also added direct siteId fields
 * to CjClickEvent and CjCommission, so we prefer those when present and fall
 * back to SID parsing for legacy rows.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEAD_WEIGHT_GSC_THRESHOLD = 20; // 30d organic clicks
const MIN_DAYS_BEFORE_CLASSIFY = 14;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50", 10),
      200,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const domain = getSiteDomain(siteId);

    const posts = await prisma.blogPost.findMany({
      where: { published: true, siteId },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        slug: true,
        title_en: true,
        content_en: true,
        created_at: true,
      },
    });
    const slugs = posts.map((p) => p.slug);
    const urls = posts.map((p) => `${domain}/blog/${p.slug}`);

    // Site-scoped filter pattern matches affiliate-hq: siteId explicit OR legacy null (pre-migration rows)
    const siteFilter = { OR: [{ siteId }, { siteId: null }] };

    const [clickEvents, commissions, gscMetrics] = await Promise.all([
      prisma.cjClickEvent.findMany({
        where: { ...siteFilter, createdAt: { gte: since } },
        select: {
          id: true,
          sessionId: true,
          pageUrl: true,
          createdAt: true,
        },
        take: 5000,
      }),
      prisma.cjCommission.findMany({
        where: { ...siteFilter, eventDate: { gte: since } },
        select: {
          id: true,
          metadata: true,
          commissionAmount: true,
          saleAmount: true,
          currency: true,
          status: true,
          eventDate: true,
        },
        take: 2000,
      }),
      prisma.gscPagePerformance.groupBy({
        by: ["url"],
        where: { site_id: siteId, url: { in: urls }, date: { gte: since } },
        _sum: { clicks: true, impressions: true },
      }),
    ]);

    // Parse SID → attribute clicks and commissions per-slug
    const clicksBySlug: Record<string, number> = {};
    const clicksByUrl: Record<string, number> = {};
    for (const evt of clickEvents) {
      const parsed = parseSlugFromSessionId(evt.sessionId, siteId);
      if (parsed && slugs.includes(parsed)) {
        clicksBySlug[parsed] = (clicksBySlug[parsed] ?? 0) + 1;
      }
      clicksByUrl[evt.pageUrl] = (clicksByUrl[evt.pageUrl] ?? 0) + 1;
    }

    // Commissions: SID is stored in metadata.sid (set by cj-sync.ts when parsing raw CJ commission feed)
    const commissionBySlug: Record<
      string,
      { total: number; currency: string; count: number; statuses: Record<string, number> }
    > = {};
    for (const c of commissions) {
      const meta = (c.metadata as Record<string, unknown> | null) ?? {};
      const sid = typeof meta.sid === "string" ? meta.sid : undefined;
      const slug = sid ? parseSlugFromSid(sid, siteId) : null;
      if (slug && slugs.includes(slug)) {
        if (!commissionBySlug[slug]) {
          commissionBySlug[slug] = { total: 0, currency: c.currency, count: 0, statuses: {} };
        }
        commissionBySlug[slug].total += c.commissionAmount ?? 0;
        commissionBySlug[slug].count += 1;
        commissionBySlug[slug].statuses[c.status] =
          (commissionBySlug[slug].statuses[c.status] ?? 0) + 1;
      }
    }

    const gscBySlug: Record<string, { clicks: number; impressions: number }> = {};
    for (const g of gscMetrics) {
      const slug = g.url.replace(`${domain}/blog/`, "").replace(/\/$/, "");
      gscBySlug[slug] = {
        clicks: g._sum.clicks ?? 0,
        impressions: g._sum.impressions ?? 0,
      };
    }

    // Build per-page rows with classification
    const pages = posts.map((post) => {
      const affiliateClicks = clicksBySlug[post.slug] ?? 0;
      const commissionSum = commissionBySlug[post.slug]?.total ?? 0;
      const commissionCount = commissionBySlug[post.slug]?.count ?? 0;
      const currency = commissionBySlug[post.slug]?.currency ?? "GBP";
      const gsc = gscBySlug[post.slug] ?? { clicks: 0, impressions: 0 };
      const epc = affiliateClicks > 0 ? commissionSum / affiliateClicks : 0;
      const conversionRate = gsc.clicks > 0 ? affiliateClicks / gsc.clicks : 0;

      const ageDays = Math.floor(
        (Date.now() - new Date(post.created_at).getTime()) / (24 * 60 * 60 * 1000),
      );

      const contentHtml = post.content_en ?? "";
      const hasAffiliateLinks =
        /\/api\/affiliate\/click|data-affiliate-id|data-affiliate-partner|rel=["'][^"']*sponsored/i.test(
          contentHtml,
        );

      let classification: "earner" | "dead_weight" | "unmonetized" | "fresh" | "cold" = "cold";
      if (ageDays < MIN_DAYS_BEFORE_CLASSIFY) {
        classification = "fresh";
      } else if (commissionSum > 0 || affiliateClicks > 0) {
        classification = "earner";
      } else if (!hasAffiliateLinks) {
        classification = "unmonetized";
      } else if (gsc.clicks >= DEAD_WEIGHT_GSC_THRESHOLD) {
        classification = "dead_weight";
      }

      return {
        id: post.id,
        slug: post.slug,
        url: `${domain}/blog/${post.slug}`,
        title: post.title_en,
        ageDays,
        hasAffiliateLinks,
        organic: {
          clicks: gsc.clicks,
          impressions: gsc.impressions,
        },
        affiliate: {
          clicks: affiliateClicks,
          commissionCount,
          commissionTotal: Number(commissionSum.toFixed(2)),
          currency,
          epc: Number(epc.toFixed(4)),
          statuses: commissionBySlug[post.slug]?.statuses ?? {},
        },
        conversionRate: Number(conversionRate.toFixed(4)),
        classification,
      };
    });

    // Aggregates
    const totalAffiliateClicks = pages.reduce((s, p) => s + p.affiliate.clicks, 0);
    const totalCommissions = pages.reduce((s, p) => s + p.affiliate.commissionTotal, 0);
    const totalOrganicClicks = pages.reduce((s, p) => s + p.organic.clicks, 0);
    const classificationCounts: Record<string, number> = {};
    for (const p of pages) {
      classificationCounts[p.classification] = (classificationCounts[p.classification] ?? 0) + 1;
    }

    // Leaders / laggers
    const topEarners = [...pages]
      .filter((p) => p.affiliate.commissionTotal > 0)
      .sort((a, b) => b.affiliate.commissionTotal - a.affiliate.commissionTotal)
      .slice(0, 10);
    const deadWeight = pages
      .filter((p) => p.classification === "dead_weight")
      .sort((a, b) => b.organic.clicks - a.organic.clicks)
      .slice(0, 10);
    const unmonetized = pages
      .filter((p) => p.classification === "unmonetized")
      .sort((a, b) => b.organic.impressions - a.organic.impressions)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: {
        days,
        startDate: since.toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
      },
      pagesScanned: posts.length,
      totals: {
        organicClicks: totalOrganicClicks,
        affiliateClicks: totalAffiliateClicks,
        commissions: Number(totalCommissions.toFixed(2)),
        avgEpc:
          totalAffiliateClicks > 0
            ? Number((totalCommissions / totalAffiliateClicks).toFixed(4))
            : 0,
        overallConversionRate:
          totalOrganicClicks > 0
            ? Number((totalAffiliateClicks / totalOrganicClicks).toFixed(4))
            : 0,
      },
      classificationCounts,
      topEarners,
      deadWeight,
      unmonetized,
      pages,
      _hints: buildHints({ justCalled: "revenue" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/revenue]", message);
    return NextResponse.json(
      { error: "Failed to load revenue data", details: message },
      { status: 500 },
    );
  }
}

/**
 * Parse the article slug from a sessionId.
 * Format: `{siteId}_{slug}` — split on the first underscore only so slugs
 * containing underscores work correctly.
 */
function parseSlugFromSessionId(sessionId: string | null, siteId: string): string | null {
  if (!sessionId) return null;
  return parseSlugFromSid(sessionId, siteId);
}

function parseSlugFromSid(sid: string, siteId: string): string | null {
  if (!sid.startsWith(`${siteId}_`)) return null;
  const slug = sid.slice(siteId.length + 1);
  return slug.length > 0 ? slug : null;
}
