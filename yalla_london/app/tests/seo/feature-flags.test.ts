/**
 * Feature Flags Tests
 *
 * Note: lib/flags.ts caches feature flags at module load time.
 * We use vi.resetModules() + dynamic import to re-load the module
 * after each env var change so the tests can validate behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Feature Flags", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loadFlags() {
    return await import("@/lib/flags");
  }

  describe("isFeatureEnabled", () => {
    it("should return true when feature flag is set to 1", async () => {
      process.env.FEATURE_SEO = "1";
      const { isFeatureEnabled } = await loadFlags();
      expect(isFeatureEnabled("FEATURE_SEO")).toBe(true);
    });

    it("should return false when feature flag is set to 0", async () => {
      process.env.FEATURE_SEO = "0";
      const { isFeatureEnabled } = await loadFlags();
      expect(isFeatureEnabled("FEATURE_SEO")).toBe(false);
    });

    it("should return false when feature flag is not set", async () => {
      delete process.env.FEATURE_SEO;
      const { isFeatureEnabled } = await loadFlags();
      expect(isFeatureEnabled("FEATURE_SEO")).toBe(false);
    });

    it("should return false for non-existent feature flag", async () => {
      const { isFeatureEnabled } = await loadFlags();
      expect(isFeatureEnabled("NON_EXISTENT_FLAG")).toBe(false);
    });
  });

  describe("isFeatureEnabledWithDeps", () => {
    it("should return true when feature is enabled and dependencies are met", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "1";
      process.env.ABACUSAI_API_KEY = "test-key";
      const { isFeatureEnabledWithDeps } = await loadFlags();
      expect(isFeatureEnabledWithDeps("FEATURE_AI_SEO_AUDIT")).toBe(true);
    });

    it("should return false when feature is enabled but dependencies are missing", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "1";
      delete process.env.ABACUSAI_API_KEY;
      const { isFeatureEnabledWithDeps } = await loadFlags();
      expect(isFeatureEnabledWithDeps("FEATURE_AI_SEO_AUDIT")).toBe(false);
    });

    it("should return false when feature is disabled", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "0";
      process.env.ABACUSAI_API_KEY = "test-key";
      const { isFeatureEnabledWithDeps } = await loadFlags();
      expect(isFeatureEnabledWithDeps("FEATURE_AI_SEO_AUDIT")).toBe(false);
    });

    it("should return true for features without dependencies", async () => {
      process.env.FEATURE_SEO = "1";
      const { isFeatureEnabledWithDeps } = await loadFlags();
      expect(isFeatureEnabledWithDeps("FEATURE_SEO")).toBe(true);
    });
  });

  describe("isSEOEnabled", () => {
    it("should return true when both SEO flags are enabled", async () => {
      process.env.FEATURE_SEO = "1";
      process.env.NEXT_PUBLIC_FEATURE_SEO = "1";
      const { isSEOEnabled } = await loadFlags();
      expect(isSEOEnabled()).toBe(true);
    });

    it("should return false when FEATURE_SEO is disabled", async () => {
      process.env.FEATURE_SEO = "0";
      process.env.NEXT_PUBLIC_FEATURE_SEO = "1";
      const { isSEOEnabled } = await loadFlags();
      expect(isSEOEnabled()).toBe(false);
    });

    it("should return false when NEXT_PUBLIC_FEATURE_SEO is disabled", async () => {
      process.env.FEATURE_SEO = "1";
      process.env.NEXT_PUBLIC_FEATURE_SEO = "0";
      const { isSEOEnabled } = await loadFlags();
      expect(isSEOEnabled()).toBe(false);
    });

    it("should return false when both flags are disabled", async () => {
      process.env.FEATURE_SEO = "0";
      process.env.NEXT_PUBLIC_FEATURE_SEO = "0";
      const { isSEOEnabled } = await loadFlags();
      expect(isSEOEnabled()).toBe(false);
    });
  });

  describe("isAISEOEnabled", () => {
    it("should return true when AI SEO is enabled with API key", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "1";
      process.env.ABACUSAI_API_KEY = "test-key";
      const { isAISEOEnabled } = await loadFlags();
      expect(isAISEOEnabled()).toBe(true);
    });

    it("should return false when AI SEO is disabled", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "0";
      process.env.ABACUSAI_API_KEY = "test-key";
      const { isAISEOEnabled } = await loadFlags();
      expect(isAISEOEnabled()).toBe(false);
    });

    it("should return false when AI SEO is enabled but API key is missing", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "1";
      delete process.env.ABACUSAI_API_KEY;
      const { isAISEOEnabled } = await loadFlags();
      expect(isAISEOEnabled()).toBe(false);
    });
  });

  describe("isAnalyticsEnabled", () => {
    it("should return true when analytics is enabled with GA ID", async () => {
      process.env.FEATURE_ANALYTICS_DASHBOARD = "1";
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = "G-TEST123";
      const { isAnalyticsEnabled } = await loadFlags();
      expect(isAnalyticsEnabled()).toBe(true);
    });

    it("should return false when analytics is disabled", async () => {
      process.env.FEATURE_ANALYTICS_DASHBOARD = "0";
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = "G-TEST123";
      const { isAnalyticsEnabled } = await loadFlags();
      expect(isAnalyticsEnabled()).toBe(false);
    });

    it("should return false when analytics is enabled but GA ID is missing", async () => {
      process.env.FEATURE_ANALYTICS_DASHBOARD = "1";
      delete process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
      const { isAnalyticsEnabled } = await loadFlags();
      expect(isAnalyticsEnabled()).toBe(false);
    });
  });

  describe("getFeatureFlagStatus", () => {
    it("should return correct status for enabled feature without dependencies", async () => {
      process.env.FEATURE_SEO = "1";
      const { getFeatureFlagStatus } = await loadFlags();
      const status = getFeatureFlagStatus("FEATURE_SEO");

      expect(status.enabled).toBe(true);
      expect(status.hasDependencies).toBe(false);
      expect(status.missingDependencies).toEqual([]);
    });

    it("should return correct status for enabled feature with met dependencies", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "1";
      process.env.ABACUSAI_API_KEY = "test-key";
      const { getFeatureFlagStatus } = await loadFlags();
      const status = getFeatureFlagStatus("FEATURE_AI_SEO_AUDIT");

      expect(status.enabled).toBe(true);
      expect(status.hasDependencies).toBe(true);
      expect(status.missingDependencies).toEqual([]);
    });

    it("should return correct status for enabled feature with missing dependencies", async () => {
      process.env.FEATURE_AI_SEO_AUDIT = "1";
      delete process.env.ABACUSAI_API_KEY;
      const { getFeatureFlagStatus } = await loadFlags();
      const status = getFeatureFlagStatus("FEATURE_AI_SEO_AUDIT");

      expect(status.enabled).toBe(true);
      expect(status.hasDependencies).toBe(true);
      expect(status.missingDependencies).toEqual(["ABACUSAI_API_KEY"]);
    });

    it("should return correct status for disabled feature", async () => {
      process.env.FEATURE_SEO = "0";
      const { getFeatureFlagStatus } = await loadFlags();
      const status = getFeatureFlagStatus("FEATURE_SEO");

      expect(status.enabled).toBe(false);
      expect(status.hasDependencies).toBe(false);
      expect(status.missingDependencies).toEqual([]);
    });

    it("should return correct status for non-existent feature", async () => {
      const { getFeatureFlagStatus } = await loadFlags();
      const status = getFeatureFlagStatus("NON_EXISTENT_FLAG");

      expect(status.enabled).toBe(false);
      expect(status.hasDependencies).toBe(false);
      expect(status.missingDependencies).toEqual([]);
    });
  });

  describe("getSEOFeatureFlags", () => {
    it("should return only SEO-related feature flags", async () => {
      process.env.FEATURE_SEO = "1";
      process.env.FEATURE_AI_SEO_AUDIT = "1";
      process.env.FEATURE_ANALYTICS_DASHBOARD = "1";
      process.env.FEATURE_MEDIA = "1"; // Non-SEO flag
      const { getSEOFeatureFlags } = await loadFlags();

      const seoFlags = getSEOFeatureFlags();

      expect(seoFlags).toHaveProperty("FEATURE_SEO");
      expect(seoFlags).toHaveProperty("FEATURE_AI_SEO_AUDIT");
      expect(seoFlags).toHaveProperty("FEATURE_ANALYTICS_DASHBOARD");
      expect(seoFlags).toHaveProperty("FEATURE_MULTILINGUAL_SEO");
      expect(seoFlags).toHaveProperty("FEATURE_SCHEMA_GENERATION");
      expect(seoFlags).toHaveProperty("FEATURE_SITEMAP_AUTO_UPDATE");
      expect(seoFlags).not.toHaveProperty("FEATURE_MEDIA");
    });

    it("should return SEO flag definitions even when no flags are set", async () => {
      delete process.env.FEATURE_SEO;
      delete process.env.FEATURE_AI_SEO_AUDIT;
      delete process.env.FEATURE_ANALYTICS_DASHBOARD;
      const { getSEOFeatureFlags } = await loadFlags();

      const seoFlags = getSEOFeatureFlags();

      // Should still have the flag definitions, but they'll be disabled
      expect(Object.keys(seoFlags).length).toBeGreaterThan(0);
      expect(seoFlags.FEATURE_SEO?.enabled).toBe(false);
    });
  });
});
