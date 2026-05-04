export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId } from "@/config/sites";

/**
 * GET: Fetch published events for the public-facing events page.
 * Primary: DB Event table (populated by events-sync cron)
 * Fallback: Live Ticketmaster API when DB is empty
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const vipOnly = searchParams.get("vip") === "true";
    const siteId = request.headers.get("x-site-id") || getDefaultSiteId();

    // Try DB first
    let dbEvents: Array<Record<string, unknown>> = [];
    try {
      const { prisma } = await import("@/lib/db");

      const where: Record<string, unknown> = {
        published: true,
        date: { gte: new Date() },
      };

      if (siteId) {
        where.OR = [{ siteId }, { siteId: null }];
      }
      if (category && category !== "All") {
        where.category = category;
      }
      if (vipOnly) {
        where.vipAvailable = true;
      }
      if (search) {
        where.AND = [
          {
            OR: [
              { title_en: { contains: search, mode: "insensitive" } },
              { title_ar: { contains: search } },
              { venue: { contains: search, mode: "insensitive" } },
            ],
          },
        ];
      }

      dbEvents = await prisma.event.findMany({
        where,
        orderBy: { date: "asc" },
        take: 50,
      });
    } catch (dbErr) {
      console.warn("[events] DB query failed, falling back to Ticketmaster:", dbErr instanceof Error ? dbErr.message : String(dbErr));
    }

    // If DB has events, return them
    if (dbEvents.length > 0) {
      const categories = [...new Set<string>(dbEvents.map((e) => String(e.category)))];
      return NextResponse.json({
        success: true,
        source: "database",
        events: dbEvents.map((e) => ({
          id: e.id,
          title: { en: e.title_en, ar: e.title_ar || e.title_en },
          description: { en: e.description_en, ar: e.description_ar || e.description_en },
          date: e.date instanceof Date ? e.date.toISOString().split("T")[0] : String(e.date),
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
        categories: ["All", ...categories],
      });
    }

    // Fallback: Live Ticketmaster API
    try {
      const { getUpcomingEvents, formatEventPrice } = await import("@/lib/apis/events");
      const tmEvents = await getUpcomingEvents(siteId, {
        limit: 20,
        category: category && category !== "All" ? category : undefined,
      });

      if (tmEvents.length > 0) {
        const categories = [...new Set<string>(tmEvents.map((e) => e.category))];
        return NextResponse.json({
          success: true,
          source: "ticketmaster",
          events: tmEvents.map((e) => ({
            id: e.id,
            title: { en: e.name, ar: e.name },
            description: { en: `${e.name} at ${e.venue}, ${e.city}`, ar: `${e.name} في ${e.venue}` },
            date: e.date,
            time: e.time || "19:00",
            venue: e.venue,
            category: e.category,
            price: formatEventPrice(e),
            image: e.imageUrl,
            rating: 0,
            bookingUrl: e.url,
            affiliateTag: `tm-${e.id}`,
            ticketProvider: "Ticketmaster",
            vipAvailable: false,
            soldOut: false,
          })),
          categories: ["All", ...categories],
        });
      }
    } catch (tmErr) {
      console.warn("[events] Ticketmaster fallback failed:", tmErr instanceof Error ? tmErr.message : String(tmErr));
    }

    // No events from either source
    return NextResponse.json({
      success: true,
      source: "empty",
      events: [],
      categories: ["All"],
    });
  } catch (error) {
    console.error("[Events API]", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
