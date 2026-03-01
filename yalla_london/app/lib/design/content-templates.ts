/**
 * Content Template System — Viral, Creative, Conversion-Oriented
 *
 * Templates designed for maximum engagement and conversion:
 * - Social media formats optimized for each platform's algorithm
 * - Story-driven layouts that create FOMO and urgency
 * - Built-in CTA patterns that convert viewers → buyers
 * - Shareable design patterns (top lists, before/after, secrets revealed)
 *
 * Each template is brand-aware and destination-flavored.
 */

import type { DestinationTheme } from "./destination-themes";

// ── Template Categories ──────────────────────────────

export type TemplateCategory =
  | "social-post"       // Instagram/Facebook feed post
  | "story"             // Instagram/TikTok story
  | "reel-cover"        // Reel/Short thumbnail
  | "carousel"          // Multi-slide carousel
  | "blog-hero"         // Blog article hero banner
  | "email-header"      // Email campaign header
  | "ad-creative"       // Paid ad creative
  | "quote-card"        // Shareable quote card
  | "comparison"        // Before/after, vs, comparison
  | "listicle"          // Top 5, 10 best, etc.
  | "promo-banner"      // Sale/promo banner
  | "event-flyer"       // Event announcement

export type SocialPlatform = "instagram" | "tiktok" | "facebook" | "twitter" | "youtube" | "linkedin"

export type ContentGoal = "awareness" | "engagement" | "traffic" | "conversion" | "viral"

// ── Template Definition ──────────────────────────────

export interface ContentTemplate {
  id: string;
  name: string;
  nameAr: string;
  category: TemplateCategory;
  platform: SocialPlatform[];
  goal: ContentGoal;
  viralHook: string; // the psychological trigger
  conversionTip: string; // how this template drives action

  format: {
    width: number; // px
    height: number; // px
    aspectRatio: string;
  };

  layers: TemplateLayer[];
  variants: TemplateVariant[]; // color/mood variants
}

export interface TemplateLayer {
  id: string;
  type: "background" | "image" | "text" | "shape" | "overlay" | "cta" | "badge" | "logo";
  position: { x: string; y: string; width: string; height: string }; // CSS units
  style: Record<string, string>;
  content?: {
    text?: string;
    textAr?: string;
    placeholder?: string;
    editable?: boolean;
  };
}

export interface TemplateVariant {
  id: string;
  name: string;
  overrides: Record<string, Record<string, string>>; // layerId → style overrides
}

// ═══════════════════════════════════════════════════════
//  TEMPLATE FACTORY
// ═══════════════════════════════════════════════════════

/**
 * Generate all content templates for a destination
 */
export function generateContentTemplates(theme: DestinationTheme): ContentTemplate[] {
  return [
    // ── VIRAL: "Secret Spot" Reveal ──────────────────
    secretSpotTemplate(theme),

    // ── VIRAL: Top 5 Listicle ────────────────────────
    top5ListicleTemplate(theme),

    // ── CONVERSION: Limited Offer ────────────────────
    limitedOfferTemplate(theme),

    // ── ENGAGEMENT: This or That ─────────────────────
    thisOrThatTemplate(theme),

    // ── AWARENESS: Destination Quote ─────────────────
    destinationQuoteTemplate(theme),

    // ── CONVERSION: Blog Hero ────────────────────────
    blogHeroTemplate(theme),

    // ── VIRAL: Carousel Storytelling ─────────────────
    carouselStoryTemplate(theme),

    // ── CONVERSION: Promo Countdown ──────────────────
    promoCountdownTemplate(theme),

    // ── ENGAGEMENT: Before/After ─────────────────────
    beforeAfterTemplate(theme),

    // ── VIRAL: Story Hook Sequence ───────────────────
    storyHookTemplate(theme),

    // ── CONVERSION: Email Hero ───────────────────────
    emailHeroTemplate(theme),

    // ── AWARENESS: Event Announcement ────────────────
    eventAnnouncementTemplate(theme),
  ];
}

// ═══════════════════════════════════════════════════════
//  INDIVIDUAL TEMPLATES
// ═══════════════════════════════════════════════════════

function secretSpotTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-secret-spot`,
    name: "Secret Spot Reveal",
    nameAr: "كشف المكان السري",
    category: "social-post",
    platform: ["instagram", "facebook", "tiktok"],
    goal: "viral",
    viralHook: "Curiosity gap + exclusivity — people share secrets to feel in-the-know",
    conversionTip: "The blurred image teases, the CTA sends them to the full article with affiliate links",

    format: { width: 1080, height: 1080, aspectRatio: "1:1" },

    layers: [
      { id: "bg", type: "background", position: pos("0", "0", "100%", "100%"), style: { background: t.gradients.hero } },
      { id: "hero-img", type: "image", position: pos("0", "0", "100%", "65%"), style: { objectFit: "cover", filter: "blur(0px)" }, content: { placeholder: "Secret location photo" } },
      { id: "blur-overlay", type: "overlay", position: pos("0", "0", "100%", "65%"), style: { background: "rgba(0,0,0,0.15)", backdropFilter: "blur(2px)" } },
      { id: "pin-badge", type: "badge", position: pos("5%", "5%", "auto", "auto"), style: { background: t.colors.secondary, color: t.colors.textOnSecondary, padding: "8px 16px", borderRadius: t.shape.borderRadius.full, fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.1em" }, content: { text: "SECRET SPOT", textAr: "مكان سري" } },
      { id: "bottom-panel", type: "shape", position: pos("0", "60%", "100%", "40%"), style: { background: t.colors.primary } },
      { id: "title", type: "text", position: pos("8%", "65%", "84%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "32px", fontWeight: String(t.typography.headingWeight), color: t.colors.textOnPrimary, lineHeight: "1.2" }, content: { text: `${t.destination}'s Best Kept Secret`, textAr: `السر الأفضل في ${t.destination}`, editable: true } },
      { id: "subtitle", type: "text", position: pos("8%", "82%", "84%", "auto"), style: { fontFamily: `'${t.typography.bodyFont}'`, fontSize: "16px", color: `${t.colors.textOnPrimary}99` }, content: { text: "Most tourists walk right past this hidden gem...", textAr: "معظم السياح يمرون بجانب هذه الجوهرة المخفية...", editable: true } },
      { id: "cta", type: "cta", position: pos("8%", "92%", "auto", "auto"), style: { background: t.gradients.cta, color: t.colors.textOnSecondary, padding: "10px 24px", borderRadius: t.shape.borderRadius.full, fontWeight: "700", fontSize: "14px" }, content: { text: "Reveal Location →", textAr: "اكشف الموقع ←" } },
      { id: "logo", type: "logo", position: pos("auto", "92%", "auto", "auto"), style: { right: "8%", fontSize: "12px", color: `${t.colors.textOnPrimary}66`, fontWeight: "600" }, content: { text: t.name } },
    ],

    variants: [
      { id: "dark", name: "Dark Mystery", overrides: { "bottom-panel": { background: "#0F0F0F" }, "blur-overlay": { backdropFilter: "blur(8px)" } } },
      { id: "bright", name: "Bright Reveal", overrides: { "bottom-panel": { background: t.colors.surface }, title: { color: t.colors.text }, subtitle: { color: t.colors.textMuted } } },
    ],
  };
}

