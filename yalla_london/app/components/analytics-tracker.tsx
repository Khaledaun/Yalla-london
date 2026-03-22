
'use client';

import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { advancedAnalytics, aeoAnalytics } from '@/lib/seo/advanced-analytics';
import { useLanguage } from '@/components/language-provider';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  useEffect(() => {
    // Initialize advanced tracking
    advancedAnalytics.initializeAdvancedTracking();

    // Track schema markup on page load
    aeoAnalytics.trackSchemaMarkup();

    // Detect if this is an AI crawler
    const aiCrawler = aeoAnalytics.detectAICrawler();
    if (aiCrawler) {
      advancedAnalytics.trackSEOEvent('ai_crawler_visit', {
        content_group2: 'ai_traffic',
        custom_parameter: aiCrawler,
        page_location: window.location.href,
      });
    }

    // Auto-track affiliate link clicks (rel="nofollow sponsored" or known affiliate domains)
    const affiliateDomains = [
      'booking.com', 'halalbooking.com', 'agoda.com', 'getyourguide.com',
      'viator.com', 'klook.com', 'boatbookings.com', 'tripadvisor.com',
      'hotels.com', 'expedia.com',
    ];

    const handleAffiliateClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.href;
      const rel = link.getAttribute('rel') || '';
      const isAffiliate = rel.includes('sponsored') ||
        href.includes('/api/affiliate/click') ||
        affiliateDomains.some(d => href.includes(d));
      if (isAffiliate) {
        const partner = link.getAttribute('data-advertiser') ||
          affiliateDomains.find(d => href.includes(d)) || 'unknown';
        trackAffiliateClick(partner, href);

        // Append GA4 client ID to tracking URL for server-side event attribution
        if (href.includes('/api/affiliate/click') && !href.includes('ga_cid=')) {
          try {
            const gaCookie = document.cookie
              .split('; ')
              .find(row => row.startsWith('_ga='));
            if (gaCookie) {
              const gaClientId = gaCookie.split('.').slice(-2).join('.');
              const separator = href.includes('?') ? '&' : '?';
              link.href = `${href}${separator}ga_cid=${encodeURIComponent(gaClientId)}`;
            }
          } catch {
            // Non-critical — server will generate its own client ID
          }
        }
      }
    };

    document.addEventListener('click', handleAffiliateClick);
    return () => document.removeEventListener('click', handleAffiliateClick);
  }, []);

  useEffect(() => {
    // Track enhanced page views
    const getContentType = (path: string): string => {
      if (path === '/' || path === '/ar') return 'homepage';
      if (path.includes('/blog')) return 'blog';
      if (path.includes('/events')) return 'event';
      if (path.includes('/recommendations')) return 'recommendation';
      if (path.includes('/about')) return 'about';
      if (path.includes('/contact')) return 'contact';
      return 'other';
    };

    const getContentCategory = (path: string): string => {
      if (path.includes('/hotels')) return 'hotels';
      if (path.includes('/restaurants')) return 'restaurants';
      if (path.includes('/attractions')) return 'attractions';
      if (path.includes('/shopping')) return 'shopping';
      if (path.includes('/nightlife')) return 'nightlife';
      return 'general';
    };

    // Check for schema markup on the page
    const hasSchema = document.querySelectorAll('script[type="application/ld+json"]').length > 0;

    // Estimate word count (simplified)
    const textContent = document.body.innerText || '';
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;

    // Estimate reading time
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    advancedAnalytics.trackEnhancedPageView({
      page_title: document.title,
      page_location: window.location.href,
      content_type: getContentType(pathname || '/') as any,
      content_category: getContentCategory(pathname || '/'),
      content_language: language,
      word_count: wordCount,
      has_schema: hasSchema,
      reading_time: readingTime,
    });

  }, [pathname, searchParams, language]);

  return null; // This component doesn't render anything
}

// Enhanced newsletter tracking
export function trackNewsletterSignup(source: string, language: string) {
  advancedAnalytics.trackNewsletterSignup(source, language);
  
  // Also track for AEO insights
  aeoAnalytics.trackStructuredDataForAI('summary');
}

// Enhanced booking tracking
export function trackBookingFlow(
  step: 'view_event' | 'start_booking' | 'add_payment' | 'complete_booking',
  eventData?: any
) {
  advancedAnalytics.trackBookingFunnel(step, eventData);
}

// Language switch tracking
export function trackLanguageSwitch(fromLang: string, toLang: string) {
  advancedAnalytics.trackLanguageSwitch(fromLang, toLang);
}

// Affiliate click tracking
export function trackAffiliateClick(partner: string, url: string, pageTitle?: string) {
  advancedAnalytics.trackSEOEvent('affiliate_click', {
    content_group2: 'monetization',
    content_group3: partner,
    custom_parameter: url,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
  });
}

// Search tracking (for future internal search feature)
export function trackInternalSearch(query: string, resultsCount: number) {
  advancedAnalytics.trackSearchQuery(query, resultsCount);
}
