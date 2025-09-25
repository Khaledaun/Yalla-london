export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { getFeatureFlags, isFeatureEnabled, type FeatureFlags } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

interface FeatureRollout {
  feature_key: string;
  rollout_percentage: number;
  user_segments: string[];
  start_date: string;
  end_date?: string;
  enabled_users: string[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  rollout_rules: RolloutRule[];
}

interface RolloutRule {
  rule_type: 'percentage' | 'user_list' | 'email_domain' | 'user_role' | 'geography';
  rule_value: string | number;
  priority: number;
}

interface RolloutPhase {
  phase_name: string;
  target_percentage: number;
  duration_days: number;
  success_criteria: {
    error_rate_threshold: number;
    performance_threshold: number;
    user_satisfaction_threshold: number;
  };
}

let rolloutConfigurations: Map<string, FeatureRollout> = new Map();

// Pre-configured phased rollout templates
const AUTOMATION_ROLLOUT_PHASES: RolloutPhase[] = [
  {
    phase_name: 'Alpha Testing',
    target_percentage: 5,
    duration_days: 7,
    success_criteria: {
      error_rate_threshold: 2.0,
      performance_threshold: 95.0,
      user_satisfaction_threshold: 4.0
    }
  },
  {
    phase_name: 'Beta Testing',
    target_percentage: 25,
    duration_days: 14,
    success_criteria: {
      error_rate_threshold: 1.0,
      performance_threshold: 97.0,
      user_satisfaction_threshold: 4.2
    }
  },
  {
    phase_name: 'Limited Release',
    target_percentage: 50,
    duration_days: 21,
    success_criteria: {
      error_rate_threshold: 0.5,
      performance_threshold: 98.0,
      user_satisfaction_threshold: 4.5
    }
  },
  {
    phase_name: 'General Availability',
    target_percentage: 100,
    duration_days: 30,
    success_criteria: {
      error_rate_threshold: 0.3,
      performance_threshold: 99.0,
      user_satisfaction_threshold: 4.7
    }
  }
];

const AUTOMATION_FEATURES = [
  'FEATURE_AUTO_PUBLISHING',
  'FEATURE_CONTENT_PIPELINE',
  'FEATURE_AI_SEO_AUDIT', 
  'FEATURE_SOCIAL_MEDIA_INTEGRATION',
  'FEATURE_ADVANCED_TOPICS',
  'FEATURE_ADVANCED_CRON'
];

function calculateUserEligibility(userId: string, rollout: FeatureRollout): boolean {
  // Simple hash-based rollout
  const hash = hashUserId(userId);
  const eligibilityThreshold = rollout.rollout_percentage / 100;
  
  // Check if user is in enabled list
  if (rollout.enabled_users.includes(userId)) {
    return true;
  }
  
  // Check rollout rules
  for (const rule of rollout.rollout_rules) {
    switch (rule.rule_type) {
      case 'percentage':
        return hash < eligibilityThreshold;
      case 'user_list':
        return rollout.enabled_users.includes(userId);
      case 'email_domain':
        // In production, this would check user's email domain
        return userId.includes(rule.rule_value as string);
      case 'user_role':
        // In production, this would check user's role
        return userId.includes('admin');
    }
  }
  
  return hash < eligibilityThreshold;
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) / Math.pow(2, 31);
}

function getCurrentPhase(rollout: FeatureRollout): RolloutPhase | null {
  const currentPercentage = rollout.rollout_percentage;
  
  for (let i = 0; i < AUTOMATION_ROLLOUT_PHASES.length; i++) {
    const phase = AUTOMATION_ROLLOUT_PHASES[i];
    if (currentPercentage <= phase.target_percentage) {
      return phase;
    }
  }
  
  return AUTOMATION_ROLLOUT_PHASES[AUTOMATION_ROLLOUT_PHASES.length - 1];
}

