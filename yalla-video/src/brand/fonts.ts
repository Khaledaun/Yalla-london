import { loadFont as loadAnybody } from "@remotion/google-fonts/Anybody";
import { loadFont as loadSourceSerif4 } from "@remotion/google-fonts/SourceSerif4";
import { loadFont as loadIBMPlexMono } from "@remotion/google-fonts/IBMPlexMono";

// Load brand fonts — call these at module level so they're available in all compositions
export const { fontFamily: anybodyFamily } = loadAnybody();
export const { fontFamily: sourceSerif4Family } = loadSourceSerif4();
export const { fontFamily: ibmPlexMonoFamily } = loadIBMPlexMono();

// Convenience map matching BRAND.fonts keys
export const FONT_FAMILIES = {
  display: anybodyFamily,
  body: sourceSerif4Family,
  mono: ibmPlexMonoFamily,
} as const;
