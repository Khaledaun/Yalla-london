/**
 * Destination Theme System
 *
 * Complete brand identity per destination: colors, typography,
 * gradients, shadows, animations, and mood. Used by all design
 * components, templates, and the design studio.
 */

export interface DestinationTheme {
  id: string;
  name: string;
  nameAr: string;
  destination: string;
  tagline: string;
  taglineAr: string;
  mood: string; // one-line description of the visual vibe

  // ── Colors ───────────────────────────────────────────
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    textOnPrimary: string;
    textOnSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };

  // ── Gradients ────────────────────────────────────────
  gradients: {
    hero: string; // main hero gradient
    card: string; // card overlay gradient
    cta: string; // call-to-action button gradient
    subtle: string; // background subtle gradient
    overlay: string; // image overlay gradient
  };

  // ── Typography ───────────────────────────────────────
  typography: {
    headingFont: string;
    headingFontAr: string;
    bodyFont: string;
    bodyFontAr: string;
    displayFont: string; // for hero/splash
    displayFontAr: string;
    headingWeight: number;
    bodyWeight: number;
    letterSpacing: {
      tight: string;
      normal: string;
      wide: string;
    };
  };

  // ── Shadows ──────────────────────────────────────────
  shadows: {
    card: string;
    cardHover: string;
    elevated: string;
    button: string;
    inner: string;
  };

  // ── Border & Shape ───────────────────────────────────
  shape: {
    borderRadius: { sm: string; md: string; lg: string; xl: string; full: string };
    borderWidth: string;
    borderStyle: string;
  };

  // ── Animation Flavor ─────────────────────────────────
  animation: {
    preset: "elegant" | "tropical" | "dynamic" | "serene" | "luxe";
    speed: "slow" | "normal" | "fast";
    easing: string; // cubic-bezier
    hoverScale: number;
    entranceDelay: number; // ms between staggered items
  };

  // ── Patterns & Textures ──────────────────────────────
  patterns: {
    decorativeBorder: string; // CSS border-image or gradient
    sectionDivider: string; // SVG path or CSS shape
    backgroundTexture?: string; // optional subtle texture
  };
}

// ═══════════════════════════════════════════════════════
//  YALLA LONDON — Luxury Urban
// ═══════════════════════════════════════════════════════
export const yallaLondonTheme: DestinationTheme = {
  id: "yalla-london",
  name: "Yalla London",
  nameAr: "يالا لندن",
  destination: "London",
  tagline: "Luxury London Guide",
  taglineAr: "دليل لندن الفاخر",
  mood: "Rich burgundy meets gold — classic luxury with a warm editorial feel",

  colors: {
    primary: "#8B1538",
    primaryLight: "#B91C4A",
    primaryDark: "#6D0F2B",
    secondary: "#D4AF37",
    secondaryLight: "#E8C96A",
    accent: "#C5A572",
    background: "#FFFDF8",
    surface: "#FFFFFF",
    text: "#2D1810",
    textMuted: "#6B5B4F",
    textOnPrimary: "#FFFFFF",
    textOnSecondary: "#2D1810",
    border: "#E8DDD4",
    success: "#15803D",
    warning: "#B45309",
    error: "#DC2626",
  },

  gradients: {
    hero: "linear-gradient(135deg, #8B1538 0%, #6D0F2B 40%, #D4AF37 100%)",
    card: "linear-gradient(180deg, transparent 0%, rgba(139, 21, 56, 0.85) 100%)",
    cta: "linear-gradient(135deg, #D4AF37 0%, #C5A572 100%)",
    subtle: "linear-gradient(180deg, #FFFDF8 0%, #F5EDE4 100%)",
    overlay: "linear-gradient(0deg, rgba(45, 24, 16, 0.7) 0%, transparent 60%)",
  },

  typography: {
    headingFont: "Playfair Display",
    headingFontAr: "Cairo",
    bodyFont: "Inter",
    bodyFontAr: "Cairo",
    displayFont: "Playfair Display",
    displayFontAr: "Cairo",
    headingWeight: 700,
    bodyWeight: 400,
    letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.05em" },
  },

  shadows: {
    card: "0 4px 20px rgba(139, 21, 56, 0.08)",
    cardHover: "0 12px 32px rgba(139, 21, 56, 0.15)",
    elevated: "0 8px 40px rgba(139, 21, 56, 0.12)",
    button: "0 4px 12px rgba(212, 175, 55, 0.3)",
    inner: "inset 0 2px 4px rgba(139, 21, 56, 0.06)",
  },

  shape: {
    borderRadius: { sm: "6px", md: "12px", lg: "16px", xl: "24px", full: "9999px" },
    borderWidth: "1px",
    borderStyle: "solid",
  },

  animation: {
    preset: "elegant",
    speed: "normal",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    hoverScale: 1.02,
    entranceDelay: 100,
  },

  patterns: {
    decorativeBorder: "linear-gradient(90deg, #D4AF37, #C5A572, #D4AF37)",
    sectionDivider: "none",
    backgroundTexture: "radial-gradient(circle at 20% 80%, rgba(212, 175, 55, 0.03) 0%, transparent 50%)",
  },
};

