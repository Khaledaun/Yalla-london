export const dynamic = "force-dynamic";

/**
 * DEPRECATED: seo-health-report cron route
 *
 * Superseded by:
 * - /api/cron/seo-orchestrator (daily + weekly SEO orchestration)
 * - /api/cron/seo-agent (3x daily — discovery, schema injection, auto-fix)
 * - /api/seo/cron (daily + weekly — IndexNow submission, monitoring)
 *
 * This route is NOT scheduled in vercel.json.
 * Kept as a stub so existing tests and references don't break.
 */

import { NextRequest, NextResponse } from "next/server";

const DEPRECATED_MSG = {
  deprecated: true,
  message: "seo-health-report is superseded by seo-orchestrator + seo-agent + seo/cron",
  replacements: ["/api/cron/seo-orchestrator", "/api/cron/seo-agent", "/api/seo/cron"],
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[seo-health-report] DEPRECATED — use seo-orchestrator, seo-agent, or seo/cron");
  return NextResponse.json(DEPRECATED_MSG);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
