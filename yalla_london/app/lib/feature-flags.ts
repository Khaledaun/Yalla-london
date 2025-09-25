/**
 * Phase-4 Feature Flags Management
 * All new features ship disabled by default; enable progressively
 */

export interface FeatureFlags {
  FEATURE_AI_SEO_AUDIT: number;
  FEATURE_CONTENT_PIPELINE: number;
  FEATURE_WP_CONNECTOR: number;
  FEATURE_WHITE_LABEL: number;
  FEATURE_BACKLINK_OFFERS: number;
}

/**
 * Get feature flags from environment variables
 * All flags default to 0 (disabled) for safety
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    FEATURE_AI_SEO_AUDIT: parseInt(process.env.FEATURE_AI_SEO_AUDIT || '0'),
    FEATURE_CONTENT_PIPELINE: parseInt(process.env.FEATURE_CONTENT_PIPELINE || '0'),
    FEATURE_WP_CONNECTOR: parseInt(process.env.FEATURE_WP_CONNECTOR || '0'),
    FEATURE_WHITE_LABEL: parseInt(process.env.FEATURE_WHITE_LABEL || '0'),
    FEATURE_BACKLINK_OFFERS: parseInt(process.env.FEATURE_BACKLINK_OFFERS || '0'),
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[flag] === 1;
}

/**
 * Get feature flag status for admin dashboard
 */
export function getFeatureFlagStatus(): Record<string, { enabled: boolean; value: number }> {
  const flags = getFeatureFlags();
  return Object.entries(flags).reduce((acc, [key, value]) => {
    acc[key] = {
      enabled: value === 1,
      value
    };
    return acc;
  }, {} as Record<string, { enabled: boolean; value: number }>);
}