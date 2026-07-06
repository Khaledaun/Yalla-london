"use client";

import React, { useState } from "react";
import type { OperationEntry } from "./tube-map-hooks";
import { timeAgo } from "../../types";

interface ActivityOverlayProps {
  entries: OperationEntry[];
  visible: boolean;
}

export function ActivityOverlay({ entries, visible }: ActivityOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!visible || entries.length === 0) return null;

  const shown = expanded ? entries.slice(0, 15) : entries.slice(0, 4);

  return (
    <div className="activity-overlay">
      <button
        className="flex items-center justify-between w-full mb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-bold text-white/50 tracking-wider">
          LIVE ACTIVITY
        </span>
        <span className="text-xs text-white/30">
          {expanded ? "▲ collapse" : `▼ ${entries.length} events`}
        </span>
      </button>

      {shown.map((entry, i) => {
        const statusDot =
          entry.status === "error" ? "🔴" :
          entry.status === "warning" ? "🟡" : "";

        return (
          <div key={`${entry.timestamp}-${i}`} className="activity-entry">
            <span className="agent-icon">{entry.agentIcon}</span>
            <span className="flex-1 text-white/70">
              {statusDot} {entry.action}
            </span>
            <span className="time-ago">{timeAgo(entry.timestamp)}</span>
          </div>
        );
      })}
    </div>
  );
}
