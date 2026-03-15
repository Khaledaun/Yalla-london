"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminButton,
  AdminKPICard,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
} from "@/components/admin/admin-ui";
import { SITES, getDefaultSiteId } from "@/config/sites";
import {
  Search,
  Sparkles,
  FileText,
  Video,
  Zap,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Brain,
  Lightbulb,
  PenTool,
  BarChart3,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────

interface PipelineStage {
  name: string;
  status: "completed" | "in_progress" | "waiting" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  data: Record<string, unknown> | null;
}

interface Pipeline {
  id: string;
  topic: string;
  siteId: string;
  siteName: string;
  language: string;
  status: "researching" | "ideating" | "scripting" | "analyzing" | "complete" | "paused" | "failed";
  createdAt: string;
  updatedAt: string;
  stages: PipelineStage[];
  result: Record<string, unknown> | null;
}

// ─── Constants ───────────────────────────────────────────────────

const SITE_OPTIONS = Object.values(SITES).map((s) => ({ id: s.id, name: s.name }));

const STAGE_ICONS: Record<string, React.ElementType> = {
  researcher: Search,
  ideator: Lightbulb,
  scripter: PenTool,
  analyst: BarChart3,
};

const STAGE_LABELS: Record<string, string> = {
  researcher: "Researcher",
  ideator: "Ideator",
  scripter: "Scripter",
  analyst: "Analyst",
};

const ACTIVE_STATUSES = ["researching", "ideating", "scripting", "analyzing"];

// ─── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

function getStageStatus(stages: PipelineStage[], stageName: string): "completed" | "in_progress" | "waiting" | "failed" {
  const stage = stages.find((s) => s.name.toLowerCase() === stageName.toLowerCase());
  return stage?.status || "waiting";
}

function getStageStatusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle className="h-4 w-4" style={{ color: '#2D5A3D' }} />;
    case "in_progress": return <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#3B7EA1' }} />;
    case "failed": return <AlertCircle className="h-4 w-4" style={{ color: '#C8322B' }} />;
    default: return <Clock className="h-4 w-4" style={{ color: '#A8A29E' }} />;
  }
}

function mapPipelineStatusToBadge(status: string): string {
  const map: Record<string, string> = {
    researching: "running",
    ideating: "running",
    scripting: "running",
    analyzing: "running",
    complete: "success",
    paused: "warning",
    failed: "failed",
  };
  return map[status] || "pending";
}

// ─── Main Component ──────────────────────────────────────────────

