"use client";

import React, { memo } from "react";
import type { TubeStation as TubeStationDef } from "./tube-map-data";

interface TubeStationProps {
  station: TubeStationDef;
  count: number;
  stuckCount: number;
  errorCount: number;
  lineColor: string;
  onClick: (stationId: string) => void;
}

export const TubeStation = memo(function TubeStation({
  station,
  count,
  stuckCount,
  errorCount,
  lineColor,
  onClick,
}: TubeStationProps) {
  const healthClass = errorCount > 0
    ? "station-error"
    : stuckCount > 0
      ? "station-stuck"
      : "";

  const hasArticles = count > 0;

  return (
    <button
      className={`tube-station ${station.isInterchange ? "interchange" : ""} ${hasArticles ? "has-articles" : ""} ${healthClass}`}
      style={{
        left: `${station.x}%`,
        top: `${station.y}%`,
        "--station-line-color": lineColor,
      } as React.CSSProperties}
      onClick={() => onClick(station.id)}
      aria-label={`${station.label}: ${count} article${count !== 1 ? "s" : ""}${stuckCount > 0 ? `, ${stuckCount} stuck` : ""}`}
      role="button"
      tabIndex={0}
    >
      <div className="tube-station-circle" />
      {count > 0 && (
        <span className="tube-station-count">{count}</span>
      )}
      <span className="tube-station-label">{station.label}</span>
    </button>
  );
});
