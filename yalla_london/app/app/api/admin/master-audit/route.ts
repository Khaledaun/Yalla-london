/**
 * Master Audit API Route
 *
 * Dashboard-triggered SEO compliance audit.
 * Runs a quick version of the CLI master audit within Vercel's 53s budget.
 *
 * GET  — Returns latest audit results from CronJobLog
 * POST — Runs a quick audit against static routes and returns results
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 53_000;
const JOB_NAME = "master-audit";

// ---------------------------------------------------------------------------
// GET — Retrieve latest audit results
// ---------------------------------------------------------------------------

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    // Get last 10 audit runs
    const recentRuns = await prisma.cronJobLog.findMany({
      where: { site_id: siteId, job_name: JOB_NAME },
      orderBy: { started_at: "desc" },
      take: 10,
    });

    // Parse the latest result
    let latestResult = null;
    if (recentRuns.length > 0 && recentRuns[0].result_summary) {
      try {
        latestResult = JSON.parse(recentRuns[0].result_summary);
      } catch {
        // result_summary might not be JSON
        latestResult = { summary: recentRuns[0].result_summary };
      }
    }

    return NextResponse.json({
      success: true,
      siteId,
      latestResult,
      history: recentRuns.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        durationMs: r.duration_ms,
        itemsProcessed: r.items_processed,
        itemsSucceeded: r.items_succeeded,
        itemsFailed: r.items_failed,
        errorMessage: r.error_message,
      })),
    });
  } catch (error) {
    console.error("[master-audit] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit results" },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// POST — Run a quick audit
// ---------------------------------------------------------------------------

export const POST = withAdminOrCronAuth(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const { loadAuditConfig } = await import("@/lib/master-audit/config-loader");
    const { crawlBatch } = await import("@/lib/master-audit/crawler");
    const { extractSignals } = await import("@/lib/master-audit/extractor");
    const { validateHttp } = await import("@/lib/master-audit/validators/http");
    const { validateCanonical } = await import("@/lib/master-audit/validators/canonical");
    const { validateHreflang } = await import("@/lib/master-audit/validators/hreflang");
    const { validateSchema } = await import("@/lib/master-audit/validators/schema");
    const { validateLinks } = await import("@/lib/master-audit/validators/links");
    const { validateMetadata } = await import("@/lib/master-audit/validators/metadata");
    const { validateRobots } = await import("@/lib/master-audit/validators/robots");

    const body = await request.json().catch(() => ({}));
    const siteId = body.siteId || request.headers.get("x-site-id") || getDefaultSiteId();
    const rawDomain = getSiteDomain(siteId);
    // getSiteDomain() already returns full URL like "https://www.yalla-london.com"
    const baseUrl = rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`;

    // Load config — pass baseUrl as override so validation passes
    const config = loadAuditConfig(siteId, { baseUrl } as Partial<import("@/lib/master-audit/types").AuditConfig>);

    // Build inventory from static routes only (skip sitemap to save time)
    const urls: string[] = [];
    for (const route of config.staticRoutes) {
      urls.push(`${baseUrl}${route}`);
    }

    // Budget check before crawling
    if (Date.now() - startTime > BUDGET_MS) {
      return NextResponse.json(
        { error: "Budget exhausted before crawling" },
        { status: 504 }
      );
    }

    // Crawl with reduced timeout for quick mode
    const quickCrawlSettings = {
      ...config.crawl,
      timeoutMs: 8000,
      maxRetries: 1,
      concurrency: 4,
    };

    const crawlResults = await crawlBatch(urls, quickCrawlSettings);
    const crawlMap = new Map(crawlResults.map((r) => [r.url, r]));

    // Budget check after crawling
    if (Date.now() - startTime > BUDGET_MS) {
      return respondWithPartialResults(
        siteId, startTime, crawlResults, "Budget exhausted after crawling"
      );
    }

    // Extract signals
    const allSignals = new Map<string, Awaited<ReturnType<typeof extractSignals>>>();
    for (const result of crawlResults) {
      if (result.status === 200 && result.html) {
        try {
          const signals = extractSignals(result.html, result.finalUrl, baseUrl);
          allSignals.set(result.url, signals);
        } catch (err) {
          console.warn(`[master-audit] Signal extraction failed for ${result.url}:`, err);
        }
      }
    }

    // Run validators
    type AuditIssue = Awaited<ReturnType<typeof validateHttp>>[number];
    const allIssues: AuditIssue[] = [];

    // HTTP
    for (const result of crawlResults) {
      allIssues.push(...validateHttp(result, config));
    }
    // Canonical
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateCanonical(signals, url, config));
    }
    // Hreflang
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateHreflang(signals, url, allSignals, config));
    }
    // Schema
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateSchema(signals, url, config));
    }
    // Links
    allIssues.push(...validateLinks(allSignals, crawlMap, config));
    // Metadata
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateMetadata(signals, url, allSignals, config));
    }
    // Robots
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateRobots(signals, url, new Set(), config));
    }

    // Evaluate hard gates
    const hardGates = config.hardGates.map((gate) => {
      const catIssues = allIssues.filter((i) => i.category === gate.category);
      const p0Count = catIssues.filter((i) => i.severity === "P0").length;
      const totalCount = catIssues.length;
      let passed = true;
      if (p0Count > gate.maxP0) passed = false;
      if (gate.maxTotal >= 0 && totalCount > gate.maxTotal) passed = false;
      return {
        name: gate.name,
        category: gate.category,
        passed,
        p0Count,
        totalCount,
        description: gate.description,
        urls: [...new Set(catIssues.map((i) => i.url))],
      };
    });

    // Soft gates
    const softGates: Array<{ name: string; count: number; description: string }> = [];
    const noDescPages = [...allSignals.entries()]
      .filter(([, s]) => !s.metaDescription)
      .map(([url]) => url);
    if (noDescPages.length > 0) {
      softGates.push({
        name: "missing-meta-description",
        count: noDescPages.length,
        description: `${noDescPages.length} page(s) missing meta description`,
      });
    }
    const thinPages = [...allSignals.entries()]
      .filter(([, s]) => s.wordCount > 0 && s.wordCount < config.riskScanners.minWordCount)
      .map(([url]) => url);
    if (thinPages.length > 0) {
      softGates.push({
        name: "thin-content",
        count: thinPages.length,
        description: `${thinPages.length} page(s) below ${config.riskScanners.minWordCount} words`,
      });
    }
    const noSchemaPages = [...allSignals.entries()]
      .filter(([, s]) => s.jsonLd.length === 0)
      .map(([url]) => url);
    if (noSchemaPages.length > 0) {
      softGates.push({
        name: "missing-structured-data",
        count: noSchemaPages.length,
        description: `${noSchemaPages.length} page(s) without JSON-LD structured data`,
      });
    }

    // Build issue summary
    const p0 = allIssues.filter((i) => i.severity === "P0").length;
    const p1 = allIssues.filter((i) => i.severity === "P1").length;
    const p2 = allIssues.filter((i) => i.severity === "P2").length;
    const allPassed = hardGates.every((g) => g.passed);
    const durationMs = Date.now() - startTime;

    // Per-page results
    const pageResults = urls.map((url) => {
      const crawl = crawlMap.get(url);
      const signals = allSignals.get(url);
      const pageIssues = allIssues.filter((i) => i.url === url);
      return {
        url: url.replace(baseUrl, ""),
        status: crawl?.status ?? 0,
        hasCanonical: !!signals?.canonical,
        hasHreflang: (signals?.hreflangAlternates?.length ?? 0) > 0,
        hasJsonLd: (signals?.jsonLd?.length ?? 0) > 0,
        wordCount: signals?.wordCount ?? 0,
        title: signals?.title ?? null,
        metaDescription: signals?.metaDescription ?? null,
        issueCount: pageIssues.length,
        issues: pageIssues.map((i) => ({
          severity: i.severity,
          category: i.category,
          message: i.message,
        })),
      };
    });

    const result = {
      success: true,
      siteId,
      baseUrl,
      mode: "quick",
      durationMs,
      totalUrls: urls.length,
      crawledOk: crawlResults.filter((r) => r.status === 200).length,
      crawledFailed: crawlResults.filter((r) => r.status !== 200).length,
      signalsExtracted: allSignals.size,
      issues: { total: allIssues.length, p0, p1, p2 },
      hardGates,
      softGates,
      allPassed,
      pages: pageResults,
    };

    // Save to CronJobLog
    try {
      await prisma.cronJobLog.create({
        data: {
          site_id: siteId,
          job_name: JOB_NAME,
          status: allPassed ? "success" : "warning",
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: durationMs,
          items_processed: urls.length,
          items_succeeded: crawlResults.filter((r) => r.status === 200).length,
          items_failed: crawlResults.filter((r) => r.status !== 200).length,
          result_summary: JSON.stringify({
            mode: "quick",
            totalUrls: urls.length,
            issues: { total: allIssues.length, p0, p1, p2 },
            allPassed,
            hardGates: hardGates.map((g) => ({
              name: g.name,
              passed: g.passed,
              p0Count: g.p0Count,
              totalCount: g.totalCount,
            })),
            softGates,
          }),
          error_message: allPassed
            ? null
            : `${p0} P0, ${p1} P1, ${p2} P2 issues found`,
        },
      });
    } catch (err) {
      console.warn("[master-audit] Failed to save to CronJobLog:", err);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[master-audit] POST error:", error);

    // Try to log failure
    try {
      const { prisma } = await import("@/lib/db");
      const { getDefaultSiteId } = await import("@/config/sites");
      await prisma.cronJobLog.create({
        data: {
          site_id: getDefaultSiteId(),
          job_name: JOB_NAME,
          status: "error",
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          items_processed: 0,
          items_succeeded: 0,
          items_failed: 0,
          error_message: "Audit failed unexpectedly",
        },
      });
    } catch {
      // Can't even log — nothing more to do
    }

    return NextResponse.json(
      { error: "Audit failed" },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// Helper: respond with partial results when budget is hit
// ---------------------------------------------------------------------------

async function respondWithPartialResults(
  siteId: string,
  startTime: number,
  crawlResults: Array<{ status: number; url: string }>,
  reason: string
) {
  const durationMs = Date.now() - startTime;

  try {
    const { prisma } = await import("@/lib/db");
    await prisma.cronJobLog.create({
      data: {
        site_id: siteId,
        job_name: JOB_NAME,
        status: "partial",
        started_at: new Date(startTime),
        completed_at: new Date(),
        duration_ms: durationMs,
        items_processed: crawlResults.length,
        items_succeeded: crawlResults.filter((r) => r.status === 200).length,
        items_failed: crawlResults.filter((r) => r.status !== 200).length,
        error_message: reason,
      },
    });
  } catch {
    // Silent — can't log
  }

  return NextResponse.json({
    success: true,
    partial: true,
    reason,
    siteId,
    durationMs,
    totalUrls: crawlResults.length,
    crawledOk: crawlResults.filter((r) => r.status === 200).length,
    issues: { total: 0, p0: 0, p1: 0, p2: 0 },
    hardGates: [],
    softGates: [],
  });
}
