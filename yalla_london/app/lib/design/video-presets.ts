/**
 * Video Template Presets per Destination
 *
 * Extends the existing Remotion video engine with
 * destination-specific scene configurations, transitions,
 * and animation styles tuned for viral short-form content.
 */

import type { DestinationTheme } from "./destination-themes";

export type VideoFormat = "reel" | "story" | "youtube-short" | "youtube-video" | "square" | "landscape";

export interface VideoTemplatePreset {
  id: string;
  name: string;
  nameAr: string;
  format: VideoFormat;
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
  viralHook: string;

  scenes: VideoScenePreset[];
}

export interface VideoScenePreset {
  id: string;
  name: string;
  durationSeconds: number;
  transition: "fade" | "slide-left" | "slide-up" | "zoom" | "blur" | "none";
  background: {
    type: "color" | "gradient" | "image" | "video";
    value: string;
  };
  elements: VideoElementPreset[];
}

export interface VideoElementPreset {
  type: "text" | "image" | "badge" | "cta" | "timer" | "logo";
  position: { x: string; y: string };
  animation: "fade-in" | "slide-up" | "slide-left" | "scale-in" | "typewriter" | "bounce" | "none";
  animationDelay: number;
  style: Record<string, string>;
  content?: { text?: string; textAr?: string; placeholder?: string };
}

/**
 * Generate video presets for a destination theme
 */
