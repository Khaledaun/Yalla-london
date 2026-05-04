/**
 * GET /api/admin/chrome-bridge/gsc/inspect?url=X&siteId=X
 *
 * Single-URL deep inspection via GSC URL Inspection API. Returns verdict,
 * crawl status, last-crawled date, indexing state, canonical mismatch,
 * mobile usability, referring sitemaps, etc.
 *
 * Wraps GoogleSearchConsole.getIndexingStatus() with Chrome Bridge auth +
 * interpreted findings + _hints.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import type { Finding, InterpretedAction } from "@/lib/chrome-bridge/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing `url` query param" }, { status: 400 });
    }
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const siteIdParam = request.nextUrl.searchParams.get("siteId");
    const { getDefaultSiteId, getSiteDomain, getActiveSiteIds } = await import(
      "@/config/sites"
    );
    const siteId = siteIdParam || inferSiteIdFromUrl(url, getActiveSiteIds(), getSiteDomain) || getDefaultSiteId();
    const siteUrl = getSiteDomain(siteId).replace(/\/$/, "");

    const { GoogleSearchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );
    const gsc = new GoogleSearchConsole();
    gsc.setSiteUrl(siteUrl);

    const inspection = await gsc.getIndexingStatus(url).catch((err) => {
      console.warn("[chrome-bridge/gsc/inspect] getIndexingStatus failed:", err);
      return null;
    });

    if (!inspection) {
      return NextResponse.json(
        {
          success: false,
          error: "URL Inspection API call failed or returned no data",
          hint: "Verify GSC service account has urlInspection scope. Verify GSC_SITE_URL env var matches.",
        },
        { status: 502 },
      );
    }

    const findings: Finding[] = [];
    const actions: InterpretedAction[] = [];

    const verdict = inspection.indexingState ?? inspection.coverageState ?? "unknown";
    const normalized = String(verdict).toLowerCase();

    if (normalized.includes("indexed") && !normalized.includes("not")) {
      // Healthy
    } else if (normalized.includes("not indexed") || normalized.includes("not_indexed")) {
      findings.push({
        pillar: "technical",
        issue: `Not indexed: ${verdict}`,
        severity: "critical",
        evidence: `Coverage: ${inspection.coverageState ?? "unknown"}`,
      });
      actions.push({
        action: "Submit via IndexNow + manually inspect in GSC. Check for thin content, duplicate canonical, or robots.txt block.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "small",
      });
    } else if (normalized.includes("crawled") && normalized.includes("not indexed")) {
      findings.push({
        pillar: "technical",
        issue: "Crawled but not indexed — Google quality signal",
        severity: "critical",
        evidence: verdict,
      });
      actions.push({
        action: "This indicates Google's quality assessment. Expand content, add E-E-A-T signals, improve internal linking, add first-hand experience markers.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "medium",
      });
    }

    const canonical = inspection.googleCanonical;
    if (canonical && canonical !== url && canonical !== url.replace(/\/$/, "")) {
      findings.push({
        pillar: "technical",
        issue: "Canonical mismatch — Google selected different canonical URL",
        severity: "warning",
        evidence: `Requested: ${url} | Google chose: ${canonical}`,
      });
      actions.push({
        action: "Review <link rel=\"canonical\"> tag. Check for hreflang conflicts, duplicate content, or parameterized URLs.",
        priority: "medium",
        autoFixable: false,
        estimatedEffort: "small",
      });
    }

    if (inspection.mobileUsability?.verdict && inspection.mobileUsability.verdict !== "PASS") {
      findings.push({
        pillar: "ux",
        issue: `Mobile usability: ${inspection.mobileUsability.verdict}`,
        severity: "warning",
        evidence: JSON.stringify(inspection.mobileUsability).slice(0, 200),
      });
    }

    return NextResponse.json({
      success: true,
      url,
      siteId,
      inspection,
      findings,
      interpretedActions: actions,
      _hints: buildHints({ justCalled: "gsc-inspect" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/gsc/inspect]", message);
    return NextResponse.json(
      { error: "Failed to inspect URL", details: message },
      { status: 500 },
    );
  }
}

function inferSiteIdFromUrl(
  url: string,
  activeSiteIds: string[],
  getSiteDomain: (id: string) => string,
): string | null {
  for (const id of activeSiteIds) {
    const domain = getSiteDomain(id)
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
    if (url.includes(domain)) return id;
  }
  return null;
}
