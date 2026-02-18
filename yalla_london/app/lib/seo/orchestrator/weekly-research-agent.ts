/**
 * Weekly Research Agent
 *
 * Researches the latest SEO, AIO (AI Optimization), and content strategy
 * best practices from trusted industry sources. Extracts actionable insights
 * and generates recommendations that the orchestrator uses to update other
 * agents' prompts, configurations, and task priorities.
 *
 * Runs weekly (configurable). Stores findings in the database as a
 * knowledge base that agents can reference.
 *
 * Trusted Sources (curated, no spam/black-hat):
 * - Google Search Central Blog (official)
 * - Google SearchLiaison (@searchliaison) announcements
 * - web.dev (Google's web platform guidance)
 * - Ahrefs Blog (data-driven SEO research)
 * - Search Engine Journal (industry news)
 * - Moz Blog (SEO fundamentals)
 * - Schema.org updates
 * - Chrome DevRel / Core Web Vitals updates
 * - Vercel Blog (Next.js-specific optimizations)
 * - Perplexity / OpenAI / Anthropic announcements (AIO updates)
 */

export interface ResearchFinding {
  id: string;
  source: string;
  sourceUrl: string;
  category: ResearchCategory;
  title: string;
  summary: string;
  actionableInsights: string[];
  affectedAgents: string[];
  priority: "critical" | "high" | "medium" | "low";
  confidence: number; // 0-1
  dateDiscovered: string;
  appliedAt?: string;
}

export type ResearchCategory =
  | "algorithm_update"
  | "indexing_change"
  | "structured_data"
  | "core_web_vitals"
  | "ai_search"
  | "content_strategy"
  | "technical_seo"
  | "crawling"
  | "rendering"
  | "security"
  | "nextjs_optimization";

export interface ResearchReport {
  runDate: string;
  sourcesChecked: number;
  findingsCount: number;
  findings: ResearchFinding[];
  agentUpdates: AgentUpdate[];
  knowledgeBaseEntries: number;
}

export interface AgentUpdate {
  agentId: string;
  updateType: "prompt" | "config" | "priority" | "task";
  description: string;
  finding: string; // Reference to the finding that triggered this
  applied: boolean;
}

// ── Trusted Source Registry ───────────────────────────────────────────

const TRUSTED_SOURCES = [
  {
    id: "google-search-central",
    name: "Google Search Central Blog",
    url: "https://developers.google.com/search/blog",
    category: "official" as const,
    reliability: 1.0,
    topics: [
      "algorithm_update",
      "indexing_change",
      "structured_data",
      "crawling",
    ],
  },
  {
    id: "web-dev",
    name: "web.dev",
    url: "https://web.dev/blog",
    category: "official" as const,
    reliability: 1.0,
    topics: ["core_web_vitals", "rendering", "technical_seo"],
  },
  {
    id: "ahrefs-blog",
    name: "Ahrefs Blog",
    url: "https://ahrefs.com/blog",
    category: "industry" as const,
    reliability: 0.85,
    topics: ["content_strategy", "technical_seo", "ai_search"],
  },
  {
    id: "search-engine-journal",
    name: "Search Engine Journal",
    url: "https://www.searchenginejournal.com",
    category: "industry" as const,
    reliability: 0.8,
    topics: ["algorithm_update", "ai_search", "content_strategy"],
  },
  {
    id: "moz-blog",
    name: "Moz Blog",
    url: "https://moz.com/blog",
    category: "industry" as const,
    reliability: 0.85,
    topics: ["technical_seo", "content_strategy", "structured_data"],
  },
  {
    id: "schema-org",
    name: "Schema.org Updates",
    url: "https://schema.org",
    category: "official" as const,
    reliability: 1.0,
    topics: ["structured_data"],
  },
  {
    id: "vercel-blog",
    name: "Vercel Blog",
    url: "https://vercel.com/blog",
    category: "platform" as const,
    reliability: 0.9,
    topics: ["nextjs_optimization", "rendering", "core_web_vitals"],
  },
  {
    id: "google-ai-blog",
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai",
    category: "official" as const,
    reliability: 1.0,
    topics: ["ai_search"],
  },
  // Added per 2025-2026 SEO reference — most authoritative sources
  {
    id: "google-doc-changelog",
    name: "Google Search Documentation Updates",
    url: "https://developers.google.com/search/updates",
    category: "official" as const,
    reliability: 1.0,
    topics: ["algorithm_update", "indexing_change", "structured_data", "crawling", "technical_seo"],
  },
  {
    id: "google-search-status",
    name: "Google Search Status Dashboard",
    url: "https://status.search.google.com",
    category: "official" as const,
    reliability: 1.0,
    topics: ["algorithm_update"],
  },
  {
    id: "search-engine-roundtable",
    name: "Search Engine Roundtable",
    url: "https://seroundtable.com",
    category: "industry" as const,
    reliability: 0.9,
    topics: ["algorithm_update", "indexing_change", "ai_search"],
  },
  {
    id: "search-engine-land",
    name: "Search Engine Land",
    url: "https://searchengineland.com",
    category: "industry" as const,
    reliability: 0.85,
    topics: ["algorithm_update", "ai_search", "content_strategy", "technical_seo"],
  },
];

