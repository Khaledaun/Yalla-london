"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Play, Copy, CheckCircle, Wrench } from "lucide-react";
import {
  AdminCard, AdminPageHeader, AdminSectionLabel, AdminStatusBadge, AdminButton, AdminLoadingState, AdminAlertBanner,
} from "@/components/admin/admin-ui";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CronJob {
  name: string;
  status: string;
  durationMs: number | null;
  startedAt: string;
  error: string | null;
  plainError: string | null;
  itemsProcessed: number;
}

interface CronLogEntry {
  id: string;
  job_name: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  error_message: string | null;
  items_processed: number;
}

type TabId = "crons" | "logs" | "diagnostics";

export default function AutomationPage() {
  const [tab, setTab] = useState<TabId>("crons");
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [logs, setLogs] = useState<CronLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Array<{ job: string; lastRun: string; status: string; error: string | null; fixEndpoint: string | null; cronSchedule: string }>>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cockpitRes, logsRes] = await Promise.all([
        fetch("/api/admin/cockpit"),
        fetch("/api/admin/cron-logs?limit=50"),
      ]);

      if (cockpitRes.ok) {
        const data = await cockpitRes.json();
        setCronJobs(data.cronHealth?.recentJobs || []);
        setFailedCount(data.cronHealth?.failedLast24h || 0);
      }

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || data || []);
      }

      // Build diagnostics from cron jobs
      await fetchDiagnostics();
    } catch (err) {
      console.warn("[automation] fetch failed:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch("/api/admin/cycle-health");
      if (res.ok) {
        const data = await res.json();
        const issues = data.issues || [];
        setDiagnostics(issues.map((issue: { category: string; description: string; severity: string; fixAction?: { endpoint: string; payload: Record<string, unknown>; label: string } }) => ({
          job: issue.category,
          lastRun: new Date().toISOString(),
          status: issue.severity,
          error: issue.description,
          fixEndpoint: issue.fixAction?.endpoint || null,
          cronSchedule: "",
        })));
      }
    } catch (err) {
      console.warn("[automation] diagnostics failed:", err instanceof Error ? err.message : err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const triggerCron = async (cronName: string, path: string) => {
    setTriggerLoading(cronName);
    try {
      const res = await fetch("/api/admin/departures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) {
        console.warn(`[automation] trigger ${cronName} failed: ${res.status}`);
      }
      // Refresh after 3s to show updated status
      setTimeout(fetchData, 3000);
    } catch (err) {
      console.warn("[automation] trigger error:", err instanceof Error ? err.message : err);
    } finally {
      setTriggerLoading(null);
    }
  };

  const copyAsJson = (obj: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] p-4 md:p-6">
        <AdminLoadingState />
      </div>
    );
  }

  // Derive unique cron names with health data
  const cronMap = new Map<string, { status: string; successCount: number; failCount: number; lastDuration: number | null; lastRun: string; lastError: string | null }>();
  for (const job of cronJobs) {
    const existing = cronMap.get(job.name);
    if (!existing) {
      cronMap.set(job.name, {
        status: job.status,
        successCount: job.status === "completed" ? 1 : 0,
        failCount: job.status === "failed" ? 1 : 0,
        lastDuration: job.durationMs,
        lastRun: job.startedAt,
        lastError: job.plainError || job.error,
      });
    } else {
      if (job.status === "completed") existing.successCount++;
      if (job.status === "failed") existing.failCount++;
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] p-4 md:p-6">
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <AdminPageHeader title="Automation" />
          <div className="flex items-center gap-2">
            {failedCount > 0 && <AdminStatusBadge status="critical" label={`${failedCount} failed (24h)`} />}
            <AdminButton variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw size={13} />
            </AdminButton>
          </div>
        </div>

        <p className="text-xs text-stone-400 uppercase tracking-widest -mt-3">
          Cron jobs, logs & diagnostics — account-wide
        </p>

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          {([
            { id: "crons" as const, label: "Cron Jobs" },
            { id: "logs" as const, label: "Logs" },
            { id: "diagnostics" as const, label: "Diagnostics" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wider transition-colors ${
                tab === t.id ? "bg-white text-stone-800 shadow-sm font-semibold" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CRONS TAB */}
        {tab === "crons" && (
          <div className="space-y-3">
            <AdminAlertBanner severity="info" message="Crons are account-wide — they process ALL active sites, not just the selected one." />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from(cronMap.entries()).map(([name, info]) => {
                const healthPct = info.successCount + info.failCount > 0
                  ? Math.round((info.successCount / (info.successCount + info.failCount)) * 100)
                  : 100;
                const statusType = info.status === "completed" ? "healthy" as const
                  : info.status === "failed" ? "critical" as const
                  : info.status === "running" ? "degraded" as const
                  : "unknown" as const;

                return (
                  <AdminCard key={name} className="relative">
                    {/* Health bar */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg overflow-hidden bg-stone-200">
                      <div
                        className={`h-full ${healthPct >= 80 ? "bg-emerald-500" : healthPct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${healthPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-stone-800">{name}</span>
                      <AdminStatusBadge status={statusType} label={info.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase">Success</span>
                        <div className="font-mono text-emerald-600">{healthPct}%</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase">Duration</span>
                        <div className="font-mono text-stone-600">{info.lastDuration ? `${(info.lastDuration / 1000).toFixed(1)}s` : "—"}</div>
                      </div>
                    </div>

                    {info.lastError && (
                      <p className="font-mono text-[10px] text-red-600 truncate mb-2" title={info.lastError}>
                        {info.lastError}
                      </p>
                    )}

                    <div className="flex gap-1">
                      <AdminButton
                        variant="secondary"
                        size="sm"
                        loading={triggerLoading === name}
                        onClick={() => triggerCron(name, `/api/cron/${name}`)}
                      >
                        <Play size={10} /> Run
                      </AdminButton>
                      <AdminButton variant="ghost" size="sm" onClick={() => copyAsJson({ job: name, ...info })}>
                        <Copy size={10} />
                      </AdminButton>
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === "logs" && (
          <AdminCard>
            <AdminSectionLabel>Cron Run History (Last 50)</AdminSectionLabel>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-stone-500 uppercase">Job</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-stone-500 uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-stone-500 uppercase">Duration</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-stone-500 uppercase">Items</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-stone-500 uppercase">Time</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 50).map((log, i) => {
                    const statusType = log.status === "completed" ? "healthy" as const : log.status === "failed" ? "critical" as const : "degraded" as const;
                    return (
                      <tr key={log.id || i} className="hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0">
                        <td className="py-1.5 px-3"><span className="font-mono text-xs text-stone-600">{log.job_name}</span></td>
                        <td className="py-1.5 px-3"><AdminStatusBadge status={statusType} label={log.status} /></td>
                        <td className="py-1.5 px-3"><span className="font-mono text-xs text-stone-500">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}</span></td>
                        <td className="py-1.5 px-3"><span className="font-mono text-xs text-stone-600">{log.items_processed || 0}</span></td>
                        <td className="py-1.5 px-3"><span className="font-mono text-xs text-stone-500">{timeAgo(log.started_at)}</span></td>
                        <td className="py-1.5 px-3">
                          <AdminButton variant="ghost" size="sm" onClick={() => copyAsJson(log)}>
                            <Copy size={10} />
                          </AdminButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}

        {/* DIAGNOSTICS TAB */}
        {tab === "diagnostics" && (
          <div className="space-y-4">
            <AdminAlertBanner severity="info" message="Diagnostics from Cycle Health Analyzer — checks pipeline, crons, indexing, quality, AI, and CJ affiliate." />

            {diagnostics.length === 0 ? (
              <AdminCard>
                <div className="flex items-center gap-3 text-emerald-600">
                  <CheckCircle size={20} />
                  <div>
                    <div className="font-semibold text-sm text-stone-800">All Systems Healthy</div>
                    <div className="text-[10px] text-stone-400">No issues detected in last analysis</div>
                  </div>
                </div>
              </AdminCard>
            ) : (
              <div className="space-y-2">
                {diagnostics.map((diag, i) => (
                  <AdminCard key={i} className={`border-l-4 ${
                    diag.status === "critical" ? "border-l-red-500" : diag.status === "high" ? "border-l-amber-500" : "border-l-blue-400"
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AdminStatusBadge
                            status={diag.status === "critical" ? "critical" : diag.status === "high" ? "degraded" : "healthy"}
                            label={diag.status}
                          />
                          <span className="text-sm text-stone-800">{diag.job}</span>
                        </div>
                        {diag.error && (
                          <p className="font-mono text-xs text-stone-500">{diag.error}</p>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {diag.fixEndpoint && (
                          <AdminButton variant="secondary" size="sm" onClick={() => {
                            fetch(diag.fixEndpoint!, { method: "POST" }).catch(() => {});
                            setTimeout(fetchData, 3000);
                          }}>
                            <Wrench size={10} /> Fix
                          </AdminButton>
                        )}
                        <AdminButton variant="ghost" size="sm" onClick={() => copyAsJson(diag)}>
                          <Copy size={10} />
                        </AdminButton>
                      </div>
                    </div>
                  </AdminCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
