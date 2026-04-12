/**
 * Brand-Aware Video Template Engine
 *
 * Maps each site's brand profile (colors, fonts, destination) to
 * Remotion-compatible composition data. Generates per-site video
 * templates for social media, promotional, showcase, and story formats.
 */

import { SITES, type SiteConfig, getSiteDomain } from "@/config/sites";
import type { DesignBrandProfile } from "@/lib/pdf/brand-design-system";
import { getBrandProfile } from "@/lib/pdf/brand-design-system";

// ─── Video Template Types ─────────────────────────────────────────

export type VideoFormat =
  | "instagram-reel"    // 1080x1920  9:16
  | "instagram-post"    // 1080x1080  1:1
  | "instagram-story"   // 1080x1920  9:16
  | "youtube-short"     // 1080x1920  9:16
  | "youtube-video"     // 1920x1080  16:9
  | "tiktok"            // 1080x1920  9:16
  | "facebook-post"     // 1200x630   ~1.9:1
  | "twitter-post"      // 1200x675   16:9
  | "landscape-wide"    // 1920x1080  16:9
  | "square";           // 1080x1080  1:1

export type VideoCategory =
  | "destination-highlight"   // Scenic destination showcase
  | "blog-promo"             // Promote a blog post
  | "hotel-showcase"         // Hotel/property feature
  | "restaurant-feature"     // Restaurant/dining spotlight
  | "experience-promo"       // Activity/experience promotion
  | "seasonal-campaign"      // Ramadan, Eid, holidays
  | "listicle-countdown"     // "Top 5" countdown style
  | "travel-tip"             // Quick tip/advice
  | "before-after"           // Comparison/reveal
  | "testimonial";           // Review/quote showcase

export interface VideoTemplateConfig {
  id: string;
  name: string;
  nameAr: string;
  category: VideoCategory;
  format: VideoFormat;
  durationFrames: number;   // Total frames
  fps: number;              // Frames per second
  width: number;
  height: number;
  scenes: VideoScene[];
  audio?: {
    src?: string;           // Audio file URL
    volume?: number;
    startFrom?: number;     // Frame to start audio
  };
  siteId?: string;          // null = generic
  brand?: DesignBrandProfile;
}

export interface VideoScene {
  id: string;
  name: string;
  startFrame: number;
  durationFrames: number;
  transition?: {
    type: "fade" | "slide-left" | "slide-right" | "slide-up" | "zoom" | "wipe" | "none";
    durationFrames: number;
  };
  elements: VideoElement[];
  background: {
    type: "solid" | "gradient" | "image" | "video";
    color?: string;
    gradient?: { from: string; to: string; angle: number };
    image?: string;
    video?: string;
    overlay?: string;       // Semi-transparent overlay color
    overlayOpacity?: number;
  };
}

export interface VideoElement {
  id: string;
  type: "text" | "image" | "shape" | "logo" | "icon" | "counter";
  x: number;               // Percentage 0-100
  y: number;
  width: number;
  height: number;
  // Animation
  animation?: {
    enter?: AnimationConfig;
    exit?: AnimationConfig;
    loop?: AnimationConfig;
  };
  // Type-specific
  text?: VideoTextProps;
  image?: VideoImageProps;
  shape?: VideoShapeProps;
  counter?: VideoCounterProps;
}

export interface AnimationConfig {
  type: "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right"
    | "scale" | "rotate" | "bounce" | "typewriter" | "blur" | "none";
  durationFrames: number;
  delay?: number;           // Delay in frames
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring";
}

export interface VideoTextProps {
  content: string;
  contentAr?: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  alignment: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  shadow?: string;
  editable?: boolean;       // UI can modify this text
  maxLines?: number;
}

