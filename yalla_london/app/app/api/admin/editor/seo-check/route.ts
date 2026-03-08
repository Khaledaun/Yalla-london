export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { runPrePublicationGate } from "@/lib/seo/orchestrator/pre-publication-gate";
import { getDefaultSiteId } from "@/config/sites";

/**
 * POST /api/admin/editor/seo-check
 *
 * Runs the real 14-check pre-publication gate on editor content
 * and returns the full gate result with score and per-check details.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      title,
      titleAr,
      slug,
      content,
      excerpt,
      locale,
      pageType,
      primaryKeyword,
      tags,
      authorityLink1,
      authorityLink2,
      authorityLink3,
      authorityLink4,
    } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const siteId =
      request.headers.get("x-site-id") || getDefaultSiteId();

    // Build the target URL from slug
    const prefix = pageType === "news" ? "/news/" : pageType === "guide" ? "/guides/" : "/blog/";
    const targetUrl = `${prefix}${slug || "untitled"}`;

    // Build authority links array
    const authorityLinks = [authorityLink1, authorityLink2, authorityLink3, authorityLink4]
      .filter(Boolean);

    // Run the real pre-publication gate
    const gateResult = await runPrePublicationGate(targetUrl, {
      title_en: title,
      title_ar: titleAr,
      meta_title_en: title,
      meta_description_en: excerpt,
      content_en: content,
      content_ar: titleAr ? content : undefined,
      locale: locale || "en",
      tags: tags ? tags.split(",").map((t: string) => t.trim()) : [],
      seo_score: 0,
      author_id: undefined,
      keywords_json: primaryKeyword ? { primary: primaryKeyword } : undefined,
      page_type: pageType,
      siteId,
    });

    // Calculate a numeric score from gate checks
    const totalChecks = gateResult.checks.length;
    const passedChecks = gateResult.checks.filter((c) => c.passed).length;
    const seoScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

    return NextResponse.json({
      seoScore,
      allowed: gateResult.allowed,
      blockers: gateResult.blockers,
      warnings: gateResult.warnings,
      checks: gateResult.checks.map((c) => ({
        name: c.name,
        passed: c.passed,
        message: c.message,
        severity: c.severity,
      })),
    });
  } catch (error) {
    console.error("[editor-seo-check] Failed:", error);
    return NextResponse.json(
      { error: "Failed to run SEO check" },
      { status: 500 }
    );
  }
}
