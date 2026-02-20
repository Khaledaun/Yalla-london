export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Pipeline CRUD
 *
 * GET  — List all pipelines (filterable by site, status; paginated)
 * POST — Create a new pipeline record
 */

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const { searchParams } = new URL(request.url);
    const siteId =
      searchParams.get("site") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { site: siteId };
    if (status) {
      where.status = status;
    }

    const [pipelines, total] = await Promise.all([
      prisma.contentPipeline.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          site: true,
          status: true,
          topic: true,
          language: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          // Omit large JSON blobs for list view
          generatedArticleId: true,
          generatedEmailId: true,
        },
      }),
      prisma.contentPipeline.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: pipelines,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[content-engine/pipeline] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipelines" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const body = await request.json();
    const {
      site,
      topic,
      language,
    } = body as {
      site?: string;
      topic?: string;
      language?: string;
    };

    const resolvedSite =
      site ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    if (!resolvedSite) {
      return NextResponse.json(
        { error: "site is required" },
        { status: 400 },
      );
    }

    const pipeline = await prisma.contentPipeline.create({
      data: {
        site: resolvedSite,
        status: "researching",
        topic: topic || null,
        language: language || "en",
      },
    });

    return NextResponse.json({
      success: true,
      data: pipeline,
    }, { status: 201 });
  } catch (error) {
    console.error("[content-engine/pipeline] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create pipeline" },
      { status: 500 },
    );
  }
}
