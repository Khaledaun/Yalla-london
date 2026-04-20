/**
 * GET /api/admin/chrome-bridge/affiliate/commission-trends?siteId=X&days=90
 *
 * Weekly commission velocity per advertiser. Detects declining partners
 * (3+ consecutive weeks of decline) and rising stars (2+ weeks of growth).
 * Helps prioritize where to allocate content + optimization effort.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "90", 10),
      180,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const siteFilter = { OR: [{ siteId }, { siteId: null }] };

    const [commissions, advertisers] = await Promise.all([
      prisma.cjCommission.findMany({
        where: {
          ...siteFilter,
          eventDate: { gte: since },
        },
        select: {
          advertiserId: true,
          commissionAmount: true,
          saleAmount: true,
          status: true,
          eventDate: true,
          currency: true,
        },
      }),
      prisma.cjAdvertiser.findMany({
        where: { status: "JOINED" },
        select: { id: true, name: true, category: true, sevenDayEpc: true, threeMonthEpc: true },
      }),
    ]);

    const advertiserMap = new Map(advertisers.map((a) => [a.id, a]));

    // Group by advertiser + ISO week
    const byAdvertiserWeek: Record<string, Record<string, { commissions: number; count: number }>> = {};
    for (const c of commissions) {
      const advId = c.advertiserId;
      const weekKey = toIsoWeek(c.eventDate);
      if (!byAdvertiserWeek[advId]) byAdvertiserWeek[advId] = {};
      if (!byAdvertiserWeek[advId][weekKey]) {
        byAdvertiserWeek[advId][weekKey] = { commissions: 0, count: 0 };
      }
      byAdvertiserWeek[advId][weekKey].commissions += c.commissionAmount ?? 0;
      byAdvertiserWeek[advId][weekKey].count += 1;
    }

    // Build per-advertiser trend series
    const trends: Array<{
      advertiserId: string;
      advertiserName: string;
      category: string | null;
      totalCommissions: number;
      totalTransactions: number;
      weeklyTrend: Array<{ week: string; commissions: number; count: number }>;
      verdict: "declining" | "rising" | "stable" | "new" | "inactive";
      verdictReason: string;
      sevenDayEpc: number | null;
      threeMonthEpc: number | null;
    }> = [];

    for (const [advId, weeks] of Object.entries(byAdvertiserWeek)) {
      const adv = advertiserMap.get(advId);
      const weeklyTrend = Object.entries(weeks)
        .map(([week, data]) => ({ week, commissions: data.commissions, count: data.count }))
        .sort((a, b) => a.week.localeCompare(b.week));

      const totalCommissions = weeklyTrend.reduce((s, w) => s + w.commissions, 0);
      const totalTransactions = weeklyTrend.reduce((s, w) => s + w.count, 0);

      // Verdict logic
      let verdict: "declining" | "rising" | "stable" | "new" | "inactive" = "stable";
      let verdictReason = "No significant trend";

      if (weeklyTrend.length < 2) {
        verdict = "new";
        verdictReason = "Only one week of data — need more data to classify";
      } else {
        const last3 = weeklyTrend.slice(-3);
        const prev3 = weeklyTrend.slice(-6, -3);
        const lastSum = last3.reduce((s, w) => s + w.commissions, 0);
        const prevSum = prev3.reduce((s, w) => s + w.commissions, 0);

        if (lastSum === 0 && totalCommissions > 0) {
          verdict = "inactive";
          verdictReason = "No commissions in last 3 weeks (previously earned)";
        } else if (prevSum > 0 && lastSum < prevSum * 0.5) {
          verdict = "declining";
          verdictReason = `Down ${Math.round((1 - lastSum / prevSum) * 100)}% vs prior 3-week period`;
        } else if (lastSum > prevSum * 1.5 && lastSum > 5) {
          verdict = "rising";
          verdictReason = `Up ${Math.round((lastSum / Math.max(prevSum, 0.01) - 1) * 100)}% vs prior 3-week period`;
        }
      }

      trends.push({
        advertiserId: advId,
        advertiserName: adv?.name ?? "Unknown",
        category: adv?.category ?? null,
        totalCommissions: Number(totalCommissions.toFixed(2)),
        totalTransactions,
        weeklyTrend,
        verdict,
        verdictReason,
        sevenDayEpc: adv?.sevenDayEpc ?? null,
        threeMonthEpc: adv?.threeMonthEpc ?? null,
      });
    }

    trends.sort((a, b) => b.totalCommissions - a.totalCommissions);

    const verdictCounts: Record<string, number> = {
      declining: 0,
      rising: 0,
      stable: 0,
      new: 0,
      inactive: 0,
    };
    for (const t of trends) verdictCounts[t.verdict] = (verdictCounts[t.verdict] ?? 0) + 1;

    const totalAllCommissions = trends.reduce((s, t) => s + t.totalCommissions, 0);

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { days, startDate: since.toISOString().slice(0, 10) },
      summary: {
        partnersWithRevenue: trends.length,
        totalCommissions: Number(totalAllCommissions.toFixed(2)),
        verdictCounts,
      },
      trends,
      declining: trends.filter((t) => t.verdict === "declining"),
      rising: trends.filter((t) => t.verdict === "rising"),
      inactive: trends.filter((t) => t.verdict === "inactive"),
      _hints: buildHints({ justCalled: "affiliate-commission-trends" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/affiliate/commission-trends]", message);
    return NextResponse.json(
      { error: "Failed to compute commission trends", details: message },
      { status: 500 },
    );
  }
}

/**
 * Format date as ISO week (e.g., "2026-W03").
 */
function toIsoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
