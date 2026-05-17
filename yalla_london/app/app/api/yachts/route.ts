export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

/**
 * GET /api/yachts
 *
 * Public yacht search endpoint with filtering, sorting, and pagination.
 * Powers the yacht listing/search pages on the Zenitha Yachts frontend.
 *
 * Query params:
 *   ?destination=SLUG   - Filter by destination slug
 *   ?type=MOTOR_YACHT   - Filter by yacht type (enum: SAILBOAT, CATAMARAN, MOTOR_YACHT, GULET, SUPERYACHT, POWER_CATAMARAN)
 *   ?minPrice=N         - Minimum weekly price (EUR)
 *   ?maxPrice=N         - Maximum weekly price (EUR)
 *   ?guests=N           - Minimum guest capacity (berths)
 *   ?halal=true         - Filter for halal catering
 *   ?family=true        - Filter for family-friendly
 *   ?crew=true          - Filter for crew included
 *   ?sort=FIELD         - Sort: price_asc, price_desc, rating, newest, popular (default: newest)
 *   ?page=N             - Page number (default: 1)
 *   ?limit=N            - Items per page (default: 12, max: 50)
 *   ?featured=true      - Featured yachts only
 *   ?q=SEARCH           - Free-text search across name, description, home port, cruising area
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);

    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "12", 10)),
      50,
    );
    const offset = (page - 1) * limit;

    // Parse filters
    const destination = searchParams.get("destination");
    const type = searchParams.get("type");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const guests = searchParams.get("guests");
    const halal = searchParams.get("halal");
    const family = searchParams.get("family");
    const crew = searchParams.get("crew");
    const featured = searchParams.get("featured");
    const query = searchParams.get("q");
    const sort = searchParams.get("sort") || "newest";

    // Build dynamic where clause — always scoped by siteId
    const where: Record<string, unknown> = {
      siteId,
      status: "active",
    };

    // Destination filter (by slug via relation)
    if (destination) {
      where.destination = { slug: destination, siteId };
    }

    // Yacht type filter
    const validTypes = [
      "SAILBOAT",
      "CATAMARAN",
      "MOTOR_YACHT",
      "GULET",
      "SUPERYACHT",
      "POWER_CATAMARAN",
    ];
    if (type && validTypes.includes(type)) {
      where.type = type;
    }

    // Price range filter
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min) && min >= 0) {
        where.pricePerWeekLow = {
          ...(where.pricePerWeekLow as Record<string, unknown> || {}),
          gte: min,
        };
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max) && max > 0) {
        where.pricePerWeekHigh = {
          ...(where.pricePerWeekHigh as Record<string, unknown> || {}),
          lte: max,
        };
      }
    }

    // Guest capacity filter (berths >= guests)
    if (guests) {
      const g = parseInt(guests, 10);
      if (!isNaN(g) && g > 0) {
        where.berths = { gte: g };
      }
    }

    // Boolean filters
    if (halal === "true") where.halalCateringAvailable = true;
    if (family === "true") where.familyFriendly = true;
    if (crew === "true") where.crewIncluded = true;
    if (featured === "true") where.featured = true;

    // Free-text search
    if (query && query.trim().length > 0) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description_en: { contains: q, mode: "insensitive" } },
        { description_ar: { contains: q } },
        { homePort: { contains: q, mode: "insensitive" } },
        { cruisingArea: { contains: q, mode: "insensitive" } },
        { builder: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    let orderBy: Record<string, string>;
    switch (sort) {
      case "price_asc":
        orderBy = { pricePerWeekLow: "asc" };
        break;
      case "price_desc":
        orderBy = { pricePerWeekHigh: "desc" };
        break;
      case "rating":
        orderBy = { rating: "desc" };
        break;
      case "popular":
        orderBy = { reviewCount: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // Execute query + count in parallel
    const [yachts, total] = await Promise.all([
      prisma.yacht.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          length: true,
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
          images: true,
          halalCateringAvailable: true,
          familyFriendly: true,
          crewIncluded: true,
          homePort: true,
          cruisingArea: true,
          rating: true,
          reviewCount: true,
          featured: true,
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
      }),
      prisma.yacht.count({ where }),
    ]);

    // Fetch available filter options for the current site (for filter dropdowns)
    const [destinations, distinctTypes, priceAgg] = await Promise.all([
      prisma.yachtDestination.findMany({
        where: { siteId, status: "active" },
        select: { id: true, name: true, slug: true, region: true },
        orderBy: { name: "asc" },
      }),
      prisma.yacht.findMany({
        where: { siteId, status: "active" },
        select: { type: true },
        distinct: ["type"],
      }),
      prisma.yacht.aggregate({
        where: { siteId, status: "active" },
        _min: { pricePerWeekLow: true },
        _max: { pricePerWeekHigh: true },
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      yachts,
      total,
      page,
      pages,
      filters: {
        destinations,
        types: distinctTypes.map((d) => d.type),
        priceRange: {
          min: priceAgg._min.pricePerWeekLow
            ? Number(priceAgg._min.pricePerWeekLow)
            : null,
          max: priceAgg._max.pricePerWeekHigh
            ? Number(priceAgg._max.pricePerWeekHigh)
            : null,
        },
      },
    });
  } catch (error) {
    console.warn("[Yachts API] Failed to fetch yachts:", error);
    return NextResponse.json(
      { error: "Failed to fetch yachts" },
      { status: 500 },
    );
  }
}
