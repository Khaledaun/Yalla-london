/**
 * Google Indexing API Client
 *
 * Submits URLs to Google for instant indexing via the Indexing API v3.
 *
 * IMPORTANT: The Google Indexing API ONLY works for pages with:
 *   - JobPosting structured data
 *   - BroadcastEvent / Event structured data
 *   - NewsArticle structured data (via Google News)
 *
 * For regular blog content, use IndexNow + Sitemap submission instead.
 * This module handles: events pages (/events/*), news pages (/news/*).
 *
 * @see https://developers.google.com/search/apis/indexing-api/v3/quickstart
 */

import { google } from "googleapis";

// ─── Types ──────────────────────────────────────────────────────────────

export type UrlClassification = "indexing_api" | "standard";
export type NotificationType = "URL_UPDATED" | "URL_DELETED";

export interface SubmitResult {
  url: string;
  success: boolean;
  type: NotificationType;
  notifyTime?: string;
  error?: string;
}

export interface BatchResult {
  submitted: number;
  failed: number;
  results: SubmitResult[];
  quotaUsed: number;
  quotaRemaining: number;
}

export interface QuotaInfo {
  used: number;
  remaining: number;
  limit: number;
}

// ─── URL Classification ─────────────────────────────────────────────────

/**
 * URL prefixes that qualify for the Google Indexing API.
 *
 * IMPORTANT: The Google Indexing API is RESTRICTED to pages with:
 *   - JobPosting structured data
 *   - BroadcastEvent embedded in a VideoObject
 *
 * Regular events (/events/), news (/news/), and blog content do NOT qualify.
 * Submitting non-qualifying URLs risks quota revocation or penalties.
 * See: https://developers.google.com/search/apis/indexing-api/v3/using-api
 *
 * This array is intentionally empty — we have no JobPosting or BroadcastEvent
 * pages. All content uses IndexNow (Bing/Yandex) + GSC Sitemap (Google).
 * Add prefixes here ONLY when pages with qualifying schema are created.
 */
const INDEXING_API_PREFIXES: string[] = [];

/**
 * Classify a URL for routing to the correct submission channel.
 * Only pages with JobPosting or BroadcastEvent schema qualify for the
 * Google Indexing API. Everything else goes through IndexNow + Sitemap.
 */
export function classifyUrl(url: string): UrlClassification {
  try {
    const pathname = new URL(url).pathname;
    for (const prefix of INDEXING_API_PREFIXES) {
      if (pathname.startsWith(prefix)) return "indexing_api";
    }
  } catch {
    // If URL parsing fails, try simple string matching
    for (const prefix of INDEXING_API_PREFIXES) {
      if (url.includes(prefix)) return "indexing_api";
    }
  }
  return "standard";
}

/**
 * Given an English URL, compute the bilingual pair (EN + AR).
 * Arabic URLs follow the pattern: /ar/{path}
 *
 * Example:
 *   /events/chelsea-match → { en: '.../events/chelsea-match', ar: '.../ar/events/chelsea-match' }
 */
export function getBilingualPair(url: string): { en: string; ar: string } {
  try {
    const parsed = new URL(url);
    const enPath = parsed.pathname;
    // Skip if already an Arabic URL
    if (enPath.startsWith("/ar/")) {
      return { en: url.replace("/ar/", "/"), ar: url };
    }
    const arUrl = `${parsed.origin}/ar${enPath}`;
    return { en: url, ar: arUrl };
  } catch {
    // Fallback for relative URLs
    if (url.startsWith("/ar/")) {
      return { en: url.replace("/ar/", "/"), ar: url };
    }
    return { en: url, ar: `/ar${url}` };
  }
}

// ─── Main Client ────────────────────────────────────────────────────────

export class GoogleIndexingAPI {
  private auth: InstanceType<typeof google.auth.JWT> | null = null;
  private dryRun: boolean;

  constructor() {
    this.dryRun = process.env.GOOGLE_INDEXING_DRY_RUN === "true";
  }

  /**
   * Check if the Indexing API is configured with valid credentials.
   */
  isConfigured(): boolean {
    const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL ||
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
      process.env.GSC_CLIENT_EMAIL;
    const key = process.env.GOOGLE_INDEXING_PRIVATE_KEY ||
      process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
      process.env.GSC_PRIVATE_KEY;
    return !!(email && key);
  }

  /**
   * Initialize JWT auth for the Indexing API.
   * Tries Indexing-specific env vars first, falls back to GSC vars.
   */
  private getAuth(): InstanceType<typeof google.auth.JWT> {
    if (this.auth) return this.auth;

    const clientEmail = process.env.GOOGLE_INDEXING_CLIENT_EMAIL ||
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
      process.env.GSC_CLIENT_EMAIL || "";

    const privateKey = (
      process.env.GOOGLE_INDEXING_PRIVATE_KEY ||
      process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
      process.env.GSC_PRIVATE_KEY || ""
    ).replace(/\\n/g, "\n");

    this.auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    return this.auth;
  }

