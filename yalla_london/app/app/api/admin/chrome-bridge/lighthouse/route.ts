/**
 * GET /api/admin/chrome-bridge/lighthouse?url=X&strategy=mobile|desktop
 *
 * Wraps PageSpeed Insights v5 (via lib/performance/site-auditor.auditPage)
 * so Claude Chrome can correlate visual/UX findings with Core Web Vitals.
 *
 * Returns Core Web Vitals (LCP, INP, CLS, FCP, TBT, Speed Index) + category
 * scores (performance, accessibility, best-practices, seo) + interpreted
 * findings matched against Google's CWV thresholds.
 *
 * Env var required: GOOGLE_PAGESPEED_API_KEY (or PAGESPEED_API_KEY / PSI_API_KEY)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";
import type { Finding, InterpretedAction, Severity } from "@/lib/chrome-bridge/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Google Core Web Vitals thresholds (2026)
const LCP_GOOD_MS = 2500;
const LCP_NEEDS_IMPROVEMENT_MS = 4000;
const INP_GOOD_MS = 200;
const INP_NEEDS_IMPROVEMENT_MS = 500;
const CLS_GOOD = 0.1;
const CLS_NEEDS_IMPROVEMENT = 0.25;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const url = request.nextUrl.searchParams.get("url");
    const strategy = (request.nextUrl.searchParams.get("strategy") === "desktop"
      ? "desktop"
      : "mobile") as "mobile" | "desktop";

    if (!url) {
      return NextResponse.json(
        { error: "Missing `url` query param" },
        { status: 400 },
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const apiKeySet = !!(
      process.env.GOOGLE_PAGESPEED_API_KEY ||
      process.env.PAGESPEED_API_KEY ||
      process.env.PSI_API_KEY
    );

    if (!apiKeySet) {
      return NextResponse.json(
        {
          success: false,
          error: "PageSpeed API key not configured",
          hint: "Set GOOGLE_PAGESPEED_API_KEY in Vercel env vars. Key must be type 'API Key' (starts with AIza), not OAuth credential.",
        },
        { status: 503 },
      );
    }

    const { auditPage } = await import("@/lib/performance/site-auditor");
    const result = await auditPage(url, strategy);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          url,
          strategy,
          error: result.error,
        },
        { status: 500 },
      );
    }

    const { findings, actions } = interpretLighthouseResult(result);

    return NextResponse.json({
      success: true,
      url,
      strategy,
      coreWebVitals: {
        lcp: { ms: result.lcpMs, rating: rateLCP(result.lcpMs) },
        inp: { ms: result.inpMs, rating: rateINP(result.inpMs) },
        cls: { score: result.clsScore, rating: rateCLS(result.clsScore) },
        fcp: { ms: result.fcpMs },
        tbt: { ms: result.tbtMs },
        speedIndex: result.speedIndex,
      },
      scores: {
        performance: result.performanceScore,
        accessibility: result.accessibilityScore,
        bestPractices: result.bestPracticesScore,
        seo: result.seoScore,
      },
      diagnostics: result.diagnostics?.slice(0, 10) ?? [],
      findings,
      interpretedActions: actions,
      _hints: buildHints({ justCalled: "lighthouse" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/lighthouse]", message);
    return NextResponse.json(
      { error: "Failed to run Lighthouse audit", details: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Interpretation
// ---------------------------------------------------------------------------

function rateLCP(ms: number | null): string {
  if (ms === null) return "unknown";
  if (ms <= LCP_GOOD_MS) return "good";
  if (ms <= LCP_NEEDS_IMPROVEMENT_MS) return "needs-improvement";
  return "poor";
}

function rateINP(ms: number | null): string {
  if (ms === null) return "unknown";
  if (ms <= INP_GOOD_MS) return "good";
  if (ms <= INP_NEEDS_IMPROVEMENT_MS) return "needs-improvement";
  return "poor";
}

function rateCLS(score: number | null): string {
  if (score === null) return "unknown";
  if (score <= CLS_GOOD) return "good";
  if (score <= CLS_NEEDS_IMPROVEMENT) return "needs-improvement";
  return "poor";
}

function interpretLighthouseResult(result: {
  lcpMs: number | null;
  inpMs: number | null;
  clsScore: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  seoScore: number | null;
  bestPracticesScore: number | null;
}): { findings: Finding[]; actions: InterpretedAction[] } {
  const findings: Finding[] = [];
  const actions: InterpretedAction[] = [];

  if (result.lcpMs !== null && result.lcpMs > LCP_NEEDS_IMPROVEMENT_MS) {
    const severity: Severity = "critical";
    findings.push({
      pillar: "technical",
      issue: `LCP ${(result.lcpMs / 1000).toFixed(1)}s is poor (target ≤2.5s)`,
      severity,
      metric: { name: "lcp_ms", value: result.lcpMs, benchmark: LCP_GOOD_MS },
    });
    actions.push({
      action: "Optimize LCP: preload hero image, use next/image, reduce server response time, eliminate render-blocking resources",
      priority: "high",
      autoFixable: false,
      estimatedEffort: "medium",
    });
  } else if (result.lcpMs !== null && result.lcpMs > LCP_GOOD_MS) {
    findings.push({
      pillar: "technical",
      issue: `LCP ${(result.lcpMs / 1000).toFixed(1)}s needs improvement`,
      severity: "warning",
      metric: { name: "lcp_ms", value: result.lcpMs, benchmark: LCP_GOOD_MS },
    });
    actions.push({
      action: "Improve LCP: verify hero image is next/image with priority, check Cache-Control headers on critical assets",
      priority: "medium",
      autoFixable: false,
      estimatedEffort: "small",
    });
  }

  if (result.inpMs !== null && result.inpMs > INP_NEEDS_IMPROVEMENT_MS) {
    findings.push({
      pillar: "technical",
      issue: `INP ${result.inpMs}ms is poor (target ≤200ms)`,
      severity: "critical",
      metric: { name: "inp_ms", value: result.inpMs, benchmark: INP_GOOD_MS },
    });
    actions.push({
      action: "Reduce JavaScript main-thread work. Break up long tasks, defer non-critical JS, use useTransition() for state updates",
      priority: "high",
      autoFixable: false,
      estimatedEffort: "medium",
    });
  } else if (result.inpMs !== null && result.inpMs > INP_GOOD_MS) {
    findings.push({
      pillar: "technical",
      issue: `INP ${result.inpMs}ms needs improvement`,
      severity: "warning",
      metric: { name: "inp_ms", value: result.inpMs, benchmark: INP_GOOD_MS },
    });
  }

  if (result.clsScore !== null && result.clsScore > CLS_NEEDS_IMPROVEMENT) {
    findings.push({
      pillar: "ux",
      issue: `CLS ${result.clsScore.toFixed(3)} is poor (target ≤0.1)`,
      severity: "critical",
      metric: { name: "cls", value: result.clsScore, benchmark: CLS_GOOD },
    });
    actions.push({
      action: "Reserve space for images/iframes (set width+height attrs), avoid injecting content above existing content, specify font-display swap",
      priority: "high",
      autoFixable: false,
      estimatedEffort: "medium",
    });
  } else if (result.clsScore !== null && result.clsScore > CLS_GOOD) {
    findings.push({
      pillar: "ux",
      issue: `CLS ${result.clsScore.toFixed(3)} needs improvement`,
      severity: "warning",
      metric: { name: "cls", value: result.clsScore, benchmark: CLS_GOOD },
    });
  }

  // Overall category flags
  if (result.performanceScore !== null && result.performanceScore < 50) {
    findings.push({
      pillar: "technical",
      issue: `Lighthouse performance score ${result.performanceScore}/100 is poor`,
      severity: "critical",
      metric: { name: "performance_score", value: result.performanceScore, benchmark: 90 },
    });
  } else if (result.performanceScore !== null && result.performanceScore < 80) {
    findings.push({
      pillar: "technical",
      issue: `Lighthouse performance score ${result.performanceScore}/100 below 80 target`,
      severity: "warning",
      metric: { name: "performance_score", value: result.performanceScore, benchmark: 90 },
    });
  }

  if (result.accessibilityScore !== null && result.accessibilityScore < 90) {
    findings.push({
      pillar: "accessibility",
      issue: `Accessibility score ${result.accessibilityScore}/100 below 90 target (WCAG AA)`,
      severity: result.accessibilityScore < 70 ? "critical" : "warning",
      metric: { name: "accessibility_score", value: result.accessibilityScore, benchmark: 90 },
    });
    actions.push({
      action: "Review Lighthouse diagnostics — typical issues: missing alt text, low-contrast text, unlabeled form fields, missing landmarks",
      priority: result.accessibilityScore < 70 ? "high" : "medium",
      autoFixable: false,
      estimatedEffort: "small",
    });
  }

  if (result.seoScore !== null && result.seoScore < 90) {
    findings.push({
      pillar: "on_page",
      issue: `Lighthouse SEO score ${result.seoScore}/100 below 90 target`,
      severity: "warning",
      metric: { name: "seo_score", value: result.seoScore, benchmark: 100 },
    });
  }

  return { findings, actions };
}
