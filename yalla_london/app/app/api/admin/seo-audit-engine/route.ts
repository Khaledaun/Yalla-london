/**
 * SEO Audit Engine API — Runs master audit from admin UI
 *
 * POST { action: 'run', mode: 'quick' | 'full' }
 * Returns audit results with issues, hard gates, fix plan, and executive summary.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, mode = "quick" } = body;

    if (action !== "run") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const siteId = body.siteId ?? getDefaultSiteId();
    const batchSize = mode === "quick" ? 50 : 500;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

    const startTime = Date.now();

    // Import and run the master audit engine
    let auditResult;
    try {
      const { runMasterAudit } = await import("@/lib/master-audit/index");
      auditResult = await runMasterAudit({
        siteId,
        baseUrl,
        mode: mode === "quick" ? "quick" : "full",
        batchSize,
        concurrency: 3,
      });
    } catch (importErr) {
      // Master audit engine may not be fully available — provide helpful fallback
      console.warn("[seo-audit-engine] Master audit unavailable:", importErr instanceof Error ? importErr.message : importErr);

      // Fallback: run a lightweight audit using existing SEO infrastructure
      const fallbackResult = await runLightweightAudit(siteId, baseUrl, batchSize);
      return NextResponse.json(fallbackResult);
    }

    const duration = Date.now() - startTime;

    // Format results for the UI
    const issues = auditResult.issues || [];
    const bySeverity = { P0: 0, P1: 0, P2: 0 };
    for (const issue of issues) {
      if (issue.severity === "P0") bySeverity.P0++;
      else if (issue.severity === "P1") bySeverity.P1++;
      else bySeverity.P2++;
    }

    return NextResponse.json({
      runId: auditResult.runId || `audit-${Date.now()}`,
      siteId,
      mode,
      urlsAudited: auditResult.urlsAudited || 0,
      totalIssues: issues.length,
      bySeverity,
      hardGates: auditResult.hardGates || [],
      issues: issues.slice(0, 200), // Cap at 200 for JSON response size
      execSummary: auditResult.execSummary || null,
      fixPlan: auditResult.fixPlan || null,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[seo-audit-engine] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Audit execution failed" }, { status: 500 });
  }
}

/**
 * Lightweight fallback audit when master audit engine is unavailable.
 * Uses existing DB data to check SEO health.
 */
async function runLightweightAudit(siteId: string, _baseUrl: string, limit: number) {
  const startTime = Date.now();
  const issues: Array<{
    url: string;
    validator: string;
    severity: string;
    message: string;
    recommendation?: string;
  }> = [];

  try {
    const { prisma } = await import("@/lib/db");

    // Check published posts for SEO issues
    const posts = await prisma.blogPost.findMany({
      where: { siteId, status: "published" },
      select: {
        id: true,
        slug: true,
        title_en: true,
        meta_title_en: true,
        meta_description_en: true,
        content_en: true,
        seo_score: true,
      },
      take: limit,
      orderBy: { published_at: "desc" },
    });

    for (const post of posts) {
      const url = `/blog/${post.slug}`;

      // Missing meta title
      if (!post.meta_title_en || post.meta_title_en.length < 30) {
        issues.push({
          url,
          validator: "metadata",
          severity: "P1",
          message: `Missing or short meta title (${post.meta_title_en?.length || 0} chars, need 30+)`,
          recommendation: "Generate a descriptive meta title between 30-60 characters.",
        });
      } else if (post.meta_title_en.length > 60) {
        issues.push({
          url,
          validator: "metadata",
          severity: "P2",
          message: `Meta title too long (${post.meta_title_en.length} chars, max 60)`,
          recommendation: "Trim meta title to 60 characters or fewer.",
        });
      }

      // Missing meta description
      if (!post.meta_description_en || post.meta_description_en.length < 120) {
        issues.push({
          url,
          validator: "metadata",
          severity: "P1",
          message: `Missing or short meta description (${post.meta_description_en?.length || 0} chars, need 120+)`,
          recommendation: "Write a compelling meta description between 120-160 characters.",
        });
      } else if (post.meta_description_en.length > 160) {
        issues.push({
          url,
          validator: "metadata",
          severity: "P2",
          message: `Meta description too long (${post.meta_description_en.length} chars, max 160)`,
          recommendation: "Trim meta description to 160 characters or fewer.",
        });
      }

      // Low word count
      const wordCount = (post.content_en || "").split(/\s+/).filter(Boolean).length;
      if (wordCount < 1000) {
        issues.push({
          url,
          validator: "content",
          severity: wordCount < 500 ? "P0" : "P1",
          message: `Low word count: ${wordCount} words (minimum 1,000)`,
          recommendation: "Expand content to at least 1,000 words for SEO ranking potential.",
        });
      }

      // Low SEO score
      if (post.seo_score !== null && post.seo_score !== undefined && post.seo_score < 70) {
        issues.push({
          url,
          validator: "quality",
          severity: post.seo_score < 50 ? "P0" : "P1",
          message: `Low SEO score: ${post.seo_score} (target: 70+)`,
          recommendation: "Run SEO optimization to improve heading structure, internal links, and content quality.",
        });
      }
    }

    // Check indexing status
    const notIndexed = await prisma.uRLIndexingStatus.count({
      where: { siteId, indexingStatus: { not: "indexed" } },
    });

    if (notIndexed > 0) {
      issues.push({
        url: "/sitemap.xml",
        validator: "indexing",
        severity: notIndexed > 10 ? "P1" : "P2",
        message: `${notIndexed} URLs not yet indexed by Google`,
        recommendation: "Submit URLs via IndexNow or Google Search Console.",
      });
    }

    const bySeverity = { P0: 0, P1: 0, P2: 0 };
    for (const issue of issues) {
      if (issue.severity === "P0") bySeverity.P0++;
      else if (issue.severity === "P1") bySeverity.P1++;
      else bySeverity.P2++;
    }

    return {
      runId: `lightweight-${Date.now()}`,
      siteId,
      mode: "lightweight",
      urlsAudited: posts.length,
      totalIssues: issues.length,
      bySeverity,
      hardGates: [
        { name: "Published content exists", passed: posts.length > 0 },
        { name: "No critical P0 issues", passed: bySeverity.P0 === 0 },
      ],
      issues,
      execSummary: `Lightweight audit of ${posts.length} published posts found ${issues.length} issues (${bySeverity.P0} critical, ${bySeverity.P1} high, ${bySeverity.P2} medium).`,
      fixPlan: null,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (dbErr) {
    console.warn("[seo-audit-engine] Lightweight audit DB error:", dbErr instanceof Error ? dbErr.message : dbErr);
    return {
      runId: `error-${Date.now()}`,
      siteId,
      mode: "lightweight",
      urlsAudited: 0,
      totalIssues: 0,
      bySeverity: { P0: 0, P1: 0, P2: 0 },
      hardGates: [],
      issues: [],
      execSummary: "Audit could not access the database.",
      fixPlan: null,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
