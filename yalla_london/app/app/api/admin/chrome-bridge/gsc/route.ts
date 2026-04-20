/**
 * GET /api/admin/chrome-bridge/gsc?siteId=X&days=N&limit=N
 * Google Search Console data via GoogleSearchConsole class.
 * Returns top pages, top keywords, and sitemap status.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const { GoogleSearchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50", 10),
      200,
    );

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const siteUrl = getSiteDomain(siteId).replace(/\/$/, "");
    const gsc = new GoogleSearchConsole();
    gsc.setSiteUrl(siteUrl);

    const [topPages, topKeywords, sitemaps] = await Promise.all([
      gsc.getTopPages(startDate, endDate, limit).catch((err) => {
        console.warn("[chrome-bridge/gsc] getTopPages failed:", err);
        return [];
      }),
      gsc.getTopKeywords(startDate, endDate, limit).catch((err) => {
        console.warn("[chrome-bridge/gsc] getTopKeywords failed:", err);
        return [];
      }),
      gsc.getSitemaps().catch((err) => {
        console.warn("[chrome-bridge/gsc] getSitemaps failed:", err);
        return [];
      }),
    ]);

    return NextResponse.json({
      success: true,
      siteId,
      siteUrl,
      dateRange: { startDate, endDate, days },
      topPages,
      topKeywords,
      sitemaps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/gsc]", message);
    return NextResponse.json(
      { error: "Failed to load GSC data", details: message },
      { status: 500 },
    );
  }
}
