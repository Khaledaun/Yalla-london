/**
 * Bulk sync links for all joined advertisers
 * POST /api/affiliate/links/bulk-sync
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const POST = withAdminAuth(async () => {
  try {
    const { prisma } = await import("@/lib/db");
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");
    const { syncLinks } = await import("@/lib/affiliate/cj-sync");

    const joined = await prisma.cjAdvertiser.findMany({
      where: { networkId: CJ_NETWORK_ID, status: "JOINED" },
      select: { externalId: true, name: true },
    });

    let totalCreated = 0;
    const errors: string[] = [];

    for (const adv of joined) {
      const result = await syncLinks(adv.externalId);
      totalCreated += result.created;
      if (result.errors.length > 0) errors.push(...result.errors);
    }

    return NextResponse.json({
      success: true,
      advertisersProcessed: joined.length,
      linksCreated: totalCreated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.warn("[bulk-sync] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Bulk sync failed" }, { status: 500 });
  }
});
