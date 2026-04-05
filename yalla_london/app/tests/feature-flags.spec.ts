/**
 * Feature Flag System Tests
 * Tests for feature flag coverage, runtime refresh logic, and flag management
 */

import { vi } from "vitest";
import {
  getFeatureFlags,
  isFeatureEnabled,
  getFeatureFlagStatus,
  getFeatureFlagStats,
  refreshFeatureFlags,
  getPremiumFeatureFlagsByCategory,
} from "../lib/feature-flags";

// Mock environment variables for testing
// Note: getFeatureFlags() reads env vars WITHOUT the FEATURE_ prefix
// (e.g. process.env.FEATURE_AUTO_PUBLISHING, process.env.PHASE4B_ENABLED, etc.)
const mockEnv: Record<string, string> = {
  PHASE4B_ENABLED: "1",
  FEATURE_AUTO_PUBLISHING: "0",
  FEATURE_CONTENT_PIPELINE: "1",
  FEATURE_SEO: "1",
  FEATURE_SOCIAL_MEDIA_INTEGRATION: "0",
  FEATURE_ADVANCED_TOPICS: "1",
  EXPORT_WORDPRESS: "1",
  AUDIT_SYSTEM: "1",
  FEATURE_ADVANCED_CRON: "0",
  FEATURE_LLM_ROUTER: "1",
};

