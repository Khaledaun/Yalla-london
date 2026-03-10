/**
 * CJ Affiliate Sync Service
 *
 * Handles syncing advertisers, links, products, and commissions from CJ API
 * to the local database. All operations are idempotent.
 */

import {
  lookupAdvertisers,
  searchLinks,
  searchProducts,
  fetchCommissions,
  isCjConfigured,
  CJ_NETWORK_ID,
  type CjAdvertiserRecord,
  type CjLinkRecord,
  type CjProductRecord,
  type CjCommissionRecord,
} from "./cj-client";

// ---------------------------------------------------------------------------
// Ensure AffiliateNetwork record exists (auto-seed on first use)
// ---------------------------------------------------------------------------

async function ensureNetworkExists(): Promise<void> {
  const { prisma } = await import("@/lib/db");
  const existing = await prisma.affiliateNetwork.findUnique({
    where: { id: CJ_NETWORK_ID },
  });
  if (!existing) {
    await prisma.affiliateNetwork.upsert({
      where: { id: CJ_NETWORK_ID },
      create: {
        id: CJ_NETWORK_ID,
        name: "CJ Affiliate",
        slug: "cj",
        apiBaseUrl: "https://commission-detail.api.cj.com",
        apiTokenEnvVar: "CJ_API_TOKEN",
        publisherId: process.env.CJ_PUBLISHER_CID || "",
        status: "ACTIVE",
      },
      update: {},
    });
    console.log("[cj-sync] Auto-created AffiliateNetwork record:", CJ_NETWORK_ID);
  }
}

// ---------------------------------------------------------------------------
// Advertiser Sync
// ---------------------------------------------------------------------------

interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Sync all advertisers from CJ — both joined and pending.
 * Detects status changes (PENDING → JOINED) and returns newly approved advertisers.
 */
