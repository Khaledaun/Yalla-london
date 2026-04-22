import { NextRequest, NextResponse } from "next/server";
import { findPhotosForLocations, isGooglePlacesConfigured } from "@/lib/apis/google-places";

export const dynamic = "force-dynamic";

/**
 * GET  /api/integrations/location-photos?locations=NAME1|CONTEXT1,NAME2|CONTEXT2
 * POST /api/integrations/location-photos  body: { locations: [{ name, context? }] }
 *
 * Generic endpoint for verified property/attraction/restaurant photos from
 * Google Places. Used by:
 *   - /hotels (context: "London luxury hotel")
 *   - /experiences (context: attraction's neighbourhood)
 *   - /recommendations (context: formatted_address from data)
 *   - future: /restaurants, /attractions, destination guides
 *
 * Response shape:
 *   {
 *     photos: {
 *       "<name>": {
 *         placeId: string,
 *         urls: { thumbnail, medium, large },
 *         attribution: string   // REQUIRED to display per Google terms
 *       } | null
 *     },
 *     source: "google-places" | "none",
 *     cacheHint: "30d"
 *   }
 */

type LocationInput = { name: string; context?: string };

function parseGetQuery(param: string | null): LocationInput[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const [name, context] = item.split("|").map((v) => v.trim());
      return { name, context: context || undefined };
    })
    .filter((l) => l.name);
}

async function buildResponse(locations: LocationInput[]) {
  if (locations.length === 0) {
    return NextResponse.json(
      { error: "Provide locations (either ?locations=Name|Context,... or POST body { locations: [...] })" },
      { status: 400 },
    );
  }

  if (!isGooglePlacesConfigured()) {
    const nullPhotos: Record<string, null> = {};
    for (const loc of locations) nullPhotos[loc.name] = null;
    return NextResponse.json({
      photos: nullPhotos,
      source: "none",
      note: "GOOGLE_MAPS_API_KEY not set. Add it to Vercel env vars to enable verified photos.",
    });
  }

  const raw = await findPhotosForLocations(locations, 1);
  const photos: Record<string, { placeId: string; urls: { thumbnail: string; medium: string; large: string }; attribution: string } | null> = {};

  for (const [name, result] of Object.entries(raw)) {
    const first = result?.photos?.[0];
    photos[name] = result && first
      ? {
          placeId: result.placeId,
          urls: first.urls,
          attribution: first.attribution,
        }
      : null;
  }

  return NextResponse.json({
    photos,
    source: "google-places",
    cacheHint: "30d",
  });
}

export async function GET(request: NextRequest) {
  const locations = parseGetQuery(request.nextUrl.searchParams.get("locations"));
  return buildResponse(locations);
}

export async function POST(request: NextRequest) {
  let body: { locations?: LocationInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const locations = (body.locations || []).filter((l) => l?.name);
  return buildResponse(locations);
}
