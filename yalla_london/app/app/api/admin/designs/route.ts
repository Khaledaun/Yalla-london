/**
 * Design CRUD API — Collection Route
 *
 * GET    — List designs with filters, search, and pagination
 * POST   — Create a new design
 * PATCH  — Update an existing design by id (from body)
 * DELETE — Delete a design by id (from query param)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";
import { getSiteConfig, getDefaultSiteId } from "@/config/sites";
import { getBrandProfile } from "@/lib/design/brand-provider";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const site = request.headers.get("x-site-id") || searchParams.get("site");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const isTemplate = searchParams.get("isTemplate");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (site) where.site = site;
    if (type) where.type = type;
    if (status) where.status = status;
    if (isTemplate === "true") where.isTemplate = true;
    if (isTemplate === "false") where.isTemplate = false;
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.design.count({ where }),
    ]);

    const mappedDesigns = designs.map((design) => ({
      ...design,
      siteId: design.site,
      siteName: getSiteConfig(design.site)?.name || design.site,
    }));

    return NextResponse.json({
      designs: mappedDesigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[designs-api] Failed to list designs:", error);
    return NextResponse.json(
      { error: "Failed to list designs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // ── Seed Starter Designs ──────────────────────────────────
    if (body.action === "seed_designs") {
      const siteId = body.site || getDefaultSiteId();
      const brand = getBrandProfile(siteId);
      const siteName = brand.name || siteId;

      const SEED_DESIGNS = [
        { title: `${siteName} — Instagram Post`, type: "social", category: "instagram", width: 1080, height: 1080, description: "Square social media post template" },
        { title: `${siteName} — Instagram Story`, type: "social", category: "story", width: 1080, height: 1920, description: "Vertical story template" },
        { title: `${siteName} — Blog Header`, type: "blog-header", category: "header", width: 1200, height: 630, description: "Blog article header image" },
        { title: `${siteName} — Facebook Post`, type: "social", category: "facebook", width: 1200, height: 630, description: "Facebook post template" },
        { title: `${siteName} — Twitter/X Post`, type: "social", category: "twitter", width: 1200, height: 675, description: "Twitter post template" },
        { title: `${siteName} — YouTube Thumbnail`, type: "video", category: "thumbnail", width: 1280, height: 720, description: "YouTube video thumbnail" },
        { title: `${siteName} — Email Header`, type: "email", category: "header", width: 600, height: 200, description: "Email campaign header banner" },
        { title: `${siteName} — Logo Lockup`, type: "logo", category: "branding", width: 800, height: 400, description: "Primary logo with brand colors" },
        { title: `${siteName} — Pinterest Pin`, type: "social", category: "pinterest", width: 1000, height: 1500, description: "Tall Pinterest pin template" },
        { title: `${siteName} — OG Image`, type: "social", category: "og", width: 1200, height: 630, description: "Open Graph sharing image" },
      ];

      // Check which already exist (by title + site)
      const existing = await prisma.design.findMany({
        where: { site: siteId },
        select: { title: true },
      });
      const existingTitles = new Set(existing.map((d) => d.title));

      let created = 0;
      let skipped = 0;
      for (const seed of SEED_DESIGNS) {
        if (existingTitles.has(seed.title)) {
          skipped++;
          continue;
        }
        // Build a simple canvas placeholder with brand colors
        const canvasData = {
          version: "1.0",
          background: brand.colors.primary,
          elements: [
            {
              type: "rect",
              x: 0, y: 0,
              width: seed.width, height: seed.height,
              fill: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})`,
            },
            {
              type: "text",
              x: seed.width / 2, y: seed.height / 2,
              text: seed.title.replace(`${siteName} — `, ""),
              fontSize: Math.round(seed.width / 15),
              color: "#FFFFFF",
              fontFamily: brand.fonts.heading.name,
              textAlign: "center",
            },
          ],
        };

        await prisma.design.create({
          data: {
            title: seed.title,
            description: seed.description,
            type: seed.type,
            category: seed.category,
            site: siteId,
            canvasData,
            width: seed.width,
            height: seed.height,
            tags: [seed.type, seed.category, "template", "starter"],
            isTemplate: true,
            status: "published",
          },
        });
        created++;
      }

      return NextResponse.json({ success: true, created, skipped, total: SEED_DESIGNS.length });
    }

    // ── Create Single Design ──────────────────────────────────
    const {
      title,
      description,
      type,
      category,
      site,
      canvasData,
      width,
      height,
      tags,
      isTemplate,
      templateId,
      status,
    } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }
    if (!type || typeof type !== "string" || !type.trim()) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 },
      );
    }
    if (!site || typeof site !== "string" || !site.trim()) {
      return NextResponse.json(
        { error: "site is required" },
        { status: 400 },
      );
    }
    if (canvasData === undefined || canvasData === null) {
      return NextResponse.json(
        { error: "canvasData is required" },
        { status: 400 },
      );
    }
    if (typeof width !== "number" || width <= 0) {
      return NextResponse.json(
        { error: "width must be a positive number" },
        { status: 400 },
      );
    }
    if (typeof height !== "number" || height <= 0) {
      return NextResponse.json(
        { error: "height must be a positive number" },
        { status: 400 },
      );
    }

    const design = await prisma.design.create({
      data: {
        title: title.trim(),
        description: description || null,
        type: type.trim(),
        category: category || null,
        site: site.trim(),
        canvasData,
        width,
        height,
        tags: Array.isArray(tags) ? tags : [],
        isTemplate: isTemplate === true,
        templateId: templateId || null,
        status: status || "draft",
      },
    });

    return NextResponse.json({ design }, { status: 201 });
  } catch (error) {
    console.error("[designs-api] Failed to create design:", error);
    return NextResponse.json(
      { error: "Failed to create design" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 },
      );
    }

    // Build update data from allowed fields only
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "title",
      "description",
      "type",
      "category",
      "site",
      "canvasData",
      "thumbnail",
      "exportedUrls",
      "width",
      "height",
      "tags",
      "isTemplate",
      "templateId",
      "status",
      "createdBy",
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const design = await prisma.design.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ design });
  } catch (error: unknown) {
    // Prisma P2025: record not found
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Design not found" },
        { status: 404 },
      );
    }
    console.error("[designs-api] Failed to update design:", error);
    return NextResponse.json(
      { error: "Failed to update design" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Design ID is required" },
        { status: 400 },
      );
    }

    await prisma.design.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Design not found" },
        { status: 404 },
      );
    }
    console.error("[designs-api] Failed to delete design:", error);
    return NextResponse.json(
      { error: "Failed to delete design" },
      { status: 500 },
    );
  }
}
