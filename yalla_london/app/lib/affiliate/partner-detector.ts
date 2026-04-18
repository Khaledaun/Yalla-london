/**
 * Partner Detector + Affiliate Marker Detector
 *
 * Shared utilities for:
 *   - Mapping a partner URL or hostname to a canonical partner name
 *   - Detecting whether a block of HTML already contains an affiliate link
 *
 * Both are used in multiple places: click endpoint, monitor.ts, injection cron,
 * coverage dashboard. Extracted here so they can never drift apart.
 */

/**
 * Map a partner URL or hostname to a canonical partner name.
 * Used by the click endpoint (for GA4 + AuditLog attribution) and by the
 * dashboard partner breakdown.
 */
export function detectPartner(url: string): string {
  if (!url) return "unknown";
  const lower = url.toLowerCase();
  if (lower.includes("booking.com")) return "booking.com";
  if (lower.includes("vrbo.com") || lower.includes("anrdoezrs.net")) return "vrbo";
  if (lower.includes("agoda.com")) return "agoda";
  if (lower.includes("halalbooking.com")) return "halalbooking";
  if (lower.includes("getyourguide.com")) return "getyourguide";
  if (lower.includes("viator.com")) return "viator";
  if (lower.includes("klook.com")) return "klook";
  if (lower.includes("hotels.com")) return "hotels.com";
  if (lower.includes("expedia.com")) return "expedia";
  if (lower.includes("tripadvisor.com")) return "tripadvisor";
  if (lower.includes("boatbookings.com")) return "boatbookings";
  if (lower.includes("welcomepickups.com")) return "welcome-pickups";
  if (lower.includes("tiqets.com")) return "tiqets";
  if (lower.includes("ticketnetwork.com")) return "ticketnetwork";
  if (lower.includes("stay22.com")) return "stay22";
  if (lower.includes("tp.media") || lower.includes("travelpayouts.com")) return "travelpayouts";
  return "cj-other";
}

/**
 * All known affiliate-link markers that the injection cron (`/api/cron/affiliate-injection`)
 * can emit into `BlogPost.content_en` or `content_ar`.
 *
 * Keep in sync with `app/api/cron/affiliate-injection/route.ts` — any new injection format
 * MUST add its marker here, or the coverage dashboard and the "needs injection" filter
 * will silently drift apart.
 */
export const AFFILIATE_MARKERS = [
  'rel="sponsored',
  'rel="noopener sponsored"',
  "affiliate-cta-block",
  "affiliate-recommendation",
  "affiliate-partners-section",
  "/api/affiliate/click",
  "data-affiliate-partner=",
  "data-affiliate-id",
  "data-affiliate=",
] as const;

/**
 * Returns true if the given HTML contains any affiliate-link marker.
 * Used by the coverage dashboard (articles WITH affiliates) and the injection
 * cron's "needs injection" filter (articles WITHOUT affiliates).
 */
export function hasAnyAffiliateMarker(html: string | null | undefined): boolean {
  if (!html) return false;
  for (const marker of AFFILIATE_MARKERS) {
    if (html.includes(marker)) return true;
  }
  return false;
}
