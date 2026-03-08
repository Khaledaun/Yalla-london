export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * Site Settings API — Per-site activation controller for affiliates, email, social, and workflow.
 *
 * GET  ?siteId=yalla-london              → All settings for a site
 * GET  ?siteId=yalla-london&category=affiliates  → Single category
 * POST { siteId, category, config, enabled }     → Upsert settings
 */

type SettingsCategory = "affiliates" | "email" | "social" | "workflow" | "general";

const VALID_CATEGORIES: SettingsCategory[] = ["affiliates", "email", "social", "workflow", "general"];

// Default configs seeded when a site has no settings yet
function getDefaultConfig(siteId: string, category: SettingsCategory): Record<string, unknown> {
  switch (category) {
    case "affiliates":
      return {
        enabled: true,
        partners: getDefaultAffiliates(siteId),
        injectionMode: "auto", // "auto" | "manual" | "disabled"
        maxLinksPerArticle: 5,
        instructions: "Inject affiliate links naturally where the content mentions hotels, tours, restaurants, or bookings. Prioritise partners with the highest commission rates.",
      };
    case "email":
      return {
        enabled: false,
        provider: "auto", // "resend" | "sendgrid" | "smtp" | "auto"
        fromName: "",
        fromEmail: "",
        replyTo: "",
        apiKey: "", // stored reference only — actual key in env vars
        welcomeEmailEnabled: false,
        digestEmailEnabled: false,
        digestFrequency: "weekly",
        instructions: "Send a weekly digest of new articles to confirmed subscribers. Use the site brand colours and include top 3 articles with excerpt and affiliate links.",
      };
    case "social":
      return {
        enabled: false,
        platforms: {
          instagram: { connected: false, handle: "" },
          twitter: { connected: false, handle: "" },
          tiktok: { connected: false, handle: "" },
          facebook: { connected: false, pageId: "" },
        },
        autoPostOnPublish: false,
        instructions: "Create engaging social posts when articles are published. Use destination-specific hashtags. Instagram: carousel with 3 key images. Twitter: thread with key takeaways. Include affiliate links where natural.",
      };
    case "workflow":
      return {
        contentTone: "luxury-editorial",
        targetAudience: "Arab travellers seeking luxury experiences",
        contentTypes: ["blog", "guide", "listicle", "news"],
        publishingFrequency: "2/day",
        qualityGateOverride: null, // null = use global standards
        designTemplateId: null,
        brandVoiceNotes: "",
        instructions: "Generate bilingual (EN/AR) content focused on luxury travel. Include first-hand experience markers, insider tips, and sensory details. Every article must have 3+ internal links and 2+ affiliate links. Use the site design system components for featured images and social cards.",
      };
    case "general":
      return {
        siteActive: true,
        indexingEnabled: true,
        cronJobsEnabled: true,
        maintenanceMode: false,
        customDomain: "",
        googleVerification: "",
        analyticsId: "",
      };
  }
}

