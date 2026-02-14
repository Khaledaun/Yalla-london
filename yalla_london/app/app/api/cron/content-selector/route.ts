export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Content Selector — Reservoir-to-BlogPost Publisher
 *
 * Runs daily at 08:30 UTC. Selects the highest-quality articles from
 * the ArticleDraft reservoir and promotes them to BlogPost for publishing.
 *
 * Selection criteria:
 * 1. Quality score ≥ 60 (configurable)
 * 2. Keyword diversity (avoid publishing duplicate topics)
 * 3. Daily quota (max 2 articles per run to maintain quality over quantity)
 * 4. Oldest reservoir articles get priority when scores are equal
 *
 * Flow: ArticleDraft (reservoir) → BlogPost (published) + SeoMeta + URLIndexingStatus
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const SELECTOR_TIMEOUT_MS = 53_000;
const MIN_QUALITY_SCORE = 60;
const MAX_ARTICLES_PER_RUN = 2;

async function handleContentSelector(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const reservoirCount = await prisma.articleDraft.count({
        where: { current_phase: "reservoir" },
      }).catch(() => 0);
      const publishedCount = await prisma.articleDraft.count({
        where: { current_phase: "published" },
      }).catch(() => 0);
      return NextResponse.json({
        status: "healthy",
        endpoint: "content-selector",
        reservoirCount,
        publishedCount,
        minQualityScore: MIN_QUALITY_SCORE,
        maxPerRun: MAX_ARTICLES_PER_RUN,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "content-selector", note: "ArticleDraft table may not exist yet." },
        { status: 503 },
      );
    }
  }

  const cronStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, SITES, getSiteDomain } = await import("@/config/sites");

    const activeSites = getActiveSiteIds();
    if (activeSites.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active sites",
        timestamp: new Date().toISOString(),
      });
    }

    // Find reservoir articles with sufficient quality, ordered by score
    let candidates: Array<Record<string, unknown>> = [];
    try {
      candidates = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSites },
          current_phase: "reservoir",
          quality_score: { gte: MIN_QUALITY_SCORE },
        },
        orderBy: [
          { quality_score: "desc" },
          { created_at: "asc" }, // Oldest first when scores tie
        ],
        take: MAX_ARTICLES_PER_RUN * 3, // Fetch extras for keyword diversity filtering
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        return NextResponse.json({
          success: false,
          message: "ArticleDraft table not found. Run DB migration.",
          timestamp: new Date().toISOString(),
        });
      }
      throw e;
    }

    if (candidates.length === 0) {
      await logCronExecution("content-selector", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: { message: "No reservoir articles ready", candidateCount: 0 },
      });
      return NextResponse.json({
        success: true,
        message: "No reservoir articles with sufficient quality score",
        minQualityScore: MIN_QUALITY_SCORE,
        timestamp: new Date().toISOString(),
      });
    }

    // Apply keyword diversity filter — avoid publishing two articles on the same topic
    const selectedKeywords = new Set<string>();
    const selected: Array<Record<string, unknown>> = [];

    for (const candidate of candidates) {
      if (selected.length >= MAX_ARTICLES_PER_RUN) break;

      const keyword = ((candidate.keyword as string) || "").toLowerCase().trim();
      if (!keyword) continue; // Skip drafts without keywords
      // Check for keyword overlap with already-selected articles
      const isDuplicate = Array.from(selectedKeywords).some(
        (k) => k.includes(keyword) || keyword.includes(k),
      );

      if (!isDuplicate) {
        selected.push(candidate);
        selectedKeywords.add(keyword);
      }
    }

    if (selected.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All reservoir articles have keyword overlap. Skipping.",
        candidateCount: candidates.length,
        timestamp: new Date().toISOString(),
      });
    }

    // Promote selected articles to BlogPost
    const published: Array<{ draftId: string; blogPostId: string; keyword: string; score: number }> = [];

    for (const draft of selected) {
      const remainingMs = SELECTOR_TIMEOUT_MS - (Date.now() - cronStart);
      if (remainingMs < 5000) {
        console.log("[content-selector] Budget running low, stopping promotion loop");
        break;
      }

      try {
        const result = await promoteToBlogPost(draft, prisma, SITES, getSiteDomain);
        if (result) {
          published.push(result);
        }
      } catch (promoteErr) {
        console.error(
          `[content-selector] Failed to promote draft ${draft.id}:`,
          promoteErr instanceof Error ? promoteErr.message : promoteErr,
        );
        // Mark the draft with an error but don't block other promotions
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            last_error: `Promotion failed: ${promoteErr instanceof Error ? promoteErr.message : "Unknown error"}`,
            phase_attempts: ((draft.phase_attempts as number) || 0) + 1,
          },
        }).catch(() => {});
      }
    }

    const durationMs = Date.now() - cronStart;

    await logCronExecution("content-selector", "completed", {
      durationMs,
      itemsProcessed: published.length,
      resultSummary: {
        reservoirCandidates: candidates.length,
        selected: selected.length,
        published: published.length,
        articles: published,
      },
    });

    return NextResponse.json({
      success: true,
      reservoirCandidates: candidates.length,
      selected: selected.length,
      published: published.length,
      articles: published,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const durationMs = Date.now() - cronStart;
    console.error("[content-selector] Failed:", error);

    await logCronExecution("content-selector", "failed", {
      durationMs,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }).catch(() => {});

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
      },
      { status: 500 },
    );
  }
}

