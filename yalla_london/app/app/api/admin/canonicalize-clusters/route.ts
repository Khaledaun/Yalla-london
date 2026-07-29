/**
 * Canonicalize Duplicate Clusters
 *
 * Manual override for the cannibalization-resolver that's normally rate-limited
 * via seo-agent (max 3 groups per run, 3 runs per day → ~9 per day).
 *
 * When Khaled gets a "16 cannibalization clusters" finding in the Perplexity
 * re-audit (May 17), the existing rate limit means it would take 2+ days to
 * drain. This endpoint exposes the full clustering result for one-tap manual
 * resolution from the cockpit.
 *
 * Behavior:
 *   GET  → returns ALL groups with winner suggestion + per-duplicate overlap %.
 *          Read-only. Used to populate the cockpit canonicalize-clusters page.
 *
 *   POST { action: "canonicalize", canonicalId } → resolves ONE group identified
 *          by its canonical article id. Returns the resolution result.
 *
 *   POST { action: "canonicalize_all", minOverlap?: 70 } → resolves ALL groups
 *          where MAX duplicate overlap >= minOverlap (default 70%, so we don't
 *          accidentally collapse legitimately distinct articles that just
 *          happen to share filler words). Returns aggregated counts.
 *
 * All canonicalization uses `published: false` + `canonical_slug` (per CLAUDE.md
 * rule #179 — never hard-delete a BlogPost, preserves SEO equity via 301
 * redirect created by the resolver).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";
import { findCannibalizationGroups, resolveCannibalizationGroups } from "@/lib/seo/cannibalization-resolver";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const groups = await findCannibalizationGroups(siteId);

  // Sort groups by max overlap (most actionable first) then by duplicate count.
  const ranked = [...groups].sort((a, b) => {
    const maxA = a.duplicates.reduce((m, d) => Math.max(m, d.overlapPct), 0);
    const maxB = b.duplicates.reduce((m, d) => Math.max(m, d.overlapPct), 0);
    if (maxA !== maxB) return maxB - maxA;
    return b.duplicates.length - a.duplicates.length;
  });

  return NextResponse.json({
    siteId,
    totalGroups: ranked.length,
    totalDuplicates: ranked.reduce((n, g) => n + g.duplicates.length, 0),
    groups: ranked,
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const siteId = body.siteId || getDefaultSiteId();

  if (action === "canonicalize") {
    const canonicalId = body.canonicalId;
    if (!canonicalId || typeof canonicalId !== "string") {
      return NextResponse.json({ error: "canonicalId required" }, { status: 400 });
    }
    const groups = await findCannibalizationGroups(siteId);
    const target = groups.find((g) => g.canonicalId === canonicalId);
    if (!target) {
      return NextResponse.json({ error: "Group no longer exists — re-fetch and try again" }, { status: 404 });
    }
    const result = await resolveCannibalizationGroups([target], siteId, 1);
    return NextResponse.json({
      action: "canonicalize",
      siteId,
      canonicalId,
      result,
    });
  }

  if (action === "canonicalize_all") {
    const minOverlap = typeof body.minOverlap === "number" ? body.minOverlap : 70;
    const groups = await findCannibalizationGroups(siteId);
    const eligible = groups.filter((g) => g.duplicates.some((d) => d.overlapPct >= minOverlap));
    // Bound total work — 50 groups × ~2 duplicates each = ~100 BlogPost updates
    // + 100 SeoRedirect upserts. Safe within 60s budget on Vercel Pro.
    const capped = eligible.slice(0, 50);
    const result = await resolveCannibalizationGroups(capped, siteId, capped.length);
    return NextResponse.json({
      action: "canonicalize_all",
      siteId,
      minOverlap,
      eligibleGroups: eligible.length,
      processedGroups: capped.length,
      skippedGroups: Math.max(0, eligible.length - capped.length),
      result,
    });
  }

  return NextResponse.json({ error: "Unknown action — use 'canonicalize' or 'canonicalize_all'" }, { status: 400 });
}
