"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminCard, AdminButton } from "@/components/admin/admin-ui";
import { runCronAction } from "../lib/article-actions";
import type { ContentItem } from "../types";
import { scoreColor } from "../types";

interface PipelineKanbanProps {
  siteId: string;
  onArticleClick: (item: ContentItem) => void;
}

const PIPELINE_PHASES = [
  { id: "research", label: "Research", emoji: "🔬" },
  { id: "outline", label: "Outline", emoji: "📝" },
  { id: "drafting", label: "Drafting", emoji: "✍️" },
  { id: "assembly", label: "Assembly", emoji: "🔧" },
  { id: "images", label: "Images", emoji: "🖼" },
  { id: "seo", label: "SEO", emoji: "📊" },
  { id: "scoring", label: "Scoring", emoji: "⭐" },
  { id: "reservoir", label: "Reservoir", emoji: "📦" },
];

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function timeColor(hours: number): string {
  if (hours > 12) return "text-[#C8322B]";
  if (hours > 6) return "text-[#C49A2A]";
  return "text-stone-500";
}

export function PipelineKanban({ siteId, onArticleClick }: PipelineKanbanProps) {
  const [drafts, setDrafts] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/content-matrix?siteId=${encodeURIComponent(siteId)}&status=active&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      // Include reservoir and active pipeline drafts
      const allDrafts = (data.articles ?? []).filter(
        (a: ContentItem) => a.type === "draft"
      );
      setDrafts(allDrafts);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  // Group by phase
  const byPhase: Record<string, ContentItem[]> = {};
  for (const phase of PIPELINE_PHASES) {
    byPhase[phase.id] = [];
  }
  for (const draft of drafts) {
    const phase = draft.phase ?? draft.status;
    if (byPhase[phase]) {
      byPhase[phase].push(draft);
    }
  }
  // Sort each column: stuck items first, then by time in phase (desc)
  for (const phase of PIPELINE_PHASES) {
    byPhase[phase.id].sort((a, b) => b.hoursInPhase - a.hoursInPhase);
  }

  const handleRunPhase = async (phaseId: string) => {
    setRunningCron(phaseId);
    try {
      await runCronAction("/api/cron/content-builder", siteId);
      setTimeout(fetchDrafts, 2000);
    } finally {
      setRunningCron(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-stone-400 text-sm">Loading pipeline...</div>;
  }

  const totalDrafts = drafts.length;
  if (totalDrafts === 0) {
    return (
      <div className="text-center py-8 text-stone-400">
        <p className="text-sm">No active drafts in pipeline</p>
        <p className="text-xs mt-1">Topics → Drafts → Published</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-stone-500">{totalDrafts} draft{totalDrafts !== 1 ? "s" : ""} in pipeline</span>
        <AdminButton
          onClick={() => handleRunPhase("all")}
          loading={runningCron === "all"}
          size="sm"
          variant="secondary"
          className="text-[11px]"
        >
          Run Builder
        </AdminButton>
      </div>

      {/* Kanban board — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
        {PIPELINE_PHASES.map((phase) => {
          const items = byPhase[phase.id];
          const count = items.length;
          const hasStuck = items.some((i) => i.hoursInPhase > 6);

          return (
            <div
              key={phase.id}
              className="snap-start flex-shrink-0 w-[160px] min-h-[120px]"
            >
              {/* Column header */}
              <div className={`flex items-center justify-between px-2 py-1.5 rounded-t-lg border border-b-0 ${
                hasStuck ? "bg-[rgba(200,50,43,0.05)] border-[rgba(200,50,43,0.15)]" : "bg-stone-50 border-stone-200"
              }`}>
                <div className="flex items-center gap-1">
                  <span className="text-xs">{phase.emoji}</span>
                  <span className="text-[11px] font-semibold text-stone-700">{phase.label}</span>
                </div>
                <span className={`text-[10px] font-bold px-1.5 rounded-full ${
                  count === 0 ? "text-stone-400 bg-stone-100" :
                  hasStuck ? "text-[#C8322B] bg-[rgba(200,50,43,0.1)]" :
                  "text-[#2D5A3D] bg-[rgba(45,90,61,0.1)]"
                }`}>
                  {count}
                </span>
              </div>

              {/* Cards */}
              <div className={`border border-t-0 rounded-b-lg p-1 space-y-1 min-h-[80px] ${
                hasStuck ? "border-[rgba(200,50,43,0.15)]" : "border-stone-200"
              }`}>
                {items.length === 0 && (
                  <div className="text-center py-4 text-[10px] text-stone-400 italic">Empty</div>
                )}
                {items.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onArticleClick(item)}
                    className="w-full text-left p-1.5 rounded bg-white border border-stone-100 hover:border-stone-300 hover:shadow-sm transition-all"
                  >
                    <div className="text-[11px] text-stone-800 font-medium truncate leading-tight">
                      {item.topicTitle || item.title || "Untitled"}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      {phase.id === "reservoir" ? (
                        <span className={`text-[10px] font-medium ${scoreColor(item.qualityScore ?? item.seoScore)}`}>
                          Score: {item.qualityScore ?? item.seoScore ?? "—"}
                        </span>
                      ) : (
                        <span className={`text-[10px] ${timeColor(item.hoursInPhase)}`}>
                          {formatHours(item.hoursInPhase)}
                          {item.hoursInPhase > 12 && " 🔴"}
                          {item.hoursInPhase > 6 && item.hoursInPhase <= 12 && " ⚠️"}
                        </span>
                      )}
                      {item.wordCount > 0 && (
                        <span className="text-[9px] text-stone-400">{item.wordCount}w</span>
                      )}
                    </div>
                  </button>
                ))}
                {items.length > 8 && (
                  <div className="text-center text-[10px] text-stone-400 py-1">
                    +{items.length - 8} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
