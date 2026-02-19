/**
 * Content Pipeline — Phase Implementations
 *
 * Each phase runs independently within a single cron invocation (~53s budget).
 * Results are saved to the ArticleDraft table after each phase.
 * If a phase fails, it can be retried without re-running previous phases.
 *
 * Pipeline: research → outline → drafting → assembly → images → seo → scoring → reservoir
 *
 * Bilingual: EN and AR articles are generated as separate drafts with locale-native prompts.
 * Arabic articles use culturally adapted prompts, Gulf dialect, halal-first framing.
 */

import type { SiteConfig } from "@/config/sites";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PhaseResult {
  success: boolean;
  nextPhase: string;
  data: Record<string, unknown>;
  error?: string;
  aiModelUsed?: string;
}

export interface DraftRecord {
  id: string;
  site_id: string;
  keyword: string;
  locale: string;
  topic_title: string | null;
  current_phase: string;
  sections_completed: number;
  sections_total: number;
  research_data: Record<string, unknown> | null;
  outline_data: Record<string, unknown> | null;
  sections_data: Array<Record<string, unknown>> | null;
  assembled_html: string | null;
  assembled_html_alt: string | null;
  seo_meta: Record<string, unknown> | null;
  images_data: Record<string, unknown> | null;
  quality_score: number | null;
  seo_score: number | null;
  word_count: number | null;
  phase_attempts: number;
  topic_proposal_id: string | null;
  generation_strategy: string | null;
}

