/**
 * Audit Logs Admin API
 *
 * GET /api/admin/audit-logs - List audit logs with pagination and filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { prisma } from '@/lib/db'

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause from filters
    const where: Record<string, unknown> = {}

    if (action) {
      where.action = action
    }

    if (resource) {
      where.resource = resource
    }

    if (userId) {
      where.userId = userId
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        (where.timestamp as Record<string, unknown>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.timestamp as Record<string, unknown>).lte = new Date(endDate)
      }
    }

    const skip = (page - 1) * limit

    // Run count and query in parallel for better performance
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
    ])

    const pages = Math.ceil(total / limit)

    return NextResponse.json({
      logs,
      total,
      page,
      pages,
    })
  } catch (error) {
    console.error('Audit Logs API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
})
