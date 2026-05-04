import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const CLAUDE_DIR = path.resolve(process.cwd(), "../../.claude");
const PROJECT_ROOT = path.resolve(process.cwd(), "../..");

function safeReadDir(dir: string): string[] {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function getAgents(): Array<{ name: string; description: string; model: string }> {
  const agentsDir = path.join(CLAUDE_DIR, "agents");
  const files = safeReadDir(agentsDir).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const content = safeReadFile(path.join(agentsDir, file));
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    const name = frontmatter?.[1]?.match(/name:\s*(.+)/)?.[1]?.trim() || file.replace(".md", "");
    const description = frontmatter?.[1]?.match(/description:\s*(.+)/)?.[1]?.trim() || "";
    const model = frontmatter?.[1]?.match(/model:\s*(.+)/)?.[1]?.trim() || "default";
    return { name, description, model };
  });
}

function getHooksStatus(): Record<string, boolean> {
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  const content = safeReadFile(settingsPath);
  if (!content) return {};
  try {
    const settings = JSON.parse(content);
    const hooks = settings.hooks || {};
    return Object.fromEntries(
      Object.entries(hooks).map(([event, config]) => [
        event,
        Array.isArray(config) && config.length > 0,
      ])
    );
  } catch {
    return {};
  }
}

function getSessionLogs(): Array<{ date: string; content: string }> {
  const logsDir = path.join(CLAUDE_DIR, "logs", "sessions");
  const files = safeReadDir(logsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, 20);
  return files.map((file) => ({
    date: file.replace(".md", ""),
    content: safeReadFile(path.join(logsDir, file)),
  }));
}

function getPermissionsSummary(): { allow: number; deny: number } {
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  const content = safeReadFile(settingsPath);
  if (!content) return { allow: 0, deny: 0 };
  try {
    const settings = JSON.parse(content);
    const perms = settings.permissions || {};
    return {
      allow: Array.isArray(perms.allow) ? perms.allow.length : 0,
      deny: Array.isArray(perms.deny) ? perms.deny.length : 0,
    };
  } catch {
    return { allow: 0, deny: 0 };
  }
}

function getProjectStatus(): string {
  return safeReadFile(path.join(PROJECT_ROOT, "PROJECT_STATUS.md"));
}

export async function GET(request: NextRequest) {
  // Dev-only guard
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  const authError = await requireAdmin(request);
  if (authError) return authError;

  const agents = getAgents();
  const hooks = getHooksStatus();
  const sessionLogs = getSessionLogs();
  const permissions = getPermissionsSummary();
  const projectStatus = getProjectStatus();

  return NextResponse.json({
    agents,
    hooks,
    sessionLogs,
    permissions,
    projectStatus,
    counts: {
      agents: agents.length,
      commands: safeReadDir(path.join(CLAUDE_DIR, "commands")).filter((f) =>
        f.endsWith(".md")
      ).length,
      skills: safeReadDir(path.join(CLAUDE_DIR, "skills")).length,
      sessionLogs: sessionLogs.length,
    },
    timestamp: new Date().toISOString(),
  });
}