function top5ListicleTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-top5`,
    name: "Top 5 Listicle",
    nameAr: "أفضل 5",
    category: "listicle",
    platform: ["instagram", "facebook", "twitter"],
    goal: "viral",
    viralHook: "Numbered lists trigger completionist psychology — people share to bookmark",
    conversionTip: "Each item links to a review article with embedded affiliate offers",

    format: { width: 1080, height: 1350, aspectRatio: "4:5" },

    layers: [
      { id: "bg", type: "background", position: pos("0", "0", "100%", "100%"), style: { background: t.colors.background } },
      { id: "header-bar", type: "shape", position: pos("0", "0", "100%", "18%"), style: { background: t.gradients.hero } },
      { id: "number", type: "text", position: pos("8%", "3%", "auto", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "72px", fontWeight: "800", color: `${t.colors.textOnPrimary}33` }, content: { text: "TOP 5" } },
      { id: "title", type: "text", position: pos("8%", "8%", "84%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "28px", fontWeight: String(t.typography.headingWeight), color: t.colors.textOnPrimary, lineHeight: "1.3" }, content: { text: `Best Places in ${t.destination}`, textAr: `أفضل الأماكن في ${t.destination}`, editable: true } },
      ...[1, 2, 3, 4, 5].map((n, i) => ({
        id: `item-${n}`,
        type: "text" as const,
        position: pos("8%", `${22 + i * 15.5}%`, "84%", "13%"),
        style: {
          fontFamily: `'${t.typography.bodyFont}'`,
          fontSize: "18px",
          color: t.colors.text,
          padding: "16px",
          background: t.colors.surface,
          borderRadius: t.shape.borderRadius.md,
          borderLeft: `4px solid ${t.colors.secondary}`,
          boxShadow: t.shadows.card,
        },
        content: { text: `${n}. Place Name — Short description`, textAr: `${n}. اسم المكان — وصف قصير`, editable: true },
      })),
      { id: "cta", type: "cta", position: pos("25%", "93%", "50%", "auto"), style: { background: t.gradients.cta, color: t.colors.textOnSecondary, padding: "12px 28px", borderRadius: t.shape.borderRadius.full, fontWeight: "700", fontSize: "15px", textAlign: "center" }, content: { text: "See Full Guide →", textAr: "شاهد الدليل الكامل ←" } },
    ],

    variants: [
      { id: "numbered", name: "Bold Numbers", overrides: {} },
      { id: "emoji", name: "Emoji Style", overrides: {} },
    ],
  };
}

function limitedOfferTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-limited-offer`,
    name: "Limited Offer",
    nameAr: "عرض محدود",
    category: "promo-banner",
    platform: ["instagram", "facebook"],
    goal: "conversion",
    viralHook: "Scarcity + urgency — countdown timers increase conversion 8x",
    conversionTip: "Direct link to checkout with promo code auto-applied",

    format: { width: 1080, height: 1080, aspectRatio: "1:1" },

    layers: [
      { id: "bg", type: "background", position: pos("0", "0", "100%", "100%"), style: { background: t.colors.primary } },
      { id: "pattern", type: "overlay", position: pos("0", "0", "100%", "100%"), style: { background: t.patterns.backgroundTexture || "none", opacity: "0.5" } },
      { id: "urgency-badge", type: "badge", position: pos("30%", "8%", "40%", "auto"), style: { background: t.colors.error || "#DC2626", color: "#FFFFFF", padding: "8px 20px", borderRadius: t.shape.borderRadius.full, fontSize: "13px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.15em", textAlign: "center" }, content: { text: "LIMITED TIME", textAr: "وقت محدود" } },
      { id: "discount", type: "text", position: pos("10%", "22%", "80%", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "80px", fontWeight: "800", color: t.colors.secondary, textAlign: "center", lineHeight: "1" }, content: { text: "30% OFF", textAr: "خصم 30%", editable: true } },
      { id: "product", type: "text", position: pos("10%", "48%", "80%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "28px", fontWeight: String(t.typography.headingWeight), color: t.colors.textOnPrimary, textAlign: "center", lineHeight: "1.3" }, content: { text: `Premium ${t.destination} Experience`, textAr: `تجربة ${t.destination} المميزة`, editable: true } },
      { id: "timer-label", type: "text", position: pos("20%", "65%", "60%", "auto"), style: { fontSize: "12px", color: `${t.colors.textOnPrimary}88`, textAlign: "center", letterSpacing: "0.2em", textTransform: "uppercase" }, content: { text: "OFFER ENDS IN", textAr: "ينتهي العرض خلال" } },
      { id: "timer", type: "text", position: pos("15%", "70%", "70%", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "48px", fontWeight: "700", color: t.colors.textOnPrimary, textAlign: "center", letterSpacing: "0.05em" }, content: { text: "23:59:59", editable: true } },
      { id: "cta", type: "cta", position: pos("20%", "85%", "60%", "auto"), style: { background: t.gradients.cta, color: t.colors.textOnSecondary, padding: "16px 32px", borderRadius: t.shape.borderRadius.full, fontWeight: "800", fontSize: "18px", textAlign: "center", boxShadow: t.shadows.button }, content: { text: "Grab This Deal", textAr: "احصل على العرض" } },
      { id: "code", type: "text", position: pos("25%", "95%", "50%", "auto"), style: { fontSize: "12px", color: `${t.colors.textOnPrimary}66`, textAlign: "center" }, content: { text: "Use code: YALLA30", editable: true } },
    ],

    variants: [
      { id: "flash", name: "Flash Sale", overrides: { "urgency-badge": { background: "#FBBF24", color: "#000000" } } },
      { id: "vip", name: "VIP Exclusive", overrides: { "urgency-badge": { background: t.colors.accent } } },
    ],
  };
}

function thisOrThatTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-this-or-that`,
    name: "This or That",
    nameAr: "هذا أو ذاك",
    category: "social-post",
    platform: ["instagram", "tiktok", "facebook"],
    goal: "engagement",
    viralHook: "Binary choice forces opinion → comments + shares explode. Algorithm loves debate.",
    conversionTip: "Both options link to affiliate reviews. Comments drive reach → more eyeballs → more clicks",

    format: { width: 1080, height: 1080, aspectRatio: "1:1" },

    layers: [
      { id: "left-bg", type: "shape", position: pos("0", "0", "50%", "100%"), style: { background: t.colors.primary } },
      { id: "right-bg", type: "shape", position: pos("50%", "0", "50%", "100%"), style: { background: t.colors.secondary } },
      { id: "left-img", type: "image", position: pos("2%", "15%", "46%", "55%"), style: { objectFit: "cover", borderRadius: t.shape.borderRadius.lg }, content: { placeholder: "Option A photo" } },
      { id: "right-img", type: "image", position: pos("52%", "15%", "46%", "55%"), style: { objectFit: "cover", borderRadius: t.shape.borderRadius.lg }, content: { placeholder: "Option B photo" } },
      { id: "vs-badge", type: "badge", position: pos("42%", "38%", "16%", "16%"), style: { background: t.colors.accent, color: t.colors.text, borderRadius: "50%", fontSize: "24px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: t.shadows.elevated, border: `3px solid ${t.colors.surface}` }, content: { text: "VS" } },
      { id: "header", type: "text", position: pos("10%", "3%", "80%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "24px", fontWeight: String(t.typography.headingWeight), color: t.colors.textOnPrimary, textAlign: "center" }, content: { text: "THIS OR THAT?", textAr: "هذا أو ذاك؟" } },
      { id: "left-label", type: "text", position: pos("5%", "75%", "40%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "22px", fontWeight: "700", color: t.colors.textOnPrimary, textAlign: "center" }, content: { text: "Option A", textAr: "الخيار أ", editable: true } },
      { id: "right-label", type: "text", position: pos("55%", "75%", "40%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "22px", fontWeight: "700", color: t.colors.textOnSecondary, textAlign: "center" }, content: { text: "Option B", textAr: "الخيار ب", editable: true } },
      { id: "engage-cta", type: "text", position: pos("10%", "90%", "80%", "auto"), style: { fontSize: "14px", color: `${t.colors.textOnPrimary}AA`, textAlign: "center" }, content: { text: "Vote in the comments! 👇", textAr: "صوّت في التعليقات! 👇" } },
      { id: "logo", type: "logo", position: pos("40%", "96%", "20%", "auto"), style: { fontSize: "11px", color: `${t.colors.textOnPrimary}55`, textAlign: "center" }, content: { text: t.name } },
    ],

    variants: [
      { id: "split", name: "Clean Split", overrides: {} },
      { id: "gradient", name: "Gradient Blend", overrides: { "left-bg": { background: t.gradients.hero } } },
    ],
  };
}

function destinationQuoteTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-quote`,
    name: "Destination Quote",
    nameAr: "اقتباس الوجهة",
    category: "quote-card",
    platform: ["instagram", "twitter", "facebook"],
    goal: "awareness",
    viralHook: "Aspirational quotes get saved & shared — highest save-to-impression ratio of any format",
    conversionTip: "Bio link in saves drives traffic weeks after posting. Profile visits → follows → future conversions",

    format: { width: 1080, height: 1080, aspectRatio: "1:1" },

    layers: [
      { id: "bg", type: "background", position: pos("0", "0", "100%", "100%"), style: { background: t.gradients.subtle } },
      { id: "accent-line", type: "shape", position: pos("8%", "20%", "2px", "60%"), style: { background: t.patterns.decorativeBorder } },
      { id: "quote-mark", type: "text", position: pos("12%", "18%", "auto", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "120px", color: `${t.colors.primary}15`, lineHeight: "1", fontWeight: "800" }, content: { text: "\"" } },
      { id: "quote", type: "text", position: pos("14%", "30%", "72%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "28px", fontWeight: "600", color: t.colors.text, lineHeight: "1.5" }, content: { text: `${t.destination} isn't just a place — it's a feeling you carry home.`, textAr: `${t.destination} ليست مجرد مكان — إنها شعور تحمله معك إلى البيت.`, editable: true } },
      { id: "author", type: "text", position: pos("14%", "70%", "72%", "auto"), style: { fontSize: "14px", color: t.colors.textMuted, fontWeight: "500" }, content: { text: `— ${t.name}`, editable: true } },
      { id: "logo", type: "logo", position: pos("14%", "88%", "auto", "auto"), style: { fontSize: "13px", color: t.colors.primary, fontWeight: "700" }, content: { text: t.name } },
      { id: "handle", type: "text", position: pos("auto", "88%", "auto", "auto"), style: { right: "8%", fontSize: "13px", color: t.colors.textMuted }, content: { text: `@${t.id.replace(/-/g, "")}`, editable: true } },
    ],

    variants: [
      { id: "light", name: "Light Minimal", overrides: {} },
      { id: "dark", name: "Dark Mood", overrides: { bg: { background: t.colors.primary }, quote: { color: t.colors.textOnPrimary }, author: { color: `${t.colors.textOnPrimary}88` } } },
    ],
  };
}

function blogHeroTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-blog-hero`,
    name: "Blog Hero Banner",
    nameAr: "بانر المقال",
    category: "blog-hero",
    platform: ["instagram", "facebook", "twitter"],
    goal: "traffic",
    viralHook: "Compelling hero image + headline drives click-through from social to article",
    conversionTip: "Article page has affiliate links, email capture, and product recommendations",

    format: { width: 1200, height: 630, aspectRatio: "1.91:1" },

    layers: [
      { id: "bg-img", type: "image", position: pos("0", "0", "100%", "100%"), style: { objectFit: "cover" }, content: { placeholder: "Blog hero photo" } },
      { id: "gradient-overlay", type: "overlay", position: pos("0", "0", "100%", "100%"), style: { background: t.gradients.overlay } },
      { id: "category-badge", type: "badge", position: pos("6%", "10%", "auto", "auto"), style: { background: t.colors.secondary, color: t.colors.textOnSecondary, padding: "6px 14px", borderRadius: t.shape.borderRadius.full, fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em" }, content: { text: "TRAVEL GUIDE", textAr: "دليل سفر", editable: true } },
      { id: "headline", type: "text", position: pos("6%", "55%", "60%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "36px", fontWeight: String(t.typography.headingWeight), color: "#FFFFFF", lineHeight: "1.2" }, content: { text: `The Ultimate ${t.destination} Guide`, textAr: `الدليل الشامل لـ${t.destination}`, editable: true } },
      { id: "meta", type: "text", position: pos("6%", "85%", "50%", "auto"), style: { fontSize: "13px", color: "rgba(255,255,255,0.7)" }, content: { text: "8 min read · Updated 2026", editable: true } },
      { id: "logo", type: "logo", position: pos("auto", "10%", "auto", "auto"), style: { right: "6%", fontSize: "14px", color: "#FFFFFF", fontWeight: "700" }, content: { text: t.name } },
    ],

    variants: [
      { id: "cinematic", name: "Cinematic", overrides: { "gradient-overlay": { background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 50%)" } } },
      { id: "branded", name: "Brand Heavy", overrides: { "gradient-overlay": { background: t.gradients.card } } },
    ],
  };
}

function carouselStoryTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-carousel-story`,
    name: "Carousel Story",
    nameAr: "قصة متعددة الشرائح",
    category: "carousel",
    platform: ["instagram", "linkedin"],
    goal: "engagement",
    viralHook: "Carousel swipe-through drives 3x the engagement of single posts. Each slide builds suspense.",
    conversionTip: "Last slide is always a CTA. Swipe commitment = higher conversion on the final ask.",

    format: { width: 1080, height: 1350, aspectRatio: "4:5" },

    layers: [
      // Slide 1: Hook
      { id: "bg", type: "background", position: pos("0", "0", "100%", "100%"), style: { background: t.gradients.hero } },
      { id: "slide-label", type: "badge", position: pos("8%", "5%", "auto", "auto"), style: { background: `${t.colors.textOnPrimary}22`, color: t.colors.textOnPrimary, padding: "4px 12px", borderRadius: t.shape.borderRadius.full, fontSize: "11px" }, content: { text: "SLIDE 1 OF 5" } },
      { id: "hook-text", type: "text", position: pos("8%", "30%", "84%", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "42px", fontWeight: "800", color: t.colors.textOnPrimary, lineHeight: "1.2", textAlign: "center" }, content: { text: `5 Things Nobody Tells You About ${t.destination}`, textAr: `5 أشياء لا يخبرك بها أحد عن ${t.destination}`, editable: true } },
      { id: "swipe-cta", type: "text", position: pos("25%", "88%", "50%", "auto"), style: { fontSize: "14px", color: `${t.colors.textOnPrimary}AA`, textAlign: "center" }, content: { text: "Swipe to discover → →", textAr: "← ← اسحب للاكتشاف" } },
      { id: "logo", type: "logo", position: pos("35%", "94%", "30%", "auto"), style: { fontSize: "12px", color: `${t.colors.textOnPrimary}55`, textAlign: "center" }, content: { text: t.name } },
    ],

    variants: [
      { id: "bold", name: "Bold Impact", overrides: { "hook-text": { fontSize: "48px" } } },
      { id: "minimal", name: "Clean Minimal", overrides: { bg: { background: t.colors.surface }, "hook-text": { color: t.colors.text } } },
    ],
  };
}

function promoCountdownTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-promo-countdown`,
    name: "Promo Countdown Story",
    nameAr: "عد تنازلي للعرض",
    category: "story",
    platform: ["instagram", "tiktok"],
    goal: "conversion",
    viralHook: "Vertical format + countdown creates panic urgency. Story shares drive FOMO among friends.",
    conversionTip: "Swipe-up/link sticker goes directly to checkout with promo code",

    format: { width: 1080, height: 1920, aspectRatio: "9:16" },

    layers: [
      { id: "bg", type: "background", position: pos("0", "0", "100%", "100%"), style: { background: t.colors.primary } },
      { id: "hero-img", type: "image", position: pos("0", "0", "100%", "50%"), style: { objectFit: "cover" }, content: { placeholder: "Product/Experience photo" } },
      { id: "overlay", type: "overlay", position: pos("0", "35%", "100%", "15%"), style: { background: `linear-gradient(180deg, transparent, ${t.colors.primary})` } },
      { id: "flash-badge", type: "badge", position: pos("30%", "52%", "40%", "auto"), style: { background: t.colors.error || "#EF4444", color: "#FFFFFF", padding: "10px 24px", borderRadius: t.shape.borderRadius.full, fontSize: "14px", fontWeight: "800", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.15em" }, content: { text: "FLASH SALE", textAr: "تخفيض سريع" } },
      { id: "offer", type: "text", position: pos("10%", "58%", "80%", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "56px", fontWeight: "800", color: t.colors.secondary, textAlign: "center", lineHeight: "1.1" }, content: { text: "50% OFF", textAr: "خصم 50%", editable: true } },
      { id: "product-name", type: "text", position: pos("10%", "70%", "80%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "24px", fontWeight: "600", color: t.colors.textOnPrimary, textAlign: "center" }, content: { text: `${t.destination} Premium Package`, textAr: `باقة ${t.destination} المميزة`, editable: true } },
      { id: "timer-label", type: "text", position: pos("25%", "78%", "50%", "auto"), style: { fontSize: "11px", color: `${t.colors.textOnPrimary}77`, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.2em" }, content: { text: "ENDS IN" } },
      { id: "timer", type: "text", position: pos("15%", "81%", "70%", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "44px", fontWeight: "700", color: t.colors.textOnPrimary, textAlign: "center" }, content: { text: "02:59:59", editable: true } },
      { id: "swipe-cta", type: "cta", position: pos("20%", "90%", "60%", "auto"), style: { background: t.gradients.cta, color: t.colors.textOnSecondary, padding: "14px 28px", borderRadius: t.shape.borderRadius.full, fontWeight: "800", fontSize: "16px", textAlign: "center" }, content: { text: "Shop Now ↑", textAr: "تسوق الآن ↑" } },
    ],

    variants: [
      { id: "dark", name: "Midnight", overrides: { bg: { background: "#0A0A0A" } } },
      { id: "branded", name: "On-Brand", overrides: {} },
    ],
  };
}

function beforeAfterTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-before-after`,
    name: "Before / After",
    nameAr: "قبل / بعد",
    category: "comparison",
    platform: ["instagram", "tiktok", "facebook"],
    goal: "engagement",
    viralHook: "Transformation content triggers dopamine. Save-worthy and highly shareable.",
    conversionTip: "Links to the experience/product that caused the transformation",

    format: { width: 1080, height: 1080, aspectRatio: "1:1" },

    layers: [
      { id: "left", type: "image", position: pos("0", "0", "50%", "100%"), style: { objectFit: "cover" }, content: { placeholder: "Before photo" } },
      { id: "right", type: "image", position: pos("50%", "0", "50%", "100%"), style: { objectFit: "cover" }, content: { placeholder: "After photo" } },
      { id: "divider", type: "shape", position: pos("49%", "0", "2%", "100%"), style: { background: t.colors.surface } },
      { id: "before-label", type: "badge", position: pos("5%", "85%", "auto", "auto"), style: { background: "rgba(0,0,0,0.6)", color: "#FFFFFF", padding: "6px 14px", borderRadius: t.shape.borderRadius.full, fontSize: "12px", fontWeight: "700" }, content: { text: "BEFORE", textAr: "قبل" } },
      { id: "after-label", type: "badge", position: pos("55%", "85%", "auto", "auto"), style: { background: t.colors.secondary, color: t.colors.textOnSecondary, padding: "6px 14px", borderRadius: t.shape.borderRadius.full, fontSize: "12px", fontWeight: "700" }, content: { text: "AFTER", textAr: "بعد" } },
      { id: "top-text", type: "text", position: pos("10%", "3%", "80%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "24px", fontWeight: String(t.typography.headingWeight), color: "#FFFFFF", textAlign: "center", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }, content: { text: "The Transformation", textAr: "التحوّل", editable: true } },
      { id: "logo", type: "logo", position: pos("40%", "95%", "20%", "auto"), style: { fontSize: "11px", color: "rgba(255,255,255,0.5)", textAlign: "center" }, content: { text: t.name } },
    ],

    variants: [
      { id: "slider", name: "Slider Style", overrides: { divider: { background: t.colors.primary } } },
    ],
  };
}

function storyHookTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-story-hook`,
    name: "Story Hook",
    nameAr: "خطاف القصة",
    category: "story",
    platform: ["instagram", "tiktok"],
    goal: "viral",
    viralHook: "First-frame hook + cliffhanger = 100% watch rate. Text-on-image stories outperform video on reach.",
    conversionTip: "Next story slide reveals the answer with a product/link CTA",

    format: { width: 1080, height: 1920, aspectRatio: "9:16" },

    layers: [
      { id: "bg-img", type: "image", position: pos("0", "0", "100%", "100%"), style: { objectFit: "cover" }, content: { placeholder: "Atmospheric destination photo" } },
      { id: "dark-overlay", type: "overlay", position: pos("0", "0", "100%", "100%"), style: { background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)" } },
      { id: "hook-text", type: "text", position: pos("8%", "35%", "84%", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "38px", fontWeight: "800", color: "#FFFFFF", lineHeight: "1.3", textAlign: "center" }, content: { text: `I found a place in ${t.destination} that changed everything...`, textAr: `وجدت مكاناً في ${t.destination} غيّر كل شيء...`, editable: true } },
      { id: "tap-cta", type: "text", position: pos("25%", "80%", "50%", "auto"), style: { fontSize: "16px", color: "rgba(255,255,255,0.8)", textAlign: "center", fontWeight: "600" }, content: { text: "Tap to see →", textAr: "← اضغط لترى" } },
      { id: "brand", type: "logo", position: pos("35%", "90%", "30%", "auto"), style: { fontSize: "13px", color: `${t.colors.secondary}`, textAlign: "center", fontWeight: "700" }, content: { text: t.name } },
    ],

    variants: [
      { id: "mystery", name: "Dark Mystery", overrides: {} },
      { id: "bright", name: "Bright Hook", overrides: { "dark-overlay": { background: `linear-gradient(180deg, transparent 0%, ${t.colors.primary}DD 100%)` } } },
    ],
  };
}

function emailHeroTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-email-hero`,
    name: "Email Campaign Hero",
    nameAr: "بانر البريد الإلكتروني",
    category: "email-header",
    platform: ["instagram"],
    goal: "conversion",
    viralHook: "Forwarded emails = free reach. Beautiful header = higher forward rate.",
    conversionTip: "Hero links to landing page. Subject line + hero image = open rate driver.",

    format: { width: 600, height: 300, aspectRatio: "2:1" },

    layers: [
      { id: "bg", type: "background", position: pos("0", "0", "100%", "100%"), style: { background: t.gradients.hero } },
      { id: "hero-img", type: "image", position: pos("55%", "0", "45%", "100%"), style: { objectFit: "cover" }, content: { placeholder: "Email hero image" } },
      { id: "logo", type: "logo", position: pos("6%", "10%", "auto", "auto"), style: { fontSize: "14px", color: t.colors.textOnPrimary, fontWeight: "700" }, content: { text: t.name } },
      { id: "headline", type: "text", position: pos("6%", "35%", "48%", "auto"), style: { fontFamily: `'${t.typography.headingFont}'`, fontSize: "24px", fontWeight: String(t.typography.headingWeight), color: t.colors.textOnPrimary, lineHeight: "1.3" }, content: { text: `Your ${t.destination} Awaits`, textAr: `${t.destination} بانتظارك`, editable: true } },
      { id: "cta", type: "cta", position: pos("6%", "72%", "auto", "auto"), style: { background: t.gradients.cta, color: t.colors.textOnSecondary, padding: "10px 24px", borderRadius: t.shape.borderRadius.full, fontWeight: "700", fontSize: "13px" }, content: { text: "Explore Now →", textAr: "اكتشف الآن ←" } },
    ],

    variants: [
      { id: "newsletter", name: "Newsletter", overrides: {} },
      { id: "promo", name: "Promotional", overrides: { headline: { fontSize: "28px", fontWeight: "800" } } },
    ],
  };
}

