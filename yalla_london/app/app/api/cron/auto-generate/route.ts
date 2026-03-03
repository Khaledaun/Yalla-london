export const dynamic = "force-dynamic";

/**
 * DEPRECATED: auto-generate cron route
 *
 * Superseded by:
 * - /api/cron/content-builder (every 15 min — 8-phase pipeline)
 * - /api/cron/daily-content-generate (daily — direct AI generation)
 *
 * This route is NOT scheduled in vercel.json.
 * Kept as a stub so existing tests and references don't break.
 */

import { NextRequest, NextResponse } from "next/server";

const DEPRECATED_MSG = {
  deprecated: true,
  message: "auto-generate is superseded by content-builder + daily-content-generate",
  replacements: ["/api/cron/content-builder", "/api/cron/daily-content-generate"],
};

export async function GET(request: NextRequest) {
  // Auth: allow if CRON_SECRET not set, reject if set and doesn't match
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[auto-generate] DEPRECATED — use content-builder or daily-content-generate");
  return NextResponse.json(DEPRECATED_MSG);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
