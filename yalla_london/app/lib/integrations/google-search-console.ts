
// Google Search Console Integration
// Enhanced with sitemap submission, crawl errors, and bulk indexing

export interface SearchConsoleConfig {
  clientEmail: string;
  privateKey: string;
  siteUrl: string;
}

export interface SitemapInfo {
  path: string;
  lastSubmitted?: string;
  isPending: boolean;
  isSitemapsIndex: boolean;
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
}

export interface CrawlError {
  pageUrl: string;
  lastCrawled: string;
  responseCode: number;
  category: string;
}

export interface IndexingResult {
  url: string;
  success: boolean;
  error?: string;
  latestUpdate?: {
    type: string;
    notifyTime: string;
  };
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface UrlInspectionResult {
  url: string;
  indexingState: 'INDEXED' | 'NOT_INDEXED' | 'NEUTRAL' | 'PARTIALLY_INDEXED';
  coverageState: string;
  lastCrawlTime?: string;
  crawlStatus?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
  verdict?: string;
  issues?: string[];
}

export class GoogleSearchConsole {
  private config: SearchConsoleConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      clientEmail: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || '',
      privateKey: process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
    };
  }

  // Check if GSC is configured
  isConfigured(): boolean {
    return !!(this.config.clientEmail && this.config.privateKey && this.config.siteUrl);
  }

  // Get configuration status for dashboard
  getStatus(): { configured: boolean; siteUrl: string } {
    return {
      configured: this.isConfigured(),
      siteUrl: this.config.siteUrl,
    };
  }

  // Get JWT token for authentication
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.clientEmail,
      // Full scope for read and write operations
      scope: 'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const token = jwt.sign(payload, this.config.privateKey, { algorithm: 'RS256' });

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: token,
        }),
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      if (!this.accessToken) {
        throw new Error('No access token received');
      }

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get GSC access token:', error);
      throw error;
    }
  }

  // Submit URL for indexing
  async submitUrl(url: string): Promise<boolean> {
    if (!this.config.clientEmail || !this.config.privateKey) {
      console.warn('Google Search Console credentials not configured');
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`https://indexing.googleapis.com/v3/urlNotifications:publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          type: 'URL_UPDATED',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to submit URL to GSC:', error);
      return false;
    }
  }

  // Get search analytics data
  async getSearchAnalytics(
    startDate: string,
    endDate: string,
    dimensions: string[] = ['query']
  ) {
    if (!this.config.clientEmail || !this.config.privateKey) {
      console.warn('Google Search Console credentials not configured');
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.config.siteUrl)}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions,
          rowLimit: 100,
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      return null;
    }
  }

  // Check indexing status with detailed response
  async getIndexingStatus(url: string): Promise<UrlInspectionResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl: this.config.siteUrl,
        }),
      });

      const data = await response.json();

      if (data.inspectionResult) {
        const result = data.inspectionResult;
        return {
          url,
          indexingState: result.indexStatusResult?.indexingState || 'NEUTRAL',
          coverageState: result.indexStatusResult?.coverageState || 'Unknown',
          lastCrawlTime: result.indexStatusResult?.lastCrawlTime,
          crawlStatus: result.indexStatusResult?.crawledAs,
          robotsTxtState: result.indexStatusResult?.robotsTxtState,
          pageFetchState: result.indexStatusResult?.pageFetchState,
          verdict: result.indexStatusResult?.verdict,
          issues: result.indexStatusResult?.crawlingUserAgent ? [] : ['No crawl data available'],
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to check indexing status:', error);
      return null;
    }
  }

  // ============================================
  // SITEMAP MANAGEMENT
  // ============================================

  // Get all submitted sitemaps
  async getSitemaps(): Promise<SitemapInfo[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const accessToken = await this.getAccessToken();
      const encodedSiteUrl = encodeURIComponent(this.config.siteUrl);

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.sitemap) {
        return data.sitemap.map((sm: any) => ({
          path: sm.path,
          lastSubmitted: sm.lastSubmitted,
          isPending: sm.isPending || false,
          isSitemapsIndex: sm.isSitemapsIndex || false,
          lastDownloaded: sm.lastDownloaded,
          warnings: sm.warnings || 0,
          errors: sm.errors || 0,
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to get sitemaps:', error);
      return [];
    }
  }

  // Submit a new sitemap
  async submitSitemap(sitemapUrl: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      const encodedSiteUrl = encodeURIComponent(this.config.siteUrl);
      const encodedSitemapUrl = encodeURIComponent(sitemapUrl);

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps/${encodedSitemapUrl}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to submit sitemap:', error);
      return false;
    }
  }

  // Delete a sitemap
  async deleteSitemap(sitemapUrl: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      const encodedSiteUrl = encodeURIComponent(this.config.siteUrl);
      const encodedSitemapUrl = encodeURIComponent(sitemapUrl);

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps/${encodedSitemapUrl}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to delete sitemap:', error);
      return false;
    }
  }

  // ============================================
  // BULK INDEXING
  // ============================================

  // Submit multiple URLs for indexing
  async submitBulkUrls(urls: string[]): Promise<IndexingResult[]> {
    if (!this.isConfigured()) {
      return urls.map(url => ({ url, success: false, error: 'GSC not configured' }));
    }

    const results: IndexingResult[] = [];

    // Process in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            const success = await this.submitUrl(url);
            return { url, success };
          } catch (error) {
            return {
              url,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      results.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Request URL removal (for deleted pages)
  async requestUrlRemoval(url: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`https://indexing.googleapis.com/v3/urlNotifications:publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          type: 'URL_DELETED',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to request URL removal:', error);
      return false;
    }
  }

  // ============================================
  // SEARCH ANALYTICS (ENHANCED)
  // ============================================

  // Get top performing pages
  async getTopPages(
    startDate: string,
    endDate: string,
    limit: number = 20
  ): Promise<SearchAnalyticsRow[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const accessToken = await this.getAccessToken();
      const encodedSiteUrl = encodeURIComponent(this.config.siteUrl);

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['page'],
            rowLimit: limit,
            orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
          }),
        }
      );

      const data = await response.json();
      return data.rows || [];
    } catch (error) {
      console.error('Failed to get top pages:', error);
      return [];
    }
  }

  // Get top keywords/queries
  async getTopKeywords(
    startDate: string,
    endDate: string,
    limit: number = 50
  ): Promise<SearchAnalyticsRow[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const accessToken = await this.getAccessToken();
      const encodedSiteUrl = encodeURIComponent(this.config.siteUrl);

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['query'],
            rowLimit: limit,
            orderBy: [{ fieldName: 'impressions', sortOrder: 'DESCENDING' }],
          }),
        }
      );

      const data = await response.json();
      return data.rows || [];
    } catch (error) {
      console.error('Failed to get top keywords:', error);
      return [];
    }
  }

  // Get performance by country
  async getPerformanceByCountry(
    startDate: string,
    endDate: string
  ): Promise<SearchAnalyticsRow[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const accessToken = await this.getAccessToken();
      const encodedSiteUrl = encodeURIComponent(this.config.siteUrl);

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['country'],
            rowLimit: 50,
            orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
          }),
        }
      );

      const data = await response.json();
      return data.rows || [];
    } catch (error) {
      console.error('Failed to get performance by country:', error);
      return [];
    }
  }

  // Get performance by device
  async getPerformanceByDevice(
    startDate: string,
    endDate: string
  ): Promise<SearchAnalyticsRow[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const accessToken = await this.getAccessToken();
      const encodedSiteUrl = encodeURIComponent(this.config.siteUrl);

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['device'],
            rowLimit: 10,
          }),
        }
      );

      const data = await response.json();
      return data.rows || [];
    } catch (error) {
      console.error('Failed to get performance by device:', error);
      return [];
    }
  }

  // ============================================
  // CRAWL & INDEXING ISSUES
  // ============================================

  // Check multiple URLs indexing status
  async checkBulkIndexingStatus(urls: string[]): Promise<UrlInspectionResult[]> {
    const results: UrlInspectionResult[] = [];

    // Process in smaller batches due to API limits
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(url => this.getIndexingStatus(url))
      );

      results.push(...batchResults.filter((r): r is UrlInspectionResult => r !== null));

      // Delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  // Get summary of indexing issues
  async getIndexingSummary(urls: string[]): Promise<{
    indexed: number;
    notIndexed: number;
    errors: number;
    pending: number;
    issues: { url: string; issue: string }[];
  }> {
    const results = await this.checkBulkIndexingStatus(urls);

    let indexed = 0;
    let notIndexed = 0;
    let errors = 0;
    let pending = 0;
    const issues: { url: string; issue: string }[] = [];

    for (const result of results) {
      switch (result.indexingState) {
        case 'INDEXED':
          indexed++;
          break;
        case 'NOT_INDEXED':
          notIndexed++;
          if (result.verdict) {
            issues.push({ url: result.url, issue: result.verdict });
          }
          break;
        case 'PARTIALLY_INDEXED':
          pending++;
          break;
        default:
          errors++;
          issues.push({ url: result.url, issue: 'Unknown status' });
      }
    }

    return { indexed, notIndexed, errors, pending, issues };
  }
}

export const searchConsole = new GoogleSearchConsole();
