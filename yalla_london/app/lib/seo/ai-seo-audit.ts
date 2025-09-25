/**
 * AI SEO Audit Scoring System
 * Inline SEO scores and optimization recommendations for content
 */

import { prisma } from '@/lib/db';
import { seoMetaService } from './seo-meta-service';

export interface SEOAuditResult {
  pageId: string;
  url: string;
  title: string;
  overallScore: number;
  categoryScores: {
    title: number;
    metaDescription: number;
    content: number;
    structure: number;
    images: number;
    links: number;
    schema: number;
    performance: number;
  };
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  quickFixes: QuickFix[];
  lastAudited: Date;
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  fixable: boolean;
  autoFixable: boolean;
}

export interface SEORecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  expectedImprovement: number;
}

export interface QuickFix {
  id: string;
  title: string;
  description: string;
  action: string;
  impact: number;
  autoFixable: boolean;
}

export interface ContentAuditData {
  pageId: string;
  url: string;
  title: string;
  metaDescription: string;
  content: string;
  images: Array<{
    src: string;
    alt: string;
    title?: string;
  }>;
  links: Array<{
    href: string;
    text: string;
    title?: string;
  }>;
  headings: Array<{
    level: number;
    text: string;
  }>;
  wordCount: number;
  readingTime: number;
  schemaData?: any;
}

export class AISEOAudit {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Perform comprehensive SEO audit
   */
  async performSEOAudit(auditData: ContentAuditData): Promise<SEOAuditResult> {
    try {
      const issues: SEOIssue[] = [];
      const recommendations: SEORecommendation[] = [];
      const quickFixes: QuickFix[] = [];

      // Audit title
      const titleScore = this.auditTitle(auditData.title, issues, recommendations, quickFixes);
      
      // Audit meta description
      const metaScore = this.auditMetaDescription(auditData.metaDescription, issues, recommendations, quickFixes);
      
      // Audit content
      const contentScore = this.auditContent(auditData.content, auditData.wordCount, issues, recommendations, quickFixes);
      
      // Audit structure
      const structureScore = this.auditStructure(auditData.headings, issues, recommendations, quickFixes);
      
      // Audit images
      const imagesScore = this.auditImages(auditData.images, issues, recommendations, quickFixes);
      
      // Audit links
      const linksScore = this.auditLinks(auditData.links, issues, recommendations, quickFixes);
      
      // Audit schema
      const schemaScore = this.auditSchema(auditData.schemaData, issues, recommendations, quickFixes);
      
      // Audit performance (simplified)
      const performanceScore = this.auditPerformance(auditData, issues, recommendations, quickFixes);

      // Calculate overall score
      const overallScore = Math.round(
        (titleScore + metaScore + contentScore + structureScore + 
         imagesScore + linksScore + schemaScore + performanceScore) / 8
      );

      const auditResult: SEOAuditResult = {
        pageId: auditData.pageId,
        url: auditData.url,
        title: auditData.title,
        overallScore,
        categoryScores: {
          title: titleScore,
          metaDescription: metaScore,
          content: contentScore,
          structure: structureScore,
          images: imagesScore,
          links: linksScore,
          schema: schemaScore,
          performance: performanceScore
        },
        issues,
        recommendations,
        quickFixes,
        lastAudited: new Date()
      };

      // Save audit result
      await this.saveAuditResult(auditResult);

      return auditResult;

    } catch (error) {
      console.error('Failed to perform SEO audit:', error);
      throw new Error('SEO audit failed');
    }
  }

