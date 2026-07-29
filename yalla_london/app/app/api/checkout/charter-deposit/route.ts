export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Charter Deposit Checkout
 * POST /api/checkout/charter-deposit
 *
 * Creates a Stripe Checkout Session for a yacht charter deposit payment.
 * Typical range: €5,000–€15,000 (industry standard 50% of base charter fee).
 *
 * Maps to Execution Plan action [0.4]: Payment integration (Stripe) for
 * charter deposits.
 *
 * Flow:
 * 1. Client submits deposit request with inquiry reference + amount
 * 2. This route creates a Stripe Checkout Session in "payment" mode
 * 3. Client is redirected to Stripe-hosted checkout
 * 4. On success → webhook updates CharterInquiry status to DEPOSIT_PAID
 * 5. Confirmation email sent via Resend
 */

interface DepositRequest {
  inquiryId: string;
  amount: number; // in EUR cents (e.g., 500000 = €5,000)
  currency?: string; // default EUR
  customerEmail: string;
  customerName: string;
  yachtName?: string;
  charterDates?: string; // human-readable date range
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { isStripeConfigured, getStripe } = await import(
      "@/lib/billing/stripe"
    );

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as DepositRequest;

    // Validate required fields
    if (!body.inquiryId || !body.amount || !body.customerEmail) {
      return NextResponse.json(
        { error: "Missing required fields: inquiryId, amount, customerEmail" },
        { status: 400 }
      );
    }

    // Validate amount range (€1,000 – €50,000 in cents)
    const minAmount = 100_000; // €1,000
    const maxAmount = 5_000_000; // €50,000
    if (body.amount < minAmount || body.amount > maxAmount) {
      return NextResponse.json(
        {
          error: `Deposit amount must be between €${minAmount / 100} and €${maxAmount / 100}`,
        },
        { status: 400 }
      );
    }

    // Verify the inquiry exists
    const { prisma } = await import("@/lib/db");
    const inquiry = await prisma.charterInquiry.findUnique({
      where: { id: body.inquiryId },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        firstName: true,
        lastName: true,
        email: true,
        destination: true,
      },
    });

    if (!inquiry) {
      return NextResponse.json(
        { error: "Charter inquiry not found" },
        { status: 404 }
      );
    }

    const currency = (body.currency || "EUR").toLowerCase();
    const stripe = getStripe();

    const { getSiteDomain } = await import("@/config/sites");
    const domain = getSiteDomain("zenitha-yachts-med");

    const successUrl =
      body.successUrl ||
      `${domain}/inquiry/confirmation?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      body.cancelUrl || `${domain}/inquiry?canceled=true`;

    const yachtLabel = body.yachtName || "Yacht Charter";
    const dateLabel = body.charterDates || "Dates TBC";
    const refNumber = inquiry.referenceNumber || inquiry.id.slice(0, 8);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: body.customerEmail,
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: body.amount,
            product_data: {
              name: `Charter Deposit — ${yachtLabel}`,
              description: `Ref: ${refNumber} | ${dateLabel} | ${inquiry.destination || "Mediterranean"}`,
              metadata: {
                inquiry_id: body.inquiryId,
                reference_number: refNumber,
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        purchase_type: "charter_deposit",
        inquiry_id: body.inquiryId,
        reference_number: refNumber,
        site_id: "zenitha-yachts-med",
        customer_name: body.customerName,
        yacht_name: body.yachtName || "",
        charter_dates: body.charterDates || "",
      },
      payment_intent_data: {
        metadata: {
          purchase_type: "charter_deposit",
          inquiry_id: body.inquiryId,
          reference_number: refNumber,
          site_id: "zenitha-yachts-med",
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      referenceNumber: refNumber,
    });
  } catch (error) {
    console.error("[charter-deposit] Error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
