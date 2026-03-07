export const dynamic = "force-dynamic";

/**
 * DEPRECATED: autopilot cron route
 *
 * Superseded by individual cron jobs scheduled in vercel.json.
 * The scheduler model this depended on is no longer used.
 *
 * This route is NOT scheduled in vercel.json.
 * Kept as a stub so existing tests and references don't break.
 */

import { NextRequest, NextResponse } from "next/server";

const DEPRECATED_MSG = {
  deprecated: true,
  message: "autopilot is superseded by individual cron jobs in vercel.json",
};

export async function GET(request: NextRequest) {
  // Auth: allow if CRON_SECRET not set, reject if set and doesn't match
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[autopilot] DEPRECATED — individual cron jobs handle all scheduling");
  return NextResponse.json(DEPRECATED_MSG);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
