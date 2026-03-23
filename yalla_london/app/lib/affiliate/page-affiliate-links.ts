/**
 * Static Page Affiliate Link Builder
 *
 * Generates affiliate tracking URLs for homepage, hotels, experiences,
 * and recommendations pages. These pages use hardcoded data (not DB),
 * so the affiliate-injection cron can't reach them.
 *
 * This utility provides:
 * 1. Known affiliate URLs for specific venues/experiences
 * 2. Generic search affiliate URLs by category
 * 3. SID tracking for revenue attribution
 * 4. Per-site affiliate partner routing
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AffiliateCategory = "hotel" | "experience" | "restaurant" | "attraction" | "flight" | "transport" | "shopping";

export interface AffiliateLink {
  url: string;
  partner: string;
  /** e.g. "Book on Agoda" or "Find on GetYourGuide" */
  label: string;
  /** CSS class for tracking */
  trackingClass: string;
}

// ---------------------------------------------------------------------------
// Per-Site Partner Config
// ---------------------------------------------------------------------------

const SITE_PARTNERS: Record<string, Record<AffiliateCategory, string[]>> = {
  "yalla-london": {
    hotel: ["agoda", "booking", "ihg", "expedia"],
    experience: ["getyourguide", "viator", "bigbus", "citypass"],
    restaurant: ["thefork", "opentable"],
    attraction: ["getyourguide", "viator", "tiqets"],
    flight: ["qatar", "kayak", "lastminute", "expedia"],
    transport: ["blacklane"],
    shopping: ["harrods"],
  },
  "arabaldives": {
    hotel: ["agoda", "booking"],
    experience: ["getyourguide", "viator"],
    restaurant: [],
    attraction: ["getyourguide"],
    flight: ["qatar", "kayak"],
    transport: [],
    shopping: [],
  },
  "french-riviera": {
    hotel: ["agoda", "booking", "expedia"],
    experience: ["getyourguide", "viator"],
    restaurant: ["thefork"],
    attraction: ["getyourguide"],
    flight: ["kayak", "lastminute"],
    transport: ["blacklane"],
    shopping: [],
  },
};

// ---------------------------------------------------------------------------
// Known Venue → Affiliate URL Mappings
// ---------------------------------------------------------------------------

interface VenueMapping {
  /** Lowercase patterns to match venue name */
  patterns: string[];
  category: AffiliateCategory;
  affiliateUrls: Record<string, string>;
}

