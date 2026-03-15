/**
 * Destination Highlight — Remotion Video Template
 *
 * A pre-built composition for showcasing travel destinations.
 * Features Ken Burns zoom on images, animated titles, and branded
 * intro/outro sections. Supports RTL for Arabic content.
 *
 * Duration: 15 seconds (450 frames @ 30fps)
 * Scenes: Branded intro (0-1s) → Image showcase (1-12s) → Outro (12-15s)
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Img,
  interpolate,
  spring,
} from "remotion";

// ─── Props ──────────────────────────────────────────────────────

interface DestinationHighlightProps {
  /** URLs of destination images (up to 4) */
  images: string[];
  /** Main title text */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Brand colors */
  brandColors: { primary: string; secondary: string; accent: string };
  /** Optional logo image URL */
  logoUrl?: string;
  /** Site display name */
  siteName: string;
  /** Language for RTL support */
  language?: "en" | "ar";
}

// ─── Constants ──────────────────────────────────────────────────

const INTRO_DURATION = 30; // 1s
const SCENE_DURATION = 90; // 3s per image
const MAX_IMAGES = 4;

// ─── Component ──────────────────────────────────────────────────

export const DestinationHighlight: React.FC<DestinationHighlightProps> = ({
  images,
  title,
  subtitle,
  brandColors,
  logoUrl,
  siteName,
  language = "en",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isRTL = language === "ar";
  const displayImages = images.slice(0, MAX_IMAGES);
  const imageCount = Math.max(displayImages.length, 1);

  // Calculate scene boundaries
  const imageEnd = INTRO_DURATION + imageCount * SCENE_DURATION;
  const outroDuration = durationInFrames - imageEnd;

  return (
    <AbsoluteFill style={{ backgroundColor: brandColors.primary }}>
      {/* ── Scene 1: Branded Intro (0 - 1s) ── */}
      <Sequence from={0} durationInFrames={INTRO_DURATION + 15}>
        <IntroScene
          frame={frame}
          fps={fps}
          logoUrl={logoUrl}
          brandColors={brandColors}
        />
      </Sequence>

      {/* ── Scene 2: Image Showcase (1s - 12s) ── */}
      {displayImages.map((src, index) => {
        const sceneStart = INTRO_DURATION + index * SCENE_DURATION;
        return (
          <Sequence
            key={`img-${index}`}
            from={sceneStart}
            durationInFrames={SCENE_DURATION + 10}
          >
            <ImageScene
              src={src}
              frame={frame - sceneStart}
              fps={fps}
              duration={SCENE_DURATION}
              brandColors={brandColors}
              isRTL={isRTL}
              label={index === 0 ? title : undefined}
            />
          </Sequence>
        );
      })}

      {/* ── Title Overlay (appears during first image) ── */}
      <Sequence from={INTRO_DURATION} durationInFrames={SCENE_DURATION}>
        <TitleOverlay
          title={title}
          subtitle={subtitle}
          frame={frame - INTRO_DURATION}
          fps={fps}
          brandColors={brandColors}
          isRTL={isRTL}
        />
      </Sequence>

      {/* ── Scene 3: Outro (12s - 15s) ── */}
      <Sequence from={imageEnd} durationInFrames={outroDuration}>
        <OutroScene
          frame={frame - imageEnd}
          fps={fps}
          duration={outroDuration}
          siteName={siteName}
          brandColors={brandColors}
          isRTL={isRTL}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─── Intro Scene ────────────────────────────────────────────────

const IntroScene: React.FC<{
  frame: number;
  fps: number;
  logoUrl?: string;
  brandColors: { primary: string; secondary: string };
}> = ({ frame, fps, logoUrl, brandColors }) => {
  const logoOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            maxWidth: "40%",
            maxHeight: "20%",
            objectFit: "contain",
            opacity: logoOpacity,
            transform: `scale(${interpolate(logoScale, [0, 1], [0.8, 1])})`,
          }}
        />
      ) : (
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            backgroundColor: brandColors.secondary,
            opacity: logoOpacity,
            transform: `scale(${interpolate(logoScale, [0, 1], [0.8, 1])})`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// ─── Image Scene (Ken Burns) ────────────────────────────────────

const ImageScene: React.FC<{
  src: string;
  frame: number;
  fps: number;
  duration: number;
  brandColors: { primary: string };
  isRTL: boolean;
  label?: string;
}> = ({ src, frame, duration, brandColors, isRTL }) => {
  // Ken Burns: slow zoom from 1.0 to 1.12 over the scene duration
  const scale = interpolate(frame, [0, duration], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });

  // Gentle horizontal pan
  const translateX = interpolate(frame, [0, duration], [0, isRTL ? 15 : -15], {
    extrapolateRight: "clamp",
  });

  // Fade in at start
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translateX(${translateX}px)`,
        }}
      />
      {/* Dark gradient overlay for text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${brandColors.primary}CC 0%, transparent 40%)`,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Title Overlay ──────────────────────────────────────────────

const TitleOverlay: React.FC<{
  title: string;
  subtitle?: string;
  frame: number;
  fps: number;
  brandColors: { primary: string; secondary: string };
  isRTL: boolean;
}> = ({ title, subtitle, frame, fps, brandColors, isRTL }) => {
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const subtitleOpacity = interpolate(
    frame,
    [fps * 0.6, fps * 1.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "0 5% 12%",
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      <div
        style={{
          fontSize: 44,
          fontWeight: 700,
          color: "#FFFFFF",
          textAlign: isRTL ? "right" : "left",
          textShadow: "0 2px 20px rgba(0,0,0,0.6)",
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 20,
            fontWeight: 400,
            color: brandColors.secondary,
            textAlign: isRTL ? "right" : "left",
            marginTop: 8,
            opacity: subtitleOpacity,
          }}
        >
          {subtitle}
        </div>
      )}
      {/* Accent bar */}
      <div
        style={{
          width: interpolate(frame, [fps * 0.3, fps * 0.8], [0, 60], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 3,
          backgroundColor: brandColors.secondary,
          marginTop: 12,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Outro Scene ────────────────────────────────────────────────

const OutroScene: React.FC<{
  frame: number;
  fps: number;
  duration: number;
  siteName: string;
  brandColors: { primary: string; secondary: string };
  isRTL: boolean;
}> = ({ frame, fps, duration, siteName, brandColors, isRTL }) => {
  const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: "clamp",
  });

  const nameSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const nameY = interpolate(nameSpring, [0, 1], [30, 0]);

  const ctaOpacity = interpolate(
    frame,
    [fps * 0.5, fps * 1.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Fade out at the very end
  const fadeOut = interpolate(
    frame,
    [duration - fps * 0.3, duration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${brandColors.primary} 0%, ${darken(brandColors.primary, 40)} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeIn * fadeOut,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      <div
        style={{
          fontSize: 40,
          fontWeight: 700,
          color: "#FFFFFF",
          transform: `translateY(${nameY}px)`,
          textAlign: "center",
        }}
      >
        {siteName}
      </div>
      <div
        style={{
          fontSize: 18,
          color: brandColors.secondary,
          marginTop: 12,
          opacity: ctaOpacity,
          textAlign: "center",
        }}
      >
        {isRTL ? "اكتشف المزيد" : "Discover More"}
      </div>
    </AbsoluteFill>
  );
};

// ─── Helpers ────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return hex;
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
