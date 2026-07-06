"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import {
  GitBranch,
  Cloud,
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Play,
  Shield,
  Activity,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// DevOps & GitHub — Deployment status, tasks, integrations
// ═══════════════════════════════════════════════════════════════════════════

interface PlanTask {
  id: string;
  name: string;
  phase: string;
  status: "done" | "in-progress" | "todo";
  readiness?: number;
  dueDate?: string;
}

interface SmokeTestResult {
  passed: number;
  failed: number;
  warned: number;
  total: number;
  categories?: string[];
}

const INTEGRATIONS = [
  { name: "Vercel", status: "wired", detail: "Pro plan — 300s functions, 48 crons" },
  { name: "GitHub", status: "wired", detail: "khaledaun/yalla-london — CI on claude/* branches" },
  { name: "Supabase", status: "wired", detail: "Pro — compute upgraded, RLS on 130+ tables" },
  { name: "Resend", status: "wired", detail: "React Email templates, webhook handler live" },
  { name: "CJ Affiliate", status: "wired", detail: "Vrbo approved, sync + deep links + SID tracking" },
  { name: "Travelpayouts", status: "partial", detail: "Drive verified. Welcome Pickups, Tiqets, TicketNetwork wired" },
  { name: "Stripe", status: "partial", detail: "Webhook endpoint built, not yet registered in dashboard" },
  { name: "WhatsApp", status: "todo", detail: "CEO Agent code ready, env vars not yet configured" },
] as const;

type IntegrationStatus = "wired" | "partial" | "todo";

function statusColor(s: IntegrationStatus | string) {
  if (s === "wired") return "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
  if (s === "partial") return "text-amber-400 bg-amber-400/10 border-amber-500/30";
  return "text-gray-500 bg-gray-500/10 border-gray-600/30";
}

function taskStatusColor(s: PlanTask["status"]) {
  if (s === "done") return "text-emerald-400 bg-emerald-400/10 border-emerald-500/30";
  if (s === "in-progress") return "text-blue-400 bg-blue-400/10 border-blue-500/30";
  return "text-gray-500 bg-gray-500/10 border-gray-600/30";
}

function taskStatusIcon(s: PlanTask["status"]) {
  if (s === "done") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  if (s === "in-progress") return <Clock className="w-3.5 h-3.5 text-blue-400" />;
  return <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />;
}

// ─── Env snapshot (public-safe) ───────────────────────────────────────────────
const ENV_SNAPSHOT = {
  sha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ?? process.env.VERCEL_GIT_COMMIT_SHA
    ?? null,
  message: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE
    ?? process.env.VERCEL_GIT_COMMIT_MESSAGE
    ?? null,
  env: process.env.NEXT_PUBLIC_VERCEL_ENV
    ?? process.env.VERCEL_ENV
    ?? "development",
  url: process.env.NEXT_PUBLIC_VERCEL_URL
    ?? process.env.VERCEL_URL
    ?? null,
};

