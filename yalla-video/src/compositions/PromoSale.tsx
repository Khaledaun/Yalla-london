import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import {
  BRAND,
  FONT_FAMILIES,
  TricolorBar,
  Wordmark,
  Kicker,
  GoldRule,
  Footer,
} from "../brand";

/**
 * PromoSale — 450 frames (15 sec)
 * Red gradient bg, headline slam, date badge, CTA
 */
interface PromoSaleProps {
  kicker: string;
  headline: string;
  date: string;
  description: string;
  cta: string;
  [key: string]: unknown;
}

export const PromoSale: React.FC<PromoSaleProps> = ({
  kicker,
  headline,
  date,
  description,
  cta,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline slam (frame 50) — scale 1.2 → 1.0
  const headlineScale = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 12, mass: 1.2 },
    from: 1.2,
    to: 1,
  });
  const headlineOpacity = interpolate(frame, [50, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Date badge pop (frame 70)
  const badgeScale = spring({
    frame: Math.max(0, frame - 70),
    fps,
    config: { damping: 14 },
  });

  // Description (frame 90)
  const descOpacity = interpolate(frame, [90, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA button (frame 110)
  const ctaY = interpolate(frame, [110, 130], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaOpacity = interpolate(frame, [110, 125], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Footer (frame 380)
  const footerOpacity = interpolate(frame, [380, 395], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(160deg, ${BRAND.colors.red} 0%, #8b1f1c 50%, #1a0a08 100%)`,
        display: "flex",
        flexDirection: "column",
        padding: "0 48px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Tricolor bar */}
      <TricolorBar startFrame={0} />

      {/* Wordmark */}
      <div style={{ marginTop: 32 }}>
        <Wordmark startFrame={10} size="sm" variant="dark" />
      </div>

      {/* Kicker */}
      <div style={{ marginTop: 60 }}>
        <Kicker text={kicker} startFrame={30} />
      </div>

      {/* Gold rule */}
      <div style={{ marginTop: 12 }}>
        <GoldRule startFrame={40} />
      </div>

      {/* Headline — slam in */}
      <div
        style={{
          marginTop: 24,
          fontFamily: FONT_FAMILIES.display,
          fontWeight: 800,
          fontSize: 72,
          lineHeight: 1.0,
          color: BRAND.colors.white,
          opacity: headlineOpacity,
          transform: `scale(${headlineScale})`,
          transformOrigin: "left center",
          whiteSpace: "pre-line",
        }}
      >
        {headline}
      </div>

      {/* Date badge */}
      <div
        style={{
          marginTop: 24,
          alignSelf: "flex-start",
          backgroundColor: BRAND.colors.gold,
          color: BRAND.colors.charcoal,
          fontFamily: FONT_FAMILIES.mono,
          fontWeight: 700,
          fontSize: 14,
          padding: "10px 20px",
          borderRadius: 6,
          transform: `scale(${badgeScale})`,
          letterSpacing: "0.05em",
        }}
      >
        {date}
      </div>

      {/* Description */}
      <div
        style={{
          marginTop: 28,
          fontFamily: FONT_FAMILIES.body,
          fontSize: 22,
          lineHeight: 1.5,
          color: "rgba(255,255,255,0.8)",
          opacity: descOpacity,
          maxWidth: 800,
        }}
      >
        {description}
      </div>

      {/* CTA button */}
      <div
        style={{
          marginTop: 32,
          alignSelf: "flex-start",
          border: `2px solid ${BRAND.colors.white}`,
          borderRadius: 8,
          padding: "14px 36px",
          fontFamily: FONT_FAMILIES.display,
          fontWeight: 600,
          fontSize: 18,
          color: BRAND.colors.white,
          letterSpacing: "0.05em",
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
        }}
      >
        {cta}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          right: 0,
          opacity: footerOpacity,
        }}
      >
        <Footer startFrame={-999} />
      </div>
    </div>
  );
};
