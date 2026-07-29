import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BRAND } from "./tokens";

interface TricolorBarProps {
  startFrame?: number;
}

export const TricolorBar: React.FC<TricolorBarProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const segments = [
    { color: BRAND.colors.red, delay: 0 },
    { color: BRAND.colors.gold, delay: 5 },
    { color: BRAND.colors.blue, delay: 10 },
  ];

  return (
    <div style={{ display: "flex", width: "100%", height: BRAND.tribar.height, gap: 0 }}>
      {segments.map(({ color, delay }, i) => {
        const progress = spring({
          frame: Math.max(0, f - delay),
          fps,
          config: { damping: 18, mass: 0.8 },
        });

        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: "100%",
              backgroundColor: color,
              transform: `scaleX(${progress})`,
              transformOrigin: "left center",
            }}
          />
        );
      })}
    </div>
  );
};
