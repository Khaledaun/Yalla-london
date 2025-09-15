import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { siteId, config } = await request.json();

    // Validate required fields
    if (!siteId || !config) {
      return NextResponse.json(
        { error: 'Site ID and config are required' },
        { status: 400 }
      );
    }

    // Find the site
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Save draft configuration
    const updatedSite = await prisma.site.update({
      where: { id: siteId },
      data: {
        homepage_json: config,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Draft saved successfully',
      site: updatedSite
    });

  } catch (error) {
    console.error('Save draft error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}