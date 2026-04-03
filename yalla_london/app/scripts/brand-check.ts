#!/usr/bin/env npx tsx
/**
 * Brand Check — CI-ready design system validation
 *
 * Usage:
 *   npx tsx scripts/brand-check.ts           # Run all checks
 *   npx tsx scripts/brand-check.ts --strict  # Fail on warnings too
 *   npx tsx scripts/brand-check.ts --json    # JSON output for CI
 *
 * Exit codes:
 *   0 = pass (warnings only)
 *   1 = fail (critical violations found)
 */

import * as fs from "fs";
import * as path from "path";

// ── Configuration ──

const SCAN_DIRS = ["app", "components"];
const SCAN_EXTENSIONS = [".tsx", ".css"];
const EXCLUDE_FILES = [
  "tailwind.config.ts",
  "globals.css",
  "yalla-tokens.css",
  "zenitha-tokens.css",
  "zenitha-luxury-tokens.css",
  "yalla-mobile.css",
  "yalla-animations.css",
  "brand-check.ts",
];
const EXCLUDE_DIRS = ["node_modules", ".next", "test", "__tests__"];

interface Violation {
  file: string;
  line: number;
  severity: "critical" | "warning" | "info";
  rule: string;
  message: string;
  fix: string;
}

const violations: Violation[] = [];

// ── Rules ──

// Rule 1: Deprecated Tailwind aliases
const DEPRECATED_CLASSES: Record<string, string> = {
  "burgundy-50": "london-50",
  "burgundy-100": "london-100",
  "burgundy-200": "london-200",
  "burgundy-300": "london-300",
  "burgundy-400": "london-400",
  "burgundy-500": "london-500",
  "burgundy-600": "london-600",
  "burgundy-700": "london-700",
  "burgundy-800": "london-800",
  "burgundy-900": "london-900",
  "burgundy-950": "london-950",
  "warm-charcoal": "yl-charcoal",
  "warm-gray": "stone",
};

// Rule 2: Brand hex colors that should use tokens (in inline styles or arbitrary values)
const BRAND_HEXES: Record<string, string> = {
  "#C8322B": "yl-red / london-600",
  "#c8322b": "yl-red / london-600",
  "#C49A2A": "yl-gold / yalla-gold-500",
  "#c49a2a": "yl-gold / yalla-gold-500",
  "#4A7BA8": "yl-blue / stamp",
  "#4a7ba8": "yl-blue / stamp",
  "#1C1917": "yl-charcoal / charcoal",
  "#1c1917": "yl-charcoal / charcoal",
  "#EDE9E1": "yl-parchment",
  "#ede9e1": "yl-parchment",
  "#F5F0E8": "yl-cream",
  "#f5f0e8": "yl-cream",
};

// Rule 3: Pure black/white (luxury brand violation)
const PURE_BW_PATTERNS = [
  { pattern: /(?:bg|text|border)-black(?!\/)/, token: "yl-charcoal or charcoal" },
  { pattern: /(?:bg)-white(?!\/)/, token: "cream or bg-[var(--admin-card-bg)]" },
  { pattern: /color:\s*#000000/, token: "var(--yl-charcoal)" },
  { pattern: /color:\s*black/, token: "var(--yl-charcoal)" },
  { pattern: /background(?:-color)?:\s*#ffffff/i, token: "var(--admin-card-bg) or var(--yl-cream)" },
];

// ── File Scanner ──

function getAllFiles(dir: string, base: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(base, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.some(d => entry.name === d)) continue;
      results.push(...getAllFiles(fullPath, base));
    } else if (entry.isFile()) {
      if (!SCAN_EXTENSIONS.some(ext => entry.name.endsWith(ext))) continue;
      if (EXCLUDE_FILES.some(f => entry.name === f)) continue;
      results.push(relativePath);
    }
  }
  return results;
}

