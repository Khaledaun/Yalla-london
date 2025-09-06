
module.exports = {
  ci: {
    collect: {
      url: [
        `${process.env.STAGING_URL || 'http://localhost:3000'}`,
        `${process.env.STAGING_URL || 'http://localhost:3000'}/blog`,
        `${process.env.STAGING_URL || 'http://localhost:3000'}/recommendations`,
        `${process.env.STAGING_URL || 'http://localhost:3000'}/events`,
        `${process.env.STAGING_URL || 'http://localhost:3000'}/about`,
        `${process.env.STAGING_URL || 'http://localhost:3000'}?lang=ar`
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        }
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': 'off',
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // Additional metrics
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
        
        // SEO specific
        'meta-description': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'image-alt': 'error',
        'link-text': 'error',
        'meta-viewport': 'error',
        'hreflang': 'warn',
        
        // Best practices
        'uses-https': 'error',
        'uses-http2': 'warn',
        'uses-responsive-images': 'warn',
        'modern-image-formats': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        
        // Accessibility
        'color-contrast': 'error',
        'heading-order': 'error',
        'label': 'error',
        'landmark-one-main': 'error',
        'page-has-heading-one': 'error',
        'skip-link': 'warn',
        'tabindex': 'error',
        'valid-lang': 'error'
      }
    },
    upload: {
      target: 'temporary-public-storage',
      outputDir: './lighthouse-results',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%'
    },
    server: {
      command: 'yarn start',
      port: 3000,
      wait: 5000
    }
  }
};