function generateRolloutRecommendations(rollout: FeatureRollout): string[] {
  const recommendations: string[] = [];
  const currentPhase = getCurrentPhase(rollout);
  
  if (currentPhase) {
    recommendations.push(`📊 Currently in ${currentPhase.phase_name} phase (${rollout.rollout_percentage}% rollout)`);
    
    if (rollout.rollout_percentage < 100) {
      const nextPhase = AUTOMATION_ROLLOUT_PHASES.find(p => p.target_percentage > rollout.rollout_percentage);
      if (nextPhase) {
        recommendations.push(`🚀 Next phase: ${nextPhase.phase_name} (${nextPhase.target_percentage}% target)`);
        recommendations.push(`⏱️ Monitor metrics for ${currentPhase.duration_days} days before advancing`);
      }
    }
    
    // Success criteria recommendations
    recommendations.push(`🎯 Success criteria: Error rate < ${currentPhase.success_criteria.error_rate_threshold}%`);
    recommendations.push(`⚡ Performance target: > ${currentPhase.success_criteria.performance_threshold}%`);
    recommendations.push(`😊 User satisfaction: > ${currentPhase.success_criteria.user_satisfaction_threshold}/5`);
  }
  
  // Feature-specific recommendations
  switch (rollout.feature_key) {
    case 'FEATURE_AUTO_PUBLISHING':
      recommendations.push('📝 Monitor content quality and publication accuracy during rollout');
      recommendations.push('🔍 Set up content review gates for automated publishing');
      break;
    case 'FEATURE_AI_SEO_AUDIT':
      recommendations.push('🔍 Track SEO score improvements and audit accuracy');
      recommendations.push('📈 Monitor search ranking changes for rolled-out users');
      break;
    case 'FEATURE_SOCIAL_MEDIA_INTEGRATION':
      recommendations.push('📱 Monitor social media post quality and engagement rates');
      recommendations.push('🔗 Track cross-platform sharing success rates');
      break;
  }
  
  return recommendations;
}

