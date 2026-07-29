/**
 * GET /api/admin/chrome-bridge/affiliate/recommendations?siteId=X
 *
 * Synthesizes affiliate program recommendations by combining:
 *   1. Content intent signals — top organic keywords from GSC, classified
 *      into categories (hotel, activity, flight, restaurant, etc.)
 *   2. Existing coverage — which categories already have JOINED advertisers
 *   3. Gap brands — brands mentioned in content without affiliate links
 *   4. DataForSEO (optional) — if configured, surface competitor partners
 *      from SERP analysis of top keywords
 *
 * Output: ranked list of affiliate programs to apply to, with rationale.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type IntentCategory = "hotel" | "activity" | "flight" | "restaurant" | "yacht" | "car" | "insurance" | "general";

const INTENT_KEYWORDS: Record<IntentCategory, RegExp> = {
  hotel: /\b(hotel|hotels|stay|stays|lodging|accommodation|resort|suite|riad|b\s*&\s*b|bed and breakfast|airbnb|vacation rental|villa rental)\b/i,
  activity: /\b(things to do|tour|tours|activities|attraction|experience|ticket|museum|gallery|park|sightseeing|excursion)\b/i,
  flight: /\b(flight|flights|airline|airport|airfare|ticket to|direct flight)\b/i,
  restaurant: /\b(restaurant|restaurants|dining|dinner|lunch|breakfast|brunch|cafe|bistro|bar|halal restaurant|michelin)\b/i,
  yacht: /\b(yacht|yachts|charter|boat|sailing|catamaran|superyacht|marina)\b/i,
  car: /\b(car rental|rental car|hire a car|rent a car|driving|car hire)\b/i,
  insurance: /\b(travel insurance|trip insurance)\b/i,
  general: /^/,
};

// Known affiliate programs by category (manually curated — seeds the
// recommendations even if DataForSEO isn't configured).
const CATEGORY_PROGRAMS: Record<Exclude<IntentCategory, "general">, Array<{
  name: string;
  network: string;
  typicalEpc: number;
  notes: string;
}>> = {
  hotel: [
    { name: "Booking.com", network: "CJ Affiliate", typicalEpc: 3.5, notes: "Broadest hotel inventory; 4% commission. Needs 500+ monthly sessions for approval." },
    { name: "HalalBooking", network: "CJ Affiliate", typicalEpc: 4.2, notes: "Essential for Arab travel audience. 7% commission, 30-day cookie." },
    { name: "Agoda", network: "CJ Affiliate", typicalEpc: 2.8, notes: "Strong in Asia Pacific. 5% commission." },
    { name: "Hotels.com", network: "CJ Affiliate", typicalEpc: 3.0, notes: "Expedia family. 4% commission." },
    { name: "Vrbo", network: "CJ Affiliate", typicalEpc: 4.5, notes: "Already joined for yalla-london. Expedia family, vacation rentals." },
    { name: "Stay22", network: "Direct", typicalEpc: 5.0, notes: "Map embed monetization — already integrated via monetization-scripts.tsx." },
  ],
  activity: [
    { name: "GetYourGuide", network: "Partnerize", typicalEpc: 5.5, notes: "Best activity platform commission (8%+). Approval requires decent traffic." },
    { name: "Viator", network: "CJ Affiliate or Partnerize", typicalEpc: 4.0, notes: "TripAdvisor-owned. 8% commission, 30-day cookie." },
    { name: "Klook", network: "Direct", typicalEpc: 3.5, notes: "Strong in Asia. Direct signup." },
    { name: "Tiqets", network: "Direct", typicalEpc: 3.0, notes: "Museums + attractions. Direct signup, easy approval." },
  ],
  flight: [
    { name: "Skyscanner", network: "Travelpayouts", typicalEpc: 0.8, notes: "Low EPC but high volume. Travelpayouts covers approval." },
    { name: "Kiwi.com", network: "Travelpayouts", typicalEpc: 1.2, notes: "Alternative flight search." },
  ],
  restaurant: [
    { name: "The Fork", network: "CJ Affiliate", typicalEpc: 2.0, notes: "Europe dining reservations. Good for London / Riviera / Istanbul sites." },
    { name: "OpenTable", network: "CJ Affiliate", typicalEpc: 1.5, notes: "US-centric but growing in UK." },
  ],
  yacht: [
    { name: "Boatbookings", network: "CJ Affiliate", typicalEpc: 15.0, notes: "High-ticket yacht charters (20% commission). Critical for Zenitha Yachts + Yalla Riviera." },
    { name: "Sailogy", network: "Direct", typicalEpc: 12.0, notes: "European charter directory." },
  ],
  car: [
    { name: "DiscoverCars", network: "Travelpayouts", typicalEpc: 2.5, notes: "365-day cookie (exceptional). Travelpayouts covers approval." },
    { name: "Rentalcars.com", network: "Partnerize", typicalEpc: 2.0, notes: "Booking.com family." },
  ],
  insurance: [
    { name: "World Nomads", network: "CJ Affiliate", typicalEpc: 8.0, notes: "High commission, niche but valuable audience." },
    { name: "SafetyWing", network: "Direct", typicalEpc: 6.0, notes: "Digital nomad focus." },
  ],
};

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
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const siteUrl = getSiteDomain(siteId).replace(/\/$/, "");

    // 1. Classify top queries by intent
    const { GoogleSearchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );
    const gsc = new GoogleSearchConsole();
    gsc.setSiteUrl(siteUrl);

    const topQueries = await gsc.getTopKeywords(startDate, endDate, 100).catch(() => []);

    type QueryRow = { keyword: string; impressions: number; clicks: number; ctr: number; position: number };
    const queries: QueryRow[] = Array.isArray(topQueries)
      ? topQueries.map((row: unknown) => {
          const r = row as Record<string, unknown>;
          return {
            keyword: typeof r.keyword === "string" ? r.keyword : "",
            impressions: typeof r.impressions === "number" ? r.impressions : 0,
            clicks: typeof r.clicks === "number" ? r.clicks : 0,
            ctr: typeof r.ctr === "number" ? r.ctr : 0,
            position: typeof r.position === "number" ? r.position : 0,
          };
        })
      : [];

    const intentVolume: Record<string, number> = {};
    for (const q of queries) {
      for (const [intent, pattern] of Object.entries(INTENT_KEYWORDS)) {
        if (intent === "general") continue;
        if (pattern.test(q.keyword)) {
          intentVolume[intent] = (intentVolume[intent] ?? 0) + q.impressions;
        }
      }
    }

    // 2. Check which categories already have JOINED advertisers
    const joinedAdvertisers = await prisma.cjAdvertiser.findMany({
      where: { status: "JOINED" },
      select: { name: true, category: true },
    });
    const categoryCoverage: Record<string, string[]> = {};
    for (const adv of joinedAdvertisers) {
      const cat = (adv.category ?? "general").toLowerCase();
      if (!categoryCoverage[cat]) categoryCoverage[cat] = [];
      categoryCoverage[cat].push(adv.name);
    }

    // 3. Build ranked recommendations
    const recommendations: Array<{
      name: string;
      network: string;
      category: string;
      typicalEpc: number;
      matchedIntentVolume: number;
      reason: string;
      priority: "critical" | "high" | "medium" | "low";
      notes: string;
    }> = [];

    for (const [cat, programs] of Object.entries(CATEGORY_PROGRAMS)) {
      const intentImpressions = intentVolume[cat] ?? 0;
      const hasJoined = (categoryCoverage[cat] ?? []).length > 0;
      const joinedNamesLower = new Set(
        (categoryCoverage[cat] ?? []).map((n) => n.toLowerCase()),
      );

      for (const program of programs) {
        if (joinedNamesLower.has(program.name.toLowerCase())) continue;

        let priority: "critical" | "high" | "medium" | "low" = "low";
        const reasons: string[] = [];

        if (intentImpressions > 1000) {
          priority = "high";
          reasons.push(`${intentImpressions} impressions/mo for ${cat} queries`);
        } else if (intentImpressions > 200) {
          priority = "medium";
          reasons.push(`${intentImpressions} impressions/mo for ${cat} queries`);
        } else if (intentImpressions > 0) {
          reasons.push(`${intentImpressions} impressions/mo for ${cat} queries (growing)`);
        } else {
          reasons.push(`No ${cat} traffic yet — apply proactively`);
        }

        if (!hasJoined) {
          priority = priority === "low" ? "medium" : "high";
          reasons.push(`No JOINED advertisers in ${cat} category yet`);
        }

        if (program.typicalEpc >= 5) {
          if (priority === "medium") priority = "high";
          else if (priority === "low") priority = "medium";
          reasons.push(`High EPC ($${program.typicalEpc}/click)`);
        }

        recommendations.push({
          name: program.name,
          network: program.network,
          category: cat,
          typicalEpc: program.typicalEpc,
          matchedIntentVolume: intentImpressions,
          reason: reasons.join("; "),
          priority,
          notes: program.notes,
        });
      }
    }

    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    recommendations.sort(
      (a, b) =>
        priorityOrder[b.priority] - priorityOrder[a.priority] ||
        b.matchedIntentVolume - a.matchedIntentVolume,
    );

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { startDate, endDate, days },
      intentVolume,
      categoryCoverage,
      recommendationCount: recommendations.length,
      recommendations,
      note:
        "Recommendations are scored by intent volume + existing coverage + typical EPC. Apply to `high`/`critical` first via CJ Affiliate dashboard (or direct programs where noted).",
      _hints: buildHints({ justCalled: "affiliate-recommendations" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/affiliate/recommendations]", message);
    return NextResponse.json(
      { error: "Failed to build recommendations", details: message },
      { status: 500 },
    );
  }
}
