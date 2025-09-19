/**
 * Feature Flag Configuration
 * Centralized feature flag management for Phase-4 deployment
 */

import { getFeatureFlags as getFeatureFlagsFromLib, FeatureFlagRegistry } from '@/lib/feature-flags';

/**
 * Get all feature flags from the lib configuration
 * This is the main export function required by the deployment checklist
 */
export function getFeatureFlags(): FeatureFlagRegistry {
  return getFeatureFlagsFromLib();
}

/**
 * Re-export other feature flag utilities for convenience
 */
export { 
  isFeatureEnabled,
  getFeatureFlag,
  getFeatureFlagsByCategory,
  getFeatureFlagStats,
  refreshFeatureFlags,
  type FeatureFlag,
  type FeatureFlagRegistry
} from '@/lib/feature-flags';

/**
 * Phase-4 specific feature flag validation
 * Ensures all required Phase-4 flags are present and properly configured
 */
export function validatePhase4FeatureFlags(): {
  isValid: boolean;
  missing: string[];
  present: string[];
  errors: string[];
} {
  const flags = getFeatureFlags();
  
  // Required Phase-4 feature flags
  const requiredPhase4Flags = [
    'FEATURE_TOPICS_RESEARCH',
    'FEATURE_AUTO_CONTENT_GENERATION',
    'FEATURE_CONTENT_PIPELINE',
    'FEATURE_AI_SEO_AUDIT',
    'FEATURE_ANALYTICS_DASHBOARD',
    'FEATURE_MEDIA_ENRICH',
    'FEATURE_BULK_ENRICH',
    'FEATURE_PROMPT_CONTROL',
    'FEATURE_BACKLINK_OFFERS',
    'PHASE4B_ENABLED',
    'ANALYTICS_REFRESH'
  ];
  
  const present: string[] = [];
  const missing: string[] = [];
  const errors: string[] = [];
  
  requiredPhase4Flags.forEach(flagKey => {
    if (flags[flagKey]) {
      present.push(flagKey);
      
      // Validate flag structure
      const flag = flags[flagKey];
      if (!flag.key || !flag.description || typeof flag.enabled !== 'boolean') {
        errors.push(`Flag ${flagKey} has invalid structure`);
      }
    } else {
      missing.push(flagKey);
    }
  });
  
  return {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    present,
    errors
  };
}

/**
 * Get Phase-4 deployment readiness status
 */
export function getPhase4DeploymentStatus(): {
  ready: boolean;
  featureFlags: ReturnType<typeof validatePhase4FeatureFlags>;
  summary: string;
} {
  const featureFlagValidation = validatePhase4FeatureFlags();
  
  const ready = featureFlagValidation.isValid;
  
  let summary = '';
  if (ready) {
    summary = `✅ All ${featureFlagValidation.present.length} required Phase-4 feature flags are properly configured`;
  } else {
    const issues = [];
    if (featureFlagValidation.missing.length > 0) {
      issues.push(`${featureFlagValidation.missing.length} missing flags`);
    }
    if (featureFlagValidation.errors.length > 0) {
      issues.push(`${featureFlagValidation.errors.length} configuration errors`);
    }
    summary = `❌ Phase-4 deployment not ready: ${issues.join(', ')}`;
  }
  
  return {
    ready,
    featureFlags: featureFlagValidation,
    summary
  };
}