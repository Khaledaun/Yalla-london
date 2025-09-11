
module.exports = {
  ci: {
    collect: {
      url: [
        process.env.LHCI_URL_STAGING || 'http://localhost:3000',
        (process.env.LHCI_URL_STAGING || 'http://localhost:3000') + '/blog',
        (process.env.LHCI_URL_STAGING || 'http://localhost:3000') + '/recommendations',
        // Skip auth-gated pages when running in CI with staging URL
        ...(process.env.LHCI_URL_STAGING ? [] : [(process.env.LHCI_URL_STAGING || 'http://localhost:3000') + '/admin'])
      ],
      startServerCommand: process.env.LHCI_URL_STAGING ? undefined : 'yarn start',
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}], 
        'categories:best-practices': ['warn', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.9}],
        'categories:pwa': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
