/**
 * CJ Affiliate Link Injector
 *
 * Analyzes content and returns the best-matching affiliate links.
 * Matching logic:
 * 1. Category match (article category → advertiser category)
 * 2. Keyword match (content text → product/offer keywords)
 * 3. Language match (EN/AR)
 * 4. Sort by EPC (highest earning first)
 * 5. Respect max links per placement, no duplicate advertisers
 */

import { CJ_NETWORK_ID } from "./cj-client";

// ---------------------------------------------------------------------------
// Category → Advertiser Mapping
// ---------------------------------------------------------------------------

const CATEGORY_ADVERTISER_MAP: Record<string, string[]> = {
  hotel: ["Booking.com UK", "IHG Europe", "Vrbo", "Expedia, Inc"],
  hotels: ["Booking.com UK", "IHG Europe", "Vrbo", "Expedia, Inc"],
  accommodation: ["Booking.com UK", "IHG Europe", "Vrbo", "Expedia, Inc"],
  flight: ["Qatar Airways", "KAYAK US", "Expedia, Inc"],
  flights: ["Qatar Airways", "KAYAK US", "Expedia, Inc"],
  transport: ["Qatar Airways", "KAYAK US"],
  experience: ["TripAdvisor Commerce Campaign", "Expedia, Inc"],
  experiences: ["TripAdvisor Commerce Campaign", "Expedia, Inc"],
  dining: ["TripAdvisor Commerce Campaign"],
  restaurant: ["TripAdvisor Commerce Campaign"],
  travel: ["Expedia, Inc", "lastminute.com INT", "KAYAK US"],
  vacation: ["Expedia, Inc", "Vrbo", "lastminute.com INT"],
  shopping: ["lastminute.com INT"],
};

// Keywords to detect content category
const KEYWORD_CATEGORIES: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ["hotel", "hotels", "accommodation", "stay", "resort", "suite", "booking",
               "فندق", "فنادق", "إقامة"],
    category: "hotel",
  },
  {
    keywords: ["flight", "flights", "airline", "airways", "airport", "travel to",
               "رحلة", "طيران", "مطار"],
    category: "flight",
  },
  {
    keywords: ["restaurant", "dining", "food", "halal", "cuisine", "eat",
               "مطعم", "طعام", "حلال"],
    category: "dining",
  },
  {
    keywords: ["experience", "tour", "activity", "museum", "attraction", "ticket",
               "تجربة", "جولة", "نشاط"],
    category: "experience",
  },
  {
    keywords: ["transfer", "taxi", "car hire", "car rental", "chauffeur", "uber",
               "تاكسي", "نقل"],
    category: "transport",
  },
  {
    keywords: ["shop", "shopping", "luxury", "mall", "store", "harrods",
               "تسوق", "متجر"],
    category: "shopping",
  },
];

// ---------------------------------------------------------------------------
// Link Selection
// ---------------------------------------------------------------------------

export interface SelectedLink {
  id: string;
  name: string;
  advertiserName: string;
  advertiserId: string;
  destinationUrl: string;
  affiliateUrl: string;
  category: string | null;
  epc: number;
  priority: string;
  matchReason: string;
}

export interface InjectionResult {
  links: SelectedLink[];
  placements: Array<{
    position: string;
    link: SelectedLink;
  }>;
  detectedCategories: string[];
}

/**
 * Get the best-matching affiliate links for a piece of content.
 */
