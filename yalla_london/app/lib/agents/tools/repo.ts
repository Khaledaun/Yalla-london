/**
 * CTO Agent — Repository Tools
 *
 * Read-only tools for inspecting the codebase: read files, search code,
 * and list directory contents. All operations are sandboxed to the project
 * root with strict path validation.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { ToolContext, ToolResult } from "@/lib/agents/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = process.cwd();
const MAX_FILE_LINES = 10_000;
const MAX_GREP_RESULTS = 200;
const MAX_LIST_ENTRIES = 5_000;

/** Files that must never be read — credential / secret patterns */
const BLOCKED_PATTERNS = [
  /\.env$/,
  /\.env\..+$/,
  /credentials\.json$/,
  /\.pem$/,
  /\.key$/,
  /secret/i,
  /serviceAccountKey/i,
];

/** Directories excluded from search and listing */
const EXCLUDED_DIRS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".vercel",
  ".turbo",
  "coverage",
];

// ---------------------------------------------------------------------------
// Path Safety
// ---------------------------------------------------------------------------

function resolveSafePath(rawPath: string): string {
  // Reject paths that try to escape the project
  if (rawPath.includes("..")) {
    throw new Error("Path traversal (..) is not allowed");
  }

  const resolved = path.resolve(PROJECT_ROOT, rawPath);

  if (!resolved.startsWith(PROJECT_ROOT)) {
    throw new Error(
      `Path "${rawPath}" resolves outside the project root`,
    );
  }

  return resolved;
}

function isBlockedFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(basename));
}

function isExcludedDir(dirName: string): boolean {
  return EXCLUDED_DIRS.includes(dirName);
}

// ---------------------------------------------------------------------------
// read_file
// ---------------------------------------------------------------------------