const VENUE_MAPPINGS: VenueMapping[] = [
  // London Hotels
  {
    patterns: ["dorchester"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/the-dorchester/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/the-dorchester.html",
    },
  },
  {
    patterns: ["ritz", "the ritz london"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/the-ritz-london/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/theritzlondon.html",
    },
  },
  {
    patterns: ["claridge"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/claridges/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/claridge-s.html",
    },
  },
  {
    patterns: ["connaught"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/the-connaught/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/the-connaught.html",
    },
  },
  {
    patterns: ["shangri-la", "shangri la", "the shard"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/shangri-la-the-shard-london/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/shangri-la-hotel-at-the-shard-london.html",
    },
  },
  {
    patterns: ["savoy"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/the-savoy/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/the-savoy.html",
    },
  },
  {
    patterns: ["langham"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/the-langham-london/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/the-langham-london.html",
    },
  },
  {
    patterns: ["corinthia"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/corinthia-london/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/corinthia-london.html",
    },
  },
  {
    patterns: ["four seasons", "park lane"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/four-seasons-hotel-london-at-park-lane/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/four-seasons-park-lane.html",
    },
  },
  {
    patterns: ["mandarin oriental", "hyde park"],
    category: "hotel",
    affiliateUrls: {
      agoda: "https://www.agoda.com/mandarin-oriental-hyde-park-london/hotel/london-gb.html",
      booking: "https://www.booking.com/hotel/gb/mandarin-oriental-hyde-park-london.html",
    },
  },
  // London Experiences
  {
    patterns: ["harry potter", "warner bros", "studio tour"],
    category: "experience",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/warner-bros-studio-tour-london-the-making-of-harry-potter-t97tried/",
      viator: "https://www.viator.com/tours/London/Warner-Bros-Studio-Tour-London/d737-5658LONDON",
    },
  },
  {
    patterns: ["london eye"],
    category: "experience",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/london-eye-tickets-t395957/",
      viator: "https://www.viator.com/tours/London/London-Eye-Standard-Ticket/d737-6397LONDON",
    },
  },
  {
    patterns: ["thames", "river cruise"],
    category: "experience",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/thames-river-cruise-t58954/",
      viator: "https://www.viator.com/tours/London/Thames-River-Cruise/d737-3870P1",
    },
  },
  {
    patterns: ["tower of london", "tower bridge"],
    category: "attraction",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/tower-of-london-tickets-t396021/",
      viator: "https://www.viator.com/tours/London/Tower-of-London-Entrance-Ticket/d737-5065LONDON",
    },
  },
  {
    patterns: ["big bus", "hop on hop off", "hop-on hop-off"],
    category: "experience",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/london-hop-on-hop-off-sightseeing-bus-ticket-t62308/",
      bigbus: "https://www.bigbustours.com/en/london/london-bus-tours",
    },
  },
  {
    patterns: ["view from the shard", "the shard"],
    category: "attraction",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/the-shard-tickets-t62308/",
      viator: "https://www.viator.com/tours/London/The-View-from-The-Shard/d737-26499P1",
    },
  },
  {
    patterns: ["buckingham palace"],
    category: "attraction",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/buckingham-palace-tickets-t396015/",
    },
  },
  {
    patterns: ["kensington palace"],
    category: "attraction",
    affiliateUrls: {
      getyourguide: "https://www.getyourguide.com/london-l57/kensington-palace-tickets-t396019/",
    },
  },
  // Restaurants
  {
    patterns: ["sketch"],
    category: "restaurant",
    affiliateUrls: {
      thefork: "https://www.thefork.co.uk/restaurant/sketch-r48935",
    },
  },
  {
    patterns: ["dinner by heston", "heston blumenthal"],
    category: "restaurant",
    affiliateUrls: {
      thefork: "https://www.thefork.co.uk/restaurant/dinner-by-heston-blumenthal-r506165",
    },
  },
  {
    patterns: ["nobu"],
    category: "restaurant",
    affiliateUrls: {
      thefork: "https://www.thefork.co.uk/restaurant/nobu-london-r40479",
    },
  },
];

// ---------------------------------------------------------------------------
// Generic Search URLs by Category
// ---------------------------------------------------------------------------

const GENERIC_SEARCH_URLS: Record<string, Record<string, string>> = {
  hotel: {
    agoda: "https://www.agoda.com/city/london-gb.html",
    booking: "https://www.booking.com/city/gb/london.html",
    expedia: "https://www.expedia.com/London-Hotels.d178279.Travel-Guide-Hotels",
  },
  experience: {
    getyourguide: "https://www.getyourguide.com/london-l57/",
    viator: "https://www.viator.com/London/d737-ttd",
  },
  attraction: {
    getyourguide: "https://www.getyourguide.com/london-l57/",
    viator: "https://www.viator.com/London-attractions/d737-a",
  },
  restaurant: {
    thefork: "https://www.thefork.co.uk/city/london",
  },
  flight: {
    kayak: "https://www.kayak.com/flights/london",
    lastminute: "https://www.lastminute.com/flights/london",
  },
};

// ---------------------------------------------------------------------------
// Partner Display Names
// ---------------------------------------------------------------------------

const PARTNER_LABELS: Record<string, string> = {
  agoda: "Agoda",
  booking: "Booking.com",
  expedia: "Expedia",
  ihg: "IHG",
  getyourguide: "GetYourGuide",
  viator: "Viator",
  bigbus: "Big Bus Tours",
  citypass: "CityPASS",
  tiqets: "Tiqets",
  thefork: "TheFork",
  opentable: "OpenTable",
  qatar: "Qatar Airways",
  kayak: "KAYAK",
  lastminute: "lastminute.com",
  blacklane: "Blacklane",
  harrods: "Harrods",
  tripadvisor: "TripAdvisor",
  // Travelpayouts aggregated partners
  tp_booking: "Booking.com",
  tp_viator: "Viator",
  tp_getyourguide: "GetYourGuide",
  tp_klook: "Klook",
  tp_discovercars: "DiscoverCars",
  tp_skyscanner: "Skyscanner",
  tp_omio: "Omio",
  tp_hostelworld: "Hostelworld",
  tp_tiqets: "Tiqets",
  tp_marriott: "Marriott",
};

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Get the best affiliate link for a venue/item.
 *
 * @param itemName - Name of the venue (e.g., "The Dorchester", "London Eye")
 * @param category - Type of item
 * @param siteId - Site ID for per-site partner routing
 * @param pageSlug - Page identifier for SID tracking (e.g., "hotels-page", "homepage")
 * @returns AffiliateLink or null if no match
 */
