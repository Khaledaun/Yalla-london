// Google PageSpeed Insights API Integration
// Uses PageSpeed Insights API v5 for performance analysis

export interface PageSpeedConfig {
  apiKey: string;
}

export interface LighthouseCategory {
  score: number;
  title: string;
  description?: string;
}

export interface CoreWebVitals {
  lcp: { value: number; score: 'good' | 'needs-improvement' | 'poor' };
  fid: { value: number; score: 'good' | 'needs-improvement' | 'poor' };
  cls: { value: number; score: 'good' | 'needs-improvement' | 'poor' };
  fcp: { value: number; score: 'good' | 'needs-improvement' | 'poor' };
  ttfb: { value: number; score: 'good' | 'needs-improvement' | 'poor' };
  inp: { value: number; score: 'good' | 'needs-improvement' | 'poor' };
}

export interface PageSpeedAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  warnings?: string[];
  details?: any;
}

export interface PageSpeedResult {
  url: string;
  strategy: 'mobile' | 'desktop';
  fetchTime: string;
  categories: {
    performance: LighthouseCategory;
    accessibility: LighthouseCategory;
    bestPractices: LighthouseCategory;
    seo: LighthouseCategory;
    pwa?: LighthouseCategory;
  };
  coreWebVitals: CoreWebVitals;
  audits: PageSpeedAudit[];
  opportunities: PageSpeedAudit[];
  diagnostics: PageSpeedAudit[];
  fieldData?: {
    origin: string;
    metrics: CoreWebVitals;
  };
}

export class GooglePageSpeed {
  private config: PageSpeedConfig;
  private baseUrl: string = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

  constructor() {
    this.config = {
      apiKey: process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY || '',
    };
  }

  // Check if service is configured
  isConfigured(): boolean {
    // PageSpeed API can work without an API key (with rate limits)
    return true;
  }

