export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { refreshFeatureFlags, getFeatureFlags, getFeatureFlagStats } from '@/lib/feature-flags';

/**
 * POST /api/feature-flags/refresh
 * Admin-only endpoint that reloads feature flags from environment variables at runtime
 * 
 * This endpoint allows administrators to refresh feature flags without restarting the application,
 * useful for runtime configuration changes and testing different feature combinations.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get current state before refresh for comparison
    const beforeStats = getFeatureFlagStats();
    
    // Refresh feature flags from environment variables
    const refreshedFlags = refreshFeatureFlags();
    
    // Get new state after refresh
    const afterStats = getFeatureFlagStats();
    
    // Calculate what changed
    const changes = {
      flags_changed: beforeStats.enabled !== afterStats.enabled || beforeStats.disabled !== afterStats.disabled,
      before: {
        total: beforeStats.total,
        enabled: beforeStats.enabled,
        disabled: beforeStats.disabled
      },
      after: {
        total: afterStats.total,
        enabled: afterStats.enabled,
        disabled: afterStats.disabled
      },
      changes_by_category: Object.keys(beforeStats.byCategory).map(category => ({
        category,
        before: beforeStats.byCategory[category],
        after: afterStats.byCategory[category] || { total: 0, enabled: 0, disabled: 0 }
      }))
    };

    return NextResponse.json({
      status: 'success',
      message: 'Feature flags refreshed successfully',
      timestamp: new Date().toISOString(),
      refresh_details: {
        total_flags: afterStats.total,
        flags_enabled: afterStats.enabled,
        flags_disabled: afterStats.disabled,
        changes: changes,
        refreshed_flags: refreshedFlags
      },
      api_info: {
        endpoint: '/api/feature-flags/refresh',
        method: 'POST',
        admin_only: true,
        description: 'Reloads feature flags from environment variables at runtime'
      }
    });

  } catch (error) {
    console.error('Feature flags refresh endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh feature flags',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        api_info: {
          endpoint: '/api/feature-flags/refresh',
          method: 'POST',
          admin_only: true
        }
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/feature-flags/refresh
 * Returns information about the refresh endpoint without performing the refresh
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/feature-flags/refresh',
    method: 'POST',
    admin_only: true,
    description: 'Reloads feature flags from environment variables at runtime',
    usage: {
      curl_example: 'curl -X POST /api/feature-flags/refresh -H "Authorization: Bearer <admin-token>"',
      response_format: 'JSON with refresh details and flag changes'
    },
    requirements: [
      'Admin authentication required',
      'Valid NextAuth session with admin role',
      'Admin email must be in ADMIN_EMAILS environment variable'
    ]
  });
}