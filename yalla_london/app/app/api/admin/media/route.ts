/**
 * Admin Media Management API
 * CRUD operations for media library management
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
  size: z.number().positive('Valid file size is required'),
  mime_type: z.string().min(1, 'MIME type is required'),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  alt_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

const MediaUpdateSchema = MediaCreateSchema.partial();

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
        { 
          error: 'Invalid query parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { page, limit, type, search } = validation.data;
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (type) {
      where.mime_type = {
        startsWith: `${type}/`
      };
    }
    
    if (search) {
      where.OR = [
        {
          filename: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          alt_text: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          tags: {
            hasSome: [search]
          }
        }
      ];
    }
    
    // Fetch media files
    const [mediaFiles, totalCount] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.media.count({ where })
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Transform data for frontend
    const transformedData = mediaFiles.map((file: any) => ({
      id: file.id,
      filename: file.filename,
      url: file.url,
      thumbnailUrl: file.thumbnail_url,
      size: file.size,
      mimeType: file.mime_type,
      width: file.width,
      height: file.height,
      altText: file.alt_text,
      description: file.description,
      tags: file.tags,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      uploadedBy: file.uploadedBy,
      usageCount: file.usage_count || 0
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
        search_query: search
      }
    });
    
  } catch (error) {
    console.error('Failed to fetch media files:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch media files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
      const existing = await prisma.media.findMany({
        where: { tags: { hasSome: items.map(i => `canva:${i.canvaId}`) } },
        select: { tags: true },
      });
      const existingCanvaIds = new Set<string>();
      for (const row of existing) {
        for (const tag of (row.tags as string[])) {
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

        await prisma.media.create({
          data: {
            filename: item.title,
            url: item.editUrl,
            thumbnail_url: item.thumbnail,
            size: 0,
            mime_type: 'video/mp4',
            media_type: 'video',
            width: 1080,
            height: 1920,
            alt_text: item.title,
            description: `Canva video (${item.pageCount} pages). View: ${item.viewUrl}`,
            tags: [`canva:${item.canvaId}`, 'canva', 'video', 'travel', 'luxury', body.folder || 'canva-videos'],
            uploaded_by: 'admin',
            created_at: new Date(),
            updated_at: new Date(),
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
        {
          error: 'Invalid media data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // Determine media type from MIME type
    let mediaType = 'document';
    if (data.mime_type.startsWith('image/')) {
      mediaType = 'image';
    } else if (data.mime_type.startsWith('video/')) {
      mediaType = 'video';
    }
    
    // Create the media record
    const mediaFile = await prisma.media.create({
      data: {
        filename: data.filename,
        url: data.url,
        size: data.size,
        mime_type: data.mime_type,
        media_type: mediaType,
        width: data.width,
        height: data.height,
        alt_text: data.alt_text,
        description: data.description,
        tags: data.tags,
        uploaded_by: 'admin', // TODO: Get from auth context
        created_at: new Date(),
        updated_at: new Date()
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Media file created successfully',
      data: {
        id: mediaFile.id,
        filename: mediaFile.filename,
        url: mediaFile.url,
        thumbnailUrl: mediaFile.thumbnail_url,
        size: mediaFile.size,
        mimeType: mediaFile.mime_type,
        width: mediaFile.width,
        height: mediaFile.height,
        altText: mediaFile.alt_text,
        description: mediaFile.description,
        tags: mediaFile.tags,
        createdAt: mediaFile.created_at,
        updatedAt: mediaFile.updated_at,
        uploadedBy: mediaFile.uploadedBy,
        usageCount: 0
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create media file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create media file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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
      data: {
        category,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} media files updated to category "${category}"`,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Failed to update media category:', error);
    return NextResponse.json(
      { error: 'Failed to update media category' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/media
 * Bulk delete media files
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
    
    // Check if any files are in use
    const filesInUse = await prisma.media.findMany({
      where: {
        id: { in: ids },
        usage_count: { gt: 0 }
      },
      select: { id: true, filename: true, usage_count: true }
    });
    
    if (filesInUse.length > 0) {
      return NextResponse.json({
        error: 'Some files are currently in use and cannot be deleted',
        filesInUse: filesInUse.map((file: any) => ({
          id: file.id,
          filename: file.filename,
          usageCount: file.usage_count
        }))
      }, { status: 400 });
    }
    
    // Delete the files
    const deletedCount = await prisma.media.deleteMany({
      where: { id: { in: ids } }
    });
    
    return NextResponse.json({
      success: true,
      message: `${deletedCount.count} media files deleted successfully`,
      deletedCount: deletedCount.count
    });
    
  } catch (error) {
    console.error('Failed to delete media files:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete media files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});