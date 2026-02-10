/**
 * Domain Verification API
 *
 * POST /api/admin/domains/[id]/verify - Verify domain ownership via DNS
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from "@/lib/admin-middleware";

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (domain.verified) {
      return NextResponse.json({
        success: true,
        data: domain,
        message: 'Domain already verified',
      });
    }

    if (!domain.verification_token) {
      return NextResponse.json(
        { success: false, error: 'No verification token found' },
        { status: 400 }
      );
    }

    // Attempt to verify the domain
    const verified = await verifyDNS(domain.hostname, domain.verification_token);

    if (verified) {
      const updatedDomain = await prisma.domain.update({
        where: { id: params.id },
        data: {
          verified: true,
          verified_at: new Date(),
          ssl_status: 'active', // Vercel handles SSL automatically
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedDomain,
        message: 'Domain verified successfully',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'DNS verification failed',
        expected_record: {
          type: 'TXT',
          name: `_yalla-verify.${domain.hostname}`,
          value: domain.verification_token,
        },
        help: 'Make sure the TXT record is properly configured and has propagated (can take up to 48 hours)',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error verifying domain:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify domain' },
      { status: 500 }
    );
  }
}

/**
 * Verify DNS TXT record for domain ownership
 */
async function verifyDNS(hostname: string, expectedToken: string): Promise<boolean> {
  try {
    // Use DNS-over-HTTPS to check the TXT record
    const recordName = `_yalla-verify.${hostname}`;
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${recordName}&type=TXT`,
      {
        headers: {
          Accept: 'application/dns-json',
        },
      }
    );

    if (!response.ok) {
      console.error('DNS query failed:', response.status);
      return false;
    }

    const data = await response.json();

    // Check if we found the expected TXT record
    if (data.Answer && Array.isArray(data.Answer)) {
      for (const record of data.Answer) {
        if (record.type === 16) {
          // TXT record type
          // TXT records are returned with quotes, remove them
          const value = record.data.replace(/^"|"$/g, '');
          if (value === expectedToken) {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    console.error('DNS verification error:', error);
    return false;
  }
}
