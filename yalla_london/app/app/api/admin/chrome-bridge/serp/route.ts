/**
 * GET /api/admin/chrome-bridge/serp?keyword=X&locationCode=2826&languageCode=en
 *
 * Competitor SERP snapshot via DataForSEO. Returns top 10 organic results +
 * SERP features (featured snippet, People Also Ask, Related Searches, AI
 * Overview citations).
 *
 * Enriches /opportunities + per-page audits with "who's above us for this
 * keyword?" data. Claude Chrome uses this to identify content angles, entity
 * coverage gaps, and AI Overview citation targets.
 *
 * Gracefully degrades if DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD not set.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import {
  fetchSERP,
  isDataForSEOConfigured,
  resolveLocationCode,
} from "@/lib/chrome-bridge/dataforseo";
import type { Finding, InterpretedAction } from "@/lib/chrome-bridge/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const keyword = request.nextUrl.searchParams.get("keyword");
    if (!keyword || keyword.length < 2) {
      return NextResponse.json(
        { error: "Missing or too-short `keyword` query param" },
        { status: 400 },
      );
    }

    if (!isDataForSEOConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "DataForSEO not configured",
          hint: "Set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD in Vercel env vars. Signup at dataforseo.com — pay-as-you-go, ~$0.003/SERP.",
        },
        { status: 503 },
      );
    }

    const locationParam = request.nextUrl.searchParams.get("locationCode");
    const locationCode = locationParam
      ? parseInt(locationParam, 10)
      : resolveLocationCode(request.nextUrl.searchParams.get("location") ?? undefined);
    const languageCode = request.nextUrl.searchParams.get("languageCode") || "en";

    // Target domains we care about (our sites) for "where do we rank"
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");
    const ourDomains = getActiveSiteIds().map((id) =>
      getSiteDomain(id).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""),
    );

    const serp = await fetchSERP(keyword, locationCode, languageCode);
    if (!serp) {
      return NextResponse.json(
        { success: false, error: "DataForSEO returned no data or request failed" },
        { status: 502 },
      );
    }

    // Find our own ranking (if any)
    const ourRanking = serp.organic.find((r) => {
      const resultDomain = r.domain.replace(/^www\./, "");
      return ourDomains.some(
        (our) => resultDomain === our || resultDomain.endsWith(`.${our}`),
      );
    });

    // Find AI Overview citation status
    const ourAioCitation = serp.aiOverview?.cited.find((c) => {
      const citedDomain = c.domain.replace(/^www\./, "");
      return ourDomains.some(
        (our) => citedDomain === our || citedDomain.endsWith(`.${our}`),
      );
    });

    // Derive findings + actions
    const findings: Finding[] = [];
    const actions: InterpretedAction[] = [];

    if (!ourRanking) {
      findings.push({
        pillar: "offsite",
        issue: `Not ranked in top 10 for "${keyword}"`,
        severity: "warning",
        evidence: `Top competitors: ${serp.organic
          .slice(0, 3)
          .map((r) => `${r.domain} (#${r.rank})`)
          .join(", ")}`,
      });
      actions.push({
        action: `Create or expand content targeting "${keyword}". Review top 3 competitor angles above.`,
        priority: "medium",
        autoFixable: false,
        estimatedEffort: "medium",
      });
    } else if (ourRanking.rank > 5) {
      findings.push({
        pillar: "on_page",
        issue: `Ranked #${ourRanking.rank} for "${keyword}" — opportunity to push to top 5`,
        severity: "info",
        evidence: `Our URL: ${ourRanking.url}`,
      });
    }

    if (serp.aiOverview && !ourAioCitation) {
      findings.push({
        pillar: "aio",
        issue: `AI Overview appears for "${keyword}" but we're not cited`,
        severity: "warning",
        evidence: `Cited: ${serp.aiOverview.cited.map((c) => c.domain).slice(0, 3).join(", ")}`,
      });
      actions.push({
        action: "Improve AIO citability: add answer capsule in first 80 words, statistics with citations, question-format H2s.",
        priority: "high",
        autoFixable: false,
        estimatedEffort: "small",
      });
    }

    // PAA questions we should answer in content
    if (serp.peopleAlsoAsk.length > 0) {
      actions.push({
        action: `Cover ${serp.peopleAlsoAsk.length} People Also Ask questions as H2s + answer paragraphs: ${serp.peopleAlsoAsk.slice(0, 3).join(" | ")}`,
        priority: "medium",
        autoFixable: false,
        estimatedEffort: "medium",
      });
    }

    return NextResponse.json({
      success: true,
      keyword,
      locationCode,
      languageCode,
      serp,
      ourRanking: ourRanking
        ? {
            rank: ourRanking.rank,
            url: ourRanking.url,
            domain: ourRanking.domain,
            title: ourRanking.title,
          }
        : null,
      ourAioCitation: ourAioCitation ?? null,
      competitorDomains: Array.from(
        new Set(serp.organic.slice(0, 5).map((r) => r.domain.replace(/^www\./, ""))),
      ),
      findings,
      interpretedActions: actions,
      costUsd: serp.cost,
      _hints: buildHints({ justCalled: "serp" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/serp]", message);
    return NextResponse.json(
      { error: "Failed to fetch SERP", details: message },
      { status: 500 },
    );
  }
}