function checkFile(filePath: string, basePath: string): void {
  const fullPath = path.join(basePath, filePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim().startsWith("/*")) continue;

    // Rule 1: Deprecated Tailwind classes
    for (const [deprecated, replacement] of Object.entries(DEPRECATED_CLASSES)) {
      // Match as Tailwind class (preceded by space, quote, or class separator)
      const classRegex = new RegExp(`(?:^|\\s|"|'|:)(?:text|bg|border|ring|from|to|via|hover:|focus:|active:)*${deprecated.replace("-", "\\-")}`, "g");
      if (classRegex.test(line)) {
        violations.push({
          file: filePath,
          line: lineNum,
          severity: "critical",
          rule: "deprecated-alias",
          message: `Deprecated class "${deprecated}" found`,
          fix: `Replace with "${replacement}"`,
        });
      }
    }

    // Rule 2: Hardcoded brand hex in style attributes or CSS
    if (line.includes("style=") || filePath.endsWith(".css")) {
      for (const [hex, token] of Object.entries(BRAND_HEXES)) {
        if (line.includes(hex)) {
          violations.push({
            file: filePath,
            line: lineNum,
            severity: "warning",
            rule: "hardcoded-brand-hex",
            message: `Hardcoded brand color ${hex} in style/CSS`,
            fix: `Use token: ${token}`,
          });
        }
      }
    }

    // Rule 3: Pure black/white
    for (const { pattern, token } of PURE_BW_PATTERNS) {
      if (pattern.test(line)) {
        // Skip print styles and conditional dark mode
        if (line.includes("@media print") || line.includes("dark:")) continue;
        violations.push({
          file: filePath,
          line: lineNum,
          severity: "warning",
          rule: "pure-bw",
          message: `Pure black/white used (luxury brand violation)`,
          fix: `Use ${token} instead`,
        });
      }
    }

    // Rule 4: Inline font-family (should use CSS variable)
    if (/font-family:\s*['"]?(Source Serif|Anybody|Space Grotesk|Noto Sans Arabic)/i.test(line)) {
      violations.push({
        file: filePath,
        line: lineNum,
        severity: "warning",
        rule: "hardcoded-font",
        message: `Hardcoded font-family — use CSS variable`,
        fix: `Use var(--yl-font-heading), var(--yl-font-body), var(--font-system), or var(--yl-font-arabic)`,
      });
    }
  }
}

// ── Main ──

function main(): void {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const jsonOutput = args.includes("--json");
  const basePath = path.resolve(__dirname, "..");

  // Scan files
  let allFiles: string[] = [];
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(basePath, dir);
    allFiles = allFiles.concat(getAllFiles(dirPath, basePath));
  }

  if (!jsonOutput) {
    console.log(`\n🔍 Brand Check — Scanning ${allFiles.length} files...\n`);
  }

  // Run checks
  for (const file of allFiles) {
    checkFile(file, basePath);
  }

  // Tally results
  const critical = violations.filter(v => v.severity === "critical");
  const warnings = violations.filter(v => v.severity === "warning");
  const info = violations.filter(v => v.severity === "info");

  if (jsonOutput) {
    console.log(JSON.stringify({
      totalFiles: allFiles.length,
      violations: violations.length,
      critical: critical.length,
      warnings: warnings.length,
      info: info.length,
      details: violations,
    }, null, 2));
  } else {
    // Group by file
    const byFile = new Map<string, Violation[]>();
    for (const v of violations) {
      const list = byFile.get(v.file) || [];
      list.push(v);
      byFile.set(v.file, list);
    }

    for (const [file, fileViolations] of byFile) {
      console.log(`\n📄 ${file}`);
      for (const v of fileViolations) {
        const icon = v.severity === "critical" ? "❌" : v.severity === "warning" ? "⚠️" : "ℹ️";
        console.log(`  ${icon} L${v.line}: [${v.rule}] ${v.message}`);
        console.log(`     Fix: ${v.fix}`);
      }
    }

    console.log("\n" + "═".repeat(50));
    console.log(`  Files scanned: ${allFiles.length}`);
    console.log(`  Critical:      ${critical.length}`);
    console.log(`  Warnings:      ${warnings.length}`);
    console.log(`  Info:          ${info.length}`);
    console.log("═".repeat(50));

    if (critical.length > 0) {
      console.log("\n❌ FAIL — Critical violations found. Fix before merging.\n");
    } else if (warnings.length > 0 && strict) {
      console.log("\n⚠️ FAIL (strict mode) — Warnings found.\n");
    } else if (warnings.length > 0) {
      console.log("\n✅ PASS (with warnings) — No critical violations.\n");
    } else {
      console.log("\n✅ PASS — No violations found.\n");
    }
  }

  // Exit code
  if (critical.length > 0) {
    process.exit(1);
  }
  if (strict && warnings.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
