/**
 * GET /api/yachts/compare?ids=id1,id2,id3
 *
 * Fetch 2-3 yachts by ID for side-by-side comparison.
 * Public endpoint — powers the /yachts/compare page.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const siteId = request.headers.get("x-site-id") || getDefaultSiteId();

    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json(
        { error: "ids query parameter is required (comma-separated)" },
        { status: 400 },
      );
    }

    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3); // max 3

    if (ids.length < 2) {
      return NextResponse.json(
        { error: "At least 2 yacht IDs are required for comparison" },
        { status: 400 },
      );
    }

    const yachts = await prisma.yacht.findMany({
      where: {
        siteId,
        status: "active",
        OR: [
          { id: { in: ids } },
          { slug: { in: ids } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        length: true,
        beam: true,
        draft: true,
        yearBuilt: true,
        builder: true,
        model: true,
        cabins: true,
        berths: true,
        bathrooms: true,
        crewSize: true,
        pricePerWeekLow: true,
        pricePerWeekHigh: true,
        currency: true,
        description_en: true,
        description_ar: true,
        features: true,
        images: true,
        waterSports: true,
        halalCateringAvailable: true,
        familyFriendly: true,
        crewIncluded: true,
        homePort: true,
        cruisingArea: true,
        rating: true,
        reviewCount: true,
        destination: {
          select: {
            id: true,
            name: true,
            slug: true,
            region: true,
          },
        },
      },
    });

    if (yachts.length < 2) {
      return NextResponse.json(
        { error: "Could not find enough active yachts for comparison" },
        { status: 404 },
      );
    }

    // Preserve requested order
    const ordered = ids
      .map((id) => yachts.find((y) => y.id === id || y.slug === id))
      .filter(Boolean);

    return NextResponse.json({ yachts: ordered });
  } catch (error) {
    console.warn("[Yachts Compare API] Failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch yacht comparison data" },
      { status: 500 },
    );
  }
}
