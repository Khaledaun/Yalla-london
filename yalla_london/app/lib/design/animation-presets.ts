/**
 * Animation Presets per Destination Mood
 *
 * Each destination has a unique animation personality.
 * These presets are used by framer-motion components
 * and the design studio / video templates.
 */

export interface AnimationPreset {
  id: string;
  label: string;

  // Framer-motion variants
  entrance: {
    hidden: Record<string, number | string>;
    visible: Record<string, number | string>;
    transition: Record<string, unknown>;
  };

  // Hover effect
  hover: {
    scale?: number;
    y?: number;
    rotate?: number;
    transition: Record<string, unknown>;
  };

  // Stagger children
  stagger: {
    delayChildren: number;
    staggerChildren: number;
  };

  // Page transition
  pageTransition: {
    initial: Record<string, number | string>;
    animate: Record<string, number | string>;
    exit: Record<string, number | string>;
    transition: Record<string, unknown>;
  };

  // Scroll-triggered reveal
  scrollReveal: {
    hidden: Record<string, number | string>;
    visible: Record<string, number | string>;
    transition: Record<string, unknown>;
  };

  // Decorative (floating, pulsing, etc.)
  decorative: {
    keyframes: Record<string, unknown>;
    duration: number;
    repeat: number; // Infinity = -1
    ease: string;
  };
}

// ── ELEGANT (Yalla London) ──────────────────────────
export const elegantPreset: AnimationPreset = {
  id: "elegant",
  label: "Elegant",

  entrance: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
  },

  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },

  stagger: { delayChildren: 0.2, staggerChildren: 0.1 },

  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },

  scrollReveal: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  },

  decorative: {
    keyframes: { opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] },
    duration: 4,
    repeat: -1,
    ease: "easeInOut",
  },
};

// ── TROPICAL (Maldives) ─────────────────────────────
export const tropicalPreset: AnimationPreset = {
  id: "tropical",
  label: "Tropical",

  entrance: {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
  },

  hover: {
    scale: 1.04,
    y: -6,
    transition: { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] },
  },

  stagger: { delayChildren: 0.15, staggerChildren: 0.08 },

  pageTransition: {
    initial: { opacity: 0, scale: 0.96, y: 30 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  },

  scrollReveal: {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
  },

  decorative: {
    keyframes: {
      y: [0, -12, 0],
      rotate: [0, 3, 0, -3, 0],
    },
    duration: 6,
    repeat: -1,
    ease: "easeInOut",
  },
};

// ── SERENE (Thailand) ───────────────────────────────
export const serenePreset: AnimationPreset = {
  id: "serene",
  label: "Serene",

  entrance: {
    hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] },
  },

  hover: {
    scale: 1.03,
    y: -3,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },

  stagger: { delayChildren: 0.25, staggerChildren: 0.12 },

  pageTransition: {
    initial: { opacity: 0, filter: "blur(8px)" },
    animate: { opacity: 1, filter: "blur(0px)" },
    exit: { opacity: 0, filter: "blur(4px)" },
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },

  scrollReveal: {
    hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] },
  },

  decorative: {
    keyframes: { opacity: [0.3, 0.7, 0.3], scale: [1, 1.08, 1], rotate: [0, 2, 0] },
    duration: 8,
    repeat: -1,
    ease: "easeInOut",
  },
};

// ── DYNAMIC (Caribbean) ──────────────────────────────
export const dynamicPreset: AnimationPreset = {
  id: "dynamic",
  label: "Dynamic",

  entrance: {
    hidden: { opacity: 0, y: 50, scale: 0.9, rotate: -2 },
    visible: { opacity: 1, y: 0, scale: 1, rotate: 0 },
    transition: { duration: 0.5, ease: [0.68, -0.55, 0.27, 1.55] },
  },

  hover: {
    scale: 1.05,
    y: -8,
    rotate: 1,
    transition: { duration: 0.25, ease: [0.68, -0.55, 0.27, 1.55] },
  },

  stagger: { delayChildren: 0.1, staggerChildren: 0.06 },

  pageTransition: {
    initial: { opacity: 0, x: -30, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 30, scale: 0.95 },
    transition: { duration: 0.4, ease: [0.68, -0.55, 0.27, 1.55] },
  },

  scrollReveal: {
    hidden: { opacity: 0, y: 60, scale: 0.85 },
    visible: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.6, ease: [0.68, -0.55, 0.27, 1.55] },
  },

  decorative: {
    keyframes: {
      y: [0, -18, 0],
      x: [0, 8, 0, -8, 0],
      rotate: [0, 5, 0, -5, 0],
    },
    duration: 5,
    repeat: -1,
    ease: "easeInOut",
  },
};

// ── LUXE (French Riviera) ────────────────────────────
export const luxePreset: AnimationPreset = {
  id: "luxe",
  label: "Luxe",

  entrance: {
    hidden: { opacity: 0, y: 25, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
  },

  hover: {
    scale: 1.02,
    y: -3,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },

  stagger: { delayChildren: 0.3, staggerChildren: 0.14 },

  pageTransition: {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.02 },
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },

  scrollReveal: {
    hidden: { opacity: 0, y: 35 },
    visible: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
  },

  decorative: {
    keyframes: { opacity: [0.5, 1, 0.5], scale: [1, 1.03, 1] },
    duration: 6,
    repeat: -1,
    ease: "easeInOut",
  },
};

// ── REGISTRY ─────────────────────────────────────────

export const animationPresets: Record<string, AnimationPreset> = {
  elegant: elegantPreset,
  tropical: tropicalPreset,
  serene: serenePreset,
  dynamic: dynamicPreset,
  luxe: luxePreset,
};

export function getAnimationPreset(
  presetName: "elegant" | "tropical" | "dynamic" | "serene" | "luxe",
): AnimationPreset {
  return animationPresets[presetName] || elegantPreset;
}

/**
 * Get the animation preset for a destination
 */
export function getDestinationAnimations(siteId: string): AnimationPreset {
  const mapping: Record<string, string> = {
    "yalla-london": "elegant",
    maldives: "tropical",
    arabaldives: "tropical",
    thailand: "serene",
    caribbean: "dynamic",
    "french-riviera": "luxe",
  };
  return getAnimationPreset(
    (mapping[siteId] || "elegant") as "elegant" | "tropical" | "dynamic" | "serene" | "luxe",
  );
}
