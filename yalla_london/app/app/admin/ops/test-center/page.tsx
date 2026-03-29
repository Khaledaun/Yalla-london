"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestResult {
  id: string;
  name: string;
  status: "pass" | "warn" | "fail";
  duration?: number;
  detail?: string;
  category?: string;
}

interface TestRunResult {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  results: TestResult[];
  durationMs: number;
}

interface ActionLog {
  id: string;
  timestamp: string;
  action: string;
  user?: string;
  target?: string;
  status: "info" | "warning" | "error" | "critical";
  detail?: string;
}

// ---------------------------------------------------------------------------
// API Response → UI Type transformers
// ---------------------------------------------------------------------------

/** Transform dev-tasks/test API response to TestRunResult */
function transformTestResponse(data: Record<string, unknown>): TestRunResult {
  const summary = (data.summary ?? data) as Record<string, unknown>;
  const rawResults = (data.results ?? []) as Array<Record<string, unknown>>;

  return {
    total: (summary.total as number) ?? 0,
    pass: (summary.passed ?? summary.pass ?? 0) as number,
    warn: (summary.skipped ?? summary.warn ?? 0) as number,
    fail: (summary.failed ?? summary.fail ?? 0) as number,
    durationMs: (summary.durationMs ?? data.durationMs ?? 0) as number,
    results: rawResults.map((r, i) => {
      const inner = (r.result ?? r) as Record<string, unknown>;
      const success = inner.success;
      const status: "pass" | "warn" | "fail" =
        success === true ? "pass" : success === false ? "fail" : "warn";
      return {
        id: (r.taskId ?? r.id ?? String(i)) as string,
        name: (r.testType ?? r.name ?? "unknown") as string,
        status,
        duration: (inner.durationMs ?? inner.duration) as number | undefined,
        detail: (inner.plainLanguage ?? inner.detail ?? inner.error) as string | undefined,
        category: (inner.phase ?? r.category) as string | undefined,
      };
    }),
  };
}

/** Transform action-logs API response to ActionLog[] */
function transformActionLogs(data: unknown): ActionLog[] {
  const raw = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.logs as unknown[]) ?? [];
  return (raw as Array<Record<string, unknown>>).map((log) => {
    const apiStatus = (log.status as string) ?? "";
    const uiStatus: ActionLog["status"] =
      apiStatus === "failed" || apiStatus === "timeout" ? "error" :
      apiStatus === "partial" ? "warning" :
      apiStatus === "success" || apiStatus === "running" ? "info" : "info";

    return {
      id: (log.id as string) ?? "",
      timestamp: (log.timestamp as string) ?? "",
      action: (log.action as string) ?? "",
      user: (log.siteId as string) ?? undefined,
      target: undefined,
      status: uiStatus,
      detail: (log.summary ?? log.error ?? log.detail) as string | undefined,
    };
  });
}

type Tab = "smoke" | "audit" | "logs" | "json";

// ─── Secret key detector ─────────────────────────────────────────────────────

const SECRET_PATTERN = /secret|key|token|password|private|apikey|api_key|auth|credential|bearer/i;

function isSecretKey(key: string): boolean {
  return SECRET_PATTERN.test(key);
}

// ─── JSON Tree Node ───────────────────────────────────────────────────────────

interface JsonNodeProps {
  value: unknown;
  keyName?: string;
  depth: number;
  isLast: boolean;
  secretParent?: boolean;
  // React uses `key` as a special JSX prop; declared here only to satisfy tsc
  // when @types/react is not installed in the check environment.
  key?: string | number;
}

