export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { cloudflare } from "@/lib/integrations/cloudflare";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Cloudflare Audit API
 * GET /api/cloudflare/audit
 *
 * Runs a comprehensive Cloudflare audit: zone, DNS, analytics,
 * cache settings, security, page rules, and bot management.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    if (!cloudflare.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Cloudflare not configured",
        setup: {
          required: [
            "CLOUDFLARE_API_TOKEN - API token with zone read/edit permissions",
            "CLOUDFLARE_ZONE_ID - Zone ID from Cloudflare dashboard overview",
          ],
        },
      }, { status: 503 });
    }

    const audit = await cloudflare.runAudit();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...audit,
    });
  } catch (error) {
    console.error("Cloudflare audit failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Audit failed" },
      { status: 500 },
    );
  }
}
