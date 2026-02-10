export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { runWordPressAudit, type WPSiteAudit } from "@/lib/integrations/wordpress-audit";
import { type WPCredentials } from "@/lib/integrations/wordpress";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * POST /api/admin/wordpress/audit
 *
 * Run a comprehensive audit on a WordPress site.
 * This is called when adding a new WordPress site to the system.
 *
 * Body: {
 *   apiUrl: "https://example.com/wp-json/wp/v2",
 *   username: "admin",
 *   appPassword: "xxxx xxxx xxxx xxxx",
 *   siteId?: "my-wp-site"  // optional, for saving the audit
 * }
 *
 * Returns: Full WPSiteAudit including generated SiteProfile
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { apiUrl, username, appPassword, siteId } = body;

    if (!apiUrl || !username || !appPassword) {
      return NextResponse.json(
        { error: "apiUrl, username, and appPassword are required" },
        { status: 400 },
      );
    }

    const credentials: WPCredentials = { apiUrl, username, appPassword };
    const audit = await runWordPressAudit(credentials);

    // Persist audit report if siteId provided
    if (siteId) {
      try {
        const { prisma } = await import("@/lib/db");
        await prisma.seoReport.create({
          data: {
            reportType: "wordpress_audit",
            data: {
              siteId,
              audit: audit as unknown as Record<string, unknown>,
              siteProfile: audit.siteProfile,
            },
          },
        });
      } catch (dbError) {
        console.warn("Failed to persist WP audit:", dbError);
      }
    }

    return NextResponse.json({
      success: true,
      audit,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Audit failed",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/wordpress/audit
 *
 * Retrieve a previously saved WordPress audit.
 *
 * Query: ?siteId=my-wp-site
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId = request.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json(
      { error: "siteId is required" },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/db");

    const report = await prisma.seoReport.findFirst({
      where: {
        reportType: "wordpress_audit",
        data: { path: ["siteId"], equals: siteId },
      },
      orderBy: { created_at: "desc" },
    });

    if (!report) {
      return NextResponse.json(
        { error: "No audit found for this site" },
        { status: 404 },
      );
    }

    const reportData = report.data as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      audit: reportData.audit,
      siteProfile: reportData.siteProfile,
      auditDate: report.created_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to retrieve audit",
      },
      { status: 500 },
    );
  }
}
