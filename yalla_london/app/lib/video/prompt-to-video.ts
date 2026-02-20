/**
 * Prompt-to-Video Engine
 *
 * Turns admin text prompts into Remotion-compatible video compositions.
 * Uses AI (via @/lib/ai/provider) to generate React/Remotion component code
 * from a description, site brand profile, and format dimensions.
 *
 * Falls back to template-based generation when AI is unavailable.
 */

import { generateText } from "@/lib/ai/provider";
import { getBrandProfile, type BrandProfile } from "@/lib/design/brand-provider";
import { FORMAT_DIMENSIONS, type VideoFormat } from "@/lib/video/brand-video-engine";

// ─── Public Types ───────────────────────────────────────────────

export type VideoStyle = "cinematic" | "minimal" | "energetic" | "luxury" | "playful";

export interface VideoPrompt {
  /** Natural-language description of the desired video */
  description: string;
  /** Site ID (e.g. "yalla-london", "arabaldives") */
  site: string;
  /** Target platform format */
  format: VideoFormat;
  /** Content language */
  language: "en" | "ar";
  /** Optional image URLs to include in the composition */
  images?: string[];
  /** Visual style preset */
  style?: VideoStyle;
}

export interface VideoScene {
  description: string;
  duration: number;
  transition: string;
}

export interface GeneratedVideo {
  /** Complete React/Remotion component source code */
  compositionCode: string;
  /** Video metadata derived from the generation */
  metadata: {
    duration: number;
    fps: number;
    width: number;
    height: number;
    scenes: VideoScene[];
  };
}

// ─── Format Dimensions (extends brand-video-engine for any extras) ──

const EXTENDED_DIMENSIONS: Record<string, { width: number; height: number }> = {
  ...FORMAT_DIMENSIONS,
  "linkedin-post": { width: 1200, height: 627 },
};

function getDimensions(format: string): { width: number; height: number } {
  return EXTENDED_DIMENSIONS[format] ?? FORMAT_DIMENSIONS[format as VideoFormat] ?? { width: 1080, height: 1920 };
}

// ─── Style Descriptions ─────────────────────────────────────────

const STYLE_DIRECTIVES: Record<VideoStyle, string> = {
  cinematic:
    "Use slow, sweeping camera-like movements. Prefer dark overlays, dramatic text reveals, and elegant serif typography. Transitions should be smooth fades and slow zooms.",
  minimal:
    "Use clean whitespace, sharp geometric shapes, and simple fade transitions. Limit colors to the brand palette. Text should be large and legible with generous spacing.",
  energetic:
    "Use fast cuts, bold scale animations, and vibrant color pops. Text should bounce in with spring physics. Transitions should be snappy slide or zoom effects.",
  luxury:
    "Use gold/champagne accents, slow elegant reveals, and refined typography. Backgrounds should have subtle gradient overlays. Everything should feel premium and unhurried.",
  playful:
    "Use bouncy spring animations, rounded shapes, and bright accent colors. Text can rotate slightly or wobble. Transitions should have personality — slides with overshoot.",
};

// ─── Main Generation Function ───────────────────────────────────

/**
 * Generate a Remotion video composition from a natural-language prompt.
 *
 * 1. Resolves brand profile for the target site
 * 2. Determines dimensions from the requested format
 * 3. Builds an AI prompt requesting a complete Remotion React component
 * 4. Calls AI to generate the composition code
 * 5. Parses the response and extracts metadata
 * 6. Falls back to a template if AI is unavailable
 */
export async function generateVideoFromPrompt(
  prompt: VideoPrompt,
): Promise<GeneratedVideo> {
  const brand = loadBrandProfile(prompt.site);
  const { width, height } = getDimensions(prompt.format);
  const fps = 30;
  const isVertical = height > width;
  const styleDirective = STYLE_DIRECTIVES[prompt.style ?? "luxury"];

  // Build the AI prompt
  const aiPrompt = buildAIPrompt(prompt, brand, width, height, fps, isVertical, styleDirective);

  try {
    const raw = await generateText(aiPrompt, {
      maxTokens: 4000,
      temperature: 0.7,
      systemPrompt: SYSTEM_PROMPT,
    });

    const parsed = parseAIResponse(raw, width, height, fps);
    return parsed;
  } catch (err) {
    console.warn("[prompt-to-video] AI generation failed, using template fallback:", err instanceof Error ? err.message : String(err));
    return buildFallbackComposition(prompt, brand, width, height, fps);
  }
}

// ─── Brand Profile Loader ───────────────────────────────────────

