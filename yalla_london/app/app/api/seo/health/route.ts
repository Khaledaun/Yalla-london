import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  isSEOEnabled, 
  isAISEOEnabled, 
  isAnalyticsEnabled,
  getFeatureFlagStatus 
} from '@/lib/flags';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const reasons: string[] = [];
  let overallOk = true;

  try {
    // Check feature flags
    const seoEnabled = isSEOEnabled();
    const aiSeoEnabled = isAISEOEnabled();
    const analyticsEnabled = isAnalyticsEnabled();

    if (!seoEnabled) {
      reasons.push('SEO features are disabled (FEATURE_SEO or NEXT_PUBLIC_FEATURE_SEO not set to 1)');
      overallOk = false;
    }

    // Check database connectivity (only if SEO is enabled)
    let dbOk = false;
    if (seoEnabled) {
      try {
        // Lightweight database check - try to query SEO tables
        await prisma.$queryRaw`SELECT 1 FROM seo_meta LIMIT 1`;
        dbOk = true;
      } catch (dbError: any) {
        if (dbError.message?.includes('relation "seo_meta" does not exist')) {
          reasons.push('SEO database tables do not exist - run migration: npx prisma db push');
        } else {
          reasons.push(`Database connection failed: ${dbError.message}`);
        }
        overallOk = false;
      }
    }

    // Check API keys (only if features are enabled)
    const missingKeys: string[] = [];
    
    if (aiSeoEnabled && !process.env.ABACUSAI_API_KEY) {
      missingKeys.push('ABACUSAI_API_KEY');
    }
    
    if (analyticsEnabled && !process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
      missingKeys.push('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID');
    }

    if (missingKeys.length > 0) {
      reasons.push(`Missing required API keys for enabled features: ${missingKeys.join(', ')}`);
      overallOk = false;
    }

    // Get detailed feature flag status
    const featureFlags = {
      FEATURE_SEO: getFeatureFlagStatus('FEATURE_SEO'),
      NEXT_PUBLIC_FEATURE_SEO: getFeatureFlagStatus('NEXT_PUBLIC_FEATURE_SEO'),
      FEATURE_AI_SEO_AUDIT: getFeatureFlagStatus('FEATURE_AI_SEO_AUDIT'),
      FEATURE_ANALYTICS_DASHBOARD: getFeatureFlagStatus('FEATURE_ANALYTICS_DASHBOARD'),
      FEATURE_MULTILINGUAL_SEO: getFeatureFlagStatus('FEATURE_MULTILINGUAL_SEO'),
      FEATURE_SCHEMA_GENERATION: getFeatureFlagStatus('FEATURE_SCHEMA_GENERATION'),
      FEATURE_SITEMAP_AUTO_UPDATE: getFeatureFlagStatus('FEATURE_SITEMAP_AUTO_UPDATE')
    };

    const healthData = {
      ok: overallOk,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      seo: {
        enabled: seoEnabled,
        aiEnabled: aiSeoEnabled,
        analyticsEnabled: analyticsEnabled,
        databaseConnected: dbOk
      },
      featureFlags,
      reasons: reasons.length > 0 ? reasons : ['All checks passed'],
      recommendations: overallOk ? [] : [
        'Set FEATURE_SEO=1 and NEXT_PUBLIC_FEATURE_SEO=1 to enable SEO features',
        'Run database migration: npx prisma db push',
        'Configure required API keys in environment variables',
        'Check docs/seo-activation.md for detailed setup instructions'
      ]
    };

    return NextResponse.json(healthData, { 
      status: overallOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        reasons: [`Unexpected error: ${error.message}`]
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
}





