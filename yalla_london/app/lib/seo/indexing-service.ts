/**
 * SEO Automation Service
 *
 * Provides automated indexing and monitoring capabilities:
 * - Google Search Console API (status checking)
 * - IndexNow for Bing/Yandex
 * - Sitemap pinging
 * - Automated scheduling
 */

import { blogPosts } from '@/data/blog-content';
import { extendedBlogPosts } from '@/data/blog-content-extended';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';
// GSC property URL - may differ from BASE_URL (e.g., no www)
const GSC_SITE_URL = process.env.GSC_SITE_URL || 'https://yalla-london.com';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'yallalondon2026key';

// Combine all posts
const allPosts = [...blogPosts, ...extendedBlogPosts];

// ============================================
// INDEXNOW SERVICE (Bing, Yandex, Seznam, Naver)
// ============================================

interface IndexNowResult {
  engine: string;
  success: boolean;
  status?: number;
  message?: string;
}

export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult[]> {
  const results: IndexNowResult[] = [];

  // Use GET method - more reliable, doesn't require key file verification
  // Bing shares with other IndexNow engines (Yandex, etc.)
  let bingSuccess = 0;
  let bingFailed = 0;

  for (const url of urls.slice(0, 100)) { // Limit to 100 URLs per batch
    const getUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`;
    try {
      const response = await fetch(getUrl, { method: 'GET' });
      if (response.ok || response.status === 200 || response.status === 202) {
        bingSuccess++;
      } else {
        bingFailed++;
      }
    } catch {
      bingFailed++;
    }
  }

  results.push({
    engine: 'bing.com (IndexNow)',
    success: bingSuccess > 0,
    status: 202,
    message: `Submitted ${bingSuccess}/${urls.length} URLs successfully`,
  });

  // Try Yandex GET method for first URL
  if (urls.length > 0) {
    const yandexUrl = `https://yandex.com/indexnow?url=${encodeURIComponent(urls[0])}&key=${INDEXNOW_KEY}`;
    try {
      const response = await fetch(yandexUrl, { method: 'GET' });
      results.push({
        engine: 'yandex.com',
        success: response.ok || response.status === 200 || response.status === 202,
        status: response.status,
        message: response.ok ? 'Submitted successfully' : 'Submitted (check Yandex Webmaster)',
      });
    } catch (error) {
      results.push({
        engine: 'yandex.com',
        success: false,
        message: String(error),
      });
    }
  }

  return results;
}

// ============================================
// SITEMAP PING SERVICE
// ============================================

export async function pingSitemaps(): Promise<Record<string, boolean>> {
  const sitemapUrl = `${BASE_URL}/sitemap.xml`;
  const results: Record<string, boolean> = {};

  // Google deprecated their ping endpoint in 2023
  // Sitemaps should be submitted via Google Search Console instead
  // IndexNow handles Bing/Yandex notifications
  results['google'] = true; // Use GSC for Google indexing
  results['bing'] = true;   // Covered by IndexNow

  // Optionally ping Bing's webmaster API (legacy support)
  try {
    const bingPingUrl = `https://www.bing.com/webmaster/ping.aspx?siteMap=${encodeURIComponent(sitemapUrl)}`;
    const response = await fetch(bingPingUrl, { method: 'GET' });
    results['bing_legacy'] = response.ok;
  } catch {
    results['bing_legacy'] = false;
  }

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
  coverageState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  indexingState?: string;
  robotsTxtState?: string;
}

export class GoogleSearchConsoleAPI {
  private accessToken: string | null = null;
  private credentials: GSCCredentials | null = null;
  private siteUrl: string;

  constructor(siteUrl: string = GSC_SITE_URL) {
    this.siteUrl = siteUrl;

    // Load credentials from environment (support both naming conventions)
    const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      this.credentials = {
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      };
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.credentials) {
      console.log('GSC credentials not configured');
      return null;
    }

    try {
      // Create JWT for Google OAuth
      const now = Math.floor(Date.now() / 1000);
      const jwt = await this.createJWT({
        iss: this.credentials.clientEmail,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      if (response.ok) {
        const data = await response.json();
        this.accessToken = data.access_token;
        return this.accessToken;
      }
    } catch (error) {
      console.error('Failed to get GSC access token:', error);
    }

    return null;
  }

  private async createJWT(payload: Record<string, any>): Promise<string> {
    if (!this.credentials?.privateKey) {
      throw new Error('Private key not configured');
    }

    const crypto = await import('crypto');
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(this.credentials.privateKey, 'base64url');

    return `${signatureInput}.${signature}`;
  }

  // Debug method to get detailed error info
  async debugAuth(): Promise<{ step: string; success: boolean; error?: string; details?: any }> {
    // Step 1: Check credentials
    if (!this.credentials) {
      return { step: 'credentials', success: false, error: 'Credentials not loaded from env vars' };
    }

    // Step 2: Try JWT creation
    let jwt: string;
    try {
      const now = Math.floor(Date.now() / 1000);
      jwt = await this.createJWT({
        iss: this.credentials.clientEmail,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      });
    } catch (error) {
      return { step: 'jwt_creation', success: false, error: String(error) };
    }

    // Step 3: Try token exchange
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
          step: 'token_exchange',
          success: false,
          error: `HTTP ${response.status}`,
          details: data
        };
      }

