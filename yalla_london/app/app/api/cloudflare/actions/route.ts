export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { cloudflare } from "@/lib/integrations/cloudflare";

/**
 * Cloudflare Actions API
 * POST /api/cloudflare/actions
 *
 * Perform actions: purge cache, update settings, create page rules.
 *
 * Body: { action: string, params?: object }
 *
 * Actions:
 *   purge_all              - Purge entire cache
 *   purge_urls             - Purge specific URLs { urls: string[] }
 *   set_browser_cache_ttl  - { seconds: number }
 *   set_cache_level        - { level: "aggressive" | "basic" | "simplified" }
 *   set_always_https       - { enabled: boolean }
 *   set_minify             - { js: "on"|"off", css: "on"|"off", html: "on"|"off" }
 *   set_ssl                - { mode: "off"|"flexible"|"full"|"strict" }
 *   create_page_rule       - { url: string, actions: Array<{id,value}> }
 */
export async function POST(request: NextRequest) {
  try {
    if (!cloudflare.isConfigured()) {
      return NextResponse.json(
        { success: false, error: "Cloudflare not configured" },
        { status: 503 },
      );
    }

    const { action, params } = await request.json();

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing 'action' field" },
        { status: 400 },
      );
    }

    let result = false;
    let message = "";

    switch (action) {
      case "purge_all":
        result = await cloudflare.purgeEverything();
        message = result ? "Full cache purge completed" : "Cache purge failed";
        break;

      case "purge_urls":
        if (!params?.urls?.length) {
          return NextResponse.json(
            { success: false, error: "Missing params.urls array" },
            { status: 400 },
          );
        }
        result = await cloudflare.purgeURLs(params.urls);
        message = result
          ? `Purged ${params.urls.length} URLs`
          : "URL purge failed";
        break;

      case "set_browser_cache_ttl":
        if (!params?.seconds) {
          return NextResponse.json(
            { success: false, error: "Missing params.seconds" },
            { status: 400 },
          );
        }
        result = await cloudflare.setBrowserCacheTTL(params.seconds);
        message = result
          ? `Browser cache TTL set to ${params.seconds}s`
          : "Failed to update TTL";
        break;

      case "set_cache_level":
        if (!params?.level) {
          return NextResponse.json(
            { success: false, error: "Missing params.level" },
            { status: 400 },
          );
        }
        result = await cloudflare.setCacheLevel(params.level);
        message = result
          ? `Cache level set to ${params.level}`
          : "Failed to update cache level";
        break;

      case "set_always_https":
        result = await cloudflare.setAlwaysUseHttps(params?.enabled !== false);
        message = result
          ? `Always HTTPS ${params?.enabled !== false ? "enabled" : "disabled"}`
          : "Failed to update HTTPS setting";
        break;

      case "set_minify":
        result = await cloudflare.setMinify({
          js: params?.js || "on",
          css: params?.css || "on",
          html: params?.html || "on",
        });
        message = result ? "Minification updated" : "Failed to update minification";
        break;

      case "set_ssl":
        if (!params?.mode) {
          return NextResponse.json(
            { success: false, error: "Missing params.mode" },
            { status: 400 },
          );
        }
        result = await cloudflare.setSSL(params.mode);
        message = result
          ? `SSL mode set to ${params.mode}`
          : "Failed to update SSL";
        break;

      case "create_page_rule":
        if (!params?.url || !params?.actions) {
          return NextResponse.json(
            { success: false, error: "Missing params.url or params.actions" },
            { status: 400 },
          );
        }
        result = await cloudflare.createPageRule(params.url, params.actions);
        message = result
          ? `Page rule created for ${params.url}`
          : "Failed to create page rule";
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json({ success: result, message, action });
  } catch (error) {
    console.error("Cloudflare action failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Action failed" },
      { status: 500 },
    );
  }
}
