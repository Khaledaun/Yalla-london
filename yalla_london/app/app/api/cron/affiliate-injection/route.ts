export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Affiliate Injection Cron Job
 *
 * Runs daily at 09:00 UTC (30 min after content-selector).
 * Finds published BlogPosts with unfilled affiliate-placeholder divs
 * and replaces them with actual affiliate CTAs.
 *
 * Also catches articles from daily-content-generate that bypass
 * the content-selector pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";
import { isEnhancementOwner, buildEnhancementLogEntry } from "@/lib/db/enhancement-log";
import { createSnapshot } from "@/lib/affiliate/snapshot";

const BUDGET_MS = 280_000;

// Known advertiser IDs for CJ deep link fallback
const VRBO_ADVERTISER_ID = "9220803";

// Per-site keyword-to-affiliate mapping
type AffiliateRule = {
  keywords: string[];
  affiliates: Array<{ name: string; url: string; param: string; category: string }>;
};

// Build affiliate rules from CjLink records AND CJ deep links for JOINED advertisers
async function getAffiliateRulesFromCjLinks(siteId: string): Promise<AffiliateRule[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");
    const { buildCjDeepLink } = await import("@/lib/affiliate/cj-sync");
    const publisherCid = process.env.CJ_PUBLISHER_CID;

    const links = await prisma.cjLink.findMany({
      where: { isActive: true },
      include: { advertiser: { select: { name: true, category: true, status: true, externalId: true } } },
      take: 100,
    });

    // Also find JOINED advertisers WITHOUT any CjLink records —
    // generate deep links on-the-fly using their programUrl
    if (publisherCid) {
      const joinedWithoutLinks = await prisma.cjAdvertiser.findMany({
        where: {
          networkId: CJ_NETWORK_ID,
          status: "JOINED",
          programUrl: { not: "" },
          links: { none: {} },
        },
        select: { id: true, externalId: true, name: true, programUrl: true, category: true },
        take: 50,
      });

      // Convert to CjLink-like records with deep link URLs
      for (const adv of joinedWithoutLinks) {
        if (!adv.programUrl) continue;
        const deepLinkUrl = buildCjDeepLink(publisherCid, adv.externalId, adv.programUrl, `${siteId}_cj`);
        links.push({
          id: `deep-${adv.externalId}`,
          networkId: CJ_NETWORK_ID,
          advertiserId: adv.id,
          name: `${adv.name} - Deep Link`,
          destinationUrl: adv.programUrl,
          affiliateUrl: deepLinkUrl,
          linkType: "TEXT",
          category: adv.category || "travel",
          language: "EN",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          advertiser: { name: adv.name, category: adv.category, status: "JOINED", externalId: adv.externalId },
        } as typeof links[0]);
      }
      if (joinedWithoutLinks.length > 0) {
        console.log(`[affiliate-injection] Generated ${joinedWithoutLinks.length} CJ deep links for JOINED advertisers`);
      }
    }

    if (links.length === 0) return [];

    // Group by category, build keyword-to-affiliate mapping
    const CATEGORY_KEYWORDS: Record<string, string[]> = {
      hotel: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "vacation rental", "vrbo", "expedia", "فندق", "فنادق"],
      activity: ["tour", "tours", "experience", "activity", "visit", "attraction", "جولة", "تجربة"],
      restaurant: ["restaurant", "dining", "food", "halal", "cuisine", "eat", "مطعم", "طعام", "حلال"],
      travel: ["travel", "flight", "flights", "trip", "holiday", "vacation", "سفر", "رحلة"],
      shopping: ["shopping", "shop", "buy", "luxury", "brand", "fashion", "تسوق"],
      transport: ["transfer", "airport", "taxi", "car", "transport", "نقل", "مطار"],
      yacht: ["yacht", "charter", "boat", "sailing", "يخت", "إيجار"],
    };

    const byCategory = new Map<string, Array<{ name: string; url: string; param: string; category: string }>>();

    for (const link of links) {
      if (!link.advertiser || link.advertiser.status !== "JOINED") continue;
      const cat = (link.category || link.advertiser.category || "travel").toLowerCase();
      const existing = byCategory.get(cat) || [];

      // Build SID tracking param for revenue attribution
      const sidParam = `&sid=${siteId}_cj`;
      existing.push({
        name: link.advertiser.name,
        url: link.affiliateUrl || link.destinationUrl,
        param: sidParam,
        category: cat,
      });
      byCategory.set(cat, existing);
    }

    const rules: AffiliateRule[] = [];
    for (const [cat, affiliates] of byCategory) {
      // Deduplicate by advertiser name (keep first = most recently synced)
      const seen = new Set<string>();
      const deduped = affiliates.filter(a => {
        if (seen.has(a.name)) return false;
        seen.add(a.name);
        return true;
      });
      rules.push({
        keywords: CATEGORY_KEYWORDS[cat] || [cat],
        affiliates: deduped.slice(0, 5), // Max 5 per category
      });
    }

    console.log(`[affiliate-injection] Loaded ${rules.length} CJ-based rules with ${links.length} active links`);

    // If CJ is configured but no JOINED advertisers found, generate fallback deep links
    // for known approved advertisers (Vrbo approved March 12, 2026)
    if (rules.length === 0 && publisherCid) {
      console.warn(`[affiliate-injection] CJ configured but 0 JOINED advertisers — using fallback deep links. Run sync-advertisers to populate.`);
    }

    // Always add broad catch-all rules when we have a publisherCid.
    // Even when category-specific CJ rules exist (e.g., 1 hotel rule from Vrbo),
    // articles about restaurants, shopping, transport, general guides would get
    // ZERO affiliates without these broad rules. Vrbo is relevant for ANY travel
    // content — vacation rentals aren't just for "hotel" articles.
    if (publisherCid) {
      const vrboDeepLink = buildCjDeepLink(publisherCid, VRBO_ADVERTISER_ID, "https://www.vrbo.com/", `${siteId}_cj`);
      const vrboEntry = { name: "Vrbo", url: vrboDeepLink, param: "", category: "hotel" };

      // Look up Expedia from DB — external ID varies, so query by name
      let expediaEntry = { name: "Expedia", url: "", param: "", category: "hotel" };
      try {
        const expediaAdv = await prisma.cjAdvertiser.findFirst({
          where: { name: { contains: "Expedia" }, status: "JOINED" },
          select: { externalId: true, programUrl: true },
        });
        if (expediaAdv) {
          const expediaUrl = expediaAdv.programUrl || "https://www.expedia.com/";
          expediaEntry.url = buildCjDeepLink(publisherCid, expediaAdv.externalId, expediaUrl, `${siteId}_cj`);
          console.log(`[affiliate-injection] Expedia deep link generated from DB (externalId: ${expediaAdv.externalId})`);
        }
      } catch (e) {
        console.warn("[affiliate-injection] Failed to look up Expedia:", e instanceof Error ? e.message : e);
      }
      const hasExpedia = expediaEntry.url.length > 0;

      // Only add categories that don't already have CJ rules
      const existingCategories = new Set(rules.map(r => {
        // Infer category from the first affiliate's category
        return r.affiliates[0]?.category || "unknown";
      }));

      if (!existingCategories.has("travel")) {
        rules.push({
          // Broad travel keywords — matches most London travel articles
          keywords: ["london", "travel", "visit", "guide", "best", "top", "trip", "holiday", "vacation", "weekend", "luxury", "things to do", "hotel", "mosque", "ramadan", "tube", "underground", "museum", "park", "سفر", "لندن", "زيارة", "دليل"],
          affiliates: [...(hasExpedia ? [{ ...expediaEntry, category: "travel" }] : []), { ...vrboEntry, category: "travel" }],
        });
      }
      if (!existingCategories.has("restaurant")) {
        rules.push({
          keywords: [...(CATEGORY_KEYWORDS["restaurant"] || ["restaurant"]), "halal", "food", "dining", "lunch", "dinner", "eat"],
          affiliates: [...(hasExpedia ? [{ ...expediaEntry, category: "restaurant" }] : []), { ...vrboEntry, category: "restaurant" }],
        });
      }
      if (!existingCategories.has("activity")) {
        rules.push({
          keywords: [...(CATEGORY_KEYWORDS["activity"] || ["tour"]), "attraction", "museum", "gallery", "park", "walk", "kids"],
          affiliates: [...(hasExpedia ? [{ ...expediaEntry, category: "activity" }] : []), { ...vrboEntry, category: "activity" }],
        });
      }
      if (!existingCategories.has("shopping")) {
        rules.push({
          keywords: CATEGORY_KEYWORDS["shopping"] || ["shopping"],
          affiliates: [...(hasExpedia ? [{ ...expediaEntry, category: "shopping" }] : []), { ...vrboEntry, category: "shopping" }],
        });
      }
      if (!existingCategories.has("transport")) {
        rules.push({
          keywords: CATEGORY_KEYWORDS["transport"] || ["transport"],
          affiliates: [...(hasExpedia ? [{ ...expediaEntry, category: "transport" }] : []), { ...vrboEntry, category: "transport" }],
        });
      }
      console.log(`[affiliate-injection] After broad rules: ${rules.length} total CJ rules`);
    }

    return rules;
  } catch (err) {
    console.warn(`[affiliate-injection] CjLink rules load failed:`, (err as Error).message);
    return [];
  }
}