function loadBrandProfile(siteId: string): BrandProfile {
  try {
    return getBrandProfile(siteId);
  } catch {
    console.warn(`[prompt-to-video] getBrandProfile failed for "${siteId}", using minimal fallback`);
    return {
      siteId,
      name: siteId,
      domain: `${siteId}.com`,
      colors: {
        primary: "#1A1A5E",
        secondary: "#C9A84C",
        accent: "#C9A84C",
        background: "#FAFAFA",
        surface: "#FFFFFF",
        text: "#1C1917",
        textLight: "#78716C",
        gradient: "linear-gradient(135deg, #1A1A5E 0%, #C9A84C 100%)",
      },
      fonts: {
        heading: { name: "Anybody", weights: [600, 700, 800] },
        body: { name: "Source Serif 4", weights: [400, 500, 600] },
        arabic: { name: "IBM Plex Sans Arabic", weights: [400, 500, 700] },
      },
      logo: {
        primary: `/images/brand/${siteId}/logo.svg`,
        light: `/images/brand/${siteId}/logo-light.svg`,
        icon: `/images/brand/${siteId}/icon.svg`,
        favicon: "/favicon.ico",
      },
      social: {},
      designTokens: {
        borderRadius: "8px",
        shadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem" },
      },
    };
  }
}

// ─── AI Prompt Construction ─────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Remotion (React video framework) developer. You generate complete, working React components that render as videos using the Remotion library.

CRITICAL RULES:
- Import ONLY from 'remotion': useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence, Img, interpolate, spring
- ALL animations MUST use interpolate() or spring() from Remotion — NEVER use CSS transitions, CSS animations, or CSS keyframes (they are forbidden in Remotion)
- Use Sequence components for timing scenes
- Use AbsoluteFill for positioning
- Export the component as a named export called "Composition"
- The component must accept no props (all data is hardcoded inside)
- Return ONLY the component code inside a code block, nothing else
- Include a JSON metadata comment at the top: // META: {"duration": N, "scenes": [...]}`;

function buildAIPrompt(
  prompt: VideoPrompt,
  brand: BrandProfile,
  width: number,
  height: number,
  fps: number,
  isVertical: boolean,
  styleDirective: string,
): string {
  const imageSection = prompt.images?.length
    ? `\nINCLUDE THESE IMAGES (use <Img src="URL" /> from remotion):\n${prompt.images.map((url, i) => `  ${i + 1}. ${url}`).join("\n")}`
    : "";

  const rtlNote = prompt.language === "ar"
    ? "\nIMPORTANT: This is Arabic (RTL) content. Set dir='rtl' and textAlign='right' on all text containers."
    : "";

  return `Generate a Remotion React video composition for:

DESCRIPTION: ${prompt.description}

BRAND:
- Site: ${brand.name}
- Primary color: ${brand.colors.primary}
- Secondary color: ${brand.colors.secondary}
- Accent color: ${brand.colors.accent}
- Heading font: ${brand.fonts.heading.name}
- Body font: ${brand.fonts.body.name}
${prompt.language === "ar" ? `- Arabic font: ${brand.fonts.arabic.name}` : ""}

VIDEO FORMAT:
- Width: ${width}px
- Height: ${height}px
- FPS: ${fps}
- Orientation: ${isVertical ? "vertical (portrait)" : "horizontal (landscape)"}
- Target duration: 15 seconds (${15 * fps} frames)

STYLE: ${prompt.style ?? "luxury"}
${styleDirective}
${imageSection}${rtlNote}

REQUIREMENTS:
1. Start with a metadata comment: // META: {"duration": 15, "scenes": [{"description": "...", "duration": N, "transition": "fade|slide|zoom"}]}
2. Use useCurrentFrame() and useVideoConfig() from 'remotion'
3. Use interpolate() for opacity, translateY, scale animations
4. Use spring() for bouncy/elastic effects
5. Use <Sequence from={frame} durationInFrames={frames}> for timing
6. Use <AbsoluteFill> for layers
7. All colors from the brand palette above
8. End with a branded outro showing the site name
9. Export as: export const Composition: React.FC = () => { ... }

Return ONLY the React component code in a single code block.`;
}

// ─── AI Response Parser ─────────────────────────────────────────

