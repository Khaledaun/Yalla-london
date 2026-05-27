"use client";

/**
 * Agent Tasks — live view of every tracked AgentTask row.
 *
 * Surfaces the per-event/per-run tracking added in PRs 12cd99c (paperclip-
 * inspired schema) → 839722e (CEO wiring) → 92ecb15 (CTO wiring). Without
 * this page, the tracked data exists in the DB but is invisible to Khaled.
 *
 * Filters: agentType (ceo/cto), status, time window (24h/7d/30d).
 * Click any task row → opens the full goal tree (parents + children) so the
 * dependency chain is visible.
 *
 * iPhone-first cards on mobile, table layout >= md.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface AgentTaskRow {
  id: string;
  agentType: string;
  taskType: string;
  priority: string;
  status: string;
  description: string;
  siteId: string | null;
  parentTaskId: string | null;
  budgetUsd: number | null;
  spentUsd: number;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface TreeNode {
  id: string;
  agentType: string;
  taskType: string;
  status: string;
  description: string;
  budgetUsd: number | null;
  spentUsd: number;
  createdAt: string;
  completedAt: string | null;
  children: TreeNode[];
}

interface ListResponse {
  ok: boolean;
  tasks: AgentTaskRow[];
  counts: {
    total: number;
    filtered: number;
    byAgent: Record<string, number>;
    byStatus: Record<string, number>;
    totalSpendUsd: number;
  };
}

interface DetailResponse {
  ok: boolean;
  task: AgentTaskRow & {
    input: unknown;
    output: unknown;
    findings: string[];
    changes: string[];
    conversationId: string | null;
  };
  tree: TreeNode;
  rootId: string;
}

const STATUS_COLOR: Record<string, string> = {
  running: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  needs_approval: "bg-amber-50 text-amber-700 border-amber-300",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-gray-100 text-gray-700 border-gray-300",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export default function TasksPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [windowHours, setWindowHours] = useState<number>(168); // 7d
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
      const url = new URL("/api/admin/agent/tasks", window.location.origin);
      url.searchParams.set("since", since);
      url.searchParams.set("limit", "100");
      if (filterAgent !== "all") url.searchParams.set("agentType", filterAgent);
      if (filterStatus !== "all") url.searchParams.set("status", filterStatus);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ListResponse = await res.json();
      if (!json.ok) throw new Error("Failed to load tasks");
      setList(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filterAgent, filterStatus, windowHours]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/agent/tasks?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DetailResponse = await res.json();
      if (!json.ok) throw new Error("Failed to load task detail");
      setDetail(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const formatDuration = (ms: number | null): string => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60_000).toFixed(1)}m`;
  };

  const formatAge = (iso: string): string => {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
    if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
    return `${Math.round(ms / 86_400_000)}d ago`;
  };

  // Index signature lets React's `key` prop pass through type-check when used
  // inside .map() (otherwise TS2322 complains about extra `key` prop — same
  // pattern as admin-ui components per CLAUDE.md rules #88/#223).
  const TreeView = ({
    node,
    depth = 0,
  }: {
    node: TreeNode;
    depth?: number;
    [key: string]: unknown;
  }) => (
    <div className="text-xs" style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-2 py-1">
        <span className={`px-1.5 py-0.5 rounded border ${STATUS_COLOR[node.status] || "bg-gray-50 border-gray-200"}`}>
          {node.status}
        </span>
        <span className="font-mono text-[10px] text-gray-500">{node.agentType}</span>
        <span className="text-gray-700">{node.taskType}</span>
        <span className="text-gray-500">${node.spentUsd.toFixed(4)}{node.budgetUsd != null ? ` / $${node.budgetUsd}` : ""}</span>
      </div>
      <div className="text-[11px] text-gray-600 ml-1">{node.description.slice(0, 120)}</div>
      {node.children.map((c) => (
        <TreeView key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/cockpit" className="text-sm text-gray-600 hover:text-gray-900">
            ← Cockpit
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mt-2">
            Agent Tasks
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Tracked work for the CEO + CTO agents. Per-task AI cost, status, goal tree.
          </p>
        </div>

        {/* Summary cards */}
        {list?.counts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Total ({windowHours}h)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{list.counts.total}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Total AI Spend</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">${list.counts.totalSpendUsd.toFixed(4)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">By Agent</div>
              <div className="text-xs text-gray-700 mt-1">
                {Object.entries(list.counts.byAgent).map(([a, n]) => (
                  <div key={a}>
                    {a}: <strong>{n}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">By Status</div>
              <div className="text-xs text-gray-700 mt-1">
                {Object.entries(list.counts.byStatus).map(([s, n]) => (
                  <div key={s}>
                    {s}: <strong>{n}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
          >
            <option value="all">All agents</option>
            <option value="ceo">CEO</option>
            <option value="cto">CTO</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
          >
            <option value="all">All statuses</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="needs_approval">Needs approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={windowHours}
            onChange={(e) => setWindowHours(parseInt(e.target.value, 10))}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
          >
            <option value="24">Last 24h</option>
            <option value="168">Last 7d</option>
            <option value="720">Last 30d</option>
          </select>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-3 mb-3 text-sm">
            {error}
          </div>
        )}

        {/* Task list */}
        <div className="space-y-2">
          {list?.tasks.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 cursor-pointer"
              onClick={() => fetchDetail(t.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COLOR[t.status] || "bg-gray-50 border-gray-200"}`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 font-medium">
                    {t.agentType.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-gray-600">{t.taskType}</span>
                  {t.siteId && (
                    <span className="text-[10px] font-mono text-gray-500">{t.siteId}</span>
                  )}
                  {t.parentTaskId && (
                    <span className="text-[10px] text-purple-600">↳ child</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 whitespace-nowrap">
                  {formatAge(t.createdAt)} · {formatDuration(t.durationMs)} · ${t.spentUsd.toFixed(4)}
                  {t.budgetUsd != null ? `/${t.budgetUsd}` : ""}
                </div>
              </div>
              <p className="text-xs text-gray-700">{t.description.slice(0, 200)}</p>
              {t.errorMessage && (
                <p className="text-[11px] text-red-600 mt-1 truncate">{t.errorMessage}</p>
              )}
            </div>
          ))}
          {!loading && list && list.tasks.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-600">
              No tasks match the current filters.
            </div>
          )}
        </div>

        {/* Detail drawer (modal-ish overlay) */}
        {detail && (
          <div
            className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-2"
            onClick={() => setDetail(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 md:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {detail.task.taskType}
                </h2>
                <button
                  onClick={() => setDetail(null)}
                  className="text-gray-500 hover:text-gray-900 text-xl"
                >
                  ×
                </button>
              </div>
              {detailLoading ? (
                <p className="text-sm text-gray-600">Loading…</p>
              ) : (
                <>
                  <div className="mb-3 text-xs text-gray-600">
                    <div>
                      <strong>Status:</strong> {detail.task.status}
                    </div>
                    <div>
                      <strong>Agent:</strong> {detail.task.agentType}
                    </div>
                    <div>
                      <strong>Site:</strong> {detail.task.siteId || "—"}
                    </div>
                    <div>
                      <strong>Spend:</strong> ${detail.task.spentUsd.toFixed(4)}
                      {detail.task.budgetUsd != null ? ` of $${detail.task.budgetUsd}` : ""}
                    </div>
                    <div>
                      <strong>Duration:</strong> {formatDuration(detail.task.durationMs)}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">{detail.task.description}</p>

                  {detail.task.findings && detail.task.findings.length > 0 && (
                    <details className="mb-3 text-xs">
                      <summary className="cursor-pointer font-medium text-gray-700">
                        Findings ({detail.task.findings.length})
                      </summary>
                      <ul className="mt-1 space-y-1 pl-3 list-disc">
                        {detail.task.findings.map((f, i) => (
                          <li key={i} className="text-gray-600">
                            {f}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {detail.task.errorMessage && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-3 text-xs text-red-700">
                      {detail.task.errorMessage}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Goal Tree</h3>
                    <p className="text-[10px] text-gray-500 mb-2">
                      Root: <code className="bg-gray-100 px-1 py-0.5 rounded">{detail.rootId}</code>
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded p-2">
                      <TreeView node={detail.tree} />
                    </div>
                  </div>

                  {(detail.task.input || detail.task.output) && (
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer font-medium text-gray-700">
                        Raw input/output
                      </summary>
                      <pre className="mt-1 bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto text-[10px] leading-tight">
                        {JSON.stringify(
                          { input: detail.task.input, output: detail.task.output },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
