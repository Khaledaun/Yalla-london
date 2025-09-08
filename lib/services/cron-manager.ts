
/**
 * Phase 4B Cron Manager Service
 * Manages scheduled tasks and automation
 */
import * as cron from 'node-cron';
import { getFeatureFlags } from '@/config/feature-flags';
import { contentPipeline } from './content-pipeline';
import { prisma } from '@/lib/prisma';

export interface CronJob {
  id: string;
  name: string;
  schedule: string; // Cron expression
  description: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'idle' | 'error';
  task: () => Promise<void>;
}

export interface CronJobResult {
  jobId: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export class CronManagerService {
  private static instance: CronManagerService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private jobConfigs: Map<string, CronJob> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): CronManagerService {
    if (!CronManagerService.instance) {
      CronManagerService.instance = new CronManagerService();
    }
    return CronManagerService.instance;
  }

  /**
   * Initialize cron manager and register default jobs
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const flags = getFeatureFlags();
    if (!flags.PHASE4B_ENABLED) {
      console.log('Phase 4B features disabled, skipping cron initialization');
      return;
    }

    // Register default jobs
    await this.registerDefaultJobs();
    
    // Start enabled jobs
    await this.startEnabledJobs();
    
    this.isInitialized = true;
    console.log('Cron Manager initialized successfully');
  }

  /**
   * Register a new cron job
   */
  public registerJob(job: CronJob): void {
    this.jobConfigs.set(job.id, job);
    console.log(`Registered cron job: ${job.name} (${job.schedule})`);
  }