export interface VideoImageProps {
  src: string;
  alt: string;
  objectFit: "cover" | "contain" | "fill";
  borderRadius?: number;
  placeholder?: boolean;
  kenBurns?: {
    startScale: number;
    endScale: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
}

export interface VideoShapeProps {
  shapeType: "rectangle" | "circle" | "line" | "triangle";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface VideoCounterProps {
  from: number;
  to: number;
  prefix?: string;
  suffix?: string;
  fontSize: number;
  color: string;
  fontWeight: number;
}

// ─── Format Dimensions ───────────────────────────────────────────

export const FORMAT_DIMENSIONS: Record<VideoFormat, { width: number; height: number }> = {
  "instagram-reel":  { width: 1080, height: 1920 },
  "instagram-post":  { width: 1080, height: 1080 },
  "instagram-story": { width: 1080, height: 1920 },
  "youtube-short":   { width: 1080, height: 1920 },
  "youtube-video":   { width: 1920, height: 1080 },
  "tiktok":          { width: 1080, height: 1920 },
  "facebook-post":   { width: 1200, height: 630 },
  "twitter-post":    { width: 1200, height: 675 },
  "landscape-wide":  { width: 1920, height: 1080 },
  "square":          { width: 1080, height: 1080 },
};

// ─── Template Generator ──────────────────────────────────────────

/**
 * Generate a brand-aware video template for a given site and category
 */
export function generateVideoTemplate(
  siteId: string,
  category: VideoCategory,
  format: VideoFormat = "instagram-reel",
  options: {
    locale?: "en" | "ar";
    title?: string;
    subtitle?: string;
    images?: string[];
    duration?: number;       // seconds
  } = {},
): VideoTemplateConfig {
  const brand = getBrandProfile(siteId);
  const { width, height } = FORMAT_DIMENSIONS[format];
  const fps = 30;
  const durationSec = options.duration || getDefaultDuration(category);
  const durationFrames = durationSec * fps;
  const isRTL = options.locale === "ar";

  const generators: Record<VideoCategory, () => VideoScene[]> = {
    "destination-highlight": () => destinationHighlightScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "blog-promo": () => blogPromoScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "hotel-showcase": () => hotelShowcaseScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "restaurant-feature": () => restaurantFeatureScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "experience-promo": () => experiencePromoScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "seasonal-campaign": () => seasonalCampaignScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "listicle-countdown": () => listicleCountdownScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "travel-tip": () => travelTipScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "before-after": () => beforeAfterScenes(brand, width, height, fps, durationFrames, isRTL, options),
    "testimonial": () => testimonialScenes(brand, width, height, fps, durationFrames, isRTL, options),
  };

  const scenes = generators[category]();

  return {
    id: `${siteId}-${category}-${format}-${Date.now()}`,
    name: getCategoryName(category, "en"),
    nameAr: getCategoryName(category, "ar"),
    category,
    format,
    durationFrames,
    fps,
    width,
    height,
    scenes,
    siteId,
    brand,
  };
}

function getDefaultDuration(category: VideoCategory): number {
  const durations: Record<VideoCategory, number> = {
    "destination-highlight": 15,
    "blog-promo": 10,
    "hotel-showcase": 12,
    "restaurant-feature": 10,
    "experience-promo": 12,
    "seasonal-campaign": 15,
    "listicle-countdown": 20,
    "travel-tip": 8,
    "before-after": 10,
    "testimonial": 10,
  };
  return durations[category];
}

function getCategoryName(category: VideoCategory, lang: "en" | "ar"): string {
  const names: Record<VideoCategory, { en: string; ar: string }> = {
    "destination-highlight": { en: "Destination Highlight", ar: "أبرز الوجهات" },
    "blog-promo": { en: "Blog Promotion", ar: "ترويج المدونة" },
    "hotel-showcase": { en: "Hotel Showcase", ar: "عرض الفندق" },
    "restaurant-feature": { en: "Restaurant Feature", ar: "عرض المطعم" },
    "experience-promo": { en: "Experience Promo", ar: "ترويج التجربة" },
    "seasonal-campaign": { en: "Seasonal Campaign", ar: "حملة موسمية" },
    "listicle-countdown": { en: "Listicle Countdown", ar: "قائمة العد التنازلي" },
    "travel-tip": { en: "Travel Tip", ar: "نصيحة سفر" },
    "before-after": { en: "Before & After", ar: "قبل وبعد" },
    "testimonial": { en: "Testimonial", ar: "شهادة" },
  };
  return names[category]?.[lang] || category;
}

/**
 * List all available video template categories
 */
export function getAvailableVideoTemplates(): Array<{
  category: VideoCategory;
  name: string;
  nameAr: string;
  defaultDuration: number;
  supportedFormats: VideoFormat[];
}> {
  const categories: VideoCategory[] = [
    "destination-highlight", "blog-promo", "hotel-showcase",
    "restaurant-feature", "experience-promo", "seasonal-campaign",
    "listicle-countdown", "travel-tip", "before-after", "testimonial",
  ];

  return categories.map(cat => ({
    category: cat,
    name: getCategoryName(cat, "en"),
    nameAr: getCategoryName(cat, "ar"),
    defaultDuration: getDefaultDuration(cat),
    supportedFormats: Object.keys(FORMAT_DIMENSIONS) as VideoFormat[],
  }));
}

// ─── Scene Generators ────────────────────────────────────────────

type SceneOptions = {
  title?: string;
  subtitle?: string;
  images?: string[];
};

function destinationHighlightScenes(
  brand: DesignBrandProfile, w: number, h: number, fps: number, totalFrames: number, rtl: boolean, opts: SceneOptions,
): VideoScene[] {
  const sceneDur = Math.floor(totalFrames / 4);
  const title = opts.title || `Discover ${brand.destination}`;
  const images = opts.images || [];

  return [
    // Scene 1: Title card with gradient
    {
      id: "intro",
      name: "Title",
      startFrame: 0,
      durationFrames: sceneDur,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: {
        type: images[0] ? "image" : "gradient",
        image: images[0],
        gradient: { from: brand.colors.primary, to: brand.colors.secondary, angle: 135 },
        overlay: "rgba(0,0,0,0.4)",
        overlayOpacity: 0.4,
      },
      elements: [
        {
          id: "logo", type: "logo", x: 38, y: 5, width: 24, height: 8,
          animation: { enter: { type: "fade", durationFrames: fps, easing: "ease-out" } },
        },
        {
          id: "title", type: "text", x: 10, y: 35, width: 80, height: 20,
          animation: { enter: { type: "slide-up", durationFrames: fps, delay: Math.floor(fps * 0.3), easing: "spring" } },
          text: {
            content: title,
            fontSize: h > w ? 48 : 56,
            fontFamily: brand.fonts.heading,
            fontWeight: 700,
            color: "#FFFFFF",
            alignment: "center",
            textTransform: "uppercase",
            letterSpacing: 2,
            shadow: "0 2px 20px rgba(0,0,0,0.5)",
            editable: true,
          },
        },
        {
          id: "subtitle", type: "text", x: 15, y: 58, width: 70, height: 8,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.6), easing: "ease-out" } },
          text: {
            content: opts.subtitle || `Your luxury guide to ${brand.destination}`,
            fontSize: 20,
            fontFamily: brand.fonts.body,
            fontWeight: 400,
            color: "rgba(255,255,255,0.9)",
            alignment: "center",
            editable: true,
          },
        },
      ],
    },
    // Scene 2: Image showcase 1
    {
      id: "showcase-1",
      name: "Showcase 1",
      startFrame: sceneDur,
      durationFrames: sceneDur,
      transition: { type: "slide-left", durationFrames: Math.floor(fps * 0.4) },
      background: {
        type: images[1] ? "image" : "solid",
        image: images[1],
        color: brand.colors.primary,
        overlay: "rgba(0,0,0,0.3)",
        overlayOpacity: 0.3,
      },
      elements: [
        {
          id: "highlight-text", type: "text", x: 8, y: 70, width: 84, height: 15,
          animation: { enter: { type: "slide-up", durationFrames: fps, easing: "spring" } },
          text: {
            content: "Luxury Experiences",
            fontSize: 36,
            fontFamily: brand.fonts.heading,
            fontWeight: 700,
            color: "#FFFFFF",
            alignment: rtl ? "right" : "left",
            shadow: "0 2px 15px rgba(0,0,0,0.6)",
            editable: true,
          },
        },
        {
          id: "accent-bar", type: "shape", x: 8, y: 88, width: 20, height: 0.5,
          animation: { enter: { type: "slide-right", durationFrames: Math.floor(fps * 0.6), delay: Math.floor(fps * 0.3) } },
          shape: { shapeType: "rectangle", fill: brand.colors.secondary, borderRadius: 4 },
        },
      ],
    },
    // Scene 3: Image showcase 2
    {
      id: "showcase-2",
      name: "Showcase 2",
      startFrame: sceneDur * 2,
      durationFrames: sceneDur,
      transition: { type: "zoom", durationFrames: Math.floor(fps * 0.5) },
      background: {
        type: images[2] ? "image" : "gradient",
        image: images[2],
        gradient: { from: brand.colors.secondary, to: brand.colors.primary, angle: 225 },
        overlay: "rgba(0,0,0,0.35)",
        overlayOpacity: 0.35,
      },
      elements: [
        {
          id: "feature-text", type: "text", x: 8, y: 72, width: 84, height: 12,
          animation: { enter: { type: "fade", durationFrames: fps, easing: "ease-out" } },
          text: {
            content: "Unforgettable Moments",
            fontSize: 32,
            fontFamily: brand.fonts.heading,
            fontWeight: 600,
            color: "#FFFFFF",
            alignment: "center",
            editable: true,
          },
        },
      ],
    },
    // Scene 4: CTA outro
    {
      id: "cta",
      name: "Call to Action",
      startFrame: sceneDur * 3,
      durationFrames: totalFrames - sceneDur * 3,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: {
        type: "gradient",
        gradient: { from: brand.colors.primary, to: darken(brand.colors.primary, 30), angle: 180 },
      },
      elements: [
        {
          id: "cta-logo", type: "logo", x: 30, y: 15, width: 40, height: 12,
          animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } },
        },
        {
          id: "cta-text", type: "text", x: 10, y: 40, width: 80, height: 15,
          animation: { enter: { type: "slide-up", durationFrames: fps, delay: Math.floor(fps * 0.2), easing: "spring" } },
          text: {
            content: `Visit ${brand.siteName}`,
            fontSize: 40,
            fontFamily: brand.fonts.heading,
            fontWeight: 700,
            color: "#FFFFFF",
            alignment: "center",
            editable: true,
          },
        },
        {
          id: "cta-url", type: "text", x: 15, y: 58, width: 70, height: 6,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.5), easing: "ease-out" } },
          text: {
            content: getSiteDomain(brand.siteId),
            fontSize: 18,
            fontFamily: brand.fonts.body,
            fontWeight: 400,
            color: brand.colors.secondary,
            alignment: "center",
            editable: false,
          },
        },
        {
          id: "cta-button", type: "shape", x: 25, y: 70, width: 50, height: 7,
          animation: { enter: { type: "scale", durationFrames: fps, delay: Math.floor(fps * 0.4), easing: "spring" } },
          shape: { shapeType: "rectangle", fill: brand.colors.secondary, borderRadius: 30 },
        },
        {
          id: "cta-btn-text", type: "text", x: 25, y: 71, width: 50, height: 5,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.6) } },
          text: {
            content: "Explore Now",
            fontSize: 18,
            fontFamily: brand.fonts.heading,
            fontWeight: 600,
            color: "#FFFFFF",
            alignment: "center",
            editable: true,
          },
        },
      ],
    },
  ];
}

