import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'
import { getDefaultSiteId } from '@/config/sites'

export const maxDuration = 60

/* ───────────────────── GET — Unified Contact Profile ───────────────────── */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const { prisma } = await import('@/lib/db')
  const siteId =
    request.headers.get('x-site-id') ||
    request.nextUrl.searchParams.get('siteId') ||
    getDefaultSiteId()

  try {
    // Try to find as Lead first, then Subscriber
    const [lead, subscriber] = await Promise.all([
      prisma.lead.findUnique({ where: { id } }),
      prisma.subscriber.findUnique({
        where: { id },
        include: { consent_logs: { orderBy: { timestamp: 'desc' }, take: 20 } },
      }),
    ])

    if (!lead && !subscriber) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const email = lead?.email || subscriber?.email || null
    const phone = lead?.phone || null

    // Parallel fetch of all related data
    const [
      opportunities,
      interactions,
      conversations,
      inquiries,
      leadScore,
    ] = await Promise.all([
      // Opportunities linked to this contact
      prisma.crmOpportunity.findMany({
        where: {
          siteId,
          OR: [
            ...(lead ? [{ leadId: lead.id }] : []),
            ...(subscriber ? [{ subscriberId: subscriber.id }] : []),
            ...(email ? [{ contactEmail: email }] : []),
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: {
          interactions: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),

      // Interaction history (initial fetch by lead only; re-fetched with opportunity IDs below)
      lead
        ? prisma.interactionLog.findMany({
            where: { siteId, leadId: lead.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : Promise.resolve([]),

      // Conversations (by email or phone)
      prisma.conversation.findMany({
        where: {
          siteId,
          OR: [
            ...(email ? [{ contactEmail: email }] : []),
            ...(phone ? [{ contactPhone: phone }] : []),
            ...(lead ? [{ leadId: lead.id }] : []),
            ...(subscriber ? [{ subscriberId: subscriber.id }] : []),
          ],
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 20,
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),

      // Charter inquiries (for Zenitha Yachts)
      email
        ? prisma.charterInquiry.findMany({
            where: { email, siteId },
            orderBy: { created_at: 'desc' },
            take: 10,
          })
        : [],

      // Lead score
      lead
        ? (async () => {
            try {
              const { scoreAndUpdateLead } = await import('@/lib/agents/crm/lead-scoring')
              return await scoreAndUpdateLead(lead.id)
            } catch {
              return lead.score || 0
            }
          })()
        : 0,
    ])

    // Re-fetch interactions with opportunity IDs now available
    const oppIds = opportunities.map(o => o.id)
    const allInteractions =
      oppIds.length > 0 || lead
        ? await prisma.interactionLog.findMany({
            where: {
              siteId,
              OR: [
                ...(lead ? [{ leadId: lead.id }] : []),
                ...(oppIds.length > 0 ? [{ opportunityId: { in: oppIds } }] : []),
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          })
        : interactions

    // Build unified profile
    const name =
      lead?.name ||
      [subscriber?.first_name, subscriber?.last_name].filter(Boolean).join(' ') ||
      email ||
      'Unknown'

    const profile = {
      id,
      name,
      email,
      phone,
      type: lead ? 'lead' : 'subscriber',
      score: leadScore,
      scoreFactor: lead?.score_factors || null,

      // Lead data
      lead: lead
        ? {
            id: lead.id,
            status: lead.status,
            source: lead.lead_source,
            type: lead.lead_type,
            interests: lead.interests_json,
            budget: lead.budget_range,
            travelDates: lead.travel_dates,
            partySize: lead.party_size,
            consent: lead.marketing_consent,
            consentAt: lead.consent_at,
            utm: {
              source: lead.utm_source,
              medium: lead.utm_medium,
              campaign: lead.utm_campaign,
            },
            createdAt: lead.created_at,
            updatedAt: lead.updated_at,
          }
        : null,

      // Subscriber data
      subscriber: subscriber
        ? {
            id: subscriber.id,
            email: subscriber.email,
            firstName: subscriber.first_name,
            lastName: subscriber.last_name,
            status: subscriber.status,
            source: subscriber.source,
            preferences: subscriber.preferences_json,
            engagementScore: subscriber.engagement_score,
            confirmedAt: subscriber.confirmed_at,
            unsubscribedAt: subscriber.unsubscribed_at,
            unsubscribeReason: subscriber.unsubscribe_reason,
            lastCampaignSent: subscriber.last_campaign_sent,
            consentLogs: subscriber.consent_logs,
            createdAt: subscriber.created_at,
            updatedAt: subscriber.updated_at,
          }
        : null,

      // Related records
      opportunities: opportunities.map(o => ({
        id: o.id,
        stage: o.stage,
        value: o.value,
        currency: o.currency,
        source: o.source,
        nextAction: o.nextAction,
        nextActionAt: o.nextActionAt,
        tags: o.tags,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        lastInteraction: o.interactions[0] || null,
      })),

      inquiries: inquiries.map(i => ({
        id: i.id,
        reference: i.referenceNumber,
        destination: i.destination,
        guestCount: i.guestCount,
        budget: i.budget,
        status: i.status,
        message: i.message,
        createdAt: i.created_at,
      })),

      conversations: conversations.map(c => ({
        id: c.id,
        channel: c.channel,
        status: c.status,
        summary: c.summary,
        sentiment: c.sentiment,
        lastMessageAt: c.lastMessageAt,
        messageCount: c.messages.length,
        lastMessage: c.messages[0]
          ? {
              content: c.messages[0].content?.substring(0, 200),
              direction: c.messages[0].direction,
              channel: c.messages[0].channel,
              createdAt: c.messages[0].createdAt,
            }
          : null,
      })),

      // Timeline (all interactions merged + sorted)
      timeline: allInteractions.map(i => ({
        id: i.id,
        type: i.interactionType,
        channel: i.channel,
        direction: i.direction,
        summary: i.summary,
        sentiment: i.sentiment,
        agentId: i.agentId,
        createdAt: i.createdAt,
      })),
    }

    return NextResponse.json(profile)
  } catch (err) {
    console.warn('[crm-contact] GET error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to load contact' }, { status: 500 })
  }
}

/* ───────────────────── POST — Contact Actions ───────────────────── */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const { prisma } = await import('@/lib/db')
  const siteId =
    request.headers.get('x-site-id') ||
    getDefaultSiteId()
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'add_note': {
        const { summary, channel } = body
        if (!summary) return NextResponse.json({ error: 'summary required' }, { status: 400 })

        const interaction = await prisma.interactionLog.create({
          data: {
            siteId,
            leadId: id,
            channel: channel || 'internal',
            direction: 'outbound',
            interactionType: 'note',
            summary,
            agentId: 'admin',
          },
        })

        return NextResponse.json({ success: true, interaction })
      }

      case 'update_consent': {
        const { consentType, granted, legalBasis, processingPurposes } = body

        // Find subscriber by lead ID cross-reference
        const lead = await prisma.lead.findUnique({
          where: { id },
          select: { email: true },
        })

        if (!lead?.email) {
          return NextResponse.json({ error: 'No email found for this contact' }, { status: 400 })
        }

        const subscriber = await prisma.subscriber.findFirst({
          where: { email: lead.email, site_id: siteId },
        })

        if (!subscriber) {
          return NextResponse.json({ error: 'No subscriber record found' }, { status: 400 })
        }

        const consentLog = await prisma.consentLog.create({
          data: {
            site_id: siteId,
            subscriber_id: subscriber.id,
            consent_type: consentType || 'marketing',
            action: granted ? 'granted' : 'withdrawn',
            legal_basis: legalBasis || 'consent',
            processing_purposes: processingPurposes || ['marketing_emails'],
            consent_version: '1.0',
          },
        })

        // Update lead marketing consent
        await prisma.lead.update({
          where: { id },
          data: { marketing_consent: granted },
        })

        return NextResponse.json({ success: true, consentLog })
      }

      case 'trigger_sequence': {
        const { sequenceId } = body
        if (!sequenceId) return NextResponse.json({ error: 'sequenceId required' }, { status: 400 })

        // Find subscriber
        const lead = await prisma.lead.findUnique({
          where: { id },
          select: { email: true },
        })

        if (!lead?.email) {
          return NextResponse.json({ error: 'No email for this contact' }, { status: 400 })
        }

        const subscriber = await prisma.subscriber.findFirst({
          where: { email: lead.email, site_id: siteId },
        })

        if (!subscriber) {
          return NextResponse.json({ error: 'No subscriber found' }, { status: 400 })
        }

        // Create retention progress
        const progress = await prisma.retentionProgress.create({
          data: {
            sequenceId,
            subscriberId: subscriber.id,
            currentStep: 0,
            status: 'active',
            nextSendAt: new Date(), // First step immediately
          },
        })

        return NextResponse.json({ success: true, progress })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.warn('[crm-contact] POST error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
