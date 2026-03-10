/**
 * Per-Site Affiliate Keyword Configuration
 *
 * Maps site destinations to relevant search keywords for CJ product discovery,
 * deal discovery, and advertiser matching. Used by cj-sync, deal-discovery,
 * and link-injector.
 */

import { getDefaultSiteId } from "@/config/sites";

const SITE_KEYWORDS: Record<string, string[]> = {
  "yalla-london": [
    "london hotel",
    "london restaurant",
    "london tour",
    "london experience",
    "london luxury hotel",
    "halal restaurant london",
  ],
  arabaldives: [
    "maldives resort",
    "maldives hotel",
    "maldives experience",
    "maldives luxury resort",
    "maldives villa",
    "maldives halal resort",
  ],
  "french-riviera": [
    "french riviera hotel",
    "nice hotel",
    "cannes restaurant",
    "cote d'azur luxury",
    "monaco hotel",
    "saint tropez yacht",
  ],
  istanbul: [
    "istanbul hotel",
    "istanbul tour",
    "istanbul restaurant",
    "istanbul luxury hotel",
    "bosphorus hotel",
    "istanbul halal restaurant",
  ],
  thailand: [
    "thailand hotel",
    "bangkok tour",
    "phuket resort",
    "thailand luxury resort",
    "koh samui hotel",
    "thailand halal restaurant",
  ],
  "zenitha-yachts-med": [
    "yacht charter",
    "luxury yacht",
    "mediterranean yacht",
    "sailing vacation",
    "yacht rental",
  ],
};

/**
 * Get keywords for a specific site. Falls back to default site.
 */
export function getKeywordsForSite(siteId?: string): string[] {
  const id = siteId || getDefaultSiteId();
  return SITE_KEYWORDS[id] || SITE_KEYWORDS["yalla-london"] || [];
}

/**
 * Get the deal discovery category keywords for a site.
 * These are broader categories used by deal-discovery.ts.
 */
export function getDealCategoriesForSite(siteId?: string): Record<string, string[]> {
  const id = siteId || getDefaultSiteId();

  const SITE_DEAL_CATEGORIES: Record<string, Record<string, string[]>> = {
    "yalla-london": {
      hotels: ["london hotel", "luxury london hotel", "boutique hotel london"],
      experiences: ["london tour", "london tickets", "london experience"],
      dining: ["london restaurant", "halal restaurant london", "fine dining london"],
      transport: ["london airport transfer", "london chauffeur", "london car hire"],
    },
    arabaldives: {
      resorts: ["maldives resort", "maldives luxury resort", "maldives villa"],
      experiences: ["maldives diving", "maldives spa", "maldives excursion"],
      transport: ["maldives seaplane", "maldives transfer", "maldives speedboat"],
    },
    "french-riviera": {
      hotels: ["nice hotel", "cannes hotel", "french riviera luxury"],
      dining: ["french riviera restaurant", "nice restaurant", "monaco dining"],
      experiences: ["french riviera tour", "cannes experience", "monaco tour"],
      yachts: ["french riviera yacht", "monaco yacht charter", "saint tropez yacht"],
    },
    istanbul: {
      hotels: ["istanbul hotel", "istanbul luxury hotel", "bosphorus hotel"],
      experiences: ["istanbul tour", "istanbul bazaar tour", "bosphorus cruise"],
      dining: ["istanbul restaurant", "istanbul halal restaurant", "turkish dining"],
    },
    thailand: {
      hotels: ["thailand hotel", "phuket resort", "bangkok hotel"],
      experiences: ["thailand tour", "bangkok tour", "thai cooking class"],
      dining: ["thailand restaurant", "thai halal restaurant", "bangkok dining"],
      wellness: ["thailand spa", "thailand wellness resort", "thai massage retreat"],
    },
    "zenitha-yachts-med": {
      yachts: ["yacht charter", "luxury yacht charter", "mediterranean yacht rental"],
      experiences: ["sailing vacation", "yacht cruise", "island hopping yacht"],
      destinations: ["greek islands yacht", "croatia yacht charter", "turkey yacht"],
    },
  };

  return SITE_DEAL_CATEGORIES[id] || SITE_DEAL_CATEGORIES["yalla-london"] || {};
}

/**
 * Get the advertiser-to-category mapping for a site.
 * Used by link-injector to match content categories to relevant advertisers.
 */
export function getAdvertiserMapForSite(siteId?: string): Record<string, string[]> {
  const id = siteId || getDefaultSiteId();

  // These are CJ advertiser names/patterns mapped to content categories
  const SITE_ADVERTISER_MAPS: Record<string, Record<string, string[]>> = {
    "yalla-london": {
      hotel: ["Booking.com", "Hotels.com", "HalalBooking", "Expedia", "Agoda"],
      experience: ["GetYourGuide", "Viator", "Klook", "Tiqets"],
      dining: ["TheFork", "OpenTable"],
      transport: ["Omio", "Trainline", "Blacklane"],
      shopping: ["Harrods", "Selfridges", "Net-A-Porter"],
    },
    arabaldives: {
      hotel: ["Booking.com", "Agoda", "HalalBooking", "Luxury Escapes"],
      experience: ["GetYourGuide", "Viator", "Klook"],
      transport: ["Kiwi.com", "Skyscanner"],
    },
    "french-riviera": {
      hotel: ["Booking.com", "Hotels.com", "Expedia", "Agoda"],
      experience: ["GetYourGuide", "Viator"],
      dining: ["TheFork", "OpenTable"],
      yacht: ["Boatbookings", "Click&Boat"],
    },
    istanbul: {
      hotel: ["Booking.com", "HalalBooking", "Agoda"],
      experience: ["GetYourGuide", "Viator", "Klook"],
      dining: ["TheFork"],
      transport: ["Omio", "Blacklane"],
    },
    thailand: {
      hotel: ["Booking.com", "Agoda", "HalalBooking"],
      experience: ["GetYourGuide", "Viator", "Klook"],
      wellness: ["Booking.com", "Agoda"],
      transport: ["Kiwi.com", "12Go Asia"],
    },
    "zenitha-yachts-med": {
      yacht: ["Boatbookings", "Click&Boat", "Zizooboats"],
      experience: ["GetYourGuide", "Viator"],
      transport: ["Kiwi.com", "Skyscanner"],
    },
  };

  return SITE_ADVERTISER_MAPS[id] || SITE_ADVERTISER_MAPS["yalla-london"] || {};
}
