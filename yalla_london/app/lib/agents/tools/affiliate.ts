/**
 * Affiliate Tool Handlers — wraps CJ affiliate data for CEO Agent.
 *
 * Tools: get_affiliate_status
 */

import { prisma } from "@/lib/db";
import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// get_affiliate_status — revenue, clicks, partner health
// ---------------------------------------------------------------------------

export async function getAffiliateStatus(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;
  const period = (params.period as string) || "7d";

  const daysBack = period === "today" ? 1 : period === "7d" ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const siteFilter = {
    OR: [{ siteId }, { siteId: null }],
  };

  const [clicks, commissions, advertisers, coverage] = await Promise.all([
    // Total clicks in period
    prisma.cjClickEvent.count({
      where: { ...siteFilter, createdAt: { gte: since } },
    }),
    // Total commissions in period
    prisma.cjCommission
      .aggregate({
        where: { ...siteFilter, createdAt: { gte: since } },
        _sum: { commissionAmount: true },
        _count: true,
      })
      .catch(() => null),
    // Active advertisers
    prisma.cjAdvertiser.count({
      where: { status: "JOINED" },
    }),
    // Articles with affiliate links
    prisma.blogPost.count({
      where: {
        siteId,
        published: true,
        content_en: { contains: "affiliate" },
      },
    }),
  ]);

  const totalArticles = await prisma.blogPost.count({
    where: { siteId, published: true },
  });

  const coveragePercent =
    totalArticles > 0 ? Math.round((coverage / totalArticles) * 100) : 0;

  return {
    success: true,
    data: {
      period,
      clicks,
      commissions: commissions?._sum?.commissionAmount || 0,
      commissionCount: commissions?._count || 0,
      activeAdvertisers: advertisers,
      articleCoverage: `${coverage}/${totalArticles} (${coveragePercent}%)`,
    },
    summary: `Affiliate ${period}: ${clicks} clicks, $${(commissions?._sum?.commissionAmount || 0).toFixed(2)} revenue, ${advertisers} active partners, ${coveragePercent}% coverage.`,
  };
}
