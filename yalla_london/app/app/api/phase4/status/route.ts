/**
 * Phase-4 Status Endpoint
 * Admin-protected health and feature flag status
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid build-time database/header access
export const dynamic = 'force-dynamic';

import { withAdminAuth } from '@/lib/admin-middleware';
import { getFeatureFlags } from '@/lib/feature-flags';
import { checkDatabaseHealth } from '@/lib/database';

export interface Phase4Status {
  db: {
    connected: boolean;
    migrateStatus: string;
  };
  featureFlags: {
    FEATURE_AI_SEO_AUDIT: number;
    FEATURE_CONTENT_PIPELINE: number;
    FEATURE_WP_CONNECTOR: number;
    FEATURE_WHITE_LABEL: number;
    FEATURE_BACKLINK_OFFERS: number;
  };
  version: {
    rulebook: string | null;
  };
  storage: {
    provider: string;
    writable: boolean;
  };
}

/**
 * GET /api/phase4/status
 * Returns system status and feature flags
 * Requires admin authentication
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    // Get feature flags (all default to 0 - disabled)
    const featureFlags = getFeatureFlags();
    
    // Determine storage provider
    const storageProvider = process.env.STORAGE_PROVIDER || 'supabase';
    const storageWritable = !!process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           !!process.env.AWS_ACCESS_KEY_ID || 
                           process.env.NODE_ENV === 'development';
    
    const status: Phase4Status = {
      db: {
        connected: dbHealth.connected,
        migrateStatus: dbHealth.migrateStatus
      },
      featureFlags,
      version: {
        rulebook: process.env.PHASE4_RULEBOOK_VERSION || null
      },
      storage: {
        provider: storageProvider,
        writable: storageWritable
      }
    };

    return NextResponse.json(status, { status: 200 });
    
  } catch (error) {
    console.error('Phase-4 status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});