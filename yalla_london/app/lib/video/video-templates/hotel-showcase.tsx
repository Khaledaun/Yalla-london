/**
 * Hotel Showcase — Remotion Video Template
 *
 * A pre-built composition for featuring hotels and properties.
 * Features cross-fade image carousel, price/rating overlays,
 * and a "Book Now" CTA at the end. Brand colors throughout.
 *
 * Duration: 15 seconds (450 frames @ 30fps)
 * Scenes: Exterior (0-4s) → Room (4-8s) → Amenities (8-12s) → Book CTA (12-15s)
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

interface HotelShowcaseProps {
  /** Hotel/property images (up to 4) */
  images: string[];
  /** Hotel name */
  hotelName: string;
  /** Star rating (1-5) */
  rating?: number;
  /** Price text (e.g. "From $299/night") */
  priceText?: string;
  /** Amenity labels */
  amenities?: string[];
  /** Brand colors */
  brandColors: { primary: string; secondary: string; accent: string };
  /** Site display name */
  siteName: string;
  /** Language for RTL support */
  language?: "en" | "ar";
}

// ─── Constants ──────────────────────────────────────────────────

const SCENE_FRAMES = 120; // 4s per scene
const CROSSFADE_FRAMES = 15; // 0.5s crossfade

// ─── Component ──────────────────────────────────────────────────

