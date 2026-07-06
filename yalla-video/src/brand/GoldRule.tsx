import React from "react";
import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { BRAND } from "./tokens";

interface GoldRuleProps {
  startFrame?: number;
  width?: number;
}

export const GoldRule: React.FC<GoldRuleProps> = ({
  startFrame = 0,
  width = BRAND.goldRule.width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const progress = spring({
    frame: f,
    fps,
    config: { damping: 15, mass: 0.6 },
    durationInFrames: 15,
  });

  return (
    <div
      style={{
        width,
        height: BRAND.goldRule.height,
        backgroundColor: BRAND.colors.gold,
        transform: `scaleX(${progress})`,
        transformOrigin: "center center",
      }}
    />
  );
};
