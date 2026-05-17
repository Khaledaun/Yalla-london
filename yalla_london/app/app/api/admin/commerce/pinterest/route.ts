/**
 * Pinterest Integration API — Admin-only endpoints for Pinterest pin management
 *
 * GET  — Connection status + boards list
 * POST — Actions: connect, create_pin, pin_from_listing, create_board, test_connection, disconnect
 *
 * Protected with requireAdmin from @/lib/admin-middleware
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";
import {
  isPinterestConfigured,
  getPinterestConfig,
  buildAuthorizationUrl,
  generateState,
  testConnection,
  getBoards,
  createBoard,
  createPin,
  pinFromListing,
  disconnect,
} from "@/lib/commerce/pinterest-client";

// ─── GET: Connection status + boards list ────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId =
    request.nextUrl.searchParams.get("siteId") ?? getDefaultSiteId();

  // Check if env vars are configured
  if (!isPinterestConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      message:
        "PINTEREST_APP_ID and PINTEREST_APP_SECRET not set in environment.",
    });
  }

  try {
    // Test the connection
    const connectionResult = await testConnection(siteId);

    if (!connectionResult.connected) {
      return NextResponse.json({
        configured: true,
        connected: false,
        connectionStatus: "not_connected",
        message:
          "Pinterest API keys are configured but not connected. Start the OAuth flow.",
        error: connectionResult.error,
      });
    }

    // Fetch boards
    let boards: Awaited<ReturnType<typeof getBoards>> = [];
    try {
      boards = await getBoards(siteId);
    } catch (boardErr) {
      console.warn(
        "[pinterest] Failed to fetch boards:",
        boardErr instanceof Error ? boardErr.message : boardErr,
      );
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      connectionStatus: "connected",
      username: connectionResult.username,
      boardCount: connectionResult.boardCount,
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        privacy: b.privacy,
        pinCount: b.pin_count ?? 0,
      })),
    });
  } catch (err) {
    console.warn(
      "[pinterest] GET error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      {
        configured: true,
        connected: false,
        error: "Failed to check Pinterest connection status",
      },
      { status: 500 },
    );
  }
}

// ─── POST: Actions ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: {
    action: string;
    siteId?: string;
    boardId?: string;
    draftId?: string;
    title?: string;
    description?: string;
    link?: string;
    imageUrl?: string;
    altText?: string;
    name?: string;
    privacy?: "PUBLIC" | "PROTECTED";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const siteId = body.siteId ?? getDefaultSiteId();

  switch (body.action) {
    // ── Start OAuth Flow ──
    case "connect": {
      if (!isPinterestConfigured()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "PINTEREST_APP_ID and PINTEREST_APP_SECRET are not configured.",
          },
          { status: 503 },
        );
      }

      const state = generateState();
      const authUrl = buildAuthorizationUrl(state);

      // Return the auth URL and state — the frontend sets cookies and redirects
      return NextResponse.json({
        success: true,
        authUrl,
        state,
        siteId,
      });
    }

    // ── Create Pin ──
    case "create_pin": {
      if (!body.boardId) {
        return NextResponse.json(
          { error: "boardId is required" },
          { status: 400 },
        );
      }
      if (!body.title) {
        return NextResponse.json(
          { error: "title is required" },
          { status: 400 },
        );
      }
      if (!body.imageUrl) {
        return NextResponse.json(
          { error: "imageUrl is required" },
          { status: 400 },
        );
      }

      try {
        const pin = await createPin(siteId, {
          boardId: body.boardId,
          title: body.title,
          description: body.description ?? "",
          link: body.link,
          imageUrl: body.imageUrl,
          altText: body.altText,
        });

        return NextResponse.json({
          success: true,
          pinId: pin.id,
          title: pin.title,
          link: pin.link,
          boardId: pin.board_id,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create pin";
        console.warn("[pinterest] create_pin error:", message);
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    // ── Pin From Etsy Listing Draft ──
    case "pin_from_listing": {
      if (!body.draftId) {
        return NextResponse.json(
          { error: "draftId is required" },
          { status: 400 },
        );
      }
      if (!body.boardId) {
        return NextResponse.json(
          { error: "boardId is required" },
          { status: 400 },
        );
      }

      try {
        const result = await pinFromListing(siteId, body.draftId, body.boardId);
        return NextResponse.json({
          success: true,
          pinId: result.pin.id,
          draftTitle: result.draftTitle,
          boardId: result.pin.board_id,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to pin from listing";
        console.warn("[pinterest] pin_from_listing error:", message);
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    // ── Create Board ──
    case "create_board": {
      if (!body.name) {
        return NextResponse.json(
          { error: "name is required" },
          { status: 400 },
        );
      }

      try {
        const board = await createBoard(siteId, {
          name: body.name,
          description: body.description,
          privacy: body.privacy,
        });

        return NextResponse.json({
          success: true,
          boardId: board.id,
          boardName: board.name,
          privacy: board.privacy,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create board";
        console.warn("[pinterest] create_board error:", message);
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    // ── Test Connection ──
    case "test_connection": {
      try {
        const result = await testConnection(siteId);
        return NextResponse.json({
          success: result.connected,
          username: result.username,
          boardCount: result.boardCount,
          error: result.error,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection test failed";
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 },
        );
      }
    }

    // ── Disconnect ──
    case "disconnect": {
      try {
        await disconnect(siteId);
        return NextResponse.json({
          success: true,
          message: "Pinterest disconnected",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Disconnect failed";
        console.warn("[pinterest] disconnect error:", message);
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
