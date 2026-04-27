/**
 * Briefing KPI configuration
 *
 * Per-site KPI targets that the CEO sets via /api/admin/briefing-kpis.
 * Stored in SiteSettings under category "briefing-kpis" so we don't need
 * a schema change.
 *
 * Defaults seeded from CLAUDE.md "Business KPIs" table on first read.
 */

import { prisma } from "@/lib/db";

export interface BriefingKpis {
  // Defaults from CLAUDE.md Business KPIs
  indexedPages: { target30d: number; target90d: number };
  organicSessions: { target30d: number; target90d: number };
  avgCtr: { target30d: number; target90d: number };
  lcpSeconds: { target30d: number; target90d: number };
  visitorToLead: { target30d: number; target90d: number };
  contentVelocityPerDay: { target30d: number; target90d: number };
  revenuePerVisitDelta: { target30d: number; target90d: number };
  // CEO-defined extras
  customKpis: Array<{
    name: string;
    target30d: number;
    target90d: number;
    unit: string;
    notes?: string;
  }>;
}

const DEFAULT_KPIS: BriefingKpis = {
  indexedPages: { target30d: 20, target90d: 50 },
  organicSessions: { target30d: 200, target90d: 1000 },
  avgCtr: { target30d: 0.03, target90d: 0.045 },
  lcpSeconds: { target30d: 2.5, target90d: 2.0 },
  visitorToLead: { target30d: 0.015, target90d: 0.03 },
  contentVelocityPerDay: { target30d: 2, target90d: 3 },
  revenuePerVisitDelta: { target30d: 1.0, target90d: 1.2 },
  customKpis: [],
};

const SETTING_CATEGORY = "briefing-kpis";

export async function getBriefingKpis(siteId: string): Promise<BriefingKpis> {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { siteId_category: { siteId, category: SETTING_CATEGORY } },
      select: { config: true },
    });
    if (!setting?.config) return { ...DEFAULT_KPIS };
    // Merge stored values over defaults so newer fields auto-fill.
    const stored = setting.config as Partial<BriefingKpis>;
    return {
      ...DEFAULT_KPIS,
      ...stored,
      customKpis: stored.customKpis || [],
    };
  } catch {
    // SiteSettings may not exist on every deploy; defaults still work.
    return { ...DEFAULT_KPIS };
  }
}

export async function setBriefingKpis(siteId: string, kpis: Partial<BriefingKpis>): Promise<BriefingKpis> {
  const current = await getBriefingKpis(siteId);
  const merged: BriefingKpis = {
    ...current,
    ...kpis,
    customKpis: kpis.customKpis ?? current.customKpis,
  };

  // SiteSettings has @@unique([siteId, category]) so upsert is safe and
  // atomic — no read-then-write race.
  await prisma.siteSettings.upsert({
    where: { siteId_category: { siteId, category: SETTING_CATEGORY } },
    create: {
      siteId,
      category: SETTING_CATEGORY,
      config: merged as unknown as Record<string, unknown>,
    },
    update: {
      config: merged as unknown as Record<string, unknown>,
    },
  });
  return merged;
}

/**
 * Compute progress against the 30-day target. Returns a value 0..1+ where
 * 1.0 = on target, < 1.0 = behind, > 1.0 = ahead. Returns null when the
 * input is null/undefined.
 */
export function progressVsTarget(actual: number | null | undefined, target: number): number | null {
  if (actual === null || actual === undefined) return null;
  if (target === 0) return null;
  return actual / target;
}

/**
 * Letter grade for a progress ratio. Used in briefing summary.
 */
export function gradeForProgress(progress: number | null): "A" | "B" | "C" | "D" | "F" | "?" {
  if (progress === null) return "?";
  if (progress >= 1.0) return "A";
  if (progress >= 0.8) return "B";
  if (progress >= 0.6) return "C";
  if (progress >= 0.4) return "D";
  return "F";
}

export const BRIEFING_KPI_DEFAULTS = DEFAULT_KPIS;
