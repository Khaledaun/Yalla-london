/**
 * Finance Tool Handlers — wraps Stripe + FinanceEvent for CEO Agent.
 *
 * Tools: get_finance_summary
 */

import { prisma } from "@/lib/db";
import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// get_finance_summary — Stripe events, recent payments, disputes
// ---------------------------------------------------------------------------

export async function getFinanceSummary(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const period = (params.period as string) || "30d";
  const daysBack = period === "today" ? 1 : period === "7d" ? 7 : 30;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const [payments, disputes, recentEvents] = await Promise.all([
    // Successful payments
    prisma.financeEvent
      .aggregate({
        where: {
          eventType: "payment_succeeded",
          createdAt: { gte: since },
        },
        _sum: { amount: true },
        _count: true,
      })
      .catch(() => null),
    // Active disputes
    prisma.financeEvent.count({
      where: {
        eventType: "dispute_created",
        status: { not: "processed" },
      },
    }),
    // Recent finance events
    prisma.financeEvent.findMany({
      select: {
        eventType: true,
        source: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const totalRevenue = payments?._sum?.amount || 0;
  const paymentCount = payments?._count || 0;

  return {
    success: true,
    data: {
      period,
      revenue: {
        total: totalRevenue,
        paymentCount,
        currency: "USD",
      },
      activeDisputes: disputes,
      recentEvents: recentEvents.map((e) => ({
        type: e.eventType,
        source: e.source,
        amount: e.amount,
        currency: e.currency,
        status: e.status,
        date: e.createdAt.toISOString(),
      })),
    },
    summary: `Finance ${period}: $${totalRevenue.toFixed(2)} revenue (${paymentCount} payments), ${disputes} active disputes.`,
  };
}
