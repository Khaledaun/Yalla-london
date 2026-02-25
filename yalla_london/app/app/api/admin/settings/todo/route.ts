/**
 * Settings Todo API
 * Generates a dynamic list of action items from system state.
 * Checks: pending DB migrations, missing env vars, failing crons, pipeline health.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
import { getActiveSiteIds } from '@/config/sites';

interface TodoItem {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'database' | 'pipeline' | 'config' | 'security' | 'content' | 'seo';
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
  actionApi?: string;
  actionPayload?: Record<string, unknown>;
  instructions?: string[];
  resolved: boolean;
}

const CRITICAL_ENV_VARS = [
  { key: 'DATABASE_URL', description: 'Database connection string' },
  { key: 'NEXTAUTH_SECRET', description: 'Authentication secret' },
  { key: 'NEXTAUTH_URL', description: 'App public URL' },
];

const IMPORTANT_ENV_VARS = [
  { key: 'INDEXNOW_KEY', description: 'IndexNow for Google/Bing submission' },
  { key: 'GROK_API_KEY', description: 'xAI Grok for content generation' },
  { key: 'ENCRYPTION_KEY', description: 'API key encryption' },
];

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const todos: TodoItem[] = [];

  try {
    // ── 1. Check pipeline health ───────────────────────────────────────────
    const [draftCount, topicCount, publishedToday] = await Promise.allSettled([
      // ArticleDraft uses current_phase (snake_case)
      prisma.articleDraft.count({ where: { current_phase: { in: ['research', 'outline', 'drafting'] } } }),
      prisma.topicProposal.count({ where: { status: 'pending' } }),
      // BlogPost uses published Boolean and created_at (snake_case)
      prisma.blogPost.count({
        where: {
          published: true,
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const drafts = draftCount.status === 'fulfilled' ? draftCount.value : 0;
    const topics = topicCount.status === 'fulfilled' ? topicCount.value : 0;
    const todayPubs = publishedToday.status === 'fulfilled' ? publishedToday.value : 0;

    if (topics === 0) {
      todos.push({
        id: 'no-topics',
        priority: 'high',
        category: 'pipeline',
        title: 'No topics in queue',
        description: 'The content pipeline has no topics to process. Run the weekly topic research cron to generate new topics.',
        actionLabel: 'Generate Topics Now',
        actionApi: '/api/cron/weekly-topics',
        actionPayload: { manual: true },
        resolved: false,
      });
    }

    if (drafts === 0 && topics > 0) {
      todos.push({
        id: 'no-drafts',
        priority: 'medium',
        category: 'pipeline',
        title: 'Topics waiting — no drafts building',
        description: `${topics} topics are queued but content builder hasn't started. Trigger the content builder.`,
        actionLabel: 'Run Content Builder',
        actionApi: '/api/cron/content-builder',
        actionPayload: { manual: true },
        resolved: false,
      });
    }

    if (todayPubs === 0) {
      todos.push({
        id: 'zero-published-today',
        priority: 'medium',
        category: 'content',
        title: 'Zero articles published today',
        description: 'No articles have been published in the last 24 hours. Check the content pipeline or publish ready drafts.',
        actionLabel: 'Publish Ready Articles',
        actionUrl: '/admin/content?tab=generation',
        resolved: false,
      });
    }

    // ── 2. Check cron health ─────────────────────────────────────────────────
    const criticalJobs = ['weekly-topics', 'daily-content-generate', 'content-builder', 'content-selector'];

    for (const jobName of criticalJobs) {
      const lastRun = await prisma.cronJobLog.findFirst({
        where: { job_name: jobName },
        orderBy: { started_at: 'desc' },
      }).catch(() => null);

      if (!lastRun) {
        todos.push({
          id: `cron-never-run-${jobName}`,
          priority: 'high',
          category: 'pipeline',
          title: `Cron "${jobName}" has never run`,
          description: 'This critical cron job has no run history. Check vercel.json schedule and cron secret config.',
          actionLabel: 'View Cron Logs',
          actionUrl: '/admin/cron-logs',
          resolved: false,
        });
      } else if (lastRun.status === 'failed') {
        todos.push({
          id: `cron-failed-${jobName}`,
          priority: 'critical',
          category: 'pipeline',
          title: `Cron "${jobName}" last run FAILED`,
          description: lastRun.error_message || 'No error details available.',
          actionLabel: 'View Details',
          actionUrl: '/admin/cron-logs',
          resolved: false,
        });
      }
    }

    // ── 3. Check AI provider configuration ────────────────────────────────
    const providerCount = await prisma.modelProvider.count({ where: { is_active: true } }).catch(() => 0);
    if (providerCount === 0) {
      todos.push({
        id: 'no-ai-providers',
        priority: 'high',
        category: 'config',
        title: 'No AI providers configured',
        description: 'Add at least one AI provider (xAI Grok, Claude, OpenAI, etc.) to enable content generation.',
        actionLabel: 'Configure AI Models',
        actionUrl: '/admin/settings?tab=ai-models',
        resolved: false,
      });
    }

    // Check if GROK_API_KEY is set (primary content provider)
    if (!process.env.GROK_API_KEY) {
      todos.push({
        id: 'missing-grok-key',
        priority: 'critical',
        category: 'config',
        title: 'xAI Grok API key missing',
        description: 'GROK_API_KEY is not set. This is the primary content generation model. Content pipeline will fail.',
        actionLabel: 'Add API Key',
        actionUrl: '/admin/settings?tab=ai-models',
        instructions: [
          '1. Get your Grok API key from console.x.ai',
          '2. Add GROK_API_KEY to your Vercel environment variables',
          '3. Redeploy the app for the key to take effect',
          '4. Add the key to the AI Models tab to test connectivity',
        ],
        resolved: false,
      });
    }

    // ── 4. Check IndexNow ──────────────────────────────────────────────────
    if (!process.env.INDEXNOW_KEY) {
      todos.push({
        id: 'missing-indexnow',
        priority: 'high',
        category: 'seo',
        title: 'IndexNow key missing',
        description: 'INDEXNOW_KEY is not set. Articles will not be submitted to Google/Bing for indexing.',
        actionLabel: 'Configure Indexing',
        actionUrl: '/admin/settings?tab=variable-vault',
        instructions: [
          '1. Generate a key at https://www.indexnow.org/faq',
          '2. Add INDEXNOW_KEY to Vercel environment variables',
          '3. Create /[key].txt file in public folder (already automated)',
        ],
        resolved: false,
      });
    }

    // ── 5. Check for unindexed published posts ────────────────────────────
    // URLIndexingStatus tracks indexing per URL; count discovered (not yet submitted)
    const unindexedCount = await prisma.uRLIndexingStatus.count({
      where: { status: 'discovered' },
    }).catch(() => null);

    if (unindexedCount !== null && unindexedCount > 5) {
      todos.push({
        id: 'unindexed-posts',
        priority: 'medium',
        category: 'seo',
        title: `${unindexedCount} published articles not submitted for indexing`,
        description: 'These articles are live but Google hasn\'t been told about them.',
        actionLabel: 'Submit All to IndexNow',
        actionUrl: '/admin/content?tab=indexing',
        resolved: false,
      });
    }

    // ── 6. Check sites have content ───────────────────────────────────────
    const activeSites = getActiveSiteIds();
    for (const siteId of activeSites) {
      const count = await prisma.blogPost.count({
        where: { siteId, published: true },
      }).catch(() => 0);

      if (count === 0) {
        todos.push({
          id: `no-content-${siteId}`,
          priority: 'medium',
          category: 'content',
          title: `${siteId}: No published articles`,
          description: `Site ${siteId} has no published content. Start the content pipeline for this site.`,
          actionLabel: 'Go to Pipeline',
          actionUrl: '/admin/pipeline',
          resolved: count > 0,
        });
      }
    }

    // ── 7. Database check ─────────────────────────────────────────────────
    const migrationTodo: TodoItem = {
      id: 'db-migration-check',
      priority: 'low',
      category: 'database',
      title: 'Verify database schema is up to date',
      description: 'Run a database health check to ensure all Prisma models are deployed.',
      actionLabel: 'Check DB Health',
      actionUrl: '/admin/settings?tab=database',
      resolved: false,
    };
    todos.push(migrationTodo);

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    todos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const summary = {
      critical: todos.filter((t) => t.priority === 'critical' && !t.resolved).length,
      high: todos.filter((t) => t.priority === 'high' && !t.resolved).length,
      medium: todos.filter((t) => t.priority === 'medium' && !t.resolved).length,
      total: todos.filter((t) => !t.resolved).length,
    };

    return NextResponse.json({ todos, summary });
  } catch (err) {
    console.warn('[settings/todo GET]', err);
    return NextResponse.json({ todos: [], summary: { critical: 0, high: 0, medium: 0, total: 0 } });
  }
}
