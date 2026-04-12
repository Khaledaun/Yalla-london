import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const maxDuration = 60

function getSiteId(request: NextRequest): string {
  return (
    request.headers.get('x-site-id') ||
    request.nextUrl.searchParams.get('siteId') ||
    getDefaultSiteId()
  )
}

/* ───────────────────── GET ───────────────────── */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { prisma } = await import('@/lib/db')
  const siteId = getSiteId(request)
  const view = request.nextUrl.searchParams.get('view') || 'overview'

  try {
    switch (view) {
      /* ── Overview KPIs ── */
      case 'overview': {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const [
          totalLeads,
          totalSubscribers,
          confirmedSubscribers,
          opportunityAgg,
          recentInteractions,
          recentLeads,
          opportunityStages,
        ] = await Promise.all([
          prisma.lead.count({ where: { site_id: siteId } }),
          prisma.subscriber.count({ where: { site_id: siteId } }),
          prisma.subscriber.count({ where: { site_id: siteId, status: 'CONFIRMED' } }),
          prisma.crmOpportunity.aggregate({
            where: { siteId },
            _sum: { value: true },
            _count: true,
          }),
          prisma.interactionLog.count({
            where: { siteId, createdAt: { gte: weekAgo } },
          }),
          prisma.lead.findMany({
            where: { site_id: siteId },
            orderBy: { updated_at: 'desc' },
            take: 10,
            select: {
              id: true, name: true, email: true, phone: true,
              lead_source: true, score: true, status: true,
              created_at: true, updated_at: true,
            },
          }),
          prisma.crmOpportunity.groupBy({
            by: ['stage'],
            where: { siteId },
            _count: true,
            _sum: { value: true },
          }),
        ])

        return NextResponse.json({
          kpis: {
            totalLeads,
            totalSubscribers,
            confirmedSubscribers,
            totalOpportunities: opportunityAgg._count,
            totalOpportunityValue: opportunityAgg._sum.value || 0,
            interactionsThisWeek: recentInteractions,
          },
          recentLeads,
          opportunityStages: opportunityStages.map(s => ({
            stage: s.stage,
            count: s._count,
            value: s._sum.value || 0,
          })),
        })
      }

      /* ── Contacts (merged leads + subscribers) ── */
      case 'contacts': {
        const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '25')
        const search = request.nextUrl.searchParams.get('search') || ''
        const skip = (page - 1) * limit

        const searchFilter = search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
                { phone: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}

        const [leads, leadCount, subscribers, subscriberCount] = await Promise.all([
          prisma.lead.findMany({
            where: { site_id: siteId, ...searchFilter },
            orderBy: { updated_at: 'desc' },
            take: limit,
            skip,
            select: {
              id: true, name: true, email: true, phone: true,
              lead_source: true, lead_type: true, score: true, status: true,
              marketing_consent: true, created_at: true, updated_at: true,
            },
          }),
          prisma.lead.count({ where: { site_id: siteId, ...searchFilter } }),
          prisma.subscriber.findMany({
            where: {
              site_id: siteId,
              ...(search
                ? {
                    OR: [
                      { email: { contains: search, mode: 'insensitive' as const } },
                      { first_name: { contains: search, mode: 'insensitive' as const } },
                      { last_name: { contains: search, mode: 'insensitive' as const } },
                    ],
                  }
                : {}),
            },
            orderBy: { updated_at: 'desc' },
            take: limit,
            skip,
            select: {
              id: true, email: true, first_name: true, last_name: true,
              status: true, source: true, engagement_score: true,
              confirmed_at: true, unsubscribed_at: true,
              created_at: true, updated_at: true,
            },
          }),
          prisma.subscriber.count({
            where: {
              site_id: siteId,
              ...(search
                ? {
                    OR: [
                      { email: { contains: search, mode: 'insensitive' as const } },
                      { first_name: { contains: search, mode: 'insensitive' as const } },
                      { last_name: { contains: search, mode: 'insensitive' as const } },
                    ],
                  }
                : {}),
            },
          }),
        ])

        // Merge into unified contact list
        const contacts = [
          ...leads.map(l => ({
            id: l.id,
            type: 'lead' as const,
            name: l.name || l.email || 'Unknown',
            email: l.email,
            phone: l.phone,
            source: l.lead_source,
            score: l.score,
            status: l.status,
            consent: l.marketing_consent,
            updatedAt: l.updated_at,
            createdAt: l.created_at,
          })),
          ...subscribers.map(s => ({
            id: s.id,
            type: 'subscriber' as const,
            name: [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email,
            email: s.email,
            phone: null,
            source: s.source,
            score: s.engagement_score,
            status: s.status,
            consent: s.status === 'CONFIRMED',
            updatedAt: s.updated_at,
            createdAt: s.created_at,
          })),
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

        return NextResponse.json({
          contacts,
          total: leadCount + subscriberCount,
          page,
          limit,
          pages: Math.ceil((leadCount + subscriberCount) / limit),
        })
      }

      /* ── Opportunities pipeline ── */
      case 'opportunities': {
        const stage = request.nextUrl.searchParams.get('stage')
        const opportunities = await prisma.crmOpportunity.findMany({
          where: {
            siteId,
            ...(stage ? { stage } : {}),
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
          include: {
            interactions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { summary: true, createdAt: true, channel: true },
            },
          },
        })

        const stages = ['new', 'qualifying', 'proposal', 'negotiation', 'won', 'lost']
        const pipeline = stages.map(s => ({
          stage: s,
          items: opportunities
            .filter(o => o.stage === s)
            .map(o => ({
              id: o.id,
              contactName: o.contactName,
              contactEmail: o.contactEmail,
              contactPhone: o.contactPhone,
              value: o.value,
              currency: o.currency,
              source: o.source,
              tags: o.tags,
              nextAction: o.nextAction,
              nextActionAt: o.nextActionAt,
              lastInteraction: o.interactions[0] || null,
              createdAt: o.createdAt,
              updatedAt: o.updatedAt,
            })),
          count: opportunities.filter(o => o.stage === s).length,
          totalValue: opportunities
            .filter(o => o.stage === s)
            .reduce((sum, o) => sum + (o.value || 0), 0),
        }))

        return NextResponse.json({ pipeline })
      }

      /* ── Subscribers ── */
      case 'subscribers': {
        const status = request.nextUrl.searchParams.get('status')
        const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '25')

        const where = {
          site_id: siteId,
          ...(status && status !== 'all' ? { status: status.toUpperCase() } : {}),
        }

        const [subscribers, total] = await Promise.all([
          prisma.subscriber.findMany({
            where,
            orderBy: { updated_at: 'desc' },
            take: limit,
            skip: (page - 1) * limit,
            select: {
              id: true, email: true, first_name: true, last_name: true,
              status: true, source: true, engagement_score: true,
              preferences_json: true, confirmed_at: true,
              unsubscribed_at: true, unsubscribe_reason: true,
              last_campaign_sent: true, created_at: true, updated_at: true,
            },
          }),
          prisma.subscriber.count({ where }),
        ])

        const statusCounts = await prisma.subscriber.groupBy({
          by: ['status'],
          where: { site_id: siteId },
          _count: true,
        })

        return NextResponse.json({
          subscribers,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          statusCounts: Object.fromEntries(
            statusCounts.map(s => [s.status, s._count])
          ),
        })
      }

      /* ── Consent audit log ── */
      case 'consent': {
        const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '25')

        const [logs, total] = await Promise.all([
          prisma.consentLog.findMany({
            where: { site_id: siteId },
            orderBy: { timestamp: 'desc' },
            take: limit,
            skip: (page - 1) * limit,
            include: {
              subscriber: {
                select: { email: true, first_name: true, last_name: true },
              },
            },
          }),
          prisma.consentLog.count({ where: { site_id: siteId } }),
        ])

        return NextResponse.json({
          logs,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid view parameter' }, { status: 400 })
    }
  } catch (err) {
    console.warn('[crm-api] GET error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to load CRM data' }, { status: 500 })
  }
}

