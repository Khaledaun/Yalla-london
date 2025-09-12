// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment and release tracking
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    
    // Performance Monitoring
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    
    // Error sampling
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    
    // Profile sampling
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    
    // Enhanced error filtering for server-side
    beforeSend(event, hint) {
      // Filter out common false positives in server environment
      const error = hint.originalException;
      
      if (error instanceof Error) {
        // Skip database connection errors in development
        if (process.env.NODE_ENV === 'development') {
          if (error.message.includes('ECONNREFUSED') || 
              error.message.includes('connect ECONNREFUSED') ||
              error.message.includes('Client has already been released')) {
            return null;
          }
        }
        
        // Skip known Next.js server warnings
        if (error.message.includes('Module not found') ||
            error.message.includes('Cannot resolve module')) {
          return null;
        }
        
        // Skip Prisma client initialization errors in build
        if (error.message.includes('@prisma/client did not initialize')) {
          return null;
        }
      }
      
      // Skip 404 errors (they're expected)
      if (event.exception?.values?.[0]?.type === 'NotFoundError' ||
          event.request?.url?.includes('404')) {
        return null;
      }
      
      return event;
    },
    
    // Enhanced context for server-side errors
    initialScope: {
      tags: {
        component: 'yalla-london-server',
        node_version: process.version,
        platform: process.platform
      }
    },
    
    // Integration configurations
    integrations: [
      // Enhanced HTTP integration for API monitoring
      Sentry.httpIntegration({
        breadcrumbs: true
      }),
      
      // Console integration for capturing logs
      Sentry.consoleIntegration(),
      
      // Enhanced Node.js integrations
      Sentry.onUncaughtExceptionIntegration({
        exitEvenIfOtherHandlersAreRegistered: false
      }),
      
      Sentry.onUnhandledRejectionIntegration({
        mode: 'warn'
      })
    ],
    
    // Request data configuration
    sendDefaultPii: false, // Don't send personally identifiable information
    
    // Performance monitoring for database queries
    beforeSendTransaction(event) {
      // Add custom tags for database transactions
      if (event.transaction?.includes('prisma') || 
          event.transaction?.includes('database')) {
        event.tags = {
          ...event.tags,
          transaction_type: 'database'
        };
      }
      
      // Add API endpoint tagging
      if (event.transaction?.startsWith('GET /api/') ||
          event.transaction?.startsWith('POST /api/')) {
        event.tags = {
          ...event.tags,
          transaction_type: 'api',
          endpoint: event.transaction
        };
      }
      
      return event;
    },
    
    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
    
    // Custom fingerprinting for better error grouping
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && 
          breadcrumb.level === 'log') {
        return null;
      }
      
      // Enhance HTTP breadcrumbs
      if (breadcrumb.category === 'http') {
        breadcrumb.data = {
          ...breadcrumb.data,
          timestamp: new Date().toISOString()
        };
      }
      
      return breadcrumb;
    }
  });
  
  console.log('✅ Sentry initialized for server-side monitoring');
} else {
  console.warn('⚠️ Sentry DSN not configured, error tracking disabled');
}