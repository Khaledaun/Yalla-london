/**
 * CJ Deal Discovery Engine
 *
 * Automated deal finding:
 * 1. Category sweep — search London-relevant categories across joined advertisers
 * 2. Seasonal sweep — time-sensitive deals based on current month
 * 3. Price drop detection — compare current prices with previous sync
 * 4. New product detection — flag newly discovered products
 * 5. Expiring soon — flag offers with validTo within 7 days
 */

import { searchProducts, CJ_NETWORK_ID, isCjConfigured } from "./cj-client";

// ---------------------------------------------------------------------------
// Category & Seasonal Keywords
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS = [
  { keyword: "hotels london", category: "hotel" },
  { keyword: "flights london", category: "flight" },
  { keyword: "tours london", category: "experience" },
  { keyword: "halal restaurants london", category: "dining" },
  { keyword: "luxury experiences london", category: "experience" },
  { keyword: "car rental london", category: "transport" },
  { keyword: "airport transfer london", category: "transport" },
  { keyword: "travel insurance uk", category: "insurance" },
  { keyword: "luxury shopping london", category: "shopping" },
  { keyword: "london attractions tickets", category: "experience" },
];

function getSeasonalKeywords(): Array<{ keyword: string; category: string }> {
  const month = new Date().getMonth(); // 0-indexed
  const keywords: Array<{ keyword: string; category: string }> = [];

  // Current month + next 2 months
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  for (let i = 0; i < 3; i++) {
    const m = (month + i) % 12;
    keywords.push(
      { keyword: `${monthNames[m]} london deals`, category: "travel" },
    );
  }

  // Add specific seasonal events
  if (month >= 2 && month <= 4) {
    keywords.push({ keyword: "ramadan london", category: "dining" });
    keywords.push({ keyword: "eid london", category: "experience" });
  }
  if (month >= 10 || month <= 0) {
    keywords.push({ keyword: "christmas london", category: "experience" });
    keywords.push({ keyword: "new year london", category: "experience" });
    keywords.push({ keyword: "winter london hotel", category: "hotel" });
  }
  if (month >= 5 && month <= 7) {
    keywords.push({ keyword: "summer london", category: "experience" });
    keywords.push({ keyword: "summer deals london hotel", category: "hotel" });
  }

  return keywords;
}

// ---------------------------------------------------------------------------
// Discovery Engine
// ---------------------------------------------------------------------------

export interface DealDiscoveryResult {
  totalDealsFound: number;
  newDeals: number;
  priceDrops: number;
  expiringSoon: number;
  byCategory: Record<string, number>;
  errors: string[];
}

/**
 * Run the full deal discovery engine.
 * Searches across all joined advertisers for London-relevant deals.
 */
