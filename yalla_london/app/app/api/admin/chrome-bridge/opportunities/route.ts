/**
 * GET /api/admin/chrome-bridge/opportunities?siteId=X&days=30
 *
 * What to write next. Three signals synthesized:
 *
 *   1. TopicProposal queue — topics already staged, sorted by confidence
 *   2. GSC near-miss queries — queries where site ranks position 11-30 with
 *      ≥50 impressions (page-2 breakthrough opportunities)
 *   3. Content gaps — primaryKeywordsEN / primaryKeywordsAR from site config
 *      with NO matching published BlogPost (slug contains keyword tokens)
 *
 * Claude Chrome uses this to propose a content calendar or flag where to
 * invest article production budget.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NEAR_MISS_POSITION_MIN = 11;
const NEAR_MISS_POSITION_MAX = 30;
const NEAR_MISS_MIN_IMPRESSIONS = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain, getSiteConfig } = await import(
      "@/config/sites"
    );
    const { GoogleSearchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "20", 10),
      100,
    );

    const config = getSiteConfig(siteId);
    const domain = getSiteDomain(siteId);
    const siteUrl = domain.replace(/\/$/, "");

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Parallel fetch: topic queue, GSC top keywords, published articles
    const [proposals, gscKeywords, publishedPosts] = await Promise.all([
      prisma.topicProposal.findMany({
        where: {
          site_id: siteId,
          status: { in: ["planned", "proposed", "ready", "queued"] },
        },
        orderBy: [
          { confidence_score: "desc" },
          { planned_at: "asc" },
        ],
        take: limit,
        select: {
          id: true,
          title: true,
          locale: true,
          primary_keyword: true,
          longtails: true,
          featured_longtails: true,
          questions: true,
          intent: true,
          suggested_page_type: true,
          suggested_window_start: true,
          suggested_window_end: true,
          status: true,
          confidence_score: true,
          planned_at: true,
          evergreen: true,
          season: true,
          created_at: true,
        },
      }),
      fetchNearMissKeywords(GoogleSearchConsole, siteUrl, startDate, endDate, 100),
      prisma.blogPost.findMany({
        where: { published: true, siteId },
        select: { slug: true, title_en: true, title_ar: true },
        take: 2000,
      }),
    ]);

    const nearMiss = gscKeywords.filter(
      (k) =>
        k.position >= NEAR_MISS_POSITION_MIN &&
        k.position <= NEAR_MISS_POSITION_MAX &&
        k.impressions >= NEAR_MISS_MIN_IMPRESSIONS,
    );

    // Content gap detection: for each primary keyword in config, check if any
    // published slug contains the tokens.
    const primaryKeywordsEN = config?.primaryKeywordsEN ?? [];
    const primaryKeywordsAR = config?.primaryKeywordsAR ?? [];
    const publishedSlugs = publishedPosts.map((p) => p.slug.toLowerCase());
    const publishedTitlesLower = publishedPosts
      .flatMap((p) => [p.title_en, p.title_ar])
      .filter((t): t is string => !!t)
      .map((t) => t.toLowerCase());

    const gaps = {
      en: findKeywordGaps(primaryKeywordsEN, publishedSlugs, publishedTitlesLower),
      ar: findKeywordGaps(primaryKeywordsAR, publishedSlugs, publishedTitlesLower),
    };

    // Score topic queue for display
    const topicQueue = proposals.map((p) => ({
      id: p.id,
      title: p.title,
      locale: p.locale,
      primaryKeyword: p.primary_keyword,
      featuredLongtails: p.featured_longtails,
      intent: p.intent,
      pageType: p.suggested_page_type,
      status: p.status,
      confidence: p.confidence_score ?? undefined,
      evergreen: p.evergreen,
      season: p.season ?? undefined,
      plannedAt: p.planned_at ?? undefined,
      suggestedWindow:
        p.suggested_window_start && p.suggested_window_end
          ? {
              start: p.suggested_window_start,
              end: p.suggested_window_end,
            }
          : undefined,
      questions: p.questions.slice(0, 3),
      longtailCount: p.longtails.length,
    }));

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { startDate, endDate, days },
      summary: {
        topicsInQueue: topicQueue.length,
        nearMissCount: nearMiss.length,
        enGapCount: gaps.en.length,
        arGapCount: gaps.ar.length,
      },
      topicQueue,
      nearMissQueries: nearMiss.slice(0, limit).map((k) => ({
        query: k.keyword,
        impressions: k.impressions,
        clicks: k.clicks,
        ctr: Number((k.ctr * 100).toFixed(2)) + "%",
        position: Number(k.position.toFixed(1)),
        opportunity: classifyOpportunity(k),
      })),
      contentGaps: {
        en: gaps.en,
        ar: gaps.ar,
      },
      _hints: buildHints({ justCalled: "opportunities" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/opportunities]", message);
    return NextResponse.json(
      { error: "Failed to load opportunities", details: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GSCKeywordRow = {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

async function fetchNearMissKeywords(
  GSC: typeof import("@/lib/integrations/google-search-console").GoogleSearchConsole,
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number,
): Promise<GSCKeywordRow[]> {
  try {
    const gsc = new GSC();
    gsc.setSiteUrl(siteUrl);
    const rows = await gsc.getTopKeywords(startDate, endDate, limit);
    if (!Array.isArray(rows)) return [];
    return rows.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        keyword: typeof r.keyword === "string" ? r.keyword : "",
        clicks: typeof r.clicks === "number" ? r.clicks : 0,
        impressions: typeof r.impressions === "number" ? r.impressions : 0,
        ctr: typeof r.ctr === "number" ? r.ctr : 0,
        position: typeof r.position === "number" ? r.position : 0,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[chrome-bridge/opportunities] GSC near-miss fetch failed:", message);
    return [];
  }
}

/**
 * Returns primaryKeywords for which no published slug/title contains all
 * significant tokens (3+ chars, ignoring stop words).
 */
function findKeywordGaps(
  keywords: string[],
  publishedSlugs: string[],
  publishedTitlesLower: string[],
): string[] {
  const STOP = new Set([
    "the", "and", "for", "with", "from", "your", "you", "are", "our", "their",
    "all", "any", "how", "best", "top", "2025", "2026", "2024", "guide",
  ]);
  const gaps: string[] = [];
  for (const keyword of keywords) {
    const tokens = keyword
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOP.has(t));
    if (tokens.length === 0) continue;
    const foundInSlug = publishedSlugs.some((slug) =>
      tokens.every((t) => slug.includes(t)),
    );
    const foundInTitle = publishedTitlesLower.some((title) =>
      tokens.every((t) => title.includes(t)),
    );
    if (!foundInSlug && !foundInTitle) gaps.push(keyword);
  }
  return gaps;
}

function classifyOpportunity(k: GSCKeywordRow): string {
  if (k.position <= 15 && k.impressions >= 200) return "page-2 breakthrough (high impact)";
  if (k.position <= 20 && k.impressions >= 100) return "page-2 breakthrough";
  if (k.position <= 30) return "page-3 long-tail";
  return "low-rank";
}
