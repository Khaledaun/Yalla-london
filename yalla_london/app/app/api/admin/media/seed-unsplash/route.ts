import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const maxDuration = 300;

/**
 * POST /api/admin/media/seed-unsplash
 *
 * Seeds the media library with Unsplash photos for a specific site.
 * Fetches photos per category/folder, saves to MediaAsset with full metadata.
 *
 * Body: { siteId?: string, perQuery?: number, orientation?: "landscape"|"portrait" }
 * - siteId defaults to all configured sites
 * - perQuery defaults to 3 (photos per search query)
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const BUDGET_MS = 280_000;
  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const targetSiteId = body.siteId as string | undefined;
    const perQuery = Math.min(body.perQuery || 3, 5); // max 5 per query to respect rate limits
    const orientation = (body.orientation as "landscape" | "portrait") || "landscape";

    const { searchPhotos, trackDownload, buildImageUrl, buildAttribution, SITE_IMAGE_QUERIES } =
      await import("@/lib/apis/unsplash");
    const { prisma } = await import("@/lib/db");

    const siteIds = targetSiteId ? [targetSiteId] : Object.keys(SITE_IMAGE_QUERIES);
    const results: Record<string, { seeded: number; skipped: number; errors: string[] }> = {};

    for (const siteId of siteIds) {
      if (Date.now() - start > BUDGET_MS) break;

      const queries = SITE_IMAGE_QUERIES[siteId];
      if (!queries || !Array.isArray(queries)) {
        results[siteId] = { seeded: 0, skipped: 0, errors: [`No queries configured for ${siteId}`] };
        continue;
      }

      let seeded = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const queryDef of queries) {
        if (Date.now() - start > BUDGET_MS) break;

        // Support both old string[] and new object[] format
        const query = typeof queryDef === "string" ? queryDef : queryDef.query;
        const category = typeof queryDef === "string" ? "gallery" : queryDef.category;
        const folder = typeof queryDef === "string" ? siteId : queryDef.folder;

        try {
          const photos = await searchPhotos(query, { perPage: perQuery, orientation });
          if (photos.length === 0) {
            errors.push(`No results for "${query}"`);
            continue;
          }

          for (const photo of photos) {
            if (Date.now() - start > BUDGET_MS) break;

            // Dedup by unsplash:{id} tag
            const tag = `unsplash:${photo.id}`;
            const existing = await prisma.mediaAsset.findFirst({
              where: { tags: { has: tag } },
              select: { id: true },
            });

            if (existing) {
              skipped++;
              continue;
            }

            // Build optimized URLs for different sizes
            const responsiveUrls = {
              thumb: buildImageUrl(photo.urls.raw, { width: 200, quality: 70 }),
              small: buildImageUrl(photo.urls.raw, { width: 400, quality: 75 }),
              medium: buildImageUrl(photo.urls.raw, { width: 800, quality: 80 }),
              large: buildImageUrl(photo.urls.raw, { width: 1200, quality: 85 }),
              full: buildImageUrl(photo.urls.raw, { width: 1920, quality: 90 }),
            };

            // Build tags from query + metadata
            const tags = [
              tag,
              `site:${siteId}`,
              `category:${category}`,
              `folder:${folder}`,
              ...query.split(" ").filter((w: string) => w.length > 3),
            ];

            if (photo.altDescription) {
              tags.push(...photo.altDescription.split(" ").filter((w: string) => w.length > 4).slice(0, 5));
            }

            await prisma.mediaAsset.create({
              data: {
                filename: `unsplash-${photo.id}.jpg`,
                original_name: photo.description || photo.altDescription || query,
                cloud_storage_path: `unsplash/${siteId}/${folder}/${photo.id}`,
                url: photo.urls.regular, // 1080px — direct hotlink (Unsplash license allows this)
                file_type: "image",
                mime_type: "image/jpeg",
                file_size: 0, // Unsplash doesn't return file size
                width: photo.width,
                height: photo.height,
                alt_text: photo.altDescription || query,
                title: photo.description || query,
                description: `${query} — ${buildAttribution(photo)}`,
                tags,
                license_info: `Unsplash License — Photo by ${photo.photographer.name} (${photo.photographer.profileUrl})`,
                responsive_urls: responsiveUrls,
                site_id: siteId,
                category,
                folder,
              },
            });

            // Track download per Unsplash ToS
            await trackDownload(photo.downloadUrl).catch(() => {});

            seeded++;
          }

          // Rate limit: 50 req/hr on free tier — add small delay between queries
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {
          errors.push(`${query}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      results[siteId] = { seeded, skipped, errors };
      console.log(
        `[seed-unsplash] ${siteId}: ${seeded} seeded, ${skipped} skipped (duplicates), ${errors.length} errors`
      );
    }

    const totalSeeded = Object.values(results).reduce((sum, r) => sum + r.seeded, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);

    return NextResponse.json({
      success: true,
      totalSeeded,
      totalSkipped,
      results,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/media/seed-unsplash
 *
 * Returns available sites and their query counts.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { SITE_IMAGE_QUERIES } = await import("@/lib/apis/unsplash");
  const { prisma } = await import("@/lib/db");

  const sites: Record<string, { queries: number; existingPhotos: number }> = {};

  for (const [siteId, queries] of Object.entries(SITE_IMAGE_QUERIES)) {
    const existingPhotos = await prisma.mediaAsset.count({
      where: {
        site_id: siteId,
        tags: { has: `site:${siteId}` },
      },
    });

    sites[siteId] = {
      queries: Array.isArray(queries) ? queries.length : 0,
      existingPhotos,
    };
  }

  return NextResponse.json({ success: true, sites });
}
