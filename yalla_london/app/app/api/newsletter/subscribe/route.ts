export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { emailMarketing } from "@/lib/integrations/email-marketing";
import { notifications } from "@/lib/integrations/notifications";
import { withRateLimit } from "@/lib/rate-limiting";

async function subscribeHandler(request: NextRequest) {
  try {
    const {
      email,
      firstName,
      lastName,
      language = "en",
      source = "website",
    } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Subscribe to email marketing platform
    const result = await emailMarketing.subscribe({
      email,
      firstName,
      lastName,
      language,
      source,
      tags: ["luxury-guide-subscriber"],
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 },
      );
    }

    // Send welcome email
    await emailMarketing.sendWelcomeEmail(email, language);

    // Send notification
    await notifications.notifyNewSubscriber(email, source);

    return NextResponse.json({
      success: true,
      message:
        language === "en"
          ? "Successfully subscribed! Check your email for your free guide."
          : "تم الاشتراك بنجاح! تحقق من بريدك الإلكتروني للحصول على دليلك المجاني.",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    await notifications.notifyError(
      "Newsletter subscription failed",
      `Email: ${request.json()}`,
    );

    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 },
    );
  }
}

// Rate limit: 5 subscribe attempts per 15 minutes per IP
export const POST = withRateLimit(
  { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  subscribeHandler,
);
