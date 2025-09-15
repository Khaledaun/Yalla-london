/**
 * Premium Backend Feature Flags System
 * Comprehensive feature flag management with per-site scoping capability
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  category: string;
  scope?: 'global' | 'site'; // Per-site feature flag capability
  enableLink?: string; // Link to enable feature
  disabledReason?: string; // Reason why feature is disabled
}

export interface SiteFeatureFlags {
  siteId: string;
  flags: Record<string, boolean>;
}

export interface FeatureFlagRegistry {
  [key: string]: FeatureFlag;
}

/**
 * Premium Backend Feature Flags
 * All features are OFF by default for safe production deployment
 */
function loadPremiumFeatureFlags(): FeatureFlagRegistry {
  const flags: FeatureFlagRegistry = {};

  // MASTER TOGGLE
  flags.PREMIUM_BACKEND = {
    key: 'PREMIUM_BACKEND',
    enabled: process.env.FEATURE_PREMIUM_BACKEND === 'true',
    description: 'Enable premium backend features and admin interface',
    category: 'core',
    scope: 'global'
  };

  // INFORMATION ARCHITECTURE
  flags.STABLE_LEFT_NAV = {
    key: 'STABLE_LEFT_NAV',
    enabled: process.env.FEATURE_STABLE_LEFT_NAV === 'true',
    description: 'Enable stable left navigation with comprehensive admin sections',
    category: 'navigation',
    scope: 'global'
  };

  flags.ADMIN_DASHBOARD = {
    key: 'ADMIN_DASHBOARD',
    enabled: process.env.FEATURE_ADMIN_DASHBOARD === 'true',
    description: 'Enable comprehensive admin dashboard with site overview',
    category: 'dashboard',
    scope: 'site'
  };

  flags.CONTENT_MANAGEMENT = {
    key: 'CONTENT_MANAGEMENT',
    enabled: process.env.FEATURE_CONTENT_MANAGEMENT === 'true',
    description: 'Enable content management (Articles, Media, SEO, Review Queue)',
    category: 'content',
    scope: 'site'
  };

  flags.DESIGN_TOOLS = {
    key: 'DESIGN_TOOLS',
    enabled: process.env.FEATURE_DESIGN_TOOLS === 'true',
    description: 'Enable design tools (Theme, Logo, Homepage Builder)',
    category: 'design',
    scope: 'site'
  };

  flags.PEOPLE_MANAGEMENT = {
    key: 'PEOPLE_MANAGEMENT',
    enabled: process.env.FEATURE_PEOPLE_MANAGEMENT === 'true',
    description: 'Enable people management (Members & Roles, Access Logs)',
    category: 'people',
    scope: 'site'
  };

  flags.INTEGRATIONS = {
    key: 'INTEGRATIONS',
    enabled: process.env.FEATURE_INTEGRATIONS === 'true',
    description: 'Enable integrations (API Keys, Analytics, LLMs, Affiliates)',
    category: 'integrations',
    scope: 'site'
  };

  flags.AUTOMATIONS = {
    key: 'AUTOMATIONS',
    enabled: process.env.FEATURE_AUTOMATIONS === 'true',
    description: 'Enable automations (Jobs, Status, Cron, Notifications)',
    category: 'automations',
    scope: 'site'
  };

  flags.AFFILIATE_HUB = {
    key: 'AFFILIATE_HUB',
    enabled: process.env.FEATURE_AFFILIATE_HUB === 'true',
    description: 'Enable affiliate hub with widgets and assignment matrix',
    category: 'affiliates',
    scope: 'site'
  };

  flags.SETTINGS_MANAGEMENT = {
    key: 'SETTINGS_MANAGEMENT',
    enabled: process.env.FEATURE_SETTINGS_MANAGEMENT === 'true',
    description: 'Enable settings management (Site, Languages, Feature Flags)',
    category: 'settings',
    scope: 'site'
  };

  // CORE DESIGN PRINCIPLES
  flags.OPTIMISTIC_UPDATES = {
    key: 'OPTIMISTIC_UPDATES',
    enabled: process.env.FEATURE_OPTIMISTIC_UPDATES === 'true',
    description: 'Enable optimistic updates with toast notifications',
    category: 'ux',
    scope: 'global'
  };

  flags.INSTANT_UNDO = {
    key: 'INSTANT_UNDO',
    enabled: process.env.FEATURE_INSTANT_UNDO === 'true',
    description: 'Enable instant undo functionality with server-side reversible ops',
    category: 'ux',
    scope: 'global'
  };

  flags.KEYBOARD_SHORTCUTS = {
    key: 'KEYBOARD_SHORTCUTS',
    enabled: process.env.FEATURE_KEYBOARD_SHORTCUTS === 'true',
    description: 'Enable keyboard shortcuts and command palette',
    category: 'ux',
    scope: 'global'
  };

  flags.LIVE_PREVIEWS = {
    key: 'LIVE_PREVIEWS',
    enabled: process.env.FEATURE_LIVE_PREVIEWS === 'true',
    description: 'Enable live previews for theme, homepage, affiliate widgets',
    category: 'ux',
    scope: 'site'
  };

  flags.STATE_TRANSPARENCY = {
    key: 'STATE_TRANSPARENCY',
    enabled: process.env.FEATURE_STATE_TRANSPARENCY === 'true',
    description: 'Enable state transparency with Draft/Published/Error chips',
    category: 'ux',
    scope: 'global'
  };

  // SECURITY & AUTH
  flags.ENHANCED_AUTH = {
    key: 'ENHANCED_AUTH',
    enabled: process.env.FEATURE_ENHANCED_AUTH === 'true',
    description: 'Enable enhanced auth with SSO and magic links',
    category: 'security',
    scope: 'global'
  };

  flags.RBAC_PREMIUM = {
    key: 'RBAC_PREMIUM',
    enabled: process.env.FEATURE_RBAC_PREMIUM === 'true',
    description: 'Enable premium RBAC with admin/editor/reviewer/viewer roles',
    category: 'security',
    scope: 'site'
  };

  flags.SECRET_ENCRYPTION = {
    key: 'SECRET_ENCRYPTION',
    enabled: process.env.FEATURE_SECRET_ENCRYPTION === 'true',
    description: 'Enable AES-256-GCM encryption for site secrets',
    category: 'security',
    scope: 'global'
  };

  flags.FIELD_MASKING = {
    key: 'FIELD_MASKING',
    enabled: process.env.FEATURE_FIELD_MASKING === 'true',
    description: 'Enable field masking and re-auth for sensitive data',
    category: 'security',
    scope: 'global'
  };

  // REVIEW QUEUE & TRUST
  flags.REVIEW_QUEUE = {
    key: 'REVIEW_QUEUE',
    enabled: process.env.FEATURE_REVIEW_QUEUE === 'true',
    description: 'Enable AI content review queue with score-based gating',
    category: 'content',
    scope: 'site'
  };

  flags.TRUST_WORKFLOWS = {
    key: 'TRUST_WORKFLOWS',
    enabled: process.env.FEATURE_TRUST_WORKFLOWS === 'true',
    description: 'Enable trust workflows with fix/approve/reject flows',
    category: 'content',
    scope: 'site'
  };

  // BACKGROUND JOBS & OBSERVABILITY
  flags.JOB_MONITORING = {
    key: 'JOB_MONITORING',
    enabled: process.env.FEATURE_JOB_MONITORING === 'true',
    description: 'Enable background job monitoring and management',
    category: 'observability',
    scope: 'site'
  };

  flags.STRUCTURED_LOGS = {
    key: 'STRUCTURED_LOGS',
    enabled: process.env.FEATURE_STRUCTURED_LOGS === 'true',
    description: 'Enable structured logs with metrics charts and trace IDs',
    category: 'observability',
    scope: 'global'
  };

  // PERFORMANCE & DX
  flags.SERVER_COMPONENTS = {
    key: 'SERVER_COMPONENTS',
    enabled: process.env.FEATURE_SERVER_COMPONENTS === 'true',
    description: 'Enable server components for admin with client islands',
    category: 'performance',
    scope: 'global'
  };

  flags.SUSPENSE_LOADING = {
    key: 'SUSPENSE_LOADING',
    enabled: process.env.FEATURE_SUSPENSE_LOADING === 'true',
    description: 'Enable Suspense with skeletons for better UX',
    category: 'performance',
    scope: 'global'
  };

  // i18n, RTL, ACCESSIBILITY
  flags.PER_SITE_LOCALES = {
    key: 'PER_SITE_LOCALES',
    enabled: process.env.FEATURE_PER_SITE_LOCALES === 'true',
    description: 'Enable per-site locales with admin language/RTL preview',
    category: 'i18n',
    scope: 'site'
  };

  flags.ACCESSIBILITY_ENHANCED = {
    key: 'ACCESSIBILITY_ENHANCED',
    enabled: process.env.FEATURE_ACCESSIBILITY_ENHANCED === 'true',
    description: 'Enable enhanced accessibility with keyboard navigation',
    category: 'accessibility',
    scope: 'global'
  };

  return flags;
}

