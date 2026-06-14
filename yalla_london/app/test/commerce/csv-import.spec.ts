/**
 * Integration tests for Etsy CSV importers — lib/commerce/etsy-csv-import.ts
 *
 * Tests CSV parsing, column mapping, deduplication, error handling,
 * and stats aggregation. Uses mocked Prisma for DB calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────
// We need to mock the dynamic import of @/lib/db used inside the import functions.
// The test setup already provides a global mock, but we need to control specific
// method behavior per test.

const mockPurchaseCreate = vi.fn();
const mockPurchaseFindFirst = vi.fn();
const mockEtsyListingDraftFindFirst = vi.fn();
const mockEtsyShopConfigUpsert = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    purchase: {
      create: (...args: unknown[]) => mockPurchaseCreate(...args),
      findFirst: (...args: unknown[]) => mockPurchaseFindFirst(...args),
    },
    etsyListingDraft: {
      findFirst: (...args: unknown[]) => mockEtsyListingDraftFindFirst(...args),
    },
    etsyShopConfig: {
      upsert: (...args: unknown[]) => mockEtsyShopConfigUpsert(...args),
    },
  },
}));

import {
  importEtsyOrdersCsv,
  importEtsyStatsCsv,
} from "../../lib/commerce/etsy-csv-import";

// ─── Fixtures ────────────────────────────────────────────────────────

const VALID_ORDERS_CSV = `Sale Date,Item Name,Buyer,Quantity,Price,Coupon Code,Discount Amount,Shipping,Sales Tax,Order Total,Status,Transaction ID,Listing ID
2026-02-15,London Travel Guide,JohnDoe,1,$9.99,YALLA-TEST-ABC123,$0.00,$0.00,$0.80,$10.79,Completed,TXN001,LST001
2026-02-16,Istanbul Wall Art,JaneDoe,2,$14.99,,$0.00,$0.00,$1.20,$31.18,Completed,TXN002,LST002`;

const VALID_STATS_CSV = `Date,Views,Visits,Orders,Revenue,Conversion Rate
2026-02-15,150,120,5,$49.95,4.2
2026-02-16,200,160,8,$79.92,5.0
2026-02-17,180,140,3,$29.97,2.1`;

// ─── Tests: Orders CSV ──────────────────────────────────────────────

describe("importEtsyOrdersCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPurchaseFindFirst.mockResolvedValue(null); // no duplicates by default
    mockEtsyListingDraftFindFirst.mockResolvedValue({
      brief: { digitalProductId: "prod-123" },
    });
    mockPurchaseCreate.mockResolvedValue({ id: "purchase-1" });
    mockEtsyShopConfigUpsert.mockResolvedValue({});
  });

  it("parses valid orders CSV and returns correct counts", async () => {
    const result = await importEtsyOrdersCsv("yalla-london", VALID_ORDERS_CSV);

    expect(result.totalRows).toBe(2);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("creates Purchase records with correct amount in cents", async () => {
    await importEtsyOrdersCsv("yalla-london", VALID_ORDERS_CSV);

    // First row: $10.79 -> 1079 cents
    const firstCall = mockPurchaseCreate.mock.calls[0][0];
    expect(firstCall.data.amount).toBe(1079);
    expect(firstCall.data.currency).toBe("USD");
    expect(firstCall.data.channel).toBe("etsy");
  });

  it("sets payment_id to etsy_{transactionId} format", async () => {
    await importEtsyOrdersCsv("yalla-london", VALID_ORDERS_CSV);

    const firstCall = mockPurchaseCreate.mock.calls[0][0];
    expect(firstCall.data.payment_id).toBe("etsy_TXN001");
  });

  it("skips duplicate orders by transaction ID", async () => {
    // First row matches existing record
    mockPurchaseFindFirst.mockResolvedValueOnce({ id: "existing-purchase" });
    // Second row does not
    mockPurchaseFindFirst.mockResolvedValueOnce(null);

    const result = await importEtsyOrdersCsv("yalla-london", VALID_ORDERS_CSV);

    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(1);
    expect(mockPurchaseCreate).toHaveBeenCalledTimes(1);
  });

  it("returns error for empty CSV (header only)", async () => {
    const emptyCsv = "Sale Date,Item Name,Buyer\n";
    const result = await importEtsyOrdersCsv("yalla-london", emptyCsv);

    expect(result.totalRows).toBe(0);
    expect(result.errors).toContainEqual(
      expect.stringContaining("empty"),
    );
  });

  it("returns error for completely empty content", async () => {
    const result = await importEtsyOrdersCsv("yalla-london", "");

    expect(result.totalRows).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("handles CSV with quoted fields containing commas", async () => {
    const csvWithCommas = `Sale Date,Item Name,Buyer,Quantity,Price,Coupon Code,Discount Amount,Shipping,Sales Tax,Order Total,Status,Transaction ID,Listing ID
2026-02-15,"London Guide, Premium Edition",JohnDoe,1,$19.99,,$0.00,$0.00,$1.60,$21.59,Completed,TXN003,LST003`;

    const result = await importEtsyOrdersCsv("yalla-london", csvWithCommas);

    expect(result.totalRows).toBe(1);
    // The item name should be parsed correctly including the comma
    expect(result.imported).toBe(1);
  });

  it("handles CSV with missing optional columns gracefully", async () => {
    const minimalCsv = `Sale Date,Item Name,Order Total,Status,Transaction ID
2026-02-20,Mini Guide,$5.99,Completed,TXN004`;

    // No listing ID -> no product match -> skipped
    mockEtsyListingDraftFindFirst.mockResolvedValueOnce(null);

    const result = await importEtsyOrdersCsv("yalla-london", minimalCsv);

    // Should skip because no matching product found (no Listing ID column)
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("skips rows with no matching DigitalProduct", async () => {
    mockEtsyListingDraftFindFirst.mockResolvedValue(null);

    const result = await importEtsyOrdersCsv("yalla-london", VALID_ORDERS_CSV);

    expect(result.skipped).toBe(2);
    expect(result.imported).toBe(0);
  });

  it("updates EtsyShopConfig lastCsvImportAt after import", async () => {
    await importEtsyOrdersCsv("yalla-london", VALID_ORDERS_CSV);

    expect(mockEtsyShopConfigUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockEtsyShopConfigUpsert.mock.calls[0][0];
    expect(upsertCall.where.siteId).toBe("yalla-london");
    expect(upsertCall.update.lastCsvImportAt).toBeInstanceOf(Date);
  });

  it("sets status to COMPLETED for completed orders", async () => {
    await importEtsyOrdersCsv("yalla-london", VALID_ORDERS_CSV);

    const firstCall = mockPurchaseCreate.mock.calls[0][0];
    expect(firstCall.data.status).toBe("COMPLETED");
  });

  it("sets status to PENDING for non-completed orders", async () => {
    const pendingCsv = `Sale Date,Item Name,Buyer,Quantity,Price,Coupon Code,Discount Amount,Shipping,Sales Tax,Order Total,Status,Transaction ID,Listing ID
2026-02-15,London Guide,JohnDoe,1,$9.99,,$0.00,$0.00,$0.80,$10.79,Processing,TXN005,LST001`;

    await importEtsyOrdersCsv("yalla-london", pendingCsv);

    const call = mockPurchaseCreate.mock.calls[0][0];
    expect(call.data.status).toBe("PENDING");
  });
});

// ─── Tests: Stats CSV ───────────────────────────────────────────────

describe("importEtsyStatsCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEtsyShopConfigUpsert.mockResolvedValue({});
  });

  it("parses valid stats CSV and returns correct counts", async () => {
    const result = await importEtsyStatsCsv("yalla-london", VALID_STATS_CSV);

    expect(result.totalRows).toBe(3);
    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("aggregates stats correctly in EtsyShopConfig.statsJson", async () => {
    await importEtsyStatsCsv("yalla-london", VALID_STATS_CSV);

    expect(mockEtsyShopConfigUpsert).toHaveBeenCalledTimes(1);
    const upsertCall = mockEtsyShopConfigUpsert.mock.calls[0][0];
    const stats = upsertCall.update.statsJson;

    // 150 + 200 + 180 = 530 views
    expect(stats.totalViews).toBe(530);
    // 120 + 160 + 140 = 420 visits
    expect(stats.totalVisits).toBe(420);
    // 5 + 8 + 3 = 16 orders
    expect(stats.totalOrders).toBe(16);
    // Revenue in cents: $49.95 + $79.92 + $29.97 = $159.84 -> 15984 cents
    expect(stats.totalRevenue).toBe(15984);
    // Avg conversion: (4.2 + 5.0 + 2.1) / 3 = 3.766...
    expect(stats.avgConversionRate).toBeCloseTo(3.767, 1);
  });

  it("sets date range from first and last rows", async () => {
    await importEtsyStatsCsv("yalla-london", VALID_STATS_CSV);

    const upsertCall = mockEtsyShopConfigUpsert.mock.calls[0][0];
    const stats = upsertCall.update.statsJson;

    expect(stats.dateRange.from).toBe("2026-02-15");
    expect(stats.dateRange.to).toBe("2026-02-17");
  });

  it("returns error for empty stats CSV", async () => {
    const result = await importEtsyStatsCsv("yalla-london", "");

    expect(result.totalRows).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("skips rows with missing Date column", async () => {
    const noDateCsv = `Views,Visits,Orders
150,120,5`;

    const result = await importEtsyStatsCsv("yalla-london", noDateCsv);

    // Row has no "Date" column so mapToStatsRow returns null -> skipped
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it("handles zero values in stats without errors", async () => {
    const zeroCsv = `Date,Views,Visits,Orders,Revenue,Conversion Rate
2026-02-20,0,0,0,$0.00,0.0`;

    const result = await importEtsyStatsCsv("yalla-london", zeroCsv);

    expect(result.imported).toBe(1);
    const upsertCall = mockEtsyShopConfigUpsert.mock.calls[0][0];
    const stats = upsertCall.update.statsJson;
    expect(stats.totalViews).toBe(0);
    expect(stats.totalOrders).toBe(0);
    expect(stats.totalRevenue).toBe(0);
  });

  it("includes importedAt timestamp in stats", async () => {
    const before = new Date().toISOString();
    await importEtsyStatsCsv("yalla-london", VALID_STATS_CSV);

    const upsertCall = mockEtsyShopConfigUpsert.mock.calls[0][0];
    const stats = upsertCall.update.statsJson;
    expect(stats.importedAt).toBeDefined();
    // importedAt should be a valid ISO timestamp
    expect(new Date(stats.importedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );
  });
});
