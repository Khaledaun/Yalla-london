
/**
 * Phase 4B SEO Audit API
 * Comprehensive SEO analysis for content optimization
 */
import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

interface SEOAuditRequest {
  contentId?: string;
  url?: string;
  content?: string;
  type: 'content' | 'url' | 'batch';
}

interface SEOAuditResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  metrics: SEOMetrics;
  passed: boolean;
}

interface SEOIssue {
  category: 'critical' | 'warning' | 'suggestion';
  type: string;
  description: string;
  impact: number;
  fix: string;
}

interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  impact: string;
  effort: string;
}

interface SEOMetrics {
  titleLength: number;
  descriptionLength: number;
  contentLength: number;
  headingCount: number;
  imageCount: number;
  imagesWithAlt: number;
  internalLinks: number;
  externalLinks: number;
  readabilityScore: number;
  keywordDensity: number;
}

function analyzeContent(content: any): SEOAuditResult {
  const issues: SEOIssue[] = [];
  const recommendations: SEORecommendation[] = [];
  let score = 100;

  // Extract text content for analysis
  const textContent = content.content?.replace(/<[^>]*>/g, '') || '';
  const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
  
  // Calculate metrics
  const metrics: SEOMetrics = {
    titleLength: content.seoTitle?.length || content.title?.length || 0,
    descriptionLength: content.seoDescription?.length || content.excerpt?.length || 0,
    contentLength: textContent.length,
    headingCount: (content.content?.match(/<h[1-6][^>]*>/g) || []).length,
    imageCount: (content.content?.match(/<img[^>]*>/g) || []).length,
    imagesWithAlt: (content.content?.match(/<img[^>]*alt=['"][^'"]+['"][^>]*>/g) || []).length,
    internalLinks: (content.content?.match(/<a[^>]*href=['"][^'"]*yalla[^'"]*['"][^>]*>/g) || []).length,
    externalLinks: (content.content?.match(/<a[^>]*href=['"]https?:\/\/[^'"]*['"][^>]*>/g) || []).length,
    readabilityScore: calculateReadabilityScore(textContent),
    keywordDensity: calculateKeywordDensity(textContent, content.tags || []),
  };

  // Title Analysis
  if (metrics.titleLength === 0) {
    issues.push({
      category: 'critical',
      type: 'missing_title',
      description: 'Content is missing a title',
      impact: 25,
      fix: 'Add a compelling, keyword-rich title'
    });
    score -= 25;
  } else if (metrics.titleLength < 30) {
    issues.push({
      category: 'warning',
      type: 'short_title',
      description: 'Title is too short for optimal SEO',
      impact: 15,
      fix: 'Expand title to 30-60 characters'
    });
    score -= 15;
  } else if (metrics.titleLength > 60) {
    issues.push({
      category: 'warning',
      type: 'long_title',
      description: 'Title may be truncated in search results',
      impact: 10,
      fix: 'Shorten title to under 60 characters'
    });
    score -= 10;
  }

  // Meta Description Analysis
  if (metrics.descriptionLength === 0) {
    issues.push({
      category: 'critical',
      type: 'missing_description',
      description: 'Meta description is missing',
      impact: 20,
      fix: 'Add a compelling meta description (120-160 characters)'
    });
    score -= 20;
  } else if (metrics.descriptionLength < 120) {
    issues.push({
      category: 'warning',
      type: 'short_description',
      description: 'Meta description is too short',
      impact: 10,
      fix: 'Expand meta description to 120-160 characters'
    });
    score -= 10;
  } else if (metrics.descriptionLength > 160) {
    issues.push({
      category: 'suggestion',
      type: 'long_description',
      description: 'Meta description may be truncated',
      impact: 5,
      fix: 'Trim meta description to under 160 characters'
    });
    score -= 5;
  }

  // Content Length Analysis
  if (metrics.contentLength < 300) {
    issues.push({
      category: 'critical',
      type: 'thin_content',
      description: 'Content is too short for good SEO performance',
      impact: 20,
      fix: 'Expand content to at least 500 words'
    });
    score -= 20;
  } else if (metrics.contentLength < 500) {
    issues.push({
      category: 'warning',
      type: 'short_content',
      description: 'Content could benefit from more depth',
      impact: 10,
      fix: 'Consider adding more detailed information'
    });
    score -= 10;
  }

  // Heading Structure Analysis
  if (metrics.headingCount < 2) {
    issues.push({
      category: 'warning',
      type: 'poor_structure',
      description: 'Content lacks proper heading structure',
      impact: 10,
      fix: 'Add H2 and H3 headings to improve content structure'
    });
    score -= 10;
  }

  // Image Optimization Analysis
  if (metrics.imageCount > 0 && metrics.imagesWithAlt < metrics.imageCount) {
    issues.push({
      category: 'warning',
      type: 'missing_alt_text',
      description: `${metrics.imageCount - metrics.imagesWithAlt} images missing alt text`,
      impact: 8,
      fix: 'Add descriptive alt text to all images'
    });
    score -= 8;
  }

  // Link Analysis
  if (metrics.internalLinks < 2) {
    issues.push({
      category: 'suggestion',
      type: 'low_internal_links',
      description: 'Content could benefit from more internal links',
      impact: 5,
      fix: 'Add 2-3 relevant internal links'
    });
    score -= 5;
  }

  // Readability Analysis
  if (metrics.readabilityScore < 60) {
    issues.push({
      category: 'warning',
      type: 'poor_readability',
      description: 'Content readability could be improved',
      impact: 8,
      fix: 'Use shorter sentences and simpler language'
    });
    score -= 8;
  }

  // Keyword Density Analysis
  if (metrics.keywordDensity > 3) {
    issues.push({
      category: 'warning',
      type: 'keyword_stuffing',
      description: 'Keyword density is too high',
      impact: 12,
      fix: 'Reduce keyword usage to 1-2% density'
    });
    score -= 12;
  }

  // Generate recommendations
  if (score >= 90) {
    recommendations.push({
      priority: 'low',
      action: 'Content is well-optimized for SEO',
      impact: 'Minimal improvements needed',
      effort: 'Low'
    });
  } else if (score >= 70) {
    recommendations.push({
      priority: 'medium',
      action: 'Address the identified issues for better performance',
      impact: 'Moderate SEO improvement expected',
      effort: 'Medium'
    });
  } else {
    recommendations.push({
      priority: 'high',
      action: 'Significant SEO improvements required',
      impact: 'Major boost in search performance possible',
      effort: 'High'
    });
  }

  // Calculate grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return {
    score: Math.max(0, Math.round(score)),
    grade,
    issues,
    recommendations,
    metrics,
    passed: score >= 70,
  };
}

function calculateReadabilityScore(text: string): number {
  // Simplified Flesch Reading Ease calculation
  const sentences = text.split(/[.!?]+/).length - 1;
  const words = text.split(/\s+/).length;
  const syllables = text.split(/[aeiouAEIOU]/).length - 1;
  
  if (sentences === 0 || words === 0) return 0;
  
  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateKeywordDensity(text: string, keywords: string[]): number {
  if (keywords.length === 0 || text.length === 0) return 0;
  
  const words = text.toLowerCase().split(/\s+/);
  const totalWords = words.length;
  let keywordCount = 0;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword.toLowerCase(), 'g');
    const matches = text.toLowerCase().match(regex);
    keywordCount += matches ? matches.length : 0;
  });
  
  return Math.round((keywordCount / totalWords) * 100 * 10) / 10; // Round to 1 decimal
}

