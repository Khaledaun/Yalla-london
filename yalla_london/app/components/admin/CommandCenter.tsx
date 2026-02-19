"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown,
  ChevronRight, Globe, Zap, Play, Send, Loader2, Activity,
  ArrowRight, Search, FileText, Lightbulb, Database, ExternalLink,
  Eye, BarChart3, MapPin,
} from "lucide-react";

// ── Types ──

type Health = "green" | "yellow" | "red" | "gray";

interface PipelineStage {
  total: number;
  health: Health;
  byStatus?: Record<string, number>;
  byPhase?: Record<string, number>;
  phases?: string[];
  today?: number;
  submitted?: number;
  discovered?: number;
  errors?: number;
  indexRate?: number;
}

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  jobName: string;
  error: string;
  errorStack: string | null;
  timestamp: string;
  duration: number | null;
  itemsProcessed: number;
  itemsFailed: number;
  sites: string[];
}

interface CronJob {
  name: string;
  lastRun: string;
  lastStatus: string;
  lastDuration: number | null;
  schedule: string;
  runs24h: number;
  failures24h: number;
  health: Health;
  lastError: string | null;
}

interface SiteData {
  siteId: string;
  name: string;
  domain: string;
  locale: string;
  articles: number;
  topics: number;
  drafts: number;
  indexed: number;
  active: boolean;
  health: Health;
}

interface IndexEntry {
  url: string;
  status: string;
  siteId: string;
  indexingState: string | null;
  coverageState: string | null;
  submittedAt: string | null;
  crawledAt: string | null;
  error: string | null;
}

interface LogEntry {
  id: string;
  jobName: string;
  status: string;
  startedAt: string;
  duration: number | null;
  items: number;
  succeeded: number;
  failed: number;
  error: string | null;
  timedOut: boolean;
}

interface OverviewData {
  pipeline: Record<string, PipelineStage>;
  alerts: Alert[];
  crons: CronJob[];
  sites: SiteData[];
  indexing: {
    totalUrls: number;
    indexed: number;
    submitted: number;
    discovered: number;
    errors: number;
    indexRate: number;
    recentSubmissions: IndexEntry[];
  };
  recentLogs: LogEntry[];
  generatedAt: string;
}

// ── Helpers ──

