/**
 * GET  /api/admin/chrome-bridge/ab-test?siteId=X&status=active|concluded|all
 * POST /api/admin/chrome-bridge/ab-test — register a new test
 *
 * Tests can be registered by Claude Chrome as part of audit reports. Once
 * registered, frontend components read cookie `ab_<testId>=A|B` and render
 * the assigned variant. Events tracked via POST /ab-test/track.
 *
 * Variant types:
 *   - title            — swap page <title> (limited SEO value; bots see default)
 *   - meta_description — swap <meta name="description">
 *   - affiliate_cta    — swap affiliate CTA copy (RECOMMENDED — direct revenue)
 *   - hero             — swap hero headline + subcopy
 *   - content_section  — swap a content block (requires targetSelector)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import { computeAbTestResult } from "@/lib/chrome-bridge/ab-test-stats";
import { z } from "zod";

export const dynamic = "force-dynamic";

const VARIANT_TYPES = [
  "title",
  "meta_description",
  "affiliate_cta",
  "hero",
  "content_section",
] as const;

const PRIMARY_METRICS = [
  "click",
  "conversion",
  "scroll_depth",
  "engagement",
] as const;

const RegisterAbTestSchema = z.object({
  siteId: z.string().min(1),
  targetUrl: z.string().url(),
  variantType: z.enum(VARIANT_TYPES),
  targetSelector: z.string().optional(),
  variantA: z.object({
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
  }),
  variantB: z.object({
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
  }),
  trafficSplit: z.number().min(0.05).max(0.95).default(0.5),
  primaryMetric: z.enum(PRIMARY_METRICS).default("click"),
  reportId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const siteId = request.nextUrl.searchParams.get("siteId") ?? undefined;
    const statusParam = request.nextUrl.searchParams.get("status") ?? "all";
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50", 10),
      200,
    );

    const where: Record<string, unknown> = {};
    if (siteId) where.siteId = siteId;
    if (statusParam !== "all") where.status = statusParam;

    const tests = await prisma.abTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const enriched = tests.map((t) => {
      const primaryMetric = t.primaryMetric;
      const successesA = primaryMetric === "conversion" ? t.conversionsA : t.clicksA;
      const successesB = primaryMetric === "conversion" ? t.conversionsB : t.clicksB;
      const result = computeAbTestResult({
        impressionsA: t.impressionsA,
        impressionsB: t.impressionsB,
        successesA,
        successesB,
      });
      return {
        ...t,
        stats: result,
      };
    });

    return NextResponse.json({
      success: true,
      count: enriched.length,
      tests: enriched,
      _hints: buildHints({ justCalled: "ab-test" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ab-test GET]", message);
    return NextResponse.json(
      { error: "Failed to load A/B tests", details: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = RegisterAbTestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const payload = parsed.data;

    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");
    if (!getActiveSiteIds().includes(payload.siteId)) {
      return NextResponse.json(
        { error: `Unknown siteId: ${payload.siteId}` },
        { status: 400 },
      );
    }

    // Prevent duplicate active tests on same URL+variantType
    const existing = await prisma.abTest.findFirst({
      where: {
        siteId: payload.siteId,
        targetUrl: payload.targetUrl,
        variantType: payload.variantType,
        status: "active",
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "Active test already exists for this URL + variantType",
          existingTestId: existing.id,
        },
        { status: 409 },
      );
    }

    // content_section requires a targetSelector
    if (payload.variantType === "content_section" && !payload.targetSelector) {
      return NextResponse.json(
        { error: "content_section variantType requires targetSelector" },
        { status: 400 },
      );
    }

    const created = await prisma.abTest.create({
      data: {
        siteId: payload.siteId,
        targetUrl: payload.targetUrl,
        variantType: payload.variantType,
        targetSelector: payload.targetSelector,
        variantA: payload.variantA as unknown as object,
        variantB: payload.variantB as unknown as object,
        trafficSplit: payload.trafficSplit,
        primaryMetric: payload.primaryMetric,
        reportId: payload.reportId,
        notes: payload.notes,
      },
    });

    return NextResponse.json({
      success: true,
      testId: created.id,
      status: created.status,
      integrationHint:
        "Frontend must read cookie `ab_" +
        created.id +
        "` (value A or B) and render the matching variant. Events fired via POST /ab-test/track.",
      _hints: buildHints({ justCalled: "ab-test" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ab-test POST]", message);
    return NextResponse.json(
      { error: "Failed to register A/B test", details: message },
      { status: 500 },
    );
  }
}
