/**
 * Etsy CSV Import — Parse Etsy export files for order/stats data
 *
 * Since Etsy API v3 doesn't expose shop analytics (views, favorites, conversion),
 * this module parses the CSV exports available from the Etsy Seller Dashboard.
 *
 * Supported CSV types:
 * 1. Orders CSV — creates Purchase records with channel: "etsy"
 * 2. Stats CSV — updates EtsyShopConfig.statsJson
 */

import type { EtsyOrderCsvRow, EtsyStatsCsvRow, CsvImportResult } from "./types";

// ─── CSV Parser (no external deps) ────────────────────────

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ─── Orders CSV Import ────────────────────────────────────

/**
 * Import Etsy orders CSV and create Purchase records.
 *
 * Expected Etsy CSV columns (standard export):
 * - Sale Date, Item Name, Buyer, Quantity, Price, Coupon Code,
 *   Coupon Details, Discount Amount, Shipping, Sales Tax, Order Total,
 *   Status, Transaction ID, Listing ID
 */
export async function importEtsyOrdersCsv(
  siteId: string,
  csvContent: string,
): Promise<CsvImportResult> {
  const rows = parseCsv(csvContent);
  const result: CsvImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    totalRows: rows.length,
  };

  if (rows.length === 0) {
    result.errors.push("CSV is empty or has no data rows");
    return result;
  }

  const { prisma } = await import("@/lib/db");

  for (const row of rows) {
    try {
      const orderRow = mapToOrderRow(row);
      if (!orderRow) {
        result.skipped++;
        continue;
      }

      // Check for duplicate by payment_id (Purchase uses snake_case fields)
      const paymentId = orderRow.transactionId
        ? `etsy_${orderRow.transactionId}`
        : `etsy_import_${Date.now()}_${result.imported}`;

      if (orderRow.transactionId) {
        const existing = await prisma.purchase.findFirst({
          where: {
            channel: "etsy",
            payment_id: paymentId,
          },
        });
        if (existing) {
          result.skipped++;
          continue;
        }
      }

      // Find matching DigitalProduct via EtsyListingDraft → ProductBrief
      let productId: string | null = null;
      if (orderRow.listingId) {
        const draft = await prisma.etsyListingDraft.findFirst({
          where: { etsyListingId: orderRow.listingId },
          select: { brief: { select: { digitalProductId: true } } },
        });
        productId = draft?.brief?.digitalProductId ?? null;
      }

      // Purchase.product_id is required — skip if no matching product
      if (!productId) {
        console.warn(
          `[etsy-csv-import] No matching DigitalProduct for CSV txn ${orderRow.transactionId} — skipping`,
        );
        result.skipped++;
        continue;
      }

      // Create Purchase record (fields match prisma/schema.prisma)
      await prisma.purchase.create({
        data: {
          site_id: siteId,
          product_id: productId,
          customer_email: orderRow.buyerEmail ?? `etsy_buyer_${orderRow.transactionId}@import.local`,
          amount: orderRow.orderTotal,
          currency: "USD",
          payment_provider: "etsy",
          payment_id: paymentId,
          status: orderRow.status === "Completed" ? "COMPLETED" : "PENDING",
          channel: "etsy",
        },
      });

      result.imported++;
    } catch (err) {
      result.errors.push(
        `Row ${result.imported + result.skipped + result.errors.length + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Update EtsyShopConfig with last import timestamp
  try {
    await prisma.etsyShopConfig.upsert({
      where: { siteId },
      update: { lastCsvImportAt: new Date() },
      create: {
        siteId,
        connectionStatus: "not_connected",
        lastCsvImportAt: new Date(),
      },
    });
  } catch (err) {
    console.warn(
      "[etsy-csv-import] Failed to update EtsyShopConfig:",
      err instanceof Error ? err.message : err,
    );
  }

  return result;
}

function mapToOrderRow(row: Record<string, string>): EtsyOrderCsvRow | null {
  // Etsy CSV column names vary — try common variations
  const saleDate =
    row["Sale Date"] ?? row["Date"] ?? row["Order Date"] ?? "";
  const itemName =
    row["Item Name"] ?? row["Title"] ?? row["Item Title"] ?? "";
  const orderTotal =
    row["Order Total"] ?? row["Total"] ?? row["Price"] ?? "";

  if (!saleDate || !itemName) return null;

  return {
    saleDate,
    itemName,
    buyer: row["Buyer"] ?? row["Customer"] ?? "",
    buyerEmail: row["Buyer Email"] ?? row["Email"] ?? undefined,
    quantity: parseInt(row["Quantity"] ?? "1") || 1,
    price: parseCurrencyToCents(row["Price"] ?? "0"),
    couponCode: row["Coupon Code"] ?? undefined,
    discountAmount: parseCurrencyToCents(row["Discount Amount"] ?? "0"),
    shipping: parseCurrencyToCents(row["Shipping"] ?? "0"),
    salesTax: parseCurrencyToCents(row["Sales Tax"] ?? "0"),
    orderTotal: parseCurrencyToCents(orderTotal),
    status: row["Status"] ?? "Completed",
    transactionId: row["Transaction ID"] ?? row["Order ID"] ?? undefined,
    listingId: row["Listing ID"] ?? undefined,
  };
}

// ─── Stats CSV Import ─────────────────────────────────────

/**
 * Import Etsy shop stats CSV.
 * Updates EtsyShopConfig.statsJson with aggregated metrics.
 *
 * Expected columns: Date, Views, Visits, Orders, Revenue, Conversion Rate
 */
export async function importEtsyStatsCsv(
  siteId: string,
  csvContent: string,
): Promise<CsvImportResult> {
  const rows = parseCsv(csvContent);
  const result: CsvImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    totalRows: rows.length,
  };

  if (rows.length === 0) {
    result.errors.push("Stats CSV is empty or has no data rows");
    return result;
  }

  const statsRows: EtsyStatsCsvRow[] = [];

  for (const row of rows) {
    try {
      const statsRow = mapToStatsRow(row);
      if (statsRow) {
        statsRows.push(statsRow);
        result.imported++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.errors.push(
        `Row ${result.imported + result.skipped + result.errors.length + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Aggregate stats
  const aggregated = {
    totalViews: statsRows.reduce((sum, r) => sum + r.views, 0),
    totalVisits: statsRows.reduce((sum, r) => sum + r.visits, 0),
    totalOrders: statsRows.reduce((sum, r) => sum + r.orders, 0),
    totalRevenue: statsRows.reduce((sum, r) => sum + r.revenue, 0),
    avgConversionRate:
      statsRows.length > 0
        ? statsRows.reduce((sum, r) => sum + r.conversionRate, 0) /
          statsRows.length
        : 0,
    dateRange: {
      from: statsRows.length > 0 ? statsRows[0].date : null,
      to:
        statsRows.length > 0
          ? statsRows[statsRows.length - 1].date
          : null,
    },
    dailyStats: statsRows,
    importedAt: new Date().toISOString(),
  };

  // Update EtsyShopConfig
  const { prisma } = await import("@/lib/db");
  try {
    await prisma.etsyShopConfig.upsert({
      where: { siteId },
      update: {
        statsJson: aggregated as unknown as Record<string, unknown>,
        lastCsvImportAt: new Date(),
      },
      create: {
        siteId,
        connectionStatus: "not_connected",
        statsJson: aggregated as unknown as Record<string, unknown>,
        lastCsvImportAt: new Date(),
      },
    });
  } catch (err) {
    console.warn(
      "[etsy-csv-import] Failed to update EtsyShopConfig stats:",
      err instanceof Error ? err.message : err,
    );
  }

  return result;
}

function mapToStatsRow(row: Record<string, string>): EtsyStatsCsvRow | null {
  const date = row["Date"] ?? row["date"] ?? "";
  if (!date) return null;

  return {
    date,
    views: parseInt(row["Views"] ?? row["views"] ?? "0") || 0,
    visits: parseInt(row["Visits"] ?? row["visits"] ?? "0") || 0,
    orders: parseInt(row["Orders"] ?? row["orders"] ?? "0") || 0,
    revenue: parseCurrencyToCents(row["Revenue"] ?? row["revenue"] ?? "0"),
    conversionRate:
      parseFloat(row["Conversion Rate"] ?? row["conversion_rate"] ?? "0") || 0,
  };
}

// ─── Utility ──────────────────────────────────────────────

function parseCurrencyToCents(value: string): number {
  // Handle "$12.99", "12.99", "$1,234.56", etc.
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}
