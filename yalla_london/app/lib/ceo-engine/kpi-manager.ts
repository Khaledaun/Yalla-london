/**
 * CEO Intelligence Engine — KPI Manager
 *
 * Stores, retrieves, and auto-adjusts business KPIs per site.
 * Storage: SiteSettings table with category "ceo-kpis".
 * Default KPIs seeded from CLAUDE.md business targets on first access.
 */

const KPI_CATEGORY = "ceo-kpis";

// ── Types ──────────────────────────────────────────────────────────────

export interface KPITarget {
  metric: string;
  label: string;
  unit: string;
  target30d: number;
  target90d: number;
  current?: number;
  lastUpdated?: string;
}

export interface KPISet {
  version: number;
  kpis: KPITarget[];
  lastUpdated: string;
  lastAdjusted?: string;
}

export interface KPIDelta {
  metric: string;
  label: string;
  unit: string;
  target: number;
  actual: number;
  delta: number;
  deltaPercent: number | null;
  status: "green" | "amber" | "red";
}

// ── Default KPIs (from CLAUDE.md Business KPIs table) ──────────────────

const DEFAULT_KPIS: KPITarget[] = [
  {
    metric: "indexedPages",
    label: "Indexed Pages",
    unit: "pages",
    target30d: 20,
    target90d: 50,
  },
  {
    metric: "organicSessions",
    label: "Organic Sessions",
    unit: "sessions",
    target30d: 200,
    target90d: 1000,
  },
  {
    metric: "averageCTR",
    label: "Average CTR",
    unit: "%",
    target30d: 3.0,
    target90d: 4.5,
  },
  {
    metric: "lcpMs",
    label: "LCP (Largest Contentful Paint)",
    unit: "ms",
    target30d: 2500,
    target90d: 2000,
  },
  {
    metric: "contentVelocity",
    label: "Content Velocity",
    unit: "articles/day",
    target30d: 2,
    target90d: 3,
  },
  {
    metric: "affiliateClicks",
    label: "Affiliate Clicks",
    unit: "clicks/month",
    target30d: 50,
    target90d: 500,
  },
  {
    metric: "publishedArticles",
    label: "Published Articles",
    unit: "total",
    target30d: 60,
    target90d: 150,
  },
  {
    metric: "seoScore",
    label: "Avg SEO Score",
    unit: "score",
    target30d: 65,
    target90d: 75,
  },
];

// ── Public API ─────────────────────────────────────────────────────────

export async function getKPIs(siteId: string): Promise<KPISet> {
  const { prisma } = await import("@/lib/db");

  const setting = await prisma.siteSettings.findFirst({
    where: { siteId, category: KPI_CATEGORY },
  });

  if (setting?.config && typeof setting.config === "object") {
    const config = setting.config as Record<string, unknown>;
    if (Array.isArray(config.kpis) && config.kpis.length > 0) {
      return config as unknown as KPISet;
    }
  }

  // Seed defaults on first access
  const defaultSet: KPISet = {
    version: 1,
    kpis: DEFAULT_KPIS,
    lastUpdated: new Date().toISOString(),
  };

  await prisma.siteSettings.upsert({
    where: {
      siteId_category: { siteId, category: KPI_CATEGORY },
    },
    update: { config: defaultSet as unknown as Record<string, unknown> },
    create: { siteId, category: KPI_CATEGORY, config: defaultSet as unknown as Record<string, unknown> },
  });

  return defaultSet;
}

export async function updateKPIs(siteId: string, kpis: KPITarget[]): Promise<KPISet> {
  const { prisma } = await import("@/lib/db");

  const updated: KPISet = {
    version: 1,
    kpis,
    lastUpdated: new Date().toISOString(),
  };

  await prisma.siteSettings.upsert({
    where: {
      siteId_category: { siteId, category: KPI_CATEGORY },
    },
    update: { config: updated as unknown as Record<string, unknown> },
    create: { siteId, category: KPI_CATEGORY, config: updated as unknown as Record<string, unknown> },
  });

  return updated;
}

/**
 * Compare actual metrics against KPI targets.
 * Returns per-KPI delta with traffic-light status.
 */
export function compareMetrics(
  kpis: KPITarget[],
  actuals: Record<string, number>,
): KPIDelta[] {
  return kpis.map((kpi) => {
    const actual = actuals[kpi.metric] ?? 0;
    const target = kpi.target30d;
    const delta = actual - target;

    // For LCP, lower is better
    const isLowerBetter = kpi.metric === "lcpMs";
    const ratio = target === 0 ? null : (actual / target);

    let status: "green" | "amber" | "red";
    if (isLowerBetter) {
      status = actual <= target ? "green" : actual <= target * 1.3 ? "amber" : "red";
    } else {
      status = ratio !== null && ratio >= 0.8 ? "green" : ratio !== null && ratio >= 0.5 ? "amber" : "red";
    }

    return {
      metric: kpi.metric,
      label: kpi.label,
      unit: kpi.unit,
      target,
      actual: Math.round(actual * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      deltaPercent: target === 0 ? null : Math.round(((actual - target) / target) * 10000) / 100,
      status,
    };
  });
}

/**
 * AI-assisted KPI recalibration.
 * Called quarterly (or manually). If targets are met, raises them.
 * If far behind, adjusts timeline. Returns updated KPIs WITHOUT saving.
 */
export async function suggestKPIAdjustments(
  siteId: string,
  kpis: KPITarget[],
  actuals: Record<string, number>,
): Promise<{ suggestions: string; adjustedKpis: KPITarget[] }> {
  const { generateCompletion } = await import("@/lib/ai/provider");

  const kpiSummary = kpis
    .map((k) => `${k.label}: target=${k.target30d}${k.unit}, actual=${actuals[k.metric] ?? "N/A"}${k.unit}`)
    .join("\n");

  const result = await generateCompletion(
    [
      {
        role: "user",
        content: `You are a travel website growth strategist. Based on these KPI results, suggest adjusted 30-day and 90-day targets.

Current KPIs vs Actuals:
${kpiSummary}

Rules:
- If a metric exceeds its 30-day target, increase the target by 20-50%
- If a metric is below 50% of target, keep it the same (don't lower)
- If a metric is 50-80% of target, keep it the same
- Always respond with valid JSON array of objects with fields: metric, target30d, target90d, reason

Respond ONLY with JSON, no markdown.`,
      },
    ],
    {
      maxTokens: 1000,
      temperature: 0.3,
      taskType: "ceo-kpi-adjust",
      calledFrom: "kpi-manager",
      siteId,
      timeoutMs: 15000,
    },
  );

  let adjustedKpis = [...kpis];
  let suggestions = "No AI suggestions available";

  try {
    const parsed = JSON.parse(result.content) as Array<{
      metric: string;
      target30d: number;
      target90d: number;
      reason: string;
    }>;
    suggestions = parsed.map((p) => `${p.metric}: ${p.reason}`).join("\n");
    for (const suggestion of parsed) {
      const idx = adjustedKpis.findIndex((k) => k.metric === suggestion.metric);
      if (idx >= 0) {
        adjustedKpis[idx] = {
          ...adjustedKpis[idx],
          target30d: suggestion.target30d,
          target90d: suggestion.target90d,
        };
      }
    }
  } catch (err) {
    console.warn("[kpi-manager] Failed to parse AI KPI suggestions:", err instanceof Error ? err.message : String(err));
  }

  return { suggestions, adjustedKpis };
}