  /**
   * Audit title
   */
  private auditTitle(
    title: string,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 0;

    // Check if title exists
    if (!title || title.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'title',
        message: 'Page title is missing',
        impact: 'high',
        fixable: true,
        autoFixable: false
      });
      return 0;
    }

    score += 20; // Base score for having a title

    // Check title length
    if (title.length < 30) {
      issues.push({
        type: 'warning',
        category: 'title',
        message: 'Title is too short (less than 30 characters)',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
      recommendations.push({
        category: 'title',
        priority: 'medium',
        title: 'Optimize title length',
        description: 'Increase title length to 30-60 characters for better SEO',
        action: 'Add descriptive words to make title more compelling',
        expectedImprovement: 15
      });
    } else if (title.length > 60) {
      issues.push({
        type: 'warning',
        category: 'title',
        message: 'Title is too long (more than 60 characters)',
        impact: 'medium',
        fixable: true,
        autoFixable: true
      });
      quickFixes.push({
        id: 'truncate-title',
        title: 'Truncate title',
        description: 'Shorten title to 60 characters or less',
        action: 'Remove unnecessary words',
        impact: 10,
        autoFixable: true
      });
    } else {
      score += 20; // Perfect length
    }

    // Check for keyword in title
    if (this.hasPrimaryKeyword(title)) {
      score += 20;
    } else {
      issues.push({
        type: 'warning',
        category: 'title',
        message: 'Primary keyword not found in title',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    }

    // Check for emotional words
    if (this.hasEmotionalWords(title)) {
      score += 10;
    }

    // Check for numbers
    if (/\d/.test(title)) {
      score += 10;
    }

    // Check for brand name
    if (title.toLowerCase().includes('yalla london')) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Audit meta description
   */
  private auditMetaDescription(
    metaDescription: string,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 0;

    // Check if meta description exists
    if (!metaDescription || metaDescription.trim().length === 0) {
      issues.push({
        type: 'error',
        category: 'meta',
        message: 'Meta description is missing',
        impact: 'high',
        fixable: true,
        autoFixable: false
      });
      return 0;
    }

    score += 20; // Base score for having meta description

    // Check length
    if (metaDescription.length < 120) {
      issues.push({
        type: 'warning',
        category: 'meta',
        message: 'Meta description is too short (less than 120 characters)',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    } else if (metaDescription.length > 160) {
      issues.push({
        type: 'warning',
        category: 'meta',
        message: 'Meta description is too long (more than 160 characters)',
        impact: 'medium',
        fixable: true,
        autoFixable: true
      });
      quickFixes.push({
        id: 'truncate-meta',
        title: 'Truncate meta description',
        description: 'Shorten meta description to 160 characters or less',
        action: 'Remove unnecessary words',
        impact: 10,
        autoFixable: true
      });
    } else {
      score += 20; // Perfect length
    }

    // Check for call to action
    if (this.hasCallToAction(metaDescription)) {
      score += 20;
    }

    // Check for keyword
    if (this.hasPrimaryKeyword(metaDescription)) {
      score += 20;
    }

    // Check for emotional words
    if (this.hasEmotionalWords(metaDescription)) {
      score += 10;
    }

    // Check for uniqueness
    if (this.isUniqueDescription(metaDescription)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Audit content
   */
  private auditContent(
    content: string,
    wordCount: number,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 0;

    // Check word count
    if (wordCount < 300) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: 'Content is too short (less than 300 words)',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
      recommendations.push({
        category: 'content',
        priority: 'medium',
        title: 'Increase content length',
        description: 'Add more valuable content to reach at least 300 words',
        action: 'Expand on key points and add examples',
        expectedImprovement: 20
      });
    } else if (wordCount >= 1000) {
      score += 30; // Good length
    } else {
      score += 20; // Acceptable length
    }

    // Check for keyword density
    const keywordDensity = this.calculateKeywordDensity(content);
    if (keywordDensity < 0.5) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: 'Primary keyword density is too low',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    } else if (keywordDensity > 3) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: 'Primary keyword density is too high (keyword stuffing)',
        impact: 'high',
        fixable: true,
        autoFixable: false
      });
    } else {
      score += 20; // Good keyword density
    }

    // Check for readability
    const readabilityScore = this.calculateReadability(content);
    if (readabilityScore < 60) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: 'Content readability is poor',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    } else {
      score += 20; // Good readability
    }

    // Check for internal links
    const internalLinks = this.countInternalLinks(content);
    if (internalLinks < 2) {
      issues.push({
        type: 'info',
        category: 'content',
        message: 'Add more internal links to improve site structure',
        impact: 'low',
        fixable: true,
        autoFixable: false
      });
    } else {
      score += 15; // Good internal linking
    }

    // Check for external links
    const externalLinks = this.countExternalLinks(content);
    if (externalLinks > 0) {
      score += 10; // Bonus for external links
    }

    // Check for images
    const imageCount = this.countImages(content);
    if (imageCount === 0) {
      issues.push({
        type: 'warning',
        category: 'content',
        message: 'No images found in content',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    } else {
      score += 15; // Bonus for images
    }

    return Math.min(score, 100);
  }

  /**
   * Audit structure
   */
  private auditStructure(
    headings: Array<{ level: number; text: string }>,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 0;

    if (headings.length === 0) {
      issues.push({
        type: 'error',
        category: 'structure',
        message: 'No headings found in content',
        impact: 'high',
        fixable: true,
        autoFixable: false
      });
      return 0;
    }

    score += 20; // Base score for having headings

    // Check for H1
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      issues.push({
        type: 'error',
        category: 'structure',
        message: 'No H1 heading found',
        impact: 'high',
        fixable: true,
        autoFixable: false
      });
    } else if (h1Count === 1) {
      score += 30; // Perfect H1 count
    } else {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Multiple H1 headings found',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    }

    // Check heading hierarchy
    if (this.hasProperHeadingHierarchy(headings)) {
      score += 25;
    } else {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Improper heading hierarchy',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    }

    // Check for keyword in headings
    const headingsWithKeyword = headings.filter(h => this.hasPrimaryKeyword(h.text));
    if (headingsWithKeyword.length > 0) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  /**
   * Audit images
   */
  private auditImages(
    images: Array<{ src: string; alt: string; title?: string }>,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 0;

    if (images.length === 0) {
      return 0;
    }

    score += 20; // Base score for having images

    // Check alt text
    const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim().length === 0);
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'warning',
        category: 'images',
        message: `${imagesWithoutAlt.length} images missing alt text`,
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    } else {
      score += 30; // All images have alt text
    }

    // Check for keyword in alt text
    const imagesWithKeyword = images.filter(img => this.hasPrimaryKeyword(img.alt));
    if (imagesWithKeyword.length > 0) {
      score += 25;
    }

    // Check for descriptive alt text
    const descriptiveAltText = images.filter(img => img.alt && img.alt.length > 10);
    if (descriptiveAltText.length === images.length) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  /**
   * Audit links
   */
  private auditLinks(
    links: Array<{ href: string; text: string; title?: string }>,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 0;

    if (links.length === 0) {
      issues.push({
        type: 'info',
        category: 'links',
        message: 'No links found in content',
        impact: 'low',
        fixable: true,
        autoFixable: false
      });
      return 0;
    }

    score += 20; // Base score for having links

    // Check for internal links
    const internalLinks = links.filter(link => this.isInternalLink(link.href));
    if (internalLinks.length >= 2) {
      score += 30;
    } else {
      issues.push({
        type: 'warning',
        category: 'links',
        message: 'Add more internal links',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
    }

    // Check for external links
    const externalLinks = links.filter(link => this.isExternalLink(link.href));
    if (externalLinks.length > 0) {
      score += 20;
    }

    // Check for descriptive link text
    const descriptiveLinks = links.filter(link => 
      link.text && link.text.length > 3 && !this.isGenericLinkText(link.text)
    );
    if (descriptiveLinks.length === links.length) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  /**
   * Audit schema
   */
  private auditSchema(
    schemaData: any,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 0;

    if (!schemaData) {
      issues.push({
        type: 'warning',
        category: 'schema',
        message: 'No structured data found',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
      return 0;
    }

    score += 30; // Base score for having schema

    // Check for multiple schema types
    if (Array.isArray(schemaData)) {
      score += 20; // Multiple schemas
    }

    // Check for specific schema types
    const schemaTypes = this.getSchemaTypes(schemaData);
    if (schemaTypes.includes('Article')) score += 15;
    if (schemaTypes.includes('FAQPage')) score += 15;
    if (schemaTypes.includes('HowTo')) score += 15;
    if (schemaTypes.includes('Review')) score += 15;

    return Math.min(score, 100);
  }

  /**
   * Audit performance (simplified)
   */
  private auditPerformance(
    auditData: ContentAuditData,
    issues: SEOIssue[],
    recommendations: SEORecommendation[],
    quickFixes: QuickFix[]
  ): number {
    let score = 80; // Base score

    // Check image count vs content length
    const imageCount = auditData.images.length;
    const wordCount = auditData.wordCount;
    
    if (imageCount === 0 && wordCount > 500) {
      issues.push({
        type: 'info',
        category: 'performance',
        message: 'Consider adding images to break up long content',
        impact: 'low',
        fixable: true,
        autoFixable: false
      });
    }

    // Check for large images (simplified)
    const largeImages = auditData.images.filter(img => 
      img.src.includes('large') || img.src.includes('high-res')
    );
    if (largeImages.length > 0) {
      issues.push({
        type: 'warning',
        category: 'performance',
        message: 'Consider optimizing large images',
        impact: 'medium',
        fixable: true,
        autoFixable: false
      });
      score -= 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Save audit result to database
   */
  private async saveAuditResult(auditResult: SEOAuditResult): Promise<void> {
    try {
      await prisma.seoAuditResult.upsert({
        where: { pageId: auditResult.pageId },
        update: {
          overallScore: auditResult.overallScore,
          categoryScores: auditResult.categoryScores,
          issues: auditResult.issues,
          recommendations: auditResult.recommendations,
          quickFixes: auditResult.quickFixes,
          lastAudited: auditResult.lastAudited,
          updatedAt: new Date()
        },
        create: {
          pageId: auditResult.pageId,
          url: auditResult.url,
          title: auditResult.title,
          overallScore: auditResult.overallScore,
          categoryScores: auditResult.categoryScores,
          issues: auditResult.issues,
          recommendations: auditResult.recommendations,
          quickFixes: auditResult.quickFixes,
          lastAudited: auditResult.lastAudited,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to save audit result:', error);
    }
  }

  /**
   * Get audit result for a page
   */
  async getAuditResult(pageId: string): Promise<SEOAuditResult | null> {
    try {
      const auditResult = await prisma.seoAuditResult.findUnique({
        where: { pageId }
      });

      if (!auditResult) return null;

      return {
        pageId: auditResult.pageId,
        url: auditResult.url,
        title: auditResult.title,
        overallScore: auditResult.overallScore,
        categoryScores: auditResult.categoryScores as any,
        issues: auditResult.issues as SEOIssue[],
        recommendations: auditResult.recommendations as SEORecommendation[],
        quickFixes: auditResult.quickFixes as QuickFix[],
        lastAudited: auditResult.lastAudited
      };
    } catch (error) {
      console.error('Failed to get audit result:', error);
      return null;
    }
  }

  // Helper methods
  private hasPrimaryKeyword(text: string): boolean {
    // Simplified keyword detection
    const keywords = ['london', 'luxury', 'travel', 'hotel', 'restaurant', 'experience'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private hasEmotionalWords(text: string): boolean {
    const emotionalWords = ['best', 'amazing', 'incredible', 'stunning', 'luxury', 'exclusive'];
    return emotionalWords.some(word => text.toLowerCase().includes(word));
  }

  private hasCallToAction(text: string): boolean {
    const ctaWords = ['discover', 'explore', 'book', 'visit', 'learn', 'find'];
    return ctaWords.some(word => text.toLowerCase().includes(word));
  }

  private isUniqueDescription(description: string): boolean {
    // Simplified uniqueness check
    return description.length > 50;
  }

  private calculateKeywordDensity(content: string): number {
    const words = content.toLowerCase().split(/\W+/);
    const totalWords = words.length;
    const keywordCount = words.filter(word => this.hasPrimaryKeyword(word)).length;
    return (keywordCount / totalWords) * 100;
  }

  private calculateReadability(content: string): number {
    // Simplified readability score
    const sentences = content.split(/[.!?]+/).length;
    const words = content.split(/\s+/).length;
    const avgWordsPerSentence = words / sentences;
    
    if (avgWordsPerSentence <= 15) return 80;
    if (avgWordsPerSentence <= 20) return 60;
    return 40;
  }

  private countInternalLinks(content: string): number {
    const internalLinkPattern = /href=["'](?!https?:\/\/)(?!mailto:)(?!tel:)[^"']+["']/gi;
    return (content.match(internalLinkPattern) || []).length;
  }

  private countExternalLinks(content: string): number {
    const externalLinkPattern = /href=["']https?:\/\/[^"']+["']/gi;
    return (content.match(externalLinkPattern) || []).length;
  }

  private countImages(content: string): number {
    const imagePattern = /<img[^>]+>/gi;
    return (content.match(imagePattern) || []).length;
  }

  private hasProperHeadingHierarchy(headings: Array<{ level: number; text: string }>): boolean {
    let currentLevel = 0;
    for (const heading of headings) {
      if (heading.level > currentLevel + 1) {
        return false;
      }
      currentLevel = heading.level;
    }
    return true;
  }

  private isInternalLink(href: string): boolean {
    return !href.startsWith('http') || href.includes(this.baseUrl);
  }

  private isExternalLink(href: string): boolean {
    return href.startsWith('http') && !href.includes(this.baseUrl);
  }

  private isGenericLinkText(text: string): boolean {
    const genericTexts = ['click here', 'read more', 'learn more', 'here', 'link'];
    return genericTexts.includes(text.toLowerCase());
  }

  private getSchemaTypes(schemaData: any): string[] {
    if (Array.isArray(schemaData)) {
      return schemaData.map(schema => schema['@type']).filter(Boolean);
    }
    return schemaData['@type'] ? [schemaData['@type']] : [];
  }
}

export const aiSEOAudit = new AISEOAudit();







