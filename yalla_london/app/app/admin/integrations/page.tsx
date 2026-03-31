"use client";

import { useState, useEffect, useCallback } from "react";

interface Integration {
  name: string;
  category: string;
  status: "ok" | "warning" | "error" | "not_configured";
  message: string;
  details?: Record<string, unknown>;
}

interface HealthData {
  siteId: string;
  checkedAt: string;
  overallStatus: "healthy" | "degraded" | "critical";
  summary: { ok: number; warnings: number; errors: number; notConfigured: number; total: number };
  integrations: Integration[];
}

const STATUS_CONFIG = {
  ok: { emoji: "✅", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", label: "Working" },
  warning: { emoji: "⚠️", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", label: "Warning" },
  error: { emoji: "🔴", bg: "bg-red-50", border: "border-red-200", text: "text-red-800", label: "Error" },
  not_configured: { emoji: "⚪", bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", label: "Not Set" },
};

const CATEGORY_ORDER = ["affiliate", "analytics", "monetization", "seo", "content"];
const CATEGORY_LABELS: Record<string, string> = {
  affiliate: "Affiliate & Revenue",
  analytics: "Analytics & Tracking",
  monetization: "Auto-Monetization",
  seo: "SEO & Indexing",
  content: "Content APIs",
};

export default function IntegrationHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integration-health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const toggle = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const grouped = data ? CATEGORY_ORDER.reduce((acc, cat) => {
    const items = data.integrations.filter(i => i.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Integration[]>) : {};

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Health</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data ? `Checked ${new Date(data.checkedAt).toLocaleTimeString()}` : "Loading..."}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Overall Status Banner */}
      {data && (
        <div className={`mb-6 p-4 rounded-xl border ${
          data.overallStatus === "healthy" ? "bg-emerald-50 border-emerald-200" :
          data.overallStatus === "degraded" ? "bg-amber-50 border-amber-200" :
          "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {data.overallStatus === "healthy" ? "✅" : data.overallStatus === "degraded" ? "⚠️" : "🔴"}
            </span>
            <div>
              <div className="font-bold text-lg capitalize">{data.overallStatus}</div>
              <div className="text-sm opacity-80">
                {data.summary.ok} working · {data.summary.warnings} warnings · {data.summary.errors} errors · {data.summary.notConfigured} not configured
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      {data && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { label: "OK", count: data.summary.ok, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Warn", count: data.summary.warnings, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Error", count: data.summary.errors, color: "text-red-600", bg: "bg-red-50" },
            { label: "Off", count: data.summary.notConfigured, color: "text-gray-500", bg: "bg-gray-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Integration Cards by Category */}
      {Object.entries(grouped).map(([category, integrations]) => (
        <div key={category} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {CATEGORY_LABELS[category] || category}
          </h2>
          <div className="space-y-2">
            {integrations.map((item) => {
              const config = STATUS_CONFIG[item.status];
              const isExpanded = expanded.has(item.name);
              return (
                <div
                  key={item.name}
                  className={`${config.bg} border ${config.border} rounded-lg overflow-hidden`}
                >
                  <button
                    onClick={() => toggle(item.name)}
                    className="w-full p-3 flex items-start gap-3 text-left"
                  >
                    <span className="text-lg mt-0.5 flex-shrink-0">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.text} border ${config.border}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 leading-snug">{item.message}</p>
                    </div>
                    <span className="text-gray-400 flex-shrink-0 mt-1">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {isExpanded && item.details && (
                    <div className="px-3 pb-3 pt-0 ml-9">
                      <pre className="text-xs bg-white/60 rounded p-2 overflow-x-auto whitespace-pre-wrap text-gray-700">
                        {JSON.stringify(item.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Action Items */}
      {data && (
        <div className="mt-8 p-4 bg-white border border-gray-200 rounded-xl">
          <h2 className="font-bold text-gray-900 mb-3">Action Items</h2>
          <div className="space-y-2 text-sm">
            {data.integrations
              .filter(i => i.status === "not_configured" || i.status === "error")
              .map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">
                    {item.status === "error" ? "🔴" : "⚪"}
                  </span>
                  <div>
                    <span className="font-medium">{item.name}:</span>{" "}
                    <span className="text-gray-600">{item.message}</span>
                  </div>
                </div>
              ))}
            {data.integrations.filter(i => i.status === "not_configured" || i.status === "error").length === 0 && (
              <p className="text-emerald-600">No action items — all integrations are configured.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