function JsonNode({ value, keyName, depth, isLast, secretParent = false }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = depth * 16;
  const shouldRedact = secretParent || (keyName !== undefined && isSecretKey(keyName));

  const comma = isLast ? "" : ",";

  const keyEl = keyName !== undefined ? (
    <span className="text-[#79b8ff]">&quot;{keyName}&quot;</span>
  ) : null;

  const colon = keyName !== undefined ? (
    <span className="text-gray-500">: </span>
  ) : null;

  // Primitive values
  if (value === null) {
    return (
      <div style={{ paddingLeft: indent }} className="leading-5">
        {keyEl}{colon}
        <span className="text-gray-500">null</span>
        <span className="text-gray-600">{comma}</span>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-5">
        {keyEl}{colon}
        <span className="text-[#f97316]">{String(value)}</span>
        <span className="text-gray-600">{comma}</span>
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div style={{ paddingLeft: indent }} className="leading-5">
        {keyEl}{colon}
        <span className="text-[#60a5fa]">{value}</span>
        <span className="text-gray-600">{comma}</span>
      </div>
    );
  }

  if (typeof value === "string") {
    const display = shouldRedact ? "••••••••" : value;
    const truncated = display.length > 120 ? display.slice(0, 120) + "…" : display;
    return (
      <div style={{ paddingLeft: indent }} className="leading-5">
        {keyEl}{colon}
        <span className="text-[#4ade80]">&quot;{truncated}&quot;</span>
        <span className="text-gray-600">{comma}</span>
      </div>
    );
  }

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div style={{ paddingLeft: indent }} className="leading-5">
          {keyEl}{colon}
          <span className="text-gray-400">[]</span>
          <span className="text-gray-600">{comma}</span>
        </div>
      );
    }
    return (
      <div style={{ paddingLeft: indent }}>
        <div className="leading-5 flex items-center gap-1">
          {keyEl}{colon}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-[#C49A2A] hover:text-yellow-300 font-mono cursor-pointer select-none"
          >
            {collapsed ? "▶" : "▼"}
          </button>
          <span className="text-gray-400">[</span>
          {collapsed && (
            <span className="text-gray-500 text-[11px]">
              {value.length} item{value.length !== 1 ? "s" : ""}
            </span>
          )}
          {collapsed && <span className="text-gray-400">]</span>}
          {collapsed && <span className="text-gray-600">{comma}</span>}
        </div>
        {!collapsed && (
          <>
            {value.map((item, i) => (
              <JsonNode
                key={i}
                value={item}
                depth={depth + 1}
                isLast={i === value.length - 1}
                secretParent={shouldRedact}
              />
            ))}
            <div style={{ paddingLeft: indent }} className="leading-5">
              <span className="text-gray-400">]</span>
              <span className="text-gray-600">{comma}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Objects
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return (
        <div style={{ paddingLeft: indent }} className="leading-5">
          {keyEl}{colon}
          <span className="text-gray-400">{"{}"}</span>
          <span className="text-gray-600">{comma}</span>
        </div>
      );
    }
    return (
      <div style={{ paddingLeft: indent }}>
        <div className="leading-5 flex items-center gap-1">
          {keyEl}{colon}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-[#C49A2A] hover:text-yellow-300 font-mono cursor-pointer select-none"
          >
            {collapsed ? "▶" : "▼"}
          </button>
          <span className="text-gray-400">{"{"}</span>
          {collapsed && (
            <span className="text-gray-500 text-[11px]">
              {entries.length} key{entries.length !== 1 ? "s" : ""}
            </span>
          )}
          {collapsed && <span className="text-gray-400">{"}"}</span>}
          {collapsed && <span className="text-gray-600">{comma}</span>}
        </div>
        {!collapsed && (
          <>
            {entries.map(([k, v], i) => (
              <JsonNode
                key={k}
                value={v}
                keyName={k}
                depth={depth + 1}
                isLast={i === entries.length - 1}
                secretParent={isSecretKey(k)}
              />
            ))}
            <div style={{ paddingLeft: indent }} className="leading-5">
              <span className="text-gray-400">{"}"}</span>
              <span className="text-gray-600">{comma}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// ─── JSON Viewer ──────────────────────────────────────────────────────────────

interface JsonViewerProps {
  data: unknown;
  raw: string;
  showRaw: boolean;
}

function JsonViewer({ data, raw, showRaw }: JsonViewerProps) {
  if (showRaw) {
    const lines = raw.split("\n");
    return (
      <div className="relative">
        <div className="flex">
          <div className="select-none text-right pr-3 text-gray-600 text-[11px] leading-5 pt-4 pb-4 pl-2 min-w-[2.5rem] border-r border-[#1E293B]">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <pre className="flex-1 text-gray-300 text-[12px] leading-5 overflow-auto p-4 whitespace-pre-wrap break-all">
            {raw}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto">
      <JsonNode value={data} depth={0} isLast={true} />
    </div>
  );
}

// ─── Tab: Smoke Tests ─────────────────────────────────────────────────────────

function SmokeTestsTab() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dev-tasks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_all" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(transformTestResponse(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const statusStyle = (s: string) => {
    if (s === "pass") return "text-[#4ade80] bg-[#0d2118] border border-[#1a4d2e]";
    if (s === "warn") return "text-[#fbbf24] bg-[#1c1500] border border-[#4d3800]";
    return "text-[#f87171] bg-[#1c0808] border border-[#4d1515]";
  };

  const statusDot = (s: string) => {
    if (s === "pass") return "bg-[#4ade80]";
    if (s === "warn") return "bg-[#fbbf24]";
    return "bg-[#f87171]";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">
          Runs all smoke tests against the live codebase. May take up to 60 seconds.
        </p>
        <button
          onClick={runAll}
          disabled={loading}
          className="px-4 py-2 bg-[#C49A2A] hover:bg-yellow-500 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? "Running…" : "▶ Run All Tests"}
        </button>
      </div>

      {error && (
        <div className="bg-[#1c0808] border border-[#4d1515] rounded-xl p-4 text-[#f87171] text-sm">
          {error}
        </div>
      )}

      {results && (
        <>
          {/* Summary bar */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-wrap gap-4 items-center">
            <span className="text-gray-400 text-sm">
              Completed in <span className="text-white font-mono">{results.durationMs}ms</span>
            </span>
            <div className="flex gap-3 ml-auto flex-wrap">
              <span className="px-3 py-1 rounded-full bg-[#0d2118] border border-[#1a4d2e] text-[#4ade80] text-sm font-bold">
                ✓ {results.pass} pass
              </span>
              {results.warn > 0 && (
                <span className="px-3 py-1 rounded-full bg-[#1c1500] border border-[#4d3800] text-[#fbbf24] text-sm font-bold">
                  ⚠ {results.warn} warn
                </span>
              )}
              {results.fail > 0 && (
                <span className="px-3 py-1 rounded-full bg-[#1c0808] border border-[#4d1515] text-[#f87171] text-sm font-bold">
                  ✗ {results.fail} fail
                </span>
              )}
            </div>
          </div>

          {/* Result cards */}
          <div className="space-y-2">
            {results.results?.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl p-3 flex items-start gap-3 ${statusStyle(r.status)}`}
              >
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${statusDot(r.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{r.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {r.category && (
                        <span className="px-2 py-0.5 rounded-full bg-[#1E293B] text-gray-400">
                          {r.category}
                        </span>
                      )}
                      {r.duration !== undefined && <span>{r.duration}ms</span>}
                    </div>
                  </div>
                  {r.detail && (
                    <p className="text-xs mt-1 opacity-75 break-words">{r.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!results && !loading && !error && (
        <div className="text-center text-gray-500 py-16 text-sm">
          Press &quot;Run All Tests&quot; to execute the smoke test suite.
        </div>
      )}
    </div>
  );
}

// ─── Tab: Audit Export ────────────────────────────────────────────────────────

function AuditExportTab() {
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<string | null>(null);
  const [parsed, setParsed] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const doExport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit-export");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setRaw(text);
      try {
        setParsed(JSON.parse(text));
      } catch {
        setParsed(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const copyJson = () => {
    if (!raw) return;
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadJson = () => {
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const byteSize = raw ? new Blob([raw]).size : 0;
  const prettyRaw = parsed ? JSON.stringify(parsed, null, 2) : raw ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-gray-400 text-sm">
          Export the full platform audit: cron logs, pipeline stats, indexing, AI costs, and auto-fixes.
        </p>
        <button
          onClick={doExport}
          disabled={loading}
          className="px-4 py-2 bg-[#C8322B] hover:bg-red-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? "Exporting…" : "⬇ Export Full Audit"}
        </button>
      </div>

      {error && (
        <div className="bg-[#1c0808] border border-[#4d1515] rounded-xl p-4 text-[#f87171] text-sm">
          {error}
        </div>
      )}

      {raw && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRaw(false)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${!showRaw ? "bg-[#1E293B] text-white" : "text-gray-400 hover:text-white"}`}
              >
                Pretty
              </button>
              <button
                onClick={() => setShowRaw(true)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${showRaw ? "bg-[#1E293B] text-white" : "text-gray-400 hover:text-white"}`}
              >
                Raw
              </button>
              <span className="text-gray-600 text-xs font-mono">
                {byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyJson}
                className="px-3 py-1 bg-[#1E293B] hover:bg-[#2D3748] text-white text-sm rounded-lg transition-colors"
              >
                {copied ? "✓ Copied" : "Copy JSON"}
              </button>
              <button
                onClick={downloadJson}
                className="px-3 py-1 bg-[#1E293B] hover:bg-[#2D3748] text-white text-sm rounded-lg transition-colors"
              >
                ⬇ Download
              </button>
            </div>
          </div>

          <div className="bg-[#0D1117] border border-[#1E293B] rounded-lg font-mono text-[12px] max-h-[60vh] overflow-auto">
            <JsonViewer data={parsed} raw={prettyRaw} showRaw={showRaw} />
          </div>
        </>
      )}

      {!raw && !loading && !error && (
        <div className="text-center text-gray-500 py-16 text-sm">
          Press &quot;Export Full Audit&quot; to pull the latest platform snapshot.
        </div>
      )}
    </div>
  );
}

// ─── Tab: Action Logs ─────────────────────────────────────────────────────────

const ACTION_TYPES = ["all", "publish", "delete", "re-queue", "enhance", "submit", "toggle", "config"];

function ActionLogsTab() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/action-logs?limit=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(transformActionLogs(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const severityBadge = (s: string) => {
    if (s === "critical") return "bg-[#4d0000] text-[#f87171] animate-pulse";
    if (s === "error") return "bg-[#1c0808] text-[#f87171]";
    if (s === "warning") return "bg-[#1c1500] text-[#fbbf24]";
    return "bg-[#0a1929] text-[#60a5fa]";
  };

  const filtered = filter === "all" ? logs : logs.filter((l) =>
    l.action?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="text-gray-400 text-sm">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#111827] border border-[#1E293B] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C49A2A]"
          >
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 bg-[#3B7EA1] hover:bg-blue-400 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? "Loading…" : "↻ Load Logs"}
        </button>
      </div>

      {error && (
        <div className="bg-[#1c0808] border border-[#4d1515] rounded-xl p-4 text-[#f87171] text-sm">
          {error}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-[#1E293B]">
                <th className="text-left pb-2 pr-4 font-medium">Time</th>
                <th className="text-left pb-2 pr-4 font-medium">Action</th>
                <th className="text-left pb-2 pr-4 font-medium">User</th>
                <th className="text-left pb-2 pr-4 font-medium">Target</th>
                <th className="text-left pb-2 pr-4 font-medium">Status</th>
                <th className="text-left pb-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[#111827] transition-colors">
                  <td className="py-2 pr-4 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-4 text-white font-medium">{log.action}</td>
                  <td className="py-2 pr-4 text-gray-400">{log.user ?? "—"}</td>
                  <td className="py-2 pr-4 text-gray-400 max-w-[160px] truncate">{log.target ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${severityBadge(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-400 text-xs max-w-[200px] truncate">{log.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center text-gray-500 py-16 text-sm">
          {logs.length === 0
            ? "Press \"Load Logs\" to fetch recent admin actions."
            : "No logs match the selected filter."}
        </div>
      )}
    </div>
  );
}

// ─── Tab: JSON Inspector ──────────────────────────────────────────────────────

function JsonInspectorTab() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<unknown>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (val: string) => {
    setInput(val);
    if (!val.trim()) {
      setParsed(null);
      setParseError(null);
      return;
    }
    try {
      setParsed(JSON.parse(val));
      setParseError(null);
    } catch (e) {
      setParsed(null);
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const prettyRaw = parsed ? JSON.stringify(parsed, null, 2) : "";
  const byteSize = input ? new Blob([input]).size : 0;

  const copyPretty = () => {
    const target = prettyRaw || input;
    navigator.clipboard.writeText(target).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isValid = parsed !== null;
  const hasInput = input.trim().length > 0;

  const lines = (prettyRaw || input).split("\n");

  return (
    <div className="space-y-4">
      {/* Input area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-gray-400 text-sm font-medium">Paste JSON here</label>
          {hasInput && (
            <div className="flex items-center gap-3">
              {isValid ? (
                <span className="text-[11px] font-bold text-[#4ade80] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#4ade80] inline-block" />
                  Valid JSON
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#f87171] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#f87171] inline-block" />
                  Invalid JSON
                </span>
              )}
              <span className="text-gray-600 text-xs font-mono">
                {byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`}
              </span>
            </div>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={'{\n  "paste": "your JSON here",\n  "secrets": "will be masked automatically"\n}'}
          className="w-full h-40 bg-[#0D1117] border border-[#1E293B] rounded-lg font-mono text-[12px] text-gray-300 placeholder-gray-700 p-4 resize-y focus:outline-none focus:border-[#C49A2A] transition-colors"
          spellCheck={false}
        />
        {parseError && hasInput && (
          <p className="mt-1 text-[#f87171] text-xs font-mono">{parseError}</p>
        )}
      </div>

      {/* Viewer controls */}
      {isValid && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRaw(false)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${!showRaw ? "bg-[#1E293B] text-white" : "text-gray-400 hover:text-white"}`}
              >
                Tree
              </button>
              <button
                onClick={() => setShowRaw(true)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${showRaw ? "bg-[#1E293B] text-white" : "text-gray-400 hover:text-white"}`}
              >
                Raw
              </button>
              <span className="text-gray-600 text-xs">
                Secret keys auto-masked
              </span>
            </div>
            <button
              onClick={copyPretty}
              className="px-3 py-1 bg-[#1E293B] hover:bg-[#2D3748] text-white text-sm rounded-lg transition-colors"
            >
              {copied ? "✓ Copied" : "Copy Pretty"}
            </button>
          </div>

          <div className="bg-[#0D1117] border border-[#1E293B] rounded-lg font-mono text-[12px] max-h-[55vh] overflow-auto">
            {showRaw ? (
              <div className="flex">
                <div className="select-none text-right pr-3 text-gray-600 text-[11px] leading-5 pt-4 pb-4 pl-2 min-w-[2.5rem] border-r border-[#1E293B] sticky top-0 bg-[#0D1117]">
                  {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className="flex-1 text-gray-300 text-[12px] leading-5 overflow-auto p-4 whitespace-pre-wrap break-all">
                  {prettyRaw}
                </pre>
              </div>
            ) : (
              <div className="p-4 overflow-auto">
                <JsonNode value={parsed} depth={0} isLast={true} />
              </div>
            )}
          </div>
        </>
      )}

      {!hasInput && (
        <div className="text-center text-gray-600 py-8 text-sm">
          <div className="text-3xl mb-2">{ "{ }" }</div>
          Paste any JSON above — secrets, API responses, pipeline dumps, cron logs.
          <br />
          <span className="text-[11px] text-gray-700 mt-1 block">
            Keys matching &quot;secret&quot;, &quot;key&quot;, &quot;token&quot;, &quot;password&quot;, &quot;private&quot; will be masked automatically.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TAB_DEFS: { id: Tab; label: string; desc: string }[] = [
  { id: "smoke", label: "Smoke Tests", desc: "Run all QA tests against the live codebase" },
  { id: "audit", label: "Audit Export", desc: "Full platform snapshot as downloadable JSON" },
  { id: "logs", label: "Action Logs", desc: "Recent admin actions with severity badges" },
  { id: "json", label: "JSON Inspector", desc: "Collapsible tree viewer with secret redaction" },
];

export default function TestCenterPage() {
  const [activeTab, setActiveTab] = useState<Tab>("smoke");

  return (
    <div className="min-h-screen bg-[#0B1120] text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Test Center</h1>
          <p className="text-gray-400 text-sm mt-0.5">QA, audit exports, action logs, and JSON inspection</p>
        </div>
        <span className="px-2.5 py-1 bg-[#1E293B] rounded-lg text-[11px] font-mono text-gray-400 flex-shrink-0">
          {process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "production"}
        </span>
      </div>

      {/* Tab bar */}
      <div className="border-b border-[#1E293B] mb-6">
        <div className="flex gap-0 overflow-x-auto">
          {TAB_DEFS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === t.id
                  ? "text-[#C49A2A] border-[#C49A2A]"
                  : "text-gray-400 border-transparent hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab sub-header */}
      <p className="text-gray-500 text-xs mb-4">
        {TAB_DEFS.find((t) => t.id === activeTab)?.desc}
      </p>

      {/* Tab content card */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-5">
        {activeTab === "smoke" && <SmokeTestsTab />}
        {activeTab === "audit" && <AuditExportTab />}
        {activeTab === "logs" && <ActionLogsTab />}
        {activeTab === "json" && <JsonInspectorTab />}
      </div>
    </div>
  );
}
