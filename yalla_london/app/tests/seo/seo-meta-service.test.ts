/**
 * SEO Meta Service Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the database
vi.mock("@/lib/db", () => ({
  prisma: {
    seoMeta: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    seoAnalytics: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { seoMetaService, SEOMetaData } from "@/lib/seo/seo-meta-service";

import { prisma as mockPrismaImport } from "@/lib/db";
const getMockPrisma = () => mockPrismaImport as any;

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveSEOMeta", () => {
    it("should save SEO metadata successfully", async () => {
      const mockPrisma = getMockPrisma();
      const mockResult = {
        id: "seo-meta-1",
        pageId: testPageId,
        ...testData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.seoMeta.upsert.mockResolvedValue(mockResult);

      const result = await seoMetaService.saveSEOMeta(testPageId, testData);

      expect(result).toBeDefined();
      expect(result.pageId).toBe(testPageId);
      expect(mockPrisma.seoMeta.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pageId: testPageId },
        }),
      );
    });
  });

  describe("getSEOMeta", () => {
    it("should retrieve SEO metadata by page ID", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoMeta.findUnique.mockResolvedValue({
        pageId: testPageId,
        title: testData.title,
        description: testData.description,
        canonical: testData.canonical,
        metaKeywords: testData.metaKeywords,
        ogTitle: testData.ogTitle,
        ogDescription: testData.ogDescription,
        ogImage: testData.ogImage,
        ogType: testData.ogType,
        twitterTitle: testData.twitterTitle,
        twitterDescription: testData.twitterDescription,
        twitterImage: testData.twitterImage,
        twitterCard: testData.twitterCard,
        robotsMeta: testData.robotsMeta,
        schemaType: testData.schemaType,
        hreflangAlternates: testData.hreflangAlternates,
        structuredData: testData.structuredData,
        seoScore: testData.seoScore,
        url: null,
      });

      const result = await seoMetaService.getSEOMeta(testPageId);

      expect(result).toBeDefined();
      expect(result?.title).toBe(testData.title);
      expect(result?.description).toBe(testData.description);
      expect(result?.ogTitle).toBe(testData.ogTitle);
      expect(result?.twitterCard).toBe(testData.twitterCard);
    });

    it("should return null for non-existent page", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoMeta.findUnique.mockResolvedValue(null);

      const result = await seoMetaService.getSEOMeta("non-existent-page");
      expect(result).toBeNull();
    });
  });

  describe("getSEOMetaByURL", () => {
    it("should retrieve SEO metadata by URL", async () => {
      const mockPrisma = getMockPrisma();
      const testURL = "https://example.com/test-page";
      mockPrisma.seoMeta.findFirst.mockResolvedValue({
        pageId: testPageId,
        url: testURL,
        title: testData.title,
        description: testData.description,
        canonical: testData.canonical,
        metaKeywords: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        ogType: null,
        twitterTitle: null,
        twitterDescription: null,
        twitterImage: null,
        twitterCard: null,
        robotsMeta: null,
        schemaType: null,
        hreflangAlternates: null,
        structuredData: null,
        seoScore: 50,
      });

      const result = await seoMetaService.getSEOMetaByURL(testURL);

      expect(result).toBeDefined();
      expect(result?.pageId).toBe(testPageId);
      expect(result?.title).toBe(testData.title);
    });
  });

  describe("deleteSEOMeta", () => {
    it("should delete SEO metadata successfully", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoMeta.delete.mockResolvedValue({
        pageId: testPageId,
      });

      await expect(
        seoMetaService.deleteSEOMeta(testPageId),
      ).resolves.not.toThrow();
      expect(mockPrisma.seoMeta.delete).toHaveBeenCalledWith({
        where: { pageId: testPageId },
      });
    });

    it("should throw when deleting non-existent data", async () => {
      const mockPrisma = getMockPrisma();
      // Prisma throws when record not found; source catches and rethrows
      mockPrisma.seoMeta.delete.mockRejectedValue(
        new Error("Record not found"),
      );

      await expect(
        seoMetaService.deleteSEOMeta("non-existent-page"),
      ).rejects.toThrow("Failed to delete SEO metadata");
    });
  });

  describe("updateSEOScore", () => {
    it("should update SEO score for a page", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoMeta.update.mockResolvedValue({
        pageId: testPageId,
        seoScore: 95,
      });

      await seoMetaService.updateSEOScore(testPageId, 95);

      expect(mockPrisma.seoMeta.update).toHaveBeenCalledWith({
        where: { pageId: testPageId },
        data: expect.objectContaining({
          seoScore: 95,
        }),
      });
    });

    it("should throw on update failure", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoMeta.update.mockRejectedValue(new Error("Not found"));

      await expect(
        seoMetaService.updateSEOScore("non-existent", 90),
      ).rejects.toThrow("Failed to update SEO score");
    });
  });

  describe("calculateSEOScore", () => {
    it("should calculate a high SEO score for complete data", () => {
      const score = seoMetaService.calculateSEOScore(testData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should calculate a low score for minimal data", () => {
      const basicData: SEOMetaData = {
        title: "Basic Title",
        description: "Basic description",
      };

      const basicScore = seoMetaService.calculateSEOScore(basicData);
      const completeScore = seoMetaService.calculateSEOScore(testData);

      expect(basicScore).toBeGreaterThan(0);
      expect(completeScore).toBeGreaterThanOrEqual(basicScore);
    });

    it("should return 0 for empty data", () => {
      const emptyData: SEOMetaData = {
        title: "",
        description: "",
      };

      const score = seoMetaService.calculateSEOScore(emptyData);
      expect(score).toBe(0);
    });
  });

  describe("saveSEOAnalytics", () => {
    it("should save SEO analytics data", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoAnalytics.create.mockResolvedValue({});

      const analyticsData = {
        pageId: testPageId,
        date: new Date(),
        organicTraffic: 100,
        keywordRankings: { "test keyword": 5 },
        coreWebVitals: { lcp: 2.5, fid: 100, cls: 0.1, fcp: 1.8, tti: 3.5 },
        seoScore: 85,
        issues: [],
      };

      await seoMetaService.saveSEOAnalytics(analyticsData);

      expect(mockPrisma.seoAnalytics.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pageId: testPageId,
          organicTraffic: 100,
          seoScore: 85,
        }),
      });
    });
  });

  describe("getSEOAnalytics", () => {
    it("should retrieve SEO analytics for a page", async () => {
      const mockPrisma = getMockPrisma();
      const mockAnalytics = [
        {
          pageId: testPageId,
          date: new Date(),
          organicTraffic: 100,
          keywordRankings: {},
          coreWebVitals: { lcp: 2.5, fid: 100, cls: 0.1, fcp: 1.8, tti: 3.5 },
          seoScore: 85,
          issues: [],
        },
      ];
      mockPrisma.seoAnalytics.findMany.mockResolvedValue(mockAnalytics);

      const result = await seoMetaService.getSEOAnalytics(testPageId, 30);

      expect(result).toHaveLength(1);
      expect(result[0].pageId).toBe(testPageId);
      expect(result[0].organicTraffic).toBe(100);
    });

    it("should return empty array on error", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoAnalytics.findMany.mockRejectedValue(
        new Error("DB Error"),
      );

      const result = await seoMetaService.getSEOAnalytics(testPageId);
      expect(result).toEqual([]);
    });
  });

  describe("getAllSEOPages", () => {
    it("should return all pages with SEO data", async () => {
      const mockPrisma = getMockPrisma();
      mockPrisma.seoMeta.findMany.mockResolvedValue([
        {
          pageId: "page-1",
          url: null,
          title: "Page 1",
          description: "Desc 1",
          canonical: null,
          metaKeywords: null,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          ogType: null,
          twitterTitle: null,
          twitterDescription: null,
          twitterImage: null,
          twitterCard: null,
          robotsMeta: null,
          schemaType: null,
          hreflangAlternates: null,
          structuredData: null,
          seoScore: 50,
        },
        {
          pageId: "page-2",
          url: null,
          title: "Page 2",
          description: "Desc 2",
          canonical: null,
          metaKeywords: null,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          ogType: null,
          twitterTitle: null,
          twitterDescription: null,
          twitterImage: null,
          twitterCard: null,
          robotsMeta: null,
          schemaType: null,
          hreflangAlternates: null,
          structuredData: null,
          seoScore: 75,
        },
      ]);

      const result = await seoMetaService.getAllSEOPages();
      expect(result).toHaveLength(2);
      expect(result[0].pageId).toBe("page-1");
      expect(result[1].pageId).toBe("page-2");
    });
  });
});
