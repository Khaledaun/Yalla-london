/**
 * Feature Flags Registry
 * Single source of truth for all feature flags
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  category: string;
  requiredEnvVars?: string[];
}

export interface FeatureFlagRegistry {
  [key: string]: FeatureFlag;
}

/**
 * Load feature flags from environment variables
 */
function loadFeatureFlagsFromEnv(): FeatureFlagRegistry {
  const flags: FeatureFlagRegistry = {};

  // SEO FEATURE FLAGS
  flags.FEATURE_SEO = {
    key: 'FEATURE_SEO',
    enabled: process.env.FEATURE_SEO === '1',
    description: 'Enable SEO features and tools',
    category: 'seo',
    requiredEnvVars: []
  };

  flags.NEXT_PUBLIC_FEATURE_SEO = {
    key: 'NEXT_PUBLIC_FEATURE_SEO',
    enabled: process.env.NEXT_PUBLIC_FEATURE_SEO === '1',
    description: 'Enable SEO features in client-side components',
    category: 'seo',
    requiredEnvVars: []
  };

  flags.FEATURE_AI_SEO_AUDIT = {
    key: 'FEATURE_AI_SEO_AUDIT',
    enabled: process.env.FEATURE_AI_SEO_AUDIT === '1',
    description: 'Enable AI-powered SEO auditing',
    category: 'seo',
    requiredEnvVars: ['ABACUSAI_API_KEY']
  };

  flags.FEATURE_ANALYTICS_DASHBOARD = {
    key: 'FEATURE_ANALYTICS_DASHBOARD',
    enabled: process.env.FEATURE_ANALYTICS_DASHBOARD === '1',
    description: 'Enable analytics dashboard and tracking',
    category: 'seo',
    requiredEnvVars: ['NEXT_PUBLIC_GOOGLE_ANALYTICS_ID']
  };

  flags.FEATURE_MULTILINGUAL_SEO = {
    key: 'FEATURE_MULTILINGUAL_SEO',
    enabled: process.env.FEATURE_MULTILINGUAL_SEO === '1',
    description: 'Enable multilingual SEO features',
    category: 'seo',
    requiredEnvVars: []
  };

  flags.FEATURE_SCHEMA_GENERATION = {
    key: 'FEATURE_SCHEMA_GENERATION',
    enabled: process.env.FEATURE_SCHEMA_GENERATION === '1',
    description: 'Enable automatic schema markup generation',
    category: 'seo',
    requiredEnvVars: []
  };

  flags.FEATURE_SITEMAP_AUTO_UPDATE = {
    key: 'FEATURE_SITEMAP_AUTO_UPDATE',
    enabled: process.env.FEATURE_SITEMAP_AUTO_UPDATE === '1',
    description: 'Enable automatic sitemap updates',
    category: 'seo',
    requiredEnvVars: []
  };

  // CONTENT FEATURE FLAGS
  flags.FEATURE_PHASE4B_ENABLED = {
    key: 'FEATURE_PHASE4B_ENABLED',
    enabled: process.env.FEATURE_PHASE4B_ENABLED === '1',
    description: 'Enable Phase 4B content generation features',
    category: 'content',
    requiredEnvVars: []
  };

  flags.FEATURE_AUTO_PUBLISHING = {
    key: 'FEATURE_AUTO_PUBLISHING',
    enabled: process.env.FEATURE_AUTO_PUBLISHING === '1',
    description: 'Enable automatic content publishing',
    category: 'content',
    requiredEnvVars: []
  };

  flags.FEATURE_CONTENT_PIPELINE = {
    key: 'FEATURE_CONTENT_PIPELINE',
    enabled: process.env.FEATURE_CONTENT_PIPELINE === '1',
    description: 'Enable content pipeline automation',
    category: 'content',
    requiredEnvVars: []
  };

  // MEDIA FEATURE FLAGS
  flags.FEATURE_MEDIA = {
    key: 'FEATURE_MEDIA',
    enabled: process.env.FEATURE_MEDIA === '1',
    description: 'Enable media library and management',
    category: 'media',
    requiredEnvVars: []
  };

  flags.FEATURE_EMBEDS = {
    key: 'FEATURE_EMBEDS',
    enabled: process.env.FEATURE_EMBEDS === '1',
    description: 'Enable social media embeds',
    category: 'media',
    requiredEnvVars: []
  };

  // HOMEPAGE FEATURE FLAGS
  flags.FEATURE_HOMEPAGE_BUILDER = {
    key: 'FEATURE_HOMEPAGE_BUILDER',
    enabled: process.env.FEATURE_HOMEPAGE_BUILDER === '1',
    description: 'Enable homepage builder functionality',
    category: 'homepage',
    requiredEnvVars: []
  };

  return flags;
}

// Load flags once
const featureFlags = loadFeatureFlagsFromEnv();

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  const flag = featureFlags[flagKey];
  if (!flag) {
    console.warn(`Feature flag '${flagKey}' not found`);
    return false;
  }
  return flag.enabled;
}

/**
 * Check if a feature flag is enabled and has required environment variables
 */
export function isFeatureEnabledWithDeps(flagKey: string): boolean {
  const flag = featureFlags[flagKey];
  if (!flag) {
    console.warn(`Feature flag '${flagKey}' not found`);
    return false;
  }

  if (!flag.enabled) {
    return false;
  }

  // Check required environment variables
  if (flag.requiredEnvVars && flag.requiredEnvVars.length > 0) {
    const missingVars = flag.requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
      console.warn(`Feature flag '${flagKey}' is enabled but missing required environment variables: ${missingVars.join(', ')}`);
      return false;
    }
  }

  return true;
}

/**
 * Get all feature flags
 */
export function getAllFeatureFlags(): FeatureFlagRegistry {
  return featureFlags;
}

/**
 * Get feature flags by category
 */
export function getFeatureFlagsByCategory(category: string): FeatureFlagRegistry {
  return Object.fromEntries(
    Object.entries(featureFlags).filter(([_, flag]) => flag.category === category)
  );
}

/**
 * Get SEO feature flags
 */
export function getSEOFeatureFlags(): FeatureFlagRegistry {
  return getFeatureFlagsByCategory('seo');
}

/**
 * Check if SEO features are enabled
 */
export function isSEOEnabled(): boolean {
  return isFeatureEnabled('FEATURE_SEO') && isFeatureEnabled('NEXT_PUBLIC_FEATURE_SEO');
}

/**
 * Check if AI SEO features are enabled
 */
export function isAISEOEnabled(): boolean {
  return isFeatureEnabledWithDeps('FEATURE_AI_SEO_AUDIT');
}

/**
 * Check if analytics features are enabled
 */
export function isAnalyticsEnabled(): boolean {
  return isFeatureEnabledWithDeps('FEATURE_ANALYTICS_DASHBOARD');
}

/**
 * Get feature flag status with dependencies
 */
export function getFeatureFlagStatus(flagKey: string): {
  enabled: boolean;
  hasDependencies: boolean;
  missingDependencies: string[];
} {
  const flag = featureFlags[flagKey];
  if (!flag) {
    return {
      enabled: false,
      hasDependencies: false,
      missingDependencies: []
    };
  }

  const missingDependencies = flag.requiredEnvVars?.filter(envVar => !process.env[envVar]) || [];
  
  return {
    enabled: flag.enabled,
    hasDependencies: (flag.requiredEnvVars?.length || 0) > 0,
    missingDependencies
  };
}

export default featureFlags;




