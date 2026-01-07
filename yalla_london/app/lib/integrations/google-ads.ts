// Google Ads API Integration
// Uses Google Ads API v15+ for campaign management and reporting

export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken: string;
  loginCustomerId: string;
  customerId: string;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  costPerConversion: number;
}

export interface KeywordPerformance {
  keywordId: string;
  keywordText: string;
  matchType: string;
  impressions: number;
  clicks: number;
  cost: number;
  qualityScore: number;
  ctr: number;
  avgPosition: number;
}

export interface ConversionAction {
  id: string;
  name: string;
  category: string;
  conversionCount: number;
  conversionValue: number;
}

export class GoogleAds {
  private config: GoogleAdsConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseUrl: string = 'https://googleads.googleapis.com/v15';

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
    };
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!(
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.developerToken &&
      this.config.refreshToken &&
      this.config.customerId
    );
  }

  // Get OAuth2 access token
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();

      if (!data.access_token) {
        throw new Error('Failed to refresh access token');
      }

      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Google Ads access token:', error);
      throw error;
    }
  }

  // Make API request with Google Ads Query Language (GAQL)
  private async query(gaql: string): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Ads API not configured');
    }

    const accessToken = await this.getAccessToken();
    const customerId = this.config.customerId.replace(/-/g, '');

    const response = await fetch(
      `${this.baseUrl}/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': this.config.developerToken,
          'Content-Type': 'application/json',
          ...(this.config.loginCustomerId && {
            'login-customer-id': this.config.loginCustomerId.replace(/-/g, ''),
          }),
        },
        body: JSON.stringify({ query: gaql }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Ads API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.flatMap((batch: any) => batch.results || []);
  }

  // Get campaign performance
  async getCampaignPerformance(
    startDate: string,
    endDate: string
  ): Promise<CampaignPerformance[]> {
    if (!this.isConfigured()) {
      console.warn('Google Ads API not configured');
      return [];
    }

    try {
      const gaql = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions_from_interactions_rate
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY metrics.impressions DESC
      `;

      const results = await this.query(gaql);

      return results.map((row: any) => ({
        campaignId: row.campaign?.id || '',
        campaignName: row.campaign?.name || '',
        status: row.campaign?.status || 'UNKNOWN',
        impressions: parseInt(row.metrics?.impressions || '0'),
        clicks: parseInt(row.metrics?.clicks || '0'),
        cost: (parseInt(row.metrics?.costMicros || '0') / 1000000),
        conversions: parseFloat(row.metrics?.conversions || '0'),
        ctr: parseFloat(row.metrics?.ctr || '0') * 100,
        cpc: (parseInt(row.metrics?.averageCpc || '0') / 1000000),
        conversionRate: parseFloat(row.metrics?.conversionsFromInteractionsRate || '0') * 100,
        costPerConversion: 0, // Calculate if conversions > 0
      }));
    } catch (error) {
      console.error('Failed to get campaign performance:', error);
      return [];
    }
  }

  // Get keyword performance
  async getKeywordPerformance(
    startDate: string,
    endDate: string,
    limit: number = 100
  ): Promise<KeywordPerformance[]> {
    if (!this.isConfigured()) {
      console.warn('Google Ads API not configured');
      return [];
    }

    try {
      const gaql = `
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_position,
          ad_group_criterion.quality_info.quality_score
        FROM keyword_view
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        ORDER BY metrics.impressions DESC
        LIMIT ${limit}
      `;

      const results = await this.query(gaql);

      return results.map((row: any) => ({
        keywordId: row.adGroupCriterion?.criterionId || '',
        keywordText: row.adGroupCriterion?.keyword?.text || '',
        matchType: row.adGroupCriterion?.keyword?.matchType || 'UNKNOWN',
        impressions: parseInt(row.metrics?.impressions || '0'),
        clicks: parseInt(row.metrics?.clicks || '0'),
        cost: (parseInt(row.metrics?.costMicros || '0') / 1000000),
        qualityScore: parseInt(row.adGroupCriterion?.qualityInfo?.qualityScore || '0'),
        ctr: parseFloat(row.metrics?.ctr || '0') * 100,
        avgPosition: parseFloat(row.metrics?.averagePosition || '0'),
      }));
    } catch (error) {
      console.error('Failed to get keyword performance:', error);
      return [];
    }
  }

  // Get conversion actions
  async getConversionActions(): Promise<ConversionAction[]> {
    if (!this.isConfigured()) {
      console.warn('Google Ads API not configured');
      return [];
    }

    try {
      const gaql = `
        SELECT
          conversion_action.id,
          conversion_action.name,
          conversion_action.category,
          metrics.all_conversions,
          metrics.all_conversions_value
        FROM conversion_action
      `;

      const results = await this.query(gaql);

      return results.map((row: any) => ({
        id: row.conversionAction?.id || '',
        name: row.conversionAction?.name || '',
        category: row.conversionAction?.category || 'UNKNOWN',
        conversionCount: parseFloat(row.metrics?.allConversions || '0'),
        conversionValue: parseFloat(row.metrics?.allConversionsValue || '0'),
      }));
    } catch (error) {
      console.error('Failed to get conversion actions:', error);
      return [];
    }
  }

  // Get account summary
  async getAccountSummary(
    startDate: string,
    endDate: string
  ): Promise<{
    totalImpressions: number;
    totalClicks: number;
    totalCost: number;
    totalConversions: number;
    avgCtr: number;
    avgCpc: number;
    activeCampaigns: number;
  } | null> {
    if (!this.isConfigured()) {
      console.warn('Google Ads API not configured');
      return null;
    }

    try {
      const gaql = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM customer
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

      const results = await this.query(gaql);

      const totals = results.reduce(
        (acc, row) => ({
          impressions: acc.impressions + parseInt(row.metrics?.impressions || '0'),
          clicks: acc.clicks + parseInt(row.metrics?.clicks || '0'),
          cost: acc.cost + (parseInt(row.metrics?.costMicros || '0') / 1000000),
          conversions: acc.conversions + parseFloat(row.metrics?.conversions || '0'),
        }),
        { impressions: 0, clicks: 0, cost: 0, conversions: 0 }
      );

      // Get active campaigns count
      const campaignGaql = `
        SELECT campaign.id
        FROM campaign
        WHERE campaign.status = 'ENABLED'
      `;
      const campaigns = await this.query(campaignGaql);

      return {
        totalImpressions: totals.impressions,
        totalClicks: totals.clicks,
        totalCost: Math.round(totals.cost * 100) / 100,
        totalConversions: Math.round(totals.conversions * 100) / 100,
        avgCtr: totals.impressions > 0
          ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
          : 0,
        avgCpc: totals.clicks > 0
          ? Math.round((totals.cost / totals.clicks) * 100) / 100
          : 0,
        activeCampaigns: campaigns.length,
      };
    } catch (error) {
      console.error('Failed to get account summary:', error);
      return null;
    }
  }

  // Track offline conversion
  async trackOfflineConversion(
    gclid: string,
    conversionAction: string,
    conversionTime: string,
    conversionValue?: number,
    currencyCode: string = 'GBP'
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Google Ads API not configured');
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      const customerId = this.config.customerId.replace(/-/g, '');

      const response = await fetch(
        `${this.baseUrl}/customers/${customerId}/conversionUploads:uploadClickConversions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': this.config.developerToken,
            'Content-Type': 'application/json',
            ...(this.config.loginCustomerId && {
              'login-customer-id': this.config.loginCustomerId.replace(/-/g, ''),
            }),
          },
          body: JSON.stringify({
            customerId,
            conversions: [{
              gclid,
              conversionAction: `customers/${customerId}/conversionActions/${conversionAction}`,
              conversionDateTime: conversionTime,
              conversionValue,
              currencyCode,
            }],
            partialFailure: true,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to track offline conversion:', error);
      return false;
    }
  }

  // Test connectivity
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!this.isConfigured()) {
      const missing: string[] = [];
      if (!this.config.clientId) missing.push('GOOGLE_ADS_CLIENT_ID');
      if (!this.config.clientSecret) missing.push('GOOGLE_ADS_CLIENT_SECRET');
      if (!this.config.developerToken) missing.push('GOOGLE_ADS_DEVELOPER_TOKEN');
      if (!this.config.refreshToken) missing.push('GOOGLE_ADS_REFRESH_TOKEN');
      if (!this.config.customerId) missing.push('GOOGLE_ADS_CUSTOMER_ID');

      return {
        success: false,
        message: `Google Ads API not configured. Missing: ${missing.join(', ')}`,
      };
    }

    try {
      await this.getAccessToken();

      // Try to get basic account info
      const gaql = `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`;
      const results = await this.query(gaql);

      if (results.length > 0) {
        return {
          success: true,
          message: 'Google Ads API connection successful',
          details: {
            customerId: results[0].customer?.id,
            accountName: results[0].customer?.descriptiveName,
          },
        };
      }

      return {
        success: true,
        message: 'Google Ads API connected but no account data found',
      };
    } catch (error) {
      return {
        success: false,
        message: `Google Ads API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const googleAds = new GoogleAds();
