/**
 * Domain Management API
 *
 * GET    /api/admin/domains         - List all domains
 * POST   /api/admin/domains         - Add a new domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');
    const verified = searchParams.get('verified');

    const where: any = {};
    if (siteId) where.site_id = siteId;
    if (verified !== null) where.verified = verified === 'true';

    const domains = await prisma.domain.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ is_primary: 'desc' }, { hostname: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: domains,
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { site_id, hostname, is_primary } = body;

    if (!site_id || !hostname) {
      return NextResponse.json(
        { success: false, error: 'site_id and hostname are required' },
        { status: 400 }
      );
    }

    // Validate hostname format
    const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/;
    if (!hostnameRegex.test(hostname)) {
      return NextResponse.json(
        { success: false, error: 'Invalid hostname format' },
        { status: 400 }
      );
    }

    // Check if hostname already exists
    const existingDomain = await prisma.domain.findUnique({
      where: { hostname },
    });

    if (existingDomain) {
      return NextResponse.json(
        { success: false, error: 'Domain already exists' },
        { status: 409 }
      );
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // If setting as primary, unset other primaries for this site
    if (is_primary) {
      await prisma.domain.updateMany({
        where: { site_id, is_primary: true },
        data: { is_primary: false },
      });
    }

    const domain = await prisma.domain.create({
      data: {
        site_id,
        hostname: hostname.toLowerCase(),
        is_primary: is_primary || false,
        verification_token: verificationToken,
        verification_method: 'dns',
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
      verification_instructions: {
        method: 'dns',
        record_type: 'TXT',
        record_name: `_yalla-verify.${hostname}`,
        record_value: verificationToken,
        ttl: 300,
      },
    });
  } catch (error) {
    console.error('Error creating domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create domain' },
      { status: 500 }
    );
  }
}

function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'yalla-verify-';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
