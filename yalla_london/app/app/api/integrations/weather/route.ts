import { NextRequest, NextResponse } from "next/server";
import { getWeatherForecast } from "@/lib/apis/weather";
import { getDefaultSiteId } from "@/config/sites";

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const days = parseInt(request.nextUrl.searchParams.get("days") || "7", 10);

  const forecasts = await getWeatherForecast(siteId, Math.min(days, 14));
  return NextResponse.json(
    { forecasts, siteId },
    { headers: { "Cache-Control": "public, s-maxage=10800, stale-while-revalidate=3600" } }
  );
}
