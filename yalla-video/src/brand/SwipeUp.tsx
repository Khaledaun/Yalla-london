import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "./tokens";
import { FONT_FAMILIES } from "./fonts";

export const SwipeUp: React.FC = () => {
  const frame = useCurrentFrame();

  // Bouncing chevron — loops every 30 frames
  const cycle = frame % 30;
  const bounceY = interpolate(cycle, [0, 15, 30], [0, -6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(cycle, [0, 10, 20, 30], [0.6, 1, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        opacity,
        transform: `translateY(${bounceY}px)`,
      }}
    >
      {/* Chevron */}
      <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
        <path
          d="M2 10L10 2L18 10"
          stroke={BRAND.colors.gold}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          fontFamily: FONT_FAMILIES.mono,
          fontSize: 8,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: BRAND.colors.gold,
        }}
      >
        SWIPE UP
      </span>
    </div>
  );
};
