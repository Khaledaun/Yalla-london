/**
 * Video Studio Render API
 *
 * POST — Start rendering a video project
 * GET  — Check render status for a video project
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { videoProjectId } = body;

    if (!videoProjectId || typeof videoProjectId !== "string") {
      return NextResponse.json(
        { error: "videoProjectId is required" },
        { status: 400 }
      );
    }

    // Load the video project
    const project = await prisma.videoProject.findUnique({
      where: { id: videoProjectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Video project not found" },
        { status: 404 }
      );
    }

    // Prevent re-rendering if already in progress
    if (project.status === "rendering") {
      return NextResponse.json(
        { error: "Video project is already rendering" },
        { status: 409 }
      );
    }

    // Mark as rendering
    await prisma.videoProject.update({
      where: { id: videoProjectId },
      data: { status: "rendering" },
    });

    // Attempt to use the render engine if available
    let renderEngineAvailable = false;
    try {
      const renderModule = await import(
        /* webpackIgnore: true */ "@/lib/video/render-engine"
      );
      if (typeof renderModule.renderVideoToMp4 === "function") {
        renderEngineAvailable = true;

        // Fire-and-forget: start the render in the background.
        // The render engine is responsible for updating the VideoProject
        // status to "rendered" or "failed" when complete.
        renderModule
          .renderVideoToMp4(videoProjectId)
          .catch((err: unknown) => {
            console.error(
              `[video-studio-render] Render failed for ${videoProjectId}:`,
              err instanceof Error ? err.message : err
            );
            // Mark as failed if the render engine throws
            prisma.videoProject
              .update({
                where: { id: videoProjectId },
                data: { status: "failed" },
              })
              .catch((updateErr: unknown) => {
                console.error(
                  "[video-studio-render] Could not mark project as failed:",
                  updateErr
                );
              });
          });

        return NextResponse.json({
          success: true,
          status: "rendering",
          projectId: videoProjectId,
          message: "Render started. Check status via GET with ?id=<projectId>",
        });
      }
    } catch {
      // render-engine module not found — fall through to queued
      console.warn(
        "[video-studio-render] render-engine module not available, queuing project"
      );
    }

    // If no render engine is available, queue the project
    if (!renderEngineAvailable) {
      await prisma.videoProject.update({
        where: { id: videoProjectId },
        data: { status: "queued" },
      });

      return NextResponse.json({
        success: true,
        status: "queued",
        projectId: videoProjectId,
        message:
          "Rendering requires server infrastructure (Remotion Lambda or a dedicated render server). " +
          "Project has been queued and will render when infrastructure is configured.",
      });
    }

    // Should not reach here, but return generic success just in case
    return NextResponse.json({
      success: true,
      status: "rendering",
      projectId: videoProjectId,
    });
  } catch (error) {
    console.error("[video-studio-render] Render request failed:", error);
    return NextResponse.json(
      { error: "Failed to start video render" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Video project ID is required (?id=...)" },
        { status: 400 }
      );
    }

    const project = await prisma.videoProject.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        exportedUrl: true,
        thumbnail: true,
        duration: true,
        format: true,
        updatedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Video project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("[video-studio-render] Status check failed:", error);
    return NextResponse.json(
      { error: "Failed to check render status" },
      { status: 500 }
    );
  }
}
