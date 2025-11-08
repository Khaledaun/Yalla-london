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

/**
 * Premium Feature Flags
 * Additional feature flags for premium/admin features
 */
export type PremiumFeatureFlag =
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_ROLE'
  | 'CONTENT_MANAGEMENT'
  | 'EDITOR_ROLE'
  | 'ENHANCED_AUTH'
  | 'FEATURE_CONTENT_PIPELINE'
  | 'FEATURE_PROMPT_CONTROL'
  | 'FEATURE_TOPICS_RESEARCH'
  | 'HOMEPAGE_BUILDER'
  | 'INSTANT_UNDO'
  | 'KEYBOARD_SHORTCUTS'
  | 'OPTIMISTIC_UPDATES'
  | 'PEOPLE_MANAGEMENT'
  | 'PREMIUM_BACKEND'
  | 'SETTINGS_MANAGEMENT'
  | 'STATE_TRANSPARENCY';

/**
 * Check if a premium feature is enabled
 * Premium features can be controlled via environment variables or default to enabled in development
 */
export function isPremiumFeatureEnabled(feature: PremiumFeatureFlag | string): boolean {
  // In development mode, enable all premium features by default
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check environment variable for the specific feature
  const envVar = `NEXT_PUBLIC_${feature}`;
  const value = process.env[envVar];

  if (value !== undefined) {
    return value === '1' || value === 'true';
  }

  // Some features are enabled by default in production
  const defaultEnabledFeatures: PremiumFeatureFlag[] = [
    'ADMIN_DASHBOARD',
    'CONTENT_MANAGEMENT',
    'PREMIUM_BACKEND'
  ];

  return defaultEnabledFeatures.includes(feature as PremiumFeatureFlag);
}

/**
 * Validate premium feature access
 * Can be used for additional access control checks
 */
export function validatePremiumFeatureAccess(
  feature: PremiumFeatureFlag | string,
  siteContext?: any
): {
  allowed: boolean;
  reason?: string;
} {
  const isEnabled = isPremiumFeatureEnabled(feature);

  if (!isEnabled) {
    return {
      allowed: false,
      reason: `Premium feature '${feature}' is not enabled`
    };
  }

  // Additional site-specific checks could be added here
  // For now, just check if the feature is enabled globally

  return {
    allowed: true
  };
}

/**
 * Get premium feature flags organized by category
 */
export function getPremiumFeatureFlagsByCategory(): Record<string, Array<{
  key: string;
  name: string;
  enabled: boolean;
  description: string;
  scope: string;
  disabledReason?: string;
  enableLink?: string;
}>> {
  const categories = {
    'Admin & Dashboard': [
      { key: 'ADMIN_DASHBOARD', name: 'Admin Dashboard', enabled: isPremiumFeatureEnabled('ADMIN_DASHBOARD'), description: 'Admin dashboard access', scope: 'admin' },
      { key: 'ADMIN_ROLE', name: 'Admin Role', enabled: isPremiumFeatureEnabled('ADMIN_ROLE'), description: 'Admin role capabilities', scope: 'admin' },
      { key: 'PREMIUM_BACKEND', name: 'Premium Backend', enabled: isPremiumFeatureEnabled('PREMIUM_BACKEND'), description: 'Premium backend features', scope: 'backend' }
    ],
    'Content Management': [
      { key: 'CONTENT_MANAGEMENT', name: 'Content Management', enabled: isPremiumFeatureEnabled('CONTENT_MANAGEMENT'), description: 'Content management features', scope: 'admin' },
      { key: 'EDITOR_ROLE', name: 'Editor Role', enabled: isPremiumFeatureEnabled('EDITOR_ROLE'), description: 'Editor role capabilities', scope: 'admin' },
      { key: 'HOMEPAGE_BUILDER', name: 'Homepage Builder', enabled: isPremiumFeatureEnabled('HOMEPAGE_BUILDER'), description: 'Homepage builder tool', scope: 'admin' }
    ],
    'Features & Tools': [
      { key: 'FEATURE_CONTENT_PIPELINE', name: 'Content Pipeline', enabled: isPremiumFeatureEnabled('FEATURE_CONTENT_PIPELINE'), description: 'Content pipeline automation', scope: 'feature' },
      { key: 'FEATURE_PROMPT_CONTROL', name: 'Prompt Control', enabled: isPremiumFeatureEnabled('FEATURE_PROMPT_CONTROL'), description: 'AI prompt control panel', scope: 'feature' },
      { key: 'FEATURE_TOPICS_RESEARCH', name: 'Topics Research', enabled: isPremiumFeatureEnabled('FEATURE_TOPICS_RESEARCH'), description: 'Topics research tools', scope: 'feature' }
    ],
    'User Experience': [
      { key: 'KEYBOARD_SHORTCUTS', name: 'Keyboard Shortcuts', enabled: isPremiumFeatureEnabled('KEYBOARD_SHORTCUTS'), description: 'Keyboard shortcuts support', scope: 'ux' },
      { key: 'INSTANT_UNDO', name: 'Instant Undo', enabled: isPremiumFeatureEnabled('INSTANT_UNDO'), description: 'Instant undo functionality', scope: 'ux' },
      { key: 'OPTIMISTIC_UPDATES', name: 'Optimistic Updates', enabled: isPremiumFeatureEnabled('OPTIMISTIC_UPDATES'), description: 'Optimistic UI updates', scope: 'ux' },
      { key: 'STATE_TRANSPARENCY', name: 'State Transparency', enabled: isPremiumFeatureEnabled('STATE_TRANSPARENCY'), description: 'State transparency features', scope: 'ux' }
    ],
    'Security & Access': [
      { key: 'ENHANCED_AUTH', name: 'Enhanced Auth', enabled: isPremiumFeatureEnabled('ENHANCED_AUTH'), description: 'Enhanced authentication', scope: 'security' },
      { key: 'PEOPLE_MANAGEMENT', name: 'People Management', enabled: isPremiumFeatureEnabled('PEOPLE_MANAGEMENT'), description: 'People management tools', scope: 'admin' },
      { key: 'SETTINGS_MANAGEMENT', name: 'Settings Management', enabled: isPremiumFeatureEnabled('SETTINGS_MANAGEMENT'), description: 'Settings management', scope: 'admin' }
    ]
  };

  return categories;
}