/**
 * POST /api/admin/feature-rollout
 * Create or update feature rollout configuration
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { 
      feature_key, 
      rollout_percentage = 0, 
      user_segments = [], 
      rollout_rules = [],
      enabled_users = []
    } = body;
    
    if (!AUTOMATION_FEATURES.includes(feature_key)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid automation feature key' },
        { status: 400 }
      );
    }
    
    const rollout: FeatureRollout = {
      feature_key,
      rollout_percentage: Math.min(100, Math.max(0, rollout_percentage)),
      user_segments,
      start_date: new Date().toISOString(),
      enabled_users,
      status: 'active',
      rollout_rules: rollout_rules.length > 0 ? rollout_rules : [
        { rule_type: 'percentage', rule_value: rollout_percentage, priority: 1 }
      ]
    };
    
    rolloutConfigurations.set(feature_key, rollout);
    
    // Log rollout configuration change
    try {
      await prisma.auditLog.create({
        data: {
          action: 'FEATURE_ROLLOUT_UPDATE',
          entity_type: 'FEATURE_FLAG',
          entity_id: feature_key,
          details: {
            rollout_percentage,
            previous_percentage: 0, // In production, get from previous config
            phase: getCurrentPhase(rollout)?.phase_name || 'Unknown',
            enabled_users_count: enabled_users.length
          },
          user_id: 'admin',
          ip_address: request.ip || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      });
    } catch (dbError) {
      console.warn('Failed to log rollout configuration:', dbError);
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Feature rollout configuration updated',
      rollout_config: rollout,
      current_phase: getCurrentPhase(rollout),
      recommendations: generateRolloutRecommendations(rollout)
    });
    
  } catch (error) {
    console.error('Feature rollout configuration error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to configure feature rollout',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/admin/feature-rollout
 * Get feature rollout configurations and status
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const featureKey = url.searchParams.get('feature_key');
    const userId = url.searchParams.get('user_id');
    
    if (featureKey && userId) {
      // Check if specific user is eligible for feature
      const rollout = rolloutConfigurations.get(featureKey);
      if (rollout) {
        const eligible = calculateUserEligibility(userId, rollout);
        return NextResponse.json({
          status: 'success',
          feature_key: featureKey,
          user_id: userId,
          eligible,
          rollout_percentage: rollout.rollout_percentage,
          current_phase: getCurrentPhase(rollout)
        });
      } else {
        return NextResponse.json(
          { status: 'error', message: 'Feature rollout not configured' },
          { status: 404 }
        );
      }
    }
    
    if (featureKey) {
      // Get specific feature rollout configuration
      const rollout = rolloutConfigurations.get(featureKey);
      if (rollout) {
        return NextResponse.json({
          status: 'success',
          rollout_config: rollout,
          current_phase: getCurrentPhase(rollout),
          recommendations: generateRolloutRecommendations(rollout)
        });
      } else {
        return NextResponse.json(
          { status: 'error', message: 'Feature rollout not found' },
          { status: 404 }
        );
      }
    }
    
    // Get all rollout configurations
    const allRollouts = Array.from(rolloutConfigurations.entries()).map(([key, rollout]) => ({
      feature_key: key,
      rollout_percentage: rollout.rollout_percentage,
      status: rollout.status,
      current_phase: getCurrentPhase(rollout)?.phase_name || 'Unknown',
      enabled_users_count: rollout.enabled_users.length,
      start_date: rollout.start_date
    }));
    
    // Get current feature flag status for comparison
    const featureFlags = getFeatureFlags();
    const automationFeatureStatus = AUTOMATION_FEATURES.map(flag => ({
      feature_key: flag,
      globally_enabled: isFeatureEnabled(flag as keyof FeatureFlags),
      has_rollout: rolloutConfigurations.has(flag),
      rollout_percentage: rolloutConfigurations.get(flag)?.rollout_percentage || 0
    }));
    
    return NextResponse.json({
      status: 'success',
      rollout_configurations: allRollouts,
      automation_features_status: automationFeatureStatus,
      rollout_phases: AUTOMATION_ROLLOUT_PHASES,
      total_configurations: allRollouts.length,
      summary: {
        active_rollouts: allRollouts.filter(r => r.status === 'active').length,
        features_in_testing: allRollouts.filter(r => r.rollout_percentage < 100).length,
        fully_rolled_out: allRollouts.filter(r => r.rollout_percentage === 100).length
      }
    });
    
  } catch (error) {
    console.error('Feature rollout retrieval error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve rollout configurations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/feature-rollout
 * Advance feature rollout to next phase
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { feature_key, action } = body;
    
    const rollout = rolloutConfigurations.get(feature_key);
    if (!rollout) {
      return NextResponse.json(
        { status: 'error', message: 'Feature rollout not found' },
        { status: 404 }
      );
    }
    
    let newPercentage = rollout.rollout_percentage;
    let actionDescription = '';
    
    switch (action) {
      case 'advance_phase':
        const currentPhase = getCurrentPhase(rollout);
        const nextPhase = AUTOMATION_ROLLOUT_PHASES.find(p => p.target_percentage > rollout.rollout_percentage);
        if (nextPhase) {
          newPercentage = nextPhase.target_percentage;
          actionDescription = `Advanced from ${currentPhase?.phase_name} to ${nextPhase.phase_name}`;
        }
        break;
      case 'pause':
        rollout.status = 'paused';
        actionDescription = 'Rollout paused';
        break;
      case 'resume':
        rollout.status = 'active';
        actionDescription = 'Rollout resumed';
        break;
      case 'complete':
        newPercentage = 100;
        rollout.status = 'completed';
        rollout.end_date = new Date().toISOString();
        actionDescription = 'Rollout completed (100%)';
        break;
      default:
        return NextResponse.json(
          { status: 'error', message: 'Invalid action' },
          { status: 400 }
        );
    }
    
    const previousPercentage = rollout.rollout_percentage;
    rollout.rollout_percentage = newPercentage;
    rolloutConfigurations.set(feature_key, rollout);
    
    return NextResponse.json({
      status: 'success',
      message: actionDescription,
      rollout_config: rollout,
      previous_percentage: previousPercentage,
      new_percentage: newPercentage,
      current_phase: getCurrentPhase(rollout),
      recommendations: generateRolloutRecommendations(rollout)
    });
    
  } catch (error) {
    console.error('Feature rollout update error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update feature rollout',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});