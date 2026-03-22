"use client";

import { ZHPipelineTrack } from "@/components/zh";

interface PipelineTrackBarProps {
  byPhase: Record<string, number>;
}

const PHASE_ORDER = [
  "research",
  "outline",
  "drafting",
  "assembly",
  "images",
  "seo",
  "scoring",
  "reservoir",
];

export function PipelineTrackBar({ byPhase }: PipelineTrackBarProps) {
  const nodes = PHASE_ORDER.map((phase) => {
    const count = byPhase[phase] || 0;
    const status = count > 10 ? "error" as const : count > 0 ? "active" as const : "idle" as const;
    return { label: phase, count, status };
  });

  return (
    <div className="bg-zh-navy-mid border border-zh-navy-border rounded-lg p-4">
      <div className="font-zh-mono text-[10px] uppercase tracking-[2px] text-zh-cream-muted mb-3">
        Pipeline Phases
      </div>
      <ZHPipelineTrack nodes={nodes} />
    </div>
  );
}
