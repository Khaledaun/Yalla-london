/**
 * PDF Guide Generator
 *
 * Generates professional PDF travel guides with resilient AI content generation.
 * Per-section AI calls with retry, article-based fallback, and rich default content.
 * Supports RTL Arabic layouts and multi-language content.
 */

import { prisma } from "@/lib/db";

export interface PDFGuideConfig {
  title: string;
  subtitle?: string;
  destination: string;
  locale: "ar" | "en";
  siteId: string;
  template: "luxury" | "budget" | "family" | "adventure" | "honeymoon";
  sections: PDFSection[];
  /** Cover image URL — featured image from article or Canva design */
  coverImageUrl?: string;
  /** Images extracted from article HTML for section illustrations */
  articleImages?: string[];
  /** Real affiliate/booking URL for CTA buttons */
  affiliateUrl?: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    siteName: string;
    contactEmail?: string;
    website?: string;
  };
  includeAffiliate?: boolean;
}

export interface PDFSection {
  type:
    | "intro"
    | "resorts"
    | "activities"
    | "dining"
    | "tips"
    | "packing"
    | "budget"
    | "itinerary"
    | "affiliate";
  title: string;
  content?: string;
  items?: PDFSectionItem[];
}

export interface PDFSectionItem {
  name: string;
  description: string;
  image?: string;
  price?: string;
  rating?: number;
  affiliateLink?: string;
}

export interface GeneratedPDF {
  id: string;
  url: string;
  filename: string;
  pages: number;
  size: number;
  createdAt: Date;
}

// ─── Section definitions for per-section AI generation ─────────────────────

interface SectionDef {
  type: PDFSection["type"];
  titleEn: string;
  titleAr: string;
  promptEn: (dest: string, style: string) => string;
  promptAr: (dest: string, style: string) => string;
  maxTokens: number;
}

const SECTION_DEFS: SectionDef[] = [
  {
    type: "intro",
    titleEn: "Introduction",
    titleAr: "مقدمة",
    promptEn: (dest, style) =>
      `Write a compelling 200-word introduction for a ${style} travel guide to ${dest}. ` +
      `Include what makes ${dest} special, the best time to visit, and what travelers can expect. ` +
      `Write in first person as if you've visited. Be specific with details.`,
    promptAr: (dest, style) =>
      `اكتب مقدمة جذابة من 200 كلمة لدليل سفر ${style} إلى ${dest}. ` +
      `تحدث عما يجعل ${dest} مميزة وأفضل وقت للزيارة. اكتب بأسلوب شخصي.`,
    maxTokens: 600,
  },
  {
    type: "resorts",
    titleEn: "Where to Stay",
    titleAr: "أين تقيم",
    promptEn: (dest, style) =>
      `List the top 5 hotels/resorts in ${dest} for ${style} travelers. ` +
      `For each: name, 2-sentence description, price range, and one insider tip. ` +
      `Format as numbered list. Include specific real hotel names.`,
    promptAr: (dest, style) =>
      `اذكر أفضل 5 فنادق/منتجعات في ${dest} للمسافرين بأسلوب ${style}. ` +
      `لكل فندق: الاسم، وصف من جملتين، نطاق السعر، ونصيحة. استخدم أسماء فنادق حقيقية.`,
    maxTokens: 800,
  },
  {
    type: "activities",
    titleEn: "Things to Do",
    titleAr: "أنشطة وتجارب",
    promptEn: (dest, style) =>
      `List the top 8 activities and experiences in ${dest} for ${style} travelers. ` +
      `For each: name, 1-2 sentence description, approximate cost, and best time to go. ` +
      `Include a mix of popular attractions and hidden gems. Format as numbered list.`,
    promptAr: (dest, style) =>
      `اذكر أفضل 8 أنشطة وتجارب في ${dest} للمسافرين بأسلوب ${style}. ` +
      `لكل نشاط: الاسم، وصف قصير، التكلفة التقريبية، وأفضل وقت. قائمة مرقمة.`,
    maxTokens: 800,
  },
  {
    type: "dining",
    titleEn: "Where to Eat",
    titleAr: "أين تأكل",
    promptEn: (dest, style) =>
      `Recommend 6 restaurants in ${dest} for ${style} travelers. ` +
      `Include: restaurant name, cuisine type, price range ($/$$/$$$), must-order dish, ` +
      `and whether halal options are available. Use real restaurant names. Format as numbered list.`,
    promptAr: (dest, style) =>
      `أوصِ بـ 6 مطاعم في ${dest} للمسافرين بأسلوب ${style}. ` +
      `لكل مطعم: الاسم، نوع المطبخ، نطاق السعر، الطبق المميز، وتوفر الحلال. قائمة مرقمة.`,
    maxTokens: 700,
  },
  {
    type: "tips",
    titleEn: "Travel Tips & Practical Info",
    titleAr: "نصائح السفر ومعلومات عملية",
    promptEn: (dest) =>
      `Provide 10 essential travel tips for visiting ${dest}. Cover: ` +
      `visa/entry, currency, transport, safety, tipping, local customs, best apps, ` +
      `common scams to avoid, emergency numbers, and one money-saving secret. ` +
      `Format as numbered list with bold tip titles.`,
    promptAr: (dest) =>
      `قدم 10 نصائح أساسية لزيارة ${dest}. تشمل: التأشيرة، العملة، المواصلات، ` +
      `الأمان، البقشيش، العادات المحلية، أفضل التطبيقات، الاحتيالات الشائعة، ` +
      `أرقام الطوارئ، وسر لتوفير المال. قائمة مرقمة.`,
    maxTokens: 700,
  },
  {
    type: "packing",
    titleEn: "Packing Checklist",
    titleAr: "قائمة التعبئة",
    // Packing list always uses the static checklist — no AI needed
    promptEn: () => "",
    promptAr: () => "",
    maxTokens: 0,
  },
];

