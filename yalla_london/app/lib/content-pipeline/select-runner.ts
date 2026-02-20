/**
 * Content Selector — Core Logic (extracted from cron route)
 *
 * Callable directly without HTTP. Used by:
 * - /api/cron/content-selector (cron route)
 * - /api/admin/content-generation-monitor (dashboard trigger)
 *
 * Selects highest-quality articles from the ArticleDraft reservoir
 * and promotes them to published BlogPosts.
 */

import { logCronExecution } from "@/lib/cron-logger";
import { onPromotionFailure } from "@/lib/ops/failure-hooks";
import { runPrePublicationGate } from "@/lib/seo/orchestrator/pre-publication-gate";

const DEFAULT_TIMEOUT_MS = 53_000;
const MAX_ARTICLES_PER_RUN = 2;

export interface SelectRunnerResult {
  success: boolean;
  message?: string;
  reservoirCandidates?: number;
  selected?: number;
  published?: number;
  articles?: Array<{ draftId: string; blogPostId: string; keyword: string; score: number }>;
  minQualityScore?: number;
  candidateCount?: number;
  durationMs: number;
}

export async function runContentSelector(
  options: { timeoutMs?: number } = {},
): Promise<SelectRunnerResult> {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const cronStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, SITES, getSiteDomain } = await import("@/config/sites");
    // Import quality gate threshold from centralized SEO standards — single source of truth.
    // When standards.ts is updated (e.g., after algorithm changes), this threshold updates automatically.
    const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
    const MIN_QUALITY_SCORE = CONTENT_QUALITY.qualityGateScore;

    const activeSites = getActiveSiteIds();
    if (activeSites.length === 0) {
      return { success: true, message: "No active sites", durationMs: Date.now() - cronStart };
    }

    // Find reservoir articles with sufficient quality
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
          { created_at: "asc" },
        ],
        take: MAX_ARTICLES_PER_RUN * 3,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        return {
          success: false,
          message: "ArticleDraft table not found. Use Fix Database button.",
          durationMs: Date.now() - cronStart,
        };
      }
      throw e;
    }

    if (candidates.length === 0) {
      await logCronExecution("content-selector", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: { message: "No reservoir articles ready", candidateCount: 0 },
      });
      return {
        success: true,
        message: "No reservoir articles with sufficient quality score",
        minQualityScore: MIN_QUALITY_SCORE,
        durationMs: Date.now() - cronStart,
      };
    }

    // Apply keyword diversity filter
    const selectedKeywords = new Set<string>();
    const selectedDraftIds = new Set<string>();
    const selected: Array<Record<string, unknown>> = [];

    for (const candidate of candidates) {
      if (selected.length >= MAX_ARTICLES_PER_RUN) break;

      const candidateId = candidate.id as string;
      const pairedId = candidate.paired_draft_id as string | null;
      if (selectedDraftIds.has(candidateId)) continue;
      if (pairedId && selectedDraftIds.has(pairedId)) continue;

      const keyword = ((candidate.keyword as string) || "").toLowerCase().trim();
      if (!keyword) continue;

      const isDuplicate = Array.from(selectedKeywords).some(
        (k) => k.includes(keyword) || keyword.includes(k),
      );

      if (!isDuplicate) {
        selected.push(candidate);
        selectedKeywords.add(keyword);
        selectedDraftIds.add(candidateId);
        if (pairedId) selectedDraftIds.add(pairedId);
      }
    }

    if (selected.length === 0) {
      return {
        success: true,
        message: "All reservoir articles have keyword overlap. Skipping.",
        candidateCount: candidates.length,
        durationMs: Date.now() - cronStart,
      };
    }

    // Promote selected articles to BlogPost
    const published: Array<{ draftId: string; blogPostId: string; keyword: string; score: number }> = [];

    for (const draft of selected) {
      const remainingMs = timeoutMs - (Date.now() - cronStart);
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
        const errMsg = promoteErr instanceof Error ? promoteErr.message : String(promoteErr);
        console.error(
          `[content-selector] Failed to promote draft ${draft.id}:`,
          errMsg,
        );
        await prisma.articleDraft.update({
          where: { id: draft.id as string },
          data: {
            last_error: `Promotion failed: ${errMsg}`,
            phase_attempts: ((draft.phase_attempts as number) || 0) + 1,
          },
        }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));

        // Fire promotion failure hook for immediate recovery
        onPromotionFailure({
          draftId: draft.id as string,
          keyword: draft.keyword as string,
          error: errMsg,
          siteId: draft.site_id as string,
        }).catch(err => console.warn("[select-runner] onPromotionFailure hook failed:", err instanceof Error ? err.message : err));
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

    return {
      success: true,
      reservoirCandidates: candidates.length,
      selected: selected.length,
      published: published.length,
      articles: published,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - cronStart;
    const errMsg = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error) || "Content selector crashed with no error details";
    console.error("[content-selector] Failed:", errMsg);

    await logCronExecution("content-selector", "failed", {
      durationMs,
      errorMessage: errMsg,
    }).catch(err => console.warn("[select-runner] Failed to log cron execution:", err instanceof Error ? err.message : err));

    return {
      success: false,
      message: errMsg,
      durationMs,
    };
  }
}