function eventAnnouncementTemplate(t: DestinationTheme): ContentTemplate {
  return {
    id: `${t.id}-event`,
    name: "Event Announcement",
    nameAr: "إعلان الفعالية",
    category: "event-flyer",
    platform: ["instagram", "facebook"],
    goal: "conversion",
    viralHook: "Events create FOMO. Limited seats + exclusive access = shares + saves",
    conversionTip: "Direct ticket/booking link. Early bird pricing increases urgency.",

    format: { width: 1080, height: 1350, aspectRatio: "4:5" },

    layers: [
      { id: "bg-img", type: "image", position: pos("0", "0", "100%", "60%"), style: { objectFit: "cover" }, content: { placeholder: "Event venue/atmosphere photo" } },
      { id: "overlay", type: "overlay", position: pos("0", "40%", "100%", "20%"), style: { background: `linear-gradient(180deg, transparent, ${t.colors.primary})` } },
      { id: "bottom-panel", type: "shape", position: pos("0", "55%", "100%", "45%"), style: { background: t.colors.primary } },
      { id: "event-type", type: "badge", position: pos("8%", "58%", "auto", "auto"), style: { background: t.colors.secondary, color: t.colors.textOnSecondary, padding: "6px 16px", borderRadius: t.shape.borderRadius.full, fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.12em" }, content: { text: "EXCLUSIVE EVENT", textAr: "فعالية حصرية", editable: true } },
      { id: "event-name", type: "text", position: pos("8%", "64%", "84%", "auto"), style: { fontFamily: `'${t.typography.displayFont}'`, fontSize: "32px", fontWeight: "800", color: t.colors.textOnPrimary, lineHeight: "1.2" }, content: { text: `${t.destination} Night`, textAr: `ليلة ${t.destination}`, editable: true } },
      { id: "date", type: "text", position: pos("8%", "76%", "84%", "auto"), style: { fontSize: "16px", color: t.colors.secondary, fontWeight: "600" }, content: { text: "Saturday, March 15 · 7:00 PM", textAr: "السبت، 15 مارس · 7:00 مساءً", editable: true } },
      { id: "venue", type: "text", position: pos("8%", "82%", "84%", "auto"), style: { fontSize: "14px", color: `${t.colors.textOnPrimary}88` }, content: { text: "The Venue Name, City", textAr: "اسم المكان، المدينة", editable: true } },
      { id: "cta", type: "cta", position: pos("8%", "90%", "50%", "auto"), style: { background: t.gradients.cta, color: t.colors.textOnSecondary, padding: "12px 28px", borderRadius: t.shape.borderRadius.full, fontWeight: "700", fontSize: "15px" }, content: { text: "Get Tickets →", textAr: "احصل على التذاكر ←" } },
      { id: "seats", type: "text", position: pos("auto", "92%", "auto", "auto"), style: { right: "8%", fontSize: "12px", color: t.colors.error || "#EF4444", fontWeight: "600" }, content: { text: "Only 50 seats left!", textAr: "50 مقعد فقط متبقي!", editable: true } },
    ],

    variants: [
      { id: "gala", name: "Gala Night", overrides: { "bottom-panel": { background: "#0A0A0A" } } },
      { id: "casual", name: "Casual Vibe", overrides: { "bottom-panel": { background: t.colors.surface }, "event-name": { color: t.colors.text } } },
    ],
  };
}

// ── Helpers ──────────────────────────────────────────

function pos(x: string, y: string, w: string, h: string) {
  return { x, y, width: w, height: h };
}

// ── Exports ─────────────────────────────────────────

export function getTemplatesByGoal(templates: ContentTemplate[], goal: ContentGoal): ContentTemplate[] {
  return templates.filter(t => t.goal === goal);
}

export function getTemplatesByCategory(templates: ContentTemplate[], category: TemplateCategory): ContentTemplate[] {
  return templates.filter(t => t.category === category);
}

export function getTemplatesByPlatform(templates: ContentTemplate[], platform: SocialPlatform): ContentTemplate[] {
  return templates.filter(t => t.platform.includes(platform));
}
