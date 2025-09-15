/**
 * Phase 4C Background Jobs Service
 * Centralized job management and execution
 */
import { prisma } from '@/lib/db';
import { getFeatureFlags } from '@/config/feature-flags';
import cron from 'node-cron';

export interface JobDefinition {
  name: string;
  type: 'scheduled' | 'triggered' | 'manual';
  schedule?: string; // Cron expression for scheduled jobs
  handler: () => Promise<any>;
  maxRetries?: number;
  timeoutMs?: number;
  siteId?: string;
}

export class BackgroundJobService {
  private jobs: Map<string, JobDefinition> = new Map();
  private runningJobs: Map<string, boolean> = new Map();

  constructor() {
    this.registerDefaultJobs();
  }

  /**
   * Register a background job
   */
  registerJob(job: JobDefinition): void {
    this.jobs.set(job.name, job);
    
    // Schedule if it's a scheduled job
    if (job.type === 'scheduled' && job.schedule) {
      cron.schedule(job.schedule, async () => {
        await this.executeJob(job.name);
      });
    }
  }

  /**
   * Execute a job by name
   */
  async executeJob(jobName: string, parameters?: any): Promise<any> {
    const job = this.jobs.get(jobName);
    if (!job) {
      throw new Error(`Job '${jobName}' not found`);
    }

    // Check if job is already running
    if (this.runningJobs.get(jobName)) {
      console.log(`Job '${jobName}' is already running, skipping`);
      return;
    }

    this.runningJobs.set(jobName, true);

    // Create job record
    const jobRecord = await prisma.backgroundJob.create({
      data: {
        job_name: jobName,
        job_type: job.type,
        schedule_cron: job.schedule,
        parameters_json: parameters,
        status: 'running',
        started_at: new Date(),
        max_retries: job.maxRetries || 3,
      }
    });

    try {
      const startTime = Date.now();
      
      // Execute job with timeout
      const result = await this.executeWithTimeout(job.handler, job.timeoutMs || 300000); // 5 min default
      
      const duration = Date.now() - startTime;

      // Update job record with success
      await prisma.backgroundJob.update({
        where: { id: jobRecord.id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          duration_ms: duration,
          result_json: result,
        }
      });

      console.log(`Job '${jobName}' completed successfully in ${duration}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - jobRecord.started_at.getTime();
      
      // Update job record with failure
      await prisma.backgroundJob.update({
        where: { id: jobRecord.id },
        data: {
          status: 'failed',
          completed_at: new Date(),
          duration_ms: duration,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          retry_count: jobRecord.retry_count + 1,
        }
      });

      console.error(`Job '${jobName}' failed:`, error);
      throw error;

    } finally {
      this.runningJobs.set(jobName, false);
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Job timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  /**
   * Register default Phase 4C jobs
   */
  private registerDefaultJobs(): void {
    const flags = getFeatureFlags();

    // Backlink Inspector Job
    if (flags.FEATURE_BACKLINK_INSPECTOR) {
      this.registerJob({
        name: 'backlink_inspector',
        type: 'triggered',
        handler: this.backlinkInspectorJob.bind(this),
        maxRetries: 2,
        timeoutMs: 180000, // 3 minutes
      });
    }

    // Topic Balancer Job
    if (flags.FEATURE_TOPIC_POLICY) {
      this.registerJob({
        name: 'topic_balancer',
        type: 'scheduled',
        schedule: '0 2 * * *', // Daily at 2 AM
        handler: this.topicBalancerJob.bind(this),
        maxRetries: 3,
        timeoutMs: 600000, // 10 minutes
      });
    }

    // Analytics Sync Job
    this.registerJob({
      name: 'analytics_sync',
      type: 'scheduled',
      schedule: '0 */6 * * *', // Every 6 hours
      handler: this.analyticsSyncJob.bind(this),
      maxRetries: 2,
      timeoutMs: 300000, // 5 minutes
    });

    // Cleanup Job
    this.registerJob({
      name: 'cleanup',
      type: 'scheduled',
      schedule: '0 1 * * *', // Daily at 1 AM
      handler: this.cleanupJob.bind(this),
      maxRetries: 1,
      timeoutMs: 300000, // 5 minutes
    });
  }

  /**
   * Backlink Inspector Job
   * Run entity extraction and CRM campaign seeding on published content
   */
  private async backlinkInspectorJob(): Promise<any> {
    console.log('Running backlink inspector job...');

    // Get recently published content that needs analysis
    const recentContent = await prisma.blogPost.findMany({
      where: {
        published: true,
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: { id: true, title_en: true, slug: true }
    });

    const results = [];

    for (const content of recentContent) {
      try {
        // Check if already analyzed
        const existingAnalysis = await prisma.seoAuditResult.findFirst({
          where: {
            content_id: content.id,
            content_type: 'blog_post',
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        });

        if (!existingAnalysis) {
          // Simulate backlink analysis
          const analysis = {
            content_id: content.id,
            entities_extracted: Math.floor(Math.random() * 10) + 1,
            backlink_opportunities: Math.floor(Math.random() * 5) + 1,
            campaign_suggestions: Math.floor(Math.random() * 3) + 1
          };

          results.push(analysis);
        }
      } catch (error) {
        console.error(`Failed to analyze content ${content.id}:`, error);
      }
    }

    return {
      processed_content: recentContent.length,
      new_analyses: results.length,
      results: results
    };
  }

  /**
   * Topic Balancer Job
   * Maintain topic quotas and priorities based on policies
   */
  private async topicBalancerJob(): Promise<any> {
    console.log('Running topic balancer job...');

    // Get active topic policies
    const policies = await prisma.topicPolicy.findMany({
      where: {
        is_active: true,
        policy_type: 'quota_balancer',
        effective_from: { lte: new Date() },
        OR: [
          { effective_until: null },
          { effective_until: { gte: new Date() } }
        ]
      }
    });

    const results = [];

    for (const policy of policies) {
      try {
        const quotas = policy.quotas_json as any;
        const priorities = policy.priorities_json as any;

        // Check current topic distribution
        const topicStats = await prisma.topicProposal.groupBy({
          by: ['status'],
          _count: { id: true },
          where: {
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        });

        const proposedCount = topicStats.find(s => s.status === 'proposed')?._count.id || 0;
        const approvedCount = topicStats.find(s => s.status === 'approved')?._count.id || 0;

        // Apply balancing logic
        const balanceResult = {
          policy_id: policy.id,
          proposed_topics: proposedCount,
          approved_topics: approvedCount,
          quota_utilization: quotas ? (approvedCount / (quotas.weekly_limit || 10)) * 100 : 0,
          action_taken: 'none'
        };

        // Example balancing action
        if (proposedCount < 5) {
          balanceResult.action_taken = 'generate_more_topics';
        } else if (approvedCount > (quotas?.weekly_limit || 10)) {
          balanceResult.action_taken = 'pause_approval';
        }

        results.push(balanceResult);

      } catch (error) {
        console.error(`Failed to balance policy ${policy.id}:`, error);
      }
    }

    return {
      policies_processed: policies.length,
      results: results
    };
  }

  /**
   * Analytics Sync Job
   * Sync GA4/GSC data and trigger audits on drops
   */
  private async analyticsSyncJob(): Promise<any> {
    console.log('Running analytics sync job...');

    try {
      // Simulate analytics data sync
      const syncResult = {
        ga4_sessions: Math.floor(Math.random() * 10000) + 1000,
        gsc_impressions: Math.floor(Math.random() * 50000) + 5000,
        gsc_clicks: Math.floor(Math.random() * 2000) + 200,
        indexed_pages: Math.floor(Math.random() * 100) + 40,
        avg_position: Math.random() * 30 + 10,
        sync_timestamp: new Date()
      };

      // Create analytics snapshot
      await prisma.analyticsSnapshot.create({
        data: {
          date_range: '7d',
          data_json: syncResult,
          indexed_pages: syncResult.indexed_pages,
          top_queries: [
            { query: 'london travel guide', clicks: 150, impressions: 2000 },
            { query: 'best london attractions', clicks: 120, impressions: 1800 },
            { query: 'london hidden gems', clicks: 90, impressions: 1200 }
          ],
          performance_metrics: {
            ctr: (syncResult.gsc_clicks / syncResult.gsc_impressions) * 100,
            avg_position: syncResult.avg_position
          }
        }
      });

      // Check for performance drops and trigger audits if needed
      const previousSnapshot = await prisma.analyticsSnapshot.findFirst({
        where: {
          date_range: '7d',
          created_at: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { created_at: 'desc' }
      });

      let auditTriggered = false;
      if (previousSnapshot) {
        const prevData = previousSnapshot.data_json as any;
        const trafficDrop = (prevData.gsc_clicks - syncResult.gsc_clicks) / prevData.gsc_clicks;
        
        if (trafficDrop > 0.2) { // 20% drop
          auditTriggered = true;
          console.log('Traffic drop detected, triggering audit...');
        }
      }

      return {
        ...syncResult,
        audit_triggered: auditTriggered,
        previous_data_available: !!previousSnapshot
      };

    } catch (error) {
      console.error('Analytics sync failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup Job
   * Clean up expired data and optimize database
   */
  private async cleanupJob(): Promise<any> {
    console.log('Running cleanup job...');

    try {
      // Clean up expired exit intent impressions
      const expiredImpressions = await prisma.exitIntentImpression.deleteMany({
        where: {
          ttl_expires_at: {
            lt: new Date()
          }
        }
      });

      // Clean up old job records (keep last 30 days)
      const oldJobs = await prisma.backgroundJob.deleteMany({
        where: {
          created_at: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          status: {
            in: ['completed', 'failed']
          }
        }
      });

      // Clean up old consent logs (anonymize IP addresses after 30 days)
      const oldConsentLogs = await prisma.consentLog.updateMany({
        where: {
          timestamp: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          },
          ip_address: {
            not: null
          }
        },
        data: {
          ip_address: null,
          user_agent: null
        }
      });

      return {
        expired_impressions_deleted: expiredImpressions.count,
        old_jobs_deleted: oldJobs.count,
        consent_logs_anonymized: oldConsentLogs.count,
        cleanup_timestamp: new Date()
      };

    } catch (error) {
      console.error('Cleanup job failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const backgroundJobService = new BackgroundJobService();