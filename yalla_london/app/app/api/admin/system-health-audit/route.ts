export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * System Health Audit API
 *
 * POST: Runs all 47 checks across 12 sections and returns a comprehensive
 *       health report with scores, statuses, and actionable suggestions.
 *
 * Admin-authenticated. Takes 30-90 seconds depending on external API latency.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

async function handlePost(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { runSystemHealthAudit } = await import("@/lib/health-audit");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const body = await request.json().catch(() => ({}));
    const siteId = body.siteId || getDefaultSiteId();
    const domain = getSiteDomain(siteId);
    const siteUrl = domain.startsWith("http") ? domain : `https://${domain}`;

    const report = await runSystemHealthAudit({ siteUrl, siteId });

    return NextResponse.json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[system-health-audit] Fatal error:", msg);
    return NextResponse.json(
      { error: "Audit failed", message: msg },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
