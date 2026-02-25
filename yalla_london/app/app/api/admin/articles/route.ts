/**
 * Articles API — DB-backed article management
 * Reads from BlogPost (published) and ArticleDraft (in-progress) tables.
 * Returns rich metadata: word count, SEO score, indexing status, phase.
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

    // ── Fetch Published BlogPosts ────────────────────────────────────────────
    if (source === 'all' || source === 'published') {
      const where: Record<string, unknown> = {
        siteId,
        ...(status && status !== 'all' ? { status } : {}),
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
          status: true,
          siteId: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          content_en: true,
          content_ar: true,
          seoScore: true,
          qualityScore: true,
          indexingStatus: true,
          indexingState: true,
          lastSubmittedAt: true,
          lastInspectedAt: true,
          category: { select: { name: true } },
          author: { select: { name: true } },
          scheduledAt: true,
          featured: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: source === 'published' ? limit : Math.floor(limit * 0.7),
        skip: source === 'published' ? skip : 0,
      });

      for (const p of posts) {
        const wcEn = wordCount(p.content_en);
        const wcAr = wordCount(p.content_ar);
        articles.push({
          id: p.id,
          type: 'published',
          slug: p.slug,
          title: p.title_en || p.title_ar || '(Untitled)',
          titleAr: p.title_ar,
          metaDescription: p.meta_description_en,
          status: p.status,
          siteId: p.siteId,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          publishedAt: p.publishedAt?.toISOString() ?? null,
          scheduledAt: p.scheduledAt?.toISOString() ?? null,
          featured: p.featured,
          wordCountEn: wcEn,
          wordCountAr: wcAr,
          seoScore: p.seoScore,
          qualityScore: p.qualityScore,
          indexingStatus: p.indexingStatus || 'not_submitted',
          indexingState: p.indexingState,
          lastSubmittedAt: p.lastSubmittedAt?.toISOString() ?? null,
          lastInspectedAt: p.lastInspectedAt?.toISOString() ?? null,
          category: (p.category as { name: string } | null)?.name ?? null,
          author: (p.author as { name: string } | null)?.name ?? 'Editorial',
          isBilingual: wcEn > 100 && wcAr > 100,
          hasAffiliate: false, // Could query links table
          publicUrl: `/${p.slug}`,
        });
      }
    }

    // ── Fetch In-Progress ArticleDrafts ─────────────────────────────────────
    if (source === 'all' || source === 'drafts') {
      const draftWhere: Record<string, unknown> = {
        siteId,
        status: { not: 'published' },
        ...(search ? {
          OR: [
            { topic: { contains: search, mode: 'insensitive' } },
            { titleEn: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      };

      const drafts = await prisma.articleDraft.findMany({
        where: draftWhere,
        select: {
          id: true,
          topic: true,
          titleEn: true,
          titleAr: true,
          status: true,
          phase: true,
          siteId: true,
          createdAt: true,
          updatedAt: true,
          contentEn: true,
          contentAr: true,
          seoScore: true,
          qualityScore: true,
          wordCountEn: true,
          wordCountAr: true,
          errorMessage: true,
          phaseErrors: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: source === 'drafts' ? limit : Math.floor(limit * 0.4),
        skip: source === 'drafts' ? skip : 0,
      });

      const PHASE_ORDER = ['pending', 'research', 'outline', 'drafting', 'assembly', 'images', 'seo', 'scoring', 'reservoir'];

      for (const d of drafts) {
        const phaseIndex = PHASE_ORDER.indexOf(d.phase || 'pending');
        articles.push({
          id: d.id,
          type: 'draft',
          slug: null,
          title: d.titleEn || d.topic || '(Untitled Draft)',
          titleAr: d.titleAr,
          status: d.status,
          phase: d.phase,
          phaseIndex,
          phaseLabel: d.phase ? d.phase.charAt(0).toUpperCase() + d.phase.slice(1) : 'Pending',
          siteId: d.siteId,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          publishedAt: null,
          wordCountEn: d.wordCountEn ?? wordCount(d.contentEn),
          wordCountAr: d.wordCountAr ?? wordCount(d.contentAr),
          seoScore: d.seoScore,
          qualityScore: d.qualityScore,
          indexingStatus: 'not_applicable',
          hasError: !!(d.errorMessage || d.phaseErrors),
          error: d.errorMessage,
          phaseProgress: phaseIndex >= 0 ? Math.round((phaseIndex / (PHASE_ORDER.length - 1)) * 100) : 0,
          isBilingual: false,
          hasAffiliate: false,
          publicUrl: null,
        });
      }
    }

    // Sort: published by updatedAt desc, drafts by updatedAt desc
    articles.sort((a, b) => {
      const dateA = new Date(a.updatedAt as string).getTime();
      const dateB = new Date(b.updatedAt as string).getTime();
      return dateB - dateA;
    });

    // Summary stats
    const [publishedCount, draftCount, reservoirCount] = await Promise.all([
      prisma.blogPost.count({ where: { siteId, status: 'published' } }),
      prisma.articleDraft.count({ where: { siteId, status: { notIn: ['published', 'reservoir'] } } }),
      prisma.articleDraft.count({ where: { siteId, phase: 'reservoir' } }),
    ]);

    // Indexing summary
    const indexSummary = await prisma.blogPost.groupBy({
      by: ['indexingStatus'],
      where: { siteId, status: 'published' },
      _count: { id: true },
    }).catch(() => []);

    const indexingStats = {
      indexed: 0,
      submitted: 0,
      notSubmitted: 0,
      error: 0,
    };
    for (const row of indexSummary) {
      const s = row.indexingStatus || 'not_submitted';
      const c = row._count.id;
      if (s === 'indexed') indexingStats.indexed = c;
      else if (s === 'submitted' || s === 'pending') indexingStats.submitted = c;
      else if (s === 'error' || s === 'failed') indexingStats.error = c;
      else indexingStats.notSubmitted += c;
    }

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

// DELETE: Delete a blog post (admin only)
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
