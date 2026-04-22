import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/hotel-photos?hotels=The+Dorchester,The+Ritz+London
 *
 * Returns verified property photos from Travelpayouts Hotellook CDN.
 *
 * How it works:
 *   1. engine.hotellook.com/api/v2/lookup.json — public endpoint, no auth.
 *      Resolves each hotel name to a canonical Hotellook hotelId and tells
 *      us how many photos are available (photoCount).
 *   2. photo.hotellook.com/image_v2/limit/h{id}_{n}/{w}/{h}.auto?marker={M}
 *      — CDN pattern. The ?marker= query param is REQUIRED for affiliate
 *      hotlinking; without it the CDN returns 403. We attach
 *      TRAVELPAYOUTS_MARKER.
 *
 * Caches resolutions for 24h (in-memory) to minimise lookup traffic and
 * stay within Travelpayouts rate limits.
 *
 * Falls back to null (client renders branded gradient placeholder) when
 * lookup fails or the hotel isn't in Hotellook's DB.
 */

const LOOKUP_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Pre-resolved IDs for London luxury hotels — saves a lookup call per load.
// Verified via engine.hotellook.com lookup; update if Hotellook renames a property.
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

type PhotoBundle = {
  hotelId: number;
  urls: { thumbnail: string; medium: string; large: string };
  photoIndex: number;
  expiresAt: number;
};

const cache = new Map<string, PhotoBundle>();

function buildPhotoUrls(hotelId: number, photoIndex: number, marker: string) {
  const markerQs = marker ? `?marker=${encodeURIComponent(marker)}` : "";
  return {
    thumbnail: `https://photo.hotellook.com/image_v2/limit/h${hotelId}_${photoIndex}/400/300.auto${markerQs}`,
    medium: `https://photo.hotellook.com/image_v2/limit/h${hotelId}_${photoIndex}/800/520.auto${markerQs}`,
    large: `https://photo.hotellook.com/image_v2/limit/h${hotelId}_${photoIndex}/1200/800.auto${markerQs}`,
  };
}

async function lookupHotelId(name: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(name + " London")}&lang=en&lookFor=hotel&limit=1`,
      { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hotel = data?.results?.hotels?.[0];
    const id = hotel?.id;
    return typeof id === "number" ? id : null;
  } catch (err) {
    console.warn(`[hotel-photos] lookup failed for "${name}":`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function resolveHotel(name: string, marker: string): Promise<PhotoBundle | null> {
  const cached = cache.get(name);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const hotelId = LONDON_HOTEL_IDS[name] ?? (await lookupHotelId(name));
  if (!hotelId) return null;

  const bundle: PhotoBundle = {
    hotelId,
    photoIndex: 1,
    urls: buildPhotoUrls(hotelId, 1, marker),
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  cache.set(name, bundle);
  return bundle;
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

  const marker = process.env.TRAVELPAYOUTS_MARKER ?? "";
  if (!marker) {
    console.warn("[hotel-photos] TRAVELPAYOUTS_MARKER not set — Hotellook CDN will return 403");
  }

  const results: Record<string, { hotelId: number; urls: PhotoBundle["urls"] } | null> = {};

  await Promise.all(
    hotelNames.map(async (name) => {
      try {
        const bundle = await resolveHotel(name, marker);
        results[name] = bundle ? { hotelId: bundle.hotelId, urls: bundle.urls } : null;
      } catch (err) {
        console.warn(`[hotel-photos] ${name}:`, err instanceof Error ? err.message : String(err));
        results[name] = null;
      }
    }),
  );

  return NextResponse.json({
    photos: results,
    source: "hotellook",
    cacheHint: "24h",
    markerAttached: marker.length > 0,
  });
}