interface OutlineSection {
  heading: string;
  level: number;
  targetWords: number;
  keyPoints: string[];
  keywords: string[];
  linkOpportunities: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const isArabic = (locale: string) => locale === "ar";

/**
 * Returns locale-specific system prompt additions for Arabic content.
 * Arabic articles are NOT translations — they are original content with
 * Gulf-first cultural adaptation, Arabic sentence structure, and halal framing.
 */
function getLocaleDirectives(locale: string, site: SiteConfig): string {
  if (!isArabic(locale)) return "";

  return `

CRITICAL: Write ORIGINAL Arabic content — do NOT translate from English.
Use these mandatory Arabic content directives:

اللهجة: استخدم العربية الفصحى المعاصرة مع مصطلحات شائعة في الخليج.
العملة: اذكر الأسعار بالجنيه الاسترليني والدرهم الإماراتي (£150 / 690 د.إ تقريباً).

قواعد المحتوى العربي:
1. اكتب محتوى أصلياً — لا تترجم من الإنجليزية
2. استخدم ترتيب الجملة العربي الطبيعي (فعل + فاعل + مفعول)
3. نوّع في طول الجمل: جمل قصيرة مؤثرة مع جمل وصفية أطول
4. استخدم علامات الترقيم العربية: ، ؛ ؟ ! « »
5. اكتب الأرقام بالصيغة الغربية للأسعار (£150) والعربية للترتيب (الخيار ١)

التكيف الثقافي لـ ${site.destination}:
- اذكر خيارات الطعام الحلال وشهادات الاعتماد (HMC, HFA)
- أشر إلى قرب المساجد ومرافق الصلاة
- ركز على الخيارات المناسبة للعائلات
- تجنب ذكر الكحول — استبدل بالبدائل (مشروبات، عصائر طازجة، شاي فاخر)
- اذكر خيارات الملابس المحتشمة عند الحاجة

أسلوب الكتابة:
- نبرة فاخرة وموثوقة تليق بالجمهور المستهدف
- استخدم صوراً حسية (ما تراه، تشمه، تتذوقه) لوصف التجارب
- أضف "نصيحة من الداخل" واحدة على الأقل في كل قسم
- اختم بدعوة واضحة للعمل بالعربية

HTML MUST include dir="rtl" on the root element.`;
}

function getLocaleLabel(locale: string): string {
  return isArabic(locale) ? "Arabic (original, not translated)" : "English";
}

// ─── Phase 1: Research ───────────────────────────────────────────────────────

export async function phaseResearch(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const lang = getLocaleLabel(draft.locale);

  const prompt = `You are an SEO research analyst for "${site.name}" (${site.destination} luxury travel for Arab travelers).

Analyze the keyword "${draft.keyword}" and provide comprehensive research data for writing a high-quality ${lang} article.

Return JSON:
{
  "serpInsights": {
    "topCompetitorHeadings": ["heading1", "heading2", ...],
    "avgWordCount": 1500,
    "commonSubtopics": ["subtopic1", "subtopic2", ...],
    "contentGaps": ["gap1", "gap2", ...]
  },
  "targetAudience": {
    "searchIntent": "informational|transactional|navigational",
    "audienceNeeds": ["need1", "need2", ...],
    "painPoints": ["pain1", "pain2", ...]
  },
  "keywordData": {
    "primary": "${draft.keyword}",
    "secondary": ["kw1", "kw2", "kw3"],
    "longTail": ["long1", "long2", "long3", "long4", "long5"],
    "questions": ["q1", "q2", "q3", "q4"]
  },
  "contentStrategy": {
    "recommendedWordCount": 1800,
    "recommendedHeadings": 8,
    "toneGuidance": "luxury, authoritative, helpful for Arab travelers",
    "uniqueAngle": "what makes this article stand out from competitors",
    "affiliateOpportunities": ["opp1", "opp2"]
  }
}${isArabic(draft.locale) ? "\n\nAll headings, questions, and subtopics should be in Arabic." : ""}`;

  try {
    const research = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel SEO researcher for the ${site.destination} market targeting Arab travelers. Return only valid JSON. All string values must be properly escaped.${getLocaleDirectives(draft.locale, site)}`,
      maxTokens: isArabic(draft.locale) ? 2500 : 1500,
      temperature: 0.4,
    });

    return {
      success: true,
      nextPhase: "outline",
      data: { research_data: research },
      aiModelUsed: "auto",
    };
  } catch (error) {
    return {
      success: false,
      nextPhase: "research",
      data: {},
      error: error instanceof Error ? error.message : "Research phase failed",
    };
  }
}

// ─── Phase 2: Outline ────────────────────────────────────────────────────────

export async function phaseOutline(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const research = draft.research_data || {};
  const lang = getLocaleLabel(draft.locale);

  const prompt = `You are a content architect for "${site.name}" (${site.destination} luxury travel for Arab travelers).

Based on this research data, create a detailed article outline for a ${lang} article on "${draft.keyword}".

Research: ${JSON.stringify(research).substring(0, 2000)}

Return JSON:
{
  "title": "${isArabic(draft.locale) ? "عنوان المقال المحسّن لمحركات البحث (أقل من 60 حرف)" : "SEO-optimized article title (under 60 chars)"}",
  "sections": [
    {
      "heading": "${isArabic(draft.locale) ? "عنوان القسم H2" : "H2 heading text"}",
      "level": 2,
      "targetWords": 250,
      "keyPoints": ["point1", "point2", "point3"],
      "keywords": ["keyword to include naturally"],
      "linkOpportunities": ["internal link suggestion"]
    }
  ],
  "introduction": {
    "hook": "${isArabic(draft.locale) ? "جملة افتتاحية جذابة" : "Opening hook to grab attention"}",
    "targetWords": 150
  },
  "conclusion": {
    "callToAction": "${isArabic(draft.locale) ? "دعوة واضحة للعمل" : "CTA text"}",
    "targetWords": 150
  },
  "totalTargetWords": 1800,
  "affiliatePlacements": [
    {"section": 0, "type": "hotel|restaurant|activity", "context": "natural placement context"}
  ],
  "internalLinkPlan": [
    {"anchor": "anchor text", "targetTopic": "related article topic"}
  ],
  "schemaType": "Article"
}

${isArabic(draft.locale) ? "ALL headings, key points, and text MUST be in Arabic." : ""}`;

  try {
    const outline = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel content architect. Create structured, SEO-optimized outlines. Articles must have 6-10 sections, target 1500-2500 words, include 3+ internal link opportunities and 2+ affiliate placements. Return only valid JSON. All string values must be properly escaped.${getLocaleDirectives(draft.locale, site)}`,
      maxTokens: isArabic(draft.locale) ? 2500 : 1500,
      temperature: 0.5,
    });

