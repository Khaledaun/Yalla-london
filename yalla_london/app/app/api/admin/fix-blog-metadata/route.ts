/**
 * Batch Blog Metadata Auto-Fix API
 *
 * POST — Scans all published blog posts for metadata issues and auto-fixes them:
 *   - Titles > 60 chars → smart-truncated at word boundary
 *   - Descriptions > 160 chars → smart-truncated at sentence/word boundary
 *   - Descriptions < 120 chars or missing → generated from excerpt or content
 *
 * GET — Dry-run: returns what would be fixed without making changes
 *
 * Protected by admin auth. One-tap from dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Smart truncation helpers
// ---------------------------------------------------------------------------

/** Truncate string at word boundary, adding ellipsis */
function smartTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;

  // Leave room for "..."
  const cutoff = maxLen - 3;
  const lastSpace = text.lastIndexOf(" ", cutoff);
  const breakPoint = lastSpace > cutoff * 0.5 ? lastSpace : cutoff;
  return text.slice(0, breakPoint).replace(/[,;:\s]+$/, "") + "...";
}

/** Extract plain text from HTML content (strip tags) */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Generate a meta description from available content */
function generateDescription(
  title: string,
  excerpt: string | null,
  content: string | null
): string {
  // Prefer excerpt if it's a good length
  if (excerpt) {
    const cleanExcerpt = stripHtml(excerpt).trim();
    if (cleanExcerpt.length >= 120 && cleanExcerpt.length <= 160) {
      return cleanExcerpt;
    }
    if (cleanExcerpt.length > 160) {
      return smartTruncate(cleanExcerpt, 155);
    }
    // Excerpt exists but too short — try to use it as base
    if (cleanExcerpt.length >= 50) {
      // Pad with content if available
      if (content) {
        const cleanContent = stripHtml(content);
        const firstSentences = cleanContent.split(/[.!?]\s/).slice(0, 3).join(". ");
        const combined = cleanExcerpt + ". " + firstSentences;
        if (combined.length >= 120) {
          return smartTruncate(combined, 155);
        }
      }
      // Return what we have if padding didn't work
      return cleanExcerpt;
    }
  }

  // Fall back to content
  if (content) {
    const cleanContent = stripHtml(content);
    if (cleanContent.length >= 120) {
      // Find a good sentence break
      const sentences = cleanContent.split(/[.!?]\s/);
      let desc = "";
      for (const sentence of sentences) {
        const next = desc ? desc + ". " + sentence : sentence;
        if (next.length > 155) break;
        desc = next;
      }
      if (desc.length >= 120) {
        return desc.endsWith(".") ? desc : desc + ".";
      }
      // If sentence-based approach didn't yield enough, just truncate
      return smartTruncate(cleanContent, 155);
    }
  }

  // Last resort: generate from title
  return `Discover ${title}. Your complete guide with expert insights, local tips, and everything you need to know.`.slice(0, 155);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetadataFix {
  id: string;
  slug: string;
  field: "meta_title_en" | "meta_description_en";
  oldValue: string;
  newValue: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// GET — Dry run (preview fixes without applying)
// ---------------------------------------------------------------------------

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    const articles = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title_en: true,
        meta_title_en: true,
        meta_description_en: true,
        excerpt_en: true,
        content_en: true,
      },
      orderBy: { created_at: "desc" },
      take: 300,
    });

    const fixes = analyzeAndPlanFixes(articles);

    return NextResponse.json({
      success: true,
      dryRun: true,
      siteId,
      totalArticles: articles.length,
      articlesWithIssues: new Set(fixes.map((f) => f.id)).size,
      totalFixes: fixes.length,
      fixes: fixes.map((f) => ({
        slug: f.slug,
        field: f.field,
        reason: f.reason,
        oldLength: f.oldValue.length,
        newLength: f.newValue.length,
        oldPreview: f.oldValue.slice(0, 80) + (f.oldValue.length > 80 ? "..." : ""),
        newPreview: f.newValue.slice(0, 80) + (f.newValue.length > 80 ? "..." : ""),
      })),
    });
  } catch (error) {
    console.error("[fix-blog-metadata] GET error:", error);
    return NextResponse.json(
      { error: "Failed to analyze metadata" },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// POST — Apply fixes
// ---------------------------------------------------------------------------

export const POST = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const body = await request.json().catch(() => ({}));
    const siteId = body.siteId || request.headers.get("x-site-id") || getDefaultSiteId();

    const articles = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title_en: true,
        meta_title_en: true,
        meta_description_en: true,
        excerpt_en: true,
        content_en: true,
      },
      orderBy: { created_at: "desc" },
      take: 300,
    });

    const fixes = analyzeAndPlanFixes(articles);

    if (fixes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No metadata issues found — all articles are compliant!",
        totalArticles: articles.length,
        fixesApplied: 0,
      });
    }

    // Group fixes by article ID
    const fixesByArticle = new Map<string, MetadataFix[]>();
    for (const fix of fixes) {
      const existing = fixesByArticle.get(fix.id) || [];
      existing.push(fix);
      fixesByArticle.set(fix.id, existing);
    }

    // Apply fixes in batches
    let applied = 0;
    let failed = 0;
    const results: Array<{ slug: string; fixes: string[]; status: "ok" | "error"; error?: string }> = [];

    for (const [articleId, articleFixes] of fixesByArticle) {
      const updateData: Record<string, string | Date> = { updated_at: new Date() };
      for (const fix of articleFixes) {
        updateData[fix.field] = fix.newValue;
      }

      try {
        await prisma.blogPost.update({
          where: { id: articleId },
          data: updateData,
        });
        applied += articleFixes.length;
        results.push({
          slug: articleFixes[0].slug,
          fixes: articleFixes.map((f) => f.reason),
          status: "ok",
        });
      } catch (err) {
        failed += articleFixes.length;
        console.warn(`[fix-blog-metadata] Failed to update ${articleFixes[0].slug}:`, err);
        results.push({
          slug: articleFixes[0].slug,
          fixes: articleFixes.map((f) => f.reason),
          status: "error",
          error: "Database update failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed metadata on ${results.filter((r) => r.status === "ok").length} articles (${applied} fields updated${failed > 0 ? `, ${failed} failed` : ""})`,
      totalArticles: articles.length,
      articlesFixed: results.filter((r) => r.status === "ok").length,
      fixesApplied: applied,
      fixesFailed: failed,
      results,
    });
  } catch (error) {
    console.error("[fix-blog-metadata] POST error:", error);
    return NextResponse.json(
      { error: "Failed to fix metadata" },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// Core analysis logic
// ---------------------------------------------------------------------------

function analyzeAndPlanFixes(
  articles: Array<{
    id: string;
    slug: string;
    title_en: string;
    meta_title_en: string | null;
    meta_description_en: string | null;
    excerpt_en: string | null;
    content_en: string | null;
  }>
): MetadataFix[] {
  const fixes: MetadataFix[] = [];

  for (const article of articles) {
    const metaTitle = article.meta_title_en || article.title_en || "";
    const metaDesc = article.meta_description_en || "";

    // --- Title fixes ---
    if (metaTitle.length > 60) {
      fixes.push({
        id: article.id,
        slug: article.slug,
        field: "meta_title_en",
        oldValue: metaTitle,
        newValue: smartTruncate(metaTitle, 60),
        reason: `Title too long: ${metaTitle.length} → 60 chars`,
      });
    }

    // --- Description fixes ---
    if (metaDesc.length > 160) {
      fixes.push({
        id: article.id,
        slug: article.slug,
        field: "meta_description_en",
        oldValue: metaDesc,
        newValue: smartTruncate(metaDesc, 155),
        reason: `Description too long: ${metaDesc.length} → ~155 chars`,
      });
    } else if (metaDesc.length > 0 && metaDesc.length < 120) {
      const generated = generateDescription(
        article.title_en,
        article.excerpt_en,
        article.content_en
      );
      if (generated.length >= 120 && generated.length <= 160) {
        fixes.push({
          id: article.id,
          slug: article.slug,
          field: "meta_description_en",
          oldValue: metaDesc,
          newValue: generated,
          reason: `Description too short: ${metaDesc.length} → ${generated.length} chars`,
        });
      }
    } else if (!metaDesc) {
      const generated = generateDescription(
        article.title_en,
        article.excerpt_en,
        article.content_en
      );
      fixes.push({
        id: article.id,
        slug: article.slug,
        field: "meta_description_en",
        oldValue: "",
        newValue: generated,
        reason: `Missing description → generated ${generated.length} chars`,
      });
    }
  }

  return fixes;
}
