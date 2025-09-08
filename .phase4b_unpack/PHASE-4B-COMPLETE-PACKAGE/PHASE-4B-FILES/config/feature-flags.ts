
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
