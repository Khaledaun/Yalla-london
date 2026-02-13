export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import {
  SITES,
  getAllSiteIds,
  getSiteConfig,
  getSiteDomain,
} from "@/config/sites";
import type { SiteConfig, TopicTemplate } from "@/config/sites";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Daily Content Generation Cron - Runs at 5am UTC daily
 *
 * Generates 2 articles PER ACTIVE SITE per day:
 * - 1 English article (SEO + AIO optimized)
 * - 1 Arabic article (SEO + AIO optimized)
 *
 * Loops through all active sites using config/sites.ts.
 * Uses the AI provider layer (Claude/OpenAI/Gemini) for real content generation.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!cronSecret && process.env.NODE_ENV === "production") {
    console.error("CRON_SECRET not configured in production");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 503 },
    );
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
        sites: getAllSiteIds().length,
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

  try {
    const result = await generateDailyContentAllSites();
    await logCronExecution("daily-content-generate", result.timedOut ? "timed_out" : "completed", {
      durationMs: Date.now() - _cronStart,
      sitesProcessed: Object.keys(result.sites || {}),
      resultSummary: { message: result.message, sites: Object.keys(result.sites || {}).length },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Daily content generation failed:", error);
    await logCronExecution("daily-content-generate", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Generation failed",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
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
  const siteIds = getAllSiteIds();
  const allResults: Record<string, any> = {};
  const deadline = createDeadline(7_000); // 7s margin for response

  for (const siteId of siteIds) {
    if (deadline.isExpired()) {
      allResults[siteId] = { status: "skipped", reason: "timeout_approaching" };
      console.warn(`[${siteId}] Skipped — timeout approaching (${deadline.elapsedMs()}ms elapsed)`);
      continue;
    }

    const siteConfig = getSiteConfig(siteId);
    if (!siteConfig) continue;

    try {
      const result = await generateDailyContentForSite(siteConfig, prisma, deadline);
      allResults[siteId] = result;
      console.log(
        `[${siteConfig.name}] Content gen: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      allResults[siteId] = {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
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
        const article = await generateArticle("en", site, prisma);
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

  // Generate AR article if needed
  if (todayAR === 0) {
    if (deadline?.isExpired()) {
      results.push({ language: "ar", status: "skipped", error: "timeout_approaching" });
    } else {
      try {
        const article = await generateArticle("ar", site, prisma);
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
) {
  const topic = await pickTopic(primaryLanguage, site, prisma);
  const content = await generateWithAI(topic, primaryLanguage, site);
  const category = await getOrCreateCategory(site, prisma);
  const systemUser = await getOrCreateSystemUser(site, prisma);
  const slug = generateSlug(content.title, primaryLanguage);

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
    } catch {}
  }

  console.log(`[${site.name}] Generated ${primaryLanguage} article: ${slug}`);
  return blogPost;
}

async function pickTopic(language: string, site: SiteConfig, prisma: any) {
  // Try to get a queued/ready topic from the database for this site
  try {
    const topic = await prisma.topicProposal.findFirst({
      where: {
        status: { in: ["ready", "queued", "planned"] },
        locale: language,
        site_id: site.id,
        scheduled_content: { none: {} },
      },
      orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
    });

    if (topic) {
      return {
        id: topic.id,
        keyword: topic.primary_keyword,
        longtails: topic.longtails || [],
        questions: topic.questions || [],
        pageType: topic.suggested_page_type || "guide",
        authorityLinks: topic.authority_links_json || {},
      };
    }
  } catch {}

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
      } catch {}
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

Requirements:
- 1500-2000 words
- Target Arab travelers visiting ${site.destination}
- Include practical tips, insider advice, luxury recommendations
- Natural keyword integration: ${topic.longtails?.join(", ") || topic.keyword}
- Write in a ${writingStyle.tone} tone with ${writingStyle.perspective} perspective
- Include at least one personal insight or "insider tip" that shows real expertise
- Vary sentence lengths: mix short punchy sentences with longer descriptive ones
${topic.questions?.length ? `\nAnswer these questions within the article:\n${topic.questions.map((q: string) => `- ${q}`).join("\n")}` : ""}

Return JSON with these exact fields:
{
  "title": "Compelling article title (50-60 chars)",
  "titleTranslation": "Arabic translation of the title",
  "body": "Full HTML article content with h2, h3, p, ul/ol tags",
  "bodyTranslation": "Brief Arabic summary (200-300 words)",
  "excerpt": "Engaging excerpt (150-160 chars)",
  "excerptTranslation": "Arabic excerpt",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaTitleTranslation": "Arabic meta title",
  "metaDescription": "SEO meta description (150-155 chars)",
  "metaDescriptionTranslation": "Arabic meta description",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "questions": ["Q1?", "Q2?", "Q3?"],
  "pageType": "${topic.pageType || "guide"}",
  "seoScore": 90
}`
        : `اكتب مقالة مدونة شاملة ومحسّنة لمحركات البحث عن "${topic.keyword}" لمنصة ${site.name}.

المتطلبات:
- 1500-2000 كلمة
- استهداف المسافرين العرب الذين يزورون ${site.destination}
- تضمين نصائح عملية، معلومات داخلية، توصيات فاخرة
- دمج الكلمات المفتاحية بشكل طبيعي: ${topic.longtails?.join("، ") || topic.keyword}
${topic.questions?.length ? `\nأجب عن هذه الأسئلة في المقال:\n${topic.questions.map((q: string) => `- ${q}`).join("\n")}` : ""}

أرجع JSON بهذه الحقول:
{
  "title": "عنوان جذاب (50-60 حرف)",
  "titleTranslation": "English translation of the title",
  "body": "محتوى المقال الكامل بتنسيق HTML مع h2, h3, p, ul/ol",
  "bodyTranslation": "Brief English summary (200-300 words)",
  "excerpt": "مقتطف جذاب (150-160 حرف)",
  "excerptTranslation": "English excerpt",
  "metaTitle": "عنوان SEO (50-60 حرف)",
  "metaTitleTranslation": "English meta title",
  "metaDescription": "وصف SEO (150-155 حرف)",
  "metaDescriptionTranslation": "English meta description",
  "tags": ["وسم1", "وسم2", "وسم3", "وسم4", "وسم5"],
  "keywords": ["كلمة1", "كلمة2", "كلمة3"],
  "questions": ["سؤال1؟", "سؤال2؟", "سؤال3؟"],
  "pageType": "guide",
  "seoScore": 90
}`;

    // 25s timeout per AI call to prevent hanging
    const aiResult = await Promise.race([
      generateJSON<any>(prompt, {
        systemPrompt,
        maxTokens: 4096,
        temperature: 0.7,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI generation timed out after 25s")), 25_000)
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
          signal: AbortSignal.timeout(20_000), // 20s timeout for fallback
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
                content: `Write a 1500-word article about "${topic.keyword}". Return JSON: {"title":"...","titleTranslation":"...","body":"<h2>...</h2><p>...</p>...","bodyTranslation":"...","excerpt":"...","excerptTranslation":"...","metaTitle":"...","metaTitleTranslation":"...","metaDescription":"...","metaDescriptionTranslation":"...","tags":["..."],"keywords":["..."],"questions":["..."],"pageType":"guide","seoScore":85}`,
              },
            ],
            max_tokens: 3000,
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
  const date = new Date().toISOString().slice(0, 10);
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${cleanTitle}-${date}`;
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

  // Try the global system user first
  const globalUser = await prisma.user.findFirst({
    where: { email: "system@yallalondon.com" },
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
- Add related questions and answers (People Also Ask style)
- End with practical tips for Arab travelers`;

    case "comparison":
      return `Write a detailed comparison article about "${keyword}" for ${site.name}.

Structure:
- Opening: Brief overview of what's being compared and why it matters
- Comparison table in HTML: key criteria (price, quality, location, halal options, atmosphere)
- Detailed analysis of each option with pros and cons
- "Best For" sections: Best for families, Best for couples, Best for luxury, Best value
- Final verdict with clear recommendation
- Include real prices and practical booking tips`;

    case "deep-dive":
      return `Write an in-depth, comprehensive deep-dive article about "${keyword}" for ${site.name}.

Structure:
- This is an EXPANSION of existing content — make it the definitive resource on this topic
- 2000+ words with detailed sections
- Include expert insights, hidden gems, insider tips
- Add practical details: addresses, opening hours, price ranges, booking tips
- Include a "What Most Guides Don't Tell You" section
- Add structured data opportunities: FAQs, How-To steps, reviews`;

    case "listicle":
      return `Write a curated listicle article about "${keyword}" for ${site.name}.

Structure:
- Numbered list format (Top 10 or similar)
- Each item gets: name, description (2-3 sentences), why it's special, practical info (price, location, hours)
- Include a "Quick Pick" summary at the top for scanners
- Add a comparison mini-table
- Highlight halal-friendly and Arabic-speaking options
- Include booking/reservation tips`;

    case "seasonal":
      return `Write a timely seasonal guide about "${keyword}" for ${site.name}.

Structure:
- Lead with dates, times, and essential planning info
- Include a day-by-day or week-by-week breakdown if applicable
- Practical logistics: transport, accommodation, what to bring
- Cultural context for Arab travelers
- Budget breakdown (luxury vs. mid-range vs. budget)
- Booking deadlines and advance planning tips`;

    default:
      return `Write a comprehensive, SEO-optimized blog article about "${keyword}" for ${site.name}.`;
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
  const base = `AIO & Citation Optimization (CRITICAL for AI search visibility):
- Start EVERY section with a direct, concise answer in the first 1-2 sentences before elaborating
- Use clear, factual statements that AI can extract as snippets (e.g., "The best halal restaurant in Mayfair is X, located at Y")
- Include specific data points: prices (£), ratings, distances, opening hours, dates
- Structure FAQ answers as complete standalone paragraphs (AI extracts these for People Also Ask)
- Use "According to..." or "Based on..." phrasing for verifiable claims
- End with a "Key Takeaways" or "Quick Summary" section with 3-5 bullet points
- Format comparison data in HTML tables that AI engines can parse`;

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
  return `CONTENT QUALITY & E-E-A-T GUIDELINES (mandatory):

Writing Style for this article:
- Tone: ${style.tone}
- Perspective: ${style.perspective}
- ${style.openingStyle}
- ${style.signatureElement}

Experience & Expertise Signals:
- Reference specific, real places by name with accurate details (streets, neighborhoods)
- Include sensory details: what you see, smell, taste, hear at each location
- Mention specific dishes, room types, or experiences by name (not generic descriptions)
- Add "insider tips" that only someone who has visited would know (e.g., "Ask for a table by the window overlooking...")
- Reference time of day, seasons, or specific events that affect the experience
- Include approximate walking times between locations

Authoritativeness:
- Cite verifiable facts: opening hours, price ranges with £ symbols, booking requirements
- Reference official ratings, awards, or certifications (e.g., "Michelin-starred", "5-star", "halal-certified by HMC")
- Link concepts to broader context (e.g., "Part of the growing halal luxury dining scene in London")

Trustworthiness:
- Be transparent about limitations: "Prices as of 2026 — check directly for current rates"
- Include balanced perspectives: mention both pros and potential drawbacks
- Add a brief "About ${site.name}" line: "This guide was researched and written by the ${site.name} editorial team, who regularly visit and review these locations"

Humanization (CRITICAL — avoid AI detection):
- Vary sentence length dramatically: 5-word sentences mixed with 25-word sentences
- Use occasional colloquial expressions naturally (e.g., "trust me on this one", "here's the thing")
- Include one specific personal observation or unexpected detail per section
- Avoid: "In conclusion", "It's worth noting", "In today's world", "Whether you're a... or a..."
- Avoid: generic filler phrases, bullet points that all start the same way, perfectly parallel structures
- Use contractions naturally (don't, won't, it's) — not every sentence, but regularly
- Break up long sections with a short parenthetical aside or rhetorical question`;
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
