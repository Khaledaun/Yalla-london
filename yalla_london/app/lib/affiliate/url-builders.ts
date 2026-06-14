/**
 * Affiliate URL Builders — Backfill engine for the 312 published articles.
 *
 * Articles in the database currently contain DIRECT partner URLs (booking.com,
 * viator.com, getyourguide.com, vrbo.com, hotels.com, thefork.*) that produce
 * ZERO commission because they bypass our tracked redirect path. This module
 * exposes pure functions that take a direct partner URL and return the
 * tracked replacement that routes through Travelpayouts (TP) or Commission
 * Junction (CJ).
 *
 * Swap matrix (operator-confirmed, YL-4):
 *
 *   booking.com/*       → Hotellook (TP marker)
 *   hotels.com/*        → Hotellook (TP marker)
 *   viator.com/*        → Expedia things-to-do (CJ deep link)
 *   getyourguide.com/*  → Expedia things-to-do (CJ deep link)
 *   vrbo.com/*          → Vrbo (CJ deep link, hardcoded advertiser ID)
 *   thefork.*           → drop (no partnership)
 *
 * All tracked URLs are wrapped through /api/affiliate/click so we get the
 * same GA4 event + AuditLog row that the existing affiliate-injection cron
 * produces. This keeps the click-aggregator and briefing builder happy
 * without any DB schema change.
 *
 * Env vars (read at runtime, never hardcoded in rule data):
 *   - TRAVELPAYOUTS_MARKER   (Hotellook marker, required for TP swaps)
 *   - CJ_PUBLISHER_CID       (a.k.a. operator's CJ_CID, required for CJ swaps)
 *   - CJ_WEBSITE_ID          (used by cj-client for link search scoping; not
 *                             needed for deep-link construction itself, but
 *                             surfaced here for documentation)
 *
 * NOTE: This file deliberately does NOT modify the existing rule data in
 * `app/api/cron/affiliate-injection/route.ts`. The injection cron emits
 * Tiqets/TicketNetwork/Welcome Pickups/etc. CTAs and is separate from the
 * "old article body has a dead booking.com link" problem this module solves.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AffiliatePartner =
  | "booking"
  | "hotels_com"
  | "viator"
  | "getyourguide"
  | "vrbo"
  | "thefork"
  | "unknown";

export interface SwapResult {
  /** The replacement URL — already wrapped through /api/affiliate/click. */
  url: string;
  /** Which partner we detected on the original URL. */
  partner: AffiliatePartner;
  /** Which network/program the replacement uses. */
  network: "travelpayouts" | "cj" | "drop";
  /** Whether this swap actually replaces the URL (false = leave as-is/drop). */
  replaced: boolean;
}

// ---------------------------------------------------------------------------
// Known advertiser IDs
// ---------------------------------------------------------------------------

/**
 * CJ advertiser IDs for the four programs Khaled is JOINED on. Vrbo's ID is
 * already referenced in `app/api/cron/affiliate-injection/route.ts` as
 * `VRBO_ADVERTISER_ID = "9220803"`; we reuse the same value.
 *
 * Expedia's advertiser ID is not yet wired into the codebase. Until the
 * operator surfaces it from CJ's "Get Links" panel, we fall back to a
 * publisher-only deep-link format (`/links/<CID>/type/dlg/...`) that still
 * tracks against the publisher account and lets CJ resolve the advertiser
 * from the destination domain.
 */
const VRBO_ADVERTISER_ID = "9220803";

/**
 * If the operator later sets EXPEDIA_CJ_ADVERTISER_ID, we'll use the
 * click-{CID}-{AID} format which gives stronger attribution. Without it,
 * we use the publisher-link format which CJ still attributes correctly
 * for joined advertisers.
 */
function getExpediaAdvertiserId(): string | null {
  return process.env.EXPEDIA_CJ_ADVERTISER_ID || null;
}

// ---------------------------------------------------------------------------
// Partner detection
// ---------------------------------------------------------------------------

