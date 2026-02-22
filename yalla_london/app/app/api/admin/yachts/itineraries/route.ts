/**
 * Admin Charter Itinerary CRUD API
 * GET:    List itineraries with destination, filter by destination/difficulty
 * POST:   Create new itinerary
 * PUT:    Update existing itinerary
 * DELETE:  Soft-delete itinerary (set status to 'inactive')
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'

// ─── GET: List itineraries ───────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const destinationId = url.searchParams.get('destinationId') || ''
    const difficulty = url.searchParams.get('difficulty') || ''
    const status = url.searchParams.get('status') || ''

    const where: Record<string, unknown> = { siteId }

    if (destinationId) {
      where.destinationId = destinationId
    }
    if (difficulty) {
      const validDifficulties = ['EASY', 'MODERATE', 'ADVANCED']
      if (validDifficulties.includes(difficulty)) {
        where.difficulty = difficulty
      }
    }
    if (status) {
      where.status = status
    }

    const [itineraries, total] = await Promise.all([
      prisma.charterItinerary.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          destination: {
            select: { id: true, name: true, slug: true, region: true },
          },
        },
      }),
      prisma.charterItinerary.count({ where }),
    ])

    return NextResponse.json({
      itineraries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[admin-yachts] GET itineraries error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch itineraries' },
      { status: 500 }
    )
  }
})

// ─── POST: Create itinerary ──────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    // Validate required fields
    const { title_en, slug, destinationId, duration, stops, siteId } = body

    if (!title_en || typeof title_en !== 'string' || !title_en.trim()) {
      return NextResponse.json(
        { error: 'Itinerary title (English) is required' },
        { status: 400 }
      )
    }
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json(
        { error: 'Itinerary slug is required' },
        { status: 400 }
      )
    }
    if (!destinationId || typeof destinationId !== 'string') {
      return NextResponse.json(
        { error: 'Destination ID is required' },
        { status: 400 }
      )
    }
    if (!duration || typeof duration !== 'number' || duration < 1) {
      return NextResponse.json(
        { error: 'Duration (days) must be a positive integer' },
        { status: 400 }
      )
    }
    if (!stops || !Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json(
        { error: 'At least one stop is required' },
        { status: 400 }
      )
    }
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      )
    }

    // Verify destination exists
    const destination = await prisma.yachtDestination.findUnique({
      where: { id: destinationId },
    })
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      )
    }

    // Check slug uniqueness within site
    const existingSlug = await prisma.charterItinerary.findFirst({
      where: { slug: slug.trim(), siteId },
    })
    if (existingSlug) {
      return NextResponse.json(
        { error: 'An itinerary with this slug already exists for this site' },
        { status: 409 }
      )
    }

    // Validate difficulty enum if provided
    if (body.difficulty) {
      const validDifficulties = ['EASY', 'MODERATE', 'ADVANCED']
      if (!validDifficulties.includes(body.difficulty)) {
        return NextResponse.json(
          { error: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` },
          { status: 400 }
        )
      }
    }

    const itinerary = await prisma.charterItinerary.create({
      data: {
        title_en: title_en.trim(),
        title_ar: body.title_ar || null,
        slug: slug.trim(),
        destinationId,
        duration,
        difficulty: body.difficulty || 'EASY',
        description_en: body.description_en || null,
        description_ar: body.description_ar || null,
        stops,
        recommendedYachtTypes: body.recommendedYachtTypes || null,
        estimatedCost: body.estimatedCost != null ? parseFloat(body.estimatedCost) : null,
        currency: body.currency || 'EUR',
        bestSeason: body.bestSeason || null,
        heroImage: body.heroImage || null,
        siteId,
        status: body.status || 'active',
      },
      include: {
        destination: {
          select: { id: true, name: true, slug: true, region: true },
        },
      },
    })

    return NextResponse.json({ itinerary }, { status: 201 })
  } catch (error) {
    console.error('[admin-yachts] POST create itinerary error:', error)
    return NextResponse.json(
      { error: 'Failed to create itinerary' },
      { status: 500 }
    )
  }
})

// ─── PUT: Update itinerary ───────────────────────────────

export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Itinerary ID is required' },
        { status: 400 }
      )
    }

    // Verify itinerary exists and belongs to the requesting site
    const siteId = body.siteId || getDefaultSiteId()
    const existing = await prisma.charterItinerary.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      )
    }
    if (existing.siteId !== siteId) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      )
    }

    // If slug is changing, check uniqueness
    if (body.slug && body.slug !== existing.slug) {
      const slugConflict = await prisma.charterItinerary.findFirst({
        where: {
          slug: body.slug.trim(),
          siteId: existing.siteId,
          id: { not: id },
        },
      })
      if (slugConflict) {
        return NextResponse.json(
          { error: 'An itinerary with this slug already exists for this site' },
          { status: 409 }
        )
      }
    }

    // Validate difficulty enum if provided
    if (body.difficulty) {
      const validDifficulties = ['EASY', 'MODERATE', 'ADVANCED']
      if (!validDifficulties.includes(body.difficulty)) {
        return NextResponse.json(
          { error: `Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate destination if changing
    if (body.destinationId && body.destinationId !== existing.destinationId) {
      const dest = await prisma.yachtDestination.findUnique({
        where: { id: body.destinationId },
      })
      if (!dest) {
        return NextResponse.json(
          { error: 'Destination not found' },
          { status: 404 }
        )
      }
    }

    // Build update data — only include fields that were sent
    const updateData: Record<string, unknown> = {}
    const stringFields = [
      'title_en', 'title_ar', 'slug', 'destinationId', 'difficulty',
      'description_en', 'description_ar', 'currency', 'bestSeason',
      'heroImage', 'status',
    ]
    const jsonFields = ['stops', 'recommendedYachtTypes']

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    for (const field of jsonFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }
    if (body.duration !== undefined) {
      updateData.duration = parseInt(body.duration)
    }
    if (body.estimatedCost !== undefined) {
      updateData.estimatedCost = body.estimatedCost != null
        ? parseFloat(body.estimatedCost)
        : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      )
    }

    const itinerary = await prisma.charterItinerary.update({
      where: { id },
      data: updateData,
      include: {
        destination: {
          select: { id: true, name: true, slug: true, region: true },
        },
      },
    })

    return NextResponse.json({ itinerary })
  } catch (error) {
    console.error('[admin-yachts] PUT update itinerary error:', error)
    return NextResponse.json(
      { error: 'Failed to update itinerary' },
      { status: 500 }
    )
  }
})

// ─── DELETE: Soft-delete itinerary ───────────────────────

export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Itinerary ID is required' },
        { status: 400 }
      )
    }

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()
    const existing = await prisma.charterItinerary.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      )
    }
    if (existing.siteId !== siteId) {
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      )
    }

    const itinerary = await prisma.charterItinerary.update({
      where: { id },
      data: { status: 'inactive' },
    })

    return NextResponse.json({
      itinerary,
      message: 'Itinerary deactivated successfully',
    })
  } catch (error) {
    console.error('[admin-yachts] DELETE itinerary error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate itinerary' },
      { status: 500 }
    )
  }
})
