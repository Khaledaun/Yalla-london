import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 3600_000);
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60_000);

  const [
    failedCrons24h,
    zombieCrons,
    stuckDrafts,
    errorIndexing,
  ] = await Promise.all([
    // Failed crons in last 24h
    prisma.cronJobLog.count({
      where: { status: "failed", started_at: { gte: oneDayAgo } },
    }),
    // Zombie "running" crons (>15 min old)
    prisma.cronJobLog.count({
      where: { status: "running", started_at: { lt: fifteenMinAgo } },
    }),
    // Stuck drafts (not updated in 4+ hours, not rejected)
    prisma.articleDraft.count({
      where: {
        current_phase: { notIn: ["reservoir", "published"] },
        status: { not: "rejected" },
        updated_at: { lt: new Date(now.getTime() - 4 * 3600_000) },
      },
    }),
    // URLs with indexing errors
    prisma.uRLIndexingStatus.count({
      where: { status: { in: ["error", "deindexed"] } },
    }),
  ]);

  const critical = failedCrons24h > 5 ? failedCrons24h : 0;
  const high = zombieCrons + (stuckDrafts > 10 ? stuckDrafts : 0);
  const medium = errorIndexing > 20 ? errorIndexing : 0;
  const total = failedCrons24h + zombieCrons + stuckDrafts + errorIndexing;

  return NextResponse.json({
    total,
    critical,
    high,
    medium,
    breakdown: {
      failedCrons24h,
      zombieCrons,
      stuckDrafts,
      indexingErrors: errorIndexing,
    },
    checked_at: now.toISOString(),
  });
}
