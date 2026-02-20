export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Ideator Agent
 *
 * POST — Run the Ideator agent on a pipeline's research data
 * Body: { pipelineId, selectedTopics: string[] }
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const body = await request.json();
    const { pipelineId, selectedTopics } = body as {
      pipelineId: string;
      selectedTopics?: string[];
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

    if (!pipeline.researchData) {
      return NextResponse.json(
        { error: "Pipeline has no research data. Run the researcher first." },
        { status: 400 },
      );
    }

    // Attempt to import the ideator agent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let runIdeator: ((args: any) => Promise<any>) | null = null;

    try {
      const mod = await import("@/lib/content-engine/ideator");
      runIdeator = mod.runIdeator;
    } catch {
      console.warn("[content-engine/ideate] Ideator module not yet available");
    }

    if (!runIdeator) {
      return NextResponse.json({
        success: false,
        message: "Ideator agent is coming soon. The module at @/lib/content-engine/ideator has not been created yet.",
        pipelineId,
      }, { status: 501 });
    }

    // Update status to ideating
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: { status: "ideating" },
    });

    // Run the ideator with correct input shape
    const contentAngles = await runIdeator({
      topic: pipeline.topic || "general",
      researchData: pipeline.researchData,
      site: pipeline.site,
      existingTitles: selectedTopics || [],
    });

    // Save ideator output and advance status
    const updated = await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: {
        contentAngles: contentAngles as any,
        status: "scripting",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pipelineId,
        status: updated.status,
        contentAngles: updated.contentAngles,
      },
    });
  } catch (error) {
    console.error("[content-engine/ideate] POST error:", error);
    return NextResponse.json(
      { error: "Ideator agent failed" },
      { status: 500 },
    );
  }
}
