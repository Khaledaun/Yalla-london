/**
 * GET /api/admin/chrome-bridge/gsc/breakdown?siteId=X&days=30&by=device|country|date|searchAppearance|page|query
 *
 * Multi-dimensional GSC Search Analytics breakdown. Uses the same API as
 * /gsc but lets Claude Chrome slice by device, country, date, or search
 * appearance to surface patterns hidden in aggregate data.
 *
 * Example uses:
 *   - `by=device` — is mobile converting at a different rate than desktop?
 *   - `by=country` — Gulf traffic vs UK traffic split
 *   - `by=date` — week-over-week trend detection
 *   - `by=searchAppearance` — which SERP features drive traffic (rich results)
 *   - `by=query` — top queries with position/CTR (replaces /gsc's getTopKeywords)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_DIMENSIONS = ["device", "country", "date", "searchAppearance", "page", "query"] as const;
type GscDimension = (typeof VALID_DIMENSIONS)[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );
    const byParam = request.nextUrl.searchParams.get("by") || "device";
    if (!VALID_DIMENSIONS.includes(byParam as GscDimension)) {
      return NextResponse.json(
        { error: `Invalid 'by' — must be one of: ${VALID_DIMENSIONS.join(", ")}` },
        { status: 400 },
      );
    }
    const by = byParam as GscDimension;

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "100", 10),
      500,
    );

    const siteUrl = getSiteDomain(siteId).replace(/\/$/, "");
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { GoogleSearchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );
    const gsc = new GoogleSearchConsole();
    gsc.setSiteUrl(siteUrl);

    const response = await gsc
      .getSearchAnalytics(startDate, endDate, [by])
      .catch((err) => {
        console.warn("[chrome-bridge/gsc/breakdown] getSearchAnalytics failed:", err);
        return null;
      });

    // getSearchAnalytics returns GSC's raw response: { rows: [...], ... } or null
    const rawRows: unknown[] =
      response && typeof response === "object" && "rows" in response && Array.isArray((response as Record<string, unknown>).rows)
        ? ((response as Record<string, unknown>).rows as unknown[])
        : [];

    if (rawRows.length === 0) {
      return NextResponse.json({
        success: true,
        siteId,
        dimension: by,
        dateRange: { startDate, endDate, days },
        rows: [],
        hint: "GSC returned no data. Verify GSC_SITE_URL matches your verified property in Search Console.",
      });
    }

    const normalized = rawRows.slice(0, limit).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      const keys = Array.isArray(r.keys) ? (r.keys as string[]) : [];
      return {
        dimension: by,
        key: keys[0] ?? "",
        clicks: typeof r.clicks === "number" ? r.clicks : 0,
        impressions: typeof r.impressions === "number" ? r.impressions : 0,
        ctr: typeof r.ctr === "number" ? r.ctr : 0,
        position: typeof r.position === "number" ? r.position : 0,
      };
    });

    const totalClicks = normalized.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = normalized.reduce((s, r) => s + r.impressions, 0);
    const avgPosition =
      normalized.length > 0
        ? normalized.reduce((s, r) => s + r.position, 0) / normalized.length
        : 0;

    return NextResponse.json({
      success: true,
      siteId,
      dimension: by,
      dateRange: { startDate, endDate, days },
      summary: {
        rowCount: normalized.length,
        totalClicks,
        totalImpressions,
        overallCtr:
          totalImpressions > 0
            ? Number(((totalClicks / totalImpressions) * 100).toFixed(2))
            : 0,
        avgPosition: Number(avgPosition.toFixed(2)),
      },
      rows: normalized,
      _hints: buildHints({ justCalled: "gsc-breakdown" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/gsc/breakdown]", message);
    return NextResponse.json(
      { error: "Failed to fetch GSC breakdown", details: message },
      { status: 500 },
    );
  }
}