function blogPromoScenes(
  brand: DesignBrandProfile, w: number, h: number, fps: number, totalFrames: number, rtl: boolean, opts: SceneOptions,
): VideoScene[] {
  const sceneDur = Math.floor(totalFrames / 3);
  return [
    {
      id: "hook",
      name: "Hook",
      startFrame: 0,
      durationFrames: sceneDur,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.4) },
      background: { type: "gradient", gradient: { from: brand.colors.primary, to: brand.colors.secondary, angle: 135 } },
      elements: [
        {
          id: "hook-text", type: "text", x: 10, y: 30, width: 80, height: 25,
          animation: { enter: { type: "typewriter", durationFrames: Math.floor(fps * 1.5), easing: "ease-out" } },
          text: {
            content: opts.title || "New Article",
            fontSize: h > w ? 42 : 52,
            fontFamily: brand.fonts.heading,
            fontWeight: 700,
            color: "#FFFFFF",
            alignment: "center",
            editable: true,
          },
        },
        {
          id: "new-badge", type: "shape", x: 35, y: 22, width: 30, height: 5,
          animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } },
          shape: { shapeType: "rectangle", fill: brand.colors.secondary, borderRadius: 20 },
        },
        {
          id: "badge-text", type: "text", x: 35, y: 22.5, width: 30, height: 4,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.3) } },
          text: { content: "NEW POST", fontSize: 14, fontFamily: brand.fonts.heading, fontWeight: 700, color: "#FFFFFF", alignment: "center", editable: false },
        },
      ],
    },
    {
      id: "preview",
      name: "Preview",
      startFrame: sceneDur,
      durationFrames: sceneDur,
      transition: { type: "slide-up", durationFrames: Math.floor(fps * 0.4) },
      background: {
        type: opts.images?.[0] ? "image" : "solid",
        image: opts.images?.[0],
        color: "#F9FAFB",
        overlay: "rgba(0,0,0,0.5)",
        overlayOpacity: 0.5,
      },
      elements: [
        {
          id: "snippet", type: "text", x: 8, y: 65, width: 84, height: 20,
          animation: { enter: { type: "slide-up", durationFrames: fps, easing: "spring" } },
          text: {
            content: opts.subtitle || "Read the full guide...",
            fontSize: 24,
            fontFamily: brand.fonts.body,
            fontWeight: 400,
            color: "#FFFFFF",
            alignment: rtl ? "right" : "left",
            shadow: "0 2px 10px rgba(0,0,0,0.5)",
            editable: true,
          },
        },
      ],
    },
    {
      id: "cta",
      name: "CTA",
      startFrame: sceneDur * 2,
      durationFrames: totalFrames - sceneDur * 2,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.4) },
      background: { type: "solid", color: brand.colors.primary },
      elements: [
        {
          id: "cta-text", type: "text", x: 10, y: 35, width: 80, height: 15,
          animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } },
          text: {
            content: "Read Now",
            fontSize: 44,
            fontFamily: brand.fonts.heading,
            fontWeight: 700,
            color: "#FFFFFF",
            alignment: "center",
            editable: true,
          },
        },
        {
          id: "swipe-hint", type: "text", x: 20, y: 55, width: 60, height: 6,
          animation: { enter: { type: "slide-up", durationFrames: fps, delay: Math.floor(fps * 0.3) } },
          text: {
            content: "Link in bio ↗",
            fontSize: 16,
            fontFamily: brand.fonts.body,
            fontWeight: 400,
            color: brand.colors.secondary,
            alignment: "center",
            editable: true,
          },
        },
        {
          id: "cta-logo", type: "logo", x: 35, y: 80, width: 30, height: 8,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.5) } },
        },
      ],
    },
  ];
}

