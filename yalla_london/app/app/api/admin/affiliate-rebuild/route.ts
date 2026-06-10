/**
 * Admin: Affiliate URL Backfill
 *
 * POST /api/admin/affiliate-rebuild
 *
 * Scans published BlogPosts whose `content_en` or `content_ar` still has
 * direct partner URLs (booking.com, viator.com, getyourguide.com, vrbo.com,
 * hotels.com, thefork.*) and rewrites each link to its tracked equivalent
 * via `rewriteAffiliateLinks` (see lib/affiliate/url-builders.ts).
 *
 * This is the YL-4 revenue-unblock backfill. Articles published before the
 * affiliate-injection cron started running (and even some that ran through
 * it) embed raw partner URLs in the body that earn $0 because they bypass
 * /api/affiliate/click. After this endpoint runs, every such URL routes
 * through the same tracked redirect the cron produces — so TP/CJ click
 * counters start moving on the existing 312 articles.
 *
 * Body (all optional):
 *   {
 *     "dry_run": true,                 // default true; nothing is written
 *     "limit": 25,                     // max posts per call (default 25)
 *     "site_id": "yalla-london",       // default from getDefaultSiteId()
 *     "post_ids": ["..."],             // only process these IDs (for testing)
 *     "languages": ["en", "ar"]        // which fields to rewrite (default both)
 *   }
 *
 * Auth: CRON_SECRET bearer token (matches seed-content/db-migrate pattern).
 *
 * Safety:
 *   - dry_run is the default. Caller must explicitly pass {"dry_run": false}.
 *   - Each post update is wrapped in optimisticBlogPostUpdate to play nicely
 *     with the enhancement-log invariants the rest of the cron pipeline uses.
 *   - The rewriter is idempotent: anchors are marked `data-affiliate-rebuilt`,
 *     and the partner-host regex never matches our `/api/affiliate/click`
 *     wrapper URL, so re-runs don't double-wrap.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { rewriteAffiliateLinks } from "@/lib/affiliate/url-builders";
import { getDefaultSiteId } from "@/config/sites";

function checkAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }
  if (authHeader === `Bearer ${cronSecret}`) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const PARTNER_HOST_PATTERN = "booking.com|hotels.com|viator.com|getyourguide.|vrbo.com|thefork.";

interface RebuildRequestBody {
  dry_run?: boolean;
  limit?: number;
  site_id?: string;
  post_ids?: string[];
  languages?: Array<"en" | "ar">;
}

interface PerPostDiff {
  id: string;
  slug: string;
  title: string;
  swaps_en: number;
  swaps_ar: number;
  drops_en: number;
  drops_ar: number;
  sample_swap?: { from: string; to: string; partner: string };
  updated: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  let body: RebuildRequestBody = {};
  try {
    body = await request.json();
  } catch {
    /* body optional */
  }

  const dryRun = body.dry_run !== false; // default true
  const limit = Math.max(1, Math.min(body.limit ?? 25, 100));
  const siteId = body.site_id || getDefaultSiteId();
  const languages = body.languages || ["en", "ar"];

  const { prisma } = await import("@/lib/db");

  // Build the query. We only touch published posts that still contain at
  // least one direct partner host in either content field.
  const where: Record<string, unknown> = body.post_ids?.length
    ? { id: { in: body.post_ids } }
    : {
        published: true,
        OR: [
          { content_en: { contains: "booking.com" } },
          { content_en: { contains: "hotels.com" } },
          { content_en: { contains: "viator.com" } },
          { content_en: { contains: "getyourguide." } },
          { content_en: { contains: "vrbo.com" } },
          { content_en: { contains: "thefork." } },
          { content_ar: { contains: "booking.com" } },
          { content_ar: { contains: "hotels.com" } },
          { content_ar: { contains: "viator.com" } },
          { content_ar: { contains: "getyourguide." } },
          { content_ar: { contains: "vrbo.com" } },
          { content_ar: { contains: "thefork." } },
        ],
      };

  const posts = await prisma.blogPost.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title_en: true,
      content_en: true,
      content_ar: true,
      updated_at: true,
    },
    take: limit,
    orderBy: { created_at: "desc" },
  });

  const diffs: PerPostDiff[] = [];
  let totalSwaps = 0;
  let totalDrops = 0;
  let updatedCount = 0;

  for (const post of posts) {
    const diff: PerPostDiff = {
      id: post.id,
      slug: post.slug,
      title: post.title_en,
      swaps_en: 0,
      swaps_ar: 0,
      drops_en: 0,
      drops_ar: 0,
      updated: false,
    };

    let newContentEn = post.content_en;
    let newContentAr = post.content_ar;

    if (languages.includes("en") && post.content_en) {
      const res = rewriteAffiliateLinks(post.content_en, siteId, post.slug);
      diff.swaps_en = res.swaps.length;
      diff.drops_en = res.drops.length;
      if (res.swaps.length > 0 && !diff.sample_swap) {
        diff.sample_swap = {
          from: res.swaps[0].from,
          to: res.swaps[0].to,
          partner: res.swaps[0].partner,
        };
      }
      newContentEn = res.html;
    }

    if (languages.includes("ar") && post.content_ar) {
      const res = rewriteAffiliateLinks(post.content_ar, siteId, post.slug);
      diff.swaps_ar = res.swaps.length;
      diff.drops_ar = res.drops.length;
      if (res.swaps.length > 0 && !diff.sample_swap) {
        diff.sample_swap = {
          from: res.swaps[0].from,
          to: res.swaps[0].to,
          partner: res.swaps[0].partner,
        };
      }
      newContentAr = res.html;
    }

    const hasChanges =
      diff.swaps_en > 0 || diff.swaps_ar > 0 || diff.drops_en > 0 || diff.drops_ar > 0;

    totalSwaps += diff.swaps_en + diff.swaps_ar;
    totalDrops += diff.drops_en + diff.drops_ar;

    if (hasChanges && !dryRun) {
      try {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            ...(newContentEn !== post.content_en ? { content_en: newContentEn } : {}),
            ...(newContentAr !== post.content_ar ? { content_ar: newContentAr } : {}),
          },
        });
        diff.updated = true;
        updatedCount++;
      } catch (err) {
        diff.error = err instanceof Error ? err.message : String(err);
      }
    }

    diffs.push(diff);
  }

  // Audit log entry for prod runs
  if (!dryRun && updatedCount > 0) {
    try {
      await prisma.auditLog.create({
        data: {
          action: "AFFILIATE_REBUILD_BACKFILL",
          details: {
            site_id: siteId,
            posts_scanned: posts.length,
            posts_updated: updatedCount,
            total_swaps: totalSwaps,
            total_drops: totalDrops,
            languages,
          },
        },
      });
    } catch (err) {
      console.warn(
        "[affiliate-rebuild] AuditLog write failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    site_id: siteId,
    posts_scanned: posts.length,
    posts_with_changes: diffs.filter((d) => d.swaps_en + d.swaps_ar + d.drops_en + d.drops_ar > 0)
      .length,
    posts_updated: updatedCount,
    total_swaps: totalSwaps,
    total_drops: totalDrops,
    env_check: {
      TRAVELPAYOUTS_MARKER: Boolean(process.env.TRAVELPAYOUTS_MARKER),
      CJ_PUBLISHER_CID: Boolean(process.env.CJ_PUBLISHER_CID),
      CJ_WEBSITE_ID: Boolean(process.env.CJ_WEBSITE_ID),
      EXPEDIA_CJ_ADVERTISER_ID: Boolean(process.env.EXPEDIA_CJ_ADVERTISER_ID),
    },
    diffs,
  });
}

