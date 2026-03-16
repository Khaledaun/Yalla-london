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
 *   - generate        — AI generates a full article from a topic (single call, may timeout)
 *   - phase1_outline  — Phase 1/3: Research + outline (title, headings, keywords, meta)
 *   - phase2_write    — Phase 2/3: Write full article body from outline
 *   - phase3_polish   — Phase 3/3: Polish SEO metadata, excerpt, tags
 *   - publish         — Saves a generated article to BlogPost and publishes
 *   - pick_topic      — Returns the next available topic without generating
 *   - content_types   — Returns available content types with descriptions
 *
 * Content types are defined in @/lib/content-automation/content-types.ts
 * 12 types: guide, comparison, hotel-review, restaurant-review, service-review,
 * news, events, sales, listicle, deep-dive, seasonal, answer.
 * To add new types, edit that file — both ai-generate and bulk-generate use it.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { CONTENT_TYPES } from "@/lib/content-automation/content-types";

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

  // ─── CONTENT TYPES ─────────────────────────────────────────────────────
  if (action === "content_types") {
    return NextResponse.json({
      success: true,
      types: Object.values(CONTENT_TYPES).map(t => ({
        id: t.id,
        label: t.label,
        labelAr: t.labelAr,
        description: t.description,
        minWords: t.minWords,
        targetWords: t.targetWords,
        requireAffiliateLinks: t.requireAffiliateLinks,
      })),
    });
  }

  // ─── PICK TOPIC ─────────────────────────────────────────────────────────
  if (action === "pick_topic") {
    const topic = await pickTopic(language, siteId);
    return NextResponse.json({ success: true, topic });
  }

  // ─── PHASE 1: OUTLINE ──────────────────────────────────────────────────
  // Generates: title, heading outline, keywords, meta title/description
  // Fast call (~500 output tokens, ~5-8s)
  if (action === "phase1_outline") {
    const keyword = body.keyword?.trim();
    const pageType = body.pageType || "guide";
    if (!keyword) {
      return NextResponse.json({ success: false, error: "Keyword is required" }, { status: 400 });
    }

    try {
      const { generateJSON } = await import("@/lib/ai/provider");
      const contentType = CONTENT_TYPES[pageType] || CONTENT_TYPES.guide;

      const systemPrompt = language === "en"
        ? `You are a luxury travel content strategist for "${site.name}" (${site.destination}). Plan articles for international luxury travelers, with special expertise for Arab and Gulf visitors. Each H2 must open with a 40-60 word direct answer (essential for AI search citations). Return only valid JSON.`
        : `أنت استراتيجي محتوى سفر فاخر لـ "${site.name}" (${site.destination}). خطط مقالات للمسافرين الدوليين مع خبرة خاصة للمسافرين العرب. أعد JSON فقط.`;

      const prompt = language === "en"
        ? `Plan an article about "${keyword}" for ${site.name} (${site.destination}).
Content type: ${contentType.label} (target ${contentType.targetWords}+ words).
${body.longtails?.length ? `Secondary keywords: ${body.longtails.join(", ")}` : ""}
${body.questions?.length ? `Questions to answer:\n${body.questions.map((q: string) => `- ${q}`).join("\n")}` : ""}

AUDIENCE: Primary = international luxury travelers (broadest SEO reach). Secondary = Arab/Gulf travelers (niche differentiator). Do NOT force Arab/Islamic angles on general topics.

STRUCTURE REQUIREMENTS:
- 5-7 H2 headings with H3 subheadings where needed
- At least 2 H2s should be phrased as questions (for AIO/GEO citation)
- Include "Key Takeaways" as final H2
- Plan for 3+ internal links, 2+ affiliate/booking links
- Each section should have a 40-60 word direct answer opening (GEO citability)

AUTHENTICITY: Plan 1 sensory/experiential detail per section, 2-3 insider tips total, 1 honest caveat.
GEO CITABILITY: Plan 1+ statistic per section with source attribution, 1 comparison table.

Return JSON:
{
  "title": "Compelling title with '${keyword}' — no year, evergreen (50-60 chars)",
  "headings": ["H2 heading 1", "H2 as question?", "H2 heading 3", "H2 as question?", "H2 heading 5", "Key Takeaways"],
  "subheadings": {"H2 heading 1": ["H3 sub-topic A", "H3 sub-topic B"]},
  "metaTitle": "SEO title with keyword near start (50-60 chars)",
  "metaDescription": "SEO description with keyword + CTA (120-160 chars)",
  "keywords": ["${keyword}", "secondary1", "secondary2", "secondary3"],
  "targetWordCount": ${contentType.targetWords},
  "angleDescription": "Brief description of the article's unique angle"
}`
        : `خطط مقالة عن "${keyword}" لـ ${site.name} (${site.destination}).
نوع المحتوى: ${contentType.labelAr || contentType.label} (${contentType.targetWords}+ كلمة).

هيكل: 5-7 عناوين H2 مع عناوين فرعية H3. عنوانان على الأقل كأسئلة. "نصائح رئيسية" كآخر H2.
الأصالة: تفاصيل حسية في كل قسم، 2-3 نصائح من الداخل، ملاحظة صادقة واحدة.

أرجع JSON:
{
  "title": "عنوان جذاب مع '${keyword}' (50-60 حرف)",
  "headings": ["عنوان فرعي 1", "سؤال؟", "عنوان فرعي 3", "سؤال؟", "نصائح رئيسية"],
  "subheadings": {},
  "metaTitle": "عنوان SEO (50-60 حرف)",
  "metaDescription": "وصف SEO مع CTA (120-160 حرف)",
  "keywords": ["${keyword}", "ثانوية1", "ثانوية2"],
  "targetWordCount": ${contentType.targetWords},
  "angleDescription": "وصف موجز لزاوية المقال"
}`;

      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt,
        maxTokens: 800,
        temperature: 0.7,
        timeoutMs: 50_000,
        taskType: "content_generation",
        calledFrom: "ai-generate:outline",
      });

      return NextResponse.json({
        success: true,
        phase: 1,
        keyword,
        language,
        outline: {
          title: result.title || keyword,
          headings: result.headings || [],
          subheadings: result.subheadings || {},
          metaTitle: result.metaTitle || "",
          metaDescription: result.metaDescription || "",
          keywords: result.keywords || [keyword],
          targetWordCount: result.targetWordCount || contentType.targetWords,
          angleDescription: result.angleDescription || "",
          pageType,
        },
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Phase 1 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 500 });
    }
  }

  // ─── PHASE 2A: WRITE FIRST HALF ─────────────────────────────────────
  // Writes the first half of the article headings (~1500 tokens, ~15-20s)
  if (action === "phase2a_write") {
    const keyword = body.keyword?.trim();
    const outline = body.outline;
    if (!keyword || !outline) {
      return NextResponse.json({ success: false, error: "Keyword and outline are required" }, { status: 400 });
    }

    try {
      const { generateJSON } = await import("@/lib/ai/provider");

      const systemPrompt = language === "en"
        ? `You are a luxury travel writer for "${site.name}" (${site.destination}). Write for international luxury travelers with special expertise for Arab/Gulf visitors. Include sensory details, insider tips, and honest observations. Never use: "nestled in the heart of", "whether you're a", "look no further", "in this comprehensive guide", "it's worth noting". Return only valid JSON.`
        : `أنت كاتب سفر فاخر لـ "${site.name}" (${site.destination}). اكتب للمسافرين الدوليين مع خبرة للمسافرين العرب. أضف تفاصيل حسية ونصائح. أعد JSON فقط.`;

      const allHeadings: string[] = outline.headings || [];
      const midpoint = Math.ceil(allHeadings.length / 2);
      const firstHalf = allHeadings.slice(0, midpoint);

      const headingsFormatted = firstHalf.map((h: string, i: number) => {
        const subs = outline.subheadings?.[h];
        if (subs && Array.isArray(subs) && subs.length > 0) {
          return `${i + 1}. ${h}\n${subs.map((s: string) => `   - ${s}`).join("\n")}`;
        }
        return `${i + 1}. ${h}`;
      }).join("\n");

      const prompt = language === "en"
        ? `Write the FIRST PART of an article about "${keyword}" for ${site.name} (${site.destination}).

Title: ${outline.title}
Keywords: ${(outline.keywords || [keyword]).join(", ")}

Write ONLY these sections (the remaining sections will be written separately):
${headingsFormatted}

REQUIREMENTS:
1. Opening paragraph: 50-80 words, mention "${keyword}" in first sentence, place the reader IN the experience with a sensory detail
2. Each H2 section: 200-300 words minimum
3. Each H2 opens with a 40-60 word direct answer paragraph (GEO citability — self-contained, citable by AI search)
4. HTML format: <h2>, <h3>, <p>, <ul>/<ol>, <a>
5. 1-2 internal links: <a href="/blog/RELATED-TOPIC">descriptive anchor text</a>
6. 1 affiliate link: <a href="https://booking.com/..." rel="nofollow sponsored">Book Now</a>
7. Short paragraphs (2-3 sentences max)
8. 1 insider tip with specific detail (price, address, time)
9. 1 statistic with source attribution (e.g. "according to Visit London")
10. NEVER use generic AI phrases: "nestled", "whether you're", "look no further", "it's worth noting"

AUTHENTICITY: Include 1 sensory detail (smell, sound, texture), 1 price in £, 1 specific time/day recommendation.

Return JSON:
{
  "body": "HTML content for the sections listed above"
}`
        : `اكتب الجزء الأول من مقالة عن "${keyword}" لـ ${site.name}.
اكتب هذه الأقسام فقط:
${headingsFormatted}

المتطلبات: 200-300 كلمة لكل قسم. كل H2 يبدأ بفقرة إجابة مباشرة 40-60 كلمة. تفاصيل حسية، نصائح محددة، إحصائية واحدة مع المصدر.

أرجع JSON:
{
  "body": "HTML محتوى الأقسام"
}`;

      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt,
        maxTokens: 1500,
        temperature: 0.7,
        timeoutMs: 50_000,
        taskType: "content_generation",
        calledFrom: "ai-generate",
      });

      const partBody = (result.body as string) || "";
      return NextResponse.json({
        success: true,
        phase: "2a",
        keyword,
        language,
        body: partBody,
        wordCount: countWords(partBody),
        sectionsWritten: firstHalf.length,
        totalSections: allHeadings.length,
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Phase 2a failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 500 });
    }
  }

  // ─── PHASE 2B: WRITE SECOND HALF ──────────────────────────────────────
  // Writes the second half of the article headings (~1500 tokens, ~15-20s)
  if (action === "phase2b_write") {
    const keyword = body.keyword?.trim();
    const outline = body.outline;
    const previousBody = body.previousBody || "";
    if (!keyword || !outline) {
      return NextResponse.json({ success: false, error: "Keyword and outline are required" }, { status: 400 });
    }

    try {
      const { generateJSON } = await import("@/lib/ai/provider");

      const systemPrompt = language === "en"
        ? `You are a luxury travel writer for "${site.name}" (${site.destination}). Write for international luxury travelers with special expertise for Arab/Gulf visitors. Include sensory details and honest observations. Never use: "nestled in the heart of", "whether you're a", "look no further", "in conclusion". Return only valid JSON.`
        : `أنت كاتب سفر فاخر لـ "${site.name}" (${site.destination}). اكتب للمسافرين الدوليين مع خبرة للمسافرين العرب. أعد JSON فقط.`;

      const allHeadings: string[] = outline.headings || [];
      const midpoint = Math.ceil(allHeadings.length / 2);
      const secondHalf = allHeadings.slice(midpoint);

      const headingsFormatted = secondHalf.map((h: string, i: number) => {
        const subs = outline.subheadings?.[h];
        if (subs && Array.isArray(subs) && subs.length > 0) {
          return `${midpoint + i + 1}. ${h}\n${subs.map((s: string) => `   - ${s}`).join("\n")}`;
        }
        return `${midpoint + i + 1}. ${h}`;
      }).join("\n");

      // Send a short preview of what was already written for continuity
      const prevPreview = previousBody.substring(0, 500);

      const prompt = language === "en"
        ? `Continue writing the SECOND PART of an article about "${keyword}" for ${site.name} (${site.destination}).

Title: ${outline.title}
Keywords: ${(outline.keywords || [keyword]).join(", ")}

Previously written (for continuity):
${prevPreview}...

Write ONLY these remaining sections:
${headingsFormatted}

REQUIREMENTS:
1. Continue naturally from where the first part left off
2. Each H2 section: 200-300 words minimum
3. Each H2 opens with a 40-60 word direct answer paragraph (GEO citability)
4. HTML format: <h2>, <h3>, <p>, <ul>/<ol>, <a>
5. 1-2 internal links: <a href="/blog/RELATED-TOPIC">descriptive anchor text</a>
6. 1 affiliate link: <a href="https://booking.com/..." rel="nofollow sponsored">Book Now</a>
7. End with "Key Takeaways" (3-5 bullet points) + clear CTA with booking link
8. Mention one honest limitation or caveat — imperfection signals authenticity
9. 1 statistic with source attribution
10. Include a comparison table (<table>) if comparing options/venues/hotels

AUTHENTICITY: 1 "we noticed" or "from our experience" phrase, 1 specific price in £, 1 specific address or landmark reference.

Return JSON:
{
  "body": "HTML content for the sections listed above"
}`
        : `أكمل الجزء الثاني من مقالة عن "${keyword}" لـ ${site.name}.
اكتب هذه الأقسام المتبقية:
${headingsFormatted}

المتطلبات: 200-300 كلمة لكل قسم. اختم بـ "نصائح رئيسية" + CTA. ملاحظة صادقة واحدة. إحصائية مع المصدر. جدول مقارنة إن أمكن.

أرجع JSON:
{
  "body": "HTML محتوى الأقسام"
}`;

      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt,
        maxTokens: 1500,
        temperature: 0.7,
        timeoutMs: 50_000,
        taskType: "content_generation",
        calledFrom: "ai-generate",
      });

      const partBody = (result.body as string) || "";
      // Combine both halves
      const fullBody = previousBody + "\n" + partBody;
      return NextResponse.json({
        success: true,
        phase: "2b",
        keyword,
        language,
        body: fullBody,
        wordCount: countWords(fullBody),
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Phase 2b failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 500 });
    }
  }

  // ─── PHASE 2 (legacy — kept for backward compat) ──────────────────────
  // Single-call full article write. May timeout on slow providers.
  if (action === "phase2_write") {
    const keyword = body.keyword?.trim();
    const outline = body.outline;
    if (!keyword || !outline) {
      return NextResponse.json({ success: false, error: "Keyword and outline are required" }, { status: 400 });
    }

    try {
      const { generateJSON } = await import("@/lib/ai/provider");
      const contentType = CONTENT_TYPES[outline.pageType] || CONTENT_TYPES.guide;

      const systemPrompt = language === "en"
        ? `You are a luxury travel writer for "${site.name}" (${site.destination}). Write for international luxury travelers with special expertise for Arab/Gulf visitors. Include sensory details, insider tips, statistics with sources, and honest observations. Never use: "nestled in the heart of", "whether you're a", "look no further". Each H2 opens with 40-60 word direct answer. Return only valid JSON.`
        : `أنت كاتب سفر فاخر لـ "${site.name}" (${site.destination}). اكتب للمسافرين الدوليين مع خبرة للمسافرين العرب. أعد JSON فقط.`;

      const headingsOutline = (outline.headings || []).map((h: string, i: number) => {
        const subs = outline.subheadings?.[h];
        if (subs && Array.isArray(subs) && subs.length > 0) {
          return `${i + 1}. ${h}\n${subs.map((s: string) => `   - ${s}`).join("\n")}`;
        }
        return `${i + 1}. ${h}`;
      }).join("\n");

      const prompt = language === "en"
        ? `Write a full article about "${keyword}" for ${site.name} (${site.destination}).

Title: ${outline.title}
Target: ${contentType.targetWords}+ words
Keywords: ${(outline.keywords || [keyword]).join(", ")}

OUTLINE:
${headingsOutline}

REQUIREMENTS:
1. Each H2 section: 200-300 words. HTML format: <h2>, <h3>, <p>, <ul>/<ol>, <a>
2. 3+ internal links, 2+ affiliate links, end with Key Takeaways + CTA
3. Keyword "${keyword}" in first paragraph and one H2

Return JSON:
{
  "body": "Full HTML article"
}`
        : `اكتب مقالة كاملة عن "${keyword}" لـ ${site.name}.
${headingsOutline}

أرجع JSON:
{
  "body": "HTML كامل"
}`;

      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt,
        maxTokens: 2000,
        temperature: 0.7,
        timeoutMs: 50_000,
        taskType: "content_generation",
        calledFrom: "ai-generate",
      });

      const articleBody = (result.body as string) || "";
      return NextResponse.json({
        success: true,
        phase: 2,
        keyword,
        language,
        body: articleBody,
        wordCount: countWords(articleBody),
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Phase 2 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 500 });
    }
  }

  // ─── PHASE 3: POLISH ──────────────────────────────────────────────────
  // Generates: excerpt, refined tags, FAQ questions, SEO score
  // Fast call (~500 output tokens, ~5-8s)
  if (action === "phase3_polish") {
    const keyword = body.keyword?.trim();
    const outline = body.outline;
    const articleBody = body.body;
    if (!keyword || !articleBody) {
      return NextResponse.json({ success: false, error: "Keyword and body are required" }, { status: 400 });
    }

    try {
      const { generateJSON } = await import("@/lib/ai/provider");
      const pageType = outline?.pageType || body.pageType || "guide";

      const systemPrompt = language === "en"
        ? `You are a senior SEO editor for "${site.name}". Analyze content and produce polished metadata. Return only valid JSON.`
        : `أنت محرر SEO أول لـ "${site.name}". حلل المحتوى وأنتج بيانات وصفية. أعد JSON فقط.`;

      // Send first 3000 chars of body for analysis (enough for SEO evaluation)
      const bodyPreview = articleBody.substring(0, 3000);
      const wc = countWords(articleBody);

      const prompt = language === "en"
        ? `Analyze this ${wc}-word article about "${keyword}" and produce SEO metadata.

Article preview:
${bodyPreview}${articleBody.length > 3000 ? "\n... [truncated]" : ""}

Existing meta title: ${outline?.metaTitle || ""}
Existing meta description: ${outline?.metaDescription || ""}

Return JSON:
{
  "excerpt": "Compelling excerpt for article cards (120-160 chars, include keyword)",
  "metaTitle": "Refined SEO title (50-60 chars, keyword near start)",
  "metaDescription": "Refined SEO description (120-160 chars, keyword + CTA)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "questions": ["FAQ question 1?", "FAQ question 2?", "FAQ question 3?"],
  "seoScore": 85,
  "improvements": ["what was improved 1", "what was improved 2"]
}`
        : `حلل هذه المقالة (${wc} كلمة) عن "${keyword}" وأنتج بيانات SEO.

معاينة المقال:
${bodyPreview}${articleBody.length > 3000 ? "\n... [اختصار]" : ""}

أرجع JSON:
{
  "excerpt": "مقتطف جذاب (120-160 حرف)",
  "metaTitle": "عنوان SEO (50-60 حرف)",
  "metaDescription": "وصف SEO (120-160 حرف)",
  "tags": ["وسم1", "وسم2", "وسم3"],
  "questions": ["سؤال1؟", "سؤال2؟"],
  "seoScore": 85,
  "improvements": ["تحسين 1", "تحسين 2"]
}`;

      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt,
        maxTokens: 600,
        temperature: 0.5,
        timeoutMs: 50_000,
        taskType: "content_generation",
        calledFrom: "ai-generate",
      });

      // Assemble final article content from all phases
      const isEn = language === "en";
      const title = (outline?.title as string) || keyword;
      const finalBody = articleBody;

      return NextResponse.json({
        success: true,
        phase: 3,
        keyword,
        language,
        content: {
          titleEn: isEn ? title : "",
          titleAr: isEn ? "" : title,
          bodyEn: isEn ? finalBody : "",
          bodyAr: isEn ? "" : finalBody,
          excerptEn: isEn ? (result.excerpt || "") : "",
          excerptAr: isEn ? "" : (result.excerpt || ""),
          metaTitleEn: isEn ? (result.metaTitle || outline?.metaTitle || "") : "",
          metaTitleAr: isEn ? "" : (result.metaTitle || outline?.metaTitle || ""),
          metaDescriptionEn: isEn ? (result.metaDescription || outline?.metaDescription || "") : "",
          metaDescriptionAr: isEn ? "" : (result.metaDescription || outline?.metaDescription || ""),
          tags: result.tags || [],
          keywords: outline?.keywords || [keyword],
          questions: result.questions || [],
          pageType,
          seoScore: typeof result.seoScore === "number" ? result.seoScore : 80,
        },
        wordCount: wc,
        improvements: result.improvements || [],
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Phase 3 failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 500 });
    }
  }

  // ─── EXPAND / FIX ────────────────────────────────────────────────────
  // Takes existing article content and expands it (adds sections, stats, affiliate links)
  // or fixes common issues (thin content, missing structure, generic phrases)
  if (action === "expand") {
    const articleBody = body.body || "";
    const keyword = body.keyword?.trim() || "";
    const targetWords = body.targetWords || 1500;
    const currentWords = countWords(articleBody);

    if (!articleBody || currentWords < 50) {
      return NextResponse.json({ success: false, error: "Article body is too short to expand. Use 'generate' for new articles." }, { status: 400 });
    }

    try {
      const { generateJSON } = await import("@/lib/ai/provider");

      const systemPrompt = language === "en"
        ? `You are a senior luxury travel editor for "${site.name}" (${site.destination}). Expand and improve existing articles for international luxury travelers. Add substance, statistics, insider tips, and affiliate links. Never use: "nestled in the heart of", "whether you're a", "look no further", "it's worth noting", "in conclusion". Return only valid JSON.`
        : `أنت محرر سفر فاخر أول لـ "${site.name}" (${site.destination}). وسّع وحسّن المقالات الحالية. أعد JSON فقط.`;

      // Truncate to fit prompt window
      const bodyPreview = articleBody.substring(0, 6000);

      const prompt = language === "en"
        ? `EXPAND this ${currentWords}-word article to ${targetWords}+ words. Topic: "${keyword || "luxury travel"}".

CURRENT ARTICLE:
${bodyPreview}${articleBody.length > 6000 ? "\n... [truncated]" : ""}

EXPANSION REQUIREMENTS:
1. Keep ALL existing content — do NOT remove or rewrite existing paragraphs
2. ADD 2-3 new H2 sections with 200-300 words each
3. ADD specific statistics with source attributions (e.g. "according to Visit London, 2025")
4. ADD 1-2 insider tips with prices in £ and specific addresses
5. ADD 1 comparison table (<table>) comparing top options
6. ADD 2+ affiliate links: <a href="https://booking.com/..." rel="nofollow sponsored">Book Now</a>
7. ADD 2+ internal links: <a href="/blog/RELATED-TOPIC">descriptive anchor</a>
8. Ensure "Key Takeaways" section exists at the end with 3-5 bullet points + CTA
9. Each new H2 opens with a 40-60 word direct answer paragraph (GEO citability)
10. ADD 1 honest caveat or limitation — imperfection signals authenticity

BANNED PHRASES: "nestled", "whether you're", "look no further", "it's worth noting", "in conclusion", "in this guide"

Return JSON:
{
  "body": "The FULL expanded HTML article (existing content + new sections)",
  "addedSections": ["Section name 1", "Section name 2"],
  "improvements": ["what was added/improved"]
}`
        : `وسّع هذه المقالة (${currentWords} كلمة) إلى ${targetWords}+ كلمة. الموضوع: "${keyword}".

المقالة الحالية:
${bodyPreview}${articleBody.length > 6000 ? "\n... [اختصار]" : ""}

أضف 2-3 أقسام H2 جديدة (200-300 كلمة لكل قسم)، إحصائيات مع المصدر، نصائح بأسعار، جدول مقارنة، روابط تابعة، روابط داخلية.

أرجع JSON:
{
  "body": "HTML المقالة الكاملة الموسّعة",
  "addedSections": ["اسم القسم 1"],
  "improvements": ["ما تم إضافته"]
}`;

      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt,
        maxTokens: language === "ar" ? 3500 : 2500,
        temperature: 0.6,
        timeoutMs: 50_000,
        taskType: "content_expansion",
        calledFrom: "ai-generate:expand",
      });

      const expandedBody = (result.body as string) || articleBody;
      return NextResponse.json({
        success: true,
        action: "expand",
        keyword,
        language,
        body: expandedBody,
        wordCount: countWords(expandedBody),
        previousWordCount: currentWords,
        addedSections: result.addedSections || [],
        improvements: result.improvements || [],
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: `Expand failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }, { status: 500 });
    }
  }

  // ─── GENERATE (legacy single-call) ────────────────────────────────────
  if (action === "generate") {
    const keyword = body.keyword; // optional manual keyword
    const pageType = body.pageType || "guide";

    let topic: TopicInfo;
    if (keyword) {
      topic = {
        id: null,
        keyword,
        longtails: body.longtails || [],
        questions: body.questions || [],
        pageType,
      };
    } else {
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

      // Single-language output — Arabic translation is deferred to content pipeline
      const isEn = language === "en";
      const title = (content.title as string) || "";
      const body = (content.body as string) || "";
      return NextResponse.json({
        success: true,
        topicId: topic.id,
        keyword: topic.keyword,
        language,
        content: {
          titleEn: isEn ? title : "",
          titleAr: isEn ? "" : title,
          bodyEn: isEn ? body : "",
          bodyAr: isEn ? "" : body,
          excerptEn: isEn ? (content.excerpt || "") : "",
          excerptAr: isEn ? "" : (content.excerpt || ""),
          metaTitleEn: isEn ? (content.metaTitle || "") : "",
          metaTitleAr: isEn ? "" : (content.metaTitle || ""),
          metaDescriptionEn: isEn ? (content.metaDescription || "") : "",
          metaDescriptionAr: isEn ? "" : (content.metaDescription || ""),
          tags: content.tags || [],
          keywords: content.keywords || [],
          questions: content.questions || [],
          pageType: content.pageType || pageType,
          seoScore: content.seoScore || 80,
        },
        wordCount: countWords(body),
      });
    } catch (err) {
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

    let slug = body.slug || titleEn
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80);

    // Slug dedup: append -2, -3, etc. if slug already exists (globally unique constraint)
    const baseSlug = slug;
    let suffix = 1;
    while (true) {
      const existing = await prisma.blogPost.findFirst({
        where: { slug, deletedAt: null },
      });
      if (!existing) break;
      suffix++;
      slug = `${baseSlug.substring(0, 76)}-${suffix}`;
      if (suffix > 10) {
        return NextResponse.json({
          success: false,
          error: `Slug "${baseSlug}" has 10+ duplicates. Use a more unique title.`,
        }, { status: 409 });
      }
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

    // Use type-specific word count threshold
    const { getThresholdsForPageType } = await import("@/lib/seo/standards");
    const thresholds = getThresholdsForPageType(body.pageType || "guide");

    if (shouldPublish && wordCount < thresholds.thinContentThreshold) {
      return NextResponse.json({
        success: false,
        error: `Article is only ${wordCount} words. Need ${thresholds.thinContentThreshold}+ to publish (type: ${body.pageType || "guide"}).`,
      }, { status: 400 });
    }

    // CRITICAL: title_ar and content_ar are required String fields in Prisma
    // Must provide non-null values — fallback to English content
    const blogPost = await prisma.blogPost.create({
      data: {
        title_en: titleEn,
        title_ar: body.titleAr || titleEn,
        excerpt_en: body.excerptEn || null,
        excerpt_ar: body.excerptAr || null,
        content_en: contentEn,
        content_ar: body.bodyAr || contentEn,
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
        seo_score: body.seoScore || 65, // Conservative default — don't inflate scores
        keywords_json: body.keywords || [],
        questions_json: body.questions || [],
      },
    });

    // Mark topic as published
    if (body.topicId) {
      await prisma.topicProposal.updateMany({
        where: { id: body.topicId },
        data: { status: "published" },
      }).catch((e: unknown) => console.warn("[ai-generate] Topic status update failed:", e));
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
  const siteConfig = getSiteConfig(siteId);
  if (!siteConfig) return { id: null, keyword: "", longtails: [], questions: [], pageType: "guide" };

  const templates = language === "en" ? siteConfig.topicsEN : siteConfig.topicsAR;
  if (!templates || templates.length === 0) return { id: null, keyword: "", longtails: [], questions: [], pageType: "guide" };

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000);
  const t = templates[dayOfYear % templates.length] as unknown as Record<string, unknown>;
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

  const contentType = CONTENT_TYPES[topic.pageType] || CONTENT_TYPES.guide;

  // Use a compact system prompt — the full site prompts are 500+ tokens each and the
  // content type guidelines already include quality requirements. Keep system prompt short
  // to maximize output tokens within the AI timeout window.
  const systemPrompt = language === "en"
    ? `You are a luxury travel writer for "${site.name}" (${site.destination}). Write for international luxury travelers with special expertise for Arab/Gulf visitors. Include sensory details, insider tips, and honest observations. Never use: "nestled in the heart of", "whether you're a", "look no further", "in this comprehensive guide", "it's worth noting". Each H2 must open with a 40-60 word direct answer (GEO citability). Include 1+ statistic with source per section. Return only valid JSON.`
    : `أنت كاتب سفر فاخر لـ "${site.name}" (${site.destination}). اكتب للمسافرين الدوليين مع خبرة للمسافرين العرب. أضف تفاصيل حسية ونصائح. كل H2 يبدأ بإجابة مباشرة 40-60 كلمة. أعد JSON فقط.`;

  const typeGuidelines = language === "en"
    ? contentType.promptGuidelinesEN
    : contentType.promptGuidelinesAR;

  const filledGuidelines = typeGuidelines
    .replace(/\{keyword\}/g, topic.keyword)
    .replace(/\{siteName\}/g, site.name)
    .replace(/\{destination\}/g, site.destination);

  // Generate ONLY in the requested language — bilingual doubles output tokens and causes
  // 504 timeouts. Arabic translation can be done separately by the content pipeline.
  const jsonSpec = language === "en"
    ? `

Secondary keywords: ${topic.longtails.join(", ") || "none"}
${topic.questions.length ? `\nAnswer these questions (use as headings):\n${topic.questions.map(q => `- ${q}`).join("\n")}` : ""}

Return JSON:
{
  "title": "Title with keyword (50-60 chars)",
  "body": "Full HTML (h2,h3,p,ul/ol,a). MINIMUM ${contentType.minWords} words.",
  "excerpt": "Excerpt (120-160 chars)",
  "metaTitle": "SEO title (50-60 chars)",
  "metaDescription": "SEO description (120-160 chars)",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "keywords": ["primary","secondary1","secondary2"],
  "questions": ["Q1?","Q2?","Q3?"],
  "pageType": "${topic.pageType}",
  "seoScore": 90
}`
    : `

أرجع JSON:
{
  "title": "عنوان (50-60 حرف)",
  "body": "HTML كامل (${contentType.minWords}+ كلمة)",
  "excerpt": "مقتطف (120-160 حرف)",
  "metaTitle": "عنوان SEO (50-60 حرف)",
  "metaDescription": "وصف SEO (120-160 حرف)",
  "tags": ["وسم1","وسم2","وسم3"],
  "keywords": ["رئيسية","ثانوية"],
  "questions": ["سؤال1؟","سؤال2؟"],
  "pageType": "${topic.pageType}",
  "seoScore": 90
}`;

  const prompt = filledGuidelines + jsonSpec;

  const result = await generateJSON<Record<string, unknown>>(prompt, {
    systemPrompt,
    maxTokens: 3000,
    temperature: 0.7,
    taskType: "content_generation",
    calledFrom: "ai-generate:fullWrite",
  });

  return result;
}

function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

export const POST = withAdminAuth(handlePost);
