/**
 * Public Site Health Probe
 *
 * GET /api/site-health/[siteId]
 *
 * Returns basic health status for a site. No auth required — used by
 * external monitoring tools and the system validator.
 *
 * Returns limited data only: health score, status, site name, domain.
 * Detailed metrics require the admin endpoint: /api/admin/sites/[siteId]/health
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSiteConfig } from "@/config/sites";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> },
) {
  try {
    const { siteId } = await params;
    const siteConfig = getSiteConfig(siteId);

    if (!siteConfig) {
      return NextResponse.json(
        { error: `Unknown site: ${siteId}` },
        { status: 404 },
      );
    }

    const { prisma } = await import("@/lib/db");

    // Get latest health check from SiteHealthCheck table
    const latestHealth = await (prisma as any).siteHealthCheck.findFirst({
      where: { site_id: siteId },
      orderBy: { checked_at: "desc" },
      select: {
        health_score: true,
        checked_at: true,
        posts_published: true,
        total_posts: true,
      },
    });

    const healthScore = latestHealth?.health_score ?? null;

    let status: "healthy" | "degraded" | "down" | "unknown" = "unknown";
    if (healthScore !== null) {
      if (healthScore >= 70) status = "healthy";
      else if (healthScore >= 40) status = "degraded";
      else status = "down";
    }

    return NextResponse.json({
      siteId,
      siteName: siteConfig.name,
      domain: siteConfig.domain,
      status,
      healthScore,
      postsPublished: latestHealth?.posts_published ?? 0,
      lastChecked: latestHealth?.checked_at?.toISOString() ?? null,
    });
  } catch (error) {
    console.warn("[site-health] Probe error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Health check unavailable" },
      { status: 503 },
    );
  }
}
