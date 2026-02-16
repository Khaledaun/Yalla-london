"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  FileText,
  Globe,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Send,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────
interface DraftItem {
  id: string;
  keyword: string;
  locale: string;
  site_id: string;
  current_phase: string;
  phase_attempts: number;
  last_error: string | null;
  topic_title: string | null;
  quality_score: number | null;
  seo_score: number | null;
  word_count: number | null;
  readability_score: number | null;
  content_depth_score: number | null;
  generation_strategy: string | null;
  paired_draft_id: string | null;
  rejection_reason: string | null;
  sections_total: number | null;
  sections_completed: number | null;
  created_at: string;
  updated_at: string;
  phase_started_at: string | null;
  completed_at: string | null;
}

interface CronLog {
  id: string;
  job_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  items_processed: number;
  items_succeeded: number;
  items_failed: number;
  error_message: string | null;
  result_summary: Record<string, unknown> | null;
}

interface PipelineHealth {
  ai_configured: boolean;
  ai_provider: string | null;
  feature_flags: Record<string, boolean | null>;
  topics_available: number;
  blockers: string[];
}

interface MonitorData {
  active_drafts: DraftItem[];
  recent_drafts: DraftItem[];
  phase_counts: Record<string, number>;
  recent_logs: CronLog[];
  summary: {
    reservoir_count: number;
    published_today: number;
    total_active: number;
  };
  health?: PipelineHealth;
  timestamp: string;
}

// ─── Constants ──────────────────────────────────────────────────────
const PIPELINE_PHASES = [
  "research",
  "outline",
  "drafting",
  "assembly",
  "images",
  "seo",
  "scoring",
  "reservoir",
] as const;

