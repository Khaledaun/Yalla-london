/**
 * Discovery Monitor API
 *
 * GET  — Full site discovery scan with page-by-page analysis
 * POST — Execute fix actions (submit, fix meta, expand, boost AIO, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── GET: Full Discovery Scan ────────────────────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId") || request.headers.get("x-site-id") || getDefaultSiteId();
  const limit = parseInt(url.searchParams.get("limit") || "200", 10);
  const quickMode = url.searchParams.get("mode") === "quick";

  if (!getActiveSiteIds().includes(siteId)) {
    return NextResponse.json({ success: false, error: `Invalid siteId: ${siteId}` }, { status: 400 });
  }

  try {
    const { scanSiteDiscovery } = await import("@/lib/discovery/scanner");
    const summary = await scanSiteDiscovery(siteId, {
      budgetMs: quickMode ? 15_000 : 50_000,
      limit,
      liveHttpCheck: !quickMode,
    });

    // Also return page-level data for the dashboard
    const { prisma } = await import("@/lib/db");

    // Get last cron run
    const lastCronRun = await prisma.cronJobLog.findFirst({
      where: { job_name: "discovery-monitor" },
      orderBy: { started_at: "desc" },
      select: { started_at: true, status: true },
    });

    return NextResponse.json({
      success: true,
      summary,
      lastScanAt: new Date().toISOString(),
      lastCronScanAt: lastCronRun?.started_at?.toISOString() || null,
      lastCronStatus: lastCronRun?.status || null,
      nextScanAt: null, // Determined by cron schedule
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[discovery-api] Scan failed:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
});

// ─── POST: Execute Fix Actions ───────────────────────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action as string;
  const slug = body.slug as string;
  const siteId = (body.siteId as string) || getDefaultSiteId();

  if (!action) {
    return NextResponse.json({ success: false, error: "Missing action" }, { status: 400 });
  }

  try {
    const fixEngine = await import("@/lib/discovery/fix-engine");
    let result;

    switch (action) {
      case "submit_page":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.submitPage(slug, siteId);
        break;

      case "refresh_sitemap":
        result = await fixEngine.refreshSitemap(siteId);
        break;

      case "retry_submission":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.retrySubmission(slug, siteId);
        break;

      case "fix_placeholders":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.fixPlaceholders(slug, siteId);
        break;

      case "fix_meta_title":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.fixMetaTitle(slug, siteId);
        break;

      case "fix_meta_description":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.fixMetaDescription(slug, siteId);
        break;

      case "fix_headings":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.fixHeadings(slug, siteId);
        break;

      case "inject_internal_links":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.injectInternalLinks(slug, siteId);
        break;

      case "expand_content":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.expandContent(slug, siteId, (body.targetWords as number) || 1200);
        break;

      case "optimize_ctr":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.optimizeCtr(slug, siteId);
        break;

      case "boost_aio":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.boostAio(slug, siteId);
        break;

      case "boost_authenticity":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.boostAuthenticity(slug, siteId);
        break;

      case "add_author":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.addAuthor(slug, siteId);
        break;

      case "diagnose_deindex":
      case "deep_diagnose":
      case "enhance_and_resubmit":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.diagnoseDeindex(slug, siteId);
        break;

      case "diagnose_decline":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        // For declining pages: optimize CTR + boost AIO
        const ctrResult = await fixEngine.optimizeCtr(slug, siteId);
        const aioResult = await fixEngine.boostAio(slug, siteId);
        result = {
          success: ctrResult.success || aioResult.success,
          fixId: "diagnose-decline", action: "diagnose_decline",
          result: {
            before: { declining: true },
            after: {
              ctrOptimized: ctrResult.success,
              aioBoost: aioResult.success,
            },
            message: `CTR optimization: ${ctrResult.result.message}. AIO boost: ${aioResult.result.message}`,
          },
        };
        break;

      case "refresh_content":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        result = await fixEngine.expandContent(slug, siteId, 0); // Will add fresh sections
        break;

      case "fix_all":
        if (!slug) return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
        const issueIds = body.issueIds as string[];
        if (!issueIds?.length) return NextResponse.json({ success: false, error: "Missing issueIds" }, { status: 400 });
        result = await fixEngine.fixAllForPage(slug, siteId, issueIds);
        break;

      case "submit_all_unsubmitted": {
        const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
        const { prisma } = await import("@/lib/db");
        const { getSiteDomain } = await import("@/config/sites");
        const domain = getSiteDomain(siteId);
        const key = process.env.INDEXNOW_KEY;
        if (!key) {
          result = { success: false, fixId: "submit-all", action: "submit_all_unsubmitted",
            result: { before: {}, after: {}, message: "INDEXNOW_KEY not configured" } };
          break;
        }

        // Find all published posts without URLIndexingStatus
        const allPosts = await prisma.blogPost.findMany({
          where: { siteId, published: true, deletedAt: null },
          select: { slug: true },
        });
        const tracked = await prisma.uRLIndexingStatus.findMany({
          where: { site_id: siteId },
          select: { slug: true },
        });
        const trackedSlugs = new Set(tracked.map(t => t.slug));
        const unsubmitted = allPosts.filter(p => !trackedSlugs.has(p.slug));

        if (unsubmitted.length === 0) {
          result = { success: true, fixId: "submit-all", action: "submit_all_unsubmitted",
            result: { before: { unsubmitted: 0 }, after: { submitted: 0 }, message: "All pages already submitted" } };
          break;
        }

        const urls = unsubmitted.flatMap(p => [
          `https://${domain}/blog/${p.slug}`,
          `https://${domain}/ar/blog/${p.slug}`,
        ]);
        await submitToIndexNow(urls, `https://${domain}`, key);

        // Create tracking records
        for (const p of unsubmitted) {
          await prisma.uRLIndexingStatus.upsert({
            where: { url: `https://${domain}/blog/${p.slug}` },
            create: { url: `https://${domain}/blog/${p.slug}`, slug: p.slug, site_id: siteId, status: "submitted", submitted_indexnow: true, last_submitted_at: new Date() },
            update: { status: "submitted", submitted_indexnow: true, last_submitted_at: new Date() },
          });
        }

        result = { success: true, fixId: "submit-all", action: "submit_all_unsubmitted",
          result: { before: { unsubmitted: unsubmitted.length }, after: { submitted: unsubmitted.length }, message: `Submitted ${unsubmitted.length} pages (${urls.length} URLs incl. Arabic) to 3 search engines` } };
        break;
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Log the fix action
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.autoFixLog.create({
        data: {
          siteId,
          fixType: action,
          targetId: slug || siteId,
          description: result.result.message,
          success: result.success,
          details: JSON.stringify(result.result),
        },
      });
    } catch {
      // AutoFixLog may not exist — non-blocking
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[discovery-api] Fix action "${action}" failed:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
});
