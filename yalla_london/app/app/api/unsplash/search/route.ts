/**
 * GET /api/unsplash/search
 *
 * Proxies search requests to Unsplash via SDK.
 * Results are cached in Supabase for 24 hours (critical for 50 req/hr demo tier).
 * Server-side only — UNSPLASH_ACCESS_KEY never exposed to client.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchPhotos, buildAttribution } from "@/lib/unsplash";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q") || searchParams.get("query");
  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter (q)" },
      { status: 400 },
    );
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = Math.min(
    parseInt(searchParams.get("per_page") || "10", 10),
    30,
  );
  const orientation =
    (searchParams.get("orientation") as "landscape" | "portrait" | "squarish") ||
    "landscape";
  const color = searchParams.get("color") || undefined;

  try {
    const photos = await searchPhotos(query, {
      page,
      perPage,
      orientation,
      color,
    });

    return NextResponse.json({
      success: true,
      results: photos.map((p) => ({
        ...p,
        attribution: buildAttribution(p),
      })),
      total: photos.length,
      query,
      page,
      perPage,
    });
  } catch (err) {
    console.error(
      "[unsplash-search] Failed:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 },
    );
  }
}
