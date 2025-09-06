
// Advanced Analytics & Tracking for SEO/AEO
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

export class AdvancedAnalytics {
  private gaId: string;
  private language: 'en' | 'ar';

  constructor(language: 'en' | 'ar' = 'en') {
    this.gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || '';
    this.language = language;
  }

  // Enhanced event tracking for SEO insights
  trackSEOEvent(eventName: string, parameters: {
    page_title?: string;
    page_location?: string;
    content_group1?: string; // Language
    content_group2?: string; // Page Type
    content_group3?: string; // Content Category
    custom_parameter?: string;
    value?: number;
  }) {
    if (!this.gaId || typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    window.gtag('event', eventName, {
      ...parameters,
      content_group1: parameters.content_group1 || this.language,
      send_to: this.gaId,
    });
  }

  // Track scroll depth for engagement metrics
  trackScrollDepth() {
    if (typeof window === 'undefined') return;

    let maxScroll = 0;
    const milestones = [25, 50, 75, 100];

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );

      milestones.forEach((milestone: any) => {
        if (scrollPercent >= milestone && maxScroll < milestone) {
          maxScroll = milestone;
          this.trackSEOEvent('scroll_depth', {
            content_group2: 'scroll_engagement',
            custom_parameter: `${milestone}%`,
            value: milestone,
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }

  // Track time on page for content quality metrics
  trackTimeOnPage() {
    if (typeof window === 'undefined') return;

    const startTime = Date.now();
    const intervals = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m

    intervals.forEach((seconds: any) => {
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          this.trackSEOEvent('time_on_page', {
            content_group2: 'time_engagement',
            custom_parameter: `${seconds}s`,
            value: seconds,
          });
        }
      }, seconds * 1000);
    });

    // Track when user leaves page
    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      this.trackSEOEvent('session_duration', {
        content_group2: 'session_quality',
        value: timeSpent,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }

  // Track internal link clicks for SEO
  trackInternalLinkClicks() {
    if (typeof window === 'undefined') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href.includes(window.location.hostname)) {
        const linkText = link.textContent?.trim() || 'Unknown';
        const linkUrl = link.href;
        
        this.trackSEOEvent('internal_link_click', {
          page_location: linkUrl,
          content_group2: 'internal_navigation',
          custom_parameter: linkText,
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }

  // Track external link clicks
  trackExternalLinkClicks() {
    if (typeof window === 'undefined') return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && !link.href.includes(window.location.hostname) && link.href.startsWith('http')) {
        const linkText = link.textContent?.trim() || 'Unknown';
        const linkUrl = link.href;
        
        this.trackSEOEvent('external_link_click', {
          page_location: linkUrl,
          content_group2: 'external_navigation',
          custom_parameter: linkText,
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }

  // Track search queries (if you have internal search)
  trackSearchQuery(query: string, resultsCount: number) {
    this.trackSEOEvent('site_search', {
      content_group2: 'search_behavior',
      custom_parameter: query,
      value: resultsCount,
    });
  }

  // Track language switches for i18n insights
  trackLanguageSwitch(fromLang: string, toLang: string) {
    this.trackSEOEvent('language_switch', {
      content_group2: 'internationalization',
      custom_parameter: `${fromLang}_to_${toLang}`,
    });
  }

  // Track booking/conversion funnel
  trackBookingFunnel(step: 'view_event' | 'start_booking' | 'add_payment' | 'complete_booking', eventData?: any) {
    this.trackSEOEvent(`booking_${step}`, {
      content_group2: 'conversion_funnel',
      content_group3: eventData?.eventType || 'unknown',
      custom_parameter: eventData?.eventName || '',
      value: eventData?.price || 0,
    });
  }

  // Track newsletter signup sources
  trackNewsletterSignup(source: string, language: string) {
    this.trackSEOEvent('newsletter_signup', {
      content_group2: 'lead_generation',
      content_group3: source,
      custom_parameter: language,
    });
  }

  // Track Core Web Vitals for SEO
  trackCoreWebVitals() {
    if (typeof window === 'undefined') return;

    // Function to send vitals data
    const sendToGA = (metric: any) => {
      this.trackSEOEvent(metric.name, {
        content_group2: 'core_web_vitals',
        value: Math.round(metric.value),
        custom_parameter: metric.id,
      });
    };

    // LCP (Largest Contentful Paint)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        sendToGA({
          name: 'largest_contentful_paint',
          value: entry.startTime,
          id: 'lcp'
        });
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay) - replaced by INP in Chrome
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        sendToGA({
          name: 'first_input_delay',
          value: (entry as any).processingStart - entry.startTime,
          id: 'fid'
        });
      }
    }).observe({ entryTypes: ['first-input'] });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      sendToGA({
        name: 'cumulative_layout_shift',
        value: clsValue * 1000, // Convert to milliseconds
        id: 'cls'
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Enhanced page view tracking with SEO context
  trackEnhancedPageView(pageData: {
    page_title: string;
    page_location: string;
    content_type: 'homepage' | 'blog' | 'event' | 'recommendation' | 'about' | 'contact';
    content_category?: string;
    content_language: 'en' | 'ar';
    word_count?: number;
    has_schema?: boolean;
    reading_time?: number;
  }) {
    this.trackSEOEvent('enhanced_page_view', {
      page_title: pageData.page_title,
      page_location: pageData.page_location,
      content_group1: pageData.content_language,
      content_group2: pageData.content_type,
      content_group3: pageData.content_category || 'general',
      custom_parameter: `schema_${pageData.has_schema ? 'yes' : 'no'}`,
      value: pageData.word_count || 0,
    });
  }

  // Initialize all tracking
  initializeAdvancedTracking() {
    if (typeof window === 'undefined') return;

    // Wait for gtag to be available before initializing
    const initializeWhenReady = () => {
      if (typeof window.gtag !== 'function') {
        // Try again in 100ms if gtag is not ready
        setTimeout(initializeWhenReady, 100);
        return;
      }

      // Set up all tracking
      this.trackScrollDepth();
      this.trackTimeOnPage();
      this.trackInternalLinkClicks();
      this.trackExternalLinkClicks();
      this.trackCoreWebVitals();

      // Custom dimensions setup (only if we have gaId)
      if (this.gaId) {
        window.gtag('config', this.gaId, {
          custom_map: {
            'custom_dimension_1': 'content_language',
            'custom_dimension_2': 'content_type',
            'custom_dimension_3': 'has_schema_markup',
            'custom_dimension_4': 'user_journey_stage'
          }
        });
      }
    };

    // Start the initialization process
    initializeWhenReady();
  }
}

// Separate tracking for AEO-specific metrics
export class AEOAnalytics {
  // Track when AI crawlers access the site
  detectAICrawler(): string | null {
    if (typeof window === 'undefined') return null;

    const userAgent = navigator.userAgent.toLowerCase();
    const aiCrawlers = [
      'gptbot',
      'bingbot',
      'claudebot', 
      'perplexitybot',
      'anthropic',
      'openai',
      'chatgpt'
    ];

    for (const crawler of aiCrawlers) {
      if (userAgent.includes(crawler)) {
        return crawler;
      }
    }
    return null;
  }

  // Track schema markup presence and validity
  trackSchemaMarkup() {
    if (typeof window === 'undefined') return;

    const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
    const schemaCount = scriptTags.length;
    
    let validSchemas = 0;
    scriptTags.forEach((script: any) => {
      try {
        JSON.parse(script.textContent || '');
        validSchemas++;
      } catch (e) {
        console.warn('Invalid JSON-LD schema detected');
      }
    });

    // Track schema health
    const analytics = new AdvancedAnalytics();
    analytics.trackSEOEvent('schema_markup_audit', {
      content_group2: 'technical_seo',
      custom_parameter: `${validSchemas}_of_${schemaCount}_valid`,
      value: schemaCount,
    });
  }

  // Track structured data rendering for AI
  trackStructuredDataForAI(dataType: 'faq' | 'howto' | 'summary' | 'facts') {
    const analytics = new AdvancedAnalytics();
    analytics.trackSEOEvent('structured_data_render', {
      content_group2: 'aeo_optimization',
      custom_parameter: dataType,
    });
  }
}

export const advancedAnalytics = new AdvancedAnalytics();
export const aeoAnalytics = new AEOAnalytics();