/**
 * Generate a single section's content via AI with retry.
 * Returns null on failure (caller uses fallback).
 */
async function generateSectionWithRetry(
  prompt: string,
  maxTokens: number,
  timeoutMs: number,
  retries: number = 1,
): Promise<string | null> {
  const { generateText, isAIAvailable } = await import("@/lib/ai");
  if (!(await isAIAvailable())) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await generateText(prompt, {
        maxTokens,
        taskType: "content_generation",
        calledFrom: "pdf-generator-section",
        timeoutMs: Math.max(8_000, timeoutMs),
      });
      if (result && result.length > 50) return result;
    } catch (err) {
      console.warn(
        `[pdf-generator] Section AI attempt ${attempt + 1} failed:`,
        err instanceof Error ? err.message : String(err),
      );
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1_000));
      }
    }
  }
  return null;
}

/**
 * Try to pull content from published BlogPosts as a rich fallback.
 * Returns article-based sections if matching content exists.
 */
async function getArticleFallbackSections(
  destination: string,
  siteId: string,
  locale: "ar" | "en",
): Promise<PDFSection[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        siteId,
        published: true,
        content_en: { not: "" },
      },
      select: {
        title_en: true,
        title_ar: true,
        content_en: true,
        content_ar: true,
        category: { select: { name_en: true } },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    if (posts.length === 0) return [];

    // Find posts relevant to the destination
    const destLower = destination.toLowerCase();
    const relevant = posts.filter((p) => {
      const title = (p.title_en || "").toLowerCase();
      const content = (p.content_en || "").toLowerCase().slice(0, 500);
      return title.includes(destLower) || content.includes(destLower);
    });

    const source = relevant.length > 0 ? relevant : posts.slice(0, 3);
    const sections: PDFSection[] = [];

    for (const post of source.slice(0, 5)) {
      const contentField = locale === "ar" ? (post.content_ar || post.content_en) : post.content_en;
      const titleField = locale === "ar" ? (post.title_ar || post.title_en) : post.title_en;
      if (!contentField) continue;

      // Strip HTML and take first 1500 chars
      const plainText = contentField
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1500);

      if (plainText.length < 100) continue;

      sections.push({
        type: sections.length === 0 ? "intro" : "tips",
        title: titleField || "Guide",
        content: plainText,
      });
    }

    return sections;
  } catch (err) {
    console.warn("[pdf-generator] Article fallback query failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Generate PDF content using per-section AI calls with retry and layered fallback.
 *
 * Strategy:
 * 1. Try AI for each section independently (small prompts = faster, more reliable)
 * 2. If AI fails for a section, try pulling from published articles
 * 3. If no articles, use rich destination-specific static content
 *
 * @param budgetMs - total time budget in ms (default 40s)
 */
export async function generatePDFContent(
  destination: string,
  template: string,
  locale: "ar" | "en",
  budgetMs: number = 40_000,
): Promise<PDFSection[]> {
  const startTime = Date.now();
  const sections: PDFSection[] = [];
  let aiSuccessCount = 0;

  // Pre-fetch article fallback in parallel with first AI call
  const articleFallbackPromise = getArticleFallbackSections(destination, "yalla-london", locale);

  for (const def of SECTION_DEFS) {
    const elapsed = Date.now() - startTime;
    const remaining = budgetMs - elapsed;

    // Budget exhausted — use fallback for remaining sections
    if (remaining < 5_000) {
      console.warn(`[pdf-generator] Budget exhausted at section "${def.type}", using fallback for rest`);
      break;
    }

    const title = locale === "ar" ? def.titleAr : def.titleEn;

    // Packing list — always static, no AI needed
    if (def.type === "packing") {
      sections.push({ type: "packing", title, content: getDefaultPackingList(locale) });
      continue;
    }

    // Try AI generation with per-section timeout
    const sectionTimeout = Math.min(12_000, remaining - 3_000);
    const prompt = locale === "ar" ? def.promptAr(destination, template) : def.promptEn(destination, template);
    const aiContent = await generateSectionWithRetry(prompt, def.maxTokens, sectionTimeout, 1);

    if (aiContent) {
      sections.push({ type: def.type, title, content: aiContent });
      aiSuccessCount++;
    } else {
      // Section failed — will fill from fallback below
      sections.push({ type: def.type, title, content: "" });
    }
  }

  // Fill any empty sections from article fallback or rich static content
  const articleSections = await articleFallbackPromise;
  const staticFallback = getRichDefaultSections(destination, template, locale);

  for (let i = 0; i < sections.length; i++) {
    if (sections[i].content && sections[i].content!.length > 50) continue;
    if (sections[i].type === "packing") continue;

    // Try article fallback first
    const articleMatch = articleSections.find(
      (a) => a.content && a.content.length > 100,
    );
    if (articleMatch) {
      sections[i].content = articleMatch.content;
      // Remove used article so each section gets different content
      const idx = articleSections.indexOf(articleMatch);
      articleSections.splice(idx, 1);
      continue;
    }

    // Rich static fallback
    const staticMatch = staticFallback.find((s) => s.type === sections[i].type);
    if (staticMatch) {
      sections[i].content = staticMatch.content;
      if (staticMatch.items) sections[i].items = staticMatch.items;
    }
  }

  // Ensure we have at least the defined sections even if loop broke early
  const existingTypes = new Set(sections.map((s) => s.type));
  for (const def of SECTION_DEFS) {
    if (!existingTypes.has(def.type)) {
      const title = locale === "ar" ? def.titleAr : def.titleEn;
      if (def.type === "packing") {
        sections.push({ type: "packing", title, content: getDefaultPackingList(locale) });
      } else {
        const fallback = staticFallback.find((s) => s.type === def.type);
        sections.push({
          type: def.type,
          title,
          content: fallback?.content || "",
          items: fallback?.items,
        });
      }
    }
  }

  console.log(`[pdf-generator] Generated ${sections.length} sections: ${aiSuccessCount} AI, ${sections.length - aiSuccessCount} fallback (${Date.now() - startTime}ms)`);

  return sections;
}

/**
 * Rich default content that reads like a real guide — NOT placeholder text.
 * Used when AI fails for specific sections. Each section has enough content
 * to look professional in a PDF.
 */
function getRichDefaultSections(
  destination: string,
  template: string,
  locale: "ar" | "en",
): PDFSection[] {
  const dest = destination || "this destination";
  const isLuxury = template === "luxury" || template === "honeymoon";
  const isBudget = template === "budget";
  const isFamily = template === "family";

  if (locale === "ar") {
    return [
      {
        type: "intro",
        title: "مقدمة",
        content: `مرحباً بك في دليلك الشامل لزيارة ${dest}. ` +
          `تُعد ${dest} واحدة من أكثر الوجهات السياحية جاذبية في العالم، حيث تجمع بين التاريخ العريق والحداثة المبهرة. ` +
          `ستجد هنا كل ما تحتاج لمعرفته لتخطيط رحلة لا تُنسى — من أفضل الفنادق والمطاعم إلى الأنشطة الفريدة والنصائح العملية. ` +
          `أفضل أوقات الزيارة هي الربيع (مارس-مايو) والخريف (سبتمبر-نوفمبر) حيث يكون الطقس معتدلاً والأسعار أفضل من موسم الذروة. ` +
          `سواء كنت تسافر مع العائلة أو في رحلة رومانسية، فإن ${dest} لديها ما يناسب الجميع.`,
      },
      {
        type: "resorts",
        title: "أين تقيم",
        content: `يوفر ${dest} خيارات إقامة متنوعة تناسب جميع الميزانيات. ` +
          `للباحثين عن الفخامة، توجد فنادق خمس نجوم مع خدمات استثنائية تشمل مسابح خاصة وسبا وإطلالات خلابة. ` +
          `للميزانية المتوسطة، هناك فنادق بوتيك ساحرة في قلب المدينة. ` +
          `ننصح بالحجز مبكراً (قبل 3-6 أشهر) للحصول على أفضل الأسعار. ` +
          `تأكد من سؤال الفندق عن خيارات الإفطار الحلال وأوقات الصلاة القريبة.`,
        items: [
          { name: "فنادق فاخرة", description: "خدمة VIP، سبا، مطاعم عالمية — من $300/ليلة", rating: 5 },
          { name: "فنادق بوتيك", description: "تصميم فريد، موقع مركزي — من $150/ليلة", rating: 4.5 },
          { name: "شقق فندقية", description: "مطبخ خاص، مساحة أكبر للعائلات — من $100/ليلة", rating: 4.3 },
        ],
      },
      {
        type: "activities",
        title: "أنشطة وتجارب",
        content: `${dest} مليئة بالأنشطة التي تناسب جميع الأذواق. من المعالم التاريخية الشهيرة إلى التجارب الحديثة المثيرة. ` +
          `خصص على الأقل 3-5 أيام لاستكشاف أبرز المعالم. احجز التذاكر عبر الإنترنت لتجنب الطوابير الطويلة.`,
        items: [
          { name: "جولة في المعالم", description: "استكشف أشهر المعالم السياحية مع مرشد خاص" },
          { name: "تجربة الطعام المحلي", description: "جولة طعام في الأسواق والمطاعم التقليدية" },
          { name: "التسوق", description: "أفضل مناطق التسوق من الماركات العالمية إلى الأسواق التقليدية" },
          { name: "رحلات يومية", description: "اكتشف المناطق المحيطة في رحلات يومية مميزة" },
        ],
      },
      {
        type: "dining",
        title: "أين تأكل",
        content: `يتميز ${dest} بمشهد طعام متنوع يرضي جميع الأذواق. ` +
          `ستجد مطاعم عالمية فاخرة ومطاعم محلية أصيلة وخيارات حلال متعددة. ` +
          `ننصح بحجز المطاعم الفاخرة مسبقاً خاصة في عطلات نهاية الأسبوع. ` +
          `لا تفوت تجربة المطبخ المحلي — فهو جزء أساسي من تجربة السفر.`,
        items: [
          { name: "مطاعم فاخرة", description: "تجارب طعام استثنائية — $$$" },
          { name: "مطاعم حلال", description: "خيارات حلال معتمدة في مواقع مركزية" },
          { name: "أسواق الطعام", description: "تذوق الأطباق المحلية بأسعار معقولة" },
        ],
      },
      {
        type: "tips",
        title: "نصائح السفر",
        content: `نصائح أساسية لرحلة ناجحة إلى ${dest}:\n\n` +
          `1. التأشيرة: تحقق من متطلبات التأشيرة قبل السفر بشهرين على الأقل\n` +
          `2. العملة: استخدم بطاقات الائتمان حيثما أمكن وأحضر بعض النقد المحلي\n` +
          `3. المواصلات: تطبيقات النقل التشاركي متوفرة ومريحة\n` +
          `4. الطقس: احزم ملابس مناسبة للموسم واحمل دائماً مظلة صغيرة\n` +
          `5. التواصل: اشترِ شريحة SIM محلية عند الوصول للإنترنت\n` +
          `6. الأمان: احتفظ بنسخة من جواز السفر في هاتفك\n` +
          `7. البقشيش: تختلف ثقافة البقشيش — اسأل عند الوصول\n` +
          `8. التطبيقات: حمّل خرائط Google offline قبل السفر`,
      },
      {
        type: "packing",
        title: "قائمة التعبئة",
        content: getDefaultPackingList("ar"),
      },
    ];
  }

  return [
    {
      type: "intro",
      title: "Introduction",
      content: `Welcome to your comprehensive guide to ${dest}. ` +
        `${dest} is one of the world's most captivating destinations, seamlessly blending rich heritage with modern sophistication. ` +
        `This guide covers everything you need for an unforgettable trip — from the best hotels and restaurants to unique experiences and practical insider tips. ` +
        `The best times to visit are spring (March–May) and autumn (September–November) when the weather is pleasant and prices are below peak season rates. ` +
        (isLuxury ? `As a luxury traveler, you'll find world-class service and exclusive experiences at every turn. ` : "") +
        (isBudget ? `Smart travelers will find plenty of ways to experience ${dest} without breaking the bank. ` : "") +
        (isFamily ? `Families will love the kid-friendly attractions and welcoming atmosphere throughout ${dest}. ` : "") +
        `Whether you're visiting for the first time or returning for more, this guide will help you make the most of every moment.`,
    },
    {
      type: "resorts",
      title: "Where to Stay",
      content: `${dest} offers accommodation for every budget and travel style. ` +
        (isLuxury
          ? `Five-star hotels here deliver exceptional service with private pools, world-class spas, and stunning views. Expect to pay $300–800+ per night for top-tier luxury. `
          : isBudget
          ? `Great value can be found in boutique hotels and well-located guesthouses, typically $80–150 per night. `
          : `Mid-range to luxury options abound, with excellent boutique hotels from $150/night and five-star properties from $300/night. `) +
        `Book 3–6 months ahead for the best rates, especially during peak season. ` +
        `Ask hotels about halal breakfast options and nearby prayer facilities if needed.`,
      items: [
        { name: "Luxury Hotels", description: "5-star service, spa, fine dining — from $300/night", rating: 5 },
        { name: "Boutique Hotels", description: "Unique design, central location — from $150/night", rating: 4.5 },
        { name: "Serviced Apartments", description: "Kitchen, extra space for families — from $100/night", rating: 4.3 },
      ],
    },
    {
      type: "activities",
      title: "Things to Do",
      content: `${dest} is packed with activities for every interest. From iconic landmarks to hidden gems, ` +
        `plan at least 3–5 days to explore the highlights. Book tickets online in advance to skip long queues. ` +
        `Don't miss the local markets and neighborhood walks — they offer the most authentic experience.`,
      items: [
        { name: "Landmark Tour", description: "Visit the most famous attractions with a knowledgeable guide" },
        { name: "Local Food Experience", description: "A walking food tour through markets and traditional restaurants" },
        { name: "Shopping District", description: "From luxury brands to local artisan markets" },
        { name: "Day Trip", description: "Explore the surrounding regions on a guided day excursion" },
        { name: "Evening Experience", description: "Rooftop bars, shows, or sunset cruises" },
      ],
    },
    {
      type: "dining",
      title: "Where to Eat",
      content: `${dest} boasts a vibrant food scene ranging from Michelin-starred fine dining to authentic street food. ` +
        `Halal options are increasingly available — look for certified restaurants or Muslim-owned establishments. ` +
        `Reserve fine dining restaurants at least a week in advance, especially for weekend dinners. ` +
        `Don't miss the local specialties — they're what makes dining in ${dest} truly memorable.`,
      items: [
        { name: "Fine Dining", description: "World-class culinary experiences — $$$", rating: 5 },
        { name: "Halal Restaurants", description: "Certified halal options in central locations", rating: 4.5 },
        { name: "Food Markets", description: "Sample local dishes at great prices", rating: 4.7 },
        { name: "Afternoon Tea", description: "A quintessential local experience", rating: 4.4 },
      ],
    },
    {
      type: "tips",
      title: "Travel Tips & Practical Info",
      content: `Essential tips for a perfect trip to ${dest}:\n\n` +
        `1. Visa & Entry: Check visa requirements at least 2 months before your trip\n` +
        `2. Currency: Credit cards are widely accepted; carry some local cash for markets\n` +
        `3. Transport: Ride-sharing apps work well; public transport is efficient and affordable\n` +
        `4. Weather: Pack layers and always carry a compact umbrella\n` +
        `5. Connectivity: Buy a local SIM card at the airport for data\n` +
        `6. Safety: Keep a photo of your passport on your phone\n` +
        `7. Tipping: Check local customs — it varies by establishment\n` +
        `8. Apps: Download Google Maps offline before you travel\n` +
        `9. Timing: Visit popular attractions early morning or late afternoon to avoid crowds\n` +
        `10. Money-saving secret: Many museums offer free or discounted entry on certain days`,
    },
    {
      type: "packing",
      title: "Packing Checklist",
      content: getDefaultPackingList("en"),
    },
  ];
}

function getDefaultPackingList(locale: "ar" | "en"): string {
  if (locale === "ar") {
    return `
□ جواز السفر ونسخة منه
□ ملابس السباحة
□ واقي الشمس SPF 50+
□ نظارات شمسية
□ قبعة للحماية من الشمس
□ أحذية مائية
□ كاميرا تحت الماء
□ أدوية أساسية
□ مناشف خفيفة
□ ملابس خفيفة قطنية
    `.trim();
  }

  return `
□ Passport and copy
□ Swimwear
□ Sunscreen SPF 50+
□ Sunglasses
□ Sun hat
□ Water shoes
□ Underwater camera
□ Basic medications
□ Quick-dry towels
□ Light cotton clothing
  `.trim();
}

/**
 * Store PDF metadata in database as a DigitalProduct
 */
export async function storePDFRecord(
  config: PDFGuideConfig,
  filename: string,
  fileUrl: string,
  fileSize: number,
): Promise<string> {
  const slug = `${(config.destination || "guide").toLowerCase().replace(/\s+/g, "-")}-${config.template}-guide`;
  const product = await prisma.digitalProduct.upsert({
    where: { slug },
    update: {
      file_url: fileUrl,
      file_size: fileSize,
    },
    create: {
      name_en: config.title,
      name_ar: config.subtitle || config.title,
      slug,
      description_en: `Complete ${config.template} travel guide for ${config.destination}`,
      description_ar: `دليل سفر شامل لـ ${config.destination}`,
      price: 0,
      currency: "USD",
      product_type: "PDF_GUIDE",
      is_active: true,
      featured: false,
      file_url: fileUrl,
      file_size: fileSize,
      site_id: config.siteId,
      features_json: config as any,
    },
  });

  return product.id;
}

/**
 * Get PDF guides for a site (DigitalProducts with type PDF_GUIDE)
 */
export async function getPDFGuides(siteId?: string) {
  return prisma.digitalProduct.findMany({
    where: {
      product_type: "PDF_GUIDE",
      is_active: true,
      ...(siteId ? { site_id: siteId } : {}),
    },
    orderBy: { created_at: "desc" },
  });
}

/**
 * Track PDF download via Purchase record
 */
export async function trackDownload(productId: string, leadEmail?: string) {
  if (leadEmail) {
    // Find and increment download count on matching purchase
    const purchase = await prisma.purchase.findFirst({
      where: { product_id: productId, customer_email: leadEmail },
    });
    if (purchase) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { download_count: { increment: 1 } },
      });
    }
  }
}

