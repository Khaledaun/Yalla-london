/**
 * Affiliate Click Tracker — Public redirect endpoint
 * GET /api/affiliate/click?id=<linkId>
 * Tracks the click then 302 redirects to the CJ affiliate URL.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// UUID v4 or CUID format validation — prevents enumeration attacks
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^[a-z0-9]{20,30}$/i;
function isValidLinkId(id: string): boolean {
  return UUID_REGEX.test(id) || CUID_REGEX.test(id);
}

export async function GET(request: NextRequest) {
  const linkId = request.nextUrl.searchParams.get("id");
  const sid = request.nextUrl.searchParams.get("sid") || undefined;

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
