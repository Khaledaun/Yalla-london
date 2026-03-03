export const dynamic = "force-dynamic";

/**
 * DEPRECATED: real-time-optimization cron route
 *
 * Superseded by:
 * - /api/cron/seo-deep-review (00:00 UTC daily — actively fixes all SEO dimensions)
 * - /api/cron/content-auto-fix (11:00 + 18:00 UTC — expands thin content, trims meta)
 *
 * This route is NOT scheduled in vercel.json.
 * Kept as a stub so existing tests and references don't break.
 */

import { NextRequest, NextResponse } from "next/server";

const DEPRECATED_MSG = {
  deprecated: true,
  message: "real-time-optimization is superseded by seo-deep-review + content-auto-fix",
  replacements: ["/api/cron/seo-deep-review", "/api/cron/content-auto-fix"],
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[real-time-optimization] DEPRECATED — use seo-deep-review or content-auto-fix");
  return NextResponse.json(DEPRECATED_MSG);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
