/**
 * CommerceOrder CRUD — Unified order records across all channels
 *
 * GET: List orders with filters (siteId, channel, status, dateRange)
 * POST: Create order (from CSV import, webhook, or manual entry)
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
    const channel = url.searchParams.get("channel");
    const status = url.searchParams.get("status");
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where: Record<string, unknown> = { siteId, orderedAt: { gte: since } };
    if (channel) where.channel = channel;
    if (status) where.status = status;

    const orders = await prisma.commerceOrder.findMany({
      where,
      orderBy: { orderedAt: "desc" },
      take: 200,
    });

    const summary = {
      total: orders.length,
      totalGross: orders.reduce((s, o) => s + o.grossAmount, 0),
      totalFees: orders.reduce((s, o) => s + o.platformFees + o.processingFees, 0),
      totalNet: orders.reduce((s, o) => s + o.netAmount, 0),
      byChannel: orders.reduce((acc, o) => {
        if (!acc[o.channel]) acc[o.channel] = { count: 0, grossCents: 0, netCents: 0 };
        acc[o.channel].count++;
        acc[o.channel].grossCents += o.grossAmount;
        acc[o.channel].netCents += o.netAmount;
        return acc;
      }, {} as Record<string, { count: number; grossCents: number; netCents: number }>),
    };

    return NextResponse.json({ data: orders, summary });
  } catch (error) {
    console.error("[commerce-orders] GET error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
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

    const grossAmount = body.grossAmount ?? body.amount ?? 0;
    const platformFees = body.platformFees ?? 0;
    const processingFees = body.processingFees ?? 0;
    const netAmount = body.netAmount ?? (grossAmount - platformFees - processingFees);

    const order = await prisma.commerceOrder.create({
      data: {
        siteId,
        channel: body.channel ?? "website",
        externalOrderId: body.externalOrderId ?? null,
        customerEmail: body.customerEmail ?? null,
        customerName: body.customerName ?? null,
        grossAmount,
        platformFees,
        processingFees,
        netAmount,
        currency: body.currency ?? "USD",
        productId: body.productId ?? null,
        productName: body.productName ?? null,
        quantity: body.quantity ?? 1,
        utmSource: body.utmSource ?? null,
        utmMedium: body.utmMedium ?? null,
        utmCampaign: body.utmCampaign ?? null,
        couponCode: body.couponCode ?? null,
        attributionTags: body.attributionTags ?? null,
        status: body.status ?? "completed",
      },
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error("[commerce-orders] POST error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