function hotelShowcaseScenes(
  brand: DesignBrandProfile, w: number, h: number, fps: number, totalFrames: number, rtl: boolean, opts: SceneOptions,
): VideoScene[] {
  const sceneDur = Math.floor(totalFrames / 4);
  const images = opts.images || [];
  return [
    {
      id: "exterior",
      name: "Exterior",
      startFrame: 0,
      durationFrames: sceneDur,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: { type: images[0] ? "image" : "gradient", image: images[0], gradient: { from: "#1a1a2e", to: "#16213e", angle: 180 }, overlay: "rgba(0,0,0,0.3)", overlayOpacity: 0.3 },
      elements: [
        { id: "hotel-name", type: "text", x: 8, y: 70, width: 84, height: 15,
          animation: { enter: { type: "slide-up", durationFrames: fps, easing: "spring" } },
          text: { content: opts.title || "Luxury Hotel", fontSize: 40, fontFamily: brand.fonts.heading, fontWeight: 700, color: "#FFFFFF", alignment: rtl ? "right" : "left", shadow: "0 2px 15px rgba(0,0,0,0.6)", editable: true },
        },
        { id: "star-rating", type: "text", x: 8, y: 87, width: 30, height: 5,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.4) } },
          text: { content: "★★★★★", fontSize: 20, fontFamily: brand.fonts.body, fontWeight: 400, color: brand.colors.secondary, alignment: rtl ? "right" : "left", editable: false },
        },
      ],
    },
    {
      id: "room",
      name: "Room",
      startFrame: sceneDur,
      durationFrames: sceneDur,
      transition: { type: "slide-left", durationFrames: Math.floor(fps * 0.4) },
      background: { type: images[1] ? "image" : "solid", image: images[1], color: "#F5F0EB", overlay: "rgba(0,0,0,0.2)", overlayOpacity: 0.2 },
      elements: [
        { id: "room-label", type: "text", x: 8, y: 75, width: 84, height: 10,
          animation: { enter: { type: "slide-up", durationFrames: fps, easing: "spring" } },
          text: { content: "Elegant Suites", fontSize: 32, fontFamily: brand.fonts.heading, fontWeight: 600, color: "#FFFFFF", alignment: "center", shadow: "0 2px 10px rgba(0,0,0,0.5)", editable: true },
        },
      ],
    },
    {
      id: "amenities",
      name: "Amenities",
      startFrame: sceneDur * 2,
      durationFrames: sceneDur,
      transition: { type: "zoom", durationFrames: Math.floor(fps * 0.4) },
      background: { type: images[2] ? "image" : "solid", image: images[2], color: brand.colors.primary, overlay: "rgba(0,0,0,0.4)", overlayOpacity: 0.4 },
      elements: [
        { id: "amenity-title", type: "text", x: 10, y: 30, width: 80, height: 10,
          animation: { enter: { type: "fade", durationFrames: fps } },
          text: { content: "World-Class Amenities", fontSize: 28, fontFamily: brand.fonts.heading, fontWeight: 600, color: "#FFFFFF", alignment: "center", editable: true },
        },
        { id: "amenity-1", type: "text", x: 15, y: 48, width: 70, height: 5,
          animation: { enter: { type: "slide-right", durationFrames: fps, delay: Math.floor(fps * 0.2) } },
          text: { content: "🏊 Infinity Pool", fontSize: 20, fontFamily: brand.fonts.body, fontWeight: 400, color: "rgba(255,255,255,0.9)", alignment: "center", editable: true },
        },
        { id: "amenity-2", type: "text", x: 15, y: 56, width: 70, height: 5,
          animation: { enter: { type: "slide-right", durationFrames: fps, delay: Math.floor(fps * 0.4) } },
          text: { content: "🧖 Luxury Spa", fontSize: 20, fontFamily: brand.fonts.body, fontWeight: 400, color: "rgba(255,255,255,0.9)", alignment: "center", editable: true },
        },
        { id: "amenity-3", type: "text", x: 15, y: 64, width: 70, height: 5,
          animation: { enter: { type: "slide-right", durationFrames: fps, delay: Math.floor(fps * 0.6) } },
          text: { content: "🍽️ Fine Dining", fontSize: 20, fontFamily: brand.fonts.body, fontWeight: 400, color: "rgba(255,255,255,0.9)", alignment: "center", editable: true },
        },
      ],
    },
    {
      id: "booking",
      name: "Book Now",
      startFrame: sceneDur * 3,
      durationFrames: totalFrames - sceneDur * 3,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: { type: "gradient", gradient: { from: brand.colors.primary, to: darken(brand.colors.primary, 25), angle: 180 } },
      elements: [
        { id: "book-logo", type: "logo", x: 32, y: 20, width: 36, height: 10, animation: { enter: { type: "fade", durationFrames: fps } } },
        { id: "book-text", type: "text", x: 10, y: 40, width: 80, height: 12,
          animation: { enter: { type: "scale", durationFrames: fps, delay: Math.floor(fps * 0.2), easing: "spring" } },
          text: { content: "Book Your Stay", fontSize: 42, fontFamily: brand.fonts.heading, fontWeight: 700, color: "#FFFFFF", alignment: "center", editable: true },
        },
        { id: "book-btn", type: "shape", x: 25, y: 60, width: 50, height: 7,
          animation: { enter: { type: "scale", durationFrames: fps, delay: Math.floor(fps * 0.4), easing: "spring" } },
          shape: { shapeType: "rectangle", fill: brand.colors.secondary, borderRadius: 30 },
        },
        { id: "book-btn-text", type: "text", x: 25, y: 61, width: 50, height: 5,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.6) } },
          text: { content: "Reserve Now →", fontSize: 18, fontFamily: brand.fonts.heading, fontWeight: 600, color: "#FFFFFF", alignment: "center", editable: true },
        },
      ],
    },
  ];
}

