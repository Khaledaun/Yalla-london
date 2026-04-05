/**
 * Discovery Standards — Single Source of Truth
 *
 * All discovery thresholds, scoring weights, and requirements.
 * Referenced by: scanner, diagnostics, fix engine, content generation prompts, pre-pub gate.
 *
 * Updated: March 2026
 * Sources: Google Search Central, Bing Webmaster, IndexNow spec,
 *          Google AI Overview documentation, ChatGPT Browse/Search,
 *          Perplexity AI citation guidelines
 */

import type { DiscoveryRequirements, FixCategory, FixSeverity } from "./types";

// ─── Discovery Requirements Per Content Type ─────────────────────────────────

export const DISCOVERY_REQUIREMENTS: Record<string, DiscoveryRequirements> = {
  blog: {
    minWordCount: 1000,
    minInternalLinks: 3,
    minAffiliateLinks: 2,
    requireAuthorAttribution: true,
    requireAuthenticitySignals: 3,
    requireDirectAnswer: true,
    requireQuestionH2: true,
    requireStructuredData: true,
    requireMetaTitle: { min: 30, max: 60 },
    requireMetaDescription: { min: 120, max: 160 },
    requireHreflang: true,
    requireCanonical: true,
    maxGenericPhrases: 1,
    requireCitableData: true,
  },
  news: {
    minWordCount: 150,
    minInternalLinks: 1,
    minAffiliateLinks: 0,
    requireAuthorAttribution: false,
    requireAuthenticitySignals: 0,
    requireDirectAnswer: true,
    requireQuestionH2: false,
    requireStructuredData: true,
    requireMetaTitle: { min: 30, max: 60 },
    requireMetaDescription: { min: 70, max: 160 },
    requireHreflang: true,
    requireCanonical: true,
    maxGenericPhrases: 2,
    requireCitableData: false,
  },
  information: {
    minWordCount: 300,
    minInternalLinks: 1,
    minAffiliateLinks: 0,
    requireAuthorAttribution: false,
    requireAuthenticitySignals: 0,
    requireDirectAnswer: true,
    requireQuestionH2: false,
    requireStructuredData: true,
    requireMetaTitle: { min: 30, max: 60 },
    requireMetaDescription: { min: 70, max: 160 },
    requireHreflang: true,
    requireCanonical: true,
    maxGenericPhrases: 2,
    requireCitableData: false,
  },
  guide: {
    minWordCount: 400,
    minInternalLinks: 1,
    minAffiliateLinks: 1,
    requireAuthorAttribution: true,
    requireAuthenticitySignals: 2,
    requireDirectAnswer: true,
    requireQuestionH2: true,
    requireStructuredData: true,
    requireMetaTitle: { min: 30, max: 60 },
    requireMetaDescription: { min: 120, max: 160 },
    requireHreflang: true,
    requireCanonical: true,
    maxGenericPhrases: 1,
    requireCitableData: true,
  },
  static: {
    minWordCount: 100,
    minInternalLinks: 1,
    minAffiliateLinks: 0,
    requireAuthorAttribution: false,
    requireAuthenticitySignals: 0,
    requireDirectAnswer: false,
    requireQuestionH2: false,
    requireStructuredData: true,
    requireMetaTitle: { min: 20, max: 60 },
    requireMetaDescription: { min: 50, max: 160 },
    requireHreflang: true,
    requireCanonical: true,
    maxGenericPhrases: 3,
    requireCitableData: false,
  },
};

// ─── Scoring Weights ─────────────────────────────────────────────────────────

export const SCORING_WEIGHTS: Record<FixCategory, number> = {
  crawlability: 20,
  indexability: 20,
  content_quality: 15,
  structured_data: 8,
  meta_tags: 10,
  internal_linking: 7,
  performance: 5,
  mobile: 3,
  security: 2,
  aio_readiness: 5,
  hreflang: 3,
  freshness: 1,
  authority: 1,
};

export const SEVERITY_DEDUCTIONS: Record<FixSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

// ─── Thresholds ──────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  // Crawl
  maxResponseTimeMs: 3000,
  maxRedirectChainLength: 2,

  // Index
  staleSubmissionDays: 14,
  chronicFailureAttempts: 5,
  maxTimeToIndexDays: 21,

  // Content
  thinContentWords: 800,
  blockerContentWords: 500,

  // Meta
  metaTitleMin: 30,
  metaTitleMax: 60,
  metaDescMin: 120,
  metaDescMax: 160,

  // Performance
  lcpGood: 2500,
  lcpPoor: 4000,
  inpGood: 200,
  inpPoor: 500,
  clsGood: 0.1,
  clsPoor: 0.25,

  // CTR
  lowCtrThreshold: 0.01, // 1%
  highImpressionsLowCtr: 100, // impressions threshold

  // AIO
  aioMinEligibility: 60,
  aioDirectAnswerMaxWords: 80,

  // Freshness
  staleContentDays: 90,

  // Grade boundaries
  gradeA: 85,
  gradeB: 70,
  gradeC: 55,
  gradeD: 40,
};

export function computeGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= THRESHOLDS.gradeA) return "A";
  if (score >= THRESHOLDS.gradeB) return "B";
  if (score >= THRESHOLDS.gradeC) return "C";
  if (score >= THRESHOLDS.gradeD) return "D";
  return "F";
}

