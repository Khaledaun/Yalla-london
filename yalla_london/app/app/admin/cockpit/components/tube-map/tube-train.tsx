"use client";

import React, { memo } from "react";
import { STATION_MAP } from "./tube-map-data";
import type { TubeTrain as TubeTrainDef } from "./tube-map-data";

interface TubeTrainProps {
  train: TubeTrainDef;
  lineColor: string;
  /** Offset index for stacking multiple trains at same station */
  stackIndex: number;
}

export const TubeTrain = memo(function TubeTrain({ train, lineColor, stackIndex }: TubeTrainProps) {
  const station = STATION_MAP.get(train.currentStation);
  if (!station) return null;

  // Offset trains slightly so they don't overlap at same station
  const offsetX = (stackIndex % 4) * 5 - 7.5;
  const offsetY = Math.floor(stackIndex / 4) * 5 + 16; // Below station

  const statusClass =
    train.status === "error" ? "train-error" :
    train.status === "stuck" ? "train-stuck" :
    train.status === "moving" ? "train-moving" : "";

  return (
    <div
      className={`tube-train ${statusClass}`}
      style={{
        left: `${station.x}%`,
        top: `${station.y}%`,
        marginLeft: `${offsetX}px`,
        marginTop: `${offsetY}px`,
        "--train-color": lineColor,
      } as React.CSSProperties}
      title={`${train.title} — ${train.status}`}
    />
  );
});
