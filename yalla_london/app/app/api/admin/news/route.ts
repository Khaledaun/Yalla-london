export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * GET /api/admin/news
 * Returns news items, research logs, and aggregate stats for the admin dashboard.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");

  const url = new URL(request.url);
  const siteId =
    request.headers.get("x-site-id") || url.searchParams.get("site_id");

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch news items
    const siteFilter = siteId ? { siteId } : {};
    const items = await prisma.newsItem.findMany({
      where: siteFilter,
      orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        slug: true,
        headline_en: true,
        headline_ar: true,
        summary_en: true,
        source_name: true,
        source_url: true,
        news_category: true,
        is_major: true,
        urgency: true,
        status: true,
        tags: true,
        published_at: true,
        created_at: true,
        expires_at: true,
        siteId: true,
      },
      take: 100,
    });

    // Fetch research logs
    const logFilter = siteId ? { siteId } : {};
    const logs = await prisma.newsResearchLog.findMany({
      where: logFilter,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        run_type: true,
        status: true,
        items_found: true,
        items_published: true,
        items_skipped: true,
        facts_flagged: true,
        duration_ms: true,
        error_message: true,
        created_at: true,
      },
      take: 50,
    });

    // Compute stats
    const published = items.filter((i) => i.status === "published").length;
    const draft = items.filter((i) => i.status === "draft").length;
    const archived = items.filter((i) => i.status === "archived").length;
    const expiringSoon = items.filter(
      (i) =>
        i.expires_at &&
        new Date(i.expires_at) <= sevenDaysFromNow &&
        i.status === "published"
    ).length;

    const byCategory: Record<string, number> = {};
    for (const item of items) {
      byCategory[item.news_category] =
        (byCategory[item.news_category] || 0) + 1;
    }

    const stats = {
      total: items.length,
      published,
      draft,
      archived,
      expiringSoon,
      byCategory,
    };

    // Serialize dates
    const serializedItems = items.map((item) => ({
      ...item,
      published_at: item.published_at?.toISOString() ?? null,
      created_at: item.created_at.toISOString(),
      expires_at: item.expires_at?.toISOString() ?? null,
    }));

    const serializedLogs = logs.map((log) => ({
      ...log,
      created_at: log.created_at.toISOString(),
    }));

    return NextResponse.json({
      items: serializedItems,
      logs: serializedLogs,
      stats,
    });
  } catch (err) {
    console.warn("[admin-news] GET error:", err);
    return NextResponse.json(
      { items: [], logs: [], stats: null, error: "Failed to fetch news data" },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/news
 * Supports actions: archive, publish, delete
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");

  try {
    const body = await request.json();
    const { action, id } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: action, id" },
        { status: 400 }
      );
    }

    switch (action) {
      case "archive": {
        await prisma.newsItem.update({
          where: { id },
          data: { status: "archived" },
        });
        return NextResponse.json({ success: true, action: "archived" });
      }

      case "publish": {
        await prisma.newsItem.update({
          where: { id },
          data: { status: "published", published_at: new Date() },
        });
        return NextResponse.json({ success: true, action: "published" });
      }

      case "delete": {
        await prisma.newsItem.delete({ where: { id } });
        return NextResponse.json({ success: true, action: "deleted" });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.warn("[admin-news] POST error:", err);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
});
