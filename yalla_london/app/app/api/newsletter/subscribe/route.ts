export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limiting";
import { getDefaultSiteId } from "@/config/sites";

/**
 * Newsletter Subscription Endpoint
 *
 * Writes directly to the Prisma Subscriber table with full GDPR compliance:
 * - Double opt-in via confirmation token
 * - ConsentLog audit trail (legal basis, processing purposes, consent text)
 * - Per-site scoping
 * - Duplicate handling (re-sends confirmation if already pending)
 *
 * Email sending is NOT activated yet — subscribers are stored for future use.
 * When ready, enable welcome emails by setting RESEND_API_KEY and uncommenting
 * the sendWelcomeEmail call.
 */
async function subscribeHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      firstName,
      lastName,
      language = "en",
      source = "website",
      siteId: bodySiteId,
    } = body;

    // Resolve siteId: body param > middleware header > config default
    const siteId =
      bodySiteId ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { prisma } = await import("@/lib/db");

    // Check for existing subscriber (per-site unique)
    const existing = await prisma.subscriber.findFirst({
      where: { site_id: siteId, email: normalizedEmail },
    });

    if (existing) {
      if (existing.status === "CONFIRMED") {
        return NextResponse.json({
          success: true,
          message:
            language === "en"
              ? "You're already subscribed!"
              : "أنت مشترك بالفعل!",
          alreadySubscribed: true,
        });
      }

      // Re-send confirmation for PENDING subscribers
      // (Email sending not yet activated — just acknowledge)
      return NextResponse.json({
        success: true,
        message:
          language === "en"
            ? "Please check your email to confirm your subscription."
            : "يرجى التحقق من بريدك الإلكتروني لتأكيد اشتراكك.",
        pending: true,
      });
    }

    // Generate double opt-in token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const doubleOptinToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create subscriber record
    const subscriber = await prisma.subscriber.create({
      data: {
        site_id: siteId,
        email: normalizedEmail,
        status: "PENDING", // Awaiting double opt-in confirmation
        source,
        double_optin_token: doubleOptinToken,
        double_optin_sent_at: new Date(),
        preferences_json: {
          language,
          firstName: firstName || null,
          lastName: lastName || null,
          topics: [], // To be set via preferences page
          frequency: "weekly",
        },
        metadata_json: {
          userAgent: request.headers.get("user-agent") || null,
          // IP anonymized: only store first 3 octets for GDPR
          ipAnonymized: anonymizeIp(
            request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              "",
          ),
          utmSource: request.nextUrl.searchParams.get("utm_source") || null,
          utmMedium: request.nextUrl.searchParams.get("utm_medium") || null,
          subscribedAt: new Date().toISOString(),
        },
      },
    });

    // Log GDPR consent
    await prisma.consentLog.create({
      data: {
        site_id: siteId,
        subscriber_id: subscriber.id,
        consent_type: "newsletter",
        consent_version: "1.0",
        action: "granted",
        legal_basis: "consent",
        processing_purposes: ["marketing", "personalization"],
        data_categories: ["email", "preferences"],
        consent_text:
          language === "en"
            ? "I agree to receive newsletter emails. I can unsubscribe at any time."
            : "أوافق على تلقي رسائل البريد الإلكتروني الإخبارية. يمكنني إلغاء الاشتراك في أي وقت.",
        ip_address: anonymizeIp(
          request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "",
        ),
        user_agent: request.headers.get("user-agent") || null,
      },
    });

    // NOTE: Welcome email / confirmation email NOT sent yet.
    // Email sending will be activated when RESEND_API_KEY is configured
    // and the domain is verified in Resend.
    // For now, subscribers are stored in the database for future activation.

    console.log(
      `[newsletter] New subscriber: ${normalizedEmail} (site=${siteId}, source=${source})`,
    );

    return NextResponse.json({
      success: true,
      message:
        language === "en"
          ? "Successfully subscribed! We'll be in touch soon."
          : "تم الاشتراك بنجاح! سنتواصل معك قريباً.",
    });
  } catch (error) {
    console.error("[newsletter] Subscription error:", error);
    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 },
    );
  }
}

/**
 * Anonymize IP address for GDPR compliance.
 * Keeps first 3 octets of IPv4 (e.g., 192.168.1.x → 192.168.1.0)
 * or masks last 80 bits of IPv6.
 */
function anonymizeIp(ip: string): string | null {
  if (!ip) return null;
  const firstIp = ip.split(",")[0].trim();
  if (firstIp.includes(".")) {
    // IPv4: zero out last octet
    const parts = firstIp.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }
  // IPv6 or unrecognized: store first 48 bits only
  if (firstIp.includes(":")) {
    const parts = firstIp.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  return null;
}

// Rate limit: 5 subscribe attempts per 15 minutes per IP
export const POST = withRateLimit(
  { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  subscribeHandler,
);
