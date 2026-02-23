export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import {
  SITES,
  getActiveSiteIds,
  getSiteConfig,
  getSiteDomain,
  isYachtSite,
} from "@/config/sites";
import type { SiteConfig, TopicTemplate } from "@/config/sites";
import { logCronExecution } from "@/lib/cron-logger";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { onCronFailure } from "@/lib/ops/failure-hooks";

/**
 * Daily Content Generation Cron - Runs at 5am UTC daily
 *
 * Generates 2 articles PER ACTIVE SITE per day:
 * - 1 English article (SEO + AIO optimized)
 * - 1 Arabic article (SEO + AIO optimized)
 *
 * Loops through all active sites using config/sites.ts.
 * Uses the AI provider layer (Grok/Claude/OpenAI/Gemini) for real content generation.
 * Grok (xAI) is preferred for EN content — cheapest ($0.20/$0.50/1M tokens), fastest, 2M context.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security (optional — Vercel sends it when CRON_SECRET is set)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Healthcheck mode — quick DB ping + status, no content generation
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      let lastRun = null;
      try {
        lastRun = await prisma.cronJobLog.findFirst({
          where: { job_name: "daily-content-generate" },
          orderBy: { started_at: "desc" },
          select: { status: true, started_at: true, duration_ms: true },
        });
      } catch {
        // cron_job_logs table may not exist yet — still healthy
        await prisma.$queryRaw`SELECT 1`;
      }
      return NextResponse.json({
        status: "healthy",
        endpoint: "daily-content-generate",
        lastRun,
        sites: getActiveSiteIds().length,
        activeSites: getActiveSiteIds(),
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "daily-content-generate" },
        { status: 503 },
      );
    }
  }

  const _cronStart = Date.now();

  // Feature flag: DB toggle (dashboard) takes precedence, env var fallback, default=enabled.
  const pipelineFlag = await getFeatureFlagValue("FEATURE_CONTENT_PIPELINE");
  if (pipelineFlag === false) {
    console.log("[daily-content-generate] Content pipeline disabled via feature flag");
    return NextResponse.json({
      success: true,
      message: "Content pipeline disabled by feature flag",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await generateDailyContentAllSites();
    await logCronExecution("daily-content-generate", result.timedOut ? "timed_out" : "completed", {
      durationMs: Date.now() - _cronStart,
      sitesProcessed: Object.keys(result.sites || {}),
      resultSummary: { message: result.message, sites: Object.keys(result.sites || {}).length },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const errMsg = error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error) || "Daily content generation crashed with no error details";
    console.error("Daily content generation failed:", errMsg);
    await logCronExecution("daily-content-generate", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: errMsg,
    });

    // Fire failure hook for automatic recovery
    onCronFailure({ jobName: "daily-content-generate", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { error: errMsg },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

async function generateDailyContentAllSites() {
  const { prisma } = await import("@/lib/db");
  const { createDeadline } = await import("@/lib/resilience");
  const { isAIAvailable } = await import("@/lib/ai/provider");
  // Only process sites with live websites to save AI tokens and time
  const siteIds = getActiveSiteIds();
  const allResults: Record<string, any> = {};
  const deadline = createDeadline(7_000, 60_000); // 60s maxDuration (Vercel Pro), 7s margin → 53s budget

  // Fail fast if no AI provider is configured — don't waste 45s per site timing out
  const aiReady = await isAIAvailable();
  const hasAbacus = !!process.env.ABACUSAI_API_KEY;
  if (!aiReady && !hasAbacus) {
    console.error("[daily-content-generate] No AI provider configured. Set XAI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, or ABACUSAI_API_KEY");
    return {
      message: "No AI provider configured — content generation skipped",
      error: "Set at least one AI API key: XAI_API_KEY (Grok), ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, or ABACUSAI_API_KEY",
      sites: {},
      timedOut: false,
      timestamp: new Date().toISOString(),
    };
  }

  // Track consecutive AI failures to short-circuit when providers are broken
  let consecutiveAIFailures = 0;
  const MAX_AI_FAILURES_BEFORE_ABORT = 2;

  for (const siteId of siteIds) {
    // Skip yacht sites — they use a different content model (Yacht, YachtDestination, CharterItinerary)
    // and don't need blog articles generated through the content pipeline
    if (isYachtSite(siteId)) {
      allResults[siteId] = { status: "skipped", reason: "yacht_platform_not_blog" };
      console.log(`[${siteId}] Skipped — yacht platform uses different content model, not blog pipeline`);
      continue;
    }

    if (deadline.isExpired()) {
      allResults[siteId] = { status: "skipped", reason: "timeout_approaching" };
      console.warn(`[${siteId}] Skipped — timeout approaching (${deadline.elapsedMs()}ms elapsed)`);
      continue;
    }

    // If AI providers failed repeatedly, stop wasting time on remaining sites
    if (consecutiveAIFailures >= MAX_AI_FAILURES_BEFORE_ABORT) {
      allResults[siteId] = { status: "skipped", reason: "ai_providers_failing" };
      console.warn(`[${siteId}] Skipped — AI providers failed ${consecutiveAIFailures} times consecutively`);
      continue;
    }

    const siteConfig = getSiteConfig(siteId);
    if (!siteConfig) continue;

    try {
      const result = await generateDailyContentForSite(siteConfig, prisma, deadline);
      allResults[siteId] = result;
      // Reset counter if any article succeeded for this site
      const hasSuccess = result.results?.some((r: any) => r.status === "success");
      if (hasSuccess) consecutiveAIFailures = 0;
      else if (result.results?.some((r: any) => r.error?.includes("AI providers failed") || r.error?.includes("timed out"))) {
        consecutiveAIFailures++;
      }
      console.log(
        `[${siteConfig.name}] Content gen: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      allResults[siteId] = { status: "failed", error: errMsg };
      if (errMsg.includes("AI providers failed") || errMsg.includes("timed out")) {
        consecutiveAIFailures++;
      }
      console.error(`[${siteConfig.name}] Content gen failed:`, error);
    }
  }

  return {
    message: "Multi-site daily content generation completed",
    sites: allResults,
    timedOut: deadline.isExpired(),
    timestamp: new Date().toISOString(),
  };
}

async function generateDailyContentForSite(site: SiteConfig, prisma: any, deadline?: { isExpired: () => boolean; remainingMs: () => number }) {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // Check if we already generated today for this site
  const todayCount = await prisma.blogPost.count({
    where: {
      created_at: { gte: startOfDay },
      tags: { hasEvery: ["auto-generated", `site-${site.id}`] },
    },
  });

  if (todayCount >= 2) {
    return {
      message: "Daily quota already met",
      generatedToday: todayCount,
      skipped: true,
    };
  }

  const results: any[] = [];

  // Check EN/AR status for this site
  const todayEN = await prisma.blogPost.count({
    where: {
      created_at: { gte: startOfDay },
      tags: { hasEvery: ["auto-generated", `site-${site.id}`, "primary-en"] },
    },
  });
  const todayAR = await prisma.blogPost.count({
    where: {
      created_at: { gte: startOfDay },
      tags: { hasEvery: ["auto-generated", `site-${site.id}`, "primary-ar"] },
    },
  });

  // Generate EN article if needed
  if (todayEN === 0) {
    if (deadline?.isExpired()) {
      results.push({ language: "en", status: "skipped", error: "timeout_approaching" });
    } else {
      try {
        const article = await generateArticle("en", site, prisma, deadline);
        results.push({ language: "en", status: "success", slug: article.slug });
      } catch (error) {
        results.push({
          language: "en",
          status: "failed",
          error: (error as Error).message,
        });
      }
    }
  }

  // Generate AR article if needed — require at least 18s remaining
  // Arabic generation: AI call ~15s + overhead ~3s = ~18s minimum.
  // Previous threshold of 28s was too conservative and ALWAYS skipped Arabic
  // because EN(22s) + overhead(5s) = 27s elapsed → 26s remaining < 28s → AR skipped.
  // Lowered to 18s. The per-call AI timeout cap will prevent Vercel overrun.
  if (todayAR === 0) {
    if (deadline?.isExpired() || (deadline && deadline.remainingMs() < 18_000)) {
      results.push({ language: "ar", status: "skipped", error: "timeout_approaching — insufficient time for AR generation" });
    } else {
      try {
        const article = await generateArticle("ar", site, prisma, deadline);
        results.push({ language: "ar", status: "success", slug: article.slug });
      } catch (error) {
        results.push({
          language: "ar",
          status: "failed",
          error: (error as Error).message,
        });
      }
    }
  }

  // Submit new URLs for indexing
  if (results.some((r) => r.status === "success")) {
    await submitForIndexing(
      results.filter((r) => r.status === "success").map((r) => r.slug),
      site,
    );
  }

  return {
    site: site.name,
    destination: site.destination,
    generatedToday:
      todayCount + results.filter((r) => r.status === "success").length,
    results,
  };
}

async function generateArticle(
  primaryLanguage: "en" | "ar",
  site: SiteConfig,
  prisma: any,
  deadline?: { remainingMs: () => number },
) {
  const topic = await pickTopic(primaryLanguage, site, prisma);

  let content;
  try {
    content = await generateWithAI(topic, primaryLanguage, site, deadline);
  } catch (aiErr) {
    // If AI generation fails and we claimed a topic from the DB, revert its status
    // so it can be picked up again by a future run
    if (topic.id) {
      await prisma.topicProposal.update({
        where: { id: topic.id },
        data: { status: "ready" },
      }).catch((revertErr: unknown) => {
        console.warn(`[daily-content-generate] Failed to revert topic ${topic.id} status after AI failure:`, revertErr instanceof Error ? revertErr.message : revertErr);
      });
    }
    throw aiErr;
  }
  const category = await getOrCreateCategory(site, prisma);
  const systemUser = await getOrCreateSystemUser(site, prisma);
  const rawSlug = generateSlug(content.title, primaryLanguage);

  // Hard guard: never publish with an empty or date-only slug (e.g. "-2026-02-14")
  if (!rawSlug || /^-?\d{4}-\d{2}-\d{2}$/.test(rawSlug)) {
    console.error(`[daily-content-generate] Empty or date-only slug generated from title "${content.title}" — skipping`);
    return { slug: rawSlug, deduplicated: true };
  }

  // Dedup: check if a published article already covers this topic/keyword.
  // Uses startsWith with the full slug (not a 40-char substring with `contains`)
  // to avoid both false positives and false negatives that let near-duplicates through.
  const existingByKeyword = await prisma.blogPost.findFirst({
    where: {
      siteId: site.id,
      published: true,
      deletedAt: null,
      slug: { startsWith: rawSlug },
    },
    select: { id: true, slug: true },
  });
  if (existingByKeyword) {
    console.warn(
      `[daily-content-generate] Skipping duplicate — existing article "${existingByKeyword.slug}" already covers topic "${topic.keyword}"`,
    );
    // Mark topic as published so it's not picked again
    if (topic.id) {
      await prisma.topicProposal.update({
        where: { id: topic.id },
        data: { status: "published" },
      }).catch(() => {});
    }
    return { slug: existingByKeyword.slug, deduplicated: true };
  }

  const slug = await ensureUniqueSlug(rawSlug, site.id, prisma);
  if (!slug) {
    // Near-duplicate exists — mark topic as published and skip
    if (topic.id) {
      await prisma.topicProposal.update({
        where: { id: topic.id },
        data: { status: "published" },
      }).catch(() => {});
    }
    return { slug: rawSlug, deduplicated: true };
  }

  // Pre-publication gate — verify route exists, content quality, and SEO minimums
  const targetUrl = `/blog/${slug}`;
  const siteUrl = getSiteDomain(site.id);
  let gateBlocked = false;
  try {
    const { runPrePublicationGate } = await import(
      "@/lib/seo/orchestrator/pre-publication-gate"
    );
    const gateResult = await runPrePublicationGate(targetUrl, {
      title_en:
        primaryLanguage === "en"
          ? content.title
          : content.titleTranslation || content.title,
      title_ar:
        primaryLanguage === "ar"
          ? content.title
          : content.titleTranslation || "",
      meta_title_en:
        primaryLanguage === "en"
          ? content.metaTitle
          : content.metaTitleTranslation || "",
      meta_description_en:
        primaryLanguage === "en"
          ? content.metaDescription
          : content.metaDescriptionTranslation || "",
      content_en:
        primaryLanguage === "en" ? content.body : content.bodyTranslation || "",
      content_ar:
        primaryLanguage === "ar" ? content.body : content.bodyTranslation || "",
      locale: primaryLanguage,
      tags: content.tags,
      seo_score: content.seoScore,
    }, siteUrl);

    if (!gateResult.allowed) {
      console.warn(
        `[${site.name}] Pre-publication gate BLOCKED: ${gateResult.blockers.join("; ")}`,
      );
      gateBlocked = true;
    }
    if (gateResult.warnings.length > 0) {
      console.warn(
        `[${site.name}] Pre-publication warnings: ${gateResult.warnings.join("; ")}`,
      );
    }
  } catch (gateError) {
    // Gate check failure is non-fatal — still publish but log
    console.warn(`[${site.name}] Pre-publication gate error (non-fatal):`, gateError);
  }

  const blogPost = await prisma.blogPost.create({
    data: {
      title_en:
        primaryLanguage === "en"
          ? content.title
          : content.titleTranslation || content.title,
      title_ar:
        primaryLanguage === "ar"
          ? content.title
          : content.titleTranslation || "",
      slug,
      excerpt_en:
        primaryLanguage === "en"
          ? content.excerpt
          : content.excerptTranslation || "",
      excerpt_ar:
        primaryLanguage === "ar"
          ? content.excerpt
          : content.excerptTranslation || "",
      content_en:
        primaryLanguage === "en" ? content.body : content.bodyTranslation || "",
      content_ar:
        primaryLanguage === "ar" ? content.body : content.bodyTranslation || "",
      meta_title_en:
        primaryLanguage === "en"
          ? content.metaTitle
          : content.metaTitleTranslation || "",
      meta_title_ar:
        primaryLanguage === "ar"
          ? content.metaTitle
          : content.metaTitleTranslation || "",
      meta_description_en:
        primaryLanguage === "en"
          ? content.metaDescription
          : content.metaDescriptionTranslation || "",
      meta_description_ar:
        primaryLanguage === "ar"
          ? content.metaDescription
          : content.metaDescriptionTranslation || "",
      tags: [
        ...content.tags,
        "auto-generated",
        `primary-${primaryLanguage}`,
        `site-${site.id}`,
        site.destination.toLowerCase(),
        ...(gateBlocked ? ["gate-blocked"] : []),
      ],
      // If gate blocked, save as draft instead of publishing
      published: !gateBlocked,
      siteId: site.id,
      category_id: category.id,
      author_id: systemUser.id,
      page_type: content.pageType || "guide",
      seo_score: content.seoScore || 85,
      keywords_json: content.keywords || [],
      questions_json: content.questions || [],
    },
  });

  // Arabic content quality gate — validate before publishing
  if (primaryLanguage === "ar") {
    try {
      const { validateArabicContent } = await import(
        "@/lib/skills/arabic-copywriting"
      );
      const arContent = content.body || "";
      const qualityReport = validateArabicContent(arContent);
      console.log(
        `[${site.name}] Arabic quality: score=${qualityReport.score} grade=${qualityReport.grade} issues=${qualityReport.issues.length}`,
      );

      // If quality is too low, log warnings (but still publish — editorial can review)
      if (qualityReport.grade === "rewrite") {
        console.warn(
          `[${site.name}] Arabic content scored ${qualityReport.score}/100 — may need editorial review`,
          qualityReport.issues.map((i) => i.message),
        );
      }
    } catch (qualityError) {
      console.warn(`[${site.name}] Arabic quality check failed (non-fatal):`, qualityError);
    }
  }

  // Auto-inject structured data (JSON-LD) for AIO visibility
  try {
    const { enhancedSchemaInjector } = await import(
      "@/lib/seo/enhanced-schema-injector"
    );
    const contentBody =
      primaryLanguage === "en" ? content.body : content.bodyTranslation || "";
    const postUrl = `${getSiteDomain(site.id)}/blog/${slug}`;
    await enhancedSchemaInjector.injectSchemas(
      contentBody,
      content.title,
      postUrl,
      blogPost.id,
      {
        author: `${site.name} Editorial Team`,
        category: category.name_en,
        tags: content.tags,
      },
    );
    console.log(`[${site.name}] Auto-injected structured data for: ${slug}`);
  } catch (schemaError) {
    console.warn(`[${site.name}] Schema injection failed (non-fatal):`, schemaError);
  }

  // Mark topic as used if from DB
  if (topic.id) {
    try {
      await prisma.topicProposal.update({
        where: { id: topic.id },
        data: { status: "published" },
      });
    } catch (topicErr) {
      console.warn(`[daily-content-generate] Failed to mark topic ${topic.id} as published:`, topicErr instanceof Error ? topicErr.message : topicErr);
    }
  }

  // Track URL in URLIndexingStatus so google-indexing cron picks it up
  // Without this, posts can slip through if IndexNow submission fails
  if (blogPost.published) {
    try {
      const siteUrl = getSiteDomain(site.id);
      const fullUrl = `${siteUrl}/blog/${slug}`;
      await prisma.uRLIndexingStatus.upsert({
        where: { site_id_url: { site_id: site.id, url: fullUrl } },
        create: {
          site_id: site.id,
          url: fullUrl,
          slug,
          status: "discovered",
          last_submitted_at: null,
        },
        update: {}, // Don't overwrite if already tracked
      });
    } catch (trackErr) {
      console.warn(`[${site.name}] URL tracking failed (non-fatal):`, trackErr instanceof Error ? trackErr.message : trackErr);
    }
  }

  console.log(`[${site.name}] Generated ${primaryLanguage} article: ${slug}`);
  return blogPost;
}

async function pickTopic(language: string, site: SiteConfig, prisma: any) {
  // Try to get a queued/ready topic from the database for this site
  try {
    // Find a candidate topic
    const candidate = await prisma.topicProposal.findFirst({
      where: {
        status: { in: ["ready", "queued", "planned", "proposed"] },
        locale: language,
        site_id: site.id,
        scheduled_content: { none: {} },
      },
      orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
    });

    if (candidate) {
      // Atomically claim it — only succeeds if status hasn't changed
      // This prevents race conditions where multiple pipelines grab the same topic
      const claimed = await prisma.topicProposal.updateMany({
        where: {
          id: candidate.id,
          status: { in: ["ready", "queued", "planned", "proposed"] },
        },
        data: {
          status: "generating",
          updated_at: new Date(),
        },
      });

      if (claimed.count === 0) {
        // Another process already claimed this topic — fall through to template
        console.log(`[daily-content-generate] Topic ${candidate.id} already claimed by another process, using fallback`);
      } else {
        return {
          id: candidate.id,
          keyword: candidate.primary_keyword,
          longtails: candidate.longtails || [],
          questions: candidate.questions || [],
          pageType: candidate.suggested_page_type || "guide",
          authorityLinks: candidate.authority_links_json || {},
        };
      }
    }
  } catch (dbErr) {
    console.warn(`[daily-content-generate] DB topic lookup failed, using fallback topics:`, dbErr instanceof Error ? dbErr.message : dbErr);
  }

  // Fallback: use site-specific topic templates
  const topics: TopicTemplate[] =
    language === "en" ? site.topicsEN : site.topicsAR;
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
      86400000,
  );
  const topic = topics[dayOfYear % topics.length];

  return { id: null, ...topic };
}

async function generateWithAI(
  topic: any,
  language: "en" | "ar",
  site: SiteConfig,
  deadline?: { remainingMs: () => number },
) {
  try {
    const { generateJSON } = await import("@/lib/ai/provider");

    // Apply humanization layer to system prompt
    const baseSystemPrompt =
      language === "en" ? site.systemPromptEN : site.systemPromptAR;
    const writingStyle = pickWritingStyle();

    // Inject Arabic copywriting directives for AR content
    let arabicDirectives = "";
    if (language === "ar") {
      try {
        const { getArabicCopywritingDirectives } = await import(
          "@/lib/skills/arabic-copywriting"
        );
        arabicDirectives = "\n\n" + getArabicCopywritingDirectives({
          destination: site.destination,
          contentType: topic.authorityLinks?.contentType || "guide",
          audience: "gulf",
        });
      } catch (arErr) {
        console.warn(`[daily-content-generate] Arabic copywriting directives unavailable:`, arErr instanceof Error ? arErr.message : arErr);
      }
    }

    const systemPrompt = `${baseSystemPrompt}

${getHumanizationDirectives(writingStyle, site)}${arabicDirectives}`;

    // Determine content type from topic metadata
    const contentType = topic.authorityLinks?.contentType || "guide";
    const contentTypePrompt = getContentTypePrompt(contentType, topic, site);
    const aioDirectives = getAIOOptimizationDirectives(contentType);

    const prompt =
      language === "en"
        ? `${contentTypePrompt}

${aioDirectives}

Content Requirements (all mandatory — articles failing these will be rejected by the quality gate):
- 1,500–2,000 words minimum (articles under 1,000 words are blocked from publishing)
- Target Arab travelers visiting ${site.destination}
- Include practical tips, insider advice, luxury recommendations
- Natural keyword integration: "${topic.keyword}" must appear in the title, first paragraph, and at least one H2
- Secondary keywords to weave in naturally: ${topic.longtails?.join(", ") || ""}
- Write in a ${writingStyle.tone} tone with ${writingStyle.perspective} perspective
- Include at least one personal insight or "insider tip" that shows real expertise
- Vary sentence lengths: mix short punchy sentences with longer descriptive ones

Structure Requirements:
- Use 4–6 H2 headings and H3 subheadings where appropriate. Never skip heading levels (no H1→H3).
- Include 3+ internal links to other ${site.name} pages using descriptive anchor text (link to /blog/*, /hotels, /experiences, /restaurants, etc.)
- Include 2+ affiliate/booking links (HalalBooking, Booking.com, GetYourGuide, Viator) with natural anchor text — never "click here"
- End with a "Key Takeaways" section (3–5 bullet points) and a clear call-to-action
${topic.questions?.length ? `\nAnswer these questions within the article (use as H2 or H3 headings):\n${topic.questions.map((q: string) => `- ${q}`).join("\n")}` : ""}

Return JSON with these exact fields:
{
  "title": "Compelling article title with focus keyword (50-60 chars)",
  "titleTranslation": "Arabic translation of the title — must be natural Arabic, not machine-translated",
  "body": "Full HTML article content with h2, h3, p, ul/ol, a[href] tags. Must include internal links and affiliate links. MINIMUM 1,500 words.",
  "bodyTranslation": "Full Arabic translation of the article body in HTML (h2, h3, p, ul/ol, a[href] tags). Must be a COMPLETE translation, not a summary. Minimum 1,000 words in Arabic. Use Modern Standard Arabic appropriate for Gulf Arab readers.",
  "excerpt": "Engaging excerpt (120-160 chars)",
  "excerptTranslation": "Arabic translation of the excerpt",
  "metaTitle": "SEO meta title with keyword near start (50-60 chars)",
  "metaTitleTranslation": "Arabic meta title",
  "metaDescription": "SEO meta description with CTA (120-160 chars)",
  "metaDescriptionTranslation": "Arabic meta description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "keywords": ["primary keyword", "secondary1", "secondary2"],
  "questions": ["Q1?", "Q2?", "Q3?"],
  "pageType": "${topic.pageType || "guide"}",
  "seoScore": 90
}`
        : `اكتب مقالة مدونة شاملة ومحسّنة لمحركات البحث عن "${topic.keyword}" لمنصة ${site.name}.

المتطلبات (إلزامية — المقالات التي لا تستوفيها سيتم رفضها):
- 1,500–2,000 كلمة كحد أدنى (المقالات أقل من 1,000 كلمة ستُحظر من النشر)
- استهداف المسافرين العرب الذين يزورون ${site.destination}
- تضمين نصائح عملية، معلومات داخلية، توصيات فاخرة
- الكلمة المفتاحية "${topic.keyword}" يجب أن تظهر في العنوان والفقرة الأولى وعنوان H2 واحد على الأقل
- دمج الكلمات المفتاحية الثانوية بشكل طبيعي: ${topic.longtails?.join("، ") || ""}

متطلبات الهيكل:
- استخدم 4–6 عناوين H2 وعناوين H3 فرعية حسب الحاجة
- أضف 3+ روابط داخلية لصفحات ${site.name} الأخرى بنص وصفي
- أضف 2+ روابط حجز/شراكة (HalalBooking، Booking.com، GetYourGuide) بنص طبيعي
- اختم بقسم "النقاط الرئيسية" (3–5 نقاط) ودعوة واضحة للعمل
${topic.questions?.length ? `\nأجب عن هذه الأسئلة في المقال (استخدمها كعناوين H2 أو H3):\n${topic.questions.map((q: string) => `- ${q}`).join("\n")}` : ""}

أرجع JSON بهذه الحقول:
{
  "title": "عنوان جذاب مع الكلمة المفتاحية (50-60 حرف)",
  "titleTranslation": "English translation of the title",
  "body": "محتوى المقال الكامل بتنسيق HTML مع h2, h3, p, ul/ol, a[href]. يجب أن يتضمن روابط داخلية وروابط شراكة. الحد الأدنى 1,500 كلمة.",
  "bodyTranslation": "Full English translation of the article body in HTML (h2, h3, p, ul/ol, a[href] tags). Must be a COMPLETE translation, not a summary. Minimum 1,000 words.",
  "excerpt": "مقتطف جذاب (120-160 حرف)",
  "excerptTranslation": "English translation of the excerpt",
  "metaTitle": "عنوان SEO مع الكلمة المفتاحية في البداية (50-60 حرف)",
  "metaTitleTranslation": "English meta title",
  "metaDescription": "وصف SEO مع دعوة للعمل (120-160 حرف)",
  "metaDescriptionTranslation": "English meta description",
  "tags": ["وسم1", "وسم2", "وسم3", "وسم4", "وسم5"],
  "keywords": ["الكلمة المفتاحية الرئيسية", "ثانوية1", "ثانوية2"],
  "questions": ["سؤال1؟", "سؤال2؟", "سؤال3؟"],
  "pageType": "guide",
  "seoScore": 90
}`;

    // Dynamic timeout: use remaining deadline time (capped at 20s per call, min 10s)
    // Reduced EN cap from 22s to 20s to leave more time for Arabic generation.
    // At 20s cap: EN(20s) + overhead(3s) = 23s elapsed → 30s remaining > 18s threshold → AR runs.
    const aiTimeoutMs = deadline
      ? Math.max(10_000, Math.min(20_000, deadline.remainingMs() - 5_000))
      : 20_000;
    const aiResult = await Promise.race([
      generateJSON<any>(prompt, {
        systemPrompt,
        maxTokens: 6000,
        temperature: 0.7,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AI generation timed out after ${Math.round(aiTimeoutMs / 1000)}s`)), aiTimeoutMs)
      ),
    ]);
    return aiResult;
  } catch (aiError) {
    console.warn(
      `[${site.name}] AI provider failed, trying AbacusAI:`,
      aiError,
    );
  }

  // Fallback to AbacusAI
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        "https://apps.abacus.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(deadline ? Math.max(10_000, Math.min(18_000, deadline.remainingMs() - 8_000)) : 18_000),
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  language === "en"
                    ? `You are a luxury travel content writer for ${site.name}. Write SEO-optimized content about ${site.destination} for Arab travelers. Respond with valid JSON only.`
                    : `أنت كاتب محتوى سفر فاخر لمنصة ${site.name}. اكتب محتوى محسّن لمحركات البحث عن ${site.destination}. أجب بـ JSON صالح فقط.`,
              },
              {
                role: "user",
                content: `Write a detailed 1500-2000 word article about "${topic.keyword}" for Arab travelers. Include 4-6 H2 sections, internal links, affiliate links (Booking.com, HalalBooking, GetYourGuide), and a Key Takeaways section. The bodyTranslation must be a FULL translation (1000+ words), not a summary. Return JSON: {"title":"...","titleTranslation":"...","body":"<h2>...</h2><p>...</p>...","bodyTranslation":"Full translation...","excerpt":"...","excerptTranslation":"...","metaTitle":"...","metaTitleTranslation":"...","metaDescription":"...","metaDescriptionTranslation":"...","tags":["..."],"keywords":["..."],"questions":["..."],"pageType":"guide","seoScore":85}`,
              },
            ],
            max_tokens: 6000,
            temperature: 0.7,
          }),
        },
      );

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "";
      let jsonStr = raw.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      return JSON.parse(jsonStr.trim());
    } catch (fallbackError) {
      console.error(
        `[${site.name}] AbacusAI fallback also failed:`,
        fallbackError,
      );
    }
  }

  throw new Error(
    `All AI providers failed for ${site.name} - cannot generate content`,
  );
}

function generateSlug(title: string, language: string): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (!cleanTitle) {
    const fallback = `untitled-${language}-${Date.now().toString(36)}`;
    console.warn(`[daily-content-generate] Empty title produced empty slug — using fallback: ${fallback}`);
    return fallback;
  }

  return cleanTitle;
}

/**
 * Check if a slug (or near-duplicate) already exists in BlogPost.
 * Uses startsWith to catch variants like "my-slug-a1b2" when checking "my-slug".
 * Returns null if a near-duplicate exists (caller should skip, not create another variant).
 */
