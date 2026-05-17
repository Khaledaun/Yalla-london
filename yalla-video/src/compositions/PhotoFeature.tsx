import React from "react";
import {
  useCurrentFrame,
  interpolate,
  Img,
} from "remotion";
import {
  BRAND,
  FONT_FAMILIES,
  TricolorBar,
  Wordmark,
  Kicker,
  GoldRule,
} from "../brand";

/**
 * PhotoFeature — 450 frames (15 sec)
 * Photo top 55% with gradient overlay, brand content bottom 45%
 */
interface PhotoFeatureProps {
  mediaSrc: string;
  kicker: string;
  headline: string;
  body: string;
  [key: string]: unknown;
}

export const PhotoFeature: React.FC<PhotoFeatureProps> = ({
  mediaSrc,
  kicker,
  headline,
  body,
}) => {
  const frame = useCurrentFrame();

  // Headline (frame 50)
  const headlineY = interpolate(frame, [50, 70], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Body (frame 70)
  const bodyOpacity = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // CTA (frame 90)
  const ctaOpacity = interpolate(frame, [90, 110], [0, 1], {
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
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Photo — top 55% */}
      <div style={{ position: "relative", height: "55%", overflow: "hidden" }}>
        <Img
          src={mediaSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Gradient overlay — transparent to navy */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, transparent 40%, ${BRAND.colors.navy} 100%)`,
          }}
        />
        {/* Tricolor bar over image */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <TricolorBar startFrame={0} />
        </div>
        {/* Wordmark over image */}
        <div style={{ position: "absolute", top: 16, left: 24 }}>
          <Wordmark startFrame={0} size="sm" variant="dark" />
        </div>
      </div>

      {/* Content — bottom 45% */}
      <div
        style={{
          flex: 1,
          padding: "0 48px 48px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <Kicker text={kicker} startFrame={30} />
        <GoldRule startFrame={40} />

        <div
          style={{
            fontFamily: FONT_FAMILIES.display,
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1.1,
            color: BRAND.colors.white,
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            whiteSpace: "pre-line",
          }}
        >
          {headline}
        </div>

        <div
          style={{
            fontFamily: FONT_FAMILIES.body,
            fontSize: 18,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.7)",
            opacity: bodyOpacity,
          }}
        >
          {body}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 16,
            alignSelf: "flex-start",
            backgroundColor: BRAND.colors.red,
            color: BRAND.colors.white,
            fontFamily: FONT_FAMILIES.display,
            fontWeight: 600,
            fontSize: 16,
            padding: "12px 28px",
            borderRadius: 8,
            opacity: ctaOpacity,
          }}
        >
          Read More →
        </div>
      </div>
    </div>
  );
};
