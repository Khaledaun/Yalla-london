"use client";

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

interface PipelineNode {
  label: string;
  count: number;
  status: "active" | "error" | "idle";
}

function PipelineTrack({ nodes }: { nodes: PipelineNode[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {nodes.map((node, i) => {
        const borderColor =
          node.status === "error"
            ? "border-[#DC2626] text-[#DC2626]"
            : node.status === "active"
            ? "border-[#C8322B] text-[#C8322B]"
            : "border-[rgba(214,208,196,0.5)] text-[#78716C]";

        return (
          <div key={node.label} className="flex items-center gap-1 flex-shrink-0">
            <div
              className={`bg-white border-2 ${borderColor} rounded-lg px-2 py-1.5 text-center min-w-[64px]`}
            >
              <div
                style={{ fontFamily: "var(--font-system)" }}
                className="text-[10px] uppercase tracking-wider text-[#78716C]"
              >
                {node.label}
              </div>
              <div
                style={{ fontFamily: "var(--font-system)" }}
                className="text-sm font-bold tabular-nums"
              >
                {node.count}
              </div>
            </div>
            {i < nodes.length - 1 && (
              <span className="text-[rgba(214,208,196,0.5)] text-xs flex-shrink-0">&rarr;</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PipelineTrackBar({ byPhase }: PipelineTrackBarProps) {
  const nodes: PipelineNode[] = PHASE_ORDER.map((phase) => {
    const count = byPhase[phase] || 0;
    const status = count > 10 ? "error" as const : count > 0 ? "active" as const : "idle" as const;
    return { label: phase, count, status };
  });

  return (
    <div className="bg-white border border-[rgba(214,208,196,0.6)] rounded-lg p-4 shadow-[0_1px_3px_rgba(28,25,23,0.04),0_4px_12px_rgba(28,25,23,0.04)]">
      <p style={{ fontFamily: "var(--font-system)", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#78716C' }} className="mb-3">
        Pipeline Phases
      </p>
      <PipelineTrack nodes={nodes} />
    </div>
  );
}
