/**
 * Design Tool Handlers — wraps brand provider for CEO Agent.
 *
 * Tools: get_design_assets
 */

import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// get_design_assets — brand kit, logos, colors, Canva videos
// ---------------------------------------------------------------------------

export async function getDesignAssets(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const siteId = (params.siteId as string) || ctx.siteId;

  try {
    // Dynamic import to avoid circular dependency
    const { getBrandProfile } = await import("@/lib/design/brand-provider");
    const brand = getBrandProfile(siteId);

    if (!brand) {
      return {
        success: false,
        error: `No brand profile found for site "${siteId}".`,
      };
    }

    // Get Canva video count (module may not exist in all environments)
    let videoCount = 0;
    try {
      const registryPath = "@/lib/design/canva-video-registry";
      // Dynamic path prevents TS static analysis from erroring on missing module
      const mod = await import(registryPath);
      if (mod?.getVideoCount) videoCount = mod.getVideoCount();
    } catch (err) {
      console.warn("[agent-design] Canva registry load failed:", err instanceof Error ? err.message : String(err));
    }

    return {
      success: true,
      data: {
        siteName: brand.name,
        colors: brand.colors,
        fonts: brand.fonts,
        logo: brand.logo,
        social: brand.social,
        canvaVideoCount: videoCount,
      },
      summary: `Brand kit for "${brand.name}": ${Object.keys(brand.colors || {}).length} colors, ${videoCount} Canva videos.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Design assets error: ${message}` };
  }
}
