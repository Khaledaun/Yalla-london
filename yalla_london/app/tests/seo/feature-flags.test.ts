/**
 * Feature Flags Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  isFeatureEnabled, 
  isFeatureEnabledWithDeps, 
  isSEOEnabled, 
  isAISEOEnabled, 
  isAnalyticsEnabled,
  getFeatureFlagStatus,
  getSEOFeatureFlags 
} from '@/lib/flags';

describe('Feature Flags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature flag is set to 1', () => {
      process.env.FEATURE_SEO = '1';
      expect(isFeatureEnabled('FEATURE_SEO')).toBe(true);
    });

    it('should return false when feature flag is set to 0', () => {
      process.env.FEATURE_SEO = '0';
      expect(isFeatureEnabled('FEATURE_SEO')).toBe(false);
    });

    it('should return false when feature flag is not set', () => {
      delete process.env.FEATURE_SEO;
      expect(isFeatureEnabled('FEATURE_SEO')).toBe(false);
    });

    it('should return false for non-existent feature flag', () => {
      expect(isFeatureEnabled('NON_EXISTENT_FLAG')).toBe(false);
    });
  });

  describe('isFeatureEnabledWithDeps', () => {
    it('should return true when feature is enabled and dependencies are met', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '1';
      process.env.ABACUSAI_API_KEY = 'test-key';
      
      expect(isFeatureEnabledWithDeps('FEATURE_AI_SEO_AUDIT')).toBe(true);
    });

    it('should return false when feature is enabled but dependencies are missing', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '1';
      delete process.env.ABACUSAI_API_KEY;
      
      expect(isFeatureEnabledWithDeps('FEATURE_AI_SEO_AUDIT')).toBe(false);
    });

    it('should return false when feature is disabled', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '0';
      process.env.ABACUSAI_API_KEY = 'test-key';
      
      expect(isFeatureEnabledWithDeps('FEATURE_AI_SEO_AUDIT')).toBe(false);
    });

    it('should return true for features without dependencies', () => {
      process.env.FEATURE_SEO = '1';
      
      expect(isFeatureEnabledWithDeps('FEATURE_SEO')).toBe(true);
    });
  });

  describe('isSEOEnabled', () => {
    it('should return true when both SEO flags are enabled', () => {
      process.env.FEATURE_SEO = '1';
      process.env.NEXT_PUBLIC_FEATURE_SEO = '1';
      
      expect(isSEOEnabled()).toBe(true);
    });

    it('should return false when FEATURE_SEO is disabled', () => {
      process.env.FEATURE_SEO = '0';
      process.env.NEXT_PUBLIC_FEATURE_SEO = '1';
      
      expect(isSEOEnabled()).toBe(false);
    });

    it('should return false when NEXT_PUBLIC_FEATURE_SEO is disabled', () => {
      process.env.FEATURE_SEO = '1';
      process.env.NEXT_PUBLIC_FEATURE_SEO = '0';
      
      expect(isSEOEnabled()).toBe(false);
    });

    it('should return false when both flags are disabled', () => {
      process.env.FEATURE_SEO = '0';
      process.env.NEXT_PUBLIC_FEATURE_SEO = '0';
      
      expect(isSEOEnabled()).toBe(false);
    });
  });

  describe('isAISEOEnabled', () => {
    it('should return true when AI SEO is enabled with API key', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '1';
      process.env.ABACUSAI_API_KEY = 'test-key';
      
      expect(isAISEOEnabled()).toBe(true);
    });

    it('should return false when AI SEO is disabled', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '0';
      process.env.ABACUSAI_API_KEY = 'test-key';
      
      expect(isAISEOEnabled()).toBe(false);
    });

    it('should return false when AI SEO is enabled but API key is missing', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '1';
      delete process.env.ABACUSAI_API_KEY;
      
      expect(isAISEOEnabled()).toBe(false);
    });
  });

  describe('isAnalyticsEnabled', () => {
    it('should return true when analytics is enabled with GA ID', () => {
      process.env.FEATURE_ANALYTICS_DASHBOARD = '1';
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = 'G-TEST123';
      
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it('should return false when analytics is disabled', () => {
      process.env.FEATURE_ANALYTICS_DASHBOARD = '0';
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = 'G-TEST123';
      
      expect(isAnalyticsEnabled()).toBe(false);
    });

    it('should return false when analytics is enabled but GA ID is missing', () => {
      process.env.FEATURE_ANALYTICS_DASHBOARD = '1';
      delete process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
      
      expect(isAnalyticsEnabled()).toBe(false);
    });
  });

  describe('getFeatureFlagStatus', () => {
    it('should return correct status for enabled feature without dependencies', () => {
      process.env.FEATURE_SEO = '1';
      
      const status = getFeatureFlagStatus('FEATURE_SEO');
      
      expect(status.enabled).toBe(true);
      expect(status.hasDependencies).toBe(false);
      expect(status.missingDependencies).toEqual([]);
    });

    it('should return correct status for enabled feature with met dependencies', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '1';
      process.env.ABACUSAI_API_KEY = 'test-key';
      
      const status = getFeatureFlagStatus('FEATURE_AI_SEO_AUDIT');
      
      expect(status.enabled).toBe(true);
      expect(status.hasDependencies).toBe(true);
      expect(status.missingDependencies).toEqual([]);
    });

    it('should return correct status for enabled feature with missing dependencies', () => {
      process.env.FEATURE_AI_SEO_AUDIT = '1';
      delete process.env.ABACUSAI_API_KEY;
      
      const status = getFeatureFlagStatus('FEATURE_AI_SEO_AUDIT');
      
      expect(status.enabled).toBe(true);
      expect(status.hasDependencies).toBe(true);
      expect(status.missingDependencies).toEqual(['ABACUSAI_API_KEY']);
    });

    it('should return correct status for disabled feature', () => {
      process.env.FEATURE_SEO = '0';
      
      const status = getFeatureFlagStatus('FEATURE_SEO');
      
      expect(status.enabled).toBe(false);
      expect(status.hasDependencies).toBe(false);
      expect(status.missingDependencies).toEqual([]);
    });

    it('should return correct status for non-existent feature', () => {
      const status = getFeatureFlagStatus('NON_EXISTENT_FLAG');
      
      expect(status.enabled).toBe(false);
      expect(status.hasDependencies).toBe(false);
      expect(status.missingDependencies).toEqual([]);
    });
  });

  describe('getSEOFeatureFlags', () => {
    it('should return only SEO-related feature flags', () => {
      process.env.FEATURE_SEO = '1';
      process.env.FEATURE_AI_SEO_AUDIT = '1';
      process.env.FEATURE_ANALYTICS_DASHBOARD = '1';
      process.env.FEATURE_MEDIA = '1'; // Non-SEO flag
      
      const seoFlags = getSEOFeatureFlags();
      
      expect(seoFlags).toHaveProperty('FEATURE_SEO');
      expect(seoFlags).toHaveProperty('FEATURE_AI_SEO_AUDIT');
      expect(seoFlags).toHaveProperty('FEATURE_ANALYTICS_DASHBOARD');
      expect(seoFlags).toHaveProperty('FEATURE_MULTILINGUAL_SEO');
      expect(seoFlags).toHaveProperty('FEATURE_SCHEMA_GENERATION');
      expect(seoFlags).toHaveProperty('FEATURE_SITEMAP_AUTO_UPDATE');
      expect(seoFlags).not.toHaveProperty('FEATURE_MEDIA');
    });

    it('should return empty object when no SEO flags are set', () => {
      delete process.env.FEATURE_SEO;
      delete process.env.FEATURE_AI_SEO_AUDIT;
      delete process.env.FEATURE_ANALYTICS_DASHBOARD;
      
      const seoFlags = getSEOFeatureFlags();
      
      // Should still have the flag definitions, but they'll be disabled
      expect(Object.keys(seoFlags).length).toBeGreaterThan(0);
      expect(seoFlags.FEATURE_SEO?.enabled).toBe(false);
    });
  });
});

