/**
 * Affiliate Networks API — List and manage networks
 * GET /api/affiliate/networks — list all
 * POST /api/affiliate/networks — create new network
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const { prisma } = await import("@/lib/db");

    const networks = await prisma.affiliateNetwork.findMany({
      include: {
        _count: {
          select: { advertisers: true, links: true, offers: true, commissions: true, syncLogs: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, networks });
  } catch (error) {
    console.warn("[affiliate-networks] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch networks" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();

    const { name, slug, apiBaseUrl, apiTokenEnvVar, publisherId, config } = body;

    if (!name || !slug || !apiTokenEnvVar || !publisherId) {
      return NextResponse.json({ error: "name, slug, apiTokenEnvVar, and publisherId are required" }, { status: 400 });
    }

    const network = await prisma.affiliateNetwork.create({
      data: { name, slug, apiBaseUrl, apiTokenEnvVar, publisherId, config },
    });

    return NextResponse.json({ success: true, network });
  } catch (error) {
    console.warn("[network-create] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to create network" }, { status: 500 });
  }
});
