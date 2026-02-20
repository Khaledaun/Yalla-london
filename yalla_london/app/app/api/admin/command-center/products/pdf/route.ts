/**
 * PDF Guides API
 *
 * Manage PDF travel guides across all sites.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get PDF guides
    const guides = await prisma.pdfGuide.findMany({
      where: {
        site: siteId || undefined,
        status: status || undefined,
      },
      orderBy: { createdAt: 'desc' },
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
            pdfGuideId: guide.id,
            downloadedAt: { gte: thirtyDaysAgo },
          },
        });

        // Get leads from this guide (downloads with an email)
        const leadsFromGuide = await prisma.pdfDownload.count({
          where: {
            pdfGuideId: guide.id,
            email: { not: null },
          },
        });

        return {
          id: guide.id,
          title: guide.title,
          slug: guide.slug,
          description: guide.description,
          style: guide.style,
          language: guide.language,
          siteId: guide.site,
          pdfUrl: guide.pdfUrl,
          status: guide.status,
          downloads: guide.downloads,
          recentDownloads,
          leadsGenerated: leadsFromGuide,
          conversionRate: guide.downloads > 0
            ? ((leadsFromGuide / guide.downloads) * 100).toFixed(1)
            : '0',
          createdAt: guide.createdAt.toISOString(),
          updatedAt: guide.updatedAt.toISOString(),
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
    console.error('[pdf-guides] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get guides' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const {
      title,
      slug,
      description,
      style = 'luxury',
      language = 'en',
      siteId,
      sections,
      branding,
      status = 'draft',
    } = await request.json();

    if (!title || !siteId) {
      return NextResponse.json(
        { error: 'title and siteId are required' },
        { status: 400 }
      );
    }

    // Generate slug from title if not provided
    const guideSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Create guide record
    const guide = await prisma.pdfGuide.create({
      data: {
        title,
        slug: guideSlug,
        description: description || null,
        site: siteId,
        style,
        language,
        status,
        contentSections: sections || [],
        htmlContent: branding ? JSON.stringify(branding) : null,
      },
    });

    return NextResponse.json({
      success: true,
      guide: {
        id: guide.id,
        title: guide.title,
        slug: guide.slug,
        status: guide.status,
      },
    });
  } catch (error) {
    console.error('[pdf-guides] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create guide' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { id, title, description, status, sections, style, language } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (style !== undefined) updateData.style = style;
    if (language !== undefined) updateData.language = language;
    if (sections !== undefined) updateData.contentSections = sections;

    await prisma.pdfGuide.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[pdf-guides] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update guide' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Guide ID is required' },
        { status: 400 }
      );
    }

    // Delete downloads first (cascade)
    await prisma.pdfDownload.deleteMany({
      where: { pdfGuideId: id },
    });

    // Delete guide
    await prisma.pdfGuide.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[pdf-guides] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete guide' },
      { status: 500 }
    );
  }
}
