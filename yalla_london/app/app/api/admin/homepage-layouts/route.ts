export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/homepage-layouts
 * Fetch homepage blocks grouped as layouts
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "both";
    const version = searchParams.get("version") || "published";

    const where: any = {};
    if (language !== "both") {
      where.language = { in: [language, "both"] };
    }
    if (version) {
      where.version = version;
    }

    const blocks = await prisma.homepageBlock.findMany({
      where,
      orderBy: { position: "asc" },
      include: { media: true },
    });

    // Group blocks into a layout structure
    const layout = {
      id: "homepage",
      name: `Homepage Layout (${version})`,
      language,
      isActive: version === "published",
      blocks: blocks.map((block) => ({
        id: block.id,
        type: block.type,
        title: block.title_en || block.title_ar || block.type,
        isEnabled: block.enabled,
        order: block.position,
        settings: {
          title_en: block.title_en,
          title_ar: block.title_ar,
          content_en: block.content_en,
          content_ar: block.content_ar,
          ...((block.config as Record<string, unknown>) || {}),
        },
        media: block.media
          ? { id: block.media.id, url: block.media.url }
          : null,
      })),
      createdAt:
        blocks[0]?.created_at?.toISOString() || new Date().toISOString(),
      updatedAt:
        blocks[0]?.updated_at?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      layouts: [layout],
    });
  } catch (error) {
    console.error("Failed to fetch homepage layouts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch layouts" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/admin/homepage-layouts
 * Save homepage layout (upsert blocks)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const layoutData = await request.json();
    const blocks = layoutData.blocks || [];

    await prisma.$transaction(async (tx) => {
      for (const block of blocks) {
        if (block.id && !block.id.startsWith("new-")) {
          // Update existing block
          await tx.homepageBlock.update({
            where: { id: block.id },
            data: {
              type: block.type,
              title_en: block.settings?.title_en || block.title,
              title_ar: block.settings?.title_ar,
              content_en: block.settings?.content_en,
              content_ar: block.settings?.content_ar,
              config: block.settings || {},
              position: block.order ?? 0,
              enabled: block.isEnabled ?? true,
              version: layoutData.version || "draft",
              language: layoutData.language || "both",
              media_id: block.media?.id || null,
            },
          });
        } else {
          // Create new block
          await tx.homepageBlock.create({
            data: {
              type: block.type,
              title_en: block.settings?.title_en || block.title,
              title_ar: block.settings?.title_ar,
              content_en: block.settings?.content_en,
              content_ar: block.settings?.content_ar,
              config: block.settings || {},
              position: block.order ?? 0,
              enabled: block.isEnabled ?? true,
              version: layoutData.version || "draft",
              language: layoutData.language || "both",
              media_id: block.media?.id || null,
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Layout saved successfully",
    });
  } catch (error) {
    console.error("Failed to save homepage layout:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save layout" },
      { status: 500 },
    );
  }
});