export const HotelShowcase: React.FC<HotelShowcaseProps> = ({
  images,
  hotelName,
  rating = 5,
  priceText,
  amenities = [],
  brandColors,
  siteName,
  language = "en",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isRTL = language === "ar";
  const displayImages = images.slice(0, 4);
  const stars = "\u2605".repeat(Math.min(rating, 5));

  // Scene timings
  const scene2Start = SCENE_FRAMES;
  const scene3Start = SCENE_FRAMES * 2;
  const ctaStart = SCENE_FRAMES * 3;
  const ctaDuration = durationInFrames - ctaStart;

  return (
    <AbsoluteFill style={{ backgroundColor: brandColors.primary }}>
      {/* ── Scene 1: Exterior / Hero Image (0 - 4s) ── */}
      <Sequence from={0} durationInFrames={SCENE_FRAMES + CROSSFADE_FRAMES}>
        <HeroScene
          src={displayImages[0]}
          frame={frame}
          fps={fps}
          hotelName={hotelName}
          stars={stars}
          brandColors={brandColors}
          isRTL={isRTL}
        />
      </Sequence>

      {/* ── Scene 2: Room / Interior (4 - 8s) ── */}
      <Sequence from={scene2Start} durationInFrames={SCENE_FRAMES + CROSSFADE_FRAMES}>
        <RoomScene
          src={displayImages[1]}
          frame={frame - scene2Start}
          fps={fps}
          priceText={priceText}
          brandColors={brandColors}
          isRTL={isRTL}
        />
      </Sequence>

      {/* ── Scene 3: Amenities (8 - 12s) ── */}
      <Sequence from={scene3Start} durationInFrames={SCENE_FRAMES + CROSSFADE_FRAMES}>
        <AmenitiesScene
          src={displayImages[2]}
          frame={frame - scene3Start}
          fps={fps}
          amenities={amenities}
          brandColors={brandColors}
          isRTL={isRTL}
        />
      </Sequence>

      {/* ── Scene 4: Book Now CTA (12 - 15s) ── */}
      <Sequence from={ctaStart} durationInFrames={ctaDuration}>
        <BookingCTA
          frame={frame - ctaStart}
          fps={fps}
          duration={ctaDuration}
          hotelName={hotelName}
          siteName={siteName}
          brandColors={brandColors}
          isRTL={isRTL}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─── Hero Scene ─────────────────────────────────────────────────

const HeroScene: React.FC<{
  src?: string;
  frame: number;
  fps: number;
  hotelName: string;
  stars: string;
  brandColors: { primary: string; secondary: string };
  isRTL: boolean;
}> = ({ src, frame, fps, hotelName, stars, brandColors, isRTL }) => {
  // Cross-fade in
  const fadeIn = interpolate(frame, [0, CROSSFADE_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Ken Burns zoom
  const scale = interpolate(frame, [0, SCENE_FRAMES], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });

  // Title animation
  const titleSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 12, stiffness: 100 },
  });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  // Stars fade
  const starsOpacity = interpolate(frame, [fps * 0.5, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {src ? (
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: brandColors.primary }} />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: isRTL ? undefined : "5%",
          right: isRTL ? "5%" : undefined,
          direction: isRTL ? "rtl" : "ltr",
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: "#FFFFFF",
            textShadow: "0 2px 15px rgba(0,0,0,0.5)",
            transform: `translateY(${titleY}px)`,
            opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          }}
        >
          {hotelName}
        </div>
        <div
          style={{
            fontSize: 22,
            color: brandColors.secondary,
            marginTop: 6,
            opacity: starsOpacity,
            letterSpacing: 4,
          }}
        >
          {stars}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Room Scene ─────────────────────────────────────────────────

const RoomScene: React.FC<{
  src?: string;
  frame: number;
  fps: number;
  priceText?: string;
  brandColors: { primary: string; secondary: string };
  isRTL: boolean;
}> = ({ src, frame, fps, priceText, brandColors, isRTL }) => {
  // Cross-fade in
  const fadeIn = interpolate(frame, [0, CROSSFADE_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Gentle pan
  const translateX = interpolate(frame, [0, SCENE_FRAMES], [0, isRTL ? 10 : -10], {
    extrapolateRight: "clamp",
  });

  // Price badge animation
  const badgeSpring = spring({
    frame: Math.max(0, frame - fps * 0.3),
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {src ? (
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(1.05) translateX(${translateX}px)`,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)",
        }}
      />
      {/* Room label */}
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: "#FFFFFF",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            opacity: interpolate(frame, [fps * 0.2, fps * 0.6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {isRTL ? "أجنحة فاخرة" : "Elegant Suites"}
        </div>
      </div>
      {/* Price badge */}
      {priceText && (
        <div
          style={{
            position: "absolute",
            top: "8%",
            right: isRTL ? undefined : "5%",
            left: isRTL ? "5%" : undefined,
            backgroundColor: brandColors.secondary,
            color: "#FFFFFF",
            fontSize: 16,
            fontWeight: 700,
            padding: "8px 18px",
            borderRadius: 20,
            transform: `scale(${interpolate(badgeSpring, [0, 1], [0, 1])})`,
            opacity: interpolate(badgeSpring, [0, 1], [0, 1]),
          }}
        >
          {priceText}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Amenities Scene ────────────────────────────────────────────

const AmenitiesScene: React.FC<{
  src?: string;
  frame: number;
  fps: number;
  amenities: string[];
  brandColors: { primary: string; secondary: string };
  isRTL: boolean;
}> = ({ src, frame, fps, amenities, brandColors, isRTL }) => {
  const fadeIn = interpolate(frame, [0, CROSSFADE_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
  });

  const displayAmenities = amenities.length > 0
    ? amenities.slice(0, 4)
    : isRTL
      ? ["مسبح لا متناهي", "سبا فاخر", "مطاعم راقية", "خدمة غرف"]
      : ["Infinity Pool", "Luxury Spa", "Fine Dining", "Room Service"];

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {src ? (
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: brandColors.primary }} />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `${brandColors.primary}CC`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          direction: isRTL ? "rtl" : "ltr",
          padding: "0 8%",
        }}
      >
        {/* Section title */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#FFFFFF",
            marginBottom: 30,
            opacity: interpolate(frame, [0, fps * 0.3], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {isRTL ? "مرافق عالمية" : "World-Class Amenities"}
        </div>
        {/* Amenity list */}
        {displayAmenities.map((item, i) => {
          const delay = fps * 0.2 * (i + 1);
          const itemSpring = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 12, stiffness: 100 },
          });
          return (
            <div
              key={i}
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.9)",
                marginBottom: 14,
                textAlign: "center",
                opacity: interpolate(itemSpring, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(
                  itemSpring,
                  [0, 1],
                  [isRTL ? -30 : 30, 0],
                )}px)`,
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Booking CTA ────────────────────────────────────────────────

const BookingCTA: React.FC<{
  frame: number;
  fps: number;
  duration: number;
  hotelName: string;
  siteName: string;
  brandColors: { primary: string; secondary: string };
  isRTL: boolean;
}> = ({ frame, fps, duration, hotelName, siteName, brandColors, isRTL }) => {
  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  const headingSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const btnSpring = spring({
    frame: Math.max(0, frame - fps * 0.4),
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  const siteOpacity = interpolate(
    frame,
    [fps * 0.7, fps * 1.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Fade out at end
  const fadeOut = interpolate(
    frame,
    [duration - fps * 0.3, duration],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${brandColors.primary} 0%, ${darken(brandColors.primary, 35)} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeIn * fadeOut,
        direction: isRTL ? "rtl" : "ltr",
      }}
    >
      {/* Hotel name */}
      <div
        style={{
          fontSize: 24,
          color: brandColors.secondary,
          marginBottom: 12,
          opacity: interpolate(headingSpring, [0, 1], [0, 1]),
        }}
      >
        {hotelName}
      </div>
      {/* Book heading */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 700,
          color: "#FFFFFF",
          transform: `translateY(${interpolate(headingSpring, [0, 1], [30, 0])}px)`,
          textAlign: "center",
        }}
      >
        {isRTL ? "احجز إقامتك" : "Book Your Stay"}
      </div>
      {/* CTA button */}
      <div
        style={{
          marginTop: 30,
          backgroundColor: brandColors.secondary,
          borderRadius: 30,
          padding: "14px 48px",
          transform: `scale(${interpolate(btnSpring, [0, 1], [0, 1])})`,
          opacity: interpolate(btnSpring, [0, 1], [0, 1]),
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#FFFFFF",
            textAlign: "center",
          }}
        >
          {isRTL ? "احجز الآن" : "Reserve Now"}
        </div>
      </div>
      {/* Site name */}
      <div
        style={{
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          marginTop: 24,
          opacity: siteOpacity,
        }}
      >
        {siteName}
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
