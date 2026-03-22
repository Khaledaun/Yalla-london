"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Play, Copy, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import {
  ZHCard, ZHAlertBanner, ZHActionBtn, ZHSectionLabel, ZHBadge, ZHMonoVal, ZHTable, ZHStatusPill,
} from "@/components/zh";

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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-zh-gold border-t-transparent rounded-full animate-spin" />
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
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-zh-ui font-bold text-lg text-zh-cream">Automation</h1>
          <p className="font-zh-mono text-[10px] text-zh-cream-muted uppercase tracking-[2px]">
            Cron jobs, logs & diagnostics — account-wide
          </p>
        </div>
        <div className="flex items-center gap-2">
          {failedCount > 0 && <ZHBadge variant="error">{failedCount} failed (24h)</ZHBadge>}
          <ZHActionBtn variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw size={13} />
          </ZHActionBtn>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zh-navy-mid rounded-lg p-1">
        {([
          { id: "crons" as const, label: "Cron Jobs" },
          { id: "logs" as const, label: "Logs" },
          { id: "diagnostics" as const, label: "Diagnostics" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-md font-zh-mono text-[10px] uppercase tracking-[1px] transition-colors ${
              tab === t.id ? "bg-zh-navy-light text-zh-gold font-semibold" : "text-zh-cream-muted hover:text-zh-cream"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CRONS TAB */}
      {tab === "crons" && (
        <div className="space-y-3">
          <ZHAlertBanner severity="info">
            Crons are account-wide — they process ALL active sites, not just the selected one.
          </ZHAlertBanner>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from(cronMap.entries()).map(([name, info]) => {
              const healthPct = info.successCount + info.failCount > 0
                ? Math.round((info.successCount / (info.successCount + info.failCount)) * 100)
                : 100;
              const statusType = info.status === "completed" ? "ok" as const
                : info.status === "failed" ? "critical" as const
                : info.status === "running" ? "degraded" as const
                : "unknown" as const;

              return (
                <ZHCard key={name} className="relative">
                  {/* Health bar */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-lg overflow-hidden bg-zh-navy-border">
                    <div
                      className={`h-full ${healthPct >= 80 ? "bg-zh-success-text" : healthPct >= 50 ? "bg-zh-warn-text" : "bg-zh-error-text"}`}
                      style={{ width: `${healthPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <ZHMonoVal size="sm" className="text-zh-cream">{name}</ZHMonoVal>
                    <ZHStatusPill label={info.status} status={statusType} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="font-zh-mono text-[8px] text-zh-cream-muted uppercase">Success</span>
                      <div className="font-zh-mono text-zh-success-text">{healthPct}%</div>
                    </div>
                    <div>
                      <span className="font-zh-mono text-[8px] text-zh-cream-muted uppercase">Duration</span>
                      <div className="font-zh-mono text-zh-cream">{info.lastDuration ? `${(info.lastDuration / 1000).toFixed(1)}s` : "—"}</div>
                    </div>
                  </div>

                  {info.lastError && (
                    <p className="font-zh-mono text-[9px] text-zh-error-text truncate mb-2" title={info.lastError}>
                      {info.lastError}
                    </p>
                  )}

                  <div className="flex gap-1">
                    <ZHActionBtn
                      variant="secondary"
                      size="sm"
                      loading={triggerLoading === name}
                      onClick={() => triggerCron(name, `/api/cron/${name}`)}
                    >
                      <Play size={10} /> Run
                    </ZHActionBtn>
                    <ZHActionBtn variant="ghost" size="sm" onClick={() => copyAsJson({ job: name, ...info })}>
                      <Copy size={10} />
                    </ZHActionBtn>
                  </div>
                </ZHCard>
              );
            })}
          </div>
        </div>
      )}

      {/* LOGS TAB */}
      {tab === "logs" && (
        <ZHCard>
          <ZHSectionLabel>Cron Run History (Last 50)</ZHSectionLabel>
          <ZHTable headers={["Job", "Status", "Duration", "Items", "Time", ""]}>
            {logs.slice(0, 50).map((log, i) => {
              const statusV = log.status === "completed" ? "success" as const : log.status === "failed" ? "error" as const : "warn" as const;
              return (
                <tr key={log.id || i} className="hover:bg-zh-navy-light transition-colors">
                  <td className="py-1.5 px-3"><ZHMonoVal size="sm">{log.job_name}</ZHMonoVal></td>
                  <td className="py-1.5 px-3"><ZHBadge variant={statusV}>{log.status}</ZHBadge></td>
                  <td className="py-1.5 px-3"><ZHMonoVal size="sm" className="text-zh-cream-muted">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}</ZHMonoVal></td>
                  <td className="py-1.5 px-3"><ZHMonoVal size="sm">{log.items_processed || 0}</ZHMonoVal></td>
                  <td className="py-1.5 px-3"><ZHMonoVal size="sm" className="text-zh-cream-muted">{timeAgo(log.started_at)}</ZHMonoVal></td>
                  <td className="py-1.5 px-3">
                    <ZHActionBtn variant="ghost" size="sm" onClick={() => copyAsJson(log)}>
                      <Copy size={10} />
                    </ZHActionBtn>
                  </td>
                </tr>
              );
            })}
          </ZHTable>
        </ZHCard>
      )}

      {/* DIAGNOSTICS TAB */}
      {tab === "diagnostics" && (
        <div className="space-y-4">
          <ZHAlertBanner severity="info">
            Diagnostics from Cycle Health Analyzer — checks pipeline, crons, indexing, quality, AI, and CJ affiliate.
          </ZHAlertBanner>

          {diagnostics.length === 0 ? (
            <ZHCard>
              <div className="flex items-center gap-3 text-zh-success-text">
                <CheckCircle size={20} />
                <div>
                  <div className="font-zh-ui font-semibold text-sm">All Systems Healthy</div>
                  <div className="font-zh-mono text-[10px] text-zh-cream-muted">No issues detected in last analysis</div>
                </div>
              </div>
            </ZHCard>
          ) : (
            <div className="space-y-2">
              {diagnostics.map((diag, i) => (
                <div key={i} className={`bg-zh-navy-mid border border-zh-navy-border rounded-lg p-4 border-l-4 ${
                  diag.status === "critical" ? "border-l-zh-error-text" : diag.status === "high" ? "border-l-zh-warn-text" : "border-l-zh-info-text"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ZHBadge variant={diag.status === "critical" ? "error" : diag.status === "high" ? "warn" : "info"}>
                          {diag.status}
                        </ZHBadge>
                        <span className="font-zh-ui text-sm text-zh-cream">{diag.job}</span>
                      </div>
                      {diag.error && (
                        <p className="font-zh-mono text-xs text-zh-cream-muted">{diag.error}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {diag.fixEndpoint && (
                        <ZHActionBtn variant="secondary" size="sm" onClick={() => {
                          fetch(diag.fixEndpoint!, { method: "POST" }).catch(() => {});
                          setTimeout(fetchData, 3000);
                        }}>
                          <Wrench size={10} /> Fix
                        </ZHActionBtn>
                      )}
                      <ZHActionBtn variant="ghost" size="sm" onClick={() => copyAsJson(diag)}>
                        <Copy size={10} />
                      </ZHActionBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
