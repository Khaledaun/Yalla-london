/**
 * Design CRUD API — Collection Route
 *
 * GET    — List designs with filters, search, and pagination
 * POST   — Create a new design
 * PATCH  — Update an existing design by id (from body)
 * DELETE — Delete a design by id (from query param)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";
import { getSiteConfig } from "@/config/sites";

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
