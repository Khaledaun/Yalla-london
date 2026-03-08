/**
 * Perplexity SEO Audit Engine
 *
 * 10-section audit using Perplexity's deep search capabilities.
 * Each section = 1 focused API call. Returns structured findings with citations.
 */

import {
  queryPerplexity,
  logPerplexityUsage,
  type PerplexityResponse,
} from "@/lib/ai/perplexity";
import { generateCompletion } from "@/lib/ai/provider";

// ── Types ────────────────────────────────────────────────────────

export interface AuditConfig {
  siteId: string;
  domain: string;
  depth: "quick" | "standard" | "deep";
}

export interface AuditSection {
  id: string;
  title: string;
  score: number; // 0-100
  findings: AuditFinding[];
  citations: { url: string }[];
  rawResponse?: string;
}

export interface AuditFinding {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  affectedUrls: string[];
  currentState: string;
  expectedState: string;
  autoFixable: boolean;
  fixType: "code" | "content" | "config" | "manual";
}

export interface AuditReport {
  id: string;
  siteId: string;
  domain: string;
  timestamp: string;
  overallScore: number;
  sections: AuditSection[];
  executiveSummary: string;
  totalTokensUsed: number;
  estimatedCostUsd: number;
}

// ── Per-Site Context ─────────────────────────────────────────────

interface SiteAuditContext {
  niche: string;
  targetAudience: string;
  primaryKeywords: string[];
  competitors: string[];
  locale: string;
}

const SITE_CONTEXTS: Record<string, SiteAuditContext> = {
  "yalla-london": {
    niche: "Luxury travel, halal-friendly experiences, and Arab tourism in London",
    targetAudience:
      "Arabic-speaking luxury travelers visiting London (GCC focus)",
    primaryKeywords: [
      "halal restaurants london",
      "luxury hotels london arab",
      "london guide arabic",
      "ramadan london",
      "edgware road guide",
    ],
    competitors: [
      "halalfoodguy.co.uk",
      "muslimtravelgirl.com",
      "visitlondon.com",
      "timeout.com/london",
    ],
    locale: "en-GB",
  },
  arabaldives: {
    niche: "Arabic-language Maldives travel and halal resort reviews",
    targetAudience:
      "Arabic-speaking travelers seeking Maldives luxury experiences",
    primaryKeywords: [
      "جزر المالديف",
      "فنادق حلال المالديف",
      "منتجعات فاخرة المالديف",
    ],
    competitors: ["visitmaldives.com", "maldivesmagazine.com"],
    locale: "ar-SA",
  },
  "french-riviera": {
    niche: "French Riviera luxury travel for Gulf tourists",
    targetAudience:
      "GCC high-net-worth travelers visiting Côte d'Azur",
    primaryKeywords: [
      "french riviera luxury",
      "côte d'azur arab travelers",
      "yacht charter french riviera",
    ],
    competitors: ["frenchriviera.com", "nicetourisme.com"],
    locale: "en",
  },
  istanbul: {
    niche: "Luxury Istanbul travel combining Ottoman heritage with modern luxury",
    targetAudience:
      "Luxury travelers interested in Istanbul's cultural and culinary scene",
    primaryKeywords: [
      "luxury hotels istanbul",
      "bosphorus cruise",
      "grand bazaar guide",
      "halal istanbul",
    ],
    competitors: ["goturkiye.com", "istanbulite.com"],
    locale: "en",
  },
  thailand: {
    niche: "Thailand travel for Muslim and halal-conscious travelers",
    targetAudience:
      "GCC and Southeast Asian Muslim travelers visiting Thailand",
    primaryKeywords: [
      "halal food thailand",
      "muslim friendly thailand",
      "luxury resorts phuket halal",
    ],
    competitors: ["tourismthailand.org", "halaltrip.com"],
    locale: "en",
  },
  "zenitha-yachts-med": {
    niche: "Mediterranean yacht charter for luxury travelers",
    targetAudience:
      "High-net-worth individuals seeking luxury yacht charters",
    primaryKeywords: [
      "luxury yacht charter mediterranean",
      "yacht rental greece",
      "superyacht charter",
    ],
    competitors: [
      "charterworld.com",
      "burgessyachts.com",
      "yachtcharterfleet.com",
    ],
    locale: "en",
  },
};