export async function runDealDiscovery(budgetMs = 50_000): Promise<DealDiscoveryResult> {
  if (!isCjConfigured()) {
    return {
      totalDealsFound: 0,
      newDeals: 0,
      priceDrops: 0,
      expiringSoon: 0,
      byCategory: {},
      errors: ["CJ_API_TOKEN not configured"],
    };
  }

  const { prisma } = await import("@/lib/db");
  const startTime = Date.now();
  const result: DealDiscoveryResult = {
    totalDealsFound: 0,
    newDeals: 0,
    priceDrops: 0,
    expiringSoon: 0,
    byCategory: {},
    errors: [],
  };

  // Get joined advertisers
  const joinedAdvertisers = await prisma.cjAdvertiser.findMany({
    where: { networkId: CJ_NETWORK_ID, status: "JOINED" },
    select: { id: true, externalId: true, name: true, category: true },
  });

  if (joinedAdvertisers.length === 0) {
    return result;
  }

  const advertiserIds = joinedAdvertisers.map((a) => a.externalId);

  // Combine category + seasonal keywords
  const allKeywords = [...CATEGORY_KEYWORDS, ...getSeasonalKeywords()];

  for (const { keyword, category } of allKeywords) {
    // Budget check
    if (Date.now() - startTime > budgetMs) {
      console.warn("[deal-discovery] Budget exhausted, stopping");
      break;
    }

    try {
      const response = await searchProducts({
        advertiserIds,
        keywords: keyword,
        recordsPerPage: 25,
      });

      for (const product of response.records) {
        result.totalDealsFound++;
        result.byCategory[category] = (result.byCategory[category] || 0) + 1;

        // Find matching advertiser internal ID
        const adv = joinedAdvertisers.find((a) => a.externalId === product.advertiserId);
        if (!adv) continue;

        try {
          // Check if this product already exists
          const existing = product.adId
            ? await prisma.cjOffer.findFirst({
                where: {
                  networkId: CJ_NETWORK_ID,
                  advertiserId: adv.id,
                  externalId: product.adId,
                },
              })
            : null;

          const currentPrice = product.salePrice || product.price || 0;

          if (existing) {
            // Price drop detection (>10%)
            const isPriceDrop =
              existing.price !== null &&
              currentPrice > 0 &&
              currentPrice < existing.price * 0.9;

            if (isPriceDrop) {
              result.priceDrops++;
              await prisma.cjOffer.update({
                where: { id: existing.id },
                data: {
                  price: currentPrice,
                  previousPrice: existing.price,
                  isPriceDropped: true,
                  isNewArrival: false,
                },
              });
            } else {
              await prisma.cjOffer.update({
                where: { id: existing.id },
                data: {
                  price: currentPrice,
                  isNewArrival: false,
                },
              });
            }
          } else {
            // New product
            result.newDeals++;
            await prisma.cjOffer.create({
              data: {
                networkId: CJ_NETWORK_ID,
                advertiserId: adv.id,
                externalId: product.adId || null,
                title: product.name,
                description: product.description || null,
                affiliateUrl: product.buyUrl,
                imageUrl: product.imageUrl || null,
                price: currentPrice || null,
                currency: product.currency || "GBP",
                category,
                tags: [keyword],
                isNewArrival: true,
                isActive: true,
              },
            });
          }
        } catch (err) {
          result.errors.push(
            `Failed to process product ${product.adId}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    } catch (err) {
      result.errors.push(
        `Search failed for "${keyword}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Check for expiring offers (validTo within 7 days)
  try {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiring = await prisma.cjOffer.count({
      where: {
        networkId: CJ_NETWORK_ID,
        isActive: true,
        validTo: { lte: sevenDaysFromNow, gte: new Date() },
      },
    });
    result.expiringSoon = expiring;
  } catch (err) {
    result.errors.push(`Expiring check failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Log discovery run
  try {
    await prisma.cjSyncLog.create({
      data: {
        networkId: CJ_NETWORK_ID,
        syncType: "DEALS",
        status: result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        recordsProcessed: result.totalDealsFound,
        recordsCreated: result.newDeals,
        recordsUpdated: result.priceDrops,
        errors: result.errors.length > 0 ? result.errors : undefined,
        duration: Date.now() - startTime,
      },
    });
  } catch (err) {
    console.warn("[deal-discovery] Failed to log discovery:", err instanceof Error ? err.message : String(err));
  }

  return result;
}

/**
 * Get hot deals: price drops, new arrivals, expiring soon.
 */
export async function getHotDeals(limit = 20): Promise<{
  priceDrops: Array<{ id: string; title: string; price: number | null; previousPrice: number | null; affiliateUrl: string; imageUrl: string | null; category: string; advertiserName: string }>;
  newArrivals: Array<{ id: string; title: string; price: number | null; affiliateUrl: string; imageUrl: string | null; category: string; advertiserName: string }>;
  expiringSoon: Array<{ id: string; title: string; validTo: Date | null; affiliateUrl: string; category: string; advertiserName: string }>;
}> {
  const { prisma } = await import("@/lib/db");

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [priceDrops, newArrivals, expiringSoon] = await Promise.all([
    prisma.cjOffer.findMany({
      where: { networkId: CJ_NETWORK_ID, isActive: true, isPriceDropped: true },
      include: { advertiser: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.cjOffer.findMany({
      where: { networkId: CJ_NETWORK_ID, isActive: true, isNewArrival: true },
      include: { advertiser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.cjOffer.findMany({
      where: {
        networkId: CJ_NETWORK_ID,
        isActive: true,
        validTo: { lte: sevenDaysFromNow, gte: new Date() },
      },
      include: { advertiser: { select: { name: true } } },
      orderBy: { validTo: "asc" },
      take: limit,
    }),
  ]);

  return {
    priceDrops: priceDrops.map((o) => ({
      id: o.id,
      title: o.title,
      price: o.price,
      previousPrice: o.previousPrice,
      affiliateUrl: o.affiliateUrl,
      imageUrl: o.imageUrl,
      category: o.category,
      advertiserName: o.advertiser.name,
    })),
    newArrivals: newArrivals.map((o) => ({
      id: o.id,
      title: o.title,
      price: o.price,
      affiliateUrl: o.affiliateUrl,
      imageUrl: o.imageUrl,
      category: o.category,
      advertiserName: o.advertiser.name,
    })),
    expiringSoon: expiringSoon.map((o) => ({
      id: o.id,
      title: o.title,
      validTo: o.validTo,
      affiliateUrl: o.affiliateUrl,
      category: o.category,
      advertiserName: o.advertiser.name,
    })),
  };
}
