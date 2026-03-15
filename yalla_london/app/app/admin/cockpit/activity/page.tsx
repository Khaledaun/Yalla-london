"use client";

/**
 * CEO Activity Feed — /admin/cockpit/activity
 *
 * Single-page view of everything the platform did autonomously:
 *   Tab 1: Live Timeline — chronological feed of all actions
 *   Tab 2: Self-Healing — diagnostic fixes, auto-remediation with before/after
 *   Tab 3: Self-Learning — pattern detection, quality trends, provider reliability
 *   Tab 4: Observations — technical insights, metrics, system health
 *
 * Mobile-first, designed for iPhone viewing.
 * Auto-refreshes every 60s.
 */

import { useState, useEffect, useCallback } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminKPICard,
  AdminTabs,
  AdminLoadingState,
  AdminAlertBanner,
  AdminStatusBadge,
  AdminButton,
} from "@/components/admin/admin-ui";

// ─── Types ────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  time: string;
  icon: string;
  title: string;
  detail: string;
  status: "success" | "failed" | "partial" | "info";
  category: string;
  siteId: string | null;
}

interface HealingRecord {
  id: string;
  time: string;
  agent: string;
  what: string;
  target: string;
  targetType: string;
  fixType: string;
  success: boolean;
  before: string | null;
  after: string | null;
  error: string | null;
}

interface LearningInsight {
  id: string;
  type: "pattern" | "trend" | "adaptation" | "discovery";
  title: string;
  detail: string;
  evidence: string;
  severity: "info" | "positive" | "warning" | "critical";
  learnedAt: string;
}

interface TechObservation {
  id: string;
  area: string;
  title: string;
  detail: string;
  metric: string | null;
  trend: "up" | "down" | "stable" | "new";
  severity: "info" | "positive" | "warning" | "critical";
}

interface FeedData {
  stats: {
    totalEvents: number;
    successEvents: number;
    failedEvents: number;
    healingActions: number;
    healingSuccessRate: number;
    insightsCount: number;
    observationsCount: number;
    criticalInsights: number;
  };
  timeline: TimelineEvent[];
  healing: HealingRecord[];
  insights: LearningInsight[];
  observations: TechObservation[];
  period: string;
  timestamp: string;
}

// ─── Style Constants ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: "rgba(45,90,61,0.08)", text: "#2D5A3D", dot: "#2D5A3D" },
  failed: { bg: "rgba(200,50,43,0.08)", text: "#C8322B", dot: "#C8322B" },
  partial: { bg: "rgba(196,154,42,0.08)", text: "#7a5a10", dot: "#C49A2A" },
  running: { bg: "rgba(59,126,161,0.08)", text: "#1e5a7a", dot: "#3B7EA1" },
  info: { bg: "rgba(59,126,161,0.08)", text: "#3B7EA1", dot: "#3B7EA1" },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  positive: { bg: "rgba(45,90,61,0.08)", text: "#2D5A3D", border: "#2D5A3D" },
  info: { bg: "rgba(59,126,161,0.08)", text: "#3B7EA1", border: "#3B7EA1" },
  warning: { bg: "rgba(196,154,42,0.08)", text: "#7a5a10", border: "#C49A2A" },
  critical: { bg: "rgba(200,50,43,0.08)", text: "#C8322B", border: "#C8322B" },
};

const ICON_MAP: Record<string, string> = {
  cron: "⚙️",
  fix: "🔧",
  ai: "🤖",
  publish: "📄",
  index: "🔍",
  alert: "⚠️",
  manual: "👆",
  heal: "💊",
  learn: "🧠",
};

