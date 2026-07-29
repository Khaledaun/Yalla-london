"use client";

import React, { memo } from "react";
import { STATION_MAP } from "./tube-map-data";
import type { TubeTrain as TubeTrainDef } from "./tube-map-data";

interface TubeTrainProps {
  train: TubeTrainDef;
  lineColor: string;
  stackIndex: number;
  onClick?: (articleId: string) => void;
}

export const TubeTrain = memo(function TubeTrain({ train, lineColor, stackIndex, onClick }: TubeTrainProps) {
  const station = STATION_MAP.get(train.currentStation);
  if (!station) return null;

  const offsetX = (stackIndex % 4) * 5 - 7.5;
  const offsetY = Math.floor(stackIndex / 4) * 5 + 16;

  const statusClass =
    train.status === "error" ? "train-error" :
    train.status === "stuck" ? "train-stuck" :
    train.status === "moving" ? "train-moving" : "";

  return (
    <button
      className={`tube-train ${statusClass} ${onClick ? "cursor-pointer pointer-events-auto" : ""}`}
      style={{
        left: `${station.x}%`,
        top: `${station.y}%`,
        marginLeft: `${offsetX}px`,
        marginTop: `${offsetY}px`,
        "--train-color": lineColor,
      } as React.CSSProperties}
      title={`${train.title} — ${train.status}`}
      onClick={() => onClick?.(train.articleId)}
      aria-label={`Article: ${train.title}`}
    />
  );
});