export function generateVideoPresets(theme: DestinationTheme): VideoTemplatePreset[] {
  return [
    // ── 15s Reel: Destination Hook ──────────────
    {
      id: `${theme.id}-reel-hook`,
      name: "Destination Hook Reel",
      nameAr: "ريل الخطاف",
      format: "reel",
      durationSeconds: 15,
      fps: 30,
      width: 1080,
      height: 1920,
      viralHook: "3-second hook + fast cuts + text overlay = algorithm-friendly",

      scenes: [
        {
          id: "hook",
          name: "Hook (0-3s)",
          durationSeconds: 3,
          transition: "none",
          background: { type: "gradient", value: theme.gradients.hero },
          elements: [
            {
              type: "text",
              position: { x: "10%", y: "35%" },
              animation: "scale-in",
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.displayFont,
                fontSize: "48px",
                fontWeight: "800",
                color: theme.colors.textOnPrimary,
                textAlign: "center",
              },
              content: { text: `POV: You just landed in ${theme.destination}`, textAr: `لحظة وصولك إلى ${theme.destination}` },
            },
          ],
        },
        {
          id: "montage-1",
          name: "Shot 1 (3-6s)",
          durationSeconds: 3,
          transition: "slide-left",
          background: { type: "image", value: "" },
          elements: [
            {
              type: "badge",
              position: { x: "8%", y: "80%" },
              animation: "slide-up",
              animationDelay: 0.3,
              style: {
                background: theme.colors.secondary,
                color: theme.colors.textOnSecondary,
                padding: "8px 16px",
                borderRadius: theme.shape.borderRadius.full,
                fontSize: "14px",
                fontWeight: "700",
              },
              content: { text: "Day 1", textAr: "اليوم 1" },
            },
          ],
        },
        {
          id: "montage-2",
          name: "Shot 2 (6-9s)",
          durationSeconds: 3,
          transition: "zoom",
          background: { type: "image", value: "" },
          elements: [
            {
              type: "text",
              position: { x: "10%", y: "75%" },
              animation: "fade-in",
              animationDelay: 0.2,
              style: {
                fontFamily: theme.typography.headingFont,
                fontSize: "28px",
                fontWeight: "700",
                color: "#FFFFFF",
                textShadow: "0 2px 12px rgba(0,0,0,0.6)",
              },
              content: { text: "Wait for it...", textAr: "انتظر..." },
            },
          ],
        },
        {
          id: "reveal",
          name: "Reveal (9-12s)",
          durationSeconds: 3,
          transition: "slide-up",
          background: { type: "image", value: "" },
          elements: [
            {
              type: "text",
              position: { x: "10%", y: "40%" },
              animation: "scale-in",
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.displayFont,
                fontSize: "36px",
                fontWeight: "800",
                color: "#FFFFFF",
                textAlign: "center",
                textShadow: "0 4px 16px rgba(0,0,0,0.5)",
              },
              content: { text: "This place is unreal 🤯", textAr: "هذا المكان لا يُصدق 🤯" },
            },
          ],
        },
        {
          id: "cta",
          name: "CTA (12-15s)",
          durationSeconds: 3,
          transition: "fade",
          background: { type: "gradient", value: theme.gradients.hero },
          elements: [
            {
              type: "text",
              position: { x: "10%", y: "30%" },
              animation: "fade-in",
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.headingFont,
                fontSize: "28px",
                fontWeight: "700",
                color: theme.colors.textOnPrimary,
                textAlign: "center",
              },
              content: { text: "Full guide in bio ↑", textAr: "الدليل الكامل في البايو ↑" },
            },
            {
              type: "cta",
              position: { x: "20%", y: "55%" },
              animation: "bounce",
              animationDelay: 0.5,
              style: {
                background: theme.gradients.cta,
                color: theme.colors.textOnSecondary,
                padding: "14px 32px",
                borderRadius: theme.shape.borderRadius.full,
                fontWeight: "800",
                fontSize: "18px",
              },
              content: { text: "Follow for more", textAr: "تابع للمزيد" },
            },
            {
              type: "logo",
              position: { x: "35%", y: "80%" },
              animation: "fade-in",
              animationDelay: 1,
              style: { fontSize: "16px", color: `${theme.colors.textOnPrimary}88`, fontWeight: "700" },
              content: { text: theme.name },
            },
          ],
        },
      ],
    },

    // ── 30s YouTube Short: Top 3 Countdown ──────
    {
      id: `${theme.id}-countdown`,
      name: "Top 3 Countdown",
      nameAr: "عد تنازلي لأفضل 3",
      format: "youtube-short",
      durationSeconds: 30,
      fps: 30,
      width: 1080,
      height: 1920,
      viralHook: "Countdown creates suspense — viewers watch to the end to see #1",

      scenes: [
        {
          id: "intro",
          name: "Intro (0-5s)",
          durationSeconds: 5,
          transition: "none",
          background: { type: "gradient", value: theme.gradients.hero },
          elements: [
            {
              type: "text",
              position: { x: "10%", y: "35%" },
              animation: "typewriter",
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.displayFont,
                fontSize: "40px",
                fontWeight: "800",
                color: theme.colors.textOnPrimary,
                textAlign: "center",
              },
              content: { text: `Top 3 places in ${theme.destination}\nyou NEED to visit`, textAr: `أفضل 3 أماكن في ${theme.destination}\nيجب أن تزورها` },
            },
          ],
        },
        ...[3, 2, 1].map((n, i) => ({
          id: `place-${n}`,
          name: `#${n} (${5 + i * 7}-${12 + i * 7}s)`,
          durationSeconds: 7,
          transition: "slide-up" as const,
          background: { type: "image" as const, value: "" },
          elements: [
            {
              type: "timer" as const,
              position: { x: "8%", y: "8%" },
              animation: "scale-in" as const,
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.displayFont,
                fontSize: "72px",
                fontWeight: "800",
                color: theme.colors.secondary,
                textShadow: "0 4px 16px rgba(0,0,0,0.5)",
              },
              content: { text: `#${n}` },
            },
            {
              type: "text" as const,
              position: { x: "8%", y: "75%" },
              animation: "slide-up" as const,
              animationDelay: 0.5,
              style: {
                fontFamily: theme.typography.headingFont,
                fontSize: "28px",
                fontWeight: "700",
                color: "#FFFFFF",
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              },
              content: { text: `Place Name #${n}`, textAr: `اسم المكان #${n}` },
            },
          ],
        })),
        {
          id: "outro",
          name: "Outro (26-30s)",
          durationSeconds: 4,
          transition: "fade",
          background: { type: "gradient", value: theme.gradients.hero },
          elements: [
            {
              type: "text",
              position: { x: "10%", y: "30%" },
              animation: "fade-in",
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.headingFont,
                fontSize: "24px",
                fontWeight: "600",
                color: theme.colors.textOnPrimary,
                textAlign: "center",
              },
              content: { text: "Which one are you visiting first? 👇", textAr: "أي واحد ستزوره أولاً؟ 👇" },
            },
            {
              type: "logo",
              position: { x: "30%", y: "70%" },
              animation: "fade-in",
              animationDelay: 1,
              style: { fontSize: "18px", color: theme.colors.textOnPrimary, fontWeight: "700" },
              content: { text: theme.name },
            },
          ],
        },
      ],
    },

    // ── Square Promo (60s) ──────────────────────
    {
      id: `${theme.id}-square-promo`,
      name: "Product Promo Square",
      nameAr: "فيديو ترويجي مربع",
      format: "square",
      durationSeconds: 15,
      fps: 30,
      width: 1080,
      height: 1080,
      viralHook: "Square format works on all platforms. Product focus drives purchase intent.",

      scenes: [
        {
          id: "product-intro",
          name: "Product Intro (0-5s)",
          durationSeconds: 5,
          transition: "none",
          background: { type: "gradient", value: theme.gradients.hero },
          elements: [
            {
              type: "badge",
              position: { x: "30%", y: "15%" },
              animation: "scale-in",
              animationDelay: 0,
              style: {
                background: theme.colors.secondary,
                color: theme.colors.textOnSecondary,
                padding: "8px 20px",
                borderRadius: theme.shape.borderRadius.full,
                fontWeight: "700",
                fontSize: "14px",
                textTransform: "uppercase",
              },
              content: { text: "NEW GUIDE", textAr: "دليل جديد" },
            },
            {
              type: "text",
              position: { x: "8%", y: "35%" },
              animation: "slide-up",
              animationDelay: 0.3,
              style: {
                fontFamily: theme.typography.displayFont,
                fontSize: "36px",
                fontWeight: "800",
                color: theme.colors.textOnPrimary,
                textAlign: "center",
              },
              content: { text: `${theme.destination}\nTravel Guide 2026`, textAr: `دليل سفر\n${theme.destination} 2026` },
            },
          ],
        },
        {
          id: "features",
          name: "Features (5-10s)",
          durationSeconds: 5,
          transition: "slide-left",
          background: { type: "color", value: theme.colors.surface },
          elements: [
            {
              type: "text",
              position: { x: "8%", y: "20%" },
              animation: "slide-up",
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.headingFont,
                fontSize: "24px",
                fontWeight: "700",
                color: theme.colors.text,
              },
              content: { text: "What's inside:", textAr: "ماذا بالداخل:" },
            },
            {
              type: "text",
              position: { x: "8%", y: "40%" },
              animation: "slide-up",
              animationDelay: 0.5,
              style: {
                fontFamily: theme.typography.bodyFont,
                fontSize: "18px",
                color: theme.colors.textMuted,
                lineHeight: "2",
              },
              content: { text: "✓ Top 20 restaurants\n✓ Hidden gems map\n✓ Budget breakdown\n✓ Local tips", textAr: "✓ أفضل 20 مطعم\n✓ خريطة الأماكن المخفية\n✓ تفصيل الميزانية\n✓ نصائح محلية" },
            },
          ],
        },
        {
          id: "cta-scene",
          name: "CTA (10-15s)",
          durationSeconds: 5,
          transition: "zoom",
          background: { type: "gradient", value: theme.gradients.hero },
          elements: [
            {
              type: "text",
              position: { x: "10%", y: "25%" },
              animation: "fade-in",
              animationDelay: 0,
              style: {
                fontFamily: theme.typography.headingFont,
                fontSize: "28px",
                fontWeight: "700",
                color: theme.colors.textOnPrimary,
                textAlign: "center",
              },
              content: { text: "Get yours now", textAr: "احصل عليه الآن" },
            },
            {
              type: "cta",
              position: { x: "20%", y: "55%" },
              animation: "bounce",
              animationDelay: 0.5,
              style: {
                background: theme.gradients.cta,
                color: theme.colors.textOnSecondary,
                padding: "16px 36px",
                borderRadius: theme.shape.borderRadius.full,
                fontWeight: "800",
                fontSize: "20px",
              },
              content: { text: "Download Free →", textAr: "حمّل مجاناً ←" },
            },
            {
              type: "logo",
              position: { x: "35%", y: "80%" },
              animation: "fade-in",
              animationDelay: 1.5,
              style: { fontSize: "14px", color: `${theme.colors.textOnPrimary}77`, fontWeight: "600" },
              content: { text: theme.name },
            },
          ],
        },
      ],
    },
  ];
}

export function getVideoPresetsByFormat(presets: VideoTemplatePreset[], format: VideoFormat): VideoTemplatePreset[] {
  return presets.filter((p) => p.format === format);
}
