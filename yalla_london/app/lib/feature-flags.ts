

/**
 * Feature flags configuration
 * Allows progressive rollout of features in production
 */

export interface FeatureFlags {
  SEO: boolean;
  EMBEDS: boolean;
  MEDIA: boolean;
  HOMEPAGE_BUILDER: boolean;
  
  // Phase 4B Master Toggle
  PHASE4B_ENABLED: boolean;
  
  // Content Pipeline Features
  TOPIC_RESEARCH: boolean;
  AUTO_CONTENT_GENERATION: boolean;
  AUTO_PUBLISHING: boolean;
  
  // SEO & Analytics
  SEO_AUTOMATION: boolean;
  ANALYTICS_REFRESH: boolean;
  
  // Content Management
  CONTENT_SCHEDULING: boolean;
  DRAFT_MANAGEMENT: boolean;
  
  // Quality Gates
  SEO_AUDIT_GATE: boolean;
  READABILITY_CHECK: boolean;
  
  // Admin Features
  TOPIC_APPROVAL_WORKFLOW: boolean;
  PIPELINE_MONITORING: boolean;
}

export const getFeatureFlags = (): FeatureFlags => {
  return {
    SEO: process.env.FEATURE_SEO === '1',
    EMBEDS: process.env.FEATURE_EMBEDS === '1',
    MEDIA: process.env.FEATURE_MEDIA === '1',
    HOMEPAGE_BUILDER: process.env.FEATURE_HOMEPAGE_BUILDER === '1',
    
    // Master toggle - controls all Phase 4B features
    PHASE4B_ENABLED: process.env.FEATURE_PHASE4B_ENABLED === 'true',
    
    // Content pipeline
    TOPIC_RESEARCH: process.env.FEATURE_TOPIC_RESEARCH === 'true',
    AUTO_CONTENT_GENERATION: process.env.FEATURE_AUTO_CONTENT_GENERATION === 'true',
    AUTO_PUBLISHING: process.env.FEATURE_AUTO_PUBLISHING === 'true',
    
    // SEO & Analytics
    SEO_AUTOMATION: process.env.FEATURE_SEO_AUTOMATION === 'true',
    ANALYTICS_REFRESH: process.env.FEATURE_ANALYTICS_REFRESH === 'true',
    
    // Content management
    CONTENT_SCHEDULING: process.env.FEATURE_CONTENT_SCHEDULING === 'true',
    DRAFT_MANAGEMENT: process.env.FEATURE_DRAFT_MANAGEMENT === 'true',
    
    // Quality gates
    SEO_AUDIT_GATE: process.env.FEATURE_SEO_AUDIT_GATE === 'true',
    READABILITY_CHECK: process.env.FEATURE_READABILITY_CHECK === 'true',
    
    // Admin features
    TOPIC_APPROVAL_WORKFLOW: process.env.FEATURE_TOPIC_APPROVAL_WORKFLOW === 'true',
    PIPELINE_MONITORING: process.env.FEATURE_PIPELINE_MONITORING === 'true',
  };
};

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  const flags = getFeatureFlags();
  
  // For Phase 4B features, check master toggle first
  const phase4bFeatures: (keyof FeatureFlags)[] = [
    'TOPIC_RESEARCH', 'AUTO_CONTENT_GENERATION', 'AUTO_PUBLISHING',
    'SEO_AUTOMATION', 'ANALYTICS_REFRESH', 'CONTENT_SCHEDULING',
    'DRAFT_MANAGEMENT', 'SEO_AUDIT_GATE', 'READABILITY_CHECK',
    'TOPIC_APPROVAL_WORKFLOW', 'PIPELINE_MONITORING'
  ];
  
  if (phase4bFeatures.includes(feature) && !flags.PHASE4B_ENABLED) {
    return false;
  }
  
  return flags[feature];
};

// Helper for conditional rendering
export const withFeature = <T>(feature: keyof FeatureFlags, component: T, fallback: T | null = null): T | null => {
  return isFeatureEnabled(feature) ? component : fallback;
};
