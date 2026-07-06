/**
 * Affiliate Tracking Service
 *
 * Handles affiliate click tracking, conversion recording, and analytics.
 */

import { prisma } from '@/lib/db';
import type {
  TrackClickInput,
  RecordConversionInput,
  AffiliateStats,
  AffiliatePartner,
  AffiliateClick,
  Conversion,
} from './types';

// ============================================================================
// CLICK TRACKING
// ============================================================================

/**
 * Track an affiliate click
 */
export async function trackClick(input: TrackClickInput): Promise<AffiliateClick> {
  const deviceType = detectDeviceType(input.user_agent);

  const click = await prisma.affiliateClick.create({
    data: {
      site_id: input.site_id,
      partner_id: input.partner_id,
      resort_id: input.resort_id,
      product_id: input.product_id,
      article_id: input.article_id,
      link_type: input.link_type,
      session_id: input.session_id,
      visitor_id: input.visitor_id,
      utm_source: input.utm_source,
      utm_medium: input.utm_medium,
      utm_campaign: input.utm_campaign,
      utm_content: input.utm_content,
      utm_term: input.utm_term,
      referrer: input.referrer,
      landing_page: input.landing_page,
      user_agent: input.user_agent,
      device_type: deviceType,
    },
  });

  return click as AffiliateClick;
}

/**
 * Get click by ID
 */
export async function getClick(clickId: string): Promise<AffiliateClick | null> {
  const click = await prisma.affiliateClick.findUnique({
    where: { id: clickId },
  });

  return click as AffiliateClick | null;
}

// ============================================================================
// CONVERSION TRACKING
// ============================================================================

/**
 * Record a conversion from an affiliate click
 */
export async function recordConversion(input: RecordConversionInput): Promise<Conversion> {
  // Get the click to get site_id and partner_id
  const click = await prisma.affiliateClick.findUnique({
    where: { id: input.click_id },
  });

  if (!click) {
    throw new Error('Click not found');
  }

  const conversion = await prisma.conversion.create({
    data: {
      site_id: click.site_id,
      click_id: input.click_id,
      partner_id: click.partner_id,
      booking_ref: input.booking_ref,
      booking_value: input.booking_value,
      commission: input.commission,
      currency: input.currency || 'USD',
      status: 'BOOKED',
      check_in: input.check_in,
      check_out: input.check_out,
    },
  });

  return conversion as Conversion;
}

/**
 * Update conversion status
 */
export async function updateConversionStatus(
  conversionId: string,
  status: 'COMPLETED' | 'CANCELLED' | 'PAID'
): Promise<Conversion> {
  const data: any = { status };

  if (status === 'PAID') {
    data.paid_at = new Date();
  } else if (status === 'COMPLETED') {
    data.confirmed_at = new Date();
  }

  const conversion = await prisma.conversion.update({
    where: { id: conversionId },
    data,
  });

  return conversion as Conversion;
}

// ============================================================================
// PARTNER MANAGEMENT
// ============================================================================

/**
 * Get all active partners
 */
export async function getActivePartners(): Promise<AffiliatePartner[]> {
  const partners = await prisma.affiliatePartner.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });

  return partners as AffiliatePartner[];
}

/**
 * Get partner by slug
 */
export async function getPartnerBySlug(slug: string): Promise<AffiliatePartner | null> {
  const partner = await prisma.affiliatePartner.findUnique({
    where: { slug },
  });

  return partner as AffiliatePartner | null;
}

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get affiliate stats for a site
 */
export async function getAffiliateStats(
  siteId: string,
  startDate: Date,
  endDate: Date
): Promise<AffiliateStats> {
  // Get click count
  const clickCount = await prisma.affiliateClick.count({
    where: {
      site_id: siteId,
      clicked_at: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get conversion stats
  const conversions = await prisma.conversion.findMany({
    where: {
      site_id: siteId,
      converted_at: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: 'CANCELLED' },
    },
  });

  const conversionCount = conversions.length;
  const totalRevenue = conversions.reduce((sum, c) => sum + c.booking_value, 0);
  const totalCommission = conversions.reduce((sum, c) => sum + c.commission, 0);

  return {
    total_clicks: clickCount,
    total_conversions: conversionCount,
    total_revenue: totalRevenue / 100, // Convert cents to dollars
    total_commission: totalCommission / 100,
    conversion_rate: clickCount > 0 ? (conversionCount / clickCount) * 100 : 0,
    average_order_value: conversionCount > 0 ? totalRevenue / 100 / conversionCount : 0,
    average_commission: conversionCount > 0 ? totalCommission / 100 / conversionCount : 0,
  };
}

/**
 * Get top performing content
 */
export async function getTopPerformingContent(
  siteId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 10
) {
  const clicks = await prisma.affiliateClick.groupBy({
    by: ['resort_id', 'article_id'],
    where: {
      site_id: siteId,
      clicked_at: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: true,
    orderBy: {
      _count: {
        _all: 'desc',
      },
    },
    take: limit,
  });

  return clicks;
}

/**
 * Get partner performance
 */
export async function getPartnerPerformance(
  siteId: string,
  startDate: Date,
  endDate: Date
) {
  const partnerStats = await prisma.conversion.groupBy({
    by: ['partner_id'],
    where: {
      site_id: siteId,
      converted_at: {
        gte: startDate,
        lte: endDate,
      },
      status: { not: 'CANCELLED' },
    },
    _count: true,
    _sum: {
      booking_value: true,
      commission: true,
    },
  });

  // Get partner names
  const partnerIds = partnerStats.map((s) => s.partner_id);
  const partners = await prisma.affiliatePartner.findMany({
    where: { id: { in: partnerIds } },
  });

  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  return partnerStats.map((stat) => ({
    partner: partnerMap.get(stat.partner_id),
    conversions: stat._count,
    revenue: (stat._sum.booking_value || 0) / 100,
    commission: (stat._sum.commission || 0) / 100,
  }));
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Detect device type from user agent
 */
function detectDeviceType(userAgent?: string): string {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      userAgent
    )
  ) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Generate affiliate URL with tracking
 */
export function generateAffiliateUrl(
  partner: AffiliatePartner,
  targetUrl: string,
  clickId: string
): string {
  const url = new URL(targetUrl);

  // Add affiliate ID if available
  if (partner.affiliate_id) {
    url.searchParams.set('affiliate_id', partner.affiliate_id);
  }

  // Add click ID for conversion tracking
  url.searchParams.set('subid', clickId);

  return url.toString();
}