const TREND_ICONS: Record<string, string> = {
  up: "↗",
  down: "↘",
  stable: "→",
  new: "✦",
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  pattern: { label: "PATTERN", color: "#C49A2A" },
  trend: { label: "TREND", color: "#3B7EA1" },
  adaptation: { label: "ADAPTED", color: "#2D5A3D" },
  discovery: { label: "FOUND", color: "#7C3AED" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(isoTime: string): string {
  const diff = Date.now() - new Date(isoTime).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(isoTime: string): string {
  const d = new Date(isoTime);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────

export default function CEOActivityFeed() {
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("timeline");
  const [period, setPeriod] = useState("24h");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ceo-feed?period=${period}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs = [
    { id: "timeline", label: "Timeline", count: data?.stats.totalEvents || 0 },
    { id: "healing", label: "Self-Healing", count: data?.stats.healingActions || 0 },
    { id: "learning", label: "Learning", count: data?.stats.insightsCount || 0 },
    { id: "insights", label: "Insights", count: data?.stats.observationsCount || 0 },
  ];

  const filteredTimeline =
    filterCategory === "all"
      ? data?.timeline || []
      : (data?.timeline || []).filter((e) => e.category === filterCategory);

  return (
    <div className="admin-page p-4 md:p-6">
      {/* ── Header ── */}
      <AdminPageHeader
        title="Activity Feed"
        subtitle="Platform autonomous actions"
        backHref="/admin/cockpit"
        action={
          <div className="flex items-center gap-1">
            {(["1h", "6h", "12h", "24h", "3d", "7d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`admin-filter-pill ${period === p ? "active" : ""}`}
                style={{ fontSize: 10, padding: "4px 8px" }}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {/* ── Tabs ── */}
      <div className="mb-4">
        <AdminTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ── Content ── */}
      <div className="max-w-screen-xl mx-auto">
        {loading && !data && <AdminLoadingState label="Loading activity..." />}

        {error && (
          <AdminAlertBanner
            severity="critical"
            message={error}
            action={
              <AdminButton variant="ghost" size="sm" onClick={fetchData}>
                Retry
              </AdminButton>
            }
          />
        )}

        {data && (
          <>
            {/* ── Stats Banner ── */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <AdminKPICard
                value={data.stats.totalEvents}
                label="Events"
                color="#3B7EA1"
              />
              <AdminKPICard
                value={`${data.stats.totalEvents > 0 ? Math.round((data.stats.successEvents / data.stats.totalEvents) * 100) : 0}%`}
                label="Success"
                color="#2D5A3D"
              />
              <AdminKPICard
                value={data.stats.healingActions}
                label="Healed"
                color="#7C3AED"
              />
              <AdminKPICard
                value={data.stats.insightsCount}
                label="Insights"
                color="#C49A2A"
              />
            </div>

            {/* ── Tab: Timeline ── */}
            {activeTab === "timeline" && (
              <div>
                {/* Category filter */}
                <div className="flex gap-1 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {["all", "cron", "ai", "auto-fix", "manual"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`admin-filter-pill ${filterCategory === cat ? "active" : ""}`}
                      style={{ fontSize: 9 }}
                    >
                      {cat === "all" ? "All" : cat === "ai" ? "AI Calls" : cat === "auto-fix" ? "Auto-Fix" : cat === "cron" ? "Cron Jobs" : "Manual"}
                    </button>
                  ))}
                </div>

                {/* Timeline list */}
                <div className="space-y-2">
                  {filteredTimeline.length === 0 && (
                    <AdminCard>
                      <div className="admin-card-inset text-center py-12">
                        <p
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 11,
                            color: "#78716C",
                          }}
                        >
                          No activity in this period
                        </p>
                      </div>
                    </AdminCard>
                  )}

                  {filteredTimeline.map((event) => {
                    const sc = STATUS_COLORS[event.status] || STATUS_COLORS.info;
                    const expanded = expandedItems.has(event.id);

                    return (
                      <button
                        key={event.id}
                        onClick={() => toggleExpand(event.id)}
                        className="w-full text-left admin-card transition-all active:scale-[0.99]"
                        style={{ padding: "10px 12px" }}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Time + dot */}
                          <div className="flex flex-col items-center gap-1 pt-0.5" style={{ minWidth: 44 }}>
                            <span
                              style={{
                                fontFamily: "var(--font-system)",
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#78716C",
                              }}
                            >
                              {formatTime(event.time)}
                            </span>
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: sc.dot }}
                            />
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span style={{ fontSize: 13 }}>{ICON_MAP[event.icon] || "⚙️"}</span>
                              <span
                                style={{
                                  fontFamily: "var(--font-system)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#1C1917",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {event.title}
                              </span>
                            </div>
                            <p
                              style={{
                                fontFamily: "var(--font-system)",
                                fontSize: 10,
                                color: sc.text,
                                lineHeight: 1.5,
                                ...(expanded ? {} : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
                              }}
                            >
                              {event.detail}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ fontFamily: "var(--font-system)", fontSize: 8, color: "#A8A29E" }}>
                                {timeAgo(event.time)}
                              </span>
                              {event.siteId && (
                                <AdminStatusBadge status="active" label={event.siteId} />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tab: Self-Healing ── */}
            {activeTab === "healing" && (
              <div>
                {/* Healing summary */}
                <AdminCard className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 18 }}>💊</span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: 14,
                        color: "#1C1917",
                      }}
                    >
                      Self-Healing System
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      color: "#78716C",
                      lineHeight: 1.6,
                    }}
                  >
                    The platform automatically detects and fixes issues every 2 hours. When content has problems
                    (thin articles, broken links, missing metadata), the diagnostic agent fixes them without human intervention.
                  </p>
                  {data.stats.healingActions > 0 && (
                    <div className="flex gap-3 mt-3">
                      <div className="flex flex-col items-center">
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 20,
                            fontWeight: 800,
                            color: "#7C3AED",
                          }}
                        >
                          {data.stats.healingActions}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 8,
                            color: "#78716C",
                            textTransform: "uppercase",
                          }}
                        >
                          Fixes
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 20,
                            fontWeight: 800,
                            color: data.stats.healingSuccessRate >= 80 ? "#2D5A3D" : "#C49A2A",
                          }}
                        >
                          {data.stats.healingSuccessRate}%
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 8,
                            color: "#78716C",
                            textTransform: "uppercase",
                          }}
                        >
                          Success
                        </span>
                      </div>
                    </div>
                  )}
                </AdminCard>

                {/* Healing records */}
                <div className="space-y-2">
                  {data.healing.length === 0 && (
                    <AdminCard>
                      <div className="admin-card-inset text-center py-12">
                        <span style={{ fontSize: 24 }}>✅</span>
                        <p
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 11,
                            color: "#78716C",
                            marginTop: 8,
                          }}
                        >
                          No healing needed in this period — everything is healthy
                        </p>
                      </div>
                    </AdminCard>
                  )}

                  {data.healing.map((record) => {
                    const expanded = expandedItems.has(`heal-${record.id}`);
                    const sc = record.success ? STATUS_COLORS.success : STATUS_COLORS.failed;

                    return (
                      <button
                        key={record.id}
                        onClick={() => toggleExpand(`heal-${record.id}`)}
                        className="w-full text-left admin-card transition-all active:scale-[0.99]"
                        style={{ padding: "12px" }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: sc.bg }}
                          >
                            <span style={{ fontSize: 14 }}>{record.success ? "💊" : "❌"}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                style={{
                                  fontFamily: "var(--font-system)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#1C1917",
                                }}
                              >
                                {record.what}
                              </span>
                              <AdminStatusBadge
                                status={record.success ? "success" : "failed"}
                                label={record.success ? "HEALED" : "FAILED"}
                              />
                            </div>
                            <p style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#78716C" }}>
                              by {record.agent} on {record.targetType}
                            </p>
                            <span style={{ fontFamily: "var(--font-system)", fontSize: 8, color: "#A8A29E" }}>
                              {timeAgo(record.time)}
                            </span>

                            {expanded && (
                              <div className="mt-2 space-y-1.5">
                                {record.before && (
                                  <div
                                    className="rounded-lg px-2 py-1.5"
                                    style={{ backgroundColor: "rgba(200,50,43,0.05)" }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: "var(--font-system)",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        color: "#C8322B",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      Before:
                                    </span>
                                    <p style={{ fontFamily: "var(--font-system)", fontSize: 9, color: "#78716C", marginTop: 2 }}>
                                      {record.before}
                                    </p>
                                  </div>
                                )}
                                {record.after && (
                                  <div
                                    className="rounded-lg px-2 py-1.5"
                                    style={{ backgroundColor: "rgba(45,90,61,0.05)" }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: "var(--font-system)",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        color: "#2D5A3D",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      After:
                                    </span>
                                    <p style={{ fontFamily: "var(--font-system)", fontSize: 9, color: "#78716C", marginTop: 2 }}>
                                      {record.after}
                                    </p>
                                  </div>
                                )}
                                {record.error && (
                                  <div
                                    className="rounded-lg px-2 py-1.5"
                                    style={{ backgroundColor: "rgba(200,50,43,0.05)" }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: "var(--font-system)",
                                        fontSize: 8,
                                        fontWeight: 700,
                                        color: "#C8322B",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      Error:
                                    </span>
                                    <p style={{ fontFamily: "var(--font-system)", fontSize: 9, color: "#C8322B", marginTop: 2 }}>
                                      {record.error}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tab: Self-Learning ── */}
            {activeTab === "learning" && (
              <div>
                {/* Learning intro */}
                <AdminCard className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 18 }}>🧠</span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: 14,
                        color: "#1C1917",
                      }}
                    >
                      System Intelligence
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      color: "#78716C",
                      lineHeight: 1.6,
                    }}
                  >
                    The platform analyzes its own performance to detect patterns, identify bottlenecks,
                    and adapt to failures. These are the insights it discovered from the last 7 days of operation.
                  </p>
                </AdminCard>

                {/* Insights */}
                <div className="space-y-2">
                  {data.insights.length === 0 && (
                    <AdminCard>
                      <div className="admin-card-inset text-center py-12">
                        <span style={{ fontSize: 24 }}>🤔</span>
                        <p
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 11,
                            color: "#78716C",
                            marginTop: 8,
                          }}
                        >
                          Not enough data yet — insights appear after a few days of operation
                        </p>
                      </div>
                    </AdminCard>
                  )}

                  {/* Group by severity for scanability */}
                  {(["critical", "warning", "positive", "info"] as const).map((severity) => {
                    const items = data.insights.filter((i) => i.severity === severity);
                    if (items.length === 0) return null;
                    const sc = SEVERITY_COLORS[severity];

                    return (
                      <div key={severity}>
                        <div className="flex items-center gap-2 mb-1.5 mt-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.border }} />
                          <span
                            style={{
                              fontFamily: "var(--font-system)",
                              fontSize: 9,
                              fontWeight: 700,
                              color: sc.text,
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                            }}
                          >
                            {severity === "positive" ? "Good News" : severity === "critical" ? "Needs Attention" : severity === "warning" ? "Watch" : "Observations"}
                            {" "}({items.length})
                          </span>
                        </div>

                        {items.map((insight) => {
                          const typeInfo = TYPE_LABELS[insight.type] || TYPE_LABELS.discovery;
                          const expanded = expandedItems.has(`insight-${insight.id}`);

                          return (
                            <button
                              key={insight.id}
                              onClick={() => toggleExpand(`insight-${insight.id}`)}
                              className="w-full text-left admin-card mb-2 transition-all active:scale-[0.99]"
                              style={{
                                padding: "10px 12px",
                                borderLeft: `3px solid ${sc.border}`,
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 mt-0.5"
                                  style={{
                                    fontFamily: "var(--font-system)",
                                    color: typeInfo.color,
                                    backgroundColor: `${typeInfo.color}15`,
                                  }}
                                >
                                  {typeInfo.label}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p
                                    style={{
                                      fontFamily: "var(--font-system)",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#1C1917",
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {insight.title}
                                  </p>
                                  {expanded && (
                                    <div className="mt-2">
                                      <p
                                        style={{
                                          fontFamily: "var(--font-system)",
                                          fontSize: 10,
                                          color: "#78716C",
                                          lineHeight: 1.5,
                                        }}
                                      >
                                        {insight.detail}
                                      </p>
                                      <div
                                        className="mt-2 rounded-lg px-2 py-1.5"
                                        style={{ backgroundColor: "rgba(59,126,161,0.05)" }}
                                      >
                                        <span
                                          style={{
                                            fontFamily: "var(--font-system)",
                                            fontSize: 8,
                                            fontWeight: 700,
                                            color: "#3B7EA1",
                                            textTransform: "uppercase",
                                          }}
                                        >
                                          Evidence:
                                        </span>
                                        <p
                                          style={{
                                            fontFamily: "var(--font-system)",
                                            fontSize: 9,
                                            color: "#3B7EA1",
                                            marginTop: 2,
                                          }}
                                        >
                                          {insight.evidence}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tab: Technical Observations ── */}
            {activeTab === "insights" && (
              <div>
                {/* Observations intro */}
                <AdminCard className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 18 }}>📊</span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: 14,
                        color: "#1C1917",
                      }}
                    >
                      Technical Observations
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-system)",
                      fontSize: 10,
                      color: "#78716C",
                      lineHeight: 1.6,
                    }}
                  >
                    Real-time system metrics and health indicators. These are facts, not opinions — drawn directly
                    from your database.
                  </p>
                </AdminCard>

                {/* Observation cards */}
                <div className="space-y-2">
                  {data.observations.length === 0 && (
                    <AdminCard>
                      <div className="admin-card-inset text-center py-12">
                        <p
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 11,
                            color: "#78716C",
                          }}
                        >
                          No observations available
                        </p>
                      </div>
                    </AdminCard>
                  )}

                  {data.observations.map((obs) => {
                    const sc = SEVERITY_COLORS[obs.severity] || SEVERITY_COLORS.info;
                    const trend = TREND_ICONS[obs.trend] || "→";

                    return (
                      <AdminCard key={obs.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                                style={{
                                  fontFamily: "var(--font-system)",
                                  color: sc.text,
                                  backgroundColor: sc.bg,
                                }}
                              >
                                {obs.area}
                              </span>
                              <span
                                style={{
                                  fontFamily: "var(--font-system)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#1C1917",
                                }}
                              >
                                {obs.title}
                              </span>
                            </div>
                            <p
                              style={{
                                fontFamily: "var(--font-system)",
                                fontSize: 10,
                                color: "#78716C",
                                lineHeight: 1.5,
                              }}
                            >
                              {obs.detail}
                            </p>
                          </div>

                          {obs.metric && (
                            <div className="flex flex-col items-center flex-shrink-0">
                              <span
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontSize: 18,
                                  fontWeight: 800,
                                  color: sc.text,
                                }}
                              >
                                {obs.metric}
                              </span>
                              <span style={{ fontSize: 14, color: sc.text }}>{trend}</span>
                            </div>
                          )}
                        </div>
                      </AdminCard>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
