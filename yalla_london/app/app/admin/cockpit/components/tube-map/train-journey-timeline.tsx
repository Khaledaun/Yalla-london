"use client";

import React, { useState, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface JourneyStep {
  phase: string;
  label: string;
  timestamp: string | null;
  agent: string | null;
  durationMs: number | null;
  status: "completed" | "current" | "waiting";
}

interface TrainJourneyTimelineProps {
  articleId: string;
  articleType: "published" | "draft";
  currentPhase: string | null;
  siteId: string;
  generatedAt: string | null;
  publishedAt: string | null;
}

// ─── Phase definitions ──────────────────────────────────────────────────────

const PIPELINE_PHASES = [
  { id: "research", label: "Research", icon: "🔬" },
  { id: "outline", label: "Outline", icon: "📝" },
  { id: "drafting", label: "Drafting", icon: "✍️" },
  { id: "assembly", label: "Assembly", icon: "🔧" },
  { id: "images", label: "Images", icon: "🖼" },
  { id: "seo", label: "SEO", icon: "📊" },
  { id: "scoring", label: "Scoring", icon: "⭐" },
  { id: "reservoir", label: "Reservoir", icon: "📦" },
  { id: "published", label: "Published", icon: "✅" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (!ms || ms < 0) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TrainJourneyTimeline({
  articleId,
  articleType,
  currentPhase,
  siteId,
  generatedAt,
  publishedAt,
}: TrainJourneyTimelineProps) {
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buildTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function buildTimeline() {
    setLoading(true);

    // Build steps from phase definitions
    const currentIdx = PIPELINE_PHASES.findIndex((p) => p.id === currentPhase);
    const isPublished = articleType === "published" || currentPhase === "published";

    // Try to get operations feed for this article
    let feedEntries: Array<{ timestamp: string; action: string; agent: string }> = [];
    try {
      const res = await fetch(
        `/api/admin/operations-feed?siteId=${encodeURIComponent(siteId)}&limit=100&hours=168`
      );
      if (res.ok) {
        const data = await res.json();
        feedEntries = (data.entries ?? [])
          .filter((e: { articleIds?: string[] }) =>
            e.articleIds?.includes(articleId)
          );
      }
    } catch {
      // Graceful degradation — show basic timeline without agent data
    }

    const journeySteps: JourneyStep[] = PIPELINE_PHASES.map((phase, idx) => {
      let status: "completed" | "current" | "waiting";
      if (isPublished) {
        status = "completed";
      } else if (idx < currentIdx) {
        status = "completed";
      } else if (idx === currentIdx) {
        status = "current";
      } else {
        status = "waiting";
      }

      // Try to find a matching feed entry for this phase
      const matchingEntry = feedEntries.find((e) =>
        e.action.toLowerCase().includes(phase.id) ||
        e.action.toLowerCase().includes(phase.label.toLowerCase())
      );

      let timestamp: string | null = null;
      if (phase.id === "research" && generatedAt) {
        timestamp = generatedAt;
      } else if (phase.id === "published" && publishedAt) {
        timestamp = publishedAt;
      } else if (matchingEntry) {
        timestamp = matchingEntry.timestamp;
      }

      return {
        phase: phase.id,
        label: phase.label,
        timestamp,
        agent: matchingEntry?.agent ?? null,
        durationMs: null, // Would need phase transition history
        status,
      };
    });

    // Calculate durations between consecutive completed steps
    for (let i = 1; i < journeySteps.length; i++) {
      if (journeySteps[i].timestamp && journeySteps[i - 1].timestamp) {
        journeySteps[i].durationMs =
          new Date(journeySteps[i].timestamp!).getTime() -
          new Date(journeySteps[i - 1].timestamp!).getTime();
      }
    }

    setSteps(journeySteps);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="py-3 text-center text-white/30 text-xs">
        Loading journey...
      </div>
    );
  }

  return (
    <div className="py-2">
      <h4 className="text-xs font-bold text-white/50 tracking-wider mb-3 px-1">
        JOURNEY
      </h4>
      <div className="relative pl-6">
        {/* Vertical timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-white/10" />

        {steps.map((step, idx) => {
          const phaseInfo = PIPELINE_PHASES.find((p) => p.id === step.phase);
          const icon = phaseInfo?.icon ?? "○";

          return (
            <div key={step.phase} className="relative flex items-start gap-3 pb-3">
              {/* Timeline dot */}
              <div className="absolute -left-[15px] top-0.5">
                {step.status === "completed" ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center">
                    <span className="text-[8px]">✓</span>
                  </div>
                ) : step.status === "current" ? (
                  <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 bg-transparent" />
                )}
              </div>

              {/* Step content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs">{icon}</span>
                  <span
                    className={`text-xs font-medium ${
                      step.status === "waiting" ? "text-white/30" :
                      step.status === "current" ? "text-blue-400" :
                      "text-white/70"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.timestamp && (
                    <span className="text-[10px] text-white/30 ml-auto">
                      {formatTime(step.timestamp)}
                    </span>
                  )}
                </div>
                {step.agent && (
                  <p className="text-[10px] text-white/25 mt-0.5">
                    {step.agent}
                  </p>
                )}
                {step.durationMs && step.durationMs > 0 && idx > 0 && (
                  <p className="text-[10px] text-white/20 mt-0.5">
                    ↑ {formatDuration(step.durationMs)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