async function ensureUniqueSlug(slug: string, siteId: string, prisma: any): Promise<string | null> {
  const existing = await prisma.blogPost.findFirst({
    where: {
      slug: { startsWith: slug },
      siteId,
      deletedAt: null,
    },
    select: { id: true, slug: true },
  });
  if (!existing) return slug;

  // A near-duplicate already exists — return null to signal "skip this topic"
  console.warn(`[daily-content-generate] Near-duplicate slug exists: "${existing.slug}" for new "${slug}" — skipping to prevent duplicate content`);
  return null;
}

async function getOrCreateCategory(site: SiteConfig, prisma: any) {
  const slug = `auto-generated-${site.id}`;
  const existing = await prisma.category.findFirst({ where: { slug } });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      name_en: site.categoryName.en,
      name_ar: site.categoryName.ar,
      slug,
      description_en: `AI-generated luxury ${site.destination} travel content`,
      description_ar: `محتوى سفر ${site.destination} الفاخر المُنشأ بالذكاء الاصطناعي`,
    },
  });
}

async function getOrCreateSystemUser(site: SiteConfig, prisma: any) {
  const email = `system@${site.domain}`;
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) return existing;

  // Try any existing system user as fallback
  const globalUser = await prisma.user.findFirst({
    where: { email: { startsWith: "system@" } },
  });
  if (globalUser) return globalUser;

  return prisma.user.create({
    data: {
      email,
      name: `${site.name} AI`,
      role: "editor",
    },
  });
}

