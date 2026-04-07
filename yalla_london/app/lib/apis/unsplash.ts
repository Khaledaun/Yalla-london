/**
 * Unsplash API — Legal, high-quality travel photography
 * Auth: API Key (free, 50 requests/hour)
 * https://api.unsplash.com
 *
 * All images are free to use under the Unsplash License.
 * Attribution required: photographer name + link back to Unsplash.
 */

export interface UnsplashPhoto {
  id: string;
  description: string | null;
  altDescription: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string; // 1080px wide
    small: string; // 400px wide
    thumb: string; // 200px wide
  };
  width: number;
  height: number;
  color: string; // dominant color hex
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
  };
  downloadUrl: string; // Use this to trigger download tracking per Unsplash ToS
}

// Per-site search query templates for relevant imagery
// Per-site search queries with categories for organized media libraries
export const SITE_IMAGE_QUERIES: Record<string, Array<{ query: string; category: string; folder: string }>> = {
  "yalla-london": [
    { query: "luxury london hotel lobby", category: "hero", folder: "london/hotels" },
    { query: "london skyline thames", category: "hero", folder: "london/landmarks" },
    { query: "mayfair london street", category: "gallery", folder: "london/neighbourhoods" },
    { query: "london landmark big ben", category: "gallery", folder: "london/landmarks" },
    { query: "halal restaurant london", category: "gallery", folder: "london/restaurants" },
    { query: "london luxury shopping harrods", category: "gallery", folder: "london/shopping" },
    { query: "london west end theatre", category: "gallery", folder: "london/entertainment" },
    { query: "hyde park london", category: "gallery", folder: "london/parks" },
    { query: "afternoon tea london", category: "gallery", folder: "london/dining" },
  ],
  "zenitha-yachts-med": [
    { query: "luxury yacht mediterranean aerial", category: "hero", folder: "yachts/hero" },
    { query: "catamaran turquoise water", category: "hero", folder: "yachts/fleet" },
    { query: "sailing yacht sunset ocean", category: "hero", folder: "yachts/lifestyle" },
    { query: "greek islands santorini sea", category: "gallery", folder: "destinations/greek-islands" },
    { query: "dubrovnik croatia coast", category: "gallery", folder: "destinations/croatia" },
    { query: "bodrum turkey marina", category: "gallery", folder: "destinations/turkey" },
    { query: "french riviera monaco yacht", category: "gallery", folder: "destinations/french-riviera" },
    { query: "dubai marina yacht", category: "gallery", folder: "destinations/arabian-gulf" },
    { query: "yacht deck dining sunset", category: "gallery", folder: "yachts/onboard" },
    { query: "snorkeling crystal clear water", category: "gallery", folder: "yachts/activities" },
    { query: "gulet traditional wooden boat", category: "gallery", folder: "yachts/fleet" },
    { query: "amalfi coast italy sea", category: "gallery", folder: "destinations/amalfi" },
  ],
  "arabaldives": [
    { query: "maldives resort overwater villa", category: "hero", folder: "maldives/resorts" },
    { query: "maldives beach tropical", category: "gallery", folder: "maldives/beaches" },
    { query: "underwater coral reef maldives", category: "gallery", folder: "maldives/diving" },
    { query: "maldives sunset ocean", category: "hero", folder: "maldives/sunsets" },
  ],
  "french-riviera": [
    { query: "french riviera yacht saint tropez", category: "hero", folder: "riviera/yachts" },
    { query: "cannes luxury promenade", category: "gallery", folder: "riviera/cities" },
    { query: "nice france coast", category: "gallery", folder: "riviera/coast" },
    { query: "monaco harbor luxury", category: "hero", folder: "riviera/monaco" },
  ],
  "istanbul": [
    { query: "istanbul bosphorus mosque", category: "hero", folder: "istanbul/landmarks" },
    { query: "grand bazaar istanbul", category: "gallery", folder: "istanbul/culture" },
    { query: "istanbul luxury hotel", category: "gallery", folder: "istanbul/hotels" },
    { query: "turkish cuisine fine dining", category: "gallery", folder: "istanbul/dining" },
  ],
  "thailand": [
    { query: "phuket beach thailand", category: "hero", folder: "thailand/beaches" },
    { query: "koh samui luxury resort", category: "gallery", folder: "thailand/resorts" },
    { query: "thai spa wellness luxury", category: "gallery", folder: "thailand/wellness" },
    { query: "bangkok temple gold", category: "gallery", folder: "thailand/culture" },
  ],
};

