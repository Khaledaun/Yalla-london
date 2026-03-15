#!/usr/bin/env npx tsx
/**
 * HTTP Health Probe — API Endpoint Validator
 *
 * Hits every critical API endpoint with a real HTTP request,
 * validates response shape, and reports results.
 *
 * Run:
 *   npx tsx scripts/health-probe.ts
 *   npx tsx scripts/health-probe.ts --base-url=https://www.yalla-london.com
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "http://localhost:3000";
const TIMEOUT_MS = 10_000;

function parseArgs(): { baseUrl: string } {
  const args = process.argv.slice(2);
  let baseUrl = DEFAULT_BASE_URL;
  for (const arg of args) {
    if (arg.startsWith("--base-url=")) {
      baseUrl = arg.slice("--base-url=".length).replace(/\/+$/, "");
    }
  }
  return { baseUrl };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProbeSpec {
  path: string;
  method?: "GET" | "POST";
  group: "admin" | "public" | "cron";
  description: string;
  /** Validate the response. Return null on success, error string on failure. */
  validate: (res: ProbeResponse) => string | null;
}

interface ProbeResponse {
  status: number;
  contentType: string;
  body: string;
  json: Record<string, unknown> | null;
}

interface ProbeResult {
  path: string;
  description: string;
  status: number;
  timeMs: number;
  passed: boolean;
  message: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function hasKeys(json: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!json) return "response is not valid JSON";
  const missing = keys.filter((k) => !(k in json));
  if (missing.length) return `missing keys: ${missing.join(", ")}`;
  return null;
}

function hasAnyKey(json: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!json) return "response is not valid JSON";
  const found = keys.filter((k) => k in json);
  if (found.length === 0) return `none of expected keys found: ${keys.join(", ")}`;
  return null;
}

function isArrayOrHasArrayField(
  json: Record<string, unknown> | null,
  field: string
): string | null {
  if (!json) return "response is not valid JSON";
  if (Array.isArray(json)) return null;
  if (Array.isArray(json[field])) return null;
  return `expected top-level array or "${field}" array`;
}

/** Admin endpoints may return 401/403 — that counts as PASS (auth works). */
function adminOkOrAuth(res: ProbeResponse): boolean {
  return res.status === 200 || res.status === 401 || res.status === 403;
}

/** Cron endpoints may return 200 or 401 — both are fine. */
function cronOkOrAuth(res: ProbeResponse): boolean {
  return res.status === 200 || res.status === 401 || res.status === 403;
}

// ---------------------------------------------------------------------------
// Endpoint definitions
// ---------------------------------------------------------------------------