export async function POST(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.SEO_AUTOMATION) {
      return NextResponse.json(
        { error: 'SEO audit feature is disabled' },
        { status: 403 }
      );
    }

    const { contentId, url, content, type }: SEOAuditRequest = await request.json();

    let auditResults: SEOAuditResult[] = [];

    if (type === 'content' && contentId) {
      // Audit single content item
      const contentItem = await prisma.content.findUnique({
        where: { id: contentId }
      });

      if (!contentItem) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }

      const auditResult = analyzeContent(contentItem);
      auditResults = [auditResult];

      // Save audit result
      await prisma.seoAudit.create({
        data: {
          contentId: contentItem.id,
          score: auditResult.score,
          grade: auditResult.grade,
          issues: auditResult.issues,
          recommendations: auditResult.recommendations,
          metrics: auditResult.metrics,
          passed: auditResult.passed,
          auditType: 'content',
        }
      });

    } else if (type === 'batch') {
      // Audit multiple content items
      const contents = await prisma.content.findMany({
        where: {
          status: { in: ['draft', 'published'] }
        },
        take: 50 // Limit batch size
      });

      for (const contentItem of contents) {
        const auditResult = analyzeContent(contentItem);
        auditResults.push(auditResult);

        // Save each audit result
        await prisma.seoAudit.create({
          data: {
            contentId: contentItem.id,
            score: auditResult.score,
            grade: auditResult.grade,
            issues: auditResult.issues,
            recommendations: auditResult.recommendations,
            metrics: auditResult.metrics,
            passed: auditResult.passed,
            auditType: 'batch',
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: auditResults,
      summary: {
        totalAudited: auditResults.length,
        averageScore: auditResults.reduce((sum, r) => sum + r.score, 0) / auditResults.length,
        passed: auditResults.filter(r => r.passed).length,
        failed: auditResults.filter(r => !r.passed).length,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('SEO audit error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform SEO audit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.SEO_AUTOMATION) {
      return NextResponse.json(
        { error: 'SEO audit feature is disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    const grade = searchParams.get('grade');
    const limit = parseInt(searchParams.get('limit') || '20');

    let whereClause: any = {};
    if (contentId) whereClause.contentId = contentId;
    if (grade) whereClause.grade = grade;

    const audits = await prisma.seoAudit.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        content: {
          select: {
            title: true,
            slug: true,
            status: true,
          }
        }
      }
    });

    const stats = await prisma.seoAudit.groupBy({
      by: ['grade'],
      _count: { id: true },
      _avg: { score: true },
    });

    return NextResponse.json({
      success: true,
      audits,
      stats,
      count: audits.length,
    });

  } catch (error) {
    console.error('SEO audit fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEO audits' },
      { status: 500 }
    );
  }
}
