"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Opportunity {
  id: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  value: number | null;
  currency: string;
  source: string | null;
  assignedTo: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  tags: string[];
  lastInteraction: {
    summary: string;
    channel: string;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

interface StageColumn {
  stage: string;
  count: number;
  totalValue: number;
  opportunities: Opportunity[];
}

interface PipelineSummary {
  totalOpportunities: number;
  activeOpportunities: number;
  totalPipelineValue: number;
  stageBreakdown: Record<string, number>;
  currency: string;
}

interface InteractionEntry {
  id: string;
  channel: string;
  direction: string;
  interactionType: string;
  summary: string;
  sentiment: string | null;
  agentId: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGES = ["new", "qualifying", "proposal", "negotiation", "won", "lost"];

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualifying: "Qualifying",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const STAGE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  new: { bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  qualifying: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  proposal: { bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
  negotiation: { bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
  won: { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  lost: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
};

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  web: "Web",
  referral: "Referral",
  organic: "Organic",
  inquiry: "Inquiry",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number | null, currency: string): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// OpportunityCard
// ---------------------------------------------------------------------------

function OpportunityCard({
  opp,
  onMoveStage,
  onSelect,
}: {
  opp: Opportunity;
  onMoveStage: (id: string, stage: string) => void;
  onSelect: (opp: Opportunity) => void;
}) {
  const nextStages = STAGES.filter((s) => s !== opp.closedAt ? false : true).filter(
    (s) => s !== (opp.closedAt ? "" : "")
  );

  return (
    <div
      className="bg-white rounded-lg border border-[rgba(214,208,196,0.5)] p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(opp)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(opp); } }}
    >
      {/* Contact & Value */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm truncate">{opp.contactName}</p>
          {opp.contactEmail && (
            <p className="text-xs text-gray-500 truncate">{opp.contactEmail}</p>
          )}
        </div>
        {opp.value != null && (
          <span className="text-sm font-bold text-emerald-700 ml-2 whitespace-nowrap">
            {formatCurrency(opp.value, opp.currency)}
          </span>
        )}
      </div>

      {/* Source & Assigned */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {opp.source && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            {SOURCE_LABELS[opp.source] || opp.source}
          </span>
        )}
        {opp.assignedTo && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
            {opp.assignedTo === "ceo-agent" ? "CEO Agent" : opp.assignedTo}
          </span>
        )}
        {opp.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
            {tag}
          </span>
        ))}
      </div>

      {/* Next Action */}
      {opp.nextAction && (
        <div className="text-xs text-gray-600 mb-2 bg-amber-50 rounded px-2 py-1">
          <span className="font-medium">Next:</span> {opp.nextAction}
          {opp.nextActionAt && (
            <span className="text-gray-400 ml-1">({timeAgo(opp.nextActionAt)})</span>
          )}
        </div>
      )}

      {/* Last Interaction */}
      {opp.lastInteraction && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
          {opp.lastInteraction.summary}
        </p>
      )}

      {/* Footer: time + stage actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-400">{timeAgo(opp.updatedAt)}</span>
        <div className="flex gap-1">
          {getNextStages(opp.stage).map((ns) => (
            <button
              key={ns}
              onClick={(e) => { e.stopPropagation(); onMoveStage(opp.id, ns); }}
              className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-600"
              title={`Move to ${STAGE_LABELS[ns]}`}
            >
              → {STAGE_LABELS[ns]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getNextStages(current: string): string[] {
  const idx = STAGES.indexOf(current);
  if (idx < 0 || current === "won" || current === "lost") return [];
  const forward = STAGES[idx + 1];
  const result: string[] = [];
  if (forward && forward !== "lost") result.push(forward);
  if (current !== "lost") result.push("lost");
  return result;
}

// ---------------------------------------------------------------------------
// OpportunityDetailPanel
// ---------------------------------------------------------------------------

function OpportunityDetailPanel({
  opp,
  onClose,
  onMoveStage,
  onUpdateValue,
  onUpdateNextAction,
}: {
  opp: Opportunity;
  onClose: () => void;
  onMoveStage: (id: string, stage: string) => void;
  onUpdateValue: (id: string, value: number, currency: string) => void;
  onUpdateNextAction: (id: string, action: string, date: string | null) => void;
}) {
  const [interactions, setInteractions] = useState<InteractionEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [editingValue, setEditingValue] = useState(false);
  const [newValue, setNewValue] = useState(String(opp.value ?? ""));
  const [editingAction, setEditingAction] = useState(false);
  const [newAction, setNewAction] = useState(opp.nextAction || "");
  const [newActionDate, setNewActionDate] = useState(
    opp.nextActionAt ? opp.nextActionAt.split("T")[0] : ""
  );

  useEffect(() => {
    setLoadingTimeline(true);
    fetch(`/api/admin/agent/crm-pipeline?opportunityId=${opp.id}&timeline=true`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setInteractions(data.interactions || []);
      })
      .catch(() => {})
      .finally(() => setLoadingTimeline(false));
  }, [opp.id]);

  const stageColor = STAGE_COLORS[opp.stage] || STAGE_COLORS.new;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end">
      <div className="w-full max-w-md h-full bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className={`p-4 ${stageColor.bg} border-b ${stageColor.border}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${stageColor.dot}`} />
              <span className="text-sm font-semibold text-gray-700">
                {STAGE_LABELS[opp.stage]}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            >
              &times;
            </button>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{opp.contactName}</h2>
          {opp.contactEmail && <p className="text-sm text-gray-600">{opp.contactEmail}</p>}
          {opp.contactPhone && <p className="text-sm text-gray-600">{opp.contactPhone}</p>}
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Value */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Deal Value</p>
            {editingValue ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  placeholder="Value"
                />
                <button
                  onClick={() => {
                    onUpdateValue(opp.id, Number(newValue), opp.currency);
                    setEditingValue(false);
                  }}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                >
                  Save
                </button>
                <button onClick={() => setEditingValue(false)} className="text-xs text-gray-500">
                  Cancel
                </button>
              </div>
            ) : (
              <p
                className="text-lg font-bold text-emerald-700 cursor-pointer hover:underline"
                onClick={() => setEditingValue(true)}
              >
                {formatCurrency(opp.value, opp.currency)}
              </p>
            )}
          </div>

          {/* Next Action */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Next Action</p>
            {editingAction ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="e.g., Send proposal"
                />
                <input
                  type="date"
                  value={newActionDate}
                  onChange={(e) => setNewActionDate(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onUpdateNextAction(opp.id, newAction, newActionDate || null);
                      setEditingAction(false);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingAction(false)} className="text-xs text-gray-500">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-gray-700 cursor-pointer hover:underline"
                onClick={() => setEditingAction(true)}
              >
                {opp.nextAction || "Set next action..."}
                {opp.nextActionAt && (
                  <span className="text-gray-400 ml-1">
                    (due {new Date(opp.nextActionAt).toLocaleDateString("en-GB")})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Source</p>
              <p className="text-gray-800">{SOURCE_LABELS[opp.source || ""] || opp.source || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Assigned To</p>
              <p className="text-gray-800">
                {opp.assignedTo === "ceo-agent" ? "CEO Agent" : opp.assignedTo || "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-gray-800">{new Date(opp.createdAt).toLocaleDateString("en-GB")}</p>
            </div>
            {opp.closedAt && (
              <div>
                <p className="text-xs text-gray-500">Closed</p>
                <p className="text-gray-800">{new Date(opp.closedAt).toLocaleDateString("en-GB")}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {opp.tags.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {opp.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stage actions */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Move to Stage</p>
            <div className="flex flex-wrap gap-2">
              {STAGES.filter((s) => s !== opp.stage).map((s) => (
                <button
                  key={s}
                  onClick={() => onMoveStage(opp.id, s)}
                  className={`text-xs px-3 py-1.5 rounded border ${
                    s === "won"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : s === "lost"
                      ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Interaction Timeline */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Interaction Timeline</p>
            {loadingTimeline ? (
              <p className="text-sm text-gray-400 animate-pulse">Loading timeline...</p>
            ) : interactions.length === 0 ? (
              <p className="text-sm text-gray-400">No interactions recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {interactions.map((ix) => (
                  <div key={ix.id} className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 ${
                          ix.direction === "inbound" ? "bg-blue-400" : "bg-green-400"
                        }`}
                      />
                      <div className="w-px flex-1 bg-gray-200" />
                    </div>
                    <div className="pb-3 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{ix.channel}</span>
                        <span>{ix.direction}</span>
                        {ix.sentiment && (
                          <span
                            className={
                              ix.sentiment === "positive"
                                ? "text-green-500"
                                : ix.sentiment === "negative"
                                ? "text-red-500"
                                : "text-gray-400"
                            }
                          >
                            {ix.sentiment}
                          </span>
                        )}
                        <span>{timeAgo(ix.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5">{ix.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seed Data Form
// ---------------------------------------------------------------------------

function SeedForm({ onSeed }: { onSeed: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const seed = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/agent/crm-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_pipeline" }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`Seeded ${data.created} opportunities`);
        onSeed();
      } else {
        setResult(data.error || "Seed failed");
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">&#9875;</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">CRM Pipeline is Empty</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        No opportunities yet. Seed sample charter inquiries to see the pipeline in action,
        or wait for real inquiries from the website and WhatsApp.
      </p>
      <button
        onClick={seed}
        disabled={loading}
        className="px-6 py-2.5 bg-[#0a1628] text-white rounded-lg hover:bg-[#162440] disabled:opacity-50 text-sm font-medium"
      >
        {loading ? "Seeding..." : "Seed Sample Data"}
      </button>
      {result && <p className="mt-3 text-sm text-gray-600">{result}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CRM Pipeline Page
// ---------------------------------------------------------------------------

export default function CrmPipelinePage() {
  const [columns, setColumns] = useState<StageColumn[]>([]);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [filterAssigned, setFilterAssigned] = useState<string>("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch pipeline data
  // -----------------------------------------------------------------------

  const fetchPipeline = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterAssigned) params.set("assignedTo", filterAssigned);
      const res = await fetch(`/api/admin/agent/crm-pipeline?${params}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setColumns(data.columns || []);
      setSummary(data.summary || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [filterAssigned]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const postAction = async (body: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/admin/agent/crm-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Action failed");
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.action?.replace(/_/g, " ") || "Done");
        setTimeout(() => setActionMsg(null), 2000);
        fetchPipeline();
      }
    } catch {
      setActionMsg("Action failed");
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const moveStage = (id: string, stage: string) =>
    postAction({ opportunityId: id, action: "update_stage", stage });

  const updateValue = (id: string, value: number, currency: string) =>
    postAction({ opportunityId: id, action: "update_value", value, currency });

  const updateNextAction = (id: string, nextAction: string, nextActionAt: string | null) =>
    postAction({ opportunityId: id, action: "update_next_action", nextAction, nextActionAt });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const totalOpps = columns.reduce((s, c) => s + c.count, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg,#FAF8F4)] flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading pipeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg,#FAF8F4)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={fetchPipeline} className="text-sm text-blue-600 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg,#FAF8F4)]">
      {/* Action toast */}
      {actionMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-pulse">
          {actionMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[rgba(214,208,196,0.5)] px-4 py-4 md:px-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Charter Inquiry Pipeline</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track yacht charter opportunities from inquiry to booking
            </p>
          </div>
          <a
            href="/admin/agent"
            className="text-sm text-blue-600 hover:underline hidden md:inline"
          >
            Agent HQ
          </a>
        </div>

        {/* Summary KPIs */}
        {summary && totalOpps > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-blue-600 font-medium">Total</p>
              <p className="text-lg font-bold text-blue-900">{summary.totalOpportunities}</p>
            </div>
            <div className="bg-amber-50 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-amber-600 font-medium">Active</p>
              <p className="text-lg font-bold text-amber-900">{summary.activeOpportunities}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-emerald-600 font-medium">Pipeline Value</p>
              <p className="text-lg font-bold text-emerald-900">
                {formatCurrency(summary.totalPipelineValue, summary.currency)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-purple-600 font-medium">Won</p>
              <p className="text-lg font-bold text-purple-900">
                {summary.stageBreakdown?.won || 0}
              </p>
            </div>
          </div>
        )}

        {/* Filter */}
        {totalOpps > 0 && (
          <div className="mt-3 flex gap-2">
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white text-gray-700"
            >
              <option value="">All assignees</option>
              <option value="ceo-agent">CEO Agent</option>
              <option value="khaled">Khaled</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <button
              onClick={fetchPipeline}
              className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-gray-700"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Pipeline Board */}
      {totalOpps === 0 ? (
        <SeedForm onSeed={fetchPipeline} />
      ) : (
        <div className="p-4 md:p-6">
          {/* Mobile: stacked columns. Desktop: horizontal scroll */}
          <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto md:pb-4">
            {columns.map((col) => {
              const colors = STAGE_COLORS[col.stage] || STAGE_COLORS.new;
              return (
                <div
                  key={col.stage}
                  className={`md:min-w-[280px] md:w-[280px] rounded-xl ${colors.bg} border ${colors.border} flex-shrink-0`}
                >
                  {/* Column header */}
                  <div className="p-3 border-b border-white/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                        <span className="text-sm font-semibold text-gray-800">
                          {STAGE_LABELS[col.stage]}
                        </span>
                      </div>
                      <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full text-gray-600">
                        {col.count}
                      </span>
                    </div>
                    {col.totalValue > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(col.totalValue, "USD")}
                      </p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
                    {col.opportunities.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No opportunities</p>
                    ) : (
                      col.opportunities.map((opp) => (
                        <OpportunityCard
                          key={opp.id}
                          opp={opp}
                          onMoveStage={moveStage}
                          onSelect={setSelected}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <OpportunityDetailPanel
          opp={selected}
          onClose={() => setSelected(null)}
          onMoveStage={(id, stage) => {
            moveStage(id, stage);
            setSelected(null);
          }}
          onUpdateValue={updateValue}
          onUpdateNextAction={updateNextAction}
        />
      )}
    </div>
  );
}
