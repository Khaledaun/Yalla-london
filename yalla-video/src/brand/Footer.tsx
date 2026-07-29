import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { BRAND } from "./tokens";
import { FONT_FAMILIES } from "./fonts";

interface FooterProps {
  startFrame?: number;
}

export const Footer: React.FC<FooterProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);

  const opacity = interpolate(f, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: FONT_FAMILIES.mono,
        fontSize: 10,
        color: BRAND.colors.gray,
        textAlign: "center",
        opacity,
      }}
    >
      yalla-london.com
    </div>
  );
};
