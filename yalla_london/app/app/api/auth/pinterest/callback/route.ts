/**
 * Pinterest OAuth2 — Callback Handler
 *
 * GET /api/auth/pinterest/callback?code=...&state=...
 *
 * 1. Validates state parameter (CSRF protection)
 * 2. Exchanges authorization code for access + refresh tokens
 * 3. Stores tokens encrypted in the Credential model
 * 4. Redirects back to the cockpit commerce page with success/error message
 *
 * The frontend sets cookies before redirecting to Pinterest:
 * - pinterest_oauth_state: CSRF state token
 * - pinterest_site_id: site ID for multi-tenant scoping
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeTokens,
} from "@/lib/commerce/pinterest-client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  // Base URL for redirects
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const cockpitUrl = `${baseUrl}/admin/cockpit/commerce`;

  // Handle Pinterest-side errors (user denied access, etc.)
  if (error) {
    const errorDesc =
      request.nextUrl.searchParams.get("error_description") ?? error;
    console.warn("[pinterest] OAuth error from Pinterest:", errorDesc);
    return NextResponse.redirect(
      `${cockpitUrl}?pinterest_error=${encodeURIComponent(errorDesc)}`,
    );
  }

  if (!code || !state) {
    console.warn("[pinterest] Callback missing code or state parameter");
    return NextResponse.redirect(
      `${cockpitUrl}?pinterest_error=${encodeURIComponent("Missing code or state parameter")}`,
    );
  }

  // Retrieve stored values from cookies
  const storedState = request.cookies.get("pinterest_oauth_state")?.value;
  const siteId =
    request.cookies.get("pinterest_site_id")?.value ?? "yalla-london";

  // Validate state (CSRF protection)
  if (!storedState || state !== storedState) {
    console.warn("[pinterest] State mismatch — possible CSRF attack");
    return NextResponse.redirect(
      `${cockpitUrl}?pinterest_error=${encodeURIComponent("Invalid state parameter — possible CSRF attack. Try again.")}`,
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens encrypted in DB
    await storeTokens(siteId, tokens);

    console.log(
      `[pinterest] OAuth successful for site "${siteId}". Tokens stored.`,
    );

    // Clear OAuth cookies and redirect to cockpit with success flag
    const response = NextResponse.redirect(
      `${cockpitUrl}?pinterest_connected=true`,
    );
    response.cookies.delete("pinterest_oauth_state");
    response.cookies.delete("pinterest_site_id");

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token exchange failed";
    console.error("[pinterest] OAuth callback error:", message);

    // Clear cookies on error too
    const response = NextResponse.redirect(
      `${cockpitUrl}?pinterest_error=${encodeURIComponent(message)}`,
    );
    response.cookies.delete("pinterest_oauth_state");
    response.cookies.delete("pinterest_site_id");

    return response;
  }
}
