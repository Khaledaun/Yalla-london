export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Public Shop Products API
 * GET /api/shop/products
 *
 * Returns active digital products for the public shop page.
 * Supports optional query params: ?category=PDF_GUIDE&featured=true&search=london
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");

    // Build filter
    const where: Record<string, unknown> = { is_active: true };

    if (category && category !== "all") {
      where.product_type = category;
    }

    if (featured === "true") {
      where.featured = true;
    }

    if (search) {
      where.OR = [
        { name_en: { contains: search, mode: "insensitive" } },
        { name_ar: { contains: search, mode: "insensitive" } },
        { description_en: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.digitalProduct.findMany({
      where,
      select: {
        id: true,
        name_en: true,
        name_ar: true,
        slug: true,
        description_en: true,
        description_ar: true,
        price: true,
        compare_price: true,
        currency: true,
        product_type: true,
        cover_image: true,
        features_json: true,
        featured: true,
        created_at: true,
        _count: {
          select: {
            purchases: {
              where: { status: "COMPLETED" },
            },
          },
        },
      },
      orderBy: [{ featured: "desc" }, { created_at: "desc" }],
    });

    // Format prices for display
    const formatted = products.map((p) => ({
      id: p.id,
      name_en: p.name_en,
      name_ar: p.name_ar,
      slug: p.slug,
      description_en: p.description_en,
      description_ar: p.description_ar,
      price: p.price / 100, // cents to units
      originalPrice: p.compare_price ? p.compare_price / 100 : null,
      currency: p.currency,
      type: p.product_type,
      image: p.cover_image,
      features: p.features_json || [],
      featured: p.featured,
      salesCount: p._count.purchases,
    }));

    return NextResponse.json({ products: formatted });
  } catch (error) {
    console.error("[Shop API] Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
