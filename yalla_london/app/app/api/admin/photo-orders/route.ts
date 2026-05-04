/**
 * Photo Order API — per-article Unsplash photo requests
 * GET  /api/admin/photo-orders          — list pending orders
 * POST /api/admin/photo-orders          — create/update an order (set query + status=pending)
 * PATCH /api/admin/photo-orders         — "Seed Now" — immediately fetch photo from Unsplash
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = request.headers.get("x-site-id") || request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const orders = await prisma.blogPost.findMany({
      where: { photo_order_status: "pending", photo_order_query: { not: null }, siteId },
      select: {
        id: true,
        title_en: true,
        slug: true,
        siteId: true,
        photo_order_query: true,
        photo_order_status: true,
        featured_image: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });
    return NextResponse.json({ orders, total: orders.length });
  } catch (err) {
    console.warn("[photo-orders] GET failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { blogPostId, query } = body;

    if (!blogPostId || typeof blogPostId !== "string") {
      return NextResponse.json({ error: "blogPostId required" }, { status: 400 });
    }
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json({ error: "query must be at least 2 characters" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");
    await prisma.blogPost.update({
      where: { id: blogPostId },
      data: {
        photo_order_query: query.trim(),
        photo_order_status: "pending",
      },
    });

    return NextResponse.json({ success: true, status: "pending", query: query.trim() });
  } catch (err) {
    console.warn("[photo-orders] POST failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { blogPostId } = body;

    if (!blogPostId || typeof blogPostId !== "string") {
      return NextResponse.json({ error: "blogPostId required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");

    const post = await prisma.blogPost.findUnique({
      where: { id: blogPostId },
      select: { id: true, photo_order_query: true, photo_order_status: true, enhancement_log: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    if (!post.photo_order_query) {
      return NextResponse.json({ error: "No photo order query set for this article" }, { status: 400 });
    }

    // Fetch photo from Unsplash
    const { getRandomPhoto, trackDownload, buildImageUrl } = await import("@/lib/apis/unsplash");

    const photo = await getRandomPhoto(post.photo_order_query, "landscape");
    if (!photo) {
      await prisma.blogPost.update({
        where: { id: blogPostId },
        data: { photo_order_status: "failed" },
      });
      return NextResponse.json({ error: "No photo found for query", status: "failed" }, { status: 404 });
    }

    const imageUrl = buildImageUrl(photo.urls.raw, { width: 1200, height: 675, quality: 80, format: "webp" });

    const existingLog = Array.isArray(post.enhancement_log) ? post.enhancement_log as unknown[] : [];
    const newLogEntry = {
      type: "photo_order",
      cron: "manual-seed-now",
      timestamp: new Date().toISOString(),
      summary: `Photo ordered: "${post.photo_order_query}" → ${photo.id} by ${photo.photographer?.name ?? "unknown"}`,
    };

    await prisma.blogPost.update({
      where: { id: blogPostId },
      data: {
        featured_image: imageUrl,
        photo_order_status: "fulfilled",
        enhancement_log: [...existingLog, newLogEntry] as never,
      },
    });

    // Required by Unsplash ToS
    await trackDownload(photo.downloadUrl).catch((e: unknown) =>
      console.warn("[photo-orders] trackDownload failed:", e instanceof Error ? e.message : String(e))
    );

    return NextResponse.json({
      success: true,
      imageUrl,
      photoId: photo.id,
      photographer: photo.photographer?.name ?? "unknown",
      photographerUrl: photo.photographer?.profileUrl ?? null,
    });
  } catch (err) {
    console.warn("[photo-orders] PATCH failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to seed photo" }, { status: 500 });
  }
}
