/**
 * Articles API — DB-backed article management
 * Reads from BlogPost (published/draft) and ArticleDraft (in-progress pipeline) tables.
 * Returns rich metadata: word count, SEO score, phase, bilingual status.
 *
 * BlogPost schema uses snake_case for most fields: published Boolean, created_at, updated_at, seo_score
 * ArticleDraft schema uses snake_case throughout: site_id, current_phase, seo_score, quality_score, etc.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
import { getDefaultSiteId } from '@/config/sites';

// H-007 fix: count words from DB-side text length estimate instead of fetching full content
// For BlogPost we use a raw count query to avoid loading full content_en/content_ar
async function getWordCounts(postIds: string[]): Promise<Map<string, { en: number; ar: number }>> {
  if (postIds.length === 0) return new Map();
  // Approximate word count: character count / 5 (average English word length)
  // This avoids fetching megabytes of HTML just for word count display
  const result = await prisma.$queryRawUnsafe(
    `SELECT id,
       COALESCE(array_length(string_to_array(trim(COALESCE(content_en, '')), ' '), 1), 0) as wc_en,
       COALESCE(array_length(string_to_array(trim(COALESCE(content_ar, '')), ' '), 1), 0) as wc_ar
     FROM "BlogPost" WHERE id = ANY($1::text[])`,
    postIds
  ) as Array<{ id: string; wc_en: number; wc_ar: number }>;
  const map = new Map<string, { en: number; ar: number }>();
  for (const r of result) {
    map.set(r.id, { en: Number(r.wc_en), ar: Number(r.wc_ar) });
  }
  return map;
}

// M-001 fix: get indexing status from URLIndexingStatus table
async function getIndexingStatuses(slugs: string[], siteId: string): Promise<Map<string, { status: string; lastSubmittedAt: string | null }>> {
  if (slugs.length === 0) return new Map();
  const statuses = await prisma.uRLIndexingStatus.findMany({
    where: { site_id: siteId, slug: { in: slugs } },
    select: { slug: true, status: true, last_submitted_at: true },
  });
  const map = new Map<string, { status: string; lastSubmittedAt: string | null }>();
  for (const s of statuses) {
    if (s.slug) {
      map.set(s.slug, {
        status: s.status,
        lastSubmittedAt: s.last_submitted_at?.toISOString() ?? null,
      });
    }
  }
  return map;
}

// M-002 fix: check which articles have affiliate assignments
async function getAffiliateAssignments(postIds: string[], siteId: string): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const assignments = await prisma.affiliateAssignment.findMany({
    where: { siteId, content_id: { in: postIds }, content_type: 'blog_post' },
    select: { content_id: true },
  });
  return new Set(assignments.map(a => a.content_id));
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') ||
      request.headers.get('x-site-id') ||
      getDefaultSiteId();
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const source = searchParams.get('source') || 'all'; // all | published | drafts
    const skip = (page - 1) * limit;

    const articles: Record<string, unknown>[] = [];

    // ── Fetch Published/Draft BlogPosts ──────────────────────────────────────
    if (source === 'all' || source === 'published') {
      const publishedFilter: Record<string, unknown> = {};
      if (status === 'published') publishedFilter.published = true;
      else if (status === 'draft') publishedFilter.published = false;

      const where: Record<string, unknown> = {
        siteId,
        ...publishedFilter,
        ...(search ? {
          OR: [
            { title_en: { contains: search, mode: 'insensitive' } },
            { title_ar: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      };

      const postLimit = source === 'published' ? limit : Math.floor(limit * 0.7);

      // H-007 fix: DON'T select content_en/content_ar — use DB-side word count instead
      const posts = await prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title_en: true,
          title_ar: true,
          meta_description_en: true,
          published: true,
          siteId: true,
          created_at: true,
          updated_at: true,
          seo_score: true,
          category: { select: { name_en: true, name_ar: true } },
          author: { select: { name: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: postLimit,
        skip: source === 'published' ? skip : 0,
      });

      // Batch lookups for word counts, indexing, and affiliates
      const postIds = posts.map(p => p.id);
      const slugs = posts.map(p => p.slug).filter(Boolean) as string[];
      const [wordCounts, indexingMap, affiliateSet] = await Promise.all([
        getWordCounts(postIds),
        getIndexingStatuses(slugs, siteId),
        getAffiliateAssignments(postIds, siteId),
      ]);

      for (const p of posts) {
        const wc = wordCounts.get(p.id) ?? { en: 0, ar: 0 };
        const idx = p.slug ? indexingMap.get(p.slug) : undefined;
        const cat = p.category as { name_en: string; name_ar: string } | null;
        articles.push({
          id: p.id,
          type: 'published',
          slug: p.slug,
          title: p.title_en || p.title_ar || '(Untitled)',
          titleAr: p.title_ar,
          metaDescription: p.meta_description_en,
          status: p.published ? 'published' : 'draft',
          siteId: p.siteId,
          createdAt: p.created_at.toISOString(),
          updatedAt: p.updated_at.toISOString(),
          publishedAt: null,
          wordCountEn: wc.en,
          wordCountAr: wc.ar,
          seoScore: p.seo_score ?? null,
          qualityScore: null,
          indexingStatus: idx?.status ?? 'not_submitted',
          indexingState: null,
          lastSubmittedAt: idx?.lastSubmittedAt ?? null,
          category: cat?.name_en ?? cat?.name_ar ?? null,
          author: (p.author as { name: string | null } | null)?.name ?? 'Editorial',
          isBilingual: wc.en > 100 && wc.ar > 100,
          hasAffiliate: affiliateSet.has(p.id),
          publicUrl: `/${p.slug}`,
        });
      }
    }

    // ── Fetch In-Progress ArticleDrafts ───────────────────────────────────────
    if (source === 'all' || source === 'drafts') {
      const draftWhere: Record<string, unknown> = {
        site_id: siteId,
        current_phase: { notIn: ['published', 'rejected'] },
        ...(search ? {
          OR: [
            { keyword: { contains: search, mode: 'insensitive' } },
            { topic_title: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      };

      const drafts = await prisma.articleDraft.findMany({
        where: draftWhere,
        select: {
          id: true,
          keyword: true,
          topic_title: true,
          current_phase: true,
          site_id: true,
          created_at: true,
          updated_at: true,
          seo_score: true,
          quality_score: true,
          word_count: true,
          last_error: true,
          locale: true,
        },
        orderBy: { updated_at: 'desc' },
        take: source === 'drafts' ? limit : Math.floor(limit * 0.4),
        skip: source === 'drafts' ? skip : 0,
      });

      // M-003 fix: phase order matches frontend (8 steps, no 'pending')
      const PHASE_ORDER = ['research', 'outline', 'drafting', 'assembly', 'images', 'seo', 'scoring', 'reservoir'];

      for (const d of drafts) {
        const phase = d.current_phase || 'research';
        const phaseIndex = PHASE_ORDER.indexOf(phase);
        articles.push({
          id: d.id,
          type: 'draft',
          slug: null,
          title: d.topic_title || d.keyword || '(Untitled Draft)',
          titleAr: null,
          status: phase === 'reservoir' ? 'reservoir' : 'draft',
          phase,
          phaseIndex,
          phaseLabel: phase.charAt(0).toUpperCase() + phase.slice(1),
          siteId: d.site_id,
          createdAt: d.created_at.toISOString(),
          updatedAt: d.updated_at.toISOString(),
          publishedAt: null,
          wordCountEn: d.word_count || 0,
          wordCountAr: 0,
          seoScore: d.seo_score ? Math.round(d.seo_score) : null,
          qualityScore: d.quality_score ? Math.round(d.quality_score) : null,
          indexingStatus: 'not_applicable',
          hasError: !!d.last_error,
          error: d.last_error,
          phaseProgress: phaseIndex >= 0 ? Math.round(((phaseIndex + 1) / PHASE_ORDER.length) * 100) : 5,
          isBilingual: false,
          hasAffiliate: false,
          publicUrl: null,
          locale: d.locale,
        });
      }
    }

    // Sort: both by updatedAt desc
    articles.sort((a, b) => {
      const dateA = new Date(a.updatedAt as string).getTime();
      const dateB = new Date(b.updatedAt as string).getTime();
      return dateB - dateA;
    });

    // Summary stats
    const [publishedCount, draftCount, reservoirCount] = await Promise.all([
      prisma.blogPost.count({ where: { siteId, published: true } }),
      prisma.articleDraft.count({ where: { site_id: siteId, current_phase: { notIn: ['published', 'rejected', 'reservoir'] } } }),
      prisma.articleDraft.count({ where: { site_id: siteId, current_phase: 'reservoir' } }),
    ]);

    // M-001 fix: indexing summary from real URLIndexingStatus table
    const [indexedCount, submittedCount, indexErrorCount] = await Promise.all([
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: 'indexed' } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: 'submitted' } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: 'error' } }),
    ]);

    const indexingStats = {
      indexed: indexedCount,
      submitted: submittedCount,
      notSubmitted: Math.max(0, publishedCount - indexedCount - submittedCount - indexErrorCount),
      error: indexErrorCount,
    };

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
      summary: {
        published: publishedCount,
        inProgress: draftCount,
        reservoir: reservoirCount,
        total: publishedCount + draftCount + reservoirCount, // L-003 fix: include reservoir
      },
      indexing: indexingStats,
      pagination: {
        page,
        limit,
        // M-018 fix: use total DB counts for pagination, not merged array length
        hasMore: (page * limit) < (publishedCount + draftCount + reservoirCount),
      },
    });
  } catch (err) {
    console.warn('[articles GET]', err);
    return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 });
  }
}

// DELETE: Delete a blog post or article draft (admin only)
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'published';
    const siteId = searchParams.get('siteId') ||
      request.headers.get('x-site-id') ||
      getDefaultSiteId();

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // C-003 fix: verify the record belongs to the requesting site before deletion
    if (type === 'published') {
      const post = await prisma.blogPost.findFirst({ where: { id, siteId } });
      if (!post) return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      await prisma.blogPost.delete({ where: { id } });
    } else {
      const draft = await prisma.articleDraft.findFirst({ where: { id, site_id: siteId } });
      if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
      await prisma.articleDraft.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn('[articles DELETE]', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
