/**
 * Admin Authentication Middleware for Next.js App Router
 * Provides requireAdmin functionality for API routes
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

/**
 * Admin authentication middleware for App Router API routes
 * Returns NextResponse with 401 for unauthorized access
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin (for now, using hardcoded email check)
    // In production, this should check a database role or permission system
    const adminEmails = [
      'john@doe.com',
      // Add other admin emails here or load from environment
      ...(process.env.ADMIN_EMAILS?.split(',') || [])
    ];

    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // If we reach here, user is authenticated and authorized
    return null; // null means continue with the request
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
      return authResult; // Return authentication error response
    }
    
    // Continue with the original handler if authenticated
    return handler(request);
  };
}

/**
 * Get current admin user from session
 * Returns user info or null if not authenticated/authorized
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

    const adminEmails = [
      'john@doe.com',
      ...(process.env.ADMIN_EMAILS?.split(',') || [])
    ];

    if (!adminEmails.includes(session.user.email)) {
      return null;
    }

    return {
      id: session.user.id || session.user.email,
      email: session.user.email,
      name: session.user.name || undefined
    };
  } catch (error) {
    console.error('Get current admin user error:', error);
    return null;
  }
}