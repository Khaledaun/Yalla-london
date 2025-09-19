/**
 * Feature Flag Registry
 * Loads feature flags from environment variables and provides a centralized registry
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  category: string;
}

export interface FeatureFlagRegistry {
  [key: string]: FeatureFlag;
}

/**
 * Load feature flags from environment variables
 * Environment variables should follow the pattern: FEATURE_FLAG_NAME=true/false
 * 
 * All major platform features are controlled by environment-driven feature flags:
 * - Publishing: Automated content publishing and scheduling
 * - Analytics: Advanced content analytics and performance tracking  
 * - SEO: Search engine optimization tools and automation
 * - Social: Social media integration and cross-posting
 * - Export: Content export functionality (WordPress, etc.)
 * - Cron: Advanced job scheduling and monitoring
 * - Compliance: Audit system and regulatory compliance
 * - Enterprise: Enterprise-grade controls and features
 */
function loadFeatureFlagsFromEnv(): FeatureFlagRegistry {
  const flags: FeatureFlagRegistry = {};

  // CONTENT GENERATION & MANAGEMENT FLAGS
  // Master toggle for Phase 4B content generation pipeline
  flags.PHASE4B_ENABLED = {
    key: 'PHASE4B_ENABLED',
    enabled: process.env.FEATURE_PHASE4B_ENABLED === 'true',
    description: 'Enable Phase 4B content generation and management features',
    category: 'content'
  };

  // PUBLISHING FLAGS
  // Automated daily content publishing to multiple channels
  flags.AUTO_PUBLISHING = {
    key: 'AUTO_PUBLISHING',
    enabled: process.env.FEATURE_AUTO_PUBLISHING === 'true',
    description: 'Enable automatic daily content publishing',
    category: 'publishing'
  };

  // ANALYTICS FLAGS  
  // Advanced content performance analytics and reporting dashboard
  flags.CONTENT_ANALYTICS = {
    key: 'CONTENT_ANALYTICS',
    enabled: process.env.FEATURE_CONTENT_ANALYTICS === 'true',
    description: 'Enable advanced content analytics and reporting',
    category: 'analytics'
  };

  // SEO FLAGS
  // SEO optimization tools, meta generation, and search performance tracking
  flags.SEO_OPTIMIZATION = {
    key: 'SEO_OPTIMIZATION',
    enabled: process.env.FEATURE_SEO_OPTIMIZATION === 'true',
    description: 'Enable SEO optimization tools and features',
    category: 'seo'
  };

  // AI-powered SEO audit functionality
  flags.FEATURE_AI_SEO_AUDIT = {
    key: 'FEATURE_AI_SEO_AUDIT',
    enabled: process.env.FEATURE_AI_SEO_AUDIT === 'true',
    description: 'Enable AI-powered SEO audit and recommendations',
    category: 'seo'
  };

  // SOCIAL FLAGS
  // Social media content generation, posting, and cross-platform integration
  flags.SOCIAL_MEDIA_INTEGRATION = {
    key: 'SOCIAL_MEDIA_INTEGRATION',
    enabled: process.env.FEATURE_SOCIAL_MEDIA_INTEGRATION === 'true',
    description: 'Enable social media content generation and posting',
    category: 'social'
  };

  // Enhanced topic research and AI-powered content suggestions
  flags.ADVANCED_TOPICS = {
    key: 'ADVANCED_TOPICS',
    enabled: process.env.FEATURE_ADVANCED_TOPICS === 'true',
    description: 'Enable advanced topic research and suggestion engine',
    category: 'content'
  };

  // Content pipeline automation and management
  flags.FEATURE_CONTENT_PIPELINE = {
    key: 'FEATURE_CONTENT_PIPELINE',
    enabled: process.env.FEATURE_CONTENT_PIPELINE === 'true',
    description: 'Enable automated content pipeline and workflow management',
    category: 'content'
  };

  // EDITOR FLAGS
  // Internal linking suggestions and management
  flags.FEATURE_INTERNAL_LINKS = {
    key: 'FEATURE_INTERNAL_LINKS',
    enabled: process.env.FEATURE_INTERNAL_LINKS === 'true',
    description: 'Enable internal link suggestions and management',
    category: 'editor'
  };

  // Rich text editor with advanced formatting
  flags.FEATURE_RICH_EDITOR = {
    key: 'FEATURE_RICH_EDITOR',
    enabled: process.env.FEATURE_RICH_EDITOR === 'true',
    description: 'Enable advanced rich text editor with enhanced formatting',
    category: 'editor'
  };

  // Homepage builder and customization tools
  flags.FEATURE_HOMEPAGE_BUILDER = {
    key: 'FEATURE_HOMEPAGE_BUILDER',
    enabled: process.env.FEATURE_HOMEPAGE_BUILDER === 'true',
    description: 'Enable drag-and-drop homepage builder and customization',
    category: 'editor'
  };

  // EXPORT FLAGS
  // Content export functionality for external platforms (WordPress, CMS, etc.)
  flags.EXPORT_WORDPRESS = {
    key: 'EXPORT_WORDPRESS',
    enabled: process.env.FEATURE_EXPORT_WORDPRESS === 'true',
    description: 'Enable WordPress export functionality',
    category: 'export'
  };

  // COMPLIANCE FLAGS
  // Comprehensive audit system for regulatory compliance and content governance
  flags.AUDIT_SYSTEM = {
    key: 'AUDIT_SYSTEM',
    enabled: process.env.FEATURE_AUDIT_SYSTEM === 'true',
    description: 'Enable comprehensive audit and compliance system',
    category: 'compliance'
  };

  // ENTERPRISE FLAGS
  // Enterprise-grade features: multi-tenancy, advanced permissions, SSO, etc.
  flags.ENTERPRISE_FEATURES = {
    key: 'ENTERPRISE_FEATURES',
    enabled: process.env.FEATURE_ENTERPRISE_FEATURES === 'true',
    description: 'Enable enterprise-grade features and controls',
    category: 'enterprise'
  };

  // CRON FLAGS  
  // Advanced job scheduling, monitoring, and automated workflow management
  flags.ADVANCED_CRON = {
    key: 'ADVANCED_CRON',
    enabled: process.env.FEATURE_ADVANCED_CRON === 'true',
    description: 'Enable advanced cron job management and monitoring',
    category: 'cron'
  };

  // PHASE 4 ADDITIONAL FLAGS
  // Topic research and content discovery (matches Phase-4B endpoint)
  flags.FEATURE_TOPICS_RESEARCH = {
    key: 'FEATURE_TOPICS_RESEARCH',
    enabled: process.env.FEATURE_TOPIC_RESEARCH === 'true',
    description: 'Enable advanced topic research and content discovery',
    category: 'content'
  };

  // Auto content generation (matches Phase-4B endpoint)
  flags.FEATURE_AUTO_CONTENT_GENERATION = {
    key: 'FEATURE_AUTO_CONTENT_GENERATION',
    enabled: process.env.FEATURE_AUTO_CONTENT_GENERATION === 'true',
    description: 'Enable automated content generation with AI',
    category: 'content'
  };

  // Analytics dashboard with advanced metrics
  flags.FEATURE_ANALYTICS_DASHBOARD = {
    key: 'FEATURE_ANALYTICS_DASHBOARD',
    enabled: process.env.FEATURE_ANALYTICS_DASHBOARD === 'true',
    description: 'Enable advanced analytics dashboard with real-time metrics',
    category: 'analytics'
  };

  // Media enrichment and AI-powered metadata
  flags.FEATURE_MEDIA_ENRICH = {
    key: 'FEATURE_MEDIA_ENRICH',
    enabled: process.env.FEATURE_MEDIA_ENRICH === 'true',
    description: 'Enable AI-powered media enrichment and metadata generation',
    category: 'content'
  };

  // Bulk media enrichment operations
  flags.FEATURE_BULK_ENRICH = {
    key: 'FEATURE_BULK_ENRICH',
    enabled: process.env.FEATURE_BULK_ENRICH === 'true',
    description: 'Enable bulk media enrichment and batch processing',
    category: 'content'
  };

  // Prompt control and AI model management
  flags.FEATURE_PROMPT_CONTROL = {
    key: 'FEATURE_PROMPT_CONTROL',
    enabled: process.env.FEATURE_PROMPT_CONTROL === 'true',
    description: 'Enable advanced prompt control and AI model management',
    category: 'ai'
  };

  // Backlink offers and partnership management
  flags.FEATURE_BACKLINK_OFFERS = {
    key: 'FEATURE_BACKLINK_OFFERS',
    enabled: process.env.FEATURE_BACKLINK_OFFERS === 'true',
    description: 'Enable backlink offers and partnership management system',
    category: 'seo'
  };

  // Analytics refresh and data updates
  flags.ANALYTICS_REFRESH = {
    key: 'ANALYTICS_REFRESH',
    enabled: process.env.ANALYTICS_REFRESH === 'true',
    description: 'Enable automatic analytics data refresh and updates',
    category: 'analytics'
  };

  // PHASE 4C FLAGS (All OFF by default for safe rollout)
  // Topic policy and quota management
  flags.FEATURE_TOPIC_POLICY = {
    key: 'FEATURE_TOPIC_POLICY',
    enabled: process.env.FEATURE_TOPIC_POLICY === 'true',
    description: 'Enable topic policy and quota management system',
    category: 'topics'
  };

  // Backlink inspector and entity extraction
  flags.FEATURE_BACKLINK_INSPECTOR = {
    key: 'FEATURE_BACKLINK_INSPECTOR',
    enabled: process.env.FEATURE_BACKLINK_INSPECTOR === 'true',
    description: 'Enable backlink analysis and entity extraction',
    category: 'seo'
  };

  // CRM and subscriber management
  flags.FEATURE_CRM_MINIMAL = {
    key: 'FEATURE_CRM_MINIMAL',
    enabled: process.env.FEATURE_CRM_MINIMAL === 'true',
    description: 'Enable CRM and subscriber management features',
    category: 'crm'
  };

  // Exit intent tracking and analytics
  flags.FEATURE_EXIT_INTENT_IG = {
    key: 'FEATURE_EXIT_INTENT_IG',
    enabled: process.env.FEATURE_EXIT_INTENT_IG === 'true',
    description: 'Enable exit intent tracking and analytics',
    category: 'analytics'
  };

  // LLM routing and management
  flags.FEATURE_LLM_ROUTER = {
    key: 'FEATURE_LLM_ROUTER',
    enabled: process.env.FEATURE_LLM_ROUTER === 'true',
    description: 'Enable LLM routing and provider management',
    category: 'ai'
  };

  return flags;
}