// ═══════════════════════════════════════════════════════
//  MALDIVES — Tropical Paradise
// ═══════════════════════════════════════════════════════
export const maldivesTheme: DestinationTheme = {
  id: "maldives",
  name: "Arabaldives",
  nameAr: "عربالديف",
  destination: "Maldives",
  tagline: "Paradise Found",
  taglineAr: "الجنة موجودة",
  mood: "Crystal turquoise waters, white sand, and sunset coral — pure tropical luxury",

  colors: {
    primary: "#0891B2",
    primaryLight: "#22D3EE",
    primaryDark: "#065F73",
    secondary: "#F97316",
    secondaryLight: "#FB923C",
    accent: "#06B6D4",
    background: "#F0FDFA",
    surface: "#FFFFFF",
    text: "#134E4A",
    textMuted: "#5EEAD4",
    textOnPrimary: "#FFFFFF",
    textOnSecondary: "#FFFFFF",
    border: "#CCFBF1",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },

  gradients: {
    hero: "linear-gradient(135deg, #0891B2 0%, #065F73 30%, #06B6D4 70%, #F97316 100%)",
    card: "linear-gradient(180deg, transparent 0%, rgba(8, 145, 178, 0.85) 100%)",
    cta: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)",
    subtle: "linear-gradient(180deg, #F0FDFA 0%, #E0F7FA 100%)",
    overlay: "linear-gradient(0deg, rgba(6, 95, 115, 0.7) 0%, transparent 60%)",
  },

  typography: {
    headingFont: "Playfair Display",
    headingFontAr: "Cairo",
    bodyFont: "Inter",
    bodyFontAr: "Cairo",
    displayFont: "Playfair Display",
    displayFontAr: "Cairo",
    headingWeight: 700,
    bodyWeight: 400,
    letterSpacing: { tight: "-0.01em", normal: "0", wide: "0.04em" },
  },

  shadows: {
    card: "0 4px 20px rgba(8, 145, 178, 0.1)",
    cardHover: "0 12px 32px rgba(8, 145, 178, 0.18)",
    elevated: "0 8px 40px rgba(8, 145, 178, 0.12)",
    button: "0 4px 12px rgba(249, 115, 22, 0.3)",
    inner: "inset 0 2px 4px rgba(8, 145, 178, 0.06)",
  },

  shape: {
    borderRadius: { sm: "8px", md: "16px", lg: "20px", xl: "28px", full: "9999px" },
    borderWidth: "1px",
    borderStyle: "solid",
  },

  animation: {
    preset: "tropical",
    speed: "normal",
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    hoverScale: 1.04,
    entranceDelay: 80,
  },

  patterns: {
    decorativeBorder: "linear-gradient(90deg, #06B6D4, #0891B2, #F97316)",
    sectionDivider: "wave",
    backgroundTexture: "radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)",
  },
};

