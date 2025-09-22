/**
 * SEO Meta Data Service
 * Handles SEO metadata persistence and retrieval
 */

import { prisma } from '@/lib/db';
import { SeoMeta } from '@prisma/client';

export interface SEOMetaData {
  pageId?: string;
  url?: string;
  title: string;
  description: string;
  canonical?: string;
  metaKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: string;
  robotsMeta?: string;
  schemaType?: string;
  hreflangAlternates?: { [key: string]: string };
  structuredData?: any;
  seoScore?: number;
}

export interface SEOAnalytics {
  pageId: string;
  date: Date;
  organicTraffic: number;
  keywordRankings: Record<string, number>;
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    tti: number;
  };
  seoScore: number;
  issues: string[];
}

export class SEOMetaService {
  /**
   * Save SEO metadata to database
   */
  async saveSEOMeta(pageId: string, seoData: SEOMetaData): Promise<SeoMeta> {
    try {
      return await prisma.seoMeta.upsert({
        where: { pageId },
        update: {
          url: seoData.url,
          title: seoData.title,
          description: seoData.description,
          canonical: seoData.canonical,
          metaKeywords: seoData.metaKeywords,
          ogTitle: seoData.ogTitle,
          ogDescription: seoData.ogDescription,
          ogImage: seoData.ogImage,
          ogType: seoData.ogType,
          twitterTitle: seoData.twitterTitle,
          twitterDescription: seoData.twitterDescription,
          twitterImage: seoData.twitterImage,
          twitterCard: seoData.twitterCard,
          robotsMeta: seoData.robotsMeta,
          schemaType: seoData.schemaType,
          hreflangAlternates: seoData.hreflangAlternates,
          structuredData: seoData.structuredData,
          seoScore: seoData.seoScore,
          updatedAt: new Date()
        },
        create: {
          pageId,
          url: seoData.url,
          title: seoData.title,
          description: seoData.description,
          canonical: seoData.canonical,
          metaKeywords: seoData.metaKeywords,
          ogTitle: seoData.ogTitle,
          ogDescription: seoData.ogDescription,
          ogImage: seoData.ogImage,
          ogType: seoData.ogType,
          twitterTitle: seoData.twitterTitle,
          twitterDescription: seoData.twitterDescription,
          twitterImage: seoData.twitterImage,
          twitterCard: seoData.twitterCard,
          robotsMeta: seoData.robotsMeta,
          schemaType: seoData.schemaType,
          hreflangAlternates: seoData.hreflangAlternates,
          structuredData: seoData.structuredData,
          seoScore: seoData.seoScore,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error saving SEO metadata:', error);
      throw error;
    }
  }

  /**
   * Get SEO metadata by page ID
   */
  async getSEOMeta(pageId: string): Promise<SEOMetaData | null> {
    try {
      const seoMeta = await prisma.seoMeta.findUnique({
        where: { pageId }
      });

      if (!seoMeta) return null;

      return {
        pageId: seoMeta.pageId,
        url: seoMeta.url,
        title: seoMeta.title,
        description: seoMeta.description,
        canonical: seoMeta.canonical,
        metaKeywords: seoMeta.metaKeywords,
        ogTitle: seoMeta.ogTitle,
        ogDescription: seoMeta.ogDescription,
        ogImage: seoMeta.ogImage,
        ogType: seoMeta.ogType,
        twitterTitle: seoMeta.twitterTitle,
        twitterDescription: seoMeta.twitterDescription,
        twitterImage: seoMeta.twitterImage,
        twitterCard: seoMeta.twitterCard,
        robotsMeta: seoMeta.robotsMeta,
        schemaType: seoMeta.schemaType,
        hreflangAlternates: seoMeta.hreflangAlternates as Record<string, string>,
        structuredData: seoMeta.structuredData,
        seoScore: seoMeta.seoScore
      };
    } catch (error) {
      console.error('Failed to get SEO meta data:', error);
      return null;
    }
  }

  /**
   * Get SEO metadata by URL
   */
  async getSEOMetaByURL(url: string): Promise<SEOMetaData | null> {
    try {
      const seoMeta = await prisma.seoMeta.findFirst({
        where: { url }
      });

      if (!seoMeta) return null;

      return {
        pageId: seoMeta.pageId,
        url: seoMeta.url,
        title: seoMeta.title,
        description: seoMeta.description,
        canonical: seoMeta.canonical,
        metaKeywords: seoMeta.metaKeywords,
        ogTitle: seoMeta.ogTitle,
        ogDescription: seoMeta.ogDescription,
        ogImage: seoMeta.ogImage,
        ogType: seoMeta.ogType,
        twitterTitle: seoMeta.twitterTitle,
        twitterDescription: seoMeta.twitterDescription,
        twitterImage: seoMeta.twitterImage,
        twitterCard: seoMeta.twitterCard,
        robotsMeta: seoMeta.robotsMeta,
        schemaType: seoMeta.schemaType,
        hreflangAlternates: seoMeta.hreflangAlternates as Record<string, string>,
        structuredData: seoMeta.structuredData,
        seoScore: seoMeta.seoScore
      };
    } catch (error) {
      console.error('Failed to get SEO meta data by URL:', error);
      return null;
    }
  }

  /**
   * Update SEO score
   */
  async updateSEOScore(pageId: string, score: number): Promise<void> {
    try {
      await prisma.seoMeta.update({
        where: { pageId },
        data: {
          seoScore: score,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update SEO score:', error);
      throw new Error('Failed to update SEO score');
    }
  }

  /**
   * Save SEO analytics data
   */
  async saveSEOAnalytics(analytics: SEOAnalytics): Promise<void> {
    try {
      await prisma.seoAnalytics.create({
        data: {
          pageId: analytics.pageId,
          date: analytics.date,
          organicTraffic: analytics.organicTraffic,
          keywordRankings: analytics.keywordRankings,
          coreWebVitals: analytics.coreWebVitals,
          seoScore: analytics.seoScore,
          issues: analytics.issues,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to save SEO analytics:', error);
      throw new Error('Failed to save SEO analytics');
    }
  }

  /**
   * Get SEO analytics for a page
   */
  async getSEOAnalytics(pageId: string, days: number = 30): Promise<SEOAnalytics[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await prisma.seoAnalytics.findMany({
        where: {
          pageId,
          date: {
            gte: startDate
          }
        },
        orderBy: {
          date: 'desc'
        }
      });

      return analytics.map(record => ({
        pageId: record.pageId,
        date: record.date,
        organicTraffic: record.organicTraffic,
        keywordRankings: record.keywordRankings as Record<string, number>,
        coreWebVitals: record.coreWebVitals as any,
        seoScore: record.seoScore,
        issues: record.issues as string[]
      }));
    } catch (error) {
      console.error('Failed to get SEO analytics:', error);
      return [];
    }
  }

  /**
   * Get all pages with SEO data
   */
  async getAllSEOPages(): Promise<SEOMetaData[]> {
    try {
      const seoPages = await prisma.seoMeta.findMany({
        orderBy: {
          updatedAt: 'desc'
        }
      });

      return seoPages.map(page => ({
        pageId: page.pageId,
        url: page.url,
        title: page.title,
        description: page.description,
        canonical: page.canonical,
        metaKeywords: page.metaKeywords,
        ogTitle: page.ogTitle,
        ogDescription: page.ogDescription,
        ogImage: page.ogImage,
        ogType: page.ogType,
        twitterTitle: page.twitterTitle,
        twitterDescription: page.twitterDescription,
        twitterImage: page.twitterImage,
        twitterCard: page.twitterCard,
        robotsMeta: page.robotsMeta,
        schemaType: page.schemaType,
        hreflangAlternates: page.hreflangAlternates as Record<string, string>,
        structuredData: page.structuredData,
        seoScore: page.seoScore
      }));
    } catch (error) {
      console.error('Failed to get all SEO pages:', error);
      return [];
    }
  }

  /**
   * Delete SEO metadata
   */
  async deleteSEOMeta(pageId: string): Promise<void> {
    try {
      await prisma.seoMeta.delete({
        where: { pageId }
      });
    } catch (error) {
      console.error('Failed to delete SEO meta data:', error);
      throw new Error('Failed to delete SEO metadata');
    }
  }

  /**
   * Calculate SEO score
   */
  calculateSEOScore(seoData: SEOMetaData): number {
    let score = 0;
    const maxScore = 100;

    // Title (20 points)
    if (seoData.title) {
      score += 10;
      if (seoData.title.length >= 30 && seoData.title.length <= 60) {
        score += 10;
      }
    }

    // Description (20 points)
    if (seoData.description) {
      score += 10;
      if (seoData.description.length >= 120 && seoData.description.length <= 160) {
        score += 10;
      }
    }

    // Canonical URL (10 points)
    if (seoData.canonical) {
      score += 10;
    }

    // Open Graph (15 points)
    if (seoData.ogTitle) score += 5;
    if (seoData.ogDescription) score += 5;
    if (seoData.ogImage) score += 5;

    // Twitter Cards (10 points)
    if (seoData.twitterTitle) score += 3;
    if (seoData.twitterDescription) score += 3;
    if (seoData.twitterImage) score += 4;

    // Schema Markup (15 points)
    if (seoData.structuredData) {
      score += 15;
    }

    // Hreflang (10 points)
    if (seoData.hreflangAlternates && Object.keys(seoData.hreflangAlternates).length > 0) {
      score += 10;
    }

    return Math.min(score, maxScore);
  }
}

export const seoMetaService = new SEOMetaService();
