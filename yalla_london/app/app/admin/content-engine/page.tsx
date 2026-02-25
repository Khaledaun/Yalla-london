"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Activity,
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

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  researching: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  ideating: { bg: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  scripting: { bg: "bg-purple-50 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  analyzing: { bg: "bg-cyan-50 dark:bg-cyan-950", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  complete: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  paused: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  failed: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

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
    case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "in_progress": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "failed": return <AlertCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
  }
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

  // New pipeline form state
  const [newSiteId, setNewSiteId] = useState(getDefaultSiteId());
  const [newTopic, setNewTopic] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");

  const loadPipelines = useCallback(async () => {
    try {
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

  // Summary counts — active = any in-progress stage status
  const runningCount = pipelines.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const completedCount = pipelines.filter((p) => p.status === "complete").length;
  const failedCount = pipelines.filter((p) => p.status === "failed").length;
  const pausedCount = pipelines.filter((p) => p.status === "paused").length;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Brain className="h-7 w-7 text-violet-600" />
              Content Engine
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              AI-powered content generation pipeline
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowNewPipeline(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Pipeline
            </Button>
          </div>
        </div>

        {/* Pipeline Visualization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto py-4 gap-2">
              {(["researcher", "ideator", "scripter", "analyst"] as const).map((stage, idx) => {
                const StageIcon = STAGE_ICONS[stage];
                // Count active pipelines at each stage
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
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                          activeAtStage > 0
                            ? "bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400 ring-2 ring-violet-400 ring-offset-2 dark:ring-offset-gray-950"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        <StageIcon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                        {STAGE_LABELS[stage]}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {activeAtStage > 0 && (
                          <span className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
                            {activeAtStage} active
                          </span>
                        )}
                        {completedAtStage > 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {completedAtStage} done
                          </span>
                        )}
                      </div>
                    </div>
                    {idx < 3 && (
                      <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-600 shrink-0 mx-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Active" value={runningCount} color="text-blue-600 dark:text-blue-400" icon={Loader2} />
          <MiniStat label="Paused" value={pausedCount} color="text-amber-600 dark:text-amber-400" icon={Clock} />
          <MiniStat label="Complete" value={completedCount} color="text-green-600 dark:text-green-400" icon={CheckCircle} />
          <MiniStat label="Failed" value={failedCount} color="text-red-600 dark:text-red-400" icon={AlertCircle} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => handleQuickAction("quick-post")}>
            <Zap className="h-4 w-4 mr-2 text-amber-500" />
            Quick Post
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickAction("quick-article")}>
            <FileText className="h-4 w-4 mr-2 text-blue-500" />
            Quick Article
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickAction("quick-video")}>
            <Video className="h-4 w-4 mr-2 text-purple-500" />
            Quick Video
          </Button>
        </div>

        {/* Pipeline History */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline History</h2>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : pipelines.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pipelines yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Start your first content pipeline to generate articles with AI.
                </p>
                <Button onClick={() => setShowNewPipeline(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Pipeline
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pipelines.map((pipeline) => {
                const isSelected = selectedPipeline?.id === pipeline.id;
                const colors = STATUS_COLORS[pipeline.status] || STATUS_COLORS.paused;

                return (
                  <Card
                    key={pipeline.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-violet-400 dark:ring-violet-600" : ""}`}
                    onClick={() => setSelectedPipeline(isSelected ? null : pipeline)}
                  >
                    <CardContent className="p-4">
                      {/* Pipeline summary row */}
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {ACTIVE_STATUSES.includes(pipeline.status) ? (
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          ) : pipeline.status === "complete" ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : pipeline.status === "failed" ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {pipeline.topic}
                            </h3>
                            <Badge className={`text-xs ${colors.bg} ${colors.text} border-0`}>
                              {pipeline.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>{pipeline.siteName || pipeline.siteId}</span>
                            <span>{pipeline.language.toUpperCase()}</span>
                            <span>{formatDate(pipeline.createdAt)}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded stages */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                          {(["researcher", "ideator", "scripter", "analyst"] as const).map((stageName) => {
                            const stageKey = `${pipeline.id}-${stageName}`;
                            const stage = pipeline.stages.find(
                              (s) => s.name.toLowerCase() === stageName.toLowerCase()
                            );
                            const stageStatus = stage?.status || "waiting";
                            const isExpanded = expandedStages[stageKey];

                            return (
                              <div key={stageName} className="rounded-lg border border-gray-100 dark:border-gray-800">
                                <button
                                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStageExpansion(stageKey);
                                  }}
                                >
                                  {getStageStatusIcon(stageStatus)}
                                  <span className="font-medium text-sm text-gray-700 dark:text-gray-300 flex-1">
                                    {STAGE_LABELS[stageName]}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {stageStatus === "completed" && stage?.completedAt
                                      ? formatDate(stage.completedAt)
                                      : stageStatus}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                                {isExpanded && stage?.data && (
                                  <div className="px-3 pb-3">
                                    <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto max-h-60">
                                      {JSON.stringify(stage.data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {isExpanded && !stage?.data && (
                                  <div className="px-3 pb-3 text-xs text-gray-400 dark:text-gray-500">
                                    No data available for this stage.
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Pipeline result */}
                          {pipeline.result && (
                            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-3">
                              <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                                Pipeline Result
                              </h4>
                              <pre className="text-xs overflow-x-auto max-h-40">
                                {JSON.stringify(pipeline.result, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* New Pipeline Dialog */}
      <Dialog open={showNewPipeline} onOpenChange={setShowNewPipeline}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Content Pipeline</DialogTitle>
            <DialogDescription>
              Start an AI content generation pipeline. Optionally provide a topic, or let the AI choose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pipeline-site">Site</Label>
              <Select value={newSiteId} onValueChange={setNewSiteId}>
                <SelectTrigger id="pipeline-site">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {SITE_OPTIONS.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pipeline-topic">Topic (optional)</Label>
              <Input
                id="pipeline-topic"
                placeholder="e.g., Best halal restaurants in Mayfair"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leave blank to let the AI research and choose a topic.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pipeline-language">Language</Label>
              <Select value={newLanguage} onValueChange={setNewLanguage}>
                <SelectTrigger id="pipeline-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPipeline(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePipeline} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Pipeline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function MiniStat({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color} shrink-0`} />
        <div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
