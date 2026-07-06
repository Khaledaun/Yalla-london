import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { searchPhotos, getRandomPhoto, trackDownload } from "@/lib/apis/unsplash";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const query = request.nextUrl.searchParams.get("query") || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "5", 10);
  const random = request.nextUrl.searchParams.get("random") === "true";

  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  if (random) {
    const photo = await getRandomPhoto(query);
    return NextResponse.json({ photos: photo ? [photo] : [], count: photo ? 1 : 0 });
  }

  const photos = await searchPhotos(query, { perPage: Math.min(limit, 10) });
  return NextResponse.json({ photos, count: photos.length });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const { action, downloadUrl } = body;

  if (action === "track_download" && downloadUrl) {
    await trackDownload(downloadUrl);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