    const sections = (outline.sections as OutlineSection[]) || [];
    return {
      success: true,
      nextPhase: "drafting",
      data: {
        outline_data: outline,
        topic_title: outline.title || draft.keyword,
        sections_total: sections.length,
        sections_completed: 0,
      },
      aiModelUsed: "auto",
    };
  } catch (error) {
    return {
      success: false,
      nextPhase: "outline",
      data: {},
      error: error instanceof Error ? error.message : "Outline phase failed",
    };
  }
}

// ─── Phase 3: Drafting (batch — up to 3 sections per invocation) ─────────────

export async function phaseDrafting(
  draft: DraftRecord,
  site: SiteConfig,
  budgetRemainingMs?: number,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const outline = (draft.outline_data || {}) as Record<string, unknown>;
  const sections = (outline.sections as OutlineSection[]) || [];
  let existingSections = [...((draft.sections_data || []) as Array<Record<string, unknown>>)];
  let currentIndex = draft.sections_completed;

  // Check if all sections are done
  if (currentIndex >= sections.length) {
    return {
      success: true,
      nextPhase: "assembly",
      data: {},
    };
  }

  // Batch: draft up to 3 sections per invocation if budget allows
  const maxSectionsThisRun = Math.min(3, sections.length - currentIndex);
  let sectionsWritten = 0;

  for (let i = 0; i < maxSectionsThisRun; i++) {
    // Check time budget — leave 10s buffer for DB save
    if (budgetRemainingMs !== undefined && budgetRemainingMs < 15_000) break;
    const sectionStart = Date.now();

    const sectionIdx = currentIndex + i;
    const section = sections[sectionIdx];
    if (!section) break;

    const isIntro = sectionIdx === 0;
    const isLast = sectionIdx === sections.length - 1;
    const intro = outline.introduction as Record<string, unknown> | undefined;
    const conclusion = outline.conclusion as Record<string, unknown> | undefined;

    const contextSections = existingSections
      .slice(-2)
      .map((s) => `[${s.heading}]: ${(s.content as string || "").substring(0, 200)}...`)
      .join("\n");

    const writeLang = isArabic(draft.locale) ? "Arabic" : "English";

    const prompt = `You are a luxury travel content writer for "${site.name}" (${site.destination}).

Write section ${sectionIdx + 1} of ${sections.length} for a ${writeLang} article about "${draft.keyword}".

Section heading: "${section.heading}" (H${section.level})
Target words: ${section.targetWords}
Key points to cover: ${JSON.stringify(section.keyPoints)}
Keywords to include naturally: ${JSON.stringify(section.keywords)}
${section.linkOpportunities?.length ? `Internal link opportunities: ${JSON.stringify(section.linkOpportunities)}` : ""}
${isIntro && intro ? `\nThis is the FIRST section. Start with this hook: "${intro.hook}"` : ""}
${isLast && conclusion ? `\nThis is the LAST section. End with CTA: "${conclusion.callToAction}"` : ""}
${contextSections ? `\nPrevious sections for context:\n${contextSections}` : ""}

Return JSON:
{
  "heading": "${section.heading}",
  "content": "<p>HTML content with proper formatting...</p>",
  "wordCount": ${section.targetWords},
  "keywords_used": ["kw1", "kw2"]
}

Write in ${writeLang}. Use HTML tags: h2, h3, p, ul, ol, li, strong, em. NO markdown.${isArabic(draft.locale) ? '\nAdd dir="rtl" to the root element. Use Arabic punctuation (، ؛ ؟).' : ""}`;

    try {
      const result = await generateJSON<Record<string, unknown>>(prompt, {
        systemPrompt: `You are a luxury travel writer for Arab travelers. Write engaging, detailed, SEO-optimized content. Use HTML formatting. Return only valid JSON. All string values must be properly escaped.${getLocaleDirectives(draft.locale, site)}`,
        maxTokens: isArabic(draft.locale) ? 2500 : 1500,
        temperature: 0.7,
      });

      existingSections = [...existingSections, {
        heading: result.heading || section.heading,
        content: result.content || "",
        wordCount: result.wordCount || 0,
        keywords_used: result.keywords_used || [],
        level: section.level || 2,
        index: sectionIdx,
      }];

      sectionsWritten++;
    } catch (error) {
      // If first section fails, report error. If later sections fail, save partial progress.
      if (sectionsWritten === 0) {
        return {
          success: false,
          nextPhase: "drafting",
          data: {},
          error: error instanceof Error ? error.message : "Drafting phase failed",
        };
      }
      break; // Save what we have
    }

    // Update remaining budget estimate
    if (budgetRemainingMs !== undefined) {
      budgetRemainingMs -= (Date.now() - sectionStart);
    }
  }

  const newCompleted = currentIndex + sectionsWritten;
  const allDone = newCompleted >= sections.length;

  return {
    success: true,
    nextPhase: allDone ? "assembly" : "drafting",
    data: {
      sections_data: existingSections,
      sections_completed: newCompleted,
    },
    aiModelUsed: "auto",
  };
}

