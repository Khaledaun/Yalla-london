export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Content Cleanup API — Artifact Scan + Duplicate Consolidation
 *
 * GET:  Scan for artifacts and duplicates (read-only, safe to call anytime)
 * POST: Apply fixes (sanitize artifacts, unpublish duplicates)
 *
 * Actions (POST body.action):
 *   "fix_artifacts"    — sanitize title/meta artifacts on all BlogPosts
 *   "fix_duplicates"   — unpublish duplicate articles (keeps best version)
 *   "fix_all"          — both of the above
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

const SLUG_ARTIFACT_PATTERN = /-[0-9a-f]{4,}$|-\d+-chars$/;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "is", "are", "was", "were", "be", "been", "being", "have",
  "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "can", "this", "that", "these", "those", "it", "its",
  "your", "our", "their", "my", "from", "into", "best", "top", "guide", "complete",
]);

function extractKeywords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) { if (b.has(item)) intersection++; }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeSlug(slug: string): string {
  return slug
    .replace(SLUG_ARTIFACT_PATTERN, "")
    .replace(/-20\d{2}(-\d{2}(-\d{2})?)?/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ArticleRow {
  id: string;
  slug: string;
  title_en: string;
  published: boolean;
  seo_score: number | null;
  content_en: string;
  created_at: Date;
  meta_title_en: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
}

interface DupCluster {
  keep: { id: string; slug: string; title: string; published: boolean; seoScore: number | null; wordCount: number };
  duplicates: Array<{ id: string; slug: string; title: string; published: boolean; seoScore: number | null; wordCount: number; reason: string; similarity: number }>;
}

// ── GET: Scan (read-only) ──────────────────────────────────────────────────

async function handleGet(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const { sanitizeTitle, sanitizeMetaDescription, hasTitleArtifacts } = await import("@/lib/content-pipeline/title-sanitizer");
  const { getDefaultSiteId } = await import("@/config/sites");

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const SIMILARITY = 0.75;

  const posts: ArticleRow[] = await prisma.blogPost.findMany({
    where: { siteId, deletedAt: null },
    select: {
      id: true, slug: true, title_en: true, published: true, seo_score: true,
      content_en: true, created_at: true, meta_title_en: true,
      meta_description_en: true, meta_description_ar: true,
    },
    orderBy: { created_at: "asc" },
  });

  // ── Artifact scan ──
  const artifacts: Array<{
    id: string; slug: string; published: boolean;
    field: string; before: string; after: string;
  }> = [];

  for (const post of posts) {
    if (hasTitleArtifacts(post.title_en)) {
      artifacts.push({ id: post.id, slug: post.slug, published: post.published, field: "title_en", before: post.title_en, after: sanitizeTitle(post.title_en) });
    }
    if (post.meta_title_en && hasTitleArtifacts(post.meta_title_en)) {
      artifacts.push({ id: post.id, slug: post.slug, published: post.published, field: "meta_title_en", before: post.meta_title_en, after: sanitizeTitle(post.meta_title_en) });
    }
    if (post.meta_description_en && post.meta_description_en.length > 160) {
      artifacts.push({ id: post.id, slug: post.slug, published: post.published, field: "meta_description_en", before: `${post.meta_description_en.length} chars`, after: `${sanitizeMetaDescription(post.meta_description_en).length} chars` });
    }
    if (post.meta_description_ar && post.meta_description_ar.length > 160) {
      artifacts.push({ id: post.id, slug: post.slug, published: post.published, field: "meta_description_ar", before: `${post.meta_description_ar.length} chars`, after: "≤160 chars" });
    }
  }

  // ── Duplicate detection ──
  const clusters: DupCluster[] = [];
  const assignedIds = new Set<string>();

  const wordCount = (html: string) => html.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

  const pickCanonical = (group: ArticleRow[]) => {
    return [...group].sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      if ((a.seo_score || 0) !== (b.seo_score || 0)) return (b.seo_score || 0) - (a.seo_score || 0);
      const aw = wordCount(a.content_en), bw = wordCount(b.content_en);
      if (aw !== bw) return bw - aw;
      return a.created_at.getTime() - b.created_at.getTime();
    });
  };

  const toSummary = (p: ArticleRow) => ({
    id: p.id, slug: p.slug, title: p.title_en, published: p.published,
    seoScore: p.seo_score, wordCount: wordCount(p.content_en),
  });

  // Strategy 1: Slug variants
  const slugGroups = new Map<string, ArticleRow[]>();
  for (const p of posts) {
    const norm = normalizeSlug(p.slug);
    if (!slugGroups.has(norm)) slugGroups.set(norm, []);
    slugGroups.get(norm)!.push(p);
  }
  for (const [, group] of slugGroups) {
    if (group.length < 2) continue;
    const sorted = pickCanonical(group);
    const canonical = sorted[0];
    const dups = sorted.slice(1);
    if (dups.length > 0) {
      clusters.push({
        keep: toSummary(canonical),
        duplicates: dups.map(d => ({ ...toSummary(d), reason: "slug variant", similarity: 1.0 })),
      });
      for (const d of dups) assignedIds.add(d.id);
      assignedIds.add(canonical.id);
    }
  }

  // Strategy 2: Title similarity
  const unassigned = posts.filter(p => !assignedIds.has(p.id));
  const titleKw = unassigned.map(p => ({ post: p, kw: extractKeywords(p.title_en) }));

  for (let i = 0; i < titleKw.length; i++) {
    if (assignedIds.has(titleKw[i].post.id)) continue;
    const members: Array<{ post: ArticleRow; sim: number }> = [];

    for (let j = i + 1; j < titleKw.length; j++) {
      if (assignedIds.has(titleKw[j].post.id)) continue;
      const sim = jaccardSimilarity(titleKw[i].kw, titleKw[j].kw);
      if (sim >= SIMILARITY) {
        members.push({ post: titleKw[j].post, sim });
        assignedIds.add(titleKw[j].post.id);
      }
    }

    if (members.length > 0) {
      const all = [titleKw[i].post, ...members.map(m => m.post)];
      const sorted = pickCanonical(all);
      const canonical = sorted[0];
      clusters.push({
        keep: toSummary(canonical),
        duplicates: sorted.slice(1).map(d => {
          const sim = members.find(m => m.post.id === d.id)?.sim ?? jaccardSimilarity(extractKeywords(canonical.title_en), extractKeywords(d.title_en));
          return { ...toSummary(d), reason: `title similarity ${(sim * 100).toFixed(0)}%`, similarity: sim };
        }),
      });
      assignedIds.add(canonical.id);
    }
  }

  // Strategy 3: Meta description duplicates
  const metaGroups = new Map<string, ArticleRow[]>();
  for (const p of posts) {
    if (!p.meta_description_en || assignedIds.has(p.id)) continue;
    const norm = p.meta_description_en.trim().toLowerCase();
    if (norm.length < 80) continue; // 80 chars: filters out short generic boilerplate; real unique descriptions are 120-160 chars
    if (!metaGroups.has(norm)) metaGroups.set(norm, []);
    metaGroups.get(norm)!.push(p);
  }
  for (const [, group] of metaGroups) {
    if (group.length < 2) continue;
    const sorted = pickCanonical(group);
    clusters.push({
      keep: toSummary(sorted[0]),
      duplicates: sorted.slice(1).map(d => ({ ...toSummary(d), reason: "identical meta description", similarity: 1.0 })),
    });
  }

  const totalDuplicates = clusters.reduce((sum, c) => sum + c.duplicates.length, 0);
  const publishedDuplicates = clusters.reduce((sum, c) => sum + c.duplicates.filter(d => d.published).length, 0);

  return NextResponse.json({
    siteId,
    totalArticles: posts.length,
    artifacts: { count: artifacts.length, items: artifacts },
    duplicates: { clusters: clusters.length, totalDuplicates, publishedDuplicates, items: clusters },
  });
}

