import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";
import {
  BRAND,
  FONT_FAMILIES,
  TricolorBar,
  Wordmark,
  Kicker,
  GoldRule,
  Footer,
  SwipeUp,
} from "../brand";

/**
 * ContentPost — 450 frames (15 sec)
 * Navy bg with watermark, numbered list stagger animation
 */
interface ContentPostProps {
  kicker: string;
  headline: string;
  items: string[];
  [key: string]: unknown;
}

export const ContentPost: React.FC<ContentPostProps> = ({
  kicker,
  headline,
  items,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline slide up (frame 50)
  const headlineY = interpolate(frame, [50, 70], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Divider (frame 70)
  const dividerOpacity = interpolate(frame, [70, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // SwipeUp + Footer (frame 380)
  const footerOpacity = interpolate(frame, [380, 395], [0, 1], {
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
        padding: "0 48px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(8deg)",
          opacity: 0.04,
        }}
      >
        <Img
          src={staticFile("yalla-watermark-500.png")}
          style={{ width: 400, height: 400, objectFit: "contain" }}
        />
      </div>

      {/* Tricolor bar */}
      <div style={{ marginTop: 0 }}>
        <TricolorBar startFrame={0} />
      </div>

      {/* Wordmark */}
      <div style={{ marginTop: 32 }}>
        <Wordmark startFrame={10} size="sm" variant="dark" />
      </div>

      {/* Kicker */}
      <div style={{ marginTop: 48 }}>
        <Kicker text={kicker} startFrame={30} />
      </div>

      {/* Gold rule */}
      <div style={{ marginTop: 12 }}>
        <GoldRule startFrame={40} />
      </div>

      {/* Headline */}
      <div
        style={{
          marginTop: 20,
          fontFamily: FONT_FAMILIES.display,
          fontWeight: 700,
          fontSize: 48,
          lineHeight: 1.1,
          color: BRAND.colors.white,
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          whiteSpace: "pre-line",
        }}
      >
        {headline}
      </div>

      {/* Divider */}
      <div
        style={{
          marginTop: 24,
          height: 1,
          backgroundColor: BRAND.colors.gray,
          opacity: dividerOpacity * 0.3,
        }}
      />

      {/* Numbered items */}
      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        {items.map((item, i) => {
          const itemStart = 80 + i * 12;
          const itemOpacity = interpolate(frame, [itemStart, itemStart + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const itemY = interpolate(frame, [itemStart, itemStart + 12], [12, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                opacity: itemOpacity,
                transform: `translateY(${itemY}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT_FAMILIES.display,
                  fontWeight: 700,
                  fontSize: 28,
                  color: BRAND.colors.gold,
                  minWidth: 30,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: FONT_FAMILIES.body,
                  fontSize: 20,
                  color: BRAND.colors.cream,
                  lineHeight: 1.4,
                }}
              >
                {item}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom: SwipeUp + Footer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          paddingBottom: 48,
          opacity: footerOpacity,
        }}
      >
        <SwipeUp />
        <Footer startFrame={-999} />
      </div>
    </div>
  );
};
