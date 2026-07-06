/**
 * Unsplash API Service — SDK-based, fully compliant
 *
 * Uses the official unsplash-js SDK with proper:
 * - Download tracking (Unsplash ToS requirement)
 * - Attribution generation (bilingual EN/AR)
 * - CDN hotlinking (never re-host images)
 * - Supabase caching (24h TTL, critical for 50 req/hr demo tier)
 *
 * Env vars: UNSPLASH_ACCESS_KEY, UNSPLASH_SECRET_KEY, UNSPLASH_APP_NAME
 */

import { createApi } from "unsplash-js";

// ── Types ──────────────────────────────────────────────────────

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
  blurHash: string | null;
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
  };
  downloadLocation: string; // Use this for download tracking
  links: {
    html: string;
    download: string;
    downloadLocation: string;
  };
}

export interface UnsplashAttribution {
  photographerName: string;
  photographerUrl: string;
  unsplashUrl: string;
  textEn: string;
  textAr: string;
  html: string;
}

export interface SearchOptions {
  page?: number;
  perPage?: number;
  orientation?: "landscape" | "portrait" | "squarish";
  color?: string;
}

// ── SDK Client ─────────────────────────────────────────────────

const APP_NAME = process.env.UNSPLASH_APP_NAME || "yalla_london";

function getClient() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("[unsplash] UNSPLASH_ACCESS_KEY not configured");
  }

  return createApi({
    accessKey,
    fetch: globalThis.fetch,
  });
}

// ── Cache Layer (Supabase via Prisma) ──────────────────────────

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const entry = await prisma.unsplashCache.findUnique({
      where: { cache_key: key },
    });
    if (!entry) return null;
    if (new Date(entry.expires_at) < new Date()) {
      // Expired — delete and return null
      prisma.unsplashCache
        .delete({ where: { cache_key: key } })
        .catch(() => {});
      return null;
    }
    return entry.response_data as T;
  } catch {
    // Cache table may not exist yet — graceful fallback
    return null;
  }
}

async function setCache(
  key: string,
  data: unknown,
  ttlHours = 24,
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await prisma.unsplashCache.upsert({
      where: { cache_key: key },
      update: { response_data: data as object, expires_at: expiresAt },
      create: {
        cache_key: key,
        response_data: data as object,
        expires_at: expiresAt,
      },
    });
  } catch {
    // Cache write failure is non-critical
  }
}

// ── Core Methods ───────────────────────────────────────────────

/**
 * Search for photos with caching
 */
