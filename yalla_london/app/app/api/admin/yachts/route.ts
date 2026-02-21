/**
 * Admin Yacht Fleet CRUD API
 * GET:  List yachts with pagination, search, filter, sort + count stats
 * POST: Create new yacht
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'

// ─── GET: List yachts ────────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const search = url.searchParams.get('search') || ''
    const type = url.searchParams.get('type') || ''
    const status = url.searchParams.get('status') || ''
    const destinationId = url.searchParams.get('destinationId') || ''
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Build where clause
    const where: Record<string, unknown> = { siteId }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    if (type) {
      where.type = type
    }
    if (status) {
      where.status = status
    }
    if (destinationId) {
      where.destinationId = destinationId
    }

    // Build orderBy — only allow known sortable fields
    const allowedSorts: Record<string, string> = {
      name: 'name',
      pricePerWeekLow: 'pricePerWeekLow',
      rating: 'rating',
      createdAt: 'createdAt',
    }
    const orderField = allowedSorts[sortBy] || 'createdAt'
    const orderBy = { [orderField]: sortOrder }

    // Fetch yachts + total count in parallel
    const [yachts, total, statsAgg] = await Promise.all([
      prisma.yacht.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          destination: {
            select: { id: true, name: true, slug: true, region: true },
          },
        },
      }),
      prisma.yacht.count({ where }),
      // Aggregate stats for this site
      Promise.all([
        prisma.yacht.count({ where: { siteId } }),
        prisma.yacht.count({ where: { siteId, status: 'active' } }),
        prisma.yacht.count({ where: { siteId, featured: true } }),
        prisma.yacht.count({ where: { siteId, status: 'pending_review' } }),
        prisma.yacht.groupBy({
          by: ['type'],
          where: { siteId },
          _count: { id: true },
        }),
      ]),
    ])

    const [totalAll, activeCount, featuredCount, pendingReviewCount, byType] = statsAgg

    const typeStats: Record<string, number> = {}
    for (const group of byType) {
      typeStats[group.type] = group._count.id
    }

    return NextResponse.json({
      yachts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        total: totalAll,
        active: activeCount,
        featured: featuredCount,
        pendingReview: pendingReviewCount,
      },
      stats: {
        total: totalAll,
        active: activeCount,
        featured: featuredCount,
        byType: typeStats,
      },
    })
  } catch (error) {
    console.error('[admin-yachts] GET fleet error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch yacht fleet' },
      { status: 500 }
    )
  }
})

// ─── POST: Create yacht ──────────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    // Validate required fields
    const { name, slug, type, siteId } = body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Yacht name is required' },
        { status: 400 }
      )
    }
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json(
        { error: 'Yacht slug is required' },
        { status: 400 }
      )
    }
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: 'Yacht type is required' },
        { status: 400 }
      )
    }
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      )
    }

    // Validate type enum
    const validTypes = ['SAILBOAT', 'CATAMARAN', 'MOTOR_YACHT', 'GULET', 'SUPERYACHT', 'POWER_CATAMARAN']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid yacht type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check slug uniqueness within site
    const existingSlug = await prisma.yacht.findFirst({
      where: { slug: slug.trim(), siteId },
    })
    if (existingSlug) {
      return NextResponse.json(
        { error: 'A yacht with this slug already exists for this site' },
        { status: 409 }
      )
    }

    const yacht = await prisma.yacht.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        type,
        siteId,
        source: body.source || 'MANUAL',
        externalId: body.externalId || null,
        // Specs
        length: body.length != null ? parseFloat(body.length) : null,
        beam: body.beam != null ? parseFloat(body.beam) : null,
        draft: body.draft != null ? parseFloat(body.draft) : null,
        yearBuilt: body.yearBuilt != null ? parseInt(body.yearBuilt) : null,
        builder: body.builder || null,
        model: body.model || null,
        // Capacity
        cabins: parseInt(body.cabins) || 0,
        berths: parseInt(body.berths) || 0,
        bathrooms: parseInt(body.bathrooms) || 0,
        crewSize: parseInt(body.crewSize) || 0,
        // Pricing
        pricePerWeekLow: body.pricePerWeekLow != null ? parseFloat(body.pricePerWeekLow) : null,
        pricePerWeekHigh: body.pricePerWeekHigh != null ? parseFloat(body.pricePerWeekHigh) : null,
        currency: body.currency || 'EUR',
        // Content
        description_en: body.description_en || null,
        description_ar: body.description_ar || null,
        features: body.features || null,
        images: body.images || null,
        waterSports: body.waterSports || null,
        // GCC Differentiators
        halalCateringAvailable: body.halalCateringAvailable === true,
        familyFriendly: body.familyFriendly === true,
        crewIncluded: body.crewIncluded === true,
        // Location
        homePort: body.homePort || null,
        cruisingArea: body.cruisingArea || null,
        // Ratings
        rating: body.rating != null ? parseFloat(body.rating) : null,
        // Status
        status: body.status || 'active',
        featured: body.featured === true,
        // Relation
        destinationId: body.destinationId || null,
      },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, region: true },
        },
      },
    })

    return NextResponse.json({ yacht }, { status: 201 })
  } catch (error) {
    console.error('[admin-yachts] POST create yacht error:', error)
    return NextResponse.json(
      { error: 'Failed to create yacht' },
      { status: 500 }
    )
  }
})
