/**
 * Affiliate Click Tracker — Public redirect endpoint
 * GET /api/affiliate/click?id=<linkId>&sid=<siteId_slug>&ga_cid=<ga4ClientId>
 * Tracks the click (DB + GA4 Measurement Protocol) then 302 redirects to the CJ affiliate URL.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// UUID v4, CUID, or CJ link ID format validation — prevents enumeration attacks
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^[a-z0-9]{20,30}$/i;
const CJ_LINK_REGEX = /^cj-link-\d+$/;
function isValidLinkId(id: string): boolean {
  return UUID_REGEX.test(id) || CUID_REGEX.test(id) || CJ_LINK_REGEX.test(id);
}

export async function GET(request: NextRequest) {
  const linkId = request.nextUrl.searchParams.get("id");
  const sid = request.nextUrl.searchParams.get("sid") || undefined;
  const gaClientId = request.nextUrl.searchParams.get("ga_cid") || undefined;

  if (!linkId || !isValidLinkId(linkId)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  try {
    const { trackClick } = await import("@/lib/affiliate/link-tracker");

    const affiliateUrl = await trackClick({
      linkId,
      pageUrl: request.headers.get("referer") || "",
      userAgent: request.headers.get("user-agent") || undefined,
      sessionId: request.cookies.get("session-id")?.value || undefined,
      country: request.headers.get("x-vercel-ip-country") || undefined,
      sid,
    });

    // Fire GA4 Measurement Protocol event (fire-and-forget — never blocks redirect)
    fireGA4ClickEvent({
      linkId,
      sid,
      gaClientId,
      pageUrl: request.headers.get("referer") || "",
      affiliateUrl: affiliateUrl || "",
      userAgent: request.headers.get("user-agent") || undefined,
      country: request.headers.get("x-vercel-ip-country") || undefined,
    }).catch(() => {}); // Swallow — GA4 failure must never block user redirect

    if (affiliateUrl) {
      // 302 redirect to the CJ affiliate URL (not 301 — affiliate URLs may change)
      return NextResponse.redirect(affiliateUrl, 302);
    }

    // Link not found — redirect to homepage
    return NextResponse.redirect(new URL("/", request.url), 302);
  } catch (err) {
    console.warn("[affiliate-click] Track failed:", err instanceof Error ? err.message : String(err));
    // Still try to redirect even if tracking fails
    try {
      const { prisma } = await import("@/lib/db");
      const link = await prisma.cjLink.findUnique({
        where: { id: linkId },
        select: { affiliateUrl: true },
      });
      if (link?.affiliateUrl) {
        return NextResponse.redirect(link.affiliateUrl, 302);
      }
    } catch {
      // Fall through to homepage
    }
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
}

// ---------------------------------------------------------------------------
// GA4 Measurement Protocol — fire-and-forget
// ---------------------------------------------------------------------------

async function fireGA4ClickEvent(opts: {
  linkId: string;
  sid?: string;
  gaClientId?: string;
  pageUrl: string;
  affiliateUrl: string;
  userAgent?: string;
  country?: string;
}): Promise<void> {
  try {
    const { fireAffiliateClickEvent } = await import(
      "@/lib/analytics/ga4-measurement-protocol"
    );

    // Parse SID (format: siteId_articleSlug)
    const siteId = opts.sid?.includes("_") ? opts.sid.split("_")[0] : undefined;
    const articleSlug = opts.sid?.includes("_")
      ? opts.sid.split("_").slice(1).join("_")
      : undefined;

    // Detect partner from affiliate URL
    const partner = detectPartner(opts.affiliateUrl);

    // Detect device category
    const device = opts.userAgent
      ? /mobile|iphone|android.*mobile/i.test(opts.userAgent)
        ? "mobile"
        : /ipad|tablet/i.test(opts.userAgent)
          ? "tablet"
          : "desktop"
      : undefined;

    await fireAffiliateClickEvent({
      partner,
      linkId: opts.linkId,
      pageUrl: opts.pageUrl,
      affiliateUrl: opts.affiliateUrl,
      siteId,
      articleSlug,
      device,
      country: opts.country,
      clientId: opts.gaClientId, // Use GA4 client ID from cookie if available
    });
  } catch (err) {
    console.warn("[affiliate-click] GA4 MP failed:", err instanceof Error ? err.message : String(err));
  }
}

function detectPartner(url: string): string {
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
  return "cj-other";
}