  /**
   * Submit a single URL to the Google Indexing API.
   */
  async submitUrl(url: string, type: NotificationType = "URL_UPDATED"): Promise<SubmitResult> {
    if (this.dryRun) {
      console.log(`[google-indexing-api] DRY RUN: Would submit ${url} (${type})`);
      return { url, success: true, type, notifyTime: new Date().toISOString() };
    }

    try {
      const auth = this.getAuth();
      const indexing = google.indexing({ version: "v3", auth });

      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url,
          type,
        },
      });

      return {
        url,
        success: true,
        type,
        notifyTime: response.data.urlNotificationMetadata?.latestUpdate?.notifyTime || undefined,
      };
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string; errors?: Array<{ message: string }> };
      const errorMessage = error.errors?.[0]?.message || error.message || String(err);
      const statusCode = error.code;

      // Log specific error types for dashboard visibility
      if (statusCode === 403) {
        console.error(`[google-indexing-api] 403 Permission denied for ${url} — service account needs "Indexing API" permission in Google Cloud Console`);
      } else if (statusCode === 429) {
        console.warn(`[google-indexing-api] 429 Rate limited — daily quota may be exhausted`);
      } else if (statusCode === 400) {
        console.warn(`[google-indexing-api] 400 Bad request for ${url} — URL may not have qualifying structured data (Event/NewsArticle/JobPosting)`);
      }

      return {
        url,
        success: false,
        type,
        error: `${statusCode || "unknown"}: ${errorMessage}`,
      };
    }
  }

  /**
   * Submit a batch of URLs. Processes sequentially with 500ms delay
   * to avoid hitting rate limits. Stops on quota exhaustion (429).
   *
   * Google's HTTP batch endpoint for Indexing API is deprecated;
   * individual calls with rate limiting is the recommended approach.
   */
  async submitBatch(
    urls: string[],
    type: NotificationType = "URL_UPDATED",
    budgetMs?: number,
    startTime?: number,
  ): Promise<BatchResult> {
    const results: SubmitResult[] = [];
    let submitted = 0;
    let failed = 0;
    let quotaUsed = 0;
    const batchStart = startTime || Date.now();

    // Exponential backoff state
    let backoffMs = 0;
    let consecutiveErrors = 0;

    for (const url of urls) {
      // Budget guard
      if (budgetMs && Date.now() - batchStart > budgetMs) {
        console.warn(`[google-indexing-api] Budget exhausted after ${submitted + failed} URLs`);
        break;
      }

      // Apply backoff if needed
      if (backoffMs > 0) {
        await new Promise((r) => setTimeout(r, backoffMs));
      }

      const result = await this.submitUrl(url, type);
      results.push(result);

      if (result.success) {
        submitted++;
        quotaUsed++;
        consecutiveErrors = 0;
        backoffMs = 0;
      } else {
        failed++;
        consecutiveErrors++;

        // Check for quota exhaustion (429)
        if (result.error?.startsWith("429")) {
          // Exponential backoff: 2s, 4s, 8s, 16s, then stop
          if (consecutiveErrors <= 4) {
            backoffMs = Math.pow(2, consecutiveErrors) * 1000;
            console.warn(`[google-indexing-api] Rate limited, backing off ${backoffMs}ms`);
          } else {
            console.warn("[google-indexing-api] Too many 429 errors, stopping batch");
            break;
          }
        }

        // Stop on permission errors
        if (result.error?.startsWith("403")) {
          console.error("[google-indexing-api] Permission denied — stopping batch. Fix service account permissions.");
          break;
        }
      }

      // Base rate limit: 500ms between requests
      if (!this.dryRun) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Get remaining quota
    let quotaRemaining = 200;
    try {
      const { prisma } = await import("@/lib/db");
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const usedToday = await prisma.uRLIndexingStatus.count({
        where: {
          submitted_google_api: true,
          last_submitted_at: { gte: todayMidnight },
        },
      });
      quotaRemaining = Math.max(0, 200 - usedToday - quotaUsed);
    } catch { /* non-critical */ }

    return { submitted, failed, results, quotaUsed, quotaRemaining };
  }

  /**
   * Get remaining daily quota for the Google Indexing API.
   * Reads from URLIndexingStatus table (submitted_google_api + today's date).
   */
  async getRemainingQuota(siteId?: string): Promise<QuotaInfo> {
    try {
      const { prisma } = await import("@/lib/db");
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const where: Record<string, unknown> = {
        submitted_google_api: true,
        last_submitted_at: { gte: todayMidnight },
      };
      if (siteId) where.site_id = siteId;

      const used = await prisma.uRLIndexingStatus.count({ where });
      return { used, remaining: Math.max(0, 200 - used), limit: 200 };
    } catch {
      return { used: 0, remaining: 200, limit: 200 };
    }
  }
}
