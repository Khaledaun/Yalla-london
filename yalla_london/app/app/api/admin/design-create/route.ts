/**
 * Design Create API — one-tap branded asset generation from Canva templates.
 *
 * POST /api/admin/design-create
 *
 * Actions:
 *   social-post    — generate Instagram/TikTok post from Canva square/story template
 *   etsy-listing   — generate Etsy listing image from template 07
 *   email-header   — generate email header from template 10
 *   pdf-cover      — generate PDF cover from templates 01-06
 *   blog-og        — generate blog OG image (1200x630) with brand overlay
 *
 * Each action accepts: { siteId, title, subtitle?, templateId? }
 * Returns: { imageUrl, width, height, templateUsed, savedToMedia }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";
import {
  siteIdToTemplateBrand,
  getSocialTemplates,
  getTemplatesForBrand,
  getTemplateById,
  type CanvaTemplate,
} from "@/lib/canva/template-registry";
import { getBrandDefaults } from "@/lib/design/brand-defaults";

export const dynamic = "force-dynamic";

type CreateAction = "social-post" | "etsy-listing" | "email-header" | "pdf-cover" | "blog-og";

interface CreateRequest {
  action: CreateAction;
  siteId?: string;
  title: string;
  subtitle?: string;
  templateId?: string; // specific canva template ID override
  format?: "square" | "story"; // for social-post
  articleSlug?: string; // for blog-og
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body: CreateRequest = await request.json();
    const { action, title, subtitle, templateId, format, articleSlug } = body;
    const siteId = body.siteId || getDefaultSiteId();
    const brand = siteIdToTemplateBrand(siteId);
    const bd = getBrandDefaults(siteId);
    const config = getSiteConfig(siteId);

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // Resolve template
    let template: CanvaTemplate | undefined;

    if (templateId) {
      template = getTemplateById(templateId);
    } else {
      const templates = getTemplatesForBrand(brand);
      switch (action) {
        case "social-post": {
          const category = format === "story" ? "social-story" : "social-square";
          template = templates.find((t) => t.category === category);
          break;
        }
        case "etsy-listing":
          template = templates.find((t) => t.category === "etsy-listing");
          break;
        case "email-header":
          template = templates.find((t) => t.category === "email-header");
          break;
        case "pdf-cover":
          template = templates.find((t) => t.category === "pdf-cover");
          break;
        case "blog-og":
          // Blog OG uses social-square as base (closest to 1200x630 ratio)
          template = templates.find((t) => t.category === "social-square");
          break;
        default:
          return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
    }

    if (!template) {
      return NextResponse.json(
        { error: `No template found for action=${action} brand=${brand}` },
        { status: 404 }
      );
    }

    // Generate the image via the PDF covers route (which supports canvaTemplate param)
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
        { error: "Image generation failed", status: imgResponse.status },
        { status: 500 }
      );
    }

    // Save to MediaAsset DB
    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const base64 = buffer.toString("base64");
    const slug = `${action}-${brand}-${Date.now()}`;

    const { prisma } = await import("@/lib/db");
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: `${slug}.png`,
        original_name: `${title} — ${action}`,
        mime_type: "image/png",
        file_size: buffer.length,
        width: template.width,
        height: template.height,
        file_type: "image",
        category: action,
        tags: [action, `brand:${brand}`, template.category, ...(articleSlug ? [`article:${articleSlug}`] : [])],
        site_id: siteId,
        url: `data:image/png;base64,${base64}`,
        cloud_storage_path: `design-create/${slug}.png`,
        alt_text: `${config?.name || brand} — ${title}`,
      },
    });

    return NextResponse.json({
      success: true,
      action,
      image: {
        id: asset.id,
        url: `data:image/png;base64,${base64}`,
        width: template.width,
        height: template.height,
      },
      templateUsed: {
        id: template.id,
        name: template.name,
        category: template.category,
        cdnUrl: template.cdnUrl,
      },
      brand: {
        id: brand,
        name: config?.name || brand,
        colors: { primary: bd.primary, secondary: bd.secondary, accent: bd.accent },
      },
      savedToMedia: true,
    });
  } catch (err) {
    console.error("[design-create] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Design creation failed" },
      { status: 500 }
    );
  }
}

// GET — list available creation actions with their template options
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const brand = siteIdToTemplateBrand(siteId);
  const templates = getTemplatesForBrand(brand);

  const actions = [
    {
      action: "social-post",
      label: "Social Media Post",
      description: "Instagram/TikTok post with brand template background",
      formats: [
        { format: "square", label: "Square (1080x1080)", template: templates.find((t) => t.category === "social-square") },
        { format: "story", label: "Story/Reel (1080x1920)", template: templates.find((t) => t.category === "social-story") },
      ],
    },
    {
      action: "etsy-listing",
      label: "Etsy Listing Image",
      description: "Product listing image for Etsy digital downloads",
      template: templates.find((t) => t.category === "etsy-listing"),
    },
    {
      action: "email-header",
      label: "Email Header",
      description: "Branded email header banner (600x200)",
      template: templates.find((t) => t.category === "email-header"),
    },
    {
      action: "pdf-cover",
      label: "PDF Cover",
      description: "Travel guide cover (1200x1600) — 6 styles",
      templates: templates.filter((t) => t.category === "pdf-cover"),
    },
    {
      action: "blog-og",
      label: "Blog OG Image",
      description: "Open Graph image for blog article sharing",
      template: templates.find((t) => t.category === "social-square"),
    },
  ];

  return NextResponse.json({ actions, brand, siteId });
}
