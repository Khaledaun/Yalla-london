
/**
 * Phase 4B Content Pipeline Service
 * Orchestrates automated content creation workflow
 */
import { prisma } from '@/lib/prisma';
import { getFeatureFlags } from '@/config/feature-flags';

export interface PipelineConfig {
  postsPerDay: number;
  locales: string[];
  contentTypes: string[];
  categories: string[];
  draftBacklogTarget: number;
  qualityThreshold: number;
  autoPublish: boolean;
}

export interface PipelineStatus {
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  draftsCount: number;
  scheduledCount: number;
  publishedToday: number;
  errors: string[];
  performance: {
    successRate: number;
    avgGenerationTime: number;
    qualityScore: number;
  };
}

export interface TopicResearchRequest {
  categories: string[];
  locale: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
}

export class ContentPipelineService {
  private static instance: ContentPipelineService;
  private isInitialized = false;
  private config: PipelineConfig;

  private constructor() {
    this.config = {
      postsPerDay: 2,
      locales: ['en', 'ar'],
      contentTypes: ['article', 'guide', 'list'],
      categories: ['london_travel', 'london_events', 'london_football', 'london_hidden_gems'],
      draftBacklogTarget: 30,
      qualityThreshold: 70,
      autoPublish: false,
    };
  }

  public static getInstance(): ContentPipelineService {
    if (!ContentPipelineService.instance) {
      ContentPipelineService.instance = new ContentPipelineService();
    }
    return ContentPipelineService.instance;
  }

