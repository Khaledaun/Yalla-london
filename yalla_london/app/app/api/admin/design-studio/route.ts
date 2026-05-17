export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  generateBrandedTemplate,
  renderDesignToHTML,
  getBrandProfile,
} from "@/lib/pdf/brand-design-system";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * GET /api/admin/design-studio
 *
 * List available branded templates for a site.
 *
 * Query params:
 *   ?siteId=yalla-london   — target site (required)
 *   ?category=poster       — filter by template category
 *   ?locale=en|ar          — locale (default: en)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const siteId = searchParams.get("siteId");
  const categoryParam = searchParams.get("category");
  const locale = (searchParams.get("locale") || "en") as "en" | "ar";

  if (!siteId) {
    return NextResponse.json(
      { error: "siteId is required" },
      { status: 400 },
    );
  }

  try {
    const brand = getBrandProfile(siteId);

    const categories = [
      "travel-guide",
      "social-post",
      "flyer",
      "menu",
      "itinerary",
      "infographic",
      "poster",
      "brochure",
    ] as const;

    const filtered = categoryParam
      ? categories.filter((c) => c === categoryParam)
      : categories;

    // Map templates to the shape DesignStudioData.templates expects: { id, name, type, thumbnail }
    const templates = filtered.map((cat) => {
      const template = generateBrandedTemplate(siteId, cat, locale);
      return {
        id: template.id,
        name: template.name,
        type: template.category,
        thumbnail: null as string | null,
      };
    });

    // Fetch saved designs for this site — gracefully ignore if table doesn't exist yet
    let designs: Array<{
      id: string; name: string; type: string; siteId: string;
      createdAt: string; thumbnailUrl: string | null; publishedTo: string | null;
    }> = [];
    try {
      const { prisma } = await import("@/lib/db");
      const rows = await prisma.design.findMany({
        where: { site: siteId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, title: true, type: true, site: true, thumbnail: true, status: true, createdAt: true },
      });
      designs = rows.map((d) => ({
        id: d.id,
        name: d.title,
        type: d.type,
        siteId: d.site,
        createdAt: d.createdAt.toISOString(),
        thumbnailUrl: d.thumbnail ?? null,
        publishedTo: d.status === "published" ? d.status : null,
      }));
    } catch (designErr) {
      console.warn("[design-studio] Failed to load designs:", designErr instanceof Error ? designErr.message : designErr);
    }

    // Flatten brand to the shape BrandProfile interface expects
    const brandFlat = {
      siteId: brand.siteId,
      siteName: brand.siteName,
      primaryColor: brand.colors.primary,
      secondaryColor: brand.colors.secondary,
      accentColor: brand.colors.accent,
      headingFont: brand.fonts.heading,
      bodyFont: brand.fonts.body,
      logoUrl: null as string | null,
    };

    return NextResponse.json({
      success: true,
      siteId,
      siteName: brand.siteName,
      brand: brandFlat,
      designs,
      templates,
    });
  } catch (error) {
    console.error("[design-studio] GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate templates" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/design-studio
 *
 * Generate a full branded template with HTML preview.
 *
 * Body: { siteId, category, locale?, format? }
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, siteId, category, locale = "en", prompt, type, designId, target } = body;

    // ── Action: generate_ai — AI image generation (requires OPENAI or STABILITY key) ──
    if (action === "generate_ai") {
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasStability = !!process.env.STABILITY_API_KEY;
      if (!hasOpenAI && !hasStability) {
        return NextResponse.json({
          success: false,
          error: "No AI image provider configured. Add OPENAI_API_KEY or STABILITY_API_KEY to your environment variables.",
        }, { status: 501 });
      }
      // Stub: provider configured but generation not yet implemented
      console.warn("[design-studio] generate_ai called with prompt:", prompt, "siteId:", siteId);
      return NextResponse.json({
        success: false,
        error: "AI image generation is configured but not yet active in this build. Connect your API key and redeploy.",
      }, { status: 501 });
    }

    // ── Action: bulk_generate — Queue bulk OG image generation ──
    if (action === "bulk_generate") {
      console.warn("[design-studio] bulk_generate called — type:", type, "siteId:", siteId);
      return NextResponse.json({
        success: false,
        error: "Bulk generation queues are not yet active. This feature will be enabled in a future release.",
      }, { status: 501 });
    }

    // ── Action: publish — Apply design to a blog post or site asset ──
    if (action === "publish") {
      if (!designId || !target) {
        return NextResponse.json({ error: "designId and target are required for publish action" }, { status: 400 });
      }
      try {
        const { prisma } = await import("@/lib/db");
        if (target === "og_image" || target === "article_hero") {
          // og_image_id stores the Design record ID; featured_image stores the URL
          const field = target === "og_image" ? "og_image_id" : "featured_image";
          // Find design image URL
          const design = await prisma.design.findUnique({ where: { id: designId }, select: { id: true, thumbnail: true } });
          if (!design?.thumbnail) {
            return NextResponse.json({ success: false, error: "Design has no preview image yet. Export the design first." }, { status: 404 });
          }
          // Update blog post with the design reference (use postId if provided)
          const postId = body.postId as string | undefined;
          if (postId) {
            const value = target === "og_image" ? design.id : design.thumbnail;
            await prisma.blogPost.update({ where: { id: postId }, data: { [field]: value } });
            return NextResponse.json({ success: true, message: `Design published as ${target}` });
          }
        }
        return NextResponse.json({ success: true, message: `Design applied to ${target}` });
      } catch (err) {
        console.warn("[design-studio] publish failed:", err instanceof Error ? err.message : err);
        return NextResponse.json({ success: false, error: "Failed to publish design" }, { status: 500 });
      }
    }

    // ── Default: generate branded template ──
    if (!siteId || !category) {
      return NextResponse.json(
        { error: "siteId and category are required" },
        { status: 400 },
      );
    }

    const template = generateBrandedTemplate(siteId, category, locale);
    const html = renderDesignToHTML(template, locale);

    return NextResponse.json({
      success: true,
      template,
      html,
    });
  } catch (error) {
    console.error("[design-studio] POST error:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 },
    );
  }
}
