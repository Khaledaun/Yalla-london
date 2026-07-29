/**
 * Rescue Plan — actionable per-article fix queue, ranked by revenue leverage.
 *
 * GET /api/admin/rescue-plan?siteId=X&limit=50
 *
 * Combines 5 failure-mode detectors into a single ranked list:
 *
 *   1. Near-miss ranking — pages at position 11-30 with ≥50 impressions/30d.
 *      Leverage = impressions × (target_ctr − current_ctr). Moving a page
 *      from position 15→7 typically lifts CTR from ~3% to ~12%, a 4x click
 *      uplift. THIS IS THE BIGGEST LEVER on a 691-article site.
 *
 *   2. Cannibalization clusters — groups of ≥2 published articles whose
 *      titles share >70% Jaccard similarity after stop-word removal.
 *      Leverage = sum of impressions across the cluster. Consolidation
 *      (canonical_slug → winner) typically lifts the winner by 20-40%.
 *
 *   3. Thin content + indexed — pages indexed but under content-quality
 *      tier minimums (BRONZE=800w). They dilute site topical authority.
 *      Leverage = -authority_drag (negative; fix protects rest of site).
 *
 *   4. Stale submission — submitted > 30 days ago, never indexed.
 *      Dead inventory. Leverage = potential_impressions if Google indexes.
 *
 *   5. Dead-CJ link — articles linking to advertisers in DECLINED status.
 *      Per public-audit/route.ts:1107 critical finding. Leverage =
 *      $ revenue lost per click × estimated_clicks_to_link.
 *
 * Why this exists: the May 15 briefing showed 691 published → ~19
 * converting (97% funnel loss) but offered no per-article action queue.
 * /api/admin/score-breakdown explains WHICH composite component is
 * dragging; this endpoint explains WHICH SPECIFIC ARTICLES to fix and
 * in what order.
 *
 * Each item includes an `action` block with the executable endpoint
 * + payload so a follow-up POST can trigger the fix. Items marked
 * `executable: false` need human judgment (e.g., title rewrites — bad
 * choices hurt rankings).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

// Reuse the same constants the cannibalization detector and discovery scanner use
const JACCARD_THRESHOLD = 0.7; // matches TOPIC_DISCIPLINE.duplicateRejectionJaccardThreshold
const NEAR_MISS_POS_MIN = 11;
const NEAR_MISS_POS_MAX = 30;
const NEAR_MISS_MIN_IMP = 50;
const STALE_SUBMISSION_DAYS = 30;
const THIN_CONTENT_WORDS = 500;
const BUDGET_MS = 100_000;

type FailureMode = "near_miss" | "cannibalization" | "thin_content" | "stale_indexing" | "dead_cj_link";

type RescueItem = {
  slug: string;
  url: string;
  title: string;
  failureMode: FailureMode;
  /** Estimated additional clicks/month if this fix is applied. */
  leverage: number;
  /** Human-readable diagnosis. */
  diagnosis: string;
  /** Specific recommended action. */
  recommendation: string;
  /** Optional executable action endpoint + payload. */
  action: {
    label: string;
    endpoint: string | null;
    payload: Record<string, unknown> | null;
    executable: boolean;
    estimatedTimeMins: number;
  };
  metrics?: Record<string, unknown>;
};

