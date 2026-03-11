export const dynamic = "force-dynamic";
export const maxDuration = 300; // 300s Vercel Pro limit for test-all

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { runLiveTest, getAvailableTestTypes } from "@/lib/dev-tasks/live-tests";
import { getPlan, getPlanTasks, computePhaseReadiness, computeProjectReadiness } from "@/lib/dev-tasks/plan-registry";
import type { LiveTestResult } from "@/lib/dev-tasks/live-tests";
import { getDefaultSiteId } from "@/config/sites";

// ── POST: Run a single test or all tests ─────────────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, testType, taskId, planId, siteId: bodySiteId } = body;
  const siteId = bodySiteId || request.headers.get("x-site-id") || getDefaultSiteId();

  // ── Single test execution ────────────────────────────────────────────
  if (action === "run_test" || (!action && testType)) {
    const type = testType;
    if (!type) {
      return NextResponse.json({ error: "testType required" }, { status: 400 });
    }

    const result = await runLiveTest(type, siteId);

    // Update DevTask metadata with test results if taskId provided
    if (taskId) {
      try {
        const { prisma } = await import("@/lib/db");
        const task = await prisma.devTask.findUnique({ where: { id: taskId } });
        if (task) {
          const existingMeta = (task.metadata as Record<string, unknown>) || {};
          await prisma.devTask.update({
            where: { id: taskId },
            data: {
              metadata: {
                ...existingMeta,
                readiness: result.readiness,
                lastTestDate: result.timestamp,
                lastTestResult: {
                  success: result.success,
                  readiness: result.readiness,
                  durationMs: result.durationMs,
                  plainLanguage: result.plainLanguage,
                  timestamp: result.timestamp,
                },
              },
            },
          });
        }
      } catch (err) {
        console.warn("[dev-tasks/test] Failed to update task metadata:", err instanceof Error ? err.message : err);
      }
    }

    return NextResponse.json({ success: true, result });
  }

  // ── Test All: run all tests for a plan sequentially ──────────────────
  if (action === "test_all") {
    const plan = getPlan(planId || "stage-a");
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const TOTAL_BUDGET_MS = 280_000; // 300s limit - 20s buffer
    const PER_TEST_BUDGET_MS = 25_000;
    const startTime = Date.now();

    const results: Array<{
      taskId: string;
      testType: string;
      result: LiveTestResult;
    }> = [];

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const task of plan.tasks) {
      const elapsed = Date.now() - startTime;
      const remaining = TOTAL_BUDGET_MS - elapsed;

      if (remaining < PER_TEST_BUDGET_MS) {
        // Not enough time remaining — skip
        results.push({
          taskId: task.id,
          testType: task.testType,
          result: {
            success: null,
            readiness: 0,
            timestamp: new Date().toISOString(),
            durationMs: 0,
            plainLanguage: `Skipped — not enough time remaining (${Math.round(remaining / 1000)}s left, need 25s)`,
            json: { skipped: true, remainingMs: remaining },
          },
        });
        skipped++;
        continue;
      }

      if (!task.testable) {
        results.push({
          taskId: task.id,
          testType: task.testType,
          result: {
            success: null,
            readiness: 0,
            timestamp: new Date().toISOString(),
            durationMs: 0,
            plainLanguage: "Test not available for this task.",
            json: { testable: false },
          },
        });
        skipped++;
        continue;
      }

      const result = await runLiveTest(task.testType, siteId);
      results.push({ taskId: task.id, testType: task.testType, result });

      if (result.success === true) passed++;
      else if (result.success === false) failed++;
      else skipped++;
    }

    const totalDurationMs = Date.now() - startTime;

    // Compute project readiness from test results
    const readinessValues = results.filter((r) => r.result.success !== null).map((r) => r.result.readiness);
    const avgReadiness = readinessValues.length > 0
      ? Math.round(readinessValues.reduce((a, b) => a + b, 0) / readinessValues.length)
      : 0;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        passed,
        failed,
        skipped,
        readiness: avgReadiness,
        durationMs: totalDurationMs,
        plan: plan.id,
        project: plan.project,
      },
      results,
    });
  }

  // ── List available test types ────────────────────────────────────────
  if (action === "list_tests") {
    return NextResponse.json({
      success: true,
      testTypes: getAvailableTestTypes(),
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
});
