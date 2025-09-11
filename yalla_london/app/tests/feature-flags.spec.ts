/**
 * Feature Flag System Tests
 * Tests for feature flag coverage, runtime refresh logic, and flag management
 */

import { 
  getFeatureFlags, 
  isFeatureEnabled, 
  getFeatureFlag, 
  getFeatureFlagsByCategory,
  getFeatureFlagStats,
  refreshFeatureFlags
} from '../lib/feature-flags';

// Mock environment variables for testing
const mockEnv = {
  FEATURE_PHASE4B_ENABLED: 'true',
  FEATURE_AUTO_PUBLISHING: 'false',
  FEATURE_CONTENT_ANALYTICS: 'true',
  FEATURE_SEO_OPTIMIZATION: 'true',
  FEATURE_SOCIAL_MEDIA_INTEGRATION: 'false',
  FEATURE_ADVANCED_TOPICS: 'true',
  FEATURE_EXPORT_WORDPRESS: 'true',
  FEATURE_AUDIT_SYSTEM: 'true',
  FEATURE_ENTERPRISE_FEATURES: 'true',
  FEATURE_ADVANCED_CRON: 'false'
};

describe('Feature Flag System', () => {
  beforeEach(() => {
    // Clear any cached feature flags
    jest.resetModules();
    
    // Mock process.env with test values
    Object.keys(mockEnv).forEach(key => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
    jest.clearAllMocks();
  });

  describe('Feature Flag Coverage', () => {
    test('should have all required major feature categories covered', () => {
      const flags = getFeatureFlags();
      const categories = getFeatureFlagsByCategory();
      
      // Verify all major feature categories are present
      const requiredCategories = [
        'publishing',    // Auto publishing
        'analytics',     // Content analytics
        'seo',          // SEO optimization
        'social',       // Social media integration
        'export',       // Export functionality
        'cron',         // Advanced cron management
        'compliance',   // Audit system
        'enterprise',   // Enterprise features
        'content'       // Content generation
      ];

      requiredCategories.forEach(category => {
        expect(categories[category]).toBeDefined();
        expect(categories[category].length).toBeGreaterThan(0);
      });
    });

    test('should have comprehensive flag coverage for all major features', () => {
      const flags = getFeatureFlags();
      
      // Required feature flags for major platform features
      const requiredFlags = [
        'PHASE4B_ENABLED',           // Master content generation toggle
        'AUTO_PUBLISHING',           // Publishing features
        'CONTENT_ANALYTICS',         // Analytics features
        'SEO_OPTIMIZATION',          // SEO features
        'SOCIAL_MEDIA_INTEGRATION',  // Social features
        'EXPORT_WORDPRESS',          // Export features
        'ADVANCED_CRON',             // Cron features
        'AUDIT_SYSTEM',              // Compliance features
        'ENTERPRISE_FEATURES'        // Enterprise controls
      ];

      requiredFlags.forEach(flagKey => {
        expect(flags[flagKey]).toBeDefined();
        expect(flags[flagKey].key).toBe(flagKey);
        expect(flags[flagKey].description).toBeTruthy();
        expect(flags[flagKey].category).toBeTruthy();
        expect(typeof flags[flagKey].enabled).toBe('boolean');
      });
    });

    test('should properly categorize feature flags', () => {
      const categories = getFeatureFlagsByCategory();
      
      // Verify specific flags are in correct categories
      const categoryMappings = {
        'publishing': ['AUTO_PUBLISHING'],
        'analytics': ['CONTENT_ANALYTICS'],
        'seo': ['SEO_OPTIMIZATION'],
        'social': ['SOCIAL_MEDIA_INTEGRATION'],
        'export': ['EXPORT_WORDPRESS'],
        'cron': ['ADVANCED_CRON'],
        'compliance': ['AUDIT_SYSTEM'],
        'enterprise': ['ENTERPRISE_FEATURES'],
        'content': ['PHASE4B_ENABLED', 'ADVANCED_TOPICS']
      };

      Object.entries(categoryMappings).forEach(([category, expectedFlags]) => {
        const categoryFlags = categories[category];
        expectedFlags.forEach(flagKey => {
          const flag = categoryFlags.find(f => f.key === flagKey);
          expect(flag).toBeDefined();
          expect(flag?.category).toBe(category);
        });
      });
    });

    test('should have proper flag descriptions and metadata', () => {
      const flags = getFeatureFlags();
      
      Object.values(flags).forEach(flag => {
        // Each flag should have complete metadata
        expect(flag.key).toBeTruthy();
        expect(flag.description).toBeTruthy();
        expect(flag.category).toBeTruthy();
        expect(typeof flag.enabled).toBe('boolean');
        
        // Description should be informative (at least 20 characters)
        expect(flag.description.length).toBeGreaterThan(20);
        
        // Key should follow naming convention
        expect(flag.key).toMatch(/^[A-Z_]+$/);
      });
    });
  });

  describe('Feature Flag Reading', () => {
    test('should correctly read enabled flags from environment', () => {
      expect(isFeatureEnabled('PHASE4B_ENABLED')).toBe(true);
      expect(isFeatureEnabled('CONTENT_ANALYTICS')).toBe(true);
      expect(isFeatureEnabled('SEO_OPTIMIZATION')).toBe(true);
    });

    test('should correctly read disabled flags from environment', () => {
      expect(isFeatureEnabled('AUTO_PUBLISHING')).toBe(false);
      expect(isFeatureEnabled('SOCIAL_MEDIA_INTEGRATION')).toBe(false);
      expect(isFeatureEnabled('ADVANCED_CRON')).toBe(false);
    });

    test('should return false for non-existent flags', () => {
      expect(isFeatureEnabled('NON_EXISTENT_FLAG')).toBe(false);
    });

    test('should get individual flag details', () => {
      const flag = getFeatureFlag('PHASE4B_ENABLED');
      
      expect(flag).toBeDefined();
      expect(flag?.key).toBe('PHASE4B_ENABLED');
      expect(flag?.enabled).toBe(true);
      expect(flag?.category).toBe('content');
      expect(flag?.description).toContain('Phase 4B');
    });

    test('should return null for non-existent flag', () => {
      const flag = getFeatureFlag('NON_EXISTENT_FLAG');
      expect(flag).toBeNull();
    });
  });

  describe('Feature Flag Statistics', () => {
    test('should calculate correct statistics', () => {
      const stats = getFeatureFlagStats();
      
      // Based on our mock environment
      expect(stats.total).toBe(10);
      expect(stats.enabled).toBe(7); // 7 flags set to 'true' in mockEnv
      expect(stats.disabled).toBe(3); // 3 flags set to 'false' in mockEnv
      expect(stats.enabled + stats.disabled).toBe(stats.total);
    });

    test('should calculate statistics by category', () => {
      const stats = getFeatureFlagStats();
      
      // Verify category stats are present and valid
      expect(stats.byCategory).toBeDefined();
      
      Object.values(stats.byCategory).forEach(catStats => {
        expect(catStats.total).toBeGreaterThan(0);
        expect(catStats.enabled + catStats.disabled).toBe(catStats.total);
      });
    });
  });

  describe('Runtime Refresh Logic', () => {
    test('should refresh flags from updated environment', () => {
      // Initial state
      expect(isFeatureEnabled('AUTO_PUBLISHING')).toBe(false);
      
      // Update environment
      process.env.FEATURE_AUTO_PUBLISHING = 'true';
      
      // Refresh flags
      const refreshedFlags = refreshFeatureFlags();
      
      // Verify flag is now enabled
      expect(isFeatureEnabled('AUTO_PUBLISHING')).toBe(true);
      expect(refreshedFlags.AUTO_PUBLISHING.enabled).toBe(true);
    });

    test('should handle environment variable removal', () => {
      // Initial state - flag enabled
      expect(isFeatureEnabled('PHASE4B_ENABLED')).toBe(true);
      
      // Remove environment variable
      delete process.env.FEATURE_PHASE4B_ENABLED;
      
      // Refresh flags
      refreshFeatureFlags();
      
      // Verify flag is now disabled (default state)
      expect(isFeatureEnabled('PHASE4B_ENABLED')).toBe(false);
    });

    test('should handle invalid environment values', () => {
      // Set invalid values
      process.env.FEATURE_CONTENT_ANALYTICS = 'invalid';
      process.env.FEATURE_SEO_OPTIMIZATION = 'yes';
      process.env.FEATURE_EXPORT_WORDPRESS = '1';
      
      // Refresh flags
      refreshFeatureFlags();
      
      // Verify invalid values are treated as false
      expect(isFeatureEnabled('CONTENT_ANALYTICS')).toBe(false);
      expect(isFeatureEnabled('SEO_OPTIMIZATION')).toBe(false);
      expect(isFeatureEnabled('EXPORT_WORDPRESS')).toBe(false);
    });

    test('should maintain flag consistency after multiple refreshes', () => {
      const initialStats = getFeatureFlagStats();
      
      // Multiple refresh cycles
      refreshFeatureFlags();
      refreshFeatureFlags();
      refreshFeatureFlags();
      
      const finalStats = getFeatureFlagStats();
      
      // Stats should remain consistent
      expect(finalStats.total).toBe(initialStats.total);
      expect(finalStats.enabled).toBe(initialStats.enabled);
      expect(finalStats.disabled).toBe(initialStats.disabled);
    });
  });

  describe('Flag Management Edge Cases', () => {
    test('should handle empty environment gracefully', () => {
      // Clear all feature flag environment variables
      Object.keys(mockEnv).forEach(key => {
        delete process.env[key];
      });
      
      // Refresh flags
      const flags = refreshFeatureFlags();
      
      // All flags should be disabled
      Object.values(flags).forEach(flag => {
        expect(flag.enabled).toBe(false);
      });
      
      const stats = getFeatureFlagStats();
      expect(stats.enabled).toBe(0);
      expect(stats.disabled).toBe(stats.total);
    });

    test('should preserve flag structure during refresh', () => {
      const beforeRefresh = getFeatureFlags();
      const beforeKeys = Object.keys(beforeRefresh);
      
      refreshFeatureFlags();
      
      const afterRefresh = getFeatureFlags();
      const afterKeys = Object.keys(afterRefresh);
      
      // Same flags should exist
      expect(afterKeys.sort()).toEqual(beforeKeys.sort());
      
      // Flag structure should be preserved
      beforeKeys.forEach(key => {
        expect(afterRefresh[key].key).toBe(beforeRefresh[key].key);
        expect(afterRefresh[key].description).toBe(beforeRefresh[key].description);
        expect(afterRefresh[key].category).toBe(beforeRefresh[key].category);
      });
    });

    test('should handle rapid successive refreshes', () => {
      // Simulate rapid API calls
      const refreshPromises = Array.from({ length: 10 }, () => {
        return new Promise(resolve => {
          setTimeout(() => {
            const result = refreshFeatureFlags();
            resolve(result);
          }, Math.random() * 100);
        });
      });
      
      return Promise.all(refreshPromises).then(results => {
        // All results should be consistent
        const firstResult = results[0] as any;
        results.forEach(result => {
          expect(Object.keys(result as any).sort()).toEqual(Object.keys(firstResult).sort());
        });
      });
    });
  });

  describe('Integration with Environment Variables', () => {
    test('should follow correct environment variable naming convention', () => {
      const flags = getFeatureFlags();
      
      Object.values(flags).forEach(flag => {
        const envVarName = `FEATURE_${flag.key}`;
        
        // Environment variable should exist or be handleable
        // (we don't require all env vars to be set, but if set, should follow pattern)
        if (process.env[envVarName] !== undefined) {
          expect(['true', 'false']).toContain(process.env[envVarName]);
        }
      });
    });

    test('should handle case sensitivity correctly', () => {
      // Test with various cases
      process.env.FEATURE_PHASE4B_ENABLED = 'TRUE';
      process.env.FEATURE_AUTO_PUBLISHING = 'True';
      process.env.FEATURE_CONTENT_ANALYTICS = 'false';
      process.env.FEATURE_SEO_OPTIMIZATION = 'FALSE';
      
      refreshFeatureFlags();
      
      // Only exact 'true' should enable flags
      expect(isFeatureEnabled('PHASE4B_ENABLED')).toBe(false);
      expect(isFeatureEnabled('AUTO_PUBLISHING')).toBe(false);
      expect(isFeatureEnabled('CONTENT_ANALYTICS')).toBe(false);
      expect(isFeatureEnabled('SEO_OPTIMIZATION')).toBe(false);
    });
  });
});

describe('Feature Flag API Integration', () => {
  test('should provide complete flag information for API responses', () => {
    const flags = getFeatureFlags();
    const stats = getFeatureFlagStats();
    const categories = getFeatureFlagsByCategory();
    
    // Verify data is suitable for API responses
    expect(Object.keys(flags).length).toBeGreaterThan(0);
    expect(stats.total).toBeGreaterThan(0);
    expect(Object.keys(categories).length).toBeGreaterThan(0);
    
    // Verify structure is JSON-serializable
    expect(() => JSON.stringify(flags)).not.toThrow();
    expect(() => JSON.stringify(stats)).not.toThrow();
    expect(() => JSON.stringify(categories)).not.toThrow();
  });

  test('should support refresh functionality needed by API endpoint', () => {
    const beforeStats = getFeatureFlagStats();
    
    // Change environment
    process.env.FEATURE_AUTO_PUBLISHING = 'true';
    
    // This mimics what the API endpoint does
    const refreshedFlags = refreshFeatureFlags();
    const afterStats = getFeatureFlagStats();
    
    // Verify change detection works
    expect(beforeStats.enabled).not.toBe(afterStats.enabled);
    expect(refreshedFlags.AUTO_PUBLISHING.enabled).toBe(true);
  });
});