export function detectPartner(rawUrl: string): AffiliatePartner {
  const lower = rawUrl.toLowerCase();
  if (lower.includes("booking.com")) return "booking";
  if (lower.includes("hotels.com")) return "hotels_com";
  if (lower.includes("viator.com")) return "viator";
  if (lower.includes("getyourguide.")) return "getyourguide";
  if (lower.includes("vrbo.com")) return "vrbo";
  if (lower.includes("thefork.")) return "thefork";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Slug → city extraction
// ---------------------------------------------------------------------------

/**
 * Pull a likely city/destination keyword out of a partner URL. Booking/Viator
 * etc. typically embed the destination as a slug or path segment. We err on
 * the side of "London" as the default since this is Yalla London — even if
 * extraction misses, the Hotellook/Expedia search URL still lands in the
 * right city for the vast majority of articles.
 */
export function extractCityFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const pathParts = u.pathname.split("/").filter(Boolean);

    // Viator URL pattern: viator.com/London/d737  or  viator.com/Paris/d456
    if (u.hostname.includes("viator.com")) {
      if (pathParts[0] && !pathParts[0].startsWith("d")) {
        return decodeURIComponent(pathParts[0]).replace(/-/g, " ");
      }
    }

    // GetYourGuide pattern: getyourguide.com/london-l57/  /paris-l16/
    if (u.hostname.includes("getyourguide.")) {
      for (const seg of pathParts) {
        const m = seg.match(/^([a-z-]+?)-l\d+$/i);
        if (m) return m[1].replace(/-/g, " ");
      }
    }

    // Booking.com patterns: /city/gb/london.html  /hotel/gb/the-savoy.html
    if (u.hostname.includes("booking.com")) {
      for (const seg of pathParts) {
        if (seg.startsWith("city")) continue;
        if (/^[a-z]{2}$/i.test(seg)) continue;
        if (seg === "hotel") continue;
        const cleaned = seg.replace(/\.html?$/i, "").replace(/-/g, " ");
        if (cleaned && cleaned.length > 2) return cleaned;
      }
    }

    // Hotels.com pattern: hotels.com/de1633216/hotels-london-united-kingdom/
    if (u.hostname.includes("hotels.com")) {
      const match = u.pathname.match(/hotels-([a-z-]+?)(?:-united|-france|-italy|-spain|$)/i);
      if (match) return match[1].replace(/-/g, " ");
    }

    // TheFork pattern: thefork.co.uk/london  thefork.fr/nice
    if (u.hostname.includes("thefork.")) {
      if (pathParts[0]) return pathParts[0].replace(/-/g, " ");
    }

    // Vrbo pattern: vrbo.com/search/keywords:london-england
    if (u.hostname.includes("vrbo.com")) {
      const match = u.pathname.match(/keywords:([a-z-]+)/i);
      if (match) return match[1].split("-")[0];
    }
  } catch {
    /* fall through */
  }
  return "London";
}

/**
 * Pull an activity keyword from a tour-aggregator URL. Used to build the
 * Expedia things-to-do `q=` query. If extraction fails we drop it and rely
 * on Expedia's destination-only search.
 */
