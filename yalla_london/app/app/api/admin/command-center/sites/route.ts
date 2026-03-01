/**
 * Sites Management API
 *
 * List, create, update, and delete sites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Get all sites with stats
    const sites = await prisma.site.findMany({
      where: { is_active: true },
      include: {
        domains: {
          where: { is_primary: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Get aggregated stats for each site
    const sitesWithStats = await Promise.all(
      sites.map(async (site) => {
        const [articleCount, leadCount, pageViewCount] = await Promise.all([
          prisma.blogPost.count({
            where: { published: true, siteId: site.id },
          }).catch(() => 0),
          prisma.lead.count({
            where: { site_id: site.id },
          }).catch(() => 0),
          prisma.pageView.count({
            where: { site_id: site.id },
          }).catch(() => 0),
        ]);

        // Get revenue from conversions
        const revenue = await prisma.conversion.aggregate({
          where: {
            site_id: site.id,
            status: 'COMPLETED',
          },
          _sum: { commission: true },
        }).catch(() => ({ _sum: { commission: null } }));

        return {
          siteId: site.id,
          siteName: site.name,
          domain: site.domains[0]?.hostname || site.domain || `${site.slug}.arabaldives.com`,
          locale: site.default_locale as 'ar' | 'en',
          status: site.is_active ? 'active' : 'paused',
          traffic: pageViewCount,
          revenue: (revenue._sum.commission || 0) / 100, // Convert cents to dollars
          articles: articleCount,
          leads: leadCount,
        };
      })
    );

    return NextResponse.json({ sites: sitesWithStats });
  } catch (error) {
    console.error('Failed to get sites:', error);
    return NextResponse.json(
      { error: 'Failed to get sites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, slug, domain, locale, settings } = body;

    // Create the site
    const site = await prisma.site.create({
      data: {
        name,
        slug,
        domain,
        default_locale: locale || 'en',
        direction: locale === 'ar' ? 'rtl' : 'ltr',
        settings_json: settings || {},
        is_active: true,
      },
    });

    // Create primary domain if provided
    if (domain) {
      await prisma.domain.create({
        data: {
          site_id: site.id,
          hostname: domain,
          is_primary: true,
          verified: false,
          verification_method: 'dns',
          verification_token: crypto.randomUUID(),
        },
      });
    }

    return NextResponse.json({ site, success: true });
  } catch (error) {
    console.error('Failed to create site:', error);
    return NextResponse.json(
      { error: 'Failed to create site' },
      { status: 500 }
    );
  }
}
