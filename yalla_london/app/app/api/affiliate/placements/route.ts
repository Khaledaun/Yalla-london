/**
 * CJ Placements API — Manage placement rules
 * GET /api/affiliate/placements — list all
 * POST /api/affiliate/placements — create new placement
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const { prisma } = await import("@/lib/db");

    const placements = await prisma.cjPlacement.findMany({
      include: { rules: true },
      orderBy: { slug: "asc" },
    });

    return NextResponse.json({ success: true, placements });
  } catch (error) {
    console.warn("[placements] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch placements" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await request.json();

    const { slug, name, type, pagePattern, position, maxLinks, rotationStrategy, config } = body;

    if (!slug || !name || !pagePattern || !position) {
      return NextResponse.json({ error: "slug, name, pagePattern, and position are required" }, { status: 400 });
    }

    const placement = await prisma.cjPlacement.create({
      data: {
        slug,
        name,
        type: type || "INLINE",
        pagePattern,
        position,
        maxLinks: maxLinks || 3,
        rotationStrategy: rotationStrategy || "HIGHEST_EPC",
        config: config || undefined,
      },
    });

    return NextResponse.json({ success: true, placement });
  } catch (error) {
    console.warn("[placements-create] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to create placement" }, { status: 500 });
  }
});
