/**
 * Admin Authentication Middleware for Next.js App Router
 * Provides requireAdmin functionality for API routes
 *
 * SECURITY: Admin emails loaded ONLY from environment variables.
 * No hardcoded email addresses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface AdminAuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/** Load admin email whitelist from ADMIN_EMAILS env var only */
function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()).filter(Boolean)) || []
}

/**
 * Admin authentication middleware for App Router API routes
 * Returns NextResponse with 401 for unauthorized access
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin via session role (from JWT) OR email whitelist from env
    const userRole = (session.user as any).role
    const adminEmails = getAdminEmails()

    const isAdmin = userRole === 'admin' || adminEmails.includes(session.user.email)

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return null; // null = continue with the request
  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Wrapper function for admin-only API routes
 * Usage: export const GET = withAdminAuth(async (request) => { ... });
 */
export function withAdminAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdmin(request);
    if (authResult) {
      return authResult;
    }
    return handler(request);
  };
}

/**
 * Get current admin user from session
 */
export async function getCurrentAdminUser(request: NextRequest): Promise<{
  id: string;
  email: string;
  name?: string;
} | null> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return null;
    }

    const userRole = (session.user as any).role
    const adminEmails = getAdminEmails()
    const isAdmin = userRole === 'admin' || adminEmails.includes(session.user.email)

    if (!isAdmin) {
      return null;
    }

    return {
      id: (session.user as any).id || session.user.email,
      email: session.user.email,
      name: session.user.name || undefined
    };
  } catch (error) {
    console.error('Get current admin user error:', error);
    return null;
  }
}