export async function getLinksForContent(
  content: string,
  language: "en" | "ar",
  category: string,
  tags: string[],
  maxLinks = 5,
): Promise<InjectionResult> {
  const { prisma } = await import("@/lib/db");

  // 1. Detect content categories from text
  const detectedCategories = detectCategories(content);
  const allCategories = [...new Set<string>([category, ...detectedCategories, ...tags])];

  // 2. Find matching advertiser names
  const matchedAdvertiserNames = new Set<string>();
  for (const cat of allCategories) {
    const names = CATEGORY_ADVERTISER_MAP[cat.toLowerCase()] || [];
    for (const n of names) matchedAdvertiserNames.add(n);
  }

  // 3. Get joined advertisers sorted by EPC
  const advertisers = await prisma.cjAdvertiser.findMany({
    where: {
      networkId: CJ_NETWORK_ID,
      status: "JOINED",
      ...(matchedAdvertiserNames.size > 0
        ? { name: { in: Array.from(matchedAdvertiserNames) } }
        : {}),
    },
    orderBy: { threeMonthEpc: "desc" },
  });

  if (advertisers.length === 0) {
    // Fall back to ALL joined advertisers
    const allJoined = await prisma.cjAdvertiser.findMany({
      where: { networkId: CJ_NETWORK_ID, status: "JOINED" },
      orderBy: { threeMonthEpc: "desc" },
      take: 10,
    });
    advertisers.push(...allJoined);
  }

  // 4. Get best link for each advertiser (no duplicates)
  const selectedLinks: SelectedLink[] = [];
  const usedAdvertiserIds = new Set<string>();

  for (const adv of advertisers) {
    if (usedAdvertiserIds.has(adv.id)) continue;
    if (selectedLinks.length >= maxLinks) break;

    // Find the best link for this advertiser
    const link = await prisma.cjLink.findFirst({
      where: {
        advertiserId: adv.id,
        isActive: true,
        language: language === "ar" ? "AR" : "EN",
      },
      orderBy: { clicks: "desc" },
    });

    // Fall back to any language
    const bestLink = link || await prisma.cjLink.findFirst({
      where: { advertiserId: adv.id, isActive: true },
      orderBy: { clicks: "desc" },
    });

    if (bestLink) {
      usedAdvertiserIds.add(adv.id);
      selectedLinks.push({
        id: bestLink.id,
        name: bestLink.name,
        advertiserName: adv.name,
        advertiserId: adv.id,
        destinationUrl: bestLink.destinationUrl,
        affiliateUrl: bestLink.affiliateUrl,
        category: bestLink.category || adv.category,
        epc: adv.threeMonthEpc || 0,
        priority: adv.priority,
        matchReason: matchedAdvertiserNames.has(adv.name)
          ? `Category match: ${category}`
          : "EPC-based fallback",
      });
    }
  }

  // 5. Ensure Qatar Airways is included for transport/flight content
  if (
    (detectedCategories.includes("flight") || detectedCategories.includes("transport")) &&
    !selectedLinks.some((l) => l.advertiserName.includes("Qatar"))
  ) {
    const qatar = await prisma.cjAdvertiser.findFirst({
      where: { networkId: CJ_NETWORK_ID, name: { contains: "Qatar" }, status: "JOINED" },
    });
    if (qatar) {
      const qatarLink = await prisma.cjLink.findFirst({
        where: { advertiserId: qatar.id, isActive: true },
      });
      if (qatarLink && selectedLinks.length < maxLinks) {
        selectedLinks.push({
          id: qatarLink.id,
          name: qatarLink.name,
          advertiserName: qatar.name,
          advertiserId: qatar.id,
          destinationUrl: qatarLink.destinationUrl,
          affiliateUrl: qatarLink.affiliateUrl,
          category: "flight",
          epc: qatar.threeMonthEpc || 0,
          priority: qatar.priority,
          matchReason: "GCC audience flight priority",
        });
      }
    }
  }

  // 6. Create placement suggestions
  const placements = selectedLinks.slice(0, 3).map((link, i) => ({
    position: i === 0 ? "after-paragraph-3" : i === 1 ? "after-paragraph-6" : "before-conclusion",
    link,
  }));

  return {
    links: selectedLinks,
    placements,
    detectedCategories,
  };
}

/**
 * Detect content categories from text using keyword matching.
 */
function detectCategories(content: string): string[] {
  const text = content.toLowerCase().replace(/<[^>]+>/g, " ");
  const detected: Array<{ category: string; score: number }> = [];

  for (const { keywords, category } of KEYWORD_CATEGORIES) {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        score += Math.min(matches.length * 10, 50);
      }
    }
    if (score > 0) {
      detected.push({ category, score });
    }
  }

  return detected
    .sort((a, b) => b.score - a.score)
    .map((d) => d.category);
}