/**
 * Generate content-type-specific prompts for AI.
 * Each type produces a different article structure optimized for that format.
 */
function getContentTypePrompt(
  contentType: string,
  topic: any,
  site: SiteConfig,
): string {
  const keyword = topic.keyword;

  switch (contentType) {
    case "answer":
      return `Write a comprehensive FAQ/answer article about "${keyword}" for ${site.name}.

Structure:
- Start with a direct, clear answer to the question in the first paragraph (this is critical for featured snippets and AIO)
- Then expand with detailed context, practical information, and related details
- Include a "Quick Facts" section with key takeaways
- Add related questions and answers (People Also Ask style) — use these as H2/H3 headings
- Include 3+ internal links to related ${site.name} content and 2+ booking/affiliate links
- End with practical tips for Arab travelers and a call-to-action`;

    case "comparison":
      return `Write a detailed comparison article about "${keyword}" for ${site.name}.

Structure:
- Opening: Brief overview of what's being compared and why it matters
- Comparison table in HTML: key criteria (price, quality, location, halal options, atmosphere)
- Detailed analysis of each option with pros and cons under H2/H3 headings
- "Best For" sections: Best for families, Best for couples, Best for luxury, Best value
- Final verdict with clear recommendation
- Include real prices and practical booking tips with affiliate links (HalalBooking, Booking.com, etc.)
- Include 3+ internal links to related ${site.name} guides`;

    case "deep-dive":
      return `Write an in-depth, comprehensive deep-dive article about "${keyword}" for ${site.name}.

Structure:
- This is an EXPANSION of existing content — make it the definitive resource on this topic
- 2,000+ words with detailed H2/H3 sections — this is premium long-form content
- Include expert insights, hidden gems, insider tips that demonstrate first-hand experience
- Add practical details: addresses, opening hours, price ranges, booking tips
- Include a "What Most Guides Don't Tell You" section
- Include 4+ internal links to related ${site.name} content and 3+ affiliate/booking links
- End with "Key Takeaways" and a booking CTA`;

    case "listicle":
      return `Write a curated listicle article about "${keyword}" for ${site.name}.

Structure:
- Numbered list format (Top 10 or similar) — each item as an H2 heading
- Each item gets: name, description (2-3 sentences), why it's special, practical info (price, location, hours)
- Include a "Quick Pick" summary at the top for scanners (AIO-optimized)
- Add a comparison mini-table in HTML
- Highlight halal-friendly and Arabic-speaking options
- Include booking/reservation links (affiliate: HalalBooking, Booking.com, GetYourGuide)
- Include 3+ internal links to related ${site.name} articles`;

    case "seasonal":
      return `Write a timely seasonal guide about "${keyword}" for ${site.name}.

Structure:
- Lead with dates, times, and essential planning info under clear H2 headings
- Include a day-by-day or week-by-week breakdown if applicable
- Practical logistics: transport, accommodation, what to bring
- Cultural context for Arab travelers
- Budget breakdown (luxury vs. mid-range vs. budget) with booking links (affiliate: Booking.com, GetYourGuide)
- Booking deadlines and advance planning tips
- Include 3+ internal links to related ${site.name} seasonal content
- End with a "Plan Your Trip" CTA section`;

    default:
      return `Write a comprehensive, SEO-optimized blog article about "${keyword}" for ${site.name}.

Structure:
- 1,500–2,000 words with 4–6 H2 sections and H3 subsections
- Include 3+ internal links to related ${site.name} pages and 2+ affiliate/booking links
- End with "Key Takeaways" and a CTA`;
  }
}

