export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

/**
 * Daily Content Generation Cron - Runs at 5am UTC daily
 *
 * Generates exactly 2 articles per day:
 * - 1 English article (SEO + AIO optimized)
 * - 1 Arabic article (SEO + AIO optimized)
 *
 * Uses the AI provider layer (Claude/OpenAI/Gemini) for real content generation.
 * Saves to BlogPost table and submits for indexing.
 */
export async function GET(request: NextRequest) {
  try {
    const result = await generateDailyContent();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Daily content generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

async function generateDailyContent() {
  const { prisma } = await import("@/lib/db");

  // Check if we already generated today
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const todayCount = await prisma.blogPost.count({
    where: {
      created_at: { gte: startOfDay },
      tags: { has: "auto-generated" },
    },
  });

  if (todayCount >= 2) {
    return {
      message: "Daily quota already met",
      generatedToday: todayCount,
      skipped: true,
    };
  }

  const remaining = 2 - todayCount;
  const results: any[] = [];

  // Determine which languages still need content
  const todayEN = await prisma.blogPost.count({
    where: {
      created_at: { gte: startOfDay },
      tags: { hasEvery: ["auto-generated", "primary-en"] },
    },
  });
  const todayAR = await prisma.blogPost.count({
    where: {
      created_at: { gte: startOfDay },
      tags: { hasEvery: ["auto-generated", "primary-ar"] },
    },
  });

  // Generate EN article if needed
  if (todayEN === 0 && remaining > 0) {
    try {
      const enArticle = await generateArticle("en", prisma);
      results.push({ language: "en", status: "success", slug: enArticle.slug });
    } catch (error) {
      results.push({
        language: "en",
        status: "failed",
        error: (error as Error).message,
      });
    }
  }

  // Generate AR article if needed
  if (todayAR === 0 && remaining > 0) {
    try {
      const arArticle = await generateArticle("ar", prisma);
      results.push({ language: "ar", status: "success", slug: arArticle.slug });
    } catch (error) {
      results.push({
        language: "ar",
        status: "failed",
        error: (error as Error).message,
      });
    }
  }

  // Submit new URLs for indexing
  if (results.some((r) => r.status === "success")) {
    await submitForIndexing(
      results.filter((r) => r.status === "success").map((r) => r.slug),
    );
  }

  return {
    message: "Daily content generation completed",
    generatedToday:
      todayCount + results.filter((r) => r.status === "success").length,
    results,
    timestamp: new Date().toISOString(),
  };
}

async function generateArticle(primaryLanguage: "en" | "ar", prisma: any) {
  // Step 1: Pick a topic (from approved topics or generate one)
  const topic = await pickTopic(primaryLanguage, prisma);

  // Step 2: Generate content using AI
  const content = await generateWithAI(topic, primaryLanguage);

  // Step 3: Ensure we have a valid category
  const category = await getOrCreateCategory(prisma);

  // Step 4: Ensure we have a system user
  const systemUser = await getOrCreateSystemUser(prisma);

  // Step 5: Save as BlogPost
  const slug = generateSlug(content.title, primaryLanguage);

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
      tags: [...content.tags, "auto-generated", `primary-${primaryLanguage}`],
      published: true,
      category_id: category.id,
      author_id: systemUser.id,
      page_type: content.pageType || "guide",
      seo_score: content.seoScore || 85,
      keywords_json: content.keywords || [],
      questions_json: content.questions || [],
    },
  });

  // Mark topic as used if from DB
  if (topic.id) {
    try {
      await prisma.topicProposal.update({
        where: { id: topic.id },
        data: { status: "published" },
      });
    } catch {}
  }

  console.log(`Generated ${primaryLanguage} article: ${slug}`);
  return blogPost;
}

async function pickTopic(language: string, prisma: any) {
  // Try to get an approved topic from the database
  try {
    const topic = await prisma.topicProposal.findFirst({
      where: {
        status: "approved",
        locale: language,
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
        authorityLinks: topic.authority_links_json || [],
      };
    }
  } catch {}

  // Fallback: generate a dynamic topic based on current trends
  const topics = language === "en" ? getEnglishTopics() : getArabicTopics();
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  );
  const topic = topics[dayOfYear % topics.length];

  return {
    id: null,
    ...topic,
  };
}