const PHASE_META: Record<
  string,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  research: {
    label: "Research",
    icon: "🔍",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  outline: {
    label: "Outline",
    icon: "📋",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
  drafting: {
    label: "Drafting",
    icon: "✍️",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
  },
  assembly: {
    label: "Assembly",
    icon: "🔧",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  images: {
    label: "Images",
    icon: "🖼️",
    color: "text-pink-700",
    bgColor: "bg-pink-50 border-pink-200",
  },
  seo: {
    label: "SEO",
    icon: "📊",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  scoring: {
    label: "Scoring",
    icon: "⭐",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50 border-yellow-200",
  },
  reservoir: {
    label: "Reservoir",
    icon: "💧",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50 border-cyan-200",
  },
  published: {
    label: "Published",
    icon: "✅",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  rejected: {
    label: "Rejected",
    icon: "❌",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
  },
};

const POLL_INTERVAL_MS = 5000; // 5 seconds when watching

// ─── Component ──────────────────────────────────────────────────────
export default function ContentGenerationMonitor() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const triggerCountRef = useRef(0);

  // Run database migration (creates missing tables)
  const runMigration = async () => {
    setMigrationRunning(true);
    setMigrationResult(null);
    try {
      const res = await fetch("/api/admin/run-migration", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setMigrationResult(
          `Migration complete: ${json.results?.map((r: { table: string; status: string }) => `${r.table}: ${r.status}`).join(", ")}`,
        );
        // Refresh data to clear the blocker
        await fetchData();
      } else {
        setMigrationResult(`Migration failed: ${json.error || json.errors?.join(", ") || "Unknown error"}`);
      }
    } catch {
      setMigrationResult("Migration failed: Network error");
    } finally {
      setMigrationRunning(false);
    }
  };

  // Fetch data
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/content-generation-monitor");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || "Failed to load monitor data");
      }
    } catch (e) {
      setError("Network error — could not reach server");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-poll when watching
  useEffect(() => {
    if (isWatching) {
      pollRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isWatching, fetchData]);

  // Trigger content builder
  const triggerBuild = async () => {
    setTriggering(true);
    setTriggerResult(null);
    triggerCountRef.current++;
    const runNumber = triggerCountRef.current;

    try {
      const res = await fetch("/api/admin/content-generation-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_build" }),
      });
      const json = await res.json();

      if (json.success) {
        const r = json.result;
        if (r?.success) {
          setTriggerResult(
            `Run #${runNumber}: ${r.keyword || "Draft"} — ${r.previousPhase || "new"} → ${r.nextPhase || "processing"} (${r.durationMs || 0}ms)`,
          );
        } else {
          setTriggerResult(
            `Run #${runNumber}: ${r?.message || r?.error || "Completed"}`,
          );
        }
      } else {
        setTriggerResult(`Run #${runNumber}: Error — ${json.error}`);
      }

      // Refresh data immediately after trigger
      await fetchData(true);
    } catch {
      setTriggerResult(`Run #${runNumber}: Network error`);
    } finally {
      setTriggering(false);
    }
  };

  // Trigger content selector
  const triggerSelector = async () => {
    setTriggering(true);
    setTriggerResult(null);

    try {
      const res = await fetch("/api/admin/content-generation-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_selector" }),
      });
      const json = await res.json();

      if (json.success) {
        const r = json.result;
        setTriggerResult(
          `Selector: ${r?.published || 0} published, ${r?.reservoirCandidates || 0} candidates`,
        );
      } else {
        setTriggerResult(`Selector error: ${json.error}`);
      }

      await fetchData(true);
    } catch {
      setTriggerResult("Selector: Network error");
    } finally {
      setTriggering(false);
    }
  };

  const toggleDraft = (id: string) => {
    setExpandedDrafts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get phase index for progress calculation
  const getPhaseIndex = (phase: string) => {
    const idx = PIPELINE_PHASES.indexOf(phase as (typeof PIPELINE_PHASES)[number]);
    return idx >= 0 ? idx : -1;
  };

  const getPhaseProgress = (phase: string) => {
    if (phase === "published") return 100;
    if (phase === "rejected") return 0;
    const idx = getPhaseIndex(phase);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / PIPELINE_PHASES.length) * 100);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
  };

  // ─── Render ─────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading generation monitor...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchData()} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Controls Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={triggerBuild}
            disabled={triggering}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {triggering ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Generate Content
          </Button>
          <Button
            onClick={triggerSelector}
            disabled={triggering}
            variant="outline"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Send className="h-4 w-4 mr-2" />
            Publish Ready
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsWatching(!isWatching)}
            variant={isWatching ? "default" : "outline"}
            size="sm"
            className={
              isWatching
                ? "bg-green-600 hover:bg-green-700 text-white"
                : ""
            }
          >
            {isWatching ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Watching (5s)
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Auto-refresh Off
              </>
            )}
          </Button>
          <Button
            onClick={() => fetchData(true)}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* ── Trigger Result ── */}
      {triggerResult && (
        <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 flex items-start gap-2">
          <Zap className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
          <span>{triggerResult}</span>
        </div>
      )}

      {/* ── Pipeline Health Banner ── */}
      {data?.health && data.health.blockers.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pipeline Blocked — {data.health.blockers.length} issue{data.health.blockers.length > 1 ? "s" : ""} preventing content generation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <ul className="space-y-2">
              {data.health.blockers.map((blocker, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{blocker}</span>
                </li>
              ))}
            </ul>
            {data.health.blockers.some((b) => b.includes("migration") || b.includes("does not exist")) && (
              <div className="pt-2 border-t border-red-200">
                <Button
                  onClick={runMigration}
                  disabled={migrationRunning}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {migrationRunning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {migrationRunning ? "Creating Tables..." : "Fix Database — Create Missing Tables"}
                </Button>
                {migrationResult && (
                  <p className={`mt-2 text-sm ${migrationResult.includes("complete") ? "text-green-700" : "text-red-700"}`}>
                    {migrationResult}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Pipeline OK Banner ── */}
      {data?.health && data.health.blockers.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>
            Pipeline healthy — AI provider: <strong>{data.health.ai_provider || "unknown"}</strong>
            {" | "}
            Topics available: <strong>{data.health.topics_available}</strong>
          </span>
        </div>
      )}

      {/* ── Summary Cards ── */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Active"
            value={data.summary.total_active}
            icon={<Loader2 className="h-5 w-5 text-blue-500" />}
            color="border-blue-200"
          />
          <SummaryCard
            label="Reservoir"
            value={data.summary.reservoir_count}
            icon={<Clock className="h-5 w-5 text-cyan-500" />}
            color="border-cyan-200"
          />
          <SummaryCard
            label="Published Today"
            value={data.summary.published_today}
            icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
            color="border-emerald-200"
          />
          <SummaryCard
            label="Total Phases"
            value={Object.values(data.phase_counts).reduce((a, b) => a + b, 0)}
            icon={<FileText className="h-5 w-5 text-purple-500" />}
            color="border-purple-200"
          />
        </div>
      )}

      {/* ── Phase Distribution Bar ── */}
      {data && Object.keys(data.phase_counts).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Phase Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_PHASES.map((phase) => {
                const count = data.phase_counts[phase] || 0;
                const meta = PHASE_META[phase];
                return (
                  <div
                    key={phase}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${meta.bgColor} ${meta.color}`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span className="ml-1 font-bold">{count}</span>
                  </div>
                );
              })}
              {(data.phase_counts["published"] || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 text-sm font-medium">
                  <span>✅</span>
                  <span>Published</span>
                  <span className="ml-1 font-bold">
                    {data.phase_counts["published"]}
                  </span>
                </div>
              )}
              {(data.phase_counts["rejected"] || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-red-50 border-red-200 text-red-700 text-sm font-medium">
                  <span>❌</span>
                  <span>Rejected</span>
                  <span className="ml-1 font-bold">
                    {data.phase_counts["rejected"]}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Active Drafts — Live Pipeline ── */}
      {data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2
                className={`h-4 w-4 ${data.active_drafts.length > 0 ? "animate-spin text-blue-500" : "text-gray-400"}`}
              />
              Active Generations ({data.active_drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.active_drafts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No active generations right now.</p>
                <p className="text-xs mt-1">
                  Click &quot;Generate Content&quot; to start one.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.active_drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    expanded={expandedDrafts.has(draft.id)}
                    onToggle={() => toggleDraft(draft.id)}
                    timeAgo={timeAgo}
                    getPhaseProgress={getPhaseProgress}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Recent Completed / History ── */}
      {data && data.recent_drafts.length > 0 && (
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => setShowHistory(!showHistory)}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Recent Completions ({data.recent_drafts.length})
              </span>
              {showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {showHistory && (
            <CardContent>
              <div className="space-y-3">
                {data.recent_drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    expanded={expandedDrafts.has(draft.id)}
                    onToggle={() => toggleDraft(draft.id)}
                    timeAgo={timeAgo}
                    getPhaseProgress={getPhaseProgress}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Cron Logs ── */}
      {data && data.recent_logs.length > 0 && (
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => setShowLogs(!showLogs)}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Build Logs ({data.recent_logs.length})
              </span>
              {showLogs ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
          {showLogs && (
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.recent_logs.map((log) => (
                  <LogRow key={log.id} log={log} timeAgo={timeAgo} />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Footer ── */}
      {data && (
        <p className="text-xs text-gray-400 text-center">
          Last refreshed: {new Date(data.timestamp).toLocaleTimeString()}
          {isWatching && " — auto-refreshing every 5s"}
        </p>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${color} bg-white`}
    >
      {icon}
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function DraftCard({
  draft,
  expanded,
  onToggle,
  timeAgo,
  getPhaseProgress,
}: {
  draft: DraftItem;
  expanded: boolean;
  onToggle: () => void;
  timeAgo: (d: string) => string;
  getPhaseProgress: (p: string) => number;
}) {
  const meta = PHASE_META[draft.current_phase] || {
    label: draft.current_phase,
    icon: "❓",
    color: "text-gray-700",
    bgColor: "bg-gray-50 border-gray-200",
  };
  const progress = getPhaseProgress(draft.current_phase);
  const isTerminal =
    draft.current_phase === "published" ||
    draft.current_phase === "rejected" ||
    draft.current_phase === "reservoir";
  const hasError = draft.last_error && draft.phase_attempts > 0;

  return (
    <div
      className={`border rounded-lg overflow-hidden ${hasError ? "border-red-200" : "border-gray-200"}`}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        {/* Phase badge */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${meta.bgColor} ${meta.color}`}
        >
          <span>{meta.icon}</span>
          <span>{meta.label}</span>
        </div>

        {/* Keyword / title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {draft.topic_title || draft.keyword}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
            >
              {draft.locale.toUpperCase()}
            </Badge>
            <span>{timeAgo(draft.updated_at)}</span>
            {draft.generation_strategy && (
              <span className="text-gray-400">
                {draft.generation_strategy}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="hidden sm:flex items-center gap-2 w-32">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-xs text-gray-500 w-8 text-right">
            {progress}%
          </span>
        </div>

        {/* Error indicator */}
        {hasError && (
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
        )}

        {/* Expand chevron */}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t bg-gray-50 p-3 space-y-3">
          {/* Phase stepper */}
          <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
            {PIPELINE_PHASES.map((phase, idx) => {
              const phaseIdx = PIPELINE_PHASES.indexOf(
                draft.current_phase as (typeof PIPELINE_PHASES)[number],
              );
              let state: "done" | "active" | "pending" = "pending";
              if (draft.current_phase === "published") state = "done";
              else if (draft.current_phase === "rejected") state = "pending";
              else if (idx < phaseIdx) state = "done";
              else if (idx === phaseIdx) state = "active";

              const pm = PHASE_META[phase];
              return (
                <React.Fragment key={phase}>
                  {idx > 0 && (
                    <ArrowRight
                      className={`h-3 w-3 flex-shrink-0 ${state === "done" ? "text-green-400" : "text-gray-300"}`}
                    />
                  )}
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${
                      state === "done"
                        ? "bg-green-100 text-green-700"
                        : state === "active"
                          ? `${pm.bgColor} ${pm.color} ring-2 ring-offset-1 ring-blue-400`
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <span>{pm.icon}</span>
                    <span>{pm.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {draft.quality_score != null && (
              <MetricPill
                label="Quality"
                value={`${draft.quality_score.toFixed(1)}`}
              />
            )}
            {draft.seo_score != null && (
              <MetricPill
                label="SEO"
                value={`${draft.seo_score.toFixed(1)}`}
              />
            )}
            {draft.word_count != null && (
              <MetricPill
                label="Words"
                value={`${draft.word_count.toLocaleString()}`}
              />
            )}
            {draft.sections_total != null && (
              <MetricPill
                label="Sections"
                value={`${draft.sections_completed || 0}/${draft.sections_total}`}
              />
            )}
            {draft.readability_score != null && (
              <MetricPill
                label="Readability"
                value={`${draft.readability_score.toFixed(1)}`}
              />
            )}
            {draft.content_depth_score != null && (
              <MetricPill
                label="Depth"
                value={`${draft.content_depth_score.toFixed(1)}`}
              />
            )}
          </div>

          {/* Error message */}
          {draft.last_error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              <span className="font-medium">
                Error (attempt {draft.phase_attempts}/3):
              </span>{" "}
              {draft.last_error}
            </div>
          )}

          {/* Rejection reason */}
          {draft.rejection_reason && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              <span className="font-medium">Rejected:</span>{" "}
              {draft.rejection_reason}
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
            <span>ID: {draft.id.slice(0, 8)}...</span>
            <span>Site: {draft.site_id}</span>
            {draft.paired_draft_id && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Paired: {draft.paired_draft_id.slice(0, 8)}...
              </span>
            )}
            <span>Created: {new Date(draft.created_at).toLocaleString()}</span>
            {draft.phase_started_at && (
              <span>
                Phase started: {timeAgo(draft.phase_started_at)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-white border rounded px-2 py-1">
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function LogRow({
  log,
  timeAgo,
}: {
  log: CronLog;
  timeAgo: (d: string) => string;
}) {
  const statusColor =
    log.status === "completed"
      ? "text-green-600"
      : log.status === "failed"
        ? "text-red-600"
        : log.status === "timed_out"
          ? "text-amber-600"
          : "text-blue-600";

  const summary = log.result_summary as Record<string, unknown> | null;

  return (
    <div className="flex items-center gap-3 text-xs py-2 px-2 rounded hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <span className={`font-medium w-20 ${statusColor}`}>
        {log.status}
      </span>
      <Badge variant="outline" className="text-[10px]">
        {log.job_name}
      </Badge>
      <span className="text-gray-500 flex-1 truncate">
        {summary?.keyword
          ? `"${summary.keyword}"`
          : summary?.message
            ? String(summary.message).slice(0, 60)
            : "—"}
        {summary?.phase && (
          <span className="text-gray-400 ml-1">
            ({String(summary.phase)} → {String(summary.nextPhase || "—")})
          </span>
        )}
      </span>
      <span className="text-gray-400 tabular-nums">
        {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
      </span>
      <span className="text-gray-400 w-16 text-right">
        {timeAgo(log.started_at)}
      </span>
    </div>
  );
}
