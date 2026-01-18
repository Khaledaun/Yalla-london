/**
 * Affiliate Pool API
 * Manages affiliate links for hotels, tickets, activities, etc.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Partner types
const PARTNER_TYPES = [
  'hotel', 'ticket', 'restaurant', 'attraction',
  'experience', 'shopping', 'transport', 'car'
] as const;

// Validation schemas
const AffiliateQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val, 10), 100)).default('50'),
  type: z.enum(PARTNER_TYPES).optional(),
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional()
});

const AffiliateCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  partner_type: z.enum(PARTNER_TYPES),
  partner_name: z.string().optional(),
  affiliate_url: z.string().url('Valid URL is required'),
  tracking_id: z.string().optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  is_active: z.boolean().default(true)
});

const AffiliateUpdateSchema = AffiliateCreateSchema.partial().extend({
  id: z.string()
});

/**
 * GET /api/admin/affiliate-pool
 * Get affiliate links with filtering
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const validation = AffiliateQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { page, limit, type, search, active } = validation.data;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (type) {
      where.partner_type = type;
    }

    if (active !== undefined) {
      where.is_active = active === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partner_name: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search.toLowerCase()] } }
      ];
    }

    // Fetch affiliates
    const [affiliates, totalCount, typeStats] = await Promise.all([
      prisma.affiliatePartner.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.affiliatePartner.count({ where }),
      prisma.affiliatePartner.groupBy({
        by: ['partner_type'],
        _count: true
      })
    ]);

    // Calculate stats
    const stats: Record<string, number> = {};
    PARTNER_TYPES.forEach(t => stats[t] = 0);
    typeStats.forEach((stat: any) => {
      stats[stat.partner_type] = stat._count;
    });

    // Transform for frontend
    const transformedAffiliates = affiliates.map((a: any) => ({
      id: a.id,
      name: a.name,
      partner_type: a.partner_type,
      partner_name: a.partner_name || a.name,
      affiliate_url: a.api_endpoint || '',
      tracking_id: a.slug,
      commission_rate: a.commission_rate,
      description: a.contact_info?.description || '',
      tags: a.contact_info?.tags || [],
      is_active: a.is_active,
      clicks: a.contact_info?.clicks || 0,
      conversions: a.contact_info?.conversions || 0,
      revenue: a.contact_info?.revenue || 0,
      created_at: a.created_at,
      last_clicked_at: a.last_sync_at
    }));

    return NextResponse.json({
      success: true,
      affiliates: transformedAffiliates,
      stats,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch affiliates:', error);
    // Return mock data
    return NextResponse.json({
      success: true,
      affiliates: getMockAffiliates(),
      stats: { hotel: 2, ticket: 1, restaurant: 0, attraction: 0, experience: 1, shopping: 1, transport: 1, car: 0 },
      pagination: { page: 1, limit: 50, total: 6, total_pages: 1 }
    });
  }
});

/**
 * POST /api/admin/affiliate-pool
 * Create a new affiliate link
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = AffiliateCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid affiliate data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create affiliate record
    const affiliate = await prisma.affiliatePartner.create({
      data: {
        siteId: 'default',
        name: data.name,
        slug: data.tracking_id || data.name.toLowerCase().replace(/\s+/g, '-'),
        partner_type: data.partner_type,
        api_endpoint: data.affiliate_url,
        commission_rate: data.commission_rate,
        contact_info: {
          partner_name: data.partner_name,
          description: data.description,
          tags: data.tags,
          clicks: 0,
          conversions: 0,
          revenue: 0
        },
        is_active: data.is_active,
        createdById: 'admin',
        updatedById: 'admin'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Affiliate link created',
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        partner_type: affiliate.partner_type
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create affiliate:', error);
    return NextResponse.json(
      { error: 'Failed to create affiliate', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/affiliate-pool
 * Update an affiliate link
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = AffiliateUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validation.data;

    const affiliate = await prisma.affiliatePartner.update({
      where: { id },
      data: {
        name: updateData.name,
        partner_type: updateData.partner_type,
        api_endpoint: updateData.affiliate_url,
        commission_rate: updateData.commission_rate,
        is_active: updateData.is_active,
        contact_info: {
          partner_name: updateData.partner_name,
          description: updateData.description,
          tags: updateData.tags
        },
        updatedById: 'admin',
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Affiliate updated',
      affiliate: {
        id: affiliate.id,
        name: affiliate.name
      }
    });

  } catch (error) {
    console.error('Failed to update affiliate:', error);
    return NextResponse.json(
      { error: 'Failed to update affiliate', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/affiliate-pool
 * Delete affiliate links
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty IDs array' }, { status: 400 });
    }

    const result = await prisma.affiliatePartner.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} affiliate links`,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('Failed to delete affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to delete affiliates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// Mock data for development
function getMockAffiliates() {
  return [
    {
      id: '1',
      name: 'Booking.com London Hotels',
      partner_type: 'hotel',
      partner_name: 'Booking.com',
      affiliate_url: 'https://www.booking.com/city/gb/london.html?aid=123456',
      tracking_id: 'yalla_london_booking',
      commission_rate: 4,
      description: 'General London hotels affiliate link',
      tags: ['hotels', 'london', 'booking'],
      is_active: true,
      clicks: 1250,
      conversions: 45,
      revenue: 892.50,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      name: 'StubHub Premier League Tickets',
      partner_type: 'ticket',
      partner_name: 'StubHub',
      affiliate_url: 'https://www.stubhub.com/premier-league?affid=yalla',
      tracking_id: 'yalla_stubhub_pl',
      commission_rate: 8,
      description: 'Premier League football tickets',
      tags: ['football', 'tickets', 'premier-league'],
      is_active: true,
      clicks: 3200,
      conversions: 78,
      revenue: 2340.00,
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'GetYourGuide London Tours',
      partner_type: 'experience',
      partner_name: 'GetYourGuide',
      affiliate_url: 'https://www.getyourguide.com/london?partner_id=yalla',
      tracking_id: 'yalla_gyg',
      commission_rate: 8,
      description: 'London tours and activities',
      tags: ['tours', 'activities', 'sightseeing'],
      is_active: true,
      clicks: 890,
      conversions: 34,
      revenue: 612.00,
      created_at: new Date().toISOString()
    },
    {
      id: '4',
      name: 'The Dorchester Hotel',
      partner_type: 'hotel',
      partner_name: 'The Dorchester',
      affiliate_url: 'https://www.dorchestercollection.com/london/?ref=yalla',
      tracking_id: 'yalla_dorchester',
      commission_rate: 6,
      description: 'Luxury 5-star Mayfair hotel',
      tags: ['luxury', '5-star', 'mayfair'],
      is_active: true,
      clicks: 456,
      conversions: 12,
      revenue: 1560.00,
      created_at: new Date().toISOString()
    },
    {
      id: '5',
      name: 'Harrods Gift Cards',
      partner_type: 'shopping',
      partner_name: 'Harrods',
      affiliate_url: 'https://www.harrods.com/?affid=yalla',
      tracking_id: 'yalla_harrods',
      commission_rate: 3,
      description: 'Luxury department store shopping',
      tags: ['luxury', 'shopping', 'harrods'],
      is_active: true,
      clicks: 567,
      conversions: 23,
      revenue: 345.00,
      created_at: new Date().toISOString()
    },
    {
      id: '6',
      name: 'British Airways Flights',
      partner_type: 'transport',
      partner_name: 'British Airways',
      affiliate_url: 'https://www.britishairways.com/?affid=yalla',
      tracking_id: 'yalla_ba',
      commission_rate: 1.5,
      description: 'Flights to London',
      tags: ['flights', 'london', 'travel'],
      is_active: false,
      clicks: 234,
      conversions: 5,
      revenue: 125.00,
      created_at: new Date().toISOString()
    }
  ];
}