/**
 * GET /api/admin/affiliate-rebuild
 *
 * Discovery endpoint — returns the count of remaining posts with direct
 * partner URLs, broken down by partner. Useful for checking progress after
 * each batch of POST calls.
 */
export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");

  const breakdown: Record<string, number> = {};
  const partners = [
    "booking.com",
    "hotels.com",
    "viator.com",
    "getyourguide.",
    "vrbo.com",
    "thefork.",
  ];

  for (const p of partners) {
    breakdown[p] = await prisma.blogPost.count({
      where: {
        published: true,
        OR: [{ content_en: { contains: p } }, { content_ar: { contains: p } }],
      },
    });
  }

  const totalRemaining = await prisma.blogPost.count({
    where: {
      published: true,
      OR: [
        { content_en: { contains: "booking.com" } },
        { content_en: { contains: "hotels.com" } },
        { content_en: { contains: "viator.com" } },
        { content_en: { contains: "getyourguide." } },
        { content_en: { contains: "vrbo.com" } },
        { content_en: { contains: "thefork." } },
        { content_ar: { contains: "booking.com" } },
        { content_ar: { contains: "hotels.com" } },
        { content_ar: { contains: "viator.com" } },
        { content_ar: { contains: "getyourguide." } },
        { content_ar: { contains: "vrbo.com" } },
        { content_ar: { contains: "thefork." } },
      ],
    },
  });

  return NextResponse.json({
    ok: true,
    posts_with_direct_partner_urls: totalRemaining,
    breakdown,
    pattern_matched: PARTNER_HOST_PATTERN,
    env_check: {
      TRAVELPAYOUTS_MARKER: Boolean(process.env.TRAVELPAYOUTS_MARKER),
      CJ_PUBLISHER_CID: Boolean(process.env.CJ_PUBLISHER_CID),
      CJ_WEBSITE_ID: Boolean(process.env.CJ_WEBSITE_ID),
      EXPEDIA_CJ_ADVERTISER_ID: Boolean(process.env.EXPEDIA_CJ_ADVERTISER_ID),
    },
  });
}
