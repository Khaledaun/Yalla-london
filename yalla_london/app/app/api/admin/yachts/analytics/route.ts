/**
 * Admin Yacht Analytics Dashboard API
 * GET: Return comprehensive dashboard analytics
 *   - Fleet stats (total, by type, by status, avg price)
 *   - Inquiry stats (total, this month, conversion rate, avg response time)
 *   - Destination stats (yachts per destination, most popular)
 *   - Revenue indicators (booked inquiries, avg budget)
 *   - Recent activity (last 10 inquiries, last 5 yacht updates)
 *
 * Uses Promise.allSettled so a single failing query (e.g. migration not yet
 * applied, PgBouncer connection limit) never causes an HTTP 500.
 * Each query falls back to a safe zero/empty value on failure.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminOrCronAuth } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const dynamic = 'force-dynamic'

/** Extract the fulfilled value or return the fallback if the query failed. */
function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  if (result.status === 'fulfilled') return result.value
  console.warn('[admin-yachts] analytics query failed:', result.reason?.message ?? result.reason)
  return fallback
}

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import('@/lib/db')
    const url = request.nextUrl

    const siteId = url.searchParams.get('siteId') || getDefaultSiteId()

    // Calculate start of current month for "this month" queries
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Run all queries in parallel — allSettled so no single failure causes 500
    const results = await Promise.allSettled([
      // ─── Fleet stats ─────────────────────────  [0–5]
      prisma.yacht.count({ where: { siteId } }),
      prisma.yacht.count({ where: { siteId, status: 'active' } }),
      prisma.yacht.count({ where: { siteId, featured: true } }),
      prisma.yacht.groupBy({ by: ['type'], where: { siteId }, _count: { id: true } }),
      prisma.yacht.groupBy({ by: ['status'], where: { siteId }, _count: { id: true } }),
      prisma.yacht.aggregate({
        where: { siteId, pricePerWeekLow: { not: null } },
        _avg: { pricePerWeekLow: true },
      }),

      // ─── Inquiry stats ───────────────────────  [6–9]
      prisma.charterInquiry.count({ where: { siteId } }),
      prisma.charterInquiry.count({ where: { siteId, createdAt: { gte: monthStart } } }),
      prisma.charterInquiry.groupBy({ by: ['status'], where: { siteId }, _count: { id: true } }),
      prisma.charterInquiry.aggregate({
        where: { siteId, budget: { not: null } },
        _avg: { budget: true },
      }),

      // ─── Destination stats ───────────────────  [10]
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

      // ─── Recent activity ─────────────────────  [11–12]
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

    // Extract each result with safe fallbacks
    const totalYachts        = settled(results[0] as PromiseSettledResult<number>, 0)
    const activeYachts       = settled(results[1] as PromiseSettledResult<number>, 0)
    const featuredYachts     = settled(results[2] as PromiseSettledResult<number>, 0)
    const yachtsByType       = settled(results[3] as PromiseSettledResult<{ type: string; _count: { id: number } }[]>, [])
    const yachtsByStatus     = settled(results[4] as PromiseSettledResult<{ status: string; _count: { id: number } }[]>, [])
    const avgPriceResult     = settled(results[5] as PromiseSettledResult<{ _avg: { pricePerWeekLow: unknown } }>, { _avg: { pricePerWeekLow: null } })
    const totalInquiries     = settled(results[6] as PromiseSettledResult<number>, 0)
    const inquiriesThisMonth = settled(results[7] as PromiseSettledResult<number>, 0)
    const inquiriesByStatus  = settled(results[8] as PromiseSettledResult<{ status: string; _count: { id: number } }[]>, [])
    const avgBudgetResult    = settled(results[9] as PromiseSettledResult<{ _avg: { budget: unknown } }>, { _avg: { budget: null } })
    const yachtsPerDestination = settled(results[10] as PromiseSettledResult<{ id: string; name: string; slug: string; region: string | null; status: string; _count: { yachts: number; itineraries: number } }[]>, [])
    const recentInquiries    = settled(results[11] as PromiseSettledResult<unknown[]>, [])
    const recentYachtUpdates = settled(results[12] as PromiseSettledResult<unknown[]>, [])

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

    // Average response time — separate query, its own try-catch
    let avgResponseTimeHours: number | null = null
    try {
      const contactedInquiries = await prisma.charterInquiry.findMany({
        where: { siteId, status: { not: 'NEW' } },
        select: { createdAt: true, updatedAt: true },
        take: 50,
        orderBy: { updatedAt: 'desc' },
      })

      if (contactedInquiries.length > 0) {
        let totalHours = 0
        for (const inq of contactedInquiries) {
          const diffMs = new Date(inq.updatedAt).getTime() - new Date(inq.createdAt).getTime()
          totalHours += diffMs / (1000 * 60 * 60)
        }
        avgResponseTimeHours = Math.round((totalHours / contactedInquiries.length) * 10) / 10
      }
    } catch (err) {
      console.warn('[admin-yachts] avg response time query failed:', err instanceof Error ? err.message : err)
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
