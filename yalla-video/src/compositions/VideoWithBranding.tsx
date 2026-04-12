import React from "react";
import {
  Sequence,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { BRAND } from "../brand";
import { BrandIntro } from "./BrandIntro";
import { BrandOutro } from "./BrandOutro";
import { StoryOverlay } from "./StoryOverlay";

/**
 * VideoWithBranding — variable duration
 * Sequences: BrandIntro (3s) → footage with StoryOverlay → BrandOutro (3s)
 */
interface VideoWithBrandingProps {
  footageSrc: string;
  footageDurationInFrames: number;
  headline?: string;
  kicker?: string;
  [key: string]: unknown;
}

const INTRO_FRAMES = 90; // 3s at 30fps
const OUTRO_FRAMES = 90; // 3s at 30fps

export const VideoWithBranding: React.FC<VideoWithBrandingProps> = ({
  footageSrc,
  footageDurationInFrames,
}) => {
  const footageStart = INTRO_FRAMES;
  const outroStart = INTRO_FRAMES + footageDurationInFrames;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: BRAND.colors.navy,
        position: "relative",
      }}
    >
      {/* 1. Brand Intro */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <BrandIntro />
      </Sequence>

      {/* 2. Footage */}
      <Sequence from={footageStart} durationInFrames={footageDurationInFrames}>
        <OffthreadVideo
          src={staticFile(footageSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Sequence>

      {/* 3. Overlay on top of footage */}
      <Sequence from={footageStart} durationInFrames={footageDurationInFrames}>
        <StoryOverlay durationInFrames={footageDurationInFrames} />
      </Sequence>

      {/* 4. Brand Outro */}
      <Sequence from={outroStart} durationInFrames={OUTRO_FRAMES}>
        <BrandOutro />
      </Sequence>
    </div>
  );
};

/**
 * Helper to calculate total composition duration.
 * totalFrames = 90 (intro) + footageDuration + 90 (outro)
 */
export function calcVideoWithBrandingDuration(footageDurationInFrames: number): number {
  return INTRO_FRAMES + footageDurationInFrames + OUTRO_FRAMES;
}
