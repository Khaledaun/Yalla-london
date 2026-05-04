import React from "react";
import { useCurrentFrame, spring, interpolate, useVideoConfig, Img, staticFile } from "remotion";
import { BRAND } from "./tokens";
import { FONT_FAMILIES } from "./fonts";

interface WordmarkProps {
  startFrame?: number;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
}

const SIZES = {
  sm: { stamp: 28, yalla: 18, london: 18, gap: 8 },
  md: { stamp: 36, yalla: 24, london: 24, gap: 10 },
  lg: { stamp: 56, yalla: 40, london: 40, gap: 14 },
} as const;

export const Wordmark: React.FC<WordmarkProps> = ({
  startFrame = 0,
  size = "md",
  variant = "light",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const s = SIZES[size];

  // Stamp scales in with spring
  const stampScale = spring({
    frame: f,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Text fades in 10 frames after stamp
  const textOpacity = interpolate(f, [10, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const parchmentColor = variant === "dark" ? BRAND.colors.cream : BRAND.colors.parchment;
  const redColor = BRAND.colors.red;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: s.gap }}>
      {/* Stamp */}
      <div
        style={{
          width: s.stamp,
          height: s.stamp,
          borderRadius: "50%",
          overflow: "hidden",
          transform: `scale(${stampScale})`,
          flexShrink: 0,
        }}
      >
        <Img
          src={staticFile("yalla-stamp-500.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Text */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, opacity: textOpacity }}>
        <span
          style={{
            fontFamily: FONT_FAMILIES.display,
            fontWeight: 700,
            fontSize: s.yalla,
            letterSpacing: "0.08em",
            color: parchmentColor,
          }}
        >
          YALLA
        </span>
        <span
          style={{
            fontFamily: FONT_FAMILIES.display,
            fontWeight: 700,
            fontSize: s.london,
            letterSpacing: "0.08em",
            color: redColor,
          }}
        >
          LONDON
        </span>
      </div>
    </div>
  );
};