export async function searchPhotos(
  query: string,
  options: SearchOptions = {},
): Promise<UnsplashPhoto[]> {
  const {
    page = 1,
    perPage = 10,
    orientation = "landscape",
    color,
  } = options;

  // Check cache first
  const cacheKey = `search:${query}:${page}:${perPage}:${orientation}:${color || ""}`;
  const cached = await getCached<UnsplashPhoto[]>(cacheKey);
  if (cached) return cached;

  try {
    const client = getClient();
    const result = await client.search.getPhotos({
      query,
      page,
      perPage,
      orientation,
      color: color as Parameters<typeof client.search.getPhotos>[0]["color"],
    });

    if (result.errors) {
      console.warn("[unsplash] Search errors:", result.errors);
      return [];
    }

    const photos = (result.response?.results || []).map(mapPhoto);

    // Cache for 24h
    await setCache(cacheKey, photos, 24);

    return photos;
  } catch (err) {
    console.warn(
      "[unsplash] Search failed:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

/**
 * Get a single photo by ID with caching
 */
export async function getPhoto(
  photoId: string,
): Promise<UnsplashPhoto | null> {
  const cacheKey = `photo:${photoId}`;
  const cached = await getCached<UnsplashPhoto>(cacheKey);
  if (cached) return cached;

  try {
    const client = getClient();
    const result = await client.photos.get({ photoId });

    if (result.errors) {
      console.warn("[unsplash] Get photo errors:", result.errors);
      return null;
    }

    if (!result.response) return null;

    const photo = mapPhoto(result.response);
    await setCache(cacheKey, photo, 24);
    return photo;
  } catch (err) {
    console.warn(
      "[unsplash] Get photo failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Get random photo(s) matching a query
 */
export async function getRandomPhoto(
  query: string,
  count = 1,
): Promise<UnsplashPhoto[]> {
  try {
    const client = getClient();
    const result = await client.photos.getRandom({
      query,
      count,
      contentFilter: "high",
    });

    if (result.errors) {
      console.warn("[unsplash] Random photo errors:", result.errors);
      return [];
    }

    const photos = Array.isArray(result.response)
      ? result.response
      : result.response
        ? [result.response]
        : [];

    return photos.map(mapPhoto);
  } catch (err) {
    console.warn(
      "[unsplash] Random photo failed:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

/**
 * Trigger download tracking — REQUIRED by Unsplash ToS when a user "uses" a photo.
 * Call this when a photo is meaningfully viewed (detail page, expanded, etc.)
 */
export async function triggerDownload(
  downloadLocation: string,
): Promise<void> {
  try {
    const client = getClient();
    await client.photos.trackDownload({
      downloadLocation,
    });
  } catch {
    // Non-critical — don't block UX on tracking failure
  }
}

/**
 * Build compliant attribution data (bilingual EN/AR)
 */
export function buildAttribution(photo: UnsplashPhoto): UnsplashAttribution {
  const photographerUrl = `${photo.photographer.profileUrl}?utm_source=${APP_NAME}&utm_medium=referral`;
  const unsplashUrl = `https://unsplash.com/?utm_source=${APP_NAME}&utm_medium=referral`;

  return {
    photographerName: photo.photographer.name,
    photographerUrl,
    unsplashUrl,
    textEn: `Photo by ${photo.photographer.name} on Unsplash`,
    textAr: `تصوير ${photo.photographer.name} على Unsplash`,
    html: `Photo by <a href="${photographerUrl}" target="_blank" rel="noopener">${photo.photographer.name}</a> on <a href="${unsplashUrl}" target="_blank" rel="noopener">Unsplash</a>`,
  };
}

/**
 * Build an optimized CDN URL with Unsplash's dynamic resizing params.
 * NEVER download and re-host — always hotlink from images.unsplash.com
 */
export function buildImageUrl(
  rawUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    fit?: "crop" | "clamp" | "fill" | "scale-down";
    format?: "webp" | "jpg";
  } = {},
): string {
  const {
    width = 1080,
    height,
    quality = 80,
    fit = "crop",
    format = "webp",
  } = options;
  const params = new URLSearchParams({
    w: String(width),
    q: String(quality),
    fm: format,
    fit,
    auto: "format",
  });
  if (height) params.set("h", String(height));
  // raw URL already has ? or not — handle both
  const separator = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${separator}${params}`;
}

// ── Internal Mapper ────────────────────────────────────────────

function mapPhoto(raw: any): UnsplashPhoto {
  return {
    id: raw.id || "",
    description: raw.description || null,
    altDescription: raw.alt_description || null,
    urls: {
      raw: raw.urls?.raw || "",
      full: raw.urls?.full || "",
      regular: raw.urls?.regular || "",
      small: raw.urls?.small || "",
      thumb: raw.urls?.thumb || "",
    },
    width: raw.width || 0,
    height: raw.height || 0,
    color: raw.color || "#000000",
    blurHash: raw.blur_hash || null,
    photographer: {
      name: raw.user?.name || "Unknown",
      username: raw.user?.username || "",
      profileUrl:
        raw.user?.links?.html ||
        `https://unsplash.com/@${raw.user?.username || ""}`,
    },
    downloadLocation: raw.links?.download_location || "",
    links: {
      html: raw.links?.html || "",
      download: raw.links?.download || "",
      downloadLocation: raw.links?.download_location || "",
    },
  };
}

// ── Re-export legacy-compatible functions ───────────────────────
// These maintain backward compatibility with lib/apis/unsplash.ts consumers
// (image-pipeline cron, media library, etc.)

export { SITE_IMAGE_QUERIES } from "@/lib/apis/unsplash";

/**
 * Legacy-compatible trackDownload (alias for triggerDownload)
 */
export const trackDownload = triggerDownload;
