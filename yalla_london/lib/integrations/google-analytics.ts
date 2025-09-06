
// Google Analytics 4 Integration
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_TRACKING_ID) {
    console.warn('Google Analytics ID not found');
    return;
  }

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.gtag = window.gtag || function() {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push(arguments);
  };

  window.gtag('js', new Date().toISOString());
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Track page views
export const trackPageView = (url: string) => {
  if (!GA_TRACKING_ID) return;
  
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

// Track events
export const trackEvent = (
  action: string,
  category: string = 'engagement',
  label?: string,
  value?: number
) => {
  if (!GA_TRACKING_ID) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    non_interaction: false,
  });
};

// Track conversions
export const trackConversion = (
  conversionType: 'newsletter_signup' | 'booking_click' | 'contact_form' | 'event_ticket',
  value?: number,
  currency: string = 'GBP'
) => {
  if (!GA_TRACKING_ID) return;

  window.gtag('event', 'conversion', {
    send_to: GA_TRACKING_ID,
    event_category: 'conversion',
    event_label: conversionType,
    value: value,
    currency: currency,
  });
};

// Track user engagement
export const trackEngagement = (
  type: 'scroll_depth' | 'time_on_page' | 'video_play' | 'external_link',
  value?: number
) => {
  if (!GA_TRACKING_ID) return;

  window.gtag('event', type, {
    event_category: 'engagement',
    value: value,
  });
};

// E-commerce tracking for future booking system
export const trackPurchase = (
  transactionId: string,
  value: number,
  currency: string = 'GBP',
  items: any[] = []
) => {
  if (!GA_TRACKING_ID) return;

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items,
  });
};
