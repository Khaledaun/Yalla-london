
/**
 * Phase 4B Feature Flags Configuration
 * All features are OFF by default for safe production deployment
 */

export interface FeatureFlags {
  // Phase 4B Master Toggle
  PHASE4B_ENABLED: boolean;
  
  // Content Pipeline Features
  TOPIC_RESEARCH: boolean;
  AUTO_CONTENT_GENERATION: boolean;
  AUTO_PUBLISHING: boolean;
  FEATURE_CONTENT_PIPELINE: boolean;
  
  // SEO & Analytics
  SEO_AUTOMATION: boolean;
  ANALYTICS_REFRESH: boolean;
  FEATURE_AI_SEO_AUDIT: boolean;
  
  // Content Management
  CONTENT_SCHEDULING: boolean;
  DRAFT_MANAGEMENT: boolean;
  FEATURE_INTERNAL_LINKS: boolean;
  FEATURE_RICH_EDITOR: boolean;
  FEATURE_HOMEPAGE_BUILDER: boolean;
  
  // Quality Gates
  SEO_AUDIT_GATE: boolean;
  READABILITY_CHECK: boolean;
  
  // Admin Features
  TOPIC_APPROVAL_WORKFLOW: boolean;
  PIPELINE_MONITORING: boolean;

  // Phase 4C Features (All OFF by default)
  FEATURE_TOPIC_POLICY: boolean;
  FEATURE_BACKLINK_INSPECTOR: boolean;
  FEATURE_CRM_MINIMAL: boolean;
  FEATURE_EXIT_INTENT_IG: boolean;
  FEATURE_LLM_ROUTER: boolean;
}

export const getFeatureFlags = (): FeatureFlags => {
  return {
    // Master toggle - controls all Phase 4B features
    PHASE4B_ENABLED: process.env.FEATURE_PHASE4B_ENABLED === 'true',
    
    // Content pipeline
    TOPIC_RESEARCH: process.env.FEATURE_TOPIC_RESEARCH === 'true',
    AUTO_CONTENT_GENERATION: process.env.FEATURE_AUTO_CONTENT_GENERATION === 'true',
    AUTO_PUBLISHING: process.env.FEATURE_AUTO_PUBLISHING === 'true',
    FEATURE_CONTENT_PIPELINE: process.env.FEATURE_CONTENT_PIPELINE === 'true',
    
    // SEO & Analytics
    SEO_AUTOMATION: process.env.FEATURE_SEO_AUTOMATION === 'true',
    ANALYTICS_REFRESH: process.env.FEATURE_ANALYTICS_REFRESH === 'true',
    FEATURE_AI_SEO_AUDIT: process.env.FEATURE_AI_SEO_AUDIT === 'true',
    
    // Content management
    CONTENT_SCHEDULING: process.env.FEATURE_CONTENT_SCHEDULING === 'true',
    DRAFT_MANAGEMENT: process.env.FEATURE_DRAFT_MANAGEMENT === 'true',
    FEATURE_INTERNAL_LINKS: process.env.FEATURE_INTERNAL_LINKS === 'true',
    FEATURE_RICH_EDITOR: process.env.FEATURE_RICH_EDITOR === 'true',
    FEATURE_HOMEPAGE_BUILDER: process.env.FEATURE_HOMEPAGE_BUILDER === 'true',
    
    // Quality gates
    SEO_AUDIT_GATE: process.env.FEATURE_SEO_AUDIT_GATE === 'true',
    READABILITY_CHECK: process.env.FEATURE_READABILITY_CHECK === 'true',
    
    // Admin features
    TOPIC_APPROVAL_WORKFLOW: process.env.FEATURE_TOPIC_APPROVAL_WORKFLOW === 'true',
    PIPELINE_MONITORING: process.env.FEATURE_PIPELINE_MONITORING === 'true',

    // Phase 4C features (all OFF by default for safe rollout)
    FEATURE_TOPIC_POLICY: process.env.FEATURE_TOPIC_POLICY === 'true',
    FEATURE_BACKLINK_INSPECTOR: process.env.FEATURE_BACKLINK_INSPECTOR === 'true',
    FEATURE_CRM_MINIMAL: process.env.FEATURE_CRM_MINIMAL === 'true',
    FEATURE_EXIT_INTENT_IG: process.env.FEATURE_EXIT_INTENT_IG === 'true',
    FEATURE_LLM_ROUTER: process.env.FEATURE_LLM_ROUTER === 'true',
  };
};

export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  const flags = getFeatureFlags();
  
  // Master toggle check
  if (!flags.PHASE4B_ENABLED) {
    return false;
  }
  
  return flags[feature];
};

// Helper function for conditional rendering
export const withFeatureFlag = <T>(
  feature: keyof FeatureFlags,
  component: T,
  fallback?: T
): T | undefined => {
  return isFeatureEnabled(feature) ? component : fallback;
};
