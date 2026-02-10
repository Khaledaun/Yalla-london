export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  generateVideoTemplate,
  getAvailableVideoTemplates,
  type VideoCategory,
  type VideoFormat,
} from "@/lib/video/brand-video-engine";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * GET /api/admin/video-studio
 *
 * ?action=templates          — list available video template categories
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

      case "generate": {
        const siteId = sp.get("siteId") || "yalla-london";
        const category = (sp.get("category") || "destination-highlight") as VideoCategory;
        const format = (sp.get("format") || "instagram-reel") as VideoFormat;
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video template generation failed" },
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video studio operation failed" },
      { status: 500 },
    );
  }
}
