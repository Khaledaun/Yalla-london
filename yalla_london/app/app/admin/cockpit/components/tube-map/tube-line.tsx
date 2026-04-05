"use client";

import React, { memo } from "react";
import { STATION_MAP, getLinePath, type TubeLine as TubeLineDef } from "./tube-map-data";

interface TubeLineProps {
  line: TubeLineDef;
  color: string;
  visible: boolean;
}

export const TubeLine = memo(function TubeLine({ line, color, visible }: TubeLineProps) {
  if (!visible) return null;

  // Build SVG path segments between consecutive stations
  const segments: Array<{ key: string; d: string }> = [];

  for (let i = 0; i < line.stations.length - 1; i++) {
    const fromStation = STATION_MAP.get(line.stations[i]);
    const toStation = STATION_MAP.get(line.stations[i + 1]);
    if (!fromStation || !toStation) continue;

    const pathD = getLinePath(fromStation, toStation);
    segments.push({
      key: `${line.id}-${i}`,
      d: pathD,
    });
  }

  return (
    <g data-line={line.id}>
      {segments.map((seg) => (
        <path
          key={seg.key}
          d={seg.d}
          className="tube-line-path line-healthy"
          stroke={color}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
});
