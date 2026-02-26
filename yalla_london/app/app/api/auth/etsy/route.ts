/**
 * Etsy OAuth2 — Start Authorization Flow
 *
 * GET /api/auth/etsy?siteId=yalla-london
 *
 * 1. Generates PKCE code verifier + challenge
 * 2. Stores verifier in a short-lived cookie (httpOnly, 10 min)
 * 3. Redirects the user to Etsy's authorization page
 *
 * After the user authorizes, Etsy redirects to /api/auth/etsy/callback
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  isEtsyConfigured,
  buildAuthorizationUrl,
  generateCodeVerifier,
  generateState,
} from "@/lib/commerce/etsy-api";

export async function GET(request: NextRequest) {
  // Only admins can connect Etsy
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (!isEtsyConfigured()) {
    return NextResponse.json(
      {
        error: "Etsy not configured",
        message:
          "Set ETSY_API_KEY and ETSY_SHARED_SECRET in Vercel environment variables.",
      },
      { status: 503 },
    );
  }

  const siteId =
    request.nextUrl.searchParams.get("siteId") ?? "yalla-london";

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const state = generateState();

  // Build authorization URL
  const authUrl = buildAuthorizationUrl(codeVerifier, state);

  // Store code verifier and state in cookies (httpOnly, 10 min expiry)
  const response = NextResponse.redirect(authUrl);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };

  response.cookies.set("etsy_code_verifier", codeVerifier, cookieOptions);
  response.cookies.set("etsy_oauth_state", state, cookieOptions);
  response.cookies.set("etsy_site_id", siteId, cookieOptions);

  return response;
}
