/**
 * GET /api/admin/chrome-bridge/sites
 * Returns all active sites with public-safe config for Chrome Bridge auditing.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { getActiveSiteIds, getSiteConfig, getSiteDomain } = await import(
      "@/config/sites"
    );

    const siteIds = getActiveSiteIds();
    const sites = siteIds.map((id) => {
      const config = getSiteConfig(id);
      return {
        siteId: id,
        name: config?.name ?? id,
        domain: getSiteDomain(id),
        locale: config?.locale ?? "en",
        direction: config?.direction ?? "ltr",
        destination: config?.destination,
        country: config?.country,
        currency: config?.currency,
        primaryKeywordsEN: config?.primaryKeywordsEN ?? [],
        primaryKeywordsAR: config?.primaryKeywordsAR ?? [],
        brandColors: {
          primary: config?.primaryColor,
          secondary: config?.secondaryColor,
        },
      };
    });

    return NextResponse.json({
      success: true,
      sites,
      count: sites.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/sites]", message);
    return NextResponse.json(
      { error: "Failed to load sites" },
      { status: 500 },
    );
  }
}
