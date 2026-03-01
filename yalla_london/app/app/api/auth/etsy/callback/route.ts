/**
 * Etsy OAuth2 — Callback Handler
 *
 * GET /api/auth/etsy/callback?code=...&state=...
 *
 * 1. Validates state parameter (CSRF protection)
 * 2. Exchanges authorization code for access + refresh tokens (PKCE)
 * 3. Stores tokens encrypted in Credential model
 * 4. Resolves and caches the numeric shop ID
 * 5. Redirects to commerce cockpit with success/error message
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeTokens,
  resolveShopId,
} from "@/lib/commerce/etsy-api";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  // Base URL for redirects
  const baseUrl = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const cockpitUrl = `${baseUrl}/admin/cockpit/commerce`;

  // Handle Etsy-side errors (user denied access, etc.)
  if (error) {
    const errorDesc =
      request.nextUrl.searchParams.get("error_description") ?? error;
    return NextResponse.redirect(
      `${cockpitUrl}?etsy_error=${encodeURIComponent(errorDesc)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${cockpitUrl}?etsy_error=${encodeURIComponent("Missing code or state parameter")}`,
    );
  }

  // Retrieve stored values from cookies
  const storedState = request.cookies.get("etsy_oauth_state")?.value;
  const codeVerifier = request.cookies.get("etsy_code_verifier")?.value;
  const siteId = request.cookies.get("etsy_site_id")?.value ?? "yalla-london";

  // Validate state (CSRF protection)
  if (!storedState || state !== storedState) {
    return NextResponse.redirect(
      `${cockpitUrl}?etsy_error=${encodeURIComponent("Invalid state parameter — possible CSRF attack. Try again.")}`,
    );
  }

  if (!codeVerifier) {
    return NextResponse.redirect(
      `${cockpitUrl}?etsy_error=${encodeURIComponent("Code verifier expired. Please try connecting again.")}`,
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    // Store tokens encrypted
    await storeTokens(siteId, tokens);

    // Resolve and cache the shop ID
    try {
      const shop = await resolveShopId(siteId);
      const { prisma } = await import("@/lib/db");
      await prisma.etsyShopConfig.update({
        where: { siteId },
        data: {
          shopId: String(shop.shopId),
          shopName: shop.shopName,
          shopUrl: shop.shopUrl,
        },
      });
    } catch (shopErr) {
      // Non-fatal — shop ID will be resolved on first API call
      console.warn(
        "[etsy-callback] Failed to resolve shop ID:",
        shopErr instanceof Error ? shopErr.message : shopErr,
      );
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      `${cockpitUrl}?etsy_connected=true`,
    );
    response.cookies.delete("etsy_code_verifier");
    response.cookies.delete("etsy_oauth_state");
    response.cookies.delete("etsy_site_id");

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    console.error("[etsy-callback] OAuth error:", message);

    // Clear cookies on error too
    const response = NextResponse.redirect(
      `${cockpitUrl}?etsy_error=${encodeURIComponent(message)}`,
    );
    response.cookies.delete("etsy_code_verifier");
    response.cookies.delete("etsy_oauth_state");
    response.cookies.delete("etsy_site_id");

    return response;
  }
}