// ============================================
// AIO (AI OVERVIEW) OPTIMIZATION DIRECTIVES
// ============================================

/**
 * Generate AIO-specific formatting instructions per content type.
 * Ensures content is structured for AI search engines (Google SGE, ChatGPT, Perplexity)
 * to extract and cite properly.
 */
function getAIOOptimizationDirectives(contentType: string): string {
  const base = `AIO & Citation Optimization (CRITICAL — 60%+ of searches now show AI Overviews):
- Start EVERY section with a direct, concise answer in the first 1-2 sentences before elaborating
- Use clear, factual statements that AI can extract as snippets (e.g., "The best halal restaurant in Mayfair is X, located at Y")
- Include specific data points: prices (£), ratings, distances, opening hours, dates
- Structure FAQ answers as complete standalone paragraphs (AI extracts these for People Also Ask)
- Use "According to..." or "Based on..." phrasing for verifiable claims
- End with a "Key Takeaways" or "Quick Summary" section with 3-5 bullet points
- Format comparison data in HTML tables that AI engines can parse
- IMPORTANT: AI Overviews now strongly prefer citing content that demonstrates genuine expertise, not summaries — include original observations and first-hand details to earn citations`;

  switch (contentType) {
    case "answer":
      return `${base}
- FIRST PARAGRAPH must directly answer the question in 2-3 sentences (this is the AI snippet)
- Include a "Quick Answer" box at the very start: <div class="quick-answer"><strong>Quick Answer:</strong> ...</div>
- Follow with detailed context, evidence, and nuance
- Add "Related Questions" section at the end`;

    case "comparison":
      return `${base}
- Include a comparison summary table in the first section (AI engines love tables)
- Use "Best for [use case]:" format that AI can directly quote
- End each comparison with a clear "Verdict:" statement`;

    case "listicle":
      return `${base}
- Start with "Quick Picks" summary (top 3) before the full list
- Each item: Name, one-line verdict, key details (price, location)
- AI engines extract numbered lists — ensure consistent formatting`;

    default:
      return base;
  }
}

