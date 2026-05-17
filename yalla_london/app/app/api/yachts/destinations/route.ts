export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

/**
 * GET /api/yachts/destinations
 *
 * Public endpoint listing all active charter destinations for the site.
 * Each destination includes the count of active yachts available there.
 * Powers the destination browse page and filter dropdowns.
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    const destinations = await prisma.yachtDestination.findMany({
      where: {
        siteId,
        status: "active",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        country: true,
        description_en: true,
        description_ar: true,
        seasonStart: true,
        seasonEnd: true,
        bestMonths: true,
        heroImage: true,
        galleryImages: true,
        averagePricePerWeek: true,
        highlights: true,
        weatherInfo: true,
        marinas: true,
        _count: {
          select: {
            yachts: {
              where: { status: "active", siteId },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Flatten _count into yachtCount for cleaner response
    const result = destinations.map((d) => ({
      ...d,
      yachtCount: d._count.yachts,
      _count: undefined,
    }));

    return NextResponse.json({
      destinations: result,
    });
  } catch (error) {
    console.warn("[Yachts API] Failed to fetch destinations:", error);
    return NextResponse.json(
      { error: "Failed to fetch destinations" },
      { status: 500 },
    );
  }
}
