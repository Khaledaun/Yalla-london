"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminKPICard,
  AdminSectionLabel,
  AdminAlertBanner,
} from "@/components/admin/admin-ui";
import { Inbox } from "lucide-react";

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
const PHASE_CONFIG: Record<string, { icon: string; color: string; dotColor: string }> = {
  research:  { icon: "🔍", color: "#3B7EA1", dotColor: "#3B7EA1" },
  outline:   { icon: "📋", color: "#5B21B6", dotColor: "#7C3AED" },
  drafting:  { icon: "✍️", color: "#7C3AED", dotColor: "#7C3AED" },
  assembly:  { icon: "🔧", color: "#C49A2A", dotColor: "#C49A2A" },
  images:    { icon: "🖼️", color: "#C8322B", dotColor: "#C8322B" },
  seo:       { icon: "📊", color: "#2D5A3D", dotColor: "#2D5A3D" },
  scoring:   { icon: "⭐", color: "#C49A2A", dotColor: "#C49A2A" },
  reservoir: { icon: "📦", color: "#3B7EA1", dotColor: "#3B7EA1" },
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
      <div className="admin-page p-4 md:p-6">
        <AdminLoadingState label="Loading pipeline..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminAlertBanner
          severity="critical"
          message="Failed to load pipeline"
          detail={error || undefined}
          action={
            <AdminButton
              variant="danger"
              size="sm"
              onClick={() => { setLoading(true); fetchData(); }}
            >
              Retry
            </AdminButton>
          }
        />
      </div>
    );
  }

  const { phases, summary } = data;
  const totalInPipeline = phases.reduce((sum, p) => sum + p.count, 0);
  const reservoirCount = phases.find((p) => p.phase === "reservoir")?.count || 0;

  return (
    <div className="admin-page p-4 md:p-6">
      {/* ─── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg max-w-[90vw]"
          style={{
            fontFamily: 'var(--font-system)',
            fontSize: 12,
            fontWeight: 600,
            color: '#FAF8F4',
            backgroundColor: toast.type === "success" ? '#2D5A3D' : '#C8322B',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Pipeline"
        subtitle="Content phase overview"
        action={
          <AdminButton variant="ghost" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </AdminButton>
        }
      />

      {/* ─── KPI Summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <AdminKPICard value={totalInPipeline} label="In Pipeline" color="#3B7EA1" />
        <AdminKPICard value={reservoirCount} label="Ready" color="#2D5A3D" />
        <AdminKPICard value={summary.publishedLast24h} label="Published Today" color="#2D5A3D" />
        <AdminKPICard value={summary.totalStuck} label="Stuck" color={summary.totalStuck > 0 ? '#C8322B' : '#78716C'} />
      </div>

      {/* ─── Phase Filter Pills ───────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 mb-4">
        {phases.map((p) => {
          const cfg = PHASE_CONFIG[p.phase] || PHASE_CONFIG.research;
          const isActive = expandedPhase === p.phase;
          return (
            <button
              key={p.phase}
              onClick={() => setExpandedPhase(isActive ? null : p.phase)}
              className={`admin-filter-pill ${isActive ? "active" : ""}`}
              style={{ opacity: p.count === 0 && !isActive ? 0.5 : 1 }}
            >
              <span>{cfg.icon}</span>
              <span className="capitalize">{p.phase}</span>
              {p.stuckCount > 0 ? (
                <AdminStatusBadge status="stuck" label={String(p.count)} />
              ) : (
                <span
                  style={{
                    fontFamily: 'var(--font-system)',
                    fontSize: 9,
                    fontWeight: 700,
                    opacity: 0.7,
                  }}
                >
                  {p.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Stuck Alert ────────────────────────────────────────── */}
      {summary.totalStuck > 0 && (
        <AdminAlertBanner
          severity="warning"
          message={`${summary.totalStuck} article${summary.totalStuck > 1 ? "s" : ""} stuck for 2+ hours`}
          detail="Tap a phase to see stuck items. Use Retry or Advance to unblock them."
        />
      )}

      {/* ─── Selected Actions Bar ───────────────────────────────── */}
      {selectedDrafts.size > 0 && (
        <AdminAlertBanner
          severity="info"
          message={`${selectedDrafts.size} selected`}
          action={
            <div className="flex gap-2">
              <AdminButton variant="secondary" size="sm" onClick={() => setSelectedDrafts(new Set<string>())}>
                Clear
              </AdminButton>
              <AdminButton variant="danger" size="sm" onClick={deleteSelected}>
                Delete Selected
              </AdminButton>
            </div>
          }
        />
      )}

      {/* ─── Phase Sections ─────────────────────────────────────── */}
      <div className="space-y-3">
        {phases.map((group) => {
          const cfg = PHASE_CONFIG[group.phase] || PHASE_CONFIG.research;
          const isExpanded = expandedPhase === group.phase;
          const nextPhaseMap: Record<string, string> = { research: "Outline", outline: "Drafting", drafting: "Assembly", assembly: "Images", images: "SEO", seo: "Scoring", scoring: "Reservoir" };
          const nextPhase: string | null = (group.phase === "reservoir") ? null : (nextPhaseMap[group.phase] || null);

          return (
            <AdminCard key={group.phase} className="overflow-hidden">
              {/* Phase Header */}
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : group.phase)}
                className="w-full flex items-center justify-between px-4 py-3"
                style={{ borderLeft: `3px solid ${cfg.color}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cfg.icon}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 13,
                      color: cfg.color,
                    }}
                  >
                    {group.label}
                  </span>
                  {group.count === 0 ? (
                    <span
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#A8A29E',
                        backgroundColor: 'rgba(168,162,158,0.1)',
                        padding: '2px 8px',
                        borderRadius: 99,
                      }}
                    >
                      {group.count}
                    </span>
                  ) : (
                    <AdminStatusBadge
                      status={group.stuckCount > 0 ? "stuck" : "active"}
                      label={String(group.count)}
                    />
                  )}
                  {group.stuckCount > 0 && (
                    <span
                      style={{
                        fontFamily: 'var(--font-system)',
                        fontSize: 9,
                        fontWeight: 600,
                        color: '#C8322B',
                      }}
                    >
                      {group.stuckCount} stuck
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  style={{ color: '#A8A29E' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Phase Content */}
              {isExpanded && (
                <div>
                  {/* Bulk Actions */}
                  {group.count > 0 && (
                    <div
                      className="px-4 py-2 flex gap-2 flex-wrap"
                      style={{ borderTop: '1px solid rgba(214,208,196,0.4)' }}
                    >
                      {nextPhase && (
                        <AdminButton
                          variant="primary"
                          size="sm"
                          loading={actionLoading[`bulk_advance-${group.phase}`]}
                          onClick={() => {
                            if (confirm(`Advance ALL ${group.count} drafts from ${group.label} to ${nextPhase}?`))
                              runAction("bulk_advance", { phase: group.phase });
                          }}
                        >
                          Advance All to {nextPhase}
                        </AdminButton>
                      )}
                      <AdminButton
                        variant="danger"
                        size="sm"
                        loading={actionLoading[`bulk_delete-${group.phase}`]}
                        onClick={() => {
                          if (confirm(`Delete ALL stuck drafts (2h+) from ${group.label}?`))
                            runAction("bulk_delete", { phase: group.phase });
                        }}
                      >
                        Delete Stuck
                      </AdminButton>
                      {group.phase === "reservoir" && (
                        <AdminButton
                          variant="success"
                          size="sm"
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
                        >
                          Publish Ready Articles
                        </AdminButton>
                      )}
                    </div>
                  )}

                  {/* Draft List */}
                  {group.count === 0 ? (
                    <AdminEmptyState
                      icon={Inbox}
                      title="No articles in this phase"
                    />
                  ) : (
                    <div>
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
            </AdminCard>
          );
        })}

        {/* ─── Published Summary ─────────────────────────────────── */}
        <AdminCard accent accentColor="green">
          <div className="flex items-center gap-3 p-4">
            <span className="text-2xl">&#9989;</span>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 14,
                  color: '#2D5A3D',
                }}
              >
                {summary.publishedTotal} Published Articles
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 11,
                  color: '#78716C',
                  marginTop: 2,
                }}
              >
                {summary.publishedLast24h} published in the last 24 hours
              </p>
            </div>
          </div>
        </AdminCard>
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
    <AdminStatusBadge status="stuck" label={`STUCK ${draft.stuckHours}h`} />
  ) : null;

  const localeBadge = (
    <AdminStatusBadge
      status={draft.locale === "ar" ? "warning" : "inactive"}
      label={draft.locale === "ar" ? "AR" : "EN"}
    />
  );

  const progressText =
    draft.currentPhase === "drafting" && draft.sectionsTotal > 0
      ? `${draft.sectionsCompleted}/${draft.sectionsTotal} sections`
      : draft.wordCount > 0
        ? `${draft.wordCount.toLocaleString()}w`
        : null;

  const seoScoreColor = draft.seoScore != null
    ? draft.seoScore >= 70 ? '#2D5A3D' : draft.seoScore >= 50 ? '#C49A2A' : '#C8322B'
    : '#78716C';

  return (
    <div
      className="px-4 py-3"
      style={{
        borderTop: '1px solid rgba(214,208,196,0.3)',
        backgroundColor: isSelected ? 'rgba(59,126,161,0.06)' : undefined,
      }}
    >
      {/* Row 1: Checkbox + Title + Badges */}
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 rounded"
          style={{ accentColor: '#C8322B' }}
        />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-left w-full"
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="truncate max-w-[60vw]"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#1C1917',
                }}
              >
                {draft.keyword}
              </span>
              {localeBadge}
              {stuckBadge}
            </div>
            {/* Row 2: Meta info */}
            <div className="flex items-center gap-2 mt-1">
              {progressText && (
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#78716C' }}>
                  {progressText}
                </span>
              )}
              {draft.phaseAttempts > 0 && (
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#C49A2A' }}>
                  {draft.phaseAttempts} attempt{draft.phaseAttempts > 1 ? "s" : ""}
                </span>
              )}
              {draft.seoScore != null && (
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, fontWeight: 600, color: seoScoreColor }}>
                  SEO {draft.seoScore}
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-system)', fontSize: 10, color: '#A8A29E' }}>
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
            <AdminAlertBanner
              severity="critical"
              message={draft.plainError}
            />
          )}

          {/* Scores */}
          <div className="admin-card-inset rounded-lg p-3">
            <AdminSectionLabel>SCORES</AdminSectionLabel>
            <div className="flex gap-4">
              {draft.qualityScore != null && (
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                  Quality: <strong style={{ color: '#1C1917' }}>{draft.qualityScore}</strong>
                </span>
              )}
              {draft.seoScore != null && (
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                  SEO: <strong style={{ color: seoScoreColor }}>{draft.seoScore}</strong>
                </span>
              )}
              {draft.wordCount > 0 && (
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                  Words: <strong style={{ color: '#1C1917' }}>{draft.wordCount.toLocaleString()}</strong>
                </span>
              )}
              {draft.sectionsTotal > 0 && (
                <span style={{ fontFamily: 'var(--font-system)', fontSize: 11, color: '#78716C' }}>
                  Sections: <strong style={{ color: '#1C1917' }}>{draft.sectionsCompleted}/{draft.sectionsTotal}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {nextPhase && (
              <AdminButton
                variant="primary"
                size="sm"
                loading={!!actionLoading[`advance-${draft.id}`]}
                onClick={() => onAction("advance", { draftId: draft.id })}
              >
                Advance to {nextPhase}
              </AdminButton>
            )}
            <AdminButton
              variant="secondary"
              size="sm"
              loading={!!actionLoading[`retry-${draft.id}`]}
              onClick={() => onAction("retry", { draftId: draft.id })}
            >
              Retry
            </AdminButton>
            {draft.currentPhase === "reservoir" && (
              <AdminButton
                variant="success"
                size="sm"
                loading={!!actionLoading[`publish-${draft.id}`]}
                onClick={() => onAction("publish", { draftId: draft.id })}
              >
                Publish
              </AdminButton>
            )}
            <AdminButton
              variant="danger"
              size="sm"
              loading={!!actionLoading[`delete-${draft.id}`]}
              onClick={() => {
                if (confirm(`Delete "${draft.keyword}"?`))
                  onAction("delete", { draftId: draft.id });
              }}
            >
              Delete
            </AdminButton>
          </div>
        </div>
      )}
    </div>
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
