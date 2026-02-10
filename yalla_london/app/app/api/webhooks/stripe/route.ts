export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles both:
 * 1. Subscription/billing events (checkout, subscription changes, invoices)
 * 2. Payment events (payment_intent succeeded/failed for bookings)
 *
 * Verifies webhook signature with Stripe SDK for security.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  try {
    const { isStripeConfigured, getStripe, handleStripeWebhook } = await import(
      "@/lib/billing/stripe"
    );

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Handle billing/subscription events
    const result = await handleStripeWebhook(event);
    console.log(`[Stripe Webhook] ${event.type} → ${result.action}`);

    // Handle legacy booking payment events
    if (event.type === "payment_intent.succeeded") {
      await handleBookingPayment(event.data.object as unknown as Record<string, unknown>);
    }

    return NextResponse.json({
      received: true,
      type: event.type,
      action: result.action,
    });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 400 },
    );
  }
}

/** Handle booking payment success (legacy flow from event tickets) */
async function handleBookingPayment(paymentIntent: Record<string, unknown>) {
  try {
    const metadata = (paymentIntent.metadata || {}) as Record<string, string>;
    const customerEmail = metadata.customer_email;
    const customerName = metadata.customer_name;
    const eventName = metadata.event_name;
    const totalAmount = ((paymentIntent.amount as number) || 0) / 100;

    console.log("[Stripe Webhook] Booking payment:", {
      id: paymentIntent.id,
      customer: customerName,
      event: eventName,
      amount: totalAmount,
    });

    // Send notification (best-effort)
    try {
      const { notifications } = await import(
        "@/lib/integrations/notifications"
      );
      await notifications.notifyBooking(
        customerName || "Unknown",
        eventName || "Unknown Event",
        totalAmount,
      );
    } catch {
      // Notifications are best-effort
    }

    // Send confirmation email (best-effort)
    if (customerEmail) {
      try {
        const { SendGridAPI } = await import(
          "@/lib/integrations/email-marketing"
        );
        const sendgrid = new SendGridAPI();
        await sendgrid.sendEmail(
          customerEmail,
          "Booking Confirmed - Yalla London",
          `<div style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #7c3aed;">Booking Confirmed!</h1>
            <p>Dear ${customerName},</p>
            <p>Your booking for <strong>${eventName}</strong> has been confirmed.</p>
            <p><strong>Total Paid:</strong> £${totalAmount}</p>
            <p><strong>Reference:</strong> ${paymentIntent.id}</p>
          </div>`,
        );
      } catch {
        // Email is best-effort
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Booking handler error:", err);
  }
}
