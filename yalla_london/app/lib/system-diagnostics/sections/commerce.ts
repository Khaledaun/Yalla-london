/**
 * Commerce & Etsy Diagnostics
 *
 * Tests: Etsy API config, commerce trends, shop configuration, product sync.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "commerce";

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis };
}

const commerceSection = async (
  _siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // ── 1. Etsy API Key ────────────────────────────────────────────────
  const etsyApiKey = process.env.ETSY_API_KEY;
  if (etsyApiKey && etsyApiKey.length > 10) {
    results.push(pass("etsy-key", "Etsy API Key", "Configured", "Etsy API key enables product sync, shop monitoring, and commerce trend analysis. Products from Etsy can be featured in content for affiliate revenue."));
  } else {
    results.push(warn("etsy-key", "Etsy API Key", "ETSY_API_KEY not set", "Etsy API key enables product sync and commerce features.", "Set ETSY_API_KEY to enable Etsy shop integration."));
  }

  // ── 2. Etsy Shop ID ───────────────────────────────────────────────
  const etsyShopId = process.env.ETSY_SHOP_ID;
  if (etsyShopId) {
    results.push(pass("etsy-shop", "Etsy Shop ID", `Shop: ${etsyShopId}`, "Your Etsy shop ID links the platform to your specific Etsy store for product sync and analytics."));
  } else {
    results.push(warn("etsy-shop", "Etsy Shop ID", "ETSY_SHOP_ID not set", "Etsy shop ID links the platform to your store.", "Set ETSY_SHOP_ID if you have an Etsy shop to integrate."));
  }

  // ── 3. Commerce Trends Cron ────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const recentCommerce = await prisma.cronJobLog.findFirst({
      where: { job_name: { contains: "commerce" } },
      orderBy: { started_at: "desc" },
      select: { status: true, started_at: true },
    });

    if (recentCommerce) {
      const ageHours = Math.round((Date.now() - new Date(recentCommerce.started_at).getTime()) / (1000 * 60 * 60));
      if (recentCommerce.status === "completed") {
        results.push(pass("commerce-cron", "Commerce Trends Cron", `Last run: ${ageHours}h ago — completed`, "The commerce trends cron analyzes product demand and seasonal patterns. Helps identify which products to feature in content."));
      } else {
        results.push(warn("commerce-cron", "Commerce Trends Cron", `Last run: ${ageHours}h ago — ${recentCommerce.status}`, "The commerce trends cron analyzes product demand.", "The last run didn't complete successfully. Check the departures board for errors."));
      }
    } else {
      results.push(warn("commerce-cron", "Commerce Trends Cron", "Never run", "The commerce trends cron analyzes product demand and seasonal patterns.", "This cron job hasn't been executed yet. It may not be needed until Etsy is configured."));
    }
  } catch {
    results.push(warn("commerce-cron", "Commerce Trends", "Could not check cron history", "Checks if the commerce trends cron has been running."));
  }

  // ── 4. Etsy Sync Cron ─────────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const recentSync = await prisma.cronJobLog.findFirst({
      where: { job_name: { contains: "etsy" } },
      orderBy: { started_at: "desc" },
      select: { status: true, started_at: true },
    });

    if (recentSync) {
      const ageHours = Math.round((Date.now() - new Date(recentSync.started_at).getTime()) / (1000 * 60 * 60));
      results.push(pass("etsy-sync", "Etsy Sync Cron", `Last sync: ${ageHours}h ago — ${recentSync.status}`, "Etsy sync keeps your product data up-to-date with your Etsy shop. Prices, availability, and descriptions are refreshed."));
    } else {
      results.push(warn("etsy-sync", "Etsy Sync Cron", "Never run", "Etsy sync refreshes product data from your Etsy shop.", "The Etsy sync hasn't run. Configure ETSY_API_KEY and ETSY_SHOP_ID first."));
    }
  } catch {
    results.push(warn("etsy-sync", "Etsy Sync", "Could not check sync status", "Checks if Etsy product sync has been running."));
  }

  // ── 5. Affiliate Categories Config ─────────────────────────────────
  try {
    const { getSiteConfig } = await import("@/config/sites");
    const config = getSiteConfig(_siteId);
    if (config?.affiliateCategories && config.affiliateCategories.length > 0) {
      results.push(pass("affiliate-cats", "Affiliate Categories", `${config.affiliateCategories.length} categories for ${config.name}`, "Affiliate categories determine which types of products and booking links get injected into content. Each category maps to affiliate partners (HalalBooking, Booking.com, Viator, etc.)"));
    } else {
      results.push(warn("affiliate-cats", "Affiliate Categories", "No affiliate categories configured", "Affiliate categories drive revenue generation.", "Add affiliate categories in config/sites.ts for this site."));
    }
  } catch {
    results.push(warn("affiliate-cats", "Affiliate Categories", "Could not check affiliate config", "Checks affiliate category configuration."));
  }

  return results;
};

export default commerceSection;