/**
 * Generate HTML template for PDF rendering.
 *
 * Design: magazine-style layout with cover image, section images,
 * branded color accents, and professional typography.
 */
export function generatePDFHTML(config: PDFGuideConfig): string {
  const isRTL = config.locale === "ar";
  const direction = isRTL ? "rtl" : "ltr";
  const fontFamily = isRTL
    ? "'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif"
    : "'Source Serif 4', Georgia, serif";
  const headingFont = isRTL
    ? "'IBM Plex Sans Arabic', sans-serif"
    : "'Source Serif 4', Georgia, serif";
  const primary = config.branding.primaryColor;
  const secondary = config.branding.secondaryColor;
  const images = config.articleImages || [];
  const coverImg = config.coverImageUrl;
  const logoUrl = config.branding.logoUrl || "";
  const affiliateUrl = config.affiliateUrl || "#";

  // Build cover page — with image overlay or gradient
  const coverStyle = coverImg
    ? `background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${coverImg}') center/cover no-repeat;`
    : `background: linear-gradient(135deg, ${primary}, ${secondary});`;

  return `
<!DOCTYPE html>
<html lang="${config.locale}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;600;700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${fontFamily};
      font-size: 11pt;
      line-height: 1.7;
      color: #2a2a2a;
      direction: ${direction};
      background: #fff;
    }

    /* ── Cover ──────────────────────────────────── */
    .cover {
      height: 100vh;
      ${coverStyle}
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 60px 50px;
      color: white;
      page-break-after: always;
    }
    .cover-badge {
      display: inline-block;
      background: ${primary};
      color: white;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 6px 16px;
      border-radius: 2px;
      margin-bottom: 20px;
    }
    .cover h1 {
      font-family: ${headingFont};
      font-size: 34pt;
      font-weight: 700;
      line-height: 1.15;
      margin-bottom: 12px;
      text-shadow: 1px 1px 8px rgba(0,0,0,0.4);
    }
    .cover h2 {
      font-size: 14pt;
      font-weight: 300;
      opacity: 0.9;
      margin-bottom: 30px;
    }
    .cover-brand {
      font-size: 11pt;
      font-weight: 600;
      letter-spacing: 1px;
      opacity: 0.85;
      border-top: 1px solid rgba(255,255,255,0.3);
      padding-top: 16px;
    }

    /* ── Table of Contents ──────────────────────── */
    .toc {
      padding: 60px 50px;
      min-height: 100vh;
      page-break-after: always;
    }
    .toc h2 {
      font-family: ${headingFont};
      font-size: 22pt;
      color: ${primary};
      margin-bottom: 30px;
      padding-bottom: 12px;
      border-bottom: 3px solid ${primary};
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 12px 0;
      border-bottom: 1px dotted #ddd;
      font-size: 12pt;
    }
    .toc-item .num {
      color: ${primary};
      font-weight: 700;
      margin-${isRTL ? "left" : "right"}: 12px;
      min-width: 28px;
    }

    /* ── Content Pages ─────────────────────────── */
    .page {
      padding: 50px;
      min-height: 100vh;
      page-break-after: always;
    }

    .section-header {
      margin-bottom: 30px;
    }
    .section-num {
      font-size: 48pt;
      font-weight: 700;
      color: ${primary}20;
      line-height: 1;
    }
    .section-title {
      font-family: ${headingFont};
      font-size: 22pt;
      color: ${primary};
      margin-top: -12px;
      padding-bottom: 12px;
      border-bottom: 3px solid ${primary};
    }

    .section-image {
      width: 100%;
      max-height: 280px;
      object-fit: cover;
      border-radius: 8px;
      margin: 20px 0;
    }

    .content {
      font-size: 11pt;
      line-height: 1.8;
      text-align: justify;
      columns: ${isRTL ? "1" : "1"};
      column-gap: 30px;
    }
    .content p { margin-bottom: 12px; }

    /* ── Item Cards ────────────────────────────── */
    .item {
      background: #faf8f4;
      border-radius: 10px;
      padding: 20px;
      margin: 16px 0;
      border-${isRTL ? "right" : "left"}: 5px solid ${primary};
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .item-img {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
    }
    .item-body { flex: 1; }
    .item-name {
      font-size: 13pt;
      font-weight: 700;
      color: ${primary};
      margin-bottom: 4px;
    }
    .item-description {
      font-size: 10pt;
      color: #555;
      line-height: 1.5;
    }
    .item-meta {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 9pt;
      color: #777;
    }
    .item-meta .price {
      background: ${primary}15;
      color: ${primary};
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
    .rating { color: #f0a500; }

    /* ── Affiliate CTA ─────────────────────────── */
    .affiliate-box {
      background: linear-gradient(135deg, ${primary}10, ${secondary}10);
      border: 2px solid ${primary}30;
      border-radius: 12px;
      padding: 28px;
      margin: 28px 0;
      text-align: center;
    }
    .affiliate-box h3 {
      color: ${primary};
      font-size: 15pt;
      margin-bottom: 8px;
    }
    .affiliate-box p {
      color: #666;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    .cta-btn {
      display: inline-block;
      background: ${primary};
      color: white;
      padding: 12px 32px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 700;
      font-size: 11pt;
      letter-spacing: 0.5px;
    }

    /* ── Checklist ──────────────────────────────── */
    .checklist { list-style: none; padding: 0; }
    .checklist li {
      padding: 10px 0;
      padding-${isRTL ? "right" : "left"}: 32px;
      position: relative;
      border-bottom: 1px solid #f0f0f0;
    }
    .checklist li::before {
      content: '☐';
      position: absolute;
      ${isRTL ? "right" : "left"}: 0;
      color: ${primary};
      font-size: 14pt;
    }

    /* ── Back Cover ─────────────────────────────── */
    .back-cover {
      height: 100vh;
      background: linear-gradient(135deg, ${primary}, ${secondary});
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      color: white;
      padding: 60px;
    }
    .back-cover h2 {
      font-size: 16pt;
      font-weight: 300;
      margin-bottom: 12px;
      opacity: 0.9;
    }
    .back-cover h1 {
      font-size: 32pt;
      font-weight: 700;
      margin-bottom: 24px;
    }
    .back-cover p {
      font-size: 11pt;
      opacity: 0.8;
      margin: 4px 0;
    }
    .back-cover .divider {
      width: 60px;
      height: 2px;
      background: rgba(255,255,255,0.4);
      margin: 20px auto;
    }

    /* ── Footer ─────────────────────────────────── */
    .page-footer {
      position: fixed;
      bottom: 20px;
      ${isRTL ? "left" : "right"}: 40px;
      font-size: 8pt;
      color: #bbb;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    ${logoUrl ? `<img src="${logoUrl}" alt="${config.branding.siteName}" style="width: 80px; height: 80px; object-fit: contain; margin-bottom: 24px; border-radius: 12px;" />` : ""}
    <div class="cover-badge">${config.template.toUpperCase()} TRAVEL GUIDE</div>
    <h1>${config.title.replace(/ — PDF Guide$/, "")}</h1>
    ${config.subtitle ? `<h2>${config.subtitle}</h2>` : ""}
    <div class="cover-brand">${config.branding.siteName}${config.branding.website ? ` · ${config.branding.website.replace("https://", "")}` : ""}</div>
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h2>${isRTL ? "المحتويات" : "Contents"}</h2>
    ${config.sections.map((s, i) => `
    <div class="toc-item">
      <span><span class="num">${String(i + 1).padStart(2, "0")}</span> ${s.title}</span>
    </div>`).join("")}
  </div>

  <!-- Content Sections -->
  ${config.sections
    .map(
      (section, idx) => {
        const sectionImg = images[idx] || null;
        return `
    <div class="page">
      <div class="section-header">
        <div class="section-num">${String(idx + 1).padStart(2, "0")}</div>
        <h2 class="section-title">${section.title}</h2>
      </div>
      ${sectionImg ? `<img class="section-image" src="${sectionImg}" alt="${section.title}" />` : ""}
      ${section.content ? `<div class="content">${section.content.replace(/\n/g, "<br>")}</div>` : ""}
      ${
        section.items
          ? section.items
              .map(
                (item) => `
        <div class="item">
          ${item.image ? `<img class="item-img" src="${item.image}" alt="${item.name}" />` : ""}
          <div class="item-body">
            <div class="item-name">${item.name}</div>
            <div class="item-description">${item.description}</div>
            <div class="item-meta">
              ${item.rating ? `<span class="rating">${"★".repeat(Math.floor(item.rating))}${"☆".repeat(5 - Math.floor(item.rating))}</span>` : ""}
              ${item.price ? `<span class="price">${item.price}</span>` : ""}
            </div>
          </div>
        </div>`,
              )
              .join("")
          : ""
      }
      ${
        section.type === "affiliate" && config.includeAffiliate
          ? `
        <div class="affiliate-box">
          <h3>${isRTL ? "احجز الآن واحصل على أفضل الأسعار" : "Book Now & Get the Best Prices"}</h3>
          <p>${isRTL ? "شركاؤنا المعتمدون يقدمون عروضاً حصرية" : "Our trusted partners offer exclusive deals for our readers"}</p>
          <a href="${affiliateUrl}" class="cta-btn">${isRTL ? "احجز الآن" : "Book Now"}</a>
        </div>`
          : ""
      }
    </div>`;
      },
    )
    .join("")}

  <!-- Back Cover -->
  <div class="back-cover">
    ${logoUrl ? `<img src="${logoUrl}" alt="${config.branding.siteName}" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 24px; border-radius: 16px;" />` : ""}
    <h2>${isRTL ? "شكراً لاختيارك" : "Thank You for Choosing"}</h2>
    <h1>${config.branding.siteName}</h1>
    <div class="divider"></div>
    ${config.branding.website ? `<p><a href="${config.branding.website}" style="color: white; text-decoration: underline;">${config.branding.website.replace("https://", "")}</a></p>` : ""}
    ${config.branding.contactEmail ? `<p>${config.branding.contactEmail}</p>` : ""}
    ${affiliateUrl !== "#" ? `<div style="margin-top: 24px;"><a href="${affiliateUrl}" class="cta-btn">${isRTL ? "احجز رحلتك الآن" : "Book Your Trip Now"}</a></div>` : ""}
  </div>

  <div class="page-footer">${config.branding.siteName}</div>
</body>
</html>`.trim();
}

/**
 * Template configurations for different guide styles
 */
export const PDF_TEMPLATES = {
  luxury: {
    name: "Luxury",
    nameAr: "فاخر",
    primaryColor: "#8B7355",
    secondaryColor: "#C49A2A",
    description: "Premium design for luxury travelers",
  },
  budget: {
    name: "Budget-Friendly",
    nameAr: "اقتصادي",
    primaryColor: "#2E7D32",
    secondaryColor: "#4CAF50",
    description: "Practical guide for budget-conscious travelers",
  },
  family: {
    name: "Family",
    nameAr: "عائلي",
    primaryColor: "#1565C0",
    secondaryColor: "#42A5F5",
    description: "Kid-friendly travel guide",
  },
  adventure: {
    name: "Adventure",
    nameAr: "مغامرات",
    primaryColor: "#E65100",
    secondaryColor: "#FF9800",
    description: "Action-packed activities focus",
  },
  honeymoon: {
    name: "Honeymoon",
    nameAr: "شهر العسل",
    primaryColor: "#880E4F",
    secondaryColor: "#E91E63",
    description: "Romantic getaway guide",
  },
};
