import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { BRAND, FONT_FAMILIES, TricolorBar, GoldRule } from "../brand";

/**
 * BrandIntro — 90 frames (3 sec)
 * Navy bg, tricolor wipe → stamp scale → wordmark type → gold rule → hold with glow
 */
export const BrandIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stamp scale (frame 15-40)
  const stampScale = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Wordmark opacity (frame 30-50)
  const wordmarkOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse on gold elements (frame 60-90)
  const glowPhase = Math.max(0, frame - 60);
  const glowOpacity = glowPhase > 0
    ? interpolate(Math.sin(glowPhase * 0.15) * 0.5 + 0.5, [0, 1], [0.3, 0.6])
    : 0;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BRAND.colors.navy,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Tricolor bar at top */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <TricolorBar startFrame={0} />
      </div>

      {/* Center content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Stamp */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            overflow: "hidden",
            transform: `scale(${stampScale})`,
          }}
        >
          <Img
            src={staticFile("yalla-stamp-500.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Wordmark text */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: wordmarkOpacity,
          }}
        >
          <span
            style={{
              fontFamily: FONT_FAMILIES.display,
              fontWeight: 700,
              fontSize: 36,
              letterSpacing: "0.08em",
              color: BRAND.colors.parchment,
            }}
          >
            YALLA
          </span>
          <span
            style={{
              fontFamily: FONT_FAMILIES.display,
              fontWeight: 700,
              fontSize: 36,
              letterSpacing: "0.08em",
              color: BRAND.colors.red,
            }}
          >
            LONDON
          </span>
        </div>

        {/* Gold rule */}
        <div style={{ filter: glowOpacity > 0 ? `drop-shadow(0 0 8px rgba(196,154,42,${glowOpacity}))` : "none" }}>
          <GoldRule startFrame={45} width={80} />
        </div>
      </div>
    </div>
  );
};
