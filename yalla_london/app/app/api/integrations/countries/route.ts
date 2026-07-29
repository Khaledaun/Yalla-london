import { NextRequest, NextResponse } from "next/server";
import { getDestinationInfo } from "@/lib/apis/countries";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const country = await getDestinationInfo(siteId);
  return NextResponse.json(
    { country, siteId },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200" } }
  );
}
