/**
 * Leads API
 *
 * POST /api/leads - Create a new lead
 * GET /api/leads - List leads (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies, headers } from 'next/headers';

// Lead types
type LeadType = 'NEWSLETTER' | 'PDF_GUIDE' | 'QUOTE_REQUEST' | 'CONTACT';

interface CreateLeadInput {
  email: string;
  lead_type?: LeadType;
  source?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  name?: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLeadInput = await request.json();

    if (!body.email || !body.email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Get site context from headers (set by middleware)
    const headersList = await headers();
    const siteId = headersList.get('x-site-id') || 'yalla-london';

    // Get UTM data from cookies
    const cookieStore = await cookies();
    const utmSource = cookieStore.get('utm_source')?.value;
    const utmMedium = cookieStore.get('utm_medium')?.value;
    const utmCampaign = cookieStore.get('utm_campaign')?.value;
    const utmContent = cookieStore.get('utm_content')?.value;
    const utmTerm = cookieStore.get('utm_term')?.value;
    const visitorId = cookieStore.get('visitor_id')?.value;
    const sessionId = cookieStore.get('session_id')?.value;

    // Check if lead already exists for this site
    const existingLead = await prisma.lead.findUnique({
      where: {
        site_id_email: {
          site_id: siteId,
          email: body.email.toLowerCase().trim(),
        },
      },
    });

    if (existingLead) {
      // Update existing lead with new activity
      const updatedLead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          // Increase score for returning engagement
          score: { increment: 5 },
          // Update metadata with new tags
          metadata: {
            ...(existingLead.metadata as object || {}),
            ...(body.metadata || {}),
            tags: [
              ...((existingLead.metadata as any)?.tags || []),
              ...(body.tags || []),
            ].filter((v, i, a) => a.indexOf(v) === i), // dedupe
          },
          updated_at: new Date(),
        },
      });

      // Record activity
      await prisma.leadActivity.create({
        data: {
          lead_id: updatedLead.id,
          activity_type: body.lead_type === 'PDF_GUIDE' ? 'GUIDE_DOWNLOAD' : 'FORM_SUBMIT',
          source: body.source || 'website',
          metadata: {
            lead_type: body.lead_type,
            ...body.metadata,
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedLead.id,
          isNew: false,
        },
        message: 'Lead updated',
      });
    }

    // Calculate initial lead score based on type
    let initialScore = 10;
    if (body.lead_type === 'PDF_GUIDE') initialScore = 25;
    if (body.lead_type === 'QUOTE_REQUEST') initialScore = 50;
    if (body.lead_type === 'CONTACT') initialScore = 30;

    // Bonus for UTM tracking (indicates marketing attribution)
    if (utmSource) initialScore += 5;

    // Create new lead
    const lead = await prisma.lead.create({
      data: {
        site_id: siteId,
        email: body.email.toLowerCase().trim(),
        name: body.name,
        phone: body.phone,
        lead_type: body.lead_type || 'NEWSLETTER',
        source: body.source || 'website',
        score: initialScore,
        status: 'NEW',
        visitor_id: visitorId,
        session_id: sessionId,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        first_touch_at: new Date(),
        marketing_consent: true, // They submitted the form
        metadata: {
          tags: body.tags || [],
          ...body.metadata,
        },
      },
    });

    // Record initial activity
    await prisma.leadActivity.create({
      data: {
        lead_id: lead.id,
        activity_type: body.lead_type === 'PDF_GUIDE' ? 'GUIDE_DOWNLOAD' : 'FORM_SUBMIT',
        source: body.source || 'website',
        metadata: {
          lead_type: body.lead_type,
          initial_signup: true,
          ...body.metadata,
        },
      },
    });

    // TODO: Trigger email automation
    // - Send welcome email
    // - Deliver PDF guide if applicable
    // - Add to email sequence

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        isNew: true,
      },
      message: 'Lead created successfully',
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check for admin access
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');
    const leadType = searchParams.get('lead_type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (siteId) where.site_id = siteId;
    if (leadType) where.lead_type = leadType;
    if (status) where.status = status;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          activities: {
            orderBy: { created_at: 'desc' },
            take: 5,
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        leads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
