export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  generateVideoTemplate,
  getAvailableVideoTemplates,
  type VideoCategory,
  type VideoFormat,
} from "@/lib/video/brand-video-engine";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-middleware";

const VALID_CATEGORIES: VideoCategory[] = [
  "destination-highlight", "blog-promo", "hotel-showcase", "restaurant-feature",
  "experience-promo", "seasonal-campaign", "listicle-countdown", "travel-tip",
  "before-after", "testimonial",
];
const VALID_FORMATS: VideoFormat[] = [
  "instagram-reel", "instagram-post", "instagram-story", "youtube-short",
  "youtube-video", "tiktok", "facebook-post", "twitter-post", "landscape-wide", "square",
];

function validateCategory(val: string): val is VideoCategory {
  return VALID_CATEGORIES.includes(val as VideoCategory);
}
function validateFormat(val: string): val is VideoFormat {
  return VALID_FORMATS.includes(val as VideoFormat);
}

/**
 * GET /api/admin/video-studio
 *
 * ?action=templates          — list available video template categories
 * ?action=projects           — list video projects from DB with filters
 * ?action=generate           — generate a video template config
 *   &siteId=yalla-london
 *   &category=destination-highlight
 *   &format=instagram-reel
 *   &locale=en
 *   &title=...
 *   &subtitle=...
 *   &images=url1,url2,url3
 *   &duration=15
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action") || "templates";

  try {
    switch (action) {
      case "templates": {
        const templates = getAvailableVideoTemplates();
        return NextResponse.json({ success: true, templates });
      }

      case "projects": {
        const site =
          request.headers.get("x-site-id") || sp.get("site");
        const status = sp.get("status");
        const category = sp.get("category");
        const search = sp.get("search");
        const page = Math.max(1, parseInt(sp.get("page") || "1"));
        const limit = Math.min(
          100,
          Math.max(1, parseInt(sp.get("limit") || "20"))
        );
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {};
        if (site) where.site = site;
        if (status) where.status = status;
        if (category) where.category = category;
        if (search) {
          where.title = { contains: search, mode: "insensitive" };
        }

        const [projects, total] = await Promise.all([
          prisma.videoProject.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
          }),
          prisma.videoProject.count({ where }),
        ]);

        return NextResponse.json({
          projects,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        });
      }

      case "generate": {
        const siteId = sp.get("siteId") || "yalla-london";
        const rawCategory = sp.get("category") || "destination-highlight";
        const rawFormat = sp.get("format") || "instagram-reel";
        if (!validateCategory(rawCategory)) {
          return NextResponse.json({ error: "Invalid video category" }, { status: 400 });
        }
        if (!validateFormat(rawFormat)) {
          return NextResponse.json({ error: "Invalid video format" }, { status: 400 });
        }
        const category = rawCategory;
        const format = rawFormat;
        const locale = (sp.get("locale") || "en") as "en" | "ar";
        const title = sp.get("title") || undefined;
        const subtitle = sp.get("subtitle") || undefined;
        const imagesRaw = sp.get("images") || "";
        const images = imagesRaw ? imagesRaw.split(",").map(s => s.trim()).filter(Boolean) : undefined;
        const duration = sp.get("duration") ? parseInt(sp.get("duration")!) : undefined;

        const template = generateVideoTemplate(siteId, category, format, {
          locale,
          title,
          subtitle,
          images,
          duration,
        });

        return NextResponse.json({ success: true, template });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[video-studio-api] GET error:", error);
    return NextResponse.json(
      { error: "Video studio request failed" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/video-studio
 *
 * Body: { action, siteId, category, format, locale, title, subtitle, images, duration }
 *
 * action: "generate"       — generate a video template config (same as GET but with POST body)
 * action: "render-still"   — render a single frame as PNG (thumbnail)
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action = "generate", siteId, category, format, locale, title, subtitle, images, duration, frame } = body;

    switch (action) {
      case "generate": {
        const template = generateVideoTemplate(
          siteId || "yalla-london",
          category || "destination-highlight",
          format || "instagram-reel",
          { locale: locale || "en", title, subtitle, images, duration },
        );
        return NextResponse.json({ success: true, template });
      }

      case "create": {
        // Create a new VideoProject record in the database
        if (!title || typeof title !== "string" || !title.trim()) {
          return NextResponse.json(
            { error: "title is required" },
            { status: 400 },
          );
        }
        if (!siteId || typeof siteId !== "string") {
          return NextResponse.json(
            { error: "siteId is required" },
            { status: 400 },
          );
        }
        if (typeof body.width !== "number" || body.width <= 0) {
          return NextResponse.json(
            { error: "width must be a positive number" },
            { status: 400 },
          );
        }
        if (typeof body.height !== "number" || body.height <= 0) {
          return NextResponse.json(
            { error: "height must be a positive number" },
            { status: 400 },
          );
        }
        if (typeof duration !== "number" || duration <= 0) {
          return NextResponse.json(
            { error: "duration must be a positive number (seconds)" },
            { status: 400 },
          );
        }

        const project = await prisma.videoProject.create({
          data: {
            title: title.trim(),
            site: siteId.trim(),
            category: category || "destination-highlight",
            format: format || "instagram-reel",
            language: locale || "en",
            scenes: body.scenes || [],
            compositionCode: body.compositionCode || null,
            prompt: body.prompt || null,
            duration,
            fps: body.fps || 30,
            width: body.width,
            height: body.height,
            thumbnail: body.thumbnail || null,
            status: "draft",
          },
        });

        return NextResponse.json({ success: true, project }, { status: 201 });
      }

      case "render-still": {
        // Server-side rendering with @remotion/bundler + @remotion/renderer
        // requires a separate Node.js process (not compatible with Next.js webpack bundling).
        // Use Remotion Lambda or a dedicated render server for MP4 export.
        // The browser @remotion/player provides real-time preview.
        const template = generateVideoTemplate(
          siteId || "yalla-london",
          category || "destination-highlight",
          format || "instagram-reel",
          { locale: locale || "en", title, subtitle, images, duration },
        );

        return NextResponse.json({
          success: true,
          message: "Use the browser player for preview. Server-side MP4 export requires Remotion Lambda setup.",
          template,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[video-studio-api] POST error:", error);
    return NextResponse.json(
      { error: "Video studio operation failed" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/video-studio
 *
 * Update an existing video project by id (from body).
 * Body: { id, ...fields }
 */
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

    const allowedFields = [
      "title",
      "site",
      "category",
      "format",
      "language",
      "scenes",
      "compositionCode",
      "prompt",
      "duration",
      "fps",
      "width",
      "height",
      "thumbnail",
      "exportedUrl",
      "status",
    ];

    const updateData: Record<string, unknown> = {};
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

    const project = await prisma.videoProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, project });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Video project not found" },
        { status: 404 },
      );
    }
    console.error("[video-studio-api] Failed to update project:", error);
    return NextResponse.json(
      { error: "Failed to update video project" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/video-studio
 *
 * Delete a video project by id (query param).
 * ?id=<projectId>
 */
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Video project ID is required" },
        { status: 400 },
      );
    }

    // Prevent deleting a project that is currently rendering
    const existing = await prisma.videoProject.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Video project not found" },
        { status: 404 },
      );
    }

    if (existing.status === "rendering") {
      return NextResponse.json(
        { error: "Cannot delete a video project that is currently rendering" },
        { status: 409 },
      );
    }

    await prisma.videoProject.delete({
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
        { error: "Video project not found" },
        { status: 404 },
      );
    }
    console.error("[video-studio-api] Failed to delete project:", error);
    return NextResponse.json(
      { error: "Failed to delete video project" },
      { status: 500 },
    );
  }
}
