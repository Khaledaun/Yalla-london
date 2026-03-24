/**
 * Admin Media Management API
 * CRUD operations for media library management
 *
 * Prisma model: MediaAsset (NOT "Media" — that model doesn't exist)
 * Fields: filename, original_name, cloud_storage_path, url, file_type,
 *         mime_type, file_size, width, height, alt_text, title,
 *         description, tags, site_id, category, folder, isVideo,
 *         videoPoster, videoVariants, isHeroVideo, duration, deletedAt
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { z } from 'zod';

// Validation schemas
const MediaQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val, 10), 100)).default('20'),
  type: z.enum(['image', 'video', 'document']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  siteId: z.string().optional(),
});

const MediaCreateSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  original_name: z.string().min(1, 'Original name is required'),
  url: z.string().min(1, 'URL is required'),
  cloud_storage_path: z.string().default(''),
  file_size: z.number().positive('Valid file size is required'),
  mime_type: z.string().min(1, 'MIME type is required'),
  file_type: z.string().default('image'),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  alt_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional().nullable(),
  folder: z.string().optional().nullable(),
  site_id: z.string().optional().nullable(),
  isVideo: z.boolean().default(false),
});

/**
 * GET /api/admin/media
 * Get all media files for admin management
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const validation = MediaQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { page, limit, type, category, search, siteId } = validation.data;
    const offset = (page - 1) * limit;

    // Build where clause using MediaAsset fields
    const where: Record<string, unknown> = { deletedAt: null };

    if (type) {
      where.file_type = type;
    }

    if (category) {
      where.category = category;
    }

    if (siteId) {
      where.OR = [
        { site_id: siteId },
        { site_id: null }, // Include shared assets
      ];
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { original_name: { contains: search, mode: 'insensitive' } },
        { alt_text: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    const [mediaFiles, totalCount] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.mediaAsset.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const transformedData = mediaFiles.map((file) => ({
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      url: file.url,
      thumbnailUrl: file.videoPoster || file.url,
      size: file.file_size,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      fileType: file.file_type,
      width: file.width,
      height: file.height,
      altText: file.alt_text,
      description: file.description,
      tags: file.tags || [],
      category: file.category,
      folder: file.folder || 'uploads',
      siteId: file.site_id,
      isVideo: file.isVideo,
      duration: file.duration,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      },
      meta: {
        type_filter: type,
        category_filter: category,
        search_query: search
      }
    });

  } catch (error) {
    console.error('[admin-media] Failed to fetch media files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media files' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/media
 * Create a new media record — or seed from Canva
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();

    // ── Seed from Canva ──────────────────────────────────────
    if (body.action === 'seed_from_canva' && Array.isArray(body.items)) {
      const items: Array<{
        canvaId: string;
        title: string;
        thumbnail: string;
        editUrl: string;
        viewUrl: string;
        pageCount: number;
      }> = body.items;

      // Check which Canva IDs already exist (stored in tags)
      const existing = await prisma.mediaAsset.findMany({
        where: { tags: { hasSome: items.map(i => `canva:${i.canvaId}`) } },
        select: { tags: true },
      });
      const existingCanvaIds = new Set<string>();
      for (const row of existing) {
        for (const tag of row.tags) {
          if (tag.startsWith('canva:')) existingCanvaIds.add(tag.replace('canva:', ''));
        }
      }

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];
      for (const item of items) {
        if (existingCanvaIds.has(item.canvaId)) {
          skipped++;
          continue;
        }

        try {
          await prisma.mediaAsset.create({
            data: {
              filename: item.title,
              original_name: item.title,
              cloud_storage_path: `canva/${item.canvaId}`,
              url: item.editUrl,
              file_type: 'video',
              mime_type: 'video/mp4',
              file_size: 0,
              width: 1080,
              height: 1920,
              alt_text: item.title,
              title: item.title,
              description: `Canva video (${item.pageCount} pages). View: ${item.viewUrl}`,
              tags: [`canva:${item.canvaId}`, 'canva', 'video', 'travel', 'luxury'],
              folder: body.folder || 'canva-videos',
              isVideo: true,
              videoPoster: item.thumbnail,
            },
          });
          created++;
        } catch (createErr) {
          const reason = createErr instanceof Error ? createErr.message : String(createErr);
          console.error(`[seed-canva] Failed to create "${item.title}" (${item.canvaId}):`, reason);
          errors.push(`${item.title}: ${reason.slice(0, 150)}`);
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        created,
        skipped,
        failed: errors.length,
        total: items.length,
        errors: errors.length > 0 ? errors : undefined,
        message: errors.length === 0
          ? `Seeded ${created} Canva videos (${skipped} already existed)`
          : `Seeded ${created}, skipped ${skipped}, failed ${errors.length}: ${errors[0]}`,
      });
    }

    // ── Bulk Stock Library (per-site auto-fill) ───────────────
    // One-tap action: fetches photos for ALL configured site queries and saves to library.
    // Uses SITE_IMAGE_QUERIES from unsplash.ts. Respects rate limits (max 30 photos per run).
    if (body.action === 'bulk_stock_library') {
      const { searchPhotos, trackDownload, buildImageUrl, buildAttribution, SITE_IMAGE_QUERIES } = await import("@/lib/apis/unsplash");

      if (!process.env.UNSPLASH_ACCESS_KEY) {
        return NextResponse.json({
          success: false,
          error: 'UNSPLASH_ACCESS_KEY not configured. Get a free key at unsplash.com/developers and add it to Vercel env vars.',
        }, { status: 400 });
      }

      const targetSiteId = body.siteId || null;
      const perQuery = Math.min(body.perQuery || 5, 10); // max 10 per query
      const sitesToStock = targetSiteId
        ? { [targetSiteId]: SITE_IMAGE_QUERIES[targetSiteId] || [] }
        : SITE_IMAGE_QUERIES;

      let totalCreated = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const queriesRun: string[] = [];

      for (const [siteId, queries] of Object.entries(sitesToStock)) {
        if (!queries || queries.length === 0) continue;

        // Pick up to 3 random queries per site to stay within rate limits
        const shuffled = [...queries].sort(() => Math.random() - 0.5).slice(0, 3);

        for (const query of shuffled) {
          try {
            const photos = await searchPhotos(query, { perPage, orientation: 'landscape' });
            queriesRun.push(`${siteId}:${query} (${photos.length})`);

            for (const photo of photos) {
              // Dedup check
              const exists = await prisma.mediaAsset.findFirst({
                where: { tags: { has: `unsplash:${photo.id}` } },
                select: { id: true },
              });
              if (exists) { totalSkipped++; continue; }

              const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, quality: 85, format: 'webp' });
              const attribution = buildAttribution(photo);

              try {
                trackDownload(photo.downloadUrl).catch(() => {});

                await prisma.mediaAsset.create({
                  data: {
                    filename: `unsplash-${photo.id}.webp`,
                    original_name: photo.description || photo.altDescription || query,
                    cloud_storage_path: `unsplash/${photo.id}`,
                    url: imageUrl,
                    file_type: 'image',
                    mime_type: 'image/webp',
                    file_size: 0,
                    width: photo.width,
                    height: photo.height,
                    alt_text: photo.altDescription || photo.description || query,
                    title: photo.description || query,
                    description: attribution,
                    tags: [
                      `unsplash:${photo.id}`, 'unsplash', 'stock-photo', 'travel',
                      `photographer:${photo.photographer.username}`, siteId,
                    ],
                    folder: 'unsplash',
                    category: 'stock-photo',
                    site_id: siteId,
                    license_info: `Unsplash License — ${attribution}`,
                  },
                });
                totalCreated++;
              } catch {
                totalErrors++;
              }
            }
          } catch (queryErr) {
            console.warn(`[bulk-stock] Query "${query}" failed:`, queryErr instanceof Error ? queryErr.message : String(queryErr));
            totalErrors++;
          }
        }
      }

      return NextResponse.json({
        success: true,
        created: totalCreated,
        skipped: totalSkipped,
        errors: totalErrors,
        queriesRun,
        message: `Stocked ${totalCreated} photos (${totalSkipped} already existed, ${totalErrors} errors)`,
      });
    }

    // ── Import from Unsplash ──────────────────────────────────
    // Human-initiated bulk import: search → select → save to MediaAsset.
    // Unsplash ToS requires: (1) human triggers search, (2) track downloads, (3) store attribution.
    if (body.action === 'import_from_unsplash') {
      const { searchPhotos, trackDownload, buildImageUrl, buildAttribution } = await import("@/lib/apis/unsplash");

      // Mode 1: Search — returns photos for the user to pick from
      if (body.mode === 'search') {
        const query = body.query || 'luxury travel';
        const photos = await searchPhotos(query, {
          perPage: Math.min(body.perPage || 30, 30),
          orientation: body.orientation || 'landscape',
        });
        return NextResponse.json({
          success: true,
          photos: photos.map(p => ({
            id: p.id,
            description: p.description || p.altDescription || '',
            urls: p.urls,
            width: p.width,
            height: p.height,
            color: p.color,
            photographer: p.photographer,
            downloadUrl: p.downloadUrl,
            attribution: buildAttribution(p),
          })),
          total: photos.length,
          query,
        });
      }

      // Mode 2: Import — save selected photos to MediaAsset DB
      if (body.mode === 'import' && Array.isArray(body.photos)) {
        const photos: Array<{
          id: string;
          description: string;
          url: string; // regular size URL
          rawUrl: string; // raw URL for buildImageUrl
          width: number;
          height: number;
          color: string;
          photographerName: string;
          photographerUsername: string;
          photographerUrl: string;
          downloadUrl: string;
        }> = body.photos;

        // Check which Unsplash IDs already exist
        const existing = await prisma.mediaAsset.findMany({
          where: { tags: { hasSome: photos.map(p => `unsplash:${p.id}`) } },
          select: { tags: true },
        });
        const existingIds = new Set<string>();
        for (const row of existing) {
          for (const tag of row.tags) {
            if (tag.startsWith('unsplash:')) existingIds.add(tag.replace('unsplash:', ''));
          }
        }

        let created = 0;
        let skipped = 0;
        const errors: string[] = [];
        const siteId = body.siteId || null;
        const folder = body.folder || 'unsplash';
        const category = body.category || 'stock-photo';

        for (const photo of photos) {
          if (existingIds.has(photo.id)) {
            skipped++;
            continue;
          }

          try {
            // Track download (required by Unsplash ToS)
            trackDownload(photo.downloadUrl).catch(() => {});

            // Build optimized URL (1200px wide, webp, quality 85)
            const optimizedUrl = buildImageUrl(photo.rawUrl, {
              width: 1200,
              quality: 85,
              format: 'webp',
            });

            // Build attribution for legal compliance
            const attribution = `Photo by ${photo.photographerName} on Unsplash (${photo.photographerUrl})`;

            await prisma.mediaAsset.create({
              data: {
                filename: `unsplash-${photo.id}.webp`,
                original_name: photo.description?.slice(0, 200) || `Unsplash ${photo.id}`,
                cloud_storage_path: `unsplash/${photo.id}`,
                url: optimizedUrl,
                file_type: 'image',
                mime_type: 'image/webp',
                file_size: 0, // CDN-served, no local file
                width: photo.width,
                height: photo.height,
                alt_text: photo.description?.slice(0, 200) || `Travel photo by ${photo.photographerName}`,
                title: photo.description?.slice(0, 200) || null,
                description: attribution,
                tags: [
                  `unsplash:${photo.id}`,
                  'unsplash',
                  'stock-photo',
                  'travel',
                  `photographer:${photo.photographerUsername}`,
                  ...(siteId ? [siteId] : []),
                ],
                folder,
                category,
                site_id: siteId,
                isVideo: false,
              },
            });
            created++;
          } catch (createErr) {
            const reason = createErr instanceof Error ? createErr.message : String(createErr);
            errors.push(`${photo.id}: ${reason.slice(0, 150)}`);
          }
        }

        return NextResponse.json({
          success: errors.length === 0,
          created,
          skipped,
          failed: errors.length,
          total: photos.length,
          errors: errors.length > 0 ? errors : undefined,
          message: `Imported ${created} photos from Unsplash (${skipped} already existed)`,
        });
      }

      return NextResponse.json({ error: 'Invalid mode — use "search" or "import"' }, { status: 400 });
    }

    // ── Standard create ──────────────────────────────────────
    const validation = MediaCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid media data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Determine file type from MIME type if not provided
    let fileType = data.file_type;
    if (!fileType || fileType === 'image') {
      if (data.mime_type.startsWith('image/')) fileType = 'image';
      else if (data.mime_type.startsWith('video/')) fileType = 'video';
      else fileType = 'document';
    }

    const mediaFile = await prisma.mediaAsset.create({
      data: {
        filename: data.filename,
        original_name: data.original_name,
        cloud_storage_path: data.cloud_storage_path || data.url,
        url: data.url,
        file_type: fileType,
        mime_type: data.mime_type,
        file_size: data.file_size,
        width: data.width ?? null,
        height: data.height ?? null,
        alt_text: data.alt_text || null,
        description: data.description || null,
        tags: data.tags || [],
        category: data.category || null,
        folder: data.folder || 'uploads',
        site_id: data.site_id || null,
        isVideo: data.isVideo,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Media file created successfully',
      data: {
        id: mediaFile.id,
        filename: mediaFile.filename,
        originalName: mediaFile.original_name,
        url: mediaFile.url,
        thumbnailUrl: mediaFile.videoPoster || mediaFile.url,
        size: mediaFile.file_size,
        mimeType: mediaFile.mime_type,
        fileType: mediaFile.file_type,
        width: mediaFile.width,
        height: mediaFile.height,
        altText: mediaFile.alt_text,
        description: mediaFile.description,
        tags: mediaFile.tags,
        category: mediaFile.category,
        folder: mediaFile.folder,
        createdAt: mediaFile.created_at,
        updatedAt: mediaFile.updated_at,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[admin-media] Failed to create media file:', error);
    return NextResponse.json(
      { error: 'Failed to create media file' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/media
 * Bulk update media category
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();
    const { ids, category } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty IDs array' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const result = await prisma.mediaAsset.updateMany({
      where: { id: { in: ids } },
      data: { category },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} media files updated to category "${category}"`,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('[admin-media] Failed to update media category:', error);
    return NextResponse.json(
      { error: 'Failed to update media category' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/media
 * Soft-delete media files
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty IDs array' },
        { status: 400 }
      );
    }

    const result = await prisma.mediaAsset.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} media files deleted successfully`,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('[admin-media] Failed to delete media files:', error);
    return NextResponse.json(
      { error: 'Failed to delete media files' },
      { status: 500 }
    );
  }
});