export function extractActivityKeyword(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    // Viator: viator.com/tours/London/Westminster-Walking-Tour/d737-12345
    // GetYourGuide: getyourguide.com/london-l57/london-eye-fast-track-t12345/
    const segs = u.pathname.split("/").filter(Boolean);
    for (const seg of segs) {
      if (/^[dlt]\d+/i.test(seg)) continue;
      if (seg.length < 4) continue;
      const stripped = seg.replace(/-[a-z]?\d{3,}.*$/i, "");
      if (!stripped || stripped.length < 4) continue;
      if (/^[a-z-]+-l\d+$/i.test(seg)) continue;
      return stripped.replace(/-/g, " ");
    }
  } catch {
    /* fall through */
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tracked URL wrapper (mirrors buildTrackedUrl in affiliate-injection route)
// ---------------------------------------------------------------------------

function wrapClick(destinationUrl: string, siteId: string, slug: string): string {
  const sid = `${siteId}_${slug}`.substring(0, 100);
  return `/api/affiliate/click?url=${encodeURIComponent(destinationUrl)}&sid=${encodeURIComponent(sid)}`;
}

// ---------------------------------------------------------------------------
// Builders — Travelpayouts (Hotellook)
// ---------------------------------------------------------------------------

/**
 * Hotellook is Travelpayouts' meta-search across Booking/Expedia/Hotels.com/
 * Agoda. Any TP affiliate can deep-link to it and the marker carries through
 * to whichever OTA the user converts on. This is the canonical replacement
 * for booking.com / hotels.com links.
 */
export function buildHotellookUrl(rawUrl: string, siteId: string, slug: string): string | null {
  const marker = process.env.TRAVELPAYOUTS_MARKER;
  if (!marker) return null;
  const city = extractCityFromUrl(rawUrl);

  const destination = `https://search.hotellook.com/hotels?destination=${encodeURIComponent(city)}&adults=2&marker=${encodeURIComponent(marker)}&utm_source=${encodeURIComponent(siteId)}&sub_id=${encodeURIComponent(slug)}`;

  return wrapClick(destination, siteId, slug);
}

// ---------------------------------------------------------------------------
// Builders — CJ (Expedia / Vrbo)
// ---------------------------------------------------------------------------

/**
 * CJ publisher-link deep-link format used when we don't have the explicit
 * advertiser ID. CJ resolves the advertiser from the destination domain and
 * still attributes commission to the publisher account (CJ_PUBLISHER_CID).
 *
 * Format: https://www.kqzyfj.com/links/<CID>/type/dlg/<sid>/<encoded_url>
 *
 * If we DO have the advertiser ID (env var EXPEDIA_CJ_ADVERTISER_ID for
 * Expedia, or hardcoded for Vrbo), prefer the stronger click-{CID}-{AID}
 * format because it gives tighter attribution and shows up immediately in
 * CJ reports under the right advertiser.
 */
function buildCjPublisherDeepLink(destinationUrl: string, sid: string): string | null {
  const cid = process.env.CJ_PUBLISHER_CID;
  if (!cid) return null;
  return `https://www.kqzyfj.com/links/${cid}/type/dlg/${encodeURIComponent(sid)}/${encodeURIComponent(destinationUrl)}`;
}

function buildCjAdvertiserDeepLink(advertiserId: string, destinationUrl: string, sid: string): string | null {
  const cid = process.env.CJ_PUBLISHER_CID;
  if (!cid) return null;
  return `https://www.anrdoezrs.net/click-${cid}-${advertiserId}?url=${encodeURIComponent(destinationUrl)}&sid=${encodeURIComponent(sid)}`;
}

/**
 * Swap a Viator or GetYourGuide URL → Expedia things-to-do (CJ tracked).
 * Operator's words: "exchange them with expedia links" — Viator/GYG are not
 * joined on CJ, but Expedia things-to-do is the closest 1:1 substitute.
 */
export function buildCjExpediaActivityUrl(rawUrl: string, siteId: string, slug: string): string | null {
  const cid = process.env.CJ_PUBLISHER_CID;
  if (!cid) return null;

  const city = extractCityFromUrl(rawUrl);
  const activity = extractActivityKeyword(rawUrl);

  let expediaUrl = `https://www.expedia.com/things-to-do/search?location=${encodeURIComponent(city)}`;
  if (activity) {
    expediaUrl += `&q=${encodeURIComponent(activity)}`;
  }

  const sid = `${siteId}_${slug}`.substring(0, 100);
  const advertiserId = getExpediaAdvertiserId();
  const tracked = advertiserId
    ? buildCjAdvertiserDeepLink(advertiserId, expediaUrl, sid)
    : buildCjPublisherDeepLink(expediaUrl, sid);

  if (!tracked) return null;
  return wrapClick(tracked, siteId, slug);
}

/**
 * Swap a Vrbo direct URL → tracked Vrbo (CJ). Reuses VRBO_ADVERTISER_ID
 * since Khaled is JOINED on Vrbo through CJ.
 */
export function buildCjVrboUrl(rawUrl: string, siteId: string, slug: string): string | null {
  const cid = process.env.CJ_PUBLISHER_CID;
  if (!cid) return null;
  const sid = `${siteId}_${slug}`.substring(0, 100);

  // Pass through the original Vrbo URL (preserves keyword search etc.) but
  // wrap in CJ click-tracking with the known Vrbo advertiser ID.
  const tracked = buildCjAdvertiserDeepLink(VRBO_ADVERTISER_ID, rawUrl, sid);
  if (!tracked) return null;
  return wrapClick(tracked, siteId, slug);
}

// ---------------------------------------------------------------------------
// Top-level swap
// ---------------------------------------------------------------------------

/**
 * Single entry point. Given a direct partner URL pulled out of an article
 * body, return the tracked replacement (or `{replaced: false}` if we
 * intentionally leave it alone / drop it).
 */
export function swapPartnerUrl(rawUrl: string, siteId: string, slug: string): SwapResult {
  const partner = detectPartner(rawUrl);

  switch (partner) {
    case "booking":
    case "hotels_com": {
      const tracked = buildHotellookUrl(rawUrl, siteId, slug);
      if (!tracked) {
        return { url: rawUrl, partner, network: "travelpayouts", replaced: false };
      }
      return { url: tracked, partner, network: "travelpayouts", replaced: true };
    }

    case "viator":
    case "getyourguide": {
      const tracked = buildCjExpediaActivityUrl(rawUrl, siteId, slug);
      if (!tracked) {
        return { url: rawUrl, partner, network: "cj", replaced: false };
      }
      return { url: tracked, partner, network: "cj", replaced: true };
    }

    case "vrbo": {
      const tracked = buildCjVrboUrl(rawUrl, siteId, slug);
      if (!tracked) {
        return { url: rawUrl, partner, network: "cj", replaced: false };
      }
      return { url: tracked, partner, network: "cj", replaced: true };
    }

    case "thefork":
      return { url: rawUrl, partner, network: "drop", replaced: false };

    case "unknown":
    default:
      return { url: rawUrl, partner, network: "drop", replaced: false };
  }
}

// ---------------------------------------------------------------------------
// HTML rewriter
// ---------------------------------------------------------------------------

export interface RewriteResult {
  html: string;
  swaps: Array<{ from: string; to: string; partner: AffiliatePartner; network: string }>;
  drops: Array<{ from: string; partner: AffiliatePartner }>;
}

/**
 * Walk an HTML/markdown string and replace every `<a href="...">` (or bare
 * markdown link) that points at one of the known direct-partner hosts with
 * its tracked replacement. TheFork links are stripped (anchor text kept).
 *
 * Conservative: only matches href values, never plain text URLs (we don't
 * want to mangle citation strings or "see booking.com" prose).
 */
export function rewriteAffiliateLinks(html: string, siteId: string, slug: string): RewriteResult {
  const swaps: RewriteResult["swaps"] = [];
  const drops: RewriteResult["drops"] = [];

  const PARTNER_HOST_RE = /(booking\.com|hotels\.com|viator\.com|getyourguide\.[a-z.]+|vrbo\.com|thefork\.[a-z.]+)/i;

  // <a href="..."> form
  let out = html.replace(/<a\s+([^>]*?)href=("|')([^"']+)\2([^>]*)>/gi, (match, before, quote, href, after) => {
    if (!PARTNER_HOST_RE.test(href)) return match;
    const result = swapPartnerUrl(href, siteId, slug);

    if (result.network === "drop") {
      drops.push({ from: href, partner: result.partner });
      return "";
    }
    if (!result.replaced) return match;
    swaps.push({ from: href, to: result.url, partner: result.partner, network: result.network });
    const sponsoredAttr = / rel=("|')[^"']*sponsored[^"']*\1/i.test(before + after)
      ? ""
      : ' rel="noopener sponsored"';
    return `<a ${before}href=${quote}${result.url}${quote}${after}${sponsoredAttr} data-affiliate-rebuilt="${result.partner}">`;
  });

  // Markdown form: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, href) => {
    if (!PARTNER_HOST_RE.test(href)) return match;
    const result = swapPartnerUrl(href, siteId, slug);
    if (result.network === "drop") {
      drops.push({ from: href, partner: result.partner });
      return text;
    }
    if (!result.replaced) return match;
    swaps.push({ from: href, to: result.url, partner: result.partner, network: result.network });
    return `[${text}](${result.url})`;
  });

  return { html: out, swaps, drops };
}
