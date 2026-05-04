/**
 * GET /api/admin/chrome-bridge/not-indexed-details?siteId=X
 *
 * Returns diagnostic details for every URL where Google explicitly declined
 * indexing (URLIndexingStatus.status = "not_indexed" or coverage_state
 * contains "Crawled - currently not indexed"). This is Google's content-
 * quality signal — pages that were discovered + crawled but failed
 * assessment.
 *
 * Per-page payload includes:
 *   - URL, slug, blog-post id, age in days
 *   - Word count, heading structure counts, internal link count
 *   - Author attribution (real name vs generic "Editorial")
 *   - Meta title + description length/presence
 *   - Authenticity-signal count (first-hand phrases: "we visited", "insider tip", etc.)
 *   - AI-generic phrase count ("nestled in", "look no further", etc.)
 *   - First 400 chars of content (sniff test for AI-ness + lede quality)
 *   - Enhancement log history
 *
 * Used by /api/admin/chrome-bridge/enhance-not-indexed to seed a
 * quality-recovery Campaign.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AUTHENTICITY_PATTERNS = [
  /\bwe visited\b/gi,
  /\bwe tested\b/gi,
  /\bwe stayed\b/gi,
  /\bwe tried\b/gi,
  /\binsider tip\b/gi,
  /\bpro tip\b/gi,
  /\bwhen I\b/gi,
  /\bI recommend\b/gi,
  /\bin my experience\b/gi,
  /\bhonestly\b/gi,
  /\b(a|the) best (thing|part) (about|is)\b/gi,
];

const AI_GENERIC_PATTERNS = [
  /\bnestled in\b/gi,
  /\blook no further\b/gi,
  /\bwhether you'?re a\b/gi,
  /\bin this comprehensive guide\b/gi,
  /\bin conclusion\b/gi,
  /\bit'?s worth noting\b/gi,
  /\bwithout further ado\b/gi,
  /\bembark on a journey\b/gi,
  /\bdiscover the pinnacle\b/gi,
  /\bhidden gem\b/gi,
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50", 10),
      100,
    );
    const domain = getSiteDomain(siteId).replace(/\/$/, "");

    const indexingRows = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        OR: [
          { status: "not_indexed" },
          { coverage_state: { contains: "Crawled", mode: "insensitive" } },
          { coverage_state: { contains: "Discovered", mode: "insensitive" } },
        ],
      },
      orderBy: { last_inspected_at: "desc" },
      take: limit,
      select: {
        url: true,
        slug: true,
        status: true,
        coverage_state: true,
        indexing_state: true,
        submission_attempts: true,
        last_inspected_at: true,
        last_error: true,
      },
    });

    if (indexingRows.length === 0) {
      return NextResponse.json({
        success: true,
        siteId,
        count: 0,
        pages: [],
        note: "No URLs flagged as not_indexed or 'Crawled - currently not indexed'. Site quality signals are healthy.",
        _hints: buildHints({ justCalled: "not-indexed-details" }),
      });
    }

    // Map URLs → slugs → BlogPost ids
    const slugs: string[] = [];
    for (const row of indexingRows) {
      const slug = row.slug ?? extractSlug(row.url, domain);
      if (slug) slugs.push(slug);
    }

    const posts = await prisma.blogPost.findMany({
      where: { siteId, slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        title_en: true,
        content_en: true,
        meta_title_en: true,
        meta_description_en: true,
        seo_score: true,
        author_id: true,
        created_at: true,
        updated_at: true,
        enhancement_log: true,
      },
    });

    type PostRow = (typeof posts)[number];
    const postsBySlug = new Map<string, PostRow>(posts.map((p) => [p.slug, p]));

    // Author lookup
    const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean) as string[])];
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true, email: true },
    });
    type AuthorRow = (typeof authors)[number];
    const authorsById = new Map<string, AuthorRow>(authors.map((a) => [a.id, a]));

    const pages = indexingRows.map((row) => {
      const slug = row.slug ?? extractSlug(row.url, domain) ?? "";
      const post = slug ? postsBySlug.get(slug) : undefined;
      const author = post?.author_id ? authorsById.get(post.author_id) : undefined;

      const content = post?.content_en ?? "";
      const strippedText = content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const wordCount = strippedText.split(/\s+/).filter(Boolean).length;

      const h1Count = (content.match(/<h1\b/gi) || []).length;
      const h2Count = (content.match(/<h2\b/gi) || []).length;
      const h3Count = (content.match(/<h3\b/gi) || []).length;
      const internalLinkCount = (
        content.match(new RegExp(`<a[^>]+href=["'][^"']*${domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi")) || []
      ).length;

      let authenticitySignals = 0;
      for (const p of AUTHENTICITY_PATTERNS) {
        authenticitySignals += (strippedText.match(p) || []).length;
      }
      let aiGenericPhrases = 0;
      for (const p of AI_GENERIC_PATTERNS) {
        aiGenericPhrases += (strippedText.match(p) || []).length;
      }

      const authorIsGeneric =
        !author?.name ||
        /editorial|team|admin|system/i.test(author.name);

      const ageDays = post?.created_at
        ? Math.floor(
            (Date.now() - new Date(post.created_at).getTime()) / (24 * 60 * 60 * 1000),
          )
        : null;

      return {
        url: row.url,
        slug,
        blogPostId: post?.id ?? null,
        indexing: {
          status: row.status,
          coverageState: row.coverage_state,
          indexingState: row.indexing_state,
          submissionAttempts: row.submission_attempts,
          lastInspectedAt: row.last_inspected_at,
          lastError: row.last_error,
        },
        content: post
          ? {
              title: post.title_en,
              seoScore: post.seo_score,
              wordCount,
              h1Count,
              h2Count,
              h3Count,
              internalLinkCount,
              metaTitleLength: post.meta_title_en?.length ?? 0,
              metaDescriptionLength: post.meta_description_en?.length ?? 0,
              hasMetaTitle: !!post.meta_title_en,
              hasMetaDescription: !!post.meta_description_en,
              ageDays,
              lastUpdated: post.updated_at,
              enhancementLogCount: Array.isArray(post.enhancement_log)
                ? post.enhancement_log.length
                : 0,
              excerpt: strippedText.slice(0, 400),
            }
          : null,
        quality: post
          ? {
              authenticitySignals,
              aiGenericPhrases,
              authenticityRatio:
                wordCount > 0 ? Number((authenticitySignals / (wordCount / 100)).toFixed(2)) : 0,
              aiGenericRatio:
                wordCount > 0 ? Number((aiGenericPhrases / (wordCount / 100)).toFixed(2)) : 0,
              authorName: author?.name ?? null,
              authorIsGeneric,
            }
          : null,
        diagnoseTriage: post ? classify(wordCount, authenticitySignals, aiGenericPhrases, authorIsGeneric, post.seo_score) : "no_blogpost",
      };
    });

    // Summary stats
    const triageCounts: Record<string, number> = {};
    for (const p of pages) {
      triageCounts[p.diagnoseTriage] = (triageCounts[p.diagnoseTriage] ?? 0) + 1;
    }

    return NextResponse.json({
      success: true,
      siteId,
      count: pages.length,
      summary: {
        triageCounts,
        avgWordCount: pages.filter((p) => p.content).reduce((s, p) => s + (p.content?.wordCount ?? 0), 0) / Math.max(1, pages.filter((p) => p.content).length),
        avgAuthenticitySignals:
          pages.filter((p) => p.quality).reduce((s, p) => s + (p.quality?.authenticitySignals ?? 0), 0) / Math.max(1, pages.filter((p) => p.quality).length),
        pagesWithGenericAuthor: pages.filter((p) => p.quality?.authorIsGeneric).length,
        pagesWithAiGenericLanguage: pages.filter((p) => (p.quality?.aiGenericPhrases ?? 0) >= 3).length,
      },
      pages,
      _hints: buildHints({ justCalled: "not-indexed-details" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/not-indexed-details]", message);
    return NextResponse.json(
      { error: "Failed to load not-indexed details", details: message },
      { status: 500 },
    );
  }
}

function extractSlug(url: string, domain: string): string | null {
  const prefix = `${domain}/blog/`;
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length).split("/")[0].split("?")[0].split("#")[0] || null;
}

/**
 * Classify each page into a triage bucket. Determines which enhancement
 * strategy the campaign should apply.
 */
function classify(
  wordCount: number,
  authenticitySignals: number,
  aiGenericPhrases: number,
  authorIsGeneric: boolean,
  seoScore: number | null,
): string {
  if (wordCount < 500) return "thin_content";
  if (aiGenericPhrases >= 5 && authenticitySignals < 2) return "ai_generic_heavy";
  if (authenticitySignals < 2) return "low_authenticity";
  if (authorIsGeneric) return "generic_author";
  if (seoScore !== null && seoScore < 60) return "low_seo_score";
  if (wordCount < 1000) return "shallow_depth";
  return "quality_depth_unclear";
}
