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
import Link from "next/link";

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

const MONO = "'IBM Plex Mono', monospace";
const DISPLAY = "'Anybody', sans-serif";
const BG = "var(--neu-bg, #EDE9E1)";
const FLAT = "var(--neu-flat, 5px 5px 10px #CAC5BC, -5px -5px 10px #FFFFFF)";
const INSET = "var(--neu-inset, inset 3px 3px 6px #CAC5BC, inset -3px -3px 6px #FFFFFF)";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: "rgba(16,185,129,0.08)", text: "#059669", dot: "#10B981" },
  failed: { bg: "rgba(200,50,43,0.08)", text: "#C8322B", dot: "#EF4444" },
  partial: { bg: "rgba(245,158,11,0.08)", text: "#D97706", dot: "#F59E0B" },
  info: { bg: "rgba(99,102,241,0.08)", text: "#6366F1", dot: "#6366F1" },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  positive: { bg: "rgba(16,185,129,0.08)", text: "#059669", border: "#10B981" },
  info: { bg: "rgba(99,102,241,0.08)", text: "#6366F1", border: "#6366F1" },
  warning: { bg: "rgba(245,158,11,0.08)", text: "#D97706", border: "#F59E0B" },
  critical: { bg: "rgba(200,50,43,0.08)", text: "#C8322B", border: "#EF4444" },
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
  pattern: { label: "PATTERN", color: "#F59E0B" },
  trend: { label: "TREND", color: "#6366F1" },
  adaptation: { label: "ADAPTED", color: "#10B981" },
  discovery: { label: "FOUND", color: "#8B5CF6" },
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
  const [activeTab, setActiveTab] = useState(0);
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
    { label: "Timeline", icon: "📋", count: data?.stats.totalEvents || 0 },
    { label: "Self-Healing", icon: "💊", count: data?.stats.healingActions || 0 },
    { label: "Learning", icon: "🧠", count: data?.stats.insightsCount || 0 },
    { label: "Insights", icon: "📊", count: data?.stats.observationsCount || 0 },
  ];

  const filteredTimeline =
    filterCategory === "all"
      ? data?.timeline || []
      : (data?.timeline || []).filter((e) => e.category === filterCategory);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: BG, color: "#1C1917" }}>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{ backgroundColor: "rgba(237,233,225,0.92)", borderBottom: "1px solid rgba(120,113,108,0.15)" }}
      >
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Link
                href="/admin/cockpit"
                className="px-2 py-1 rounded-lg text-xs"
                style={{ fontFamily: MONO, color: "#78716C" }}
              >
                ← HQ
              </Link>
              <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" }}>
                Activity Feed
              </h1>
            </div>
            <div className="flex items-center gap-1">
              {(["6h", "24h", "3d", "7d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-all"
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    fontWeight: period === p ? 700 : 500,
                    color: period === p ? "#1C1917" : "#78716C",
                    backgroundColor: period === p ? BG : "transparent",
                    boxShadow: period === p ? FLAT : "none",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all"
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: activeTab === i ? 700 : 500,
                  color: activeTab === i ? "#1C1917" : "#78716C",
                  backgroundColor: activeTab === i ? BG : "transparent",
                  boxShadow: activeTab === i ? FLAT : "none",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      backgroundColor: activeTab === i ? "rgba(99,102,241,0.12)" : "rgba(120,113,108,0.1)",
                      color: activeTab === i ? "#6366F1" : "#78716C",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <p style={{ fontFamily: MONO, fontSize: 11, color: "#78716C", textTransform: "uppercase", letterSpacing: "2px" }}>
              Loading activity…
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: "rgba(200,50,43,0.08)" }}>
            <p style={{ fontFamily: MONO, fontSize: 11, color: "#C8322B" }}>{error}</p>
            <button onClick={fetchData} className="mt-2 text-xs underline" style={{ color: "#C8322B" }}>
              Retry
            </button>
          </div>
        )}

        {data && (
          <>
            {/* ── Stats Banner ── */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Events", value: data.stats.totalEvents, color: "#6366F1" },
                { label: "Success", value: `${data.stats.totalEvents > 0 ? Math.round((data.stats.successEvents / data.stats.totalEvents) * 100) : 0}%`, color: "#10B981" },
                { label: "Healed", value: data.stats.healingActions, color: "#8B5CF6" },
                { label: "Insights", value: data.stats.insightsCount, color: "#F59E0B" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center px-2 py-2.5 rounded-xl"
                  style={{ backgroundColor: BG, boxShadow: FLAT }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Tab 0: Timeline ── */}
            {activeTab === 0 && (
              <div>
                {/* Category filter */}
                <div className="flex gap-1 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {["all", "cron", "auto-fix", "manual"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className="px-3 py-1.5 rounded-lg whitespace-nowrap"
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        fontWeight: filterCategory === cat ? 700 : 500,
                        color: filterCategory === cat ? "#1C1917" : "#78716C",
                        backgroundColor: filterCategory === cat ? BG : "transparent",
                        boxShadow: filterCategory === cat ? INSET : "none",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {cat === "all" ? "All" : cat === "auto-fix" ? "Auto-Fix" : cat === "cron" ? "Cron Jobs" : "Manual"}
                    </button>
                  ))}
                </div>

                {/* Timeline list */}
                <div className="space-y-2">
                  {filteredTimeline.length === 0 && (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: BG, boxShadow: INSET }}>
                      <p style={{ fontFamily: MONO, fontSize: 11, color: "#78716C" }}>No activity in this period</p>
                    </div>
                  )}

                  {filteredTimeline.map((event) => {
                    const sc = STATUS_COLORS[event.status] || STATUS_COLORS.info;
                    const expanded = expandedItems.has(event.id);

                    return (
                      <button
                        key={event.id}
                        onClick={() => toggleExpand(event.id)}
                        className="w-full text-left rounded-xl px-3 py-2.5 transition-all active:scale-[0.99]"
                        style={{ backgroundColor: BG, boxShadow: FLAT }}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Time + dot */}
                          <div className="flex flex-col items-center gap-1 pt-0.5" style={{ minWidth: 44 }}>
                            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: "#78716C" }}>
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
                                  fontFamily: MONO,
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
                                fontFamily: MONO,
                                fontSize: 10,
                                color: sc.text,
                                lineHeight: 1.5,
                                ...(expanded ? {} : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
                              }}
                            >
                              {event.detail}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ fontFamily: MONO, fontSize: 8, color: "#A8A29E" }}>{timeAgo(event.time)}</span>
                              {event.siteId && (
                                <span
                                  className="px-1.5 py-0.5 rounded"
                                  style={{ fontFamily: MONO, fontSize: 8, color: "#6366F1", backgroundColor: "rgba(99,102,241,0.08)" }}
                                >
                                  {event.siteId}
                                </span>
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

            {/* ── Tab 1: Self-Healing ── */}
            {activeTab === 1 && (
              <div>
                {/* Healing summary */}
                <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: BG, boxShadow: FLAT }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 18 }}>💊</span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 14 }}>Self-Healing System</span>
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: "#78716C", lineHeight: 1.6 }}>
                    The platform automatically detects and fixes issues every 2 hours. When content has problems
                    (thin articles, broken links, missing metadata), the diagnostic agent fixes them without human intervention.
                  </p>
                  {data.stats.healingActions > 0 && (
                    <div className="flex gap-3 mt-3">
                      <div className="flex flex-col items-center">
                        <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: "#8B5CF6" }}>
                          {data.stats.healingActions}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 8, color: "#78716C", textTransform: "uppercase" }}>Fixes</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 20,
                            fontWeight: 800,
                            color: data.stats.healingSuccessRate >= 80 ? "#10B981" : "#F59E0B",
                          }}
                        >
                          {data.stats.healingSuccessRate}%
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 8, color: "#78716C", textTransform: "uppercase" }}>Success</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Healing records */}
                <div className="space-y-2">
                  {data.healing.length === 0 && (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: BG, boxShadow: INSET }}>
                      <span style={{ fontSize: 24 }}>✅</span>
                      <p style={{ fontFamily: MONO, fontSize: 11, color: "#78716C", marginTop: 8 }}>
                        No healing needed in this period — everything is healthy
                      </p>
                    </div>
                  )}

                  {data.healing.map((record) => {
                    const expanded = expandedItems.has(`heal-${record.id}`);
                    const sc = record.success ? STATUS_COLORS.success : STATUS_COLORS.failed;

                    return (
                      <button
                        key={record.id}
                        onClick={() => toggleExpand(`heal-${record.id}`)}
                        className="w-full text-left rounded-xl px-3 py-3 transition-all active:scale-[0.99]"
                        style={{ backgroundColor: BG, boxShadow: FLAT }}
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
                              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#1C1917" }}>
                                {record.what}
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                                style={{ color: sc.text, backgroundColor: sc.bg }}
                              >
                                {record.success ? "HEALED" : "FAILED"}
                              </span>
                            </div>
                            <p style={{ fontFamily: MONO, fontSize: 10, color: "#78716C" }}>
                              by {record.agent} on {record.targetType}
                            </p>
                            <span style={{ fontFamily: MONO, fontSize: 8, color: "#A8A29E" }}>{timeAgo(record.time)}</span>

                            {expanded && (
                              <div className="mt-2 space-y-1.5">
                                {record.before && (
                                  <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "rgba(200,50,43,0.05)" }}>
                                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#C8322B", textTransform: "uppercase" }}>
                                      Before:
                                    </span>
                                    <p style={{ fontFamily: MONO, fontSize: 9, color: "#78716C", marginTop: 2 }}>{record.before}</p>
                                  </div>
                                )}
                                {record.after && (
                                  <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "rgba(16,185,129,0.05)" }}>
                                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
                                      After:
                                    </span>
                                    <p style={{ fontFamily: MONO, fontSize: 9, color: "#78716C", marginTop: 2 }}>{record.after}</p>
                                  </div>
                                )}
                                {record.error && (
                                  <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "rgba(200,50,43,0.05)" }}>
                                    <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#C8322B", textTransform: "uppercase" }}>
                                      Error:
                                    </span>
                                    <p style={{ fontFamily: MONO, fontSize: 9, color: "#C8322B", marginTop: 2 }}>{record.error}</p>
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

            {/* ── Tab 2: Self-Learning ── */}
            {activeTab === 2 && (
              <div>
                {/* Learning intro */}
                <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: BG, boxShadow: FLAT }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 18 }}>🧠</span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 14 }}>System Intelligence</span>
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: "#78716C", lineHeight: 1.6 }}>
                    The platform analyzes its own performance to detect patterns, identify bottlenecks,
                    and adapt to failures. These are the insights it discovered from the last 7 days of operation.
                  </p>
                </div>

                {/* Insights */}
                <div className="space-y-2">
                  {data.insights.length === 0 && (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: BG, boxShadow: INSET }}>
                      <span style={{ fontSize: 24 }}>🤔</span>
                      <p style={{ fontFamily: MONO, fontSize: 11, color: "#78716C", marginTop: 8 }}>
                        Not enough data yet — insights appear after a few days of operation
                      </p>
                    </div>
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
                              fontFamily: MONO,
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
                              className="w-full text-left rounded-xl px-3 py-2.5 mb-2 transition-all active:scale-[0.99]"
                              style={{
                                backgroundColor: BG,
                                boxShadow: FLAT,
                                borderLeft: `3px solid ${sc.border}`,
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[8px] font-bold flex-shrink-0 mt-0.5"
                                  style={{ color: typeInfo.color, backgroundColor: `${typeInfo.color}15` }}
                                >
                                  {typeInfo.label}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: "#1C1917", lineHeight: 1.4 }}>
                                    {insight.title}
                                  </p>
                                  {expanded && (
                                    <div className="mt-2">
                                      <p style={{ fontFamily: MONO, fontSize: 10, color: "#78716C", lineHeight: 1.5 }}>
                                        {insight.detail}
                                      </p>
                                      <div className="mt-2 rounded-lg px-2 py-1.5" style={{ backgroundColor: "rgba(99,102,241,0.05)" }}>
                                        <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: "#6366F1", textTransform: "uppercase" }}>
                                          Evidence:
                                        </span>
                                        <p style={{ fontFamily: MONO, fontSize: 9, color: "#6366F1", marginTop: 2 }}>
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

            {/* ── Tab 3: Technical Observations ── */}
            {activeTab === 3 && (
              <div>
                {/* Observations intro */}
                <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: BG, boxShadow: FLAT }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 18 }}>📊</span>
                    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 14 }}>Technical Observations</span>
                  </div>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: "#78716C", lineHeight: 1.6 }}>
                    Real-time system metrics and health indicators. These are facts, not opinions — drawn directly
                    from your database.
                  </p>
                </div>

                {/* Observation cards */}
                <div className="space-y-2">
                  {data.observations.length === 0 && (
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: BG, boxShadow: INSET }}>
                      <p style={{ fontFamily: MONO, fontSize: 11, color: "#78716C" }}>No observations available</p>
                    </div>
                  )}

                  {data.observations.map((obs) => {
                    const sc = SEVERITY_COLORS[obs.severity] || SEVERITY_COLORS.info;
                    const trend = TREND_ICONS[obs.trend] || "→";

                    return (
                      <div
                        key={obs.id}
                        className="rounded-xl px-4 py-3"
                        style={{ backgroundColor: BG, boxShadow: FLAT }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                                style={{ color: sc.text, backgroundColor: sc.bg }}
                              >
                                {obs.area}
                              </span>
                              <span
                                style={{
                                  fontFamily: MONO,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#1C1917",
                                }}
                              >
                                {obs.title}
                              </span>
                            </div>
                            <p style={{ fontFamily: MONO, fontSize: 10, color: "#78716C", lineHeight: 1.5 }}>
                              {obs.detail}
                            </p>
                          </div>

                          {obs.metric && (
                            <div className="flex flex-col items-center flex-shrink-0">
                              <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: sc.text }}>
                                {obs.metric}
                              </span>
                              <span style={{ fontSize: 14, color: sc.text }}>{trend}</span>
                            </div>
                          )}
                        </div>
                      </div>
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
