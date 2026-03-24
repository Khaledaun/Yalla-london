/**
 * POST /api/unsplash/download
 *
 * Triggers the Unsplash download tracking event.
 * REQUIRED by Unsplash ToS — must be called when a user "uses" a photo
 * (views detail page, clicks to expand, or photo is displayed prominently).
 *
 * Called by the <UnsplashImage /> component's IntersectionObserver.
 */

import { NextRequest, NextResponse } from "next/server";
import { triggerDownload } from "@/lib/unsplash";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { downloadLocation } = body;

    if (!downloadLocation || typeof downloadLocation !== "string") {
      return NextResponse.json(
        { error: "Missing downloadLocation" },
        { status: 400 },
      );
    }

    // Validate it's an Unsplash URL
    if (!downloadLocation.includes("unsplash.com")) {
      return NextResponse.json(
        { error: "Invalid download location" },
        { status: 400 },
      );
    }

    await triggerDownload(downloadLocation);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn(
      "[unsplash-download] Failed:",
      err instanceof Error ? err.message : String(err),
    );
    // Non-critical — still return 200 to not block the frontend
    return NextResponse.json({ success: true, warning: "tracking failed" });
  }
}
