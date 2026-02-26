/**
 * Etsy Integration API — Admin-only endpoints for Etsy shop management
 *
 * GET  — Connection status, shop info, listings
 * POST — Actions: connect_test, publish_draft, sync_listing, disconnect
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  isEtsyConfigured,
  testConnection,
  publishDraft,
  getShopListings,
  getListing,
} from "@/lib/commerce/etsy-api";
import { getDefaultSiteId } from "@/config/sites";

// ─── GET: Connection status + shop info ─────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId =
    request.nextUrl.searchParams.get("siteId") ?? getDefaultSiteId();

  // Check if env vars are configured
  if (!isEtsyConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message: "ETSY_API_KEY and ETSY_SHARED_SECRET not set in environment.",
    });
  }

  // Check DB connection status
  try {
    const { prisma } = await import("@/lib/db");
    const config = await prisma.etsyShopConfig.findUnique({
      where: { siteId },
    });

    if (!config || config.connectionStatus === "not_connected") {
      return NextResponse.json({
        configured: true,
        connected: false,
        connectionStatus: config?.connectionStatus ?? "not_connected",
        message: "Etsy API keys are configured but not connected. Start the OAuth flow.",
      });
    }

    // Get listing stats
    const drafts = await prisma.etsyListingDraft.count({
      where: { siteId },
    });
    const publishedDrafts = await prisma.etsyListingDraft.count({
      where: { siteId, status: "published" },
    });

    return NextResponse.json({
      configured: true,
      connected: config.connectionStatus === "connected",
      connectionStatus: config.connectionStatus,
      shopName: config.shopName,
      shopId: config.shopId,
      shopUrl: config.shopUrl,
      tokenExpiresAt: config.tokenExpiresAt,
      lastTestedAt: config.lastTestedAt,
      scopes: config.scopes,
      stats: {
        totalDrafts: drafts,
        publishedOnEtsy: publishedDrafts,
        pendingPublish: drafts - publishedDrafts,
      },
    });
  } catch (err) {
    console.warn("[etsy-api] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { configured: true, connected: false, error: "Failed to check connection status" },
      { status: 500 },
    );
  }
}

// ─── POST: Actions ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: { action: string; siteId?: string; draftId?: string; listingId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const siteId = body.siteId ?? getDefaultSiteId();

  switch (body.action) {
    // ── Test Connection ──
    case "test_connection": {
      if (!isEtsyConfigured()) {
        return NextResponse.json({
          success: false,
          error: "ETSY_API_KEY and ETSY_SHARED_SECRET not configured.",
        });
      }

      const result = await testConnection(siteId);
      return NextResponse.json({
        success: result.connected,
        shopName: result.shopName,
        listingCount: result.listingCount,
        error: result.error,
      });
    }

    // ── Publish Draft to Etsy ──
    case "publish_draft": {
      if (!body.draftId) {
        return NextResponse.json(
          { error: "draftId is required" },
          { status: 400 },
        );
      }

      try {
        const result = await publishDraft(body.draftId);
        return NextResponse.json({
          success: true,
          etsyListingId: result.etsyListingId,
          etsyUrl: result.etsyUrl,
          etsyState: result.etsyState,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Publish failed";
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    // ── Sync listing status from Etsy ──
    case "sync_listing": {
      if (!body.draftId) {
        return NextResponse.json(
          { error: "draftId is required" },
          { status: 400 },
        );
      }

      try {
        const { prisma } = await import("@/lib/db");
        const draft = await prisma.etsyListingDraft.findUnique({
          where: { id: body.draftId },
        });

        if (!draft?.etsyListingId) {
          return NextResponse.json(
            { error: "Draft has no Etsy listing ID — not yet published" },
            { status: 400 },
          );
        }

        const listing = await getListing(siteId, parseInt(draft.etsyListingId, 10));

        await prisma.etsyListingDraft.update({
          where: { id: body.draftId },
          data: {
            etsyState: listing.state,
            lastSyncAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          state: listing.state,
          views: listing.views,
          favorites: listing.num_favorers,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    // ── Get live shop listings ──
    case "get_listings": {
      try {
        const result = await getShopListings(siteId, {
          state: "active",
          limit: 25,
        });
        return NextResponse.json({
          success: true,
          count: result.count,
          listings: result.results.map((l) => ({
            listingId: l.listing_id,
            title: l.title,
            state: l.state,
            price: l.price,
            views: l.views,
            favorites: l.num_favorers,
            url: l.url,
          })),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch listings";
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    // ── Disconnect Etsy ──
    case "disconnect": {
      try {
        const { prisma } = await import("@/lib/db");
        await prisma.etsyShopConfig.update({
          where: { siteId },
          data: {
            connectionStatus: "not_connected",
            accessTokenCredentialId: null,
            refreshTokenCredentialId: null,
            tokenExpiresAt: null,
          },
        });
        return NextResponse.json({ success: true, message: "Etsy disconnected" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Disconnect failed";
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${body.action}` },
        { status: 400 },
      );
  }
}
