/**
 * GET /api/admin/chrome-bridge/affiliate/gaps?siteId=X&limit=200
 *
 * Scans published BlogPost.content_en for mentions of affiliate-relevant
 * brands/products that are NOT wrapped in affiliate tracking links. Ranks
 * articles by gap count + traffic potential to prioritize injection work.
 *
 * DB-only. No HTTP fetches.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Known affiliate-relevant brand patterns. When these appear in content but
// the <a> tag isn't wrapped by /api/affiliate/click or doesn't have
// data-affiliate-id, flag it as a gap.
const BRAND_PATTERNS: Array<{
  name: string;
  category: string;
  pattern: RegExp;
  network: string;
}> = [
  { name: "Booking.com", category: "hotel", network: "CJ/direct", pattern: /\bbooking\.com\b/gi },
  { name: "Agoda", category: "hotel", network: "CJ", pattern: /\bagoda\.com\b/gi },
  { name: "Hotels.com", category: "hotel", network: "CJ", pattern: /\bhotels\.com\b/gi },
  { name: "HalalBooking", category: "hotel", network: "CJ", pattern: /\bhalalbooking\.com\b/gi },
  { name: "Vrbo", category: "hotel", network: "CJ (Expedia)", pattern: /\bvrbo\.com\b/gi },
  { name: "Airbnb", category: "hotel", network: "direct", pattern: /\bairbnb\.com\b/gi },
  { name: "GetYourGuide", category: "activity", network: "Partnerize", pattern: /\bgetyourguide\.com\b/gi },
  { name: "Viator", category: "activity", network: "CJ/Partnerize", pattern: /\bviator\.com\b/gi },
  { name: "Klook", category: "activity", network: "direct", pattern: /\bklook\.com\b/gi },
  { name: "Tiqets", category: "activity", network: "direct", pattern: /\btiqets\.com\b/gi },
  { name: "Skyscanner", category: "flight", network: "TP", pattern: /\bskyscanner\.(com|net)\b/gi },
  { name: "Kayak", category: "flight", network: "direct", pattern: /\bkayak\.com\b/gi },
  { name: "Boatbookings", category: "yacht", network: "CJ", pattern: /\bboatbookings\.com\b/gi },
  { name: "The Fork", category: "restaurant", network: "CJ/TA", pattern: /\btheFork\.com|\btheforkmanager/gi },
  { name: "OpenTable", category: "restaurant", network: "CJ", pattern: /\bopentable\.com\b/gi },
  { name: "Stay22", category: "hotel", network: "direct", pattern: /\bstay22\.com\b/gi },
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "200", 10),
      500,
    );
    const domain = getSiteDomain(siteId).replace(/\/$/, "");

    const [posts, joinedAdvertisers] = await Promise.all([
      prisma.blogPost.findMany({
        where: { published: true, siteId },
        select: {
          id: true,
          slug: true,
          title_en: true,
          content_en: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: limit,
      }),
      prisma.cjAdvertiser.findMany({
        where: { status: "JOINED" },
        select: { name: true, category: true, programUrl: true },
      }),
    ]);

    const joinedNamesLower = new Set(
      joinedAdvertisers.map((a) => a.name.toLowerCase()),
    );

    const articleGaps: Array<{
      postId: string;
      slug: string;
      url: string;
      title: string;
      gaps: Array<{
        brand: string;
        category: string;
        network: string;
        mentionCount: number;
        unlinkedCount: number;
        weJoinedAdvertiser: boolean;
      }>;
      totalUnlinked: number;
    }> = [];

    for (const post of posts) {
      const html = post.content_en ?? "";
      if (!html) continue;

      const gaps: Array<{
        brand: string;
        category: string;
        network: string;
        mentionCount: number;
        unlinkedCount: number;
        weJoinedAdvertiser: boolean;
      }> = [];

      for (const bp of BRAND_PATTERNS) {
        const mentions = html.match(bp.pattern);
        if (!mentions || mentions.length === 0) continue;
        const mentionCount = mentions.length;

        // Count how many mentions are wrapped in affiliate tracking
        const linkedPattern = new RegExp(
          `<a[^>]*(?:\\/api\\/affiliate\\/click|data-affiliate-id|data-affiliate-partner)[^>]*>[^<]*${bp.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*<\\/a>`,
          "gi",
        );
        const linked = html.match(linkedPattern) || [];
        const unlinkedCount = Math.max(0, mentionCount - linked.length);

        if (unlinkedCount > 0) {
          gaps.push({
            brand: bp.name,
            category: bp.category,
            network: bp.network,
            mentionCount,
            unlinkedCount,
            weJoinedAdvertiser: joinedNamesLower.has(bp.name.toLowerCase()),
          });
        }
      }

      const totalUnlinked = gaps.reduce((s, g) => s + g.unlinkedCount, 0);
      if (totalUnlinked > 0) {
        articleGaps.push({
          postId: post.id,
          slug: post.slug,
          url: `${domain}/blog/${post.slug}`,
          title: post.title_en,
          gaps,
          totalUnlinked,
        });
      }
    }

    articleGaps.sort((a, b) => b.totalUnlinked - a.totalUnlinked);

    const brandTotals: Record<
      string,
      { brand: string; category: string; network: string; totalUnlinked: number; weJoinedAdvertiser: boolean }
    > = {};
    for (const art of articleGaps) {
      for (const g of art.gaps) {
        if (!brandTotals[g.brand]) {
          brandTotals[g.brand] = {
            brand: g.brand,
            category: g.category,
            network: g.network,
            totalUnlinked: 0,
            weJoinedAdvertiser: g.weJoinedAdvertiser,
          };
        }
        brandTotals[g.brand].totalUnlinked += g.unlinkedCount;
      }
    }

    const topGapBrands = Object.values(brandTotals).sort(
      (a, b) => b.totalUnlinked - a.totalUnlinked,
    );

    return NextResponse.json({
      success: true,
      siteId,
      pagesScanned: posts.length,
      summary: {
        articlesWithGaps: articleGaps.length,
        totalUnlinkedMentions: articleGaps.reduce((s, a) => s + a.totalUnlinked, 0),
        brandGapsBreakdown: topGapBrands.length,
      },
      topGapBrands: topGapBrands.slice(0, 20),
      topArticlesByGap: articleGaps.slice(0, 30),
      _hints: buildHints({ justCalled: "affiliate-gaps" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/affiliate/gaps]", message);
    return NextResponse.json(
      { error: "Failed to scan affiliate gaps", details: message },
      { status: 500 },
    );
  }
}
