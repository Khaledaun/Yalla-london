/**
 * Business Goals & KPI Configuration
 *
 * Defines the measurable objectives that the SEO Orchestrator uses to
 * evaluate site health and prioritize agent work. Every decision the
 * orchestrator makes traces back to one of these goals.
 */

export interface BusinessGoal {
  id: string;
  name: string;
  description: string;
  kpis: KPI[];
  /** Which agent is primarily responsible */
  ownerAgent: string;
  /** Which agents contribute */
  contributingAgents: string[];
}

export interface KPI {
  id: string;
  name: string;
  unit: string;
  currentValue?: number;
  target30d: number;
  target90d: number;
  /** 'higher' = higher is better, 'lower' = lower is better */
  direction: "higher" | "lower";
  /** Critical threshold — below/above this triggers an alert */
  criticalThreshold?: number;
}

export const BUSINESS_GOALS: BusinessGoal[] = [
  {
    id: "indexation",
    name: "Google Indexation",
    description:
      "Get all published pages indexed in Google Search. Zero indexation means zero organic traffic.",
    kpis: [
      {
        id: "indexed_pages",
        name: "Indexed Pages",
        unit: "pages",
        target30d: 20,
        target90d: 50,
        direction: "higher",
        criticalThreshold: 1,
      },
      {
        id: "crawl_errors",
        name: "Crawl Errors",
        unit: "errors",
        target30d: 5,
        target90d: 0,
        direction: "lower",
        criticalThreshold: 20,
      },
    ],
    ownerAgent: "seo-agent",
    contributingAgents: ["seo-orchestrator", "live-site-auditor"],
  },
  {
    id: "organic_traffic",
    name: "Organic Search Traffic",
    description:
      "Drive organic search traffic from Google, Bing, and AI-powered search engines.",
    kpis: [
      {
        id: "organic_sessions",
        name: "Organic Sessions",
        unit: "sessions/month",
        target30d: 200,
        target90d: 1000,
        direction: "higher",
        criticalThreshold: 10,
      },
      {
        id: "gsc_clicks",
        name: "GSC Clicks (28d)",
        unit: "clicks",
        target30d: 100,
        target90d: 500,
        direction: "higher",
      },
      {
        id: "gsc_impressions",
        name: "GSC Impressions (28d)",
        unit: "impressions",
        target30d: 2000,
        target90d: 10000,
        direction: "higher",
      },
    ],
    ownerAgent: "seo-agent",
    contributingAgents: ["content-generator", "weekly-research"],
  },
  {
    id: "content_quality",
    name: "Content Quality & Freshness",
    description:
      "Publish high-quality, SEO-optimized bilingual content regularly.",
    kpis: [
      {
        id: "avg_seo_score",
        name: "Average SEO Score",
        unit: "score (0-100)",
        target30d: 80,
        target90d: 90,
        direction: "higher",
        criticalThreshold: 50,
      },
      {
        id: "published_this_week",
        name: "Articles Published This Week",
        unit: "articles",
        target30d: 7,
        target90d: 14,
        direction: "higher",
        criticalThreshold: 1,
      },
      {
        id: "ar_content_ratio",
        name: "Arabic Content Coverage",
        unit: "percentage",
        target30d: 50,
        target90d: 90,
        direction: "higher",
        criticalThreshold: 20,
      },
    ],
    ownerAgent: "content-generator",
    contributingAgents: ["seo-agent", "topic-orchestrator"],
  },
  {
    id: "technical_health",
    name: "Technical SEO Health",
    description:
      "Ensure all URLs resolve, structured data is valid, robots.txt is clean, and the site performs well.",
    kpis: [
      {
        id: "sitemap_health",
        name: "Sitemap URL Health",
        unit: "percentage healthy",
        target30d: 100,
        target90d: 100,
        direction: "higher",
        criticalThreshold: 80,
      },
      {
        id: "schema_validity",
        name: "Structured Data Validity",
        unit: "percentage valid",
        target30d: 100,
        target90d: 100,
        direction: "higher",
        criticalThreshold: 70,
      },
      {
        id: "robots_conflicts",
        name: "robots.txt Conflicts",
        unit: "conflicts",
        target30d: 0,
        target90d: 0,
        direction: "lower",
        criticalThreshold: 1,
      },
      {
        id: "cache_hit_rate",
        name: "CDN Cache Hit Rate",
        unit: "percentage",
        target30d: 50,
        target90d: 80,
        direction: "higher",
        criticalThreshold: 10,
      },
    ],
    ownerAgent: "live-site-auditor",
    contributingAgents: ["seo-orchestrator"],
  },
  {
    id: "ai_visibility",
    name: "AI Search Visibility",
    description:
      "Ensure content is accessible to AI-powered search (Google AI Overviews, Perplexity, ChatGPT, Claude).",
    kpis: [
      {
        id: "ai_crawlers_allowed",
        name: "AI Crawlers Allowed",
        unit: "crawlers",
        target30d: 8,
        target90d: 8,
        direction: "higher",
        criticalThreshold: 4,
      },
      {
        id: "llms_txt_present",
        name: "llms.txt Present",
        unit: "boolean (0/1)",
        target30d: 1,
        target90d: 1,
        direction: "higher",
      },
    ],
    ownerAgent: "weekly-research",
    contributingAgents: ["live-site-auditor"],
  },
];

/**
 * Evaluate all KPIs against current data and return a prioritized action list.
 */
export function evaluateGoals(
  currentMetrics: Record<string, number>
): GoalEvaluation[] {
  const evaluations: GoalEvaluation[] = [];

  for (const goal of BUSINESS_GOALS) {
    const kpiResults: KPIEvaluation[] = [];

    for (const kpi of goal.kpis) {
      const current = currentMetrics[kpi.id];
      const status = evaluateKPI(kpi, current);
      kpiResults.push({ kpi, currentValue: current, status });
    }

    const overallStatus = kpiResults.some((k) => k.status === "critical")
      ? "critical"
      : kpiResults.some((k) => k.status === "behind")
        ? "behind"
        : kpiResults.some((k) => k.status === "on_track")
          ? "on_track"
          : "achieved";

    evaluations.push({
      goal,
      kpiResults,
      overallStatus,
      priority: overallStatus === "critical" ? 0 : overallStatus === "behind" ? 1 : 2,
    });
  }

  return evaluations.sort((a, b) => a.priority - b.priority);
}

function evaluateKPI(
  kpi: KPI,
  current: number | undefined
): "critical" | "behind" | "on_track" | "achieved" {
  if (current === undefined) return "behind";

  if (kpi.criticalThreshold !== undefined) {
    if (kpi.direction === "higher" && current < kpi.criticalThreshold)
      return "critical";
    if (kpi.direction === "lower" && current > kpi.criticalThreshold)
      return "critical";
  }

  if (kpi.direction === "higher") {
    if (current >= kpi.target90d) return "achieved";
    if (current >= kpi.target30d * 0.7) return "on_track";
    return "behind";
  } else {
    if (current <= kpi.target90d) return "achieved";
    if (current <= kpi.target30d * 1.3) return "on_track";
    return "behind";
  }
}

export interface GoalEvaluation {
  goal: BusinessGoal;
  kpiResults: KPIEvaluation[];
  overallStatus: "critical" | "behind" | "on_track" | "achieved";
  priority: number;
}

export interface KPIEvaluation {
  kpi: KPI;
  currentValue: number | undefined;
  status: "critical" | "behind" | "on_track" | "achieved";
}
