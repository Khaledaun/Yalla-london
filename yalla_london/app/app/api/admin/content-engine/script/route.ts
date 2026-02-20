export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Scripter Agent
 *
 * POST — Run the Scripter agent on selected content angles
 * Body: { pipelineId, selectedAngleIds: string[] }
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const body = await request.json();
    const { pipelineId, selectedAngleIds } = body as {
      pipelineId: string;
      selectedAngleIds?: string[];
    };

    if (!pipelineId) {
      return NextResponse.json(
        { error: "pipelineId is required" },
        { status: 400 },
      );
    }

    const pipeline = await prisma.contentPipeline.findUnique({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      );
    }

    if (!pipeline.contentAngles) {
      return NextResponse.json(
        { error: "Pipeline has no content angles. Run the ideator first." },
        { status: 400 },
      );
    }

    // Filter contentAngles to selected IDs if provided
    let anglesToScript = pipeline.contentAngles;
    if (selectedAngleIds && selectedAngleIds.length > 0 && Array.isArray(pipeline.contentAngles)) {
      const angles = pipeline.contentAngles as Array<{ id?: string; [key: string]: unknown }>;
      const filtered = angles.filter((a) => a.id && selectedAngleIds.includes(a.id));
      if (filtered.length > 0) {
        anglesToScript = filtered as any;
      }
    }

    // Attempt to import the scripter agent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let runScripter: ((args: any) => Promise<any>) | null = null;

    try {
      const mod = await import("@/lib/content-engine/scripter");
      runScripter = mod.runScripter;
    } catch {
      console.warn("[content-engine/script] Scripter module not yet available");
    }

    if (!runScripter) {
      return NextResponse.json({
        success: false,
        message: "Scripter agent is coming soon. The module at @/lib/content-engine/scripter has not been created yet.",
        pipelineId,
      }, { status: 501 });
    }

    // Update status to scripting
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: { status: "scripting" },
    });

    // Run the scripter
    const scripts = await runScripter({
      pipeline,
      angles: anglesToScript,
    });

    // Save scripter output and advance status
    const updated = await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: {
        scripts: scripts as any,
        status: "complete",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pipelineId,
        status: updated.status,
        scripts: updated.scripts,
      },
    });
  } catch (error) {
    console.error("[content-engine/script] POST error:", error);
    return NextResponse.json(
      { error: "Scripter agent failed" },
      { status: 500 },
    );
  }
}