describe("Feature Flag System", () => {
  beforeEach(() => {
    // Clear any cached feature flags
    vi.resetModules();

    // Mock process.env with test values
    Object.keys(mockEnv).forEach((key) => {
      process.env[key] = mockEnv[key];
    });
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
    vi.clearAllMocks();
  });

  describe("Feature Flag Coverage", () => {
    test("should have all required major feature flags defined", () => {
      const flags = getFeatureFlags();

      // Verify all major feature flags are present in the FeatureFlags interface
      const requiredFlags: Array<keyof typeof flags> = [
        "FEATURE_CONTENT_PIPELINE",
        "FEATURE_AUTO_PUBLISHING",
        "FEATURE_SEO",
        "FEATURE_SOCIAL_MEDIA_INTEGRATION",
        "FEATURE_ADVANCED_TOPICS",
        "FEATURE_ADVANCED_CRON",
        "EXPORT_WORDPRESS",
        "AUDIT_SYSTEM",
        "PHASE4B_ENABLED",
        "ADVANCED_CRON",
        "FEATURE_LLM_ROUTER",
      ];

      requiredFlags.forEach((flagKey) => {
        expect(flags[flagKey]).toBeDefined();
        expect(typeof flags[flagKey]).toBe("number");
      });
    });

    test("should return numeric values (0 or 1) for all flags", () => {
      const flags = getFeatureFlags();

      Object.entries(flags).forEach(([key, value]) => {
        expect(typeof value).toBe("number");
        expect([0, 1]).toContain(value);
      });
    });

    test("should have premium feature flags organized by category", () => {
      const categories = getPremiumFeatureFlagsByCategory();

      // Verify expected premium categories exist
      const expectedCategories = [
        "Admin & Dashboard",
        "Content Management",
        "Features & Tools",
        "User Experience",
        "Security & Access",
      ];

      expectedCategories.forEach((category) => {
        expect(categories[category]).toBeDefined();
        expect(categories[category].length).toBeGreaterThan(0);
      });
    });

    test("should have proper premium flag structure", () => {
      const categories = getPremiumFeatureFlagsByCategory();

      Object.values(categories).forEach((categoryFlags) => {
        categoryFlags.forEach((flag) => {
          expect(flag.key).toBeTruthy();
          expect(flag.name).toBeTruthy();
          expect(flag.description).toBeTruthy();
          expect(flag.scope).toBeTruthy();
          expect(typeof flag.enabled).toBe("boolean");
        });
      });
    });
  });

  describe("Feature Flag Reading", () => {
    test("should correctly read enabled flags from environment", () => {
      expect(isFeatureEnabled("PHASE4B_ENABLED")).toBe(true);
      expect(isFeatureEnabled("FEATURE_CONTENT_PIPELINE")).toBe(true);
      expect(isFeatureEnabled("FEATURE_SEO")).toBe(true);
    });

    test("should correctly read disabled flags from environment", () => {
      expect(isFeatureEnabled("FEATURE_AUTO_PUBLISHING")).toBe(false);
      expect(isFeatureEnabled("FEATURE_SOCIAL_MEDIA_INTEGRATION")).toBe(false);
      expect(isFeatureEnabled("FEATURE_ADVANCED_CRON")).toBe(false);
    });

    test("should return false for flags with value 0", () => {
      // Flags not set in env default to 0 via parseInt fallback
      const flags = getFeatureFlags();
      expect(flags.FEATURE_WP_CONNECTOR).toBe(0);
      expect(isFeatureEnabled("FEATURE_WP_CONNECTOR")).toBe(false);
    });

    test("should get flag status with enabled boolean and numeric value", () => {
      const status = getFeatureFlagStatus();

      expect(status["PHASE4B_ENABLED"]).toBeDefined();
      expect(status["PHASE4B_ENABLED"].enabled).toBe(true);
      expect(status["PHASE4B_ENABLED"].value).toBe(1);

      expect(status["FEATURE_AUTO_PUBLISHING"]).toBeDefined();
      expect(status["FEATURE_AUTO_PUBLISHING"].enabled).toBe(false);
      expect(status["FEATURE_AUTO_PUBLISHING"].value).toBe(0);
    });
  });

  describe("Feature Flag Statistics", () => {
    test("should calculate correct statistics", () => {
      const stats = getFeatureFlagStats();

      // Total should match number of flags in FeatureFlags interface
      expect(stats.total).toBe(20); // 20 flags defined in FeatureFlags
      expect(stats.enabled + stats.disabled).toBe(stats.total);
      expect(stats.enabled).toBeGreaterThanOrEqual(0);
      expect(stats.disabled).toBeGreaterThanOrEqual(0);
    });

    test("should include flags record in stats", () => {
      const stats = getFeatureFlagStats();

      expect(stats.flags).toBeDefined();
      expect(Object.keys(stats.flags).length).toBe(stats.total);

      // Each flag in stats should have enabled and value
      Object.values(stats.flags).forEach((flag) => {
        expect(typeof flag.enabled).toBe("boolean");
        expect(typeof flag.value).toBe("number");
      });
    });
  });

  describe("Runtime Refresh Logic", () => {
    test("should refresh flags from updated environment", () => {
      // Initial state
      expect(isFeatureEnabled("FEATURE_AUTO_PUBLISHING")).toBe(false);

      // Update environment
      process.env.FEATURE_AUTO_PUBLISHING = "1";

      // Refresh flags
      const refreshedFlags = refreshFeatureFlags();

      // Verify flag is now enabled
      expect(refreshedFlags.FEATURE_AUTO_PUBLISHING).toBe(1);
      expect(isFeatureEnabled("FEATURE_AUTO_PUBLISHING")).toBe(true);
    });

    test("should handle environment variable removal", () => {
      // Initial state - flag enabled
      expect(isFeatureEnabled("PHASE4B_ENABLED")).toBe(true);

      // Remove environment variable
      delete process.env.PHASE4B_ENABLED;

      // Refresh flags
      refreshFeatureFlags();

      // Verify flag is now disabled (defaults to 0 via parseInt fallback)
      expect(isFeatureEnabled("PHASE4B_ENABLED")).toBe(false);
    });

    test("should handle invalid environment values", () => {
      // Set invalid values — parseInt will return NaN or unexpected numbers
      process.env.FEATURE_CONTENT_PIPELINE = "invalid";
      process.env.FEATURE_SEO = "yes";
      process.env.EXPORT_WORDPRESS = "2";

      // Refresh flags
      refreshFeatureFlags();

      // "invalid" -> parseInt returns NaN, NaN !== 1 -> false
      expect(isFeatureEnabled("FEATURE_CONTENT_PIPELINE")).toBe(false);
      // "yes" -> parseInt returns NaN, NaN !== 1 -> false
      expect(isFeatureEnabled("FEATURE_SEO")).toBe(false);
      // "2" -> parseInt returns 2, 2 !== 1 -> false
      expect(isFeatureEnabled("EXPORT_WORDPRESS")).toBe(false);
    });

    test("should maintain flag consistency after multiple refreshes", () => {
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

  describe("Flag Management Edge Cases", () => {
    test("should handle empty environment gracefully", () => {
      // Clear all feature flag environment variables
      Object.keys(mockEnv).forEach((key) => {
        delete process.env[key];
      });

      // Refresh flags
      const flags = refreshFeatureFlags();

      // All flags should default to 0 (disabled)
      Object.values(flags).forEach((value) => {
        expect(value).toBe(0);
      });

      const stats = getFeatureFlagStats();
      expect(stats.enabled).toBe(0);
      expect(stats.disabled).toBe(stats.total);
    });

    test("should preserve flag structure during refresh", () => {
      const beforeRefresh = getFeatureFlags();
      const beforeKeys = Object.keys(beforeRefresh);

      refreshFeatureFlags();

      const afterRefresh = getFeatureFlags();
      const afterKeys = Object.keys(afterRefresh);

      // Same flags should exist
      expect(afterKeys.sort()).toEqual(beforeKeys.sort());
    });

    test("should handle rapid successive refreshes", () => {
      // Simulate rapid API calls
      const refreshPromises = Array.from({ length: 10 }, () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const result = refreshFeatureFlags();
            resolve(result);
          }, Math.random() * 100);
        });
      });

      return Promise.all(refreshPromises).then((results) => {
        // All results should be consistent
        const firstResult = results[0] as any;
        results.forEach((result) => {
          expect(Object.keys(result as any).sort()).toEqual(
            Object.keys(firstResult).sort(),
          );
        });
      });
    });
  });

  describe("Integration with Environment Variables", () => {
    test("should read flags via parseInt with 0 default", () => {
      const flags = getFeatureFlags();

      // Flags set to "1" should be 1
      expect(flags.PHASE4B_ENABLED).toBe(1);
      expect(flags.FEATURE_CONTENT_PIPELINE).toBe(1);

      // Flags set to "0" should be 0
      expect(flags.FEATURE_AUTO_PUBLISHING).toBe(0);
      expect(flags.FEATURE_ADVANCED_CRON).toBe(0);

      // Flags not set at all should default to 0
      expect(flags.FEATURE_WHITE_LABEL).toBe(0);
    });

    test("should only treat value 1 as enabled", () => {
      // Set various numeric values
      process.env.FEATURE_WP_CONNECTOR = "1";
      process.env.FEATURE_WHITE_LABEL = "2";
      process.env.FEATURE_BACKLINK_OFFERS = "0";
      process.env.FEATURE_CRM_MINIMAL = "-1";

      refreshFeatureFlags();

      // Only "1" should be enabled
      expect(isFeatureEnabled("FEATURE_WP_CONNECTOR")).toBe(true);
      expect(isFeatureEnabled("FEATURE_WHITE_LABEL")).toBe(false);
      expect(isFeatureEnabled("FEATURE_BACKLINK_OFFERS")).toBe(false);
      expect(isFeatureEnabled("FEATURE_CRM_MINIMAL")).toBe(false);
    });
  });
});

