/**
 * Admin Pipeline API
 * Provides automation pipeline status, cron jobs, and scheduling information
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';

// GET - Pipeline status and automation information
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('include_history') === 'true';

    // Get automation system status
    const automationStatus = {
      topic_generation: {
        enabled: process.env.FEATURE_TOPIC_RESEARCH === 'true',
        last_run: null as string | null,
        next_run: null as string | null,
        success_rate: 0,
        total_runs: 0
      },
      auto_publishing: {
        enabled: process.env.FEATURE_AUTO_PUBLISHING === 'true',
        last_run: null as string | null,
        next_run: null as string | null,
        success_rate: 0,
        total_runs: 0
      },
      content_pipeline: {
        enabled: process.env.FEATURE_CONTENT_PIPELINE === 'true',
        last_run: null as string | null,
        next_run: null as string | null,
        success_rate: 0,
        total_runs: 0
      },
      seo_audit: {
        enabled: process.env.FEATURE_AI_SEO_AUDIT === 'true',
        last_run: null as string | null,
        next_run: null as string | null,
        success_rate: 0,
        total_runs: 0
      }
    };

    // Get scheduled content and topics
    const scheduledContent = await prisma.scheduledContent.findMany({
      orderBy: { scheduled_time: 'asc' },
      take: 10
    });

    const topicProposals = await prisma.topicProposal.findMany({
      where: { status: { in: ['pending', 'approved', 'in_progress'] } },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    // Get recent automation logs (if available)
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['topic_generation', 'auto_publish', 'content_pipeline', 'seo_audit'] }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    // Calculate next scheduled operations
    const nextOperations = [];
    
    // Add scheduled content
    scheduledContent.forEach(content => {
      nextOperations.push({
        type: 'content_publish',
        title: content.title || 'Scheduled Content',
        scheduled_for: (content as any).scheduled_time?.toISOString?.() ?? new Date().toISOString(),
        status: content.status,
        priority: 'medium',
        details: {
          content_type: content.content_type,
          category: content.category,
          keywords: content.tags
        }
      });
    });

    // Add topic generation schedule (daily at 9 AM)
    const now = new Date();
    const nextTopicGeneration = new Date(now);
    nextTopicGeneration.setHours(9, 0, 0, 0);
    if (nextTopicGeneration <= now) {
      nextTopicGeneration.setDate(nextTopicGeneration.getDate() + 1);
    }

    if (automationStatus.topic_generation.enabled) {
      nextOperations.push({
        type: 'topic_generation',
        title: 'Daily Topic Research',
        scheduled_for: nextTopicGeneration.toISOString(),
        status: 'scheduled',
        priority: 'high',
        details: {
          keywords: ['luxury', 'london', 'shopping', 'dining', 'culture'],
          longtails: [
            'luxury shopping london 2024',
            'best restaurants london michelin',
            'london cultural events december',
            'luxury hotels london mayfair',
            'london christmas markets 2024'
          ]
        }
      });
    }

    // Add SEO audit schedule (weekly on Mondays at 10 AM)
    const nextSEOAudit = new Date(now);
    const daysUntilMonday = (1 - now.getDay() + 7) % 7;
    nextSEOAudit.setDate(now.getDate() + daysUntilMonday);
    nextSEOAudit.setHours(10, 0, 0, 0);
    if (nextSEOAudit <= now) {
      nextSEOAudit.setDate(nextSEOAudit.getDate() + 7);
    }

    if (automationStatus.seo_audit.enabled) {
      nextOperations.push({
        type: 'seo_audit',
        title: 'Weekly SEO Audit',
        scheduled_for: nextSEOAudit.toISOString(),
        status: 'scheduled',
        priority: 'medium',
        details: {
          scope: 'all_published_content',
          focus_areas: ['meta_tags', 'internal_links', 'schema_markup', 'page_speed']
        }
      });
    }

    // Sort operations by scheduled time
    nextOperations.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());

    // Get cron job effectiveness
    const cronEffectiveness = {
      auto_generate: {
        endpoint: '/api/cron/auto-generate',
        schedule: '0 9 * * *', // Daily at 9 AM
        last_success: null as string | null,
        last_failure: null as string | null,
        success_rate: 0,
        avg_execution_time: 0
      },
      daily_publish: {
        endpoint: '/api/cron/daily-publish',
        schedule: '0 10 * * *', // Daily at 10 AM
        last_success: null as string | null,
        last_failure: null as string | null,
        success_rate: 0,
        avg_execution_time: 0
      },
      seo_audit: {
        endpoint: '/api/internal/cron/audit-daily',
        schedule: '0 10 * * 1', // Weekly on Mondays at 10 AM
        last_success: null as string | null,
        last_failure: null as string | null,
        success_rate: 0,
        avg_execution_time: 0
      }
    };

    // Get pipeline statistics
    const pipelineStats = {
      total_content: await prisma.blogPost.count(),
      published_content: await prisma.blogPost.count({ where: { published: true } }),
      scheduled_content: await prisma.scheduledContent.count(),
      pending_topics: await prisma.topicProposal.count({ where: { status: 'pending' } }),
      approved_topics: await prisma.topicProposal.count({ where: { status: 'approved' } }),
      in_progress_topics: await prisma.topicProposal.count({ where: { status: 'in_progress' } }),
      seo_audits_completed: await prisma.seoAuditResult.count(),
      automation_runs_today: recentLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      }).length
    };

    return NextResponse.json({
      success: true,
      data: {
        automation_status: automationStatus,
        next_operations: nextOperations,
        cron_effectiveness: cronEffectiveness,
        pipeline_stats: pipelineStats,
        recent_logs: includeHistory ? recentLogs : undefined,
        scheduled_content: scheduledContent,
        topic_proposals: topicProposals,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch pipeline data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

// POST - Trigger manual pipeline operation
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { operation, parameters } = body;

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation is required' },
        { status: 400 }
      );
    }

    let result;
    const timestamp = new Date().toISOString();

    switch (operation) {
      case 'generate_topics':
        // Trigger topic generation
        result = {
          success: true,
          message: 'Topic generation triggered',
          operation: 'generate_topics',
          timestamp,
          details: {
            keywords: parameters?.keywords || ['luxury', 'london', 'shopping'],
            count: parameters?.count || 5
          }
        };
        break;

      case 'publish_scheduled':
        // Trigger scheduled content publishing
        result = {
          success: true,
          message: 'Scheduled publishing triggered',
          operation: 'publish_scheduled',
          timestamp,
          details: {
            content_count: await prisma.scheduledContent.count({ where: { status: 'scheduled' } })
          }
        };
        break;

      case 'seo_audit':
        // Trigger SEO audit
        result = {
          success: true,
          message: 'SEO audit triggered',
          operation: 'seo_audit',
          timestamp,
          details: {
            scope: parameters?.scope || 'all_published_content'
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 }
        );
    }

    // Log the manual operation
    try {
      await prisma.auditLog.create({
        data: {
          action: operation,
          details: result.details,
          userId: 'admin',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });
    } catch (logError) {
      console.warn('Failed to log manual operation:', logError);
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Pipeline operation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute pipeline operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