/** Flat query list for backward compatibility */
export function getSiteQueries(siteId: string): string[] {
  const queries = SITE_IMAGE_QUERIES[siteId];
  if (!queries) return [];
  return queries.map(q => q.query);
}

/**
 * Search Unsplash for photos matching a query.
 * Respects rate limits (50 req/hour on free tier).
 */
export async function searchPhotos(
  query: string,
  options: { perPage?: number; orientation?: "landscape" | "portrait" | "squarish" } = {}
): Promise<UnsplashPhoto[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("[unsplash] UNSPLASH_ACCESS_KEY not configured");
    return [];
  }

  const { perPage = 5, orientation = "landscape" } = options;

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation,
      content_filter: "high", // safe content only
    });

    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params}`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      if (res.status === 403) console.warn("[unsplash] Rate limit exceeded");
      throw new Error(`Unsplash API ${res.status}`);
    }

    const data = await res.json();
    return (data.results || []).map(mapPhoto);
  } catch (err) {
    console.warn("[unsplash] Search failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Get a single random photo for a topic (uses less API quota than search)
 */
export async function getRandomPhoto(
  query: string,
  orientation: "landscape" | "portrait" = "landscape"
): Promise<UnsplashPhoto | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const params = new URLSearchParams({
      query,
      orientation,
      content_filter: "high",
    });

    const res = await fetch(
      `https://api.unsplash.com/photos/random?${params}`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) throw new Error(`Unsplash API ${res.status}`);
    const data = await res.json();
    return mapPhoto(data);
  } catch (err) {
    console.warn("[unsplash] Random photo failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Track download — REQUIRED by Unsplash ToS when using an image
 */
export async function trackDownload(downloadUrl: string): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return;

  try {
    await fetch(downloadUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Non-critical — don't block on tracking failure
  }
}

/**
 * Build an optimized image URL with Unsplash's CDN parameters
 */
export function buildImageUrl(
  rawUrl: string,
  options: { width?: number; height?: number; quality?: number; format?: "webp" | "jpg" } = {}
): string {
  const { width = 800, quality = 80, format = "webp" } = options;
  const params = new URLSearchParams({
    w: String(width),
    q: String(quality),
    fm: format,
    fit: "crop",
    auto: "format",
  });
  if (options.height) params.set("h", String(options.height));
  return `${rawUrl}&${params}`;
}

/**
 * Build attribution HTML — REQUIRED by Unsplash License
 */
export function buildAttribution(photo: UnsplashPhoto): string {
  return `Photo by <a href="${photo.photographer.profileUrl}?utm_source=zenitha_luxury&utm_medium=referral" target="_blank" rel="noopener">${photo.photographer.name}</a> on <a href="https://unsplash.com/?utm_source=zenitha_luxury&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>`;
}

// Internal mapper
function mapPhoto(raw: Record<string, unknown>): UnsplashPhoto {
  const urls = raw.urls as Record<string, string>;
  const user = raw.user as Record<string, unknown>;
  const links = user?.links as Record<string, string> | undefined;
  return {
    id: raw.id as string,
    description: (raw.description as string) || null,
    altDescription: (raw.alt_description as string) || null,
    urls: {
      raw: urls?.raw || "",
      full: urls?.full || "",
      regular: urls?.regular || "",
      small: urls?.small || "",
      thumb: urls?.thumb || "",
    },
    width: (raw.width as number) || 0,
    height: (raw.height as number) || 0,
    color: (raw.color as string) || "#000000",
    photographer: {
      name: (user?.name as string) || "Unknown",
      username: (user?.username as string) || "",
      profileUrl: links?.html || `https://unsplash.com/@${user?.username || ""}`,
    },
    downloadUrl: (raw.links as Record<string, string>)?.download_location || "",
  };
}