export async function syncAdvertisers(budgetMs = 50_000): Promise<{
  result: SyncResult;
  newlyApproved: string[]; // advertiser IDs that changed from PENDING to JOINED
}> {
  if (!isCjConfigured()) {
    return {
      result: { processed: 0, created: 0, updated: 0, errors: ["CJ_API_TOKEN not configured"] },
      newlyApproved: [],
    };
  }

  await ensureNetworkExists();
  const { prisma } = await import("@/lib/db");
  const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: [] };
  const newlyApproved: string[] = [];

  const syncStart = Date.now();

  try {
    // ── Step 1: Fetch ALL advertisers (no joined filter) with pagination ──
    // Previously only fetched joined=true, which returns 0 when no applications
    // have been approved yet. Now fetches everything: joined, pending, not-joined.
    const allRecords = new Map<string, CjAdvertiserRecord>();
    const MAX_PAGES = 5; // Safety cap: 500 advertisers max

    for (let page = 1; page <= MAX_PAGES; page++) {
      if (Date.now() - syncStart > budgetMs * 0.5) {
        console.warn("[cj-sync] Budget >50% used during fetch, stopping pagination");
        break;
      }

      try {
        // No `joined` filter — fetches ALL relationship statuses
        const response = await lookupAdvertisers({
          recordsPerPage: 100,
          pageNumber: page,
        });

        for (const rec of response.records) {
          if (rec.advertiserId) {
            allRecords.set(rec.advertiserId, rec);
          }
        }

        // Stop if we got fewer than a full page
        if (response.recordsReturned < 100) break;
      } catch (err) {
        console.warn(`[cj-sync] Failed to fetch advertiser page ${page}:`, err instanceof Error ? err.message : String(err));
        break;
      }
    }

    console.log(`[cj-sync] Fetched ${allRecords.size} advertisers across all statuses`);

    for (const [, rec] of allRecords) {
      // Budget guard
      if (Date.now() - syncStart > budgetMs) {
        console.warn("[cj-sync] Advertiser sync budget exhausted, returning partial result");
        break;
      }

      try {
        result.processed++;

        const status = mapCjStatus(rec.relationshipStatus);

        // Check if this is a newly approved advertiser
        const existing = await prisma.cjAdvertiser.findUnique({
          where: {
            networkId_externalId: {
              networkId: CJ_NETWORK_ID,
              externalId: rec.advertiserId,
            },
          },
          select: { status: true },
        });

        if (existing?.status === "PENDING" && status === "JOINED") {
          newlyApproved.push(rec.advertiserId);
          console.log(`[cj-sync] Advertiser ${rec.advertiserName} (${rec.advertiserId}) APPROVED!`);
        }

        await prisma.cjAdvertiser.upsert({
          where: {
            networkId_externalId: {
              networkId: CJ_NETWORK_ID,
              externalId: rec.advertiserId,
            },
          },
          create: {
            networkId: CJ_NETWORK_ID,
            externalId: rec.advertiserId,
            name: rec.advertiserName,
            programUrl: rec.programUrl || null,
            status,
            sevenDayEpc: rec.sevenDayEpc,
            threeMonthEpc: rec.threeMonthEpc,
            cookieDuration: rec.cookieDuration,
            lastSynced: new Date(),
          },
          update: {
            name: rec.advertiserName,
            programUrl: rec.programUrl || undefined,
            status,
            sevenDayEpc: rec.sevenDayEpc,
            threeMonthEpc: rec.threeMonthEpc,
            cookieDuration: rec.cookieDuration,
            lastSynced: new Date(),
          },
        });

        if (existing) {
          result.updated++;
        } else {
          result.created++;
        }
      } catch (err) {
        result.errors.push(
          `Failed to sync advertiser ${rec.advertiserId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  } catch (err) {
    result.errors.push(`Advertiser sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Log sync
  await logSync("ADVERTISERS", result);
  return { result, newlyApproved };
}

/**
 * Sync links for a specific advertiser.
 */
export async function syncLinks(advertiserId: string): Promise<SyncResult> {
  if (!isCjConfigured()) {
    return { processed: 0, created: 0, updated: 0, errors: ["CJ_API_TOKEN not configured"] };
  }

  const { prisma } = await import("@/lib/db");
  const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: [] };

  try {
    // Get the CjAdvertiser record to get internal ID
    const advertiser = await prisma.cjAdvertiser.findFirst({
      where: { networkId: CJ_NETWORK_ID, externalId: advertiserId },
    });

    if (!advertiser) {
      result.errors.push(`Advertiser ${advertiserId} not found in database`);
      return result;
    }

    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await searchLinks({
        advertiserId,
        pageNumber,
        recordsPerPage: 100,
      });

      for (const rec of response.records) {
        try {
          result.processed++;

          const linkType = mapLinkType(rec.linkType);

          await prisma.cjLink.upsert({
            where: {
              // Use a composite or find-first approach since CJ link IDs may not be globally unique
              id: `cj-link-${rec.linkId}`,
            },
            create: {
              id: `cj-link-${rec.linkId}`,
              networkId: CJ_NETWORK_ID,
              advertiserId: advertiser.id,
              name: rec.linkName || rec.description || "Unnamed Link",
              destinationUrl: rec.destinationUrl || "",
              affiliateUrl: rec.clickUrl || "",
              linkType,
              category: rec.category || advertiser.category || null,
              language: rec.language?.toLowerCase() === "ar" ? "AR" : "EN",
              isActive: true,
            },
            update: {
              name: rec.linkName || rec.description || "Unnamed Link",
              destinationUrl: rec.destinationUrl || "",
              affiliateUrl: rec.clickUrl || "",
              linkType,
              category: rec.category || advertiser.category || undefined,
              isActive: true,
            },
          });

          result.created++;
        } catch (err) {
          result.errors.push(
            `Failed to sync link ${rec.linkId}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      hasMore = response.recordsReturned >= 100 && pageNumber < 10; // Max 10 pages
      pageNumber++;
    }
  } catch (err) {
    result.errors.push(`Link sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  await logSync("LINKS", result);
  return result;
}

/**
 * Sync products for a specific advertiser using keywords.
 */
export async function syncProducts(
  advertiserId: string,
  keywords: string[]
): Promise<SyncResult> {
  if (!isCjConfigured()) {
    return { processed: 0, created: 0, updated: 0, errors: ["CJ_API_TOKEN not configured"] };
  }

  const { prisma } = await import("@/lib/db");
  const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: [] };

  try {
    const advertiser = await prisma.cjAdvertiser.findFirst({
      where: { networkId: CJ_NETWORK_ID, externalId: advertiserId },
    });

    if (!advertiser) {
      result.errors.push(`Advertiser ${advertiserId} not found in database`);
      return result;
    }

    for (const keyword of keywords) {
      try {
        const response = await searchProducts({
          advertiserIds: [advertiserId],
          keywords: keyword,
          recordsPerPage: 50,
        });

        for (const rec of response.records) {
          result.processed++;

          try {
            // Check for existing offer with same external ID
            const existingOffer = rec.adId
              ? await prisma.cjOffer.findFirst({
                  where: {
                    networkId: CJ_NETWORK_ID,
                    advertiserId: advertiser.id,
                    externalId: rec.adId,
                  },
                })
              : null;

            const category = categorizeProduct(rec.name, rec.description);

            if (existingOffer) {
              // Check for price drop
              const isPriceDropped =
                existingOffer.price !== null &&
                rec.price > 0 &&
                rec.price < existingOffer.price * 0.9;

              await prisma.cjOffer.update({
                where: { id: existingOffer.id },
                data: {
                  title: rec.name,
                  description: rec.description || null,
                  affiliateUrl: rec.buyUrl,
                  imageUrl: rec.imageUrl || null,
                  price: rec.salePrice || rec.price || null,
                  currency: rec.currency || "GBP",
                  category,
                  isPriceDropped,
                  previousPrice: isPriceDropped ? existingOffer.price : existingOffer.previousPrice,
                  isNewArrival: false,
                },
              });
              result.updated++;
            } else {
              await prisma.cjOffer.create({
                data: {
                  networkId: CJ_NETWORK_ID,
                  advertiserId: advertiser.id,
                  externalId: rec.adId || null,
                  title: rec.name,
                  description: rec.description || null,
                  affiliateUrl: rec.buyUrl,
                  imageUrl: rec.imageUrl || null,
                  price: rec.salePrice || rec.price || null,
                  currency: rec.currency || "GBP",
                  category,
                  tags: [keyword],
                  isNewArrival: true,
                  isActive: true,
                },
              });
              result.created++;
            }
          } catch (err) {
            result.errors.push(
              `Failed to sync product ${rec.adId}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      } catch (err) {
        result.errors.push(
          `Product search for "${keyword}" failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  } catch (err) {
    result.errors.push(`Product sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  await logSync("PRODUCTS", result);
  return result;
}

/**
 * Sync commission/transaction data for a date range.
 */
export async function syncCommissions(
  dateFrom: string,
  dateTo: string,
  budgetMs = 50_000
): Promise<SyncResult> {
  if (!isCjConfigured()) {
    return { processed: 0, created: 0, updated: 0, errors: ["CJ_API_TOKEN not configured"] };
  }

  const { prisma } = await import("@/lib/db");
  const result: SyncResult = { processed: 0, created: 0, updated: 0, errors: [] };

  const syncStart = Date.now();

  try {
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      // Budget guard — stop before exhausting Vercel timeout
      if (Date.now() - syncStart > budgetMs) {
        console.warn("[cj-sync] Commission sync budget exhausted, returning partial result");
        break;
      }

      const response = await fetchCommissions({
        dateFrom,
        dateTo,
        pageNumber,
        recordsPerPage: 100,
      });

      for (const rec of response.records) {
        try {
          result.processed++;

          // Find the advertiser in our DB
          const advertiser = await prisma.cjAdvertiser.findFirst({
            where: { networkId: CJ_NETWORK_ID, externalId: rec.advertiserId },
            select: { id: true },
          });

          const status = mapCommissionStatus(rec.actionStatus);

          if (!advertiser) {
            result.errors.push(
              `Skipping commission ${rec.actionId}: advertiser '${rec.advertiserName || rec.advertiserId}' not found in DB`
            );
            continue;
          }

          await prisma.cjCommission.upsert({
            where: {
              networkId_externalId: {
                networkId: CJ_NETWORK_ID,
                externalId: rec.actionId,
              },
            },
            create: {
              networkId: CJ_NETWORK_ID,
              advertiserId: advertiser.id,
              externalId: rec.actionId,
              actionType: rec.actionType,
              saleAmount: rec.saleAmount,
              commissionAmount: rec.commissionAmount,
              currency: rec.currency,
              status,
              eventDate: new Date(rec.eventDate),
              lockDate: rec.lockingDate ? new Date(rec.lockingDate) : null,
              publishDate: rec.postingDate ? new Date(rec.postingDate) : null,
              metadata: {
                orderId: rec.orderId,
                shopperId: rec.shopperId,
                sid: rec.sid,
                original: rec.original,
              },
            },
            update: {
              saleAmount: rec.saleAmount,
              commissionAmount: rec.commissionAmount,
              status,
              lockDate: rec.lockingDate ? new Date(rec.lockingDate) : undefined,
              publishDate: rec.postingDate ? new Date(rec.postingDate) : undefined,
            },
          });

          result.created++;
        } catch (err) {
          result.errors.push(
            `Failed to sync commission ${rec.actionId}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      hasMore = response.recordsReturned >= 100 && pageNumber < 10;
      pageNumber++;
    }
  } catch (err) {
    result.errors.push(`Commission sync failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  await logSync("COMMISSIONS", result);
  return result;
}

/**
 * Check pending advertisers — if any became JOINED, auto-fetch their links.
 */
export async function checkPendingAdvertisers(budgetMs = 50_000): Promise<{
  checked: number;
  newlyApproved: string[];
  linksSynced: number;
}> {
  const { prisma } = await import("@/lib/db");
  const checkStart = Date.now();

  // Always run a full sync first — this populates the DB on first run
  // and detects status changes (PENDING→JOINED) on subsequent runs.
  // Previously this function returned early when DB had 0 PENDING records,
  // which meant the initial sync never ran (bootstrap problem).
  const remaining = () => budgetMs - (Date.now() - checkStart);
  const { result: syncResult, newlyApproved } = await syncAdvertisers(remaining());

  const totalInDb = syncResult.created + syncResult.updated;

  let linksSynced = 0;

  // For each newly approved advertiser, fetch their links and products
  for (const advId of newlyApproved) {
    if (remaining() < 5_000) {
      console.warn("[cj-sync] Budget low, skipping remaining newly approved advertisers");
      break;
    }

    console.log(`[cj-sync] Auto-fetching links for newly approved advertiser: ${advId}`);
    const linksResult = await syncLinks(advId);
    linksSynced += linksResult.created;

    // Search for site-relevant products
    if (remaining() > 5_000) {
      const { getKeywordsForSite } = await import("./site-keywords");
      const keywords = getKeywordsForSite();
      await syncProducts(advId, keywords);
    }
  }

  return {
    checked: totalInDb,
    newlyApproved,
    linksSynced,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapCjStatus(status: string): "JOINED" | "PENDING" | "NOT_JOINED" | "DECLINED" {
  switch (status?.toLowerCase()) {
    case "joined":
      return "JOINED";
    case "pending":
      return "PENDING";
    case "notjoined":
    case "not joined":
      return "NOT_JOINED";
    case "declined":
    case "rejected":
      return "DECLINED";
    default:
      return "NOT_JOINED";
  }
}

function mapLinkType(type: string): "TEXT" | "BANNER" | "PRODUCT" | "DEEP" {
  switch (type?.toLowerCase()) {
    case "text link":
    case "text":
      return "TEXT";
    case "banner":
    case "image":
      return "BANNER";
    case "product":
      return "PRODUCT";
    case "deep link":
    case "deep":
      return "DEEP";
    default:
      return "TEXT";
  }
}

function mapCommissionStatus(status: string): "PENDING" | "APPROVED" | "DECLINED" | "LOCKED" {
  switch (status?.toLowerCase()) {
    case "new":
    case "extended":
      return "PENDING";
    case "closed":
      return "APPROVED";
    case "locked":
      return "LOCKED";
    default:
      return "PENDING";
  }
}

function categorizeProduct(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  if (/hotel|resort|accommodation|suite|room/i.test(text)) return "hotel";
  if (/flight|airline|airfare|qatar|emirates/i.test(text)) return "flight";
  if (/tour|experience|activity|ticket|museum/i.test(text)) return "experience";
  if (/restaurant|dining|food|halal|cuisine/i.test(text)) return "dining";
  if (/car|transfer|taxi|airport|chauffeur/i.test(text)) return "transport";
  if (/shop|luxury|fashion|store|mall/i.test(text)) return "shopping";
  if (/insurance|travel insurance|coverage/i.test(text)) return "insurance";
  return "travel";
}

async function logSync(syncType: string, result: SyncResult): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.cjSyncLog.create({
      data: {
        networkId: CJ_NETWORK_ID,
        syncType: syncType as "ADVERTISERS" | "LINKS" | "PRODUCTS" | "COMMISSIONS" | "DEALS",
        status: result.errors.length > 0 ? (result.processed > 0 ? "PARTIAL" : "FAILED") : "SUCCESS",
        recordsProcessed: result.processed,
        recordsCreated: result.created,
        recordsUpdated: result.updated,
        errors: result.errors.length > 0 ? result.errors : undefined,
        duration: 0,
      },
    });
  } catch (err) {
    console.warn("[cj-sync] Failed to log sync:", err instanceof Error ? err.message : String(err));
  }
}