// Try loading affiliate config from SiteSettings DB (cockpit-configurable)
async function getAffiliateRulesFromDB(siteId: string): Promise<AffiliateRule[] | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const settings = await prisma.siteSettings.findUnique({
      where: { siteId_category: { siteId, category: "affiliates" } },
    });
    if (!settings || !settings.enabled) return null;
    const config = settings.config as Record<string, unknown>;
    if (config.injectionMode === "disabled") return null;
    const partners = config.partners as Array<{
      name: string; category: string; enabled: boolean;
      affiliateId: string; baseUrl: string; paramTemplate: string;
    }> | undefined;
    if (!partners || partners.length === 0) return null;

    // Only use DB config if at least one partner has an affiliateId set
    const activePartners = partners.filter(p => p.enabled && p.affiliateId);
    if (activePartners.length === 0) return null;

    // Group by category into AffiliateRules
    const byCategory = new Map<string, typeof activePartners>();
    for (const p of activePartners) {
      const existing = byCategory.get(p.category) || [];
      existing.push(p);
      byCategory.set(p.category, existing);
    }

    // Map category to keywords
    const CATEGORY_KEYWORDS: Record<string, string[]> = {
      hotel: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "فندق", "فنادق"],
      activity: ["tour", "tours", "experience", "activity", "visit", "attraction", "جولة", "تجربة"],
      restaurant: ["restaurant", "dining", "food", "halal", "cuisine", "eat", "مطعم", "طعام", "حلال"],
      tickets: ["ticket", "event", "match", "concert", "show", "theatre", "تذكرة", "فعالية"],
      shopping: ["shopping", "shop", "buy", "luxury", "brand", "fashion", "تسوق"],
      transport: ["transfer", "airport", "taxi", "car", "transport", "نقل", "مطار"],
      insurance: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
      yacht: ["yacht", "charter", "boat", "sailing", "يخت", "إيجار"],
    };

    const rules: AffiliateRule[] = [];
    for (const [cat, catPartners] of byCategory) {
      rules.push({
        keywords: CATEGORY_KEYWORDS[cat] || [cat],
        affiliates: catPartners.map(p => ({
          name: p.name,
          url: p.baseUrl,
          param: p.paramTemplate.replace("{id}", p.affiliateId),
          category: cat,
        })),
      });
    }
    return rules;
  } catch (err) {
    console.warn(`[affiliate-injection] DB settings load failed for ${siteId}:`, (err as Error).message);
    return null;
  }
}

