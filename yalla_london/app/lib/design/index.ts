/**
 * Yalla Design System — Multi-Destination Brand Engine
 *
 * Central export for the entire design system:
 * - Destination Themes (colors, typography, shapes, gradients)
 * - Animation Presets (entrance, hover, scroll, decorative)
 * - Content Templates (social posts, stories, carousels, ads)
 * - Themed Components (Hero, Card, Section, Button, etc.)
 * - Video Template Presets
 *
 * Usage:
 *   import { getDestinationTheme, getDestinationAnimations, generateContentTemplates } from '@/lib/design'
 *   const theme = getDestinationTheme('maldives')
 *   const anim = getDestinationAnimations('maldives')
 *   const templates = generateContentTemplates(theme)
 */

// Themes
export {
  type DestinationTheme,
  yallaLondonTheme,
  maldivesTheme,
  thailandTheme,
  caribbeanTheme,
  frenchRivieraTheme,
  destinationThemes,
  getDestinationTheme,
  getAllDestinationThemes,
  generateThemeCSS,
} from "./destination-themes";

// Animations
export {
  type AnimationPreset,
  elegantPreset,
  tropicalPreset,
  serenePreset,
  dynamicPreset,
  luxePreset,
  animationPresets,
  getAnimationPreset,
  getDestinationAnimations,
} from "./animation-presets";

// Content Templates
export {
  type ContentTemplate,
  type TemplateCategory,
  type SocialPlatform,
  type ContentGoal,
  type TemplateLayer,
  type TemplateVariant,
  generateContentTemplates,
  getTemplatesByGoal,
  getTemplatesByCategory,
  getTemplatesByPlatform,
} from "./content-templates";

// Video Presets
export {
  type VideoTemplatePreset,
  generateVideoPresets,
  getVideoPresetsByFormat,
} from "./video-presets";
