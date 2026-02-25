/**
 * Database Status API
 * Returns schema health, table counts, and triggers migrations.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';

const CORE_TABLES = [
  { name: 'BlogPost', label: 'Blog Posts' },
  { name: 'ArticleDraft', label: 'Article Drafts' },
  { name: 'TopicProposal', label: 'Topic Proposals' },
  { name: 'CronJobLog', label: 'Cron Job Logs' },
  { name: 'ModelProvider', label: 'AI Model Providers' },
  { name: 'ModelRoute', label: 'AI Model Routes' },
  { name: 'SeoReport', label: 'SEO Reports' },
  { name: 'FeatureFlag', label: 'Feature Flags' },
  { name: 'Admin', label: 'Admin Users' },
  { name: 'ScheduledContent', label: 'Scheduled Content' },
  { name: 'AuditLog', label: 'Audit Logs' },
];

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const tableHealth: Array<{
    name: string;
    label: string;
    count: number | null;
    status: 'ok' | 'empty' | 'error';
    error?: string;
  }> = [];

  for (const table of CORE_TABLES) {
    try {
      const model = (prisma as Record<string, { count: () => Promise<number> }>)[
        table.name.charAt(0).toLowerCase() + table.name.slice(1)
      ];
      if (!model) {
        tableHealth.push({ ...table, count: null, status: 'error', error: 'Model not found' });
        continue;
      }
      const count = await model.count();
      tableHealth.push({ ...table, count, status: count === 0 ? 'empty' : 'ok' });
    } catch (err: unknown) {
      // H-002 fix: don't leak Prisma error messages (table names, schema details) to client
      console.warn(`[db-status] Error querying ${table.name}:`, err);
      tableHealth.push({
        ...table,
        count: null,
        status: 'error',
        error: 'Query failed',
      });
    }
  }

  const errorCount = tableHealth.filter((t) => t.status === 'error').length;
  const overallHealth = errorCount === 0 ? 'healthy' : errorCount < 3 ? 'degraded' : 'critical';

  // DB connection test
  let dbConnected = false;
  let dbLatencyMs: number | null = null;
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbConnected = true;
  } catch (e) {
    // H-003 fix: log connection test failure instead of swallowing
    console.warn('[db-status] DB connection test failed:', e instanceof Error ? e.message : 'unknown');
    dbConnected = false;
  }

  return NextResponse.json({
    overallHealth,
    dbConnected,
    dbLatencyMs,
    tables: tableHealth,
    errorCount,
    checkedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { action } = await request.json();

    if (action === 'test_connection') {
      const start = Date.now();
      await prisma.$queryRaw`SELECT version()`;
      return NextResponse.json({ success: true, latencyMs: Date.now() - start });
    }

    if (action === 'run_migration') {
      // We can't run `prisma migrate deploy` from within the app safely.
      // Return instructions instead.
      return NextResponse.json({
        success: false,
        message: 'Migrations must be run via Vercel build command or CLI.',
        instructions: [
          'Option 1 (Recommended): Trigger a Vercel deployment — migrations run automatically in build',
          'Option 2 (CLI): Run `npx prisma migrate deploy` in your terminal with DATABASE_URL set',
          'Option 3 (Vercel): Add `npx prisma migrate deploy &&` before your build command in Vercel settings',
        ],
      });
    }

    if (action === 'db_push') {
      // db push is for development only — return instructions
      return NextResponse.json({
        success: false,
        message: 'Use prisma db push in development, prisma migrate deploy in production.',
        instructions: [
          'Development: `npx prisma db push`',
          'Production: `npx prisma migrate deploy`',
          'Check schema: `npx prisma studio` to browse your database visually',
        ],
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.warn('[settings/db-status POST]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
