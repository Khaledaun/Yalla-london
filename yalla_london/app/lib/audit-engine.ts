/**
 * SEO Audit Engine
 * Comprehensive article auditing with quality gates and automated fixes
 */

import { prisma } from '@/lib/db';
import { isFeatureEnabled } from '@/lib/feature-flags';

export interface SeoAuditResult {
  id?: string;
  articleId: string;
  score: number;
  breakdown: {
    content_quality: number;
    seo_optimization: number;
    readability: number;
    technical_seo: number;
    user_experience: number;
  };
  suggestions: SeoSuggestion[];
  quality_gate: QualityGate;
  audit_date: Date;
  audit_version: string;
  metadata?: any;
}

export interface SeoSuggestion {
  id: string;
  category: 'content' | 'seo' | 'technical' | 'ux' | 'readability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  fix_type: 'automated' | 'manual' | 'suggestion';
  fix_data?: any;
  impact_score: number;
}

export interface QualityGate {
  status: 'autopublish' | 'review' | 'regenerate' | 'reject';
  score_threshold: number;
  reasoning: string;
  required_actions: string[];
}

export interface AuditFix {
  suggestion_id: string;
  fix_type: 'automated' | 'manual';
  fix_data: any;
  apply_immediately?: boolean;
}

/**
 * Audit an article and persist the results
 */
export async function auditArticle(articleId: string): Promise<SeoAuditResult> {
  try {
    // Check if audit feature is enabled
    if (!isFeatureEnabled('FEATURE_AI_SEO_AUDIT')) {
      throw new Error('SEO audit feature is not enabled');
    }

    // Get article data
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        seoData: true,
        content: true
      }
    });

    if (!article) {
      throw new Error(`Article not found: ${articleId}`);
    }

    // Perform comprehensive audit
    const auditResult = await performComprehensiveAudit(article);

    // Persist audit result
    const savedAudit = await prisma.seoAuditResult.create({
      data: {
        articleId: auditResult.articleId,
        score: auditResult.score,
        breakdown: auditResult.breakdown,
        suggestions: auditResult.suggestions,
        qualityGate: auditResult.quality_gate,
        auditVersion: auditResult.audit_version,
        metadata: auditResult.metadata || {}
      }
    });

    // Update article audit status
    await prisma.article.update({
      where: { id: articleId },
      data: {
        lastAuditScore: auditResult.score,
        lastAuditDate: new Date(),
        qualityGateStatus: auditResult.quality_gate.status
      }
    });

    return {
      ...auditResult,
      id: savedAudit.id
    };

  } catch (error) {
    console.error('Error auditing article:', error);
    throw error;
  }
}

/**
 * Apply fixes to an article atomically
 */