// Shorter template generators — same pattern with different themes
function restaurantFeatureScenes(b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions): VideoScene[] {
  return generateSimpleShowcase(b, w, h, fps, tf, rtl, o, { hookText: o.title || "Exquisite Dining", subText: o.subtitle || `Halal fine dining in ${b.destination}`, ctaText: "View Menu" });
}

function experiencePromoScenes(b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions): VideoScene[] {
  return generateSimpleShowcase(b, w, h, fps, tf, rtl, o, { hookText: o.title || "Unique Experience", subText: o.subtitle || `Curated for you in ${b.destination}`, ctaText: "Book Experience" });
}

function seasonalCampaignScenes(b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions): VideoScene[] {
  return generateSimpleShowcase(b, w, h, fps, tf, rtl, o, { hookText: o.title || "Ramadan in " + b.destination, subText: o.subtitle || "Special offers & experiences", ctaText: "Explore Deals" });
}

function travelTipScenes(b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions): VideoScene[] {
  return generateSimpleShowcase(b, w, h, fps, tf, rtl, o, { hookText: o.title || "Travel Tip", subText: o.subtitle || `Expert advice for ${b.destination}`, ctaText: "More Tips" });
}

function beforeAfterScenes(b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions): VideoScene[] {
  return generateSimpleShowcase(b, w, h, fps, tf, rtl, o, { hookText: o.title || "Before vs After", subText: o.subtitle || "See the transformation", ctaText: "Learn More" });
}