function parseAIResponse(
  raw: string,
  width: number,
  height: number,
  fps: number,
): GeneratedVideo {
  // Extract code block
  let code = raw;
  const codeBlockMatch = raw.match(/```(?:tsx?|jsx?|javascript|typescript)?\s*\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    code = codeBlockMatch[1].trim();
  }

  // Extract metadata comment
  let duration = 15;
  let scenes: VideoScene[] = [];

  const metaMatch = code.match(/\/\/\s*META:\s*(\{[\s\S]*?\})\s*\n/);
  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1]);
      if (typeof meta.duration === "number") duration = meta.duration;
      if (Array.isArray(meta.scenes)) {
        scenes = meta.scenes.map((s: Record<string, unknown>) => ({
          description: String(s.description ?? "Scene"),
          duration: Number(s.duration ?? 3),
          transition: String(s.transition ?? "fade"),
        }));
      }
    } catch {
      console.warn("[prompt-to-video] Failed to parse META comment from AI response");
    }
  }

  // If no scenes were parsed, create a default scene list
  if (scenes.length === 0) {
    scenes = [
      { description: "Intro", duration: 3, transition: "fade" },
      { description: "Main content", duration: 8, transition: "slide" },
      { description: "Outro", duration: 4, transition: "fade" },
    ];
  }

  return {
    compositionCode: code,
    metadata: {
      duration,
      fps,
      width,
      height,
      scenes,
    },
  };
}

// ─── Template-Based Fallback ────────────────────────────────────

/**
 * When AI is unavailable, generate a working Remotion composition
 * from a pre-built template with brand colors injected.
 */
function buildFallbackComposition(
  prompt: VideoPrompt,
  brand: BrandProfile,
  width: number,
  height: number,
  fps: number,
): GeneratedVideo {
  const totalFrames = 15 * fps;
  const isRTL = prompt.language === "ar";
  const fontFamily = isRTL ? brand.fonts.arabic.name : brand.fonts.heading.name;
  const bodyFont = isRTL ? brand.fonts.arabic.name : brand.fonts.body.name;
  const textDir = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "center";

  const title = prompt.description.length > 60
    ? prompt.description.slice(0, 57) + "..."
    : prompt.description;

  const imageElements = (prompt.images ?? [])
    .slice(0, 3)
    .map((url, i) => {
      const from = (i + 1) * 3 * fps;
      const dur = 3 * fps;
      return `
      <Sequence from={${from}} durationInFrames={${dur}}>
        <AbsoluteFill>
          <Img src="${url}" style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: \`scale(\${interpolate(frame - ${from}, [0, ${dur}], [1, 1.08], { extrapolateRight: 'clamp' })})\`,
          }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
          }} />
        </AbsoluteFill>
      </Sequence>`;
    })
    .join("\n");

  const code = `// META: {"duration": 15, "scenes": [{"description": "Branded intro", "duration": 3, "transition": "fade"}, {"description": "Content showcase", "duration": 9, "transition": "slide"}, {"description": "Branded outro", "duration": 3, "transition": "fade"}]}
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Img, interpolate, spring } from 'remotion';

export const Composition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Intro fade
  const introOpacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  // Outro fade
  const outroOpacity = interpolate(frame, [${totalFrames - fps * 2}, ${totalFrames - fps}], [0, 1], { extrapolateRight: 'clamp' });
  // Title slide up
  const titleY = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ backgroundColor: '${brand.colors.primary}' }}>
      {/* Scene 1: Branded intro */}
      <Sequence from={0} durationInFrames={${3 * fps}}>
        <AbsoluteFill style={{
          background: 'linear-gradient(135deg, ${brand.colors.primary} 0%, ${brand.colors.secondary} 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: introOpacity,
        }}>
          <div style={{
            fontSize: ${height > width ? 48 : 56},
            fontFamily: '${fontFamily}',
            fontWeight: 700,
            color: '#FFFFFF',
            textAlign: '${textAlign}',
            direction: '${textDir}',
            padding: '0 40px',
            transform: \`translateY(\${interpolate(titleY, [0, 1], [40, 0])}px)\`,
          }}>
            ${title}
          </div>
          <div style={{
            width: 60,
            height: 3,
            backgroundColor: '${brand.colors.secondary}',
            marginTop: 20,
            borderRadius: 2,
            transform: \`scaleX(\${interpolate(frame, [${fps * 0.5}, ${fps * 1.2}], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})\`,
          }} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Image showcase (if images provided) */}
      ${imageElements || `<Sequence from={${3 * fps}} durationInFrames={${9 * fps}}>
        <AbsoluteFill style={{
          background: '${brand.colors.primary}',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 32,
            fontFamily: '${bodyFont}',
            color: '${brand.colors.secondary}',
            textAlign: 'center',
            padding: '0 40px',
            opacity: interpolate(frame - ${3 * fps}, [0, fps], [0, 1], { extrapolateRight: 'clamp' }),
          }}>
            ${brand.name}
          </div>
        </AbsoluteFill>
      </Sequence>`}

      {/* Scene 3: Branded outro */}
      <Sequence from={${12 * fps}} durationInFrames={${3 * fps}}>
        <AbsoluteFill style={{
          background: 'linear-gradient(180deg, ${brand.colors.primary} 0%, ${darkenHex(brand.colors.primary, 30)} 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: outroOpacity,
        }}>
          <div style={{
            fontSize: 40,
            fontFamily: '${fontFamily}',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: 16,
          }}>
            ${brand.name}
          </div>
          <div style={{
            fontSize: 18,
            fontFamily: '${bodyFont}',
            color: '${brand.colors.secondary}',
          }}>
            www.${brand.domain}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
`;

  return {
    compositionCode: code,
    metadata: {
      duration: 15,
      fps,
      width,
      height,
      scenes: [
        { description: "Branded intro", duration: 3, transition: "fade" },
        { description: "Content showcase", duration: 9, transition: "slide" },
        { description: "Branded outro", duration: 3, transition: "fade" },
      ],
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function darkenHex(hex: string, amount: number): string {
  const cleaned = hex.replace("#", "");
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return hex;
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
