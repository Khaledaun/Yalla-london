"use client";

import React from "react";
import { TUBE_LINES } from "./tube-map-data";

interface MapControlsProps {
  siteId: string;
  siteName: string;
  liveMode: boolean;
  onLiveModeToggle: () => void;
  visibleLines: Set<string>;
  onToggleLine: (lineId: string) => void;
  lastUpdated: string | null;
}

export function MapControls({
  siteName,
  liveMode,
  onLiveModeToggle,
  visibleLines,
  onToggleLine,
  lastUpdated,
}: MapControlsProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#0F1419] border-b border-white/10">
      {/* Site name */}
      <div className="flex items-center gap-2">
        <span className="text-white/90 font-bold text-sm">{siteName}</span>
        <span className="text-white/20 text-xs">Tube Map</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Live toggle */}
        <button
          onClick={onLiveModeToggle}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
            liveMode
              ? "bg-green-900/40 text-green-400 border border-green-800/50"
              : "bg-white/5 text-white/40 border border-white/10"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${liveMode ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
          {liveMode ? "Live" : "Paused"}
        </button>

        {/* Last updated */}
        {lastUpdated && (
          <span className="text-white/20 text-[10px] hidden sm:block">
            {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}

/** Line filter legend shown below the map controls */
export function LineLegend({
  visibleLines,
  onToggleLine,
}: {
  visibleLines: Set<string>;
  onToggleLine: (lineId: string) => void;
}) {
  return (
    <div className="line-legend">
      {TUBE_LINES.map((line) => {
        const isVisible = visibleLines.has(line.id);
        return (
          <button
            key={line.id}
            className="line-legend-item"
            onClick={() => onToggleLine(line.id)}
            style={{ opacity: isVisible ? 1 : 0.3 }}
            title={line.description}
          >
            <span className="line-legend-dot" style={{ background: line.color }} />
            <span>{line.name}</span>
          </button>
        );
      })}
    </div>
  );
}
