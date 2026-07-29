/**
 * Claude Chrome Bridge — Bearer Token Authentication
 *
 * Separate from admin session auth and CRON_SECRET. Rotatable independently.
 *
 * Usage in API routes:
 *   const authError = await requireBridgeToken(request);
 *   if (authError) return authError;
 *
 * Env var: CLAUDE_BRIDGE_TOKEN — 64+ char random string, set in Vercel.
 * Falls back to admin session if token not configured, so endpoints remain
 * accessible from the admin dashboard during token rotation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  if (ha.length !== hb.length) return false;
  return timingSafeEqual(ha, hb);
}

/**
 * Require a valid CLAUDE_BRIDGE_TOKEN bearer token OR admin session.
 * Returns null if authorized, NextResponse with error if not.
 */
export async function requireBridgeToken(
  request: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization") || "";
  const expectedToken = process.env.CLAUDE_BRIDGE_TOKEN;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (expectedToken && safeCompare(token, expectedToken)) {
      return null;
    }
    return NextResponse.json(
      { error: "Invalid bridge token" },
      { status: 401 },
    );
  }

  const { requireAdmin } = await import("@/lib/admin-middleware");
  return requireAdmin(request);
}

/**
 * Wrapper for bridge routes.
 * Usage: export const GET = withBridgeAuth(async (request) => { ... });
 */
export function withBridgeAuth(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authError = await requireBridgeToken(request);
    if (authError) return authError;
    return handler(request);
  };
}

/**
 * Returns true if the incoming request was authenticated via bridge token
 * (as opposed to admin session). Useful for logging/audit.
 */
export function isBridgeTokenRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const expectedToken = process.env.CLAUDE_BRIDGE_TOKEN;
  if (!expectedToken) return false;
  const token = authHeader.slice(7).trim();
  return safeCompare(token, expectedToken);
}
