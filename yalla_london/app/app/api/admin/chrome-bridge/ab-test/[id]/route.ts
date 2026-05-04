/**
 * GET  /api/admin/chrome-bridge/ab-test/[id]        — details + stats
 * POST /api/admin/chrome-bridge/ab-test/[id]/conclude — declare winner
 * PATCH /api/admin/chrome-bridge/ab-test/[id]       — pause/resume/update notes
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import { computeAbTestResult } from "@/lib/chrome-bridge/ab-test-stats";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { prisma } = await import("@/lib/db");
    const test = await prisma.abTest.findUnique({ where: { id } });
    if (!test) {
      return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
    }
    const primaryMetric = test.primaryMetric;
    const successesA = primaryMetric === "conversion" ? test.conversionsA : test.clicksA;
    const successesB = primaryMetric === "conversion" ? test.conversionsB : test.clicksB;
    const stats = computeAbTestResult({
      impressionsA: test.impressionsA,
      impressionsB: test.impressionsB,
      successesA,
      successesB,
    });

    return NextResponse.json({
      success: true,
      test,
      stats,
      _hints: buildHints({ justCalled: "ab-test" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ab-test/id GET]", message);
    return NextResponse.json(
      { error: "Failed to load A/B test", details: message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const allowedStatuses = ["active", "paused", "concluded", "archived"];
    const updates: Record<string, unknown> = {};
    if (typeof body.status === "string" && allowedStatuses.includes(body.status)) {
      updates.status = body.status;
      if (body.status === "concluded") updates.concludedAt = new Date();
    }
    if (typeof body.notes === "string") updates.notes = body.notes;
    if (typeof body.winner === "string" && ["A", "B", "tie"].includes(body.winner)) {
      updates.winner = body.winner;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid update fields provided" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/db");
    const updated = await prisma.abTest.update({ where: { id }, data: updates });
    return NextResponse.json({ success: true, test: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ab-test/id PATCH]", message);
    return NextResponse.json(
      { error: "Failed to update A/B test", details: message },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "conclude";

    if (action !== "conclude") {
      return NextResponse.json(
        { error: "Unknown action. POST /ab-test/[id] supports action=conclude." },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/db");
    const test = await prisma.abTest.findUnique({ where: { id } });
    if (!test) {
      return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
    }

    const primaryMetric = test.primaryMetric;
    const successesA = primaryMetric === "conversion" ? test.conversionsA : test.clicksA;
    const successesB = primaryMetric === "conversion" ? test.conversionsB : test.clicksB;
    const stats = computeAbTestResult({
      impressionsA: test.impressionsA,
      impressionsB: test.impressionsB,
      successesA,
      successesB,
    });

    const winner: string = stats.winner === "inconclusive" ? "tie" : stats.winner;

    const updated = await prisma.abTest.update({
      where: { id },
      data: {
        status: "concluded",
        concludedAt: new Date(),
        winner,
        confidence: stats.confidence,
      },
    });

    return NextResponse.json({
      success: true,
      test: updated,
      stats,
      recommendation:
        stats.winner === "inconclusive"
          ? "Sample size too small — keep running or accept a tie."
          : stats.winner === "tie"
            ? "No significant difference. Pick A or B by other criteria."
            : `Variant ${stats.winner} wins with ${(stats.confidence * 100).toFixed(1)}% confidence and ${(stats.lift * 100).toFixed(1)}% lift.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ab-test/id POST]", message);
    return NextResponse.json(
      { error: "Failed to conclude A/B test", details: message },
      { status: 500 },
    );
  }
}
