/**
 * Etsy Sync Cron — DEPRECATED
 *
 * Etsy integration is disabled. This route is not scheduled in vercel.json.
 * Kept as a stub so existing health-check references don't 404.
 *
 * To re-enable: configure Etsy API credentials and add schedule to vercel.json.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const DEPRECATION_MSG = "etsy-sync is deprecated — Etsy integration not active";

async function handle(_request: NextRequest) {
  console.log(`[etsy-sync] ${DEPRECATION_MSG}`);
  return NextResponse.json({
    success: true,
    deprecated: true,
    message: DEPRECATION_MSG,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}