// ─── Per-site affiliate rules ─────────────────────────────────────────────

function getAffiliateRules(siteId: string) {
  const SITE_AFFILIATES: Record<string, Array<{ kw: string[]; aff: { name: string; url: string; param: string } }>> = {
    'yalla-london': [
      { kw: ["hotel", "accommodation", "stay", "resort"], aff: { name: "Booking.com", url: "https://www.booking.com/city/gb/london.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["restaurant", "dining", "food", "halal"], aff: { name: "TheFork", url: "https://www.thefork.co.uk/london", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "attraction"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/london-l57/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["ticket", "event", "match", "concert", "football"], aff: { name: "StubHub", url: "https://www.stubhub.co.uk", param: `?gcid=${process.env.STUBHUB_AFFILIATE_ID || ""}` } },
      { kw: ["shopping", "shop", "luxury", "Harrods"], aff: { name: "Harrods", url: "https://www.harrods.com", param: "?utm_source=yallalondon" } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/london", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
    'arabaldives': [
      { kw: ["hotel", "accommodation", "stay", "resort", "villa"], aff: { name: "Booking.com", url: "https://www.booking.com/country/mv.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["resort", "island", "overwater"], aff: { name: "Agoda", url: "https://www.agoda.com/maldives", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "snorkeling", "diving", "excursion"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/maldives-l97358/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "seaplane", "speedboat", "airport"], aff: { name: "Booking.com Taxi", url: "https://www.booking.com/taxi/country/mv.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
    ],
    'french-riviera': [
      { kw: ["hotel", "accommodation", "stay", "resort", "villa"], aff: { name: "Booking.com", url: "https://www.booking.com/region/fr/cote-d-azur.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["restaurant", "dining", "food", "halal"], aff: { name: "TheFork", url: "https://www.thefork.fr/nice", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "yacht", "boat"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/nice-l176/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/nice", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
    'istanbul': [
      { kw: ["hotel", "accommodation", "stay", "resort"], aff: { name: "Booking.com", url: "https://www.booking.com/city/tr/istanbul.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["restaurant", "dining", "food", "halal", "kebab"], aff: { name: "TheFork", url: "https://www.thefork.com/istanbul", param: `?ref=${process.env.THEFORK_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "bazaar", "mosque"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/istanbul-l56/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/istanbul", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
    'thailand': [
      { kw: ["hotel", "accommodation", "stay", "resort", "villa"], aff: { name: "Booking.com", url: "https://www.booking.com/country/th.html", param: `?aid=${process.env.BOOKING_AFFILIATE_ID || ""}` } },
      { kw: ["resort", "island", "beach"], aff: { name: "Agoda", url: "https://www.agoda.com/thailand", param: `?cid=${process.env.AGODA_AFFILIATE_ID || ""}` } },
      { kw: ["tour", "experience", "activity", "temple", "market"], aff: { name: "GetYourGuide", url: "https://www.getyourguide.com/bangkok-l169/", param: `?partner_id=${process.env.GETYOURGUIDE_AFFILIATE_ID || ""}` } },
      { kw: ["transfer", "airport", "taxi", "transport"], aff: { name: "Blacklane", url: "https://www.blacklane.com/en/bangkok", param: `?aff=${process.env.BLACKLANE_AFFILIATE_ID || ""}` } },
    ],
  };
  return SITE_AFFILIATES[siteId] || SITE_AFFILIATES['yalla-london'] || [];
}

// ─── Promote ArticleDraft → BlogPost ──────────────────────────────────────

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

  // Look up paired draft for bilingual merging
  let pairedDraft: Record<string, unknown> | null = null;
  const pairedDraftId = draft.paired_draft_id as string | null;
  if (pairedDraftId) {
    try {
      pairedDraft = await prisma.articleDraft.findUnique({ where: { id: pairedDraftId } });
      if (pairedDraft && !(pairedDraft.assembled_html as string)) {
        console.log(`[content-selector] Paired draft ${pairedDraftId} has no assembled HTML yet — publishing single-language`);
        pairedDraft = null;
      }
    } catch (pairErr) {
      console.warn(`[select-runner] Failed to fetch paired draft ${pairedDraftId}:`, pairErr instanceof Error ? pairErr.message : pairErr);
      // Proceed with single language
    }
  }

  // Determine EN and AR content sources
  const enDraft = locale === "en" ? draft : pairedDraft;
  const arDraft = locale === "ar" ? draft : pairedDraft;

  const enHtml = (enDraft?.assembled_html as string) || "";
  const arHtml = (arDraft?.assembled_html as string) || "";
  const enTitle = (enDraft?.topic_title as string) || keyword;
  const arTitle = (arDraft?.topic_title as string) || "";
  const enSeoMeta = ((enDraft?.seo_meta || {}) as Record<string, unknown>);
  const arSeoMeta = ((arDraft?.seo_meta || {}) as Record<string, unknown>);
  const outline = (draft.outline_data || {}) as Record<string, unknown>;

  if (!enHtml && !arHtml) {
    console.warn(`[content-selector] Draft ${draft.id} and its pair have no assembled HTML — skipping`);
    return null;
  }

  const hasEn = !!enHtml;
  const hasAr = !!arHtml;
  const isBilingual = hasEn && hasAr;

  // Generate slug
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

  // Get or create category and system user
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
    // Fallback: try any system user
    systemUser = await prisma.user.findFirst({ where: { email: { startsWith: "system@" } } });
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

  const enImages = (enDraft?.images_data || {}) as Record<string, unknown>;
  const arImages = (arDraft?.images_data || {}) as Record<string, unknown>;
  const featuredImage = ((enImages.featured as Record<string, unknown>)?.url as string)
    || ((arImages.featured as Record<string, unknown>)?.url as string)
    || null;

  // Create the bilingual BlogPost
  const missingLanguageTags = [];
  if (!hasEn) missingLanguageTags.push("missing-english");
  if (!hasAr) missingLanguageTags.push("missing-arabic");

  // ── Pre-Publication SEO Gate (fail CLOSED — don't publish without verification) ──
  const targetUrl = `/blog/${slug}`;
  const siteUrl = getSiteDomain(siteId);
  try {
    const gateResult = await runPrePublicationGate(
      targetUrl,
      {
        title_en: enTitle,
        title_ar: arTitle,
        meta_title_en: enMetaTitle,
        meta_description_en: enMetaDesc,
        content_en: enHtml,
        content_ar: arHtml,
        locale,
        tags: keywords.slice(0, 5),
        seo_score: Math.round((draft.seo_score as number) || (draft.quality_score as number) || 0),
        author_id: "system", // System-generated content always has author
        keywords_json: keywords,
      },
      siteUrl,
    );

    if (!gateResult.allowed) {
      console.warn(
        `[content-selector] Pre-pub gate BLOCKED draft ${draft.id} (keyword: "${keyword}"): ${gateResult.blockers.join("; ")}`,
      );
      if (gateResult.warnings.length > 0) {
        console.warn(
          `[content-selector] Pre-pub gate warnings for draft ${draft.id}: ${gateResult.warnings.join("; ")}`,
        );
      }
      // Mark the draft with the gate failure so it's visible in dashboard
      await prisma.articleDraft.update({
        where: { id: draft.id as string },
        data: {
          last_error: `Pre-pub gate blocked: ${gateResult.blockers.join("; ")}`,
          updated_at: new Date(),
        },
      }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));
      return null; // Skip this draft — do not publish
    }

    // Log warnings even when allowed (visible in cron logs for quality monitoring)
    if (gateResult.warnings.length > 0) {
      console.log(
        `[content-selector] Pre-pub gate PASSED draft ${draft.id} with warnings: ${gateResult.warnings.join("; ")}`,
      );
    }
  } catch (gateErr) {
    // Fail CLOSED — if the gate itself errors, do NOT publish
    const gateErrMsg = gateErr instanceof Error ? gateErr.message : String(gateErr);
    console.warn(
      `[content-selector] Pre-pub gate ERROR for draft ${draft.id} — blocking publication: ${gateErrMsg}`,
    );
    await prisma.articleDraft.update({
      where: { id: draft.id as string },
      data: {
        last_error: `Pre-pub gate error (blocked): ${gateErrMsg}`,
        updated_at: new Date(),
      },
    }).catch(err => console.warn("[select-runner] DB update failed:", err instanceof Error ? err.message : err));
    return null; // Fail closed — don't publish without gate verification
  }

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

  // Create SeoMeta entry
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

  // Create URLIndexingStatus entry
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

  // Auto-inject affiliate links
  try {
    const contentLower = ((enHtml || "") + " " + (arHtml || "")).toLowerCase();
    const AFF_RULES = getAffiliateRules(siteId);
    const matched = AFF_RULES.filter((r) => r.kw.some((k) => contentLower.includes(k))).map((r) => r.aff).slice(0, 3);

    if (matched.length > 0) {
      const partnersHtml = `\n<div class="affiliate-partners-section" style="margin-top:2rem;padding:1.5rem;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;"><h3 style="margin:0 0 1rem;color:#1f2937;">Recommended Partners</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">${matched.map((m) => `<a href="${encodeURI(m.url + m.param)}" target="_blank" rel="noopener sponsored" style="display:block;padding:1rem;background:white;border-radius:8px;border:1px solid #e5e7eb;text-decoration:none;color:inherit;"><strong style="color:#7c3aed;">${m.name}</strong></a>`).join("")}</div></div>`;
      const cleanEn = (enHtml || "").replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "");
      const cleanAr = (arHtml || "").replace(/<div class="affiliate-placeholder"[^>]*>[\s\S]*?<\/div>/gi, "");
      await prisma.blogPost.update({ where: { id: blogPost.id }, data: { content_en: cleanEn + partnersHtml, content_ar: cleanAr + partnersHtml } });
      console.log(`[content-selector] Injected ${matched.length} affiliate partners into BlogPost ${blogPost.id}`);
    }
  } catch (affErr) {
    console.warn("[content-selector] Affiliate injection failed (non-fatal):", affErr instanceof Error ? affErr.message : affErr);
  }

  // Auto-inject structured data
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
  } catch (schemaErr) {
    console.warn("[select-runner] Schema injection failed (non-fatal):", schemaErr instanceof Error ? schemaErr.message : schemaErr);
  }

  // Update BOTH drafts to published state
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

  if (pairedDraft) {
    await prisma.articleDraft.update({
      where: { id: pairedDraft.id as string },
      data: publishData,
    }).catch((err: Error) => {
      console.warn(`[content-selector] Failed to update paired draft ${pairedDraft!.id}:`, err.message);
    });
  }

  if (draft.topic_proposal_id) {
    try {
      await prisma.topicProposal.update({
        where: { id: draft.topic_proposal_id as string },
        data: { status: "published" },
      });
    } catch (topicErr) {
      console.warn(`[select-runner] Failed to update TopicProposal ${draft.topic_proposal_id}:`, topicErr instanceof Error ? topicErr.message : topicErr);
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
