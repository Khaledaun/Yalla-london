export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Performance Audit API
 *
 * GET  — Returns latest audit results for a site (or all sites)
 * POST — Triggers a new PageSpeed Insights audit for a site
 *
 * Button on cockpit Sites tab triggers POST, then polls GET for results.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { logManualAction } from "@/lib/action-logger";

async function handleGet(request: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const { getDefaultSiteId } = await import("@/config/sites");

  // Ensure table exists before querying
  const { ensurePerformanceAudits } = await import("@/lib/db/ensure-tables");
  await ensurePerformanceAudits();

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const runId = request.nextUrl.searchParams.get("runId");

  // If a specific run is requested
  if (runId) {
    const results = await prisma.performanceAudit.findMany({
      where: { runId },
      orderBy: { url: "asc" },
    });

    if (results.length === 0) {
      return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 });
    }

    const scored = results.filter((r) => r.performanceScore != null);
    const avg = (vals: (number | null)[]) => {
      const v = vals.filter((x): x is number => x != null);
      return v.length > 0 ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
    };

    return NextResponse.json({
      success: true,
      runId,
      siteId: results[0].siteId,
      strategy: results[0].strategy,
      createdAt: results[0].createdAt,
      pages: results.map((r) => ({
        url: r.url,
        performance: r.performanceScore,
        accessibility: r.accessibilityScore,
        bestPractices: r.bestPracticesScore,
        seo: r.seoScore,
        lcpMs: r.lcpMs,
        cls: r.clsScore,
        inpMs: r.inpMs,
        fcpMs: r.fcpMs,
        tbtMs: r.tbtMs,
        speedIndex: r.speedIndex,
        diagnostics: r.diagnostics,
      })),
      summary: {
        avgPerformance: avg(scored.map((r) => r.performanceScore)),
        avgAccessibility: avg(scored.map((r) => r.accessibilityScore)),
        avgSeo: avg(scored.map((r) => r.seoScore)),
        pagesAudited: results.length,
      },
    });
  }

  // Return latest run for this site
  const latestRun = await prisma.performanceAudit.findFirst({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    select: { runId: true, createdAt: true },
  });

  if (!latestRun) {
    return NextResponse.json({
      success: true,
      hasData: false,
      message: "No performance audit has been run yet. Tap 'Audit Site' to start.",
    });
  }

  // Fetch the full run
  const results = await prisma.performanceAudit.findMany({
    where: { runId: latestRun.runId },
    orderBy: { url: "asc" },
  });

  const scored = results.filter((r) => r.performanceScore != null);
  const avg = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x != null);
    return v.length > 0 ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  };

  // Get history of all runs
  const history = await prisma.performanceAudit.groupBy({
    by: ["runId", "strategy"],
    where: { siteId },
    _avg: { performanceScore: true },
    _count: { id: true },
    _min: { createdAt: true },
    orderBy: { _min: { createdAt: "desc" } },
    take: 10,
  });

  return NextResponse.json({
    success: true,
    hasData: true,
    runId: latestRun.runId,
    siteId,
    strategy: results[0]?.strategy || "mobile",
    createdAt: latestRun.createdAt,
    pages: results.map((r) => ({
      url: r.url,
      performance: r.performanceScore,
      accessibility: r.accessibilityScore,
      bestPractices: r.bestPracticesScore,
      seo: r.seoScore,
      lcpMs: r.lcpMs,
      cls: r.clsScore,
      inpMs: r.inpMs,
      fcpMs: r.fcpMs,
      tbtMs: r.tbtMs,
      speedIndex: r.speedIndex,
      diagnostics: r.diagnostics,
    })),
    summary: {
      avgPerformance: avg(scored.map((r) => r.performanceScore)),
      avgAccessibility: avg(scored.map((r) => r.accessibilityScore)),
      avgBestPractices: avg(scored.map((r) => r.bestPracticesScore)),
      avgSeo: avg(scored.map((r) => r.seoScore)),
      avgLcpMs: avg(scored.map((r) => r.lcpMs)),
      pagesAudited: results.length,
    },
    history: history.map((h) => ({
      runId: h.runId,
      strategy: h.strategy,
      avgPerformance: h._avg.performanceScore != null ? Math.round(h._avg.performanceScore) : null,
      pagesAudited: h._count.id,
      createdAt: h._min.createdAt,
    })),
  });
}

async function handlePost(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { getSiteConfig, getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

  const siteId = body.siteId || getDefaultSiteId();
  const strategy = body.strategy || "mobile";
  const siteConfig = getSiteConfig(siteId);
  // getSiteDomain() already returns "https://www.domain.com" — use directly
  const baseUrl = getSiteDomain(siteId);

  if (!siteConfig) {
    return NextResponse.json({ success: false, error: `Unknown site: ${siteId}` }, { status: 400 });
  }

  try {
    // Ensure the performance_audits table exists (self-healing migration)
    const { ensurePerformanceAudits } = await import("@/lib/db/ensure-tables");
    await ensurePerformanceAudits();

    const { runSiteAudit, saveAuditResults } = await import("@/lib/performance/site-auditor");

    const hasApiKey = !!(process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY || process.env.PSI_API_KEY);

    // Run audit (budget: 50s to leave room for DB save)
    const result = await runSiteAudit(siteId, baseUrl, strategy, 50_000);

    // Save to database
    await saveAuditResults(result);

    const errorPages = result.pages.filter((p) => p.error);

    logManualAction(request, {
      action: "performance-audit",
      resource: "site",
      siteId,
      success: true,
      summary: `Performance audit completed for ${siteId} (${strategy}): ${result.pages.length} pages audited`,
      details: { runId: result.runId, strategy, pagesAudited: result.pages.length, pagesWithErrors: errorPages.length },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      runId: result.runId,
      siteId,
      strategy,
      pagesAudited: result.pages.length,
      ...(errorPages.length > 0 ? { pagesWithErrors: errorPages.length } : {}),
      ...(!hasApiKey ? {
        warning: `No PAGESPEED_API_KEY configured — audit limited to 5 pages with slower rate. Add the key in Vercel → Settings → Environment Variables for full audits.`,
      } : {}),
      summary: result.summary,
      pages: result.pages.map((p) => ({
        url: p.url,
        performance: p.performanceScore,
        accessibility: p.accessibilityScore,
        bestPractices: p.bestPracticesScore,
        seo: p.seoScore,
        lcpMs: p.lcpMs,
        cls: p.clsScore,
        error: p.error,
      })),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[performance-audit] Audit failed:", errMsg);

    logManualAction(request, {
      action: "performance-audit",
      resource: "site",
      siteId,
      success: false,
      summary: `Performance audit failed for ${siteId}`,
      error: errMsg,
      fix: "Check that GOOGLE_PAGESPEED_API_KEY is configured in Vercel env vars. If the error is a timeout, try again.",
    }).catch(() => {});

    return NextResponse.json({
      success: false,
      error: `Performance audit failed: ${errMsg.substring(0, 200)}`,
    }, { status: 500 });
  }
}

export const GET = withAdminAuth(handleGet);
export const POST = withAdminAuth(handlePost);