  // Get score category
  private getScoreCategory(score: number, metric: string): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: { [key: string]: { good: number; needsImprovement: number } } = {
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      fcp: { good: 1800, needsImprovement: 3000 },
      ttfb: { good: 800, needsImprovement: 1800 },
      inp: { good: 200, needsImprovement: 500 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'good';

    if (score <= threshold.good) return 'good';
    if (score <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  // Analyze page performance
  async analyze(
    url: string,
    strategy: 'mobile' | 'desktop' = 'mobile',
    categories: string[] = ['performance', 'accessibility', 'best-practices', 'seo']
  ): Promise<PageSpeedResult | null> {
    try {
      const params = new URLSearchParams({
        url,
        strategy,
        ...(this.config.apiKey && { key: this.config.apiKey }),
      });

      // Add categories
      categories.forEach(cat => params.append('category', cat));

      const response = await fetch(`${this.baseUrl}?${params}`);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PageSpeed API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const lighthouse = data.lighthouseResult;
      const fieldMetrics = data.loadingExperience;

      // Extract Core Web Vitals from lab data
      const audits = lighthouse?.audits || {};

      const lcpValue = audits['largest-contentful-paint']?.numericValue || 0;
      const fidValue = audits['max-potential-fid']?.numericValue || 0;
      const clsValue = audits['cumulative-layout-shift']?.numericValue || 0;
      const fcpValue = audits['first-contentful-paint']?.numericValue || 0;
      const ttfbValue = audits['server-response-time']?.numericValue || 0;
      const inpValue = audits['interaction-to-next-paint']?.numericValue || 0;

      const coreWebVitals: CoreWebVitals = {
        lcp: { value: lcpValue, score: this.getScoreCategory(lcpValue, 'lcp') },
        fid: { value: fidValue, score: this.getScoreCategory(fidValue, 'fid') },
        cls: { value: clsValue, score: this.getScoreCategory(clsValue, 'cls') },
        fcp: { value: fcpValue, score: this.getScoreCategory(fcpValue, 'fcp') },
        ttfb: { value: ttfbValue, score: this.getScoreCategory(ttfbValue, 'ttfb') },
        inp: { value: inpValue, score: this.getScoreCategory(inpValue, 'inp') },
      };

      // Extract audits
      const allAudits: PageSpeedAudit[] = Object.values(audits).map((audit: any) => ({
        id: audit.id,
        title: audit.title,
        description: audit.description || '',
        score: audit.score,
        displayValue: audit.displayValue,
        numericValue: audit.numericValue,
        warnings: audit.warnings,
        details: audit.details,
      }));

      // Filter opportunities (have savings)
      const opportunities = allAudits.filter(
        a => a.details?.overallSavingsMs > 0 || a.details?.overallSavingsBytes > 0
      );

      // Filter diagnostics (informative audits)
      const diagnostics = allAudits.filter(
        a => a.score !== null && a.score < 1 && !opportunities.includes(a)
      );

      return {
        url,
        strategy,
        fetchTime: lighthouse?.fetchTime || new Date().toISOString(),
        categories: {
          performance: {
            score: (lighthouse?.categories?.performance?.score || 0) * 100,
            title: 'Performance',
            description: lighthouse?.categories?.performance?.description,
          },
          accessibility: {
            score: (lighthouse?.categories?.accessibility?.score || 0) * 100,
            title: 'Accessibility',
            description: lighthouse?.categories?.accessibility?.description,
          },
          bestPractices: {
            score: (lighthouse?.categories?.['best-practices']?.score || 0) * 100,
            title: 'Best Practices',
            description: lighthouse?.categories?.['best-practices']?.description,
          },
          seo: {
            score: (lighthouse?.categories?.seo?.score || 0) * 100,
            title: 'SEO',
            description: lighthouse?.categories?.seo?.description,
          },
        },
        coreWebVitals,
        audits: allAudits.filter(a => a.score === 1).slice(0, 10), // Passed audits
        opportunities: opportunities.slice(0, 10),
        diagnostics: diagnostics.slice(0, 10),
        ...(fieldMetrics && {
          fieldData: {
            origin: fieldMetrics.id,
            metrics: this.extractFieldMetrics(fieldMetrics),
          },
        }),
      };
    } catch (error) {
      console.error('PageSpeed analysis failed:', error);
      return null;
    }
  }

  // Extract field metrics from CrUX data
  private extractFieldMetrics(fieldMetrics: any): CoreWebVitals {
    const metrics = fieldMetrics.metrics || {};

    const getValue = (metric: any) => metric?.percentile || 0;
    const getCategory = (metric: any): 'good' | 'needs-improvement' | 'poor' => {
      const category = metric?.category;
      if (category === 'FAST') return 'good';
      if (category === 'AVERAGE') return 'needs-improvement';
      return 'poor';
    };

    return {
      lcp: {
        value: getValue(metrics.LARGEST_CONTENTFUL_PAINT_MS),
        score: getCategory(metrics.LARGEST_CONTENTFUL_PAINT_MS),
      },
      fid: {
        value: getValue(metrics.FIRST_INPUT_DELAY_MS),
        score: getCategory(metrics.FIRST_INPUT_DELAY_MS),
      },
      cls: {
        value: getValue(metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE),
        score: getCategory(metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE),
      },
      fcp: {
        value: getValue(metrics.FIRST_CONTENTFUL_PAINT_MS),
        score: getCategory(metrics.FIRST_CONTENTFUL_PAINT_MS),
      },
      ttfb: {
        value: getValue(metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
        score: getCategory(metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
      },
      inp: {
        value: getValue(metrics.INTERACTION_TO_NEXT_PAINT),
        score: getCategory(metrics.INTERACTION_TO_NEXT_PAINT),
      },
    };
  }

  // Batch analyze multiple URLs
  async batchAnalyze(
    urls: string[],
    strategy: 'mobile' | 'desktop' = 'mobile'
  ): Promise<PageSpeedResult[]> {
    const results: PageSpeedResult[] = [];

    for (const url of urls) {
      const result = await this.analyze(url, strategy);
      if (result) {
        results.push(result);
      }
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  // Get performance summary for a URL
  async getPerformanceSummary(url: string): Promise<{
    mobile: { score: number; coreWebVitals: CoreWebVitals } | null;
    desktop: { score: number; coreWebVitals: CoreWebVitals } | null;
    recommendations: string[];
  }> {
    const [mobileResult, desktopResult] = await Promise.all([
      this.analyze(url, 'mobile'),
      this.analyze(url, 'desktop'),
    ]);

    const recommendations: string[] = [];

    // Generate recommendations from mobile results
    if (mobileResult) {
      mobileResult.opportunities.slice(0, 5).forEach(opp => {
        if (opp.displayValue) {
          recommendations.push(`${opp.title}: ${opp.displayValue}`);
        }
      });
    }

    return {
      mobile: mobileResult
        ? { score: mobileResult.categories.performance.score, coreWebVitals: mobileResult.coreWebVitals }
        : null,
      desktop: desktopResult
        ? { score: desktopResult.categories.performance.score, coreWebVitals: desktopResult.coreWebVitals }
        : null,
      recommendations,
    };
  }

  // Test connectivity
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // Test with Google's own page
      const testUrl = 'https://www.google.com';
      const params = new URLSearchParams({
        url: testUrl,
        strategy: 'desktop',
        category: 'performance',
        ...(this.config.apiKey && { key: this.config.apiKey }),
      });

      const response = await fetch(`${this.baseUrl}?${params}`);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const score = data.lighthouseResult?.categories?.performance?.score;

      return {
        success: true,
        message: 'PageSpeed Insights API connection successful',
        details: {
          apiKeyConfigured: !!this.config.apiKey,
          testUrlScore: score !== undefined ? Math.round(score * 100) : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `PageSpeed Insights API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export const googlePageSpeed = new GooglePageSpeed();
