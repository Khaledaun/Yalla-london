
// Google Search Console Integration
export interface SearchConsoleConfig {
  clientEmail: string;
  privateKey: string;
  siteUrl: string;
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

  // Get JWT token for authentication
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.config.clientEmail,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
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

  // Check indexing status
  async getIndexingStatus(url: string) {
    if (!this.config.clientEmail || !this.config.privateKey) {
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

      return await response.json();
    } catch (error) {
      console.error('Failed to check indexing status:', error);
      return null;
    }
  }
}

export const searchConsole = new GoogleSearchConsole();
