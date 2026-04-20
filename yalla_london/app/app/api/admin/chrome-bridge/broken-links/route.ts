/**
 * GET /api/admin/chrome-bridge/broken-links?siteId=X&limit=N
 *
 * Scans published BlogPost content_en for internal links and detects:
 *   1. Dead blog links — href points to /blog/<slug> where that slug doesn't
 *      exist as a published BlogPost (unpublished, typo, hallucinated slug)
 *   2. Broken canonical links — href points to a slug that exists but is
 *      unpublished or deleted
 *   3. Orphan pages — published articles with zero inbound internal links
 *      (poor topical authority signal)
 *
 * DB-only — no HTTP fetch. Fast on large sites.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "200", 10),
      500,
    );
    const domain = getSiteDomain(siteId).replace(/\/$/, "");

    const posts = await prisma.blogPost.findMany({
      where: { published: true, siteId },
      select: {
        id: true,
        slug: true,
        title_en: true,
        content_en: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    const validSlugSet = new Set(posts.map((p) => p.slug));
    const inboundLinkCounts: Record<string, number> = {};
    const brokenLinks: Array<{
      sourceSlug: string;
      sourceTitle: string;
      targetSlug: string;
      targetUrl: string;
      anchorText: string;
    }> = [];

    // Match href="...\/blog\/<slug>..." capturing slug + anchor text
    const linkRegex =
      /<a[^>]+href=["']([^"']*\/blog\/([a-z0-9][a-z0-9-_/]*[a-z0-9])[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

    for (const post of posts) {
      const html = post.content_en ?? "";
      let match: RegExpExecArray | null;
      linkRegex.lastIndex = 0;
      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        const targetSlug = match[2].split("/").pop()?.split("?")[0].split("#")[0] ?? "";
        if (!targetSlug) continue;
        if (targetSlug === post.slug) continue; // self-ref (shouldn't happen, but skip)

        const anchorText = match[3]
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120);

        if (validSlugSet.has(targetSlug)) {
          inboundLinkCounts[targetSlug] = (inboundLinkCounts[targetSlug] ?? 0) + 1;
        } else {
          brokenLinks.push({
            sourceSlug: post.slug,
            sourceTitle: post.title_en,
            targetSlug,
            targetUrl: href.startsWith("http") ? href : `${domain}${href.startsWith("/") ? "" : "/"}${href}`,
            anchorText,
          });
        }
      }
    }

    // Orphan pages: published but 0 inbound internal links
    const orphanPages = posts
      .filter((p) => (inboundLinkCounts[p.slug] ?? 0) === 0)
      .map((p) => ({
        slug: p.slug,
        title: p.title_en,
        url: `${domain}/blog/${p.slug}`,
        inboundLinkCount: 0,
        ageDays: Math.floor(
          (Date.now() - new Date(p.created_at).getTime()) / (24 * 60 * 60 * 1000),
        ),
      }))
      .filter((p) => p.ageDays >= 7); // skip very fresh posts (not expected to have links yet)

    const brokenSummary: Record<string, number> = {};
    for (const b of brokenLinks) {
      brokenSummary[b.targetSlug] = (brokenSummary[b.targetSlug] ?? 0) + 1;
    }
    const topBrokenTargets = Object.entries(brokenSummary)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([slug, count]) => ({ targetSlug: slug, references: count }));

    // Weakly-linked pages: <2 inbound links
    const weaklyLinked = posts
      .filter((p) => {
        const inbound = inboundLinkCounts[p.slug] ?? 0;
        return inbound > 0 && inbound < 2;
      })
      .map((p) => ({
        slug: p.slug,
        title: p.title_en,
        url: `${domain}/blog/${p.slug}`,
        inboundLinkCount: inboundLinkCounts[p.slug] ?? 0,
      }));

    return NextResponse.json({
      success: true,
      siteId,
      pagesScanned: posts.length,
      summary: {
        brokenLinkCount: brokenLinks.length,
        uniqueBrokenTargets: topBrokenTargets.length,
        orphanPageCount: orphanPages.length,
        weaklyLinkedCount: weaklyLinked.length,
      },
      brokenLinks: brokenLinks.slice(0, 100),
      topBrokenTargets,
      orphanPages,
      weaklyLinked: weaklyLinked.slice(0, 50),
      _hints: buildHints({ justCalled: "broken-links" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/broken-links]", message);
    return NextResponse.json(
      { error: "Failed to scan broken links", details: message },
      { status: 500 },
    );
  }
}
