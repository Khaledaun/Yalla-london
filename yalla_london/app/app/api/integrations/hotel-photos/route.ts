import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/hotel-photos?hotels=The+Dorchester,The+Ritz+London
 *
 * Returns real hotel property photos from Hotellook CDN (via Travelpayouts).
 * Uses pre-resolved hotel IDs for London luxury hotels (no API call needed).
 * Falls back to Hotellook lookup API for unknown hotels.
 */

// Pre-resolved London hotel IDs — these are verified correct IDs from Hotellook
// Bypasses the lookup API entirely for instant response
const LONDON_HOTEL_IDS: Record<string, number> = {
  "The Dorchester": 30450,
  "The Ritz London": 30562,
  "Claridge's": 30176,
  "The Savoy": 30667,
  "The Langham, London": 30487,
  "Four Seasons Hotel London at Park Lane": 362498,
  "Corinthia London": 422756,
  "The Connaught": 30205,
  "Shangri-La The Shard, London": 707299,
  "Bulgari Hotel London": 514396,
};

function buildPhotoUrls(hotelId: number) {
  return {
    thumbnail: `https://photo.hotellook.com/image_v2/crop/h${hotelId}/400/300.auto`,
    medium: `https://photo.hotellook.com/image_v2/crop/h${hotelId}/800/600.auto`,
    large: `https://photo.hotellook.com/image_v2/crop/h${hotelId}/1200/800.auto`,
  };
}

export async function GET(request: NextRequest) {
  const hotelsParam = request.nextUrl.searchParams.get("hotels") || "";
  const hotelNames = hotelsParam
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  if (hotelNames.length === 0) {
    return NextResponse.json({ error: "Provide ?hotels=Name1,Name2" }, { status: 400 });
  }

  const results: Record<string, { hotelId: number; urls: ReturnType<typeof buildPhotoUrls> } | null> = {};

  for (const name of hotelNames) {
    // Try pre-resolved ID first (instant)
    const knownId = LONDON_HOTEL_IDS[name];
    if (knownId) {
      results[name] = { hotelId: knownId, urls: buildPhotoUrls(knownId) };
      continue;
    }

    // Fallback: lookup via Hotellook API
    try {
      const res = await fetch(
        `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(name + " London")}&lang=en&lookFor=hotel&limit=1`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json();
        const hotel = data?.results?.hotels?.[0];
        if (hotel?.id) {
          results[name] = { hotelId: hotel.id, urls: buildPhotoUrls(hotel.id) };
          continue;
        }
      }
    } catch {
      // Lookup failed — leave as null
    }

    results[name] = null;
  }

  return NextResponse.json({
    photos: results,
    source: "hotellook",
    cacheHint: "24h",
  });
}
