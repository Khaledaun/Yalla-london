"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
  Activity,
  ArrowRight,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

interface CronJobStatus {
  id: string;
  name: string;
  lastRun: string | null;
  lastStatus: string;
  lastDurationMs: number | null;
  lastError: string | null;
  runsLast24h: number;
  failsLast24h: number;
  nextRun: string;
  health: string;
}

interface PipelineStatus {
  id: string;
  name: string;
  stageCounts: Record<string, number>;
  totalActive: number;
  bottleneckStage: string | null;
  throughputLast24h: number;
  health: string;
}

interface Alert {
  severity: string;
  title: string;
  detail: string;
  fixAction?: string;
  fixLabel?: string;
  cronJobId?: string;
  pipelineId?: string;
}

interface TimelineEvent {
  time: string;
  label: string;
  type: string;
  status?: string;
  cronJobId?: string;
}

interface CronJobDef {
  id: string;
  name: string;
  route: string;
  schedule: string;
  scheduleHuman: string;
  description: string;
  produces: string;
  consumes: string;
  group: string;
  critical: boolean;
  order: number;
}

interface PipelineDef {
  id: string;
  name: string;
  description: string;
  stages: Array<{ id: string; name: string; order: number; description: string; dbField?: string }>;
  triggerCron: string;
  outputTable: string;
}

interface AgentDef {
  id: string;
  name: string;
  description: string;
  skills: string[];
  cronJobs: string[];
  domain: string;
}

interface OpsData {
  generatedAt: string;
  overallHealth: string;
  overallScore: number;
  narrative: string;
  cronJobs: CronJobStatus[];
  pipelines: PipelineStatus[];
  alerts: Alert[];
  timeline: TimelineEvent[];
  seoInsight: string | null;
  indexingInsight: string | null;
  revenueInsight: string | null;
  registry: {
    cronJobs: CronJobDef[];
    pipelines: PipelineDef[];
    agents: AgentDef[];
    dataFlows: Array<{ from: string; to: string; dataType: string; description: string }>;
    dailySchedule: CronJobDef[];
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

const HEALTH_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  healthy: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <XCircle className="h-5 w-5 text-red-500" /> },
  idle: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", icon: <Clock className="h-5 w-5 text-gray-400" /> },
  unknown: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", icon: <Clock className="h-5 w-5 text-gray-400" /> },
};