// ═══════════════════════════════════════════════════════
//  THAILAND — Exotic Elegance
// ═══════════════════════════════════════════════════════
export const thailandTheme: DestinationTheme = {
  id: "thailand",
  name: "Yalla Thailand",
  nameAr: "يالا تايلاند",
  destination: "Thailand",
  tagline: "Exotic Luxury Awaits",
  taglineAr: "الفخامة الاستوائية بانتظارك",
  mood: "Emerald temples, golden spires, and tropical greens — serene yet vibrant",

  colors: {
    primary: "#059669",
    primaryLight: "#34D399",
    primaryDark: "#047857",
    secondary: "#D97706",
    secondaryLight: "#FBBF24",
    accent: "#10B981",
    background: "#F0FDF4",
    surface: "#FFFFFF",
    text: "#14532D",
    textMuted: "#6B7280",
    textOnPrimary: "#FFFFFF",
    textOnSecondary: "#FFFFFF",
    border: "#D1FAE5",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
  },

  gradients: {
    hero: "linear-gradient(135deg, #059669 0%, #047857 40%, #D97706 100%)",
    card: "linear-gradient(180deg, transparent 0%, rgba(5, 150, 105, 0.85) 100%)",
    cta: "linear-gradient(135deg, #D97706 0%, #FBBF24 100%)",
    subtle: "linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 100%)",
    overlay: "linear-gradient(0deg, rgba(20, 83, 45, 0.7) 0%, transparent 60%)",
  },

  typography: {
    headingFont: "Playfair Display",
    headingFontAr: "Cairo",
    bodyFont: "Inter",
    bodyFontAr: "Cairo",
    displayFont: "Playfair Display",
    displayFontAr: "Cairo",
    headingWeight: 700,
    bodyWeight: 400,
    letterSpacing: { tight: "-0.01em", normal: "0", wide: "0.06em" },
  },

  shadows: {
    card: "0 4px 20px rgba(5, 150, 105, 0.08)",
    cardHover: "0 12px 32px rgba(5, 150, 105, 0.15)",
    elevated: "0 8px 40px rgba(5, 150, 105, 0.12)",
    button: "0 4px 12px rgba(217, 119, 6, 0.3)",
    inner: "inset 0 2px 4px rgba(5, 150, 105, 0.06)",
  },

  shape: {
    borderRadius: { sm: "6px", md: "12px", lg: "16px", xl: "24px", full: "9999px" },
    borderWidth: "1px",
    borderStyle: "solid",
  },

  animation: {
    preset: "serene",
    speed: "slow",
    easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    hoverScale: 1.03,
    entranceDelay: 120,
  },

  patterns: {
    decorativeBorder: "linear-gradient(90deg, #D97706, #FBBF24, #D97706)",
    sectionDivider: "lotus",
    backgroundTexture: "radial-gradient(circle at 50% 50%, rgba(5, 150, 105, 0.03) 0%, transparent 50%)",
  },
};

