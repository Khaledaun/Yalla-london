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
 * Bilingual merging:
 * Each topic produces two separate drafts (EN + AR) linked by paired_draft_id.
 * When promoting, we look up the paired draft and merge both languages into
 * a single bilingual BlogPost. If the paired draft hasn't reached reservoir yet,
 * we publish with the available language and tag for review.
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
    // Also skip paired drafts (EN+AR pair should merge into one BlogPost, not two)
    const selectedKeywords = new Set<string>();
    const selectedDraftIds = new Set<string>();
    const selected: Array<Record<string, unknown>> = [];

    for (const candidate of candidates) {
      if (selected.length >= MAX_ARTICLES_PER_RUN) break;

      // Skip if this draft's pair was already selected (avoid selecting both EN+AR)
      const candidateId = candidate.id as string;
      const pairedId = candidate.paired_draft_id as string | null;
      if (selectedDraftIds.has(candidateId)) continue;
      if (pairedId && selectedDraftIds.has(pairedId)) continue;

      const keyword = ((candidate.keyword as string) || "").toLowerCase().trim();
      if (!keyword) continue; // Skip drafts without keywords
      // Check for keyword overlap with already-selected articles
      const isDuplicate = Array.from(selectedKeywords).some(
        (k) => k.includes(keyword) || keyword.includes(k),
      );

      if (!isDuplicate) {
        selected.push(candidate);
        selectedKeywords.add(keyword);
        selectedDraftIds.add(candidateId);
        if (pairedId) selectedDraftIds.add(pairedId); // Block paired draft from selection
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
 *
 * Bilingual merging: Looks up the paired draft (EN↔AR) and merges both
 * languages into a single BlogPost. If the paired draft hasn't reached
 * reservoir yet, publishes with one language and tags for review.
 *
 * Creates BlogPost + SeoMeta + URLIndexingStatus, then updates both drafts.
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
  const keyword = draft.keyword as string;

  // ─── Look up paired draft for bilingual merging ───────────────────────
  let pairedDraft: Record<string, unknown> | null = null;
  const pairedDraftId = draft.paired_draft_id as string | null;
  if (pairedDraftId) {
    try {
      pairedDraft = await prisma.articleDraft.findUnique({
        where: { id: pairedDraftId },
      });
      // Only use if the paired draft has actual content (assembly+ phase)
      if (pairedDraft && !(pairedDraft.assembled_html as string)) {
        console.log(`[content-selector] Paired draft ${pairedDraftId} has no assembled HTML yet — publishing single-language`);
        pairedDraft = null;
      }
    } catch {
      // Paired draft lookup failed — proceed with single language
    }
  }

  // ─── Determine EN and AR content sources ──────────────────────────────
  const enDraft = locale === "en" ? draft : pairedDraft;
  const arDraft = locale === "ar" ? draft : pairedDraft;

  const enHtml = (enDraft?.assembled_html as string) || "";
  const arHtml = (arDraft?.assembled_html as string) || "";
  const enTitle = (enDraft?.topic_title as string) || keyword;
  const arTitle = (arDraft?.topic_title as string) || "";
  const enSeoMeta = ((enDraft?.seo_meta || {}) as Record<string, unknown>);
  const arSeoMeta = ((arDraft?.seo_meta || {}) as Record<string, unknown>);
  const outline = (draft.outline_data || {}) as Record<string, unknown>;

  // Validate that we have at least one language's content
  if (!enHtml && !arHtml) {
    console.warn(`[content-selector] Draft ${draft.id} and its pair have no assembled HTML — skipping`);
    return null;
  }

  // Track which languages are available
  const hasEn = !!enHtml;
  const hasAr = !!arHtml;
  const isBilingual = hasEn && hasAr;

  // ─── Generate slug ────────────────────────────────────────────────────
  const primarySeoMeta = enSeoMeta.slug ? enSeoMeta : arSeoMeta;
  let slug = (primarySeoMeta.slug as string) || "";
  if (!slug) {
    slug = keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  slug = `${slug}-${dateStr}`;

  const existingSlug = await prisma.blogPost.findFirst({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  // ─── Get or create category and system user ───────────────────────────
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

  // ─── Extract meta fields from both languages ─────────────────────────
  const enMetaTitle = (enSeoMeta.metaTitle as string) || enTitle;
  const arMetaTitle = (arSeoMeta.metaTitle as string) || arTitle;
  const enMetaDesc = (enSeoMeta.metaDescription as string) || "";
  const arMetaDesc = (arSeoMeta.metaDescription as string) || "";
  const keywords = (enSeoMeta.keywords as string[]) || (arSeoMeta.keywords as string[]) || [keyword];
  const pageType = (outline.schemaType as string) === "HowTo"
    ? "guide"
    : (outline.schemaType as string) === "FAQPage"
      ? "faq"
      : "guide";

  // Use the best featured image from either draft
  const enImages = (enDraft?.images_data || {}) as Record<string, unknown>;
  const arImages = (arDraft?.images_data || {}) as Record<string, unknown>;
  const featuredImage = ((enImages.featured as Record<string, unknown>)?.url as string)
    || ((arImages.featured as Record<string, unknown>)?.url as string)
    || null;

  // ─── Create the bilingual BlogPost ────────────────────────────────────
  const missingLanguageTags = [];
  if (!hasEn) missingLanguageTags.push("missing-english");
  if (!hasAr) missingLanguageTags.push("missing-arabic");

  const blogPost = await prisma.blogPost.create({
    data: {
      title_en: enTitle || keyword,
      title_ar: arTitle || "",
      slug,
      excerpt_en: enMetaDesc,
      excerpt_ar: arMetaDesc,
      content_en: enHtml,
      content_ar: arHtml,
      meta_title_en: enMetaTitle,
      meta_title_ar: arMetaTitle,
      meta_description_en: enMetaDesc,
      meta_description_ar: arMetaDesc,
      tags: [
        ...keywords.slice(0, 5),
        "auto-generated",
        "reservoir-pipeline",
        "needs-review",
        isBilingual ? "bilingual" : `primary-${locale}`,
        ...missingLanguageTags,
        `site-${siteId}`,
        site.destination.toLowerCase(),
      ],
      published: true,
      featured_image: featuredImage,
      siteId,
      category_id: category.id,
      author_id: systemUser.id,
      page_type: pageType,
      seo_score: Math.round(draft.seo_score as number || draft.quality_score as number || 70),
      keywords_json: keywords,
      questions_json: ((draft.research_data as Record<string, unknown>)?.keywordData as Record<string, unknown>)?.questions || [],
    },
  });

  // ─── Create SeoMeta entry ─────────────────────────────────────────────
  try {
    const schemaData = enSeoMeta.schema || arSeoMeta.schema || null;
    const canonicalUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    await prisma.seoMeta.create({
      data: {
        pageId: blogPost.id,
        url: canonicalUrl,
        title: enMetaTitle || arMetaTitle || keyword,
        description: enMetaDesc || arMetaDesc || `${enTitle || arTitle} - ${site.name}`,
        canonical: canonicalUrl,
        metaKeywords: keywords.join(", "),
        ogTitle: enMetaTitle || arMetaTitle || keyword,
        ogDescription: enMetaDesc || arMetaDesc,
        structuredData: schemaData || undefined,
        seoScore: Math.round(draft.seo_score as number || draft.quality_score as number || 70),
      },
    });
  } catch (seoErr) {
    console.warn("[content-selector] SeoMeta creation failed (non-fatal):", seoErr instanceof Error ? seoErr.message : seoErr);
  }

  // ─── Create URLIndexingStatus entry ───────────────────────────────────
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

  // ─── Auto-inject structured data ──────────────────────────────────────
  try {
    const { enhancedSchemaInjector } = await import("@/lib/seo/enhanced-schema-injector");
    const postUrl = `${getSiteDomain(siteId)}/blog/${slug}`;
    await enhancedSchemaInjector.injectSchemas(
      enHtml || arHtml,
      enTitle || arTitle,
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

  // ─── Update BOTH drafts to published state ────────────────────────────
  const publishData = {
    current_phase: "published",
    blog_post_id: blogPost.id,
    published_at: new Date(),
    completed_at: new Date(),
    updated_at: new Date(),
    needs_review: true,
  };

  await prisma.articleDraft.update({
    where: { id: draft.id as string },
    data: publishData,
  });

  // Also mark the paired draft as published (so it doesn't get re-selected)
  if (pairedDraft) {
    await prisma.articleDraft.update({
      where: { id: pairedDraft.id as string },
      data: publishData,
    }).catch((err: Error) => {
      console.warn(`[content-selector] Failed to update paired draft ${pairedDraft!.id}:`, err.message);
    });
  }

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
    `[content-selector] Promoted draft ${draft.id}${pairedDraft ? ` + paired ${pairedDraft.id}` : ""} → BlogPost ${blogPost.id} (keyword: "${keyword}", score: ${draft.quality_score}, bilingual: ${isBilingual})`,
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
