/**
 * GSC Trend Analysis — Shared utility for querying GscPagePerformance data
 *
 * Consumed by:
 *   - content-indexing API (per-article GSC data)
 *   - content-matrix API (per-article GSC data)
 *   - cockpit API (site-level totals)
 *   - gsc-coverage-summary API (trends + top droppers/gainers)
 */

interface PagePerformance {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageTrend {
  url: string;
  currentClicks: number;
  currentImpressions: number;
  previousClicks: number;
  previousImpressions: number;
  clicksChangePercent: number | null;
  impressionsChangePercent: number | null;
}

export interface SiteTrend {
  totalClicks: { current: number; previous: number; changePercent: number | null };
  totalImpressions: { current: number; previous: number; changePercent: number | null };
  avgPosition: { current: number; previous: number; change: number | null };
  avgCtr: { current: number; previous: number; change: number | null };
  topDroppers: Array<{ url: string; clicksDelta: number; impressionsDelta: number }>;
  topGainers: Array<{ url: string; clicksDelta: number; impressionsDelta: number }>;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get site-level performance trend comparing two periods.
 * Default: last 7 days vs previous 7 days.
 */
export async function getPerformanceTrend(
  siteId: string,
  period: "7d" | "28d" = "7d",
): Promise<SiteTrend> {
  const { prisma } = await import("@/lib/db");

  const days = period === "7d" ? 7 : 28;
  const now = new Date();

  // ── IMPORTANT: gsc-sync stores 7-day CUMULATIVE totals from GSC per snapshot date.
  // We must NOT sum across snapshot dates (that would inflate by Nx).
  // Instead, read only the LATEST snapshot for "current" and the latest snapshot
  // from the previous period for "previous".
  const currentStart = new Date(now.getTime() - days * 86400000);
  const previousCutoff = new Date(now.getTime() - days * 2 * 86400000);

  // Find the most recent snapshot date (the "current" 7-day aggregate)
  const latestSnapshot = await prisma.gscPagePerformance.findFirst({
    where: { site_id: siteId, date: { gte: currentStart } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  // Find the most recent snapshot date BEFORE the current period (the "previous" aggregate)
  const previousSnapshot = await prisma.gscPagePerformance.findFirst({
    where: { site_id: siteId, date: { gte: previousCutoff, lt: currentStart } },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const [currentAgg, previousAgg] = await Promise.all([
    latestSnapshot
      ? prisma.gscPagePerformance.aggregate({
          where: { site_id: siteId, date: latestSnapshot.date },
          _sum: { clicks: true, impressions: true },
          _avg: { position: true, ctr: true },
        })
      : Promise.resolve({ _sum: { clicks: null, impressions: null }, _avg: { position: null, ctr: null } }),
    previousSnapshot
      ? prisma.gscPagePerformance.aggregate({
          where: { site_id: siteId, date: previousSnapshot.date },
          _sum: { clicks: true, impressions: true },
          _avg: { position: true, ctr: true },
        })
      : Promise.resolve({ _sum: { clicks: null, impressions: null }, _avg: { position: null, ctr: null } }),
  ]);

  const curClicks = currentAgg._sum.clicks ?? 0;
  const prevClicks = previousAgg._sum.clicks ?? 0;
  const curImpressions = currentAgg._sum.impressions ?? 0;
  const prevImpressions = previousAgg._sum.impressions ?? 0;
  const curPosition = currentAgg._avg.position ?? 0;
  const prevPosition = previousAgg._avg.position ?? 0;
  const curCtr = currentAgg._avg.ctr ?? 0;
  const prevCtr = previousAgg._avg.ctr ?? 0;

  // Get per-page totals for droppers/gainers (using same single-snapshot dates)
  const [currentPages, previousPages] = await Promise.all([
    latestSnapshot
      ? prisma.gscPagePerformance.groupBy({
          by: ["url"],
          where: { site_id: siteId, date: latestSnapshot.date },
          _sum: { clicks: true, impressions: true },
        })
      : Promise.resolve([]),
    previousSnapshot
      ? prisma.gscPagePerformance.groupBy({
          by: ["url"],
          where: { site_id: siteId, date: previousSnapshot.date },
          _sum: { clicks: true, impressions: true },
        })
      : Promise.resolve([]),
  ]);

  type SumFields = { clicks: number | null; impressions: number | null };
  const prevMap = new Map<string, SumFields>(previousPages.map((p) => [p.url, p._sum as SumFields]));
  const deltas: Array<{ url: string; clicksDelta: number; impressionsDelta: number }> = [];

  for (const page of currentPages) {
    const prev = prevMap.get(page.url);
    const pageSums = page._sum as SumFields;
    deltas.push({
      url: page.url,
      clicksDelta: (pageSums.clicks ?? 0) - (prev?.clicks ?? 0),
      impressionsDelta: (pageSums.impressions ?? 0) - (prev?.impressions ?? 0),
    });
  }
  // Also include pages that had previous data but no current data (total losses)
  for (const [url, prev] of prevMap) {
    if (!currentPages.some((p) => p.url === url)) {
      deltas.push({
        url,
        clicksDelta: -(prev.clicks ?? 0),
        impressionsDelta: -(prev.impressions ?? 0),
      });
    }
  }

  const sorted = [...deltas].sort((a, b) => a.clicksDelta - b.clicksDelta);
  const topDroppers = sorted.filter((d) => d.clicksDelta < 0).slice(0, 10);
  const topGainers = sorted.filter((d) => d.clicksDelta > 0).sort((a, b) => b.clicksDelta - a.clicksDelta).slice(0, 10);

  return {
    totalClicks: { current: curClicks, previous: prevClicks, changePercent: pctChange(curClicks, prevClicks) },
    totalImpressions: { current: curImpressions, previous: prevImpressions, changePercent: pctChange(curImpressions, prevImpressions) },
    avgPosition: { current: Math.round(curPosition * 10) / 10, previous: Math.round(prevPosition * 10) / 10, change: curPosition && prevPosition ? Math.round((curPosition - prevPosition) * 10) / 10 : null },
    avgCtr: { current: Math.round(curCtr * 1000) / 10, previous: Math.round(prevCtr * 1000) / 10, change: curCtr && prevCtr ? Math.round((curCtr - prevCtr) * 1000) / 10 : null },
    topDroppers,
    topGainers,
  };
}

/**
 * Get latest GSC performance data for specific URLs.
 * Returns most recent snapshot per URL.
 */
export async function getPagePerformance(
  siteId: string,
  urls: string[],
): Promise<Map<string, PagePerformance>> {
  if (urls.length === 0) return new Map();

  const { prisma } = await import("@/lib/db");

  // Get the most recent snapshot date
  const latestRecord = await prisma.gscPagePerformance.findFirst({
    where: { site_id: siteId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latestRecord) return new Map();

  const records = await prisma.gscPagePerformance.findMany({
    where: {
      site_id: siteId,
      url: { in: urls },
      date: latestRecord.date,
    },
    select: { url: true, clicks: true, impressions: true, ctr: true, position: true },
  });

  const map = new Map<string, PagePerformance>();
  for (const r of records) {
    map.set(r.url, {
      url: r.url,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    });
  }
  return map;
}

/**
 * Get trend data (current + previous 7-day period) for specific URLs.
 * Returns per-URL trend with percentage change.
 */
export async function getPageTrends(
  siteId: string,
  urls: string[],
): Promise<Map<string, PageTrend>> {
  if (urls.length === 0) return new Map();

  const { prisma } = await import("@/lib/db");

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

  const [currentData, previousData] = await Promise.all([
    prisma.gscPagePerformance.groupBy({
      by: ["url"],
      where: { site_id: siteId, url: { in: urls }, date: { gte: sevenDaysAgo } },
      _sum: { clicks: true, impressions: true },
    }),
    prisma.gscPagePerformance.groupBy({
      by: ["url"],
      where: { site_id: siteId, url: { in: urls }, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      _sum: { clicks: true, impressions: true },
    }),
  ]);

  type SumFields2 = { clicks: number | null; impressions: number | null };
  const prevMap = new Map<string, SumFields2>(previousData.map((p) => [p.url, p._sum as SumFields2]));
  const result = new Map<string, PageTrend>();

  for (const cur of currentData) {
    const prev = prevMap.get(cur.url);
    const curSums = cur._sum as SumFields2;
    const curClicks = curSums.clicks ?? 0;
    const curImpressions = curSums.impressions ?? 0;
    const prevClicks = prev?.clicks ?? 0;
    const prevImpressions = prev?.impressions ?? 0;

    result.set(cur.url, {
      url: cur.url,
      currentClicks: curClicks,
      currentImpressions: curImpressions,
      previousClicks: prevClicks,
      previousImpressions: prevImpressions,
      clicksChangePercent: pctChange(curClicks, prevClicks),
      impressionsChangePercent: pctChange(curImpressions, prevImpressions),
    });
  }

  // Include pages that had previous data but no current (total losses)
  for (const [url, prev] of prevMap) {
    if (!result.has(url)) {
      result.set(url, {
        url,
        currentClicks: 0,
        currentImpressions: 0,
        previousClicks: prev.clicks ?? 0,
        previousImpressions: prev.impressions ?? 0,
        clicksChangePercent: -100,
        impressionsChangePercent: -100,
      });
    }
  }

  return result;
}

/**
 * Get the timestamp of the last successful gsc-sync cron run.
 */
export async function getLastGscSyncTime(): Promise<Date | null> {
  const { prisma } = await import("@/lib/db");

  try {
    const lastRun = await prisma.cronJobLog.findFirst({
      where: { job_name: "gsc-sync", status: "completed" },
      orderBy: { completed_at: "desc" },
      select: { completed_at: true },
    });
    return lastRun?.completed_at ?? null;
  } catch {
    return null;
  }
}
