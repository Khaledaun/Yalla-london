export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Analyst Agent
 *
 * POST — Run the Analyst agent on a pipeline's published content
 * Body: { pipelineId }
 */

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const body = await request.json();
    const { pipelineId } = body as { pipelineId: string };

    if (!pipelineId) {
      return NextResponse.json(
        { error: "pipelineId is required" },
        { status: 400 },
      );
    }

    const pipeline = await prisma.contentPipeline.findUnique({
      where: { id: pipelineId },
      include: {
        performance: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      );
    }

    // Attempt to import the analyst agent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let runAnalyst: ((args: any) => Promise<any>) | null = null;

    try {
      const mod = await import("@/lib/content-engine/analyst");
      runAnalyst = mod.runAnalyst;
    } catch {
      console.warn("[content-engine/analyze] Analyst module not yet available");
    }

    if (!runAnalyst) {
      return NextResponse.json({
        success: false,
        message: "Analyst agent is coming soon. The module at @/lib/content-engine/analyst has not been created yet.",
        pipelineId,
      }, { status: 501 });
    }

    // Update status to analyzing
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: { status: "analyzing" },
    });

    // Run the analyst
    const analysisData = await runAnalyst({ pipeline });

    // Save analysis output and advance status
    const updated = await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: {
        analysisData: analysisData as any,
        status: "complete",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pipelineId,
        status: updated.status,
        analysisData: updated.analysisData,
      },
    });
  } catch (error) {
    console.error("[content-engine/analyze] POST error:", error);
    return NextResponse.json(
      { error: "Analyst agent failed" },
      { status: 500 },
    );
  }
}
