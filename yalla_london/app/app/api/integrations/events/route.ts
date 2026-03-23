import { NextRequest, NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/apis/events";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "12", 10);
  const category = request.nextUrl.searchParams.get("category") || undefined;

  const events = await getUpcomingEvents(siteId, { limit: Math.min(limit, 30), category });
  return NextResponse.json(
    { events, siteId, count: events.length },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800" } }
  );
}
