/**
 * SEO Meta Service Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { seoMetaService, SEOMetaData } from "@/lib/seo/seo-meta-service";
import { prisma } from "@/lib/db";

describe("SEO Meta Service", () => {
  const testPageId = "test-page-123";
  const testData: SEOMetaData = {
    pageId: testPageId,
    title: "Test Page Title",
    description: "This is a test page description for SEO testing",
    canonical: "https://example.com/test-page",
    metaKeywords: "test, seo, page",
    ogTitle: "Test OG Title",
    ogDescription: "Test OG Description",
    ogImage: "https://example.com/test-image.jpg",
    ogType: "article",
    twitterTitle: "Test Twitter Title",
    twitterDescription: "Test Twitter Description",
    twitterImage: "https://example.com/twitter-image.jpg",
    twitterCard: "summary_large_image",
    robotsMeta: "index,follow",
    schemaType: "Article",
    structuredData: { "@type": "Article", headline: "Test Article" },
    hreflangAlternates: {
      en: "https://example.com/test-page",
      ar: "https://example.com/ar/test-page",
    },
    seoScore: 85,
  };

  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await seoMetaService.deleteSEOMeta(testPageId);
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await seoMetaService.deleteSEOMeta(testPageId);
    } catch (error) {
      // Ignore if doesn't exist
    }
  });

  describe("saveSEOMeta", () => {
    it("should save SEO metadata successfully", async () => {
      const result = await seoMetaService.saveSEOMeta(testPageId, testData);

      expect(result).toBeDefined();
      expect(result.pageId).toBe(testPageId);
      expect(result.title).toBe(testData.title);
      expect(result.description).toBe(testData.description);
      expect(result.seoScore).toBe(testData.seoScore);
    });

    it("should update existing SEO metadata", async () => {
      // Save initial data
      await seoMetaService.saveSEOMeta(testPageId, testData);

      // Update with new data
      const updatedData = { ...testData, title: "Updated Title", seoScore: 90 };
      const result = await seoMetaService.saveSEOMeta(testPageId, updatedData);

      expect(result.title).toBe("Updated Title");
      expect(result.seoScore).toBe(90);
    });

    it("should handle structured data correctly", async () => {
      const dataWithStructuredData = {
        ...testData,
        structuredData: {
          "@type": "Article",
          headline: "Test Article",
          author: "Test Author",
        },
      };

      const result = await seoMetaService.saveSEOMeta(
        testPageId,
        dataWithStructuredData,
      );

      expect(result.structuredData).toEqual(
        dataWithStructuredData.structuredData,
      );
    });

    it("should handle hreflang alternates correctly", async () => {
      const dataWithHreflang = {
        ...testData,
        hreflangAlternates: {
          en: "https://example.com/test-page",
          ar: "https://example.com/ar/test-page",
          fr: "https://example.com/fr/test-page",
        },
      };

      const result = await seoMetaService.saveSEOMeta(
        testPageId,
        dataWithHreflang,
      );

      expect(result.hreflangAlternates).toEqual(
        dataWithHreflang.hreflangAlternates,
      );
    });
  });

  describe("getSEOMeta", () => {
    it("should retrieve SEO metadata by page ID", async () => {
      // Save test data
      await seoMetaService.saveSEOMeta(testPageId, testData);

      // Retrieve data
      const result = await seoMetaService.getSEOMeta(testPageId);

      expect(result).toBeDefined();
      expect(result?.pageId).toBe(testPageId);
      expect(result?.title).toBe(testData.title);
      expect(result?.description).toBe(testData.description);
    });

    it("should return null for non-existent page ID", async () => {
      const result = await seoMetaService.getSEOMeta("non-existent-page");

      expect(result).toBeNull();
    });
  });

  describe("getSEOMetaByURL", () => {
    it("should retrieve SEO metadata by URL", async () => {
      // Save test data
      await seoMetaService.saveSEOMeta(testPageId, testData);

      // Retrieve data by URL
      const result = await seoMetaService.getSEOMetaByURL(testData.canonical!);

      expect(result).toBeDefined();
      expect(result?.pageId).toBe(testPageId);
      expect(result?.canonical).toBe(testData.canonical);
    });

    it("should return null for non-existent URL", async () => {
      const result = await seoMetaService.getSEOMetaByURL(
        "https://example.com/non-existent",
      );

      expect(result).toBeNull();
    });
  });

  describe("deleteSEOMeta", () => {
    it("should delete SEO metadata successfully", async () => {
      // Save test data
      await seoMetaService.saveSEOMeta(testPageId, testData);

      // Verify it exists
      const beforeDelete = await seoMetaService.getSEOMeta(testPageId);
      expect(beforeDelete).toBeDefined();

      // Delete data
      await seoMetaService.deleteSEOMeta(testPageId);

      // Verify it's deleted
      const afterDelete = await seoMetaService.getSEOMeta(testPageId);
      expect(afterDelete).toBeNull();
    });

    it("should handle deletion of non-existent data gracefully", async () => {
      // Should not throw error
      await expect(
        seoMetaService.deleteSEOMeta("non-existent-page"),
      ).resolves.not.toThrow();
    });
  });

  describe("calculateSEOScore", () => {
    it("should calculate SEO score correctly", () => {
      const score = seoMetaService.calculateSEOScore(testData);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should give higher score for complete data", () => {
      const completeData: SEOMetaData = {
        ...testData,
        ogTitle: "Complete OG Title",
        ogDescription: "Complete OG Description",
        ogImage: "https://example.com/og-image.jpg",
        twitterTitle: "Complete Twitter Title",
        twitterDescription: "Complete Twitter Description",
        twitterImage: "https://example.com/twitter-image.jpg",
        structuredData: { "@type": "Article" },
        hreflangAlternates: {
          en: "https://example.com/en",
          ar: "https://example.com/ar",
        },
      };

      const completeScore = seoMetaService.calculateSEOScore(completeData);
      const basicScore = seoMetaService.calculateSEOScore(testData);

      expect(completeScore).toBeGreaterThan(basicScore);
    });

    it("should handle missing data gracefully", () => {
      const minimalData: SEOMetaData = {
        title: "Minimal Title",
        description: "Minimal description",
      };

      const score = seoMetaService.calculateSEOScore(minimalData);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