// ═══════════════════════════════════════════════════════
//  CARIBBEAN — Vibrant Tropical
// ═══════════════════════════════════════════════════════
export const caribbeanTheme: DestinationTheme = {
  id: "caribbean",
  name: "Yalla Caribbean",
  nameAr: "يالا الكاريبي",
  destination: "Caribbean",
  tagline: "Island Life, Elevated",
  taglineAr: "حياة الجزر بأعلى مستوى",
  mood: "Sunset amber, ocean teal, and coral pink — warm, joyful, sun-drenched luxury",

  colors: {
    primary: "#0D9488",
    primaryLight: "#2DD4BF",
    primaryDark: "#0F766E",
    secondary: "#F43F5E",
    secondaryLight: "#FB7185",
    accent: "#FBBF24",
    background: "#FFFBEB",
    surface: "#FFFFFF",
    text: "#1C1917",
    textMuted: "#78716C",
    textOnPrimary: "#FFFFFF",
    textOnSecondary: "#FFFFFF",
    border: "#FED7AA",
    success: "#16A34A",
    warning: "#EA580C",
    error: "#E11D48",
  },

  gradients: {
    hero: "linear-gradient(135deg, #0D9488 0%, #0F766E 30%, #F43F5E 70%, #FBBF24 100%)",
    card: "linear-gradient(180deg, transparent 0%, rgba(13, 148, 136, 0.85) 100%)",
    cta: "linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)",
    subtle: "linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)",
    overlay: "linear-gradient(0deg, rgba(28, 25, 23, 0.65) 0%, transparent 60%)",
  },

  typography: {
    headingFont: "Playfair Display",
    headingFontAr: "Cairo",
    bodyFont: "Inter",
    bodyFontAr: "Cairo",
    displayFont: "Playfair Display",
    displayFontAr: "Cairo",
    headingWeight: 800,
    bodyWeight: 400,
    letterSpacing: { tight: "-0.01em", normal: "0", wide: "0.04em" },
  },

  shadows: {
    card: "0 4px 20px rgba(13, 148, 136, 0.1)",
    cardHover: "0 12px 32px rgba(244, 63, 94, 0.18)",
    elevated: "0 8px 40px rgba(13, 148, 136, 0.12)",
    button: "0 4px 12px rgba(244, 63, 94, 0.3)",
    inner: "inset 0 2px 4px rgba(13, 148, 136, 0.06)",
  },

  shape: {
    borderRadius: { sm: "8px", md: "14px", lg: "20px", xl: "32px", full: "9999px" },
    borderWidth: "1px",
    borderStyle: "solid",
  },

  animation: {
    preset: "dynamic",
    speed: "fast",
    easing: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
    hoverScale: 1.05,
    entranceDelay: 60,
  },

  patterns: {
    decorativeBorder: "linear-gradient(90deg, #F43F5E, #FBBF24, #0D9488)",
    sectionDivider: "palm",
    backgroundTexture: "radial-gradient(circle at 30% 70%, rgba(251, 191, 36, 0.04) 0%, transparent 50%)",
  },
};

// ═══════════════════════════════════════════════════════
//  FRENCH RIVIERA — Côte d'Azur Chic
// ═══════════════════════════════════════════════════════
export const frenchRivieraTheme: DestinationTheme = {
  id: "french-riviera",
  name: "Yalla Riviera",
  nameAr: "يالا الريفيرا",
  destination: "French Riviera",
  tagline: "Côte d'Azur Luxury",
  taglineAr: "فخامة الريفييرا الفرنسية",
  mood: "Mediterranean navy, lavender mist, and champagne gold — refined coastal chic",

  colors: {
    primary: "#1E3A5F",
    primaryLight: "#2563EB",
    primaryDark: "#172554",
    secondary: "#A78BFA",
    secondaryLight: "#C4B5FD",
    accent: "#D4AF37",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#64748B",
    textOnPrimary: "#FFFFFF",
    textOnSecondary: "#FFFFFF",
    border: "#E2E8F0",
    success: "#059669",
    warning: "#D97706",
    error: "#DC2626",
  },

  gradients: {
    hero: "linear-gradient(135deg, #1E3A5F 0%, #172554 40%, #A78BFA 80%, #D4AF37 100%)",
    card: "linear-gradient(180deg, transparent 0%, rgba(30, 58, 95, 0.88) 100%)",
    cta: "linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)",
    subtle: "linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)",
    overlay: "linear-gradient(0deg, rgba(15, 23, 42, 0.7) 0%, transparent 60%)",
  },

  typography: {
    headingFont: "Playfair Display",
    headingFontAr: "Cairo",
    bodyFont: "Inter",
    bodyFontAr: "Cairo",
    displayFont: "Playfair Display",
    displayFontAr: "Cairo",
    headingWeight: 700,
    bodyWeight: 400,
    letterSpacing: { tight: "-0.02em", normal: "0", wide: "0.08em" },
  },

  shadows: {
    card: "0 4px 20px rgba(30, 58, 95, 0.08)",
    cardHover: "0 12px 32px rgba(30, 58, 95, 0.16)",
    elevated: "0 8px 40px rgba(30, 58, 95, 0.12)",
    button: "0 4px 12px rgba(167, 139, 250, 0.3)",
    inner: "inset 0 2px 4px rgba(30, 58, 95, 0.06)",
  },

  shape: {
    borderRadius: { sm: "4px", md: "8px", lg: "12px", xl: "20px", full: "9999px" },
    borderWidth: "1px",
    borderStyle: "solid",
  },

  animation: {
    preset: "luxe",
    speed: "slow",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    hoverScale: 1.02,
    entranceDelay: 140,
  },

  patterns: {
    decorativeBorder: "linear-gradient(90deg, #1E3A5F, #A78BFA, #D4AF37)",
    sectionDivider: "arch",
    backgroundTexture: "radial-gradient(circle at 70% 30%, rgba(167, 139, 250, 0.04) 0%, transparent 50%)",
  },
};