  /**
   * Start a specific job
   */
  public async startJob(jobId: string): Promise<boolean> {
    const jobConfig = this.jobConfigs.get(jobId);
    if (!jobConfig) {
      console.error(`Job ${jobId} not found`);
      return false;
    }

    if (this.jobs.has(jobId)) {
      console.log(`Job ${jobId} is already running`);
      return true;
    }

    try {
      const task = cron.schedule(jobConfig.schedule, async () => {
        await this.executeJob(jobId);
      }, {
        scheduled: false,
        timezone: 'Europe/London'
      });

      this.jobs.set(jobId, task);
      task.start();
      
      console.log(`Started cron job: ${jobConfig.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to start job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Stop a specific job
   */
  public stopJob(jobId: string): boolean {
    const task = this.jobs.get(jobId);
    if (!task) {
      return false;
    }

    task.stop();
    task.destroy();
    this.jobs.delete(jobId);
    
    console.log(`Stopped cron job: ${jobId}`);
    return true;
  }

  /**
   * Get status of all jobs
   */
  public getJobsStatus(): Array<{
    id: string;
    name: string;
    schedule: string;
    enabled: boolean;
    running: boolean;
    lastRun?: Date;
    nextRun?: Date;
    status: string;
  }> {
    return Array.from(this.jobConfigs.values()).map(job => ({
      id: job.id,
      name: job.name,
      schedule: job.schedule,
      enabled: job.enabled,
      running: this.jobs.has(job.id),
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      status: job.status,
    }));
  }

  /**
   * Enable/disable a job
   */
  public async toggleJob(jobId: string, enabled: boolean): Promise<boolean> {
    const jobConfig = this.jobConfigs.get(jobId);
    if (!jobConfig) {
      return false;
    }

    jobConfig.enabled = enabled;

    if (enabled) {
      return await this.startJob(jobId);
    } else {
      return this.stopJob(jobId);
    }
  }

  /**
   * Execute a job manually (outside of schedule)
   */
  public async runJobNow(jobId: string): Promise<CronJobResult> {
    return await this.executeJob(jobId, true);
  }

  /**
   * Private: Execute a job and handle logging
   */
  private async executeJob(jobId: string, manual = false): Promise<CronJobResult> {
    const jobConfig = this.jobConfigs.get(jobId);
    if (!jobConfig) {
      return {
        jobId,
        success: false,
        duration: 0,
        error: 'Job not found',
      };
    }

    const startTime = Date.now();
    let result: CronJobResult;

    try {
      console.log(`${manual ? 'Manually executing' : 'Executing scheduled'} job: ${jobConfig.name}`);
      
      // Update job status
      jobConfig.status = 'running';
      
      // Execute the task
      await jobConfig.task();
      
      const duration = Date.now() - startTime;
      console.log(`Job ${jobConfig.name} completed successfully in ${duration}ms`);
      
      // Update job status
      jobConfig.status = 'idle';
      jobConfig.lastRun = new Date();
      
      result = {
        jobId,
        success: true,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Job ${jobConfig.name} failed:`, error);
      
      // Update job status
      jobConfig.status = 'error';
      
      result = {
        jobId,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Log job execution
    await this.logJobExecution(jobId, result, manual);
    
    return result;
  }

  /**
   * Private: Register default system jobs
   */
  private async registerDefaultJobs(): Promise<void> {
    const flags = getFeatureFlags();

    // Content Pipeline Job - runs twice daily
    this.registerJob({
      id: 'content-pipeline',
      name: 'Content Pipeline Runner',
      schedule: '0 9,15 * * *', // 9 AM and 3 PM daily
      description: 'Automated content research, generation, and publishing',
      enabled: flags.CONTENT_SCHEDULING,
      status: 'idle',
      task: async () => {
        const result = await contentPipeline.runFullPipeline();
        console.log('Pipeline run completed:', result);
      },
    });

    // Topic Research Job - runs daily at 8 AM
    this.registerJob({
      id: 'topic-research',
      name: 'Topic Research',
      schedule: '0 8 * * *', // 8 AM daily
      description: 'Research new topics using Perplexity API',
      enabled: flags.TOPIC_RESEARCH,
      status: 'idle',
      task: async () => {
        const topics = await contentPipeline.runTopicResearch({
          categories: ['london_travel', 'london_events', 'london_hidden_gems'],
          locale: 'en',
          count: 5,
          priority: 'medium'
        });
        console.log(`Researched ${topics.length} new topics`);
      },
    });

    // Analytics Refresh Job - runs every 6 hours
    this.registerJob({
      id: 'analytics-refresh',
      name: 'Analytics Data Refresh',
      schedule: '0 */6 * * *', // Every 6 hours
      description: 'Refresh analytics data from Google Analytics and Search Console',
      enabled: flags.ANALYTICS_REFRESH,
      status: 'idle',
      task: async () => {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/phase4b/analytics/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'all' })
        });
        
        if (!response.ok) {
          throw new Error(`Analytics refresh failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Analytics refreshed:', data.summary);
      },
    });

    // SEO Audit Job - runs daily at 2 AM
    this.registerJob({
      id: 'seo-audit',
      name: 'Batch SEO Audit',
      schedule: '0 2 * * *', // 2 AM daily
      description: 'Run SEO audits on recent content',
      enabled: flags.SEO_AUTOMATION,
      status: 'idle',
      task: async () => {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/phase4b/seo/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'batch' })
        });
        
        if (!response.ok) {
          throw new Error(`SEO audit failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('SEO audit completed:', data.summary);
      },
    });

    // Database Cleanup Job - runs weekly
    this.registerJob({
      id: 'database-cleanup',
      name: 'Database Cleanup',
      schedule: '0 3 * * 0', // 3 AM every Sunday
      description: 'Clean up old logs and temporary data',
      enabled: true,
      status: 'idle',
      task: async () => {
        // Clean up old activity logs (older than 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const deletedLogs = await prisma.activityLog.deleteMany({
          where: {
            createdAt: { lt: ninetyDaysAgo }
          }
        });
        
        console.log(`Cleaned up ${deletedLogs.count} old activity logs`);
      },
    });
  }

  /**
   * Private: Start all enabled jobs
   */
  private async startEnabledJobs(): Promise<void> {
    for (const [jobId, jobConfig] of this.jobConfigs.entries()) {
      if (jobConfig.enabled) {
        await this.startJob(jobId);
      }
    }
  }

  /**
   * Private: Log job execution to database
   */
  private async logJobExecution(jobId: string, result: CronJobResult, manual: boolean): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          action: manual ? 'cron_job_manual' : 'cron_job_scheduled',
          entityType: 'cron',
          entityId: jobId,
          details: {
            jobId,
            success: result.success,
            duration: result.duration,
            error: result.error,
            timestamp: new Date().toISOString(),
            manual,
          },
          performedBy: 'system',
        }
      });
    } catch (error) {
      console.error('Failed to log job execution:', error);
    }
  }

  /**
   * Shutdown all jobs
   */
  public shutdown(): void {
    console.log('Shutting down cron manager...');
    
    for (const [jobId, task] of this.jobs.entries()) {
      task.stop();
      task.destroy();
      console.log(`Stopped job: ${jobId}`);
    }
    
    this.jobs.clear();
    console.log('Cron manager shutdown complete');
  }
}

// Export singleton instance
export const cronManager = CronManagerService.getInstance();

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  cronManager.initialize().catch(console.error);
}
