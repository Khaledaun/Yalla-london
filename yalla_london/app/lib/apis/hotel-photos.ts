/**
 * Hotel Photos API via Travelpayouts / Hotellook
 *
 * Fetches REAL hotel property photos using the Travelpayouts Hotels Data API.
 * No extra API key needed — uses TRAVELPAYOUTS_API_TOKEN already configured.
 *
 * Photo CDN: photo.hotellook.com
 * Search API: engine.hotellook.com/api/v2/lookup.json
 *
 * Usage restriction: Photos can only be used on sites with an active
 * Travelpayouts hotel affiliate program (we have this).
 */

export interface HotelPhoto {
  hotelId: number;
  hotelName: string;
  url: string; // Full-size photo URL
  thumbnailUrl: string; // 400x300
  mediumUrl: string; // 800x600
  largeUrl: string; // 1200x800
}

export interface HotelLookupResult {
  id: number;
  name: string;
  fullName: string;
  city: string;
  country: string;
  stars: number;
  photoCount: number;
}

// In-memory cache — 24h TTL (hotel photos don't change often)
const photoCache = new Map<string, { data: HotelPhoto; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Look up a hotel by name and get its Hotellook ID
 */
export async function lookupHotel(hotelName: string, city: string = "London"): Promise<HotelLookupResult | null> {
  const query = `${hotelName} ${city}`;
  const url = `https://engine.hotellook.com/api/v2/lookup.json?query=${encodeURIComponent(query)}&lang=en&lookFor=hotel&limit=3`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results = data?.results?.hotels;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Pick the best match (first result from Hotellook)
    const hotel = results[0];
    return {
      id: hotel.id,
      name: hotel.label || hotel.fullName || hotelName,
      fullName: hotel.fullName || hotel.label || hotelName,
      city: hotel.locationName || city,
      country: hotel.countryName || "UK",
      stars: hotel.category || 5,
      photoCount: hotel.photoCount || 0,
    };
  } catch (err) {
    console.warn(`[hotel-photos] Lookup failed for "${hotelName}":`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Get a real photo of a specific hotel
 *
 * Returns CDN URLs at photo.hotellook.com in multiple sizes.
 * These are actual property photos, not stock images.
 */
export async function getHotelPhoto(hotelName: string, city: string = "London"): Promise<HotelPhoto | null> {
  // Check cache
  const cacheKey = `${hotelName}:${city}`.toLowerCase();
  const cached = photoCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const hotel = await lookupHotel(hotelName, city);
  if (!hotel || hotel.photoCount === 0) return null;

  const photo: HotelPhoto = {
    hotelId: hotel.id,
    hotelName: hotel.fullName,
    url: `https://photo.hotellook.com/image_v2/crop/h${hotel.id}/1200/800.auto`,
    thumbnailUrl: `https://photo.hotellook.com/image_v2/crop/h${hotel.id}/400/300.auto`,
    mediumUrl: `https://photo.hotellook.com/image_v2/crop/h${hotel.id}/800/600.auto`,
    largeUrl: `https://photo.hotellook.com/image_v2/crop/h${hotel.id}/1200/800.auto`,
  };

  // Cache it
  photoCache.set(cacheKey, { data: photo, ts: Date.now() });

  return photo;
}

/**
 * Get photos for multiple hotels in batch
 */
export async function getHotelPhotoBatch(
  hotels: Array<{ name: string; city?: string }>,
): Promise<Map<string, HotelPhoto>> {
  const results = new Map<string, HotelPhoto>();

  // Run lookups in parallel (max 5 concurrent to respect rate limits)
  const chunks: Array<Array<{ name: string; city?: string }>> = [];
  for (let i = 0; i < hotels.length; i += 5) {
    chunks.push(hotels.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (h) => {
      const photo = await getHotelPhoto(h.name, h.city || "London");
      if (photo) {
        results.set(h.name, photo);
      }
    });
    await Promise.all(promises);
  }

  return results;
}

/**
 * Known London hotel → Hotellook ID mapping (pre-resolved for speed)
 * These bypass the lookup API call entirely.
 */
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

/**
 * Get a hotel photo using pre-resolved ID (instant, no API call)
 * Falls back to lookup API if hotel not in the known list.
 */
export async function getKnownHotelPhoto(hotelName: string): Promise<HotelPhoto | null> {
  const knownId = LONDON_HOTEL_IDS[hotelName];
  if (knownId) {
    return {
      hotelId: knownId,
      hotelName,
      url: `https://photo.hotellook.com/image_v2/crop/h${knownId}/1200/800.auto`,
      thumbnailUrl: `https://photo.hotellook.com/image_v2/crop/h${knownId}/400/300.auto`,
      mediumUrl: `https://photo.hotellook.com/image_v2/crop/h${knownId}/800/600.auto`,
      largeUrl: `https://photo.hotellook.com/image_v2/crop/h${knownId}/1200/800.auto`,
    };
  }

  // Fallback: lookup by name
  return getHotelPhoto(hotelName, "London");
}
