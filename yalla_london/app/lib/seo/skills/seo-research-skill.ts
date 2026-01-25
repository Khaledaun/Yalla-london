/**
 * SEO Research Skill
 * Adapted from zenobi-us/dotfiles research methodology
 *
 * Provides structured research for SEO optimization with verification methodology.
 * Breaks topics into subtopics, requires multiple source verification,
 * and produces evidence-based findings with confidence levels.
 */

export interface ResearchRequest {
  topic: string;
  storagePrefix: string;
  thingsToAvoid?: string[];
  locale?: 'en' | 'ar';
}

export interface ResearchSource {
  url: string;
  accessDate: string;
  sourceType: 'official_docs' | 'academic' | 'news' | 'community' | 'blog' | 'tool';
  authorPublisher: string;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  contradictions?: string[];
}

export interface ResearchFinding {
  claim: string;
  sources: ResearchSource[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  notes?: string;
}

export interface ResearchOutput {
  thinking: string;
  research: ResearchFinding[];
  verification: {
    sourceMatrix: ResearchSource[];
    evidenceAudit: string;
    gaps: string[];
  };
  insights: string[];
  summary: string;
}

export interface SEOResearchTopic {
  id: string;
  keyword: string;
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  subtopics: string[];
  competitorUrls?: string[];
  searchVolume?: number;
  difficulty?: number;
}

/**
 * SEO Research Skill - Parallel Research Methodology
 *
 * When conducting SEO research, this skill enforces:
 * 1. Topic scoping and planning
 * 2. Multi-source collection (minimum 3 independent sources per claim)
 * 3. Information collation and organization
 * 4. Verification with confidence levels
 * 5. Structured output generation
 */
export class SEOResearchSkill {
  private findings: Map<string, ResearchOutput> = new Map();

  /**
   * Validate research request structure
   */
  validateRequest(request: Partial<ResearchRequest>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.topic || request.topic.length < 10) {
      errors.push('Topic is required and must be specific (min 10 characters)');
    }

    if (!request.storagePrefix) {
      errors.push('Storage prefix is required for output files');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Break topic into parallel subtopics for research
   */
  decomposeIntoSubtopics(topic: string): string[] {
    const seoSubtopics = [
      'keyword_analysis', // Keyword patterns, search volume, competition
      'content_gaps', // What competitors cover that we don't
      'serp_features', // Featured snippets, PAA, rich results opportunities
      'technical_seo', // Page speed, mobile-friendliness, crawlability
      'user_intent', // What users actually want when searching
      'authority_signals', // Backlinks, E-E-A-T signals needed
    ];

    return seoSubtopics.map(subtopic => `${topic} - ${subtopic}`);
  }

  /**
   * Create research task for parallel execution
   */
  createSubtopicTask(subtopic: string, parentTopic: string, storagePrefix: string): string {
    return `
Research subtopic: ${subtopic}
Parent topic: ${parentTopic}
Storage: ${storagePrefix}/${subtopic.replace(/\s+/g, '-').toLowerCase()}

RESEARCH METHODOLOGY:
1. Collect minimum 3+ independent authoritative sources per major claim
2. Document all contradictions and confidence levels
3. Mark all biases with [BiasType] where applicable
4. Provide citations to verify claims [URLs + access dates]

OUTPUT FILES:
- thinking.md: Your reasoning and methodology
- research.md: Raw findings organized by theme
- verification.md: Source credibility matrix
- insights.md: Key patterns and implications
- summary.md: Executive summary with confidence levels
`;
  }

  /**
   * Assess confidence level based on source agreement
   */
  assessConfidence(sources: ResearchSource[]): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (sources.length >= 3 && sources.every(s => s.confidenceLevel === 'HIGH')) {
      return 'HIGH';
    }
    if (sources.length >= 2) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * SEO-specific research domains
   */
  getSEOResearchDomains(): string[] {
    return [
      'Keyword research and search volume analysis',
      'SERP feature opportunities (featured snippets, PAA, etc.)',
      'Competitor content analysis',
      'User intent mapping',
      'Technical SEO requirements',
      'E-E-A-T signals and authority building',
      'Local SEO optimization',
      'Content freshness and update frequency',
    ];
  }

  /**
   * Generate research prompts for SEO topics
   */
  generateSEOResearchPrompt(keyword: string, locale: 'en' | 'ar' = 'en'): string {
    const localeContext = locale === 'ar'
      ? 'Focus on Arabic search patterns and Gulf region user behavior.'
      : 'Focus on UK/London search patterns and British English terminology.';

    return `
SEO Research Task: "${keyword}"

${localeContext}

Research Requirements:
1. KEYWORD ANALYSIS
   - Primary keyword variations and long-tails
   - Search volume estimates (if available)
   - Keyword difficulty assessment
   - Semantic keywords and LSI terms

2. SERP ANALYSIS
   - Current top 10 ranking pages
   - Featured snippet opportunities
   - People Also Ask questions
   - Related searches

3. CONTENT GAPS
   - What do top-ranking pages cover?
   - What angles are underserved?
   - What questions remain unanswered?

4. USER INTENT
   - Primary search intent
   - Secondary intents
   - User journey stage

5. AUTHORITY REQUIREMENTS
   - Domain authority of competitors
   - Backlink profile patterns
   - E-E-A-T signals needed

OUTPUT: Structured findings with confidence levels and source citations.
`;
  }

  /**
   * Store research output
   */
  storeFindings(topicId: string, output: ResearchOutput): void {
    this.findings.set(topicId, output);
  }

  /**
   * Retrieve research findings
   */
  getFindings(topicId: string): ResearchOutput | undefined {
    return this.findings.get(topicId);
  }
}

export const seoResearchSkill = new SEOResearchSkill();