/**
 * Run the weekly research cycle.
 *
 * The approach is LLM-powered: we collect recent developments from trusted
 * sources (via RSS/web scraping) and use an AI model to extract actionable
 * insights relevant to our specific stack (Next.js 14, Vercel, Cloudflare,
 * bilingual EN/AR content, multi-tenant architecture).
 */
export async function runWeeklyResearch(
  prisma: any,
  siteId?: string
): Promise<ResearchReport> {
  const findings: ResearchFinding[] = [];
  const agentUpdates: AgentUpdate[] = [];
  let sourcesChecked = 0;

  // ── Phase 1: Collect recent developments ────────────────────────────
  for (const source of TRUSTED_SOURCES) {
    try {
      const sourceFeed = await fetchSourceFeed(source.url);
      sourcesChecked++;

      if (sourceFeed) {
        const sourceFindings = analyzeSourceContent(
          source,
          sourceFeed
        );
        findings.push(...sourceFindings);
      }
    } catch {
      // Source unavailable — continue with others
    }
  }

  // ── Phase 2: Generate agent-specific updates ────────────────────────
  for (const finding of findings) {
    const updates = generateAgentUpdates(finding);
    agentUpdates.push(...updates);
  }

  // ── Phase 3: Standards refresh — verify our SEO config is current ──
  // Reference: lib/seo/standards.ts contains the canonical thresholds.
  // This phase logs the current standards version and checks for staleness.
  try {
    const { STANDARDS_VERSION, SCHEMA_TYPES, CORE_WEB_VITALS, CONTENT_QUALITY } =
      await import("@/lib/seo/standards");

    // Record a "standards audit" finding so the dashboard shows the last verified date
    findings.push({
      id: `standards-audit-${Date.now()}`,
      source: "internal",
      sourceUrl: "lib/seo/standards.ts",
      category: "technical_seo",
      title: "SEO Standards Config Verified",
      summary: `Standards version ${STANDARDS_VERSION}. ` +
        `Deprecated schemas: ${SCHEMA_TYPES.deprecated.length}. ` +
        `CWV: LCP ≤${CORE_WEB_VITALS.lcp.good}ms, INP ≤${CORE_WEB_VITALS.inp.good}ms, CLS ≤${CORE_WEB_VITALS.cls.good}. ` +
        `Content: ${CONTENT_QUALITY.minWords}+ words min, ${CONTENT_QUALITY.targetWords}+ target. ` +
        `Quality gate: ${CONTENT_QUALITY.qualityGateScore}/100.`,
      actionableInsights: [
        `${SCHEMA_TYPES.deprecated.length} deprecated schema types blocked from generation (FAQPage, HowTo, etc.)`,
        `INP (Interaction to Next Paint) replaces FID as Core Web Vital — threshold ≤${CORE_WEB_VITALS.inp.good}ms`,
        `Pre-publication gate enforces ${CONTENT_QUALITY.minWords}+ word minimum, ${CONTENT_QUALITY.metaTitleMin}+ char meta title`,
      ],
      affectedAgents: ["seo-agent", "content-builder", "schema-generator"],
      priority: "low",
      confidence: 1.0,
      dateDiscovered: new Date().toISOString(),
    });

    // If standards are >30 days old, flag for manual review
    const standardsAge = Date.now() - new Date(STANDARDS_VERSION).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (standardsAge > thirtyDays) {
      findings.push({
        id: `standards-stale-${Date.now()}`,
        source: "internal",
        sourceUrl: "lib/seo/standards.ts",
        category: "technical_seo",
        title: "SEO Standards Config May Be Stale",
        summary: `Standards last updated ${STANDARDS_VERSION} — over 30 days ago. ` +
          `Check Google Search Documentation Updates (developers.google.com/search/updates) ` +
          `for any new deprecations, threshold changes, or algorithm updates.`,
        actionableInsights: [
          "Review Google Search Central changelog for updates since " + STANDARDS_VERSION,
          "Check schema.org/docs/releases.html for new schema versions",
          "Verify CWV thresholds haven't changed at web.dev/articles/vitals",
        ],
        affectedAgents: ["seo-agent", "content-builder"],
        priority: "medium",
        confidence: 1.0,
        dateDiscovered: new Date().toISOString(),
      });
    }
  } catch {
    // Standards module may not exist yet — non-fatal
  }

  // ── Phase 3: Store in knowledge base ────────────────────────────────
  let knowledgeBaseEntries = 0;
  for (const finding of findings) {
    try {
      await prisma.seoReport.create({
        data: {
          reportType: "research_finding",
          site_id: siteId || null,
          generatedAt: new Date(),
          data: {
            finding,
            agentUpdates: agentUpdates.filter(
              (u) => u.finding === finding.id
            ),
            source: "weekly-research-agent",
          },
        },
      });
      knowledgeBaseEntries++;
    } catch {
      // DB write failed — non-fatal
    }
  }

  // ── Phase 4: Apply safe auto-updates ────────────────────────────────
  for (const update of agentUpdates) {
    if (update.updateType === "config" && isSafeAutoUpdate(update)) {
      try {
        await applyAgentUpdate(prisma, update);
        update.applied = true;
      } catch {
        // Auto-apply failed — will be manual
      }
    }
  }

  return {
    runDate: new Date().toISOString(),
    sourcesChecked,
    findingsCount: findings.length,
    findings,
    agentUpdates,
    knowledgeBaseEntries,
  };
}