// Global feature flag registry
let premiumFeatureFlags: FeatureFlagRegistry | null = null;
let siteFeatureFlags: Map<string, SiteFeatureFlags> = new Map();

/**
 * Get the premium feature flag registry
 */
export function getPremiumFeatureFlags(): FeatureFlagRegistry {
  if (!premiumFeatureFlags) {
    premiumFeatureFlags = loadPremiumFeatureFlags();
  }
  return premiumFeatureFlags;
}

/**
 * Check if a premium feature flag is enabled globally
 * Premium backend features are always enabled for admin users
 */
export function isPremiumFeatureEnabled(flagKey: string): boolean {
  const flags = getPremiumFeatureFlags();
  const flag = flags[flagKey];
  
  // Premium backend features are always enabled for admin users
  if (flagKey === 'PREMIUM_BACKEND') {
    return true;
  }
  
  // All admin features are enabled when premium backend is enabled
  if (flags.PREMIUM_BACKEND) {
    // Always enable core admin features
    const coreAdminFeatures = [
      'ADMIN_DASHBOARD',
      'CONTENT_MANAGEMENT', 
      'DESIGN_TOOLS',
      'PEOPLE_MANAGEMENT',
      'SETTINGS_MANAGEMENT',
      'STABLE_LEFT_NAV'
    ];
    
    if (coreAdminFeatures.includes(flagKey)) {
      return true;
    }
  }
  
  return flag?.enabled ?? false;
}

