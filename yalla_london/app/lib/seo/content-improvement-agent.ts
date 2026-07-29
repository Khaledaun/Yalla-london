/**
 * Content Improvement Agent
 *
 * AI-powered content analysis and improvement suggestions.
 * Integrates with GSC data to prioritize content based on performance.
 */

import { searchConsole, SearchAnalyticsRow } from '../integrations/google-search-console';
import { blogPosts } from '@/data/blog-content';
import { extendedBlogPosts } from '@/data/blog-content-extended';

function getBaseUrl(siteId?: string): string {
  const { getSiteDomain, getDefaultSiteId } = require("@/config/sites");
  if (siteId) {
    return getSiteDomain(siteId);
  }
  return process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());
}
const BASE_URL = getBaseUrl();
const allPosts = [...blogPosts, ...extendedBlogPosts];

// ============================================
// TYPES
// ============================================

export interface ContentPerformance {
  url: string;
  slug: string;
  title: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topKeywords: string[];
  improvementPotential: 'high' | 'medium' | 'low';
  suggestions: ContentSuggestion[];
}

export interface ContentSuggestion {
  type: 'title' | 'description' | 'content' | 'keywords' | 'structure' | 'internal_links' | 'authority_links';
  priority: 'high' | 'medium' | 'low';
  current?: string;
  suggested?: string;
  reason: string;
  expectedImpact: string;
}

export interface ContentImprovementPlan {
  url: string;
  slug: string;
  currentSeoScore: number;
  estimatedNewScore: number;
  improvements: ContentImprovement[];
  estimatedEffort: 'quick_win' | 'moderate' | 'major_update';
}

export interface ContentImprovement {
  field: string;
  action: 'update' | 'add' | 'remove' | 'optimize';
  currentValue?: any;
  newValue?: any;
  reason: string;
}

export interface KeywordOpportunity {
  keyword: string;
  searchVolume?: number;
  currentPosition: number;
  potentialPosition: number;
  difficulty: 'easy' | 'medium' | 'hard';
  relevantPosts: string[];
  action: 'optimize_existing' | 'create_new' | 'add_to_existing';
}

// ============================================
// CONTENT PERFORMANCE ANALYSIS
// ============================================

export async function analyzeContentPerformance(
  days: number = 28
): Promise<ContentPerformance[]> {
  const performances: ContentPerformance[] = [];

  // Get GSC data
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Get page performance
    const pageData = await searchConsole.getTopPages(startDate, endDate, 100);

    // Get keyword data for each page
    for (const page of pageData) {
      const url = page.keys[0];
      if (!url.includes('/blog/')) continue;

      const slug = url.replace(`${BASE_URL}/blog/`, '').replace(/\/$/, '');
      const post = allPosts.find(p => p.slug === slug);

      if (!post) continue;

      // Calculate improvement potential
      let improvementPotential: 'high' | 'medium' | 'low' = 'low';
      if (page.position > 10 && page.impressions > 100) {
        improvementPotential = 'high'; // High impressions but low ranking
      } else if (page.position > 5 && page.position <= 10) {
        improvementPotential = 'medium'; // Almost on first page
      } else if (page.ctr < 0.02 && page.position <= 5) {
        improvementPotential = 'medium'; // Good position but low CTR
      }

      // Generate suggestions based on analysis
      const suggestions = generateSuggestions(post, page);

      performances.push({
        url,
        slug,
        title: post.title_en,
        clicks: page.clicks,
        impressions: page.impressions,
        ctr: page.ctr,
        position: page.position,
        topKeywords: [], // Would need additional API call
        improvementPotential,
        suggestions,
      });
    }

    // Sort by improvement potential
    performances.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.improvementPotential] - order[b.improvementPotential];
    });

  } catch (error) {
    console.error('Failed to analyze content performance:', error);
  }

  return performances;
}

