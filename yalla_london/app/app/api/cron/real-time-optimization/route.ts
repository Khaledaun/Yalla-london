export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { auditOnPublishUpdate } from '@/lib/audit-engine';

/**
 * Real-time optimization triggers
 * Monitors GA4 traffic and triggers SEO optimization when needed
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    
    // Get articles published in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentArticles = await prisma.article.findMany({
      where: {
        publishedAt: {
          gte: thirtyDaysAgo
        },
        status: 'published'
      },
      include: {
        seoData: true,
        analytics: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });

    let optimizationResults = {
      articles_checked: recentArticles.length,
      optimizations_triggered: 0,
      low_traffic_articles: 0,
      score_improvements: 0,
      errors: [] as Array<{ articleId: string; error: string }>
    };

    for (const article of recentArticles) {
      try {
        // Check if article has low traffic or declining performance
        const shouldOptimize = await checkIfOptimizationNeeded(article);
        
        if (shouldOptimize.trigger) {
          console.log(`Triggering optimization for article: ${article.title} (${shouldOptimize.reason})`);
          
          // Run SEO audit and auto-optimization
          const auditResult = await auditOnPublishUpdate(article.id, true);
          
          // Track the optimization
          await prisma.optimizationLog.create({
            data: {
              articleId: article.id,
              trigger: shouldOptimize.reason,
              beforeScore: article.lastAuditScore || 0,
              afterScore: auditResult.score,
              improvements: auditResult.metadata?.auto_fixes_applied || 0,
              metadata: {
                traffic_threshold: shouldOptimize.metrics?.traffic || 0,
                days_since_publish: shouldOptimize.metrics?.daysSincePublish || 0,
                audit_breakdown: auditResult.breakdown
              }
            }
          });
          
          optimizationResults.optimizations_triggered++;
          if (auditResult.score > (article.lastAuditScore || 0)) {
            optimizationResults.score_improvements++;
          }
          
          if (shouldOptimize.reason.includes('low_traffic')) {
            optimizationResults.low_traffic_articles++;
          }
        }
        
      } catch (error) {
        console.error(`Error optimizing article ${article.id}:`, error);
        optimizationResults.errors.push({
          articleId: article.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Send notification if significant optimizations occurred
    if (optimizationResults.optimizations_triggered > 5) {
      await sendOptimizationNotification(optimizationResults);
    }

    return NextResponse.json({
      success: true,
      results: optimizationResults,
      message: `Checked ${optimizationResults.articles_checked} articles, triggered ${optimizationResults.optimizations_triggered} optimizations`
    });

  } catch (error) {
    console.error('Real-time optimization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Optimization check failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Check if an article needs optimization based on performance metrics
 */
async function checkIfOptimizationNeeded(article: any): Promise<{
  trigger: boolean;
  reason: string;
  metrics?: any;
}> {
  const now = new Date();
  const publishDate = new Date(article.publishedAt);
  const daysSincePublish = Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Don't optimize articles published less than 7 days ago
  if (daysSincePublish < 7) {
    return { trigger: false, reason: 'too_recent' };
  }
  
  // Get latest analytics data
  const latestAnalytics = article.analytics?.[0];
  
  // Trigger optimization if traffic is very low after 7+ days
  if (daysSincePublish >= 7 && (!latestAnalytics || latestAnalytics.pageViews < 50)) {
    return { 
      trigger: true, 
      reason: 'low_traffic_after_week',
      metrics: {
        traffic: latestAnalytics?.pageViews || 0,
        daysSincePublish
      }
    };
  }
  
  // Trigger optimization if traffic declined significantly
  if (latestAnalytics && article.analytics?.length > 1) {
    const previousAnalytics = article.analytics[1];
    const trafficDecline = previousAnalytics.pageViews > 0 
      ? (previousAnalytics.pageViews - latestAnalytics.pageViews) / previousAnalytics.pageViews 
      : 0;
    
    if (trafficDecline > 0.5) { // 50% traffic decline
      return { 
        trigger: true, 
        reason: 'traffic_decline',
        metrics: {
          current_traffic: latestAnalytics.pageViews,
          previous_traffic: previousAnalytics.pageViews,
          decline_percentage: Math.round(trafficDecline * 100)
        }
      };
    }
  }
  
  // Trigger optimization if SEO score is low
  if (article.lastAuditScore && article.lastAuditScore < 70) {
    return { 
      trigger: true, 
      reason: 'low_seo_score',
      metrics: {
        current_score: article.lastAuditScore,
        daysSincePublish
      }
    };
  }
  
  // Trigger optimization for stale content (30+ days old, not optimized recently)
  const lastAuditDate = article.lastAuditDate ? new Date(article.lastAuditDate) : null;
  const daysSinceLastAudit = lastAuditDate 
    ? Math.floor((now.getTime() - lastAuditDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  
  if (daysSincePublish >= 30 && daysSinceLastAudit >= 14) {
    return { 
      trigger: true, 
      reason: 'stale_content_refresh',
      metrics: {
        daysSincePublish,
        daysSinceLastAudit
      }
    };
  }
  
  return { trigger: false, reason: 'no_optimization_needed' };
}

/**
 * Send notification about optimization results
 */
async function sendOptimizationNotification(results: any) {
  try {
    // In a real implementation, this would send to Slack/Discord/Email
    console.log('📊 SEO Optimization Report', {
      articles_optimized: results.optimizations_triggered,
      score_improvements: results.score_improvements,
      low_traffic_fixes: results.low_traffic_articles,
      timestamp: new Date().toISOString()
    });
    
    // Could integrate with existing notification system
    // await sendSlackNotification(results);
    // await sendEmailNotification(results);
    
  } catch (error) {
    console.error('Error sending optimization notification:', error);
  }
}