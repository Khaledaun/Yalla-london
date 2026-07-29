/**
 * Seed Yacht Articles API — POST /api/admin/seed-yacht-articles
 *
 * Creates Zenitha Yachts BlogPost articles directly in the database.
 * Supports seeding individual articles or all at once.
 *
 * Auth: requireAdmin
 * Usage: POST { articles: "all" } or POST { articles: ["greek-islands-yacht-charter-guide"] }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const maxDuration = 120;

const SITE_ID = "zenitha-yachts-med";

async function findOrCreateCategory(prisma: any, slug: string, name: string) {
  let cat = await prisma.category.findFirst({ where: { slug } });
  if (!cat) {
    cat = await prisma.category.create({
      data: { slug, name, description: name },
    });
  }
  return cat;
}

async function findAuthor(prisma: any) {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  return admin || (await prisma.user.findFirst());
}

export async function GET() {
  try {
    const { ALL_ZENITHA_ARTICLES } = await import(
      "@/lib/content/zenitha-articles"
    );
    return NextResponse.json({
      available: ALL_ZENITHA_ARTICLES.map((a: any) => a.slug),
      count: ALL_ZENITHA_ARTICLES.length,
      usage:
        'POST /api/admin/seed-yacht-articles with { articles: "all" } or { articles: ["slug1","slug2"] }',
    });
  } catch {
    return NextResponse.json({ error: "Article modules not loaded" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const { ALL_ZENITHA_ARTICLES } = await import(
    "@/lib/content/zenitha-articles"
  );

  const body = await request.json();
  const requestedSlugs: string[] | "all" = body.articles || "all";

  const articles =
    requestedSlugs === "all"
      ? ALL_ZENITHA_ARTICLES
      : ALL_ZENITHA_ARTICLES.filter((a: any) =>
          (requestedSlugs as string[]).includes(a.slug)
        );

  if (articles.length === 0) {
    return NextResponse.json(
      { error: "No matching articles found", available: ALL_ZENITHA_ARTICLES.map((a: any) => a.slug) },
      { status: 400 }
    );
  }

  const author = await findAuthor(prisma);
  if (!author) {
    return NextResponse.json({ error: "No user found for author" }, { status: 500 });
  }

  const results: { slug: string; status: string; id?: string }[] = [];

  for (const article of articles) {
    // Check for existing
    const existing = await prisma.blogPost.findFirst({
      where: { slug: article.slug, siteId: SITE_ID },
    });
    if (existing) {
      results.push({ slug: article.slug, status: "already_exists", id: existing.id });
      continue;
    }

    // Find or create category
    const category = await findOrCreateCategory(
      prisma,
      article.category_slug,
      article.category_name
    );

    try {
      const post = await prisma.blogPost.create({
        data: {
          slug: article.slug,
          title_en: article.title_en,
          title_ar: article.title_ar,
          content_en: article.content_en,
          content_ar: article.content_ar,
          meta_title_en: article.meta_title_en,
          meta_title_ar: article.meta_title_ar,
          meta_description_en: article.meta_description_en,
          meta_description_ar: article.meta_description_ar,
          category_id: category.id,
          author_id: author.id,
          siteId: SITE_ID,
          published: false,
          seo_score: article.seo_score || 80,
          source_pipeline: "editorial",
          locale: "en",
        },
      });
      results.push({ slug: article.slug, status: "created", id: post.id });
    } catch (err: any) {
      results.push({ slug: article.slug, status: `error: ${err.message?.slice(0, 100)}` });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "already_exists").length;
  const errors = results.filter((r) => r.status.startsWith("error")).length;

  return NextResponse.json({
    success: true,
    summary: { total: articles.length, created, skipped, errors },
    results,
  });
}
