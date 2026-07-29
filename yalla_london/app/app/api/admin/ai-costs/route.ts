/**
 * /api/admin/ai-costs
 *
 * Token monitoring + per-site cost separation dashboard API.
 * READ-ONLY — never mutates ApiUsageLog.
 *
 * GET ?period=today|week|month|all&siteId=...
 *   Returns aggregated token counts + estimated costs broken down by:
 *   - site (for cost separation)
 *   - provider
 *   - taskType
 *   - day (sparkline data for last 30 days)
 *   - recent calls (last 50 rows)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'all':
    default:
      return new Date(0);
  }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'month';
  const filterSiteId = searchParams.get('siteId') ?? null;

  const { prisma } = await import('@/lib/db');
  const since = getPeriodStart(period);

  const whereBase = {
    createdAt: { gte: since },
    ...(filterSiteId ? { siteId: filterSiteId } : {}),
  };

  // Guard: check if table exists (migration may not have been deployed)
  let allLogs: Awaited<ReturnType<typeof prisma.apiUsageLog.findMany>> = [];
  let recentLogs: typeof allLogs = [];
  let dailyRows: typeof allLogs = [];
  try {
  // Run all aggregation queries in parallel
  [allLogs, recentLogs, dailyRows] = await Promise.all([
    // Full set for aggregation (no select * — only numeric fields needed)
    prisma.apiUsageLog.findMany({
      where: whereBase,
      select: {
        siteId: true,
        provider: true,
        model: true,
        taskType: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
        success: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000, // guard — more than enough for any reasonable period
    }),

    // Recent 50 calls for the live feed
    prisma.apiUsageLog.findMany({
      where: whereBase,
      select: {
        id: true,
        siteId: true,
        provider: true,
        model: true,
        taskType: true,
        calledFrom: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
        success: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // Daily aggregation for sparklines (last 30 days always)
    prisma.apiUsageLog.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        ...(filterSiteId ? { siteId: filterSiteId } : {}),
      },
      select: {
        siteId: true,
        totalTokens: true,
        estimatedCostUsd: true,
        success: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 10000,
    }),
  ]);
  } catch (tableErr: unknown) {
    const msg = tableErr instanceof Error ? tableErr.message : String(tableErr);
    // Prisma P2021 = table does not exist — migration not deployed yet
    if (msg.includes('P2021') || msg.includes('does not exist') || msg.includes('api_usage_log') || msg.includes('ApiUsageLog')) {
      return NextResponse.json({
        _migrationNeeded: true,
        message: 'ApiUsageLog table not found — run npx prisma db push to create it',
        totals: { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
        bySite: [], byProvider: [], byTask: [], dailySparkline: [], recentCalls: [],
      });
    }
    throw tableErr;
  }

  // ---------------------------------------------------------------------------
  // Aggregate: totals
  // ---------------------------------------------------------------------------
  const totals = allLogs.reduce(
    (acc, row) => ({
      calls: acc.calls + 1,
      successCalls: acc.successCalls + (row.success ? 1 : 0),
      promptTokens: acc.promptTokens + row.promptTokens,
      completionTokens: acc.completionTokens + row.completionTokens,
      totalTokens: acc.totalTokens + row.totalTokens,
      estimatedCostUsd: acc.estimatedCostUsd + row.estimatedCostUsd,
    }),
    { calls: 0, successCalls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }
  );

  // ---------------------------------------------------------------------------
  // Aggregate: by site (cost separation)
  // ---------------------------------------------------------------------------
  const bySiteMap = new Map<string, { calls: number; totalTokens: number; estimatedCostUsd: number }>();
  for (const row of allLogs) {
    const existing = bySiteMap.get(row.siteId) ?? { calls: 0, totalTokens: 0, estimatedCostUsd: 0 };
    bySiteMap.set(row.siteId, {
      calls: existing.calls + 1,
      totalTokens: existing.totalTokens + row.totalTokens,
      estimatedCostUsd: existing.estimatedCostUsd + row.estimatedCostUsd,
    });
  }
  const bySite = Array.from(bySiteMap.entries())
    .map(([siteId, data]) => ({ siteId, ...data }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  // ---------------------------------------------------------------------------
  // Aggregate: by provider
  // ---------------------------------------------------------------------------
  const byProviderMap = new Map<string, { calls: number; totalTokens: number; estimatedCostUsd: number; models: Set<string> }>();
  for (const row of allLogs) {
    const existing = byProviderMap.get(row.provider) ?? { calls: 0, totalTokens: 0, estimatedCostUsd: 0, models: new Set() };
    existing.calls++;
    existing.totalTokens += row.totalTokens;
    existing.estimatedCostUsd += row.estimatedCostUsd;
    existing.models.add(row.model);
    byProviderMap.set(row.provider, existing);
  }
  const byProvider = Array.from(byProviderMap.entries())
    .map(([provider, data]) => ({
      provider,
      calls: data.calls,
      totalTokens: data.totalTokens,
      estimatedCostUsd: data.estimatedCostUsd,
      models: Array.from(data.models),
    }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  // ---------------------------------------------------------------------------
  // Aggregate: by task type
  // ---------------------------------------------------------------------------
  const byTaskMap = new Map<string, { calls: number; totalTokens: number; estimatedCostUsd: number }>();
  for (const row of allLogs) {
    const key = row.taskType ?? 'untagged';
    const existing = byTaskMap.get(key) ?? { calls: 0, totalTokens: 0, estimatedCostUsd: 0 };
    byTaskMap.set(key, {
      calls: existing.calls + 1,
      totalTokens: existing.totalTokens + row.totalTokens,
      estimatedCostUsd: existing.estimatedCostUsd + row.estimatedCostUsd,
    });
  }
  const byTask = Array.from(byTaskMap.entries())
    .map(([taskType, data]) => ({ taskType, ...data }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  // ---------------------------------------------------------------------------
  // Daily sparkline (last 30 days)
  // ---------------------------------------------------------------------------
  const dailyMap = new Map<string, { calls: number; totalTokens: number; estimatedCostUsd: number }>();
  for (const row of dailyRows) {
    const day = row.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = dailyMap.get(day) ?? { calls: 0, totalTokens: 0, estimatedCostUsd: 0 };
    dailyMap.set(day, {
      calls: existing.calls + 1,
      totalTokens: existing.totalTokens + row.totalTokens,
      estimatedCostUsd: existing.estimatedCostUsd + row.estimatedCostUsd,
    });
  }
  // Fill in zero-days for a continuous 30-day series
  const daily: Array<{ date: string; calls: number; totalTokens: number; estimatedCostUsd: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const data = dailyMap.get(dateStr) ?? { calls: 0, totalTokens: 0, estimatedCostUsd: 0 };
    daily.push({ date: dateStr, ...data });
  }

  return NextResponse.json({
    period,
    since: since.toISOString(),
    totals: {
      ...totals,
      estimatedCostUsd: Math.round(totals.estimatedCostUsd * 10000) / 10000,
      successRate: totals.calls > 0 ? Math.round((totals.successCalls / totals.calls) * 100) : 100,
    },
    bySite,
    byProvider,
    byTask,
    daily,
    recentCalls: recentLogs.map((r) => ({
      ...r,
      estimatedCostUsd: Math.round(r.estimatedCostUsd * 100000) / 100000,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
