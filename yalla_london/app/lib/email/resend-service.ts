/**
 * Resend Email Service — Typed wrapper around the Resend SDK
 *
 * This supplements the existing sender.ts (which uses raw fetch).
 * Use this for template-based sends, idempotency, and React Email rendering.
 *
 * The existing sender.ts remains the primary low-level send interface.
 * This service adds:
 *   1. React Email template rendering (server-side JSX → HTML)
 *   2. Idempotency key support (prevents duplicate sends)
 *   3. High-level methods for common email types
 *   4. Resend webhook signature verification
 */

import { Resend } from "resend";
import * as React from "react";

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

/**
 * Check if Resend is configured and ready to send.
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResendEmailOptions {
  to: string | string[];
  subject: string;
  from?: string;
  replyTo?: string;
  /** React Email component — will be rendered to HTML */
  react?: React.ReactElement;
  /** Raw HTML — used if react is not provided */
  html?: string;
  /** Plain text version */
  text?: string;
  /** Idempotency key — prevents duplicate sends within 24h */
  idempotencyKey?: string;
  /** Tags for Resend dashboard filtering */
  tags?: Array<{ name: string; value: string }>;
}

export interface ResendSendResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core Send
// ---------------------------------------------------------------------------

/**
 * Send an email via Resend SDK with full feature support.
 * Supports React Email components, idempotency keys, and tags.
 */