function generateSuggestions(post: any, gscData: SearchAnalyticsRow): ContentSuggestion[] {
  const suggestions: ContentSuggestion[] = [];

  // Title optimization
  const titleLength = (post.meta_title_en || post.title_en).length;
  if (titleLength < 50 || titleLength > 60) {
    suggestions.push({
      type: 'title',
      priority: 'high',
      current: post.meta_title_en || post.title_en,
      reason: titleLength < 50
        ? 'Title is too short. Aim for 50-60 characters to maximize SERP visibility.'
        : 'Title may be truncated in search results. Consider shortening to 60 characters.',
      expectedImpact: 'Improved CTR by 5-15%',
    });
  }

  // Low CTR with good position
  if (gscData.ctr < 0.03 && gscData.position <= 10) {
    suggestions.push({
      type: 'title',
      priority: 'high',
      current: post.meta_title_en || post.title_en,
      reason: 'Low CTR despite good ranking position. Consider making title more compelling with power words or numbers.',
      expectedImpact: 'Improved CTR by 10-25%',
    });

    suggestions.push({
      type: 'description',
      priority: 'high',
      current: post.meta_description_en,
      reason: 'Meta description may not be compelling enough. Add a clear value proposition and call to action.',
      expectedImpact: 'Improved CTR by 10-20%',
    });
  }

  // High impressions but low position
  if (gscData.impressions > 500 && gscData.position > 10) {
    suggestions.push({
      type: 'content',
      priority: 'high',
      reason: 'Page has high search visibility but ranks beyond page 1. Consider expanding content depth and adding more keyword variations.',
      expectedImpact: 'Move to position 5-10, potentially 2-3x traffic',
    });

    suggestions.push({
      type: 'authority_links',
      priority: 'medium',
      reason: 'Add more authoritative external links to boost E-E-A-T signals.',
      expectedImpact: 'Improved trustworthiness and potential ranking boost',
    });
  }

  // Internal linking opportunities
  const internalLinks = (post as any).internal_links || [];
  if (internalLinks.length < 3) {
    suggestions.push({
      type: 'internal_links',
      priority: 'medium',
      current: `${internalLinks.length} internal links`,
      suggested: '5-8 internal links',
      reason: 'Add more internal links to related content to improve site structure and distribute page authority.',
      expectedImpact: 'Better crawlability and slight ranking boost',
    });
  }

  // Keywords coverage
  const keywords = post.keywords || [];
  if (keywords.length < 5) {
    suggestions.push({
      type: 'keywords',
      priority: 'medium',
      current: `${keywords.length} keywords`,
      reason: 'Expand keyword targeting with long-tail variations and semantic keywords.',
      expectedImpact: 'Capture additional search queries',
    });
  }

  return suggestions;
}

// ============================================
// IMPROVEMENT PLAN GENERATION
// ============================================

export function generateImprovementPlan(
  performance: ContentPerformance
): ContentImprovementPlan {
  const post = allPosts.find(p => p.slug === performance.slug);
  const currentScore = post?.seo_score || 50;
  const improvements: ContentImprovement[] = [];
  let estimatedScoreIncrease = 0;

  for (const suggestion of performance.suggestions) {
    const improvement: ContentImprovement = {
      field: suggestion.type,
      action: 'optimize',
      currentValue: suggestion.current,
      reason: suggestion.reason,
    };

    switch (suggestion.type) {
      case 'title':
        improvement.action = 'update';
        estimatedScoreIncrease += 5;
        break;
      case 'description':
        improvement.action = 'update';
        estimatedScoreIncrease += 5;
        break;
      case 'content':
        improvement.action = 'optimize';
        estimatedScoreIncrease += 10;
        break;
      case 'keywords':
        improvement.action = 'add';
        estimatedScoreIncrease += 5;
        break;
      case 'internal_links':
        improvement.action = 'add';
        estimatedScoreIncrease += 3;
        break;
      case 'authority_links':
        improvement.action = 'add';
        estimatedScoreIncrease += 3;
        break;
    }

    improvements.push(improvement);
  }

  // Determine effort level
  let estimatedEffort: 'quick_win' | 'moderate' | 'major_update' = 'quick_win';
  if (improvements.some(i => i.field === 'content')) {
    estimatedEffort = 'major_update';
  } else if (improvements.length > 3) {
    estimatedEffort = 'moderate';
  }

  return {
    url: performance.url,
    slug: performance.slug,
    currentSeoScore: currentScore,
    estimatedNewScore: Math.min(100, currentScore + estimatedScoreIncrease),
    improvements,
    estimatedEffort,
  };
}