const PROBES: ProbeSpec[] = [
  // ---- Admin APIs ----
  {
    path: "/api/admin/cockpit",
    group: "admin",
    description: "has pipeline,indexing,sites",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null; // auth — pass
      return hasKeys(res.json, "pipeline", "indexing", "sites");
    },
  },
  {
    path: "/api/admin/content-matrix",
    group: "admin",
    description: "has articles[]",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return isArrayOrHasArrayField(res.json, "articles");
    },
  },
  {
    path: "/api/admin/ai-config",
    group: "admin",
    description: "has providers or routes",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return hasAnyKey(res.json, "providers", "routes");
    },
  },
  {
    path: "/api/admin/departures",
    group: "admin",
    description: "has items[]",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return isArrayOrHasArrayField(res.json, "items");
    },
  },
  {
    path: "/api/admin/cycle-health",
    group: "admin",
    description: "has checks[] or grade",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return hasAnyKey(res.json, "checks", "grade");
    },
  },
  {
    path: "/api/admin/affiliate-hq",
    group: "admin",
    description: "has revenue or partners",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return hasAnyKey(res.json, "revenue", "partners");
    },
  },
  {
    path: "/api/admin/ai-costs",
    group: "admin",
    description: "has totals",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return hasKeys(res.json, "totals");
    },
  },
  {
    path: "/api/admin/content-indexing",
    group: "admin",
    description: "has summary",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return hasKeys(res.json, "summary");
    },
  },
  {
    path: "/api/admin/feature-flags",
    group: "admin",
    description: "has flags array",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      if (Array.isArray(res.json)) return null;
      if (res.json && Array.isArray(res.json.flags)) return null;
      return "expected array of flags";
    },
  },
  {
    path: "/api/admin/seo-audit",
    group: "admin",
    description: "responds (may be 401)",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      return null;
    },
  },
  {
    path: "/api/admin/per-page-audit",
    group: "admin",
    description: "has pages[]",
    validate: (res) => {
      if (!adminOkOrAuth(res)) return `unexpected status ${res.status}`;
      if (res.status !== 200) return null;
      return isArrayOrHasArrayField(res.json, "pages");
    },
  },

  // ---- Public APIs ----
  {
    path: "/api/content/blog",
    group: "public",
    description: "has posts[] or array",
    validate: (res) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (Array.isArray(res.json)) return null;
      if (res.json && Array.isArray(res.json.posts)) return null;
      return "expected array or { posts: [] }";
    },
  },
  {
    path: "/sitemap.xml",
    group: "public",
    description: "valid XML urlset",
    validate: (res) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (!res.body.includes("<urlset")) return "missing <urlset in XML";
      return null;
    },
  },
  {
    path: "/robots.txt",
    group: "public",
    description: "has User-agent",
    validate: (res) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (!res.body.toLowerCase().includes("user-agent")) return "missing User-agent directive";
      return null;
    },
  },
  {
    path: "/api/og?siteId=yalla-london",
    group: "public",
    description: "image content-type",
    validate: (res) => {
      if (res.status !== 200) return `expected 200, got ${res.status}`;
      if (!res.contentType.includes("image")) return `expected image/*, got ${res.contentType}`;
      return null;
    },
  },

  // ---- Cron endpoints ----
  {
    path: "/api/cron/content-builder",
    group: "cron",
    description: "responds (auth expected)",
    validate: (res) => {
      if (!cronOkOrAuth(res)) return `unexpected status ${res.status}`;
      return null;
    },
  },
  {
    path: "/api/cron/sweeper",
    group: "cron",
    description: "responds (auth expected)",
    validate: (res) => {
      if (!cronOkOrAuth(res)) return `unexpected status ${res.status}`;
      return null;
    },
  },
  {
    path: "/api/cron/seo-agent",
    group: "cron",
    description: "responds (auth expected)",
    validate: (res) => {
      if (!cronOkOrAuth(res)) return `unexpected status ${res.status}`;
      return null;
    },
  },
  {
    path: "/api/cron/content-auto-fix",
    group: "cron",
    description: "responds (auth expected)",
    validate: (res) => {
      if (!cronOkOrAuth(res)) return `unexpected status ${res.status}`;
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// HTTP probe
// ---------------------------------------------------------------------------

async function probe(baseUrl: string, spec: ProbeSpec): Promise<ProbeResult> {
  const url = `${baseUrl}${spec.path}`;
  const method = spec.method ?? "GET";
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json, text/html, */*" },
      redirect: "follow",
    });

    const timeMs = Date.now() - start;
    const contentType = res.headers.get("content-type") ?? "";
    const body = await res.text();

    let json: Record<string, unknown> | null = null;
    if (contentType.includes("json")) {
      try {
        json = JSON.parse(body);
      } catch {
        // not JSON — that's fine for some endpoints
      }
    }

    // 404 is always FAIL (endpoint doesn't exist)
    if (res.status === 404) {
      return {
        path: spec.path,
        description: spec.description,
        status: res.status,
        timeMs,
        passed: false,
        message: "endpoint not found (404)",
      };
    }

    // 5xx is always FAIL
    if (res.status >= 500) {
      return {
        path: spec.path,
        description: spec.description,
        status: res.status,
        timeMs,
        passed: false,
        message: `server error (${res.status})`,
      };
    }

    const probeRes: ProbeResponse = { status: res.status, contentType, body, json };
    const validationError = spec.validate(probeRes);

    return {
      path: spec.path,
      description: spec.description,
      status: res.status,
      timeMs,
      passed: validationError === null,
      message: validationError ?? `has ${spec.description}`,
      error: validationError ?? undefined,
    };
  } catch (err) {
    const timeMs = Date.now() - start;
    const errMsg =
      err instanceof Error
        ? err.name === "TimeoutError" || err.name === "AbortError"
          ? `timeout after ${TIMEOUT_MS}ms`
          : err.message
        : String(err);

    return {
      path: spec.path,
      description: spec.description,
      status: 0,
      timeMs,
      passed: false,
      message: errMsg,
      error: errMsg,
    };
  }
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function padRight(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s : " ".repeat(len - s.length) + s;
}

function formatTable(results: ProbeResult[], baseUrl: string): string {
  const now = new Date().toISOString();
  const lines: string[] = [];
  const separator = "\u2501".repeat(90);

  lines.push(`HEALTH PROBE \u2014 ${now}`);
  lines.push(`Base URL: ${baseUrl}`);
  lines.push(separator);
  lines.push(
    `${padRight("ENDPOINT", 38)} ${padRight("STATUS", 8)} ${padRight("TIME", 8)} RESULT`
  );
  lines.push(separator);

  for (const r of results) {
    const icon = r.passed ? "\u2705" : "\u274C";
    const label = r.passed ? "PASS" : "FAIL";
    const statusStr = r.status === 0 ? "ERR" : String(r.status);
    const timeStr = `${r.timeMs}ms`;
    const detail = r.passed
      ? `${icon} ${label} \u2014 ${r.message}`
      : `${icon} ${label} \u2014 ${r.error ?? r.message}`;

    lines.push(
      `${padRight(r.path, 38)} ${padLeft(statusStr, 6)}  ${padLeft(timeStr, 7)}  ${detail}`
    );
  }

  lines.push(separator);

  const passCount = results.filter((r) => r.passed).length;
  const total = results.length;
  const failCount = total - passCount;
  const summary =
    failCount === 0
      ? `TOTAL: ${passCount}/${total} PASS \u2014 ALL HEALTHY`
      : `TOTAL: ${passCount}/${total} PASS \u2014 ${failCount} FAIL`;
  lines.push(summary);

  return lines.join("\n");
}

function formatMarkdown(results: ProbeResult[], baseUrl: string): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push("# Health Probe Results");
  lines.push("");
  lines.push(`**Date:** ${now}`);
  lines.push(`**Base URL:** ${baseUrl}`);
  lines.push("");

  const passCount = results.filter((r) => r.passed).length;
  const total = results.length;
  const failCount = total - passCount;
  lines.push(
    failCount === 0
      ? `**Result:** ${passCount}/${total} PASS -- ALL HEALTHY`
      : `**Result:** ${passCount}/${total} PASS -- ${failCount} FAIL`
  );
  lines.push("");

  // Group by category
  const groups = new Map<string, ProbeResult[]>();
  for (const r of results) {
    const spec = PROBES.find((p) => p.path === r.path);
    const group = spec?.group ?? "other";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(r);
  }

  const groupNames: Record<string, string> = {
    admin: "Admin APIs",
    public: "Public APIs",
    cron: "Cron Endpoints",
  };

  for (const [group, items] of Array.from(groups.entries())) {
    lines.push(`## ${groupNames[group] ?? group}`);
    lines.push("");
    lines.push("| Endpoint | Status | Time | Result | Detail |");
    lines.push("|----------|--------|------|--------|--------|");
    for (const r of items) {
      const icon = r.passed ? "PASS" : "FAIL";
      const statusStr = r.status === 0 ? "ERR" : String(r.status);
      const detail = r.passed ? r.message : r.error ?? r.message;
      lines.push(`| \`${r.path}\` | ${statusStr} | ${r.timeMs}ms | ${icon} | ${detail} |`);
    }
    lines.push("");
  }

  // Failed endpoints summary
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    lines.push("## Failed Endpoints");
    lines.push("");
    for (const r of failed) {
      lines.push(`- **\`${r.path}\`** (${r.status === 0 ? "ERR" : r.status}): ${r.error ?? r.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { baseUrl } = parseArgs();

  console.log(`\nHealth Probe starting...`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Endpoints: ${PROBES.length}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms per request\n`);

  // Run probes sequentially to avoid overwhelming the server
  const results: ProbeResult[] = [];
  for (const spec of PROBES) {
    process.stdout.write(`  Probing ${spec.path} ... `);
    const result = await probe(baseUrl, spec);
    results.push(result);
    const icon = result.passed ? "\u2705" : "\u274C";
    console.log(`${icon} ${result.status || "ERR"} (${result.timeMs}ms)`);
  }

  // Console output
  console.log("");
  const table = formatTable(results, baseUrl);
  console.log(table);

  // Write markdown report
  const docsDir = path.resolve(__dirname, "..", "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  const mdPath = path.join(docsDir, "HEALTH-PROBE-RESULTS.md");
  const md = formatMarkdown(results, baseUrl);
  fs.writeFileSync(mdPath, md, "utf-8");
  console.log(`\nReport written to: ${mdPath}`);

  // Exit code
  const failCount = results.filter((r) => !r.passed).length;
  if (failCount > 0) {
    console.log(`\n${failCount} endpoint(s) FAILED — exiting with code 1`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} endpoints healthy — exiting with code 0`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Health probe crashed:", err);
  process.exit(1);
});
