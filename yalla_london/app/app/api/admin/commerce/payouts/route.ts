/**
 * Payout CRUD — Tracks payouts from Etsy/Stripe/affiliate channels to bank
 *
 * GET: List payouts with filters (siteId, source, status, dateRange)
 * POST: Record payout (from CSV import or manual entry)
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId = req.headers.get("x-site-id") || getDefaultSiteId();
    const url = new URL(req.url);
    const source = url.searchParams.get("source");
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = { siteId };
    if (source) where.source = source;
    if (status) where.status = status;

    const payouts = await prisma.payout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const summary = {
      total: payouts.length,
      totalGross: payouts.reduce((s, p) => s + p.grossAmount, 0),
      totalNet: payouts.reduce((s, p) => s + p.netAmount, 0),
      bySource: payouts.reduce((acc, p) => {
        if (!acc[p.source]) acc[p.source] = { count: 0, netCents: 0 };
        acc[p.source].count++;
        acc[p.source].netCents += p.netAmount;
        return acc;
      }, {} as Record<string, { count: number; netCents: number }>),
      byStatus: payouts.reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    };

    return NextResponse.json({ data: payouts, summary });
  } catch (error) {
    console.error("[commerce-payouts] GET error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const body = await req.json();
    const siteId = body.siteId || req.headers.get("x-site-id") || getDefaultSiteId();

    const grossAmount = body.grossAmount ?? 0;
    const fees = body.fees ?? 0;
    const netAmount = body.netAmount ?? (grossAmount - fees);

    const payout = await prisma.payout.create({
      data: {
        siteId,
        source: body.source ?? "etsy",
        externalPayoutId: body.externalPayoutId ?? null,
        grossAmount,
        fees,
        netAmount,
        currency: body.currency ?? "USD",
        status: body.status ?? "pending",
        payoutProfileId: body.payoutProfileId ?? null,
        bankLast4: body.bankLast4 ?? null,
        periodStart: body.periodStart ? new Date(body.periodStart) : null,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
      },
    });

    return NextResponse.json({ data: payout }, { status: 201 });
  } catch (error) {
    console.error("[commerce-payouts] POST error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 });
  }
}