function getEnglishTopics() {
  return [
    {
      keyword: "luxury boutique hotels London 2026",
      longtails: [
        "best boutique hotels Mayfair",
        "luxury hotels near Hyde Park",
        "five star hotels London Arab friendly",
      ],
      questions: [
        "Which boutique hotels in London offer Arabic-speaking staff?",
        "What are the most luxurious hotels near Harrods?",
      ],
      pageType: "guide",
    },
    {
      keyword: "best halal restaurants London fine dining",
      longtails: [
        "halal fine dining Knightsbridge",
        "luxury halal restaurants Mayfair",
        "Arabic restaurants London 2026",
      ],
      questions: [
        "Where can I find Michelin-star halal restaurants in London?",
        "What are the best Arabic restaurants in Mayfair?",
      ],
      pageType: "list",
    },
    {
      keyword: "London shopping guide for Arab visitors",
      longtails: [
        "Harrods shopping guide Arabic",
        "luxury brands Oxford Street",
        "VAT refund London tourist shopping",
      ],
      questions: [
        "How do Arab tourists get VAT refunds in London?",
        "What are the best luxury shopping areas in London?",
      ],
      pageType: "guide",
    },
    {
      keyword: "family-friendly luxury London experiences",
      longtails: [
        "London with kids luxury activities",
        "best family hotels London 2026",
        "child friendly fine dining London",
      ],
      questions: [
        "What luxury activities can families enjoy in London?",
        "Which London hotels offer the best kids clubs?",
      ],
      pageType: "guide",
    },
    {
      keyword: "London private tours and exclusive experiences",
      longtails: [
        "private guided tours London",
        "VIP London experiences 2026",
        "exclusive after-hours museum tours London",
      ],
      questions: [
        "Can you book private tours of Buckingham Palace?",
        "What exclusive experiences are available in London?",
      ],
      pageType: "guide",
    },
    {
      keyword: "best London spas and wellness retreats",
      longtails: [
        "luxury spa treatments London",
        "women-only spa London",
        "hammam London Turkish bath",
      ],
      questions: [
        "Which London spas offer women-only sessions?",
        "Where are the best hammam experiences in London?",
      ],
      pageType: "list",
    },
    {
      keyword: "London Premier League match day experience",
      longtails: [
        "VIP football tickets London",
        "Arsenal Emirates hospitality",
        "Chelsea Stamford Bridge tour",
      ],
      questions: [
        "How can I get VIP hospitality tickets for Premier League matches?",
        "Which London football stadiums offer the best tours?",
      ],
      pageType: "guide",
    },
  ];
}

function getArabicTopics() {
  return [
    {
      keyword: "دليل التسوق الفاخر في لندن 2026",
      longtails: [
        "أفضل محلات لندن الفاخرة",
        "تسوق هارودز دليل عربي",
        "استرداد ضريبة القيمة المضافة لندن",
      ],
      questions: [
        "ما هي أفضل مناطق التسوق الفاخرة في لندن؟",
        "كيف يمكن للسياح العرب استرداد ضريبة القيمة المضافة؟",
      ],
      pageType: "guide",
    },
    {
      keyword: "أفضل الفنادق الفاخرة في لندن للعائلات العربية",
      longtails: [
        "فنادق لندن حلال",
        "فنادق خمس نجوم لندن عائلية",
        "أجنحة فندقية فاخرة لندن",
      ],
      questions: [
        "ما هي أفضل الفنادق في لندن التي تقدم خدمات باللغة العربية؟",
        "أي فنادق لندن مناسبة للعائلات العربية؟",
      ],
      pageType: "guide",
    },
    {
      keyword: "المطاعم الحلال الفاخرة في لندن",
      longtails: [
        "مطاعم حلال نايتسبريدج",
        "أفضل مطاعم عربية لندن",
        "مطاعم فاخرة حلال مايفير",
      ],
      questions: [
        "أين أجد أفضل المطاعم الحلال الفاخرة في لندن؟",
        "ما هي المطاعم العربية المميزة في لندن؟",
      ],
      pageType: "list",
    },
    {
      keyword: "أنشطة عائلية في لندن للعرب",
      longtails: [
        "لندن مع الأطفال أنشطة",
        "أماكن ترفيه عائلية لندن",
        "حدائق لندن للعائلات",
      ],
      questions: [
        "ما هي أفضل الأنشطة العائلية في لندن؟",
        "أين يمكن أخذ الأطفال في لندن؟",
      ],
      pageType: "guide",
    },
    {
      keyword: "جولات خاصة وتجارب حصرية في لندن",
      longtails: [
        "جولات VIP لندن",
        "تجارب فاخرة حصرية لندن 2026",
        "زيارة قصر باكنغهام خاص",
      ],
      questions: [
        "هل يمكن حجز جولات خاصة في لندن؟",
        "ما هي التجارب الحصرية المتاحة في لندن؟",
      ],
      pageType: "guide",
    },
    {
      keyword: "السياحة العلاجية والسبا في لندن",
      longtails: [
        "أفضل سبا لندن للنساء",
        "حمام تركي لندن",
        "مراكز تجميل فاخرة لندن",
      ],
      questions: [
        "أين أجد أفضل مراكز السبا في لندن للنساء؟",
        "ما هي أفضل تجارب الحمام التركي في لندن؟",
      ],
      pageType: "list",
    },
    {
      keyword: "تجربة مباريات الدوري الإنجليزي في لندن",
      longtails: [
        "تذاكر كرة قدم لندن VIP",
        "جولة ملعب أرسنال",
        "تجربة ضيافة تشيلسي",
      ],
      questions: [
        "كيف أحصل على تذاكر VIP لمباريات الدوري الإنجليزي؟",
        "ما هي أفضل ملاعب كرة القدم للزيارة في لندن؟",
      ],
      pageType: "guide",
    },
  ];
}