/**
 * Promote an ArticleDraft from the reservoir to a published BlogPost.
 * Creates BlogPost + SeoMeta + URLIndexingStatus, then updates the draft.
 */
async function promoteToBlogPost(
  draft: Record<string, unknown>,
  prisma: any,
  SITES: Record<string, any>,
  getSiteDomain: (siteId: string) => string,
): Promise<{ draftId: string; blogPostId: string; keyword: string; score: number } | null> {
  const siteId = draft.site_id as string;
  const site = SITES[siteId];
  if (!site) {
    console.warn(`[content-selector] No site config for ${siteId}`);
    return null;
  }

  const locale = (draft.locale as string) || "en";
  const seoMeta = (draft.seo_meta || {}) as Record<string, unknown>;
  const outline = (draft.outline_data || {}) as Record<string, unknown>;
  const html = (draft.assembled_html as string) || "";
  const htmlAlt = (draft.assembled_html_alt as string) || "";
  const keyword = draft.keyword as string;
  const topicTitle = (draft.topic_title as string) || keyword;

  // Validate that we have actual content to publish
  if (!html && !htmlAlt) {
    console.warn(`[content-selector] Draft ${draft.id} has no assembled HTML — skipping`);
    return null;
  }

  // Generate slug from SEO meta or keyword
  let slug = (seoMeta.slug as string) || "";
  if (!slug) {
    slug = keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);
  }
  // Add date suffix for uniqueness
  const dateStr = new Date().toISOString().slice(0, 10);
  slug = `${slug}-${dateStr}`;

  // Check for existing slug
  const existingSlug = await prisma.blogPost.findFirst({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  // Get or create category and system user (same pattern as daily-content-generate)
  const categorySlug = `auto-generated-${siteId}`;
  let category = await prisma.category.findFirst({ where: { slug: categorySlug } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name_en: site.categoryName.en,
        name_ar: site.categoryName.ar,
        slug: categorySlug,
        description_en: `AI-generated luxury ${site.destination} travel content`,
        description_ar: `محتوى سفر ${site.destination} الفاخر المُنشأ بالذكاء الاصطناعي`,
      },
    });
  }

  const siteEmail = `system@${site.domain}`;
  let systemUser = await prisma.user.findFirst({ where: { email: siteEmail } });
  if (!systemUser) {
    systemUser = await prisma.user.findFirst({ where: { email: "system@yallalondon.com" } });
  }
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: siteEmail,
        name: `${site.name} AI`,
        role: "editor",
      },
    });
  }

  // Extract meta fields
  const metaTitle = (seoMeta.metaTitle as string) || topicTitle;
  const metaTitleAlt = (seoMeta.metaTitleAlt as string) || "";
  const metaDesc = (seoMeta.metaDescription as string) || "";
  const metaDescAlt = (seoMeta.metaDescriptionAlt as string) || "";
  const keywords = (seoMeta.keywords as string[]) || [keyword];
  const pageType = (outline.schemaType as string) === "HowTo"
    ? "guide"
    : (outline.schemaType as string) === "FAQPage"
      ? "faq"
      : "guide";

  // Create the BlogPost
  const blogPost = await prisma.blogPost.create({
    data: {
      title_en: locale === "en" ? topicTitle : metaTitleAlt || topicTitle,
      title_ar: locale === "ar" ? topicTitle : metaTitleAlt || "",
      slug,
      excerpt_en: locale === "en" ? metaDesc : metaDescAlt || "",
      excerpt_ar: locale === "ar" ? metaDesc : metaDescAlt || "",
      content_en: locale === "en" ? html : htmlAlt || "",
      content_ar: locale === "ar" ? html : htmlAlt || "",
      meta_title_en: locale === "en" ? metaTitle : metaTitleAlt || "",
      meta_title_ar: locale === "ar" ? metaTitle : metaTitleAlt || "",
      meta_description_en: locale === "en" ? metaDesc : metaDescAlt || "",
      meta_description_ar: locale === "ar" ? metaDesc : metaDescAlt || "",
      tags: [
        ...keywords.slice(0, 5),
        "auto-generated",
        "reservoir-pipeline",
        `primary-${locale}`,
        `site-${siteId}`,
        site.destination.toLowerCase(),
      ],
      published: true,
      siteId,
      category_id: category.id,
      author_id: systemUser.id,
      page_type: pageType,
      seo_score: Math.round(draft.seo_score as number || draft.quality_score as number || 70),
      keywords_json: keywords,
      questions_json: ((draft.research_data as Record<string, unknown>)?.keywordData as Record<string, unknown>)?.questions || [],
    },
  });

  // Create SeoMeta entry if the table exists
  try {
    const schemaData = seoMeta.schema || null;
    const canonicalUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    await prisma.seoMeta.create({
      data: {
        pageId: blogPost.id,
        url: canonicalUrl,
        title: metaTitle || topicTitle,
        description: metaDesc || `${topicTitle} - ${site.name}`,
        canonical: canonicalUrl,
        metaKeywords: keywords.join(", "),
        ogTitle: metaTitle || topicTitle,
        ogDescription: metaDesc,
        structuredData: schemaData || undefined,
        seoScore: Math.round(draft.seo_score as number || draft.quality_score as number || 70),
      },
    });
  } catch (seoErr) {
    console.warn("[content-selector] SeoMeta creation failed (non-fatal):", seoErr instanceof Error ? seoErr.message : seoErr);
  }

  // Create URLIndexingStatus entry for Google Indexing cron to pick up
  try {
    const fullUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    await prisma.uRLIndexingStatus.create({
      data: {
        url: fullUrl,
        site_id: siteId,
        slug,
        status: "discovered",
      },
    });
  } catch (indexErr) {
    console.warn("[content-selector] URLIndexingStatus creation failed (non-fatal):", indexErr instanceof Error ? indexErr.message : indexErr);
  }

  // Auto-inject structured data
  try {
    const { enhancedSchemaInjector } = await import("@/lib/seo/enhanced-schema-injector");
    const postUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    await enhancedSchemaInjector.injectSchemas(
      locale === "en" ? html : htmlAlt || html,
      topicTitle,
      postUrl,
      blogPost.id,
      {
        author: `${site.name} Editorial Team`,
        category: category.name_en,
        tags: keywords.slice(0, 5),
      },
    );
  } catch {
    // Non-fatal
  }

  // Update ArticleDraft to published state
  await prisma.articleDraft.update({
    where: { id: draft.id as string },
    data: {
      current_phase: "published",
      blog_post_id: blogPost.id,
      published_at: new Date(),
      completed_at: new Date(),
      updated_at: new Date(),
    },
  });

  // Mark topic proposal as published if linked
  if (draft.topic_proposal_id) {
    try {
      await prisma.topicProposal.update({
        where: { id: draft.topic_proposal_id as string },
        data: { status: "published" },
      });
    } catch {
      // Non-fatal
    }
  }

  console.log(
    `[content-selector] Promoted draft ${draft.id} → BlogPost ${blogPost.id} (keyword: "${keyword}", score: ${draft.quality_score})`,
  );

  return {
    draftId: draft.id as string,
    blogPostId: blogPost.id,
    keyword,
    score: draft.quality_score as number,
  };
}

export async function GET(request: NextRequest) {
  return handleContentSelector(request);
}

export async function POST(request: NextRequest) {
  return handleContentSelector(request);
}
