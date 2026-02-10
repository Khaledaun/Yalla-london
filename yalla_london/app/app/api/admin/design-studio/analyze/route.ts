export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { analyzeDesignImage, generateDesignFromAnalysis } from "@/lib/pdf/design-analyzer";
import { renderDesignToHTML } from "@/lib/pdf/brand-design-system";

/**
 * POST /api/admin/design-studio/analyze
 *
 * "Give Me Similar Design" — upload a reference design image,
 * AI vision analyzes it, then generates a brand-adapted editable template.
 *
 * Body: multipart/form-data
 *   - file: image file (PNG, JPG, WebP)
 *   - siteId: target site to adapt design for
 *   - locale: "en" | "ar" (optional, default "en")
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const siteId = formData.get("siteId") as string | null;
    const locale = (formData.get("locale") as string) || "en";

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 },
      );
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: PNG, JPG, WebP" },
        { status: 400 },
      );
    }

    // Validate file size (10MB max for vision APIs)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 },
      );
    }

    // Convert to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");

    // 1. AI Vision Analysis
    const analysis = await analyzeDesignImage(imageBase64, file.type);

    // 2. Generate brand-adapted design template
    const template = generateDesignFromAnalysis(
      analysis,
      siteId,
      locale as "en" | "ar",
    );

    // 3. Render to HTML preview
    const html = renderDesignToHTML(template, locale as "en" | "ar");

    return NextResponse.json({
      success: true,
      analysis,
      template,
      html,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Design analysis failed",
      },
      { status: 500 },
    );
  }
}
