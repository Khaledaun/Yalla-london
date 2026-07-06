/**
 * GET /api/unsplash/photo/[id]
 *
 * Fetches a single photo by ID from Unsplash.
 * Cached in Supabase for 24 hours.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPhoto, buildAttribution } from "@/lib/unsplash";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Missing photo ID" },
      { status: 400 },
    );
  }

  try {
    const photo = await getPhoto(id);

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      photo: {
        ...photo,
        attribution: buildAttribution(photo),
      },
    });
  } catch (err) {
    console.error(
      "[unsplash-photo] Failed:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 },
    );
  }
}
