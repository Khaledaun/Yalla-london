/**
 * Social Frame Generator API
 *
 * Generates branded social media images using Canva frame templates.
 * Supports all portfolio brands: Yalla London, Zenitha Yachts, WTME.
 *
 * POST /api/social/generate-frame
 *   { siteId, frameType, language, title, subtitle?, imageUrl?, articleId? }
 *   → { frameId, canvaDesignId, canvaEditUrl, editableFields, brand }
 *
 * GET /api/social/generate-frame?siteId=worldtme&lang=en
 *   → List available frames for the site/language
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";
import {
  getWtmeFrames,
  getWtmeFrame,
  getWtmeFramePair,
  WTME_BRAND,
  WTME_CANVA_FOLDER_URL,
  type WtmeFrameType,
  type WtmeFrameLang,
} from "@/lib/canva/wtme-registry";
import {
  siteIdToTemplateBrand,
  getSocialTemplates,
  getTemplateById,
} from "@/lib/canva/template-registry";

export const dynamic = "force-dynamic";

// ── GET — list available frames for a site ────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get("siteId") || getDefaultSiteId();
  const lang = (searchParams.get("lang") as WtmeFrameLang) || undefined;
  const type = (searchParams.get("type") as WtmeFrameType) || undefined;

  // WTME has its own frame system
  if (siteId === "worldtme") {
    const frames = getWtmeFrames({ type, lang });
    return NextResponse.json({
      siteId,
      brand: "worldtme",
      canvaFolderUrl: WTME_CANVA_FOLDER_URL,
      frames: frames.map((f) => ({
        id: f.id,
        canvaDesignId: f.canvaDesignId,
        type: f.type,
        lang: f.lang,
        purpose: f.purpose,
        purposeAr: f.purposeAr,
        dimensions: `${f.width}×${f.height}`,
        editableFields: f.editableFields,
        canvaEditUrl: `https://www.canva.com/design/${f.canvaDesignId}/edit`,
      })),
      totalFrames: frames.length,
      colors: WTME_BRAND.colors,
    });
  }

  // Other brands use the Canva template registry
  const brand = siteIdToTemplateBrand(siteId);
  const templates = getSocialTemplates(brand);

  return NextResponse.json({
    siteId,
    brand,
    frames: templates.map((t) => ({
      id: t.id,
      canvaAssetId: t.canvaAssetId,
      type: t.category === "social-story" ? "story" : "ig_post",
      dimensions: `${t.width}×${t.height}`,
      cdnUrl: t.cdnUrl,
      thumbnailUrl: t.thumbnailUrl,
    })),
    totalFrames: templates.length,
  });
}

// ── POST — generate a social frame for content ────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      siteId: rawSiteId,
      frameType = "photo",
      format = "story",
      language = "en",
      title,
      titleAr,
      subtitle,
      imageUrl,
      articleId,
    } = body;

    const siteId = rawSiteId || getDefaultSiteId();
    const config = getSiteConfig(siteId);

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // ── WTME frames ──
    if (siteId === "worldtme") {
      const pair = getWtmeFramePair(
        frameType as "photo" | "quote" | "promo" | "event" | "list",
        format as "story" | "ig_post"
      );

      const enFrame = pair.en;
      const arFrame = pair.ar;

      // For WTME, we return the Canva design IDs so the user (or Canva MCP)
      // can clone and customize the template with the article content
      const result: Record<string, unknown> = {
        siteId,
        brand: "worldtme",
        frameType,
        format,
      };

      if (language === "both" || language === "en") {
        result.en = enFrame ? {
          frameId: enFrame.id,
          canvaDesignId: enFrame.canvaDesignId,
          canvaEditUrl: `https://www.canva.com/design/${enFrame.canvaDesignId}/edit`,
          dimensions: `${enFrame.width}×${enFrame.height}`,
          editableFields: enFrame.editableFields,
          suggestedContent: {
            title,
            subtitle: subtitle || config?.destination || "",
            ...(imageUrl ? { photo: imageUrl } : {}),
          },
        } : null;
      }

      if (language === "both" || language === "ar") {
        result.ar = arFrame ? {
          frameId: arFrame.id,
          canvaDesignId: arFrame.canvaDesignId,
          canvaEditUrl: `https://www.canva.com/design/${arFrame.canvaDesignId}/edit`,
          dimensions: `${arFrame.width}×${arFrame.height}`,
          editableFields: arFrame.editableFields,
          suggestedContent: {
            title: titleAr || title,
            subtitle: subtitle || "",
            ...(imageUrl ? { photo: imageUrl } : {}),
          },
        } : null;
      }

      // Save to DB for tracking
      if (articleId) {
        try {
          const { prisma } = await import("@/lib/db");
          await prisma.auditLog.create({
            data: {
              action: "SOCIAL_FRAME_GENERATED",
              details: {
                siteId,
                articleId,
                frameType,
                format,
                language,
                enFrameId: enFrame?.id,
                arFrameId: arFrame?.id,
              },
            },
          });
        } catch (err) {
          console.warn("[generate-frame] Audit log failed:", err instanceof Error ? err.message : String(err));
        }
      }

      return NextResponse.json({ success: true, ...result });
    }

    // ── Other brands — use Canva template registry CDN images ──
    const brand = siteIdToTemplateBrand(siteId);
    const templates = getSocialTemplates(brand);
    const template = format === "story"
      ? templates.find((t) => t.category === "social-story")
      : templates.find((t) => t.category === "social-square");

    if (!template) {
      return NextResponse.json(
        { error: `No ${format} template found for brand ${brand}` },
        { status: 404 }
      );
    }

    // Generate image via the design-create API (renders text over CDN template)
    const params = new URLSearchParams({
      generate: "true",
      canvaTemplate: template.id,
      title,
      subtitle: subtitle || "",
      siteId,
    });

    const imgResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/pdf-covers?${params}`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
          authorization: request.headers.get("authorization") || "",
        },
      }
    );

    if (!imgResponse.ok) {
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Save to MediaAsset
    const { prisma } = await import("@/lib/db");
    const slug = `social-${format}-${brand}-${Date.now()}`;
    await prisma.mediaAsset.create({
      data: {
        filename: `${slug}.png`,
        original_name: `${title} — ${format}`,
        mime_type: "image/png",
        file_size: buffer.length,
        width: template.width,
        height: template.height,
        file_type: "image",
        category: `social-${format}`,
        tags: [`social-${format}`, `brand:${brand}`, ...(articleId ? [`article:${articleId}`] : [])],
        site_id: siteId,
        url: `data:image/png;base64,${base64}`,
        cloud_storage_path: `social-frames/${slug}.png`,
        alt_text: `${config?.name || brand} — ${title}`,
      },
    });

    return NextResponse.json({
      success: true,
      siteId,
      brand,
      format,
      imageUrl: `data:image/png;base64,${base64}`,
      dimensions: `${template.width}×${template.height}`,
      templateUsed: template.id,
      savedToMedia: true,
    });
  } catch (err) {
    console.error("[generate-frame] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Frame generation failed" },
      { status: 500 }
    );
  }
}