// ─── Phase 4: Assembly ───────────────────────────────────────────────────────

export async function phaseAssembly(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const outline = (draft.outline_data || {}) as Record<string, unknown>;
  const sections = (draft.sections_data || []) as Array<Record<string, unknown>>;

  // Assemble raw HTML from sections
  const rtlAttr = isArabic(draft.locale) ? ' dir="rtl" lang="ar"' : ' lang="en"';
  let rawHtml = "";
  let totalWords = 0;
  for (const section of sections) {
    const heading = section.heading as string;
    const sectionLevel = ((section as Record<string, unknown>).level as number) || 2;
    const tag = `h${Math.min(Math.max(sectionLevel, 2), 4)}`;
    rawHtml += `<${tag}>${heading}</${tag}>\n${section.content || ""}\n\n`;
    totalWords += (section.wordCount as number) || 0;
  }

  const affiliatePlacements = (outline.affiliatePlacements as Array<Record<string, unknown>>) || [];
  const internalLinkPlan = (outline.internalLinkPlan as Array<Record<string, unknown>>) || [];

  const writeLang = isArabic(draft.locale) ? "Arabic" : "English";

  const prompt = `You are a senior editor for "${site.name}" (${site.destination} luxury travel).

Review and polish this assembled ${writeLang} article about "${draft.keyword}".

Raw article HTML (${totalWords} words, ${sections.length} sections):
${rawHtml.substring(0, 6000)}

Tasks:
1. Add smooth transitions between sections
2. Remove any repetition across sections
3. Ensure consistent tone (luxury, authoritative, helpful)
4. Add 3+ internal link placeholders as: <a href="/blog/TOPIC_SLUG" class="internal-link">anchor text</a>
5. Add ${affiliatePlacements.length || 2} affiliate placeholders as: <div class="affiliate-placeholder" data-type="TYPE">Affiliate recommendation block</div>
6. Ensure minimum 1,200 words total
7. Add a proper introduction if missing
8. Add a conclusion with CTA if missing
${isArabic(draft.locale) ? '9. Wrap the entire article in <article dir="rtl" lang="ar">...</article>\n10. Ensure all Arabic punctuation is correct (، ؛ ؟)' : ""}

Internal link targets: ${JSON.stringify(internalLinkPlan).substring(0, 500)}

Return JSON:
{
  "html": "<article${rtlAttr}>...full polished HTML...</article>",
  "wordCount": 1800,
  "internalLinksAdded": 3,
  "affiliatePlacementsAdded": 2,
  "transitionsAdded": 5,
  "issuesFixed": ["issue1", "issue2"]
}`;

  try {
    const result = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel senior editor. Polish articles for quality, coherence, and SEO. Maintain existing content but improve flow and add links. Return only valid JSON.${getLocaleDirectives(draft.locale, site)}`,
      maxTokens: 4096,
      temperature: 0.4,
    });

    return {
      success: true,
      nextPhase: "images",
      data: {
        assembled_html: result.html || rawHtml,
        word_count: result.wordCount || totalWords,
      },
      aiModelUsed: "auto",
    };
  } catch (error) {
    return {
      success: false,
      nextPhase: "assembly",
      data: {},
      error: error instanceof Error ? error.message : "Assembly phase failed",
    };
  }
}

// ─── Phase 5: Image Selection & Injection ────────────────────────────────────

export async function phaseImages(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const html = draft.assembled_html || "";
  const keyword = draft.keyword.toLowerCase();

  try {
    const { searchPhotos, getPhotosByCategory, allPhotos } = await import("@/data/photo-library");

    // Strategy 1: Search photo library by keyword
    let matched = searchPhotos(keyword);

    // Strategy 2: Search by individual keyword words
    if (matched.length < 4) {
      const words = keyword.split(/\s+/).filter((w) => w.length > 3);
      for (const word of words) {
        if (matched.length >= 6) break;
        const wordMatches = searchPhotos(word);
        for (const m of wordMatches) {
          if (!matched.find((e) => e.id === m.id)) matched.push(m);
        }
      }
    }

    // Strategy 3: Match by content category inference
    if (matched.length < 4) {
      const categoryMap: Record<string, string> = {
        restaurant: "restaurants-food", food: "restaurants-food", halal: "restaurants-food", dining: "restaurants-food",
        hotel: "hotels-luxury", luxury: "hotels-luxury", stay: "hotels-luxury", accommodation: "hotels-luxury",
        shopping: "shopping", mall: "shopping", market: "shopping", harrods: "shopping",
        landmark: "london-landmarks", bridge: "london-landmarks", palace: "london-landmarks", big: "london-landmarks",
        park: "parks-nature", garden: "parks-nature", hyde: "parks-nature",
        football: "football-stadiums", stadium: "football-stadiums", arsenal: "football-stadiums",
        event: "events-celebrations", ramadan: "events-celebrations", eid: "events-celebrations",
        tube: "transport", train: "transport", taxi: "transport", airport: "transport",
      };
      for (const [word, category] of Object.entries(categoryMap)) {
        if (keyword.includes(word) && matched.length < 6) {
          const catPhotos = getPhotosByCategory(category as any);
          for (const p of catPhotos) {
            if (!matched.find((e) => e.id === p.id)) matched.push(p);
          }
        }
      }
    }

    // Strategy 4: Unsplash API fallback (if library has < 3 matches and API key exists)
    let unsplashUsed = false;
    if (matched.length < 3 && process.env.UNSPLASH_ACCESS_KEY) {
      try {
        const unsplashResp = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(draft.keyword + " " + site.destination)}&per_page=5&orientation=landscape`,
          {
            headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
            signal: AbortSignal.timeout(8000),
          },
        );
        if (unsplashResp.ok) {
          const data = await unsplashResp.json();
          const unsplashPhotos = (data.results || []).map((p: any) => ({
            id: `unsplash-${p.id}`,
            url: p.urls?.regular || p.urls?.small,
            thumbnail: p.urls?.small || p.urls?.thumb,
            alt_en: p.alt_description || p.description || draft.keyword,
            alt_ar: draft.keyword, // Use keyword as Arabic alt
            category: "london-landmarks" as const,
            tags: (p.tags || []).map((t: any) => t.title).slice(0, 5),
            source: "unsplash" as const,
            photographer: p.user?.name,
            photographer_url: p.user?.links?.html,
            license: "unsplash" as const,
            width: p.width || 1920,
            height: p.height || 1280,
            usage_count: 0,
          }));
          matched = [...matched, ...unsplashPhotos];
          unsplashUsed = true;
        }
      } catch {
        // Unsplash failed — not fatal, use library photos only
      }
    }

    // Strategy 5: Random from general library if still no matches
    if (matched.length === 0 && allPhotos.length > 0) {
      const shuffled = [...allPhotos].sort(() => Math.random() - 0.5);
      matched = shuffled.slice(0, 4);
    }

    // Select: 1 featured + 2-3 inline
    const featured = matched[0] || null;
    const inline = matched.slice(1, 4);

    // Inject images into HTML
    let enrichedHtml = html;
    const altField = isArabic(draft.locale) ? "alt_ar" : "alt_en";

    if (featured) {
      // Add featured image at the top, after the first heading
      const firstHeadingEnd = enrichedHtml.match(/<\/h[12]>/i);
      if (firstHeadingEnd && firstHeadingEnd.index !== undefined) {
        const insertPos = firstHeadingEnd.index + firstHeadingEnd[0].length;
        const featuredImg = `\n<figure class="featured-image"><img src="${featured.url}" alt="${featured[altField]}" width="${featured.width}" height="${featured.height}" loading="eager" />${featured.photographer ? `<figcaption>Photo: ${featured.photographer}</figcaption>` : ""}</figure>\n`;
        enrichedHtml = enrichedHtml.slice(0, insertPos) + featuredImg + enrichedHtml.slice(insertPos);
      }
    }

    // Inject inline images after every 2nd-3rd h2
    if (inline.length > 0) {
      const h2Positions: number[] = [];
      const h2Regex = /<\/h2>/gi;
      let h2Match;
      while ((h2Match = h2Regex.exec(enrichedHtml)) !== null) {
        h2Positions.push(h2Match.index + h2Match[0].length);
      }

      // Insert images at evenly-spaced h2 positions (reverse order to maintain offsets)
      const spacing = Math.max(2, Math.floor(h2Positions.length / (inline.length + 1)));
      const insertPositions: Array<{ pos: number; photo: any }> = [];
      for (let i = 0; i < inline.length; i++) {
        const h2Idx = spacing * (i + 1);
        if (h2Idx < h2Positions.length) {
          insertPositions.push({ pos: h2Positions[h2Idx], photo: inline[i] });
        }
      }

      // Insert in reverse order
      for (const { pos, photo } of insertPositions.reverse()) {
        const inlineImg = `\n<figure class="inline-image"><img src="${photo.url}" alt="${photo[altField]}" width="${photo.width}" height="${photo.height}" loading="lazy" />${photo.photographer ? `<figcaption>Photo: ${photo.photographer}</figcaption>` : ""}</figure>\n`;
        enrichedHtml = enrichedHtml.slice(0, pos) + inlineImg + enrichedHtml.slice(pos);
      }
    }

    return {
      success: true,
      nextPhase: "seo",
      data: {
        assembled_html: enrichedHtml,
        images_data: {
          featured: featured ? { id: featured.id, url: featured.url, alt: featured[altField], photographer: featured.photographer } : null,
          inline: inline.map((p) => ({ id: p.id, url: p.url, alt: p[altField], photographer: p.photographer })),
          totalInjected: (featured ? 1 : 0) + inline.length,
          unsplashUsed,
          libraryMatches: matched.filter((m) => !m.id.startsWith("unsplash-")).length,
        },
      },
    };
  } catch (error) {
    // Image injection is non-fatal — proceed without images
    console.warn("[phases/images] Image injection failed (non-fatal):", error instanceof Error ? error.message : error);
    return {
      success: true,
      nextPhase: "seo",
      data: {
        images_data: { featured: null, inline: [], totalInjected: 0, error: "Image phase failed" },
      },
    };
  }
}

