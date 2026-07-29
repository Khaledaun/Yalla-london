import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { execSync } from "child_process";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

// ── Test Runner API ─────────────────────────────────────────────────────────
// GET  → list available test suites + last results
// POST → run a specific test suite, return results

const SUITES: Record<string, { script: string; label: string; description: string }> = {
  smoke: {
    script: "scripts/smoke-test.ts",
    label: "Smoke Tests",
    description: "131+ tests: pipeline, security, crons, multi-site, quality gates, SEO, perplexity, CEO dashboard",
  },
  validation: {
    script: "scripts/perplexity-validation.ts",
    label: "Perplexity + CEO Validation",
    description: "60+ tests: templates, task lifecycle, executor, API addresses, timeouts, coherence, CEO fixes",
  },
};

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const suites = Object.entries(SUITES).map(([id, s]) => ({
    id,
    label: s.label,
    description: s.description,
    script: s.script,
    hasLastResult: existsSync(join(process.cwd(), "scripts", `${id === "validation" ? "perplexity-validation" : id}-report.json`)),
  }));

  // Try to load last validation report if it exists
  let lastValidationReport = null;
  const reportPath = join(process.cwd(), "scripts", "perplexity-validation-report.json");
  if (existsSync(reportPath)) {
    try {
      lastValidationReport = JSON.parse(readFileSync(reportPath, "utf-8"));
    } catch { /* ignore */ }
  }

  return NextResponse.json({ suites, lastValidationReport });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { suite } = await request.json();

    if (!suite || !SUITES[suite]) {
      return NextResponse.json({ error: `Invalid suite. Available: ${Object.keys(SUITES).join(", ")}` }, { status: 400 });
    }

    const suiteConfig = SUITES[suite];
    const scriptPath = join(process.cwd(), suiteConfig.script);

    if (!existsSync(scriptPath)) {
      return NextResponse.json({ error: `Script not found: ${suiteConfig.script}` }, { status: 404 });
    }

    // Run the test suite (capture output, allow non-zero exit for failures)
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync(`npx tsx ${suiteConfig.script}`, {
        cwd: process.cwd(),
        encoding: "utf-8",
        timeout: 120_000, // 2 min max
        env: { ...process.env, FORCE_COLOR: "0" }, // disable ANSI colors for clean output
      });
    } catch (err: unknown) {
      // execSync throws on non-zero exit — capture output anyway
      const execErr = err as { stdout?: string; stderr?: string; status?: number };
      stdout = execErr.stdout || "";
      exitCode = execErr.status || 1;
      if (!stdout && execErr.stderr) {
        stdout = execErr.stderr;
      }
    }

    // Try to load the JSON report if the validation suite generated one
    let jsonReport = null;
    if (suite === "validation") {
      const reportPath = join(process.cwd(), "scripts", "perplexity-validation-report.json");
      if (existsSync(reportPath)) {
        try {
          jsonReport = JSON.parse(readFileSync(reportPath, "utf-8"));
        } catch { /* ignore */ }
      }
    }

    // Parse smoke test output into structured results
    let parsedResults: Array<{ name: string; status: string; details: string; category: string }> = [];
    if (suite === "smoke") {
      const lines = stdout.split("\n");
      let currentCategory = "";
      for (const line of lines) {
        const catMatch = line.match(/^---\s+(.+?)\s+\(/);
        if (catMatch) {
          currentCategory = catMatch[1];
          continue;
        }
        // Match ✓/✗/⚠ lines (without ANSI codes since we disabled color)
        const resultMatch = line.match(/^\s*([✓✗⚠])\s+(.+?):\s+(.+)$/);
        if (resultMatch) {
          const statusMap: Record<string, string> = { "✓": "PASS", "✗": "FAIL", "⚠": "WARN" };
          parsedResults.push({
            category: currentCategory,
            name: resultMatch[2].trim(),
            status: statusMap[resultMatch[1]] || "UNKNOWN",
            details: resultMatch[3].trim(),
          });
        }
      }
    }

    // Extract summary line
    const summaryMatch = stdout.match(/TOTAL:\s*(\d+)\s*PASS\s*\|\s*(\d+)\s*FAIL\s*\|\s*(\d+)\s*WARN/);
    const summary = summaryMatch
      ? { pass: parseInt(summaryMatch[1]), fail: parseInt(summaryMatch[2]), warn: parseInt(summaryMatch[3]), total: parseInt(summaryMatch[1]) + parseInt(summaryMatch[2]) + parseInt(summaryMatch[3]) }
      : null;

    const scoreMatch = stdout.match(/Score:\s*(\d+)%/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

    return NextResponse.json({
      suite: suiteConfig.label,
      exitCode,
      summary: jsonReport?.summary || summary,
      score: jsonReport?.summary?.score || score,
      results: jsonReport?.results || parsedResults,
      rawOutput: stdout.slice(0, 10000), // Cap at 10K chars
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[test-runner] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Test runner error" }, { status: 500 });
  }
}
