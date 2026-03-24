/**
 * Email Send API — POST /api/email/send
 *
 * Sends transactional emails via Resend with idempotency keys.
 * Supports: welcome, booking, contact, digest, and raw HTML.
 *
 * Auth: requireAdmin for all send types.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { type, to, ...params } = body;

    if (!to) {
      return NextResponse.json({ success: false, error: "Missing 'to' field" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ success: false, error: "Missing 'type' field" }, { status: 400 });
    }

    const {
      sendWelcomeEmail,
      sendBookingConfirmation,
      sendContactConfirmation,
      sendNewsletterDigest,
      sendResendEmail,
      isResendConfigured,
    } = await import("@/lib/email/resend-service");

    if (!isResendConfigured()) {
      return NextResponse.json(
        { success: false, error: "RESEND_API_KEY not configured. Add it in Vercel environment variables." },
        { status: 503 }
      );
    }

    let result;

    switch (type) {
      case "welcome":
        result = await sendWelcomeEmail(
          to,
          params.name || "",
          params.locale || "en",
          params.siteId
        );
        break;

      case "booking":
        result = await sendBookingConfirmation(to, {
          name: params.name,
          bookingName: params.bookingName || "Experience",
          bookingDate: params.bookingDate,
          guests: params.guests,
          totalPaid: params.totalPaid || "0.00",
          currency: params.currency,
          stripeReceiptUrl: params.stripeReceiptUrl,
          locale: params.locale,
        }, params.siteId);
        break;

      case "contact":
        result = await sendContactConfirmation(to, {
          name: params.name,
          subject: params.subject,
          locale: params.locale,
        }, params.siteId);
        break;

      case "digest":
        result = await sendNewsletterDigest(
          Array.isArray(to) ? to : [to],
          params.articles || [],
          params.locale || "en",
          params.siteId
        );
        break;

      case "raw":
        // Raw HTML send with optional idempotency key
        if (!params.subject || !params.html) {
          return NextResponse.json(
            { success: false, error: "Raw type requires 'subject' and 'html' fields" },
            { status: 400 }
          );
        }
        result = await sendResendEmail({
          to: Array.isArray(to) ? to : [to],
          subject: params.subject,
          html: params.html,
          text: params.text,
          from: params.from,
          replyTo: params.replyTo || "khaled@zenitha.luxury",
          idempotencyKey: params.idempotencyKey,
          tags: params.tags,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}. Use: welcome, booking, contact, digest, raw` },
          { status: 400 }
        );
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err) {
    console.error("[email/send] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