export async function sendResendEmail(options: ResendEmailOptions): Promise<ResendSendResult> {
  try {
    const resend = getResend();

    // Determine from and reply-to addresses
    const from = options.from || getDefaultFrom();
    const replyTo = options.replyTo || getDefaultReplyTo();

    // Render React component to HTML if provided
    let html = options.html;
    if (options.react) {
      // Dynamic import to avoid webpack issues with react-dom/server
      const { renderToStaticMarkup } = await import("react-dom/server");
      html = renderToStaticMarkup(options.react);
      // Wrap with doctype for email clients
      if (!html.startsWith("<!DOCTYPE") && !html.startsWith("<html")) {
        html = `<!DOCTYPE html>${html}`;
      }
    }

    if (!html) {
      return { success: false, error: "Either react or html must be provided" };
    }

    const payload: Parameters<typeof resend.emails.send>[0] = {
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html,
    };

    if (options.text) payload.text = options.text;
    if (replyTo) payload.replyTo = replyTo;
    if (options.tags) payload.tags = options.tags;

    // Send with optional idempotency key
    const sendOptions = options.idempotencyKey
      ? { idempotencyKey: options.idempotencyKey }
      : undefined;

    const { data, error } = await resend.emails.send(payload, sendOptions);

    if (error) {
      console.warn("[resend-service] Send failed:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resend-service] Send error:", message);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// High-Level Send Methods
// ---------------------------------------------------------------------------

/**
 * Send a welcome email to a new subscriber.
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  locale: "en" | "ar" = "en",
  siteId?: string
): Promise<ResendSendResult> {
  const WelcomeEmail = (await import("@/emails/welcome")).default;
  const siteUrl = getSiteUrl(siteId);

  return sendResendEmail({
    to,
    subject: locale === "ar"
      ? "مرحباً بك في يالا لندن! 🌟"
      : "Welcome to Yalla London! 🌟",
    react: React.createElement(WelcomeEmail, {
      name: name || (locale === "ar" ? "صديقنا" : "there"),
      locale,
      siteUrl,
      unsubscribeUrl: `${siteUrl}/api/email/unsubscribe?email=${encodeURIComponent(to)}`,
    }),
    replyTo: "info@yalla-london.com",
    idempotencyKey: `welcome-${to}-${new Date().toISOString().slice(0, 10)}`,
    tags: [
      { name: "type", value: "welcome" },
      { name: "locale", value: locale },
    ],
  });
}

/**
 * Send a booking confirmation email.
 */
export async function sendBookingConfirmation(
  to: string,
  booking: {
    name?: string;
    bookingName: string;
    bookingDate?: string;
    guests?: number;
    totalPaid: string;
    currency?: string;
    stripeReceiptUrl?: string;
    locale?: "en" | "ar";
  },
  siteId?: string
): Promise<ResendSendResult> {
  const BookingEmail = (await import("@/emails/booking-confirmation")).default;
  const locale = booking.locale || "en";

  return sendResendEmail({
    to,
    subject: locale === "ar"
      ? `تأكيد الحجز: ${booking.bookingName}`
      : `Booking Confirmed: ${booking.bookingName}`,
    react: React.createElement(BookingEmail, {
      name: booking.name || (locale === "ar" ? "صديقنا" : "there"),
      locale,
      bookingName: booking.bookingName,
      bookingDate: booking.bookingDate,
      guests: booking.guests || 1,
      totalPaid: booking.totalPaid,
      currency: booking.currency || "GBP",
      stripeReceiptUrl: booking.stripeReceiptUrl,
      siteUrl: getSiteUrl(siteId),
    }),
    replyTo: "info@yalla-london.com",
    idempotencyKey: `booking-${to}-${booking.bookingName}-${booking.bookingDate || "nodate"}`,
    tags: [
      { name: "type", value: "booking" },
      { name: "locale", value: locale },
    ],
  });
}

/**
 * Send a weekly newsletter digest.
 */
export async function sendNewsletterDigest(
  to: string[],
  articles: Array<{
    title: string;
    excerpt: string;
    url: string;
    imageUrl?: string;
    category?: string;
  }>,
  locale: "en" | "ar" = "en",
  siteId?: string
): Promise<ResendSendResult> {
  const DigestEmail = (await import("@/emails/newsletter-digest")).default;
  const siteUrl = getSiteUrl(siteId);
  const weekLabel = locale === "ar" ? "ملخص الأسبوع" : "This Week in London";

  return sendResendEmail({
    to,
    subject: locale === "ar"
      ? `${weekLabel} — يالا لندن`
      : `${weekLabel} — Yalla London`,
    react: React.createElement(DigestEmail, {
      locale,
      articles,
      siteUrl,
      weekLabel,
      unsubscribeUrl: `${siteUrl}/api/email/unsubscribe?email={{email}}`,
    }),
    replyTo: "info@yalla-london.com",
    idempotencyKey: `digest-${new Date().toISOString().slice(0, 10)}-${locale}`,
    tags: [
      { name: "type", value: "digest" },
      { name: "locale", value: locale },
    ],
  });
}

/**
 * Send contact form auto-reply.
 */
export async function sendContactConfirmation(
  to: string,
  inquiry: {
    name?: string;
    subject?: string;
    locale?: "en" | "ar";
  },
  siteId?: string
): Promise<ResendSendResult> {
  const ContactEmail = (await import("@/emails/contact-confirmation")).default;
  const locale = inquiry.locale || "en";

  return sendResendEmail({
    to,
    subject: locale === "ar"
      ? "تم استلام رسالتك — يالا لندن"
      : "We've received your message — Yalla London",
    react: React.createElement(ContactEmail, {
      name: inquiry.name || (locale === "ar" ? "صديقنا" : "there"),
      locale,
      inquirySubject: inquiry.subject,
      siteUrl: getSiteUrl(siteId),
    }),
    replyTo: "info@yalla-london.com",
    idempotencyKey: `contact-${to}-${new Date().toISOString().slice(0, 13)}`,
    tags: [
      { name: "type", value: "contact" },
      { name: "locale", value: locale },
    ],
  });
}

// ---------------------------------------------------------------------------
// Webhook Verification
// ---------------------------------------------------------------------------

/**
 * Verify a Resend webhook signature.
 * Uses the svix library (installed with resend SDK).
 *
 * @param body - Raw request body as string
 * @param headers - Object with svix-id, svix-timestamp, svix-signature
 * @returns Parsed event payload or null if verification fails
 */
export async function verifyWebhookSignature(
  body: string,
  headers: { "svix-id"?: string; "svix-timestamp"?: string; "svix-signature"?: string }
): Promise<Record<string, unknown> | null> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[resend-service] RESEND_WEBHOOK_SECRET not set — skipping verification");
    // In development, parse without verification
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }

  try {
    // HMAC-based signature verification (no svix dependency needed)
    // Resend webhook signatures use: base64(hmac-sha256(secret, msgId.timestamp.body))
    const crypto = await import("crypto");
    const svixId = headers["svix-id"] || "";
    const svixTimestamp = headers["svix-timestamp"] || "";
    const svixSignature = headers["svix-signature"] || "";

    // Decode the secret (base64-encoded, may have "whsec_" prefix)
    const secretBytes = Buffer.from(
      secret.startsWith("whsec_") ? secret.slice(6) : secret,
      "base64"
    );

    // Compute expected signature
    const toSign = `${svixId}.${svixTimestamp}.${body}`;
    const expectedSig = crypto
      .createHmac("sha256", secretBytes)
      .update(toSign)
      .digest("base64");

    // Check if any of the provided signatures match
    const signatures = svixSignature.split(" ");
    const isValid = signatures.some((sig) => {
      const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
      try {
        return crypto.timingSafeEqual(
          Buffer.from(expectedSig),
          Buffer.from(sigValue)
        );
      } catch {
        return false;
      }
    });

    if (!isValid) {
      console.error("[resend-service] Webhook signature mismatch");
      return null;
    }

    return JSON.parse(body);
  } catch (err) {
    console.error("[resend-service] Webhook verification failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultFrom(): string {
  const emailFrom = (process.env.EMAIL_FROM || "").trim();
  if (emailFrom) return emailFrom;

  // Sandbox mode for unverified domains
  if (process.env.RESEND_API_KEY && !process.env.RESEND_DOMAIN_VERIFIED) {
    return "Zenitha <onboarding@resend.dev>";
  }

  try {
    const { getDefaultSiteId, SITES } = require("@/config/sites");
    const site = SITES[getDefaultSiteId()];
    return `${site?.name || "Zenitha"} <hello@${site?.domain || "zenitha.luxury"}>`;
  } catch {
    return "Yalla London <hello@yalla-london.com>";
  }
}

function getDefaultReplyTo(): string {
  const replyTo = (process.env.EMAIL_REPLY_TO || "").trim();
  if (replyTo) return replyTo;

  try {
    const { getDefaultSiteId, SITES } = require("@/config/sites");
    const site = SITES[getDefaultSiteId()];
    return `info@${site?.domain || "yalla-london.com"}`;
  } catch {
    return "info@yalla-london.com";
  }
}

function getSiteUrl(siteId?: string): string {
  try {
    const { getSiteDomain, getDefaultSiteId } = require("@/config/sites");
    return getSiteDomain(siteId || getDefaultSiteId());
  } catch {
    return "https://www.yalla-london.com";
  }
}
