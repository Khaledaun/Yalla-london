export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

/**
 * GET /api/yachts/recommend   — preferences via query params
 * POST /api/yachts/recommend  — preferences via JSON body
 *
 * Public yacht recommendation endpoint. Returns top-matching yachts
 * based on user preferences with a match score breakdown.
 *
 * Scoring system (100 max):
 *   - Exact destination match: +30
 *   - Budget within price range: +25
 *   - Guest capacity meets need: +25
 *   - Halal catering match: +20
 *
 * Bonus points (can exceed 100):
 *   - Family-friendly match: +10
 *   - Crew included match: +10
 *   - Yacht type match: +10
 *   - Featured yacht: +5
 *
 * Query params (GET):
 *   ?destination=SLUG    - Preferred destination slug
 *   ?budget=N            - Maximum weekly budget (EUR)
 *   ?guests=N            - Number of guests
 *   ?halal=true          - Require halal catering
 *   ?family=true         - Prefer family-friendly
 *   ?crew=true           - Prefer crew included
 *   ?type=MOTOR_YACHT    - Preferred yacht type
 *   ?limit=N             - Max results (default: 5, max: 10)
 *
 * JSON body (POST):
 *   { destination, budget, guests, halal, family, crew, type, limit }
 */

interface RecommendPrefs {
  destination: string | null;
  budget: number | null;
  guests: number | null;
  halal: boolean;
  family: boolean;
  crew: boolean;
  type: string | null;
  limit: number;
}

function parsePrefsFromQuery(searchParams: URLSearchParams): RecommendPrefs {
  return {
    destination: searchParams.get("destination"),
    budget: searchParams.get("budget")
      ? parseFloat(searchParams.get("budget")!)
      : null,
    guests: searchParams.get("guests")
      ? parseInt(searchParams.get("guests")!, 10)
      : null,
    halal: searchParams.get("halal") === "true",
    family: searchParams.get("family") === "true",
    crew: searchParams.get("crew") === "true",
    type: searchParams.get("type"),
    limit: Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "5", 10)),
      10,
    ),
  };
}

async function parsePrefsFromBody(request: NextRequest): Promise<RecommendPrefs> {
  try {
    const body = await request.json();
    return {
      destination: body.destination || null,
      budget: typeof body.budget === "number" ? body.budget : null,
      guests: typeof body.guests === "number" ? body.guests : null,
      halal: body.halal === true,
      family: body.family === true,
      crew: body.crew === true,
      type: body.type || null,
      limit: Math.min(Math.max(1, body.limit || 5), 10),
    };
  } catch {
    return {
      destination: null,
      budget: null,
      guests: null,
      halal: false,
      family: false,
      crew: false,
      type: null,
      limit: 5,
    };
  }
}

