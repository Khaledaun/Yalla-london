"use client";

import React, { memo } from "react";
import { STATION_MAP, getLinePath, type TubeLine as TubeLineDef } from "./tube-map-data";

type SegmentHealth = "healthy" | "slow" | "blocked" | "inactive";

interface TubeLineProps {
  line: TubeLineDef;
  color: string;
  visible: boolean;
  /** Per-segment health: array of health states between consecutive stations */
  segmentHealth?: SegmentHealth[];
}

export const TubeLine = memo(function TubeLine({ line, color, visible, segmentHealth }: TubeLineProps) {
  if (!visible) return null;

  const segments: Array<{ key: string; d: string; health: SegmentHealth }> = [];

  for (let i = 0; i < line.stations.length - 1; i++) {
    const fromStation = STATION_MAP.get(line.stations[i]);
    const toStation = STATION_MAP.get(line.stations[i + 1]);
    if (!fromStation || !toStation) continue;

    const pathD = getLinePath(fromStation, toStation);
    const health = segmentHealth?.[i] ?? "healthy";
    segments.push({ key: `${line.id}-${i}`, d: pathD, health });
  }

  return (
    <g data-line={line.id}>
      {segments.map((seg) => (
        <path
          key={seg.key}
          d={seg.d}
          className={`tube-line-path line-${seg.health}`}
          stroke={color}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});
