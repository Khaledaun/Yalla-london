/**
 * Google Drive OAuth2 Callback
 *
 * Handles the redirect after user authorizes Google Drive access.
 * Exchanges code for tokens, fetches account info, saves to DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getAccountInfo } from "@/lib/integrations/google-drive";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/google-drive?error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/admin/google-drive?error=no_code", request.url),
    );
  }

  let siteId = getDefaultSiteId();
  let label = "";
  try {
    if (stateRaw) {
      const state = JSON.parse(stateRaw);
      siteId = state.siteId || siteId;
      label = state.label || "";
    }
  } catch {
    // State parsing failed — use defaults
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/admin/google-drive?error=no_refresh_token", request.url),
      );
    }

    // Get account info
    const info = await getAccountInfo(tokens.access_token);

    // Save to database
    const { prisma } = await import("@/lib/db");
    await prisma.googleDriveAccount.upsert({
      where: { email: info.email },
      create: {
        email: info.email,
        displayName: info.displayName || info.email,
        photoUrl: info.photoUrl,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        siteId,
        label,
        rootFolderId: "root",
        syncEnabled: true,
      },
      update: {
        displayName: info.displayName || info.email,
        photoUrl: info.photoUrl,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        ...(label ? { label } : {}),
      },
    });

    return NextResponse.redirect(
      new URL(`/admin/google-drive?success=connected&email=${encodeURIComponent(info.email)}`, request.url),
    );
  } catch (err) {
    console.error("[google-drive-callback]", err instanceof Error ? err.message : err);
    return NextResponse.redirect(
      new URL(`/admin/google-drive?error=${encodeURIComponent(err instanceof Error ? err.message : "connection_failed")}`, request.url),
    );
  }
}