  /**
   * Initialize the content pipeline
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const flags = getFeatureFlags();
    if (!flags.PHASE4B_ENABLED) {
      throw new Error('Phase 4B features are disabled');
    }

    // Update configuration from environment/database
    await this.loadConfiguration();
    this.isInitialized = true;
  }

  /**
   * Get current pipeline status
   */
  public async getStatus(): Promise<PipelineStatus> {
    await this.initialize();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get counts
    const [draftsCount, scheduledCount, publishedToday] = await Promise.all([
      prisma.content.count({
        where: { status: 'draft', metadata: { path: ['aiGenerated'], equals: true } }
      }),
      prisma.content.count({
        where: { status: 'scheduled' }
      }),
      prisma.content.count({
        where: {
          status: 'published',
          publishedAt: { gte: today, lt: tomorrow }
        }
      })
    ]);

    // Get recent pipeline runs
    const recentRuns = await prisma.activityLog.findMany({
      where: {
        action: { in: ['pipeline_run', 'content_generated', 'content_published'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const lastRun = recentRuns.find(r => r.action === 'pipeline_run')?.createdAt || null;
    const errors = recentRuns
      .filter(r => r.details && (r.details as any).error)
      .map(r => (r.details as any).error)
      .slice(0, 5);

    // Calculate performance metrics
    const generationRuns = recentRuns.filter(r => r.action === 'content_generated');
    const publishRuns = recentRuns.filter(r => r.action === 'content_published');
    const successRate = generationRuns.length > 0 
      ? (publishRuns.length / generationRuns.length) * 100 
      : 0;

    // Calculate next run time (assuming daily runs at 9 AM)
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(9, 0, 0, 0);

    return {
      isRunning: false, // This would be tracked in a real system
      lastRun,
      nextRun,
      draftsCount,
      scheduledCount,
      publishedToday,
      errors,
      performance: {
        successRate: Math.round(successRate * 100) / 100,
        avgGenerationTime: 45, // seconds - would be calculated from actual data
        qualityScore: 85, // would be calculated from SEO audits
      }
    };
  }

  /**
   * Run topic research for multiple categories
   */
  public async runTopicResearch(request: TopicResearchRequest): Promise<any[]> {
    await this.initialize();

    const flags = getFeatureFlags();
    if (!flags.TOPIC_RESEARCH) {
      throw new Error('Topic research is disabled');
    }

    try {
      const topics = [];
      
      for (const category of request.categories) {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/phase4b/topics/research`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            locale: request.locale,
          })
        });

        if (response.ok) {
          const data = await response.json();
          topics.push(...(data.topics || []));
        }
      }

      // Log the research activity
      await prisma.activityLog.create({
        data: {
          action: 'topic_research_completed',
          entityType: 'pipeline',
          details: {
            categoriesResearched: request.categories,
            topicsFound: topics.length,
            locale: request.locale,
          },
          performedBy: 'system',
        }
      });

      return topics;
    } catch (error) {
      console.error('Topic research failed:', error);
      throw error;
    }
  }

  /**
   * Generate content from approved topics
   */
  public async generateContentFromTopics(limit: number = 5): Promise<any[]> {
    await this.initialize();

    const flags = getFeatureFlags();
    if (!flags.AUTO_CONTENT_GENERATION) {
      throw new Error('Auto content generation is disabled');
    }

    try {
      // Get approved topics that haven't been used
      const availableTopics = await prisma.topicProposal.findMany({
        where: { 
          status: 'approved',
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        take: limit
      });

      const generatedContent = [];

      for (const topic of availableTopics) {
        try {
          const contentType = this.selectContentType(topic);
          
          const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/phase4b/content/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicId: topic.id,
              contentType,
              locale: topic.locale,
            })
          });

          if (response.ok) {
            const data = await response.json();
            generatedContent.push(data.draft);
          }
        } catch (error) {
          console.error(`Failed to generate content for topic ${topic.id}:`, error);
        }
      }

      return generatedContent;
    } catch (error) {
      console.error('Content generation failed:', error);
      throw error;
    }
  }

  /**
   * Run the complete pipeline cycle
   */
  public async runFullPipeline(): Promise<{
    topicsResearched: number;
    contentGenerated: number;
    contentPublished: number;
    errors: string[];
  }> {
    await this.initialize();

    const startTime = Date.now();
    const errors: string[] = [];
    let topicsResearched = 0;
    let contentGenerated = 0;
    let contentPublished = 0;

    try {
      // Log pipeline start
      await prisma.activityLog.create({
        data: {
          action: 'pipeline_run',
          entityType: 'pipeline',
          details: { status: 'started', timestamp: new Date().toISOString() },
          performedBy: 'system',
        }
      });

      // Step 1: Research topics if backlog is low
      const status = await this.getStatus();
      if (status.draftsCount < this.config.draftBacklogTarget) {
        try {
          const topics = await this.runTopicResearch({
            categories: this.config.categories,
            locale: 'en', // TODO: Support multiple locales
            count: 5,
            priority: 'medium'
          });
          topicsResearched = topics.length;
        } catch (error) {
          errors.push(`Topic research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 2: Generate content from approved topics
      try {
        const content = await this.generateContentFromTopics(3);
        contentGenerated = content.length;
      } catch (error) {
        errors.push(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Step 3: Auto-publish if enabled and content passes quality gates
      const flags = getFeatureFlags();
      if (flags.AUTO_PUBLISHING && this.config.autoPublish) {
        try {
          const readyDrafts = await prisma.content.findMany({
            where: {
              status: 'draft',
              metadata: {
                path: ['needsReview'],
                equals: false
              }
            },
            take: this.config.postsPerDay
          });

          for (const draft of readyDrafts) {
            try {
              const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/phase4b/content/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contentId: draft.id,
                  skipSeoAudit: false
                })
              });

              if (response.ok) {
                contentPublished++;
              }
            } catch (error) {
              errors.push(`Publishing failed for ${draft.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        } catch (error) {
          errors.push(`Auto-publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Log pipeline completion
      await prisma.activityLog.create({
        data: {
          action: 'pipeline_run',
          entityType: 'pipeline',
          details: {
            status: 'completed',
            duration: Date.now() - startTime,
            topicsResearched,
            contentGenerated,
            contentPublished,
            errors: errors.length,
          },
          performedBy: 'system',
        }
      });

    } catch (error) {
      errors.push(`Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Log pipeline failure
      await prisma.activityLog.create({
        data: {
          action: 'pipeline_run',
          entityType: 'pipeline',
          details: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
          },
          performedBy: 'system',
        }
      });
    }

    return {
      topicsResearched,
      contentGenerated,
      contentPublished,
      errors,
    };
  }

  /**
   * Update pipeline configuration
   */
  public async updateConfiguration(newConfig: Partial<PipelineConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to database or environment
    // This would persist the configuration for future runs
  }

  /**
   * Load configuration from database/environment
   */
  private async loadConfiguration(): Promise<void> {
    // Load from environment variables or database
    if (process.env.PIPELINE_POSTS_PER_DAY) {
      this.config.postsPerDay = parseInt(process.env.PIPELINE_POSTS_PER_DAY);
    }
    if (process.env.PIPELINE_AUTO_PUBLISH) {
      this.config.autoPublish = process.env.PIPELINE_AUTO_PUBLISH === 'true';
    }
    // Add more configuration loading as needed
  }

  /**
   * Select appropriate content type for a topic
   */
  private selectContentType(topic: any): string {
    // Simple logic to determine content type based on topic characteristics
    const title = topic.title.toLowerCase();
    
    if (title.includes('guide') || title.includes('how to')) {
      return 'guide';
    } else if (title.includes('best') || title.includes('top') || /\d+/.test(title)) {
      return 'list';
    } else {
      return 'article';
    }
  }
}

// Export singleton instance
export const contentPipeline = ContentPipelineService.getInstance();
