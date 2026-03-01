/**
 * Design CRUD API — Single Resource Route
 *
 * GET    — Fetch a single design by id
 * PATCH  — Update a single design by id
 * DELETE — Delete a single design by id
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = params;

    const design = await prisma.design.findUnique({
      where: { id },
    });

    if (!design) {
      return NextResponse.json(
        { error: "Design not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ design });
  } catch (error) {
    console.error(`[designs-api] Failed to fetch design ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch design" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = params;
    const body = await request.json();

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
      if (body[field] !== undefined) {
        updateData[field] = body[field];
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
    console.error(`[designs-api] Failed to update design ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update design" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = params;

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
    console.error(`[designs-api] Failed to delete design ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete design" },
      { status: 500 },
    );
  }
}
