export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";

/**
 * Admin Events CRUD API
 * GET: List all events (including unpublished)
 * POST: Create a new event
 */

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const category = searchParams.get("category");

  const where: any = {};
  if (category) where.category = category;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { date: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    events,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const {
      title_en,
      title_ar,
      description_en,
      description_ar,
      date,
      time,
      venue,
      category,
      price,
      image,
      rating,
      bookingUrl,
      affiliateTag,
      ticketProvider,
      vipAvailable,
      soldOut,
      featured,
      published,
      siteId,
    } = body;

    if (
      !title_en ||
      !description_en ||
      !date ||
      !time ||
      !venue ||
      !category ||
      !price ||
      !bookingUrl
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title_en, description_en, date, time, venue, category, price, bookingUrl",
        },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
      data: {
        title_en,
        title_ar: title_ar || null,
        description_en,
        description_ar: description_ar || null,
        date: new Date(date),
        time,
        venue,
        category,
        price,
        image: image || null,
        rating: rating || 0,
        bookingUrl,
        affiliateTag: affiliateTag || null,
        ticketProvider: ticketProvider || null,
        vipAvailable: vipAvailable || false,
        soldOut: soldOut || false,
        featured: featured || false,
        published: published !== false,
        siteId: siteId || null,
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("[Admin Events POST]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create event",
      },
      { status: 500 },
    );
  }
});
