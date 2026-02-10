export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  generateBrandedTemplate,
  renderDesignToHTML,
  getBrandProfile,
} from "@/lib/pdf/brand-design-system";

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

    const templates = filtered.map((cat) => {
      const template = generateBrandedTemplate(siteId, cat, locale);
      return {
        id: template.id,
        name: template.name,
        nameAr: template.nameAr,
        category: template.category,
        format: template.format,
        siteId: template.siteId,
        pageCount: template.pages.length,
        elementCount: template.pages.reduce(
          (sum, p) => sum + p.elements.length,
          0,
        ),
      };
    });

    return NextResponse.json({
      success: true,
      brand: {
        siteId: brand.siteId,
        siteName: brand.siteName,
        colors: brand.colors,
        fonts: brand.fonts,
      },
      templates,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate templates",
      },
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
  try {
    const body = await request.json();
    const { siteId, category, locale = "en" } = body;

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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate template",
      },
      { status: 500 },
    );
  }
}
