import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "./tokens";
import { FONT_FAMILIES } from "./fonts";

interface KickerProps {
  text: string;
  startFrame?: number;
  color?: string;
}

export const Kicker: React.FC<KickerProps> = ({
  text,
  startFrame = 0,
  color = BRAND.colors.gold,
}) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  const opacity = interpolate(f, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(f, [0, 12], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: FONT_FAMILIES.mono,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {text}
    </div>
  );
};
