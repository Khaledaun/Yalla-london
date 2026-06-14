export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import {
  generateBrandKit,
  generateBrandKitZip,
} from "@/lib/design/brand-kit-generator";
import { getSiteConfig } from "@/config/sites";

/**
 * GET /api/admin/brand-kit?site=yalla-london
 *
 * Returns the brand kit assets as JSON for a given site.
 * Includes color palette, typography, logo SVGs, and social template metadata.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId = request.nextUrl.searchParams.get("site");

  if (!siteId) {
    return NextResponse.json(
      { error: "Missing required query parameter: site" },
      { status: 400 },
    );
  }

  const siteConfig = getSiteConfig(siteId);
  if (!siteConfig) {
    return NextResponse.json(
      { error: `Unknown site: ${siteId}` },
      { status: 404 },
    );
  }

  try {
    const kit = generateBrandKit(siteId);

    return NextResponse.json({
      siteId,
      siteName: siteConfig.name,
      ...kit,
    });
  } catch (err) {
    console.error(`[brand-kit] Failed to generate brand kit for ${siteId}:`, err);
    return NextResponse.json(
      { error: "Failed to generate brand kit" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/brand-kit
 *
 * Generates and returns a downloadable ZIP file containing the full brand kit.
 *
 * Body: { "siteId": "yalla-london" }
 *
 * Returns: application/zip binary (Content-Disposition: attachment)
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: { siteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { siteId } = body;

  if (!siteId) {
    return NextResponse.json(
      { error: "Missing required field: siteId" },
      { status: 400 },
    );
  }

  const siteConfig = getSiteConfig(siteId);
  if (!siteConfig) {
    return NextResponse.json(
      { error: `Unknown site: ${siteId}` },
      { status: 404 },
    );
  }

  try {
    const zipBuffer = await generateBrandKitZip(siteId);
    const filename = `${siteConfig.slug}-brand-kit.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err) {
    console.error(`[brand-kit] Failed to generate ZIP for ${siteId}:`, err);
    return NextResponse.json(
      { error: "Failed to generate brand kit ZIP" },
      { status: 500 },
    );
  }
}
