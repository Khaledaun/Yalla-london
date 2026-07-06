/**
 * Auto Photo Provider for Remotion Compositions
 *
 * Pulls photos from MediaAsset DB and Unsplash based on content context.
 * Used by PhotoFeature, ContentPost, and VideoWithBranding compositions.
 *
 * GET /api/admin/video-photos
 *   ?siteId=yalla-london
 *   ?topic=halal+restaurants+mayfair   — keyword search
 *   ?category=destination|food|hotel|experience|event
 *   ?count=5                           — number of photos to return
 *
 * Returns array of { url, alt, width, height, source, photographer? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const dynamic = "force-dynamic";

// Unsplash site-aware search queries for auto-selection
const SITE_PHOTO_CONTEXTS: Record<string, string[]> = {
  "yalla-london": ["luxury london", "london skyline", "london restaurant", "london hotel", "british afternoon tea", "london landmark"],
  "zenitha-yachts-med": ["luxury yacht", "mediterranean sea", "sailing", "yacht charter", "marina", "aegean coast"],
  "zenitha-luxury": ["luxury travel", "premium hotel suite", "fine dining", "luxury spa", "private jet", "concierge"],
  "arabaldives": ["maldives resort", "overwater villa", "maldives beach", "tropical luxury", "coral reef"],
  "french-riviera": ["cote d'azur", "french riviera yacht", "cannes luxury", "monaco", "nice beach"],
  "istanbul": ["istanbul bosphorus", "hagia sophia", "turkish cuisine", "istanbul luxury hotel", "grand bazaar"],
  "thailand": ["thai beach", "bangkok temple", "phuket resort", "thai food", "koh samui"],
};

const CATEGORY_QUERIES: Record<string, string> = {
  destination: "travel landmark scenic",
  food: "restaurant cuisine dining",
  hotel: "luxury hotel suite",
  experience: "luxury experience activity",
  event: "gala event celebration",
  nightlife: "cocktail bar nightlife",
  shopping: "luxury shopping boutique",
  spa: "spa wellness luxury",
};

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get("siteId") || getDefaultSiteId();
  const topic = searchParams.get("topic") || "";
  const category = searchParams.get("category") || "";
  const count = Math.min(parseInt(searchParams.get("count") || "5"), 20);

  try {
    const { prisma } = await import("@/lib/db");

    // Step 1: Search MediaAsset DB (our library — Unsplash + uploaded)
    const searchTerms = topic.split(/\s+/).filter(Boolean);
    const dbPhotos = await prisma.mediaAsset.findMany({
      where: {
        file_type: "image",
        site_id: { in: [siteId, null] },
        ...(searchTerms.length > 0 ? {
          OR: searchTerms.map(term => ({
            OR: [
              { alt_text: { contains: term, mode: "insensitive" as const } },
              { original_name: { contains: term, mode: "insensitive" as const } },
              { tags: { hasSome: [term.toLowerCase()] } },
            ],
          })),
        } : {}),
      },
      select: {
        id: true,
        url: true,
        alt_text: true,
        width: true,
        height: true,
        original_name: true,
        tags: true,
      },
      orderBy: { created_at: "desc" },
      take: count * 2, // fetch extra for filtering
    });

    // Format DB results
    const libraryPhotos = dbPhotos
      .filter(p => p.url && !p.url.startsWith("data:")) // skip base64 — too large for video
      .slice(0, count)
      .map(p => ({
        url: p.url,
        alt: p.alt_text || p.original_name || "Photo",
        width: p.width || 1080,
        height: p.height || 720,
        source: "library" as const,
        id: p.id,
      }));

    // Step 2: If not enough from library, suggest Unsplash queries
    const siteContexts = SITE_PHOTO_CONTEXTS[siteId] || SITE_PHOTO_CONTEXTS["yalla-london"];
    const categoryQuery = category ? CATEGORY_QUERIES[category] || category : "";
    const suggestedQueries = [
      topic,
      `${topic} ${categoryQuery}`.trim(),
      ...siteContexts.slice(0, 3),
    ].filter(Boolean);

    // Step 3: Try Unsplash API if we need more photos
    let unsplashPhotos: Array<{ url: string; alt: string; width: number; height: number; source: "unsplash"; photographer?: string }> = [];
    const needed = count - libraryPhotos.length;

    if (needed > 0 && process.env.UNSPLASH_ACCESS_KEY) {
      try {
        const query = topic || siteContexts[Math.floor(Math.random() * siteContexts.length)];
        const unsplashRes = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${needed}&orientation=landscape`,
          {
            headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (unsplashRes.ok) {
          const data = await unsplashRes.json();
          unsplashPhotos = (data.results || []).map((p: Record<string, unknown>) => ({
            url: `${(p.urls as Record<string, string>)?.regular || ""}`,
            alt: (p.alt_description as string) || (p.description as string) || "Unsplash photo",
            width: (p.width as number) || 1080,
            height: (p.height as number) || 720,
            source: "unsplash" as const,
            photographer: ((p.user as Record<string, unknown>)?.name as string) || undefined,
          }));
        }
      } catch (err) {
        console.warn("[video-photos] Unsplash search failed:", err instanceof Error ? err.message : String(err));
      }
    }

    const allPhotos = [...libraryPhotos, ...unsplashPhotos].slice(0, count);

    return NextResponse.json({
      photos: allPhotos,
      totalFromLibrary: libraryPhotos.length,
      totalFromUnsplash: unsplashPhotos.length,
      suggestedQueries,
      siteId,
    });
  } catch (err) {
    console.error("[video-photos] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Photo search failed" },
      { status: 500 }
    );
  }
}
