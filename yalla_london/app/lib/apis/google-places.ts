/**
 * Google Places API SDK — verified photos for hotels, attractions, restaurants,
 * and any named London location.
 *
 * Pricing (2026):
 *   - Find Place From Text: $0.017 per request
 *   - Place Photo: $0.007 per request
 *   - With 30d in-memory cache, typical cost ~$0.50/month for Yalla London
 *
 * Requires env var: GOOGLE_MAPS_API_KEY (Vercel → Project Settings → Env Vars)
 * Enable on the Google Cloud project: "Places API (New)" + "Places API" legacy
 *
 * Attribution: Google requires displaying html_attributions when a photo is
 * shown. The API response includes `attribution` string(s) — surface them in
 * the UI (small "Photo via Google" label + photographer credit).
 */

type PlacesPhoto = {
  urls: {
    thumbnail: string;
    medium: string;
    large: string;
  };
  attribution: string;
  width: number;
  height: number;
};

type FindPlaceResult = {
  placeId: string;
  photos: PlacesPhoto[];
  name: string;
  address?: string;
};

type CacheEntry = {
  result: FindPlaceResult | null;
  expiresAt: number;
};

const FIND_PLACE_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — photos rarely change
const cache = new Map<string, CacheEntry>();

function getApiKey(): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.warn("[google-places] GOOGLE_MAPS_API_KEY not set");
    return null;
  }
  return key;
}

function buildPhotoUrl(photoReference: string, maxWidth: number, apiKey: string): string {
  const params = new URLSearchParams({
    maxwidth: String(maxWidth),
    photo_reference: photoReference,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params}`;
}

/**
 * Find a place by text query and return its photos.
 * Caches results 30 days to minimise API cost.
 */
export async function findPlacePhotos(
  query: string,
  maxPhotos: number = 1,
): Promise<FindPlaceResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const cached = cache.get(query);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  try {
    const params = new URLSearchParams({
      input: query,
      inputtype: "textquery",
      fields: "place_id,name,formatted_address,photos",
      key: apiKey,
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`,
      { signal: AbortSignal.timeout(FIND_PLACE_TIMEOUT_MS) },
    );

    if (!res.ok) {
      console.warn(`[google-places] find-place ${res.status} for "${query}"`);
      cache.set(query, { result: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const data = await res.json();
    if (data.status !== "OK" || !data.candidates?.[0]) {
      // ZERO_RESULTS, OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST
      if (data.status !== "ZERO_RESULTS") {
        console.warn(`[google-places] ${data.status} for "${query}":`, data.error_message ?? "");
      }
      cache.set(query, { result: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const candidate = data.candidates[0];
    const photoRefs = (candidate.photos || []).slice(0, maxPhotos);

    const photos: PlacesPhoto[] = photoRefs.map((p: Record<string, unknown>) => {
      const ref = p.photo_reference as string;
      const attributions = (p.html_attributions as string[]) || [];
      const width = typeof p.width === "number" ? p.width : 0;
      const height = typeof p.height === "number" ? p.height : 0;
      return {
        urls: {
          thumbnail: buildPhotoUrl(ref, 400, apiKey),
          medium: buildPhotoUrl(ref, 800, apiKey),
          large: buildPhotoUrl(ref, 1600, apiKey),
        },
        attribution: attributions[0] ?? "",
        width,
        height,
      };
    });

    const result: FindPlaceResult = {
      placeId: candidate.place_id,
      name: candidate.name,
      address: candidate.formatted_address,
      photos,
    };
    cache.set(query, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.warn(`[google-places] exception for "${query}":`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Batch-fetch photos for multiple locations in parallel. Each location is
 * a `{ name, context }` — context is optional extra disambiguation text
 * (e.g., neighbourhood) that gets appended to the search query.
 */
export async function findPhotosForLocations(
  locations: Array<{ name: string; context?: string }>,
  maxPhotos: number = 1,
): Promise<Record<string, FindPlaceResult | null>> {
  const results: Record<string, FindPlaceResult | null> = {};
  await Promise.all(
    locations.map(async ({ name, context }) => {
      const query = context ? `${name} ${context}` : name;
      results[name] = await findPlacePhotos(query, maxPhotos);
    }),
  );
  return results;
}

export function isGooglePlacesConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}
