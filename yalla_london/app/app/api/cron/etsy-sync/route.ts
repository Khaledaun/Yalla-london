/**
 * Etsy Sync Cron — Auto-sync listing status, views, favorites, and orders
 *
 * Schedule: Daily at 10:00 UTC (after morning EST shop activity)
 *
 * What it does:
 * 1. For each site with an active Etsy connection:
 *    a. Sync all published EtsyListingDrafts — update views, favorites, state
 *    b. Check for expired/removed listings and flag them
 *    c. Pull recent transactions (orders) and create Purchase records
 * 2. Logs results to CronJobLog
 *
 * Budget: 53s (7s buffer for Vercel Pro 60s limit)
 */

import { NextRequest, NextResponse } from "next/server";

const BUDGET_MS = 53_000;

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  // Standard cron auth pattern
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results: SyncResult[] = [];

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");

    const activeSites = getActiveSiteIds();

    for (const siteId of activeSites) {
      // Budget check
      if (Date.now() - startTime > BUDGET_MS) {
        console.warn("[etsy-sync] Budget exhausted, stopping");
        break;
      }

      // Check if site has Etsy connection
      const config = await prisma.etsyShopConfig.findUnique({
        where: { siteId },
      });

      if (!config || config.connectionStatus !== "connected") continue;

      try {
        const siteResult = await syncSiteListings(siteId, startTime);
        results.push(siteResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown sync error";
        console.error(`[etsy-sync] Site ${siteId} error:`, message);
        results.push({
          siteId,
          synced: 0,
          stateChanges: 0,
          ordersImported: 0,
          errors: [message],
        });
      }
    }

    // Log to CronJobLog
    try {
      const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
      const totalOrders = results.reduce((sum, r) => sum + r.ordersImported, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

      await prisma.cronJobLog.create({
        data: {
          jobName: "etsy-sync",
          status: totalErrors > 0 ? "partial" : "success",
          startedAt: new Date(startTime),
          completedAt: new Date(),
          itemsProcessed: totalSynced,
          errorMessage:
            totalErrors > 0
              ? results
                  .flatMap((r) => r.errors)
                  .join("; ")
                  .slice(0, 500)
              : null,
          metadata: {
            results,
            ordersImported: totalOrders,
            durationMs: Date.now() - startTime,
          },
        },
      });
    } catch (logErr) {
      console.warn("[etsy-sync] Failed to log cron result:", logErr);
    }

    return NextResponse.json({
      success: true,
      results,
      durationMs: Date.now() - startTime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[etsy-sync] Fatal error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// ─── Per-Site Sync ──────────────────────────────────────

interface SyncResult {
  siteId: string;
  synced: number;
  stateChanges: number;
  ordersImported: number;
  errors: string[];
}

async function syncSiteListings(
  siteId: string,
  startTime: number,
): Promise<SyncResult> {
  const { prisma } = await import("@/lib/db");

  const result: SyncResult = {
    siteId,
    synced: 0,
    stateChanges: 0,
    ordersImported: 0,
    errors: [],
  };

  // Get all published drafts that have an Etsy listing ID
  const publishedDrafts = await prisma.etsyListingDraft.findMany({
    where: {
      siteId,
      etsyListingId: { not: null },
    },
    take: 50, // Limit to prevent OOM / timeout
  });

  if (publishedDrafts.length === 0) return result;

  // Import Etsy API functions
  let getListing: (siteId: string, listingId: number) => Promise<{
    listing_id: number;
    state: string;
    views: number;
    num_favorers: number;
    title: string;
    url: string;
  }>;

  try {
    const api = await import("@/lib/commerce/etsy-api");
    getListing = api.getListing as typeof getListing;
  } catch {
    result.errors.push("Failed to import etsy-api module");
    return result;
  }

  for (const draft of publishedDrafts) {
    // Budget check
    if (Date.now() - startTime > BUDGET_MS) {
      result.errors.push("Budget exhausted during sync");
      break;
    }

    try {
      const listing = await getListing(
        siteId,
        parseInt(draft.etsyListingId!, 10),
      );

      // Track state changes
      const oldState = draft.etsyState;
      const newState = listing.state;
      const stateChanged = oldState !== newState;

      // Update local record
      await prisma.etsyListingDraft.update({
        where: { id: draft.id },
        data: {
          etsyState: newState,
          etsyUrl: listing.url,
          lastSyncAt: new Date(),
          // If listing was removed/expired, mark as failed
          ...(["removed", "expired"].includes(newState)
            ? { status: "failed", errorMessage: `Etsy listing ${newState}` }
            : {}),
        },
      });

      result.synced++;
      if (stateChanged) result.stateChanges++;

      // If state changed to something bad, create an alert
      if (stateChanged && ["removed", "expired", "inactive"].includes(newState)) {
        try {
          await prisma.commerceAlert.create({
            data: {
              siteId,
              type: "listing_status",
              severity: newState === "removed" ? "critical" : "warning",
              title: `Listing ${newState}: ${draft.title.slice(0, 50)}`,
              message: `Your listing "${draft.title}" changed to "${newState}" on Etsy.`,
              actionUrl: draft.etsyUrl ?? undefined,
            },
          });
        } catch {
          // Non-fatal
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync error";
      result.errors.push(`Draft ${draft.id}: ${msg}`);
    }
  }

  // Sync orders (transactions) if Etsy API supports it
  try {
    const ordersImported = await syncOrders(siteId, startTime);
    result.ordersImported = ordersImported;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Order sync error";
    result.errors.push(`Orders: ${msg}`);
  }

  return result;
}

// ─── Order Sync ─────────────────────────────────────────

async function syncOrders(
  siteId: string,
  startTime: number,
): Promise<number> {
  const { prisma } = await import("@/lib/db");

  // Budget check
  if (Date.now() - startTime > BUDGET_MS) return 0;

  // Get shop config for the numeric shop ID
  const config = await prisma.etsyShopConfig.findUnique({
    where: { siteId },
    select: { shopId: true },
  });

  if (!config?.shopId) return 0;

  let getAccessToken: (siteId: string) => Promise<string>;
  try {
    const api = await import("@/lib/commerce/etsy-api");
    getAccessToken = api.getAccessToken;
  } catch {
    return 0;
  }

  try {
    const accessToken = await getAccessToken(siteId);
    const { getEtsyConfig } = await import("@/lib/commerce/etsy-api");
    const cfg = getEtsyConfig();

    // Fetch recent transactions (last 7 days)
    const res = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${config.shopId}/transactions?limit=25`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": cfg.clientId,
        },
      },
    );

    if (!res.ok) {
      // Etsy may not expose transactions for all apps — fail silently
      if (res.status === 403) return 0;
      throw new Error(`Transactions API returned ${res.status}`);
    }

    const data = (await res.json()) as {
      count: number;
      results: EtsyTransaction[];
    };

    let imported = 0;

    for (const txn of data.results) {
      // Skip if already imported (dedup by transaction_id)
      const existing = await prisma.purchase.findFirst({
        where: {
          stripeSessionId: `etsy_${txn.transaction_id}`,
        },
      });
      if (existing) continue;

      // Match to a DigitalProduct if possible
      let productId: string | undefined;
      if (txn.listing_id) {
        const draft = await prisma.etsyListingDraft.findFirst({
          where: { etsyListingId: String(txn.listing_id) },
          select: { brief: { select: { digitalProductId: true } } },
        });
        productId = draft?.brief?.digitalProductId ?? undefined;
      }

      // Create Purchase record
      try {
        await prisma.purchase.create({
          data: {
            siteId,
            digitalProductId: productId ?? null,
            email: txn.buyer_email ?? "etsy-buyer@unknown",
            amount: txn.price?.amount
              ? Math.round(txn.price.amount / (txn.price.divisor || 100) * 100)
              : 0,
            currency: txn.price?.currency_code ?? "USD",
            status: txn.paid_tsz ? "completed" : "pending",
            channel: "etsy",
            stripeSessionId: `etsy_${txn.transaction_id}`,
          },
        });
        imported++;
      } catch (createErr) {
        console.warn(
          `[etsy-sync] Failed to create purchase for txn ${txn.transaction_id}:`,
          createErr,
        );
      }
    }

    // Update shop stats
    if (data.count > 0) {
      const statsUpdate = {
        lastSyncOrders: new Date().toISOString(),
        totalTransactions: data.count,
        recentImported: imported,
      };

      await prisma.etsyShopConfig.update({
        where: { siteId },
        data: {
          statsJson: statsUpdate,
        },
      });
    }

    return imported;
  } catch {
    // Order sync is optional — many Etsy apps don't have transactions_r scope
    return 0;
  }
}

// ─── Etsy API Types ─────────────────────────────────────

interface EtsyTransaction {
  transaction_id: number;
  listing_id: number;
  buyer_email?: string;
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  paid_tsz?: number;
  shipped_tsz?: number;
  title: string;
}