// ============================================
// KEYWORD OPPORTUNITY FINDER
// ============================================

export async function findKeywordOpportunities(
  days: number = 28
): Promise<KeywordOpportunity[]> {
  const opportunities: KeywordOpportunity[] = [];

  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const keywordData = await searchConsole.getTopKeywords(startDate, endDate, 100);

    for (const kw of keywordData) {
      const keyword = kw.keys[0];
      const position = kw.position;

      // Find posts that could target this keyword
      const relevantPosts = allPosts
        .filter(post => {
          const content = `${post.title_en} ${post.meta_description_en} ${(post.keywords || []).join(' ')}`.toLowerCase();
          return content.includes(keyword.toLowerCase());
        })
        .map(post => post.slug);

      // Determine difficulty and action
      let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
      let action: 'optimize_existing' | 'create_new' | 'add_to_existing' = 'optimize_existing';
      let potentialPosition = position;

      if (position > 20) {
        difficulty = 'hard';
        potentialPosition = 10;
        if (relevantPosts.length === 0) {
          action = 'create_new';
        }
      } else if (position > 10) {
        difficulty = 'medium';
        potentialPosition = 5;
        action = 'optimize_existing';
      } else if (position > 5) {
        difficulty = 'easy';
        potentialPosition = 3;
        action = 'optimize_existing';
      }

      if (position > 3) { // Only include if there's room for improvement
        opportunities.push({
          keyword,
          currentPosition: Math.round(position * 10) / 10,
          potentialPosition,
          difficulty,
          relevantPosts,
          action,
        });
      }
    }

    // Sort by easy wins first
    opportunities.sort((a, b) => {
      const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });

  } catch (error) {
    console.error('Failed to find keyword opportunities:', error);
  }

  return opportunities;
}

// ============================================
// QUICK WINS IDENTIFIER
// ============================================

export async function identifyQuickWins(): Promise<{
  titleOptimizations: ContentPerformance[];
  ctrImprovements: ContentPerformance[];
  easyRankingGains: ContentPerformance[];
  lowHangingFruit: KeywordOpportunity[];
}> {
  const performances = await analyzeContentPerformance(28);
  const keywords = await findKeywordOpportunities(28);

  // Title optimizations - pages with good position but suboptimal titles
  const titleOptimizations = performances.filter(p =>
    p.suggestions.some(s => s.type === 'title' && s.priority === 'high')
  ).slice(0, 5);

  // CTR improvements - good position but low click-through
  const ctrImprovements = performances.filter(p =>
    p.position <= 10 && p.ctr < 0.03
  ).slice(0, 5);

  // Easy ranking gains - position 11-20 with good impressions
  const easyRankingGains = performances.filter(p =>
    p.position > 10 && p.position <= 20 && p.impressions > 100
  ).slice(0, 5);

  // Low hanging fruit keywords
  const lowHangingFruit = keywords.filter(k =>
    k.difficulty === 'easy' || (k.difficulty === 'medium' && k.currentPosition < 15)
  ).slice(0, 10);

  return {
    titleOptimizations,
    ctrImprovements,
    easyRankingGains,
    lowHangingFruit,
  };
}

// ============================================
// EXPORT
// ============================================

export const contentImprovementAgent = {
  analyzeContentPerformance,
  generateImprovementPlan,
  findKeywordOpportunities,
  identifyQuickWins,
};

export default contentImprovementAgent;
