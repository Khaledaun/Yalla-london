/**
 * Admin Charter Inquiry CRM API
 * GET: List inquiries with pagination, filter by status, search, sort
 * PUT: Update inquiry status, assign broker, add notes
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminOrCronAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'

// ─── GET: List inquiries ─────────────────────────────────

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') || ''
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Build where clause
    const where: Record<string, unknown> = { siteId }

    if (status) {
      // Validate status enum
      const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'SENT_TO_BROKER', 'BOOKED', 'LOST']
      if (validStatuses.includes(status)) {
        where.status = status
      }
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Build orderBy
    const allowedSorts: Record<string, string> = {
      createdAt: 'createdAt',
      status: 'status',
      budget: 'budget',
      lastName: 'lastName',
    }
    const orderField = allowedSorts[sortBy] || 'createdAt'
    const orderBy = { [orderField]: sortOrder }

    // Fetch inquiries, total, and status stats in parallel
    const [inquiries, total, statusCounts] = await Promise.all([
      prisma.charterInquiry.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          yacht: {
            select: { id: true, name: true, slug: true, type: true },
          },
        },
      }),
      prisma.charterInquiry.count({ where }),
      prisma.charterInquiry.groupBy({
        by: ['status'],
        where: { siteId },
        _count: { id: true },
      }),
    ])

    // Build status stats
    const byStatus: Record<string, number> = {}
    let totalAll = 0
    let bookedCount = 0
    for (const group of statusCounts) {
      byStatus[group.status] = group._count.id
      totalAll += group._count.id
      if (group.status === 'BOOKED') {
        bookedCount = group._count.id
      }
    }

    const conversionRate = totalAll > 0
      ? Math.round((bookedCount / totalAll) * 10000) / 100
      : 0

    return NextResponse.json({
      inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalAll,
        byStatus,
        conversionRate,
      },
    })
  } catch (error) {
    console.error('[admin-yachts] GET inquiries error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inquiries' },
      { status: 500 }
    )
  }
})

// ─── PUT: Update inquiry ─────────────────────────────────

export const PUT = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Inquiry ID is required' },
        { status: 400 }
      )
    }

    // Verify inquiry exists and belongs to the requesting site
    const siteId = body.siteId || request.nextUrl.searchParams.get('siteId') || getDefaultSiteId()
    const existing = await prisma.charterInquiry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404 }
      )
    }
    if (existing.siteId !== siteId) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Status update with validation
    if (body.status !== undefined) {
      const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'SENT_TO_BROKER', 'BOOKED', 'LOST']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = body.status
    }

    // Broker assignment
    if (body.brokerAssigned !== undefined) {
      updateData.brokerAssigned = body.brokerAssigned
    }

    // Broker notes
    if (body.brokerNotes !== undefined) {
      updateData.brokerNotes = body.brokerNotes
    }

    // Yacht assignment
    if (body.yachtId !== undefined) {
      updateData.yachtId = body.yachtId
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      )
    }

    const inquiry = await prisma.charterInquiry.update({
      where: { id },
      data: updateData,
      include: {
        yacht: {
          select: { id: true, name: true, slug: true, type: true },
        },
      },
    })

    return NextResponse.json({ inquiry })
  } catch (error) {
    console.error('[admin-yachts] PUT update inquiry error:', error)
    return NextResponse.json(
      { error: 'Failed to update inquiry' },
      { status: 500 }
    )
  }
})
