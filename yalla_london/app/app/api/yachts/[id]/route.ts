export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

/**
 * GET /api/yachts/[id]
 *
 * Public yacht detail endpoint. Fetches a single yacht by slug or ID.
 * Includes: destination info, approved reviews, future availability, similar yachts.
 *
 * The [id] param is first matched as a slug (with siteId), then as a database ID.
 * This allows clean URLs like /api/yachts/azimut-grande-35 while still
 * supporting direct ID lookups.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { prisma } = await import("@/lib/db");
    const { id } = await params;
    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: "Yacht identifier is required" },
        { status: 400 },
      );
    }

    // Try slug first (more common for public URLs), then fall back to ID
    let yacht = await prisma.yacht.findFirst({
      where: {
        slug: id,
        siteId,
        status: "active",
      },
      include: {
        destination: true,
      },
    });

    if (!yacht) {
      yacht = await prisma.yacht.findFirst({
        where: {
          id,
          siteId,
          status: "active",
        },
        include: {
          destination: true,
        },
      });
    }

    if (!yacht) {
      return NextResponse.json(
        { error: "Yacht not found" },
        { status: 404 },
      );
    }

    // Fetch reviews, availability, and similar yachts in parallel
    const now = new Date();

    const [reviews, availability, similarYachts] = await Promise.all([
      // Approved reviews only, most recent first, capped at 10
      prisma.yachtReview.findMany({
        where: {
          yachtId: yacht.id,
          siteId,
          status: "APPROVED",
        },
        select: {
          id: true,
          authorName: true,
          rating: true,
          title: true,
          content_en: true,
          content_ar: true,
          charterDate: true,
          destination: true,
          verified: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Future availability windows with AVAILABLE status
      prisma.yachtAvailability.findMany({
        where: {
          yachtId: yacht.id,
          startDate: { gte: now },
          status: "AVAILABLE",
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          priceForPeriod: true,
          currency: true,
        },
        orderBy: { startDate: "asc" },
        take: 20,
      }),

      // Similar yachts: same type OR same destination, exclude current, limit 4
      prisma.yacht.findMany({
        where: {
          siteId,
          status: "active",
          id: { not: yacht.id },
          OR: [
            ...(yacht.type ? [{ type: yacht.type }] : []),
            ...(yacht.destinationId
              ? [{ destinationId: yacht.destinationId }]
              : []),
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          length: true,
          cabins: true,
          berths: true,
          pricePerWeekLow: true,
          pricePerWeekHigh: true,
          currency: true,
          images: true,
          rating: true,
          reviewCount: true,
          halalCateringAvailable: true,
          familyFriendly: true,
          crewIncluded: true,
          homePort: true,
          destination: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { rating: "desc" },
        take: 4,
      }),
    ]);

    return NextResponse.json({
      yacht,
      reviews,
      availability,
      similarYachts,
    });
  } catch (error) {
    console.warn("[Yachts API] Failed to fetch yacht detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch yacht details" },
      { status: 500 },
    );
  }
}
