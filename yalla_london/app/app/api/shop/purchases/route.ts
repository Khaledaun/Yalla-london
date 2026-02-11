export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Customer Purchases API
 * GET /api/shop/purchases?email=customer@example.com
 *
 * Returns all purchases for a given email address, allowing
 * customers to retrieve their download links.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email parameter is required" },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/db");

    const purchases = await prisma.purchase.findMany({
      where: { customer_email: email },
      include: {
        product: {
          select: {
            name_en: true,
            name_ar: true,
            slug: true,
            product_type: true,
            cover_image: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

    const formatted = purchases.map((p) => ({
      id: p.id,
      product: {
        name_en: p.product.name_en,
        name_ar: p.product.name_ar,
        slug: p.product.slug,
        type: p.product.product_type,
        image: p.product.cover_image,
      },
      amount: p.amount / 100,
      currency: p.currency,
      status: p.status,
      downloadUrl:
        p.status === "COMPLETED"
          ? `${baseUrl}/shop/download?token=${p.download_token}`
          : null,
      downloadsUsed: p.download_count,
      downloadsRemaining: p.download_limit - p.download_count,
      purchasedAt: p.completed_at || p.created_at,
    }));

    return NextResponse.json({ purchases: formatted });
  } catch (error) {
    console.error("[Purchases API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 },
    );
  }
}
