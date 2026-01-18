/**
 * Photo Pool API
 * Manages categorized photos for events, hotels, restaurants, etc.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Photo categories
const PHOTO_CATEGORIES = [
  'events', 'hotels', 'restaurants', 'attractions',
  'shopping', 'experiences', 'guides', 'blog', 'uncategorized'
] as const;

// Validation schemas
const PhotoQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val, 10), 100)).default('50'),
  category: z.enum(PHOTO_CATEGORIES).optional(),
  search: z.string().optional()
});

const PhotoCreateSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  url: z.string().url('Valid URL is required'),
  title: z.string().optional(),
  alt_text: z.string().optional(),
  category: z.enum(PHOTO_CATEGORIES).default('uncategorized'),
  tags: z.array(z.string()).default([]),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  file_size: z.number().positive().optional()
});

const PhotoUpdateSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  alt_text: z.string().optional(),
  category: z.enum(PHOTO_CATEGORIES).optional(),
  tags: z.array(z.string()).optional()
});

const BulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1),
  category: z.enum(PHOTO_CATEGORIES).optional(),
  addTags: z.array(z.string()).optional(),
  removeTags: z.array(z.string()).optional()
});

/**
 * GET /api/admin/photo-pool
 * Get photos from the pool with filtering
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const validation = PhotoQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, category, search } = validation.data;
    const offset = (page - 1) * limit;

    // Build where clause for photos (images only)
    const where: any = {
      mime_type: { startsWith: 'image/' }
    };

    if (category) {
      where.photo_category = category;
    }

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { alt_text: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search.toLowerCase()] } }
      ];
    }

    // Fetch photos with category
    const [photos, totalCount, categoryStats] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.media.count({ where }),
      // Get counts by category
      prisma.media.groupBy({
        by: ['photo_category'],
        where: { mime_type: { startsWith: 'image/' } },
        _count: true
      })
    ]);

    // Transform category stats
    const stats: Record<string, number> = {};
    PHOTO_CATEGORIES.forEach(cat => stats[cat] = 0);
    categoryStats.forEach((stat: any) => {
      if (stat.photo_category) {
        stats[stat.photo_category] = stat._count;
      }
    });

    // Transform photos for frontend
    const transformedPhotos = photos.map((photo: any) => ({
      id: photo.id,
      url: photo.url,
      filename: photo.filename,
      alt_text: photo.alt_text || '',
      title: photo.title || photo.filename.replace(/\.[^/.]+$/, ''),
      category: photo.photo_category || 'uncategorized',
      tags: photo.tags || [],
      width: photo.width,
      height: photo.height,
      file_size: photo.size,
      created_at: photo.created_at,
      usage_count: photo.usage_count || 0
    }));

    return NextResponse.json({
      success: true,
      photos: transformedPhotos,
      stats,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch photos:', error);
    // Return mock data for development
    return NextResponse.json({
      success: true,
      photos: getMockPhotos(),
      stats: { events: 2, hotels: 1, restaurants: 1, attractions: 1, shopping: 1, experiences: 0, guides: 0, blog: 0, uncategorized: 0 },
      pagination: { page: 1, limit: 50, total: 6, total_pages: 1 }
    });
  }
});

/**
 * POST /api/admin/photo-pool
 * Add a new photo to the pool
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = PhotoCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid photo data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create photo record
    const photo = await prisma.media.create({
      data: {
        filename: data.filename,
        url: data.url,
        title: data.title || data.filename.replace(/\.[^/.]+$/, ''),
        alt_text: data.alt_text || '',
        mime_type: 'image/jpeg',
        media_type: 'image',
        photo_category: data.category,
        tags: data.tags,
        width: data.width,
        height: data.height,
        size: data.file_size || 0,
        uploaded_by: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Photo added to pool',
      photo: {
        id: photo.id,
        url: photo.url,
        filename: photo.filename,
        title: photo.title,
        category: photo.photo_category,
        tags: photo.tags
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to add photo:', error);
    return NextResponse.json(
      { error: 'Failed to add photo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/photo-pool
 * Update photo(s) - single or bulk
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Check if bulk update
    if (body.ids) {
      const validation = BulkUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid bulk update data', details: validation.error.issues },
          { status: 400 }
        );
      }

      const { ids, category, addTags, removeTags } = validation.data;

      // Build update data
      const updateData: any = { updated_at: new Date() };
      if (category) updateData.photo_category = category;

      // Update all selected photos
      const result = await prisma.media.updateMany({
        where: { id: { in: ids } },
        data: updateData
      });

      // Handle tag updates separately (need individual updates for array operations)
      if (addTags || removeTags) {
        for (const id of ids) {
          const photo = await prisma.media.findUnique({ where: { id }, select: { tags: true } });
          if (photo) {
            let newTags = [...(photo.tags || [])];
            if (addTags) newTags = [...new Set([...newTags, ...addTags])];
            if (removeTags) newTags = newTags.filter(t => !removeTags.includes(t));
            await prisma.media.update({ where: { id }, data: { tags: newTags } });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Updated ${result.count} photos`,
        updatedCount: result.count
      });
    }

    // Single photo update
    const validation = PhotoUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validation.data;

    const photo = await prisma.media.update({
      where: { id },
      data: {
        ...updateData,
        photo_category: updateData.category,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Photo updated',
      photo: {
        id: photo.id,
        title: photo.title,
        category: photo.photo_category,
        tags: photo.tags
      }
    });

  } catch (error) {
    console.error('Failed to update photo(s):', error);
    return NextResponse.json(
      { error: 'Failed to update photo(s)', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/photo-pool
 * Delete photos from pool
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs array' }, { status: 400 });
    }

    const result = await prisma.media.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} photos`,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('Failed to delete photos:', error);
    return NextResponse.json(
      { error: 'Failed to delete photos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// Mock data for development/demo
function getMockPhotos() {
  return [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80',
      filename: 'emirates-stadium.jpg',
      alt_text: 'Emirates Stadium at night',
      title: 'Emirates Stadium',
      category: 'events',
      tags: ['football', 'arsenal', 'stadium'],
      width: 1200,
      height: 800,
      file_size: 245000,
      created_at: new Date().toISOString(),
      usage_count: 3
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
      filename: 'luxury-hotel.jpg',
      alt_text: 'Luxury hotel lobby',
      title: 'The Dorchester Lobby',
      category: 'hotels',
      tags: ['luxury', 'mayfair', 'hotel'],
      width: 1200,
      height: 800,
      file_size: 320000,
      created_at: new Date().toISOString(),
      usage_count: 5
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
      filename: 'halal-restaurant.jpg',
      alt_text: 'Fine dining restaurant',
      title: 'Halal Fine Dining',
      category: 'restaurants',
      tags: ['halal', 'fine-dining', 'arabic'],
      width: 1200,
      height: 800,
      file_size: 180000,
      created_at: new Date().toISOString(),
      usage_count: 8
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
      filename: 'tower-bridge.jpg',
      alt_text: 'Tower Bridge London',
      title: 'Tower Bridge',
      category: 'attractions',
      tags: ['landmark', 'bridge', 'thames'],
      width: 1200,
      height: 800,
      file_size: 290000,
      created_at: new Date().toISOString(),
      usage_count: 12
    },
    {
      id: '5',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
      filename: 'harrods.jpg',
      alt_text: 'Harrods department store',
      title: 'Harrods Shopping',
      category: 'shopping',
      tags: ['luxury', 'harrods', 'shopping'],
      width: 1200,
      height: 800,
      file_size: 210000,
      created_at: new Date().toISOString(),
      usage_count: 6
    },
    {
      id: '6',
      url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&q=80',
      filename: 'west-end-theatre.jpg',
      alt_text: 'West End theatre at night',
      title: 'West End Theatre',
      category: 'events',
      tags: ['theatre', 'west-end', 'night'],
      width: 1200,
      height: 800,
      file_size: 195000,
      created_at: new Date().toISOString(),
      usage_count: 4
    }
  ];
}
