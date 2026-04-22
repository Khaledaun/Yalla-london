import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/hotel-photos?hotels=The+Dorchester,The+Ritz+London
 *
 * HISTORY: this endpoint has gone through three sources:
 *   1. photo.hotellook.com CDN URLs — returned 403 in production (blocks
 *      non-affiliate hotlinking)
 *   2. Unsplash search by hotel name — returned random "luxury hotel" photos
 *      that were either (a) generic and misleading, or (b) actually photos of
 *      OTHER real hotels (e.g., Claridge's facade appearing under Dorchester).
 *      Showing the wrong hotel's photo is worse than no photo.
 *
 * CURRENT: returns null for every hotel. The /hotels page renders a branded
 * gradient placeholder (hotel name + location) when no real photo exists.
 * This is honest and removes all wrong-hotel risk.
 *
 * FUTURE (requires env var): wire up Google Places Photos API
 * (GOOGLE_MAPS_API_KEY) or Travelpayouts Hotellook affiliate auth to fetch
 * verified property photos per hotel.
 */

export async function GET(request: NextRequest) {
  const hotelsParam = request.nextUrl.searchParams.get("hotels") || "";
  const hotelNames = hotelsParam
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  if (hotelNames.length === 0) {
    return NextResponse.json({ error: "Provide ?hotels=Name1,Name2" }, { status: 400 });
  }

  const results: Record<string, null> = {};
  for (const name of hotelNames) {
    results[name] = null;
  }

  return NextResponse.json({
    photos: results,
    source: "none",
    note: "Verified property photos not yet wired. Add GOOGLE_MAPS_API_KEY to enable Google Places Photos.",
  });
}