// ── Source Feed Fetching ──────────────────────────────────────────────

async function fetchSourceFeed(
  sourceUrl: string
): Promise<string | null> {
  try {
    // Try RSS feed first
    const rssUrl = `${sourceUrl}/feed`;
    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Zenitha-ResearchAgent/1.0 (+https://zenitha.luxury)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      return await res.text();
    }

    // Fall back to HTML
    const htmlRes = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Zenitha-ResearchAgent/1.0 (+https://zenitha.luxury)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (htmlRes.ok) {
      return await htmlRes.text();
    }

    return null;
  } catch {
    return null;
  }
}

// ── Content Analysis ─────────────────────────────────────────────────

function analyzeSourceContent(
  source: (typeof TRUSTED_SOURCES)[number],
  content: string
): ResearchFinding[] {
  const findings: ResearchFinding[] = [];

  // Extract titles and summaries from RSS/HTML
  const articles = extractArticles(content);

  for (const article of articles.slice(0, 5)) {
    // Check if article is relevant to our stack
    const relevance = assessRelevance(article, source);
    if (relevance < 0.3) continue;

    // Categorize the finding
    const category = categorizeFinding(article, source);

    // Extract actionable insights
    const insights = extractInsights(article, category);
    if (insights.length === 0) continue;

    // Determine which agents are affected
    const affected = determineAffectedAgents(category, insights);

    findings.push({
      id: `${source.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: source.name,
      sourceUrl: article.url || source.url,
      category,
      title: article.title,
      summary: article.summary,
      actionableInsights: insights,
      affectedAgents: affected,
      priority: determinePriority(category, source.reliability),
      confidence: source.reliability * relevance,
      dateDiscovered: new Date().toISOString(),
    });
  }

  return findings;
}

interface ArticleEntry {
  title: string;
  summary: string;
  url?: string;
  date?: string;
}

function extractArticles(content: string): ArticleEntry[] {
  const articles: ArticleEntry[] = [];

  // Try RSS format first
  const itemMatches =
    content.match(/<item>[\s\S]*?<\/item>/gi) ||
    content.match(/<entry>[\s\S]*?<\/entry>/gi) ||
    [];

  for (const item of itemMatches.slice(0, 10)) {
    const title =
      item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() ||
      "";
    const desc =
      item.match(
        /<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i
      )?.[1]?.trim() || "";
    const link =
      item.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      item.match(/<link>([^<]+)<\/link>/i)?.[1] ||
      "";

    if (title) {
      articles.push({
        title: stripHtml(title),
        summary: stripHtml(desc).slice(0, 500),
        url: link,
      });
    }
  }

  // Fallback: extract from HTML
  if (articles.length === 0) {
    const headingMatches =
      content.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi) || [];
    for (const heading of headingMatches.slice(0, 10)) {
      const title = stripHtml(heading);
      if (title.length > 10 && title.length < 200) {
        articles.push({ title, summary: "" });
      }
    }
  }

  return articles;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Relevance Assessment ─────────────────────────────────────────────

const RELEVANCE_KEYWORDS = [
  "next.js",
  "nextjs",
  "vercel",
  "cloudflare",
  "seo",
  "indexing",
  "structured data",
  "schema.org",
  "json-ld",
  "core web vitals",
  "sitemap",
  "robots.txt",
  "hreflang",
  "i18n",
  "multilingual",
  "arabic",
  "rtl",
  "ai search",
  "ai overview",
  "perplexity",
  "gpt",
  "claude",
  "llm",
  "crawl",
  "render",
  "ssr",
  "isr",
  "cache",
  "cdn",
  "page speed",
  "lighthouse",
  "meta tag",
  "og:image",
  "breadcrumb",
  "faq schema",
  "rich result",
  "search console",
  "indexnow",
  "content quality",
  "e-e-a-t",
  "helpful content",
];

function assessRelevance(
  article: ArticleEntry,
  _source: (typeof TRUSTED_SOURCES)[number]
): number {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  let matches = 0;
  for (const keyword of RELEVANCE_KEYWORDS) {
    if (text.includes(keyword)) matches++;
  }
  return Math.min(1, matches / 3);
}

function categorizeFinding(
  article: ArticleEntry,
  source: (typeof TRUSTED_SOURCES)[number]
): ResearchCategory {
  const text = `${article.title} ${article.summary}`.toLowerCase();

  if (text.includes("algorithm") || text.includes("core update"))
    return "algorithm_update";
  if (text.includes("index") || text.includes("crawl")) return "indexing_change";
  if (text.includes("schema") || text.includes("structured data") || text.includes("json-ld"))
    return "structured_data";
  if (text.includes("web vital") || text.includes("lcp") || text.includes("cls"))
    return "core_web_vitals";
  if (text.includes("ai search") || text.includes("ai overview") || text.includes("llm"))
    return "ai_search";
  if (text.includes("content") || text.includes("helpful"))
    return "content_strategy";
  if (text.includes("next.js") || text.includes("vercel"))
    return "nextjs_optimization";
  if (text.includes("render") || text.includes("ssr"))
    return "rendering";
  if (text.includes("security") || text.includes("https"))
    return "security";

  // Fall back to source's primary topic
  return (source.topics[0] as ResearchCategory) || "technical_seo";
}

function extractInsights(
  article: ArticleEntry,
  _category: ResearchCategory
): string[] {
  const insights: string[] = [];
  const text = `${article.title} ${article.summary}`;

  // Pattern: "you should", "we recommend", "best practice", "update your"
  const actionPatterns = [
    /(?:you should|we recommend|best practice|update your|make sure|ensure that|consider|implement|add|use|switch to|migrate to)[^.!?]+[.!?]/gi,
    /(?:new|updated|changed|deprecated|removed|required|mandatory)[^.!?]+[.!?]/gi,
  ];

  for (const pattern of actionPatterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      if (match.length > 20 && match.length < 300) {
        insights.push(match.trim());
      }
    }
  }

  // If no pattern matches, use the title as a general insight
  if (insights.length === 0 && article.title.length > 10) {
    insights.push(`Review: ${article.title}`);
  }

  return insights.slice(0, 5);
}

function determineAffectedAgents(
  category: ResearchCategory,
  _insights: string[]
): string[] {
  const agentMap: Record<ResearchCategory, string[]> = {
    algorithm_update: ["seo-agent", "content-generator"],
    indexing_change: ["seo-agent", "live-site-auditor"],
    structured_data: ["seo-agent", "content-generator"],
    core_web_vitals: ["live-site-auditor"],
    ai_search: ["weekly-research", "seo-agent"],
    content_strategy: ["content-generator", "topic-orchestrator"],
    technical_seo: ["seo-agent", "live-site-auditor"],
    crawling: ["seo-agent", "live-site-auditor"],
    rendering: ["live-site-auditor"],
    security: ["live-site-auditor"],
    nextjs_optimization: ["live-site-auditor"],
  };

  return agentMap[category] || ["seo-agent"];
}

function determinePriority(
  category: ResearchCategory,
  reliability: number
): ResearchFinding["priority"] {
  if (
    category === "algorithm_update" ||
    category === "indexing_change"
  ) {
    return reliability >= 0.9 ? "critical" : "high";
  }
  if (category === "ai_search" || category === "core_web_vitals") {
    return "high";
  }
  if (category === "security") return "critical";
  return "medium";
}

// ── Agent Update Generation ──────────────────────────────────────────

function generateAgentUpdates(finding: ResearchFinding): AgentUpdate[] {
  const updates: AgentUpdate[] = [];

  for (const agentId of finding.affectedAgents) {
    for (const insight of finding.actionableInsights) {
      updates.push({
        agentId,
        updateType: finding.priority === "critical" ? "priority" : "config",
        description: `[${finding.source}] ${insight}`,
        finding: finding.id,
        applied: false,
      });
    }
  }

  return updates;
}

function isSafeAutoUpdate(update: AgentUpdate): boolean {
  // Only auto-apply low-risk config updates
  return (
    update.updateType === "config" &&
    !update.description.toLowerCase().includes("remove") &&
    !update.description.toLowerCase().includes("delete") &&
    !update.description.toLowerCase().includes("disable")
  );
}

async function applyAgentUpdate(
  prisma: any,
  update: AgentUpdate
): Promise<void> {
  // Store the update recommendation in the database for the target agent
  // to pick up on its next run
  await prisma.seoReport.create({
    data: {
      reportType: "agent_update",
      generatedAt: new Date(),
      data: {
        targetAgent: update.agentId,
        updateType: update.updateType,
        description: update.description,
        finding: update.finding,
        appliedAt: new Date().toISOString(),
        source: "weekly-research-agent",
      },
    },
  });
}

/**
 * Get recent research findings for a specific agent to incorporate.
 */
export async function getRecentFindings(
  prisma: any,
  agentId: string,
  daysBack: number = 14
): Promise<ResearchFinding[]> {
  try {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const reports = await prisma.seoReport.findMany({
      where: {
        reportType: "research_finding",
        generatedAt: { gte: since },
      },
      orderBy: { generatedAt: "desc" },
      take: 20,
    });

    return reports
      .map((r: any) => r.data?.finding as ResearchFinding)
      .filter(
        (f: ResearchFinding | undefined) =>
          f && f.affectedAgents?.includes(agentId)
      );
  } catch {
    return [];
  }
}
