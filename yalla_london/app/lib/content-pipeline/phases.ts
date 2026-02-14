/**
 * Content Pipeline — Phase Implementations
 *
 * Each phase runs independently within a single cron invocation (~53s budget).
 * Results are saved to the ArticleDraft table after each phase.
 * If a phase fails, it can be retried without re-running previous phases.
 *
 * Pipeline: research → outline → drafting → assembly → seo → scoring → reservoir
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

// ─── Phase 1: Research ───────────────────────────────────────────────────────

export async function phaseResearch(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");

  const prompt = `You are an SEO research analyst for "${site.name}" (${site.destination} luxury travel for Arab travelers).

Analyze the keyword "${draft.keyword}" and provide comprehensive research data for writing a high-quality article.

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
}`;

  try {
    const research = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel SEO researcher. Analyze keywords for the ${site.destination} market targeting Arab travelers. Return only valid JSON.`,
      maxTokens: 1500,
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

  const prompt = `You are a content architect for "${site.name}" (${site.destination} luxury travel for Arab travelers).

Based on this research data, create a detailed article outline for the keyword "${draft.keyword}".

Research: ${JSON.stringify(research).substring(0, 2000)}

Return JSON:
{
  "title": "SEO-optimized article title (under 60 chars)",
  "titleAlt": "Arabic translation of the title",
  "sections": [
    {
      "heading": "H2 heading text",
      "level": 2,
      "targetWords": 250,
      "keyPoints": ["point1", "point2", "point3"],
      "keywords": ["keyword to include naturally"],
      "linkOpportunities": ["internal link suggestion"]
    }
  ],
  "introduction": {
    "hook": "Opening hook to grab attention",
    "targetWords": 150
  },
  "conclusion": {
    "callToAction": "CTA text",
    "targetWords": 150
  },
  "totalTargetWords": 1800,
  "affiliatePlacements": [
    {"section": 0, "type": "hotel|restaurant|activity", "context": "natural placement context"}
  ],
  "internalLinkPlan": [
    {"anchor": "anchor text", "targetTopic": "related article topic"}
  ],
  "schemaType": "Article|FAQPage|HowTo"
}`;

  try {
    const outline = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel content architect. Create structured, SEO-optimized outlines. Articles must have 6-10 sections, target 1500-2500 words, include 3+ internal link opportunities and 2+ affiliate placements. Return only valid JSON.`,
      maxTokens: 1500,
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

// ─── Phase 3: Drafting (incremental — one section per invocation) ────────────

export async function phaseDrafting(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const outline = (draft.outline_data || {}) as Record<string, unknown>;
  const sections = (outline.sections as OutlineSection[]) || [];
  const existingSections = (draft.sections_data || []) as Array<Record<string, unknown>>;
  const nextIndex = draft.sections_completed;

  // Check if all sections are done
  if (nextIndex >= sections.length) {
    return {
      success: true,
      nextPhase: "assembly",
      data: {},
    };
  }

  const section = sections[nextIndex];
  const isIntro = nextIndex === 0;
  const isLast = nextIndex === sections.length - 1;
  const intro = outline.introduction as Record<string, unknown> | undefined;
  const conclusion = outline.conclusion as Record<string, unknown> | undefined;

  const contextSections = existingSections
    .slice(-2)
    .map((s) => `[${s.heading}]: ${(s.content as string || "").substring(0, 200)}...`)
    .join("\n");

  const prompt = `You are a luxury travel content writer for "${site.name}" (${site.destination}).

Write section ${nextIndex + 1} of ${sections.length} for an article about "${draft.keyword}".

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

Write in ${draft.locale === "ar" ? "Arabic" : "English"}. Use HTML tags: h2, h3, p, ul, ol, li, strong, em. NO markdown.`;

  try {
    const result = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel writer for Arab travelers. Write engaging, detailed, SEO-optimized content. Use HTML formatting. Return only valid JSON.`,
      maxTokens: 1500,
      temperature: 0.7,
    });

    const updatedSections = [...existingSections, {
      heading: result.heading || section.heading,
      content: result.content || "",
      wordCount: result.wordCount || 0,
      keywords_used: result.keywords_used || [],
      index: nextIndex,
    }];

    const allDone = nextIndex + 1 >= sections.length;

    return {
      success: true,
      nextPhase: allDone ? "assembly" : "drafting",
      data: {
        sections_data: updatedSections,
        sections_completed: nextIndex + 1,
      },
      aiModelUsed: "auto",
    };
  } catch (error) {
    return {
      success: false,
      nextPhase: "drafting",
      data: {},
      error: error instanceof Error ? error.message : "Drafting phase failed",
    };
  }
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
  let rawHtml = "";
  let totalWords = 0;
  for (const section of sections) {
    const heading = section.heading as string;
    const sectionLevel = ((section as Record<string, unknown>).level as number) || 2;
    const tag = `h${Math.min(Math.max(sectionLevel, 2), 4)}`; // Clamp to h2-h4
    rawHtml += `<${tag}>${heading}</${tag}>\n${section.content || ""}\n\n`;
    totalWords += (section.wordCount as number) || 0;
  }

  // Ask AI to do a coherence pass + add transitions + internal links
  const affiliatePlacements = (outline.affiliatePlacements as Array<Record<string, unknown>>) || [];
  const internalLinkPlan = (outline.internalLinkPlan as Array<Record<string, unknown>>) || [];

  const prompt = `You are a senior editor for "${site.name}" (${site.destination} luxury travel).

Review and polish this assembled article about "${draft.keyword}".

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

Internal link targets: ${JSON.stringify(internalLinkPlan).substring(0, 500)}

Return JSON:
{
  "html": "<article>...full polished HTML...</article>",
  "wordCount": 1800,
  "internalLinksAdded": 3,
  "affiliatePlacementsAdded": 2,
  "transitionsAdded": 5,
  "issuesFixed": ["issue1", "issue2"]
}`;

  try {
    const result = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a luxury travel senior editor. Polish articles for quality, coherence, and SEO. Maintain the existing content but improve flow and add links. Return only valid JSON.`,
      maxTokens: 4096,
      temperature: 0.4,
    });

    // Also generate the alternate language version header (brief summary for now)
    const altLocale = draft.locale === "en" ? "ar" : "en";
    let altHtml: string | null = null;
    try {
      const altResult = await generateJSON<Record<string, unknown>>(
        `Translate this article title and first 2 paragraphs to ${altLocale === "ar" ? "Arabic" : "English"}. Return JSON: {"html": "<h1>Title</h1><p>First paragraph...</p><p>Second paragraph...</p>"}

Article:
${(result.html as string || "").substring(0, 1500)}`,
        {
          systemPrompt: `Translate luxury travel content. Return only valid JSON.`,
          maxTokens: 800,
          temperature: 0.3,
        },
      );
      altHtml = (altResult.html as string) || null;
    } catch {
      // Non-fatal — alt translation can be done later
    }

    return {
      success: true,
      nextPhase: "seo",
      data: {
        assembled_html: result.html || rawHtml,
        assembled_html_alt: altHtml,
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

// ─── Phase 5: SEO Optimization ───────────────────────────────────────────────

export async function phaseSeo(
  draft: DraftRecord,
  site: SiteConfig,
): Promise<PhaseResult> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const research = draft.research_data || {};
  const outline = (draft.outline_data || {}) as Record<string, unknown>;
  const html = draft.assembled_html || "";

  const prompt = `You are a technical SEO specialist for "${site.name}" (${site.destination}).

Optimize this article's SEO metadata for the keyword "${draft.keyword}".

Article HTML (first 2000 chars): ${html.substring(0, 2000)}
Research data: ${JSON.stringify(research).substring(0, 1000)}
Schema type: ${(outline.schemaType as string) || "Article"}

Return JSON:
{
  "metaTitle": "SEO title under 60 chars including keyword",
  "metaTitleAlt": "Arabic/English translation",
  "metaDescription": "Meta description 120-160 chars with keyword and CTA",
  "metaDescriptionAlt": "Arabic/English translation",
  "slug": "url-friendly-slug-with-keyword",
  "keywords": ["primary", "secondary1", "secondary2", "longtail1", "longtail2"],
  "schema": {
    "@context": "https://schema.org",
    "@type": "${(outline.schemaType as string) || "Article"}",
    "headline": "Article title",
    "description": "Brief description",
    "author": {"@type": "Organization", "name": "${site.name}"},
    "publisher": {"@type": "Organization", "name": "${site.name}"}
  },
  "ogImage": {
    "suggestedAlt": "Descriptive alt text for OG image",
    "suggestedCaption": "Image caption"
  },
  "internalLinkSuggestions": ["topic1", "topic2", "topic3"],
  "seoChecklist": {
    "keywordInTitle": true,
    "keywordInFirstParagraph": true,
    "keywordInH2": true,
    "metaDescriptionLength": 155,
    "internalLinks": 3,
    "externalLinks": 1
  }
}`;

  try {
    const seoResult = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a technical SEO specialist for luxury travel. Optimize metadata for maximum search visibility. Return only valid JSON.`,
      maxTokens: 1200,
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

// ─── Phase 6: Quality Scoring ────────────────────────────────────────────────

export async function phaseScoring(
  draft: DraftRecord,
): Promise<PhaseResult> {
  const html = draft.assembled_html || "";
  const seo = (draft.seo_meta || {}) as Record<string, unknown>;
  const wordCount = draft.word_count || 0;

  // Structural scoring (no AI needed — fast and deterministic)
  let seoScore = 0;
  let qualityScore = 0;

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

  // Internal links (max 15 points)
  const internalLinks = (html.match(/class="internal-link"/gi) || []).length;
  if (internalLinks >= 3) seoScore += 15;
  else if (internalLinks >= 1) seoScore += 8;

  // Affiliate placements (max 10 points)
  const affiliates = (html.match(/class="affiliate-placeholder"/gi) || []).length;
  if (affiliates >= 2) seoScore += 10;
  else if (affiliates >= 1) seoScore += 5;

  // Keywords in content (max 5 points)
  const keywords = (seo.keywords as string[]) || [];
  const primaryKw = keywords[0] || "";
  if (primaryKw && html.toLowerCase().includes(primaryKw.toLowerCase())) seoScore += 5;

  // Quality score is a combination
  qualityScore = Math.min(100, Math.round(seoScore * 1.0));

  // Readability estimate based on sentence length
  const sentences = html.replace(/<[^>]+>/g, "").split(/[.!?]+/).filter(Boolean);
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
    : 0;
  const readabilityScore = avgSentenceLength <= 20 ? 85 : avgSentenceLength <= 25 ? 70 : 55;

  // Content depth — how many unique topics/subtopics covered
  const contentDepthScore = Math.min(100, h2Count * 10 + h3Count * 5 + (wordCount / 30));

  // Determine next phase based on score
  const nextPhase = qualityScore >= 50 ? "reservoir" : "rejected";

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
): Promise<PhaseResult> {
  switch (draft.current_phase) {
    case "research":
      return phaseResearch(draft, site);
    case "outline":
      return phaseOutline(draft, site);
    case "drafting":
      return phaseDrafting(draft, site);
    case "assembly":
      return phaseAssembly(draft, site);
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
