/**
 * Sites API for Site Selector
 *
 * Returns full site data for the admin dashboard site selector.
 * Protected by admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/admin-middleware";

// Force dynamic rendering to avoid build-time database access
export const dynamic = "force-dynamic";

const SITE_SELECT = {
  id: true,
  name: true,
  slug: true,
  domain: true,
  theme_id: true,
  settings_json: true,
  homepage_json: true,
  logo_url: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  default_locale: true,
  direction: true,
  favicon_url: true,
  primary_color: true,
  secondary_color: true,
  features_json: true,
} as const;

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const sites = await prisma.site.findMany({
      where: { is_active: true },
      orderBy: { created_at: "desc" },
      select: SITE_SELECT,
    });

    return NextResponse.json({ sites, source: "database" });
  } catch (error) {
    console.error("Failed to fetch sites:", error);
    return NextResponse.json(
      { sites: [], source: "database", error: "Failed to fetch sites" },
      { status: 500 },
    );
  }
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { siteId } = body;

    if (!siteId) {
      return NextResponse.json(
        { error: "siteId is required" },
        { status: 400 },
      );
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: SITE_SELECT,
    });

    if (site) {
      return NextResponse.json({ site, source: "database" });
    }

    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  } catch (error) {
    console.error("Failed to fetch site:", error);
    return NextResponse.json(
      { error: "Failed to fetch site" },
      { status: 500 },
    );
  }
});
