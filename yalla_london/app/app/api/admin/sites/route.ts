/**
 * Sites API for Site Selector
 *
 * Returns full site data for the admin dashboard site selector.
 * Protected by admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { SITES, getAllSiteIds } from "@/config/sites";

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

/** Convert config/sites.ts entries to Site-shaped objects for the frontend */
function getConfigSites() {
  return getAllSiteIds().map((id) => {
    const cfg = SITES[id];
    return {
      id: cfg.id,
      name: cfg.name,
      slug: cfg.slug,
      domain: cfg.domain,
      theme_id: null,
      settings_json: {},
      homepage_json: null,
      logo_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      default_locale: cfg.locale,
      direction: cfg.direction,
      favicon_url: null,
      primary_color: cfg.primaryColor,
      secondary_color: cfg.secondaryColor,
      features_json: null,
    };
  });
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  // Try database first, fall back to config/sites.ts
  try {
    const { prisma } = await import("@/lib/prisma");
    const sites = await prisma.site.findMany({
      where: { is_active: true },
      orderBy: { created_at: "desc" },
      select: SITE_SELECT,
    });

    if (sites.length > 0) {
      return NextResponse.json({ sites, source: "database" });
    }
  } catch {
    // DB unavailable — fall through to config
  }

  // Fallback: derive sites from config/sites.ts (always accurate)
  const configSites = getConfigSites();
  return NextResponse.json({ sites: configSites, source: "config" });
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