/* ───────────────────── POST ───────────────────── */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { prisma } = await import('@/lib/db')
  const siteId = getSiteId(request)
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'create_lead': {
        const { name, email, phone, source, leadType } = body
        if (!email && !phone) {
          return NextResponse.json({ error: 'Email or phone required' }, { status: 400 })
        }

        const lead = await prisma.lead.create({
          data: {
            site_id: siteId,
            name: name || null,
            email: email || null,
            phone: phone || null,
            lead_source: source || 'manual',
            lead_type: leadType || 'GENERAL',
            status: 'NEW',
            score: 0,
          },
        })

        return NextResponse.json({ success: true, lead })
      }

      case 'update_lead': {
        const { leadId, ...fields } = body
        if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

        // Only allow safe fields
        const safeFields: Record<string, unknown> = {}
        const allowedFields = ['name', 'email', 'phone', 'status', 'lead_source', 'marketing_consent', 'interests_json']
        for (const key of allowedFields) {
          if (fields[key] !== undefined) safeFields[key] = fields[key]
        }

        const lead = await prisma.lead.update({
          where: { id: leadId },
          data: safeFields,
        })

        return NextResponse.json({ success: true, lead })
      }

      case 'update_opportunity_stage': {
        const { opportunityId, stage } = body
        if (!opportunityId || !stage) {
          return NextResponse.json({ error: 'opportunityId and stage required' }, { status: 400 })
        }

        const validStages = ['new', 'qualifying', 'proposal', 'negotiation', 'won', 'lost']
        if (!validStages.includes(stage)) {
          return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
        }

        const opportunity = await prisma.crmOpportunity.update({
          where: { id: opportunityId },
          data: {
            stage,
            ...(stage === 'won' || stage === 'lost' ? { closedAt: new Date() } : {}),
          },
        })

        // Log the stage change as an interaction
        await prisma.interactionLog.create({
          data: {
            siteId,
            opportunityId: opportunity.id,
            channel: 'internal',
            direction: 'outbound',
            interactionType: 'stage_change',
            summary: `Opportunity moved to ${stage}`,
            agentId: 'admin',
          },
        })

        return NextResponse.json({ success: true, opportunity })
      }

      case 'update_subscriber_status': {
        const { subscriberId, status } = body
        if (!subscriberId || !status) {
          return NextResponse.json({ error: 'subscriberId and status required' }, { status: 400 })
        }

        const validStatuses = ['PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED']
        if (!validStatuses.includes(status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const subscriber = await prisma.subscriber.update({
          where: { id: subscriberId },
          data: {
            status,
            ...(status === 'UNSUBSCRIBED' ? { unsubscribed_at: new Date() } : {}),
            ...(status === 'CONFIRMED' ? { confirmed_at: new Date() } : {}),
          },
        })

        return NextResponse.json({ success: true, subscriber })
      }

      case 'log_interaction': {
        const { opportunityId, leadId, channel, direction, interactionType, summary } = body

        const interaction = await prisma.interactionLog.create({
          data: {
            siteId,
            opportunityId: opportunityId || null,
            leadId: leadId || null,
            channel: channel || 'internal',
            direction: direction || 'outbound',
            interactionType: interactionType || 'note',
            summary: summary || '',
            agentId: 'admin',
          },
        })

        return NextResponse.json({ success: true, interaction })
      }

      case 'score_lead': {
        const { leadId } = body
        if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

        const { scoreAndUpdateLead } = await import('@/lib/agents/crm/lead-scoring')
        const result = await scoreAndUpdateLead(leadId)

        return NextResponse.json({ success: true, score: result })
      }

      case 'create_opportunity': {
        const { contactName, contactEmail, contactPhone, value, source, leadId, inquiryId, subscriberId } = body
        if (!contactName && !contactEmail) {
          return NextResponse.json({ error: 'contactName or contactEmail required' }, { status: 400 })
        }

        const opportunity = await prisma.crmOpportunity.create({
          data: {
            siteId,
            contactName: contactName || '',
            contactEmail: contactEmail || null,
            contactPhone: contactPhone || null,
            stage: 'new',
            value: value || null,
            currency: 'GBP',
            source: source || 'manual',
            leadId: leadId || null,
            inquiryId: inquiryId || null,
            subscriberId: subscriberId || null,
          },
        })

        return NextResponse.json({ success: true, opportunity })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.warn('[crm-api] POST error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to process CRM action' }, { status: 500 })
  }
}
