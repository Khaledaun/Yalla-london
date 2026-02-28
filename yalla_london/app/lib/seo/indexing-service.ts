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

// Static content is lazy-loaded to avoid ~400KB of blog data on every import.
// This module is imported by seo/cron, google-indexing, seo-agent etc. —
// most of which only need DB queries, not static content arrays.
let _staticPosts: any[] | null = null;
let _infoSections: any[] | null = null;
let _infoArticles: any[] | null = null;
let _extInfoArticles: any[] | null = null;

async function getStaticContent() {
  if (!_staticPosts) {
    const { blogPosts } = await import("@/data/blog-content");
    const { extendedBlogPosts } = await import("@/data/blog-content-extended");
    _staticPosts = [...blogPosts, ...extendedBlogPosts];
  }
  return _staticPosts;
}

async function getInfoContent() {
  if (!_infoSections) {
    const { informationSections, informationArticles } = await import("@/data/information-hub-content");
    const { extendedInformationArticles } = await import("@/data/information-hub-articles-extended");
    _infoSections = informationSections;
    _infoArticles = informationArticles;
    _extInfoArticles = extendedInformationArticles;
  }
  return {
    informationSections: _infoSections!,
    informationArticles: _infoArticles!,
    extendedInformationArticles: _extInfoArticles!,
  };
}

// Dynamic base URL — config-driven, no hardcoded domain
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || (() => {
  const { getSiteDomain, getDefaultSiteId } = require("@/config/sites");
  return getSiteDomain(getDefaultSiteId());
})();
// GSC property URL — must match the property registered in Google Search Console.
// CRITICAL: Use GSC property URL (e.g. "sc-domain:yalla-london.com"), not site domain URL.
// Domain properties require the sc-domain: prefix for API calls.
const GSC_SITE_URL = process.env.GSC_SITE_URL || BASE_URL;
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "";

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