// ============================================
// ANTI-PENALTY: E-E-A-T & HUMANIZATION
// ============================================

interface WritingStyle {
  tone: string;
  perspective: string;
  openingStyle: string;
  signatureElement: string;
}

/**
 * Rotate writing styles to prevent pattern detection.
 * Each article gets a unique combination of tone, perspective, and structure.
 */
function pickWritingStyle(): WritingStyle {
  const tones = [
    "conversational and warm",
    "authoritative yet approachable",
    "enthusiastic and descriptive",
    "refined and elegant",
    "practical and no-nonsense",
    "storytelling and immersive",
  ];

  const perspectives = [
    "first-person (sharing personal experience)",
    "second-person (speaking directly to the reader)",
    "editorial (knowledgeable guide)",
    "journalistic (reporting the facts with personality)",
  ];

  const openingStyles = [
    "Start with a vivid scene or sensory description",
    "Start with a surprising fact or statistic",
    "Start with a question that hooks the reader",
    "Start with a brief personal anecdote or observation",
    "Start with a bold statement or recommendation",
  ];

  const signatureElements = [
    "Include a 'Local's Secret' callout box",
    "Include an 'Editor's Pick' highlight",
    "Include a 'First-Timer's Tip' sidebar",
    "Include a 'Budget vs Luxury' comparison",
    "Include a 'What We Love' personal note",
  ];

  // Use date-seeded pseudo-random to ensure variety across days
  const seed = new Date().getTime() % 1000;
  return {
    tone: tones[seed % tones.length],
    perspective: perspectives[seed % perspectives.length],
    openingStyle: openingStyles[seed % openingStyles.length],
    signatureElement: signatureElements[seed % signatureElements.length],
  };
}

