/**
 * Commerce Assets API — Product files and preview images
 *
 * POST: Upload/validate assets, update draft references
 * GET: List assets for a draft
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get("draftId");

    if (!draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 });
    }

    const { getDraftAssets } = await import("@/lib/commerce/asset-manager");
    const assets = await getDraftAssets(draftId);

    return NextResponse.json({ data: assets });
  } catch (err) {
    console.warn("[commerce-assets] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── Validate a product file ──
    if (action === "validate_file") {
      const { fileName, fileSize } = body as { fileName: string; fileSize: number };
      if (!fileName || !fileSize) {
        return NextResponse.json({ error: "fileName and fileSize required" }, { status: 400 });
      }

      const { validateProductFile } = await import("@/lib/commerce/asset-manager");
      const result = validateProductFile(fileName, fileSize);

      return NextResponse.json({ success: true, data: result });
    }

    // ── Validate preview images ──
    if (action === "validate_images") {
      const { images } = body as { images: { fileName: string; fileSize: number }[] };
      if (!images || !Array.isArray(images)) {
        return NextResponse.json({ error: "images array required" }, { status: 400 });
      }

      const { validatePreviewImages } = await import("@/lib/commerce/asset-manager");
      const result = validatePreviewImages(images);

      return NextResponse.json({ success: true, data: result });
    }

    // ── Update draft file URL ──
    if (action === "set_file_url") {
      const { draftId, fileUrl } = body as { draftId: string; fileUrl: string };
      if (!draftId || !fileUrl) {
        return NextResponse.json({ error: "draftId and fileUrl required" }, { status: 400 });
      }

      const { updateDraftFileUrl } = await import("@/lib/commerce/asset-manager");
      await updateDraftFileUrl(draftId, fileUrl);

      return NextResponse.json({ success: true, message: "File URL updated" });
    }

    // ── Update preview images ──
    if (action === "set_preview_images") {
      const { draftId, images } = body as {
        draftId: string;
        images: { url: string; fileName: string; position: number; alt?: string }[];
      };
      if (!draftId || !images) {
        return NextResponse.json({ error: "draftId and images required" }, { status: 400 });
      }

      const { updateDraftPreviewImages } = await import("@/lib/commerce/asset-manager");
      await updateDraftPreviewImages(draftId, images);

      return NextResponse.json({ success: true, message: "Preview images updated" });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: validate_file, validate_images, set_file_url, set_preview_images` },
      { status: 400 },
    );
  } catch (err) {
    console.warn("[commerce-assets] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