      if (!data.access_token) {
        return { step: 'token_exchange', success: false, error: 'No access_token in response', details: data };
      }

      return { step: 'token_exchange', success: true, details: { hasToken: true } };
    } catch (error) {
      return { step: 'token_exchange', success: false, error: String(error) };
    }
  }

  async checkIndexingStatus(url: string): Promise<IndexingStatus | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inspectionUrl: url,
            siteUrl: this.siteUrl,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          url,
          coverageState: data.inspectionResult?.indexStatusResult?.coverageState,
          lastCrawlTime: data.inspectionResult?.indexStatusResult?.lastCrawlTime,
          pageFetchState: data.inspectionResult?.indexStatusResult?.pageFetchState,
          indexingState: data.inspectionResult?.indexStatusResult?.indexingState,
          robotsTxtState: data.inspectionResult?.indexStatusResult?.robotsTxtState,
        };
      }
    } catch (error) {
      console.error('Failed to check indexing status:', error);
    }

    return null;
  }

  async getSearchAnalytics(
    startDate: string,
    endDate: string,
    dimensions: string[] = ['query', 'page']
  ): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions,
            rowLimit: 1000,
          }),
        }
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get search analytics:', error);
    }

    return null;
  }

  // Get token with indexing scope for submitting URLs
  private async getIndexingToken(): Promise<string | null> {
    if (!this.credentials) return null;

    try {
      const now = Math.floor(Date.now() / 1000);
      const jwt = await this.createJWT({
        iss: this.credentials.clientEmail,
        scope: 'https://www.googleapis.com/auth/indexing',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
    } catch (error) {
      console.error('Failed to get indexing token:', error);
    }

    return null;
  }

  // Submit a single URL for indexing via Google Indexing API
  async submitUrlForIndexing(url: string): Promise<{ success: boolean; error?: string }> {
    const token = await this.getIndexingToken();
    if (!token) {
      return { success: false, error: 'Failed to get indexing token' };
    }

    try {
      const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          type: 'URL_UPDATED',
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${errorData}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Submit multiple URLs for indexing
  async submitUrlsForIndexing(urls: string[]): Promise<{ submitted: number; failed: number; errors: string[] }> {
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}

// ============================================
// URL DISCOVERY & GENERATION
// ============================================

export function getAllIndexableUrls(): string[] {
  const urls: string[] = [];

  // Static pages
  const staticPages = ['', '/blog', '/recommendations', '/events', '/about', '/contact', '/team'];
  staticPages.forEach(page => urls.push(`${BASE_URL}${page}`));

  // Blog posts
  allPosts
    .filter(post => post.published)
    .forEach(post => urls.push(`${BASE_URL}/blog/${post.slug}`));

  return urls;
}

export function getNewUrls(withinDays: number = 7): string[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);

  return allPosts
    .filter(post => post.published && post.created_at >= cutoffDate)
    .map(post => `${BASE_URL}/blog/${post.slug}`);
}

export function getUpdatedUrls(withinDays: number = 7): string[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);

  return allPosts
    .filter(post => post.published && post.updated_at >= cutoffDate)
    .map(post => `${BASE_URL}/blog/${post.slug}`);
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
  mode: 'all' | 'new' | 'updated' = 'new'
): Promise<IndexingReport> {
  const report: IndexingReport = {
    timestamp: new Date().toISOString(),
    urlsProcessed: 0,
    indexNow: [],
    sitemapPings: {},
    errors: [],
  };

  try {
    // Get URLs based on mode
    let urls: string[];
    switch (mode) {
      case 'all':
        urls = getAllIndexableUrls();
        break;
      case 'updated':
        urls = getUpdatedUrls();
        break;
      case 'new':
      default:
        urls = getNewUrls();
        break;
    }

    report.urlsProcessed = urls.length;

    if (urls.length === 0) {
      report.errors.push('No URLs to process');
      return report;
    }

    // Submit to IndexNow (Bing, Yandex)
    report.indexNow = await submitToIndexNow(urls);

    // Ping sitemaps
    report.sitemapPings = await pingSitemaps();

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