export async function repoReadFile(
  params: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const filePath = params.filePath as string | undefined;
    if (!filePath || typeof filePath !== "string") {
      return { success: false, error: "Missing required parameter: filePath" };
    }

    const resolved = resolveSafePath(filePath);

    if (isBlockedFile(resolved)) {
      return {
        success: false,
        error: `Reading "${path.basename(resolved)}" is not allowed — credential/secret files are blocked`,
      };
    }

    if (!fs.existsSync(resolved)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      return {
        success: false,
        error: `"${filePath}" is not a file (is it a directory?)`,
      };
    }

    const rawContent = fs.readFileSync(resolved, "utf-8");
    const allLines = rawContent.split("\n");

    const startLine = typeof params.startLine === "number" ? Math.max(1, params.startLine) : 1;
    const endLine =
      typeof params.endLine === "number"
        ? Math.min(params.endLine, allLines.length)
        : Math.min(startLine + MAX_FILE_LINES - 1, allLines.length);

    const selectedLines = allLines.slice(startLine - 1, endLine);
    const truncated = selectedLines.length < allLines.length;

    const content = selectedLines
      .map((line, i) => `${startLine + i}\t${line}`)
      .join("\n");

    const relativePath = path.relative(PROJECT_ROOT, resolved);

    return {
      success: true,
      data: {
        path: relativePath,
        content,
        totalLines: allLines.length,
        linesReturned: selectedLines.length,
        startLine,
        endLine,
        truncated,
        sizeBytes: stat.size,
      },
      summary: `Read ${relativePath} (${selectedLines.length}/${allLines.length} lines, ${stat.size} bytes)${truncated ? " [truncated]" : ""}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// search_code
// ---------------------------------------------------------------------------

export async function repoSearchCode(
  params: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const pattern = params.pattern as string | undefined;
    if (!pattern || typeof pattern !== "string") {
      return { success: false, error: "Missing required parameter: pattern" };
    }

    const glob = typeof params.glob === "string" ? params.glob : undefined;
    const maxResults =
      typeof params.maxResults === "number"
        ? Math.min(params.maxResults, MAX_GREP_RESULTS)
        : 50;

    // Build grep command with exclusions
    const excludeDirs = EXCLUDED_DIRS.map(
      (d) => `--exclude-dir=${d}`,
    ).join(" ");
    const excludeFiles = "--exclude=*.env --exclude=*.env.* --exclude=*.pem --exclude=*.key";

    let includeGlob = "";
    if (glob) {
      // Sanitize glob — only allow typical file patterns
      const safeGlob = glob.replace(/[;&|`$(){}'"\\\[\]]/g, "");
      includeGlob = `--include="${safeGlob}"`;
    }

    // Use grep -rn with fixed-string (-F) for safety unless pattern looks like regex
    const isRegex = /[.*+?^${}()|[\]\\]/.test(pattern);
    const grepFlag = isRegex ? "-E" : "-F";

    const cmd = [
      "grep",
      "-rn",
      grepFlag,
      excludeDirs,
      excludeFiles,
      includeGlob,
      "--",
      // Shell-escape the pattern by wrapping in single quotes
      // and escaping any single quotes inside it
      `'${pattern.replace(/'/g, "'\\''")}'`,
      ".",
    ]
      .filter(Boolean)
      .join(" ");

    let stdout = "";
    try {
      stdout = execSync(cmd, {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10 MB
        timeout: 15_000, // 15s max
      });
    } catch (execErr: unknown) {
      // grep returns exit code 1 when no matches — that's not an error
      const execError = execErr as { status?: number; stdout?: string };
      if (execError.status === 1) {
        return {
          success: true,
          data: { matches: [], totalMatches: 0, pattern },
          summary: `No matches found for "${pattern}"`,
        };
      }
      throw execErr;
    }

    const lines = stdout.trim().split("\n").filter(Boolean);
    const totalMatches = lines.length;

    const matches = lines.slice(0, maxResults).map((line) => {
      // Format: ./path/to/file.ts:123:content
      const firstColon = line.indexOf(":");
      const secondColon = line.indexOf(":", firstColon + 1);
      if (firstColon === -1 || secondColon === -1) {
        return { file: line, line: 0, content: "" };
      }
      const file = line.slice(0, firstColon).replace(/^\.\//, "");
      const lineNum = parseInt(line.slice(firstColon + 1, secondColon), 10);
      const content = line.slice(secondColon + 1).trim();
      return { file, line: lineNum, content };
    });

    const truncated = totalMatches > maxResults;

    return {
      success: true,
      data: {
        matches,
        totalMatches,
        returnedMatches: matches.length,
        truncated,
        pattern,
        glob: glob || null,
      },
      summary: `Found ${totalMatches} match${totalMatches === 1 ? "" : "es"} for "${pattern}"${truncated ? ` (showing first ${maxResults})` : ""}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// list_files
// ---------------------------------------------------------------------------

export async function repoListFiles(
  params: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const directory =
      typeof params.directory === "string" ? params.directory : ".";
    const pattern =
      typeof params.pattern === "string" ? params.pattern : undefined;
    const recursive =
      typeof params.recursive === "boolean" ? params.recursive : false;

    const resolved = resolveSafePath(directory);

    if (!fs.existsSync(resolved)) {
      return { success: false, error: `Directory not found: ${directory}` };
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return {
        success: false,
        error: `"${directory}" is not a directory`,
      };
    }

    const entries: Array<{
      path: string;
      size: number;
      isDirectory: boolean;
    }> = [];

    function walk(dir: string): void {
      if (entries.length >= MAX_LIST_ENTRIES) return;

      let dirEntries: fs.Dirent[];
      try {
        dirEntries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (err) {
        console.warn("[repo] Directory read failed:", err instanceof Error ? err.message : String(err));
        return;
      }

      for (const entry of dirEntries) {
        if (entries.length >= MAX_LIST_ENTRIES) return;

        // Skip excluded directories
        if (entry.isDirectory() && isExcludedDir(entry.name)) continue;

        // Skip blocked files
        if (!entry.isDirectory() && isBlockedFile(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(PROJECT_ROOT, fullPath);

        // Apply glob pattern filter if provided
        if (pattern) {
          const matchTarget = entry.name;
          if (!matchesSimpleGlob(matchTarget, pattern)) {
            // If directory and recursive, still descend (files inside may match)
            if (entry.isDirectory() && recursive) {
              walk(fullPath);
            }
            continue;
          }
        }

        let size = 0;
        if (!entry.isDirectory()) {
          try {
            size = fs.statSync(fullPath).size;
          } catch (err) {
            console.warn("[repo] File stat failed:", err instanceof Error ? err.message : String(err));
          }
        }

        entries.push({
          path: relativePath,
          size,
          isDirectory: entry.isDirectory(),
        });

        if (entry.isDirectory() && recursive) {
          walk(fullPath);
        }
      }
    }

    walk(resolved);

    // Sort: directories first, then by path
    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.path.localeCompare(b.path);
    });

    const truncated = entries.length >= MAX_LIST_ENTRIES;

    return {
      success: true,
      data: {
        directory: path.relative(PROJECT_ROOT, resolved) || ".",
        entries,
        totalEntries: entries.length,
        truncated,
        recursive,
        pattern: pattern || null,
      },
      summary: `Listed ${entries.length} item${entries.length === 1 ? "" : "s"} in ${directory}${recursive ? " (recursive)" : ""}${truncated ? " [truncated]" : ""}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Simple glob matching (supports * and ? only — no full minimatch needed)
// ---------------------------------------------------------------------------

function matchesSimpleGlob(filename: string, pattern: string): boolean {
  // Convert simple glob to regex
  // Escape regex special chars except * and ?
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  try {
    const regex = new RegExp(`^${regexStr}$`, "i");
    return regex.test(filename);
  } catch (err) {
    console.warn("[repo] Invalid glob pattern, falling back to substring match:", err instanceof Error ? err.message : String(err));
    return filename.includes(pattern);
  }
}
