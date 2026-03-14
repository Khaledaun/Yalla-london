"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────────
interface PhaseDraft {
  id: string;
  keyword: string;
  locale: string;
  siteId: string;
  currentPhase: string;
  phaseAttempts: number;
  sectionsCompleted: number;
  sectionsTotal: number;
  wordCount: number;
  qualityScore: number | null;
  seoScore: number | null;
  lastError: string | null;
  plainError: string | null;
  stuckHours: number;
  isStuck: boolean;
  createdAt: string;
  updatedAt: string;
  phaseStartedAt: string | null;
}

interface PhaseGroup {
  phase: string;
  label: string;
  count: number;
  stuckCount: number;
  drafts: PhaseDraft[];
}

interface PipelineData {
  phases: PhaseGroup[];
  summary: {
    totalDrafts: number;
    totalStuck: number;
    publishedTotal: number;
    publishedLast24h: number;
  };
  siteId: string;
}

// ─── Phase Config ──────────────────────────────────────────────────────
const PHASE_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  research:  { icon: "🔍", color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  outline:   { icon: "📋", color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200" },
  drafting:  { icon: "✍️", color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200" },
  assembly:  { icon: "🔧", color: "text-orange-700", bg: "bg-orange-50",  border: "border-orange-200" },
  images:    { icon: "🖼️", color: "text-pink-700",   bg: "bg-pink-50",    border: "border-pink-200" },
  seo:       { icon: "📊", color: "text-green-700",  bg: "bg-green-50",   border: "border-green-200" },
  scoring:   { icon: "⭐", color: "text-yellow-700", bg: "bg-yellow-50",  border: "border-yellow-200" },
  reservoir: { icon: "📦", color: "text-teal-700",   bg: "bg-teal-50",    border: "border-teal-200" },
};

// ─── Component ─────────────────────────────────────────────────────────
export default function PipelinePhasesPage() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set<string>());

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pipeline-phases");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  // ─── Actions ─────────────────────────────────────────────────────────
  const runAction = async (action: string, params: Record<string, string>) => {
    const key = `${action}-${params.draftId || params.phase || ""}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/admin/pipeline-phases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      const result = await res.json().catch(() => ({ error: "Bad response" }));
      if (res.ok && result.success) {
        showToast(result.message || "Done");
        await fetchData();
      } else {
        showToast(result.error || result.message || "Action failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedDrafts((prev) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    const ids: string[] = Array.from(selectedDrafts);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected draft(s)?`)) return;
    for (const id of ids) {
      await runAction("delete", { draftId: id });
    }
    setSelectedDrafts(new Set<string>());
  };

  // ─── Loading / Error ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-medium">Failed to load pipeline</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { phases, summary } = data;
  const totalInPipeline = phases.reduce((sum, p) => sum + p.count, 0);
  const reservoirCount = phases.find((p) => p.phase === "reservoir")?.count || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-[90vw] ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Pipeline Phases</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalInPipeline} in pipeline &middot; {reservoirCount} ready &middot; {summary.publishedLast24h} published today
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* ─── Summary Bar ──────────────────────────────────────── */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4">
          {phases.map((p) => {
            const cfg = PHASE_CONFIG[p.phase] || PHASE_CONFIG.research;
            const isActive = expandedPhase === p.phase;
            return (
              <button
                key={p.phase}
                onClick={() => setExpandedPhase(isActive ? null : p.phase)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-2 ring-offset-1 ring-blue-400`
                    : p.count > 0
                      ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                      : "bg-gray-100 text-gray-400 border-gray-200"
                }`}
              >
                <span>{cfg.icon}</span>
                <span className="capitalize">{p.phase}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  p.stuckCount > 0 ? "bg-red-100 text-red-700" : "bg-white/60"
                }`}>
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Stuck Alert ────────────────────────────────────────── */}
      {summary.totalStuck > 0 && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-amber-500 text-lg">&#9888;</span>
          <div>
            <p className="text-amber-800 text-sm font-medium">
              {summary.totalStuck} article{summary.totalStuck > 1 ? "s" : ""} stuck for 2+ hours
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Tap a phase to see stuck items. Use Retry or Advance to unblock them.
            </p>
          </div>
        </div>
      )}

      {/* ─── Selected Actions Bar ───────────────────────────────── */}
      {selectedDrafts.size > 0 && (
        <div className="mx-4 mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <span className="text-blue-700 text-sm font-medium">
            {selectedDrafts.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDrafts(new Set<string>())}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg"
            >
              Clear
            </button>
            <button
              onClick={deleteSelected}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* ─── Phase Sections ─────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {phases.map((group) => {
          const cfg = PHASE_CONFIG[group.phase] || PHASE_CONFIG.research;
          const isExpanded = expandedPhase === group.phase;
          const nextPhaseMap: Record<string, string> = { research: "Outline", outline: "Drafting", drafting: "Assembly", assembly: "Images", images: "SEO", seo: "Scoring", scoring: "Reservoir" };
          const nextPhase: string | null = (group.phase === "reservoir") ? null : (nextPhaseMap[group.phase] || null);

          return (
            <div key={group.phase} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
              {/* Phase Header */}
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : group.phase)}
                className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bg}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className={`font-semibold text-sm ${cfg.color}`}>
                    {group.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    group.count === 0
                      ? "bg-gray-200 text-gray-500"
                      : group.stuckCount > 0
                        ? "bg-red-100 text-red-700"
                        : "bg-white text-gray-700"
                  }`}>
                    {group.count}
                  </span>
                  {group.stuckCount > 0 && (
                    <span className="text-[10px] text-red-600 font-medium">
                      {group.stuckCount} stuck
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transform transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Phase Content */}
              {isExpanded && (
                <div className="bg-white">
                  {/* Bulk Actions */}
                  {group.count > 0 && (
                    <div className="px-4 py-2 border-b border-gray-100 flex gap-2 flex-wrap">
                      {nextPhase && (
                        <button
                          onClick={() => {
                            if (confirm(`Advance ALL ${group.count} drafts from ${group.label} to ${nextPhase}?`))
                              runAction("bulk_advance", { phase: group.phase });
                          }}
                          disabled={actionLoading[`bulk_advance-${group.phase}`]}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading[`bulk_advance-${group.phase}`] ? (
                            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                          ) : null}
                          Advance All to {nextPhase}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Delete ALL stuck drafts (2h+) from ${group.label}?`))
                            runAction("bulk_delete", { phase: group.phase });
                        }}
                        disabled={actionLoading[`bulk_delete-${group.phase}`]}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg disabled:opacity-50"
                      >
                        Delete Stuck
                      </button>
                      {group.phase === "reservoir" && (
                        <button
                          onClick={async () => {
                            showToast("Running content selector...");
                            try {
                              const res = await fetch("/api/admin/departures", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ path: "/api/cron/content-selector" }),
                              });
                              const result = await res.json().catch(() => ({}));
                              if (res.ok) {
                                showToast("Content selector completed — check Published count");
                                fetchData();
                              } else {
                                showToast(result.error || "Failed", "error");
                              }
                            } catch {
                              showToast("Network error", "error");
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg flex items-center gap-1"
                        >
                          Publish Ready Articles
                        </button>
                      )}
                    </div>
                  )}

                  {/* Draft List */}
                  {group.count === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-400 text-sm">
                      No articles in this phase
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {(group.drafts as PhaseDraft[]).map((draft: PhaseDraft) => (
                        <DraftCard
                          key={draft.id}
                          draft={draft}
                          nextPhase={nextPhase}
                          isSelected={selectedDrafts.has(draft.id)}
                          onToggleSelect={() => toggleSelect(draft.id)}
                          onAction={runAction}
                          actionLoading={actionLoading}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ─── Published Summary ─────────────────────────────────── */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <span className="text-2xl">&#9989;</span>
          <div>
            <p className="text-green-800 text-sm font-semibold">
              {summary.publishedTotal} Published Articles
            </p>
            <p className="text-green-600 text-xs">
              {summary.publishedLast24h} published in the last 24 hours
            </p>
          </div>
        </div>
      </div>

      {/* Bottom spacer for mobile */}
      <div className="h-20" />
    </div>
  );
}

// ─── Draft Card Component ──────────────────────────────────────────────
function DraftCard({
  draft,
  nextPhase,
  isSelected,
  onToggleSelect,
  onAction,
  actionLoading,
}: {
  draft: PhaseDraft;
  nextPhase: string | null;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAction: (action: string, params: Record<string, string>) => Promise<void>;
  actionLoading: Record<string, boolean>;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const stuckBadge = draft.isStuck ? (
    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold animate-pulse">
      STUCK {draft.stuckHours}h
    </span>
  ) : null;

  const localeBadge = (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
      draft.locale === "ar" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
    }`}>
      {draft.locale === "ar" ? "AR" : "EN"}
    </span>
  );

  const progressText =
    draft.currentPhase === "drafting" && draft.sectionsTotal > 0
      ? `${draft.sectionsCompleted}/${draft.sectionsTotal} sections`
      : draft.wordCount > 0
        ? `${draft.wordCount.toLocaleString()}w`
        : null;

  return (
    <div className={`px-4 py-3 ${isSelected ? "bg-blue-50" : ""}`}>
      {/* Row 1: Checkbox + Title + Badges */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
        />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-left w-full"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium text-gray-900 truncate max-w-[60vw]">
                {draft.keyword}
              </span>
              {localeBadge}
              {stuckBadge}
            </div>
            {/* Row 2: Meta info */}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
              {progressText && <span>{progressText}</span>}
              {draft.phaseAttempts > 0 && (
                <span className="text-amber-600">
                  {draft.phaseAttempts} attempt{draft.phaseAttempts > 1 ? "s" : ""}
                </span>
              )}
              {draft.seoScore != null && (
                <span className={draft.seoScore >= 70 ? "text-green-600" : draft.seoScore >= 50 ? "text-amber-600" : "text-red-600"}>
                  SEO {draft.seoScore}
                </span>
              )}
              <span>
                {timeAgo(draft.updatedAt)}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-2 ml-6 space-y-2">
          {/* Error */}
          {draft.plainError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-700">{draft.plainError}</p>
            </div>
          )}

          {/* Scores */}
          <div className="flex gap-3 text-xs text-gray-600">
            {draft.qualityScore != null && <span>Quality: {draft.qualityScore}</span>}
            {draft.seoScore != null && <span>SEO: {draft.seoScore}</span>}
            {draft.wordCount > 0 && <span>Words: {draft.wordCount.toLocaleString()}</span>}
            {draft.sectionsTotal > 0 && (
              <span>Sections: {draft.sectionsCompleted}/{draft.sectionsTotal}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {nextPhase && (
              <ActionButton
                label={`Advance to ${nextPhase}`}
                loading={!!actionLoading[`advance-${draft.id}`]}
                onClick={() => onAction("advance", { draftId: draft.id })}
                variant="primary"
              />
            )}
            <ActionButton
              label="Retry"
              loading={!!actionLoading[`retry-${draft.id}`]}
              onClick={() => onAction("retry", { draftId: draft.id })}
              variant="secondary"
            />
            {draft.currentPhase === "reservoir" && (
              <ActionButton
                label="Publish"
                loading={!!actionLoading[`publish-${draft.id}`]}
                onClick={() => onAction("publish", { draftId: draft.id })}
                variant="success"
              />
            )}
            <ActionButton
              label="Delete"
              loading={!!actionLoading[`delete-${draft.id}`]}
              onClick={() => {
                if (confirm(`Delete "${draft.keyword}"?`))
                  onAction("delete", { draftId: draft.id });
              }}
              variant="danger"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────
function ActionButton({
  label,
  loading,
  onClick,
  variant,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  variant: "primary" | "secondary" | "success" | "danger";
}) {
  const styles = {
    primary: "bg-blue-600 text-white",
    secondary: "bg-gray-100 text-gray-700 border border-gray-200",
    success: "bg-green-600 text-white",
    danger: "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1 ${styles[variant]}`}
    >
      {loading && (
        <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
      )}
      {label}
    </button>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
