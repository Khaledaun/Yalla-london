import { NextRequest, NextResponse } from "next/server";
import { findPhotosForLocations, isGooglePlacesConfigured } from "@/lib/apis/google-places";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/hotel-photos?hotels=The+Dorchester,The+Ritz+London
 *
 * Wrapper over /api/integrations/location-photos that adds the context string
 * "London luxury hotel" to each name so Google Places returns the correct
 * property (not a same-named restaurant or different city).
 *
 * Kept for backward compat with /hotels page. New pages should call
 * /api/integrations/location-photos directly with their own context.
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

  if (!isGooglePlacesConfigured()) {
    const nullPhotos: Record<string, null> = {};
    for (const name of hotelNames) nullPhotos[name] = null;
    return NextResponse.json({
      photos: nullPhotos,
      source: "none",
      note: "GOOGLE_MAPS_API_KEY not set. Add it to Vercel env vars to enable verified photos.",
    });
  }

  const locations = hotelNames.map((name) => ({ name, context: "London luxury hotel" }));
  const raw = await findPhotosForLocations(locations, 1);

  // Shape response with legacy `urls` key structure to avoid breaking the hotels
  // page client code which reads `photos[name].urls.medium`.
  const photos: Record<
    string,
    { placeId: string; urls: { thumbnail: string; medium: string; large: string }; attribution: string } | null
  > = {};
  for (const name of hotelNames) {
    const result = raw[name];
    const first = result?.photos?.[0];
    photos[name] = result && first
      ? { placeId: result.placeId, urls: first.urls, attribution: first.attribution }
      : null;
  }

  return NextResponse.json({
    photos,
    source: "google-places",
    cacheHint: "30d",
  });
}