const HEALTH_COLORS: Record<Health, { dot: string; bg: string; text: string; border: string }> = {
  green:  { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  yellow: { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30" },
  red:    { dot: "bg-red-500",     bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30" },
  gray:   { dot: "bg-gray-500",    bg: "bg-gray-500/10",    text: "text-gray-400",    border: "border-gray-500/30" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function HealthDot({ health, size = "sm" }: { health: Health; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "w-3.5 h-3.5" : size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  const pulse = health === "green" ? "animate-pulse" : "";
  return <span className={`${s} rounded-full ${HEALTH_COLORS[health].dot} ${pulse} inline-block flex-shrink-0`} />;
}

// ── Tab definitions ──

const TABS = [
  { id: "pipeline", label: "Pipeline", icon: Activity },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "indexing", label: "Indexing", icon: Globe },
  { id: "sites", label: "Sites", icon: BarChart3 },
  { id: "logs", label: "Logs", icon: Clock },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function CommandCenter() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("pipeline");
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/command-center/overview");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const runAction = async (label: string, url: string) => {
    setRunningAction(label);
    setActionMsg(null);
    try {
      const res = await fetch(url, { method: "POST" });
      const json = await res.json();
      setActionMsg({ ok: res.ok, text: json.message || json.error || (res.ok ? "Done" : "Failed") });
      await fetchData();
    } catch {
      setActionMsg({ ok: false, text: `${label}: Network error` });
    } finally {
      setRunningAction(null);
    }
  };

  // ── Loading state ──
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-sm text-gray-400">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <XCircle className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchData} className="text-sm text-blue-400 underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const criticalCount = data.alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Command Center
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Updated {timeAgo(data.generatedAt)} &middot; Auto-refresh 30s
          </p>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Critical alert banner ── */}
      {criticalCount > 0 && (
        <button
          onClick={() => setTab("alerts")}
          className="w-full bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 hover:bg-red-100 transition-colors text-left"
        >
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm font-medium text-red-800">
            {criticalCount} critical alert{criticalCount !== 1 ? "s" : ""} in the last 24h
          </span>
          <ArrowRight className="h-4 w-4 text-red-400 ml-auto" />
        </button>
      )}

      {/* ── Action message ── */}
      {actionMsg && (
        <div className={`rounded-xl p-3 flex items-center justify-between text-sm ${
          actionMsg.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-gray-400 hover:text-gray-600 px-2">&times;</button>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 snap-x">
        {[
          { label: "Generate", url: "/api/admin/full-pipeline-run", icon: Zap, color: "bg-blue-600" },
          { label: "Publish", url: "/api/admin/publish-all-ready", icon: Send, color: "bg-emerald-600" },
          { label: "Run Crons", url: "/api/admin/run-all-crons", icon: Play, color: "bg-orange-600" },
          { label: "Seed Topics", url: "/api/admin/seed-topics", icon: Lightbulb, color: "bg-cyan-600" },
          { label: "Seed Walks", url: "/api/admin/seed-walks", icon: MapPin, color: "bg-purple-600" },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => runAction(a.label, a.url)}
            disabled={!!runningAction}
            className={`${a.color} text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 flex-shrink-0 snap-start disabled:opacity-50`}
          >
            {runningAction === a.label ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <a.icon className="h-3.5 w-3.5" />}
            {runningAction === a.label ? "Running..." : a.label}
          </button>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          const badge = t.id === "alerts" && criticalCount > 0 ? criticalCount : null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {tab === "pipeline" && <PipelineTab data={data} />}
      {tab === "alerts" && <AlertsTab alerts={data.alerts} />}
      {tab === "indexing" && <IndexingTab data={data.indexing} />}
      {tab === "sites" && <SitesTab sites={data.sites} />}
      {tab === "logs" && <LogsTab logs={data.recentLogs} crons={data.crons} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PIPELINE TAB — n8n-style workflow visualization
// ══════════════════════════════════════════════════════════════════

function PipelineTab({ data }: { data: OverviewData }) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const p = data.pipeline;

  const nodes = [
    { id: "topics", label: "Topics", count: p.topics.total, health: p.topics.health, icon: Lightbulb,
      detail: p.topics.byStatus ? Object.entries(p.topics.byStatus).map(([k, v]) => `${k}: ${v}`) : [] },
    { id: "drafts", label: "Drafts", count: p.drafts.total, health: p.drafts.health, icon: FileText,
      detail: p.drafts.phases?.map((ph) => `${ph}: ${p.drafts.byPhase?.[ph] || 0}`) || [] },
    { id: "reservoir", label: "Reservoir", count: p.reservoir.total, health: p.reservoir.health, icon: Database,
      detail: [`${p.reservoir.total} ready for selection`] },
    { id: "published", label: "Published", count: p.published.total, health: p.published.health, icon: CheckCircle,
      detail: [`${p.published.today || 0} published today`, `${p.published.total} total`] },
    { id: "indexed", label: "Indexed", count: p.indexed.total, health: p.indexed.health, icon: Globe,
      detail: [
        `${p.indexed.total} indexed`,
        `${p.indexed.submitted || 0} submitted`,
        `${p.indexed.errors || 0} errors`,
        `${p.indexed.indexRate || 0}% rate`,
      ] },
  ];

  return (
    <div className="space-y-4">
      {/* ── n8n-style Workflow Nodes ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-x-auto">
        <div className="flex items-stretch gap-0 min-w-[600px]">
          {nodes.map((node, i) => {
            const colors = HEALTH_COLORS[node.health];
            const isExpanded = expandedNode === node.id;
            return (
              <div key={node.id} className="flex items-stretch flex-1">
                {/* Node */}
                <button
                  onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                  className={`relative flex-1 rounded-xl border-2 ${colors.border} ${colors.bg} p-3 text-center transition-all hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <HealthDot health={node.health} size="md" />
                  <div className="mt-2">
                    <node.icon className={`h-5 w-5 mx-auto ${colors.text}`} />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{node.count}</div>
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{node.label}</div>
                  <ChevronDown className={`h-3 w-3 text-gray-400 mx-auto mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {/* Connector arrow */}
                {i < nodes.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className="w-6 h-0.5 bg-gray-300" />
                    <ArrowRight className="h-3 w-3 text-gray-400 -ml-0.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Expanded node detail ── */}
      {expandedNode && (() => {
        const node = nodes.find((n) => n.id === expandedNode);
        if (!node) return null;
        const colors = HEALTH_COLORS[node.health];

        // Special rendering for drafts — show phase progress bars
        if (node.id === "drafts" && p.drafts.phases) {
          return (
            <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900">Draft Pipeline Phases</h3>
                <button onClick={() => setExpandedNode(null)} className="text-xs text-gray-400">&times; close</button>
              </div>
              <div className="space-y-2">
                {p.drafts.phases.map((phase, idx) => {
                  const count = p.drafts.byPhase?.[phase] || 0;
                  const maxCount = Math.max(...(p.drafts.phases?.map((ph) => p.drafts.byPhase?.[ph] || 0) || [1]));
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const phaseHealth: Health = count > 0 ? "green" : "gray";
                  return (
                    <div key={phase} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono w-5 text-gray-400">{idx + 1}</span>
                      <HealthDot health={phaseHealth} />
                      <span className="text-xs font-medium text-gray-700 w-20 truncate capitalize">{phase}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${count > 0 ? "bg-blue-500" : "bg-gray-300"}`}
                          style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-900 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
              <Link href="/admin/content?tab=generation" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2">
                Open Generation Monitor <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          );
        }

        // Generic detail view for other nodes
        return (
          <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-900">{node.label} Details</h3>
              <button onClick={() => setExpandedNode(null)} className="text-xs text-gray-400">&times; close</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {node.detail.map((d, i) => (
                <div key={i} className="text-xs text-gray-700 bg-white/60 rounded-lg px-3 py-2">{d}</div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Cron Health Grid ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Cron Job Health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {data.crons.map((cron) => (
            <CronCard key={cron.name} cron={cron} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CronCard({ cron }: { cron: CronJob }) {
  const [open, setOpen] = useState(false);
  const colors = HEALTH_COLORS[cron.health];

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-2.5`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-center gap-2">
          <HealthDot health={cron.health} />
          <span className="text-xs font-medium text-gray-900 truncate flex-1">{cron.name}</span>
          <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        <div className="text-[10px] text-gray-500 mt-1 truncate">{cron.schedule}</div>
      </button>
      {open && (
        <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-1 text-[10px] text-gray-600">
          <div>Last: {cron.lastRun ? timeAgo(cron.lastRun) : "Never"} — <span className={cron.lastStatus === "completed" ? "text-emerald-600" : "text-red-500"}>{cron.lastStatus}</span></div>
          <div>24h: {cron.runs24h} runs, {cron.failures24h} failures</div>
          {cron.lastDuration && <div>Duration: {(cron.lastDuration / 1000).toFixed(1)}s</div>}
          {cron.lastError && <div className="text-red-500 break-words">{cron.lastError}</div>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ALERTS TAB — All errors with full details, clickable
// ══════════════════════════════════════════════════════════════════

function AlertsTab({ alerts }: { alerts: Alert[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const criticals = alerts.filter((a) => a.severity === "critical");
  const warnings = alerts.filter((a) => a.severity === "warning");

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-emerald-800">No alerts in the last 24 hours</p>
        <p className="text-xs text-emerald-600 mt-1">All systems running normally</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-3">
        {criticals.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
            <span className="font-bold text-red-700">{criticals.length}</span> <span className="text-red-600">critical</span>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
            <span className="font-bold text-amber-700">{warnings.length}</span> <span className="text-amber-600">warnings</span>
          </div>
        )}
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {alerts.map((alert) => {
          const isExpanded = expandedId === alert.id;
          const isCritical = alert.severity === "critical";
          return (
            <div key={alert.id} className={`rounded-xl border ${isCritical ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <HealthDot health={isCritical ? "red" : "yellow"} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900">{alert.jobName}</div>
                  <div className={`text-[10px] ${isCritical ? "text-red-600" : "text-amber-600"} truncate`}>
                    {alert.error}
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(alert.timestamp)}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="bg-white rounded-lg p-3 text-xs space-y-2">
                    <div>
                      <span className="font-semibold text-gray-700">Error:</span>
                      <pre className="mt-1 text-red-700 whitespace-pre-wrap break-words bg-red-50 p-2 rounded text-[10px] font-mono">
                        {alert.error}
                      </pre>
                    </div>
                    {alert.errorStack && (
                      <div>
                        <span className="font-semibold text-gray-700">Stack:</span>
                        <pre className="mt-1 text-gray-600 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded text-[10px] font-mono max-h-32 overflow-y-auto">
                          {alert.errorStack}
                        </pre>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <div>Time: {new Date(alert.timestamp).toLocaleString()}</div>
                      {alert.duration && <div>Duration: {(alert.duration / 1000).toFixed(1)}s</div>}
                      <div>Items: {alert.itemsProcessed} processed, {alert.itemsFailed} failed</div>
                      {alert.sites.length > 0 && <div>Sites: {alert.sites.join(", ")}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Link href="/admin/cron-logs" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
        View full cron log history <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INDEXING TAB — Real indexing data with per-URL status
// ══════════════════════════════════════════════════════════════════

function IndexingTab({ data }: { data: OverviewData["indexing"] }) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { label: "Indexed", value: data.indexed, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Submitted", value: data.submitted, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Discovered", value: data.discovered, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "Errors", value: data.errors, color: data.errors > 0 ? "text-red-600" : "text-gray-400", bg: data.errors > 0 ? "bg-red-50" : "bg-gray-50" },
          { label: "Rate", value: `${data.indexRate}%`, color: data.indexRate >= 50 ? "text-emerald-600" : "text-amber-600", bg: "bg-purple-50" },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-3 text-center`}>
            <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
            <div className="text-[10px] font-medium text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* URL list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent URLs ({data.recentSubmissions.length})</h3>
        <div className="space-y-1.5">
          {data.recentSubmissions.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">No indexed URLs yet. Run the content pipeline to generate and index articles.</div>
          ) : (
            data.recentSubmissions.map((entry) => {
              const isExpanded = expandedUrl === entry.url;
              const statusHealth: Health =
                entry.status === "indexed" ? "green" :
                entry.status === "submitted" ? "yellow" :
                entry.status === "error" ? "red" : "gray";
              return (
                <div key={entry.url} className="bg-white rounded-lg border border-gray-200">
                  <button
                    onClick={() => setExpandedUrl(isExpanded ? null : entry.url)}
                    className="w-full text-left p-2.5 flex items-center gap-2"
                  >
                    <HealthDot health={statusHealth} />
                    <span className="text-xs text-gray-900 truncate flex-1 font-mono">{entry.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      entry.status === "indexed" ? "bg-emerald-100 text-emerald-700" :
                      entry.status === "submitted" ? "bg-blue-100 text-blue-700" :
                      entry.status === "error" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {entry.status}
                    </span>
                    <ChevronRight className={`h-3 w-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-1.5 text-[10px] text-gray-600">
                      <div>Site: <span className="font-medium">{entry.siteId}</span></div>
                      {entry.indexingState && <div>State: <span className="font-medium">{entry.indexingState}</span></div>}
                      {entry.coverageState && <div>Coverage: <span className="font-medium">{entry.coverageState}</span></div>}
                      {entry.submittedAt && <div>Submitted: {timeAgo(entry.submittedAt)}</div>}
                      {entry.crawledAt && <div>Crawled: {timeAgo(entry.crawledAt)}</div>}
                      {entry.error && <div className="col-span-2 text-red-600">Error: {entry.error}</div>}
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="col-span-2 text-blue-600 hover:underline flex items-center gap-1">
                        Open URL <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <Link href="/admin/indexing" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
        Open full indexing dashboard <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SITES TAB — Per-site explorer
// ══════════════════════════════════════════════════════════════════

function SitesTab({ sites }: { sites: SiteData[] }) {
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {sites.map((site) => {
        const isExpanded = expandedSite === site.siteId;
        const colors = HEALTH_COLORS[site.health];
        return (
          <div key={site.siteId} className={`rounded-xl border ${colors.border} ${colors.bg}`}>
            <button
              onClick={() => setExpandedSite(isExpanded ? null : site.siteId)}
              className="w-full text-left p-3 flex items-center gap-3"
            >
              <HealthDot health={site.health} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">{site.name}</div>
                <div className="text-[10px] text-gray-500">{site.domain} &middot; {site.locale.toUpperCase()}</div>
              </div>
              {!site.active && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full font-medium">Inactive</span>
              )}
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </button>
            {isExpanded && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "Articles", value: site.articles, icon: FileText },
                    { label: "Topics", value: site.topics, icon: Lightbulb },
                    { label: "Drafts", value: site.drafts, icon: Activity },
                    { label: "Indexed", value: site.indexed, icon: Globe },
                  ].map((m) => (
                    <div key={m.label} className="bg-white/60 rounded-lg p-2 text-center">
                      <m.icon className="h-3.5 w-3.5 mx-auto text-gray-400 mb-1" />
                      <div className="text-sm font-bold text-gray-900">{m.value}</div>
                      <div className="text-[10px] text-gray-500">{m.label}</div>
                    </div>
                  ))}
                </div>
                {/* Pipeline health indicators */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { label: "Topics", ok: site.topics > 0 },
                    { label: "Drafts", ok: site.drafts > 0 },
                    { label: "Published", ok: site.articles > 0 },
                    { label: "Indexed", ok: site.indexed > 0 },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-1">
                      <HealthDot health={step.ok ? "green" : "gray"} />
                      <span className="text-[10px] text-gray-600">{step.label}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-gray-300 mx-0.5" />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Link href={`/admin/articles?site=${site.siteId}`} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                    <Eye className="h-2.5 w-2.5" /> Articles
                  </Link>
                  <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink className="h-2.5 w-2.5" /> Visit
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// LOGS TAB — Cron job history + timeline
// ══════════════════════════════════════════════════════════════════

function LogsTab({ logs, crons }: { logs: LogEntry[]; crons: CronJob[] }) {
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const filtered = filter === "failed" ? logs.filter((l) => l.status === "failed" || l.timedOut) : logs;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-500">{logs.length} logs (24h)</div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`text-[10px] px-2 py-1 rounded-full font-medium ${filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`text-[10px] px-2 py-1 rounded-full font-medium ${filter === "failed" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Failed ({logs.filter((l) => l.status === "failed" || l.timedOut).length})
          </button>
        </div>
      </div>

      {/* Cron overview bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {crons.slice(0, 8).map((c) => (
          <div key={c.name} className="bg-white rounded-lg border border-gray-200 p-2 flex items-center gap-2">
            <HealthDot health={c.health} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-gray-900 truncate">{c.name}</div>
              <div className="text-[9px] text-gray-400">{c.runs24h}r / {c.failures24h}f</div>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400">
            {filter === "failed" ? "No failures in the last 24 hours" : "No cron logs found"}
          </div>
        ) : (
          filtered.map((log) => {
            const logHealth: Health = log.status === "completed" ? "green" : log.status === "failed" || log.timedOut ? "red" : "yellow";
            return (
              <div key={log.id} className="bg-white rounded-lg border border-gray-200 p-2.5 flex items-center gap-2.5">
                <HealthDot health={logHealth} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{log.jobName}</div>
                  {log.error && <div className="text-[10px] text-red-500 truncate">{log.error}</div>}
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <div className="text-[10px] text-gray-400">{timeAgo(log.startedAt)}</div>
                  {log.duration && <div className="text-[10px] text-gray-400">{(log.duration / 1000).toFixed(1)}s</div>}
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  log.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                  log.status === "failed" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {log.timedOut ? "timeout" : log.status}
                </span>
              </div>
            );
          })
        )}
      </div>

      <Link href="/admin/cron-logs" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
        View full log history <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
