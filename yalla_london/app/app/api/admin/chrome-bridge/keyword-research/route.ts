/**
 * GET /api/admin/chrome-bridge/keyword-research?keywords=a,b,c&locationCode=2826
 *
 * Fetches search volume + CPC + competition for up to 100 keywords via
 * DataForSEO Keywords Data API. ~$0.0005/req for batches of up to 1000 keywords.
 *
 * Use cases:
 *   - Validate TopicProposal queue: do the primary keywords have real volume?
 *   - Quantify content gaps: which uncovered keywords have highest ROI?
 *   - Cross-check near-miss opportunities: is the position 11-20 query worth
 *     a content push based on its volume?
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import {
  fetchKeywordMetrics,
  isDataForSEOConfigured,
  resolveLocationCode,
} from "@/lib/chrome-bridge/dataforseo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const keywordsParam = request.nextUrl.searchParams.get("keywords");
    if (!keywordsParam) {
      return NextResponse.json(
        { error: "Missing `keywords` query param (comma-separated)" },
        { status: 400 },
      );
    }

    const keywords = keywordsParam
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length >= 2)
      .slice(0, 100);

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: "No valid keywords provided" },
        { status: 400 },
      );
    }

    if (!isDataForSEOConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "DataForSEO not configured",
          hint: "Set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD in Vercel env vars.",
        },
        { status: 503 },
      );
    }

    const locationParam = request.nextUrl.searchParams.get("locationCode");
    const locationCode = locationParam
      ? parseInt(locationParam, 10)
      : resolveLocationCode(request.nextUrl.searchParams.get("location") ?? undefined);
    const languageCode = request.nextUrl.searchParams.get("languageCode") || "en";

    const metrics = await fetchKeywordMetrics(keywords, locationCode, languageCode);

    // Derive insights
    const withVolume = metrics.filter(
      (m) => m.searchVolume !== null && m.searchVolume > 0,
    );
    const totalVolume = withVolume.reduce((s, m) => s + (m.searchVolume ?? 0), 0);
    const topByVolume = [...withVolume]
      .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
      .slice(0, 10);
    const topByCpc = [...metrics]
      .filter((m) => m.cpc !== null && m.cpc > 0)
      .sort((a, b) => (b.cpc ?? 0) - (a.cpc ?? 0))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      locationCode,
      languageCode,
      keywordsRequested: keywords.length,
      keywordsWithData: metrics.length,
      keywordsWithVolume: withVolume.length,
      totalMonthlyVolume: totalVolume,
      avgCpc:
        metrics.filter((m) => m.cpc !== null).length > 0
          ? Number(
              (
                metrics
                  .filter((m) => m.cpc !== null)
                  .reduce((s, m) => s + (m.cpc ?? 0), 0) /
                metrics.filter((m) => m.cpc !== null).length
              ).toFixed(3),
            )
          : 0,
      topByVolume,
      topByCpc,
      allMetrics: metrics,
      _hints: buildHints({ justCalled: "keyword-research" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/keyword-research]", message);
    return NextResponse.json(
      { error: "Failed to fetch keyword metrics", details: message },
      { status: 500 },
    );
  }
}