function testimonialScenes(b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions): VideoScene[] {
  const sd = Math.floor(tf / 3);
  return [
    {
      id: "quote",
      name: "Quote",
      startFrame: 0,
      durationFrames: sd * 2,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: { type: "gradient", gradient: { from: b.colors.primary, to: darken(b.colors.primary, 20), angle: 135 } },
      elements: [
        { id: "quote-mark", type: "text", x: 10, y: 20, width: 20, height: 15, text: { content: "“", fontSize: 120, fontFamily: "Georgia", fontWeight: 700, color: b.colors.secondary, alignment: "left", editable: false }, animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } } },
        { id: "quote-text", type: "text", x: 12, y: 35, width: 76, height: 30,
          animation: { enter: { type: "fade", durationFrames: Math.floor(fps * 1.2), delay: Math.floor(fps * 0.3), easing: "ease-out" } },
          text: { content: o.title || "An unforgettable experience...", fontSize: 28, fontFamily: b.fonts.heading, fontWeight: 500, color: "#FFFFFF", alignment: "center", lineHeight: 1.5, editable: true },
        },
        { id: "author", type: "text", x: 20, y: 72, width: 60, height: 6,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.8) } },
          text: { content: o.subtitle || "— Happy Traveler", fontSize: 16, fontFamily: b.fonts.body, fontWeight: 400, color: "rgba(255,255,255,0.7)", alignment: "center", editable: true },
        },
      ],
    },
    {
      id: "cta",
      name: "CTA",
      startFrame: sd * 2,
      durationFrames: tf - sd * 2,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: { type: "solid", color: b.colors.primary },
      elements: [
        { id: "cta-logo", type: "logo", x: 30, y: 30, width: 40, height: 12, animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } } },
        { id: "cta-text", type: "text", x: 15, y: 52, width: 70, height: 10, animation: { enter: { type: "slide-up", durationFrames: fps, delay: Math.floor(fps * 0.3), easing: "spring" } },
          text: { content: "Start Your Journey", fontSize: 32, fontFamily: b.fonts.heading, fontWeight: 700, color: "#FFFFFF", alignment: "center", editable: true },
        },
      ],
    },
  ];
}