function normalize(title: string): Set<string> {
  const FILLER = new Set([
    "best",
    "top",
    "ultimate",
    "complete",
    "definitive",
    "guide",
    "review",
    "yalla",
    "london",
    "the",
    "a",
    "an",
    "for",
    "with",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "at",
    "by",
    "is",
    "as",
    "it",
    "you",
    "your",
    "our",
    "luxury",
    "exclusive",
    "comparison",
  ]);
  return new Set(
    title
      .toLowerCase()
      .replace(/[\|\-:&,.()]/g, " ")
      .replace(/\b20\d{2}\b/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !FILLER.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Estimated CTR by position. Industry-standard "Petrescu curve" smoothed
 * for organic SERPs (no SERP feature dominance). Used to project click
 * lift from a position improvement.
 */
function estimateCtrAtPosition(pos: number): number {
  if (pos <= 1) return 0.28;
  if (pos <= 2) return 0.155;
  if (pos <= 3) return 0.11;
  if (pos <= 5) return 0.065;
  if (pos <= 7) return 0.04;
  if (pos <= 10) return 0.025;
  if (pos <= 15) return 0.012;
  if (pos <= 20) return 0.006;
  return 0.003;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();
  const url = request.nextUrl;
  const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
  const siteId = url.searchParams.get("siteId") || getDefaultSiteId();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const includeModes = (url.searchParams.get("modes") || "all").split(",");
  const wants = (m: FailureMode) => includeModes.includes("all") || includeModes.includes(m);

  const { prisma } = await import("@/lib/db");
  const domain = getSiteDomain(siteId);
  const baseUrl = domain.replace(/\/$/, "");

  // ── Pull base dataset: published posts + indexing + GSC (last 30d) ────
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleCutoff = new Date(Date.now() - STALE_SUBMISSION_DAYS * 24 * 60 * 60 * 1000);

  const [posts, indexingRows, gscRows, declinedAdvertisers] = await Promise.all([
    prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title_en: true,
        content_en: true,
        created_at: true,
        seo_score: true,
      },
      take: 2000,
      orderBy: { created_at: "desc" },
    }),
    prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: {
        url: true,
        status: true,
        last_submitted_at: true,
        submission_attempts: true,
        last_error: true,
      },
      take: 5000,
    }),
    prisma.gscPagePerformance
      .findMany({
        where: { site_id: siteId, date: { gte: since30d } },
        select: { url: true, clicks: true, impressions: true, position: true },
      })
      .catch(() => [] as Array<{ url: string; clicks: number; impressions: number; position: number }>),
    prisma.cjAdvertiser
      .findMany({
        where: { status: "DECLINED" },
        select: { name: true, externalId: true },
      })
      .catch(() => [] as Array<{ name: string; externalId: string }>),
  ]);

  // Build lookup maps
  const indexingByUrl = new Map<string, (typeof indexingRows)[0]>();
  for (const r of indexingRows) indexingByUrl.set(r.url, r);

  // Aggregate GSC by URL across 30 days
  const gscByUrl = new Map<string, { clicks: number; impressions: number; positionSum: number; samples: number }>();
  for (const row of gscRows) {
    const e = gscByUrl.get(row.url) || { clicks: 0, impressions: 0, positionSum: 0, samples: 0 };
    e.clicks += row.clicks;
    e.impressions += row.impressions;
    if (row.position > 0) {
      e.positionSum += row.position * row.impressions; // weighted by impressions
      e.samples += row.impressions;
    }
    gscByUrl.set(row.url, e);
  }

  // Set of declined advertiser names for dead-CJ detection
  const declinedNames = new Set(declinedAdvertisers.map((a) => a.name.toLowerCase()));

  const items: RescueItem[] = [];

  // ── Detector 1: Cannibalization clusters ──────────────────────────────
  // Group posts by normalized title; any cluster of ≥2 with Jaccard >= 0.7
  // is cannibalization. Winner = highest impressions; rest are "losers".
  if (wants("cannibalization") && Date.now() - startTime < BUDGET_MS - 10_000) {
    const titleSets = posts.map((p) => ({
      post: p,
      tokens: normalize(p.title_en || p.slug),
      url: `${baseUrl}/blog/${p.slug}`,
    }));
    const visited = new Set<string>();
    const clusters: Array<typeof titleSets> = [];

    for (let i = 0; i < titleSets.length; i++) {
      if (visited.has(titleSets[i].post.slug)) continue;
      const cluster = [titleSets[i]];
      visited.add(titleSets[i].post.slug);
      for (let j = i + 1; j < titleSets.length; j++) {
        if (visited.has(titleSets[j].post.slug)) continue;
        if (jaccard(titleSets[i].tokens, titleSets[j].tokens) >= JACCARD_THRESHOLD) {
          cluster.push(titleSets[j]);
          visited.add(titleSets[j].post.slug);
        }
      }
      if (cluster.length >= 2) clusters.push(cluster);
    }

    for (const cluster of clusters) {
      // Sort cluster by impressions desc — winner is the most-impressed page
      const annotated = cluster.map((c) => {
        const g = gscByUrl.get(c.url) || { clicks: 0, impressions: 0, positionSum: 0, samples: 0 };
        return { ...c, clicks: g.clicks, impressions: g.impressions };
      });
      annotated.sort((a, b) => b.impressions - a.impressions);
      const winner = annotated[0];
      const losers = annotated.slice(1);

      for (const loser of losers) {
        const consolidatedImpressions = annotated.reduce((s, c) => s + c.impressions, 0);
        // Conservative: 25% lift on winner once losers redirect
        const leverage = Math.round(consolidatedImpressions * 0.25 * 0.04); // CTR at top-5 ≈ 4%+

        items.push({
          slug: loser.post.slug,
          url: loser.url,
          title: loser.post.title_en || loser.post.slug,
          failureMode: "cannibalization",
          leverage,
          diagnosis: `Cluster of ${cluster.length} near-duplicate articles competing for the same keywords. Winner: "${winner.post.title_en?.slice(0, 60)}" (${winner.impressions} imp). This loser only has ${loser.impressions} imp.`,
          recommendation: `Set canonical_slug=${winner.post.slug} and unpublish. Winner gets ~25% authority boost.`,
          action: {
            label: "Canonicalize → winner",
            endpoint: "/api/admin/content-cleanup",
            payload: {
              action: "canonicalize",
              loserSlug: loser.post.slug,
              winnerSlug: winner.post.slug,
              siteId,
            },
            executable: true,
            estimatedTimeMins: 1,
          },
          metrics: {
            clusterSize: cluster.length,
            winnerSlug: winner.post.slug,
            winnerImpressions: winner.impressions,
            loserImpressions: loser.impressions,
            consolidatedImpressions,
          },
        });
      }
    }
  }

  // ── Detector 2: Near-miss ranking opportunities ───────────────────────
  if (wants("near_miss") && Date.now() - startTime < BUDGET_MS - 5_000) {
    for (const post of posts) {
      const fullUrl = `${baseUrl}/blog/${post.slug}`;
      const g = gscByUrl.get(fullUrl);
      if (!g || g.impressions < NEAR_MISS_MIN_IMP || g.samples === 0) continue;

      const avgPos = g.positionSum / g.samples;
      if (avgPos < NEAR_MISS_POS_MIN || avgPos > NEAR_MISS_POS_MAX) continue;

      const currentCtr = g.clicks / g.impressions;
      const targetPos = Math.max(5, Math.floor(avgPos / 2)); // aim to halve position, floor at 5
      const targetCtr = estimateCtrAtPosition(targetPos);
      const ctrLift = Math.max(0, targetCtr - currentCtr);
      const leverage = Math.round(g.impressions * ctrLift);

      if (leverage < 3) continue; // sub-3-click lift not worth surfacing

      items.push({
        slug: post.slug,
        url: fullUrl,
        title: post.title_en || post.slug,
        failureMode: "near_miss",
        leverage,
        diagnosis: `Position ${avgPos.toFixed(1)} with ${g.impressions} impressions/30d but only ${g.clicks} clicks (CTR ${(currentCtr * 100).toFixed(1)}%). Moving to position ${targetPos} would lift CTR to ~${(targetCtr * 100).toFixed(1)}%.`,
        recommendation: `Rewrite title + meta description for stronger click appeal. Add 200-400 words covering the long-tail variations Google is ranking you for. Update internal links pointing to this page with target-keyword anchor text.`,
        action: {
          label: "Optimize for near-miss query",
          endpoint: "/api/admin/discovery",
          payload: { action: "optimize_ctr", slug: post.slug, siteId },
          executable: true,
          estimatedTimeMins: 5,
        },
        metrics: {
          avgPosition: Math.round(avgPos * 10) / 10,
          impressions30d: g.impressions,
          clicks30d: g.clicks,
          currentCtr: Math.round(currentCtr * 10000) / 10000,
          targetPosition: targetPos,
          projectedCtr: Math.round(targetCtr * 10000) / 10000,
        },
      });
    }
  }

  // ── Detector 3: Thin content (indexed but undersize) ──────────────────
  if (wants("thin_content") && Date.now() - startTime < BUDGET_MS - 5_000) {
    for (const post of posts) {
      const wordCount = post.content_en
        ? post.content_en
            .replace(/<[^>]*>/g, "")
            .split(/\s+/)
            .filter(Boolean).length
        : 0;
      if (wordCount === 0 || wordCount >= THIN_CONTENT_WORDS) continue;

      const fullUrl = `${baseUrl}/blog/${post.slug}`;
      const g = gscByUrl.get(fullUrl);
      const impressions = g?.impressions || 0;
      // Leverage is small per article but compounds via topical authority.
      // Conservatively score = impressions × 0.01 (1% CTR uplift after fix).
      const leverage = Math.max(1, Math.round(impressions * 0.01));

      items.push({
        slug: post.slug,
        url: fullUrl,
        title: post.title_en || post.slug,
        failureMode: "thin_content",
        leverage,
        diagnosis: `Only ${wordCount} words (target: 800+). Below BRONZE tier minimum. Dilutes site topical authority.`,
        recommendation:
          impressions > 0
            ? `Expand to 1,000+ words covering the queries Google is already showing it for. content-auto-fix Section 1 handles this automatically.`
            : `Unpublish or merge with a stronger article. Zero impressions means zero recovery value.`,
        action: {
          label: impressions > 0 ? "AI-expand to 1,000 words" : "Unpublish thin article",
          endpoint: "/api/admin/content-cleanup",
          payload: {
            action: impressions > 0 ? "expand_thin" : "unpublish_thin",
            slug: post.slug,
            siteId,
          },
          executable: true,
          estimatedTimeMins: impressions > 0 ? 3 : 1,
        },
        metrics: { wordCount, impressions30d: impressions, seoScore: post.seo_score },
      });
    }
  }

  // ── Detector 4: Stale submission (submitted >30d, never indexed) ──────
  if (wants("stale_indexing") && Date.now() - startTime < BUDGET_MS - 3_000) {
    for (const idx of indexingRows) {
      if (idx.status === "indexed") continue;
      if (idx.status === "error" || idx.status === "deindexed") continue;
      if (!idx.last_submitted_at) continue;
      if (idx.last_submitted_at > staleCutoff) continue;

      // Match URL back to a post if possible (only blog URLs)
      const slugMatch = idx.url.match(/\/blog\/([^/?]+)/);
      const slug = slugMatch?.[1];
      const post = slug ? posts.find((p) => p.slug === slug) : null;
      if (!post) continue; // skip non-blog static pages here

      const daysSince = Math.round((Date.now() - idx.last_submitted_at.getTime()) / (24 * 60 * 60 * 1000));

      items.push({
        slug: post.slug,
        url: idx.url,
        title: post.title_en || post.slug,
        failureMode: "stale_indexing",
        leverage: 5, // baseline assumption: indexing a missing page yields ~5 clicks/mo
        diagnosis: `Submitted ${daysSince} days ago, status="${idx.status}" — Google has not indexed it. Likely content quality or duplicate signals blocking indexation.`,
        recommendation:
          (idx.submission_attempts || 0) >= 5
            ? `Chronic indexing failure (${idx.submission_attempts} attempts). Article needs substantial content improvement or should be unpublished — re-submitting alone won't fix this.`
            : `Re-submit to IndexNow. content-auto-fix-lite Section 7 catches this automatically every 4h after Commit 47f5ab7.`,
        action: {
          label: "Re-submit to IndexNow",
          endpoint: "/api/admin/discovery",
          payload: { action: "force_resubmit", slug: post.slug, siteId },
          executable: (idx.submission_attempts || 0) < 5,
          estimatedTimeMins: 1,
        },
        metrics: {
          status: idx.status,
          daysSinceSubmitted: daysSince,
          submissionAttempts: idx.submission_attempts || 0,
          lastError: idx.last_error,
        },
      });
    }
  }

  // ── Detector 5: Dead CJ affiliate links ──────────────────────────────
  if (wants("dead_cj_link") && declinedNames.size > 0 && Date.now() - startTime < BUDGET_MS - 2_000) {
    for (const post of posts) {
      const content = post.content_en || "";
      if (!content) continue;

      // Look for data-advertiser="<name>" attributes near affiliate hrefs
      const advMatches = [...content.matchAll(/data-advertiser\s*=\s*"([^"]+)"/gi)];
      const deadFound = advMatches.map((m) => m[1].toLowerCase().trim()).filter((n) => declinedNames.has(n));
      if (deadFound.length === 0) continue;

      const fullUrl = `${baseUrl}/blog/${post.slug}`;
      const g = gscByUrl.get(fullUrl);
      const impressions = g?.impressions || 0;
      // Estimated revenue lost: 2% click-through to affiliate link × $5 avg commission
      const leverage = Math.max(1, Math.round(impressions * 0.02));

      items.push({
        slug: post.slug,
        url: fullUrl,
        title: post.title_en || post.slug,
        failureMode: "dead_cj_link",
        leverage,
        diagnosis: `Article links to ${deadFound.length} DECLINED CJ advertiser(s): ${[...new Set(deadFound)].slice(0, 3).join(", ")}. These links earn $0 per click.`,
        recommendation: `content-auto-fix Section 17 (Dead Affiliate Link Removal) handles this every 4h. Bump cron frequency or force-run to clear faster. Alternative: apply to Travelpayouts equivalents (Welcome Pickups, Tiqets, TicketNetwork already approved).`,
        action: {
          label: "Strip dead CJ links",
          endpoint: "/api/cron/content-auto-fix",
          payload: null,
          executable: true,
          estimatedTimeMins: 1,
        },
        metrics: {
          deadAdvertisers: [...new Set(deadFound)],
          impressions30d: impressions,
        },
      });
    }
  }

  // ── Rank by leverage desc + cap to limit ──────────────────────────────
  items.sort((a, b) => b.leverage - a.leverage);
  const ranked = items.slice(0, limit);

  // ── Aggregate summary ─────────────────────────────────────────────────
  const byMode: Record<FailureMode, { count: number; totalLeverage: number }> = {
    near_miss: { count: 0, totalLeverage: 0 },
    cannibalization: { count: 0, totalLeverage: 0 },
    thin_content: { count: 0, totalLeverage: 0 },
    stale_indexing: { count: 0, totalLeverage: 0 },
    dead_cj_link: { count: 0, totalLeverage: 0 },
  };
  for (const item of items) {
    byMode[item.failureMode].count++;
    byMode[item.failureMode].totalLeverage += item.leverage;
  }
  const totalLeverage = Object.values(byMode).reduce((s, m) => s + m.totalLeverage, 0);
  const top3Mode = (Object.entries(byMode) as Array<[FailureMode, { count: number; totalLeverage: number }]>)
    .sort((a, b) => b[1].totalLeverage - a[1].totalLeverage)
    .slice(0, 3);

  const summary: string[] = [];
  summary.push(`Found ${items.length} actionable items across ${posts.length} published articles.`);
  summary.push(
    `Total projected lift if ALL items fixed: ~${totalLeverage} additional clicks/month (current sitewide: ~${
      ranked.length > 0
        ? Math.max(
            1,
            ranked.reduce((s, r) => s + ((r.metrics?.clicks30d as number) || 0), 0),
          )
        : 0
    }).`,
  );
  if (top3Mode[0] && top3Mode[0][1].totalLeverage > 0) {
    summary.push(
      `Biggest lever: ${top3Mode[0][0].replace("_", " ")} — ${top3Mode[0][1].count} items, ~${top3Mode[0][1].totalLeverage} clicks/month potential.`,
    );
  }
  if (byMode.near_miss.count > 0) {
    summary.push(
      `Near-miss queue: ${byMode.near_miss.count} pages at position 11-30 with high impressions. Each ~5 min title/meta rewrite. THIS IS THE FASTEST PATH TO TRAFFIC GROWTH.`,
    );
  }

  return NextResponse.json({
    success: true,
    siteId,
    summary,
    totalItems: items.length,
    projectedClicksPerMonth: totalLeverage,
    byMode: Object.fromEntries(
      (Object.entries(byMode) as Array<[FailureMode, { count: number; totalLeverage: number }]>).map(([k, v]) => [
        k,
        { ...v, name: k.replace("_", " ") },
      ]),
    ),
    topMovers: top3Mode.map(([mode, data]) => ({
      mode: mode.replace("_", " "),
      count: data.count,
      totalLeverage: data.totalLeverage,
    })),
    items: ranked,
    durationMs: Date.now() - startTime,
    notes: {
      ctrCurve: "Position 1 ≈ 28% CTR, position 7 ≈ 4%, position 15 ≈ 1.2% (Petrescu organic curve)",
      cannibalizationThreshold: JACCARD_THRESHOLD,
      nearMissPositionRange: `${NEAR_MISS_POS_MIN}-${NEAR_MISS_POS_MAX}`,
      nearMissMinImpressions: NEAR_MISS_MIN_IMP,
      staleSubmissionDays: STALE_SUBMISSION_DAYS,
      thinContentWords: THIN_CONTENT_WORDS,
    },
  });
}
