// Google Trends Research Integration
// Note: Google Trends doesn't have an official API, so we use SerpAPI or similar
// This integration supports both direct scraping patterns and third-party APIs

export interface TrendsConfig {
  apiKey: string; // SerpAPI or similar service
  serviceType: 'serpapi' | 'pytrends' | 'direct';
}

export interface TrendingTopic {
  title: string;
  traffic: string;
  relatedQueries: string[];
  timeRange: string;
  geo: string;
}

export interface InterestOverTime {
  date: string;
  value: number;
  formattedValue: string;
}

export interface RelatedQuery {
  query: string;
  value: number;
  type: 'top' | 'rising';
}

export interface TrendsSearchResult {
  keyword: string;
  interestOverTime: InterestOverTime[];
  relatedQueries: RelatedQuery[];
  relatedTopics: RelatedQuery[];
  geo: string;
  timeRange: string;
}

export interface RealTimeTrend {
  title: string;
  entityNames: string[];
  articles: {
    title: string;
    url: string;
    source: string;
    time: string;
  }[];
  traffic: string;
}

export class GoogleTrends {
  private config: TrendsConfig;
  private baseUrl: string = 'https://serpapi.com/search';

  constructor() {
    this.config = {
      apiKey: process.env.SERPAPI_API_KEY || process.env.GOOGLE_TRENDS_API_KEY || '',
      serviceType: (process.env.GOOGLE_TRENDS_SERVICE_TYPE as TrendsConfig['serviceType']) || 'serpapi',
    };
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  // Get trending searches for a region
  async getTrendingSearches(geo: string = 'GB'): Promise<RealTimeTrend[]> {
    if (!this.isConfigured()) {
      console.warn('Google Trends API not configured');
      return [];
    }

    try {
      const params = new URLSearchParams({
        engine: 'google_trends_trending_now',
        frequency: 'daily',
        geo: geo,
        api_key: this.config.apiKey,
      });

      const response = await fetch(`${this.baseUrl}?${params}`);

      if (!response.ok) {
        throw new Error(`Trends API error: ${response.status}`);
      }

      const data = await response.json();

      return (data.daily_searches || data.trending_searches || []).map((item: any) => ({
        title: item.query?.query || item.title || item.name,
        entityNames: item.related_queries || [],
        articles: (item.articles || []).map((article: any) => ({
          title: article.title,
          url: article.link || article.url,
          source: article.source,
          time: article.time_ago || article.published_time,
        })),
        traffic: item.traffic || item.formattedTraffic || 'N/A',
      }));
    } catch (error) {
      console.error('Failed to get trending searches:', error);
      return [];
    }
  }

  // Get interest over time for keywords
  async getInterestOverTime(
    keywords: string[],
    geo: string = 'GB',
    timeRange: string = 'today 12-m'
  ): Promise<TrendsSearchResult[]> {
    if (!this.isConfigured()) {
      console.warn('Google Trends API not configured');
      return [];
    }

    const results: TrendsSearchResult[] = [];

    for (const keyword of keywords) {
      try {
        const params = new URLSearchParams({
          engine: 'google_trends',
          q: keyword,
          geo: geo,
          date: timeRange,
          api_key: this.config.apiKey,
        });

        const response = await fetch(`${this.baseUrl}?${params}`);

        if (!response.ok) {
          console.error(`Failed to get trends for "${keyword}": ${response.status}`);
          continue;
        }

        const data = await response.json();

        results.push({
          keyword,
          interestOverTime: (data.interest_over_time?.timeline_data || []).map((point: any) => {
            // SerpAPI: extracted_value is the normalized 0-100 interest score
            // value is the raw display string (can be huge numbers). Use extracted_value.
            const extracted = point.values?.[0]?.extracted_value;
            const raw = point.values?.[0]?.value;
            // extracted_value is the 0-100 normalized score; fall back to parsing raw
            const normalizedValue = typeof extracted === 'number' ? extracted
              : typeof extracted === 'string' ? parseInt(extracted, 10) || 0
              : typeof raw === 'number' && raw <= 100 ? raw
              : 0;
            return {
              date: point.date,
              value: normalizedValue,
              formattedValue: String(raw ?? normalizedValue),
            };
          }),
          relatedQueries: [
            ...(data.related_queries?.top || []).map((q: any) => ({
              query: q.query,
              value: q.value || 0,
              type: 'top' as const,
            })),
            ...(data.related_queries?.rising || []).map((q: any) => ({
              query: q.query,
              value: q.value || 0,
              type: 'rising' as const,
            })),
          ],
          relatedTopics: [
            ...(data.related_topics?.top || []).map((t: any) => ({
              query: t.topic?.title || t.title,
              value: t.value || 0,
              type: 'top' as const,
            })),
            ...(data.related_topics?.rising || []).map((t: any) => ({
              query: t.topic?.title || t.title,
              value: t.value || 0,
              type: 'rising' as const,
            })),
          ],
          geo,
          timeRange,
        });
      } catch (error) {
        console.error(`Error fetching trends for "${keyword}":`, error);
      }
    }

    return results;
  }

  // Compare multiple keywords
  async compareKeywords(
    keywords: string[],
    geo: string = 'GB',
    timeRange: string = 'today 12-m'
  ): Promise<{
    keywords: string[];
    comparison: { date: string; values: { keyword: string; value: number }[] }[];
    averages: { keyword: string; average: number }[];
  }> {
    if (!this.isConfigured()) {
      console.warn('Google Trends API not configured');
      return { keywords: [], comparison: [], averages: [] };
    }

    try {
      const params = new URLSearchParams({
        engine: 'google_trends',
        q: keywords.join(','),
        geo: geo,
        date: timeRange,
        api_key: this.config.apiKey,
      });

      const response = await fetch(`${this.baseUrl}?${params}`);

      if (!response.ok) {
        throw new Error(`Trends comparison API error: ${response.status}`);
      }

      const data = await response.json();

      const comparison = (data.interest_over_time?.timeline_data || []).map((point: any) => ({
        date: point.date,
        values: (point.values || []).map((v: any, idx: number) => ({
          keyword: keywords[idx] || `Keyword ${idx + 1}`,
          value: v.value || v.extracted_value || 0,
        })),
      }));

      // Calculate averages
      const averages = keywords.map((keyword, idx) => {
        const values = comparison
          .map((c: any) => c.values[idx]?.value || 0)
          .filter((v: number) => v > 0);
        const avg = values.length > 0
          ? values.reduce((a: number, b: number) => a + b, 0) / values.length
          : 0;
        return { keyword, average: Math.round(avg * 100) / 100 };
      });

      return { keywords, comparison, averages };
    } catch (error) {
      console.error('Failed to compare keywords:', error);
      return { keywords: [], comparison: [], averages: [] };
    }
  }

  // Get geographic interest for a keyword
  async getGeoInterest(
    keyword: string,
    resolution: 'COUNTRY' | 'REGION' | 'CITY' = 'REGION',
    geo: string = 'GB'
  ): Promise<{ location: string; value: number; geoCode: string }[]> {
    if (!this.isConfigured()) {
      console.warn('Google Trends API not configured');
      return [];
    }

    try {
      const params = new URLSearchParams({
        engine: 'google_trends',
        q: keyword,
        geo: geo,
        data_type: 'GEO_MAP',
        api_key: this.config.apiKey,
      });

      const response = await fetch(`${this.baseUrl}?${params}`);

      if (!response.ok) {
        throw new Error(`Geo interest API error: ${response.status}`);
      }

      const data = await response.json();

      return (data.interest_by_region || []).map((region: any) => ({
        location: region.location,
        value: region.value || region.extracted_value || 0,
        geoCode: region.geo || '',
      }));
    } catch (error) {
      console.error('Failed to get geo interest:', error);
      return [];
    }
  }

  // Get seasonal trends and predictions
  async getSeasonalTrends(
    keyword: string,
    years: number = 5
  ): Promise<{
    keyword: string;
    seasonalPattern: { month: string; averageInterest: number }[];
    peakMonth: string;
    lowMonth: string;
    yearOverYearGrowth: number;
  } | null> {
    if (!this.isConfigured()) {
      console.warn('Google Trends API not configured');
      return null;
    }

    try {
      const params = new URLSearchParams({
        engine: 'google_trends',
        q: keyword,
        date: `today ${years * 12}-m`,
        geo: 'GB',
        api_key: this.config.apiKey,
      });

      const response = await fetch(`${this.baseUrl}?${params}`);

      if (!response.ok) {
        throw new Error(`Seasonal trends API error: ${response.status}`);
      }

      const data = await response.json();
      const timelineData = data.interest_over_time?.timeline_data || [];

      // Group by month and calculate averages
      const monthlyData: { [month: string]: number[] } = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      timelineData.forEach((point: any) => {
        const date = new Date(point.date);
        const month = months[date.getMonth()];
        if (!monthlyData[month]) monthlyData[month] = [];
        monthlyData[month].push(point.values?.[0]?.value || 0);
      });

      const seasonalPattern = months.map(month => ({
        month,
        averageInterest: monthlyData[month]?.length
          ? Math.round(monthlyData[month].reduce((a, b) => a + b, 0) / monthlyData[month].length)
          : 0,
      }));

      // Find peak and low months
      const sortedByInterest = [...seasonalPattern].sort((a, b) => b.averageInterest - a.averageInterest);
      const peakMonth = sortedByInterest[0]?.month || 'N/A';
      const lowMonth = sortedByInterest[sortedByInterest.length - 1]?.month || 'N/A';

      // Calculate year-over-year growth
      const recentYear = timelineData.slice(-12);
      const previousYear = timelineData.slice(-24, -12);

      const recentAvg = recentYear.length
        ? recentYear.reduce((sum: number, p: any) => sum + (p.values?.[0]?.value || 0), 0) / recentYear.length
        : 0;
      const previousAvg = previousYear.length
        ? previousYear.reduce((sum: number, p: any) => sum + (p.values?.[0]?.value || 0), 0) / previousYear.length
        : 0;

      const yearOverYearGrowth = previousAvg > 0
        ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100 * 100) / 100
        : 0;

      return {
        keyword,
        seasonalPattern,
        peakMonth,
        lowMonth,
        yearOverYearGrowth,
      };
    } catch (error) {
      console.error('Failed to get seasonal trends:', error);
      return null;
    }
  }

  // Test connectivity
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Google Trends API not configured. Set SERPAPI_API_KEY or GOOGLE_TRENDS_API_KEY environment variable.',
      };
    }

    try {
      // Try to get trending searches as a connectivity test
      const trending = await this.getTrendingSearches('GB');

      if (trending.length > 0) {
        return {
          success: true,
          message: 'Google Trends API connection successful',
          details: {
            trendingTopicsFound: trending.length,
            sampleTopic: trending[0]?.title,
          },
        };
      } else {
        return {
          success: true,
          message: 'Google Trends API connected but no trending data available',
          details: { trendingTopicsFound: 0 },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Google Trends API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const googleTrends = new GoogleTrends();