async function handleRecommend(request: NextRequest, prefs: RecommendPrefs) {
  try {
    const { prisma } = await import("@/lib/db");
    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    const { destination: destinationSlug, budget, guests, halal, family, crew, type: preferredType, limit } = prefs;

    // Resolve destination slug to ID for scoring
    let destinationId: string | null = null;
    if (destinationSlug) {
      const dest = await prisma.yachtDestination.findFirst({
        where: { slug: destinationSlug, siteId, status: "active" },
        select: { id: true },
      });
      destinationId = dest?.id ?? null;
    }

    // Pre-filter: only active yachts for this site
    // Apply loose filters to avoid returning completely irrelevant results
    const where: Record<string, unknown> = {
      siteId,
      status: "active",
    };

    // If budget specified, only fetch yachts whose low price is at most 2x the budget
    // (generous filter — scoring will rank properly)
    if (budget && budget > 0) {
      where.pricePerWeekLow = { lte: budget * 2 };
    }

    // Fetch a pool of candidate yachts (cap at 100 for performance)
    const candidates = await prisma.yacht.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        length: true,
        yearBuilt: true,
        cabins: true,
        berths: true,
        bathrooms: true,
        crewSize: true,
        pricePerWeekLow: true,
        pricePerWeekHigh: true,
        currency: true,
        description_en: true,
        images: true,
        halalCateringAvailable: true,
        familyFriendly: true,
        crewIncluded: true,
        homePort: true,
        cruisingArea: true,
        rating: true,
        reviewCount: true,
        featured: true,
        destinationId: true,
        destination: {
          select: {
            id: true,
            name: true,
            slug: true,
            region: true,
          },
        },
      },
      take: 100,
    });

    // Score each candidate
    const scored = candidates.map((yacht) => {
      let score = 0;
      const breakdown: Record<string, number> = {};

      // Destination match (+30)
      if (destinationId && yacht.destinationId === destinationId) {
        score += 30;
        breakdown.destination = 30;
      }

      // Budget match (+25): yacht's low price is within budget
      if (budget && budget > 0 && yacht.pricePerWeekLow) {
        const lowPrice = Number(yacht.pricePerWeekLow);
        if (lowPrice <= budget) {
          score += 25;
          breakdown.budget = 25;
        } else if (lowPrice <= budget * 1.2) {
          // Slightly over budget — partial credit
          score += 10;
          breakdown.budget = 10;
        }
      }

      // Guest capacity match (+25): berths >= requested guests
      if (guests && guests > 0 && yacht.berths >= guests) {
        score += 25;
        breakdown.guests = 25;
      } else if (guests && guests > 0 && yacht.berths >= guests - 1) {
        // One short — partial credit
        score += 12;
        breakdown.guests = 12;
      }

      // Halal match (+20)
      if (halal && yacht.halalCateringAvailable) {
        score += 20;
        breakdown.halal = 20;
      }

      // Family-friendly bonus (+10)
      if (family && yacht.familyFriendly) {
        score += 10;
        breakdown.family = 10;
      }

      // Crew included bonus (+10)
      if (crew && yacht.crewIncluded) {
        score += 10;
        breakdown.crew = 10;
      }

      // Yacht type bonus (+10)
      if (
        preferredType &&
        yacht.type === preferredType
      ) {
        score += 10;
        breakdown.type = 10;
      }

      // Featured bonus (+5)
      if (yacht.featured) {
        score += 5;
        breakdown.featured = 5;
      }

      // Rating tiebreaker (+0-5 based on rating)
      if (yacht.rating) {
        const ratingBonus = Math.round(Number(yacht.rating));
        score += ratingBonus;
        breakdown.rating = ratingBonus;
      }

      return {
        yacht: {
          id: yacht.id,
          name: yacht.name,
          slug: yacht.slug,
          type: yacht.type,
          length: yacht.length,
          yearBuilt: yacht.yearBuilt,
          cabins: yacht.cabins,
          berths: yacht.berths,
          bathrooms: yacht.bathrooms,
          crewSize: yacht.crewSize,
          pricePerWeekLow: yacht.pricePerWeekLow,
          pricePerWeekHigh: yacht.pricePerWeekHigh,
          currency: yacht.currency,
          description_en: yacht.description_en,
          images: yacht.images,
          halalCateringAvailable: yacht.halalCateringAvailable,
          familyFriendly: yacht.familyFriendly,
          crewIncluded: yacht.crewIncluded,
          homePort: yacht.homePort,
          cruisingArea: yacht.cruisingArea,
          rating: yacht.rating,
          reviewCount: yacht.reviewCount,
          featured: yacht.featured,
          destination: yacht.destination,
        },
        matchScore: score,
        scoreBreakdown: breakdown,
      };
    });

    // Sort by score descending, take top N
    scored.sort((a, b) => b.matchScore - a.matchScore);
    const recommendations = scored.slice(0, limit);

    return NextResponse.json({
      recommendations,
      criteria: {
        destination: destinationSlug || null,
        budget: budget || null,
        guests: guests || null,
        halal,
        family,
        crew,
        type: preferredType || null,
      },
      total: recommendations.length,
    });
  } catch (error) {
    console.warn("[Yachts API] Failed to generate recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefs = parsePrefsFromQuery(searchParams);
  return handleRecommend(request, prefs);
}

export async function POST(request: NextRequest) {
  const prefs = await parsePrefsFromBody(request);
  return handleRecommend(request, prefs);
}