// ── Audit Sections ───────────────────────────────────────────────

interface SectionDef {
  id: string;
  title: string;
  buildPrompt: (ctx: SiteAuditContext, domain: string) => string;
  quickMode?: boolean; // run in quick mode?
}

const AUDIT_SECTIONS: SectionDef[] = [
  {
    id: "serp-visibility",
    title: "SERP Visibility Analysis",
    quickMode: true,
    buildPrompt: (ctx, domain) =>
      `Analyze the current search visibility of ${domain} for these keywords: ${ctx.primaryKeywords.join(", ")}.
Check: current rankings, presence in Google AI Overviews, featured snippets, People Also Ask.
Compare visibility against these competitors: ${ctx.competitors.join(", ")}.
Rate overall SERP visibility on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "competitor-gap",
    title: "Competitor Content Gap",
    quickMode: true,
    buildPrompt: (ctx, domain) =>
      `Compare the content coverage of ${domain} against these competitors: ${ctx.competitors.join(", ")} for the ${ctx.niche} niche.
Identify: topics competitors cover that ${domain} doesn't, content depth differences, keyword opportunities being missed.
Rate content gap severity on a scale of 0-100 (100 = no gaps).
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "eeat-signals",
    title: "E-E-A-T & Authenticity Signals",
    quickMode: true,
    buildPrompt: (ctx, domain) =>
      `Evaluate ${domain} for Google E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness).
Check: author credentials/pages, about page quality, contact information, reviews/testimonials, expertise indicators, first-hand experience signals.
Consider Google's January 2026 Authenticity Update which made first-hand experience the #1 E-E-A-T ranking signal.
Rate E-E-A-T compliance on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "technical-seo",
    title: "Technical SEO Health",
    quickMode: true,
    buildPrompt: (ctx, domain) =>
      `Analyze the technical SEO health of ${domain}.
Check: crawlability, indexing status, Core Web Vitals, mobile-friendliness, sitemap, robots.txt, canonical tags, page speed.
Rate technical SEO on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "content-quality",
    title: "Content Quality Assessment",
    quickMode: true,
    buildPrompt: (ctx, domain) =>
      `Evaluate content quality on ${domain} for the ${ctx.niche} niche.
Check: content depth, originality, helpfulness per Google's current guidelines, thin content pages, duplicate content issues, AI-generated content markers, content freshness.
Target audience: ${ctx.targetAudience}.
Rate content quality on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "internal-linking",
    title: "Internal Linking & Site Architecture",
    buildPrompt: (ctx, domain) =>
      `Analyze the internal linking structure of ${domain}.
Check: orphan pages, pages buried too deep (>3 clicks), anchor text quality, hub-spoke topic clusters, navigation structure.
Rate internal linking on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "backlink-profile",
    title: "Backlink & Authority Profile",
    buildPrompt: (ctx, domain) =>
      `Analyze the backlink profile of ${domain}.
Check: referring domains, anchor text distribution, toxic/spammy links, authority score, link velocity, gaps vs competitors (${ctx.competitors.join(", ")}).
Rate backlink health on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "schema-rich-results",
    title: "Schema & Rich Results Eligibility",
    buildPrompt: (ctx, domain) =>
      `Check ${domain} for structured data completeness and rich result eligibility.
Check: missing schema types, invalid markup, rich result opportunities not being captured (reviews, events, articles, FAQPage — note FAQPage was restricted by Google in Aug 2023, HowTo deprecated Sept 2023).
Rate schema markup on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "aio-optimization",
    title: "AIO (AI Overview) Optimization",
    buildPrompt: (ctx, domain) =>
      `Analyze how ${domain} content appears in Google AI Overviews for queries related to: ${ctx.primaryKeywords.join(", ")}.
Check: AI Overview citations, content format compatibility (direct answers, structured data, question-format headings), competitive positioning in AI results.
60%+ of Google searches now show AI Overviews.
Rate AIO optimization on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
  {
    id: "topical-authority",
    title: "Local & Niche Authority",
    buildPrompt: (ctx, domain) =>
      `Evaluate ${domain}'s topical authority in the ${ctx.niche} niche.
Check: topical coverage completeness, content cluster depth, niche authority signals, expertise demonstration.
Rate niche authority on a scale of 0-100.
Format as JSON: { "score": number, "findings": [{ "severity": "critical"|"high"|"medium"|"low", "title": string, "description": string, "currentState": string, "expectedState": string }] }`,
  },
];

// ── Parse Response ───────────────────────────────────────────────

function parseAuditResponse(
  raw: string,
  sectionId: string
): { score: number; findings: AuditFinding[] } {
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { score: 50, findings: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const score = typeof parsed.score === "number" ? parsed.score : 50;
    const findings: AuditFinding[] = (parsed.findings || []).map(
      (f: Record<string, unknown>) => ({
        severity: f.severity || "medium",
        title: String(f.title || "Finding"),
        description: String(f.description || ""),
        affectedUrls: Array.isArray(f.affectedUrls) ? f.affectedUrls : [],
        currentState: String(f.currentState || ""),
        expectedState: String(f.expectedState || ""),
        autoFixable: f.autoFixable === true,
        fixType: f.fixType || "manual",
      })
    );

    return { score, findings };
  } catch (e) {
    console.warn(
      `[perplexity-audit] Failed to parse ${sectionId} response:`,
      e instanceof Error ? e.message : e
    );
    return { score: 50, findings: [] };
  }
}

// ── Main Audit Function ──────────────────────────────────────────

export async function runPerplexityAudit(
  config: AuditConfig
): Promise<AuditReport> {
  const ctx = SITE_CONTEXTS[config.siteId];
  if (!ctx) {
    throw new Error(`No audit context configured for site: ${config.siteId}`);
  }

  const sections: AuditSection[] = [];
  let totalTokens = 0;
  let totalCost = 0;

  // Budget guard: 53s budget with 7s buffer for Vercel Pro 60s limit
  const BUDGET_MS = 53_000;
  const startTime = Date.now();

  // Filter sections based on depth
  const sectionsToRun =
    config.depth === "quick"
      ? AUDIT_SECTIONS.filter((s) => s.quickMode)
      : AUDIT_SECTIONS;

  const systemPrompt = `You are an expert SEO auditor specializing in ${ctx.niche}.
Provide detailed, actionable findings with specific URLs and evidence.
Always return valid JSON matching the requested format.
Be specific and cite real data — do not make generic suggestions.`;

  let skippedSections: string[] = [];

  for (const sectionDef of sectionsToRun) {
    // Check budget before each section — need at least 8s for a meaningful API call
    const elapsed = Date.now() - startTime;
    const remaining = BUDGET_MS - elapsed;
    if (remaining < 8_000) {
      console.warn(
        `[perplexity-audit] Budget exhausted (${Math.round(elapsed / 1000)}s used). Skipping remaining sections.`
      );
      // Record skipped sections
      const remainingSections = sectionsToRun.slice(
        sectionsToRun.indexOf(sectionDef)
      );
      skippedSections = remainingSections.map((s) => s.title);
      for (const skipped of remainingSections) {
        sections.push({
          id: skipped.id,
          title: skipped.title,
          score: -1, // -1 = not run (excluded from average)
          findings: [],
          citations: [],
          rawResponse: "Skipped — budget exhausted. Run again for remaining sections.",
        });
      }
      break;
    }

    console.log(
      `[perplexity-audit] Running section: ${sectionDef.title} (${Math.round(remaining / 1000)}s remaining)`
    );

    try {
      const userPrompt = sectionDef.buildPrompt(ctx, config.domain);
      let responseContent = "";
      let citations: { url: string }[] = [];

      // Try Perplexity first (has citations), fall back to general AI providers
      const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
      if (hasPerplexity) {
        try {
          const response: PerplexityResponse = await queryPerplexity(
            systemPrompt,
            userPrompt,
            { model: config.depth === "deep" ? "sonar-pro" : "sonar" }
          );
          responseContent = response.content;
          citations = response.citations;
          totalTokens += response.usage.totalTokens;
          const inputCost = (response.usage.promptTokens / 1_000_000) * 3;
          const outputCost = (response.usage.completionTokens / 1_000_000) * 15;
          totalCost += inputCost + outputCost;
          await logPerplexityUsage(
            response.usage, config.siteId,
            `seo-audit-${sectionDef.id}`, "perplexity-audit", true
          );
        } catch (perplexityErr) {
          console.warn(`[perplexity-audit] Perplexity failed for ${sectionDef.id}, falling back to general AI:`, perplexityErr instanceof Error ? perplexityErr.message : perplexityErr);
          // Fall through to general AI below
        }
      }

      // Fallback: use general AI providers (Grok/OpenAI/Claude)
      if (!responseContent) {
        const result = await generateCompletion(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          { maxTokens: 2000, temperature: 0.4, taskType: "seo-optimization", calledFrom: "perplexity-audit-fallback", siteId: config.siteId, timeoutMs: 40000 }
        );
        responseContent = result.content;
      }

      const { score, findings } = parseAuditResponse(
        responseContent,
        sectionDef.id
      );

      sections.push({
        id: sectionDef.id,
        title: sectionDef.title,
        score,
        findings,
        citations,
      });
    } catch (error) {
      console.error(
        `[perplexity-audit] Section ${sectionDef.id} failed:`,
        error instanceof Error ? error.message : error
      );
      sections.push({
        id: sectionDef.id,
        title: sectionDef.title,
        score: 0,
        findings: [
          {
            severity: "critical",
            title: `Audit section failed: ${sectionDef.title}`,
            description:
              error instanceof Error ? error.message : "Unknown error",
            affectedUrls: [],
            currentState: "Error during audit",
            expectedState: "Successful audit completion",
            autoFixable: false,
            fixType: "manual",
          },
        ],
        citations: [],
      });
    }
  }

  // Calculate overall score (exclude skipped sections with score = -1)
  const completedSections = sections.filter((s) => s.score >= 0);
  const overallScore =
    completedSections.length > 0
      ? Math.round(
          completedSections.reduce((sum, s) => sum + s.score, 0) /
            completedSections.length
        )
      : 0;

  // Generate executive summary
  const criticalFindings = sections.flatMap((s) =>
    s.findings.filter((f) => f.severity === "critical")
  );
  const highFindings = sections.flatMap((s) =>
    s.findings.filter((f) => f.severity === "high")
  );

  const skippedNote =
    skippedSections.length > 0
      ? ` ${skippedSections.length} sections skipped due to time budget (${skippedSections.join(", ")}). Run Quick mode for faster results.`
      : "";

  const executiveSummary = `SEO Audit for ${config.domain} completed with an overall score of ${overallScore}/100. Analyzed ${completedSections.length}/${sectionsToRun.length} sections. Found ${criticalFindings.length} critical and ${highFindings.length} high-severity issues.${skippedNote} ${criticalFindings.length > 0 ? `Critical issues require immediate attention: ${criticalFindings.slice(0, 3).map((f) => f.title).join("; ")}.` : "No critical issues found."} ${highFindings.length > 0 ? `High-priority fixes: ${highFindings.slice(0, 3).map((f) => f.title).join("; ")}.` : ""}`;

  const report: AuditReport = {
    id: `audit-${config.siteId}-${Date.now()}`,
    siteId: config.siteId,
    domain: config.domain,
    timestamp: new Date().toISOString(),
    overallScore,
    sections,
    executiveSummary,
    totalTokensUsed: totalTokens,
    estimatedCostUsd: Math.round(totalCost * 10000) / 10000,
  };

  return report;
}
