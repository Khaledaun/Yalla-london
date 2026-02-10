export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import {
  uploadToAssetPool,
  listAssetPool,
  getAssetPoolStats,
  bulkEnrichAssets,
  deleteAsset,
} from "@/lib/media/asset-pool";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * GET /api/admin/design-studio/media-pool
 *
 * List media assets in a site's pool or get pool stats.
 *
 * Query params:
 *   ?siteId=yalla-london   — filter by site
 *   ?category=hero          — filter by asset category
 *   ?folder=london/food     — filter by virtual folder
 *   ?type=image             — filter by file type
 *   ?tags=halal,luxury      — filter by tags (comma-separated)
 *   ?search=restaurant      — search title, alt text, filename
 *   ?limit=24&offset=0      — pagination
 *   ?stats=true             — return pool statistics instead of assets
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const siteId = searchParams.get("siteId") || undefined;
  const showStats = searchParams.get("stats") === "true";

  try {
    if (showStats) {
      const stats = await getAssetPoolStats(siteId);
      return NextResponse.json({ success: true, stats });
    }

    const tagsParam = searchParams.get("tags");
    const result = await listAssetPool({
      siteId,
      category: searchParams.get("category") as any || undefined,
      folder: searchParams.get("folder") || undefined,
      fileType: searchParams.get("type") as any || undefined,
      tags: tagsParam ? tagsParam.split(",").map((t) => t.trim()) : undefined,
      search: searchParams.get("search") || undefined,
      limit: parseInt(searchParams.get("limit") || "24", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list media pool",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/design-studio/media-pool
 *
 * Upload a media asset to a site's pool with AI enrichment.
 *
 * Body: multipart/form-data
 *   - file: the media file
 *   - siteId: target site (optional, null = shared)
 *   - category: asset category (optional, AI will detect)
 *   - folder: virtual folder path (optional)
 *   - enrichWithAI: "true"|"false" (default "true")
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    // 50MB limit
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const siteId = formData.get("siteId") as string | null;
    const category = formData.get("category") as string | null;
    const folder = formData.get("folder") as string | null;
    const enrichWithAI = formData.get("enrichWithAI") !== "false";

    const result = await uploadToAssetPool(buffer, file.name, file.type, {
      siteId: siteId || undefined,
      category: (category as any) || undefined,
      folder: folder || undefined,
      enrichWithAI,
    });

    return NextResponse.json(
      { success: true, ...result },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/design-studio/media-pool
 *
 * Bulk enrich assets with AI metadata.
 *
 * Body: { siteId?: string, limit?: number }
 */
export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { siteId, limit = 10 } = body;

    const result = await bulkEnrichAssets(siteId, Math.min(limit, 25));

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Bulk enrichment failed",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/design-studio/media-pool
 *
 * Delete a media asset.
 *
 * Body: { assetId: string }
 */
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: "assetId is required" },
        { status: 400 },
      );
    }

    await deleteAsset(assetId);

    return NextResponse.json({ success: true, deleted: assetId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Delete failed",
      },
      { status: 500 },
    );
  }
}
