export const dynamic = "force-dynamic";

/**
 * Post Bridge Account Sync — fetches connected social accounts.
 *
 * GET:  Returns cached accounts list + connection status.
 * POST: Forces a fresh fetch from Post Bridge API (cache bust).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const {
    isPostBridgeConfigured,
    getPostBridgeClient,
  } = await import("@/lib/integrations/post-bridge-client");

  if (!isPostBridgeConfigured()) {
    return NextResponse.json({
      configured: false,
      accounts: [],
      message: "POST_BRIDGE_API_KEY not set",
    });
  }

  const client = getPostBridgeClient();
  if (!client) {
    return NextResponse.json(
      { configured: true, accounts: [], error: "Client init failed" },
      { status: 500 },
    );
  }

  try {
    const accounts = await client.getAccounts();
    return NextResponse.json({
      configured: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        username: a.username,
        connected: a.connected,
      })),
      total: accounts.length,
      connected: accounts.filter((a) => a.connected).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[post-bridge-sync] Failed to fetch accounts:", message);
    return NextResponse.json(
      { configured: true, accounts: [], error: message },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const {
    isPostBridgeConfigured,
    getPostBridgeClient,
  } = await import("@/lib/integrations/post-bridge-client");

  // Reset the scheduler's account cache to force fresh fetch
  const { resetPostBridgeAccountsCache } = await import(
    "@/lib/social/scheduler"
  );
  resetPostBridgeAccountsCache();

  if (!isPostBridgeConfigured()) {
    return NextResponse.json({
      configured: false,
      accounts: [],
      message: "POST_BRIDGE_API_KEY not set",
    });
  }

  const client = getPostBridgeClient();
  if (!client) {
    return NextResponse.json(
      { configured: true, accounts: [], error: "Client init failed" },
      { status: 500 },
    );
  }

  try {
    const accounts = await client.getAccounts();
    return NextResponse.json({
      configured: true,
      synced: true,
      accounts: accounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        username: a.username,
        connected: a.connected,
      })),
      total: accounts.length,
      connected: accounts.filter((a) => a.connected).length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[post-bridge-sync] Sync failed:", message);
    return NextResponse.json(
      { configured: true, synced: false, error: message },
      { status: 502 },
    );
  }
}
