/**
 * Affiliate Dashboard API
 *
 * Track affiliate revenue, partners, and performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'year' ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get affiliate partners
    const partners = await prisma.affiliatePartner.findMany({
      where: category !== 'all' ? { partner_type: category.toUpperCase() as any } : undefined,
      orderBy: { created_at: 'desc' },
    });

    // Get clicks for each partner
    const clicks = await prisma.affiliateClick.groupBy({
      by: ['partner_id'],
      where: {
        clicked_at: { gte: startDate },
      },
      _count: true,
    });

    // Get conversions for each partner
    const conversions = await prisma.conversion.groupBy({
      by: ['partner_id'],
      where: {
        converted_at: { gte: startDate },
      },
      _count: true,
      _sum: {
        commission: true,
        booking_value: true,
      },
    });

    // Map to response format
    const partnerStats = partners.map((partner) => {
      const clickData = clicks.find((c) => c.partner_id === partner.id);
      const conversionData = conversions.find((c) => c.partner_id === partner.id);

      const clickCount = clickData?._count || 0;
      const conversionCount = conversionData?._count || 0;
      const revenue = (conversionData?._sum?.commission || 0) / 100;

      return {
        id: partner.id,
        name: partner.name,
        logo: getPartnerLogo(partner.name),
        category: partner.partner_type.toLowerCase(),
        status: partner.is_active ? 'active' : 'inactive',
        commission: `${partner.commission_rate}%`,
        clicks: clickCount,
        conversions: conversionCount,
        revenue,
        conversionRate: clickCount > 0 ? (conversionCount / clickCount) * 100 : 0,
        pendingEarnings: revenue * 0.1, // Estimate pending
        lastPayout: null,
      };
    });

    // Sort by revenue
    partnerStats.sort((a, b) => b.revenue - a.revenue);

    // Calculate revenue by period
    const revenueByPeriod = await calculateRevenueByPeriod(startDate, days);

    // Calculate revenue by site
    const revenueBySite = await calculateRevenueBySite(startDate);

    return NextResponse.json({
      partners: partnerStats,
      revenueByPeriod,
      revenueBySite,
    });
  } catch (error) {
    console.error('Failed to get affiliate data:', error);
    return NextResponse.json(
      { error: 'Failed to get affiliate data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, partnerType, commissionRate, trackingDomain, affiliateId } = await request.json();

    const partner = await prisma.affiliatePartner.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        partner_type: partnerType.toUpperCase(),
        commission_rate: commissionRate,
        tracking_domain: trackingDomain,
        affiliate_id: affiliateId,
        is_active: true,
      },
    });

    return NextResponse.json({
      success: true,
      partner,
    });
  } catch (error) {
    console.error('Failed to create affiliate partner:', error);
    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}

async function calculateRevenueByPeriod(startDate: Date, days: number) {
  const periods = days <= 7 ? 7 : days <= 30 ? 4 : 12;
  const periodDays = Math.ceil(days / periods);
  const result = [];

  for (let i = 0; i < periods; i++) {
    const periodStart = new Date(startDate);
    periodStart.setDate(periodStart.getDate() + i * periodDays);

    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const conversions = await prisma.conversion.aggregate({
      where: {
        converted_at: {
          gte: periodStart,
          lt: periodEnd,
        },
        status: { in: ['COMPLETED', 'PAID'] },
      },
      _sum: { commission: true },
      _count: true,
    });

    const clicks = await prisma.affiliateClick.count({
      where: {
        clicked_at: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });

    result.push({
      period: `Week ${i + 1}`,
      revenue: (conversions._sum.commission || 0) / 100,
      clicks,
      conversions: conversions._count,
    });
  }

  return result;
}

async function calculateRevenueBySite(startDate: Date) {
  const sites = await prisma.site.findMany({
    where: { is_active: true },
  });

  const result = [];

  for (const site of sites) {
    const conversions = await prisma.conversion.aggregate({
      where: {
        site_id: site.id,
        converted_at: { gte: startDate },
        status: { in: ['COMPLETED', 'PAID'] },
      },
      _sum: { commission: true },
      _count: true,
    });

    const clicks = await prisma.affiliateClick.count({
      where: {
        site_id: site.id,
        clicked_at: { gte: startDate },
      },
    });

    // Get top partner for this site
    const topPartner = await prisma.conversion.groupBy({
      by: ['partner_id'],
      where: {
        site_id: site.id,
        converted_at: { gte: startDate },
      },
      _sum: { commission: true },
      orderBy: { _sum: { commission: 'desc' } },
      take: 1,
    });

    let topPartnerName = 'N/A';
    if (topPartner[0]?.partner_id) {
      const partner = await prisma.affiliatePartner.findUnique({
        where: { id: topPartner[0].partner_id },
      });
      topPartnerName = partner?.name || 'Unknown';
    }

    result.push({
      siteId: site.id,
      siteName: site.name,
      revenue: (conversions._sum.commission || 0) / 100,
      clicks,
      conversions: conversions._count,
      topPartner: topPartnerName,
    });
  }

  return result.sort((a, b) => b.revenue - a.revenue);
}

function getPartnerLogo(name: string): string {
  const logos: Record<string, string> = {
    'Booking.com': '🏨',
    Agoda: '🌴',
    GetYourGuide: '🎯',
    Viator: '🎒',
    'Allianz Travel': '🛡️',
    Skyscanner: '✈️',
  };
  return logos[name] || '🔗';
}
