import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

// ── Legal Pages Manager API ─────────────────────────────────────────────────
// GET  → list all legal pages
// POST → create new page or run AI action
// PUT  → update existing page
// DELETE → delete page

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const siteId = request.headers.get("x-site-id") || getDefaultSiteId();

    // Use ContentPage model if it exists, otherwise use a generic query
    let pages: Array<Record<string, unknown>> = [];
    try {
      const raw = await (prisma as Record<string, unknown> as { contentPage: { findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>> } }).contentPage.findMany({
        where: {
          OR: [
            { siteId },
            { siteId: null },
          ],
          type: { in: ['privacy', 'terms', 'cookies', 'affiliate-disclosure', 'about', 'contact', 'accessibility', 'legal'] },
        },
        orderBy: { updatedAt: 'desc' },
      });
      pages = raw.map((p: Record<string, unknown>) => ({
        id: p.id,
        type: p.type || 'legal',
        title: (p.title_en || p.title || '') as string,
        siteId: (p.siteId || siteId) as string,
        locale: (p.locale || 'en') as string,
        content: (p.content_en || p.content || '') as string,
        lastUpdated: (p.updatedAt || p.createdAt || new Date().toISOString()) as string,
        status: p.status === 'draft' ? 'draft' : 'published',
        version: (p.version || 1) as number,
      }));
    } catch {
      // ContentPage model may not exist — return empty with explanation
      pages = [];
    }

    return NextResponse.json({ pages, siteId });
  } catch (err) {
    console.warn("[legal-api] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load legal pages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action } = body;

    // AI actions
    if (action?.startsWith('ai_')) {
      const { generateCompletion } = await import("@/lib/ai/provider");
      const aiAction = action.replace('ai_', '');
      const content = body.content || '';

      let prompt = '';
      switch (aiAction) {
        case 'improve':
          prompt = `Improve the clarity and readability of this legal page content. Keep the same structure and legal meaning, but make it clearer for non-lawyers. Return only the improved HTML:\n\n${content}`;
          break;
        case 'translate':
          prompt = `Translate this legal page content to Arabic. Maintain the HTML structure and legal accuracy. Return only the translated HTML:\n\n${content}`;
          break;
        case 'detect_gaps':
          prompt = `Analyze this legal page content and identify any missing standard clauses that should be present. List what's missing and suggest additions. Return your analysis as HTML with <h3> headings for each gap found:\n\n${content}`;
          break;
        default:
          return NextResponse.json({ error: "Unknown AI action" }, { status: 400 });
      }

      const result = await generateCompletion(
        [{ role: 'user', content: prompt }],
        {
          taskType: 'legal-page-ai',
          calledFrom: 'api/admin/legal',
          siteId: body.siteId || getDefaultSiteId(),
        }
      );

      return NextResponse.json({ content: result.content, action: aiAction });
    }

    // Create new page
    const { type, title, siteId, locale, content } = body;
    if (!type || !title) {
      return NextResponse.json({ error: "type and title required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/db");
    const effectiveSiteId = siteId || getDefaultSiteId();

    try {
      const page = await (prisma as Record<string, unknown> as { contentPage: { create: (args: Record<string, unknown>) => Promise<Record<string, unknown>> } }).contentPage.create({
        data: {
          type,
          title_en: title,
          content_en: content || `<h1>${title}</h1>`,
          siteId: effectiveSiteId,
          locale: locale || 'en',
          status: 'draft',
          slug: type + '-' + effectiveSiteId,
        },
      });
      return NextResponse.json({ success: true, page });
    } catch (err) {
      console.warn("[legal-api] Create error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Failed to create page. ContentPage model may not exist in schema." }, { status: 500 });
    }
  } catch (err) {
    console.warn("[legal-api] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id, title, content } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { prisma } = await import("@/lib/db");

    try {
      const page = await (prisma as Record<string, unknown> as { contentPage: { update: (args: Record<string, unknown>) => Promise<Record<string, unknown>> } }).contentPage.update({
        where: { id },
        data: {
          ...(title && { title_en: title }),
          ...(content && { content_en: content }),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, page });
    } catch (err) {
      console.warn("[legal-api] Update error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
    }
  } catch (err) {
    console.warn("[legal-api] PUT error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { prisma } = await import("@/lib/db");

    try {
      await (prisma as Record<string, unknown> as { contentPage: { delete: (args: Record<string, unknown>) => Promise<unknown> } }).contentPage.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (err) {
      console.warn("[legal-api] Delete error:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
    }
  } catch (err) {
    console.warn("[legal-api] DELETE error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
