

/**
 * Feature flags configuration
 * Allows progressive rollout of features in production
 */

export interface FeatureFlags {
  SEO: boolean;
  EMBEDS: boolean;
  MEDIA: boolean;
  HOMEPAGE_BUILDER: boolean;
}

export const getFeatureFlags = (): FeatureFlags => {
  return {
    SEO: process.env.FEATURE_SEO === '1',
    EMBEDS: process.env.FEATURE_EMBEDS === '1',
    MEDIA: process.env.FEATURE_MEDIA === '1',
    HOMEPAGE_BUILDER: process.env.FEATURE_HOMEPAGE_BUILDER === '1',
  };
};

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  const flags = getFeatureFlags();
  return flags[feature];
};

// Helper for conditional rendering
export const withFeature = <T>(feature: keyof FeatureFlags, component: T, fallback: T | null = null): T | null => {
  return isFeatureEnabled(feature) ? component : fallback;
};
