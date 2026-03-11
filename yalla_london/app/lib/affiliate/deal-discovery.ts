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
import { getDealCategoriesForSite } from "./site-keywords";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";

// ---------------------------------------------------------------------------
// Category & Seasonal Keywords (per-site)
// ---------------------------------------------------------------------------

function getCategoryKeywords(siteId?: string): Array<{ keyword: string; category: string }> {
  const categories = getDealCategoriesForSite(siteId);
  const result: Array<{ keyword: string; category: string }> = [];
  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      result.push({ keyword, category });
    }
  }
  return result;
}

function getSeasonalKeywords(siteId?: string): Array<{ keyword: string; category: string }> {
  const month = new Date().getMonth(); // 0-indexed
  const keywords: Array<{ keyword: string; category: string }> = [];
  const id = siteId || getDefaultSiteId();
  const config = getSiteConfig(id);
  const dest = config?.destination?.toLowerCase() || "london";

  // Current month + next 2 months
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  for (let i = 0; i < 3; i++) {
    const m = (month + i) % 12;
    keywords.push(
      { keyword: `${monthNames[m]} ${dest} deals`, category: "travel" },
    );
  }

  // Ramadan/Eid — relevant for all sites targeting Arab travelers
  if (month >= 2 && month <= 4) {
    keywords.push({ keyword: `ramadan ${dest}`, category: "dining" });
    keywords.push({ keyword: `eid ${dest}`, category: "experience" });
  }
  if (month >= 10 || month <= 0) {
    keywords.push({ keyword: `winter ${dest} hotel`, category: "hotel" });
    keywords.push({ keyword: `new year ${dest}`, category: "experience" });
  }
  if (month >= 5 && month <= 7) {
    keywords.push({ keyword: `summer ${dest}`, category: "experience" });
    keywords.push({ keyword: `summer deals ${dest} hotel`, category: "hotel" });
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
 * Searches across all joined advertisers for site-relevant deals.
 */
export async function runDealDiscovery(budgetMs = 50_000, siteId?: string): Promise<DealDiscoveryResult> {
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

  // Combine category + seasonal keywords (per-site)
  const allKeywords = [...getCategoryKeywords(siteId), ...getSeasonalKeywords(siteId)];

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
                siteId: siteId || null,
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
        ...(siteId ? { OR: [{ siteId }, { siteId: null }] } : {}),
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
