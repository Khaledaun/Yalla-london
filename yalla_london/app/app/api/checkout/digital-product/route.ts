export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Digital Product Checkout
 * POST /api/checkout/digital-product
 *
 * Creates a Stripe Checkout Session in "payment" mode (one-time purchase)
 * for a DigitalProduct. On success Stripe redirects to the success URL
 * where the customer can download their purchase.
 *
 * Body: { productId, customerEmail, customerName?, successUrl?, cancelUrl?, utmSource?, utmCampaign? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      customerEmail,
      customerName,
      successUrl,
      cancelUrl,
      utmSource,
      utmCampaign,
    } = body;

    if (!productId || !customerEmail) {
      return NextResponse.json(
        { error: "productId and customerEmail are required" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/db");
    const { isStripeConfigured, getStripe } = await import(
      "@/lib/billing/stripe"
    );

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 },
      );
    }

    // Look up the product
    const product = await prisma.digitalProduct.findUnique({
      where: { id: productId },
    });

    if (!product || !product.is_active) {
      return NextResponse.json(
        { error: "Product not found or unavailable" },
        { status: 404 },
      );
    }

    if (product.price === 0) {
      // Free product — create a completed purchase directly
      const { randomBytes } = await import("crypto");
      const downloadToken = `dl_${randomBytes(24).toString("hex")}`;

      await prisma.purchase.create({
        data: {
          site_id: product.site_id || "yalla-london",
          product_id: product.id,
          customer_email: customerEmail,
          customer_name: customerName || null,
          amount: 0,
          currency: product.currency,
          payment_provider: "free",
          status: "COMPLETED",
          download_token: downloadToken,
          download_limit: 5,
          completed_at: new Date(),
          utm_source: utmSource || null,
          utm_campaign: utmCampaign || null,
        },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

      return NextResponse.json({
        success: true,
        free: true,
        downloadUrl: `${baseUrl}/shop/download?token=${downloadToken}`,
      });
    }

    // Paid product — create Stripe Checkout Session
    const stripe = getStripe();
    const { randomBytes } = await import("crypto");
    const downloadToken = `dl_${randomBytes(24).toString("hex")}`;

    // Create a pending purchase record first
    const purchase = await prisma.purchase.create({
      data: {
        site_id: product.site_id || "yalla-london",
        product_id: product.id,
        customer_email: customerEmail,
        customer_name: customerName || null,
        amount: product.price,
        currency: product.currency,
        payment_provider: "stripe",
        status: "PENDING",
        download_token: downloadToken,
        download_limit: 5,
        utm_source: utmSource || null,
        utm_campaign: utmCampaign || null,
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: {
              name: product.name_en,
              description:
                product.description_en.length > 500
                  ? product.description_en.slice(0, 497) + "..."
                  : product.description_en,
              ...(product.cover_image ? { images: [product.cover_image] } : {}),
            },
            unit_amount: product.price, // already in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        purchase_type: "digital_product",
        purchase_id: purchase.id,
        product_id: product.id,
        download_token: downloadToken,
        customer_email: customerEmail,
      },
      success_url:
        successUrl ||
        `${baseUrl}/shop/download?token=${downloadToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/shop?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[Checkout] Digital product error:", error);
    return NextResponse.json(
      {
        error: "Checkout failed",
      },
      { status: 500 },
    );
  }
}