export async function pingSitemaps(siteUrl?: string, siteId?: string): Promise<Record<string, boolean>> {
  const baseUrl = siteUrl || BASE_URL;
  const results: Record<string, boolean> = {};

  // Google deprecated their legacy sitemap ping endpoint in 2023.
  // The correct path is GSC API sitemap submission — report actual result.
  try {
    // CRITICAL: Use GSC property URL (e.g. "sc-domain:yalla-london.com"),
    // NOT the site domain URL ("https://www.yalla-london.com").
    // Domain properties require the sc-domain: prefix for API calls.
    let gscPropertyUrl = GSC_SITE_URL;
    if (siteId) {
      try {
        const { getSiteSeoConfig } = await import("@/config/sites");
        gscPropertyUrl = getSiteSeoConfig(siteId).gscSiteUrl || GSC_SITE_URL;
      } catch (cfgErr) {
        console.warn(`[SEO] Failed to load GSC config for ${siteId}, using global fallback:`, cfgErr instanceof Error ? cfgErr.message : cfgErr);
      }
    }
    const gsc = new GoogleSearchConsoleAPI(gscPropertyUrl);
    const gscResult = await gsc.submitSitemap(`${baseUrl}/sitemap.xml`);
    results["google_gsc"] = gscResult.success;
    if (!gscResult.success) {
      console.warn(`[SEO] GSC sitemap submission failed: ${gscResult.error || "unknown"}`);
    }
  } catch (gscOuterErr) {
    console.warn("[SEO] GSC sitemap ping threw:", gscOuterErr instanceof Error ? gscOuterErr.message : gscOuterErr);
    results["google_gsc"] = false;
  }

  // Bing/Yandex covered by IndexNow — report whether key is configured
  results["indexnow"] = !!INDEXNOW_KEY;
  if (!INDEXNOW_KEY) {
    console.warn("[SEO] INDEXNOW_KEY not configured — Bing/Yandex sitemap ping skipped");
  }

  console.log(`[SEO] Sitemap ping: Google GSC=${results["google_gsc"]}, IndexNow=${results["indexnow"]}`);
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

export async function getAllIndexableUrls(siteId?: string, siteUrl?: string, includeArabic: boolean = true): Promise<string[]> {
  const baseUrl = siteUrl || BASE_URL;
  const enUrls: string[] = [];
  const isYachtSite = (() => { try { return require("@/config/sites").isYachtSite(siteId); } catch { return false; } })();

  // Static pages — yacht site has a different page structure
  const staticPages = isYachtSite
    ? [
        "",
        "/yachts",
        "/destinations",
        "/itineraries",
        "/charter-planner",
        "/inquiry",
        "/about",
        "/how-it-works",
        "/faq",
        "/contact",
        "/blog",
        "/privacy",
        "/terms",
      ]
    : [
        "",
        "/blog",
        "/recommendations",
        "/events",
        "/experiences",
        "/hotels",
        "/about",
        "/contact",
        "/information",
        "/information/articles",
        "/news",
        "/shop",
        "/privacy",
        "/terms",
        "/affiliate-disclosure",
      ];
  staticPages.forEach((page) => enUrls.push(`${baseUrl}${page}`));

  // Information hub: sections + articles (static data files — Yalla London only)
  const _defaultSite = (() => { try { return require("@/config/sites").getDefaultSiteId(); } catch { return "yalla-london"; } })();
  if (!isYachtSite && (!siteId || siteId === _defaultSite)) {
    const { informationSections, informationArticles, extendedInformationArticles } = await getInfoContent();
    informationSections
      .filter((s: any) => s.published)
      .forEach((s: any) => enUrls.push(`${baseUrl}/information/${s.slug}`));
    const allInfoArticles = [...informationArticles, ...extendedInformationArticles];
    allInfoArticles
      .filter((a: any) => a.published)
      .forEach((a: any) => enUrls.push(`${baseUrl}/information/articles/${a.slug}`));
  }

  // Blog categories (static data — Yalla London only)
  if (!isYachtSite && (!siteId || siteId === _defaultSite)) {
    try {
      const { categories } = await import("@/data/blog-content");
      for (const cat of categories) {
        enUrls.push(`${baseUrl}/blog/category/${cat.slug}`);
      }
    } catch {
      console.warn("[indexing-service] Category import failed");
    }
  }

  // London by Foot walks (Yalla London only)
  if (!isYachtSite && (!siteId || siteId === _defaultSite)) {
    try {
      const { walks } = await import("@/app/london-by-foot/walks-data");
      enUrls.push(`${baseUrl}/london-by-foot`);
      for (const walk of walks) {
        enUrls.push(`${baseUrl}/london-by-foot/${walk.slug}`);
      }
    } catch {
      console.warn("[indexing-service] Walks data import failed");
    }
  }

  // Blog posts from static files (only for default site or when no siteId specified)
  const staticSlugs = new Set<string>();
  if (!isYachtSite && (!siteId || siteId === _defaultSite)) {
    const allPosts = await getStaticContent();
    allPosts
      .filter((post: any) => post.published)
      .forEach((post: any) => {
        enUrls.push(`${baseUrl}/blog/${post.slug}`);
        staticSlugs.add(post.slug);
      });
  }

  // Blog posts from database (catch new content created by daily-content-generate)
  // NO date filter — we track ALL published posts, not just recent ones
  try {
    const { prisma } = await import("@/lib/db");
    const siteFilter = siteId ? { siteId } : {};
    const dbPosts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null, ...siteFilter },
      select: { slug: true },
      take: 2000, // Cap to prevent OOM on large sites
    });
    for (const post of dbPosts) {
      if (!staticSlugs.has(post.slug)) {
        enUrls.push(`${baseUrl}/blog/${post.slug}`);
      }
    }
  } catch (err) {
    console.warn("[indexing-service] DB query for all indexable URLs failed:", err instanceof Error ? err.message : String(err));
  }

  // ── News pages ──
  if (!isYachtSite) {
    try {
      const { prisma } = await import("@/lib/db");
      const siteFilter = siteId ? { siteId } : {};
      const newsItems = await prisma.newsItem.findMany({
        where: {
          status: "published",
          ...siteFilter,
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
        select: { slug: true },
        take: 500,
      });
      for (const item of newsItems) {
        enUrls.push(`${baseUrl}/news/${item.slug}`);
      }
    } catch (err) {
      console.warn("[indexing-service] News URL discovery failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── Events ──
  if (!isYachtSite) {
    try {
      const { prisma } = await import("@/lib/db");
      const events = await prisma.event.findMany({
        where: { published: true, siteId },
        select: { id: true },
        take: 500,
      });
      for (const event of events) {
        enUrls.push(`${baseUrl}/events/${event.id}`);
      }
    } catch (err) {
      console.warn("[indexing-service] Event URL discovery failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── Shop products ──
  if (!isYachtSite) {
    try {
      const { prisma } = await import("@/lib/db");
      const products = await prisma.digitalProduct.findMany({
        where: {
          is_active: true,
          OR: [{ site_id: siteId || null }, { site_id: null }],
        },
        select: { slug: true },
        take: 200,
      });
      for (const product of products) {
        enUrls.push(`${baseUrl}/shop/${product.slug}`);
      }
    } catch (err) {
      console.warn("[indexing-service] Shop URL discovery failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── Yacht-specific dynamic pages ──
  if (isYachtSite && siteId) {
    try {
      const { prisma } = await import("@/lib/db");

      // Individual yacht pages
      const yachts = await prisma.yacht.findMany({
        where: { siteId, status: "active" },
        select: { slug: true },
      });
      for (const yacht of yachts) {
        enUrls.push(`${baseUrl}/yachts/${yacht.slug}`);
      }

      // Destination pages
      const destinations = await prisma.yachtDestination.findMany({
        where: { siteId, status: "active" },
        select: { slug: true },
      });
      for (const dest of destinations) {
        enUrls.push(`${baseUrl}/destinations/${dest.slug}`);
      }

      // Itinerary pages
      const itineraries = await prisma.charterItinerary.findMany({
        where: { siteId, status: "active" },
        select: { slug: true },
      });
      for (const itin of itineraries) {
        enUrls.push(`${baseUrl}/itineraries/${itin.slug}`);
      }
    } catch (error) {
      console.warn("[SEO] Yacht URL discovery failed:", error instanceof Error ? error.message : String(error));
    }
  }

  // ── Generate Arabic variants (/ar/...) for every English URL ──
  if (includeArabic) {
    const arUrls: string[] = [];
    for (const url of enUrls) {
      // Extract path from full URL: "https://www.yalla-london.com/blog/slug" → "/blog/slug"
      const path = url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url;
      // Homepage: /ar (not /ar/)
      const arPath = path === "" ? "/ar" : `/ar${path}`;
      arUrls.push(`${baseUrl}${arPath}`);
    }
    return [...enUrls, ...arUrls];
  }

  return enUrls;
}

/**
 * Sync ALL indexable URLs into URLIndexingStatus table.
 * Creates records for URLs not yet tracked. Does NOT submit to search engines.
 * This ensures the cockpit shows the correct total and verify-indexing can check all pages.
 *
 * Returns count of newly created tracking records.
 */
export async function syncAllUrlsToTracking(siteId: string, siteUrl: string): Promise<{ synced: number; total: number; alreadyTracked: number }> {
  const { prisma } = await import("@/lib/db");

  // Get ALL indexable URLs (including Arabic variants)
  const allUrls = await getAllIndexableUrls(siteId, siteUrl, true);

  // Get all already-tracked URLs for this site
  const existing = await prisma.uRLIndexingStatus.findMany({
    where: { site_id: siteId },
    select: { url: true },
  });
  const existingSet = new Set(existing.map((r: { url: string }) => r.url));

  // Find URLs not yet tracked
  const untracked = allUrls.filter((url) => !existingSet.has(url));

  if (untracked.length === 0) {
    return { synced: 0, total: allUrls.length, alreadyTracked: existing.length };
  }

  // Batch insert untracked URLs as "discovered" (not yet submitted to any search engine)
  let synced = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < untracked.length; i += BATCH_SIZE) {
    const batch = untracked.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((url) => {
        // Extract slug from URL for easier dashboard display
        const path = url.startsWith(siteUrl) ? url.slice(siteUrl.length) : url;
        const slug = path.replace(/^\/ar/, "").replace(/^\//, "") || "/";

        return prisma.uRLIndexingStatus.upsert({
          where: { site_id_url: { site_id: siteId, url } },
          create: {
            site_id: siteId,
            url,
            slug,
            status: "discovered",
            submitted_indexnow: false,
            submitted_sitemap: false,
            submitted_google_api: false,
          },
          update: {}, // Don't overwrite existing records
        });
      })
    );
    synced += results.filter((r) => r.status === "fulfilled").length;
  }

  console.log(`[indexing-service] Synced ${synced} new URLs to tracking for ${siteId}. Total: ${allUrls.length}, Already tracked: ${existing.length}`);
  return { synced, total: allUrls.length, alreadyTracked: existing.length };
}

export async function getNewUrls(withinDays: number = 7, siteId?: string, siteUrl?: string): Promise<string[]> {
  const baseUrl = siteUrl || BASE_URL;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);
  const urls: string[] = [];
  const isYachtSite = (() => { try { return require("@/config/sites").isYachtSite(siteId); } catch { return false; } })();

  // Static file posts (only for default site)
  const _ds1 = (() => { try { return require("@/config/sites").getDefaultSiteId(); } catch { return "yalla-london"; } })();
  if (!isYachtSite && (!siteId || siteId === _ds1)) {
    const allPosts = await getStaticContent();
    allPosts
      .filter((post: any) => post.published && post.created_at >= cutoffDate)
      .forEach((post: any) => urls.push(`${baseUrl}/blog/${post.slug}`));
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
  } catch (err) {
    console.warn("[indexing-service] DB query for new URLs failed:", err instanceof Error ? err.message : String(err));
  }

  // ── New news items ──
  if (!isYachtSite) {
    try {
      const { prisma } = await import("@/lib/db");
      const siteFilter = siteId ? { siteId } : {};
      const newNews = await prisma.newsItem.findMany({
        where: {
          status: "published",
          ...siteFilter,
          created_at: { gte: cutoffDate },
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
        select: { slug: true },
        take: 200,
      });
      for (const item of newNews) {
        urls.push(`${baseUrl}/news/${item.slug}`);
      }
    } catch (err) {
      console.warn("[indexing-service] News new-URL discovery failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── New yacht content ──
  if (isYachtSite && siteId) {
    try {
      const { prisma } = await import("@/lib/db");

      const newYachts = await prisma.yacht.findMany({
        where: { siteId, status: "active", createdAt: { gte: cutoffDate } },
        select: { slug: true },
        take: 500,
      });
      for (const y of newYachts) urls.push(`${baseUrl}/yachts/${y.slug}`);

      const newDests = await prisma.yachtDestination.findMany({
        where: { siteId, status: "active", createdAt: { gte: cutoffDate } },
        select: { slug: true },
        take: 500,
      });
      for (const d of newDests) urls.push(`${baseUrl}/destinations/${d.slug}`);

      const newItins = await prisma.charterItinerary.findMany({
        where: { siteId, status: "active", createdAt: { gte: cutoffDate } },
        select: { slug: true },
        take: 500,
      });
      for (const i of newItins) urls.push(`${baseUrl}/itineraries/${i.slug}`);
    } catch (error) {
      console.warn("[SEO] New yacht URL discovery failed:", error instanceof Error ? error.message : String(error));
    }
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
  const isYachtSite = (() => { try { return require("@/config/sites").isYachtSite(siteId); } catch { return false; } })();

  // Static file posts (only for default site)
  const _ds2 = (() => { try { return require("@/config/sites").getDefaultSiteId(); } catch { return "yalla-london"; } })();
  if (!isYachtSite && (!siteId || siteId === _ds2)) {
    const allPosts = await getStaticContent();
    allPosts
      .filter((post: any) => post.published && post.updated_at >= cutoffDate)
      .forEach((post: any) => urls.push(`${baseUrl}/blog/${post.slug}`));
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
      take: 2000,
    });
    const existingSlugs = new Set(
      urls.map((u) => u.split("/blog/")[1]).filter(Boolean),
    );
    for (const post of dbPosts) {
      if (!existingSlugs.has(post.slug)) {
        urls.push(`${baseUrl}/blog/${post.slug}`);
      }
    }
  } catch (err) {
    console.warn("[indexing-service] DB query for updated URLs failed:", err instanceof Error ? err.message : String(err));
  }

  // ── Updated news items ──
  if (!isYachtSite) {
    try {
      const { prisma } = await import("@/lib/db");
      const siteFilter = siteId ? { siteId } : {};
      const updatedNews = await prisma.newsItem.findMany({
        where: {
          status: "published",
          ...siteFilter,
          updated_at: { gte: cutoffDate },
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
        select: { slug: true },
        take: 200,
      });
      for (const item of updatedNews) {
        urls.push(`${baseUrl}/news/${item.slug}`);
      }
    } catch (err) {
      console.warn("[indexing-service] News updated-URL discovery failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // ── Updated yacht content ──
  if (isYachtSite && siteId) {
    try {
      const { prisma } = await import("@/lib/db");

      const updatedYachts = await prisma.yacht.findMany({
        where: { siteId, status: "active", updatedAt: { gte: cutoffDate } },
        select: { slug: true },
        take: 500,
      });
      for (const y of updatedYachts) urls.push(`${baseUrl}/yachts/${y.slug}`);

      const updatedDests = await prisma.yachtDestination.findMany({
        where: { siteId, status: "active", updatedAt: { gte: cutoffDate } },
        select: { slug: true },
        take: 500,
      });
      for (const d of updatedDests) urls.push(`${baseUrl}/destinations/${d.slug}`);

      const updatedItins = await prisma.charterItinerary.findMany({
        where: { siteId, status: "active", updatedAt: { gte: cutoffDate } },
        select: { slug: true },
        take: 500,
      });
      for (const i of updatedItins) urls.push(`${baseUrl}/itineraries/${i.slug}`);
    } catch (error) {
      console.warn("[SEO] Updated yacht URL discovery failed:", error instanceof Error ? error.message : String(error));
    }
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

    // Also include URLs that were discovered by the SEO agent but haven't
    // been submitted yet. These may fall outside the 7-day window used by
    // getNewUrls/getUpdatedUrls but still need submission.
    if (siteId) {
      try {
        const { prisma } = await import("@/lib/db");
        const discoveredUrls = await prisma.uRLIndexingStatus.findMany({
          where: {
            site_id: siteId,
            status: { in: ["discovered", "pending"] },
          },
          select: { url: true },
          take: 500,
        });
        if (discoveredUrls.length > 0) {
          const existingSet = new Set(urls);
          let added = 0;
          for (const row of discoveredUrls) {
            if (!existingSet.has(row.url)) {
              urls.push(row.url);
              added++;
            }
          }
          if (added > 0) {
            console.log(`[SEO] Added ${added} "discovered" URLs from URLIndexingStatus to submission batch`);
          }
        }
      } catch (urlStatusErr) {
        console.warn(`[SEO] URLIndexingStatus query failed for ${siteId} (table may not exist yet):`, urlStatusErr instanceof Error ? urlStatusErr.message : urlStatusErr);
      }
    }

    report.urlsProcessed = urls.length;

    if (urls.length === 0) {
      report.errors.push("No URLs to process");
      return report;
    }

    // Submit to IndexNow (Bing, Yandex) via batch POST
    report.indexNow = await submitToIndexNow(urls, baseUrl);

    // Submit sitemap to Google via GSC API (this is how Google discovers URLs)
    // CRITICAL: Use GSC property URL (e.g. "sc-domain:yalla-london.com"), not site domain URL.
    let gscPropertyUrl = GSC_SITE_URL;
    if (siteId) {
      try {
        const { getSiteSeoConfig } = await import("@/config/sites");
        gscPropertyUrl = getSiteSeoConfig(siteId).gscSiteUrl || GSC_SITE_URL;
      } catch (cfgErr2) {
        console.warn(`[SEO] Failed to load GSC config for ${siteId} in runAutomatedIndexing, using global fallback:`, cfgErr2 instanceof Error ? cfgErr2.message : cfgErr2);
      }
    }
    const gsc = new GoogleSearchConsoleAPI(gscPropertyUrl);
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

// ============================================
// AGGRESSIVE INDEXING: RETRY FAILED + STALE URLs
// ============================================

/**
 * Retry failed and stale URL submissions.
 *
 * Finds URLs that are:
 *   1. Still "discovered" after 6+ hours (never submitted)
 *   2. Status "error" (failed previous submission)
 *   3. Status "submitted" but > 7 days old with no indexing confirmation
 *
 * Resubmits them to IndexNow + pings sitemap.
 * Called by the seo-deep-review cron and can be triggered manually.
 */
export async function retryFailedIndexing(
  siteId: string,
  siteUrl: string,
  options?: { maxUrls?: number; budgetMs?: number },
): Promise<{ retried: number; succeeded: number; errors: string[] }> {
  const maxUrls = options?.maxUrls || 50;
  const startTime = Date.now();
  const budgetMs = options?.budgetMs || 30_000;
  const errors: string[] = [];
  let retried = 0;
  let succeeded = 0;

  try {
    const { prisma } = await import("@/lib/db");

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find URLs needing retry
    const staleUrls = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        OR: [
          // Never submitted (discovered > 6h ago)
          { status: "discovered", created_at: { lt: sixHoursAgo } },
          // Failed submission
          { status: "error" },
          // Submitted but not indexed after 7 days — resubmit
          {
            status: "submitted",
            last_submitted_at: { lt: sevenDaysAgo },
            submission_attempts: { lt: 5 }, // Don't retry endlessly
          },
        ],
      },
      select: { id: true, url: true, status: true, submission_attempts: true },
      take: maxUrls,
      orderBy: { created_at: "asc" }, // Oldest first
    });

    if (staleUrls.length === 0) {
      return { retried: 0, succeeded: 0, errors: [] };
    }

    const urls = staleUrls.map((u) => u.url);
    retried = urls.length;

    console.log(`[indexing-retry] Retrying ${urls.length} stale/failed URL(s) for ${siteId}`);

    // Batch submit to IndexNow
    const indexNowResults = await submitToIndexNow(urls, siteUrl);
    const indexNowOk = indexNowResults.some((r) => r.success);

    if (indexNowOk) {
      succeeded = urls.length;
    }

    // Update status
    const newStatus = indexNowOk ? "submitted" : "error";
    for (const record of staleUrls) {
      if (Date.now() - startTime > budgetMs) break;

      await prisma.uRLIndexingStatus.update({
        where: { id: record.id },
        data: {
          status: newStatus,
          submitted_indexnow: indexNowOk,
          last_submitted_at: new Date(),
          submission_attempts: { increment: 1 },
          last_error: indexNowOk ? null : "IndexNow batch submission failed",
        },
      }).catch((e: unknown) => errors.push(`DB update ${record.url}: ${e instanceof Error ? e.message : e}`));
    }

    // Also ping sitemap to signal Google
    if (indexNowOk) {
      await pingSitemaps(siteUrl, siteId).catch(() => {});
    }

    console.log(`[indexing-retry] ${siteId}: retried ${retried}, succeeded ${succeeded}`);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  return { retried, succeeded, errors };
}

/**
 * Immediate post-publish indexing — submit a single URL to all available channels.
 * Called right after a BlogPost is created. Faster than waiting for the next seo-cron.
 */
export async function submitUrlImmediately(
  url: string,
  siteId: string,
  siteUrl: string,
): Promise<{ indexNow: boolean; sitemap: boolean }> {
  let indexNow = false;
  let sitemap = false;

  // 1. IndexNow batch (accepts single URL)
  try {
    const results = await submitToIndexNow([url], siteUrl);
    indexNow = results.some((r) => r.success);
  } catch (e) {
    console.warn(`[immediate-index] IndexNow failed for ${url}:`, e instanceof Error ? e.message : e);
  }

  // 2. Track in URLIndexingStatus
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.uRLIndexingStatus.upsert({
      where: { site_id_url: { site_id: siteId, url } },
      create: {
        site_id: siteId,
        url,
        slug: url.split("/blog/").pop() || null,
        status: indexNow ? "submitted" : "discovered",
        submitted_indexnow: indexNow,
        last_submitted_at: indexNow ? new Date() : null,
      },
      update: {
        status: indexNow ? "submitted" : undefined,
        submitted_indexnow: indexNow || undefined,
        last_submitted_at: indexNow ? new Date() : undefined,
        submission_attempts: { increment: 1 },
      },
    });
  } catch (trackErr) {
    console.warn(`[immediate-index] URLIndexingStatus upsert failed for ${url}:`, trackErr instanceof Error ? trackErr.message : trackErr);
  }

  // 3. Ping sitemap — await so return value is accurate
  try {
    const pingResult = await pingSitemaps(siteUrl, siteId);
    sitemap = pingResult.google_gsc === true;
  } catch {
    // Sitemap ping failure is non-critical — IndexNow is the primary channel
  }

  return { indexNow, sitemap };
}

export const gscApi = new GoogleSearchConsoleAPI();
export default {
  submitToIndexNow,
  pingSitemaps,
  getAllIndexableUrls,
  getNewUrls,
  getUpdatedUrls,
  runAutomatedIndexing,
  retryFailedIndexing,
  submitUrlImmediately,
  gscApi,
};