/**
 * Generate E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)
 * and humanization directives for the system prompt.
 * Prevents Google from flagging content as low-quality AI generation.
 */
function getHumanizationDirectives(style: WritingStyle, site: SiteConfig): string {
  return `CONTENT QUALITY & E-E-A-T GUIDELINES (mandatory — Google's Jan 2026 Authenticity Update):

Writing Style for this article:
- Tone: ${style.tone}
- Perspective: ${style.perspective}
- ${style.openingStyle}
- ${style.signatureElement}

FIRST-HAND EXPERIENCE (CRITICAL — #1 ranking signal in Jan 2026 update):
Google's January 2026 "Authenticity Update" makes first-hand experience THE dominant ranking signal.
Content that reads like a summary of other sources ("second-hand knowledge") is now actively demoted.
- Reference specific, real places by name with accurate details (exact streets, neighborhoods, floor numbers)
- Include sensory details: what you see, smell, taste, hear at each location (e.g., "the scent of cardamom wafts from...")
- Mention specific dishes, room types, or experiences by name (not generic descriptions)
- Add 2–3 "insider tips" per article that only someone who has visited would know (e.g., "Ask for a table by the window overlooking...", "The secret menu includes...")
- Reference time of day, seasons, or specific events that affect the experience
- Include approximate walking times between locations
- Share what surprised you or what was different from expectations ("What most guides don't mention is...")
- Include at least one specific personal observation or anecdote per major section
- Describe a failed approach or limitation honestly — imperfection signals authenticity

Authoritativeness:
- Cite verifiable facts: opening hours, price ranges with £ symbols, booking requirements
- Reference official ratings, awards, or certifications (e.g., "Michelin-starred", "5-star", "halal-certified by HMC")
- Link concepts to broader context (e.g., "Part of the growing halal luxury dining scene in London")
- Include specific data points: distances, dates, capacities, ratings out of 5

Trustworthiness:
- Be transparent about limitations: "Prices as of 2026 — check directly for current rates"
- Include balanced perspectives: mention both pros and potential drawbacks
- Add a brief "About ${site.name}" line: "This guide was researched and written by the ${site.name} editorial team, who regularly visit and review these locations"
- Never claim to have visited a place without providing specific details that prove it

Humanization & Anti-AI-Detection (CRITICAL):
- Vary sentence length dramatically: 5-word sentences mixed with 25-word sentences
- Use occasional colloquial expressions naturally (e.g., "trust me on this one", "here's the thing", "honestly")
- NEVER use these AI-generic phrases: "In conclusion", "It's worth noting", "In today's world", "Whether you're a... or a...", "Look no further", "Without further ado", "In this comprehensive guide", "nestled in the heart of"
- Avoid: generic filler phrases, bullet points that all start the same way, perfectly parallel structures
- Use contractions naturally (don't, won't, it's) — not every sentence, but regularly
- Break up long sections with a short parenthetical aside or rhetorical question
- Include one unexpected detail, personal aside, or honest caveat per section
- Write like a knowledgeable friend sharing travel advice, not a marketing brochure`;
}

async function submitForIndexing(slugs: string[], site: SiteConfig) {
  const siteUrl = getSiteDomain(site.id);
  const indexNowKey = process.env.INDEXNOW_KEY;
  const urls = slugs.map((s) => `${siteUrl}/blog/${s}`);

  if (indexNowKey && urls.length > 0) {
    try {
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5_000), // 5s timeout for indexing
        body: JSON.stringify({
          host: new URL(siteUrl).hostname,
          key: indexNowKey,
          urlList: urls,
        }),
      });
      console.log(`[${site.name}] Submitted ${urls.length} URLs to IndexNow`);
    } catch (e) {
      console.warn(`[${site.name}] IndexNow submission failed:`, e);
    }
  }
}
