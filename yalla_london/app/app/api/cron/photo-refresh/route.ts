/**
 * Cron: Photo Library Refresh
 * Schedule: Every 3 days (vercel.json)
 *
 * Auto-seeds fresh Unsplash photos for all active sites.
 * Seasonal + trending awareness: queries adapt based on current month.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

export const maxDuration = 300;

// Seasonal query overlays — added ON TOP of base site queries
function getSeasonalQueries(month: number): Array<{ query: string; category: string; folder: string; sites: string[] }> {
  const queries: Array<{ query: string; category: string; folder: string; sites: string[] }> = [];

  // ── Winter (Dec–Feb) ──
  if (month === 12 || month === 1 || month === 2) {
    queries.push(
      { query: "christmas london lights", category: "seasonal", folder: "seasonal/christmas", sites: ["yalla-london"] },
      { query: "london winter market", category: "seasonal", folder: "seasonal/christmas", sites: ["yalla-london"] },
      { query: "new year london fireworks", category: "seasonal", folder: "seasonal/new-year", sites: ["yalla-london"] },
      { query: "yacht winter sailing mediterranean", category: "seasonal", folder: "seasonal/winter-charter", sites: ["zenitha-yachts-med"] },
      { query: "dubai marina winter yacht", category: "seasonal", folder: "seasonal/gulf-winter", sites: ["zenitha-yachts-med"] },
      { query: "red sea yacht diving winter", category: "seasonal", folder: "seasonal/red-sea", sites: ["zenitha-yachts-med"] },
    );
  }

  // ── Spring (Mar–May) ──
  if (month >= 3 && month <= 5) {
    queries.push(
      { query: "london spring cherry blossom", category: "seasonal", folder: "seasonal/spring", sites: ["yalla-london"] },
      { query: "london easter events", category: "seasonal", folder: "seasonal/easter", sites: ["yalla-london"] },
      { query: "ramadan london mosque", category: "seasonal", folder: "seasonal/ramadan", sites: ["yalla-london"] },
      { query: "eid celebration london", category: "seasonal", folder: "seasonal/eid", sites: ["yalla-london"] },
      { query: "mediterranean spring sailing yacht", category: "seasonal", folder: "seasonal/spring-charter", sites: ["zenitha-yachts-med"] },
      { query: "greek islands spring flowers coast", category: "seasonal", folder: "seasonal/spring-charter", sites: ["zenitha-yachts-med"] },
    );
  }

  // ── Summer (Jun–Aug) ──
  if (month >= 6 && month <= 8) {
    queries.push(
      { query: "london summer rooftop bar", category: "seasonal", folder: "seasonal/summer", sites: ["yalla-london"] },
      { query: "hyde park summer london", category: "seasonal", folder: "seasonal/summer", sites: ["yalla-london"] },
      { query: "wimbledon tennis london", category: "seasonal", folder: "seasonal/events", sites: ["yalla-london"] },
      { query: "premier league football london stadium", category: "seasonal", folder: "seasonal/football", sites: ["yalla-london"] },
      { query: "yacht summer party mediterranean", category: "seasonal", folder: "seasonal/summer-charter", sites: ["zenitha-yachts-med"] },
      { query: "ibiza yacht party summer", category: "seasonal", folder: "seasonal/summer-charter", sites: ["zenitha-yachts-med"] },
      { query: "family yacht vacation summer children", category: "seasonal", folder: "seasonal/family", sites: ["zenitha-yachts-med"] },
      { query: "croatia sailing summer islands", category: "seasonal", folder: "seasonal/summer-charter", sites: ["zenitha-yachts-med"] },
    );
  }

  // ── Autumn (Sep–Nov) ──
  if (month >= 9 && month <= 11) {
    queries.push(
      { query: "london autumn parks golden leaves", category: "seasonal", folder: "seasonal/autumn", sites: ["yalla-london"] },
      { query: "london bonfire night fireworks", category: "seasonal", folder: "seasonal/events", sites: ["yalla-london"] },
      { query: "london fashion week", category: "seasonal", folder: "seasonal/events", sites: ["yalla-london"] },
      { query: "mediterranean autumn sailing yacht quiet", category: "seasonal", folder: "seasonal/autumn-charter", sites: ["zenitha-yachts-med"] },
      { query: "turkey gulet autumn bodrum", category: "seasonal", folder: "seasonal/autumn-charter", sites: ["zenitha-yachts-med"] },
    );
  }

  // ── Ramadan (shifts yearly — approximate with Mar-Apr window for 2026-2027) ──
  if (month === 3 || month === 4) {
    queries.push(
      { query: "ramadan iftar luxury dining", category: "seasonal", folder: "seasonal/ramadan", sites: ["yalla-london", "zenitha-yachts-med"] },
      { query: "mosque ramadan night prayer", category: "seasonal", folder: "seasonal/ramadan", sites: ["yalla-london"] },
    );
  }

  // ── Football season (Aug–May) ──
  if (month >= 8 || month <= 5) {
    queries.push(
      { query: "premier league match day atmosphere", category: "seasonal", folder: "seasonal/football", sites: ["yalla-london"] },
    );
  }

  return queries;
}

// Trending topics that rotate — different set each run
function getTrendingQueries(dayOfYear: number): Array<{ query: string; category: string; folder: string; sites: string[] }> {
  const allTrending = [
    // Luxury lifestyle
    { query: "luxury superyacht aerial drone", category: "trending", folder: "trending/luxury", sites: ["zenitha-yachts-med"] },
    { query: "luxury hotel pool infinity ocean", category: "trending", folder: "trending/luxury", sites: ["yalla-london", "zenitha-yachts-med"] },
    { query: "fine dining michelin star plating", category: "trending", folder: "trending/dining", sites: ["yalla-london"] },
    { query: "spa wellness luxury treatment", category: "trending", folder: "trending/wellness", sites: ["yalla-london"] },
    // Travel moments
    { query: "couple sunset yacht romantic", category: "trending", folder: "trending/romance", sites: ["zenitha-yachts-med"] },
    { query: "family beach vacation children", category: "trending", folder: "trending/family", sites: ["yalla-london", "zenitha-yachts-med"] },
    { query: "aerial coastal town mediterranean", category: "trending", folder: "trending/destinations", sites: ["zenitha-yachts-med"] },
    { query: "luxury car london mayfair", category: "trending", folder: "trending/lifestyle", sites: ["yalla-london"] },
    // Water activities
    { query: "paddleboard crystal clear water", category: "trending", folder: "trending/activities", sites: ["zenitha-yachts-med"] },
    { query: "jet ski ocean luxury", category: "trending", folder: "trending/activities", sites: ["zenitha-yachts-med"] },
    { query: "underwater diving coral fish", category: "trending", folder: "trending/activities", sites: ["zenitha-yachts-med"] },
    // Food
    { query: "halal street food market", category: "trending", folder: "trending/food", sites: ["yalla-london"] },
    { query: "afternoon tea scones london", category: "trending", folder: "trending/food", sites: ["yalla-london"] },
    { query: "yacht chef cooking onboard", category: "trending", folder: "trending/food", sites: ["zenitha-yachts-med"] },
  ];

  // Rotate: pick 4 trending queries per run based on day of year
  const offset = dayOfYear % allTrending.length;
  const selected: typeof allTrending = [];
  for (let i = 0; i < 4; i++) {
    selected.push(allTrending[(offset + i) % allTrending.length]);
  }
  return selected;
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  const cronStart = Date.now();
  const BUDGET_MS = 280_000;

  try {
    const { searchPhotos, trackDownload, buildImageUrl, buildAttribution } =
      await import("@/lib/apis/unsplash");
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      await logCronExecution("photo-refresh", cronStart, "completed", {
        message: "UNSPLASH_ACCESS_KEY not set — skipped",
      });
      return NextResponse.json({ success: true, message: "No Unsplash key configured" });
    }

    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const activeSiteIds = getActiveSiteIds();

    // Build query list: seasonal + trending (rotates each run)
    const seasonalQueries = getSeasonalQueries(month);
    const trendingQueries = getTrendingQueries(dayOfYear);
    const allQueries = [...seasonalQueries, ...trendingQueries];

    let totalSeeded = 0;
    let totalSkipped = 0;
    const siteResults: Record<string, { seeded: number; skipped: number }> = {};

    for (const q of allQueries) {
      if (Date.now() - cronStart > BUDGET_MS) break;

      // Only seed for active sites
      const targetSites = q.sites.filter(s => activeSiteIds.includes(s));
      if (targetSites.length === 0) continue;

      try {
        const photos = await searchPhotos(q.query, { perPage: 2, orientation: "landscape" });

        for (const photo of photos) {
          if (Date.now() - cronStart > BUDGET_MS) break;

          for (const siteId of targetSites) {
            const tag = `unsplash:${photo.id}`;
            const exists = await prisma.mediaAsset.findFirst({
              where: { tags: { has: tag }, site_id: siteId },
              select: { id: true },
            });

            if (exists) {
              totalSkipped++;
              if (!siteResults[siteId]) siteResults[siteId] = { seeded: 0, skipped: 0 };
              siteResults[siteId].skipped++;
              continue;
            }

            const responsiveUrls = {
              thumb: buildImageUrl(photo.urls.raw, { width: 200, quality: 70 }),
              small: buildImageUrl(photo.urls.raw, { width: 400, quality: 75 }),
              medium: buildImageUrl(photo.urls.raw, { width: 800, quality: 80 }),
              large: buildImageUrl(photo.urls.raw, { width: 1200, quality: 85 }),
            };

            const tags = [
              tag, `site:${siteId}`, `category:${q.category}`, `folder:${q.folder}`,
              ...q.query.split(" ").filter((w: string) => w.length > 3),
            ];

            await prisma.mediaAsset.create({
              data: {
                filename: `unsplash-${photo.id}.jpg`,
                original_name: photo.description || photo.altDescription || q.query,
                cloud_storage_path: `unsplash/${siteId}/${q.folder}/${photo.id}`,
                url: photo.urls.regular,
                file_type: "image",
                mime_type: "image/jpeg",
                file_size: 0,
                width: photo.width,
                height: photo.height,
                alt_text: photo.altDescription || q.query,
                title: photo.description || q.query,
                description: `${q.query} — ${buildAttribution(photo)}`,
                tags,
                license_info: `Unsplash License — Photo by ${photo.photographer.name}`,
                responsive_urls: responsiveUrls,
                site_id: siteId,
                category: q.category,
                folder: q.folder,
              },
            });

            await trackDownload(photo.downloadUrl).catch(() => {});
            totalSeeded++;
            if (!siteResults[siteId]) siteResults[siteId] = { seeded: 0, skipped: 0 };
            siteResults[siteId].seeded++;
          }
        }

        // Rate limit: 50 req/hr — 600ms between queries
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        console.warn(`[photo-refresh] "${q.query}": ${err instanceof Error ? err.message : err}`);
      }
    }

    const summary = {
      totalSeeded,
      totalSkipped,
      month,
      seasonalQueries: seasonalQueries.length,
      trendingQueries: trendingQueries.length,
      siteResults,
    };

    await logCronExecution("photo-refresh", cronStart, "completed", summary);

    return NextResponse.json({ success: true, ...summary, durationMs: Date.now() - cronStart });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logCronExecution("photo-refresh", cronStart, "failed", { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