/**
 * Check if a site-specific feature flag is enabled
 */
export function isSiteFeatureEnabled(flagKey: string, siteId: string): boolean {
  // First check global flag
  if (!isPremiumFeatureEnabled(flagKey)) {
    return false;
  }
  
  // Then check site-specific override
  const siteFlags = siteFeatureFlags.get(siteId);
  if (siteFlags && flagKey in siteFlags.flags) {
    return siteFlags.flags[flagKey];
  }
  
  // Default to global setting
  return isPremiumFeatureEnabled(flagKey);
}

/**
 * Get feature flag with enable link and disabled reason
 */
export function getFeatureFlagWithContext(flagKey: string): FeatureFlag | null {
  const flags = getPremiumFeatureFlags();
  const flag = flags[flagKey];
  
  if (!flag) {
    return null;
  }
  
  // Add context for disabled flags
  if (!flag.enabled) {
    return {
      ...flag,
      enableLink: `/admin/settings/feature-flags?enable=${flagKey}`,
      disabledReason: 'Feature not enabled in environment configuration'
    };
  }
  
  return flag;
}

/**
 * Get all feature flags grouped by category with context
 */
export function getPremiumFeatureFlagsByCategory(): Record<string, FeatureFlag[]> {
  const flags = getPremiumFeatureFlags();
  const grouped: Record<string, FeatureFlag[]> = {};
  
  Object.values(flags).forEach(flag => {
    if (!grouped[flag.category]) {
      grouped[flag.category] = [];
    }
    
    // Add context for each flag
    const flagWithContext = getFeatureFlagWithContext(flag.key) || flag;
    grouped[flag.category].push(flagWithContext);
  });
  
  return grouped;
}

/**
 * Set site-specific feature flags
 */
export function setSiteFeatureFlags(siteId: string, flags: Record<string, boolean>): void {
  siteFeatureFlags.set(siteId, { siteId, flags });
}

/**
 * Get site-specific feature flags
 */
export function getSiteFeatureFlags(siteId: string): SiteFeatureFlags | null {
  return siteFeatureFlags.get(siteId) || null;
}

/**
 * Premium feature flag validation
 */
export function validatePremiumFeatureAccess(flagKey: string, siteId?: string): {
  allowed: boolean;
  reason?: string;
  enableLink?: string;
} {
  const flag = getFeatureFlagWithContext(flagKey);
  
  if (!flag) {
    return {
      allowed: false,
      reason: 'Feature flag not found',
    };
  }
  
  // Check global flag first
  if (!isPremiumFeatureEnabled('PREMIUM_BACKEND')) {
    return {
      allowed: false,
      reason: 'Premium backend features are not enabled',
      enableLink: '/admin/settings/feature-flags?enable=PREMIUM_BACKEND'
    };
  }
  
  // Check specific flag
  const isEnabled = siteId ? 
    isSiteFeatureEnabled(flagKey, siteId) : 
    isPremiumFeatureEnabled(flagKey);
  
  if (!isEnabled) {
    return {
      allowed: false,
      reason: flag.disabledReason || 'Feature is not enabled',
      enableLink: flag.enableLink
    };
  }
  
  return { allowed: true };
}

/**
 * Refresh premium feature flags
 */
export function refreshPremiumFeatureFlags(): FeatureFlagRegistry {
  premiumFeatureFlags = loadPremiumFeatureFlags();
  return premiumFeatureFlags;
}