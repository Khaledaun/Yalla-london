/**
 * PDF Guides API
 *
 * Manage PDF travel guides across all sites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get PDF guides
    const guides = await prisma.pdfGuide.findMany({
      where: {
        site_id: siteId || undefined,
        status: status || undefined,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    // Get download stats for each guide
    const guideStats = await Promise.all(
      guides.map(async (guide) => {
        // Get downloads in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentDownloads = await prisma.pdfDownload.count({
          where: {
            guide_id: guide.id,
            downloaded_at: { gte: thirtyDaysAgo },
          },
        });

        // Get leads from this guide
        const leadsFromGuide = await prisma.pdfDownload.count({
          where: {
            guide_id: guide.id,
            lead_email: { not: null },
          },
        });

        // Get site name
        const site = await prisma.site.findUnique({
          where: { id: guide.site_id },
          select: { name: true },
        });

        return {
          id: guide.id,
          title: guide.title,
          destination: guide.destination,
          template: guide.template,
          locale: guide.locale,
          siteId: guide.site_id,
          siteName: site?.name || 'Unknown',
          fileUrl: guide.file_url,
          fileSize: guide.file_size,
          status: guide.status,
          downloads: guide.download_count,
          recentDownloads,
          leadsGenerated: leadsFromGuide,
          conversionRate: guide.download_count > 0
            ? ((leadsFromGuide / guide.download_count) * 100).toFixed(1)
            : '0',
          createdAt: guide.created_at.toISOString(),
          updatedAt: guide.updated_at.toISOString(),
        };
      })
    );

    // Get aggregate stats
    const totalDownloads = guideStats.reduce((sum, g) => sum + g.downloads, 0);
    const totalLeads = guideStats.reduce((sum, g) => sum + g.leadsGenerated, 0);
    const activeGuides = guideStats.filter((g) => g.status === 'published').length;

    return NextResponse.json({
      guides: guideStats,
      stats: {
        total: guideStats.length,
        active: activeGuides,
        totalDownloads,
        totalLeads,
        avgConversionRate: totalDownloads > 0
          ? ((totalLeads / totalDownloads) * 100).toFixed(1)
          : '0',
      },
    });
  } catch (error) {
    console.error('Failed to get PDF guides:', error);
    return NextResponse.json(
      { error: 'Failed to get guides' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      destination,
      template,
      locale,
      siteId,
      sections,
      branding,
      status = 'draft',
    } = await request.json();

    // Create guide record
    const guide = await prisma.pdfGuide.create({
      data: {
        title,
        destination,
        template,
        locale,
        site_id: siteId,
        status,
        config_json: {
          sections,
          branding,
        },
        file_url: '', // Will be updated after generation
        file_size: 0,
        download_count: 0,
      },
    });

    return NextResponse.json({
      success: true,
      guide: {
        id: guide.id,
        title: guide.title,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error('Failed to create PDF guide:', error);
    return NextResponse.json(
      { error: 'Failed to create guide' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, title, status, sections, branding } = await request.json();

    const updateData: any = {};
    if (title) updateData.title = title;
    if (status) updateData.status = status;
    if (sections || branding) {
      updateData.config_json = { sections, branding };
    }

    await prisma.pdfGuide.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update PDF guide:', error);
    return NextResponse.json(
      { error: 'Failed to update guide' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Guide ID is required' },
        { status: 400 }
      );
    }

    // Delete downloads first
    await prisma.pdfDownload.deleteMany({
      where: { guide_id: id },
    });

    // Delete guide
    await prisma.pdfGuide.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete PDF guide:', error);
    return NextResponse.json(
      { error: 'Failed to delete guide' },
      { status: 500 }
    );
  }
}
