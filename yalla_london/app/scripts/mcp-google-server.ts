#!/usr/bin/env npx tsx
/**
 * MCP Server: Google Analytics 4 + Google Search Console
 *
 * Exposes GA4 and GSC data as MCP tools so Claude Code can answer
 * questions about traffic, search performance, indexing, and more.
 *
 * Usage: npx tsx scripts/mcp-google-server.ts
 *
 * Required env vars (same as the rest of the codebase):
 *   GA4_PROPERTY_ID
 *   GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL (or GSC_CLIENT_EMAIL)
 *   GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY (or GSC_PRIVATE_KEY)
 *   GSC_SITE_URL
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local from the app directory (credentials live there, gitignored)
const __script_dir = typeof __dirname !== "undefined"
  ? __dirname
  : resolve(fileURLToPath(import.meta.url), "..");
config({ path: resolve(__script_dir, "../.env.local") });
config({ path: resolve(__script_dir, "../.env") }); // fallback
// Also try from cwd (repo root) in case MCP launches from there
config({ path: resolve(process.cwd(), "yalla_london/app/.env.local") });
config({ path: resolve(process.cwd(), "yalla_london/app/.env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// GA4 helpers (inline to avoid Next.js path aliases)
// ---------------------------------------------------------------------------

const GA4_API_BASE =
  "https://analyticsdata.googleapis.com/v1beta/properties";

function parseServiceAccountKey(): { clientEmail?: string; privateKey?: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
  } catch { return {}; }
}

function getGA4Credentials() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const sa = parseServiceAccountKey();
  const clientEmail =
    process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
    process.env.GSC_CLIENT_EMAIL ||
    sa.clientEmail;
  const privateKey = (
    process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ||
    process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
    process.env.GSC_PRIVATE_KEY ||
    sa.privateKey ||
    ""
  ).replace(/\\n/g, "\n");

  if (!propertyId || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

// ---------------------------------------------------------------------------
// GSC helpers
// ---------------------------------------------------------------------------

function getGSCCredentials() {
  const clientEmail =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
    process.env.GSC_CLIENT_EMAIL ||
    "";
  const privateKey = (
    process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
    process.env.GSC_PRIVATE_KEY ||
    ""
  ).replace(/\\n/g, "\n");
  const siteUrl = process.env.GSC_SITE_URL || "";

  if (!clientEmail || !privateKey || !siteUrl) return null;
  return { clientEmail, privateKey, siteUrl };
}

// ---------------------------------------------------------------------------
// Shared JWT auth
// ---------------------------------------------------------------------------

let cachedToken: { token: string; expiry: number } | null = null;

async function getAccessToken(
  clientEmail: string,
  privateKey: string,
  scopes: string
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry) {
    return cachedToken.token;
  }

  // Dynamic import to avoid bundling issues
  const jwt = await import("jsonwebtoken");
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scopes,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const assertion = jwt.default.sign(payload, privateKey, {
    algorithm: "RS256",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    token: data.access_token,
    expiry: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// GA4 API calls
// ---------------------------------------------------------------------------

async function ga4RunReport(body: Record<string, unknown>) {
  const creds = getGA4Credentials();
  if (!creds) throw new Error("GA4 not configured");

  const token = await getAccessToken(
    creds.clientEmail,
    creds.privateKey,
    "https://www.googleapis.com/auth/analytics.readonly"
  );

  const res = await fetch(
    `${GA4_API_BASE}/${creds.propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API ${res.status}: ${err}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// GSC API calls
// ---------------------------------------------------------------------------

async function gscFetch(path: string, method = "GET", body?: unknown) {
  const creds = getGSCCredentials();
  if (!creds) throw new Error("GSC not configured");

  const token = await getAccessToken(
    creds.clientEmail,
    creds.privateKey,
    "https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing"
  );

  const encodedSite = encodeURIComponent(creds.siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC API ${res.status}: ${err}`);
  }

  return res.json();
}

async function gscUrlInspect(inspectUrl: string) {
  const creds = getGSCCredentials();
  if (!creds) throw new Error("GSC not configured");

  const token = await getAccessToken(
    creds.clientEmail,
    creds.privateKey,
    "https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing"
  );

  const res = await fetch(
    "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inspectionUrl: inspectUrl,
        siteUrl: creds.siteUrl,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`URL Inspection API ${res.status}: ${err}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "google-analytics-search-console",
  version: "1.0.0",
});

// ---- GA4 Tools ----

server.tool(
  "ga4_get_metrics",
  "Get Google Analytics 4 metrics (sessions, users, page views, bounce rate, engagement) for a date range",
  {
    start_date: z
      .string()
      .default("30daysAgo")
      .describe("Start date (YYYY-MM-DD or relative like '7daysAgo', '30daysAgo')"),
    end_date: z
      .string()
      .default("today")
      .describe("End date (YYYY-MM-DD or 'today', 'yesterday')"),
  },
  async ({ start_date, end_date }) => {
    try {
      const report = await ga4RunReport({
        dateRanges: [{ startDate: start_date, endDate: end_date }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "newUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "engagementRate" },
        ],
      });

      const row = report.rows?.[0]?.metricValues || [];
      const labels = [
        "sessions",
        "totalUsers",
        "newUsers",
        "pageViews",
        "bounceRate",
        "avgSessionDuration",
        "engagementRate",
      ];
      const result: Record<string, number> = {};
      labels.forEach((l, i) => {
        result[l] = parseFloat(row[i]?.value || "0");
      });
      result.bounceRate = Math.round(result.bounceRate * 100) / 100;
      result.engagementRate = Math.round(result.engagementRate * 100) / 100;
      result.avgSessionDuration = Math.round(result.avgSessionDuration);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { period: `${start_date} → ${end_date}`, ...result },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

server.tool(
  "ga4_get_top_pages",
  "Get the top pages by page views from Google Analytics 4",
  {
    start_date: z.string().default("30daysAgo"),
    end_date: z.string().default("today"),
    limit: z.number().default(20).describe("Number of pages to return"),
  },
  async ({ start_date, end_date, limit }) => {
    try {
      const report = await ga4RunReport({
        dateRanges: [{ startDate: start_date, endDate: end_date }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "screenPageViews" },
          { name: "sessions" },
          { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit,
      });

      const pages = (report.rows || []).map((r: any) => ({
        path: r.dimensionValues[0]?.value,
        pageViews: parseInt(r.metricValues[0]?.value || "0"),
        sessions: parseInt(r.metricValues[1]?.value || "0"),
        avgDuration: Math.round(parseFloat(r.metricValues[2]?.value || "0")),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { period: `${start_date} → ${end_date}`, pages },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

server.tool(
  "ga4_get_traffic_sources",
  "Get top traffic sources (where visitors come from) from Google Analytics 4",
  {
    start_date: z.string().default("30daysAgo"),
    end_date: z.string().default("today"),
    limit: z.number().default(20),
  },
  async ({ start_date, end_date, limit }) => {
    try {
      const report = await ga4RunReport({
        dateRanges: [{ startDate: start_date, endDate: end_date }],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "bounceRate" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit,
      });

      const sources = (report.rows || []).map((r: any) => ({
        source: r.dimensionValues[0]?.value,
        medium: r.dimensionValues[1]?.value,
        sessions: parseInt(r.metricValues[0]?.value || "0"),
        users: parseInt(r.metricValues[1]?.value || "0"),
        bounceRate: Math.round(parseFloat(r.metricValues[2]?.value || "0") * 100) / 100,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { period: `${start_date} → ${end_date}`, sources },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

// ---- GSC Tools ----

server.tool(
  "gsc_get_search_performance",
  "Get Google Search Console search performance data — top queries with clicks, impressions, CTR, and average position",
  {
    start_date: z
      .string()
      .optional()
      .describe("Start date YYYY-MM-DD (defaults to 30 days ago)"),
    end_date: z
      .string()
      .optional()
      .describe("End date YYYY-MM-DD (defaults to 3 days ago, GSC data delay)"),
    dimension: z
      .enum(["query", "page", "country", "device"])
      .default("query")
      .describe("Dimension to group by"),
    limit: z.number().default(25),
  },
  async ({ start_date, end_date, dimension, limit }) => {
    try {
      const endD =
        end_date ||
        new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];
      const startD =
        start_date ||
        new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const data = await gscFetch("/searchAnalytics/query", "POST", {
        startDate: startD,
        endDate: endD,
        dimensions: [dimension],
        rowLimit: limit,
      });

      const rows = (data.rows || []).map((r: any) => ({
        [dimension]: r.keys?.[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: `${(r.ctr * 100).toFixed(2)}%`,
        position: Math.round(r.position * 10) / 10,
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { period: `${startD} → ${endD}`, dimension, rows },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

server.tool(
  "gsc_inspect_url",
  "Inspect a specific URL in Google Search Console — check if it's indexed, crawl status, canonical, mobile usability",
  {
    url: z.string().describe("The full URL to inspect (e.g. https://yalla-london.com/blog/my-article)"),
  },
  async ({ url }) => {
    try {
      const result = await gscUrlInspect(url);
      const ir = result.inspectionResult?.indexStatusResult || {};
      const mr = result.inspectionResult?.mobileUsabilityResult || {};

      const summary = {
        url,
        indexingState: ir.verdict || "UNKNOWN",
        coverageState: ir.coverageState || "UNKNOWN",
        robotsTxtState: ir.robotsTxtState || "UNKNOWN",
        indexingAllowed: ir.indexingState || "UNKNOWN",
        pageFetchState: ir.pageFetchState || "UNKNOWN",
        lastCrawlTime: ir.lastCrawlTime || null,
        userCanonical: ir.userCanonical || null,
        googleCanonical: ir.googleCanonical || null,
        crawledAs: ir.crawledAs || null,
        referringUrls: ir.referringUrls || [],
        mobileUsability: mr.verdict || "UNKNOWN",
        mobileIssues: mr.issues || [],
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(summary, null, 2) },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

server.tool(
  "gsc_get_sitemaps",
  "List all sitemaps submitted to Google Search Console",
  {},
  async () => {
    try {
      const data = await gscFetch("/sitemaps");
      const sitemaps = (data.sitemap || []).map((s: any) => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted,
        lastDownloaded: s.lastDownloaded,
        isPending: s.isPending,
        warnings: s.warnings,
        errors: s.errors,
      }));

      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ sitemaps }, null, 2) },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

server.tool(
  "gsc_submit_url_for_indexing",
  "Submit a URL to Google for re-indexing via the Indexing API (limited to certain page types)",
  {
    url: z.string().describe("The URL to submit for indexing"),
  },
  async ({ url }) => {
    try {
      const creds = getGSCCredentials();
      if (!creds) throw new Error("GSC not configured");

      const token = await getAccessToken(
        creds.clientEmail,
        creds.privateKey,
        "https://www.googleapis.com/auth/indexing"
      );

      const res = await fetch(
        "https://indexing.googleapis.com/v3/urlNotifications:publish",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            type: "URL_UPDATED",
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Indexing API returned ${res.status}: ${JSON.stringify(data)}.\n\nNote: The Indexing API only works for JobPosting and BroadcastEvent page types. For blog content, use IndexNow or submit via sitemap instead.`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { success: true, url, notifyTime: data.urlNotificationMetadata?.latestUpdate?.notifyTime },
              null,
              2
            ),
          },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Error: ${e.message}` }] };
    }
  }
);

server.tool(
  "google_config_status",
  "Check which Google API credentials are configured and ready",
  {},
  async () => {
    const ga4 = getGA4Credentials();
    const gsc = getGSCCredentials();

    const status = {
      ga4: {
        configured: !!ga4,
        propertyId: !!process.env.GA4_PROPERTY_ID,
        clientEmail: !!(
          process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
          process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
          process.env.GSC_CLIENT_EMAIL
        ),
        privateKey: !!(
          process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
          process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ||
          process.env.GSC_PRIVATE_KEY
        ),
      },
      gsc: {
        configured: !!gsc,
        siteUrl: process.env.GSC_SITE_URL || "(not set)",
        clientEmail: !!(
          process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
          process.env.GSC_CLIENT_EMAIL
        ),
        privateKey: !!(
          process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
          process.env.GSC_PRIVATE_KEY
        ),
      },
    };

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(status, null, 2) },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed to start:", err);
  process.exit(1);
});
