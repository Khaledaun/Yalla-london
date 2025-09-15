/**
 * Phase 2 Topic Orchestration Service
 * Manages topic generation with safety controls and manual approval workflow
 */

import { performanceMonitor, trackApiResponseTime } from '@/lib/performance-monitoring';

export interface TopicGenerationRequest {
  category: string;
  locale: 'en' | 'ar';
  count?: number;
  priority?: 'low' | 'medium' | 'high';
  manual_trigger?: boolean;
}

export interface TopicProposal {
  id: string;
  title: string;
  slug: string;
  category: string;
  locale: string;
  primary_keyword: string;
  longtails: string[];
  questions: string[];
  rationale: string;
  sources: string[];
  confidence_score: number;
  status: 'proposed' | 'approved' | 'rejected' | 'in_review';
  created_at: string;
  safety_check: {
    passed: boolean;
    flags: string[];
  };
}

export interface TopicOrchestrationResult {
  success: boolean;
  generated_count: number;
  topics: TopicProposal[];
  safety_summary: {
    total_checked: number;
    passed: number;
    failed: number;
    flags: string[];
  };
  error?: string;
}

// Phase 2 Safety Limits
const PHASE2_TOPIC_LIMITS = {
  MAX_TOPICS_PER_REQUEST: parseInt(process.env.PHASE2_MAX_CONTENT_GENERATION || '5'),
  MAX_REQUESTS_PER_HOUR: 5,
  MANUAL_APPROVAL_REQUIRED: process.env.PHASE2_MANUAL_APPROVAL_REQUIRED === 'true',
  ALLOWED_CATEGORIES: [
    'london_travel',
    'luxury_hotels',
    'fine_dining',
    'cultural_experiences',
    'shopping',
    'entertainment',
    'weekly_mixed'
  ]
};

// Request tracking for rate limiting
const topicRequestTracker = new Map<string, number[]>();

function checkTopicRateLimit(clientId: string): boolean {
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  if (!topicRequestTracker.has(clientId)) {
    topicRequestTracker.set(clientId, []);
  }
  
  const requests = topicRequestTracker.get(clientId)!;
  const recentRequests = requests.filter(time => time > hourAgo);
  topicRequestTracker.set(clientId, recentRequests);
  
  return recentRequests.length < PHASE2_TOPIC_LIMITS.MAX_REQUESTS_PER_HOUR;
}

function addTopicRequest(clientId: string): void {
  const requests = topicRequestTracker.get(clientId) || [];
  requests.push(Date.now());
  topicRequestTracker.set(clientId, requests);
}

function performTopicSafetyCheck(topic: any): { passed: boolean; flags: string[] } {
  const flags: string[] = [];
  
  // Content safety checks
  const prohibitedPatterns = [
    /\b(illegal|fraud|scam|hack)\b/i,
    /\b(violence|harm|dangerous|weapon)\b/i,
    /\b(adult|explicit|nsfw)\b/i,
    /\b(gambling|casino|bet)\b/i
  ];
  
  const textToCheck = `${topic.title} ${topic.rationale} ${topic.primary_keyword}`.toLowerCase();
  
  prohibitedPatterns.forEach((pattern, index) => {
    if (pattern.test(textToCheck)) {
      flags.push(`safety_pattern_${index}`);
    }
  });
  
  // Quality checks
  if (!topic.title || topic.title.length < 10) {
    flags.push('title_too_short');
  }
  
  if (!topic.rationale || topic.rationale.length < 20) {
    flags.push('rationale_insufficient');
  }
  
  if (!topic.sources || topic.sources.length === 0) {
    flags.push('no_sources');
  }
  
  // London relevance check
  const londonKeywords = ['london', 'uk', 'britain', 'british', 'england'];
  const hasLondonRelevance = londonKeywords.some(keyword => 
    textToCheck.includes(keyword)
  );
  
  if (!hasLondonRelevance) {
    flags.push('not_london_relevant');
  }
  
  return {
    passed: flags.length === 0,
    flags
  };
}

async function callTopicResearchAPI(category: string, locale: string): Promise<any> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || 'default-secret';
  
  const response = await fetch(`${baseUrl}/api/phase4b/topics/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cronSecret}`
    },
    body: JSON.stringify({
      category,
      locale,
      phase2_safety_mode: true
    })
  });
  
  if (!response.ok) {
    throw new Error(`Topic research API failed: ${response.status}`);
  }
  
  return response.json();
}

function enhanceTopicWithKeywords(topic: any, category: string, locale: string): TopicProposal {
  // Generate primary keyword from title
  const primaryKeyword = topic.title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Generate longtail keywords
  const longtails = [
    `${primaryKeyword} london`,
    `best ${primaryKeyword} london`,
    `${primaryKeyword} london guide`,
    `luxury ${primaryKeyword} london`,
    `${primaryKeyword} london 2025`
  ];
  
  // Generate questions
  const questions = [
    `What is the best ${primaryKeyword} in London?`,
    `Where to find ${primaryKeyword} in London?`,
    `How to experience ${primaryKeyword} in London?`,
    `Why visit ${primaryKeyword} in London?`
  ];
  
  return {
    id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: topic.title,
    slug: topic.slug || primaryKeyword.replace(/\s+/g, '-'),
    category,
    locale,
    primary_keyword: primaryKeyword,
    longtails,
    questions,
    rationale: topic.rationale || `Generated topic about ${primaryKeyword} for London travel content`,
    sources: topic.sources || [],
    confidence_score: 0.75 + (Math.random() * 0.2), // 0.75-0.95
    status: PHASE2_TOPIC_LIMITS.MANUAL_APPROVAL_REQUIRED ? 'proposed' : 'approved',
    created_at: new Date().toISOString(),
    safety_check: { passed: true, flags: [] } // Will be updated by safety check
  };
}