export function getPageAffiliateLink(
  itemName: string,
  category: AffiliateCategory,
  siteId: string = "yalla-london",
  pageSlug: string = "static-page",
): AffiliateLink | null {
  const nameLower = itemName.toLowerCase();

  // 1. Try exact venue match
  const venueMatch = VENUE_MAPPINGS.find((v) =>
    v.patterns.some((p) => nameLower.includes(p)),
  );

  // 2. Get site's preferred partners for this category
  const sitePartners = SITE_PARTNERS[siteId]?.[category] ||
    SITE_PARTNERS["yalla-london"]?.[category] || [];

  if (venueMatch) {
    // Find first available partner that site prefers
    for (const partner of sitePartners) {
      const url = venueMatch.affiliateUrls[partner];
      if (url) {
        return {
          url: appendSid(url, siteId, pageSlug),
          partner,
          label: `Book on ${PARTNER_LABELS[partner] || partner}`,
          trackingClass: "affiliate-page-link",
        };
      }
    }
    // Fallback: use any available affiliate URL
    const [firstPartner, firstUrl] = Object.entries(venueMatch.affiliateUrls)[0] || [];
    if (firstPartner && firstUrl) {
      return {
        url: appendSid(firstUrl, siteId, pageSlug),
        partner: firstPartner,
        label: `Book on ${PARTNER_LABELS[firstPartner] || firstPartner}`,
        trackingClass: "affiliate-page-link",
      };
    }
  }

  // 3. Fallback: generic search URL for the category
  const genericUrls = GENERIC_SEARCH_URLS[category];
  if (genericUrls) {
    for (const partner of sitePartners) {
      const url = genericUrls[partner];
      if (url) {
        return {
          url: appendSid(url, siteId, pageSlug),
          partner,
          label: `Browse on ${PARTNER_LABELS[partner] || partner}`,
          trackingClass: "affiliate-page-link",
        };
      }
    }
  }

  return null;
}

/**
 * Get ALL available affiliate links for a venue (for showing multiple booking options).
 */
export function getAllAffiliateLinks(
  itemName: string,
  category: AffiliateCategory,
  siteId: string = "yalla-london",
  pageSlug: string = "static-page",
): AffiliateLink[] {
  const nameLower = itemName.toLowerCase();
  const links: AffiliateLink[] = [];

  const venueMatch = VENUE_MAPPINGS.find((v) =>
    v.patterns.some((p) => nameLower.includes(p)),
  );

  if (venueMatch) {
    for (const [partner, url] of Object.entries(venueMatch.affiliateUrls)) {
      links.push({
        url: appendSid(url, siteId, pageSlug),
        partner,
        label: `Book on ${PARTNER_LABELS[partner] || partner}`,
        trackingClass: "affiliate-page-link",
      });
    }
  }

  // Add generic search URLs not already covered
  const genericUrls = GENERIC_SEARCH_URLS[category] || {};
  for (const [partner, url] of Object.entries(genericUrls)) {
    if (!links.some((l) => l.partner === partner)) {
      links.push({
        url: appendSid(url, siteId, pageSlug),
        partner,
        label: `Browse on ${PARTNER_LABELS[partner] || partner}`,
        trackingClass: "affiliate-page-link",
      });
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Append SID tracking parameter for revenue attribution.
 * CJ SID format: siteId_pageSlug (max 100 chars)
 */
function appendSid(url: string, siteId: string, pageSlug: string): string {
  const sid = `${siteId}_${pageSlug}`.substring(0, 100);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}sid=${encodeURIComponent(sid)}`;
}
