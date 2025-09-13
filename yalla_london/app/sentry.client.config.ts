// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment and release tracking
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    
    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    
    // Error sampling
    sampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_SAMPLE_RATE || '1.0'),
    
    // Session replay (optional, can be resource intensive)
    replaysSessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE || '0.0'),
    replaysOnErrorSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE || '1.0'),
    
    // Enhanced error filtering for client-side
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      if (error instanceof Error) {
        // Skip common browser extension errors
        if (error.message.includes('Extension') ||
            error.message.includes('chrome-extension') ||
            error.message.includes('moz-extension')) {
          return null;
        }
        
        // Skip network errors that users can't control
        if (error.message.includes('NetworkError') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('Load failed')) {
          return null;
        }
        
        // Skip Next.js hydration mismatches in development
        if (process.env.NODE_ENV === 'development' &&
            (error.message.includes('Hydration') ||
             error.message.includes('Text content does not match'))) {
          return null;
        }
        
        // Skip ResizeObserver errors (common browser issue)
        if (error.message.includes('ResizeObserver loop limit exceeded')) {
          return null;
        }
      }
      
      // Filter out non-actionable script errors
      if (event.exception?.values?.[0]?.type === 'Script error') {
        return null;
      }
      
      return event;
    },
    
    // Enhanced context for client-side errors
    initialScope: {
      tags: {
        component: 'yalla-london-client'
      }
    },
    
    // Client-side integrations
    integrations: [
      // Browser integrations - simplified for compatibility
      Sentry.browserTracingIntegration(),
      
      // Session replay integration (if enabled)
      ...(parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SAMPLE_RATE || '0') > 0 ? [
        Sentry.replayIntegration({
          // Mask sensitive data
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true
        })
      ] : [])
    ],
    
    // Request data configuration
    sendDefaultPii: false,
    
    // Enhanced breadcrumb filtering
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy UI breadcrumbs
      if (breadcrumb.category === 'ui.click' && 
          breadcrumb.message?.includes('body')) {
        return null;
      }
      
      // Enhance navigation breadcrumbs
      if (breadcrumb.category === 'navigation') {
        breadcrumb.data = {
          ...breadcrumb.data,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        };
      }
      
      // Filter out console logs in production
      if (breadcrumb.category === 'console' && 
          process.env.NODE_ENV === 'production') {
        return null;
      }
      
      return breadcrumb;
    },
    
    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
    
    // Additional client configuration - removed deprecated options for v8 compatibility
    
    // Custom event processors
    beforeSendTransaction(event) {
      // Add user context if available
      if (typeof window !== 'undefined' && window.location) {
        event.tags = {
          ...event.tags,
          page_url: window.location.pathname,
          page_referrer: document.referrer
        };
      }
      
      // Filter out very short transactions (likely noise)
      if (event.start_timestamp && event.timestamp) {
        const duration = event.timestamp - event.start_timestamp;
        if (duration < 0.01) { // Less than 10ms
          return null;
        }
      }
      
      return event;
    }
  });
  
  console.log('✅ Sentry initialized for client-side monitoring');
} else {
  console.warn('⚠️ Sentry DSN not configured, client-side error tracking disabled');
}