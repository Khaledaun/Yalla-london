export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';

interface Tooltip {
  tooltip_id: string;
  target_element: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  trigger: 'hover' | 'click' | 'focus' | 'auto';
  category: string;
  priority: 'low' | 'medium' | 'high';
  show_conditions: {
    user_role?: string[];
    feature_flags?: string[];
    first_time_only?: boolean;
  };
}

let tooltips: Map<string, Tooltip> = new Map();

// Pre-configured tooltips
const DEFAULT_TOOLTIPS: Tooltip[] = [
  {
    tooltip_id: 'feature_flags_help',
    target_element: '.feature-flags-panel',
    title: 'Feature Flags',
    content: 'Control which features are enabled or disabled. Use for phased rollouts and A/B testing.',
    position: 'right',
    trigger: 'hover',
    category: 'feature_management',
    priority: 'high',
    show_conditions: {
      user_role: ['admin', 'editor'],
      first_time_only: true
    }
  },
  {
    tooltip_id: 'content_pipeline_help',
    target_element: '.content-pipeline-status',
    title: 'Content Pipeline',
    content: 'Monitor the automated content generation workflow. Green indicates all steps are operational.',
    position: 'bottom',
    trigger: 'hover',
    category: 'content_management',
    priority: 'medium',
    show_conditions: {
      feature_flags: ['FEATURE_CONTENT_PIPELINE']
    }
  },
  {
    tooltip_id: 'seo_audit_help',
    target_element: '.seo-audit-button',
    title: 'AI SEO Audit',
    content: 'Run comprehensive SEO analysis on your content. Provides actionable recommendations for optimization.',
    position: 'top',
    trigger: 'hover',
    category: 'seo_tools',
    priority: 'high',
    show_conditions: {
      feature_flags: ['FEATURE_AI_SEO_AUDIT']
    }
  },
  {
    tooltip_id: 'monitoring_alerts_help',
    target_element: '.monitoring-alerts',
    title: 'Performance Monitoring',
    content: 'Real-time system health monitoring. Click to view detailed alerts and metrics.',
    position: 'left',
    trigger: 'hover',
    category: 'monitoring',
    priority: 'medium',
    show_conditions: {
      user_role: ['admin']
    }
  },
  {
    tooltip_id: 'backup_test_help',
    target_element: '.backup-test-button',
    title: 'Database Backup Testing',
    content: 'Test backup integrity and restore procedures. Run regularly to ensure data safety.',
    position: 'top',
    trigger: 'hover',
    category: 'data_management',
    priority: 'high',
    show_conditions: {
      user_role: ['admin']
    }
  },
  {
    tooltip_id: 'rollout_management_help',
    target_element: '.feature-rollout-panel',
    title: 'Feature Rollout Management',
    content: 'Manage phased rollouts of automation features. Control percentage and target users.',
    position: 'bottom',
    trigger: 'hover',
    category: 'feature_management',
    priority: 'high',
    show_conditions: {
      user_role: ['admin']
    }
  },
  {
    tooltip_id: 'analytics_integration_help',
    target_element: '.analytics-config',
    title: 'Analytics Integration',
    content: 'Configure GA4 and Google Search Console integration for comprehensive tracking.',
    position: 'right',
    trigger: 'hover',
    category: 'analytics',
    priority: 'medium',
    show_conditions: {
      user_role: ['admin', 'editor']
    }
  },
  {
    tooltip_id: 'database_performance_help',
    target_element: '.db-performance-metrics',
    title: 'Database Performance',
    content: 'Monitor database query performance, connection pool status, and optimization recommendations.',
    position: 'top',
    trigger: 'hover',
    category: 'performance',
    priority: 'medium',
    show_conditions: {
      user_role: ['admin']
    }
  }
];

// Initialize default tooltips
DEFAULT_TOOLTIPS.forEach(tooltip => {
  tooltips.set(tooltip.tooltip_id, tooltip);
});

/**
 * GET /api/admin/training/tooltips
 * Get contextual tooltips for admin dashboard
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || 'dashboard';
    const userRole = url.searchParams.get('user_role') || 'admin';
    const featureFlags = url.searchParams.get('feature_flags')?.split(',') || [];
    const firstTimeUser = url.searchParams.get('first_time') === 'true';
    
    // Filter tooltips based on context
    const relevantTooltips = Array.from(tooltips.values()).filter(tooltip => {
      // Check user role
      if (tooltip.show_conditions.user_role && 
          !tooltip.show_conditions.user_role.includes(userRole)) {
        return false;
      }
      
      // Check feature flags
      if (tooltip.show_conditions.feature_flags) {
        const hasRequiredFlags = tooltip.show_conditions.feature_flags.some(flag => 
          featureFlags.includes(flag)
        );
        if (!hasRequiredFlags) return false;
      }
      
      // Check first time only condition
      if (tooltip.show_conditions.first_time_only && !firstTimeUser) {
        return false;
      }
      
      return true;
    });
    
    // Sort by priority (high -> medium -> low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    relevantTooltips.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );
    
    return NextResponse.json({
      status: 'success',
      tooltips: relevantTooltips,
      page,
      user_role: userRole,
      feature_flags: featureFlags,
      first_time_user: firstTimeUser,
      tooltip_categories: Array.from(new Set(relevantTooltips.map(t => t.category))),
      total_tooltips: relevantTooltips.length,
      priority_breakdown: {
        high: relevantTooltips.filter(t => t.priority === 'high').length,
        medium: relevantTooltips.filter(t => t.priority === 'medium').length,
        low: relevantTooltips.filter(t => t.priority === 'low').length
      }
    });
    
  } catch (error) {
    console.error('Tooltips retrieval error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve tooltips',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/training/tooltips
 * Add custom tooltip or update existing one
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      tooltip_id,
      target_element,
      title,
      content,
      position = 'auto',
      trigger = 'hover',
      category = 'custom',
      priority = 'medium',
      show_conditions = {}
    } = body;
    
    if (!tooltip_id || !target_element || !title || !content) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required tooltip fields' },
        { status: 400 }
      );
    }
    
    const newTooltip: Tooltip = {
      tooltip_id,
      target_element,
      title,
      content,
      position,
      trigger,
      category,
      priority,
      show_conditions
    };
    
    tooltips.set(tooltip_id, newTooltip);
    
    return NextResponse.json({
      status: 'success',
      message: 'Tooltip created/updated successfully',
      tooltip: newTooltip
    });
    
  } catch (error) {
    console.error('Tooltip creation error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create/update tooltip',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/training/tooltips
 * Remove a tooltip
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const tooltipId = url.searchParams.get('tooltip_id');
    
    if (!tooltipId) {
      return NextResponse.json(
        { status: 'error', message: 'tooltip_id parameter required' },
        { status: 400 }
      );
    }
    
    if (tooltips.has(tooltipId)) {
      tooltips.delete(tooltipId);
      return NextResponse.json({
        status: 'success',
        message: 'Tooltip deleted successfully',
        tooltip_id: tooltipId
      });
    } else {
      return NextResponse.json(
        { status: 'error', message: 'Tooltip not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('Tooltip deletion error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete tooltip',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});