// ── POST: Apply fixes ──────────────────────────────────────────────────────

async function handlePost(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const { sanitizeTitle, sanitizeMetaDescription, hasTitleArtifacts } = await import("@/lib/content-pipeline/title-sanitizer");
  const { getDefaultSiteId } = await import("@/config/sites");

  const body = await request.json().catch(() => ({}));
  const action = body.action || "fix_all";
  const siteId = body.siteId || getDefaultSiteId();

  const results = {
    artifactsFixed: 0,
    duplicatesUnpublished: 0,
    errors: [] as string[],
  };

  // ── Fix artifacts ──
  if (action === "fix_artifacts" || action === "fix_all") {
    try {
      const posts = await prisma.blogPost.findMany({
        where: { siteId, deletedAt: null },
        select: { id: true, title_en: true, meta_title_en: true, meta_description_en: true, meta_description_ar: true },
      });

      for (const post of posts) {
        const updates: Record<string, string> = {};

        if (hasTitleArtifacts(post.title_en)) {
          const cleaned = sanitizeTitle(post.title_en);
          if (cleaned && cleaned !== post.title_en) updates.title_en = cleaned;
        }
        if (post.meta_title_en && hasTitleArtifacts(post.meta_title_en)) {
          const cleaned = sanitizeTitle(post.meta_title_en);
          if (cleaned && cleaned !== post.meta_title_en) updates.meta_title_en = cleaned;
        }
        if (post.meta_description_en && post.meta_description_en.length > 160) {
          updates.meta_description_en = sanitizeMetaDescription(post.meta_description_en);
        }
        if (post.meta_description_ar && post.meta_description_ar.length > 160) {
          updates.meta_description_ar = sanitizeMetaDescription(post.meta_description_ar);
        }

        if (Object.keys(updates).length > 0) {
          await prisma.blogPost.update({ where: { id: post.id }, data: updates });
          results.artifactsFixed++;
        }
      }
    } catch (err) {
      results.errors.push(`artifacts: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Fix duplicates ──
  if (action === "fix_duplicates" || action === "fix_all") {
    try {
      // Re-scan for duplicates using slug normalization (safest strategy)
      const posts = await prisma.blogPost.findMany({
        where: { siteId, deletedAt: null, published: true },
        select: { id: true, slug: true, title_en: true, seo_score: true, content_en: true, created_at: true },
        orderBy: { created_at: "asc" },
      });

      const slugGroups = new Map<string, typeof posts>();
      for (const p of posts) {
        const norm = normalizeSlug(p.slug);
        if (!slugGroups.has(norm)) slugGroups.set(norm, []);
        slugGroups.get(norm)!.push(p);
      }

      for (const [, group] of slugGroups) {
        if (group.length < 2) continue;

        // Keep best: published + highest SEO + longest content + earliest
        const sorted = [...group].sort((a, b) => {
          if ((a.seo_score || 0) !== (b.seo_score || 0)) return (b.seo_score || 0) - (a.seo_score || 0);
          const aw = a.content_en.replace(/<[^>]*>/g, "").split(/\s+/).length;
          const bw = b.content_en.replace(/<[^>]*>/g, "").split(/\s+/).length;
          if (aw !== bw) return bw - aw;
          return a.created_at.getTime() - b.created_at.getTime();
        });

        // Unpublish all except best
        for (let i = 1; i < sorted.length; i++) {
          await prisma.blogPost.update({
            where: { id: sorted[i].id },
            data: { published: false },
          });
          results.duplicatesUnpublished++;
        }
      }
    } catch (err) {
      results.errors.push(`duplicates: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Full cleanup (chains content cleanup + SEO intelligence fixes) ──
  if (action === "full_cleanup") {
    let seoResults: Record<string, unknown> | null = null;
    try {
      // Import and run SEO intelligence fix_all logic inline (avoids HTTP self-fetch)
      const { getDefaultSiteId: getDefault } = await import("@/config/sites");
      const effectiveSiteId = siteId || getDefault();

      // Never-submitted URLs
      const untracked = await prisma.blogPost.findMany({
        where: { siteId: effectiveSiteId, published: true, deletedAt: null },
        select: { id: true, slug: true },
        take: 200,
      });
      const trackedSlugs = await prisma.uRLIndexingStatus.findMany({
        where: { site_id: effectiveSiteId },
        select: { url: true },
      });
      const trackedSet = new Set<string>(trackedSlugs.map((t) => t.url));
      const { getSiteDomain } = await import("@/config/sites");
      const siteFullDomain = getSiteDomain(effectiveSiteId);
      let newlyTracked = 0;
      for (const post of untracked) {
        const url = `/blog/${post.slug}`;
        const fullUrl = `${siteFullDomain}${url}`;
        if (!trackedSet.has(url) && !trackedSet.has(fullUrl)) {
          try {
            await prisma.uRLIndexingStatus.upsert({
              where: { site_id_url: { site_id: effectiveSiteId, url } },
              create: { url, site_id: effectiveSiteId, status: "discovered", submitted_indexnow: false },
              update: { status: "discovered" },
            });
            newlyTracked++;
          } catch (err) {
            console.warn("[content-cleanup] URL tracking dedup:", err instanceof Error ? err.message : String(err));
          }
        }
      }

      seoResults = { newlyTracked };
    } catch (err) {
      results.errors.push(`seo-fixes: ${err instanceof Error ? err.message : String(err)}`);
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      action: "full_cleanup",
      siteId,
      ...results,
      seoResults,
    });
  }

  return NextResponse.json({
    success: results.errors.length === 0,
    action,
    siteId,
    ...results,
  });
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