export async function applyFixes(articleId: string, fixes: AuditFix[]): Promise<{
  success: boolean;
  applied_fixes: string[];
  failed_fixes: { suggestion_id: string; error: string }[];
  updated_fields: string[];
}> {
  const appliedFixes: string[] = [];
  const failedFixes: { suggestion_id: string; error: string }[] = [];
  const updatedFields: string[] = [];

  try {
    // Start transaction for atomic updates
    const result = await prisma.$transaction(async (tx: any) => {
      const article = await tx.article.findUnique({
        where: { id: articleId },
        include: {
          seoData: true,
          content: true
        }
      });

      if (!article) {
        throw new Error(`Article not found: ${articleId}`);
      }

      const articleUpdates: any = {};
      const seoDataUpdates: any = {};
      let hasArticleUpdates = false;
      let hasSeoUpdates = false;

      // Process each fix
      for (const fix of fixes) {
        try {
          const fixResult = await applyIndividualFix(article, fix, tx);
          
          if (fixResult.success) {
            appliedFixes.push(fix.suggestion_id);
            
            // Merge updates
            if (fixResult.article_updates) {
              Object.assign(articleUpdates, fixResult.article_updates);
              hasArticleUpdates = true;
              updatedFields.push(...Object.keys(fixResult.article_updates));
            }
            
            if (fixResult.seo_updates) {
              Object.assign(seoDataUpdates, fixResult.seo_updates);
              hasSeoUpdates = true;
              updatedFields.push(...Object.keys(fixResult.seo_updates));
            }
          } else {
            failedFixes.push({
              suggestion_id: fix.suggestion_id,
              error: fixResult.error || 'Unknown error'
            });
          }
        } catch (error) {
          failedFixes.push({
            suggestion_id: fix.suggestion_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Apply article updates
      if (hasArticleUpdates) {
        await tx.article.update({
          where: { id: articleId },
          data: {
            ...articleUpdates,
            updatedAt: new Date()
          }
        });
      }

      // Apply SEO data updates
      if (hasSeoUpdates) {
        if (article.seoData) {
          await tx.seoData.update({
            where: { id: article.seoData.id },
            data: {
              ...seoDataUpdates,
              updatedAt: new Date()
            }
          });
        } else {
          await tx.seoData.create({
            data: {
              articleId,
              ...seoDataUpdates,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }

      // Log audit fix application
      await tx.auditLog.create({
        data: {
          action: 'apply_seo_fixes',
          resourceId: articleId,
          details: {
            fixes_applied: appliedFixes.length,
            fixes_failed: failedFixes.length,
            updated_fields: [...new Set(updatedFields)]
          },
          success: failedFixes.length === 0
        }
      });

      return {
        success: failedFixes.length === 0,
        applied_fixes: appliedFixes,
        failed_fixes: failedFixes,
        updated_fields: [...new Set(updatedFields)]
      };
    });

    return result;

  } catch (error) {
    console.error('Error applying fixes:', error);
    return {
      success: false,
      applied_fixes: appliedFixes,
      failed_fixes: [
        ...failedFixes,
        { suggestion_id: 'transaction', error: error instanceof Error ? error.message : 'Transaction failed' }
      ],
      updated_fields: updatedFields
    };
  }
}

/**
 * Perform comprehensive audit analysis
 */
async function performComprehensiveAudit(article: any): Promise<SeoAuditResult> {
  const suggestions: SeoSuggestion[] = [];
  const breakdown = {
    content_quality: 0,
    seo_optimization: 0,
    readability: 0,
    technical_seo: 0,
    user_experience: 0
  };

  // Content Quality Audit (25%)
  const contentScore = await auditContentQuality(article, suggestions);
  breakdown.content_quality = contentScore;

  // SEO Optimization Audit (30%)
  const seoScore = await auditSeoOptimization(article, suggestions);
  breakdown.seo_optimization = seoScore;

  // Readability Audit (20%)
  const readabilityScore = await auditReadability(article, suggestions);
  breakdown.readability = readabilityScore;

  // Technical SEO Audit (15%)
  const technicalScore = await auditTechnicalSeo(article, suggestions);
  breakdown.technical_seo = technicalScore;

  // User Experience Audit (10%)
  const uxScore = await auditUserExperience(article, suggestions);
  breakdown.user_experience = uxScore;

  // Calculate weighted overall score
  const overallScore = Math.round(
    breakdown.content_quality * 0.25 +
    breakdown.seo_optimization * 0.30 +
    breakdown.readability * 0.20 +
    breakdown.technical_seo * 0.15 +
    breakdown.user_experience * 0.10
  );

  // Determine quality gate
  const qualityGate = determineQualityGate(overallScore, breakdown, suggestions);

  return {
    articleId: article.id,
    score: overallScore,
    breakdown,
    suggestions,
    quality_gate: qualityGate,
    audit_date: new Date(),
    audit_version: '1.0.0',
    metadata: {
      article_length: article.content?.length || 0,
      word_count: countWords(article.content || ''),
      audit_duration_ms: Date.now() % 1000 // Simulated
    }
  };
}

/**
 * Content quality audit
 */
async function auditContentQuality(article: any, suggestions: SeoSuggestion[]): Promise<number> {
  let score = 100;
  const content = article.content || '';
  const wordCount = countWords(content);

  // Word count check
  if (wordCount < 300) {
    score -= 30;
    suggestions.push({
      id: `content_length_${Date.now()}`,
      category: 'content',
      severity: 'high',
      title: 'Article too short',
      description: `Article has ${wordCount} words. Aim for at least 300 words for better SEO.`,
      fix_type: 'manual',
      impact_score: 30
    });
  } else if (wordCount < 500) {
    score -= 15;
    suggestions.push({
      id: `content_length_${Date.now()}`,
      category: 'content',
      severity: 'medium',
      title: 'Consider expanding content',
      description: `Article has ${wordCount} words. Consider expanding to 500+ words for better engagement.`,
      fix_type: 'suggestion',
      impact_score: 15
    });
  }

  // Content structure check
  if (!content.includes('<h2>') && !content.includes('<h3>')) {
    score -= 20;
    suggestions.push({
      id: `content_structure_${Date.now()}`,
      category: 'content',
      severity: 'medium',
      title: 'Add subheadings',
      description: 'Article lacks subheadings (H2, H3). Add them to improve readability and SEO.',
      fix_type: 'manual',
      impact_score: 20
    });
  }

  return Math.max(0, score);
}

/**
 * SEO optimization audit
 */
async function auditSeoOptimization(article: any, suggestions: SeoSuggestion[]): Promise<number> {
  let score = 100;
  const seoData = article.seoData;

  // Meta title check
  if (!article.title || article.title.length < 30) {
    score -= 25;
    suggestions.push({
      id: `meta_title_${Date.now()}`,
      category: 'seo',
      severity: 'high',
      title: 'Optimize meta title',
      description: 'Meta title is too short or missing. Aim for 30-60 characters.',
      fix_type: 'automated',
      fix_data: { field: 'title', min_length: 30, max_length: 60 },
      impact_score: 25
    });
  }

  // Meta description check
  if (!seoData?.metaDescription || seoData.metaDescription.length < 120) {
    score -= 20;
    suggestions.push({
      id: `meta_description_${Date.now()}`,
      category: 'seo',
      severity: 'high',
      title: 'Add meta description',
      description: 'Meta description is missing or too short. Aim for 120-160 characters.',
      fix_type: 'automated',
      fix_data: { field: 'metaDescription', min_length: 120, max_length: 160 },
      impact_score: 20
    });
  }

  // Slug optimization
  if (!article.slug || article.slug.length > 60) {
    score -= 15;
    suggestions.push({
      id: `slug_optimization_${Date.now()}`,
      category: 'seo',
      severity: 'medium',
      title: 'Optimize URL slug',
      description: 'URL slug should be concise and descriptive (under 60 characters).',
      fix_type: 'automated',
      fix_data: { field: 'slug', max_length: 60 },
      impact_score: 15
    });
  }

  return Math.max(0, score);
}

/**
 * Readability audit
 */
async function auditReadability(article: any, suggestions: SeoSuggestion[]): Promise<number> {
  let score = 100;
  const content = article.content || '';

  // Sentence length check (simplified)
  const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum: number, sentence: string) => {
    return sum + countWords(sentence);
  }, 0) / sentences.length;

  if (avgSentenceLength > 25) {
    score -= 20;
    suggestions.push({
      id: `sentence_length_${Date.now()}`,
      category: 'readability',
      severity: 'medium',
      title: 'Shorten sentences',
      description: `Average sentence length is ${Math.round(avgSentenceLength)} words. Aim for under 20 words per sentence.`,
      fix_type: 'manual',
      impact_score: 20
    });
  }

  // Paragraph length check
  const paragraphs = content.split('\n\n').filter((p: string) => p.trim().length > 0);
  const longParagraphs = paragraphs.filter((p: string) => countWords(p) > 100);
  
  if (longParagraphs.length > 0) {
    score -= 15;
    suggestions.push({
      id: `paragraph_length_${Date.now()}`,
      category: 'readability',
      severity: 'low',
      title: 'Break up long paragraphs',
      description: `${longParagraphs.length} paragraphs are over 100 words. Consider breaking them up.`,
      fix_type: 'manual',
      impact_score: 15
    });
  }

  return Math.max(0, score);
}

/**
 * Technical SEO audit
 */
async function auditTechnicalSeo(article: any, suggestions: SeoSuggestion[]): Promise<number> {
  let score = 100;

  // Image alt text check
  const content = article.content || '';
  const images = content.match(/<img[^>]*>/g) || [];
  const imagesWithoutAlt = images.filter((img: string) => !img.includes('alt='));

  if (imagesWithoutAlt.length > 0) {
    score -= 30;
    suggestions.push({
      id: `image_alt_${Date.now()}`,
      category: 'technical',
      severity: 'high',
      title: 'Add alt text to images',
      description: `${imagesWithoutAlt.length} images are missing alt text for accessibility and SEO.`,
      fix_type: 'manual',
      impact_score: 30
    });
  }

  // Internal links check
  const internalLinks = content.match(/href="\/[^"]*"/g) || [];
  if (internalLinks.length === 0) {
    score -= 20;
    suggestions.push({
      id: `internal_links_${Date.now()}`,
      category: 'technical',
      severity: 'medium',
      title: 'Add internal links',
      description: 'Article has no internal links. Add 2-3 relevant internal links.',
      fix_type: 'automated',
      fix_data: { min_internal_links: 2 },
      impact_score: 20
    });
  }

  return Math.max(0, score);
}

/**
 * User experience audit
 */
async function auditUserExperience(article: any, suggestions: SeoSuggestion[]): Promise<number> {
  let score = 100;

  // Featured image check
  if (!article.featuredImage) {
    score -= 40;
    suggestions.push({
      id: `featured_image_${Date.now()}`,
      category: 'ux',
      severity: 'medium',
      title: 'Add featured image',
      description: 'Article is missing a featured image for better visual appeal.',
      fix_type: 'manual',
      impact_score: 40
    });
  }

  // Table of contents for long articles
  const wordCount = countWords(article.content || '');
  if (wordCount > 1500 && !article.content?.includes('table-of-contents')) {
    score -= 30;
    suggestions.push({
      id: `table_of_contents_${Date.now()}`,
      category: 'ux',
      severity: 'low',
      title: 'Consider adding table of contents',
      description: 'Long articles benefit from a table of contents for better navigation.',
      fix_type: 'automated',
      fix_data: { generate_toc: true },
      impact_score: 30
    });
  }

  return Math.max(0, score);
}

/**
 * Determine quality gate based on score and issues
 */
function determineQualityGate(score: number, breakdown: any, suggestions: SeoSuggestion[]): QualityGate {
  const criticalIssues = suggestions.filter(s => s.severity === 'critical').length;
  const highIssues = suggestions.filter(s => s.severity === 'high').length;

  if (score >= 85 && criticalIssues === 0) {
    return {
      status: 'autopublish',
      score_threshold: 85,
      reasoning: 'High quality score with no critical issues. Ready for automatic publishing.',
      required_actions: []
    };
  } else if (score >= 70 && criticalIssues === 0) {
    return {
      status: 'review',
      score_threshold: 70,
      reasoning: 'Good quality score but requires human review before publishing.',
      required_actions: suggestions.filter(s => s.severity === 'high').map(s => s.title)
    };
  } else if (score >= 50) {
    return {
      status: 'regenerate',
      score_threshold: 50,
      reasoning: 'Moderate quality score. Consider regenerating content with improvements.',
      required_actions: [
        ...suggestions.filter(s => s.severity === 'critical' || s.severity === 'high').map(s => s.title),
        'Review and improve content quality'
      ]
    };
  } else {
    return {
      status: 'reject',
      score_threshold: 50,
      reasoning: 'Low quality score with significant issues. Content needs major revision.',
      required_actions: [
        'Complete content rewrite required',
        ...suggestions.filter(s => s.severity === 'critical' || s.severity === 'high').map(s => s.title)
      ]
    };
  }
}

/**
 * Apply individual fix
 */
async function applyIndividualFix(article: any, fix: AuditFix, tx: any): Promise<{
  success: boolean;
  error?: string;
  article_updates?: any;
  seo_updates?: any;
}> {
  try {
    switch (fix.fix_type) {
      case 'automated':
        return await applyAutomatedFix(article, fix, tx);
      case 'manual':
        // Manual fixes require human intervention
        return {
          success: false,
          error: 'Manual fix requires human intervention'
        };
      default:
        return {
          success: false,
          error: 'Unknown fix type'
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Apply automated fix
 */
async function applyAutomatedFix(article: any, fix: AuditFix, tx: any): Promise<{
  success: boolean;
  error?: string;
  article_updates?: any;
  seo_updates?: any;
}> {
  const { fix_data } = fix;

  if (fix_data?.field === 'title' && fix_data?.min_length) {
    // Auto-expand title if too short
    const currentTitle = article.title || '';
    if (currentTitle.length < fix_data.min_length) {
      const expandedTitle = `${currentTitle} - Complete Guide`.slice(0, fix_data.max_length || 60);
      return {
        success: true,
        article_updates: { title: expandedTitle }
      };
    }
  }

  if (fix_data?.field === 'metaDescription' && fix_data?.min_length) {
    // Auto-generate meta description
    const content = article.content || '';
    const firstSentence = content.split('.')[0]?.replace(/<[^>]*>/g, '').trim();
    const metaDesc = firstSentence?.slice(0, fix_data.max_length || 160) + '...';
    
    if (metaDesc && metaDesc.length >= fix_data.min_length) {
      return {
        success: true,
        seo_updates: { metaDescription: metaDesc }
      };
    }
  }

  if (fix_data?.field === 'slug' && fix_data?.max_length) {
    // Auto-optimize slug
    const title = article.title || '';
    const optimizedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, fix_data.max_length);
    
    return {
      success: true,
      article_updates: { slug: optimizedSlug }
    };
  }

  if (fix_data?.min_internal_links) {
    // Auto-add internal links (simplified implementation)
    // In a real implementation, this would use AI or a link database
    return {
      success: false,
      error: 'Internal link generation requires manual review'
    };
  }

  if (fix_data?.generate_toc) {
    // Auto-generate table of contents
    const content = article.content || '';
    const headings = content.match(/<h[2-6][^>]*>([^<]+)<\/h[2-6]>/gi) || [];
    
    if (headings.length > 0) {
      const toc = '<div class="table-of-contents"><h3>Table of Contents</h3><ul>' +
        headings.map((h: string) => `<li>${h.replace(/<[^>]*>/g, '')}</li>`).join('') +
        '</ul></div>';
      
      const updatedContent = toc + '\n\n' + content;
      
      return {
        success: true,
        article_updates: { content: updatedContent }
      };
    }
  }

  return {
    success: false,
    error: 'No automated fix available for this suggestion'
  };
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get audit history for an article
 */
export async function getAuditHistory(articleId: string, limit: number = 10): Promise<SeoAuditResult[]> {
  try {
    const audits = await prisma.seoAuditResult.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return audits.map((audit: any) => ({
      id: audit.id,
      articleId: audit.articleId,
      score: audit.score,
      breakdown: audit.breakdown as any,
      suggestions: audit.suggestions as SeoSuggestion[],
      quality_gate: audit.qualityGate as QualityGate,
      audit_date: audit.createdAt,
      audit_version: audit.auditVersion,
      metadata: audit.metadata
    }));
  } catch (error) {
    console.error('Error getting audit history:', error);
    throw error;
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStatistics(): Promise<{
  total_audits: number;
  average_score: number;
  quality_gate_distribution: Record<string, number>;
  recent_audits: number;
}> {
  try {
    const totalAudits = await prisma.seoAuditResult.count();
    
    const averageScore = await prisma.seoAuditResult.aggregate({
      _avg: { score: true }
    });

    const qualityGateDistribution = await prisma.seoAuditResult.groupBy({
      by: ['qualityGate'],
      _count: true
    });

    const recentAudits = await prisma.seoAuditResult.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    return {
      total_audits: totalAudits,
      average_score: averageScore._avg.score || 0,
      quality_gate_distribution: qualityGateDistribution.reduce((acc: any, item: any) => {
        acc[(item.qualityGate as any)?.status || 'unknown'] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recent_audits: recentAudits
    };
  } catch (error) {
    console.error('Error getting audit statistics:', error);
    throw error;
  }
}