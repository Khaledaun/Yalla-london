import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  CANVA_VIDEO_COLLECTIONS,
  type CanvaVideoCollection,
} from "@/lib/design/canva-video-registry";

/**
 * Estimates video duration in seconds based on page count and category.
 * - Reels / aesthetic clips: ~15s per page
 * - Short clips (beach): ~5s per page
 * - Brand promo: ~10s per page
 */
function estimateDuration(collection: CanvaVideoCollection): number {
  switch (collection.category) {
    case "beach-clips":
      return collection.pageCount * 5;
    case "brand-promo":
      return collection.pageCount * 10;
    default:
      return collection.pageCount * 15;
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    let seeded = 0;
    let skipped = 0;

    for (const collection of CANVA_VIDEO_COLLECTIONS) {
      // Check if a VideoProject with this canvaDesignId already exists in scenes JSON
      const existing = await prisma.videoProject.findFirst({
        where: {
          scenes: {
            path: ["canvaDesignId"],
            equals: collection.canvaDesignId,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const scenesData = {
        canvaDesignId: collection.canvaDesignId,
        pageCount: collection.pageCount,
        canvaEditUrl: collection.canvaEditUrl,
        canvaViewUrl: collection.canvaViewUrl,
        tags: collection.tags,
        suitableFor: collection.suitableFor,
        format: collection.format,
        createdAt: collection.createdAt,
      };

      await prisma.videoProject.create({
        data: {
          title: collection.title,
          site: "yalla-london",
          category: collection.category,
          format: "vertical",
          language: "en",
          scenes: scenesData,
          duration: estimateDuration(collection),
          fps: 30,
          width: collection.width,
          height: collection.height,
          status: "ready",
        },
      });

      seeded++;
    }

    return NextResponse.json({
      success: true,
      seeded,
      skipped,
      total: CANVA_VIDEO_COLLECTIONS.length,
    });
  } catch (err) {
    console.error("[seed-canva-videos] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, error: "Failed to seed Canva video assets" },
      { status: 500 }
    );
  }
}
