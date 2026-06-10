import { NextRequest, NextResponse } from "next/server";
import { getActiveSiteIds, getSiteConfig } from "@/config/sites";
import { checkCronEnabled } from "@/lib/cron-feature-guard";

export const maxDuration = 300;

const BUDGET_MS = 280_000;

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

  const flagBlock = await checkCronEnabled("image-pipeline");
  if (flagBlock) return flagBlock;

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({ success: true, skipped: "UNSPLASH_ACCESS_KEY not configured" });
  }

  const startTime = Date.now();
  let imagesAdded = 0;
  let articlesUpdated = 0;
  let libraryStocked = 0;
  let ordersProcessed = 0;
  let errors = 0;

  try {
    const { prisma } = await import("@/lib/db");
    const { searchPhotos, trackDownload, buildImageUrl, buildAttribution, SITE_IMAGE_QUERIES } =
      await import("@/lib/apis/unsplash");

    const activeSites = getActiveSiteIds();

    // ── Step 1: Auto-fill articles with NULL featured_image ────────────
    // Re-enabled after DB cleanup (107 posts had wrong photos nulled out).
    // Uses Unsplash API with destination-specific queries + PHOTO_BLOCKLIST.
    // Max 10 articles per run to stay within Unsplash rate limit (50 req/hr).
    const PHOTO_BLOCKLIST = new Set([
      "photo-1566073771259-6a8506099945",
      "photo-1485738422979-f5c462d49f74",
      "photo-1567620905732-2d1ec7ab7445",
      "photo-1534430480872-3498386e7856",
      "photo-1492866533884-47aea3be0757",
      "photo-1503174971373-b1f69860e7d7",
      "photo-1618773928121-c32242e63f39",
      "photo-1571003123894-1f0594d2b5d9",
      "photo-1445019980597-93fa8acb246c",
      "photo-1480714378408-67cf0d13bc1b",
      "photo-1485738422979-f5c462d49f04",
    ]);
    for (const siteId of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;

      const articles = await prisma.blogPost.findMany({
        where: {
          siteId,
          published: true,
          OR: [{ featured_image: null }, { featured_image: "" }],
        },
        select: { id: true, title_en: true, slug: true },
        take: 5,
        orderBy: { created_at: "desc" },
      });

      for (const article of articles) {
        if (Date.now() - startTime > BUDGET_MS) break;

        try {
          const siteConfig = getSiteConfig(siteId);
          const destination = siteConfig?.destination || "London";
          const query = `${destination} ${article.title_en.replace(/[^\w\s]/g, "")}`.substring(0, 80);
          const photos = (await searchPhotos(query, { perPage: 8, orientation: "landscape" })).filter(
            (p) => !PHOTO_BLOCKLIST.has(p.id),
          );

          // May 19 audit: 3 articles stayed perma-stuck because Unsplash returned 0
          // results for their specific title queries. Fall back to a deterministic
          // luxury-destination photo (same pool the /hotels page uses) so every
          // article gets SOMETHING instead of staying NULL forever. Hash the title
          // so the same article always gets the same fallback photo.
          if (photos.length === 0) {
            const FALLBACK_PHOTOS = [
              "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80", // hotel lobby
              "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80", // hotel exterior
              "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80", // luxury room
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80", // grand facade
              "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80", // luxury w view
              "https://images.unsplash.com/photo-1455587734955-081b22074882?w=1200&q=80", // boutique
            ];
            let hash = 0;
            for (let i = 0; i < article.slug.length; i++) {
              hash = (hash * 31 + article.slug.charCodeAt(i)) & 0xfffffff;
            }
            const fallbackUrl = FALLBACK_PHOTOS[hash % FALLBACK_PHOTOS.length];
            await prisma.blogPost.update({
              where: { id: article.id },
              data: { featured_image: fallbackUrl },
            });
            articlesUpdated++;
            imagesAdded++;
            console.log(`[image-pipeline] No Unsplash result for "${query}" — used deterministic fallback for ${article.slug}`);
            continue;
          }

          const photo = photos[0];
          const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, quality: 80, format: "webp" });
          const attribution = buildAttribution(photo);

          await prisma.blogPost.update({
            where: { id: article.id },
            data: { featured_image: imageUrl },
          });
          articlesUpdated++;

          // Save to MediaAsset for reuse
          await saveToLibrary(prisma as Record<string, unknown>, photo, imageUrl, attribution, query, siteId);
          imagesAdded++;

          if (photo.downloadUrl) {
            trackDownload(photo.downloadUrl).catch(() => {});
          }
        } catch (articleErr) {
          errors++;
          console.warn(
            `[image-pipeline] Failed for article ${article.slug}:`,
            articleErr instanceof Error ? articleErr.message : String(articleErr),
          );
        }
      }
    }

    // ── Step 1.5: Process pending photo orders (queued by fix_images action) ──
    for (const siteId of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;

      const pendingOrders = await prisma.blogPost.findMany({
        where: {
          siteId,
          photo_order_status: "pending",
          photo_order_query: { not: null },
        },
        select: { id: true, slug: true, photo_order_query: true },
        take: 5,
        orderBy: { updated_at: "desc" },
      });

      for (const post of pendingOrders) {
        if (Date.now() - startTime > BUDGET_MS) break;

        try {
          const query = (post.photo_order_query || "london travel").substring(0, 60);
          const photos = await searchPhotos(query, { perPage: 3, orientation: "landscape" });
          if (photos.length === 0) {
            await prisma.blogPost.update({
              where: { id: post.id },
              data: { photo_order_status: "no_results" },
            });
            continue;
          }

          const photo = photos[0];
          const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, quality: 80, format: "webp" });
          const attribution = buildAttribution(photo);

          await prisma.blogPost.update({
            where: { id: post.id },
            data: {
              featured_image: imageUrl,
              photo_order_status: "fulfilled",
            },
          });
          articlesUpdated++;

          await saveToLibrary(prisma as Record<string, unknown>, photo, imageUrl, attribution, query, siteId);
          imagesAdded++;
          ordersProcessed++;

          if (photo.downloadUrl) {
            trackDownload(photo.downloadUrl).catch(() => {});
          }
        } catch (orderErr) {
          errors++;
          console.warn(
            `[image-pipeline] Photo order failed for ${post.slug}:`,
            orderErr instanceof Error ? orderErr.message : String(orderErr),
          );
          await prisma.blogPost
            .update({
              where: { id: post.id },
              data: { photo_order_status: "error" },
            })
            .catch(() => {});
        }
      }
    }

    // ── Step 1.7: Inline-image backfill for published articles ────────
    // YL-2 image-pipeline extension. Many articles have a featured image but
    // no inline <img> in the body — hurts dwell time, accessibility, and
    // image-search discoverability. Each run picks up to 20 published posts
    // whose body has zero <img> tags, fetches ONE topical Unsplash photo via
    // the existing pipeline, and splices it after the first paragraph.
    //
    // Reuses searchPhotos + buildImageUrl + saveToLibrary — no new model
    // integration. Stays within the existing 280s budget + Unsplash rate
    // limit (cap = 20 across all sites per invocation).
    let inlineBackfillCap = 20;
    for (const siteId of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;
      if (inlineBackfillCap <= 0) break;

      const siteConfig = getSiteConfig(siteId);
      const destination = siteConfig?.destination || "London";

      // Heuristic: HTML bodies without "<img" almost certainly have no inline
      // image. Featured-image hero is rendered separately in the layout, so a
      // missing inline image leaves the body wall-of-text.
      const candidates = await prisma.blogPost.findMany({
        where: {
          siteId,
          published: true,
          NOT: { content_en: { contains: "<img" } },
        },
        select: { id: true, slug: true, title_en: true, content_en: true },
        take: inlineBackfillCap,
        orderBy: { updated_at: "desc" },
      });

      for (const post of candidates) {
        if (Date.now() - startTime > BUDGET_MS) break;
        if (inlineBackfillCap <= 0) break;

        try {
          const query = `${destination} ${post.title_en.replace(/[^\w\s]/g, "")}`.substring(0, 80);
          const photos = await searchPhotos(query, { perPage: 4, orientation: "landscape" });
          if (photos.length === 0) continue;

          const photo = photos[0];
          const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, quality: 80, format: "webp" });
          const attribution = buildAttribution(photo);
          const altText = (post.title_en || destination).slice(0, 120).replace(/"/g, "&quot;");
          const figureHtml =
            `
<figure class="article-inline-image" style="margin: 1.5rem 0;">` +
            `<img src="${imageUrl}" alt="${altText}" loading="lazy" style="width:100%;height:auto;border-radius:8px;" />` +
            `<figcaption style="font-size:0.8rem;color:#6b7280;margin-top:0.4rem;">${attribution}</figcaption>` +
            `</figure>
`;

          // Splice after the first </p> when present, else prepend.
          const body = post.content_en || "";
          const firstP = body.indexOf("</p>");
          const updatedBody =
            firstP >= 0
              ? body.slice(0, firstP + 4) + figureHtml + body.slice(firstP + 4)
              : figureHtml + body;

          await prisma.blogPost.update({
            where: { id: post.id },
            data: { content_en: updatedBody },
          });

          await saveToLibrary(prisma as Record<string, unknown>, photo, imageUrl, attribution, query, siteId);
          imagesAdded++;
          articlesUpdated++;
          inlineBackfillCap--;

          if (photo.downloadUrl) {
            trackDownload(photo.downloadUrl).catch(() => {});
          }
        } catch (inlineErr) {
          errors++;
          console.warn(
            `[image-pipeline] Inline backfill failed for ${post.slug}:`,
            inlineErr instanceof Error ? inlineErr.message : String(inlineErr),
          );
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

            const saved = await saveToLibrary(
              prisma as Record<string, unknown>,
              photo,
              imageUrl,
              attribution,
              randomQuery,
              siteId,
            );
            if (saved) {
              libraryStocked++;
              if (photo.downloadUrl) {
                trackDownload(photo.downloadUrl).catch(() => {});
              }
            }
          } catch (stockErr) {
            console.warn(
              "[image-pipeline] Library stock failed:",
              stockErr instanceof Error ? stockErr.message : String(stockErr),
            );
          }
        }
      } catch (queryErr) {
        errors++;
        console.warn(
          `[image-pipeline] Query "${randomQuery}" failed for ${siteId}:`,
          queryErr instanceof Error ? queryErr.message : String(queryErr),
        );
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
    ordersProcessed,
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
  prisma: Record<string, unknown>,
  photo: UnsplashPhotoLike,
  imageUrl: string,
  attribution: string,
  searchQuery: string,
  siteId: string,
): Promise<boolean> {
  try {
    const mediaAsset = prisma["mediaAsset"] as { findFirst: Function; create: Function };
    const existing = await mediaAsset.findFirst({
      where: { tags: { has: `unsplash:${photo.id}` } },
    });
    if (existing) return false;

    await mediaAsset.create({
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