function getHealthStyle(health: string) {
  return HEALTH_STYLES[health] || HEALTH_STYLES.unknown;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return "Never";
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ──────────────────────────────────────────────────────────

export default function OpsCenter() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fixingAction, setFixingAction] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<{ action: string; success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "crons" | "pipelines" | "timeline" | "agents">("overview");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["alerts", "insights"]));

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ops-center");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch {
      setError("Network error loading operations data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runFixAction = async (action: string, body?: Record<string, unknown>) => {
    setFixingAction(action);
    setFixResult(null);
    try {
      const res = await fetch("/api/admin/ops-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const json = await res.json();
      setFixResult({
        action,
        success: json.success,
        message: json.success
          ? `Done in ${json.durationMs || 0}ms. ${JSON.stringify(json.result || json.results || "").slice(0, 200)}`
          : json.error || "Action failed",
      });
      await fetchData();
    } catch {
      setFixResult({ action, success: false, message: "Network error" });
    } finally {
      setFixingAction(null);
    }
  };

  // ── Loading / Error ─────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="text-gray-500">Loading operations data...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  const hs = getHealthStyle(data.overallHealth);

  return (
    <div className="space-y-5">
      {/* ── Health Score Banner ── */}
      <div className={`flex items-center gap-4 px-4 py-4 rounded-xl ${hs.bg} border ${hs.border}`}>
        <div className="flex-shrink-0">
          <div className={`text-3xl font-bold ${hs.text}`}>{data.overallScore}</div>
          <div className={`text-xs uppercase font-medium ${hs.text}`}>Health</div>
        </div>
        <div className="flex-1 text-sm text-gray-700 leading-relaxed">{data.narrative}</div>
        <Button onClick={fetchData} variant="ghost" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── Fix Result Banner ── */}
      {fixResult && (
        <div className={`px-4 py-3 rounded-lg text-sm flex items-start gap-2 ${fixResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {fixResult.success ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          <span><strong>{fixResult.action}:</strong> {fixResult.message}</span>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(["overview", "crons", "pipelines", "timeline", "agents"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? "bg-gray-900 text-white" : ""}
          >
            {tab === "overview" ? "Overview" : tab === "crons" ? "Cron Jobs" : tab === "pipelines" ? "Pipelines" : tab === "timeline" ? "Timeline" : "Agents"}
          </Button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Alerts */}
          {data.alerts.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("alerts")}>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    {data.alerts.length} Alert{data.alerts.length > 1 ? "s" : ""}
                  </span>
                  {expandedSections.has("alerts") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {expandedSections.has("alerts") && (
                <CardContent className="pt-0 space-y-3">
                  {data.alerts.map((alert, i) => {
                    const sev = alert.severity === "critical" ? "bg-red-50 border-red-200" : alert.severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";
                    return (
                      <div key={i} className={`p-3 rounded-lg border ${sev}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{alert.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{alert.detail}</div>
                          </div>
                          {alert.fixLabel && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!!fixingAction}
                              onClick={() => {
                                if (alert.fixAction?.includes("content-generation-monitor")) {
                                  runFixAction("generate-content");
                                } else if (alert.fixAction?.includes("weekly-topics")) {
                                  runFixAction("generate-topics");
                                } else if (alert.fixAction?.includes("seo-agent")) {
                                  runFixAction("run-seo-agent");
                                } else {
                                  runFixAction("generate-content");
                                }
                              }}
                              className="flex-shrink-0"
                            >
                              {fixingAction ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                              <span className="ml-1 text-xs">{alert.fixLabel}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          )}

          {/* Insights */}
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("insights")}>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  Insights
                </span>
                {expandedSections.has("insights") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.has("insights") && (
              <CardContent className="pt-0 space-y-3">
                {[
                  { label: "SEO", text: data.seoInsight },
                  { label: "Indexing", text: data.indexingInsight },
                  { label: "Revenue", text: data.revenueInsight },
                ].map(
                  (item) =>
                    item.text && (
                      <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">{item.label}</div>
                        <div className="text-sm text-gray-700">{item.text}</div>
                      </div>
                    ),
                )}
              </CardContent>
            )}
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { action: "generate-content", label: "Generate Content", icon: <Play className="h-4 w-4" /> },
                  { action: "publish-ready", label: "Publish Ready", icon: <ArrowRight className="h-4 w-4" /> },
                  { action: "run-sweeper", label: "Sweep Failures", icon: <RefreshCw className="h-4 w-4" /> },
                  { action: "generate-topics", label: "Generate Topics", icon: <Zap className="h-4 w-4" /> },
                  { action: "fix-database", label: "Fix Database", icon: <Activity className="h-4 w-4" /> },
                ].map((btn) => (
                  <Button
                    key={btn.action}
                    variant="outline"
                    size="sm"
                    disabled={!!fixingAction}
                    onClick={() => runFixAction(btn.action)}
                    className="flex items-center gap-1 text-xs"
                  >
                    {fixingAction === btn.action ? <Loader2 className="h-3 w-3 animate-spin" /> : btn.icon}
                    {btn.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.pipelines.map((pipeline) => {
              const phs = getHealthStyle(pipeline.health);
              return (
                <Card key={pipeline.id} className={`${phs.border}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{pipeline.name}</span>
                      <Badge variant="outline" className={`${phs.text} ${phs.bg} ${phs.border} text-xs`}>{pipeline.health}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold">{pipeline.totalActive}</div>
                        <div className="text-xs text-gray-500">Active</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{pipeline.throughputLast24h}</div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-600 truncate">{pipeline.bottleneckStage || "None"}</div>
                        <div className="text-xs text-gray-500">Bottleneck</div>
                      </div>
                    </div>
                    {Object.keys(pipeline.stageCounts).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {Object.entries(pipeline.stageCounts).map(([stage, count]) => (
                          <Badge key={stage} variant="outline" className="text-xs">
                            {stage}: {count}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CRON JOBS TAB ── */}
      {activeTab === "crons" && (
        <div className="space-y-3">
          {(["content", "seo", "publishing", "analytics", "monitoring"] as const).map((group) => {
            const groupCrons = data.cronJobs.filter((cs) => {
              const def = data.registry.cronJobs.find((c) => c.id === cs.id);
              return def?.group === group;
            });
            if (groupCrons.length === 0) return null;

            return (
              <Card key={group}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm uppercase text-gray-500">{group}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {groupCrons.map((cs) => {
                    const def = data.registry.cronJobs.find((c) => c.id === cs.id);
                    const chs = getHealthStyle(cs.health);
                    return (
                      <div key={cs.id} className={`p-3 rounded-lg border ${chs.border} ${chs.bg}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {chs.icon}
                              <span className="font-medium text-sm">{cs.name}</span>
                              {def?.critical && <Badge variant="outline" className="text-xs border-red-300 text-red-600">Critical</Badge>}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{def?.description}</div>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                              <span>Schedule: {def?.scheduleHuman}</span>
                              <span>Last: {timeAgo(cs.lastRun)}</span>
                              <span>Runs: {cs.runsLast24h} (24h)</span>
                              {cs.failsLast24h > 0 && <span className="text-red-600">Fails: {cs.failsLast24h}</span>}
                            </div>
                            {cs.lastError && <div className="text-xs text-red-600 mt-1 truncate">Error: {cs.lastError}</div>}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!!fixingAction}
                            onClick={() => runFixAction("run-cron", { cronId: cs.id })}
                            className="flex-shrink-0"
                          >
                            {fixingAction === "run-cron" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── PIPELINES TAB ── */}
      {activeTab === "pipelines" && (
        <div className="space-y-4">
          {data.registry.pipelines.map((pipeline) => {
            const live = data.pipelines.find((p) => p.id === pipeline.id);
            return (
              <Card key={pipeline.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{pipeline.name}</CardTitle>
                  <p className="text-xs text-gray-500">{pipeline.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Stage flow */}
                  <div className="flex flex-wrap items-center gap-1 mb-3">
                    {pipeline.stages.map((stage, i) => {
                      const count = live?.stageCounts[stage.dbField || stage.id] || 0;
                      const isBottleneck = live?.bottleneckStage === (stage.dbField || stage.id);
                      return (
                        <React.Fragment key={stage.id}>
                          {i > 0 && <ArrowRight className="h-3 w-3 text-gray-300 flex-shrink-0" />}
                          <div
                            className={`px-2 py-1 rounded text-xs border ${isBottleneck ? "bg-amber-100 border-amber-300 font-medium" : count > 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}
                            title={stage.description}
                          >
                            {stage.name}
                            {count > 0 && <span className="ml-1 font-bold">({count})</span>}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Data flows */}
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Triggered by:</span>{" "}
                    {data.registry.cronJobs.find((c) => c.id === pipeline.triggerCron)?.name || pipeline.triggerCron}
                    {" → "}
                    <span className="font-medium">Output:</span> {pipeline.outputTable}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Data Flow Map */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Data Flow Map</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {data.registry.dataFlows.map((flow, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-gray-50">
                  <Badge variant="outline" className="text-xs">{data.registry.cronJobs.find((c) => c.id === flow.from)?.name || flow.from}</Badge>
                  <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500">{flow.dataType}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <Badge variant="outline" className="text-xs">{data.registry.cronJobs.find((c) => c.id === flow.to)?.name || flow.to}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TIMELINE TAB ── */}
      {activeTab === "timeline" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Timeline</CardTitle>
            <p className="text-xs text-gray-500">Past 24 hours and upcoming scheduled jobs</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {data.timeline.map((event, i) => {
                const isPast = event.type === "past";
                const isFailed = event.status === "failed";
                const isNowDivider = i > 0 && data.timeline[i - 1].type === "past" && event.type === "upcoming";

                return (
                  <React.Fragment key={i}>
                    {isNowDivider && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 border-t border-blue-300" />
                        <span className="text-xs font-medium text-blue-600 px-2">NOW</span>
                        <div className="flex-1 border-t border-blue-300" />
                      </div>
                    )}
                    <div className={`flex items-center gap-3 py-2 px-2 rounded ${isFailed ? "bg-red-50" : ""}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFailed ? "bg-red-500" : isPast ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="text-xs text-gray-500 w-16 flex-shrink-0">{formatTime(event.time)}</div>
                      <div className={`text-sm flex-1 ${isFailed ? "text-red-700 font-medium" : isPast ? "text-gray-700" : "text-gray-400"}`}>
                        {event.label}
                      </div>
                      {event.status && (
                        <Badge variant="outline" className={`text-xs ${isFailed ? "border-red-300 text-red-600" : event.status === "completed" ? "border-green-300 text-green-600" : "border-gray-300 text-gray-500"}`}>
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              {data.timeline.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No activity recorded in the last 24 hours.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AGENTS TAB ── */}
      {activeTab === "agents" && (
        <div className="space-y-3">
          {data.registry.agents.map((agent) => {
            const agentCrons = agent.cronJobs
              .map((cid) => data.cronJobs.find((cs) => cs.id === cid))
              .filter(Boolean) as CronJobStatus[];
            const healthy = agentCrons.filter((c) => c.health === "healthy").length;
            const total = agentCrons.length;
            const agentHealth = healthy === total ? "healthy" : healthy > total / 2 ? "warning" : "critical";
            const ahs = getHealthStyle(agentHealth);

            return (
              <Card key={agent.id} className={ahs.border}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {ahs.icon}
                    <span className="font-medium text-sm">{agent.name}</span>
                    <Badge variant="outline" className="text-xs">{agent.domain}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{agent.description}</p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {agentCrons.map((cs) => {
                      const cchs = getHealthStyle(cs.health);
                      return (
                        <Badge key={cs.id} variant="outline" className={`text-xs ${cchs.text} ${cchs.bg} ${cchs.border}`}>
                          {cs.name}: {cs.health}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Skills:</span> {agent.skills.slice(0, 5).join(", ")}
                    {agent.skills.length > 5 && ` +${agent.skills.length - 5} more`}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