// Global feature flag registry
let featureFlags: FeatureFlagRegistry | null = null;

/**
 * Get the feature flag registry
 * Loads from environment variables on first call
 */
export function getFeatureFlags(): FeatureFlagRegistry {
  if (!featureFlags) {
    featureFlags = loadFeatureFlagsFromEnv();
  }
  return featureFlags;
}

/**
 * Check if a specific feature flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  const flags = getFeatureFlags();
  return flags[flagKey]?.enabled ?? false;
}

/**
 * Get a specific feature flag
 */
export function getFeatureFlag(flagKey: string): FeatureFlag | null {
  const flags = getFeatureFlags();
  return flags[flagKey] ?? null;
}

/**
 * Get all feature flags grouped by category
 */
export function getFeatureFlagsByCategory(): Record<string, FeatureFlag[]> {
  const flags = getFeatureFlags();
  const grouped: Record<string, FeatureFlag[]> = {};

  Object.values(flags).forEach(flag => {
    if (!grouped[flag.category]) {
      grouped[flag.category] = [];
    }
    grouped[flag.category].push(flag);
  });

  return grouped;
}

/**
 * Get feature flag statistics
 */
export function getFeatureFlagStats(): {
  total: number;
  enabled: number;
  disabled: number;
  byCategory: Record<string, { total: number; enabled: number; disabled: number }>;
} {
  const flags = getFeatureFlags();
  const allFlags = Object.values(flags);
  
  const stats = {
    total: allFlags.length,
    enabled: allFlags.filter(f => f.enabled).length,
    disabled: allFlags.filter(f => !f.enabled).length,
    byCategory: {} as Record<string, { total: number; enabled: number; disabled: number }>
  };

  // Calculate stats by category
  allFlags.forEach(flag => {
    if (!stats.byCategory[flag.category]) {
      stats.byCategory[flag.category] = { total: 0, enabled: 0, disabled: 0 };
    }
    stats.byCategory[flag.category].total++;
    if (flag.enabled) {
      stats.byCategory[flag.category].enabled++;
    } else {
      stats.byCategory[flag.category].disabled++;
    }
  });

  return stats;
}

/**
 * Refresh feature flags from environment (useful for runtime updates)
 */
export function refreshFeatureFlags(): FeatureFlagRegistry {
  featureFlags = loadFeatureFlagsFromEnv();
  return featureFlags;
}