function getAffiliateRulesForSite(siteId: string): AffiliateRule[] {
  const utmSource = siteId.replace(/-/g, "");

  const SITE_RULES: Record<string, AffiliateRule[]> = {
    'yalla-london': [
      {
        keywords: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "فندق", "فنادق"],
        affiliates: [
          { name: "Booking.com", url: "https://www.booking.com/city/gb/london.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
          { name: "Expedia", url: "https://www.expedia.com/London-Hotels.d178279.Travel-Guide-Hotels", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "hotel" },
          { name: "Agoda", url: "https://www.agoda.com/london", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "hotel" },
        ],
      },
      {
        keywords: ["restaurant", "dining", "food", "halal", "cuisine", "eat", "مطعم", "طعام", "حلال"],
        affiliates: [
          { name: "TheFork", url: "https://www.thefork.co.uk/london", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}`, category: "restaurant" },
          { name: "OpenTable", url: "https://www.opentable.co.uk/london", param: `?ref=${process.env.OPENTABLE_AFFILIATE_ID || ""}`, category: "restaurant" },
          { name: "TripAdvisor Restaurants", url: "https://www.tripadvisor.co.uk/Restaurants-g186338-London_England.html", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "restaurant" },
        ],
      },
      {
        keywords: ["tour", "tours", "experience", "activity", "visit", "attraction", "جولة", "تجربة"],
        affiliates: [
          { name: "GetYourGuide", url: "https://www.getyourguide.com/london-l57/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "Viator", url: "https://www.viator.com/London/d737", param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "TripAdvisor Experiences", url: "https://www.tripadvisor.co.uk/Attractions-g186338-London_England.html", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "activity" },
        ],
      },
      {
        keywords: ["ticket", "tickets", "event", "match", "concert", "show", "theatre", "football", "museum", "attraction", "تذكرة", "فعالية"],
        affiliates: [
          { name: "Tiqets", url: "https://www.tiqets.com/en/london-c824706/", param: `?marker=${process.env.TRAVELPAYOUTS_MARKER || ""}&utm_source=${utmSource}`, category: "tickets" },
          { name: "TicketNetwork", url: "https://www.ticketnetwork.com/london-events", param: `?marker=${process.env.TRAVELPAYOUTS_MARKER || ""}&utm_source=${utmSource}`, category: "tickets" },
          { name: "StubHub", url: "https://www.stubhub.co.uk", param: `?gcid=${process.env.STUBHUB_AFFILIATE_ID || ""}`, category: "tickets" },
        ],
      },
      {
        keywords: ["shopping", "shop", "buy", "luxury", "brand", "fashion", "Harrods", "تسوق"],
        affiliates: [
          { name: "Harrods", url: "https://www.harrods.com", param: `?utm_source=${utmSource}`, category: "shopping" },
          { name: "Selfridges", url: "https://www.selfridges.com", param: `?utm_source=${utmSource}`, category: "shopping" },
        ],
      },
      {
        keywords: ["transfer", "airport", "taxi", "car", "transport", "Heathrow", "car rental", "car hire", "pickup", "نقل", "مطار"],
        affiliates: [
          { name: "Welcome Pickups", url: "https://www.welcomepickups.com/london/", param: `?marker=${process.env.TRAVELPAYOUTS_MARKER || ""}&utm_source=${utmSource}`, category: "transport" },
          { name: "Expedia Car", url: "https://www.expedia.com/carsearch?locn=London", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "transport" },
          { name: "Blacklane", url: "https://www.blacklane.com/en/london", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}`, category: "transport" },
        ],
      },
      {
        keywords: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
        affiliates: [
          { name: "Allianz Travel", url: "https://www.allianztravelinsurance.com", param: `?utm_source=${utmSource}`, category: "insurance" },
        ],
      },
      // Catch-all: broad travel keywords so general articles still get affiliate links
      {
        keywords: ["london", "travel", "guide", "best", "top", "things to do", "trip", "visit", "weekend", "luxury", "explore", "discover", "itinerary", "لندن", "سفر", "دليل"],
        affiliates: [
          { name: "Booking.com", url: "https://www.booking.com/city/gb/london.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
          { name: "GetYourGuide", url: "https://www.getyourguide.com/london-l57/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "Tiqets", url: "https://www.tiqets.com/en/london-c824706/", param: `?marker=${process.env.TRAVELPAYOUTS_MARKER || ""}&utm_source=${utmSource}`, category: "tickets" },
        ],
      },
    ],
    'arabaldives': [
      {
        keywords: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "villa", "فندق", "فنادق", "منتجع"],
        affiliates: [
          { name: "Booking.com", url: "https://www.booking.com/country/mv.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
          { name: "Expedia", url: "https://www.expedia.com/Maldives-Hotels.d6023672.Travel-Guide-Hotels", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "hotel" },
          { name: "Agoda", url: "https://www.agoda.com/maldives", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "hotel" },
        ],
      },
      {
        keywords: ["resort", "island", "overwater", "water villa", "جزيرة", "فوق الماء"],
        affiliates: [
          { name: "Expedia", url: "https://www.expedia.com/Maldives-Hotels.d6023672.Travel-Guide-Hotels", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "resort" },
          { name: "Agoda", url: "https://www.agoda.com/maldives", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "resort" },
        ],
      },
      {
        keywords: ["tour", "tours", "experience", "snorkeling", "diving", "excursion", "غوص", "غطس", "جولة"],
        affiliates: [
          { name: "GetYourGuide", url: "https://www.getyourguide.com/maldives-l97358/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "Viator", url: "https://www.viator.com/Maldives/d969", param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`, category: "activity" },
        ],
      },
      {
        keywords: ["transfer", "seaplane", "speedboat", "airport", "نقل", "طائرة مائية", "مطار"],
        affiliates: [
          { name: "Booking.com Taxi", url: "https://www.booking.com/taxi/country/mv.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "transport" },
        ],
      },
      {
        keywords: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
        affiliates: [
          { name: "Allianz Travel", url: "https://www.allianztravelinsurance.com", param: `?utm_source=${utmSource}`, category: "insurance" },
        ],
      },
    ],
    'french-riviera': [
      {
        keywords: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "villa", "فندق", "فنادق"],
        affiliates: [
          { name: "Booking.com", url: "https://www.booking.com/region/fr/cote-d-azur.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
          { name: "Expedia", url: "https://www.expedia.com/Nice-Hotels.d602159.Travel-Guide-Hotels", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "hotel" },
          { name: "Agoda", url: "https://www.agoda.com/nice", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "hotel" },
        ],
      },
      {
        keywords: ["restaurant", "dining", "food", "halal", "cuisine", "eat", "مطعم", "طعام", "حلال"],
        affiliates: [
          { name: "TheFork", url: "https://www.thefork.fr/nice", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}`, category: "restaurant" },
        ],
      },
      {
        keywords: ["tour", "tours", "experience", "activity", "yacht", "boat", "جولة", "تجربة", "يخت"],
        affiliates: [
          { name: "GetYourGuide", url: "https://www.getyourguide.com/nice-l176/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "Viator", url: "https://www.viator.com/Nice/d30746", param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`, category: "activity" },
        ],
      },
      {
        keywords: ["shopping", "shop", "buy", "luxury", "brand", "fashion", "تسوق"],
        affiliates: [
          { name: "Galeries Lafayette", url: "https://www.galerieslafayette.com", param: `?utm_source=${utmSource}`, category: "shopping" },
        ],
      },
      {
        keywords: ["transfer", "airport", "taxi", "car", "transport", "نقل", "مطار"],
        affiliates: [
          { name: "Blacklane", url: "https://www.blacklane.com/en/nice", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}`, category: "transport" },
        ],
      },
      {
        keywords: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
        affiliates: [
          { name: "Allianz Travel", url: "https://www.allianztravelinsurance.com", param: `?utm_source=${utmSource}`, category: "insurance" },
        ],
      },
    ],
    'istanbul': [
      {
        keywords: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "فندق", "فنادق"],
        affiliates: [
          { name: "Booking.com", url: "https://www.booking.com/city/tr/istanbul.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
          { name: "Expedia", url: "https://www.expedia.com/Istanbul-Hotels.d553248635576498048.Travel-Guide-Hotels", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "hotel" },
          { name: "Agoda", url: "https://www.agoda.com/istanbul", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "hotel" },
        ],
      },
      {
        keywords: ["restaurant", "dining", "food", "halal", "cuisine", "eat", "kebab", "مطعم", "طعام", "حلال"],
        affiliates: [
          { name: "TheFork", url: "https://www.thefork.com/istanbul", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}`, category: "restaurant" },
        ],
      },
      {
        keywords: ["tour", "tours", "experience", "activity", "bazaar", "mosque", "hammam", "جولة", "تجربة", "بازار"],
        affiliates: [
          { name: "GetYourGuide", url: "https://www.getyourguide.com/istanbul-l56/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "Viator", url: "https://www.viator.com/Istanbul/d585", param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`, category: "activity" },
        ],
      },
      {
        keywords: ["shopping", "shop", "buy", "luxury", "brand", "bazaar", "Grand Bazaar", "تسوق"],
        affiliates: [
          { name: "Grand Bazaar Istanbul", url: "https://www.grandbazaaristanbul.org", param: `?utm_source=${utmSource}`, category: "shopping" },
        ],
      },
      {
        keywords: ["transfer", "airport", "taxi", "car", "transport", "نقل", "مطار"],
        affiliates: [
          { name: "Blacklane", url: "https://www.blacklane.com/en/istanbul", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}`, category: "transport" },
        ],
      },
      {
        keywords: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
        affiliates: [
          { name: "Allianz Travel", url: "https://www.allianztravelinsurance.com", param: `?utm_source=${utmSource}`, category: "insurance" },
        ],
      },
    ],
    'thailand': [
      {
        keywords: ["hotel", "hotels", "accommodation", "stay", "booking", "resort", "villa", "فندق", "فنادق"],
        affiliates: [
          { name: "Booking.com", url: "https://www.booking.com/country/th.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
          { name: "Expedia", url: "https://www.expedia.com/Thailand-Hotels.d30.Travel-Guide-Hotels", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "hotel" },
          { name: "Agoda", url: "https://www.agoda.com/thailand", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "hotel" },
        ],
      },
      {
        keywords: ["resort", "island", "beach", "جزيرة", "شاطئ"],
        affiliates: [
          { name: "Expedia", url: "https://www.expedia.com/Thailand-Hotels.d30.Travel-Guide-Hotels", param: `?utm_source=${utmSource}&utm_medium=affiliate`, category: "resort" },
          { name: "Agoda", url: "https://www.agoda.com/thailand", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "resort" },
        ],
      },
      {
        keywords: ["tour", "tours", "experience", "activity", "temple", "market", "جولة", "تجربة", "معبد"],
        affiliates: [
          { name: "GetYourGuide", url: "https://www.getyourguide.com/bangkok-l169/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "Viator", url: "https://www.viator.com/Bangkok/d191", param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`, category: "activity" },
        ],
      },
      {
        keywords: ["shopping", "shop", "buy", "luxury", "brand", "market", "تسوق"],
        affiliates: [
          { name: "Central World", url: "https://www.centralworld.co.th", param: `?utm_source=${utmSource}`, category: "shopping" },
        ],
      },
      {
        keywords: ["transfer", "airport", "taxi", "car", "transport", "نقل", "مطار"],
        affiliates: [
          { name: "Blacklane", url: "https://www.blacklane.com/en/bangkok", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}`, category: "transport" },
        ],
      },
      {
        keywords: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
        affiliates: [
          { name: "Allianz Travel", url: "https://www.allianztravelinsurance.com", param: `?utm_source=${utmSource}`, category: "insurance" },
        ],
      },
    ],
    'zenitha-yachts-med': [
      {
        keywords: ["yacht", "yachts", "charter", "sailing", "boat", "catamaran", "gulet", "يخت", "إبحار", "قارب"],
        affiliates: [
          { name: "Boatbookings", url: "https://www.boatbookings.com", param: `?ref=${process.env.BOATBOOKINGS_AFFILIATE_ID || ""}`, category: "yacht" },
          { name: "Click&Boat", url: "https://www.clickandboat.com", param: `?aff=${process.env.CLICKANDBOAT_AFFILIATE_ID || ""}`, category: "yacht" },
        ],
      },
      {
        keywords: ["tour", "tours", "experience", "excursion", "marine", "snorkeling", "diving", "جولة", "تجربة", "غوص"],
        affiliates: [
          { name: "GetYourGuide", url: "https://www.getyourguide.com", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}`, category: "activity" },
          { name: "Viator", url: "https://www.viator.com", param: `?pid=${process.env.VIATOR_AFFILIATE_ID || ""}`, category: "activity" },
        ],
      },
      {
        keywords: ["hotel", "hotels", "accommodation", "stay", "marina", "port", "فندق", "فنادق", "ميناء"],
        affiliates: [
          { name: "Booking.com", url: "https://www.booking.com", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}`, category: "hotel" },
          { name: "Agoda", url: "https://www.agoda.com", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}`, category: "hotel" },
        ],
      },
      {
        keywords: ["transfer", "airport", "taxi", "car", "transport", "نقل", "مطار"],
        affiliates: [
          { name: "Blacklane", url: "https://www.blacklane.com", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}`, category: "transport" },
        ],
      },
      {
        keywords: ["insurance", "travel insurance", "safety", "protection", "تأمين"],
        affiliates: [
          { name: "Allianz Travel", url: "https://www.allianztravelinsurance.com", param: `?utm_source=${utmSource}`, category: "insurance" },
        ],
      },
    ],
  };

  return SITE_RULES[siteId] || [];
}

// Build affiliate rules from Travelpayouts connected programs
// Travelpayouts uses marker-based tracking: ?marker={MARKER}&utm_source={siteId}
function getTravelpayoutsRules(siteId: string): AffiliateRule[] {
  const marker = process.env.TRAVELPAYOUTS_MARKER;
  if (!marker) {
    console.warn("[affiliate-injection] TRAVELPAYOUTS_MARKER not set — 0 Travelpayouts rules loaded");
    return [];
  }

  const tp = (name: string, url: string, category: string) => ({
    name, url, param: `${url.includes("?") ? "&" : "?"}marker=${marker}&utm_source=${siteId}`, category,
  });

  // Connected programs (as of March 23, 2026):
  // - Welcome Pickups: airport transfers, sightseeing rides (8-9%, 45d cookie)
  // - Tiqets: attraction tickets worldwide (3.5-8%, 30d cookie)
  // - TicketNetwork: sports, theater, concert event tickets (6-12.5%, 45d cookie)
  // Add more as Khaled joins programs in Travelpayouts dashboard
  const rules: AffiliateRule[] = [
    {
      keywords: ["transfer", "airport", "taxi", "pickup", "car", "ride", "Heathrow", "Gatwick", "Stansted", "نقل", "مطار", "تاكسي"],
      affiliates: [
        tp("Welcome Pickups", "https://www.welcomepickups.com/london/", "transport"),
      ],
    },
    {
      keywords: ["ticket", "tickets", "attraction", "museum", "gallery", "tower", "eye", "madame tussauds", "shard", "تذكرة", "تذاكر", "متحف"],
      affiliates: [
        tp("Tiqets", "https://www.tiqets.com/en/london-c824706/", "tickets"),
        tp("TicketNetwork", "https://www.ticketnetwork.com/london-events", "tickets"),
      ],
    },
    {
      keywords: ["football", "match", "premier league", "chelsea", "arsenal", "tottenham", "concert", "theatre", "theater", "west end", "show", "musical", "كرة القدم", "مباراة", "حفلة", "مسرح"],
      affiliates: [
        tp("TicketNetwork", "https://www.ticketnetwork.com/london-events", "tickets"),
        tp("Tiqets", "https://www.tiqets.com/en/london-c824706/", "tickets"),
      ],
    },
    {
      keywords: ["tour", "tours", "experience", "activity", "sightseeing", "day trip", "جولة", "تجربة", "نشاط"],
      affiliates: [
        tp("Tiqets", "https://www.tiqets.com/en/london-c824706/", "activity"),
        tp("Welcome Pickups", "https://www.welcomepickups.com/london/", "transport"),
      ],
    },
  ];

  console.log(`[affiliate-injection] Loaded ${rules.length} Travelpayouts rules (marker: ${marker.substring(0, 4)}...)`);
  return rules;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Validates URL is https:// only — blocks javascript:, data:, and other schemes */
function isValidAffiliateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (err) {
    console.warn(`[affiliate-injection] Invalid affiliate URL: "${url}" — ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// Categories where commercial affiliate links are inappropriate
const SUPPRESS_AFFILIATES_KEYWORDS = [
  "mosque", "masjid", "ramadan", "prayer", "timetable", "eid", "islamic heritage",
  "مسجد", "رمضان", "صلاة", "عيد",
  "obituary", "memorial", "charity", "donation",
];

// Minimum keyword score to qualify a category
// Title match = 5 points, each body occurrence = 1 point
// Score of 1 = at least 1 body mention. Title match (5) always qualifies.
const MIN_KEYWORD_SCORE = 1;

function findMatches(content: string, siteId: string, limit = 4, dbRules?: AffiliateRule[] | null, title?: string) {
  const lower = content.toLowerCase();
  const titleLower = (title || "").toLowerCase();
  const rules = dbRules || getAffiliateRulesForSite(siteId);

  // Check if article is about a non-commercial topic — suppress all affiliates
  const combinedText = titleLower + " " + lower;
  const suppressCount = SUPPRESS_AFFILIATES_KEYWORDS.filter(k => combinedText.includes(k)).length;
  if (suppressCount >= 2) {
    // Article is primarily about mosque/prayer/ramadan etc — skip affiliate injection
    return [];
  }

  const matches: Array<{ keyword: string; name: string; url: string; param: string; category: string; score: number }> = [];

  for (const rule of rules) {
    let categoryScore = 0;
    let bestKeyword = "";

    for (const keyword of rule.keywords) {
      const kw = keyword.toLowerCase();

      // Title matches count 5x (article is ABOUT this topic)
      const titleMatch = titleLower.includes(kw) ? 5 : 0;

      // Body keyword occurrences
      const bodyOccurrences = (lower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;

      const kwScore = titleMatch + bodyOccurrences;
      if (kwScore > categoryScore) {
        categoryScore = kwScore;
        bestKeyword = keyword;
      }
    }

    // Require minimum relevance: title match (5) OR 1+ body mention
    if (categoryScore < MIN_KEYWORD_SCORE) continue;

    let skippedEmpty = 0;
    for (const aff of rule.affiliates) {
      // Skip affiliates with empty tracking params (env var not set — we're not approved yet)
      // This prevents showing partner names like "Booking.com" when we have no commission tracking
      const paramValue = aff.param.split("=").pop() || "";
      if (!paramValue || aff.param.endsWith("=") || aff.param.endsWith("=''") || aff.param.endsWith('=""')) { skippedEmpty++; continue; }
      if (!matches.some((m) => m.name === aff.name)) {
        matches.push({ keyword: bestKeyword, ...aff, score: Math.min(categoryScore * 10, 100) });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

function buildTrackedUrl(partnerUrl: string, slug: string, siteId: string): string {
  // Wrap partner URL through our click tracker for revenue attribution + GA4 events
  const sid = `${siteId}_${slug}`.substring(0, 100); // CJ SID max 100 chars
  return `/api/affiliate/click?url=${encodeURIComponent(partnerUrl)}&sid=${encodeURIComponent(sid)}`;
}

function injectAffiliates(html: string, siteId: string, dbRules?: AffiliateRule[] | null, title?: string, slug?: string): { content: string; count: number; partners: string[] } {
  const matches = findMatches(html, siteId, 4, dbRules, title);
  if (matches.length === 0) return { content: html, count: 0, partners: [] };

  let result = html;
  const partners: string[] = [];
  const articleSlug = slug || "unknown";

  // Replace placeholder divs with actual CTAs
  for (const match of matches.slice(0, 2)) {
    // Validate URL scheme — block javascript:/data: injection from compromised DB
    const fullUrl = match.url + match.param;
    if (!isValidAffiliateUrl(fullUrl)) {
      console.warn(`[affiliate-injection] Skipping invalid URL scheme: ${match.name}`);
      continue;
    }
    const safeName = escapeHtml(match.name);
    // Route through click tracker for revenue attribution + GA4 events
    const trackedUrl = buildTrackedUrl(fullUrl, articleSlug, siteId);
    const cta = `
<div class="affiliate-recommendation" data-affiliate="${safeName}" data-category="${escapeHtml(match.category)}" style="margin: 1.5rem 0; padding: 1rem 1.5rem; background: linear-gradient(135deg, #f8f4ff, #fff8e1); border-left: 4px solid #7c3aed; border-radius: 8px;">
  <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #4c1d95;">Recommended: ${safeName}</p>
  <p style="margin: 0 0 0.75rem 0; color: #6b7280; font-size: 0.9rem;">Book through our trusted partner for exclusive rates</p>
  <a href="${trackedUrl}" target="_blank" rel="noopener sponsored" data-affiliate-partner="${safeName}" style="display: inline-block; padding: 0.5rem 1.5rem; background: #7c3aed; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">View on ${safeName} &rarr;</a>
</div>`;

    // Replace first placeholder with this CTA
    const placeholderRegex = /<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/i;
    if (placeholderRegex.test(result)) {
      result = result.replace(placeholderRegex, cta);
      partners.push(match.name);
    }
  }

  // Replace any remaining placeholders with the partners section
  result = result.replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "");

  // Add recommended partners section at the end — only with tracked (approved) partners
  const trackedMatches = matches.filter((m) => {
    const pv = m.param.split("=").pop() || "";
    return pv && !m.param.endsWith("=") && isValidAffiliateUrl(m.url + m.param);
  });
  if (trackedMatches.length > 0) {
    result += `
<div class="affiliate-partners-section" style="margin-top: 2rem; padding: 1.5rem; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Recommended Partners</h3>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
    ${trackedMatches
      .map(
        (m) =>
          `<a href="${buildTrackedUrl(m.url + m.param, articleSlug, siteId)}" target="_blank" rel="noopener sponsored" data-affiliate-partner="${escapeHtml(m.name)}" style="display: block; padding: 1rem; background: white; border-radius: 8px; border: 1px solid #e5e7eb; text-decoration: none; color: inherit;">
      <strong style="color: #7c3aed;">${escapeHtml(m.name)}</strong>
      <span style="display: block; font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">${escapeHtml(m.category)}</span>
    </a>`,
      )
      .join("")}
  </div>
</div>`;
    partners.push(...trackedMatches.filter((m) => !partners.includes(m.name)).map((m) => m.name));
  }

  return { content: result, count: partners.length, partners };
}

async function handleAffiliateInjection(request: NextRequest) {
  const startTime = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_AFFILIATE_INJECTION=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("affiliate-injection");
  if (flagResponse) return flagResponse;

  // Generate a unique run ID for snapshot grouping (enables bulk rollback)
  const cronRunId = `aff-inj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const { prisma } = await import("@/lib/db");

    // Find ALL published posts that DON'T have affiliate links — no date window.
    // Previously used a 48h window which missed older articles (15 uncovered articles).
    const { getActiveSiteIds, getDefaultSiteId } = await import("@/config/sites");
    const activeSiteIds = getActiveSiteIds();
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        ...(activeSiteIds.length > 0 ? { siteId: { in: activeSiteIds } } : {}),
      },
      select: {
        id: true,
        content_en: true,
        content_ar: true,
        slug: true,
        title_en: true,
        siteId: true,
      },
      take: 100,
      orderBy: { created_at: "desc" },
    });

    // Filter to posts that need injection — no affiliate links from ANY injection pathway
    const needsInjection = posts.filter((p) => {
      const c = p.content_en || "";
      // Check ALL known affiliate markers from both injection systems
      const hasAffiliateRecommendation = c.includes('class="affiliate-recommendation"');
      const hasAffiliateCta = c.includes('class="affiliate-cta-block"');
      const hasAffiliatePartners = c.includes('class="affiliate-partners-section"');
      const hasSponsoredRel = c.includes('rel="sponsored"') || c.includes('rel="noopener sponsored"');
      const hasClickTracker = c.includes('/api/affiliate/click');
      const hasDataAffiliate = c.includes('data-affiliate-id') || c.includes('data-affiliate=') || c.includes('data-affiliate-partner=');
      const hasPlaceholder = c.includes('class="affiliate-placeholder"');
      // Inject if: has placeholder OR has no affiliate markers at all
      return hasPlaceholder || (!hasAffiliateRecommendation && !hasAffiliateCta && !hasAffiliatePartners && !hasSponsoredRel && !hasClickTracker && !hasDataAffiliate);
    });

    let injected = 0;
    const results: Array<{ slug: string; partners: string[] }> = [];

    // Cache rules per site to avoid repeated queries
    const dbRulesCache = new Map<string, AffiliateRule[] | null>();
    // Load CjLink-based rules once (global, not per-site — CjLink has no siteId)
    const cjLinkRules = await getAffiliateRulesFromCjLinks(getDefaultSiteId());
    const tpRulesPreview = getTravelpayoutsRules(getDefaultSiteId());
    console.log(`[affiliate-injection] Rule sources: CJ=${cjLinkRules.length}, TP=${tpRulesPreview.length}, postsNeedingInjection=${needsInjection.length}`);

    if (!isEnhancementOwner("affiliate-injection", "affiliate_links")) {
      console.warn("[affiliate-injection] Skipping — not the enhancement owner for affiliate_links");
      await logCronExecution("affiliate-injection", "completed", {
        durationMs: Date.now() - startTime,
        resultSummary: { skipped: true, reason: "not_enhancement_owner" },
      }).catch((logErr) => console.warn("[affiliate-injection] Failed to log execution:", logErr instanceof Error ? logErr.message : logErr));
      return NextResponse.json({ success: true, skipped: true, reason: "not_enhancement_owner" });
    }

    let skippedSuppressed = 0;
    let skippedNoMatch = 0;
    const diagnosticSamples: string[] = [];

    for (const post of needsInjection) {
      if (Date.now() - startTime > BUDGET_MS) break;

      const postSiteId = post.siteId || getDefaultSiteId();

      // Per-site feature flag check — allows disabling affiliate injection for a single site
      const siteFlag = await checkCronEnabled("affiliate-injection", postSiteId);
      if (siteFlag) continue;

      // Load DB-configured affiliate rules (cached per site)
      if (!dbRulesCache.has(postSiteId)) {
        dbRulesCache.set(postSiteId, await getAffiliateRulesFromDB(postSiteId));
      }
      // Merge: DB rules + CjLink rules + static rules (additive, priority by order)
      // findMatches() deduplicates by affiliate name — first match wins
      const dbRules = dbRulesCache.get(postSiteId) ?? [];
      const staticRules = getAffiliateRulesForSite(postSiteId);
      const tpRules = getTravelpayoutsRules(postSiteId);
      const mergedRules = [
        ...dbRules,                        // DB-configured rules (highest priority)
        ...(cjLinkRules || []),             // CJ deep link rules (e.g., Vrbo)
        ...tpRules,                        // Travelpayouts programs (Welcome Pickups, Tiqets)
        ...staticRules,                     // Comprehensive static rules (all categories)
      ];

      const enResult = injectAffiliates(post.content_en || "", postSiteId, mergedRules.length > 0 ? mergedRules : null, post.title_en, post.slug);
      const arResult = post.content_ar ? injectAffiliates(post.content_ar, postSiteId, mergedRules.length > 0 ? mergedRules : null, post.title_en, post.slug) : { content: post.content_ar || "", count: 0, partners: [] };

      // Diagnostic: log why first 5 uninjected posts got 0 matches
      if (enResult.count === 0 && arResult.count === 0 && diagnosticSamples.length < 5) {
        const titleLower = (post.title_en || "").toLowerCase();
        const isSuppressed = SUPPRESS_AFFILIATES_KEYWORDS.filter(k => titleLower.includes(k)).length >= 2;
        if (isSuppressed) {
          skippedSuppressed++;
          diagnosticSamples.push(`"${post.title_en?.slice(0, 50)}" → suppressed (religious/non-commercial)`);
        } else {
          // Detailed diagnostic: show which rules matched keywords but had empty params
          const kwMatched: string[] = [];
          const emptyParams: string[] = [];
          for (const rule of mergedRules) {
            for (const kw of rule.keywords) {
              if (titleLower.includes(kw.toLowerCase()) || (post.content_en || "").toLowerCase().split(kw.toLowerCase()).length > 2) {
                kwMatched.push(kw);
                for (const a of rule.affiliates) {
                  if (a.param.endsWith("=")) emptyParams.push(a.name);
                }
                break;
              }
            }
          }
          const detail = kwMatched.length > 0
            ? `keywords matched [${kwMatched.slice(0, 3).join(",")}] but affiliates empty [${[...new Set(emptyParams)].slice(0, 3).join(",")}]`
            : `no keywords matched in title/body`;
          skippedNoMatch++;
          diagnosticSamples.push(`"${post.title_en?.slice(0, 50)}" → 0/${mergedRules.length} rules: ${detail}`);
        }
      }

      if (enResult.count > 0 || arResult.count > 0) {
        const allPartners = [...new Set([...enResult.partners, ...arResult.partners])];

        // Snapshot content BEFORE injection for 24h rollback capability
        await createSnapshot(
          post.id,
          post.slug,
          post.title_en || post.slug,
          post.content_en || "",
          post.content_ar || "",
          allPartners,
          cronRunId
        );

        await optimisticBlogPostUpdate(post.id, (current) => ({
          content_en: enResult.content,
          content_ar: arResult.content,
          enhancement_log: buildEnhancementLogEntry(current.enhancement_log, "affiliate_links", "affiliate-injection", `Injected ${allPartners.length} affiliate partner(s): ${allPartners.join(", ")}`),
        }), { tag: "[affiliate-injection]" });

        // Mark URL for resubmission so Google re-crawls the affiliate-enriched version
        try {
          const { getSiteDomain } = await import("@/config/sites");
          const postUrl = `${getSiteDomain(postSiteId)}/blog/${post.slug}`;
          await prisma.uRLIndexingStatus.updateMany({
            where: { site_id: postSiteId, url: postUrl },
            data: { submitted_indexnow: false, last_submitted_at: null },
          });
        } catch (resubErr) {
          console.warn(`[affiliate-injection] Failed to mark ${post.slug} for resubmission:`, resubErr instanceof Error ? resubErr.message : resubErr);
        }

        injected++;
        results.push({
          slug: post.slug,
          partners: [...new Set([...enResult.partners, ...arResult.partners])],
        });
      }
    }

    const duration = Date.now() - startTime;

    await logCronExecution("affiliate-injection", "completed", {
      durationMs: duration,
      itemsProcessed: injected,
      itemsSucceeded: injected,
      resultSummary: { postsChecked: posts.length, postsNeedingInjection: needsInjection.length, postsInjected: injected, cjRulesLoaded: cjLinkRules.length, skippedSuppressed, skippedNoMatch, diagnosticSamples, cronRunId },
    }).catch((logErr) => console.warn("[affiliate-injection] Failed to log execution:", logErr instanceof Error ? logErr.message : logErr));

    return NextResponse.json({
      success: true,
      postsChecked: posts.length,
      postsNeedingInjection: needsInjection.length,
      postsInjected: injected,
      results,
      cronRunId,
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);

    await logCronExecution("affiliate-injection", "failed", {
      durationMs: duration,
      errorMessage: errMsg,
    }).catch(err => console.warn("[affiliate-injection] logCronExecution failed:", err instanceof Error ? err.message : err));

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "affiliate-injection", error: errMsg }).catch(err => console.warn("[affiliate-injection] onCronFailure hook failed:", err instanceof Error ? err.message : err));

    return NextResponse.json(
      { error: errMsg },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleAffiliateInjection(request);
}

export async function POST(request: NextRequest) {
  return handleAffiliateInjection(request);
}
