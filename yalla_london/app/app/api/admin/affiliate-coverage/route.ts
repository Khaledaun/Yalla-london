/**
 * Affiliate Coverage Diagnostic + Force-Inject
 *
 * GET  /api/admin/affiliate-coverage?siteId=X&limit=50
 *      Returns per-article coverage status: which articles have affiliates,
 *      which are uncovered (and the reason), per-partner click counts.
 *
 * POST /api/admin/affiliate-coverage
 *      Body: { action: "force_inject", articleId: string }
 *           or { action: "force_inject_all", siteId?: string, limit?: number }
 *      Synchronously runs the affiliate-injection logic on a single article
 *      or a bulk batch — bypasses the cron's 4-runs-per-day cadence.
 *
 * Built to answer "$0 revenue — why aren't articles getting affiliate links?"
 * after the May 15 briefing flagged 5 articles missing FTC disclosure but
 * gave no insight into the other ~686 articles' status.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

const BUDGET_MS = 280_000;

// Marker patterns used by all known injection paths. Mirrors `needsInjection`
// filter in app/api/cron/affiliate-injection/route.ts.
const AFFILIATE_MARKERS = [
  'class="affiliate-recommendation"',
  'class="affiliate-cta-block"',
  'class="affiliate-partners-section"',
  'rel="sponsored"',
  'rel="noopener sponsored"',
  "/api/affiliate/click",
  "data-affiliate-id",
  "data-affiliate=",
  "data-affiliate-partner=",
];

const SUPPRESS_KEYWORDS = [
  "mosque",
  "masjid",
  "ramadan",
  "prayer",
  "timetable",
  "eid",
  "islamic heritage",
  "مسجد",
  "رمضان",
  "صلاة",
  "عيد",
  "obituary",
  "memorial",
  "charity",
  "donation",
];

function detectMarkers(content: string): string[] {
  return AFFILIATE_MARKERS.filter((m) => content.includes(m));
}

function isSuppressed(title: string, content: string): boolean {
  const combined = (title + " " + content).toLowerCase();
  return SUPPRESS_KEYWORDS.filter((k) => combined.includes(k)).length >= 2;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const url = request.nextUrl;
  const { getActiveSiteIds, getDefaultSiteId } = await import("@/config/sites");
  const siteId = url.searchParams.get("siteId") || getDefaultSiteId();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
  const filter = url.searchParams.get("filter") || "all"; // "all" | "covered" | "uncovered"

  const { prisma } = await import("@/lib/db");

  // ── Article coverage breakdown ────────────────────────────────────────
  const activeSiteIds = siteId === "*" ? getActiveSiteIds() : [siteId];

  const posts = await prisma.blogPost.findMany({
    where: {
      published: true,
      deletedAt: null,
      siteId: { in: activeSiteIds },
    },
    select: {
      id: true,
      slug: true,
      title_en: true,
      siteId: true,
      content_en: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: 1000, // Cap to protect against runaway queries on large sites
  });

  let covered = 0;
  let uncovered = 0;
  let suppressed = 0;
  const partnerCounts = new Map<string, number>();
  const sample: Array<{
    id: string;
    slug: string;
    title: string;
    siteId: string;
    status: "covered" | "uncovered" | "suppressed";
    markers: string[];
    partners: string[];
    reason?: string;
  }> = [];

  for (const p of posts) {
    const content = p.content_en || "";
    const markers = detectMarkers(content);
    const hasAffiliates = markers.length > 0;
    const supp = isSuppressed(p.title_en || "", content.slice(0, 5000));

    // Extract partner names from data-affiliate-partner attrs
    const partnerMatches = content.matchAll(/data-affiliate-partner="([^"]+)"/g);
    const partners = [...new Set([...partnerMatches].map((m) => m[1]))];
    for (const partner of partners) {
      partnerCounts.set(partner, (partnerCounts.get(partner) || 0) + 1);
    }

    let status: "covered" | "uncovered" | "suppressed";
    let reason: string | undefined;

    if (hasAffiliates) {
      covered++;
      status = "covered";
    } else if (supp) {
      suppressed++;
      status = "suppressed";
      reason = "religious/non-commercial topic — affiliate injection intentionally skipped";
    } else {
      uncovered++;
      status = "uncovered";
      reason =
        "no affiliate markers detected; likely never matched any keyword rule, or matched only rules with empty env-var params";
    }

    // Apply filter
    if (filter !== "all" && filter !== status) continue;

    if (sample.length < limit) {
      sample.push({
        id: p.id,
        slug: p.slug,
        title: p.title_en || "(untitled)",
        siteId: p.siteId,
        status,
        markers,
        partners,
        reason,
      });
    }
  }

  // ── Click attribution (last 30 days) ──────────────────────────────────
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // CjClickEvent (CJ links with DB record).
  // Per CLAUDE.md rule #64: use `OR: [{siteId}, {siteId: null}]` for backwards
  // compat with legacy click events that pre-date the March 11 siteId migration.
  const cjClickSiteWhere = siteId === "*" ? {} : { OR: [{ siteId }, { siteId: null }] };
  const cjClicks30d = await prisma.cjClickEvent
    .count({ where: { ...cjClickSiteWhere, createdAt: { gte: since30d } } })
    .catch(() => 0);
  const cjClicks7d = await prisma.cjClickEvent
    .count({ where: { ...cjClickSiteWhere, createdAt: { gte: since7d } } })
    .catch(() => 0);

  // AuditLog AFFILIATE_CLICK_DIRECT (Travelpayouts, Stay22, raw partner URLs)
  const directClicks30d = await prisma.auditLog
    .count({
      where: {
        action: "AFFILIATE_CLICK_DIRECT",
        timestamp: { gte: since30d },
      },
    })
    .catch(() => 0);
  const directClicks7d = await prisma.auditLog
    .count({
      where: {
        action: "AFFILIATE_CLICK_DIRECT",
        timestamp: { gte: since7d },
      },
    })
    .catch(() => 0);

  // Latest cron run diagnostic samples
  const lastCronRun = await prisma.cronJobLog.findFirst({
    where: { job_name: "affiliate-injection", status: "completed" },
    orderBy: { started_at: "desc" },
    select: { started_at: true, result_summary: true },
  });

  const total = posts.length;
  const coveragePct = total > 0 ? Math.round((covered / total) * 1000) / 10 : 0;

  return NextResponse.json({
    success: true,
    siteId,
    summary: {
      totalPublished: total,
      covered,
      uncovered,
      suppressed,
      coveragePct,
      partnersByArticleCount: Object.fromEntries([...partnerCounts.entries()].sort((a, b) => b[1] - a[1])),
    },
    clicks: {
      cjClicks7d,
      cjClicks30d,
      directClicks7d,
      directClicks30d,
      total7d: cjClicks7d + directClicks7d,
      total30d: cjClicks30d + directClicks30d,
    },
    lastCronRun: lastCronRun
      ? {
          ranAt: lastCronRun.started_at,
          summary: lastCronRun.result_summary,
        }
      : null,
    diagnosticHint:
      uncovered > total * 0.5
        ? `${uncovered}/${total} (${Math.round((uncovered / total) * 100)}%) articles have NO affiliate links. Most likely cause: keyword rules don't match the article topics, OR all matching rules have empty env-var partner params (BOOKING_AFFILIATE_ID etc. unset because those networks haven't approved you yet). Use POST {action:"force_inject_all"} to retry across uncovered articles, or apply to more affiliate networks (Booking.com, GetYourGuide, Viator).`
        : null,
    articles: sample,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// POST handler — force-inject single or bulk
// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();
  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "force_inject") {
    const articleId = body.articleId as string;
    if (!articleId) {
      return NextResponse.json({ error: "articleId required" }, { status: 400 });
    }

    const result = await injectSingleArticle(articleId);
    return NextResponse.json(result);
  }

  if (action === "force_inject_all") {
    const { getActiveSiteIds, getDefaultSiteId } = await import("@/config/sites");
    const siteId = (body.siteId as string) || getDefaultSiteId();
    const limit = Math.min((body.limit as number) || 250, 500);
    const onlyUncovered = body.onlyUncovered !== false; // default true

    const { prisma } = await import("@/lib/db");
    const activeSiteIds = siteId === "*" ? getActiveSiteIds() : [siteId];

    const posts = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        siteId: { in: activeSiteIds },
      },
      select: {
        id: true,
        slug: true,
        title_en: true,
        siteId: true,
        content_en: true,
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    const targets = onlyUncovered ? posts.filter((p) => detectMarkers(p.content_en || "").length === 0) : posts;

    let injected = 0;
    let skipped = 0;
    let failed = 0;
    const results: Array<{
      slug: string;
      status: string;
      partners?: string[];
      reason?: string;
    }> = [];

    for (const post of targets) {
      if (Date.now() - startTime > BUDGET_MS - 5_000) {
        results.push({ slug: post.slug, status: "skipped", reason: "budget exhausted" });
        break;
      }

      const r = await injectSingleArticle(post.id);
      if (r.success && r.partners && r.partners.length > 0) {
        injected++;
        results.push({ slug: post.slug, status: "injected", partners: r.partners });
      } else if (r.success && (!r.partners || r.partners.length === 0)) {
        skipped++;
        results.push({ slug: post.slug, status: "no_match", reason: r.reason });
      } else {
        failed++;
        results.push({ slug: post.slug, status: "failed", reason: r.error });
      }
    }

    return NextResponse.json({
      success: true,
      action,
      siteId,
      summary: {
        targeted: targets.length,
        injected,
        skipped,
        failed,
        durationMs: Date.now() - startTime,
      },
      results: results.slice(0, 100), // cap response payload
    });
  }

  return NextResponse.json(
    { error: `Unknown action: ${action}. Valid: force_inject, force_inject_all` },
    { status: 400 },
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Synchronous single-article injection — calls the cron's logic directly
// without going through the HTTP boundary. Re-uses the merged rule set
// (DB + CJ deep links + Travelpayouts + static).
// ─────────────────────────────────────────────────────────────────────────

async function injectSingleArticle(articleId: string): Promise<{
  success: boolean;
  partners?: string[];
  reason?: string;
  error?: string;
}> {
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const post = await prisma.blogPost.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        slug: true,
        title_en: true,
        siteId: true,
        content_en: true,
        content_ar: true,
      },
    });

    if (!post) return { success: false, error: "Article not found" };
    if (!post.content_en) return { success: false, error: "Article has no content_en" };

    // Already covered? Don't double-inject.
    const existingMarkers = detectMarkers(post.content_en);
    if (existingMarkers.length > 0) {
      return {
        success: true,
        partners: [],
        reason: `Already covered (markers: ${existingMarkers.slice(0, 3).join(", ")})`,
      };
    }

    if (isSuppressed(post.title_en || "", post.content_en.slice(0, 5000))) {
      return {
        success: true,
        partners: [],
        reason: "Religious/non-commercial topic — affiliate injection intentionally skipped",
      };
    }

    const postSiteId = post.siteId || getDefaultSiteId();

    // Re-use the cron's rule loaders by importing them directly.
    // Note: these are not exported; we replicate the merge here.
    const {
      getAffiliateRulesFromCjLinks,
      getTravelpayoutsRules,
      getAffiliateRulesForSite,
      getAffiliateRulesFromDB,
      injectAffiliates,
    } = await loadInjectionHelpers();

    const cjRules = await getAffiliateRulesFromCjLinks(postSiteId);
    const dbRules = (await getAffiliateRulesFromDB(postSiteId)) || [];
    const tpRules = getTravelpayoutsRules(postSiteId);
    const staticRules = getAffiliateRulesForSite(postSiteId);
    const merged = [...dbRules, ...cjRules, ...tpRules, ...staticRules];

    const enResult = injectAffiliates(
      post.content_en,
      postSiteId,
      merged.length > 0 ? merged : null,
      post.title_en || "",
      post.slug,
    );
    const arResult = post.content_ar
      ? injectAffiliates(post.content_ar, postSiteId, merged.length > 0 ? merged : null, post.title_en || "", post.slug)
      : { content: "", count: 0, partners: [] };

    if (enResult.count === 0 && arResult.count === 0) {
      return {
        success: true,
        partners: [],
        reason: `No keyword match across ${merged.length} rules (DB:${dbRules.length}, CJ:${cjRules.length}, TP:${tpRules.length}, Static:${staticRules.length})`,
      };
    }

    const allPartners = [...new Set([...enResult.partners, ...arResult.partners])];

    const { optimisticBlogPostUpdate } = await import("@/lib/db/optimistic-update");
    const { buildEnhancementLogEntry } = await import("@/lib/db/enhancement-log");

    await optimisticBlogPostUpdate(
      post.id,
      (current) => ({
        content_en: enResult.content,
        content_ar: arResult.content || current.content_ar,
        enhancement_log: buildEnhancementLogEntry(
          current.enhancement_log,
          "affiliate_links",
          "affiliate-coverage:force_inject",
          `Force-injected ${allPartners.length} affiliate partner(s): ${allPartners.join(", ")}`,
        ),
      }),
      { tag: "[affiliate-coverage]" },
    );

    // Mark URL for re-indexing so Google sees the affiliate-enriched version
    try {
      const { getSiteDomain } = await import("@/config/sites");
      const postUrl = `${getSiteDomain(postSiteId)}/blog/${post.slug}`;
      await prisma.uRLIndexingStatus.updateMany({
        where: { site_id: postSiteId, url: postUrl },
        data: { submitted_indexnow: false, last_submitted_at: null },
      });
    } catch (resubErr) {
      console.warn(
        `[affiliate-coverage] Failed to mark ${post.slug} for resubmission:`,
        resubErr instanceof Error ? resubErr.message : resubErr,
      );
    }

    return { success: true, partners: allPartners };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Re-uses the cron's exported helpers directly to guarantee identical
// matching/injection logic. The 5 helpers were exported from the cron route
// in this same change to avoid duplicating ~600 lines of static rule data.
async function loadInjectionHelpers() {
  const cron = await import("@/app/api/cron/affiliate-injection/route");
  return {
    getAffiliateRulesFromCjLinks: cron.getAffiliateRulesFromCjLinks,
    getTravelpayoutsRules: cron.getTravelpayoutsRules,
    getAffiliateRulesForSite: cron.getAffiliateRulesForSite,
    getAffiliateRulesFromDB: cron.getAffiliateRulesFromDB,
    injectAffiliates: cron.injectAffiliates,
  };
}
