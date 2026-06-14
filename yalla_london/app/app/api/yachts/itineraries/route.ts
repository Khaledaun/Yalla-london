export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

/**
 * GET /api/yachts/itineraries
 *
 * Public endpoint listing charter itineraries (pre-built sailing routes).
 * Optionally filtered by destination. Each itinerary includes its
 * destination name and day-by-day stops.
 *
 * Query params:
 *   ?destinationId=ID   - Filter by destination ID
 *   ?difficulty=EASY     - Filter by difficulty (EASY, MODERATE, ADVANCED)
 *   ?minDuration=N       - Minimum duration in days
 *   ?maxDuration=N       - Maximum duration in days
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    const destinationId = searchParams.get("destinationId");
    const difficulty = searchParams.get("difficulty");
    const minDuration = searchParams.get("minDuration");
    const maxDuration = searchParams.get("maxDuration");

    // Build where clause — always scoped by siteId
    const where: Record<string, unknown> = {
      siteId,
      status: "active",
    };

    if (destinationId) {
      where.destinationId = destinationId;
    }

    const validDifficulties = ["EASY", "MODERATE", "ADVANCED"];
    if (difficulty && validDifficulties.includes(difficulty)) {
      where.difficulty = difficulty;
    }

    // Duration range filter
    if (minDuration || maxDuration) {
      const durationFilter: Record<string, number> = {};
      if (minDuration) {
        const min = parseInt(minDuration, 10);
        if (!isNaN(min) && min > 0) durationFilter.gte = min;
      }
      if (maxDuration) {
        const max = parseInt(maxDuration, 10);
        if (!isNaN(max) && max > 0) durationFilter.lte = max;
      }
      if (Object.keys(durationFilter).length > 0) {
        where.duration = durationFilter;
      }
    }

    const itineraries = await prisma.charterItinerary.findMany({
      where,
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        duration: true,
        difficulty: true,
        description_en: true,
        description_ar: true,
        stops: true,
        recommendedYachtTypes: true,
        estimatedCost: true,
        currency: true,
        bestSeason: true,
        heroImage: true,
        destination: {
          select: {
            id: true,
            name: true,
            slug: true,
            region: true,
          },
        },
        createdAt: true,
      },
      orderBy: { duration: "asc" },
    });

    return NextResponse.json({
      itineraries,
    });
  } catch (error) {
    console.warn("[Yachts API] Failed to fetch itineraries:", error);
    return NextResponse.json(
      { error: "Failed to fetch itineraries" },
      { status: 500 },
    );
  }
}
