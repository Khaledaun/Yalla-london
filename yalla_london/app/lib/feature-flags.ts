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
  FEATURE_BACKLINK_INSPECTOR: number;
  FEATURE_CRM_MINIMAL: number;
  FEATURE_BULK_ENRICH: number;
  FEATURE_LLM_ROUTER: number;
  FEATURE_SEO: number;
  FEATURE_AUTO_PUBLISHING: number;
  FEATURE_SOCIAL_MEDIA_INTEGRATION: number;
  FEATURE_ADVANCED_TOPICS: number;
  FEATURE_ADVANCED_CRON: number;
  TOPIC_RESEARCH: number;
  PHASE4B_ENABLED: number;
  FEATURE_TOPIC_POLICY: number;
  AUDIT_SYSTEM: number;
  ADVANCED_CRON: number;
  EXPORT_WORDPRESS: number;
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
    FEATURE_BACKLINK_INSPECTOR: parseInt(process.env.FEATURE_BACKLINK_INSPECTOR || '0'),
    FEATURE_CRM_MINIMAL: parseInt(process.env.FEATURE_CRM_MINIMAL || '0'),
    FEATURE_BULK_ENRICH: parseInt(process.env.FEATURE_BULK_ENRICH || '0'),
    FEATURE_LLM_ROUTER: parseInt(process.env.FEATURE_LLM_ROUTER || '0'),
    FEATURE_SEO: parseInt(process.env.FEATURE_SEO || '0'),
    FEATURE_AUTO_PUBLISHING: parseInt(process.env.FEATURE_AUTO_PUBLISHING || '0'),
    FEATURE_SOCIAL_MEDIA_INTEGRATION: parseInt(process.env.FEATURE_SOCIAL_MEDIA_INTEGRATION || '0'),
    FEATURE_ADVANCED_TOPICS: parseInt(process.env.FEATURE_ADVANCED_TOPICS || '0'),
    FEATURE_ADVANCED_CRON: parseInt(process.env.FEATURE_ADVANCED_CRON || '0'),
    TOPIC_RESEARCH: parseInt(process.env.TOPIC_RESEARCH || '0'),
    PHASE4B_ENABLED: parseInt(process.env.PHASE4B_ENABLED || '0'),
    FEATURE_TOPIC_POLICY: parseInt(process.env.FEATURE_TOPIC_POLICY || '0'),
    AUDIT_SYSTEM: parseInt(process.env.AUDIT_SYSTEM || '0'),
    ADVANCED_CRON: parseInt(process.env.ADVANCED_CRON || '0'),
    EXPORT_WORDPRESS: parseInt(process.env.EXPORT_WORDPRESS || '0'),
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

/**
 * Get feature flag statistics for monitoring
 */
export function getFeatureFlagStats(): {
  total: number;
  enabled: number;
  disabled: number;
  flags: Record<string, { enabled: boolean; value: number }>;
} {
  const flags = getFeatureFlags();
  const flagEntries = Object.entries(flags);
  
  return {
    total: flagEntries.length,
    enabled: flagEntries.filter(([, value]) => value === 1).length,
    disabled: flagEntries.filter(([, value]) => value === 0).length,
    flags: getFeatureFlagStatus()
  };
}

/**
 * Refresh feature flags from environment variables
 * This function can be used to reload flags without restarting the application
 */
export function refreshFeatureFlags(): FeatureFlags {
  // In a real application, this might fetch from a database or external service
  // For now, we just return the current environment-based flags
  return getFeatureFlags();
}