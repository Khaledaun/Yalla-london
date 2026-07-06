export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Digital Product Download — Token Validation & File Delivery
 *
 * GET /api/products/pdf/download?token=dl_abc123...
 *
 * Called by /shop/download page after a successful purchase.
 * Validates the download token, enforces download limits,
 * increments the counter, and returns the file URL.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing download token", code: "MISSING_TOKEN" },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/db");

    // Look up the purchase by download token
    const purchase = await prisma.purchase.findFirst({
      where: { download_token: token },
      include: {
        product: {
          select: {
            id: true,
            name_en: true,
            name_ar: true,
            file_url: true,
            cover_image: true,
            product_type: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json(
        { error: "Invalid download token", code: "INVALID_TOKEN" },
        { status: 404 },
      );
    }

    // Check payment status
    if (purchase.status === "PENDING") {
      return NextResponse.json(
        {
          error: "Payment not yet confirmed. Please wait a moment and refresh.",
          code: "PAYMENT_PENDING",
        },
        { status: 402 },
      );
    }

    if (purchase.status === "FAILED") {
      return NextResponse.json(
        { error: "Payment failed. Please contact support.", code: "PAYMENT_FAILED" },
        { status: 402 },
      );
    }

    if (purchase.status === "REFUNDED") {
      return NextResponse.json(
        { error: "This purchase has been refunded.", code: "REFUNDED" },
        { status: 403 },
      );
    }

    // Enforce download limit
    if (purchase.download_count >= purchase.download_limit) {
      return NextResponse.json(
        {
          error: `Download limit reached (${purchase.download_limit} downloads).`,
          code: "LIMIT_REACHED",
        },
        { status: 403 },
      );
    }

    // Increment download count
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { download_count: { increment: 1 } },
    });

    const downloadsRemaining =
      purchase.download_limit - purchase.download_count - 1;

    return NextResponse.json({
      success: true,
      fileUrl: purchase.product?.file_url || null,
      product: {
        id: purchase.product?.id,
        name: purchase.product?.name_en || "Digital Product",
        type: purchase.product?.product_type || "PDF_GUIDE",
        coverImage: purchase.product?.cover_image || null,
      },
      downloadsRemaining: Math.max(0, downloadsRemaining),
      purchaseId: purchase.id,
    });
  } catch (err) {
    console.error(
      "[download] Token validation failed:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { error: "Failed to validate download", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
