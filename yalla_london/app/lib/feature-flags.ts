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

// Get feature flags from environment variables
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
export const withFeature = <T>(
  feature: keyof FeatureFlags,
  component: T,
  fallback: T | null = null
): T | null => {
  return isFeatureEnabled(feature) ? component : fallback;
};

// Helper for Phase 4B or prefix-based toggling
export const isPhase4BFeature = (feature: string): boolean => {
  return (
    feature !== 'PHASE4B_ENABLED' &&
    typeof feature === 'string' &&
    (
      feature.startsWith('TOPIC_') ||
      feature.startsWith('AUTO_') ||
      feature.startsWith('SEO_') ||
      feature.startsWith('ANALYTICS_') ||
      feature.startsWith('CONTENT_') ||
      feature.startsWith('DRAFT_') ||
      feature.startsWith('AUDIT_') ||
      feature.startsWith('READABILITY_') ||
      feature.startsWith('APPROVAL_')
    )
  );
};