export default function ContentEnginePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // New pipeline form state
  const [newSiteId, setNewSiteId] = useState(getDefaultSiteId());
  const [newTopic, setNewTopic] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");

  const loadPipelines = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetch("/api/admin/content-engine/pipeline");
      if (res.ok) {
        const data = await res.json();
        const items = data.pipelines || data.data || [];
        setPipelines(
          items.map((p: Record<string, unknown>) => ({
            id: String(p.id || ""),
            topic: String(p.topic || p.title || "Untitled"),
            siteId: String(p.siteId || p.site_id || getDefaultSiteId()),
            siteName: String(p.siteName || p.site_name || ""),
            language: String(p.language || p.locale || "en"),
            status: String(p.status || "queued") as Pipeline["status"],
            createdAt: String(p.createdAt || p.created_at || ""),
            updatedAt: String(p.updatedAt || p.updated_at || ""),
            stages: Array.isArray(p.stages) ? p.stages as PipelineStage[] : [],
            result: (p.result || null) as Record<string, unknown> | null,
          }))
        );
      } else {
        setPipelines([]);
      }
    } catch (err) {
      console.warn("[content-engine] Failed to load pipelines:", err);
      setFetchError("Failed to load pipelines. Check your connection and try again.");
      setPipelines([]);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadPipelines().finally(() => setIsLoading(false));
  }, [loadPipelines]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPipelines();
    setIsRefreshing(false);
    toast.success("Pipelines refreshed");
  };

  const handleCreatePipeline = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/content-engine/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: newSiteId,
          topic: newTopic || undefined,
          language: newLanguage,
        }),
      });
      if (res.ok) {
        toast.success("Pipeline started");
        setShowNewPipeline(false);
        setNewTopic("");
        await loadPipelines();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to create pipeline");
      }
    } catch (err) {
      console.warn("[content-engine] Failed to create pipeline:", err);
      toast.error("Failed to create pipeline");
    }
    setIsCreating(false);
  };

  const handleQuickAction = async (action: string) => {
    try {
      const res = await fetch("/api/admin/content-engine/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, site: newSiteId }),
      });
      if (res.ok) {
        toast.success(`${action} pipeline started`);
        await loadPipelines();
      } else {
        toast.error(`Failed to start ${action}`);
      }
    } catch (err) {
      console.warn("[content-engine] Quick action failed:", err);
      toast.error("Action failed");
    }
  };

  const toggleStageExpansion = (stageKey: string) => {
    setExpandedStages((prev) => ({ ...prev, [stageKey]: !prev[stageKey] }));
  };

  // Summary counts
  const runningCount = pipelines.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const completedCount = pipelines.filter((p) => p.status === "complete").length;
  const failedCount = pipelines.filter((p) => p.status === "failed").length;
  const pausedCount = pipelines.filter((p) => p.status === "paused").length;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="admin-page p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <AdminPageHeader
          title="Content Engine"
          subtitle="AI-powered content generation pipeline"
          action={
            <div className="flex items-center gap-2">
              <AdminButton variant="secondary" size="sm" onClick={handleRefresh} loading={isRefreshing}>
                <RefreshCw size={13} />
                Refresh
              </AdminButton>
              <AdminButton variant="primary" size="sm" onClick={() => setShowNewPipeline(true)}>
                <Plus size={13} />
                New Pipeline
              </AdminButton>
            </div>
          }
        />

        {/* Error Banner */}
        {fetchError && (
          <AdminAlertBanner
            severity="critical"
            message={fetchError}
            onDismiss={() => setFetchError(null)}
            action={
              <AdminButton variant="secondary" size="sm" onClick={handleRefresh}>
                Retry
              </AdminButton>
            }
          />
        )}

        {/* Pipeline Flow Visualization */}
        <AdminCard>
          <div style={{ padding: '6px 16px 2px' }}>
            <AdminSectionLabel>Pipeline Flow</AdminSectionLabel>
          </div>
          <div style={{ padding: '8px 16px 20px' }}>
            <div className="flex items-center justify-between overflow-x-auto py-2 gap-2">
              {(["researcher", "ideator", "scripter", "analyst"] as const).map((stage, idx) => {
                const StageIcon = STAGE_ICONS[stage];
                const activeAtStage = pipelines.filter(
                  (p) => ACTIVE_STATUSES.includes(p.status) && getStageStatus(p.stages, stage) === "in_progress"
                ).length;
                const completedAtStage = pipelines.filter(
                  (p) => getStageStatus(p.stages, stage) === "completed"
                ).length;

                return (
                  <div key={stage} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: activeAtStage > 0 ? 'rgba(59,126,161,0.1)' : '#FAF8F4',
                          border: activeAtStage > 0 ? '2px solid #3B7EA1' : '1px solid rgba(214,208,196,0.6)',
                          color: activeAtStage > 0 ? '#3B7EA1' : '#A8A29E',
                        }}
                      >
                        <StageIcon className="h-6 w-6" />
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-system)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#44403C',
                          marginTop: 8,
                        }}
                      >
                        {STAGE_LABELS[stage]}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {activeAtStage > 0 && (
                          <AdminStatusBadge status="running" label={`${activeAtStage} active`} />
                        )}
                        {completedAtStage > 0 && (
                          <span
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 9,
                              color: '#A8A29E',
                            }}
                          >
                            {completedAtStage} done
                          </span>
                        )}
                      </div>
                    </div>
                    {idx < 3 && (
                      <ArrowRight size={16} style={{ color: '#D6D0C4', flexShrink: 0, margin: '0 4px' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </AdminCard>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AdminKPICard value={runningCount} label="Active" color="#3B7EA1" />
          <AdminKPICard value={pausedCount} label="Paused" color="#C49A2A" />
          <AdminKPICard value={completedCount} label="Complete" color="#2D5A3D" />
          <AdminKPICard value={failedCount} label="Failed" color="#C8322B" />
        </div>

        {/* Quick Actions */}
        <div>
          <AdminSectionLabel>Quick Actions</AdminSectionLabel>
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" size="sm" onClick={() => handleQuickAction("quick-post")}>
              <Zap size={12} style={{ color: '#C49A2A' }} />
              Quick Post
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={() => handleQuickAction("quick-article")}>
              <FileText size={12} style={{ color: '#3B7EA1' }} />
              Quick Article
            </AdminButton>
            <AdminButton variant="secondary" size="sm" onClick={() => handleQuickAction("quick-video")}>
              <Video size={12} style={{ color: '#7C3AED' }} />
              Quick Video
            </AdminButton>
          </div>
        </div>

        {/* Pipeline History */}
        <section>
          <AdminSectionLabel>Pipeline History</AdminSectionLabel>

          {isLoading ? (
            <AdminLoadingState label="Loading pipelines..." />
          ) : pipelines.length === 0 && !fetchError ? (
            <AdminEmptyState
              icon={Sparkles}
              title="No pipelines yet"
              description="Start your first content pipeline to generate articles with AI."
              action={
                <AdminButton variant="primary" size="md" onClick={() => setShowNewPipeline(true)}>
                  <Plus size={13} />
                  Start Pipeline
                </AdminButton>
              }
            />
          ) : (
            <div className="space-y-3">
              {pipelines.map((pipeline) => {
                const isSelected = selectedPipeline?.id === pipeline.id;

                return (
                  <AdminCard
                    key={pipeline.id}
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2' : ''}`}
                    elevated={isSelected}
                  >
                    <div
                      style={{ padding: '14px 16px' }}
                      onClick={() => setSelectedPipeline(isSelected ? null : pipeline)}
                    >
                      {/* Pipeline summary row */}
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {ACTIVE_STATUSES.includes(pipeline.status) ? (
                            <Loader2 size={18} className="animate-spin" style={{ color: '#3B7EA1' }} />
                          ) : pipeline.status === "complete" ? (
                            <CheckCircle size={18} style={{ color: '#2D5A3D' }} />
                          ) : pipeline.status === "failed" ? (
                            <AlertCircle size={18} style={{ color: '#C8322B' }} />
                          ) : (
                            <Clock size={18} style={{ color: '#C49A2A' }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="truncate"
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                fontSize: 13,
                                color: '#1C1917',
                              }}
                            >
                              {pipeline.topic}
                            </span>
                            <AdminStatusBadge status={mapPipelineStatusToBadge(pipeline.status)} label={pipeline.status} />
                          </div>
                          <div
                            className="flex items-center gap-3 mt-1"
                            style={{
                              fontFamily: 'var(--font-system)',
                              fontSize: 10,
                              color: '#78716C',
                            }}
                          >
                            <span>{pipeline.siteName || pipeline.siteId}</span>
                            <span>{pipeline.language.toUpperCase()}</span>
                            <span>{formatDate(pipeline.createdAt)}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <ChevronDown size={16} style={{ color: '#A8A29E' }} />
                          ) : (
                            <ChevronRight size={16} style={{ color: '#A8A29E' }} />
                          )}
                        </div>
                      </div>

                      {/* Expanded stages */}
                      {isSelected && (
                        <div
                          className="mt-4 pt-4 space-y-2"
                          style={{ borderTop: '1px solid rgba(214,208,196,0.5)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(["researcher", "ideator", "scripter", "analyst"] as const).map((stageName) => {
                            const stageKey = `${pipeline.id}-${stageName}`;
                            const stage = pipeline.stages.find(
                              (s) => s.name.toLowerCase() === stageName.toLowerCase()
                            );
                            const stageStatus = stage?.status || "waiting";
                            const isExpanded = expandedStages[stageKey];

                            return (
                              <div
                                key={stageName}
                                className="rounded-lg"
                                style={{
                                  border: '1px solid rgba(214,208,196,0.5)',
                                  backgroundColor: stageStatus === 'completed' ? 'rgba(45,90,61,0.03)' : '#FFFFFF',
                                }}
                              >
                                <button
                                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg transition-colors"
                                  style={{ fontSize: 12 }}
                                  onClick={() => toggleStageExpansion(stageKey)}
                                >
                                  {getStageStatusIcon(stageStatus)}
                                  <span
                                    className="flex-1"
                                    style={{
                                      fontFamily: 'var(--font-system)',
                                      fontWeight: 600,
                                      fontSize: 11,
                                      color: '#44403C',
                                    }}
                                  >
                                    {STAGE_LABELS[stageName]}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-system)',
                                      fontSize: 10,
                                      color: '#A8A29E',
                                    }}
                                  >
                                    {stageStatus === "completed" && stage?.completedAt
                                      ? formatDate(stage.completedAt)
                                      : stageStatus}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronDown size={14} style={{ color: '#A8A29E' }} />
                                  ) : (
                                    <ChevronRight size={14} style={{ color: '#A8A29E' }} />
                                  )}
                                </button>
                                {isExpanded && stage?.data && (
                                  <div style={{ padding: '0 12px 12px' }}>
                                    <pre
                                      className="overflow-x-auto max-h-60 rounded-lg"
                                      style={{
                                        fontFamily: 'var(--font-system)',
                                        fontSize: 10,
                                        backgroundColor: '#FAF8F4',
                                        border: '1px solid rgba(214,208,196,0.4)',
                                        padding: 12,
                                        color: '#44403C',
                                      }}
                                    >
                                      {JSON.stringify(stage.data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {isExpanded && !stage?.data && (
                                  <div
                                    style={{
                                      padding: '0 12px 12px',
                                      fontFamily: 'var(--font-system)',
                                      fontSize: 10,
                                      color: '#A8A29E',
                                    }}
                                  >
                                    No data available for this stage.
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Pipeline result */}
                          {pipeline.result && (
                            <div
                              className="rounded-lg p-3"
                              style={{
                                backgroundColor: 'rgba(45,90,61,0.04)',
                                border: '1px solid rgba(45,90,61,0.15)',
                              }}
                            >
                              <p
                                style={{
                                  fontFamily: 'var(--font-system)',
                                  fontWeight: 600,
                                  fontSize: 11,
                                  color: '#2D5A3D',
                                  marginBottom: 8,
                                }}
                              >
                                Pipeline Result
                              </p>
                              <pre
                                className="overflow-x-auto max-h-40"
                                style={{
                                  fontFamily: 'var(--font-system)',
                                  fontSize: 10,
                                  color: '#44403C',
                                }}
                              >
                                {JSON.stringify(pipeline.result, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* New Pipeline Modal */}
      {showNewPipeline && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(28,25,23,0.4)' }}
          onClick={() => setShowNewPipeline(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(214,208,196,0.6)',
              boxShadow: '0 24px 48px rgba(28,25,23,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(214,208,196,0.5)',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 16,
                    color: '#1C1917',
                  }}
                >
                  New Content Pipeline
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 11,
                    color: '#78716C',
                    marginTop: 2,
                  }}
                >
                  Start an AI content generation pipeline. Optionally provide a topic, or let the AI choose.
                </p>
              </div>
              <button
                onClick={() => setShowNewPipeline(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px' }} className="space-y-4">
              <div>
                <label
                  htmlFor="pipeline-site"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#78716C',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Site
                </label>
                <select
                  id="pipeline-site"
                  className="admin-select"
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                >
                  {SITE_OPTIONS.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="pipeline-topic"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#78716C',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Topic (optional)
                </label>
                <input
                  id="pipeline-topic"
                  className="admin-input"
                  placeholder="e.g., Best halal restaurants in Mayfair"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                />
                <p
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    color: '#A8A29E',
                    marginTop: 4,
                  }}
                >
                  Leave blank to let the AI research and choose a topic.
                </p>
              </div>

              <div>
                <label
                  htmlFor="pipeline-language"
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#78716C',
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Language
                </label>
                <select
                  id="pipeline-language"
                  className="admin-select"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-system)',
                    fontSize: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(214,208,196,0.8)',
                    backgroundColor: '#FFFFFF',
                    color: '#1C1917',
                    outline: 'none',
                  }}
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex items-center justify-end gap-2"
              style={{
                padding: '12px 20px 16px',
                borderTop: '1px solid rgba(214,208,196,0.5)',
              }}
            >
              <AdminButton variant="secondary" size="md" onClick={() => setShowNewPipeline(false)}>
                Cancel
              </AdminButton>
              <AdminButton variant="primary" size="md" onClick={handleCreatePipeline} loading={isCreating} disabled={isCreating}>
                {!isCreating && <Sparkles size={12} />}
                {isCreating ? "Starting..." : "Start Pipeline"}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
