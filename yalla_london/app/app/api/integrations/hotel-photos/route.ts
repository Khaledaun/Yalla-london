import { NextRequest, NextResponse } from "next/server";
import { searchPhotos, trackDownload, buildImageUrl } from "@/lib/apis/unsplash";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/hotel-photos?hotels=The+Dorchester,The+Ritz+London
 *
 * Returns hotel photos from Unsplash matched to each hotel name.
 * Uses 24h in-memory cache to stay within Unsplash's 50 req/hr free tier.
 *
 * Previously used Hotellook CDN URLs (photo.hotellook.com/image_v2/...),
 * but those 403'd in production — the CDN appears to block non-affiliate
 * hotlinking. Chrome Audit flagged broken hotel images on /hotels.
 *
 * Response shape unchanged for backward compat — client reads
 * `photos[name].urls.medium` and falls back to its static `hotel.image`
 * if null.
 */

type CachedPhoto = {
  urls: { thumbnail: string; medium: string; large: string };
  attribution: { name: string; profileUrl: string };
  expiresAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const photoCache = new Map<string, CachedPhoto>();

async function fetchHotelPhoto(
  hotelName: string
): Promise<CachedPhoto | null> {
  const cached = photoCache.get(hotelName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const query = `${hotelName} london luxury hotel`;
  const photos = await searchPhotos(query, { perPage: 1, orientation: "landscape" });
  const photo = photos[0];
  if (!photo) return null;

  // Unsplash ToS — fire-and-forget download tracking
  trackDownload(photo.downloadUrl).catch((err) =>
    console.warn("[hotel-photos] trackDownload failed:", err instanceof Error ? err.message : String(err))
  );

  const entry: CachedPhoto = {
    urls: {
      thumbnail: buildImageUrl(photo.urls.raw, { width: 400, quality: 80 }),
      medium: buildImageUrl(photo.urls.raw, { width: 800, quality: 80 }),
      large: buildImageUrl(photo.urls.raw, { width: 1200, quality: 85 }),
    },
    attribution: {
      name: photo.photographer.name,
      profileUrl: photo.photographer.profileUrl,
    },
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  photoCache.set(hotelName, entry);
  return entry;
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

  const results: Record<string, { urls: CachedPhoto["urls"]; attribution: CachedPhoto["attribution"] } | null> = {};

  // Parallel fetch with per-hotel graceful fallback
  await Promise.all(
    hotelNames.map(async (name) => {
      try {
        const entry = await fetchHotelPhoto(name);
        results[name] = entry
          ? { urls: entry.urls, attribution: entry.attribution }
          : null;
      } catch (err) {
        console.warn(`[hotel-photos] ${name}:`, err instanceof Error ? err.message : String(err));
        results[name] = null;
      }
    })
  );

  return NextResponse.json({
    photos: results,
    source: "unsplash",
    cacheHint: "24h",
  });
}
