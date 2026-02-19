/**
 * SEO Automation Service
 *
 * Provides automated indexing and monitoring capabilities:
 * - Google Search Console API (URL inspection + sitemap submission)
 * - IndexNow batch submission for Bing/Yandex
 * - GSC programmatic sitemap submission (critical for Google discovery)
 *
 * IMPORTANT: The Google Indexing API (urlNotifications:publish) only works
 * for pages with JobPosting or BroadcastEvent structured data. For regular
 * blog content, we rely on:
 *   1. Sitemap submission via GSC API (Google)
 *   2. IndexNow batch POST (Bing/Yandex)
 *   3. URL Inspection API for status checking (Google)
 */

import { blogPosts } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import { informationSections, informationArticles } from "@/data/information-hub-content";
import { extendedInformationArticles } from "@/data/information-hub-articles-extended";

// Dynamic base URL — falls back to config-driven default instead of hardcoding
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || (() => {
  try {
    const { getSiteDomain, getDefaultSiteId } = require("@/config/sites");
    return getSiteDomain(getDefaultSiteId());
  } catch { return "https://www.yalla-london.com"; }
})();
// GSC property URL - may differ from BASE_URL (e.g., no www)
const GSC_SITE_URL = process.env.GSC_SITE_URL || BASE_URL.replace("www.", "");
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";

// Rate limiting: max requests per minute for external APIs
const RATE_LIMIT_DELAY_MS = 200; // 200ms between requests = ~300/min max

// Combine all posts
const allPosts = [...blogPosts, ...extendedBlogPosts];

