export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Brand Assets API
 *
 * GET — Returns brand asset counts per site, plus overall design stats
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    // Count designs per site
    const designs = await prisma.design.groupBy({
      by: ["site"],
      _count: { id: true },
    });

    // Build assets array (one entry per site with count)
    const assets = designs.map((d) => ({
      siteId: d.site,
      count: d._count.id,
    }));

    // Overall stats
    const [totalDesigns, pdfsGenerated, videosRendered, emailsSent] =
      await Promise.all([
        prisma.design.count(),
        prisma.pdfGuide.count().catch(() => 0),
        prisma.videoProject.count({ where: { status: "rendered" } }).catch(() => 0),
        prisma.emailCampaign.count({ where: { status: "sent" } }).catch(() => 0),
      ]);

    return NextResponse.json({
      assets,
      siteCounts: assets,
      stats: {
        totalDesigns,
        pdfsGenerated,
        videosRendered,
        emailsSent,
      },
    });
  } catch (error) {
    console.error("[brand-assets] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load brand assets" },
      { status: 500 }
    );
  }
}
