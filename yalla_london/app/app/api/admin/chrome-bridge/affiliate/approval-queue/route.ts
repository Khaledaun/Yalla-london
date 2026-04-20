/**
 * GET /api/admin/chrome-bridge/affiliate/approval-queue
 *
 * CjAdvertiser state overview: JOINED / PENDING / DECLINED / NOT_JOINED.
 * Suggests which advertisers to apply for based on EPC + content coverage.
 * Flags applications stuck in PENDING for >30 days (probably lost, reapply).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const [allAdvertisers, statusGroups] = await Promise.all([
      prisma.cjAdvertiser.findMany({
        select: {
          id: true,
          externalId: true,
          name: true,
          category: true,
          status: true,
          commissionRate: true,
          sevenDayEpc: true,
          threeMonthEpc: true,
          cookieDuration: true,
          priority: true,
          lastSynced: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ status: "asc" }, { threeMonthEpc: "desc" }],
      }),
      prisma.cjAdvertiser.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const g of statusGroups) {
      statusCounts[String(g.status)] = g._count._all;
    }

    // Stuck pending: PENDING for >30 days
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const stuckPending = allAdvertisers.filter(
      (a) =>
        String(a.status) === "PENDING" &&
        now - new Date(a.createdAt).getTime() > THIRTY_DAYS_MS,
    );

    // High-EPC applications worth prioritizing (not joined, high EPC)
    const recommendedApplications = allAdvertisers
      .filter(
        (a) =>
          (String(a.status) === "NOT_JOINED" || String(a.status) === "DECLINED") &&
          ((a.threeMonthEpc ?? 0) > 2 || (a.sevenDayEpc ?? 0) > 3),
      )
      .sort((a, b) => (b.threeMonthEpc ?? 0) - (a.threeMonthEpc ?? 0))
      .slice(0, 20);

    const joined = allAdvertisers.filter((a) => String(a.status) === "JOINED");
    const pending = allAdvertisers.filter((a) => String(a.status) === "PENDING");
    const declined = allAdvertisers.filter((a) => String(a.status) === "DECLINED");

    // Group joined by category for coverage visibility
    const joinedByCategory: Record<string, number> = {};
    for (const j of joined) {
      const cat = j.category ?? "Unknown";
      joinedByCategory[cat] = (joinedByCategory[cat] ?? 0) + 1;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalTracked: allAdvertisers.length,
        statusCounts,
        joinedCount: joined.length,
        pendingCount: pending.length,
        stuckPendingCount: stuckPending.length,
      },
      joinedByCategory,
      joined: joined.map(sanitizeAdvertiser),
      pending: pending.map(sanitizeAdvertiser),
      stuckPending: stuckPending.map((a) => ({
        ...sanitizeAdvertiser(a),
        daysPending: Math.floor(
          (now - new Date(a.createdAt).getTime()) / (24 * 60 * 60 * 1000),
        ),
      })),
      recommendedApplications: recommendedApplications.map(sanitizeAdvertiser),
      recentlyDeclined: declined.slice(0, 10).map(sanitizeAdvertiser),
      _hints: buildHints({ justCalled: "affiliate-approval-queue" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/affiliate/approval-queue]", message);
    return NextResponse.json(
      { error: "Failed to load approval queue", details: message },
      { status: 500 },
    );
  }
}

type AdvertiserRow = {
  id: string;
  externalId: string;
  name: string;
  category: string | null;
  status: unknown;
  commissionRate: string | null;
  sevenDayEpc: number | null;
  threeMonthEpc: number | null;
  cookieDuration: number | null;
  priority: unknown;
  lastSynced: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function sanitizeAdvertiser(a: AdvertiserRow) {
  return {
    id: a.id,
    externalId: a.externalId,
    name: a.name,
    category: a.category,
    status: String(a.status),
    commissionRate: a.commissionRate,
    sevenDayEpc: a.sevenDayEpc,
    threeMonthEpc: a.threeMonthEpc,
    cookieDuration: a.cookieDuration,
    priority: String(a.priority),
    lastSynced: a.lastSynced,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
