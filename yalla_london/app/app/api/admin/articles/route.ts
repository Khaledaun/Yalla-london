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

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
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
      // BlogPost uses `published Boolean` (not a status string)
      // Map status filter to boolean
      const publishedFilter: Record<string, unknown> = {};
      if (status === 'published') publishedFilter.published = true;
      else if (status === 'draft') publishedFilter.published = false;
      // else no filter (show all)

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

      const posts = await prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title_en: true,
          title_ar: true,
          meta_description_en: true,
          published: true,       // Boolean field (not `status`)
          siteId: true,
          created_at: true,      // snake_case
          updated_at: true,      // snake_case
          content_en: true,
          content_ar: true,
          seo_score: true,       // snake_case
          category: { select: { name_en: true, name_ar: true } },
          author: { select: { name: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: source === 'published' ? limit : Math.floor(limit * 0.7),
        skip: source === 'published' ? skip : 0,
      });

      for (const p of posts) {
        const wcEn = wordCount(p.content_en);
        const wcAr = wordCount(p.content_ar);
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
          publishedAt: null,     // Field doesn't exist in current schema
          scheduledAt: null,     // Field doesn't exist in current schema
          featured: false,       // Field doesn't exist in current schema
          wordCountEn: wcEn,
          wordCountAr: wcAr,
          seoScore: p.seo_score ?? null,
          qualityScore: null,    // Field doesn't exist in current schema
          indexingStatus: 'not_submitted', // Field doesn't exist in current schema
          indexingState: null,
          lastSubmittedAt: null,
          lastInspectedAt: null,
          category: cat?.name_en ?? cat?.name_ar ?? null,
          author: (p.author as { name: string | null } | null)?.name ?? 'Editorial',
          isBilingual: wcEn > 100 && wcAr > 100,
          hasAffiliate: false,   // Could query links table
          publicUrl: `/${p.slug}`,
        });
      }
    }

    // ── Fetch In-Progress ArticleDrafts (uses snake_case field names from schema) ─
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

    // Indexing summary — from BlogPost.seo_score as a proxy (no indexing fields yet)
    // Note: indexingStatus does not exist in current BlogPost schema; show placeholder counts
    const indexingStats = {
      indexed: 0,
      submitted: 0,
      notSubmitted: publishedCount,
      error: 0,
    };

    return NextResponse.json({
      success: true,
      articles,
      total: articles.length,
      summary: {
        published: publishedCount,
        inProgress: draftCount,
        reservoir: reservoirCount,
        total: publishedCount + draftCount,
      },
      indexing: indexingStats,
      pagination: {
        page,
        limit,
        hasMore: articles.length === limit,
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

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (type === 'published') {
      await prisma.blogPost.delete({ where: { id } });
    } else {
      await prisma.articleDraft.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn('[articles DELETE]', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