function listicleCountdownScenes(
  b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions,
): VideoScene[] {
  const items = 5;
  const introFrames = Math.floor(fps * 2);
  const itemFrames = Math.floor((tf - introFrames - Math.floor(fps * 3)) / items);
  const scenes: VideoScene[] = [];

  // Intro
  scenes.push({
    id: "intro",
    name: "Intro",
    startFrame: 0,
    durationFrames: introFrames,
    transition: { type: "fade", durationFrames: Math.floor(fps * 0.4) },
    background: { type: "gradient", gradient: { from: b.colors.primary, to: b.colors.secondary, angle: 135 } },
    elements: [
      { id: "list-title", type: "text", x: 10, y: 30, width: 80, height: 25,
        animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } },
        text: { content: o.title || `Top ${items} in ${b.destination}`, fontSize: 44, fontFamily: b.fonts.heading, fontWeight: 700, color: "#FFFFFF", alignment: "center", editable: true },
      },
    ],
  });

  // Count items
  for (let i = items; i >= 1; i--) {
    const start = introFrames + (items - i) * itemFrames;
    scenes.push({
      id: `item-${i}`,
      name: `#${i}`,
      startFrame: start,
      durationFrames: itemFrames,
      transition: { type: "slide-up", durationFrames: Math.floor(fps * 0.3) },
      background: {
        type: o.images?.[items - i] ? "image" : "solid",
        image: o.images?.[items - i],
        color: i % 2 === 0 ? b.colors.primary : darken(b.colors.primary, 15),
        overlay: "rgba(0,0,0,0.4)",
        overlayOpacity: 0.4,
      },
      elements: [
        { id: `num-${i}`, type: "counter", x: 35, y: 20, width: 30, height: 20,
          animation: { enter: { type: "scale", durationFrames: Math.floor(fps * 0.5), easing: "spring" } },
          counter: { from: i, to: i, prefix: "#", suffix: "", fontSize: 80, color: b.colors.secondary, fontWeight: 700 },
        },
        { id: `item-text-${i}`, type: "text", x: 10, y: 55, width: 80, height: 20,
          animation: { enter: { type: "slide-up", durationFrames: fps, delay: Math.floor(fps * 0.2), easing: "spring" } },
          text: { content: `Item ${i}`, fontSize: 30, fontFamily: b.fonts.heading, fontWeight: 600, color: "#FFFFFF", alignment: "center", shadow: "0 2px 10px rgba(0,0,0,0.5)", editable: true },
        },
      ],
    });
  }

  // Outro
  scenes.push({
    id: "outro",
    name: "Outro",
    startFrame: introFrames + items * itemFrames,
    durationFrames: tf - (introFrames + items * itemFrames),
    transition: { type: "fade", durationFrames: Math.floor(fps * 0.4) },
    background: { type: "gradient", gradient: { from: b.colors.primary, to: darken(b.colors.primary, 25), angle: 180 } },
    elements: [
      { id: "outro-logo", type: "logo", x: 30, y: 25, width: 40, height: 12, animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } } },
      { id: "outro-text", type: "text", x: 15, y: 50, width: 70, height: 10,
        animation: { enter: { type: "slide-up", durationFrames: fps, delay: Math.floor(fps * 0.3), easing: "spring" } },
        text: { content: "Follow for more!", fontSize: 28, fontFamily: b.fonts.heading, fontWeight: 600, color: "#FFFFFF", alignment: "center", editable: true },
      },
    ],
  });

  return scenes;
}

