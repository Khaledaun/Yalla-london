export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI Article Generator API
 *
 * POST — Generates a full article using AI from a topic (picked from DB or manual keyword).
 *        Follows the same quality standards as the daily-content-generate cron.
 *        Returns the generated content for review before publishing.
 *
 * Actions:
 *   - generate   — AI generates a full article from a topic
 *   - publish    — Saves a generated article to BlogPost and publishes
 *   - pick_topic — Returns the next available topic without generating
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

async function handlePost(request: NextRequest) {
  const body = await request.json();
  const action = body.action || "generate";
  const { getDefaultSiteId, getSiteConfig, getSiteDomain } = await import("@/config/sites");

  const siteId = body.siteId || getDefaultSiteId();
  const site = getSiteConfig(siteId);
  if (!site) {
    return NextResponse.json({ success: false, error: `Unknown site: ${siteId}` }, { status: 400 });
  }

  const language: "en" | "ar" = body.language || "en";

  // ─── PICK TOPIC ─────────────────────────────────────────────────────────
  if (action === "pick_topic") {
    const topic = await pickTopic(language, siteId);
    return NextResponse.json({ success: true, topic });
  }

  // ─── GENERATE ───────────────────────────────────────────────────────────
  if (action === "generate") {
    const keyword = body.keyword; // optional manual keyword
    const pageType = body.pageType || "guide";

    let topic: TopicInfo;
    if (keyword) {
      // Manual keyword — user typed it
      topic = {
        id: null,
        keyword,
        longtails: body.longtails || [],
        questions: body.questions || [],
        pageType,
      };
    } else {
      // Auto-pick from DB
      topic = await pickTopic(language, siteId);
      if (!topic.keyword) {
        return NextResponse.json({
          success: false,
          error: "No topics available. Generate topics first (Sites tab → Gen Topics), or type a keyword manually.",
        }, { status: 404 });
      }
    }

    try {
      const content = await generateArticle(topic, language, site);

      return NextResponse.json({
        success: true,
        topicId: topic.id,
        keyword: topic.keyword,
        language,
        content: {
          titleEn: content.title || content.titleTranslation || "",
          titleAr: content.titleTranslation || content.title || "",
          bodyEn: content.body || content.bodyTranslation || "",
          bodyAr: content.bodyTranslation || content.body || "",
          excerptEn: content.excerpt || "",
          excerptAr: content.excerptTranslation || "",
          metaTitleEn: content.metaTitle || "",
          metaTitleAr: content.metaTitleTranslation || "",
          metaDescriptionEn: content.metaDescription || "",
          metaDescriptionAr: content.metaDescriptionTranslation || "",
          tags: content.tags || [],
          keywords: content.keywords || [],
          questions: content.questions || [],
          pageType: content.pageType || pageType,
          seoScore: content.seoScore || 80,
        },
        wordCount: countWords((content.body as string) || ""),
      });
    } catch (err) {
      // Revert topic status if we claimed one
      if (topic.id) {
        const { prisma } = await import("@/lib/db");
        await prisma.topicProposal.updateMany({
          where: { id: topic.id, status: "generating" },
          data: { status: "ready" },
        }).catch((e: unknown) => console.warn("[ai-generate] Topic revert failed:", e));
      }
      return NextResponse.json({
        success: false,
        error: `AI generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 500 });
    }
  }

  // ─── PUBLISH ────────────────────────────────────────────────────────────
  if (action === "publish") {
    const { prisma } = await import("@/lib/db");

    const titleEn = (body.titleEn || "").trim();
    if (!titleEn) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const slug = body.slug || titleEn
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);

    // Check duplicate slug
    const existing = await prisma.blogPost.findFirst({
      where: { slug, siteId, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `An article with slug "${slug}" already exists. Change the title.`,
      }, { status: 409 });
    }

    // Get or create category + author
    let categoryId = body.categoryId;
    if (!categoryId) {
      const cat = await prisma.category.findFirst({ where: { slug: "general" } });
      categoryId = cat?.id;
      if (!categoryId) {
        const newCat = await prisma.category.create({
          data: { name_en: "General", name_ar: "عام", slug: "general" },
        });
        categoryId = newCat.id;
      }
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "admin" }, select: { id: true } });
    const authorId = adminUser?.id || (await prisma.user.upsert({
      where: { email: "system@zenitha.luxury" },
      update: {},
      create: { email: "system@zenitha.luxury", name: "Editorial Team", role: "admin" },
    })).id;

    const shouldPublish = body.autoPublish !== false;
    const contentEn = body.bodyEn || "";
    const wordCount = countWords(contentEn);

    if (shouldPublish && wordCount < 300) {
      return NextResponse.json({
        success: false,
        error: `Article is only ${wordCount} words. Need 300+ to publish.`,
      }, { status: 400 });
    }

    const blogPost = await prisma.blogPost.create({
      data: {
        title_en: titleEn,
        title_ar: body.titleAr || null,
        excerpt_en: body.excerptEn || null,
        excerpt_ar: body.excerptAr || null,
        content_en: contentEn,
        content_ar: body.bodyAr || null,
        meta_title_en: body.metaTitleEn || titleEn.substring(0, 60),
        meta_description_en: body.metaDescriptionEn || "",
        meta_title_ar: body.metaTitleAr || null,
        meta_description_ar: body.metaDescriptionAr || null,
        slug,
        tags: [...(body.tags || []), "ai-generated", `site-${siteId}`],
        published: shouldPublish,
        siteId,
        category_id: categoryId,
        author_id: authorId,
        page_type: body.pageType || "guide",
        seo_score: body.seoScore || 80,
        keywords_json: body.keywords || [],
        questions_json: body.questions || [],
      },
    });

    // Mark topic as published
    if (body.topicId) {
      await prisma.topicProposal.updateMany({
        where: { id: body.topicId },
        data: { status: "published" },
      }).catch(() => {});
    }

    // Submit to IndexNow
    if (shouldPublish) {
      try {
        const domain = getSiteDomain(siteId);
        const articleUrl = `https://${domain}/blog/${slug}`;
        const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
        submitToIndexNow([articleUrl]).catch((e: Error) =>
          console.warn("[ai-generate] IndexNow failed:", e.message)
        );
      } catch {
        console.warn("[ai-generate] IndexNow setup failed");
      }
    }

    return NextResponse.json({
      success: true,
      id: blogPost.id,
      slug,
      published: shouldPublish,
      wordCount,
      message: shouldPublish ? `Published at /blog/${slug}` : `Saved as draft`,
    });
  }

  return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface TopicInfo {
  id: string | null;
  keyword: string;
  longtails: string[];
  questions: string[];
  pageType: string;
}

async function pickTopic(language: string, siteId: string): Promise<TopicInfo> {
  try {
    const { prisma } = await import("@/lib/db");
    const candidate = await prisma.topicProposal.findFirst({
      where: {
        status: { in: ["ready", "queued", "planned", "proposed"] },
        locale: language,
        site_id: siteId,
      },
      orderBy: [{ confidence_score: "desc" }, { created_at: "asc" }],
    });

    if (candidate) {
      const claimed = await prisma.topicProposal.updateMany({
        where: { id: candidate.id, status: { in: ["ready", "queued", "planned", "proposed"] } },
        data: { status: "generating", updated_at: new Date() },
      });

      if (claimed.count > 0) {
        return {
          id: candidate.id,
          keyword: candidate.primary_keyword,
          longtails: candidate.longtails || [],
          questions: candidate.questions || [],
          pageType: candidate.suggested_page_type || "guide",
        };
      }
    }
  } catch (err) {
    console.warn("[ai-generate] Topic lookup failed:", err instanceof Error ? err.message : err);
  }

  // Fallback: site config templates
  const { getSiteConfig } = await import("@/config/sites");
  const site = getSiteConfig(siteId);
  if (!site) return { id: null, keyword: "", longtails: [], questions: [], pageType: "guide" };

  const templates = language === "en" ? site.topicsEN : site.topicsAR;
  if (!templates || templates.length === 0) return { id: null, keyword: "", longtails: [], questions: [], pageType: "guide" };

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
  const t = templates[dayOfYear % templates.length] as Record<string, unknown>;
  return {
    id: null,
    keyword: (t.keyword as string) || "",
    longtails: (t.longtails as string[]) || [],
    questions: (t.questions as string[]) || [],
    pageType: (t.pageType as string) || "guide",
  };
}

async function generateArticle(
  topic: TopicInfo,
  language: "en" | "ar",
  site: { id: string; name: string; destination: string; systemPromptEN: string; systemPromptAR: string }
) {
  const { generateJSON } = await import("@/lib/ai/provider");

  const baseSystemPrompt = language === "en" ? site.systemPromptEN : site.systemPromptAR;
  const systemPrompt = `${baseSystemPrompt}

CONTENT QUALITY REQUIREMENTS:
- First-hand experience is the #1 ranking signal (Google Jan 2026 Authenticity Update)
- Include sensory details: what you see, hear, smell, taste at specific locations
- Add 2-3 "insider tips" per article — real advice a tourist guide would share
- Include at least one honest limitation or "what most guides won't tell you" moment
- NEVER use these AI-generic phrases: "nestled in the heart of", "whether you're a", "look no further", "in conclusion", "it's worth noting"
- Vary sentence length: mix short punchy sentences with longer descriptive ones`;

  const prompt = language === "en"
    ? `Write a comprehensive, SEO-optimized blog article about "${topic.keyword}" for ${site.name}, targeting Arab travelers visiting ${site.destination}.

Content Requirements (mandatory):
- 1,500–2,000 words minimum
- Include practical tips, insider advice, luxury recommendations
- Focus keyword "${topic.keyword}" in title, first paragraph, one H2
- Secondary keywords: ${topic.longtails.join(", ") || "none"}
${topic.questions.length ? `\nAnswer these questions (use as headings):\n${topic.questions.map(q => `- ${q}`).join("\n")}` : ""}

Structure:
- 4–6 H2 headings, H3 subheadings where appropriate
- 3+ internal links to /blog/*, /hotels, /experiences, /restaurants
- 2+ affiliate/booking links (HalalBooking, Booking.com, GetYourGuide, Viator)
- "Key Takeaways" section + clear CTA at the end

Return JSON:
{
  "title": "Title with keyword (50-60 chars)",
  "titleTranslation": "Arabic title",
  "body": "Full HTML (h2,h3,p,ul/ol,a). MINIMUM 1,500 words.",
  "bodyTranslation": "Full Arabic HTML translation (1,000+ words)",
  "excerpt": "Excerpt (120-160 chars)",
  "excerptTranslation": "Arabic excerpt",
  "metaTitle": "SEO title (50-60 chars)",
  "metaTitleTranslation": "Arabic meta title",
  "metaDescription": "SEO description (120-160 chars)",
  "metaDescriptionTranslation": "Arabic meta description",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "keywords": ["primary","secondary1","secondary2"],
  "questions": ["Q1?","Q2?","Q3?"],
  "pageType": "${topic.pageType}",
  "seoScore": 90
}`
    : `اكتب مقالة شاملة عن "${topic.keyword}" لمنصة ${site.name}، تستهدف المسافرين العرب.

المتطلبات: 1,500+ كلمة، نصائح عملية، روابط داخلية 3+، روابط حجز 2+.

أرجع JSON:
{
  "title": "عنوان (50-60 حرف)",
  "titleTranslation": "English title",
  "body": "HTML كامل (1,500+ كلمة)",
  "bodyTranslation": "Full English translation (1,000+ words)",
  "excerpt": "مقتطف (120-160 حرف)",
  "excerptTranslation": "English excerpt",
  "metaTitle": "عنوان SEO (50-60 حرف)",
  "metaTitleTranslation": "English meta title",
  "metaDescription": "وصف SEO (120-160 حرف)",
  "metaDescriptionTranslation": "English meta description",
  "tags": ["وسم1","وسم2","وسم3"],
  "keywords": ["رئيسية","ثانوية"],
  "questions": ["سؤال1؟","سؤال2؟"],
  "pageType": "${topic.pageType}",
  "seoScore": 90
}`;

  const result = await generateJSON<Record<string, unknown>>(prompt, {
    systemPrompt,
    maxTokens: 6000,
    temperature: 0.7,
  });

  return result;
}

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export const POST = withAdminAuth(handlePost);
