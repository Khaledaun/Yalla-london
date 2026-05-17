import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { BRAND, FONT_FAMILIES, TricolorBar } from "../brand";

/**
 * BrandOutro — 90 frames (3 sec)
 * Fade to navy → stamp + wordmark → URL → tricolor bar → hold
 */
export const BrandOutro: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade in from black overlay (frame 0-20)
  const overlayOpacity = interpolate(frame, [0, 20], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Stamp + wordmark (frame 15-40)
  const centerOpacity = interpolate(frame, [15, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL (frame 35-55)
  const urlOpacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
      {/* Fade overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: overlayOpacity,
          zIndex: 10,
        }}
      />

      {/* Center content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          opacity: centerOpacity,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile("yalla-stamp-500.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontFamily: FONT_FAMILIES.display,
              fontWeight: 700,
              fontSize: 28,
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
              fontSize: 28,
              letterSpacing: "0.08em",
              color: BRAND.colors.red,
            }}
          >
            LONDON
          </span>
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          fontFamily: FONT_FAMILIES.mono,
          fontSize: 12,
          color: BRAND.colors.gray,
          opacity: urlOpacity,
        }}
      >
        yalla-london.com
      </div>

      {/* Tricolor bar at bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <TricolorBar startFrame={50} />
      </div>
    </div>
  );
};