// ═══════════════════════════════════════════════════════
//  THEME REGISTRY
// ═══════════════════════════════════════════════════════

export const destinationThemes: Record<string, DestinationTheme> = {
  "yalla-london": yallaLondonTheme,
  maldives: maldivesTheme,
  arabaldives: maldivesTheme, // alias
  thailand: thailandTheme,
  caribbean: caribbeanTheme,
  "french-riviera": frenchRivieraTheme,
};

export function getDestinationTheme(siteId: string): DestinationTheme {
  return destinationThemes[siteId] || yallaLondonTheme;
}

export function getAllDestinationThemes(): DestinationTheme[] {
  return [yallaLondonTheme, maldivesTheme, thailandTheme, caribbeanTheme, frenchRivieraTheme];
}

/**
 * Generate CSS custom properties for a destination theme
 */
export function generateThemeCSS(theme: DestinationTheme): string {
  return `
    --dest-primary: ${theme.colors.primary};
    --dest-primary-light: ${theme.colors.primaryLight};
    --dest-primary-dark: ${theme.colors.primaryDark};
    --dest-secondary: ${theme.colors.secondary};
    --dest-secondary-light: ${theme.colors.secondaryLight};
    --dest-accent: ${theme.colors.accent};
    --dest-background: ${theme.colors.background};
    --dest-surface: ${theme.colors.surface};
    --dest-text: ${theme.colors.text};
    --dest-text-muted: ${theme.colors.textMuted};
    --dest-border: ${theme.colors.border};
    --dest-gradient-hero: ${theme.gradients.hero};
    --dest-gradient-card: ${theme.gradients.card};
    --dest-gradient-cta: ${theme.gradients.cta};
    --dest-shadow-card: ${theme.shadows.card};
    --dest-shadow-hover: ${theme.shadows.cardHover};
    --dest-shadow-button: ${theme.shadows.button};
    --dest-radius-sm: ${theme.shape.borderRadius.sm};
    --dest-radius-md: ${theme.shape.borderRadius.md};
    --dest-radius-lg: ${theme.shape.borderRadius.lg};
    --dest-font-heading: '${theme.typography.headingFont}', serif;
    --dest-font-body: '${theme.typography.bodyFont}', sans-serif;
    --dest-font-display: '${theme.typography.displayFont}', serif;
    --dest-anim-easing: ${theme.animation.easing};
    --dest-anim-speed: ${theme.animation.speed === "slow" ? "500ms" : theme.animation.speed === "fast" ? "200ms" : "300ms"};
    --dest-hover-scale: ${theme.animation.hoverScale};
  `.trim();
}
