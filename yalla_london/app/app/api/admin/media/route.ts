/**
 * Admin Media Management API
 * CRUD operations for media library management
 * Uses MediaAsset Prisma model (NOT "media" — that model doesn't exist)
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
    const where: Record<string, unknown> = {
      deletedAt: null, // Exclude soft-deleted
    };

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

    // Fetch media files from MediaAsset table
    const [mediaFiles, totalCount] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.mediaAsset.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Transform data for frontend — map MediaAsset fields
    const transformedData = mediaFiles.map((file) => ({
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      url: file.url,
      thumbnailUrl: file.url, // Use URL as thumbnail (no separate thumbnail field on MediaAsset)
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
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage
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
 * Create a new media record (metadata only — file already uploaded)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();
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

    // Create the media record in MediaAsset table
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
      data: { category }
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
 * Bulk delete media files (soft delete)
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

    // Soft delete: set deletedAt timestamp
    const deletedCount = await prisma.mediaAsset.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: `${deletedCount.count} media files deleted successfully`,
      deletedCount: deletedCount.count
    });

  } catch (error) {
    console.error('[admin-media] Failed to delete media files:', error);
    return NextResponse.json(
      { error: 'Failed to delete media files' },
      { status: 500 }
    );
  }
});