function getDefaultAffiliates(siteId: string): Array<{
  name: string;
  category: string;
  enabled: boolean;
  affiliateId: string;
  baseUrl: string;
  paramTemplate: string;
  commissionRate: string;
}> {
  const affiliatesBysite: Record<string, Array<{
    name: string;
    category: string;
    enabled: boolean;
    affiliateId: string;
    baseUrl: string;
    paramTemplate: string;
    commissionRate: string;
  }>> = {
    "yalla-london": [
      { name: "Booking.com", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.booking.com/city/gb/london.html", paramTemplate: "?aid={id}", commissionRate: "25-40%" },
      { name: "Agoda", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.agoda.com/london", paramTemplate: "?cid={id}", commissionRate: "5-7%" },
      { name: "HalalBooking", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.halalbooking.com", paramTemplate: "?ref={id}", commissionRate: "5%" },
      { name: "GetYourGuide", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.getyourguide.com/london-l57/", paramTemplate: "?partner_id={id}", commissionRate: "8%" },
      { name: "Viator", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.viator.com/London/d737", paramTemplate: "?pid={id}", commissionRate: "8%" },
      { name: "TheFork", category: "restaurant", enabled: false, affiliateId: "", baseUrl: "https://www.thefork.co.uk/london", paramTemplate: "?ref={id}", commissionRate: "2-4%" },
      { name: "Klook", category: "activity", enabled: false, affiliateId: "", baseUrl: "https://www.klook.com/london", paramTemplate: "?aid={id}", commissionRate: "3-5%" },
    ],
    "arabaldives": [
      { name: "Booking.com", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.booking.com/country/mv.html", paramTemplate: "?aid={id}", commissionRate: "25-40%" },
      { name: "Agoda", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.agoda.com/maldives", paramTemplate: "?cid={id}", commissionRate: "5-7%" },
      { name: "HalalBooking", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.halalbooking.com/maldives", paramTemplate: "?ref={id}", commissionRate: "5%" },
      { name: "GetYourGuide", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.getyourguide.com/maldives", paramTemplate: "?partner_id={id}", commissionRate: "8%" },
    ],
    "french-riviera": [
      { name: "Booking.com", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.booking.com/region/fr/cote-d-azur.html", paramTemplate: "?aid={id}", commissionRate: "25-40%" },
      { name: "Boatbookings", category: "yacht", enabled: true, affiliateId: "", baseUrl: "https://www.boatbookings.com/french-riviera", paramTemplate: "?ref={id}", commissionRate: "20%" },
      { name: "GetYourGuide", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.getyourguide.com/nice-l185/", paramTemplate: "?partner_id={id}", commissionRate: "8%" },
    ],
    "istanbul": [
      { name: "Booking.com", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.booking.com/city/tr/istanbul.html", paramTemplate: "?aid={id}", commissionRate: "25-40%" },
      { name: "HalalBooking", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.halalbooking.com/istanbul", paramTemplate: "?ref={id}", commissionRate: "5%" },
      { name: "GetYourGuide", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.getyourguide.com/istanbul-l56/", paramTemplate: "?partner_id={id}", commissionRate: "8%" },
      { name: "Viator", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.viator.com/Istanbul", paramTemplate: "?pid={id}", commissionRate: "8%" },
    ],
    "thailand": [
      { name: "Agoda", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.agoda.com/thailand", paramTemplate: "?cid={id}", commissionRate: "5-7%" },
      { name: "Booking.com", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.booking.com/country/th.html", paramTemplate: "?aid={id}", commissionRate: "25-40%" },
      { name: "Klook", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.klook.com/thailand", paramTemplate: "?aid={id}", commissionRate: "3-5%" },
      { name: "GetYourGuide", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.getyourguide.com/thailand", paramTemplate: "?partner_id={id}", commissionRate: "8%" },
    ],
  };

  return affiliatesBysite[siteId] || [
    { name: "Booking.com", category: "hotel", enabled: true, affiliateId: "", baseUrl: "https://www.booking.com", paramTemplate: "?aid={id}", commissionRate: "25-40%" },
    { name: "GetYourGuide", category: "activity", enabled: true, affiliateId: "", baseUrl: "https://www.getyourguide.com", paramTemplate: "?partner_id={id}", commissionRate: "8%" },
  ];
}

// GET — Fetch settings
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const category = searchParams.get("category") as SettingsCategory | null;

    if (!siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");

    // Try to read from DB
    const where = category
      ? { siteId, category }
      : { siteId };

    const dbSettings = await prisma.siteSettings.findMany({ where });

    // Build response with defaults for missing categories
    const categories = category ? [category] : VALID_CATEGORIES;
    const settings: Record<string, { config: Record<string, unknown>; enabled: boolean; updatedAt: string | null }> = {};

    for (const cat of categories) {
      const existing = dbSettings.find((s) => s.category === cat);
      if (existing) {
        settings[cat] = {
          config: existing.config as Record<string, unknown>,
          enabled: existing.enabled,
          updatedAt: existing.updatedAt.toISOString(),
        };
      } else {
        settings[cat] = {
          config: getDefaultConfig(siteId, cat),
          enabled: cat === "affiliates" || cat === "general", // affiliates and general default to enabled
          updatedAt: null,
        };
      }
    }

    return NextResponse.json({ siteId, settings });
  } catch (err) {
    console.warn("[site-settings] GET error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
});

// POST — Upsert settings
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { siteId, category, config, enabled } = body;

    if (!siteId || !category) {
      return NextResponse.json({ error: "siteId and category required" }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");

    const result = await prisma.siteSettings.upsert({
      where: { siteId_category: { siteId, category } },
      create: {
        siteId,
        category,
        config: config ?? getDefaultConfig(siteId, category),
        enabled: enabled ?? true,
      },
      update: {
        ...(config !== undefined ? { config } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      siteId,
      category,
      enabled: result.enabled,
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (err) {
    console.warn("[site-settings] POST error:", (err as Error).message);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
});
