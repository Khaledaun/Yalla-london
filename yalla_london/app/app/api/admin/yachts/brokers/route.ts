/**
 * Admin Broker Partners API
 * GET:    List broker partners with performance stats
 * POST:   Add new broker partner
 * PUT:    Update broker info
 * DELETE:  Soft-delete broker (set status to 'inactive')
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminOrCronAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'

// ─── GET: List broker partners ───────────────────────────

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()
    const status = url.searchParams.get('status') || ''

    const where: Record<string, unknown> = { siteId }
    if (status) {
      where.status = status
    }

    const brokers = await prisma.brokerPartner.findMany({
      where,
      orderBy: { companyName: 'asc' },
    })

    // Compute performance stats for each broker
    const brokersWithStats = brokers.map((broker: typeof brokers[number]) => {
      const conversionRate = broker.totalLeadsSent > 0
        ? Math.round((broker.totalBookings / broker.totalLeadsSent) * 10000) / 100
        : 0

      return {
        ...broker,
        performance: {
          leadsSent: broker.totalLeadsSent,
          bookings: broker.totalBookings,
          conversionRate,
        },
      }
    })

    // Aggregate totals
    let totalLeads = 0
    let totalBookings = 0
    for (const b of brokers) {
      totalLeads += b.totalLeadsSent
      totalBookings += b.totalBookings
    }

    return NextResponse.json({
      brokers: brokersWithStats,
      total: brokers.length,
      stats: {
        totalBrokers: brokers.length,
        activeBrokers: brokers.filter((b: typeof brokers[number]) => b.status === 'active').length,
        totalLeadsSent: totalLeads,
        totalBookings,
        overallConversionRate: totalLeads > 0
          ? Math.round((totalBookings / totalLeads) * 10000) / 100
          : 0,
      },
    })
  } catch (error) {
    console.error('[admin-yachts] GET brokers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch broker partners' },
      { status: 500 }
    )
  }
})

// ─── POST: Add broker partner ────────────────────────────

export const POST = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    const { companyName, email, siteId } = body

    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      )
    }

    // Basic email format check
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const broker = await prisma.brokerPartner.create({
      data: {
        companyName: companyName.trim(),
        contactName: body.contactName || null,
        email: email.trim(),
        phone: body.phone || null,
        website: body.website || null,
        commissionRate: body.commissionRate != null ? parseFloat(body.commissionRate) : null,
        destinations: body.destinations || null,
        status: body.status || 'active',
        siteId,
      },
    })

    return NextResponse.json({ broker }, { status: 201 })
  } catch (error) {
    console.error('[admin-yachts] POST create broker error:', error)
    return NextResponse.json(
      { error: 'Failed to create broker partner' },
      { status: 500 }
    )
  }
})

// ─── PUT: Update broker partner ──────────────────────────

export const PUT = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const body = await request.json()

    const { id } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Broker ID is required' },
        { status: 400 }
      )
    }

    // Verify broker exists and belongs to the requesting site
    const siteId = body.siteId || getDefaultSiteId()
    const existing = await prisma.brokerPartner.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Broker partner not found' },
        { status: 404 }
      )
    }
    if (existing.siteId !== siteId) {
      return NextResponse.json(
        { error: 'Broker partner not found' },
        { status: 404 }
      )
    }

    // Build update data — only include provided fields
    const updateData: Record<string, unknown> = {}
    const stringFields = [
      'companyName', 'contactName', 'email', 'phone', 'website', 'status',
    ]

    for (const field of stringFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.commissionRate !== undefined) {
      updateData.commissionRate = body.commissionRate != null
        ? parseFloat(body.commissionRate)
        : null
    }

    if (body.destinations !== undefined) {
      updateData.destinations = body.destinations
    }

    // Performance stats — allow direct update of counters
    if (body.totalLeadsSent !== undefined) {
      updateData.totalLeadsSent = parseInt(body.totalLeadsSent) || 0
    }
    if (body.totalBookings !== undefined) {
      updateData.totalBookings = parseInt(body.totalBookings) || 0
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      )
    }

    const broker = await prisma.brokerPartner.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ broker })
  } catch (error) {
    console.error('[admin-yachts] PUT update broker error:', error)
    return NextResponse.json(
      { error: 'Failed to update broker partner' },
      { status: 500 }
    )
  }
})

// ─── DELETE: Soft-delete broker ──────────────────────────

export const DELETE = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Broker ID is required' },
        { status: 400 }
      )
    }

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()
    const existing = await prisma.brokerPartner.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Broker partner not found' },
        { status: 404 }
      )
    }
    if (existing.siteId !== siteId) {
      return NextResponse.json(
        { error: 'Broker partner not found' },
        { status: 404 }
      )
    }

    const broker = await prisma.brokerPartner.update({
      where: { id },
      data: { status: 'inactive' },
    })

    return NextResponse.json({
      broker,
      message: 'Broker partner deactivated successfully',
    })
  } catch (error) {
    console.error('[admin-yachts] DELETE broker error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate broker partner' },
      { status: 500 }
    )
  }
})
