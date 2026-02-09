export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET: Fetch published events for the public-facing events page
 * Supports filtering by category, search, and VIP status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const vipOnly = searchParams.get("vip") === "true";
    const siteId = request.headers.get("x-site-id");

    const where: any = {
      published: true,
      date: { gte: new Date() }, // Only future events
    };

    if (siteId) {
      where.OR = [{ siteId }, { siteId: null }]; // Site-specific + global events
    }

    if (category && category !== "All") {
      where.category = category;
    }

    if (vipOnly) {
      where.vipAvailable = true;
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title_en: { contains: search, mode: "insensitive" } },
            { title_ar: { contains: search } },
            { venue: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { date: "asc" },
      take: 50,
    });

    // Get distinct categories for filter UI
    const categories = await prisma.event.findMany({
      where: { published: true },
      select: { category: true },
      distinct: ["category"],
    });

    return NextResponse.json({
      success: true,
      events: events.map((e) => ({
        id: e.id,
        title: { en: e.title_en, ar: e.title_ar || e.title_en },
        description: {
          en: e.description_en,
          ar: e.description_ar || e.description_en,
        },
        date: e.date.toISOString().split("T")[0],
        time: e.time,
        venue: e.venue,
        category: e.category,
        price: e.price,
        image: e.image,
        rating: e.rating,
        bookingUrl: e.bookingUrl,
        affiliateTag: e.affiliateTag,
        ticketProvider: e.ticketProvider,
        vipAvailable: e.vipAvailable,
        soldOut: e.soldOut,
      })),
      categories: ["All", ...categories.map((c) => c.category)],
    });
  } catch (error) {
    console.error("[Events API]", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
