/**
 * Video Library API — CRUD for VideoAsset records + Canva import + article matching
 *
 * GET: List/search video assets with filtering
 * POST: Import from Canva, add self-captured, match to articles, bulk-tag
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  PRIMARY_COLLECTIONS,
  autoTagFromText,
  generateAssetCode,
  LUXURY_TRAVEL_PAGE_TEXT,
  AESTHETIC_REELS_PAGE_TEXT,
} from "@/lib/video/asset-registry";
import { findBestVideosForArticle } from "@/lib/video/article-matcher";

export const maxDuration = 60;

// ============================================================
// GET — List / Search / Stats
// ============================================================

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const url = request.nextUrl;
  const action = url.searchParams.get("action") || "list";
  const siteId = url.searchParams.get("siteId") || undefined;

  try {
    if (action === "stats") {
      const [total, untagged, tagged, matched, used, retired, selfCaptured, byCollection] = await Promise.all([
        prisma.videoAsset.count(),
        prisma.videoAsset.count({ where: { status: "untagged" } }),
        prisma.videoAsset.count({ where: { status: "tagged" } }),
        prisma.videoAsset.count({ where: { status: "matched" } }),
        prisma.videoAsset.count({ where: { status: "used" } }),
        prisma.videoAsset.count({ where: { status: "retired" } }),
        prisma.videoAsset.count({ where: { authenticity: "self-captured" } }),
        prisma.videoAsset.groupBy({ by: ["collectionName"], _count: true }),
      ]);

      return NextResponse.json({
        total, untagged, tagged, matched, used, retired, selfCaptured,
        byCollection: byCollection.map(c => ({ collection: c.collectionName, count: c._count })),
        collections: PRIMARY_COLLECTIONS.map(c => ({
          id: c.id, name: c.name, slug: c.slug, pageCount: c.pageCount, contentType: c.contentType,
        })),
      });
    }

    if (action === "match") {
      // Find best videos for a given article
      const articleId = url.searchParams.get("articleId");
      if (!articleId) return NextResponse.json({ error: "articleId required" }, { status: 400 });

      const article = await prisma.blogPost.findUnique({
        where: { id: articleId },
        select: { id: true, title_en: true, category_id: true, siteId: true, tags: true, content_en: true },
      });
      if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 });

      const videos = await prisma.videoAsset.findMany({
        where: { status: { not: "retired" } },
        select: {
          id: true, assetCode: true, locationTags: true, sceneTags: true, moodTags: true,
          seasonTags: true, siteId: true, authenticity: true, usageCount: true, status: true,
          thumbnailUrl: true, collectionName: true, textOverlay: true,
        },
      });

      const matches = findBestVideosForArticle(
        videos.map(v => ({ ...v, siteId: v.siteId || null })),
        {
          id: article.id,
          titleEn: article.title_en,
          categoryId: article.category_id,
          siteId: article.siteId,
          tags: article.tags || [],
          contentSnippet: (article.content_en || "").slice(0, 500),
        },
        10
      );

      // Enrich with thumbnail URLs
      const videoMap = new Map(videos.map(v => [v.id, v] as [string, typeof v]));
      const enriched = matches.map(m => ({
        ...m,
        thumbnailUrl: videoMap.get(m.videoId)?.thumbnailUrl,
        collectionName: videoMap.get(m.videoId)?.collectionName,
        textOverlay: videoMap.get(m.videoId)?.textOverlay,
      }));

      return NextResponse.json({ articleId, articleTitle: article.title_en, matches: enriched });
    }

    // Default: paginated list with filters
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const status = url.searchParams.get("status") || undefined;
    const collection = url.searchParams.get("collection") || undefined;
    const source = url.searchParams.get("source") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (collection) where.collectionName = collection;
    if (source) where.source = source;
    if (siteId) where.OR = [{ siteId }, { siteId: null }];
    if (search) {
      where.OR = [
        { assetCode: { contains: search, mode: "insensitive" } },
        { textOverlay: { contains: search, mode: "insensitive" } },
        { locationTags: { has: search.toLowerCase() } },
        { sceneTags: { has: search.toLowerCase() } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.videoAsset.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.videoAsset.count({ where }),
    ]);

    return NextResponse.json({
      assets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error("[video-library] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch video library" }, { status: 500 });
  }
}

// ============================================================
// POST — Import / Add / Tag / Match
// ============================================================

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");

  try {
    const body = await request.json();
    const action = body.action as string;

    // ---- IMPORT FROM CANVA ----
    if (action === "import-canva") {
      const collectionSlug = body.collectionSlug as string;
      const collection = PRIMARY_COLLECTIONS.find(c => c.slug === collectionSlug);
      if (!collection) {
        return NextResponse.json({ error: `Unknown collection: ${collectionSlug}` }, { status: 400 });
      }

      // Check how many already imported
      const existing = await prisma.videoAsset.count({
        where: { canvaDesignId: collection.id },
      });

      if (existing >= collection.pageCount) {
        return NextResponse.json({ message: `Already imported ${existing}/${collection.pageCount} from ${collection.name}`, imported: 0 });
      }

      // Get existing asset codes to find next index
      const maxCode = await prisma.videoAsset.findFirst({
        where: { collectionName: collection.slug },
        orderBy: { assetCode: "desc" },
        select: { assetCode: true },
      });
      let nextIndex = existing + 1;

      // Get text overlays for auto-tagging
      const textMap = collectionSlug === "60-luxury-travel"
        ? LUXURY_TRAVEL_PAGE_TEXT
        : collectionSlug === "50-aesthetic-reels"
          ? AESTHETIC_REELS_PAGE_TEXT
          : {};

      const toCreate: Array<Record<string, unknown>> = [];

      for (let pageIdx = existing + 1; pageIdx <= collection.pageCount; pageIdx++) {
        const textContent = textMap[pageIdx] || collection.description;
        const tags = autoTagFromText(textContent);
        const assetCode = generateAssetCode("canva-purchased", collection.slug, nextIndex);

        toCreate.push({
          assetCode,
          source: "canva-purchased",
          canvaDesignId: collection.id,
          canvaPageIndex: pageIdx,
          collectionName: collection.slug,
          originalUrl: `https://www.canva.com/design/${collection.id}`,
          width: collection.width,
          height: collection.height,
          format: collection.format,
          contentFormat: collection.contentType,
          locationTags: tags.locationTags,
          sceneTags: tags.sceneTags,
          moodTags: tags.moodTags,
          seasonTags: tags.seasonTags,
          customTags: tags.siteAffinity,
          textOverlay: textContent !== collection.description ? textContent : null,
          status: tags.locationTags.length > 0 ? "tagged" : "untagged",
          authenticity: "stock",
          priority: 0,
        });

        nextIndex++;
      }

      // Batch create
      let created = 0;
      for (const data of toCreate) {
        try {
          await prisma.videoAsset.create({ data });
          created++;
        } catch (e) {
          // Skip duplicates (unique assetCode constraint)
          if (e instanceof Error && e.message.includes("Unique constraint")) continue;
          throw e;
        }
      }

      return NextResponse.json({
        message: `Imported ${created} clips from ${collection.name}`,
        imported: created,
        total: existing + created,
        collectionTotal: collection.pageCount,
      });
    }

    // ---- IMPORT ALL COLLECTIONS ----
    if (action === "import-all") {
      const results: Array<{ collection: string; imported: number; total: number }> = [];

      for (const collection of PRIMARY_COLLECTIONS) {
        const existing = await prisma.videoAsset.count({
          where: { canvaDesignId: collection.id },
        });

        if (existing >= collection.pageCount) {
          results.push({ collection: collection.name, imported: 0, total: existing });
          continue;
        }

        // Delegate to individual import
        const textMap = collection.slug === "60-luxury-travel"
          ? LUXURY_TRAVEL_PAGE_TEXT
          : collection.slug === "50-aesthetic-reels"
            ? AESTHETIC_REELS_PAGE_TEXT
            : {};

        let nextIndex = existing + 1;
        let created = 0;

        for (let pageIdx = existing + 1; pageIdx <= collection.pageCount; pageIdx++) {
          const textContent = textMap[pageIdx] || collection.description;
          const tags = autoTagFromText(textContent);
          const assetCode = generateAssetCode("canva-purchased", collection.slug, nextIndex);

          try {
            await prisma.videoAsset.create({
              data: {
                assetCode,
                source: "canva-purchased",
                canvaDesignId: collection.id,
                canvaPageIndex: pageIdx,
                collectionName: collection.slug,
                originalUrl: `https://www.canva.com/design/${collection.id}`,
                width: collection.width,
                height: collection.height,
                format: collection.format,
                contentFormat: collection.contentType,
                locationTags: tags.locationTags,
                sceneTags: tags.sceneTags,
                moodTags: tags.moodTags,
                seasonTags: tags.seasonTags,
                customTags: tags.siteAffinity,
                textOverlay: textContent !== collection.description ? textContent : null,
                status: tags.locationTags.length > 0 ? "tagged" : "untagged",
                authenticity: "stock",
                priority: 0,
              },
            });
            created++;
          } catch (e) {
            if (e instanceof Error && e.message.includes("Unique constraint")) continue;
            console.warn(`[video-library] Import error for ${assetCode}:`, e instanceof Error ? e.message : e);
          }
          nextIndex++;
        }

        results.push({ collection: collection.name, imported: created, total: existing + created });
      }

      const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
      return NextResponse.json({ message: `Imported ${totalImported} total clips`, results });
    }

    // ---- ADD SELF-CAPTURED VIDEO ----
    if (action === "add-self-captured") {
      const { title, locationTags, sceneTags, moodTags, seasonTags, siteId, notes, exportedUrl, thumbnailUrl } = body;

      // Find next SC index
      const lastSc = await prisma.videoAsset.findFirst({
        where: { source: "self-captured" },
        orderBy: { assetCode: "desc" },
        select: { assetCode: true },
      });
      const nextIdx = lastSc ? parseInt(lastSc.assetCode.replace("VID-SC-", "")) + 1 : 1;
      const assetCode = generateAssetCode("self-captured", null, nextIdx);

      const asset = await prisma.videoAsset.create({
        data: {
          assetCode,
          source: "self-captured",
          siteId: siteId || null,
          collectionName: "self-captured",
          exportedUrl: exportedUrl || null,
          thumbnailUrl: thumbnailUrl || null,
          format: "vertical",
          contentFormat: "raw-footage",
          locationTags: locationTags || [],
          sceneTags: sceneTags || [],
          moodTags: moodTags || [],
          seasonTags: seasonTags || ["year-round"],
          customTags: [],
          textOverlay: title || null,
          status: "tagged",
          authenticity: "self-captured",
          priority: 10, // Self-captured always higher priority
          notes: notes || null,
        },
      });

      return NextResponse.json({ message: `Added self-captured video ${assetCode}`, asset });
    }

    // ---- BULK UPDATE TAGS ----
    if (action === "bulk-tag") {
      const { assetIds, locationTags, sceneTags, moodTags, seasonTags, status } = body;
      if (!assetIds?.length) return NextResponse.json({ error: "assetIds required" }, { status: 400 });

      const updateData: Record<string, unknown> = {};
      if (locationTags) updateData.locationTags = locationTags;
      if (sceneTags) updateData.sceneTags = sceneTags;
      if (moodTags) updateData.moodTags = moodTags;
      if (seasonTags) updateData.seasonTags = seasonTags;
      if (status) updateData.status = status;

      const result = await prisma.videoAsset.updateMany({
        where: { id: { in: assetIds } },
        data: updateData,
      });

      return NextResponse.json({ message: `Updated ${result.count} assets`, count: result.count });
    }

    // ---- DELETE ----
    if (action === "delete") {
      const { assetId } = body;
      if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

      await prisma.videoAsset.delete({ where: { id: assetId } });
      return NextResponse.json({ message: "Deleted" });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (err) {
    console.error("[video-library] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
