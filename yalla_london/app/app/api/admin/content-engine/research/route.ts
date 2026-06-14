export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Research Agent
 *
 * POST — Run the Researcher agent on a pipeline
 * Body: { pipelineId, niche? }
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const body = await request.json();
    const { pipelineId, niche } = body as {
      pipelineId: string;
      niche?: string;
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

    // Import the researcher agent
    const { runResearcher } = await import("@/lib/content-engine/researcher");

    // Update status to researching
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: { status: "researching" },
    });

    // Run the researcher — it persists researchData to the pipeline record internally
    const researchData = await runResearcher({
      site: pipeline.site,
      niche: niche || pipeline.topic || undefined,
      pipelineId: pipeline.id,
    });

    // Save research output and advance status
    const updated = await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: {
        researchData: researchData as any,
        status: "ideating",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pipelineId,
        status: updated.status,
        researchData: updated.researchData,
      },
    });
  } catch (error) {
    console.error("[content-engine/research] POST error:", error);

    // Attempt to mark pipeline as failed-research so it's visible on dashboard
    try {
      const body = await request.clone().json().catch(() => null);
      if (body?.pipelineId) {
        const { prisma } = await import("@/lib/db");
        await prisma.contentPipeline.update({
          where: { id: body.pipelineId },
          data: { status: "researching" },
        });
      }
    } catch (statusErr) {
      console.warn("[content-engine/research] Non-fatal: failed to update pipeline status on error:", statusErr);
    }

    return NextResponse.json(
      { error: "Research agent failed" },
      { status: 500 },
    );
  }
}
