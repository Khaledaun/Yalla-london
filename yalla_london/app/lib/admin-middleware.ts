/**
 * Admin Authentication Middleware for Next.js App Router
 * Provides requireAdmin functionality for API routes
 *
 * SECURITY: Admin emails loaded ONLY from environment variables.
 * No hardcoded email addresses.
 *
 * NOTE: Uses direct JWT decode from cookies instead of getServerSession()
 * to avoid dependency on the [...nextauth] route handler.
 */

import { NextRequest, NextResponse } from "next/server";

export interface AdminAuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/** Load admin email whitelist from ADMIN_EMAILS env var only */
function getAdminEmails(): string[] {
  return (
    process.env.ADMIN_EMAILS?.split(",")
      .map((e) => e.trim())
      .filter(Boolean) || []
  );
}

/**
 * Decode session from JWT cookie directly.
 * Bypasses getServerSession/[...nextauth] handler entirely.
 */
async function getSessionFromCookie(request: NextRequest) {
  try {
    const { decode } = await import("next-auth/jwt");
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    const secureCookie = request.cookies.get("__Secure-next-auth.session-token")?.value;
    const plainCookie = request.cookies.get("next-auth.session-token")?.value;
    const tokenValue = secureCookie || plainCookie;
    if (!tokenValue) return null;

    const decoded = await decode({ secret, token: tokenValue });
    if (!decoded || !decoded.email) return null;

    return {
      user: {
        id: (decoded.id || decoded.sub) as string,
        email: decoded.email as string,
        name: (decoded.name as string) || undefined,
        role: (decoded.role as string) || "viewer",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Admin authentication middleware for App Router API routes
 * Returns NextResponse with 401 for unauthorized access
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  try {
    const session = await getSessionFromCookie(request);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Check admin via session role (from JWT) OR email whitelist from env
    const userRole = session.user.role;
    const adminEmails = getAdminEmails();

    const isAdmin =
      userRole === "admin" || adminEmails.includes(session.user.email);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    return null; // null = continue with the request
  } catch (error) {
    console.error("Admin authentication error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 },
    );
  }
}

/**
 * Wrapper function for admin-only API routes
 * Usage: export const GET = withAdminAuth(async (request) => { ... });
 */
export function withAdminAuth(
  handler: (request: NextRequest) => Promise<NextResponse>,
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
 * Wrapper for admin routes with automatic tenant-scoped database access.
 * Drop-in upgrade from withAdminAuth - adds `db` (auto-filtered by site_id).
 *
 * Usage:
 *   export const GET = withTenantAuth(async (request, { db, siteId }) => {
 *     const posts = await db.blogPost.findMany(); // Auto-filtered by site_id
 *     return NextResponse.json({ posts });
 *   });
 */
export function withTenantAuth(
  handler: (
    request: NextRequest,
    context: { db: any; siteId: string; locale: string },
  ) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdmin(request);
    if (authResult) return authResult;

    // Use config-driven default instead of hardcoded "yalla-london"
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = request.headers.get("x-site-id") || getDefaultSiteId();
    const locale = request.headers.get("x-site-locale") || "en";

    const { getTenantPrisma } = await import("@/lib/db/tenant-queries");
    const db = getTenantPrisma(siteId);

    return handler(request, { db, siteId, locale });
  };
}

/**
 * Dual auth: accepts admin session cookie OR Bearer CRON_SECRET.
 * Use for admin endpoints that also need to be testable from the
 * connection validator page (/test-connections.html).
 */
export function requireAdminOrCron(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return Promise.resolve(null); // CRON_SECRET matched → allow
  }

  return requireAdmin(request); // Fall back to session-based admin auth
}

/**
 * Wrapper: admin session OR CRON_SECRET
 */
export function withAdminOrCronAuth(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireAdminOrCron(request);
    if (authResult) return authResult;
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
    const session = await getSessionFromCookie(request);

    if (!session?.user?.email) {
      return null;
    }

    const userRole = session.user.role;
    const adminEmails = getAdminEmails();
    const isAdmin =
      userRole === "admin" || adminEmails.includes(session.user.email);

    if (!isAdmin) {
      return null;
    }

    return {
      id: session.user.id || session.user.email,
      email: session.user.email,
      name: session.user.name || undefined,
    };
  } catch (error) {
    console.error("Get current admin user error:", error);
    return null;
  }
}
