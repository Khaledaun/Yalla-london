/**
 * PDF Download Tracking API
 *
 * Track downloads and capture leads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { guideId, email, name, source } = await request.json();

    if (!guideId) {
      return NextResponse.json(
        { error: 'Guide ID is required' },
        { status: 400 }
      );
    }

    // Get the guide
    const guide = await prisma.pdfGuide.findUnique({
      where: { id: guideId },
      select: {
        id: true,
        title: true,
        file_url: true,
        site_id: true,
      },
    });

    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found' },
        { status: 404 }
      );
    }

    // Track download
    await prisma.pdfDownload.create({
      data: {
        guide_id: guideId,
        lead_email: email || null,
        metadata: {
          name,
          source,
          downloadedAt: new Date().toISOString(),
        },
      },
    });

    // Increment download count
    await prisma.pdfGuide.update({
      where: { id: guideId },
      data: {
        download_count: { increment: 1 },
      },
    });

    // If email provided, create/update lead
    if (email) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          email,
          site_id: guide.site_id,
        },
      });

      if (existingLead) {
        // Update existing lead
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            last_interaction: new Date(),
            interaction_count: { increment: 1 },
            metadata: {
              ...(existingLead.metadata as any || {}),
              lastDownload: guideId,
              downloads: [
                ...((existingLead.metadata as any)?.downloads || []),
                { guideId, title: guide.title, date: new Date().toISOString() },
              ],
            },
          },
        });
      } else {
        // Create new lead
        await prisma.lead.create({
          data: {
            email,
            name: name || null,
            site_id: guide.site_id,
            source: 'pdf_download',
            status: 'new',
            metadata: {
              firstDownload: guideId,
              downloads: [{ guideId, title: guide.title, date: new Date().toISOString() }],
            },
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      downloadUrl: guide.file_url,
      message: 'Download tracked successfully',
    });
  } catch (error) {
    console.error('Failed to track download:', error);
    return NextResponse.json(
      { error: 'Failed to track download' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const guideId = searchParams.get('guideId');
    const siteId = searchParams.get('siteId');
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get downloads
    const whereClause: any = {
      downloaded_at: { gte: startDate },
    };

    if (guideId) {
      whereClause.guide_id = guideId;
    }

    const downloads = await prisma.pdfDownload.findMany({
      where: whereClause,
      orderBy: { downloaded_at: 'desc' },
      take: 100,
    });

    // Group by date
    const byDate: Record<string, number> = {};
    downloads.forEach((d) => {
      const date = d.downloaded_at.toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    // Count leads
    const leadsCount = downloads.filter((d) => d.lead_email).length;

    return NextResponse.json({
      downloads: downloads.map((d) => ({
        id: d.id,
        guideId: d.guide_id,
        email: d.lead_email,
        downloadedAt: d.downloaded_at.toISOString(),
      })),
      stats: {
        total: downloads.length,
        leads: leadsCount,
        conversionRate: downloads.length > 0 ? ((leadsCount / downloads.length) * 100).toFixed(1) : '0',
      },
      byDate,
    });
  } catch (error) {
    console.error('Failed to get download stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
