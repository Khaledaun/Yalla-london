export const dynamic = "force-dynamic";

/**
 * Briefing KPI Config — CEO-facing endpoint
 *
 * GET  /api/admin/briefing-kpis?siteId=...    Read current KPI targets
 * POST /api/admin/briefing-kpis               Update KPI targets (full or partial)
 *
 * Body shape (POST):
 * {
 *   siteId: "yalla-london",
 *   indexedPages?:          { target30d, target90d },
 *   organicSessions?:       { target30d, target90d },
 *   avgCtr?:                { target30d, target90d },
 *   lcpSeconds?:            { target30d, target90d },
 *   visitorToLead?:         { target30d, target90d },
 *   contentVelocityPerDay?: { target30d, target90d },
 *   revenuePerVisitDelta?:  { target30d, target90d },
 *   customKpis?: Array<{ name, target30d, target90d, unit, notes? }>
 * }
 *
 * Spec: docs/briefing/CEO-DAILY-BRIEFING.md → "CEO-set KPIs"
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";
import { BriefingKpis, getBriefingKpis, setBriefingKpis, BRIEFING_KPI_DEFAULTS } from "@/lib/briefing/kpi";

function isKpiTarget(value: unknown): value is { target30d: number; target90d: number } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.target30d === "number" && typeof v.target90d === "number";
}

function isCustomKpi(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.target30d === "number" &&
    typeof v.target90d === "number" &&
    typeof v.unit === "string"
  );
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteIdParam = request.nextUrl.searchParams.get("siteId");
  // If no siteId given, return KPI config for ALL active sites so the
  // CEO can review the full set in one fetch.
  if (!siteIdParam) {
    const sites = getActiveSiteIds();
    const all: Record<string, BriefingKpis> = {};
    for (const id of sites) {
      all[id] = await getBriefingKpis(id);
    }
    return NextResponse.json({
      success: true,
      sites: all,
      defaults: BRIEFING_KPI_DEFAULTS,
    });
  }

  const kpis = await getBriefingKpis(siteIdParam);
  return NextResponse.json({
    success: true,
    siteId: siteIdParam,
    kpis,
    defaults: BRIEFING_KPI_DEFAULTS,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Body must be an object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const siteId = (b.siteId as string) || getDefaultSiteId();

  // Validate each KPI target if present. Reject bodies that look malformed
  // rather than silently storing them.
  const TARGET_KEYS = [
    "indexedPages",
    "organicSessions",
    "avgCtr",
    "lcpSeconds",
    "visitorToLead",
    "contentVelocityPerDay",
    "revenuePerVisitDelta",
  ] as const;

  const update: Partial<BriefingKpis> = {};
  for (const key of TARGET_KEYS) {
    if (b[key] === undefined) continue;
    if (!isKpiTarget(b[key])) {
      return NextResponse.json(
        {
          success: false,
          error: `${key} must be { target30d: number, target90d: number }`,
        },
        { status: 400 },
      );
    }
    (update as Record<string, unknown>)[key] = b[key];
  }

  if (b.customKpis !== undefined) {
    if (!Array.isArray(b.customKpis) || !b.customKpis.every(isCustomKpi)) {
      return NextResponse.json(
        {
          success: false,
          error: "customKpis must be an array of { name, target30d, target90d, unit, notes? }",
        },
        { status: 400 },
      );
    }
    update.customKpis = b.customKpis as BriefingKpis["customKpis"];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ success: false, error: "No valid fields in body — nothing to update" }, { status: 400 });
  }

  const merged = await setBriefingKpis(siteId, update);
  return NextResponse.json({
    success: true,
    siteId,
    kpis: merged,
    updatedFields: Object.keys(update),
  });
}
