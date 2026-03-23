import { NextRequest, NextResponse } from "next/server";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const maxDuration = 60;

const BUDGET_MS = 53_000;

/**
 * Image Pipeline Cron — fetches Unsplash images for published articles missing featured images.
 * Also saves photos to MediaAsset table for reuse across the platform.
 * Schedule: Every 4 hours (respects Unsplash 50 req/hour limit)
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
  let errors = 0;

  try {
    const { prisma } = await import("@/lib/db");
    const { searchPhotos, trackDownload, buildImageUrl, buildAttribution } = await import("@/lib/apis/unsplash");

    const activeSites = getActiveSiteIds();

    for (const siteId of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;

      // Find published articles without featured images (max 5 per run to respect rate limits)
      const articles = await prisma.blogPost.findMany({
        where: {
          siteId,
          published: true,
          OR: [
            { featured_image: null },
            { featured_image: "" },
          ],
        },
        select: {
          id: true,
          title_en: true,
          slug: true,
          category_id: true,
        },
        take: 5,
        orderBy: { created_at: "desc" },
      });

      for (const article of articles) {
        if (Date.now() - startTime > BUDGET_MS) break;

        try {
          // Search Unsplash for a relevant image
          const query = article.title_en.replace(/[^\w\s]/g, "").substring(0, 50);
          const photos = await searchPhotos(query, { perPage: 3, orientation: "landscape" });

          if (photos.length === 0) continue;

          const photo = photos[0];
          const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, quality: 80, format: "webp" });
          const attribution = buildAttribution(photo);

          // Update article with featured image
          await prisma.blogPost.update({
            where: { id: article.id },
            data: {
              featured_image: imageUrl,
              // Store attribution in meta for display
              meta_description_en: undefined, // Don't overwrite — just update image
            },
          });
          articlesUpdated++;

          // Save to MediaAsset for platform-wide reuse
          try {
            const existingAsset = await prisma.mediaAsset.findFirst({
              where: { tags: { has: `unsplash:${photo.id}` } },
            });
            if (!existingAsset) {
              await prisma.mediaAsset.create({
                data: {
                  filename: `unsplash-${photo.id}.webp`,
                  original_name: photo.description || photo.altDescription || query,
                  cloud_storage_path: `unsplash/${photo.id}`,
                  url: imageUrl,
                  file_type: "image",
                  mime_type: "image/webp",
                  file_size: 0, // Unknown for external URLs
                  width: photo.width,
                  height: photo.height,
                  alt_text: photo.altDescription || photo.description || query,
                  title: photo.description || query,
                  description: attribution,
                  tags: [`unsplash:${photo.id}`, `photographer:${photo.photographer.name}`, siteId],
                  license_info: `Unsplash License — ${attribution}`,
                },
              });
              imagesAdded++;
            }
          } catch (assetErr) {
            console.warn("[image-pipeline] MediaAsset save failed:", assetErr instanceof Error ? assetErr.message : String(assetErr));
          }

          // Track download per Unsplash ToS
          if (photo.downloadUrl) {
            trackDownload(photo.downloadUrl).catch(() => {});
          }
        } catch (articleErr) {
          errors++;
          console.warn(`[image-pipeline] Failed for article ${article.slug}:`, articleErr instanceof Error ? articleErr.message : String(articleErr));
        }
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
    errors,
    durationMs: Date.now() - startTime,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
