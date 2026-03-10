#!/usr/bin/env npx tsx
/**
 * MCP Server: CJ Affiliate
 *
 * Exposes CJ affiliate data as MCP tools so Claude Code can answer
 * questions about advertisers, revenue, link health, content coverage,
 * and sync status.
 *
 * Usage: npx tsx scripts/mcp-cj-server.ts
 *
 * Required env vars:
 *   DATABASE_URL (or DIRECT_URL for Supabase)
 *   CJ_API_TOKEN
 *   CJ_PUBLISHER_CID
 *   CJ_WEBSITE_ID
 *
 * Note: This server queries the database directly (not the CJ API)
 * for most tools. The CJ API is only used for product search and
 * config status checks.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local from the app directory
const __script_dir = typeof __dirname !== "undefined"
  ? __dirname
  : resolve(fileURLToPath(import.meta.url), "..");
config({ path: resolve(__script_dir, "../.env.local") });
config({ path: resolve(__script_dir, "../.env") });
config({ path: resolve(process.cwd(), "yalla_london/app/.env.local") });
config({ path: resolve(process.cwd(), "yalla_london/app/.env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CJ_NETWORK_ID = "cj";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCjCredentials() {
  return {
    apiToken: process.env.CJ_API_TOKEN || "",
    publisherCid: process.env.CJ_PUBLISHER_CID || "",
    websiteId: process.env.CJ_WEBSITE_ID || "",
    configured: !!(process.env.CJ_API_TOKEN && process.env.CJ_PUBLISHER_CID),
  };
}

// ---------------------------------------------------------------------------
// MCP Server Setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "cj-affiliate",
  version: "1.0.0",
});

// ── Tool: cj_config_status ──

server.tool(
  "cj_config_status",
  "Check CJ Affiliate credential configuration and API reachability",
  {},
  async () => {
    const creds = getCjCredentials();
    let apiReachable = false;

    if (creds.configured) {
      try {
        const res = await fetch(
          `https://advertiser-lookup.api.cj.com/v2/advertiser-lookup?requestor-cid=${creds.publisherCid}&advertiser-ids=joined&records-per-page=1`,
          {
            headers: {
              Authorization: `Bearer ${creds.apiToken}`,
              Accept: "application/xml",
            },
            signal: AbortSignal.timeout(10_000),
          }
        );
        apiReachable = res.ok;
      } catch {
        apiReachable = false;
      }
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          configured: creds.configured,
          apiToken: creds.apiToken ? "set" : "missing",
          publisherCid: creds.publisherCid || "missing",
          websiteId: creds.websiteId || "missing",
          apiReachable,
          databaseConnected: true,
        }, null, 2),
      }],
    };
  }
);

// ── Tool: cj_get_advertisers ──

server.tool(
  "cj_get_advertisers",
  "List CJ advertisers (joined, pending, or all) with EPC and category info",
  {
    status: z.enum(["JOINED", "PENDING", "DECLINED", "ALL"]).optional().describe("Filter by status. Default: ALL"),
    limit: z.number().optional().describe("Max results. Default: 50"),
  },
  async ({ status, limit }) => {
    const where: Record<string, unknown> = { networkId: CJ_NETWORK_ID };
    if (status && status !== "ALL") where.status = status;

    const advertisers = await prisma.cjAdvertiser.findMany({
      where,
      orderBy: { threeMonthEpc: "desc" },
      take: limit || 50,
      select: {
        externalId: true,
        name: true,
        status: true,
        category: true,
        sevenDayEpc: true,
        threeMonthEpc: true,
        cookieDuration: true,
        priority: true,
        lastSynced: true,
      },
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          total: advertisers.length,
          advertisers,
        }, null, 2),
      }],
    };
  }
);

// ── Tool: cj_get_revenue ──

server.tool(
  "cj_get_revenue",
  "Get commission revenue summary (7-day and 30-day) with advertiser breakdown",
  {},
  async () => {
    const d7 = new Date(Date.now() - 7 * 86400_000);
    const d30 = new Date(Date.now() - 30 * 86400_000);

    const [rev7, rev30, byAdv] = await Promise.all([
      prisma.cjCommission.aggregate({
        where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d7 } },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      prisma.cjCommission.aggregate({
        where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d30 } },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      prisma.cjCommission.groupBy({
        by: ["advertiserId"],
        where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d30 } },
        _sum: { commissionAmount: true },
        orderBy: { _sum: { commissionAmount: "desc" } },
        take: 10,
      }),
    ]);

    // Resolve advertiser names
    const advIds = byAdv.map((a) => a.advertiserId);
    const names = await prisma.cjAdvertiser.findMany({
      where: { id: { in: advIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(names.map((n) => [n.id, n.name]));

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          last7Days: {
            revenue: rev7._sum.commissionAmount || 0,
            commissions: rev7._count || 0,
          },
          last30Days: {
            revenue: rev30._sum.commissionAmount || 0,
            commissions: rev30._count || 0,
          },
          byAdvertiser: byAdv.map((a) => ({
            name: nameMap.get(a.advertiserId) || "Unknown",
            revenue: a._sum.commissionAmount || 0,
          })),
        }, null, 2),
      }],
    };
  }
);

// ── Tool: cj_get_link_health ──

server.tool(
  "cj_get_link_health",
  "Get link performance metrics: total, active, zero-click, top performers",
  {},
  async () => {
    const links = await prisma.cjLink.findMany({
      where: { advertiser: { networkId: CJ_NETWORK_ID } },
      select: {
        id: true,
        name: true,
        clicks: true,
        impressions: true,
        isActive: true,
      },
      orderBy: { clicks: "desc" },
    });

    const active = links.filter((l) => l.isActive);
    const zeroClick = active.filter((l) => l.clicks === 0 && l.impressions > 0);
    const zeroImpression = active.filter((l) => l.impressions === 0);
    const topPerformers = active.filter((l) => l.clicks > 0).slice(0, 10);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          totalLinks: links.length,
          activeLinks: active.length,
          zeroClickLinks: zeroClick.length,
          zeroImpressionLinks: zeroImpression.length,
          topPerformers: topPerformers.map((l) => ({
            name: l.name,
            clicks: l.clicks,
            impressions: l.impressions,
            ctr: l.impressions > 0 ? (l.clicks / l.impressions * 100).toFixed(2) + "%" : "N/A",
          })),
        }, null, 2),
      }],
    };
  }
);

// ── Tool: cj_get_content_coverage ──

server.tool(
  "cj_get_content_coverage",
  "Check how many published articles have affiliate links vs don't",
  {
    siteId: z.string().optional().describe("Site ID. Default: yalla-london"),
  },
  async ({ siteId }) => {
    const targetSiteId = siteId || "yalla-london";

    const total = await prisma.blogPost.count({
      where: { published: true, deletedAt: null, siteId: targetSiteId },
    });

    let withAffiliates = 0;
    if (total > 0) {
      withAffiliates = await prisma.blogPost.count({
        where: {
          published: true, deletedAt: null, siteId: targetSiteId,
          OR: [
            { content_en: { contains: 'rel="sponsored' } },
            { content_en: { contains: "affiliate-cta-block" } },
          ],
        },
      });
    }

    const uncovered = await prisma.blogPost.findMany({
      where: {
        published: true, deletedAt: null, siteId: targetSiteId,
        NOT: {
          OR: [
            { content_en: { contains: 'rel="sponsored' } },
            { content_en: { contains: "affiliate-cta-block" } },
          ],
        },
      },
      select: { title_en: true, slug: true },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          siteId: targetSiteId,
          totalArticles: total,
          withAffiliates,
          withoutAffiliates: total - withAffiliates,
          coveragePercent: total > 0 ? Math.round((withAffiliates / total) * 100) : 0,
          uncoveredArticles: uncovered.map((a) => ({
            title: a.title_en,
            slug: a.slug,
          })),
        }, null, 2),
      }],
    };
  }
);

// ── Tool: cj_get_sync_status ──

server.tool(
  "cj_get_sync_status",
  "Get the last sync results for each sync type (advertisers, links, products, commissions, deals)",
  {},
  async () => {
    const syncTypes = ["ADVERTISERS", "LINKS", "PRODUCTS", "COMMISSIONS", "DEALS"];
    const results: Record<string, unknown> = {};

    for (const syncType of syncTypes) {
      const last = await prisma.cjSyncLog.findFirst({
        where: { networkId: CJ_NETWORK_ID, syncType },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          recordsProcessed: true,
          recordsCreated: true,
          recordsUpdated: true,
          errors: true,
          duration: true,
          createdAt: true,
        },
      });

      results[syncType] = last
        ? {
            status: last.status,
            processed: last.recordsProcessed,
            created: last.recordsCreated,
            updated: last.recordsUpdated,
            errors: Array.isArray(last.errors) ? (last.errors as string[]).length : 0,
            durationMs: last.duration,
            time: last.createdAt,
          }
        : { status: "NEVER" };
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

// ── Tool: cj_search_products ──

server.tool(
  "cj_search_products",
  "Search the CJ product catalog by keyword. Returns products from joined advertisers.",
  {
    keyword: z.string().describe("Search keyword (e.g., 'halal restaurants', 'luxury hotel london')"),
    limit: z.number().optional().describe("Max results. Default: 10"),
  },
  async ({ keyword, limit }) => {
    // Search local offers first (faster, no API call)
    const offers = await prisma.cjOffer.findMany({
      where: {
        networkId: CJ_NETWORK_ID,
        isActive: true,
        OR: [
          { title: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { tags: { has: keyword.toLowerCase() } },
        ],
      },
      include: { advertiser: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: limit || 10,
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          source: "local_database",
          query: keyword,
          total: offers.length,
          products: offers.map((o) => ({
            title: o.title,
            advertiser: o.advertiser.name,
            price: o.price,
            currency: o.currency,
            category: o.category,
            isPriceDrop: o.isPriceDropped,
            isNew: o.isNewArrival,
            url: o.affiliateUrl,
          })),
        }, null, 2),
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[mcp-cj-server] CJ Affiliate MCP server running on stdio");
}

main().catch((err) => {
  console.error("[mcp-cj-server] Fatal:", err);
  process.exit(1);
});
