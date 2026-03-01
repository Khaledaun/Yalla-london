/**
 * Domain Management API - Single Domain
 *
 * GET    /api/admin/domains/[id]         - Get domain details
 * PUT    /api/admin/domains/[id]         - Update domain
 * DELETE /api/admin/domains/[id]         - Delete domain
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const domain = await prisma.domain.findUnique({
      where: { id: params.id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: domain,
    });
  } catch (error) {
    console.error('Error fetching domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch domain' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { is_primary, ssl_status } = body;

    const existingDomain = await prisma.domain.findUnique({
      where: { id: params.id },
    });

    if (!existingDomain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      );
    }

    // If setting as primary, unset other primaries for this site
    if (is_primary && !existingDomain.is_primary) {
      await prisma.domain.updateMany({
        where: { site_id: existingDomain.site_id, is_primary: true },
        data: { is_primary: false },
      });
    }

    const domain = await prisma.domain.update({
      where: { id: params.id },
      data: {
        is_primary: is_primary ?? existingDomain.is_primary,
        ssl_status: ssl_status ?? existingDomain.ssl_status,
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: domain,
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update domain' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const domain = await prisma.domain.findUnique({
      where: { id: params.id },
    });

    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting the primary domain unless it's the only one
    if (domain.is_primary) {
      const otherDomains = await prisma.domain.count({
        where: { site_id: domain.site_id, id: { not: params.id } },
      });

      if (otherDomains > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete primary domain. Set another domain as primary first.' },
          { status: 400 }
        );
      }
    }

    await prisma.domain.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Domain deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete domain' },
      { status: 500 }
    );
  }
}
