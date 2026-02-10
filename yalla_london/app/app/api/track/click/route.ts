/**
 * Affiliate Click Tracking API
 *
 * POST /api/track/click - Record an affiliate click and redirect
 *
 * This endpoint:
 * 1. Records the click with attribution data
 * 2. Generates a tracking URL
 * 3. Returns the redirect URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackClick, getPartnerBySlug, generateAffiliateUrl } from '@/lib/domains/affiliate';
import { cookies } from 'next/headers';
import { publicLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const blocked = publicLimiter(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { partner_slug, target_url, resort_id, product_id, article_id, link_type } = body;

    if (!partner_slug || !target_url) {
      return NextResponse.json(
        { success: false, error: 'partner_slug and target_url are required' },
        { status: 400 }
      );
    }

    // Get partner
    const partner = await getPartnerBySlug(partner_slug);
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Get tenant context from headers
    const siteId = request.headers.get('x-site-id') || 'yalla-london';

    // Get visitor/session from cookies
    const cookieStore = await cookies();
    const visitorId = cookieStore.get('visitor_id')?.value;
    const sessionId = cookieStore.get('session_id')?.value || `s_${Date.now()}`;

    // Get UTM data from cookies
    const utmDataRaw = cookieStore.get('utm_data')?.value;
    let utmData: Record<string, string> = {};
    if (utmDataRaw) {
      try {
        utmData = JSON.parse(utmDataRaw);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Get referrer
    const referrer = request.headers.get('referer') || undefined;

    // Track the click
    const click = await trackClick({
      site_id: siteId,
      partner_id: partner.id,
      resort_id,
      product_id,
      article_id,
      link_type,
      session_id: sessionId,
      visitor_id: visitorId,
      utm_source: utmData.utm_source,
      utm_medium: utmData.utm_medium,
      utm_campaign: utmData.utm_campaign,
      utm_content: utmData.utm_content,
      utm_term: utmData.utm_term,
      referrer,
      landing_page: request.nextUrl.searchParams.get('landing_page') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    // Generate affiliate URL with tracking
    const redirectUrl = generateAffiliateUrl(partner, target_url, click.id);

    return NextResponse.json({
      success: true,
      data: {
        click_id: click.id,
        redirect_url: redirectUrl,
      },
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
