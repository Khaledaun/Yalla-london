// This file configures the initialization of Sentry for edge runtime.
// The config you add here will be used whenever one of the Edge Runtime APIs is used.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment and release tracking
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    
    // Performance Monitoring (lighter for edge runtime)
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05'),
    
    // Error sampling
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    
    // Enhanced error filtering for edge runtime
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      if (error instanceof Error) {
        // Skip edge runtime specific errors that are not actionable
        if (error.message.includes('Edge Runtime') ||
            error.message.includes('WebAssembly')) {
          return null;
        }
      }
      
      return event;
    },
    
    // Minimal context for edge runtime
    initialScope: {
      tags: {
        component: 'yalla-london-edge',
        runtime: 'edge'
      }
    },
    
    // Lightweight integrations for edge runtime
    integrations: [
      Sentry.httpIntegration({
        breadcrumbs: false // Reduce overhead
      })
    ],
    
    // Don't send PII
    sendDefaultPii: false,
    
    // Minimal debug for edge runtime
    debug: false
  });
  
  console.log('✅ Sentry initialized for edge runtime monitoring');
} else {
  console.warn('⚠️ Sentry DSN not configured for edge runtime');
}