/**
 * Test suite for the SEO Audit Engine
 */

import { auditArticle, applyFixes, AuditFix } from '@/lib/audit-engine';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    article: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    seoAuditResult: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    seoData: {
      update: jest.fn(),
      create: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

// Mock feature flags
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn((flag: string) => {
    if (flag === 'FEATURE_AI_SEO_AUDIT') return true;
    return false;
  })
}));

describe('SEO Audit Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auditArticle', () => {
    it('should audit an article successfully', async () => {
      const mockArticle = {
        id: 'article-1',
        title: 'Test Article Title That Is Long Enough',
        slug: 'test-article-slug',
        content: '<h2>Introduction</h2><p>This is a test article with enough content to pass basic checks. It has multiple sentences and paragraphs.</p><h3>Main Content</h3><p>This section provides additional content to meet word count requirements.</p>',
        featuredImage: 'https://example.com/image.jpg',
        seoData: {
          id: 'seo-1',
          metaDescription: 'This is a comprehensive meta description that provides enough detail about the article content for SEO purposes.'
        }
      };

      (prisma.article.findUnique as jest.Mock).mockResolvedValue(mockArticle);
      (prisma.seoAuditResult.create as jest.Mock).mockResolvedValue({
        id: 'audit-1',
        articleId: 'article-1',
        score: 85,
        breakdown: {
          content_quality: 85,
          seo_optimization: 90,
          readability: 80,
          technical_seo: 85,
          user_experience: 90
        }
      });

      const result = await auditArticle('article-1');

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.quality_gate).toBeDefined();
      expect(prisma.article.update).toHaveBeenCalled();
    });

    it('should return quality gate "autopublish" for high scores', async () => {
      const mockArticle = {
        id: 'article-1',
        title: 'Excellent Article Title With Perfect Length And Keywords',
        slug: 'excellent-article-perfect-seo',
        content: '<h2>Introduction</h2><p>This is an excellent article with perfect content structure. It has multiple well-structured paragraphs with appropriate headings.</p><img src="test.jpg" alt="Perfect alt text" /><h3>Detailed Analysis</h3><p>This section provides comprehensive analysis with internal links and excellent readability.</p><p>Additional content to ensure sufficient word count and quality metrics.</p>',
        featuredImage: 'https://example.com/image.jpg',
        seoData: {
          id: 'seo-1',
          metaDescription: 'This is a comprehensive and perfectly optimized meta description that provides excellent detail about the article content for maximum SEO impact.'
        }
      };

      (prisma.article.findUnique as jest.Mock).mockResolvedValue(mockArticle);
      (prisma.seoAuditResult.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      const result = await auditArticle('article-1');

      expect(result.quality_gate.status).toBe('autopublish');
      expect(result.score).toBeGreaterThanOrEqual(85);
    });

    it('should return quality gate "review" for moderate scores', async () => {
      const mockArticle = {
        id: 'article-1',
        title: 'Short Title',
        slug: 'short',
        content: '<p>This is a short article with minimal content that needs some improvements.</p>',
        featuredImage: 'https://example.com/image.jpg',
        seoData: {
          id: 'seo-1',
          metaDescription: 'Short description.'
        }
      };

      (prisma.article.findUnique as jest.Mock).mockResolvedValue(mockArticle);
      (prisma.seoAuditResult.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      const result = await auditArticle('article-1');

      expect(result.quality_gate.status).toBe('review');
      expect(result.score).toBeLessThan(85);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should return quality gate "reject" for very low scores', async () => {
      const mockArticle = {
        id: 'article-1',
        title: 'Bad',
        slug: '',
        content: '<p>Bad.</p>',
        featuredImage: null,
        seoData: null
      };

      (prisma.article.findUnique as jest.Mock).mockResolvedValue(mockArticle);
      (prisma.seoAuditResult.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      const result = await auditArticle('article-1');

      expect(result.quality_gate.status).toBe('reject');
      expect(result.score).toBeLessThan(50);
    });

    it('should throw error when article not found', async () => {
      (prisma.article.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(auditArticle('nonexistent')).rejects.toThrow('Article not found');
    });

    it('should throw error when feature not enabled', async () => {
      const { isFeatureEnabled } = require('@/lib/feature-flags');
      (isFeatureEnabled as jest.Mock).mockReturnValue(false);

      await expect(auditArticle('article-1')).rejects.toThrow('SEO audit feature is not enabled');
    });
  });

  describe('applyFixes', () => {
    const mockArticle = {
      id: 'article-1',
      title: 'Short Title',
      slug: 'bad-slug-that-is-way-too-long-and-needs-optimization',
      content: '<p>Content without headings.</p>',
      seoData: {
        id: 'seo-1',
        metaDescription: 'Short.'
      }
    };

    it('should apply automated fixes successfully', async () => {
      const fixes: AuditFix[] = [
        {
          suggestion_id: 'title-fix',
          fix_type: 'automated',
          fix_data: { field: 'title', min_length: 30, max_length: 60 }
        },
        {
          suggestion_id: 'slug-fix',
          fix_type: 'automated', 
          fix_data: { field: 'slug', max_length: 60 }
        }
      ];

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          article: {
            findUnique: jest.fn().mockResolvedValue(mockArticle),
            update: jest.fn().mockResolvedValue({})
          },
          seoData: {
            update: jest.fn().mockResolvedValue({})
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        });
      });

      const result = await applyFixes('article-1', fixes);

      expect(result.success).toBe(true);
      expect(result.applied_fixes).toHaveLength(2);
      expect(result.failed_fixes).toHaveLength(0);
      expect(result.updated_fields.length).toBeGreaterThan(0);
    });

    it('should handle manual fixes appropriately', async () => {
      const fixes: AuditFix[] = [
        {
          suggestion_id: 'manual-fix',
          fix_type: 'manual',
          fix_data: { requires_human_review: true }
        }
      ];

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          article: {
            findUnique: jest.fn().mockResolvedValue(mockArticle),
            update: jest.fn().mockResolvedValue({})
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({})
          }
        });
      });

      const result = await applyFixes('article-1', fixes);

      expect(result.success).toBe(false);
      expect(result.applied_fixes).toHaveLength(0);
      expect(result.failed_fixes).toHaveLength(1);
      expect(result.failed_fixes[0].error).toContain('Manual fix requires human intervention');
    });

    it('should handle transaction failures gracefully', async () => {
      const fixes: AuditFix[] = [
        {
          suggestion_id: 'test-fix',
          fix_type: 'automated',
          fix_data: { field: 'title' }
        }
      ];

      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await applyFixes('article-1', fixes);

      expect(result.success).toBe(false);
      expect(result.failed_fixes.some(f => f.suggestion_id === 'transaction')).toBe(true);
    });

    it('should handle missing article gracefully', async () => {
      const fixes: AuditFix[] = [
        {
          suggestion_id: 'test-fix',
          fix_type: 'automated',
          fix_data: { field: 'title' }
        }
      ];

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          article: {
            findUnique: jest.fn().mockResolvedValue(null)
          }
        });
      });

      const result = await applyFixes('nonexistent', fixes);

      expect(result.success).toBe(false);
      expect(result.failed_fixes.some(f => f.error.includes('not found'))).toBe(true);
    });
  });

  describe('Quality Gate Logic', () => {
    it('should assign correct quality gates based on scores', () => {
      // This would test the internal quality gate logic
      // Implementation depends on exposing the determineQualityGate function
      // or testing it through the main audit function
    });

    it('should consider critical issues in quality gate determination', () => {
      // Test that critical issues prevent autopublish regardless of score
    });

    it('should provide appropriate required actions for each gate', () => {
      // Test that each quality gate has relevant required actions
    });
  });

  describe('Audit Suggestions', () => {
    it('should generate appropriate content suggestions', () => {
      // Test content quality suggestions
    });

    it('should generate SEO optimization suggestions', () => {
      // Test SEO-related suggestions
    });

    it('should generate technical SEO suggestions', () => {
      // Test technical aspects like alt text, internal links
    });

    it('should prioritize suggestions by impact score', () => {
      // Test that suggestions are properly prioritized
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle articles with no content gracefully', async () => {
      const emptyArticle = {
        id: 'empty-1',
        title: '',
        slug: '',
        content: '',
        featuredImage: null,
        seoData: null
      };

      (prisma.article.findUnique as jest.Mock).mockResolvedValue(emptyArticle);
      (prisma.seoAuditResult.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      const result = await auditArticle('empty-1');

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.quality_gate.status).toBe('reject');
    });

    it('should handle very long articles appropriately', async () => {
      const longContent = '<p>' + 'Long content. '.repeat(1000) + '</p>';
      const longArticle = {
        id: 'long-1',
        title: 'Very Long Article Title',
        slug: 'long-article',
        content: longContent,
        featuredImage: 'https://example.com/image.jpg',
        seoData: {
          id: 'seo-1',
          metaDescription: 'Description for long article.'
        }
      };

      (prisma.article.findUnique as jest.Mock).mockResolvedValue(longArticle);
      (prisma.seoAuditResult.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      const result = await auditArticle('long-1');

      expect(result).toBeDefined();
      expect(result.metadata?.word_count).toBeGreaterThan(1000);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.article.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await expect(auditArticle('article-1')).rejects.toThrow('Database connection failed');
    });
  });
});