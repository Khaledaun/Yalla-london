/**
 * Canva Template API
 *
 * GET  /api/admin/canva-templates
 *      ?brand=yalla-london       — filter by brand
 *      ?category=pdf-cover       — filter by category
 *      ?id=yalla-london--01-...  — get single template
 *
 * POST /api/admin/canva-templates
 *      { action: "seed" }                    — seed all templates to MediaAsset DB
 *      { action: "seed", brand: "yalla-london" } — seed one brand only
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  getAllCanvaTemplates,
  getTemplatesForBrand,
  getTemplatesByCategory,
  getTemplateById,
  getBrandTemplateSet,
  getAvailableBrands,
  getTemplateCount,
  BRAND_TEMPLATE_SETS,
  YALLA_LONDON_BRAND_ASSETS,
  type TemplateBrand,
  type TemplateCategory,
  type CanvaTemplate,
} from "@/lib/canva/template-registry";

export const dynamic = "force-dynamic";

// ── GET — list templates ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = request.nextUrl;
  const brand = searchParams.get("brand") as TemplateBrand | null;
  const category = searchParams.get("category") as TemplateCategory | null;
  const id = searchParams.get("id");

  // Single template lookup
  if (id) {
    const template = getTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: `Template not found: ${id}` }, { status: 404 });
    }
    const brandSet = getBrandTemplateSet(template.brand);
    return NextResponse.json({ template, brand: { displayName: brandSet.displayName, colors: brandSet.colors, fonts: brandSet.fonts } });
  }

  // Filter by brand + optional category
  let templates: CanvaTemplate[];
  if (brand && category) {
    templates = getTemplatesForBrand(brand).filter((t) => t.category === category);
  } else if (brand) {
    templates = getTemplatesForBrand(brand);
  } else if (category) {
    templates = getTemplatesByCategory(category);
  } else {
    templates = getAllCanvaTemplates();
  }

  // Build brand summary
  const brands = getAvailableBrands().map((b) => {
    const set = getBrandTemplateSet(b);
    return {
      brand: b,
      displayName: set.displayName,
      domain: set.domain,
      canvaFolderUrl: set.canvaFolderUrl,
      brandKitId: set.brandKitId,
      colors: set.colors,
      fonts: set.fonts,
      templateCount: set.templates.length,
    };
  });

  return NextResponse.json({
    templates,
    brands,
    totalTemplates: getTemplateCount(),
    brandAssets: brand === "yalla-london" ? YALLA_LONDON_BRAND_ASSETS : undefined,
  });
}

// ── POST — seed templates to MediaAsset DB ────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, brand: brandFilter } = body;

    if (action !== "seed") {
      return NextResponse.json({ error: "Unknown action. Supported: seed" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");

    // Determine which brands to seed
    const brandsToSeed: TemplateBrand[] = brandFilter
      ? [brandFilter as TemplateBrand]
      : getAvailableBrands();

    let seeded = 0;
    let skipped = 0;
    const results: Array<{ id: string; name: string; status: "created" | "exists" }> = [];

    for (const brand of brandsToSeed) {
      const set = BRAND_TEMPLATE_SETS[brand];
      if (!set) continue;

      for (const template of set.templates) {
        // Dedup by tag — check if already seeded
        const existing = await prisma.mediaAsset.findFirst({
          where: {
            tags: { has: `canva-template:${template.id}` },
          },
          select: { id: true },
        });

        if (existing) {
          skipped++;
          results.push({ id: template.id, name: template.name, status: "exists" });
          continue;
        }

        await prisma.mediaAsset.create({
          data: {
            filename: `${template.id}.png`,
            original_name: `${set.displayName} — ${template.name}`,
            mime_type: "image/png",
            file_size: 0, // CDN-hosted, no local file
            width: template.width,
            height: template.height,
            file_type: "image",
            category: template.category,
            tags: [
              `canva-template:${template.id}`,
              `canva-asset:${template.canvaAssetId}`,
              `brand:${brand}`,
              template.category,
              ...template.useCases.slice(0, 3),
            ],
            site_id: brand === "zenitha-yachts" ? "zenitha-yachts-med" : brand,
            url: template.cdnUrl,
            cloud_storage_path: `canva-templates/${template.id}.png`,
            alt_text: `${set.displayName} ${template.name} template`,
          },
        });

        seeded++;
        results.push({ id: template.id, name: template.name, status: "created" });
      }
    }

    return NextResponse.json({
      success: true,
      seeded,
      skipped,
      total: seeded + skipped,
      results,
    });
  } catch (err) {
    console.error("[canva-templates] Seed failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 },
    );
  }
}