// ─── Reusable Pattern ────────────────────────────────────────────

function generateSimpleShowcase(
  b: DesignBrandProfile, w: number, h: number, fps: number, tf: number, rtl: boolean, o: SceneOptions,
  content: { hookText: string; subText: string; ctaText: string },
): VideoScene[] {
  const sd = Math.floor(tf / 3);
  const images = o.images || [];
  return [
    {
      id: "hook",
      name: "Hook",
      startFrame: 0,
      durationFrames: sd,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: { type: images[0] ? "image" : "gradient", image: images[0], gradient: { from: b.colors.primary, to: b.colors.secondary, angle: 135 }, overlay: "rgba(0,0,0,0.4)", overlayOpacity: 0.4 },
      elements: [
        { id: "hook-text", type: "text", x: 8, y: 35, width: 84, height: 20,
          animation: { enter: { type: "slide-up", durationFrames: fps, easing: "spring" } },
          text: { content: content.hookText, fontSize: h > w ? 42 : 52, fontFamily: b.fonts.heading, fontWeight: 700, color: "#FFFFFF", alignment: "center", shadow: "0 2px 15px rgba(0,0,0,0.5)", editable: true },
        },
        { id: "sub-text", type: "text", x: 12, y: 58, width: 76, height: 10,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.4) } },
          text: { content: content.subText, fontSize: 20, fontFamily: b.fonts.body, fontWeight: 400, color: "rgba(255,255,255,0.9)", alignment: "center", editable: true },
        },
      ],
    },
    {
      id: "showcase",
      name: "Showcase",
      startFrame: sd,
      durationFrames: sd,
      transition: { type: "slide-left", durationFrames: Math.floor(fps * 0.4) },
      background: { type: images[1] ? "image" : "solid", image: images[1], color: "#F5F0EB", overlay: "rgba(0,0,0,0.3)", overlayOpacity: 0.3 },
      elements: [
        { id: "detail", type: "text", x: 8, y: 72, width: 84, height: 15,
          animation: { enter: { type: "slide-up", durationFrames: fps, easing: "spring" } },
          text: { content: content.subText, fontSize: 28, fontFamily: b.fonts.heading, fontWeight: 600, color: "#FFFFFF", alignment: rtl ? "right" : "left", shadow: "0 2px 10px rgba(0,0,0,0.5)", editable: true },
        },
      ],
    },
    {
      id: "cta",
      name: "CTA",
      startFrame: sd * 2,
      durationFrames: tf - sd * 2,
      transition: { type: "fade", durationFrames: Math.floor(fps * 0.5) },
      background: { type: "gradient", gradient: { from: b.colors.primary, to: darken(b.colors.primary, 25), angle: 180 } },
      elements: [
        { id: "cta-logo", type: "logo", x: 30, y: 20, width: 40, height: 12, animation: { enter: { type: "scale", durationFrames: fps, easing: "spring" } } },
        { id: "cta-main", type: "text", x: 10, y: 42, width: 80, height: 12,
          animation: { enter: { type: "slide-up", durationFrames: fps, delay: Math.floor(fps * 0.2), easing: "spring" } },
          text: { content: content.ctaText, fontSize: 38, fontFamily: b.fonts.heading, fontWeight: 700, color: "#FFFFFF", alignment: "center", editable: true },
        },
        { id: "cta-btn", type: "shape", x: 25, y: 62, width: 50, height: 7,
          animation: { enter: { type: "scale", durationFrames: fps, delay: Math.floor(fps * 0.4), easing: "spring" } },
          shape: { shapeType: "rectangle", fill: b.colors.secondary, borderRadius: 30 },
        },
        { id: "cta-btn-txt", type: "text", x: 25, y: 63, width: 50, height: 5,
          animation: { enter: { type: "fade", durationFrames: fps, delay: Math.floor(fps * 0.5) } },
          text: { content: `Visit ${b.siteName}`, fontSize: 16, fontFamily: b.fonts.heading, fontWeight: 600, color: "#FFFFFF", alignment: "center", editable: false },
        },
      ],
    },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
  const b = Math.max(0, (num & 0x0000FF) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
