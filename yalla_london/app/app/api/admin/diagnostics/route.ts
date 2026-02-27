export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

// ── Available test groups ─────────────────────────────────────────────────────

const AVAILABLE_GROUPS = [
  { id: "general", label: "General Platform", description: "Database, AI providers, env vars, assets, core pages", tests: 40 },
  { id: "pipeline", label: "Content Pipeline", description: "Topics, drafts, phases, reservoir, publishing", tests: 25 },
  { id: "indexing", label: "Indexing & SEO", description: "Config validation, submission tracking, Google coverage, velocity, blocker detection, cron health, content quality", tests: 25 },
  { id: "seo", label: "SEO Agent", description: "SEO orchestrator, health reports, pre-pub gate", tests: 15 },
  { id: "crons", label: "Cron Jobs", description: "Schedule verification, last-run health, timeouts", tests: 20 },
  { id: "yachts", label: "Zenitha Yachts", description: "Public APIs, admin APIs, yacht DB models", tests: 15 },
  { id: "commerce", label: "Commerce & Etsy", description: "Etsy sync, commerce trends, shop config", tests: 10 },
  { id: "security", label: "Security", description: "Auth routes, CRON_SECRET, XSS checks", tests: 10 },
  { id: "ai-costs", label: "AI Costs", description: "Provider config, usage logging, cost tracking", tests: 10 },
];

const QUICK_GROUPS = ["general", "security"];
const FULL_GROUPS = AVAILABLE_GROUPS.map((g) => g.id);

// ── GET: Available groups + last run summary ──────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId") || request.headers.get("x-site-id") || getDefaultSiteId();

  let lastRuns: Array<Record<string, unknown>> = [];
  try {
    lastRuns = await prisma.systemDiagnostic.findMany({
      where: siteId !== "all" ? { OR: [{ siteId }, { siteId: null }] } : {},
      orderBy: { created_at: "desc" },
      take: 5,
      select: {
        id: true,
        runId: true,
        mode: true,
        groups: true,
        totalTests: true,
        passed: true,
        warnings: true,
        failed: true,
        healthScore: true,
        verdict: true,
        fixesAttempted: true,
        fixesSucceeded: true,
        durationMs: true,
        created_at: true,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      // Table doesn't exist yet — return empty
    } else {
      console.warn("[diagnostics] Failed to load history:", msg);
    }
  }

  return NextResponse.json({
    availableGroups: AVAILABLE_GROUPS,
    quickGroups: QUICK_GROUPS,
    fullGroups: FULL_GROUPS,
    lastRuns,
    siteId,
  });
});

// ── POST: Run diagnostics ─────────────────────────────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  const BUDGET_MS = 50_000; // 50s budget (10s buffer from Vercel 60s limit)
  const cronStart = Date.now();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { mode = "quick", groups: requestedGroups, siteId: requestSiteId } = body;
  const siteId = requestSiteId || getDefaultSiteId();

  // Determine which groups to run
  let groups: string[];
  if (mode === "quick") {
    groups = QUICK_GROUPS;
  } else if (mode === "full") {
    groups = FULL_GROUPS;
  } else if (mode === "group" && Array.isArray(requestedGroups)) {
    groups = requestedGroups.filter((g: string) => AVAILABLE_GROUPS.some((ag) => ag.id === g));
  } else {
    groups = QUICK_GROUPS;
  }

  // Run the diagnostic sections
  const allResults: Array<{
    id: string;
    section: string;
    name: string;
    status: "pass" | "warn" | "fail";
    detail: string;
    diagnosis?: string;
    explanation: string;
    fixAction?: {
      id: string;
      label: string;
      api: string;
      payload?: Record<string, unknown>;
      rerunGroup?: string;
    };
  }> = [];

  const envConfirmed: string[] = [];
  const envMissing: string[] = [];

  try {
    // Dynamically import the runner
    const { runDiagnosticGroups } = await import("@/lib/system-diagnostics/runner");
    const result = await runDiagnosticGroups(groups, siteId, BUDGET_MS, cronStart);
    allResults.push(...result.results);
    envConfirmed.push(...(result.envConfirmed || []));
    envMissing.push(...(result.envMissing || []));
  } catch (runErr) {
    const msg = runErr instanceof Error ? runErr.message : String(runErr);
    console.error("[diagnostics] Runner error:", msg);
    allResults.push({
      id: "runner-error",
      section: "system",
      name: "Diagnostic Runner",
      status: "fail",
      detail: `Runner crashed: ${msg}`,
      explanation: "The diagnostic engine itself failed to start. This usually means a code error in the diagnostic runner.",
    });
  }

  // Compute aggregates
  const passed = allResults.filter((r) => r.status === "pass").length;
  const warnings = allResults.filter((r) => r.status === "warn").length;
  const failed = allResults.filter((r) => r.status === "fail").length;
  const totalTests = allResults.length;
  const healthScore = totalTests > 0 ? Math.round(((passed + warnings * 0.5) / totalTests) * 100) : 0;

  let verdict = "UNKNOWN";
  if (failed === 0 && warnings === 0) verdict = "ALL_SYSTEMS_GO";
  else if (failed === 0) verdict = "OPERATIONAL";
  else if (failed <= 3) verdict = "NEEDS_ATTENTION";
  else verdict = "CRITICAL";

  const durationMs = Date.now() - cronStart;
  const runId = `diag-${siteId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Generate recommendations
  const recommendations: string[] = [];
  if (failed > 0) {
    const failedTests = allResults.filter((r) => r.status === "fail");
    const fixableCount = failedTests.filter((r) => r.fixAction).length;
    if (fixableCount > 0) {
      recommendations.push(`${fixableCount} failed test(s) have one-tap fixes available. Click "Fix Now" on each.`);
    }
    const unfixable = failedTests.filter((r) => !r.fixAction);
    if (unfixable.length > 0) {
      recommendations.push(`${unfixable.length} issue(s) require manual intervention or configuration changes.`);
    }
  }
  if (mode === "quick" && (failed > 0 || warnings > 3)) {
    recommendations.push("Quick scan found issues. Run a Full scan for comprehensive diagnosis.");
  }

  // Persist to DB
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.systemDiagnostic.create({
      data: {
        siteId: siteId !== "all" ? siteId : null,
        runId,
        mode,
        groups,
        totalTests,
        passed,
        warnings,
        failed,
        healthScore,
        verdict,
        results: allResults as unknown as Record<string, unknown>[],
        envStatus: { confirmed: envConfirmed, missing: envMissing },
        recommendations,
        durationMs,
      },
    });
  } catch (saveErr) {
    const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
    // Don't fail the whole response if we can't save — just warn
    if (!msg.includes("P2021") && !msg.includes("does not exist")) {
      console.warn("[diagnostics] Failed to persist results:", msg);
    }
  }

  return NextResponse.json({
    runId,
    mode,
    groups,
    siteId,
    totalTests,
    passed,
    warnings,
    failed,
    healthScore,
    verdict,
    results: allResults,
    envStatus: { confirmed: envConfirmed, missing: envMissing },
    recommendations,
    durationMs,
  });
});