export class TopicOrchestrator {
  private static instance: TopicOrchestrator;
  
  static getInstance(): TopicOrchestrator {
    if (!TopicOrchestrator.instance) {
      TopicOrchestrator.instance = new TopicOrchestrator();
    }
    return TopicOrchestrator.instance;
  }
  
  async generateTopics(
    request: TopicGenerationRequest,
    clientId: string = 'system'
  ): Promise<TopicOrchestrationResult> {
    const startTime = Date.now();
    const transaction = performanceMonitor.startTransaction('Topic Generation', 'topic.generation');
    
    try {
      // Feature flag check
      if (process.env.FEATURE_TOPIC_RESEARCH !== 'true') {
        throw new Error('Topic research feature is not enabled');
      }
      
      // Validation
      if (!PHASE2_TOPIC_LIMITS.ALLOWED_CATEGORIES.includes(request.category)) {
        throw new Error(`Category '${request.category}' not allowed in Phase 2`);
      }
      
      const count = Math.min(
        request.count || 3,
        PHASE2_TOPIC_LIMITS.MAX_TOPICS_PER_REQUEST
      );
      
      // Rate limiting (skip for manual triggers)
      if (!request.manual_trigger && !checkTopicRateLimit(clientId)) {
        throw new Error(`Rate limit exceeded. Maximum ${PHASE2_TOPIC_LIMITS.MAX_REQUESTS_PER_HOUR} requests per hour.`);
      }
      
      // Call topic research API
      performanceMonitor.addBreadcrumb(
        `Calling topic research API`,
        'topic.generation',
        { category: request.category, locale: request.locale, count }
      );
      
      const researchResult = await callTopicResearchAPI(request.category, request.locale);
      
      if (!researchResult.ok || !researchResult.topics) {
        throw new Error('Topic research API returned invalid response');
      }
      
      // Process and enhance topics
      const rawTopics = researchResult.topics.slice(0, count);
      const enhancedTopics: TopicProposal[] = [];
      const safetyResults = {
        total_checked: 0,
        passed: 0,
        failed: 0,
        flags: [] as string[]
      };
      
      for (const rawTopic of rawTopics) {
        // Enhance topic with keywords and metadata
        const enhancedTopic = enhanceTopicWithKeywords(
          rawTopic,
          request.category,
          request.locale
        );
        
        // Perform safety check
        const safetyCheck = performTopicSafetyCheck(enhancedTopic);
        enhancedTopic.safety_check = safetyCheck;
        
        safetyResults.total_checked++;
        if (safetyCheck.passed) {
          safetyResults.passed++;
          enhancedTopics.push(enhancedTopic);
        } else {
          safetyResults.failed++;
          safetyResults.flags.push(...safetyCheck.flags);
          
          // Log safety failure
          await performanceMonitor.captureError({
            error: new Error('Topic failed safety check'),
            context: {
              topic_title: enhancedTopic.title,
              flags: safetyCheck.flags,
              category: request.category
            }
          });
        }
      }
      
      // Track request if not manual
      if (!request.manual_trigger) {
        addTopicRequest(clientId);
      }
      
      const responseTime = Date.now() - startTime;
      await trackApiResponseTime('topic-orchestrator', responseTime);
      
      // Log successful generation
      performanceMonitor.addBreadcrumb(
        `Topic generation completed`,
        'topic.generation',
        {
          category: request.category,
          locale: request.locale,
          generated: enhancedTopics.length,
          safety_passed: safetyResults.passed,
          response_time: responseTime
        }
      );
      
      return {
        success: true,
        generated_count: enhancedTopics.length,
        topics: enhancedTopics,
        safety_summary: safetyResults
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      await performanceMonitor.captureError({
        error: error instanceof Error ? error : new Error('Unknown topic generation error'),
        context: {
          category: request.category,
          locale: request.locale,
          response_time: responseTime
        }
      });
      
      return {
        success: false,
        generated_count: 0,
        topics: [],
        safety_summary: {
          total_checked: 0,
          passed: 0,
          failed: 0,
          flags: []
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
    } finally {
      transaction.finish();
    }
  }
  
  async getTopicStatus(): Promise<{
    enabled: boolean;
    limits: typeof PHASE2_TOPIC_LIMITS;
    allowed_categories: string[];
    supported_locales: string[];
  }> {
    return {
      enabled: process.env.FEATURE_TOPIC_RESEARCH === 'true',
      limits: PHASE2_TOPIC_LIMITS,
      allowed_categories: PHASE2_TOPIC_LIMITS.ALLOWED_CATEGORIES,
      supported_locales: ['en', 'ar']
    };
  }
  
  async approveTopics(topicIds: string[], userId: string): Promise<{
    success: boolean;
    approved_count: number;
    error?: string;
  }> {
    try {
      // In a real implementation, this would update the database
      // For Phase 2, we'll simulate the approval process
      
      performanceMonitor.addBreadcrumb(
        `Topics approved`,
        'topic.approval',
        { topic_ids: topicIds, user_id: userId }
      );
      
      return {
        success: true,
        approved_count: topicIds.length
      };
      
    } catch (error) {
      await performanceMonitor.captureError({
        error: error instanceof Error ? error : new Error('Topic approval failed'),
        context: { topic_ids: topicIds, user_id: userId }
      });
      
      return {
        success: false,
        approved_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const topicOrchestrator = TopicOrchestrator.getInstance();
