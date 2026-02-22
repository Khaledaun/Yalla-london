/**
 * Admin Yacht Destinations CRUD API
 * GET:    List destinations with yacht counts
 * POST:   Create new destination
 * PUT:    Update existing destination
 * DELETE:  Soft-delete destination (set status to 'inactive')
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'

// ─── GET: List destinations ──────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()
    const region = url.searchParams.get('region') || ''
    const status = url.searchParams.get('status') || ''

    const where: Record<string, unknown> = { siteId }
    if (region) {
      where.region = region
    }
    if (status) {
      where.status = status
    }

    const destinations = await prisma.yachtDestination.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { yachts: true, itineraries: true },
        },
      },
    })

    return NextResponse.json({
      destinations: destinations.map((d: typeof destinations[number]) => ({
        ...d,
        yachtCount: d._count.yachts,
        itineraryCount: d._count.itineraries,
      })),
      total: destinations.length,
    })
  } catch (error) {
    console.error('[admin-yachts] GET destinations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch destinations' },
      { status: 500 }
    )
  }
})

// ─── POST: Create destination ────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    const { name, slug, region, siteId } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Destination name is required' },
        { status: 400 }
      )
    }
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json(
        { error: 'Destination slug is required' },
        { status: 400 }
      )
    }
    if (!region || typeof region !== 'string') {
      return NextResponse.json(
        { error: 'Region is required' },
        { status: 400 }
      )
    }
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      )
    }

    // Validate region enum
    const validRegions = ['MEDITERRANEAN', 'ARABIAN_GULF', 'RED_SEA', 'INDIAN_OCEAN', 'CARIBBEAN', 'SOUTHEAST_ASIA']
    if (!validRegions.includes(region)) {
      return NextResponse.json(
        { error: `Invalid region. Must be one of: ${validRegions.join(', ')}` },
        { status: 400 }
      )
    }

    // Check slug uniqueness within site
    const existing = await prisma.yachtDestination.findFirst({
      where: { slug: slug.trim(), siteId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A destination with this slug already exists for this site' },
        { status: 409 }
      )
    }

    const destination = await prisma.yachtDestination.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        region,
        country: body.country || null,
        description_en: body.description_en || null,
        description_ar: body.description_ar || null,
        seasonStart: body.seasonStart || null,
        seasonEnd: body.seasonEnd || null,
        bestMonths: body.bestMonths || null,
        heroImage: body.heroImage || null,
        galleryImages: body.galleryImages || null,
        averagePricePerWeek: body.averagePricePerWeek != null ? parseFloat(body.averagePricePerWeek) : null,
        highlights: body.highlights || null,
        weatherInfo: body.weatherInfo || null,
        marinas: body.marinas || null,
        siteId,
        status: body.status || 'active',
      },
    })

    return NextResponse.json({ destination }, { status: 201 })
  } catch (error) {
    console.error('[admin-yachts] POST create destination error:', error)
    return NextResponse.json(
      { error: 'Failed to create destination' },
      { status: 500 }
    )
  }
})

// ─── PUT: Update destination ─────────────────────────────

export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Destination ID is required' },
        { status: 400 }
      )
    }

    // Verify destination exists
    const existing = await prisma.yachtDestination.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      )
    }

    // If slug is changing, check uniqueness
    if (body.slug && body.slug !== existing.slug) {
      const slugConflict = await prisma.yachtDestination.findFirst({
        where: {
          slug: body.slug.trim(),
          siteId: existing.siteId,
          id: { not: id },
        },
      })
      if (slugConflict) {
        return NextResponse.json(
          { error: 'A destination with this slug already exists for this site' },
          { status: 409 }
        )
      }
    }

    // Validate region enum if provided
    if (body.region) {
      const validRegions = ['MEDITERRANEAN', 'ARABIAN_GULF', 'RED_SEA', 'INDIAN_OCEAN', 'CARIBBEAN', 'SOUTHEAST_ASIA']
      if (!validRegions.includes(body.region)) {
        return NextResponse.json(
          { error: `Invalid region. Must be one of: ${validRegions.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Build update data — only include fields that were actually sent
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'slug', 'region', 'country',
      'description_en', 'description_ar',
      'seasonStart', 'seasonEnd', 'bestMonths',
      'heroImage', 'galleryImages',
      'highlights', 'weatherInfo', 'marinas',
      'status',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.averagePricePerWeek !== undefined) {
      updateData.averagePricePerWeek = body.averagePricePerWeek != null
        ? parseFloat(body.averagePricePerWeek)
        : null
    }

    const destination = await prisma.yachtDestination.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ destination })
  } catch (error) {
    console.error('[admin-yachts] PUT update destination error:', error)
    return NextResponse.json(
      { error: 'Failed to update destination' },
      { status: 500 }
    )
  }
})

// ─── DELETE: Soft-delete destination ─────────────────────

export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Destination ID is required' },
        { status: 400 }
      )
    }

    // Verify destination exists
    const existing = await prisma.yachtDestination.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      )
    }

    // Soft-delete: set status to 'inactive'
    const destination = await prisma.yachtDestination.update({
      where: { id },
      data: { status: 'inactive' },
    })

    return NextResponse.json({
      destination,
      message: 'Destination deactivated successfully',
    })
  } catch (error) {
    console.error('[admin-yachts] DELETE destination error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate destination' },
      { status: 500 }
    )
  }
})
