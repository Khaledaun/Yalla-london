import { NextRequest, NextResponse } from "next/server";
import { getActiveSiteIds } from "@/config/sites";

export const maxDuration = 60;

const BUDGET_MS = 53_000;

/**
 * Image Pipeline Cron — two jobs:
 * 1. Fetch Unsplash images for published articles missing featured images
 * 2. Pre-stock the media library with per-site travel imagery for agents to use
 *    (articles, email designs, PDF covers, social media)
 *
 * Schedule: 3x/day at 2:20, 10:20, 18:20 UTC
 * Unsplash free tier: 50 req/hour — we use max ~15 per run (safe margin)
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({ success: true, skipped: "UNSPLASH_ACCESS_KEY not configured" });
  }

  const startTime = Date.now();
  let imagesAdded = 0;
  let articlesUpdated = 0;
  let libraryStocked = 0;
  let errors = 0;

  try {
    const { prisma } = await import("@/lib/db");
    const { searchPhotos, trackDownload, buildImageUrl, buildAttribution, SITE_IMAGE_QUERIES } = await import("@/lib/apis/unsplash");

    const activeSites = getActiveSiteIds();

    // ── Step 1: Fill missing article featured images ─────────────────
    for (const siteId of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;

      const articles = await prisma.blogPost.findMany({
        where: {
          siteId,
          published: true,
          OR: [
            { featured_image: null },
            { featured_image: "" },
          ],
        },
        select: { id: true, title_en: true, slug: true },
        take: 5,
        orderBy: { created_at: "desc" },
      });

      for (const article of articles) {
        if (Date.now() - startTime > BUDGET_MS) break;

        try {
          const query = article.title_en.replace(/[^\w\s]/g, "").substring(0, 50);
          const photos = await searchPhotos(query, { perPage: 3, orientation: "landscape" });
          if (photos.length === 0) continue;

          const photo = photos[0];
          const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, quality: 80, format: "webp" });
          const attribution = buildAttribution(photo);

          await prisma.blogPost.update({
            where: { id: article.id },
            data: { featured_image: imageUrl },
          });
          articlesUpdated++;

          // Save to MediaAsset for reuse
          await saveToLibrary(prisma, photo, imageUrl, attribution, query, siteId);
          imagesAdded++;

          if (photo.downloadUrl) {
            trackDownload(photo.downloadUrl).catch(() => {});
          }
        } catch (articleErr) {
          errors++;
          console.warn(`[image-pipeline] Failed for article ${article.slug}:`, articleErr instanceof Error ? articleErr.message : String(articleErr));
        }
      }
    }

    // ── Step 2: Pre-stock library with per-site travel imagery ────────
    // Pick 1 random query per site per run (stays within rate limits)
    for (const siteId of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;

      const queries = SITE_IMAGE_QUERIES[siteId];
      if (!queries || queries.length === 0) continue;

      // Pick a random query we haven't stocked recently
      const randomQuery = queries[Math.floor(Math.random() * queries.length)];

      try {
        // Check how many we already have for this query
        const existingCount = await prisma.mediaAsset.count({
          where: {
            tags: { hasEvery: ["unsplash", siteId] },
            original_name: { contains: randomQuery.split(" ")[0], mode: "insensitive" },
          },
        });

        // If we already have 20+ photos matching this query theme, skip
        if (existingCount >= 20) continue;

        const photos = await searchPhotos(randomQuery, { perPage: 5, orientation: "landscape" });

        for (const photo of photos) {
          if (Date.now() - startTime > BUDGET_MS) break;

          try {
            const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, quality: 85, format: "webp" });
            const attribution = buildAttribution(photo);

            const saved = await saveToLibrary(prisma, photo, imageUrl, attribution, randomQuery, siteId);
            if (saved) {
              libraryStocked++;
              if (photo.downloadUrl) {
                trackDownload(photo.downloadUrl).catch(() => {});
              }
            }
          } catch (stockErr) {
            console.warn("[image-pipeline] Library stock failed:", stockErr instanceof Error ? stockErr.message : String(stockErr));
          }
        }
      } catch (queryErr) {
        errors++;
        console.warn(`[image-pipeline] Query "${randomQuery}" failed for ${siteId}:`, queryErr instanceof Error ? queryErr.message : String(queryErr));
      }
    }
  } catch (err) {
    console.error("[image-pipeline] Cron failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    success: true,
    articlesUpdated,
    imagesAdded,
    libraryStocked,
    errors,
    durationMs: Date.now() - startTime,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

// ── Helper: save Unsplash photo to MediaAsset (dedup by unsplash:{id} tag) ──

interface UnsplashPhotoLike {
  id: string;
  description: string | null;
  altDescription: string | null;
  width: number;
  height: number;
  photographer: { name: string; username: string };
}

async function saveToLibrary(
  prisma: { mediaAsset: { findFirst: Function; create: Function } } & Record<string, unknown>,
  photo: UnsplashPhotoLike,
  imageUrl: string,
  attribution: string,
  searchQuery: string,
  siteId: string,
): Promise<boolean> {
  try {
    const existing = await prisma.mediaAsset.findFirst({
      where: { tags: { has: `unsplash:${photo.id}` } },
    });
    if (existing) return false;

    await prisma.mediaAsset.create({
      data: {
        filename: `unsplash-${photo.id}.webp`,
        original_name: photo.description || photo.altDescription || searchQuery,
        cloud_storage_path: `unsplash/${photo.id}`,
        url: imageUrl,
        file_type: "image",
        mime_type: "image/webp",
        file_size: 0,
        width: photo.width,
        height: photo.height,
        alt_text: photo.altDescription || photo.description || searchQuery,
        title: photo.description || searchQuery,
        description: attribution,
        tags: [
          `unsplash:${photo.id}`,
          "unsplash",
          "stock-photo",
          "travel",
          `photographer:${photo.photographer.username}`,
          siteId,
        ],
        folder: "unsplash",
        category: "stock-photo",
        site_id: siteId,
        license_info: `Unsplash License — ${attribution}`,
      },
    });
    return true;
  } catch (err) {
    console.warn("[image-pipeline] saveToLibrary failed:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
