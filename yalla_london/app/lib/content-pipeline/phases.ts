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

إشارات المصداقية (مطلوبة — تحديث جوجل يناير 2026):
- استخدم عبارات تدل على التجربة المباشرة: "زرنا"، "جربنا"، "خلال زيارتنا الأخيرة"، "من تجربتنا"
- أضف 2-3 "نصيحة" أو "نصيحتنا" في كل مقال — معلومات لا يعرفها إلا من زار المكان
- اذكر تفاصيل حسية محددة: "رائحة الهيل تملأ المكان"، "أجواء المطعم كانت..."
- اذكر جانباً سلبياً أو ملاحظة صريحة واحدة على الأقل — الصدق يعزز المصداقية
- لا تستخدم: "في عالم اليوم"، "في الختام"، "في هذا الدليل الشامل"، "سواء كنت... أو"

IMPORTANT: Use SINGLE QUOTES for ALL HTML attributes (e.g., <a href='https://...'> NOT <a href="https://...">). Double quotes inside HTML will break JSON output.`;
}

function getLocaleLabel(locale: string): string {
  return isArabic(locale) ? "Arabic (original, not translated)" : "English";
}

// ─── Phase 1: Research ───────────────────────────────────────────────────────

export async function phaseResearch(
  draft: DraftRecord,
  site: SiteConfig,
  budgetRemainingMs?: number,
): Promise<PhaseResult> {
  // ─── Skip AI if research_data was pre-populated (e.g., from topic-research API) ──
  // When drafts are created via "Research & Create" in the cockpit, they arrive
  // with research_data already populated from the AI topic research. Skipping the
  // research AI call saves ~15s per article and preserves the user-selected content angle.
  const existing = draft.research_data as Record<string, unknown> | null;
  if (existing && (existing as Record<string, unknown>)._prePopulated === true) {
    console.log(`[phases/research] Draft ${draft.id} has pre-populated research — skipping AI call`);
    return {
      success: true,
      nextPhase: "outline",
      data: { research_data: existing },
      aiModelUsed: "pre-populated",
    };
  }

  // Budget guard: need at least 12s for AI call + DB save
  if (budgetRemainingMs !== undefined && budgetRemainingMs < 12_000) {
    return { success: false, nextPhase: "research", data: {}, error: `Budget too low (${Math.round(budgetRemainingMs / 1000)}s remaining) — will retry next run` };
  }
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
    const researchTimeout = budgetRemainingMs !== undefined ? Math.max(budgetRemainingMs - 5_000, 10_000) : 25_000;
    const research = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel SEO researcher for the ${site.destination} market targeting Arab travelers. Return only valid JSON. All string values must be properly escaped.${getLocaleDirectives(draft.locale, site)}`,
      maxTokens: isArabic(draft.locale) ? 2500 : 1500,
      temperature: 0.4,
      timeoutMs: researchTimeout,
      phaseBudgetHint: 'light',
      siteId: draft.site_id,
      taskType: "content_research",
      calledFrom: "phases/research",
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
  budgetRemainingMs?: number,
): Promise<PhaseResult> {
  // Budget guard: need at least 12s for AI call + DB save
  if (budgetRemainingMs !== undefined && budgetRemainingMs < 12_000) {
    return { success: false, nextPhase: "outline", data: {}, error: `Budget too low (${Math.round(budgetRemainingMs / 1000)}s remaining) — will retry next run` };
  }
  const { generateJSON } = await import("@/lib/ai/provider");
  const research = draft.research_data || {};
  const seoMeta = (draft.seo_meta || {}) as Record<string, unknown>;
  const lang = getLocaleLabel(draft.locale);

  // Extract pre-populated metadata from topic research (if available)
  const researchKwd = (research as Record<string, unknown>).keywordData as Record<string, unknown> | undefined;
  const longTails = (seoMeta.longTails as string[]) || (researchKwd?.longTail as string[]) || [];
  const questions = (seoMeta.questions as string[]) || (researchKwd?.questions as string[]) || [];
  const contentAngle = (seoMeta.contentAngle as string) || ((research as Record<string, unknown>).contentStrategy as Record<string, unknown>)?.uniqueAngle || "";

  // Build enrichment clause only if pre-populated data exists
  const enrichment = (longTails.length > 0 || questions.length > 0 || contentAngle)
    ? `\n\nPRE-RESEARCHED GUIDANCE (incorporate these):${
      longTails.length > 0 ? `\n- Target long-tail keywords: ${longTails.slice(0, 5).join(", ")}` : ""
    }${
      questions.length > 0 ? `\n- Answer these questions in dedicated sections: ${questions.slice(0, 4).join("; ")}` : ""
    }${
      contentAngle ? `\n- Content angle: ${contentAngle}` : ""
    }`
    : "";

  const prompt = `You are a content architect for "${site.name}" (${site.destination} luxury travel for Arab travelers).

Based on this research data, create a detailed article outline for a ${lang} article on "${draft.keyword}".${enrichment}

Research: ${JSON.stringify(research).substring(0, 2000)}

Return JSON:
{
  "title": "${isArabic(draft.locale) ? "عنوان المقال هنا" : "Your article title here"}",
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
    const outlineTimeout = budgetRemainingMs !== undefined ? Math.max(budgetRemainingMs - 5_000, 10_000) : 25_000;
    const outline = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel content architect. Create structured, SEO-optimized outlines. Articles must have 6-10 sections, target 1500-2500 words, include 3+ internal link opportunities and 2+ affiliate placements. CRITICAL: Never include years in article titles. Keep titles timeless and evergreen. Each H2 section MUST begin with a 40-60 word direct answer before any lists or detailed explanations — this is essential for AI search engine citations.

AUTHENTICITY PLANNING (Jan 2026 Google Authenticity Update):
- For each section, include at least 1 keyPoint that is a specific sensory or experiential detail (what you see/smell/taste/hear at the location)
- Include at least 1 "insider tip" keyPoint per section (something only a visitor would know)
- Plan at least 1 section with an honest caveat or limitation (signals authenticity to Google)
- Plan for price-specific details (£/€/$ amounts) in at least 3 sections
${isArabic(draft.locale) ? "- For Arabic: plan insider tips as نصيحة/نصيحتنا and sensory details using رائحة/مذاق/أجواء" : ""}
Return only valid JSON. All string values must be properly escaped.${getLocaleDirectives(draft.locale, site)}`,
      maxTokens: isArabic(draft.locale) ? 2500 : 1500,
      temperature: 0.5,
      timeoutMs: outlineTimeout,
      phaseBudgetHint: 'medium',
      siteId: draft.site_id,
      taskType: "content_outline",
      calledFrom: "phases/outline",
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

  // Load per-site workflow directives from SiteSettings (cockpit-configurable)
  let workflowDirective = "";
  try {
    const { prisma } = await import("@/lib/db");
    const wfSettings = await prisma.siteSettings.findUnique({
      where: { siteId_category: { siteId: draft.site_id, category: "workflow" } },
    });
    if (wfSettings?.enabled) {
      const wf = wfSettings.config as Record<string, unknown>;
      const parts: string[] = [];
      if (wf.contentTone) parts.push(`Tone: ${wf.contentTone}`);
      if (wf.targetAudience) parts.push(`Audience: ${wf.targetAudience}`);
      if (wf.brandVoiceNotes) parts.push(`Voice: ${wf.brandVoiceNotes}`);
      if (wf.instructions) parts.push(String(wf.instructions));
      if (parts.length > 0) workflowDirective = " " + parts.join(". ") + ".";
    }
  } catch (wfErr) {
    console.warn("[phases/drafting] Workflow settings load failed:", wfErr instanceof Error ? wfErr.message : wfErr);
  }

  // Cap to 1 section per invocation — each AI call takes ~30s,
  // and the cron has a 53s budget. 3 sections × 30s = 90s > 60s Vercel limit.
  // Build-runner picks up the draft again on next run for the next section.
  const maxSectionsThisRun = Math.min(1, sections.length - currentIndex);
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

    // Circuit breaker: after 1+ failed attempts, use a minimal prompt with lower
    // token count. The full prompt consistently times out even with 30s per provider
    // (too many instructions + 2000-3500 maxTokens). Minimal prompt succeeds reliably
    // in ~10s. Better to get 150-word sections that can be expanded later than to
    // loop indefinitely on timeouts.
    const attempts = draft.phase_attempts || 0;
    const useMinimalPrompt = attempts >= 1;

    const minWordsPerSection = useMinimalPrompt ? 150 : Math.max(section.targetWords || 0, 250);

    const prompt = useMinimalPrompt
      ? `Write a ${writeLang} section about "${section.heading}" for an article on "${draft.keyword}".
${minWordsPerSection}+ words. Use HTML tags (p, ul, li, strong). ${isArabic(draft.locale) ? "Use Arabic punctuation." : ""}
Return JSON: {"heading":"${section.heading}","content":"<p>...</p>","wordCount":${minWordsPerSection},"keywords_used":[]}`
      : `You are a luxury travel content writer for "${site.name}" (${site.destination}).

Write section ${sectionIdx + 1} of ${sections.length} for a ${writeLang} article about "${draft.keyword}".

Section heading: "${section.heading}" (H${section.level})
MINIMUM words for this section: ${minWordsPerSection} — you MUST write at least ${minWordsPerSection} words of real content.
Key points to cover: ${JSON.stringify(section.keyPoints)}
Keywords to include naturally: ${JSON.stringify(section.keywords)}
${section.linkOpportunities?.length ? `Internal link opportunities: ${JSON.stringify(section.linkOpportunities)}` : ""}
${isIntro && intro ? `\nThis is the FIRST section. Start with this hook: "${intro.hook}"` : ""}
${isLast && conclusion ? `\nThis is the LAST section. End with CTA: "${conclusion.callToAction}"` : ""}
${contextSections ? `\nPrevious sections for context:\n${contextSections}` : ""}

WRITING REQUIREMENTS (mandatory):
- Write ${minWordsPerSection}–${minWordsPerSection + 150} words of detailed, specific content
- Include at least 2 concrete facts, prices, names, or practical details readers can act on
- Use sensory language and specific local knowledge — avoid generic travel-brochure phrases
- Structure with short paragraphs (2–4 sentences each) and use <ul>/<li> for tips or lists
- NO phrases like "look no further", "in this section we will", "in conclusion", or "whether you're a"

AUTHENTICITY REQUIREMENTS (mandatory — Jan 2026 Google Authenticity Update):
- Include at least 1 "insider tip" or "local tip" per section (e.g., "Insider tip: ask the concierge for...")
- Add a specific sensory detail: what you see, smell, taste, or hear (e.g., "the aroma of freshly ground Turkish coffee fills the lobby")
- Reference a specific real detail: exact street name, floor number, opening time, or price in £/€/$
- Use phrases like "we visited", "we tried", "on our last visit", "what surprised us" — these signal first-hand experience to Google
- Include one honest caveat or limitation (e.g., "The only downside is the 20-minute wait during peak hours")
- NEVER write generic summaries — every paragraph must contain at least one specific, verifiable detail

CRITICAL FACTUAL ACCURACY RULE:
- NEVER invent or fabricate venue names, restaurant names, hotel names, or business names
- Only mention real, verifiable businesses that actually exist at the time of writing
- If unsure whether a venue exists, DO NOT mention it — use general descriptions instead
- Every restaurant, hotel, attraction, or business named must be a real establishment
- For lists (hotels, restaurants, spas): include the real address or website URL for each venue
- Violation of this rule makes the entire article unusable and harmful to site trust

Return JSON:
{
  "heading": "${section.heading}",
  "content": "<p>HTML content with proper formatting...</p>",
  "wordCount": ${minWordsPerSection},
  "keywords_used": ["kw1", "kw2"]
}

Write in ${writeLang}. Use HTML tags: h2, h3, p, ul, ol, li, strong, em. NO markdown.
IMPORTANT: Use SINGLE QUOTES for ALL HTML attributes (e.g., <a href='https://...'> NOT <a href="https://...">). Double quotes in HTML attributes will break JSON parsing.${isArabic(draft.locale) ? '\nUse Arabic punctuation (، ؛ ؟). Do NOT add dir="rtl" or lang attributes to any HTML element — the outer wrapper adds them automatically.' : ""}

CRITICAL JSON RULES:
- Return ONLY valid JSON. No markdown fences, no comments.
- All newlines inside string values MUST be escaped as \\n
- All double quotes inside string values MUST be escaped as \\"
- Do NOT use actual line breaks inside JSON string values.`;

    if (useMinimalPrompt) {
      console.log(`[drafting] Circuit breaker active for draft ${draft.id} section ${sectionIdx + 1} (attempt ${attempts}) — using minimal prompt`);
    }

    // Per-section retry: if JSON parse fails on first try, retry once.
    // This handles transient AI output issues (especially Arabic with dir attributes).
    // No retries for drafting sections — a timeout retry with less budget just
    // times out again, wasting the entire remaining budget. Better to save partial
    // progress and let the next cron run continue from where we left off.
    const maxSectionRetries = 1;
    let sectionSuccess = false;

    for (let retry = 0; retry < maxSectionRetries; retry++) {
      try {
        // Drafting generates the most tokens (3500 for Arabic) and needs adequate time.
        // Arabic at ~100 tok/s needs 35s+ for 3500 tokens. Previous 35s cap left only
        // ~20s per provider after 60/40 split — too tight. Now 48s cap so first provider
        // gets 65% = ~30s, enough for a full Arabic section.
        const rawTimeout = budgetRemainingMs !== undefined ? Math.max(budgetRemainingMs - 3_000, 10_000) : 45_000;
        const sectionTimeout = Math.min(rawTimeout, 48_000);
        const result = await generateJSON<Record<string, unknown>>(prompt, {
          systemPrompt: `You are a luxury travel writer for Arab travelers. Write engaging, detailed, SEO-optimized content with genuine depth and specific local knowledge. Each section must meet the minimum word count. Use HTML formatting. Return ONLY valid JSON — all string values must have newlines escaped as \\n and quotes escaped as \\". Never include raw line breaks inside JSON string values.${workflowDirective}${getLocaleDirectives(draft.locale, site)}`,
          maxTokens: useMinimalPrompt ? 1000 : (isArabic(draft.locale) ? 2500 : 1500),
          temperature: 0.7,
          timeoutMs: sectionTimeout,
          phaseBudgetHint: 'heavy',
          siteId: draft.site_id,
          taskType: `content_drafting_s${i + 1}`,
          calledFrom: useMinimalPrompt ? "phases/drafting-minimal" : "phases/drafting",
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
        sectionSuccess = true;

        // Immediately checkpoint to DB — prevents data loss on timeout/crash.
        // If this fails, the section data is still in memory for the final save.
        try {
          const { prisma } = await import("@/lib/db");
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              sections_data: existingSections as any,
              sections_completed: currentIndex + sectionsWritten,
              updated_at: new Date(),
            },
          });
        } catch (saveErr) {
          console.warn(`[drafting] Section ${sectionIdx + 1} checkpoint save failed (will retry at phase end):`, saveErr instanceof Error ? saveErr.message : saveErr);
        }

        break; // Section succeeded, exit retry loop
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (retry < maxSectionRetries - 1) {
          console.warn(`[drafting] Section ${sectionIdx + 1} retry ${retry + 1} failed (${draft.locale}): ${errMsg.substring(0, 150)}`);
          continue; // Try again
        }
        // Final retry failed
        if (sectionsWritten === 0) {
          return {
            success: false,
            nextPhase: "drafting",
            data: {},
            error: `Drafting section ${sectionIdx + 1} failed after ${maxSectionRetries} tries: ${errMsg}`,
          };
        }
        // Save partial progress from previous sections
      }
    }

    if (!sectionSuccess && sectionsWritten > 0) {
      break; // Save what we have from earlier sections
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
  budgetRemainingMs?: number,
): Promise<PhaseResult> {
  const phaseStart = Date.now();
  const outline = (draft.outline_data || {}) as Record<string, unknown>;
  const sections = (draft.sections_data || []) as Array<Record<string, unknown>>;

  // Assemble raw HTML from sections (needed for both AI and fallback paths)
  const rtlAttr = isArabic(draft.locale) ? " dir='rtl' lang='ar'" : " lang='en'";
  let rawHtml = "";
  let totalWords = 0;
  for (const section of sections) {
    const heading = section.heading as string;
    const sectionLevel = ((section as Record<string, unknown>).level as number) || 2;
    const tag = `h${Math.min(Math.max(sectionLevel, 2), 4)}`;
    rawHtml += `<${tag}>${heading}</${tag}>\n${section.content || ""}\n\n`;
    totalWords += (section.wordCount as number) || 0;
  }

  // RAW FALLBACK: skip AI polish when budget is critically low or after repeated failures.
  // Assembly AI needs 25-35s for large prompt + 1500+ token response.
  // Raw fallback concatenates sections instantly — content-auto-fix cron polishes later.
  const attempts = draft.phase_attempts || 0;
  // Raw fallback when budget is critically low OR after 2+ failures.
  // Changed from attempts >= 1 to >= 2: give assembly ONE real AI attempt before
  // falling back. The old threshold (1) meant assembly AI polish NEVER ran after
  // the first failure — raw HTML was always used. With >= 2, assembly gets one
  // chance to run with full budget on the next cron cycle.
  const useFallback = (budgetRemainingMs !== undefined && budgetRemainingMs < 25_000) || attempts >= 2;

  if (useFallback) {
    console.log(`[phases/assembly] Using raw fallback for draft ${draft.id} (budget=${budgetRemainingMs ? Math.round(budgetRemainingMs / 1000) + 's' : 'unlimited'}, attempts=${attempts})`);
    const intro = outline.introduction as Record<string, unknown> | undefined;
    const conclusion = outline.conclusion as Record<string, unknown> | undefined;

    let fallbackHtml = `<article${rtlAttr}>`;
    if (intro?.hook) fallbackHtml += `<p>${intro.hook}</p>\n`;
    fallbackHtml += rawHtml;
    if (conclusion?.callToAction) fallbackHtml += `<h2>${isArabic(draft.locale) ? "الخلاصة" : "Conclusion"}</h2>\n<p>${conclusion.callToAction}</p>\n`;
    fallbackHtml += `</article>`;

    const fallbackWords = fallbackHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    return {
      success: true,
      nextPhase: "images",
      data: { assembled_html: fallbackHtml, word_count: fallbackWords },
      aiModelUsed: "fallback-raw",
    };
  }

  // Budget guard: need at least 25s for AI assembly call + DB save
  if (budgetRemainingMs !== undefined && budgetRemainingMs < 25_000) {
    return { success: false, nextPhase: "assembly", data: {}, error: `Budget too low (${Math.round(budgetRemainingMs / 1000)}s remaining, need 25s) — will retry next run` };
  }
  const { generateJSON } = await import("@/lib/ai/provider");

  const affiliatePlacements = (outline.affiliatePlacements as Array<Record<string, unknown>>) || [];
  const internalLinkPlan = (outline.internalLinkPlan as Array<Record<string, unknown>>) || [];

  const writeLang = isArabic(draft.locale) ? "Arabic" : "English";
  // Arabic prompts are ~2.5x more token-dense — truncate harder to fit within timeout
  // Reduced from 6000/4000 to 4000/3000 — assembly is a polish pass, not generation
  const rawHtmlLimit = isArabic(draft.locale) ? 3000 : 4000;

  const prompt = `You are a senior editor for "${site.name}" (${site.destination} luxury travel).

Review and polish this assembled ${writeLang} article about "${draft.keyword}".

Raw article HTML (${totalWords} words, ${sections.length} sections):
${rawHtml.substring(0, rawHtmlLimit)}

CRITICAL REQUIREMENT: The final article MUST be at least 1,500 words. If the raw content is under 1,500 words, you MUST expand every section with additional paragraphs, details, insider tips, and practical information until the total reaches 1,500+ words. Do not skip this.

Tasks:
1. Add smooth transitions between sections
2. Remove any repetition across sections
3. Ensure consistent tone (luxury, authoritative, helpful)
4. Add 3+ internal links using ONLY the real slugs provided in "Internal link targets" below. Format: <a href="/blog/ACTUAL-SLUG-HERE" class="internal-link">descriptive anchor text</a>. NEVER use placeholder text like "TOPIC_SLUG" — every href must contain a real slug from the list below. If no internal link targets are provided, skip internal links entirely (they will be injected later).
5. Add ${affiliatePlacements.length || 2} affiliate placeholders as: <div class="affiliate-placeholder" data-type="TYPE">Affiliate recommendation block</div>
6. MANDATORY: Final word count MUST be at least 1,500 words — expand sections if needed
7. Add a proper introduction (minimum 80 words) if missing
8. Add a conclusion with CTA (minimum 80 words) if missing
9. Add an "Insider Tips" or "Practical Information" section if total word count is still under 1,500

CRITICAL FACTUAL ACCURACY RULE:
- NEVER invent or fabricate venue names, restaurant names, hotel names, or business names
- Only mention real, verifiable businesses that actually exist at the time of writing
- If unsure whether a venue exists, DO NOT mention it — use general descriptions instead
- Every restaurant, hotel, attraction, or business named must be a real establishment
- For lists (hotels, restaurants, spas): include the real address or website URL for each venue
- Violation of this rule makes the entire article unusable and harmful to site trust
${isArabic(draft.locale) ? "10. Wrap the entire article in <article dir='rtl' lang='ar'>...</article>\n11. Ensure all Arabic punctuation is correct (، ؛ ؟)\n12. Use SINGLE QUOTES for ALL HTML attributes (e.g., href='...' class='...' — never href=\"...\")" : ""}

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
    // Pass remaining budget minus buffer so the AI provider doesn't exceed cron limits.
    // Arabic assembly needs more AI time (token-dense output), so use a smaller buffer.
    const bufferMs = isArabic(draft.locale) ? 3_000 : 5_000;
    const assemblyTimeout = budgetRemainingMs !== undefined ? Math.max(budgetRemainingMs - bufferMs, 10_000) : 30_000;
    const result = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel senior editor. Polish articles for quality, coherence, and SEO. The final article MUST be at least 1,500 words — expand content if the raw input is too short. Return only valid JSON.${getLocaleDirectives(draft.locale, site)}`,
      maxTokens: isArabic(draft.locale) ? 2000 : 1200,
      temperature: 0.4,
      timeoutMs: assemblyTimeout,
      phaseBudgetHint: 'heavy',
      siteId: draft.site_id,
      taskType: "content_assembly",
      calledFrom: "phases/assembly",
    });

    const assembledHtml = (result.html as string) || rawHtml;
    let assembledWordCount = (result.wordCount as number) || totalWords;

    // Verify actual word count (AI sometimes lies about wordCount in JSON)
    const actualWords = assembledHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    assembledWordCount = Math.max(assembledWordCount, actualWords);

    // If still too short and we have budget, run an expansion pass
    // Use FRESH wall-clock budget calculation, not the stale budgetRemainingMs parameter
    // which was captured at the start of assembly and doesn't account for time consumed
    // by the first AI call.
    const freshBudgetMs = budgetRemainingMs !== undefined
      ? budgetRemainingMs - (Date.now() - phaseStart)
      : undefined;
    const canExpand = freshBudgetMs === undefined || freshBudgetMs > 18_000;
    if (assembledWordCount < 1200 && canExpand) {
      try {
        const expansionPrompt = `You are a luxury travel editor expanding a short article to meet the 1,500-word minimum.

ARTICLE ABOUT: "${draft.keyword}"
CURRENT WORD COUNT: ${assembledWordCount} — NEED AT LEAST 1,500 WORDS

CURRENT ARTICLE HTML:
${assembledHtml.substring(0, 8000)}

TASK: Add content to reach 1,500+ words. For each existing H2 section, add 1–2 additional paragraphs with:
- Specific practical details (addresses, prices, opening hours, booking tips)
- Insider knowledge and firsthand observations
- Sensory descriptions that help readers picture the experience
Also add a new "Practical Tips" H2 section at the end with at least 5 bullet points.

Return JSON:
{
  "html": "<article...>full expanded HTML</article>",
  "wordCount": 1600
}`;

        const expansionTimeout = freshBudgetMs !== undefined ? Math.max(freshBudgetMs - 5_000, 10_000) : 25_000;
        const expansionResult = await generateJSON<Record<string, unknown>>(expansionPrompt, {
          systemPrompt: `You are a luxury travel editor. Expand articles to meet minimum word counts while maintaining quality. Return only valid JSON.${getLocaleDirectives(draft.locale, site)}`,
          maxTokens: isArabic(draft.locale) ? 3500 : 2000,
          temperature: 0.5,
          timeoutMs: expansionTimeout,
          siteId: draft.site_id,
          taskType: "content_expansion",
          calledFrom: "phases/assembly",
        });

        const expandedHtml = (expansionResult.html as string) || assembledHtml;
        const expandedWords = expandedHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
        if (expandedWords > assembledWordCount) {
          return {
            success: true,
            nextPhase: "images",
            data: {
              assembled_html: expandedHtml,
              word_count: expandedWords,
            },
            aiModelUsed: "auto",
          };
        }
      } catch {
        console.warn(`[phases] Assembly expansion pass failed for draft ${draft.id} — proceeding with ${assembledWordCount} words`);
      }
    }

    return {
      success: true,
      nextPhase: "images",
      data: {
        assembled_html: assembledHtml,
        word_count: assembledWordCount,
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
  budgetRemainingMs?: number,
): Promise<PhaseResult> {
  // Budget guard: need at least 10s for Unsplash API + image injection + DB save
  if (budgetRemainingMs !== undefined && budgetRemainingMs < 10_000) {
    return { success: false, nextPhase: "images", data: {}, error: `Budget too low (${Math.round(budgetRemainingMs / 1000)}s remaining) — will retry next run` };
  }
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
      } catch (imgErr) {
        console.warn("[phases/images] Unsplash fetch failed:", imgErr instanceof Error ? imgErr.message : imgErr);
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
  budgetRemainingMs?: number,
): Promise<PhaseResult> {
  // Budget guard: need at least 12s for AI call + DB save
  if (budgetRemainingMs !== undefined && budgetRemainingMs < 12_000) {
    return { success: false, nextPhase: "seo", data: {}, error: `Budget too low (${Math.round(budgetRemainingMs / 1000)}s remaining) — will retry next run` };
  }
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
  "metaTitle": "${isArabic(draft.locale) ? "عنوان الصفحة للبحث" : "Page title for search results"}",
  "metaDescription": "${isArabic(draft.locale) ? "وصف مختصر وجذاب للصفحة" : "Compelling page summary for search results"}",
  "slug": "url-friendly-slug-with-keyword",
  "keywords": ["primary", "secondary1", "secondary2", "longtail1", "longtail2"],
  "schema": {
    "@context": "https://schema.org",
    "@type": "${(outline.schemaType as string) || "Article"}",
    "headline": "Article title",
    "description": "Brief description",
    "author": {"@type": "Person", "name": "${(draft as unknown as Record<string, unknown>).author_name || site.name + " Editorial"}"},
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
    const seoTimeout = budgetRemainingMs !== undefined ? Math.max(budgetRemainingMs - 5_000, 10_000) : 25_000;
    const seoResult = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a technical SEO specialist for luxury travel. Optimize metadata for maximum search visibility. Return only valid JSON. All string values must be properly escaped.${isArabic(draft.locale) ? " Arabic meta tags should be in Arabic." : ""}`,
      maxTokens: isArabic(draft.locale) ? 1800 : 1200,
      temperature: 0.3,
      timeoutMs: seoTimeout,
      phaseBudgetHint: 'light',
      siteId: draft.site_id,
      taskType: "content_seo",
      calledFrom: "phases/seo",
    });

    // Store articleType in seo_meta so the cockpit gate_check can apply the right
    // quality thresholds (news 150w, information 300w, guide 400w, blog 1000w).
    const keyword = draft.keyword.toLowerCase();
    let articleType = "blog";
    if (/\b(news|alert|update|announcement|breaking|strike|closure|warning)\b/.test(keyword)) {
      articleType = "news";
    } else if (/\b(what is|how does|facts|history of|overview|introduction|faq)\b/.test(keyword)) {
      articleType = "information";
    } else if (/\b(guide|tips|how to|top \d|best \d|ways to|transport|getting around|itinerary)\b/.test(keyword)) {
      articleType = "guide";
    }

    return {
      success: true,
      nextPhase: "scoring",
      data: { seo_meta: { ...seoResult, articleType } },
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

  // Quality gate — threshold from centralized SEO standards (single source of truth).
  // When standards.ts is updated after algorithm changes, this threshold updates automatically.
  let qualityGateThreshold = 70; // fallback
  try {
    const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
    qualityGateThreshold = CONTENT_QUALITY.qualityGateScore;
  } catch (e) {
    console.warn("[phases] Failed to import standards.ts, using fallback threshold:", e instanceof Error ? e.message : e);
  }
  const nextPhase = qualityScore >= qualityGateThreshold ? "reservoir" : "rejected";

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
      return phaseResearch(draft, site, budgetRemainingMs);
    case "outline":
      return phaseOutline(draft, site, budgetRemainingMs);
    case "drafting":
      return phaseDrafting(draft, site, budgetRemainingMs);
    case "assembly":
      return phaseAssembly(draft, site, budgetRemainingMs);
    case "images":
      return phaseImages(draft, site, budgetRemainingMs);
    case "seo":
      return phaseSeo(draft, site, budgetRemainingMs);
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