async function generateWithAI(topic: any, language: "en" | "ar") {
  // Try the unified AI provider first
  try {
    const { generateJSON } = await import("@/lib/ai/provider");

    const systemPrompt =
      language === "en"
        ? `You are a luxury travel content writer for Yalla London, a premium travel platform for Arab travelers visiting London. Write SEO-optimized, engaging content. Always respond with valid JSON.`
        : `أنت كاتب محتوى سفر فاخر لمنصة يالا لندن، منصة سفر متميزة للمسافرين العرب الذين يزورون لندن. اكتب محتوى محسّن لمحركات البحث وجذاب. أجب دائماً بـ JSON صالح.`;

    const prompt =
      language === "en"
        ? `Write a comprehensive, SEO-optimized blog article about "${topic.keyword}" for Yalla London.

Requirements:
- 1500-2000 words
- Target Arab travelers visiting London
- Include practical tips, insider advice, luxury recommendations
- Natural keyword integration: ${topic.longtails?.join(", ") || topic.keyword}
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
  "pageType": "guide",
  "seoScore": 90
}`
        : `اكتب مقالة مدونة شاملة ومحسّنة لمحركات البحث عن "${topic.keyword}" لمنصة يالا لندن.

المتطلبات:
- 1500-2000 كلمة
- استهداف المسافرين العرب الذين يزورون لندن
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

    const content = await generateJSON<any>(prompt, {
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.7,
    });

    return content;
  } catch (aiError) {
    console.warn("AI provider failed, trying AbacusAI fallback:", aiError);
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
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  language === "en"
                    ? "You are a luxury travel content writer for Yalla London. Write SEO-optimized content for Arab travelers. Respond with valid JSON only."
                    : "أنت كاتب محتوى سفر فاخر لمنصة يالا لندن. اكتب محتوى محسّن لمحركات البحث. أجب بـ JSON صالح فقط.",
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
      // Extract JSON from response
      let jsonStr = raw.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      return JSON.parse(jsonStr.trim());
    } catch (fallbackError) {
      console.error("AbacusAI fallback also failed:", fallbackError);
    }
  }

  // Final fallback: generate structured placeholder that's still valid
  throw new Error("All AI providers failed - cannot generate content");
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

async function getOrCreateCategory(prisma: any) {
  const existing = await prisma.category.findFirst({
    where: { slug: "auto-generated" },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      name_en: "London Guide",
      name_ar: "دليل لندن",
      slug: "auto-generated",
      description_en: "AI-generated luxury London travel content",
      description_ar: "محتوى سفر لندن الفاخر المُنشأ بالذكاء الاصطناعي",
    },
  });
}

async function getOrCreateSystemUser(prisma: any) {
  const existing = await prisma.user.findFirst({
    where: { email: "system@yallalondon.com" },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: "system@yallalondon.com",
      name: "Yalla London AI",
      role: "editor",
    },
  });
}

async function submitForIndexing(slugs: string[]) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
  const indexNowKey = process.env.INDEXNOW_API_KEY;
  const urls = slugs.map((s) => `${siteUrl}/blog/${s}`);

  if (indexNowKey && urls.length > 0) {
    try {
      await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: new URL(siteUrl).hostname,
          key: indexNowKey,
          urlList: urls,
        }),
      });
    } catch {}
  }

  // Ping sitemaps
  try {
    await fetch(`https://www.google.com/ping?sitemap=${siteUrl}/sitemap.xml`);
  } catch {}
}