// ============================================
// UTILITY: Retry with exponential backoff
// ============================================

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Retry on 429 (rate limited) or 5xx server errors
      if (
        response.status === 429 ||
        (response.status >= 500 && attempt < maxRetries)
      ) {
        const retryAfter = response.headers.get("retry-after");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[SEO] HTTP ${response.status} from ${url} - retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[SEO] Network error for ${url} - retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries}): ${lastError.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw (
    lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// INDEXNOW SERVICE (Bing, Yandex, Seznam, Naver)
// ============================================

interface IndexNowResult {
  engine: string;
  success: boolean;
  status?: number;
  message?: string;
}

export async function submitToIndexNow(
  urls: string[],
  siteUrl?: string,
  key?: string,
): Promise<IndexNowResult[]> {
  const results: IndexNowResult[] = [];
  const indexNowKey = key || INDEXNOW_KEY;
  const baseUrl = siteUrl || BASE_URL;

  if (!indexNowKey) {
    console.error(
      "[SEO] INDEXNOW_KEY not configured - skipping IndexNow submission",
    );
    return [
      {
        engine: "indexnow",
        success: false,
        message: "INDEXNOW_KEY not configured",
      },
    ];
  }

  if (urls.length === 0) {
    return [{ engine: "indexnow", success: true, message: "No URLs to submit" }];
  }

  const hostname = new URL(baseUrl).hostname;

  // Use batch POST method — submits up to 10,000 URLs in one request
  // This is far more efficient than per-URL GET requests
  const batchUrls = urls.slice(0, 10_000);
  try {
    const response = await fetchWithRetry(
      "https://api.indexnow.org/indexnow",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: hostname,
          key: indexNowKey,
          keyLocation: `${baseUrl}/${indexNowKey}.txt`,
          urlList: batchUrls,
        }),
      },
      2,
      1000,
    );

    const accepted = response.ok || response.status === 200 || response.status === 202;
    results.push({
      engine: "IndexNow (Bing/Yandex/Seznam)",
      success: accepted,
      status: response.status,
      message: accepted
        ? `Batch submitted ${batchUrls.length} URLs`
        : `HTTP ${response.status} — check IndexNow key at ${baseUrl}/${indexNowKey}.txt`,
    });

    if (!accepted) {
      console.warn(
        `[SEO] IndexNow batch rejected: HTTP ${response.status}. ` +
        `Verify key file serves correctly at ${baseUrl}/${indexNowKey}.txt`,
      );
    }
  } catch (error) {
    results.push({
      engine: "IndexNow (Bing/Yandex/Seznam)",
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  return results;
}

// ============================================
// SITEMAP PING SERVICE
// ============================================

export async function pingSitemaps(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  // Google deprecated their sitemap ping endpoint in 2023
  // Use Google Search Console API or IndexNow instead
  results["google"] = true; // Handled via GSC API

  // Bing/Yandex covered by IndexNow - no need for legacy ping
  results["bing"] = true; // Handled via IndexNow

  console.log("[SEO] Sitemap ping: Google → GSC API, Bing/Yandex → IndexNow");
  return results;
}

// ============================================
// GOOGLE SEARCH CONSOLE API (Read-Only)
// ============================================

interface GSCCredentials {
  clientEmail: string;
  privateKey: string;
}

interface IndexingStatus {
  url: string;
  // Core indexing fields
  coverageState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  indexingState?: string;
  robotsTxtState?: string;
  // Extended fields from GSC URL Inspection API
  verdict?: string;
  crawledAs?: string;
  indexingAllowed?: string;
  crawlAllowed?: string;
  userCanonical?: string;
  googleCanonical?: string;
  sitemap?: string[];
  referringUrls?: string[];
  mobileUsabilityVerdict?: string;
  mobileUsabilityIssues?: string[];
  richResultsVerdict?: string;
  richResultsItems?: Array<{ type: string; issues?: string[] }>;
  // Full raw response for deep inspection
  rawInspectionResult?: Record<string, unknown>;
}

export class GoogleSearchConsoleAPI {
  private accessToken: string | null = null;
  private credentials: GSCCredentials | null = null;
  private siteUrl: string;

  constructor(siteUrl: string = GSC_SITE_URL) {
    this.siteUrl = siteUrl;

    // Load credentials from environment (support both naming conventions)
    const clientEmail =
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
      process.env.GSC_CLIENT_EMAIL;
    const privateKey =
      process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
      process.env.GSC_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      this.credentials = {
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      };
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.credentials) {
      console.log("GSC credentials not configured");
      return null;
    }

    try {
      // Create JWT for Google OAuth
      const now = Math.floor(Date.now() / 1000);
      const jwt = await this.createJWT({
        iss: this.credentials.clientEmail,
        scope: "https://www.googleapis.com/auth/webmasters",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      });

      const response = await fetchWithRetry(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        },
        2,
        1000,
      );

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.access_token;
        return this.accessToken;
      } else {
        console.error(
          `[SEO] GSC token exchange failed: HTTP ${response.status}`,
        );
      }
    } catch (error) {
      console.error("[SEO] Failed to get GSC access token:", error);
    }

    return null;
  }

  private async createJWT(payload: Record<string, any>): Promise<string> {
    if (!this.credentials?.privateKey) {
      throw new Error("Private key not configured");
    }

    const crypto = await import("crypto");
    const header = { alg: "RS256", typ: "JWT" };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      "base64url",
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );

    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signatureInput);
    const signature = sign.sign(this.credentials.privateKey, "base64url");

    return `${signatureInput}.${signature}`;
  }

  // Debug method to get detailed error info
  async debugAuth(): Promise<{
    step: string;
    success: boolean;
    error?: string;
    details?: any;
  }> {
    // Step 1: Check credentials
    if (!this.credentials) {
      return {
        step: "credentials",
        success: false,
        error: "Credentials not loaded from env vars",
      };
    }

    // Step 2: Try JWT creation
    let jwt: string;
    try {
      const now = Math.floor(Date.now() / 1000);
      jwt = await this.createJWT({
        iss: this.credentials.clientEmail,
        scope: "https://www.googleapis.com/auth/webmasters",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      });
    } catch (error) {
      return { step: "jwt_creation", success: false, error: String(error) };
    }

    // Step 3: Try token exchange
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      if (!response.ok) {
        return {
          step: "token_exchange",
          success: false,
          error: `HTTP ${response.status}`,
          details: data,
        };
      }

      if (!data.access_token) {
        return {
          step: "token_exchange",
          success: false,
          error: "No access_token in response",
          details: data,
        };
      }

      return {
        step: "token_exchange",
        success: true,
        details: { hasToken: true },
      };
    } catch (error) {
      return { step: "token_exchange", success: false, error: String(error) };
    }
  }

  async checkIndexingStatus(url: string): Promise<IndexingStatus | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inspectionUrl: url,
            siteUrl: this.siteUrl,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const indexStatus = data.inspectionResult?.indexStatusResult || {};
        const mobileUsability = data.inspectionResult?.mobileUsabilityResult || {};
        const richResults = data.inspectionResult?.richResultsResult || {};

        // Extract mobile usability issues
        const mobileIssues: string[] = [];
        if (mobileUsability.issues && Array.isArray(mobileUsability.issues)) {
          for (const issue of mobileUsability.issues) {
            mobileIssues.push(issue.issueMessage || issue.severity || String(issue));
          }
        }

        // Extract rich results items and their issues
        const richItems: Array<{ type: string; issues?: string[] }> = [];
        if (richResults.detectedItems && Array.isArray(richResults.detectedItems)) {
          for (const item of richResults.detectedItems) {
            const itemIssues: string[] = [];
            if (item.items && Array.isArray(item.items)) {
              for (const subItem of item.items) {
                if (subItem.issues && Array.isArray(subItem.issues)) {
                  for (const issue of subItem.issues) {
                    itemIssues.push(issue.issueMessage || String(issue));
                  }
                }
              }
            }
            richItems.push({ type: item.richResultType || "unknown", issues: itemIssues.length > 0 ? itemIssues : undefined });
          }
        }

        return {
          url,
          // Core fields
          coverageState: indexStatus.coverageState,
          lastCrawlTime: indexStatus.lastCrawlTime,
          pageFetchState: indexStatus.pageFetchState,
          indexingState: indexStatus.indexingState,
          robotsTxtState: indexStatus.robotsTxtState,
          // Extended fields
          verdict: indexStatus.verdict,
          crawledAs: indexStatus.crawledAs,
          indexingAllowed: indexStatus.indexingAllowed,
          crawlAllowed: indexStatus.crawlAllowed,
          userCanonical: indexStatus.userCanonical,
          googleCanonical: indexStatus.googleCanonical,
          sitemap: indexStatus.sitemap ? [].concat(indexStatus.sitemap) : undefined,
          referringUrls: indexStatus.referringUrls ? [].concat(indexStatus.referringUrls) : undefined,
          // Mobile usability
          mobileUsabilityVerdict: mobileUsability.verdict,
          mobileUsabilityIssues: mobileIssues.length > 0 ? mobileIssues : undefined,
          // Rich results
          richResultsVerdict: richResults.verdict,
          richResultsItems: richItems.length > 0 ? richItems : undefined,
          // Full raw response for deep inspection on dashboard
          rawInspectionResult: data.inspectionResult,
        };
      }
    } catch (error) {
      console.error("Failed to check indexing status:", error);
    }

    return null;
  }

  async getSearchAnalytics(
    startDate: string,
    endDate: string,
    dimensions: string[] = ["query", "page"],
  ): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions,
            rowLimit: 1000,
          }),
        },
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to get search analytics:", error);
    }

    return null;
  }

  // ── GSC Sitemap Submission ──────────────────────────────────
  // This is the #1 way to tell Google about your pages.
  // Uses the webmasters API: PUT /sitemaps/{feedpath}

  async submitSitemap(
    sitemapUrl: string,
  ): Promise<{ success: boolean; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) {
      return { success: false, error: "No GSC access token (check service account credentials)" };
    }

    try {
      // PUT https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}
      const endpoint =
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;

      const response = await fetchWithRetry(
        endpoint,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
        2,
        1000,
      );

      if (response.ok || response.status === 204) {
        console.log(`[SEO] Sitemap submitted to GSC: ${sitemapUrl}`);
        return { success: true };
      } else {
        const errorText = await response.text().catch(() => "");
        console.error(`[SEO] GSC sitemap submission failed: HTTP ${response.status} ${errorText}`);
        return { success: false, error: `HTTP ${response.status}: ${errorText.slice(0, 200)}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // List sitemaps currently registered in GSC
  async listSitemaps(): Promise<{ sitemaps: any[]; error?: string }> {
    const token = await this.getAccessToken();
    if (!token) return { sitemaps: [], error: "No access token" };

    try {
      const endpoint =
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/sitemaps`;

      const response = await fetchWithRetry(endpoint, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }, 2, 1000);

      if (response.ok) {
        const data = await response.json();
        return { sitemaps: data.sitemap || [] };
      } else {
        return { sitemaps: [], error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { sitemaps: [], error: String(error) };
    }
  }

  // Request Google to re-crawl a URL via the webmasters API
  // NOTE: The Indexing API (urlNotifications:publish) only works for
  // JobPosting/BroadcastEvent pages. For regular content, sitemap
  // submission + URL Inspection is the correct approach.
  async requestRecrawl(url: string): Promise<{ success: boolean; note: string }> {
    // URL Inspection only tells us status — Google doesn't provide a
    // public "request crawl" API for regular content. The best we can
    // do is: submit sitemap + ensure robots.txt allows crawling.
    const status = await this.checkIndexingStatus(url);
    if (!status) {
      return { success: false, note: "Could not inspect URL via GSC. Ensure service account has owner access." };
    }

    if (status.coverageState?.toLowerCase().includes("indexed")) {
      return { success: true, note: `Already indexed. Last crawled: ${status.lastCrawlTime || "unknown"}` };
    }

    return {
      success: false,
      note: `Status: ${status.coverageState || "unknown"}. ` +
        `For regular content, ensure the page is in sitemap.xml and submit the sitemap via GSC. ` +
        `The Google Indexing API only works for JobPosting/BroadcastEvent pages.`,
    };
  }

  // Get token with indexing scope for submitting URLs
  private async getIndexingToken(): Promise<string | null> {
    if (!this.credentials) return null;

    try {
      const now = Math.floor(Date.now() / 1000);
      const jwt = await this.createJWT({
        iss: this.credentials.clientEmail,
        scope: "https://www.googleapis.com/auth/indexing",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      });

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
    } catch (error) {
      console.error("Failed to get indexing token:", error);
    }

    return null;
  }

  // Submit a single URL for indexing via Google Indexing API
  async submitUrlForIndexing(
    url: string,
  ): Promise<{ success: boolean; error?: string }> {
    const token = await this.getIndexingToken();
    if (!token) {
      return { success: false, error: "Failed to get indexing token" };
    }

    try {
      const response = await fetch(
        "https://indexing.googleapis.com/v3/urlNotifications:publish",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url,
            type: "URL_UPDATED",
          }),
        },
      );

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData}`,
        };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Submit multiple URLs for indexing
  async submitUrlsForIndexing(
    urls: string[],
  ): Promise<{ submitted: number; failed: number; errors: string[] }> {
    const results = { submitted: 0, failed: 0, errors: [] as string[] };

    for (const url of urls) {
      const result = await this.submitUrlForIndexing(url);
      if (result.success) {
        results.submitted++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`${url}: ${result.error}`);
        }
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}

// ============================================
// URL DISCOVERY & GENERATION
// ============================================

export async function getAllIndexableUrls(siteId?: string, siteUrl?: string): Promise<string[]> {
  const baseUrl = siteUrl || BASE_URL;
  const urls: string[] = [];

  // Static pages
  const staticPages = [
    "",
    "/blog",
    "/recommendations",
    "/events",
    "/about",
    "/contact",
    "/information",
    "/information/articles",
  ];
  staticPages.forEach((page) => urls.push(`${baseUrl}${page}`));

  // Information hub: sections + articles (static data files — Yalla London only)
  const _defaultSite = (() => { try { return require("@/config/sites").getDefaultSiteId(); } catch { return "yalla-london"; } })();
  if (!siteId || siteId === _defaultSite) {
    informationSections
      .filter((s) => s.published)
      .forEach((s) => urls.push(`${baseUrl}/information/${s.slug}`));
    const allInfoArticles = [...informationArticles, ...extendedInformationArticles];
    allInfoArticles
      .filter((a) => a.published)
      .forEach((a) => urls.push(`${baseUrl}/information/articles/${a.slug}`));
  }

  // Blog posts from static files (only for default site or when no siteId specified)
  const staticSlugs = new Set<string>();
  if (!siteId || siteId === _defaultSite) {
    allPosts
      .filter((post) => post.published)
      .forEach((post) => {
        urls.push(`${baseUrl}/blog/${post.slug}`);
        staticSlugs.add(post.slug);
      });
  }

  // Blog posts from database (catch new content created by daily-content-generate)
  try {
    const { prisma } = await import("@/lib/db");
    const siteFilter = siteId ? { siteId } : {};
    const dbPosts = await prisma.blogPost.findMany({
      where: { published: true, ...siteFilter },
      select: { slug: true },
    });
    for (const post of dbPosts) {
      if (!staticSlugs.has(post.slug)) {
        urls.push(`${baseUrl}/blog/${post.slug}`);
      }
    }
  } catch {
    // Database not available - use static posts only
  }

  return urls;
}

export async function getNewUrls(withinDays: number = 7, siteId?: string, siteUrl?: string): Promise<string[]> {
  const baseUrl = siteUrl || BASE_URL;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);
  const urls: string[] = [];

  // Static file posts (only for default site)
  const _ds1 = (() => { try { return require("@/config/sites").getDefaultSiteId(); } catch { return "yalla-london"; } })();
  if (!siteId || siteId === _ds1) {
    allPosts
      .filter((post) => post.published && post.created_at >= cutoffDate)
      .forEach((post) => urls.push(`${baseUrl}/blog/${post.slug}`));
  }

  // Database posts (new content from AI generation)
  try {
    const { prisma } = await import("@/lib/db");
    const siteFilter = siteId ? { siteId } : {};
    const dbPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        ...siteFilter,
        created_at: { gte: cutoffDate },
      },
      select: { slug: true },
    });
    const existingSlugs = new Set(
      urls.map((u) => u.split("/blog/")[1]).filter(Boolean),
    );
    for (const post of dbPosts) {
      if (!existingSlugs.has(post.slug)) {
        urls.push(`${baseUrl}/blog/${post.slug}`);
      }
    }
  } catch {
    // Database not available
  }

  return urls;
}

export async function getUpdatedUrls(
  withinDays: number = 7,
  siteId?: string,
  siteUrl?: string,
): Promise<string[]> {
  const baseUrl = siteUrl || BASE_URL;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);
  const urls: string[] = [];

  // Static file posts (only for default site)
  const _ds2 = (() => { try { return require("@/config/sites").getDefaultSiteId(); } catch { return "yalla-london"; } })();
  if (!siteId || siteId === _ds2) {
    allPosts
      .filter((post) => post.published && post.updated_at >= cutoffDate)
      .forEach((post) => urls.push(`${baseUrl}/blog/${post.slug}`));
  }

  // Database posts
  try {
    const { prisma } = await import("@/lib/db");
    const siteFilter = siteId ? { siteId } : {};
    const dbPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        ...siteFilter,
        updated_at: { gte: cutoffDate },
      },
      select: { slug: true },
    });
    const existingSlugs = new Set(
      urls.map((u) => u.split("/blog/")[1]).filter(Boolean),
    );
    for (const post of dbPosts) {
      if (!existingSlugs.has(post.slug)) {
        urls.push(`${baseUrl}/blog/${post.slug}`);
      }
    }
  } catch {
    // Database not available
  }

  return urls;
}

// ============================================
// AUTOMATED INDEXING ORCHESTRATOR
// ============================================

export interface IndexingReport {
  timestamp: string;
  urlsProcessed: number;
  indexNow: IndexNowResult[];
  sitemapPings: Record<string, boolean>;
  errors: string[];
}

export async function runAutomatedIndexing(
  mode: "all" | "new" | "updated" = "new",
  siteId?: string,
  siteUrl?: string,
): Promise<IndexingReport> {
  const baseUrl = siteUrl || BASE_URL;
  const report: IndexingReport = {
    timestamp: new Date().toISOString(),
    urlsProcessed: 0,
    indexNow: [],
    sitemapPings: {},
    errors: [],
  };

  try {
    // Get URLs based on mode (now async - queries database for new content)
    let urls: string[];
    switch (mode) {
      case "all":
        urls = await getAllIndexableUrls(siteId, baseUrl);
        break;
      case "updated":
        urls = await getUpdatedUrls(7, siteId, baseUrl);
        break;
      case "new":
      default:
        urls = await getNewUrls(7, siteId, baseUrl);
        break;
    }

    report.urlsProcessed = urls.length;

    if (urls.length === 0) {
      report.errors.push("No URLs to process");
      return report;
    }

    // Submit to IndexNow (Bing, Yandex) via batch POST
    report.indexNow = await submitToIndexNow(urls, baseUrl);

    // Submit sitemap to Google via GSC API (this is how Google discovers URLs)
    const gsc = new GoogleSearchConsoleAPI();
    const sitemapResult = await gsc.submitSitemap(`${baseUrl}/sitemap.xml`);
    report.sitemapPings = {
      google_gsc: sitemapResult.success,
    };
    if (!sitemapResult.success && sitemapResult.error) {
      report.errors.push(`GSC sitemap submission: ${sitemapResult.error}`);
    }
  } catch (error) {
    report.errors.push(String(error));
  }

  return report;
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const gscApi = new GoogleSearchConsoleAPI();
export default {
  submitToIndexNow,
  pingSitemaps,
  getAllIndexableUrls,
  getNewUrls,
  getUpdatedUrls,
  runAutomatedIndexing,
  gscApi,
};