// ─── Phase 6: SEO Optimization ───────────────────────────────────────────────

export async function phaseSeo(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const research = draft.research_data || {};
  const outline = (draft.outline_data || {}) as Record<string, unknown>;
  const html = draft.assembled_html || "";
  const imagesData = (draft.images_data || {}) as Record<string, unknown>;
  const featured = imagesData.featured as Record<string, unknown> | null;

  const prompt = `You are a technical SEO specialist for "${site.name}" (${site.destination}).

Optimize this ${isArabic(draft.locale) ? "Arabic" : "English"} article's SEO metadata for the keyword "${draft.keyword}".

Article HTML (first 2000 chars): ${html.substring(0, 2000)}
Research data: ${JSON.stringify(research).substring(0, 1000)}
Schema type: ${(outline.schemaType as string) || "Article"}
${featured ? `Featured image URL: ${featured.url}` : ""}

Return JSON:
{
  "metaTitle": "${isArabic(draft.locale) ? "عنوان SEO أقل من 60 حرف يتضمن الكلمة المفتاحية" : "SEO title under 60 chars including keyword"}",
  "metaDescription": "${isArabic(draft.locale) ? "وصف ميتا 120-160 حرف مع الكلمة المفتاحية ودعوة للعمل" : "Meta description 120-160 chars with keyword and CTA"}",
  "slug": "url-friendly-slug-with-keyword",
  "keywords": ["primary", "secondary1", "secondary2", "longtail1", "longtail2"],
  "schema": {
    "@context": "https://schema.org",
    "@type": "${(outline.schemaType as string) || "Article"}",
    "headline": "Article title",
    "description": "Brief description",
    "author": {"@type": "Person", "name": "${site.name} Editorial"},
    "publisher": {"@type": "Organization", "name": "${site.name}"}${featured ? ',\n    "image": "' + (featured.url || "") + '"' : ""}
  },
  "ogImage": {
    "url": "${featured ? (featured.url || "") : ""}",
    "alt": "${featured ? (featured.alt || draft.keyword) : draft.keyword}"
  },
  "internalLinkSuggestions": ["topic1", "topic2", "topic3"],
  "seoChecklist": {
    "keywordInTitle": true,
    "keywordInFirstParagraph": true,
    "keywordInH2": true,
    "metaDescriptionLength": 155,
    "internalLinks": 3,
    "hasImages": ${(imagesData.totalInjected as number || 0) > 0}
  }
}`;

  try {
    const seoResult = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a technical SEO specialist for luxury travel. Optimize metadata for maximum search visibility. Return only valid JSON. All string values must be properly escaped.${isArabic(draft.locale) ? " Arabic meta tags should be in Arabic." : ""}`,
      maxTokens: isArabic(draft.locale) ? 1800 : 1200,
      temperature: 0.3,
    });

    return {
      success: true,
      nextPhase: "scoring",
      data: { seo_meta: seoResult },
      aiModelUsed: "auto",
    };
  } catch (error) {
    return {
      success: false,
      nextPhase: "seo",
      data: {},
      error: error instanceof Error ? error.message : "SEO phase failed",
    };
  }
}

// ─── Phase 7: Quality Scoring ────────────────────────────────────────────────

export async function phaseScoring(
  draft: DraftRecord,
): Promise<PhaseResult> {
  const html = draft.assembled_html || "";
  const seo = (draft.seo_meta || {}) as Record<string, unknown>;
  const wordCount = draft.word_count || 0;
  const imagesData = (draft.images_data || {}) as Record<string, unknown>;

  // Structural scoring (no AI needed — fast and deterministic)
  let seoScore = 0;

  // Word count scoring (max 25 points)
  if (wordCount >= 2000) seoScore += 25;
  else if (wordCount >= 1500) seoScore += 20;
  else if (wordCount >= 1200) seoScore += 15;
  else if (wordCount >= 800) seoScore += 10;
  else seoScore += 5;

  // Meta tags (max 20 points)
  const metaTitle = (seo.metaTitle as string) || "";
  const metaDesc = (seo.metaDescription as string) || "";
  if (metaTitle.length > 10 && metaTitle.length <= 60) seoScore += 10;
  else if (metaTitle.length > 0) seoScore += 5;
  if (metaDesc.length >= 120 && metaDesc.length <= 160) seoScore += 10;
  else if (metaDesc.length > 50) seoScore += 5;

  // Schema markup (max 10 points)
  if (seo.schema) seoScore += 10;

  // Heading structure (max 15 points)
  const h2Count = (html.match(/<h2/gi) || []).length;
  const h3Count = (html.match(/<h3/gi) || []).length;
  if (h2Count >= 4) seoScore += 10;
  else if (h2Count >= 2) seoScore += 5;
  if (h3Count >= 2) seoScore += 5;

  // Internal links (max 10 points)
  const internalLinks = (html.match(/class="internal-link"/gi) || []).length;
  if (internalLinks >= 3) seoScore += 10;
  else if (internalLinks >= 1) seoScore += 5;

  // Affiliate placements (max 5 points)
  const affiliates = (html.match(/class="affiliate-placeholder"/gi) || []).length;
  if (affiliates >= 2) seoScore += 5;
  else if (affiliates >= 1) seoScore += 3;

  // Images (max 10 points) — NEW
  const imageCount = (imagesData.totalInjected as number) || 0;
  if (imageCount >= 3) seoScore += 10;
  else if (imageCount >= 1) seoScore += 5;

  // Keywords in content (max 5 points)
  const keywords = (seo.keywords as string[]) || [];
  const primaryKw = keywords[0] || "";
  if (primaryKw && html.toLowerCase().includes(primaryKw.toLowerCase())) seoScore += 5;

  const qualityScore = Math.min(100, seoScore);

  // Readability estimate
  const plainText = html.replace(/<[^>]+>/g, "");
  const sentences = plainText.split(/[.!?؟。]+/).filter(Boolean);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
    : 0;
  const readabilityScore = avgSentenceLength <= 20 ? 85 : avgSentenceLength <= 25 ? 70 : 55;

  // Content depth
  const contentDepthScore = Math.min(100, h2Count * 10 + h3Count * 5 + (wordCount / 30));

  // Quality gate: 60+ → reservoir, else rejected (aligned with CONTENT_QUALITY.qualityGateScore)
  const nextPhase = qualityScore >= 60 ? "reservoir" : "rejected";

  return {
    success: true,
    nextPhase,
    data: {
      quality_score: qualityScore,
      seo_score: seoScore,
      readability_score: readabilityScore,
      content_depth_score: contentDepthScore,
      word_count: wordCount,
    },
  };
}

// ─── Phase dispatcher ────────────────────────────────────────────────────────

export async function runPhase(
  draft: DraftRecord,
  site: SiteConfig,
  budgetRemainingMs?: number,
): Promise<PhaseResult> {
  switch (draft.current_phase) {
    case "research":
      return phaseResearch(draft, site);
    case "outline":
      return phaseOutline(draft, site);
    case "drafting":
      return phaseDrafting(draft, site, budgetRemainingMs);
    case "assembly":
      return phaseAssembly(draft, site);
    case "images":
      return phaseImages(draft, site);
    case "seo":
      return phaseSeo(draft, site);
    case "scoring":
      return phaseScoring(draft);
    default:
      return {
        success: false,
        nextPhase: draft.current_phase,
        data: {},
        error: `Unknown phase: ${draft.current_phase}`,
      };
  }
}