export default function DevOpsPage() {
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [smokeResult, setSmokeResult] = useState<SmokeTestResult | null>(null);
  const [smokeLoading, setSmokeLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setTaskLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dev-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_plan" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Normalize the plan data into a flat task list
      const planTasks: PlanTask[] = [];
      if (data?.plan) {
        for (const phase of Object.values(data.plan) as { tasks?: PlanTask[] }[]) {
          if (Array.isArray(phase?.tasks)) {
            planTasks.push(...phase.tasks);
          }
        }
      } else if (Array.isArray(data?.tasks)) {
        planTasks.push(...(data.tasks as PlanTask[]));
      }
      setTasks(planTasks);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setTaskLoading(false);
    }
  }, []);

  const runSmokeTests = useCallback(async () => {
    setSmokeLoading(true);
    try {
      const res = await fetch("/api/admin/dev-tasks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_all" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Normalize test_all response { summary: { total, passed, failed, skipped } }
      const summary = data?.summary ?? data?.result;
      if (summary) {
        setSmokeResult({
          total: summary.total ?? 0,
          passed: summary.passed ?? 0,
          failed: summary.failed ?? 0,
          warned: summary.skipped ?? summary.warned ?? 0,
        });
      } else {
        setSmokeResult(null);
      }
    } catch (err) {
      setSmokeResult(null);
      setError(err instanceof Error ? err.message : "Smoke test endpoint failed");
    } finally {
      setSmokeLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const doneCount = tasks.filter(t => t.status === "done").length;
  const inProgressCount = tasks.filter(t => t.status === "in-progress").length;
  const todoCount = tasks.filter(t => t.status === "todo").length;

  const sha = ENV_SNAPSHOT.sha;
  const shortSha = sha ? sha.slice(0, 8) : null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white px-4 py-6 md:px-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-semibold tracking-tight">DevOps &amp; GitHub</h1>
          </div>
          <p className="text-gray-400 text-sm">Deployment status, development tasks, integration health</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Environment badge */}
          <span className={`font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded border ${
            ENV_SNAPSHOT.env === "production"
              ? "bg-emerald-400/10 text-emerald-400 border-emerald-500/30"
              : ENV_SNAPSHOT.env === "preview"
              ? "bg-amber-400/10 text-amber-400 border-amber-500/30"
              : "bg-gray-500/10 text-gray-400 border-gray-600/30"
          }`}>
            {ENV_SNAPSHOT.env}
          </span>
          {/* Quick actions */}
          <button
            onClick={runSmokeTests}
            disabled={smokeLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-50"
          >
            {smokeLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Smoke Tests
          </button>
          <a href="/admin/api-monitor" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B] text-gray-300 text-xs font-medium hover:bg-[#1E293B] transition-colors">
            <Activity className="w-3.5 h-3.5" />
            API Monitor
          </a>
          <a href="/admin/api-security" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1E293B] text-gray-300 text-xs font-medium hover:bg-[#1E293B] transition-colors">
            <Shield className="w-3.5 h-3.5" />
            API Security
          </a>
        </div>
      </div>

      {/* ── Smoke Test Result ── */}
      {smokeResult && (
        <div className={`mb-6 p-4 rounded-xl border ${
          smokeResult.failed > 0
            ? "bg-red-500/10 border-red-500/30"
            : "bg-emerald-500/10 border-emerald-500/30"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {smokeResult.failed > 0
              ? <AlertCircle className="w-4 h-4 text-red-400" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Smoke Test Result</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-400 font-medium">{smokeResult.passed} passed</span>
            {smokeResult.failed > 0 && <span className="text-red-400 font-medium">{smokeResult.failed} failed</span>}
            {smokeResult.warned > 0 && <span className="text-amber-400 font-medium">{smokeResult.warned} warned</span>}
            <span className="text-gray-500">{smokeResult.total} total</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left column: Tasks + Deployment ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Development Tasks */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">Development Tasks</span>
                <div className="flex gap-3 mt-1 text-sm">
                  <span className="text-emerald-400">{doneCount} done</span>
                  <span className="text-blue-400">{inProgressCount} in progress</span>
                  <span className="text-gray-500">{todoCount} todo</span>
                </div>
              </div>
              <button
                onClick={fetchTasks}
                disabled={taskLoading}
                className="p-1.5 rounded-lg hover:bg-[#1E293B] text-gray-400 transition-colors disabled:opacity-50"
                title="Refresh tasks"
              >
                <RefreshCw className={`w-4 h-4 ${taskLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            {taskLoading && tasks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading plan…
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No tasks loaded</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[#0B1120] border border-[#1E293B]/60"
                  >
                    <div className="mt-0.5 shrink-0">{taskStatusIcon(task.status)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white truncate">{task.name}</span>
                        <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${taskStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[11px] text-gray-500">{task.phase}</span>
                        {task.readiness !== undefined && (
                          <span className="text-[11px] text-gray-600">{task.readiness}% ready</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lastRefresh && (
              <p className="text-[11px] text-gray-600 mt-3">
                Last synced {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Deployment Status */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">Deployment Status</span>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="px-3 py-3 rounded-lg bg-[#0B1120] border border-[#1E293B]/60">
                <p className="text-[11px] text-gray-500 mb-1 font-mono uppercase tracking-wider">Commit SHA</p>
                <p className="text-sm font-mono text-white">
                  {shortSha ?? <span className="text-gray-600">not available</span>}
                  {sha && sha.length > 8 && <span className="text-gray-600">…</span>}
                </p>
              </div>
              <div className="px-3 py-3 rounded-lg bg-[#0B1120] border border-[#1E293B]/60">
                <p className="text-[11px] text-gray-500 mb-1 font-mono uppercase tracking-wider">Environment</p>
                <p className="text-sm font-mono text-white">{ENV_SNAPSHOT.env}</p>
              </div>
              <div className="px-3 py-3 rounded-lg bg-[#0B1120] border border-[#1E293B]/60 sm:col-span-2">
                <p className="text-[11px] text-gray-500 mb-1 font-mono uppercase tracking-wider">Commit Message</p>
                <p className="text-sm text-gray-300 truncate">
                  {ENV_SNAPSHOT.message ?? <span className="text-gray-600">not available</span>}
                </p>
              </div>
              <div className="px-3 py-3 rounded-lg bg-[#0B1120] border border-[#1E293B]/60 sm:col-span-2">
                <p className="text-[11px] text-gray-500 mb-1 font-mono uppercase tracking-wider">Deployment URL</p>
                {ENV_SNAPSHOT.url ? (
                  <a
                    href={`https://${ENV_SNAPSHOT.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    {ENV_SNAPSHOT.url}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm text-gray-600">not available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: Repo + Integrations ── */}
        <div className="space-y-6">

          {/* Repository Info */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">Repository</span>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">khaledaun/yalla-london</p>
                  <p className="text-[11px] text-gray-500">Next.js 14 App Router · Supabase · Vercel Pro</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-[11px] text-gray-400">CI triggers on <span className="text-white font-mono">claude/*</span> branch PRs</p>
              </div>
              <a
                href="https://github.com/khaledaun/yalla-london"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open on GitHub
              </a>
            </div>
          </div>

          {/* Integration Status */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500">Integration Status</span>
            <div className="mt-4 space-y-2">
              {INTEGRATIONS.map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[#0B1120] border border-[#1E293B]/60"
                >
                  <div className="mt-0.5 shrink-0">
                    {integration.status === "wired" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : integration.status === "partial" ? (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-white">{integration.name}</span>
                      <span className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor(integration.status)}`}>
                        {integration.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{integration.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
