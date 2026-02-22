/**
 * Admin Yacht Analytics Dashboard API
 * GET: Return comprehensive dashboard analytics
 *   - Fleet stats (total, by type, by status, avg price)
 *   - Inquiry stats (total, this month, conversion rate, avg response time)
 *   - Destination stats (yachts per destination, most popular)
 *   - Revenue indicators (booked inquiries, avg budget)
 *   - Recent activity (last 10 inquiries, last 5 yacht updates)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()

    // Calculate start of current month for "this month" queries
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel for performance
    const [
      // Fleet stats
      totalYachts,
      activeYachts,
      featuredYachts,
      yachtsByType,
      yachtsByStatus,
      avgPriceResult,
      // Inquiry stats
      totalInquiries,
      inquiriesThisMonth,
      inquiriesByStatus,
      avgBudgetResult,
      // Destination stats
      yachtsPerDestination,
      // Recent activity
      recentInquiries,
      recentYachtUpdates,
    ] = await Promise.all([
      // ─── Fleet stats ─────────────────────────
      prisma.yacht.count({ where: { siteId } }),
      prisma.yacht.count({ where: { siteId, status: 'active' } }),
      prisma.yacht.count({ where: { siteId, featured: true } }),
      prisma.yacht.groupBy({
        by: ['type'],
        where: { siteId },
        _count: { id: true },
      }),
      prisma.yacht.groupBy({
        by: ['status'],
        where: { siteId },
        _count: { id: true },
      }),
      prisma.yacht.aggregate({
        where: { siteId, pricePerWeekLow: { not: null } },
        _avg: { pricePerWeekLow: true },
      }),

      // ─── Inquiry stats ───────────────────────
      prisma.charterInquiry.count({ where: { siteId } }),
      prisma.charterInquiry.count({
        where: { siteId, createdAt: { gte: monthStart } },
      }),
      prisma.charterInquiry.groupBy({
        by: ['status'],
        where: { siteId },
        _count: { id: true },
      }),
      prisma.charterInquiry.aggregate({
        where: { siteId, budget: { not: null } },
        _avg: { budget: true },
      }),

      // ─── Destination stats ───────────────────
      prisma.yachtDestination.findMany({
        where: { siteId },
        select: {
          id: true,
          name: true,
          slug: true,
          region: true,
          status: true,
          _count: { select: { yachts: true, itineraries: true } },
        },
        orderBy: { name: 'asc' },
      }),

      // ─── Recent activity ─────────────────────
      prisma.charterInquiry.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          referenceNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          destination: true,
          budget: true,
          budgetCurrency: true,
          createdAt: true,
          yacht: { select: { id: true, name: true } },
        },
      }),
      prisma.yacht.findMany({
        where: { siteId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          featured: true,
          updatedAt: true,
          destination: { select: { id: true, name: true } },
        },
      }),
    ])

    // ─── Compute derived stats ───────────────────

    // Fleet by type
    const byType: Record<string, number> = {}
    for (const group of yachtsByType) {
      byType[group.type] = group._count.id
    }

    // Fleet by status
    const byStatus: Record<string, number> = {}
    for (const group of yachtsByStatus) {
      byStatus[group.status] = group._count.id
    }

    // Inquiry stats by status
    const inquiryByStatus: Record<string, number> = {}
    let bookedCount = 0
    for (const group of inquiriesByStatus) {
      inquiryByStatus[group.status] = group._count.id
      if (group.status === 'BOOKED') {
        bookedCount = group._count.id
      }
    }

    const conversionRate = totalInquiries > 0
      ? Math.round((bookedCount / totalInquiries) * 10000) / 100
      : 0

    // Most popular destination (by yacht count)
    const sortedDestinations = [...yachtsPerDestination].sort(
      (a, b) => b._count.yachts - a._count.yachts
    )
    const mostPopularDestination = sortedDestinations.length > 0
      ? {
          id: sortedDestinations[0].id,
          name: sortedDestinations[0].name,
          yachtCount: sortedDestinations[0]._count.yachts,
        }
      : null

    // Average response time: time between inquiry creation and first status change from NEW
    // Approximation: use inquiries that have moved past NEW status
    const contactedInquiries = await prisma.charterInquiry.findMany({
      where: {
        siteId,
        status: { not: 'NEW' },
      },
      select: { createdAt: true, updatedAt: true },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    })

    let avgResponseTimeHours: number | null = null
    if (contactedInquiries.length > 0) {
      let totalHours = 0
      for (const inq of contactedInquiries) {
        const diffMs = new Date(inq.updatedAt).getTime() - new Date(inq.createdAt).getTime()
        totalHours += diffMs / (1000 * 60 * 60)
      }
      avgResponseTimeHours = Math.round((totalHours / contactedInquiries.length) * 10) / 10
    }

    return NextResponse.json({
      fleet: {
        total: totalYachts,
        active: activeYachts,
        featured: featuredYachts,
        byType,
        byStatus,
        avgPricePerWeek: avgPriceResult._avg.pricePerWeekLow
          ? Number(avgPriceResult._avg.pricePerWeekLow)
          : null,
      },
      inquiries: {
        total: totalInquiries,
        thisMonth: inquiriesThisMonth,
        byStatus: inquiryByStatus,
        conversionRate,
        bookedCount,
        avgResponseTimeHours,
      },
      destinations: {
        total: yachtsPerDestination.length,
        list: yachtsPerDestination.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          region: d.region,
          status: d.status,
          yachtCount: d._count.yachts,
          itineraryCount: d._count.itineraries,
        })),
        mostPopular: mostPopularDestination,
      },
      revenue: {
        totalBooked: bookedCount,
        avgBudget: avgBudgetResult._avg.budget
          ? Number(avgBudgetResult._avg.budget)
          : null,
      },
      recentActivity: {
        inquiries: recentInquiries,
        yachtUpdates: recentYachtUpdates,
      },
    })
  } catch (error) {
    console.error('[admin-yachts] GET analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch yacht analytics' },
      { status: 500 }
    )
  }
})
