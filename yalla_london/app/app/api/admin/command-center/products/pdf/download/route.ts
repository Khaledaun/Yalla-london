/**
 * PDF Download Tracking API
 *
 * Track downloads and capture leads.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
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
        pdfUrl: true,
        site: true,
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
        pdfGuideId: guideId,
        email: email || null,
        ip: request.headers.get("x-forwarded-for") || null,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    // Increment download count
    await prisma.pdfGuide.update({
      where: { id: guideId },
      data: {
        downloads: { increment: 1 },
      },
    });

    // If email provided, create/update lead
    if (email) {
      try {
        const existingLead = await prisma.lead.findFirst({
          where: { email, site_id: guide.site },
        });

        if (existingLead) {
          // Update lead score to reflect engagement
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              score: { increment: 5 },
            },
          });
        } else {
          await prisma.lead.create({
            data: {
              email,
              name: name || null,
              site_id: guide.site,
              lead_source: source || 'pdf_download',
              status: 'NEW',
              lead_type: 'GUIDE_DOWNLOAD',
              score: 20,
            },
          });
        }
      } catch (leadErr) {
        console.warn('[pdf-download] Lead tracking failed:', leadErr instanceof Error ? leadErr.message : leadErr);
      }
    }

    return NextResponse.json({
      success: true,
      downloadUrl: guide.pdfUrl,
      message: 'Download tracked successfully',
    });
  } catch (error) {
    console.error('[pdf-download] POST error:', error);
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
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const guideId = searchParams.get('guideId');
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause with correct schema fields
    const whereClause: any = {
      downloadedAt: { gte: startDate },
    };

    if (guideId) {
      whereClause.pdfGuideId = guideId;
    }

    const downloads = await prisma.pdfDownload.findMany({
      where: whereClause,
      orderBy: { downloadedAt: 'desc' },
      take: 100,
    });

    // Group by date
    const byDate: Record<string, number> = {};
    downloads.forEach((d) => {
      const date = d.downloadedAt.toISOString().split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    // Count leads (downloads with email)
    const leadsCount = downloads.filter((d) => d.email).length;

    return NextResponse.json({
      downloads: downloads.map((d) => ({
        id: d.id,
        guideId: d.pdfGuideId,
        email: d.email,
        downloadedAt: d.downloadedAt.toISOString(),
      })),
      stats: {
        total: downloads.length,
        leads: leadsCount,
        conversionRate: downloads.length > 0 ? ((leadsCount / downloads.length) * 100).toFixed(1) : '0',
      },
      byDate,
    });
  } catch (error) {
    console.error('[pdf-download] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
