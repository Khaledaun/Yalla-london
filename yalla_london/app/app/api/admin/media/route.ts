/**
 * Admin Media Management API
 * CRUD operations for media library management
 *
 * Prisma model: MediaAsset (NOT "Media")
 * Fields: filename, original_name, cloud_storage_path, url, file_type,
 *         mime_type, file_size, width, height, alt_text, title,
 *         description, tags, site_id, category, folder, isVideo,
 *         videoPoster, videoVariants, isHeroVideo, duration, deletedAt
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schemas
const MediaQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val, 10), 100)).default('20'),
  type: z.enum(['image', 'video', 'document']).optional(),
  search: z.string().optional()
});

const MediaCreateSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  url: z.string().url('Valid URL is required'),
  size: z.number().nonnegative('Valid file size is required'),
  mime_type: z.string().min(1, 'MIME type is required'),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  alt_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

/**
 * GET /api/admin/media
 * Get all media files for admin management
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const validation = MediaQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    const { page, limit, type, search } = validation.data;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { deletedAt: null };

    if (type) {
      where.file_type = type;
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
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
      url: file.url,
      thumbnailUrl: file.videoPoster || file.url,
      size: file.file_size,
      mimeType: file.mime_type,
      width: file.width,
      height: file.height,
      altText: file.alt_text,
      description: file.description,
      tags: file.tags,
      folder: file.folder || 'uploads',
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
    });

  } catch (error) {
    console.error('[media-api] Failed to fetch media files:', error);
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
      for (const item of items) {
        if (existingCanvaIds.has(item.canvaId)) {
          skipped++;
          continue;
        }

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
      }

      return NextResponse.json({
        success: true,
        created,
        skipped,
        total: items.length,
        message: `Seeded ${created} Canva videos (${skipped} already existed)`,
      });
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

    // Determine file type from MIME type
    let fileType = 'document';
    if (data.mime_type.startsWith('image/')) {
      fileType = 'image';
    } else if (data.mime_type.startsWith('video/')) {
      fileType = 'video';
    }

    const mediaFile = await prisma.mediaAsset.create({
      data: {
        filename: data.filename,
        original_name: data.filename,
        cloud_storage_path: `uploads/${Date.now()}-${data.filename}`,
        url: data.url,
        file_type: fileType,
        mime_type: data.mime_type,
        file_size: data.size,
        width: data.width,
        height: data.height,
        alt_text: data.alt_text,
        description: data.description,
        tags: data.tags,
        isVideo: fileType === 'video',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Media file created successfully',
      data: {
        id: mediaFile.id,
        filename: mediaFile.filename,
        url: mediaFile.url,
        thumbnailUrl: mediaFile.videoPoster || mediaFile.url,
        size: mediaFile.file_size,
        mimeType: mediaFile.mime_type,
        width: mediaFile.width,
        height: mediaFile.height,
        altText: mediaFile.alt_text,
        description: mediaFile.description,
        tags: mediaFile.tags,
        createdAt: mediaFile.created_at,
        updatedAt: mediaFile.updated_at,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[media-api] Failed to create media file:', error);
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
    console.error('[media-api] Failed to update media category:', error);
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
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty IDs array' },
        { status: 400 }
      );
    }

    // Soft delete (set deletedAt)
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
    console.error('[media-api] Failed to delete media files:', error);
    return NextResponse.json(
      { error: 'Failed to delete media files' },
      { status: 500 }
    );
  }
});