describe("Feature Flag API Integration", () => {
  beforeEach(() => {
    Object.keys(mockEnv).forEach((key) => {
      process.env[key] = mockEnv[key];
    });
  });

  afterEach(() => {
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
  });

  test("should provide complete flag information for API responses", () => {
    const flags = getFeatureFlags();
    const stats = getFeatureFlagStats();
    const categories = getPremiumFeatureFlagsByCategory();

    // Verify data is suitable for API responses
    expect(Object.keys(flags).length).toBeGreaterThan(0);
    expect(stats.total).toBeGreaterThan(0);
    expect(Object.keys(categories).length).toBeGreaterThan(0);

    // Verify structure is JSON-serializable
    expect(() => JSON.stringify(flags)).not.toThrow();
    expect(() => JSON.stringify(stats)).not.toThrow();
    expect(() => JSON.stringify(categories)).not.toThrow();
  });

  test("should support refresh functionality needed by API endpoint", () => {
    const beforeStats = getFeatureFlagStats();

    // Change environment — enable a previously disabled flag
    process.env.FEATURE_AUTO_PUBLISHING = "1";

    // This mimics what the API endpoint does
    const refreshedFlags = refreshFeatureFlags();
    const afterStats = getFeatureFlagStats();

    // Verify change detection works
    expect(afterStats.enabled).toBe(beforeStats.enabled + 1);
    expect(refreshedFlags.FEATURE_AUTO_PUBLISHING).toBe(1);
  });
});