// ─── AI Engine Discovery Specifications ──────────────────────────────────────

export const AI_ENGINE_SPECS = {
  google_aio: {
    name: "Google AI Overviews",
    crawlerName: "Google-Extended",
    requirements: [
      "Direct answer in first 80 words",
      "Question-format H2 headings",
      "Definitive statements (not hedging)",
      "Citable data: statistics, dates, prices",
      "Lists or tables for structured info",
      "E-E-A-T signals: author, experience, expertise",
    ],
    coverageRate: "60%+ of searches",
  },
  chatgpt: {
    name: "ChatGPT Browse/Search",
    crawlerName: "GPTBot",
    requirements: [
      "robots.txt allows GPTBot",
      "Clean semantic HTML (not JS-rendered only)",
      "Authoritative content with sources",
      "Schema.org structured data",
      "Fast loading (<3s)",
    ],
    coverageRate: "Growing — ChatGPT Search expanding",
  },
  perplexity: {
    name: "Perplexity AI",
    crawlerName: "PerplexityBot",
    requirements: [
      "robots.txt allows PerplexityBot",
      "Unique factual content (not summarized from others)",
      "Clear article structure with headings",
      "Data-rich content (statistics, comparisons)",
      "Recent publication date",
    ],
    coverageRate: "10M+ daily queries",
  },
  claude: {
    name: "Claude / Anthropic",
    crawlerName: "ClaudeBot",
    requirements: [
      "robots.txt allows ClaudeBot",
      "llms.txt file with site description",
      "High-quality original content",
      "Clear topic authority signals",
    ],
    coverageRate: "Research & analysis use cases",
  },
  apple_intelligence: {
    name: "Apple Intelligence / Siri",
    crawlerName: "Applebot",
    requirements: [
      "robots.txt allows Applebot",
      "Schema.org structured data",
      "Fast mobile performance",
      "Clean semantic HTML",
    ],
    coverageRate: "1B+ Apple devices",
  },
};

// ─── Content Generation Discovery Prompt Block ───────────────────────────────
// This is injected into AI content generation prompts to ensure articles
// are born discoverable by both search engines and AI engines.

export function getDiscoveryPromptBlock(contentType: string): string {
  const reqs = DISCOVERY_REQUIREMENTS[contentType] || DISCOVERY_REQUIREMENTS.blog;
  return `
## DISCOVERY REQUIREMENTS (MANDATORY — articles that fail these are not published)

### Search Engine Discovery
1. **Word count:** Minimum ${reqs.minWordCount} words. Target ${Math.round(reqs.minWordCount * 1.5)} words.
2. **Meta title:** ${reqs.requireMetaTitle.min}-${reqs.requireMetaTitle.max} characters. Include focus keyword.
3. **Meta description:** ${reqs.requireMetaDescription.min}-${reqs.requireMetaDescription.max} characters. Compelling, includes keyword, ends with value proposition.
4. **Internal links:** Minimum ${reqs.minInternalLinks} links to other articles on this site using descriptive anchor text.
5. **Heading hierarchy:** Exactly 1 H1 (the title). 4-6 H2 sections. Use H3 for subsections. Never skip levels.
6. **Canonical URL:** Self-referencing canonical tag (auto-generated).
${reqs.requireAuthorAttribution ? "7. **Author attribution:** Include author byline with name and credentials." : ""}
${reqs.minAffiliateLinks > 0 ? `8. **Affiliate links:** Minimum ${reqs.minAffiliateLinks} booking/affiliate links (Booking.com, HalalBooking, GetYourGuide, etc.).` : ""}
${reqs.requireAuthenticitySignals > 0 ? `9. **Authenticity signals:** Include ${reqs.requireAuthenticitySignals}+ first-hand experience markers (sensory details, insider tips, specific observations).` : ""}

### AI Engine Discovery (Google AI Overviews, ChatGPT, Perplexity)
${reqs.requireDirectAnswer ? `1. **Direct answer in first 80 words:** Start with a clear, definitive answer to the implied question. No preamble.` : ""}
${reqs.requireQuestionH2 ? `2. **Question-format H2s:** At least 2 H2 headings phrased as questions readers ask (e.g., "What is the best time to visit?").` : ""}
${reqs.requireCitableData ? `3. **Citable data:** Include specific statistics, dates, prices, or measurements that AI engines can cite.` : ""}
4. **Structured content:** Use bullet lists, numbered lists, or comparison tables for key information.
5. **Definitive tone:** Make clear statements. Avoid hedging phrases ("It might be...", "Some people think...").
6. **Avoid AI-generic phrases:** NEVER use: "nestled in the heart of", "Whether you're a... or a...", "In this comprehensive guide", "look no further", "In conclusion".
${reqs.maxGenericPhrases <= 1 ? `7. **Maximum ${reqs.maxGenericPhrases} generic phrases allowed.** Every sentence must add unique value.` : ""}

### Technical Discovery
- All images MUST have descriptive alt text (not "image" or "photo").
- First paragraph must contain the focus keyword naturally.
- Include a "Key Takeaways" or "Quick Answer" section near the top for AI citation.
`;
}
