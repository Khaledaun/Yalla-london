export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Single Pipeline
 *
 * GET    — Full pipeline with all JSON data (research, angles, scripts, analysis)
 * PATCH  — Update pipeline fields (status, topic, output data)
 * DELETE — Remove pipeline
 */

function extractId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  // URL: /api/admin/content-engine/pipeline/[id]
  return segments[segments.length - 1] || null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Pipeline ID is required" }, { status: 400 });
    }

    const pipeline = await prisma.contentPipeline.findUnique({
      where: { id },
      include: {
        performance: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    console.error("[content-engine/pipeline/[id]] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Pipeline ID is required" }, { status: 400 });
    }

    const existing = await prisma.contentPipeline.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const body = await request.json();

    // Whitelist of fields that can be updated
    const allowedFields = [
      "status",
      "topic",
      "language",
      "researchData",
      "contentAngles",
      "scripts",
      "analysisData",
      "generatedPosts",
      "generatedArticleId",
      "generatedEmailId",
      "generatedVideoIds",
      "generatedDesignIds",
      "feedForwardApplied",
    ];

    const updateData: Record<string, unknown> = {};
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

    const updated = await prisma.contentPipeline.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[content-engine/pipeline/[id]] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const id = extractId(request);
    if (!id) {
      return NextResponse.json({ error: "Pipeline ID is required" }, { status: 400 });
    }

    const existing = await prisma.contentPipeline.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    // Delete related performance records first, then the pipeline
    await prisma.contentPerformance.deleteMany({ where: { pipelineId: id } });
    await prisma.contentPipeline.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Pipeline deleted" });
  } catch (error) {
    console.error("[content-engine/pipeline/[id]] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete pipeline" },
      { status: 500 },
    );
  }
}
